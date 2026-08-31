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
import { Plus, CheckCircle2, Sparkles, X, Camera, Image as ImageIcon } from 'lucide-react-native';
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

  // Modal para crear historia (Creador o Admin)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pickedImageUri, setPickedImageUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const canPostStory = user?.role === 'CREATOR' || user?.role === 'ADMIN';

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos para subir historias.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPickedImageUri(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo seleccionar la imagen de la galería.');
    }
  };

  const handlePublishStory = async () => {
    if (!pickedImageUri || !userToken) return;

    setIsUploading(true);
    try {
      // 1. Subir imagen a Cloudinary / Servidor local
      const uploadRes = await api.cloudinary.uploadImageFile(userToken, pickedImageUri);
      if (!uploadRes || !uploadRes.secure_url) {
        throw new Error('No se pudo subir la imagen de la historia.');
      }

      // 2. Crear historia de 24h
      await api.stories.createStory(userToken, {
        mediaUrl: uploadRes.secure_url,
        mediaType: 'IMAGE',
        caption: caption.trim() || undefined,
      });

      setShowCreateModal(false);
      setPickedImageUri(null);
      setCaption('');
      onRefreshStories();
      Alert.alert('¡Historia Publicada!', 'Tu historia de 24 horas ya está visible para todos los espectadores.');
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
              <Image
                source={{
                  uri:
                    user?.avatarUrl ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop',
                }}
                style={styles.avatarImage}
              />
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

            {/* Selector de Foto */}
            <TouchableOpacity
              style={styles.pickImageArea}
              onPress={handlePickImage}
              activeOpacity={0.85}
            >
              {pickedImageUri ? (
                <Image source={{ uri: pickedImageUri }} style={styles.previewImage} />
              ) : (
                <View style={styles.pickImagePlaceholder}>
                  <Camera size={36} color="#FF2D55" />
                  <Text style={styles.pickImageText}>Seleccionar Foto o Adelanto (9:16)</Text>
                  <Text style={styles.pickImageSub}>Toca para abrir tu galería</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Pie de Foto Opcional */}
            <TextInput
              style={styles.captionInput}
              placeholder="Escribe un mensaje o adelanto para tus seguidores..."
              placeholderTextColor="#777"
              value={caption}
              onChangeText={setCaption}
              maxLength={150}
            />

            {/* Botón de Publicar */}
            <TouchableOpacity
              style={[
                styles.publishStoryBtn,
                (!pickedImageUri || isUploading) && { opacity: 0.5 },
              ]}
              onPress={handlePublishStory}
              disabled={!pickedImageUri || isUploading}
              activeOpacity={0.85}
            >
              {isUploading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.publishStoryBtnText}>Publicar Historia (24h)</Text>
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
});
