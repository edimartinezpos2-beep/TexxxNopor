import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'mock',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'mock',
  },
});

const CDN_BASE_URL = process.env.CDN_BASE_URL || 'https://cdn.texxxnopor.com';
const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'texxxnopor-media-hls';

export interface TranscodeOptions {
  videoId: string;
  inputFilePath: string;
  outputOutputDir: string;
}

export class VideoTranscoderService {
  /**
   * Transcodifica un archivo MP4/MOV de origen a una lista de reproducción HLS adaptativa master (1080p, 720p, 480p, 360p)
   */
  public async transcodeToHLS(
    options: TranscodeOptions,
    onProgress?: (progressPercent: number) => void
  ): Promise<{ masterM3u8Url: string; thumbnailUrl: string }> {
    const { videoId, inputFilePath, outputOutputDir } = options;
    const hlsFolder = path.join(outputOutputDir, videoId);

    if (!fs.existsSync(hlsFolder)) {
      fs.mkdirSync(hlsFolder, { recursive: true });
    }

    const masterPlaylistPath = path.join(hlsFolder, 'master.m3u8');
    const thumbnailPath = path.join(hlsFolder, 'thumbnail.jpg');

    // 1. Generar Thumbnail
    await this.generateThumbnail(inputFilePath, thumbnailPath);

    // 2. Ejecutar FFmpeg en pipeline HLS Adaptive Multi-bitrate
    return new Promise((resolve, reject) => {
      ffmpeg(inputFilePath)
        .outputOptions([
          '-filter_complex [0:v]split=4[v1,v2,v3,v4]; [v1]scale=w=1920:h=1080[v1out]; [v2]scale=w=1280:h=720[v2out]; [v3]scale=w=854:h=480[v3out]; [v4]scale=w=640:h=360[v4out]',
          // 1080p
          '-map [v1out] -c:v:0 libx264 -b:v:0 5000k -maxrate:v:0 5350k -bufsize:v:0 7500k',
          // 720p
          '-map [v2out] -c:v:1 libx264 -b:v:1 2800k -maxrate:v:1 2996k -bufsize:v:1 4200k',
          // 480p
          '-map [v3out] -c:v:2 libx264 -b:v:2 1400k -maxrate:v:2 1498k -bufsize:v:2 2100k',
          // 360p
          '-map [v4out] -c:v:3 libx264 -b:v:3 800k -maxrate:v:3 856k -bufsize:v:3 1200k',
          // Audio renditions
          '-map a:0 -c:a:0 aac -b:a:0 192k',
          '-map a:0 -c:a:1 aac -b:a:1 128k',
          '-map a:0 -c:a:2 aac -b:a:2 96k',
          '-map a:0 -c:a:3 aac -b:a:3 64k',
          // HLS configuration
          '-f hls',
          '-hls_time 4',
          '-hls_playlist_type vod',
          '-hls_flags independent_segments',
          `-hls_segment_filename ${path.join(hlsFolder, 'v%v_segment_%03d.ts')}`,
          '-master_pl_name master.m3u8',
          '-var_stream_map v:0,a:0,name:1080p v:1,a:1,name:720p v:2,a:2,name:480p v:3,a:3,name:360p',
        ])
        .output(path.join(hlsFolder, 'v%v_manifest.m3u8'))
        .on('progress', (info) => {
          if (onProgress && info.percent) {
            onProgress(Math.min(Math.round(info.percent), 100));
          }
        })
        .on('end', async () => {
          try {
            // 3. Subir directorio HLS a S3 / CDN
            await this.uploadFolderToS3(hlsFolder, `hls/${videoId}`);
            const masterM3u8Url = `${CDN_BASE_URL}/hls/${videoId}/master.m3u8`;
            const thumbnailUrl = `${CDN_BASE_URL}/hls/${videoId}/thumbnail.jpg`;
            resolve({ masterM3u8Url, thumbnailUrl });
          } catch (err) {
            reject(err);
          }
        })
        .on('error', (err) => {
          reject(err);
        })
        .run();
    });
  }

  private generateThumbnail(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          timestamps: ['15%'],
          filename: path.basename(outputPath),
          folder: path.dirname(outputPath),
          size: '1280x720',
        })
        .on('end', () => resolve())
        .on('error', (err) => reject(err));
    });
  }

  private async uploadFolderToS3(localDirPath: string, s3Prefix: string): Promise<void> {
    const files = fs.readdirSync(localDirPath);
    for (const file of files) {
      const filePath = path.join(localDirPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isFile()) {
        const fileStream = fs.createReadStream(filePath);
        const contentType = this.getContentType(file);
        
        await s3Client.send(
          new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `${s3Prefix}/${file}`,
            Body: fileStream,
            ContentType: contentType,
            CacheControl: file.endsWith('.m3u8') ? 'max-age=60' : 'max-age=31536000',
          })
        );
      }
    }
  }

  private getContentType(filename: string): string {
    if (filename.endsWith('.m3u8')) return 'application/x-mpegURL';
    if (filename.endsWith('.ts')) return 'video/MP2T';
    if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) return 'image/jpeg';
    return 'application/octet-stream';
  }
}
