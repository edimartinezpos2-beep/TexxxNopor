import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Plus, CheckCircle2, Sparkles, X, Camera, Image as ImageIcon, User, Video as VideoIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { ActorStoryGroup, api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StoryViewerModal } from './StoryViewerModal';

interface StoriesCarouselProps {
  storyGroups: ActorStoryGroup[];
  onRefreshStories: () => void;
  onViewActor?: (actorId?: string, actorName?: string) => void;
}

export const StoriesCarousel: React.FC<StoriesCarouselProps> = ({
  storyGroups,
  onRefreshStories,
  onViewActor,
}) => {
  const { user, userToken } = useAuth();
  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);

  // Modal para crear historia
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pickedMediaUri, setPickedMediaUri] = useState<string | null>(null);
  const [pickedMediaType, setPickedMediaType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Permitir a cualquier usuario autenticado (o creador/admin) compartir historias
  const canPostStory = !!user;

  const handlePickMedia = async (typeFilter: 'ALL' | 'IMAGE' | 'VIDEO' = 'ALL') => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos y videos para subir historias.');
        return;
      }

      let mediaTypes = ImagePicker.MediaTypeOptions.All;
      if (typeFilter === 'IMAGE') mediaTypes = ImagePicker.MediaTypeOptions.Images;
      if (typeFilter === 'VIDEO') mediaTypes = ImagePicker.MediaTypeOptions.Videos;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.85,
        videoMaxDuration: 60,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setPickedMediaUri(asset.uri);
        const isVideo = asset.type === 'video' || asset.uri.toLowerCase().endsWith('.mp4') || asset.uri.toLowerCase().endsWith('.mov');
        setPickedMediaType(isVideo ? 'VIDEO' : 'IMAGE');
      }
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo seleccionar el archivo multimedia.');
    }
  };

  const handlePublishStory = async () => {
    if (!pickedMediaUri || !userToken) return;

    setIsUploading(true);
    try {
      let mediaUrl = '';

      if (pickedMediaType === 'VIDEO') {
        const uploadRes = await api.cloudinary.uploadVideoFile(userToken, pickedMediaUri);
        if (!uploadRes || !uploadRes.secure_url) {
          throw new Error('No se pudo procesar el video corto.');
        }
        mediaUrl = uploadRes.secure_url;
      } else {
        const uploadRes = await api.cloudinary.uploadImageFile(userToken, pickedMediaUri);
        if (!uploadRes || !uploadRes.secure_url) {
          throw new Error('No se pudo subir la foto de la historia.');
        }
        mediaUrl = uploadRes.secure_url;
      }

      // Crear historia de 24h
      await api.stories.createStory(userToken, {
        mediaUrl,
        mediaType: pickedMediaType,
        caption: caption.trim() || undefined,
      });

      setShowCreateModal(false);
      setPickedMediaUri(null);
      setCaption('');
      onRefreshStories();
      Alert.alert('¡Historia Publicada!', 'Tu historia de 24 horas ya está visible para los espectadores.');
    } catch (err: any) {
      Alert.alert('Error al publicar', err.message || 'No se pudo publicar la historia.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 1. Botón "Tu Historia (+)" para Creadores o Administradores */}
        {canPostStory && (
          <TouchableOpacity
            style={styles.storyItem}
            onPress={() => setShowCreateModal(true)}
            activeOpacity={0.85}
          >
            <View style={styles.myStoryAvatarWrap}>
              {user?.avatarUrl ? (
                <Image
                  source={{ uri: user.avatarUrl }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={[styles.avatarImage, { backgroundColor: '#262626', justifyContent: 'center', alignItems: 'center' }]}>
                  <User size={22} color="#888888" />
                </View>
              )}
              <View style={styles.plusBadge}>
                <Plus size={14} color="#FFFFFF" strokeWidth={3} />
              </View>
            </View>
            <Text style={styles.storyNameText} numberOfLines={1}>
              Tu historia
            </Text>
          </TouchableOpacity>
        )}

        {/* 2. Círculos de Historias de Actores */}
        {storyGroups.map((group, index) => {
          const hasUnseen = group.hasUnseen;
          return (
            <TouchableOpacity
              key={group.actorId}
              style={styles.storyItem}
              onPress={() => setActiveGroupIndex(index)}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.avatarRing,
                  hasUnseen ? styles.unseenRing : styles.seenRing,
                ]}
              >
                <Image source={{ uri: group.actorAvatar }} style={styles.avatarImage} />
              </View>
              <Text
                style={[
                  styles.storyNameText,
                  hasUnseen && { color: '#FFFFFF', fontWeight: 'bold' },
                ]}
                numberOfLines={1}
              >
                {group.actorName}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Visor de Historias en Pantalla Completa */}
      {activeGroupIndex !== null && (
        <StoryViewerModal
          visible={activeGroupIndex !== null}
          storyGroups={storyGroups}
          initialGroupIndex={activeGroupIndex}
          onClose={() => {
            setActiveGroupIndex(null);
            onRefreshStories();
          }}
          onViewActor={onViewActor}
        />
      )}

      {/* Modal para Crear Historia (Creadores / Admin) */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.createModalOverlay}>
          <View style={styles.createModalCard}>
            <View style={styles.createModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Sparkles size={18} color="#FF2D55" />
                <Text style={styles.createModalTitle}>Nueva Historia de 24h</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Selector de Foto o Video */}
            <View style={styles.mediaTypeRow}>
              <TouchableOpacity
                style={[
                  styles.mediaTypeTab,
                  pickedMediaType === 'IMAGE' && styles.mediaTypeTabActive,
                ]}
                onPress={() => handlePickMedia('IMAGE')}
                activeOpacity={0.8}
              >
                <ImageIcon size={16} color={pickedMediaType === 'IMAGE' ? '#CEFF00' : '#8E8E93'} />
                <Text
                  style={[
                    styles.mediaTypeTabText,
                    pickedMediaType === 'IMAGE' && styles.mediaTypeTabTextActive,
                  ]}
                >
                  Foto
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.mediaTypeTab,
                  pickedMediaType === 'VIDEO' && styles.mediaTypeTabActive,
                ]}
                onPress={() => handlePickMedia('VIDEO')}
                activeOpacity={0.8}
              >
                <VideoIcon size={16} color={pickedMediaType === 'VIDEO' ? '#CEFF00' : '#8E8E93'} />
                <Text
                  style={[
                    styles.mediaTypeTabText,
                    pickedMediaType === 'VIDEO' && styles.mediaTypeTabTextActive,
                  ]}
                >
                  Video Corto
                </Text>
              </TouchableOpacity>
            </View>

            {/* Selector / Vista Previa */}
            <TouchableOpacity
              style={styles.pickImageArea}
              onPress={() => handlePickMedia('ALL')}
              activeOpacity={0.85}
            >
              {pickedMediaUri ? (
                <View style={styles.previewContainer}>
                  {pickedMediaType === 'VIDEO' ? (
                    <View style={styles.videoPreviewPlaceholder}>
                      <VideoIcon size={44} color="#CEFF00" />
                      <Text style={styles.videoBadgeText}>✓ Video Corto Seleccionado</Text>
                      <Text style={styles.videoBadgeSub}>Listo para publicar en historias de 24h</Text>
                    </View>
                  ) : (
                    <Image source={{ uri: pickedMediaUri }} style={styles.previewImage} />
                  )}
                  <View style={styles.mediaTypeBadge}>
                    <Text style={styles.mediaTypeBadgeText}>
                      {pickedMediaType === 'VIDEO' ? '📹 VIDEO' : '📸 FOTO'}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.pickImagePlaceholder}>
                  <Camera size={36} color="#FF2D55" />
                  <Text style={styles.pickImageText}>Seleccionar Foto o Video Corto</Text>
                  <Text style={styles.pickImageSub}>Toca aquí para abrir tu galería (24 horas)</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Pie de Foto Opcional */}
            <TextInput
              style={styles.captionInput}
              placeholder="Escribe un mensaje o descripción de tu historia..."
              placeholderTextColor="#777"
              value={caption}
              onChangeText={setCaption}
              maxLength={150}
            />

            {/* Botón de Publicar */}
            <TouchableOpacity
              style={[
                styles.publishStoryBtn,
                (!pickedMediaUri || isUploading) && { opacity: 0.5 },
              ]}
              onPress={handlePublishStory}
              disabled={!pickedMediaUri || isUploading}
              activeOpacity={0.85}
            >
              {isUploading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.publishStoryBtnText}>
                  {pickedMediaType === 'VIDEO' ? 'Publicar Video en Historias (24h)' : 'Publicar Foto en Historias (24h)'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A24',
    backgroundColor: '#0A0A0F',
  },
  scrollContent: {
    paddingHorizontal: 14,
    gap: 14,
  },
  storyItem: {
    alignItems: 'center',
    width: 68,
  },
  avatarRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    padding: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unseenRing: {
    borderWidth: 2.5,
    borderColor: '#FF2D55',
  },
  seenRing: {
    borderWidth: 1.5,
    borderColor: '#3A3A48',
  },
  myStoryAvatarWrap: {
    width: 62,
    height: 62,
    borderRadius: 31,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    backgroundColor: '#1E1E24',
  },
  plusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FF2D55',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0A0A0F',
  },
  storyNameText: {
    color: '#8E8E93',
    fontSize: 11,
    marginTop: 5,
    textAlign: 'center',
  },
  createModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  createModalCard: {
    backgroundColor: '#13131A',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FF2D55',
  },
  createModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  createModalTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
  pickImageArea: {
    height: 240,
    borderRadius: 14,
    backgroundColor: '#1C1C26',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#2A2A38',
    borderStyle: 'dashed',
    marginBottom: 14,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  pickImagePlaceholder: {
    alignItems: 'center',
    gap: 8,
  },
  pickImageText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  pickImageSub: {
    color: '#8E8E93',
    fontSize: 11,
  },
  captionInput: {
    backgroundColor: '#1C1C26',
    borderRadius: 12,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#2A2A38',
    marginBottom: 16,
  },
  publishStoryBtn: {
    backgroundColor: '#FF2D55',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  publishStoryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  mediaTypeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  mediaTypeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: '#1C1C26',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2A38',
  },
  mediaTypeTabActive: {
    backgroundColor: 'rgba(206, 255, 0, 0.1)',
    borderColor: '#CEFF00',
  },
  mediaTypeTabText: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '600',
  },
  mediaTypeTabTextActive: {
    color: '#CEFF00',
    fontWeight: 'bold',
  },
  previewContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPreviewPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  videoBadgeText: {
    color: '#CEFF00',
    fontSize: 15,
    fontWeight: 'bold',
  },
  videoBadgeSub: {
    color: '#8E8E93',
    fontSize: 12,
  },
  mediaTypeBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  mediaTypeBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
