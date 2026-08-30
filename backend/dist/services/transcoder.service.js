"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoTranscoderService = void 0;
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const client_s3_1 = require("@aws-sdk/client-s3");
const s3Client = new client_s3_1.S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'mock',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'mock',
    },
});
const CDN_BASE_URL = process.env.CDN_BASE_URL || 'https://cdn.texxxnopor.com';
const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'texxxnopor-media-hls';
class VideoTranscoderService {
    /**
     * Transcodifica un archivo MP4/MOV de origen a una lista de reproducción HLS adaptativa master (1080p, 720p, 480p, 360p)
     */
    async transcodeToHLS(options, onProgress) {
        const { videoId, inputFilePath, outputOutputDir } = options;
        const hlsFolder = path_1.default.join(outputOutputDir, videoId);
        if (!fs_1.default.existsSync(hlsFolder)) {
            fs_1.default.mkdirSync(hlsFolder, { recursive: true });
        }
        const masterPlaylistPath = path_1.default.join(hlsFolder, 'master.m3u8');
        const thumbnailPath = path_1.default.join(hlsFolder, 'thumbnail.jpg');
        // 1. Generar Thumbnail
        await this.generateThumbnail(inputFilePath, thumbnailPath);
        // 2. Ejecutar FFmpeg en pipeline HLS Adaptive Multi-bitrate
        return new Promise((resolve, reject) => {
            (0, fluent_ffmpeg_1.default)(inputFilePath)
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
                `-hls_segment_filename ${path_1.default.join(hlsFolder, 'v%v_segment_%03d.ts')}`,
                '-master_pl_name master.m3u8',
                '-var_stream_map v:0,a:0,name:1080p v:1,a:1,name:720p v:2,a:2,name:480p v:3,a:3,name:360p',
            ])
                .output(path_1.default.join(hlsFolder, 'v%v_manifest.m3u8'))
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
                }
                catch (err) {
                    reject(err);
                }
            })
                .on('error', (err) => {
                reject(err);
            })
                .run();
        });
    }
    generateThumbnail(inputPath, outputPath) {
        return new Promise((resolve, reject) => {
            (0, fluent_ffmpeg_1.default)(inputPath)
                .screenshots({
                timestamps: ['15%'],
                filename: path_1.default.basename(outputPath),
                folder: path_1.default.dirname(outputPath),
                size: '1280x720',
            })
                .on('end', () => resolve())
                .on('error', (err) => reject(err));
        });
    }
    async uploadFolderToS3(localDirPath, s3Prefix) {
        const files = fs_1.default.readdirSync(localDirPath);
        for (const file of files) {
            const filePath = path_1.default.join(localDirPath, file);
            const stat = fs_1.default.statSync(filePath);
            if (stat.isFile()) {
                const fileStream = fs_1.default.createReadStream(filePath);
                const contentType = this.getContentType(file);
                await s3Client.send(new client_s3_1.PutObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: `${s3Prefix}/${file}`,
                    Body: fileStream,
                    ContentType: contentType,
                    CacheControl: file.endsWith('.m3u8') ? 'max-age=60' : 'max-age=31536000',
                }));
            }
        }
    }
    getContentType(filename) {
        if (filename.endsWith('.m3u8'))
            return 'application/x-mpegURL';
        if (filename.endsWith('.ts'))
            return 'video/MP2T';
        if (filename.endsWith('.jpg') || filename.endsWith('.jpeg'))
            return 'image/jpeg';
        return 'application/octet-stream';
    }
}
exports.VideoTranscoderService = VideoTranscoderService;
