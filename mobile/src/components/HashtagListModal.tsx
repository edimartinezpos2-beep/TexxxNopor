import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import {
  Hash,
  X,
  Edit3,
  Check,
  Upload,
  Sparkles,
  Camera,
  Film,
  Lock,
  ChevronRight,
  RefreshCw,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export interface HashtagItem {
  id: string;
  name: string;
  count: number;
  countFormatted: string;
  imageUrl: string;
  badge?: string;
  updatedByActorName?: string;
}

interface HashtagListModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectHashtag?: (tagName: string) => void;
}

export const HashtagListModal: React.FC<HashtagListModalProps> = ({
  visible,
  onClose,
  onSelectHashtag,
}) => {
  const { colors } = useTheme();
  const { user, userToken } = useAuth();

  const isActor = Boolean(user?.role === 'CREATOR' || user?.role === 'ADMIN');

  const [hashtags, setHashtags] = useState<HashtagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');

  // Estados de edición (solo para Actores)
  const [editingTag, setEditingTag] = useState<HashtagItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const loadHashtags = async () => {
    setLoading(true);
    try {
      const list = await api.tags.getList();
      setHashtags(list);
    } catch {
      // Fallback
      setHashtags([
        { id: 'pop-tag-1', name: '#parati', count: 6, countFormatted: '6 videos', imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop' },
        { id: 'pop-tag-2', name: '#hd', count: 5, countFormatted: '5 videos', imageUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop' },
        { id: 'pop-tag-3', name: '#amateur', count: 3, countFormatted: '3 videos', imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop' },
        { id: 'pop-tag-4', name: '#pareja', count: 2, countFormatted: '2 videos', imageUrl: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=500&auto=format&fit=crop' },
        { id: 'pop-tag-5', name: '#nuevos', count: 2, countFormatted: '2 videos', imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500&auto=format&fit=crop' },
        { id: 'pop-tag-6', name: '#4k', count: 1, countFormatted: '1 video', imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&auto=format&fit=crop' },
        { id: 'pop-tag-7', name: '#masvideos', count: 1, countFormatted: '1 video', imageUrl: 'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?w=500&auto=format&fit=crop' },
        { id: 'pop-tag-8', name: '#estreno', count: 1, countFormatted: '1 video', imageUrl: 'https://images.unsplash.com/photo-1592478411213-6153e4ebc07d?w=500&auto=format&fit=crop' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadHashtags();
      setEditingTag(null);
    }
  }, [visible]);

  const handleStartEdit = (tag: HashtagItem) => {
    if (!isActor) {
      Alert.alert(
        'Acceso Exclusivo para Actores',
        'Solo los actores verificados de la plataforma tienen permisos para editar el nombre y foto de portada de los hashtags.'
      );
      return;
    }
    setEditingTag(tag);
    setEditName(tag.name);
    setEditImageUrl(tag.imageUrl);
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se requiere acceso a la galería para cambiar la foto del hashtag.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setEditImageUrl(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Error', 'No se pudo seleccionar la imagen.');
    }
  };

  const handleSaveTag = async () => {
    if (!editingTag || !userToken) return;
    if (!editName.trim()) {
      Alert.alert('Error', 'El nombre del hashtag no puede estar vacío.');
      return;
    }

    setIsSaving(true);
    try {
      const cleanName = editName.trim().startsWith('#') ? editName.trim().toLowerCase() : `#${editName.trim().toLowerCase()}`;
      await api.tags.update(userToken, editingTag.id, {
        name: cleanName,
        imageUrl: editImageUrl.trim(),
      });

      // Actualizar en memoria local
      setHashtags((prev) =>
        prev.map((t) =>
          t.id === editingTag.id
            ? { ...t, name: cleanName, imageUrl: editImageUrl.trim(), updatedByActorName: user?.username || 'Tú' }
            : t
        )
      );

      setSuccessToast(`¡Hashtag ${cleanName} actualizado con éxito!`);
      setTimeout(() => setSuccessToast(null), 3500);
      setEditingTag(null);
    } catch (err: any) {
      Alert.alert('Error al guardar', err?.message || 'No se pudo actualizar el hashtag.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredHashtags = hashtags.filter((t) =>
    t.name.toLowerCase().includes(searchFilter.trim().toLowerCase())
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.modalSheet, { backgroundColor: '#101014', borderColor: colors.border }]}>
          {/* Cabecera */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(255, 45, 85, 0.15)' }]}>
                <Hash size={20} color="#FF2D55" />
              </View>
              <View>
                <Text style={styles.title}>Lista de Hashtags</Text>
                <Text style={styles.subtitle}>
                  {isActor
                    ? '🎭 Modo Actor: Tienes permisos para modificar nombre y foto'
                    : 'Explora videos por hashtag y tendencias'}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Toast de Éxito */}
          {successToast && (
            <View style={styles.toastBox}>
              <Check size={16} color="#30D158" />
              <Text style={styles.toastText}>{successToast}</Text>
            </View>
          )}

          {/* Buscador de Hashtags */}
          <View style={styles.searchBox}>
            <Hash size={16} color="#8E8E93" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar hashtags (#amateur, #estreno)..."
              placeholderTextColor="#666666"
              value={searchFilter}
              onChangeText={setSearchFilter}
            />
            {searchFilter.length > 0 && (
              <TouchableOpacity onPress={() => setSearchFilter('')}>
                <X size={16} color="#8E8E93" />
              </TouchableOpacity>
            )}
          </View>

          {/* FORMULARIO DE EDICIÓN PARA ACTOR (SI HAY UN TAG SELECCIONADO) */}
          {editingTag && isActor && (
            <View style={styles.editPanel}>
              <View style={styles.editHeaderRow}>
                <Text style={styles.editTitle}>Editar Hashtag: {editingTag.name}</Text>
                <TouchableOpacity onPress={() => setEditingTag(null)}>
                  <X size={16} color="#8E8E93" />
                </TouchableOpacity>
              </View>

              <View style={styles.editForm}>
                <View style={styles.editImageRow}>
                  <Image source={{ uri: editImageUrl }} style={styles.editImagePreview as any} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <TouchableOpacity style={styles.uploadPhotoBtn} onPress={handlePickImage}>
                      <Camera size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.uploadPhotoBtnText}>Cambiar Foto (Galería)</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={styles.urlInput}
                      placeholder="O pega URL de imagen..."
                      placeholderTextColor="#666666"
                      value={editImageUrl}
                      onChangeText={setEditImageUrl}
                    />
                  </View>
                </View>

                <View style={{ marginTop: 8 }}>
                  <Text style={styles.inputLabel}>Nombre del Hashtag:</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="#nombre"
                    placeholderTextColor="#666666"
                  />
                </View>

                <View style={styles.editActionRow}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setEditingTag(null)}
                  >
                    <Text style={styles.cancelBtnText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleSaveTag}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Check size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.saveBtnText}>Guardar Cambios</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Lista de Hashtags */}
          {loading ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="large" color="#FF2D55" />
              <Text style={styles.loaderText}>Cargando lista de hashtags...</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContainer}>
              {filteredHashtags.map((tag) => (
                <View key={tag.id} style={styles.tagItemCard}>
                  {/* Foto de Portada del Hashtag */}
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={styles.tagInfoTouchable}
                    onPress={() => {
                      if (onSelectHashtag) {
                        onSelectHashtag(tag.name);
                        onClose();
                      }
                    }}
                  >
                    <Image source={{ uri: tag.imageUrl }} style={styles.tagThumb as any} />
                    <View style={styles.tagDetails}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.tagName}>{tag.name}</Text>
                        {tag.badge && (
                          <View style={styles.badgeBox}>
                            <Text style={styles.badgeText}>{tag.badge}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.tagCount}>{tag.countFormatted}</Text>
                      {tag.updatedByActorName && (
                        <Text style={styles.tagEditorNote}>Foto editada por {tag.updatedByActorName}</Text>
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Botón de Modificar Solo para Actores */}
                  {isActor ? (
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => handleStartEdit(tag)}
                      activeOpacity={0.8}
                    >
                      <Edit3 size={15} color="#FFD700" style={{ marginRight: 4 }} />
                      <Text style={styles.editBtnText}>Editar</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.exploreArrowBtn}
                      onPress={() => {
                        if (onSelectHashtag) {
                          onSelectHashtag(tag.name);
                          onClose();
                        }
                      }}
                    >
                      <ChevronRight size={18} color="#8E8E93" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {!isActor && (
                <View style={styles.actorOnlyNotice}>
                  <Lock size={14} color="#8E8E93" style={{ marginRight: 6 }} />
                  <Text style={styles.actorOnlyNoticeText}>
                    La modificación del nombre y foto de los hashtags está reservada exclusivamente para los actores verificados.
                  </Text>
                </View>
              )}

              <View style={{ height: 30 }} />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    color: '#8E8E93',
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#1E1E26',
    borderRadius: 16,
  },
  toastBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    borderColor: '#30D158',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 10,
    gap: 8,
  },
  toastText: {
    color: '#30D158',
    fontSize: 12,
    fontWeight: '600',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181820',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#262632',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
  },
  editPanel: {
    backgroundColor: '#161620',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#FFD700',
  },
  editHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  editTitle: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: 'bold',
  },
  editForm: {
    gap: 10,
  },
  editImageRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  editImagePreview: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#242430',
  },
  uploadPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF2D55',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  uploadPhotoBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  urlInput: {
    backgroundColor: '#0E0E14',
    borderWidth: 1,
    borderColor: '#2A2A38',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    color: '#FFFFFF',
    fontSize: 11,
  },
  inputLabel: {
    color: '#8E8E93',
    fontSize: 11,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#0E0E14',
    borderWidth: 1,
    borderColor: '#2A2A38',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  editActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 6,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#262632',
  },
  cancelBtnText: {
    color: '#CCCCCC',
    fontSize: 12,
    fontWeight: '600',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#30D158',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  listContainer: {
    paddingBottom: 20,
    gap: 8,
  },
  tagItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#161620',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#242430',
  },
  tagInfoTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  tagThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#242430',
  },
  tagDetails: {
    flex: 1,
  },
  tagName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  badgeBox: {
    backgroundColor: '#FF2D55',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  tagCount: {
    color: '#8E8E93',
    fontSize: 11,
    marginTop: 2,
  },
  tagEditorNote: {
    color: '#FFD700',
    fontSize: 9,
    marginTop: 2,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderWidth: 1,
    borderColor: '#FFD700',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  editBtnText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: 'bold',
  },
  exploreArrowBtn: {
    padding: 8,
  },
  actorOnlyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16161E',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  actorOnlyNoticeText: {
    color: '#8E8E93',
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  loaderBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 10,
  },
});
