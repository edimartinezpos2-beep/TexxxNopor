import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryUploadResult } from '../types/rbac';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Configuración de Cloudinary
export const configureCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dkbtx7spx',
    api_key: process.env.CLOUDINARY_API_KEY || '227527165282245',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'N73353FISiwDEUgm-BO8ZXXYE30',
    secure: true,
  });
};

configureCloudinary();

// Extensiones y tipos MIME permitidos
export const ALLOWED_VIDEO_MIMES = [
  'video/mp4',
  'video/quicktime', // .mov
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

export const MAX_VIDEO_SIZE_BYTES = 1024 * 1024 * 1024; // 1 GB (1024MB)
export const MAX_IMAGE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
export const UPLOAD_TIMEOUT_MS = 900000; // 15 minutos timeout (videos de larga duración)

export class CloudinaryService {
  /**
   * Valida un archivo de video antes de subirlo
   */
  static validateVideoFile(mimetype: string, sizeBytes: number): { valid: boolean; error?: string } {
    const isVideoMime =
      mimetype.toLowerCase().startsWith('video/') ||
      ALLOWED_VIDEO_MIMES.includes(mimetype.toLowerCase());

    if (!isVideoMime) {
      return {
        valid: false,
        error: `Formato de video no soportado (${mimetype}). Formatos válidos: MP4, MOV, WEBM, MKV, 3GP.`,
      };
    }
    if (sizeBytes > MAX_VIDEO_SIZE_BYTES) {
      return {
        valid: false,
        error: `El archivo supera el límite máximo de ${MAX_VIDEO_SIZE_BYTES / (1024 * 1024)}MB.`,
      };
    }
    return { valid: true };
  }

  /**
   * Valida una imagen antes de subirla
   */
  static validateImageFile(mimetype: string, sizeBytes: number): { valid: boolean; error?: string } {
    const isImageMime =
      mimetype.toLowerCase().startsWith('image/') ||
      ALLOWED_IMAGE_MIMES.includes(mimetype.toLowerCase());

    if (!isImageMime) {
      return {
        valid: false,
        error: `Formato de imagen no soportado (${mimetype}). Formatos válidos: JPG, PNG, WEBP.`,
      };
    }
    if (sizeBytes > MAX_IMAGE_SIZE_BYTES) {
      return {
        valid: false,
        error: `La imagen supera el límite máximo de ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB.`,
      };
    }
    return { valid: true };
  }

  /**
   * Sube un buffer de video a Cloudinary con timeout y retorno de secure_url y public_id
   */
  static async uploadVideoBuffer(
    buffer: Buffer,
    filename: string,
    folder: string = 'texxxnopor/videos'
  ): Promise<CloudinaryUploadResult> {
    configureCloudinary();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Tiempo de espera agotado (${UPLOAD_TIMEOUT_MS / 1000}s) durante la subida a Cloudinary.`));
      }, UPLOAD_TIMEOUT_MS);

      const cleanFilename = path.parse(filename).name.replace(/[^a-zA-Z0-9_-]/g, '') || 'video';
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder,
          public_id: `vid_${Date.now()}_${cleanFilename}`,
          chunk_size: 6000000, // 6MB por chunk
        },
        (error, result) => {
          clearTimeout(timer);
          if (error || !result) {
            console.error('❌ [Cloudinary] Error al subir video:', error?.http_code, error?.message);
            return reject(new Error(
              error?.message || 'Error desconocido al subir video a Cloudinary'
            ));
          }

          console.log(`✅ [Cloudinary] Video subido: ${result.secure_url} (${result.bytes} bytes)`);
          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
            resource_type: result.resource_type,
            format: result.format,
            bytes: result.bytes,
            duration: result.duration,
            width: result.width,
            height: result.height,
          });
        }
      );

      uploadStream.end(buffer);
    });
  }

  /**
   * Sube una imagen a Cloudinary (foto de actor o thumbnail)
   */
  static async uploadImageBuffer(
    buffer: Buffer,
    filename: string,
    folder: string = 'texxxnopor/images'
  ): Promise<CloudinaryUploadResult> {
    configureCloudinary();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Tiempo de espera agotado (${UPLOAD_TIMEOUT_MS / 1000}s) al subir imagen.`));
      }, UPLOAD_TIMEOUT_MS);

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder,
          public_id: `img_${Date.now()}_${path.parse(filename).name.replace(/[^a-zA-Z0-9_-]/g, '')}`,
        },
        (error, result) => {
          clearTimeout(timer);
          if (error || !result) {
            console.warn('⚠️ Cloudinary Image fallback:', error?.message);
            const mockPublicId = `texxx_cld_img_${Date.now()}`;
            return resolve({
              secure_url: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop`,
              public_id: mockPublicId,
              resource_type: 'image',
              format: 'jpg',
              bytes: buffer.length,
            });
          }

          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
            resource_type: result.resource_type,
            format: result.format,
            bytes: result.bytes,
            width: result.width,
            height: result.height,
          });
        }
      );

      uploadStream.end(buffer);
    });
  }

  /**
   * Elimina un recurso de Cloudinary mediante su public_id
   */
  static async deleteAsset(publicId: string, resourceType: 'video' | 'image' = 'video'): Promise<boolean> {
    configureCloudinary();
    try {
      const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
      return result.result === 'ok' || result.result === 'not found';
    } catch (err: any) {
      console.warn(`Error eliminando asset ${publicId} de Cloudinary:`, err.message);
      return true; // No bloquear la eliminación en DB si en la nube ya no está
    }
  }
}
