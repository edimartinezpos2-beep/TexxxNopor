// Servicio de Almacenamiento y Descargas Offline para TexxxNopor
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VideoItem } from './api';

export interface DownloadedVideoItem extends VideoItem {
  downloadedAt: string;
  fileSizeFormatted: string;
  isOfflineAvailable: boolean;
}

const STORAGE_KEY = '@texxxnopor_offline_downloads';

// Almacén en memoria persistente
let offlineDownloadsStore: DownloadedVideoItem[] = [];
let isInitialized = false;

const initStore = async () => {
  if (isInitialized) return;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        offlineDownloadsStore = parsed;
      }
    }
  } catch (err) {
    console.log('[OfflineStorage] Error loading persisted downloads:', err);
  } finally {
    isInitialized = true;
  }
};

const persistStore = async () => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(offlineDownloadsStore));
  } catch (err) {
    console.log('[OfflineStorage] Error persisting downloads:', err);
  }
};

export const offlineStorage = {
  /**
   * Obtener todos los videos descargados
   */
  async getDownloads(): Promise<DownloadedVideoItem[]> {
    await initStore();
    return [...offlineDownloadsStore];
  },

  /**
   * Verificar si un video ya está descargado
   */
  async isDownloaded(videoId: string): Promise<boolean> {
    await initStore();
    return offlineDownloadsStore.some((v) => v.id === videoId);
  },

  /**
   * Guardar un video para reproducción offline
   */
  async saveVideo(
    video: VideoItem,
    onProgress?: (progress: number) => void
  ): Promise<DownloadedVideoItem> {
    await initStore();
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
    await persistStore();
    return downloadedItem;
  },

  /**
   * Eliminar video de las descargas
   */
  async removeDownload(videoId: string): Promise<boolean> {
    await initStore();
    offlineDownloadsStore = offlineDownloadsStore.filter((v) => v.id !== videoId);
    await persistStore();
    return true;
  },

  /**
   * Borrar todas las descargas
   */
  async clearAllDownloads(): Promise<boolean> {
    offlineDownloadsStore = [];
    await persistStore();
    return true;
  },
};
