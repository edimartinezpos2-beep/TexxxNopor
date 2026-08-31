import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import {
  ArrowLeft,
  Download,
  Trash2,
  Play,
  HardDrive,
  CheckCircle2,
  X,
  Sparkles,
} from 'lucide-react-native';
import { offlineStorage, DownloadedVideoItem } from '../services/offlineStorage';
import { VideoItem } from '../services/api';

interface OfflineDownloadsModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectVideo?: (video: VideoItem) => void;
}

export const OfflineDownloadsModal: React.FC<OfflineDownloadsModalProps> = ({
  visible,
  onClose,
  onSelectVideo,
}) => {
  const [downloads, setDownloads] = useState<DownloadedVideoItem[]>([]);

  const loadDownloads = async () => {
    const list = await offlineStorage.getDownloads();
    setDownloads(list);
  };

  useEffect(() => {
    if (visible) {
      loadDownloads();
    }
  }, [visible]);

  const handleDeleteItem = (video: DownloadedVideoItem) => {
    Alert.alert(
      'Eliminar Descarga',
      `¿Deseas eliminar "${video.title}" de la memoria offline?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await offlineStorage.removeDownload(video.id);
            loadDownloads();
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    if (downloads.length === 0) return;

    Alert.alert(
      'Borrar Todo el Almacenamiento',
      '¿Deseas eliminar todos los videos descargados para liberar espacio en tu dispositivo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar Todo',
          style: 'destructive',
          onPress: async () => {
            await offlineStorage.clearAllDownloads();
            loadDownloads();
          },
        },
      ]
    );
  };

  const handlePlayVideo = (item: DownloadedVideoItem) => {
    onClose();
    if (onSelectVideo) {
      onSelectVideo(item);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.headerTitle}>Mis Descargas Offline</Text>
              <View style={styles.badgeOffline}>
                <Text style={styles.badgeOfflineText}>MODO AVIÓN</Text>
              </View>
            </View>
            <Text style={styles.headerSub}>
              {downloads.length} {downloads.length === 1 ? 'video disponible' : 'videos disponibles'} sin conexión
            </Text>
          </View>

          {downloads.length > 0 && (
            <TouchableOpacity onPress={handleClearAll} style={styles.clearAllBtn} activeOpacity={0.7}>
              <Trash2 size={18} color="#FF453A" />
            </TouchableOpacity>
          )}
        </View>

        {/* Lista de Videos Descargados */}
        {downloads.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Download size={42} color="#FF2D55" />
            </View>
            <Text style={styles.emptyTitle}>No tienes descargas aún</Text>
            <Text style={styles.emptyDesc}>
              Toca el botón "Descargar" en cualquier video para guardarlo en la memoria del dispositivo y disfrutarlo sin conexión a internet o con datos apagados.
            </Text>
          </View>
        ) : (
          <FlatList
            data={downloads}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <TouchableOpacity
                  style={styles.thumbnailWrap}
                  onPress={() => handlePlayVideo(item)}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
                  <View style={styles.playOverlay}>
                    <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
                  </View>
                  <View style={styles.durationBadge}>
                    <Text style={styles.durationText}>{item.duration}</Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.infoCol}>
                  <TouchableOpacity onPress={() => handlePlayVideo(item)} activeOpacity={0.85}>
                    <Text style={styles.itemTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.actorName} numberOfLines={1}>
                    {item.actorName || item.creatorName || 'TexxxNopor Oficial'}
                  </Text>

                  <View style={styles.metaRow}>
                    <View style={styles.sizePill}>
                      <HardDrive size={11} color="#30D158" style={{ marginRight: 4 }} />
                      <Text style={styles.sizeText}>{item.fileSizeFormatted}</Text>
                    </View>
                    <View style={styles.readyPill}>
                      <CheckCircle2 size={11} color="#30D158" style={{ marginRight: 3 }} />
                      <Text style={styles.readyText}>Listo Offline</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteItem(item)}
                  activeOpacity={0.7}
                >
                  <Trash2 size={18} color="#8E8E93" />
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A24',
    backgroundColor: '#121218',
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
  headerSub: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 2,
  },
  badgeOffline: {
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#30D158',
  },
  badgeOfflineText: {
    color: '#30D158',
    fontSize: 9,
    fontWeight: 'bold',
  },
  clearAllBtn: {
    padding: 8,
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.3)',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
  },
  emptyIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255, 45, 85, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 45, 85, 0.3)',
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyDesc: {
    color: '#8E8E93',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    padding: 16,
    gap: 14,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#14141C',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#242430',
    alignItems: 'center',
  },
  thumbnailWrap: {
    width: 110,
    height: 75,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1E1E28',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  infoCol: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  itemTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  actorName: {
    color: '#8E8E93',
    fontSize: 11,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sizePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(48, 209, 88, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sizeText: {
    color: '#30D158',
    fontSize: 10,
    fontWeight: '600',
  },
  readyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E28',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  readyText: {
    color: '#FFFFFF',
    fontSize: 10,
  },
  deleteBtn: {
    padding: 8,
    marginLeft: 4,
  },
});
