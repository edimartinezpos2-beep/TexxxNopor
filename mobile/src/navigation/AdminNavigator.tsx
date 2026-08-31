import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  Film,
  Users,
  UserCheck,
  BarChart3,
  CloudUpload,
  Plus,
  Trash2,
  Edit3,
  CheckCircle,
  X,
  Eye,
  Shield,
  Award,
  Globe,
  LogOut,
  Upload,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { UserRole, ActorItem, VideoItem, AdminUserItem } from '../types/auth';
import { COLORS } from '../theme/colors';

const Tab = createBottomTabNavigator();

// PANTALLA 1: GESTIÓN DE VIDEOS
const AdminVideosScreen: React.FC = () => {
  const { userToken } = useAuth();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [actors, setActors] = useState<ActorItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para Modal de Subida
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('Para ti');
  const [newDuration, setNewDuration] = useState('15:00');
  const [newActorId, setNewActorId] = useState('');
  const [newThumbnailUrl, setNewThumbnailUrl] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newCloudinaryId, setNewCloudinaryId] = useState('');
  const [newThumbnailPublicId, setNewThumbnailPublicId] = useState('');
  const [isUploadingToCloudinary, setIsUploadingToCloudinary] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState('');

  // Estados para Modal de Edición
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editActorId, setEditActorId] = useState('');
  const [editThumbnailUrl, setEditThumbnailUrl] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [videoList, actorList] = await Promise.all([
        api.videos.getFeed(userToken),
        api.actors.getActors(),
      ]);
      setVideos(videoList);
      setActors(actorList);
      if (actorList.length > 0 && !newActorId) {
        setNewActorId(actorList[0].id);
      }
    } catch (err) {
      console.log('Error loading admin videos:', err);
    } finally {
      setLoading(false);
    }
  }, [userToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Seleccionar y subir video real a Cloudinary
  const handlePickVideoForAdmin = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permiso Requerido', 'Se necesita acceso a la galería para seleccionar videos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setIsUploadingToCloudinary(true);
        setUploadStatusText('Subiendo video a Cloudinary...');

        const res = await api.cloudinary.uploadVideoFile(userToken || 'token_demo', asset.uri);
        if (res) {
          setNewVideoUrl(res.secure_url);
          setNewCloudinaryId(res.public_id);
          if (res.duration) setNewDuration(res.duration);
          if (!newTitle.trim() && asset.fileName) {
            setNewTitle(asset.fileName.replace(/\.[^/.]+$/, ''));
          }
          Alert.alert('¡Video Cargado!', 'El video se procesó y subió exitosamente a Cloudinary.');
        }
      }
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo procesar el video seleccionado.');
    } finally {
      setIsUploadingToCloudinary(false);
      setUploadStatusText('');
    }
  };

  // Seleccionar y subir miniatura opcional
  const handlePickThumbForAdmin = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permiso Requerido', 'Se necesita acceso a la galería.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsUploadingToCloudinary(true);
        setUploadStatusText('Subiendo miniatura opcional...');
        const res = await api.cloudinary.uploadImageFile(userToken || 'token_demo', result.assets[0].uri);
        if (res) {
          setNewThumbnailUrl(res.secure_url);
          setNewThumbnailPublicId(res.public_id);
        }
      }
    } catch (err: any) {
      console.log('Error subiendo miniatura:', err.message);
    } finally {
      setIsUploadingToCloudinary(false);
      setUploadStatusText('');
    }
  };

  // Crear video en DB / Backend
  const handleCreateVideo = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Campo Requerido', 'Por favor ingresa un título para el video.');
      return;
    }

    try {
      const created = await api.videos.uploadVideo(userToken || 'token_demo', {
        title: newTitle.trim(),
        description: newDesc.trim(),
        category: newCategory,
        duration: newDuration,
        actorId: newActorId,
        thumbnailUrl:
          newThumbnailUrl.trim() || undefined,
        thumbnailPublicId: newThumbnailPublicId || undefined,
        videoUrl:
          newVideoUrl.trim() || undefined,
        cloudinaryPublicId: newCloudinaryId || `texxx_cld_vid_${Date.now()}`,
      });

      setVideos((prev) => [created, ...prev]);
      setShowUploadModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewThumbnailUrl('');
      setNewThumbnailPublicId('');
      setNewVideoUrl('');
      setNewCloudinaryId('');
      Alert.alert('Video Publicado', 'El video fue subido y asociado al actor correctamente.');
    } catch (err) {
      Alert.alert('Error', 'No se pudo crear el video.');
    }
  };

  // Abrir Modal de Edición
  const openEditModal = (video: VideoItem) => {
    setEditingVideo(video);
    setEditTitle(video.title);
    setEditDesc(video.description);
    setEditCategory(video.category);
    setEditDuration(video.duration);
    setEditActorId(video.actorId || '');
    setEditThumbnailUrl(video.thumbnailUrl);
  };

  // Guardar Edición
  const handleSaveEdit = async () => {
    if (!editingVideo || !editTitle.trim()) return;

    try {
      const updated = await api.videos.updateVideo(userToken || 'token_demo', editingVideo.id, {
        title: editTitle.trim(),
        description: editDesc.trim(),
        category: editCategory,
        duration: editDuration,
        actorId: editActorId || undefined,
        thumbnailUrl: editThumbnailUrl.trim() || editingVideo.thumbnailUrl,
      });

      setVideos((prev) => prev.map((v) => (v.id === editingVideo.id ? updated : v)));
      setEditingVideo(null);
      Alert.alert('Video Actualizado', 'Los metadatos fueron modificados con éxito.');
    } catch (err) {
      Alert.alert('Error', 'No se pudo actualizar el video.');
    }
  };

  // Eliminar Video (DB + Cloudinary)
  const handleDeleteVideo = (video: VideoItem) => {
    Alert.alert(
      'Eliminar Video',
      `¿Deseas eliminar permanentemente "${video.title}" y su archivo en Cloudinary?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.videos.deleteVideo(userToken || 'token_demo', video.id);
              setVideos((prev) => prev.filter((v) => v.id !== video.id));
              Alert.alert('Video Eliminado', 'El registro y los recursos fueron removidos.');
            } catch (err) {
              Alert.alert('Error', 'No se pudo eliminar el video.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.screenContainer}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>Gestión de Videos (Cloudinary)</Text>
          <Text style={styles.subtitle}>CRUD de contenido multimedia y transmisión adaptativa</Text>
        </View>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => setShowUploadModal(true)}
          activeOpacity={0.85}
        >
          <Plus size={16} color="#000000" style={{ marginRight: 4 }} />
          <Text style={styles.primaryBtnText}>Nuevo Video</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.neonLime} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={videos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 30 }}
          renderItem={({ item }) => (
            <View style={styles.crudCard}>
              <Image source={{ uri: item.thumbnailUrl }} style={styles.crudThumb} />
              <View style={styles.crudInfo}>
                <Text style={styles.crudTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.crudMeta}>
                  Actor: <Text style={{ color: COLORS.neonLime }}>{item.actorName || 'Independiente'}</Text> · {item.duration}
                </Text>
                <Text style={styles.crudCloudinaryBadge}>
                  ☁️ Cloudinary ID: {item.cloudinaryPublicId || 'texxx_v1_cld'}
                </Text>
              </View>

              <View style={styles.crudActionButtons}>
                <TouchableOpacity
                  style={styles.iconActionBtn}
                  onPress={() => openEditModal(item)}
                >
                  <Edit3 size={16} color="#05D9E8" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.iconActionBtn, { backgroundColor: 'rgba(255, 42, 109, 0.15)' }]}
                  onPress={() => handleDeleteVideo(item)}
                >
                  <Trash2 size={16} color="#FF2A6D" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Modal Subir Nuevo Video */}
      <Modal visible={showUploadModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Subir y Publicar Video</Text>
              <TouchableOpacity onPress={() => setShowUploadModal(false)}>
                <X size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Título del Video *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej. Sesión Especial 4K Ultra HD"
                placeholderTextColor="#777"
                value={newTitle}
                onChangeText={setNewTitle}
              />

              <Text style={styles.inputLabel}>Descripción</Text>
              <TextInput
                style={[styles.textInput, { height: 60 }]}
                placeholder="Detalles de la producción, créditos y consentimiento..."
                placeholderTextColor="#777"
                value={newDesc}
                onChangeText={setNewDesc}
                multiline
              />

              <Text style={styles.inputLabel}>Asociar Actor / Actriz</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {actors.map((act) => (
                  <TouchableOpacity
                    key={act.id}
                    style={[
                      styles.pickerChip,
                      newActorId === act.id && styles.pickerChipSelected,
                    ]}
                    onPress={() => setNewActorId(act.id)}
                  >
                    <Text
                      style={[
                        styles.pickerChipText,
                        newActorId === act.id && styles.pickerChipTextSelected,
                      ]}
                    >
                      ⭐ {act.stageName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Categoría de Posicionamiento</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {['Para ti', 'Nuevos', 'Más videos', 'Amateur', 'Pareja'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.pickerChip,
                      newCategory === cat && styles.pickerChipSelected,
                    ]}
                    onPress={() => setNewCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.pickerChipText,
                        newCategory === cat && styles.pickerChipTextSelected,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Categoría Personalizada</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Para ti, Nuevos, Pareja..."
                    placeholderTextColor="#777"
                    value={newCategory}
                    onChangeText={setNewCategory}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Duración</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="15:30"
                    placeholderTextColor="#777"
                    value={newDuration}
                    onChangeText={setNewDuration}
                  />
                </View>
              </View>

              {/* Botón Seleccionar Video MP4 */}
              <TouchableOpacity
                style={[styles.cldUploadBox, newVideoUrl ? { borderColor: COLORS.neonLime } : {}]}
                onPress={handlePickVideoForAdmin}
                disabled={isUploadingToCloudinary}
              >
                <CloudUpload size={24} color={COLORS.neonLime} />
                <Text style={styles.cldUploadText}>
                  {isUploadingToCloudinary && uploadStatusText
                    ? uploadStatusText
                    : newVideoUrl
                    ? '✓ Video cargado a Cloudinary listo'
                    : 'Seleccionar Video MP4/MOV desde Galería'}
                </Text>
              </TouchableOpacity>

              {/* Botón Seleccionar Miniatura (Opcional) */}
              <TouchableOpacity
                style={[styles.cldUploadBox, { backgroundColor: '#1A1A22', borderColor: '#2E2E3C', marginTop: 4 }]}
                onPress={handlePickThumbForAdmin}
                disabled={isUploadingToCloudinary}
              >
                <Upload size={20} color="#8E8E93" />
                <Text style={[styles.cldUploadText, { color: '#D0D0D8' }]}>
                  {newThumbnailUrl
                    ? '✓ Miniatura seleccionada (Opcional)'
                    : 'Seleccionar Miniatura de Galería (Opcional)'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>URL de Miniatura Personalizada (Opcional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="https://images.unsplash.com/... (Opcional)"
                placeholderTextColor="#777"
                value={newThumbnailUrl}
                onChangeText={setNewThumbnailUrl}
              />

              <TouchableOpacity
                style={[styles.submitModalBtn, (!newTitle.trim() || isUploadingToCloudinary) && { opacity: 0.6 }]}
                onPress={handleCreateVideo}
                disabled={isUploadingToCloudinary}
              >
                <Text style={styles.submitModalBtnText}>
                  {isUploadingToCloudinary ? 'Procesando...' : 'Guardar y Publicar Video'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Editar Video */}
      <Modal visible={!!editingVideo} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Metadatos de Video</Text>
              <TouchableOpacity onPress={() => setEditingVideo(null)}>
                <X size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Título</Text>
              <TextInput
                style={styles.textInput}
                value={editTitle}
                onChangeText={setEditTitle}
              />

              <Text style={styles.inputLabel}>Descripción</Text>
              <TextInput
                style={[styles.textInput, { height: 60 }]}
                value={editDesc}
                onChangeText={setEditDesc}
                multiline
              />

              <Text style={styles.inputLabel}>Actor Asignado</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {actors.map((act) => (
                  <TouchableOpacity
                    key={act.id}
                    style={[
                      styles.pickerChip,
                      editActorId === act.id && styles.pickerChipSelected,
                    ]}
                    onPress={() => setEditActorId(act.id)}
                  >
                    <Text
                      style={[
                        styles.pickerChipText,
                        editActorId === act.id && styles.pickerChipTextSelected,
                      ]}
                    >
                      ⭐ {act.stageName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Categoría de Posicionamiento</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {['Para ti', 'Nuevos', 'Más videos', 'Amateur', 'Pareja'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.pickerChip,
                      editCategory === cat && styles.pickerChipSelected,
                    ]}
                    onPress={() => setEditCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.pickerChipText,
                        editCategory === cat && styles.pickerChipTextSelected,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Categoría Personalizada</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editCategory}
                    onChangeText={setEditCategory}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Duración</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editDuration}
                    onChangeText={setEditDuration}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>URL de Miniatura</Text>
              <TextInput
                style={styles.textInput}
                value={editThumbnailUrl}
                onChangeText={setEditThumbnailUrl}
              />

              <TouchableOpacity style={styles.submitModalBtn} onPress={handleSaveEdit}>
                <Text style={styles.submitModalBtnText}>Guardar Cambios</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ====================================================
// 2. PESTAÑA CRUD DE ACTORES / ACTRICES
// ====================================================
const AdminActorsScreen: React.FC = () => {
  const { userToken } = useAuth();
  const [actors, setActors] = useState<ActorItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Crear Actor
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [stageName, setStageName] = useState('');
  const [realName, setRealName] = useState('');
  const [bio, setBio] = useState('');
  const [nationality, setNationality] = useState('España');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Modal Editar Actor
  const [editingActor, setEditingActor] = useState<ActorItem | null>(null);
  const [editStageName, setEditStageName] = useState('');
  const [editRealName, setEditRealName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editNationality, setEditNationality] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');

  const fetchActors = useCallback(async () => {
    try {
      const list = await api.actors.getActors();
      setActors(list);
    } catch (err) {
      console.log('Error fetching actors in admin:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActors();
  }, [fetchActors]);

  const handleCreateActor = async () => {
    if (!stageName.trim()) {
      Alert.alert('Campo Requerido', 'El nombre artístico es obligatorio.');
      return;
    }

    try {
      const created = await api.actors.createActor(userToken || 'token_demo', {
        stageName: stageName.trim(),
        name: realName.trim() || stageName.trim(),
        bio: bio.trim(),
        nationality: nationality.trim() || 'Internacional',
        avatarUrl:
          avatarUrl.trim() ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop',
      });

      setActors((prev) => [created, ...prev]);
      setShowCreateModal(false);
      setStageName('');
      setRealName('');
      setBio('');
      setAvatarUrl('');
      Alert.alert('Actor Creado', `Se registró exitosamente a ${created.stageName}.`);
    } catch (err) {
      Alert.alert('Error', 'No se pudo crear el actor.');
    }
  };

  const openEditModal = (actor: ActorItem) => {
    setEditingActor(actor);
    setEditStageName(actor.stageName);
    setEditRealName(actor.name);
    setEditBio(actor.bio || '');
    setEditNationality(actor.nationality || 'Internacional');
    setEditAvatarUrl(actor.avatarUrl);
  };

  const handleSaveEdit = async () => {
    if (!editingActor || !editStageName.trim()) return;

    try {
      const updated = await api.actors.updateActor(userToken || 'token_demo', editingActor.id, {
        stageName: editStageName.trim(),
        name: editRealName.trim() || editStageName.trim(),
        bio: editBio.trim(),
        nationality: editNationality.trim(),
        avatarUrl: editAvatarUrl.trim() || editingActor.avatarUrl,
      });

      setActors((prev) => prev.map((a) => (a.id === editingActor.id ? updated : a)));
      setEditingActor(null);
      Alert.alert('Actor Actualizado', 'Los datos del actor fueron actualizados.');
    } catch (err) {
      Alert.alert('Error', 'No se pudo actualizar el actor.');
    }
  };

  const handleDeleteActor = (actor: ActorItem) => {
    Alert.alert(
      'Eliminar Actor',
      `¿Deseas eliminar a "${actor.stageName}" del catálogo de actores?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.actors.deleteActor(userToken || 'token_demo', actor.id);
              setActors((prev) => prev.filter((a) => a.id !== actor.id));
              Alert.alert('Actor Eliminado', 'El actor fue removido del sistema.');
            } catch (err) {
              Alert.alert('Error', 'No se pudo eliminar el actor.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.screenContainer}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>Gestión de Actores y Actrices</Text>
          <Text style={styles.subtitle}>CRUD de talentos verificados y asociación de videos</Text>
        </View>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.85}
        >
          <Plus size={16} color="#000000" style={{ marginRight: 4 }} />
          <Text style={styles.primaryBtnText}>Nuevo Actor</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.neonLime} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={actors}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 30 }}
          renderItem={({ item }) => (
            <View style={styles.crudCard}>
              <Image source={{ uri: item.avatarUrl }} style={styles.actorCrudAvatar} />
              <View style={styles.crudInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={styles.crudTitle}>{item.stageName}</Text>
                  <CheckCircle size={14} color={COLORS.verifiedBlue} />
                </View>
                <Text style={styles.crudMeta}>
                  {item.name} · {item.nationality || 'Internacional'}
                </Text>
                <Text style={styles.crudCloudinaryBadge}>
                  🎬 {item.videosCount || 0} Videos asociados
                </Text>
              </View>

              <View style={styles.crudActionButtons}>
                <TouchableOpacity
                  style={styles.iconActionBtn}
                  onPress={() => openEditModal(item)}
                >
                  <Edit3 size={16} color="#05D9E8" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.iconActionBtn, { backgroundColor: 'rgba(255, 42, 109, 0.15)' }]}
                  onPress={() => handleDeleteActor(item)}
                >
                  <Trash2 size={16} color="#FF2A6D" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Modal Crear Actor */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Registrar Nuevo Actor / Actriz</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Nombre Artístico (Stage Name) *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej. Luna Roja"
                placeholderTextColor="#777"
                value={stageName}
                onChangeText={setStageName}
              />

              <Text style={styles.inputLabel}>Nombre Real</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej. Luna Sánchez"
                placeholderTextColor="#777"
                value={realName}
                onChangeText={setRealName}
              />

              <Text style={styles.inputLabel}>Nacionalidad / País</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej. España, México, Colombia"
                placeholderTextColor="#777"
                value={nationality}
                onChangeText={setNationality}
              />

              <Text style={styles.inputLabel}>Biografía</Text>
              <TextInput
                style={[styles.textInput, { height: 60 }]}
                placeholder="Breve reseña sobre su trayectoria y estilo..."
                placeholderTextColor="#777"
                value={bio}
                onChangeText={setBio}
                multiline
              />

              <Text style={styles.inputLabel}>URL Foto de Perfil</Text>
              <TextInput
                style={styles.textInput}
                placeholder="https://images.unsplash.com/..."
                placeholderTextColor="#777"
                value={avatarUrl}
                onChangeText={setAvatarUrl}
              />

              <TouchableOpacity style={styles.submitModalBtn} onPress={handleCreateActor}>
                <Text style={styles.submitModalBtnText}>Guardar Actor</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Editar Actor */}
      <Modal visible={!!editingActor} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Actor / Actriz</Text>
              <TouchableOpacity onPress={() => setEditingActor(null)}>
                <X size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Nombre Artístico</Text>
              <TextInput
                style={styles.textInput}
                value={editStageName}
                onChangeText={setEditStageName}
              />

              <Text style={styles.inputLabel}>Nombre Real</Text>
              <TextInput
                style={styles.textInput}
                value={editRealName}
                onChangeText={setEditRealName}
              />

              <Text style={styles.inputLabel}>Nacionalidad</Text>
              <TextInput
                style={styles.textInput}
                value={editNationality}
                onChangeText={setEditNationality}
              />

              <Text style={styles.inputLabel}>Biografía</Text>
              <TextInput
                style={[styles.textInput, { height: 60 }]}
                value={editBio}
                onChangeText={setEditBio}
                multiline
              />

              <Text style={styles.inputLabel}>URL Foto de Perfil</Text>
              <TextInput
                style={styles.textInput}
                value={editAvatarUrl}
                onChangeText={setEditAvatarUrl}
              />

              <TouchableOpacity style={styles.submitModalBtn} onPress={handleSaveEdit}>
                <Text style={styles.submitModalBtnText}>Guardar Cambios</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ====================================================
// 3. PESTAÑA USUARIOS Y ROLES (RBAC)
// ====================================================
const AdminUsersScreen: React.FC = () => {
  const { userToken } = useAuth();
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    try {
      const list = await api.admin.getUsers(userToken || 'token_demo');
      setUsers(list);
    } catch (err) {
      console.log('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, [userToken]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleChangeRole = async (userId: string, targetRole: UserRole) => {
    try {
      const updated = await api.admin.setUserRole(userToken || 'token_demo', userId, targetRole);
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      Alert.alert('Rol Modificado', `El usuario ahora tiene rol: ${targetRole}`);
    } catch (err) {
      Alert.alert('Error', 'No se pudo modificar el rol.');
    }
  };

  const handleDeleteUser = (userItem: AdminUserItem) => {
    Alert.alert(
      'Eliminar Usuario',
      `¿Estás seguro de eliminar permanentemente a "${userItem.username}" (${userItem.email}) de la plataforma? Esta acción borrará todo su historial, me gustas y relaciones.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await api.admin.deleteUser(userToken || '', userItem.id);
              if (success) {
                setUsers((prev) => prev.filter((u) => u.id !== userItem.id));
                Alert.alert('Usuario Eliminado', 'El usuario fue eliminado permanentemente de la base de datos.');
              }
            } catch (err: any) {
              Alert.alert('Error', 'No se pudo eliminar el usuario.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.screenContainer}>
      <Text style={styles.headerTitle}>Control de Acceso y Roles (RBAC)</Text>
      <Text style={styles.subtitle}>
        Primer usuario registrado adquiere automáticamente rol de Admin. Administra los permisos de la plataforma.
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.neonLime} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isAdmin = item.role === 'ADMIN';
            const isCreator = item.role === 'CREATOR';

            return (
              <View style={styles.crudCard}>
                <View style={styles.crudInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.crudTitle}>{item.username}</Text>
                    <View
                      style={[
                        styles.roleBadgePill,
                        isAdmin
                          ? styles.roleBadgeAdmin
                          : isCreator
                          ? styles.roleBadgeCreator
                          : styles.roleBadgeConsumer,
                      ]}
                    >
                      <Text style={styles.roleBadgePillText}>{item.role}</Text>
                    </View>
                  </View>
                  <Text style={styles.crudMeta}>{item.email}</Text>
                </View>

                <View style={styles.roleActionButtons}>
                  <TouchableOpacity
                    style={[
                      styles.roleMiniBtn,
                      isAdmin && { backgroundColor: '#05D9E8' },
                    ]}
                    onPress={() => handleChangeRole(item.id, 'ADMIN')}
                  >
                    <Text
                      style={[
                        styles.roleMiniBtnText,
                        isAdmin && { color: '#000000', fontWeight: 'bold' },
                      ]}
                    >
                      Admin
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.roleMiniBtn,
                      isCreator && { backgroundColor: '#FF2A6D' },
                    ]}
                    onPress={() => handleChangeRole(item.id, 'CREATOR')}
                  >
                    <Text
                      style={[
                        styles.roleMiniBtnText,
                        isCreator && { color: '#000000', fontWeight: 'bold' },
                      ]}
                    >
                      Actor
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.roleMiniBtn,
                      !isAdmin && !isCreator && { backgroundColor: COLORS.neonLime },
                    ]}
                    onPress={() => handleChangeRole(item.id, 'CONSUMER')}
                  >
                    <Text
                      style={[
                        styles.roleMiniBtnText,
                        !isAdmin && !isCreator && { color: '#000000', fontWeight: 'bold' },
                      ]}
                    >
                      Espectador
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.iconActionBtn, { backgroundColor: 'rgba(255, 42, 109, 0.15)', marginLeft: 4 }]}
                    onPress={() => handleDeleteUser(item)}
                  >
                    <Trash2 size={16} color="#FF2A6D" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
};

// ====================================================
// 4. PESTAÑA ANALÍTICAS AVANZADAS Y SUSCRIPTORES VIP RED
// ====================================================
const AdminAnalyticsScreen: React.FC<{ onSwitchToSpectator?: () => void }> = ({
  onSwitchToSpectator,
}) => {
  const { userToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [activeSubTab, setActiveSubTab] = useState<'METRICS' | 'VIP_USERS'>('METRICS');

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      if (userToken) {
        const data = await api.admin.getAnalytics(userToken);
        if (data) setAnalytics(data);
      }
    } catch (err) {
      console.warn('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [userToken]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <ScrollView style={styles.screenContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>Panel de Analíticas & VIP RED</Text>
          <Text style={styles.subtitle}>Métricas globales en tiempo real e ingresos COP</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchAnalytics} activeOpacity={0.7}>
          <RefreshCw size={16} color={COLORS.neonLime} />
        </TouchableOpacity>
      </View>

      {/* Selector de Pestaña */}
      <View style={styles.subTabSelector}>
        <TouchableOpacity
          style={[styles.subTabBtn, activeSubTab === 'METRICS' && styles.subTabBtnActive]}
          onPress={() => setActiveSubTab('METRICS')}
        >
          <BarChart3 size={16} color={activeSubTab === 'METRICS' ? '#000000' : '#8E8E93'} />
          <Text style={[styles.subTabBtnText, activeSubTab === 'METRICS' && styles.subTabBtnTextActive]}>
            Métricas & Gráficas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTabBtn, activeSubTab === 'VIP_USERS' && styles.subTabBtnActive]}
          onPress={() => setActiveSubTab('VIP_USERS')}
        >
          <Crown size={16} color={activeSubTab === 'VIP_USERS' ? '#000000' : '#FFD700'} />
          <Text style={[styles.subTabBtnText, activeSubTab === 'VIP_USERS' && styles.subTabBtnTextActive]}>
            Suscriptores VIP ({analytics?.premiumUsersCount || 0})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.neonLime} />
          <Text style={{ color: '#8E8E93', marginTop: 10 }}>Cargando analíticas en vivo...</Text>
        </View>
      ) : activeSubTab === 'METRICS' ? (
        <>
          {/* Tarjetas Principales de Métricas */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: '#0084FF' }]}>
                {analytics?.totalUsers ?? 0}
              </Text>
              <Text style={styles.statLabel}>Usuarios Totales</Text>
            </View>

            <View style={[styles.statBox, { borderColor: '#FF2D55', borderWidth: 1 }]}>
              <Text style={[styles.statNumber, { color: '#FF2D55' }]}>
                {analytics?.premiumUsersCount ?? 0}
              </Text>
              <Text style={styles.statLabel}>Suscriptores VIP RED</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: '#FF9500' }]}>
                {analytics?.creatorsCount ?? 0}
              </Text>
              <Text style={styles.statLabel}>Actores / Creadores</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: COLORS.neonLime }]}>
                {analytics?.totalVideos ?? 0}
              </Text>
              <Text style={styles.statLabel}>Videos Publicados</Text>
            </View>
          </View>

          {/* Tarjeta de Facturación Estimada en COP */}
          <View style={styles.revenueCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <DollarSign size={22} color={COLORS.neonLime} />
              <Text style={styles.revenueTitle}>Facturación Estimada</Text>
            </View>
            <Text style={styles.revenueAmount}>{analytics?.revenueFormatted || '$0 COP'}</Text>
            <Text style={styles.revenueBreakdown}>
              • Planes VIP RED ($10.000 COP): {analytics?.premiumUsersCount || 0} activos{'\n'}
              • Ascensos a Creador ($5.000 COP): {analytics?.creatorsCount || 0} cuentas
            </Text>
          </View>

          {/* Gráfica de Vistas Semanales */}
          <View style={styles.chartContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <TrendingUp size={18} color={COLORS.neonLime} />
              <Text style={styles.chartTitle}>Tendencia de Reproducciones Semanales</Text>
            </View>
            <View style={styles.barChartRow}>
              {(() => {
                const trendData =
                  Array.isArray(analytics?.charts?.viewsTrend) && analytics.charts.viewsTrend.length > 0
                    ? analytics.charts.viewsTrend
                    : [
                        { label: 'Lun', views: 10 },
                        { label: 'Mar', views: 18 },
                        { label: 'Mie', views: 15 },
                        { label: 'Jue', views: 25 },
                        { label: 'Vie', views: 32 },
                        { label: 'Sab', views: 45 },
                        { label: 'Dom', views: 40 },
                      ];
                const maxVal = Math.max(1, ...trendData.map((v: any) => Number(v.views) || 0));

                return trendData.map((item: any, idx: number) => {
                  const val = Number(item.views) || 0;
                  const barHeight = Math.max(15, Math.min(100, Math.round((val / maxVal) * 90)));
                  return (
                    <View key={idx} style={styles.barColumn}>
                      <Text style={styles.barValueText}>{val}</Text>
                      <View
                        style={[
                          styles.barVisual,
                          { height: barHeight, backgroundColor: idx === 5 ? '#FF2D55' : COLORS.neonLime },
                        ]}
                      />
                      <Text style={styles.barLabelText}>{item.label}</Text>
                    </View>
                  );
                });
              })()}
            </View>
          </View>

          {/* Gráfica de Crecimiento de Usuarios */}
          <View style={[styles.chartContainer, { marginTop: 14 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Users size={18} color="#0084FF" />
              <Text style={styles.chartTitle}>Crecimiento de Nuevos Registros</Text>
            </View>
            <View style={styles.barChartRow}>
              {(() => {
                const growthData =
                  Array.isArray(analytics?.charts?.userGrowth) && analytics.charts.userGrowth.length > 0
                    ? analytics.charts.userGrowth
                    : [
                        { label: 'Sem 1', users: 2 },
                        { label: 'Sem 2', users: 5 },
                        { label: 'Sem 3', users: 8 },
                        { label: 'Sem 4', users: 12 },
                      ];
                const maxVal = Math.max(1, ...growthData.map((u: any) => Number(u.users) || 0));

                return growthData.map((item: any, idx: number) => {
                  const val = Number(item.users) || 0;
                  const barHeight = Math.max(15, Math.min(100, Math.round((val / maxVal) * 90)));
                  return (
                    <View key={idx} style={styles.barColumn}>
                      <Text style={styles.barValueText}>{val}</Text>
                      <View style={[styles.barVisual, { height: barHeight, backgroundColor: '#0084FF' }]} />
                      <Text style={styles.barLabelText}>{item.label}</Text>
                    </View>
                  );
                });
              })()}
            </View>
          </View>
        </>
      ) : (
        /* Lista de Suscriptores VIP RED / Premium */
        <View style={{ marginTop: 10 }}>
          {(!analytics?.premiumUsers || analytics.premiumUsers.length === 0) ? (
            <View style={{ paddingVertical: 30, alignItems: 'center' }}>
              <Crown size={40} color="#FFD700" style={{ marginBottom: 10 }} />
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' }}>Sin Suscriptores VIP Aún</Text>
              <Text style={{ color: '#8E8E93', fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                Cuando los usuarios paguen $10.000 COP por Wompi aparecerán listados aquí.
              </Text>
            </View>
          ) : (
            analytics.premiumUsers.map((vipUser: any) => (
              <View key={vipUser.id} style={styles.vipUserCard}>
                <Image
                  source={{
                    uri: vipUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop',
                  }}
                  style={styles.vipAvatar}
                />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.vipUsername}>@{vipUser.username}</Text>
                    <View style={styles.vipBadgePill}>
                      <Crown size={10} color="#FFD700" />
                      <Text style={styles.vipBadgeText}>VIP RED</Text>
                    </View>
                  </View>
                  <Text style={styles.vipEmail}>{vipUser.email}</Text>
                  <Text style={styles.vipDate}>Suscrito el: {vipUser.joinedDate || 'Reciente'}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {onSwitchToSpectator && (
        <TouchableOpacity style={styles.switchViewerBtn} onPress={onSwitchToSpectator}>
          <Eye size={18} color="#000000" style={{ marginRight: 6 }} />
          <Text style={styles.switchViewerBtnText}>Ver plataforma como Espectador</Text>
        </TouchableOpacity>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

// ====================================================
// NAVEGADOR PRINCIPAL DE ADMINISTRACIÓN
// ====================================================
export const AdminNavigator: React.FC<{ onLogout: () => void; onSwitchToSpectator?: () => void }> = ({
  onLogout,
  onSwitchToSpectator,
}) => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#141418' },
        headerTitleStyle: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
        tabBarStyle: { backgroundColor: '#141418', borderTopColor: '#24242C', height: 60, paddingBottom: 6 },
        tabBarActiveTintColor: COLORS.neonLime,
        tabBarInactiveTintColor: '#8E8E93',
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginRight: 14 }}>
            {onSwitchToSpectator && (
              <TouchableOpacity onPress={onSwitchToSpectator} style={{ padding: 4 }}>
                <Eye size={18} color={COLORS.neonLime} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onLogout} style={{ padding: 4 }}>
              <LogOut size={18} color="#FF2A6D" />
            </TouchableOpacity>
          </View>
        ),
      }}
    >
      <Tab.Screen
        name="Videos"
        component={AdminVideosScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Film size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Actores"
        component={AdminActorsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Roles (RBAC)"
        component={AdminUsersScreen}
        options={{
          tabBarIcon: ({ color, size }) => <UserCheck size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Analíticas"
        options={{
          tabBarIcon: ({ color, size }) => <BarChart3 size={size} color={color} />,
        }}
      >
        {() => <AdminAnalyticsScreen onSwitchToSpectator={onSwitchToSpectator} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#0A0A0C',
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neonLime,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  primaryBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  crudCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16161A',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#24242C',
  },
  crudThumb: {
    width: 80,
    height: 52,
    borderRadius: 6,
    marginRight: 10,
  },
  actorCrudAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: COLORS.neonLime,
  },
  crudInfo: {
    flex: 1,
  },
  crudTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  crudMeta: {
    color: '#8E8E93',
    fontSize: 11,
    marginTop: 2,
  },
  crudCloudinaryBadge: {
    color: '#05D9E8',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 3,
  },
  crudActionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  iconActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#24242C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#16161A',
    borderRadius: 16,
    padding: 18,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#24242C',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputLabel: {
    color: '#CCCCCC',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#0A0A0C',
    color: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#24242C',
  },
  pickerChip: {
    backgroundColor: '#0A0A0C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#24242C',
  },
  pickerChipSelected: {
    backgroundColor: 'rgba(206, 255, 0, 0.15)',
    borderColor: COLORS.neonLime,
  },
  pickerChipText: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '600',
  },
  pickerChipTextSelected: {
    color: COLORS.neonLime,
    fontWeight: 'bold',
  },
  cldUploadBox: {
    backgroundColor: '#0A0A0C',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(206, 255, 0, 0.3)',
    borderStyle: 'dashed',
    padding: 14,
    alignItems: 'center',
    marginVertical: 12,
    gap: 6,
  },
  cldUploadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  submitModalBtn: {
    backgroundColor: COLORS.neonLime,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 10,
  },
  submitModalBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: 'bold',
  },
  roleBadgePill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  roleBadgeAdmin: {
    backgroundColor: 'rgba(5, 217, 232, 0.15)',
    borderColor: '#05D9E8',
  },
  roleBadgeCreator: {
    backgroundColor: 'rgba(255, 42, 109, 0.15)',
    borderColor: '#FF2A6D',
  },
  roleBadgeConsumer: {
    backgroundColor: 'rgba(229, 9, 20, 0.12)',
    borderColor: COLORS.primary,
  },
  roleBadgePillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  roleActionButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  roleMiniBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#24242C',
  },
  roleMiniBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  statBox: {
    width: '48%',
    backgroundColor: '#16161A',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#24242C',
  },
  statNumber: {
    color: COLORS.neonLime,
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#8E8E93',
    fontSize: 11,
    marginTop: 4,
  },
  switchViewerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.neonLime,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
    marginBottom: 40,
  },
  switchViewerBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: 'bold',
  },
  refreshBtn: {
    padding: 8,
    backgroundColor: '#16161A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#24242C',
  },
  subTabSelector: {
    flexDirection: 'row',
    backgroundColor: '#16161A',
    borderRadius: 10,
    padding: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#24242C',
  },
  subTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  subTabBtnActive: {
    backgroundColor: COLORS.neonLime,
  },
  subTabBtnText: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '600',
  },
  subTabBtnTextActive: {
    color: '#000000',
    fontWeight: 'bold',
  },
  revenueCard: {
    backgroundColor: '#16161A',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#30D158',
  },
  revenueTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  revenueAmount: {
    color: '#30D158',
    fontSize: 22,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  revenueBreakdown: {
    color: '#8E8E93',
    fontSize: 11,
    lineHeight: 16,
  },
  chartContainer: {
    backgroundColor: '#16161A',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#24242C',
  },
  chartTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  barChartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120,
    paddingTop: 10,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barValueText: {
    color: '#8E8E93',
    fontSize: 9,
    marginBottom: 4,
  },
  barVisual: {
    width: 14,
    borderRadius: 4,
    minHeight: 10,
  },
  barLabelText: {
    color: '#CCCCCC',
    fontSize: 10,
    marginTop: 6,
  },
  vipUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16161A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  vipAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: '#FFD700',
  },
  vipUsername: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  vipBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  vipBadgeText: {
    color: '#FFD700',
    fontSize: 9,
    fontWeight: 'bold',
  },
  vipEmail: {
    color: '#8E8E93',
    fontSize: 11,
    marginTop: 2,
  },
  vipDate: {
    color: '#CCCCCC',
    fontSize: 10,
    marginTop: 2,
  },
});
