// Servicio de Almacenamiento y Descargas Offline para TexxxNopor
import { VideoItem } from './api';

export interface DownloadedVideoItem extends VideoItem {
  downloadedAt: string;
  fileSizeFormatted: string;
  isOfflineAvailable: boolean;
}

// Almacén en memoria persistente durante la sesión
let offlineDownloadsStore: DownloadedVideoItem[] = [
  {
    id: 'v_demo_offline_1',
    title: 'Sesión Exclusiva 4K Ultra HD',
    description: 'Video descargado para reproducción sin conexión / modo avión.',
    creatorName: 'Alexis Texas',
    creatorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop',
    duration: '22:15',
    views: '12.4k vistas',
    likesCount: 1420,
    thumbnailUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop',
    videoUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    hlsMasterUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    category: 'Para ti',
    tags: ['#parati', '#4k', '#offline'],
    downloadedAt: new Date().toLocaleDateString('es-CO'),
    fileSizeFormatted: '48.5 MB',
    isOfflineAvailable: true,
  },
];

export const offlineStorage = {
  /**
   * Obtener todos los videos descargados
   */
  async getDownloads(): Promise<DownloadedVideoItem[]> {
    return [...offlineDownloadsStore];
  },

  /**
   * Verificar si un video ya está descargado
   */
  async isDownloaded(videoId: string): Promise<boolean> {
    return offlineDownloadsStore.some((v) => v.id === videoId);
  },

  /**
   * Guardar un video para reproducción offline
   */
  async saveVideo(
    video: VideoItem,
    onProgress?: (progress: number) => void
  ): Promise<DownloadedVideoItem> {
    // Si ya existe, retornar
    const existing = offlineDownloadsStore.find((v) => v.id === video.id);
    if (existing) return existing;

    // Simular descarga con progreso fluido (0 -> 100)
    for (let p = 10; p <= 100; p += 25) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      if (onProgress) onProgress(p);
    }

    const estimatedSizeMb = (Math.random() * 30 + 35).toFixed(1);
    const downloadedItem: DownloadedVideoItem = {
      ...video,
      downloadedAt: new Date().toLocaleDateString('es-CO'),
      fileSizeFormatted: `${estimatedSizeMb} MB`,
      isOfflineAvailable: true,
    };

    offlineDownloadsStore.unshift(downloadedItem);
    return downloadedItem;
  },

  /**
   * Eliminar video de las descargas
   */
  async removeDownload(videoId: string): Promise<boolean> {
    offlineDownloadsStore = offlineDownloadsStore.filter((v) => v.id !== videoId);
    return true;
  },

  /**
   * Borrar todas las descargas
   */
  async clearAllDownloads(): Promise<boolean> {
    offlineDownloadsStore = [];
    return true;
  },
};
