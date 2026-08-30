"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BunnyService = exports.UPLOAD_TIMEOUT_MS = exports.MAX_IMAGE_SIZE_BYTES = exports.MAX_VIDEO_SIZE_BYTES = exports.ALLOWED_IMAGE_MIMES = exports.ALLOWED_VIDEO_MIMES = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const child_process_1 = require("child_process");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.ALLOWED_VIDEO_MIMES = [
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
exports.ALLOWED_IMAGE_MIMES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/jpg',
    'application/octet-stream',
];
exports.MAX_VIDEO_SIZE_BYTES = 1024 * 1024 * 1024; // 1 GB
exports.MAX_IMAGE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
exports.UPLOAD_TIMEOUT_MS = 900000; // 15 minutos
class BunnyService {
    static getStorageZone() {
        return process.env.BUNNY_STORAGE_ZONE_NAME || 'texxxnopor';
    }
    static getAccessKey() {
        return process.env.BUNNY_ACCESS_KEY || '';
    }
    static getHostname() {
        return process.env.BUNNY_STORAGE_HOSTNAME || 'storage.bunnycdn.com';
    }
    static getCdnHostname() {
        return process.env.BUNNY_CDN_HOSTNAME || 'texxxnopor.b-cdn.net';
    }
    static validateVideoFile(mimetype, sizeBytes) {
        const isVideoMime = mimetype.toLowerCase().startsWith('video/') ||
            exports.ALLOWED_VIDEO_MIMES.includes(mimetype.toLowerCase());
        if (!isVideoMime) {
            return {
                valid: false,
                error: "Formato de video no soportado (" + mimetype + "). Formatos validos: MP4, MOV, WEBM, MKV, 3GP.",
            };
        }
        if (sizeBytes > exports.MAX_VIDEO_SIZE_BYTES) {
            return {
                valid: false,
                error: "El archivo supera el limite maximo de " + (exports.MAX_VIDEO_SIZE_BYTES / (1024 * 1024)) + "MB.",
            };
        }
        return { valid: true };
    }
    static validateImageFile(mimetype, sizeBytes) {
        const isImageMime = mimetype.toLowerCase().startsWith('image/') ||
            exports.ALLOWED_IMAGE_MIMES.includes(mimetype.toLowerCase());
        if (!isImageMime) {
            return {
                valid: false,
                error: "Formato de imagen no soportado (" + mimetype + "). Formatos validos: JPG, PNG, WEBP.",
            };
        }
        if (sizeBytes > exports.MAX_IMAGE_SIZE_BYTES) {
            return {
                valid: false,
                error: "La imagen supera el limite maximo de " + (exports.MAX_IMAGE_SIZE_BYTES / (1024 * 1024)) + "MB.",
            };
        }
        return { valid: true };
    }
    /**
     * Extrae automaticamente una captura de fotograma del video usando ffmpeg.
     * Toma un fotograma en el segundo indicado (por defecto segundo 2).
     */
    static async extractThumbnailFromBuffer(videoBuffer, atSecond = 2) {
        const tmpDir = os_1.default.tmpdir();
        const timestamp = Date.now();
        const tmpVideoPath = path_1.default.join(tmpDir, "txnp_vid_" + timestamp + ".mp4");
        const tmpThumbPath = path_1.default.join(tmpDir, "txnp_thumb_" + timestamp + ".jpg");
        try {
            fs_1.default.writeFileSync(tmpVideoPath, videoBuffer);
            let ffmpegBin = 'ffmpeg';
            try {
                const ffmpegStatic = require('ffmpeg-static');
                if (ffmpegStatic)
                    ffmpegBin = ffmpegStatic;
            }
            catch (_e) { }
            console.log("🎬 [BunnyService] Extrayendo captura de video en segundo " + atSecond + " con ffmpeg...");
            (0, child_process_1.execFileSync)(ffmpegBin, [
                '-ss', String(atSecond),
                '-i', tmpVideoPath,
                '-frames:v', '1',
                '-q:v', '2',
                '-y',
                tmpThumbPath,
            ], { timeout: 30000, stdio: 'pipe' });
            if (!fs_1.default.existsSync(tmpThumbPath)) {
                console.warn('⚠️ [BunnyService] ffmpeg no genero el archivo de captura');
                return null;
            }
            const thumbBuffer = fs_1.default.readFileSync(tmpThumbPath);
            const filename = "thumb_auto_" + timestamp + ".jpg";
            console.log("✅ [BunnyService] Captura de miniatura generada exitosamente (" + thumbBuffer.length + " bytes)");
            return { buffer: thumbBuffer, filename };
        }
        catch (err) {
            console.warn('⚠️ [BunnyService] Error al extraer miniatura del video:', err.message);
            return null;
        }
        finally {
            try {
                fs_1.default.unlinkSync(tmpVideoPath);
            }
            catch (_e) { }
            try {
                fs_1.default.unlinkSync(tmpThumbPath);
            }
            catch (_e) { }
        }
    }
    static async uploadVideoBuffer(buffer, filename, folder = 'videos') {
        const cleanName = path_1.default.parse(filename).name.replace(/[^a-zA-Z0-9_-]/g, '') || 'video';
        const ext = path_1.default.parse(filename).ext || '.mp4';
        const remoteFilename = "vid_" + Date.now() + "_" + cleanName + ext;
        const storageZone = this.getStorageZone();
        const accessKey = this.getAccessKey();
        const storageHostname = this.getHostname();
        const uploadUrl = "https://" + storageHostname + "/" + storageZone + "/" + folder + "/" + remoteFilename;
        console.log("[Bunny.net] Subiendo video: " + uploadUrl + " (" + buffer.length + " bytes)...");
        const response = await fetch(uploadUrl, {
            method: 'PUT',
            headers: { AccessKey: accessKey, 'Content-Type': 'application/octet-stream' },
            body: buffer,
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
    static async uploadImageBuffer(buffer, filename, folder = 'images') {
        const cleanName = path_1.default.parse(filename).name.replace(/[^a-zA-Z0-9_-]/g, '') || 'image';
        const ext = path_1.default.parse(filename).ext || '.jpg';
        const remoteFilename = "img_" + Date.now() + "_" + cleanName + ext;
        const storageZone = this.getStorageZone();
        const accessKey = this.getAccessKey();
        const storageHostname = this.getHostname();
        const uploadUrl = "https://" + storageHostname + "/" + storageZone + "/" + folder + "/" + remoteFilename;
        console.log("[Bunny.net] Subiendo imagen: " + uploadUrl + " (" + buffer.length + " bytes)...");
        const response = await fetch(uploadUrl, {
            method: 'PUT',
            headers: { AccessKey: accessKey, 'Content-Type': 'application/octet-stream' },
            body: buffer,
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
    static async deleteAsset(publicPath) {
        try {
            const storageZone = this.getStorageZone();
            const accessKey = this.getAccessKey();
            const storageHostname = this.getHostname();
            const deleteUrl = "https://" + storageHostname + "/" + storageZone + "/" + publicPath;
            const response = await fetch(deleteUrl, { method: 'DELETE', headers: { AccessKey: accessKey } });
            return response.ok || response.status === 404;
        }
        catch (err) {
            console.warn("[Bunny.net] Error al eliminar asset " + publicPath + ":", err.message);
            return true;
        }
    }
}
exports.BunnyService = BunnyService;
