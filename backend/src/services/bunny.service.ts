import path from 'path';
import fs from 'fs';
import os from 'os';
import { execFileSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

export const ALLOWED_VIDEO_MIMES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-m4v',
  'video/mkv',
  'video/x-matroska',
  'video/3gpp',
  'video/3gp',
  'video/avi',
  'video/x-msvideo',
  'video/mpeg',
  'video/ogg',
  'application/octet-stream',
];

export const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/jpg',
  'application/octet-stream',
];

export const MAX_VIDEO_SIZE_BYTES = 1024 * 1024 * 1024; // 1 GB
export const MAX_IMAGE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
export const UPLOAD_TIMEOUT_MS = 900000; // 15 minutos

export interface BunnyUploadResult {
  secure_url: string;
  public_id: string;
  format: string;
  bytes: number;
  duration?: number;
}

export class BunnyService {
  private static getStorageZone(): string {
    return process.env.BUNNY_STORAGE_ZONE_NAME || 'texxxnopor';
  }

  private static getAccessKey(): string {
    return process.env.BUNNY_ACCESS_KEY || '';
  }

  private static getHostname(): string {
    return process.env.BUNNY_STORAGE_HOSTNAME || 'storage.bunnycdn.com';
  }

  private static getCdnHostname(): string {
    return process.env.BUNNY_CDN_HOSTNAME || 'texxxnopor.b-cdn.net';
  }

  static validateVideoFile(mimetype: string, sizeBytes: number): { valid: boolean; error?: string } {
    const isVideoMime =
      mimetype.toLowerCase().startsWith('video/') ||
      ALLOWED_VIDEO_MIMES.includes(mimetype.toLowerCase());

    if (!isVideoMime) {
      return {
        valid: false,
        error: "Formato de video no soportado (" + mimetype + "). Formatos validos: MP4, MOV, WEBM, MKV, 3GP.",
      };
    }
    if (sizeBytes > MAX_VIDEO_SIZE_BYTES) {
      return {
        valid: false,
        error: "El archivo supera el limite maximo de " + (MAX_VIDEO_SIZE_BYTES / (1024 * 1024)) + "MB.",
      };
    }
    return { valid: true };
  }

  static validateImageFile(mimetype: string, sizeBytes: number): { valid: boolean; error?: string } {
    const isImageMime =
      mimetype.toLowerCase().startsWith('image/') ||
      ALLOWED_IMAGE_MIMES.includes(mimetype.toLowerCase());

    if (!isImageMime) {
      return {
        valid: false,
        error: "Formato de imagen no soportado (" + mimetype + "). Formatos validos: JPG, PNG, WEBP.",
      };
    }
    if (sizeBytes > MAX_IMAGE_SIZE_BYTES) {
      return {
        valid: false,
        error: "La imagen supera el limite maximo de " + (MAX_IMAGE_SIZE_BYTES / (1024 * 1024)) + "MB.",
      };
    }
    return { valid: true };
  }

  /**
   * Extrae automaticamente una captura de fotograma del video usando ffmpeg.
   * Toma un fotograma en el segundo indicado (por defecto segundo 2).
   */
  static async extractThumbnailFromBuffer(
    videoBuffer: Buffer,
    atSecond: number = 2
  ): Promise<{ buffer: Buffer; filename: string } | null> {
    const tmpDir = os.tmpdir();
    const timestamp = Date.now();
    const tmpVideoPath = path.join(tmpDir, "txnp_vid_" + timestamp + ".mp4");
    const tmpThumbPath = path.join(tmpDir, "txnp_thumb_" + timestamp + ".jpg");

    try {
      fs.writeFileSync(tmpVideoPath, videoBuffer);

      let ffmpegBin = 'ffmpeg';
      try {
        const ffmpegStatic = require('ffmpeg-static');
        if (ffmpegStatic) ffmpegBin = ffmpegStatic;
      } catch (_e) {}

      console.log("🎬 [BunnyService] Extrayendo captura de video en segundo " + atSecond + " con ffmpeg...");
      execFileSync(
        ffmpegBin,
        [
          '-ss', String(atSecond),
          '-i', tmpVideoPath,
          '-frames:v', '1',
          '-q:v', '2',
          '-y',
          tmpThumbPath,
        ],
        { timeout: 30000, stdio: 'pipe' }
      );

      if (!fs.existsSync(tmpThumbPath)) {
        console.warn('⚠️ [BunnyService] ffmpeg no genero el archivo de captura');
        return null;
      }

      const thumbBuffer = fs.readFileSync(tmpThumbPath);
      const filename = "thumb_auto_" + timestamp + ".jpg";
      console.log("✅ [BunnyService] Captura de miniatura generada exitosamente (" + thumbBuffer.length + " bytes)");
      return { buffer: thumbBuffer, filename };
    } catch (err: any) {
      console.warn('⚠️ [BunnyService] Error al extraer miniatura del video:', err.message);
      return null;
    } finally {
      try { fs.unlinkSync(tmpVideoPath); } catch (_e) {}
      try { fs.unlinkSync(tmpThumbPath); } catch (_e) {}
    }
  }

  static async uploadVideoBuffer(
    buffer: Buffer,
    filename: string,
    folder: string = 'videos'
  ): Promise<BunnyUploadResult> {
    const cleanName = path.parse(filename).name.replace(/[^a-zA-Z0-9_-]/g, '') || 'video';
    const ext = path.parse(filename).ext || '.mp4';
    const remoteFilename = "vid_" + Date.now() + "_" + cleanName + ext;
    const storageZone = this.getStorageZone();
    const accessKey = this.getAccessKey();
    const storageHostname = this.getHostname();
    const uploadUrl = "https://" + storageHostname + "/" + storageZone + "/" + folder + "/" + remoteFilename;

    console.log("[Bunny.net] Subiendo video: " + uploadUrl + " (" + buffer.length + " bytes)...");

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { AccessKey: accessKey, 'Content-Type': 'application/octet-stream' },
      body: buffer as any,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error("Error al subir video a Bunny.net (HTTP " + response.status + "): " + errorText);
    }

    const publicUrl = "https://" + storageZone + ".b-cdn.net/" + folder + "/" + remoteFilename;
    console.log("[Bunny.net] Video subido con exito: " + publicUrl);
    return {
      secure_url: publicUrl,
      public_id: folder + "/" + remoteFilename,
      format: ext.replace('.', ''),
      bytes: buffer.length,
      duration: 720,
    };
  }

  static async uploadImageBuffer(
    buffer: Buffer,
    filename: string,
    folder: string = 'images'
  ): Promise<BunnyUploadResult> {
    const cleanName = path.parse(filename).name.replace(/[^a-zA-Z0-9_-]/g, '') || 'image';
    const ext = path.parse(filename).ext || '.jpg';
    const remoteFilename = "img_" + Date.now() + "_" + cleanName + ext;
    const storageZone = this.getStorageZone();
    const accessKey = this.getAccessKey();
    const storageHostname = this.getHostname();
    const uploadUrl = "https://" + storageHostname + "/" + storageZone + "/" + folder + "/" + remoteFilename;

    console.log("[Bunny.net] Subiendo imagen: " + uploadUrl + " (" + buffer.length + " bytes)...");

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { AccessKey: accessKey, 'Content-Type': 'application/octet-stream' },
      body: buffer as any,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error("Error al subir imagen a Bunny.net (HTTP " + response.status + "): " + errorText);
    }

    const publicUrl = "https://" + storageZone + ".b-cdn.net/" + folder + "/" + remoteFilename;
    console.log("[Bunny.net] Imagen subida con exito: " + publicUrl);
    return {
      secure_url: publicUrl,
      public_id: folder + "/" + remoteFilename,
      format: ext.replace('.', ''),
      bytes: buffer.length,
    };
  }

  static async deleteAsset(publicPath: string): Promise<boolean> {
    try {
      const storageZone = this.getStorageZone();
      const accessKey = this.getAccessKey();
      const storageHostname = this.getHostname();
      const deleteUrl = "https://" + storageHostname + "/" + storageZone + "/" + publicPath;
      const response = await fetch(deleteUrl, { method: 'DELETE', headers: { AccessKey: accessKey } });
      return response.ok || response.status === 404;
    } catch (err: any) {
      console.warn("[Bunny.net] Error al eliminar asset " + publicPath + ":", err.message);
      return true;
    }
  }
}
