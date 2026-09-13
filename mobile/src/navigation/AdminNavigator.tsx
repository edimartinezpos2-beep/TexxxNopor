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
  Switch,
  Platform,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  Film,
  Users,
  UserCheck,
  BarChart3,
  Plus,
  Trash2,
  Edit3,
  CheckCircle,
  X,
  Eye,
  Shield,
  LogOut,
  Upload,
  RefreshCw,
  Crown,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  FileText,
  HardDrive,
  Sliders,
  Check,
  Search,
  Lock,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  UserRole,
  ActorItem,
  VideoItem,
  AdminUserItem,
  KycItem,
  ReportItem,
  AuditLogItem,
} from '../types/auth';
import { COLORS } from '../theme/colors';

const Tab = createBottomTabNavigator();

// =========================================================================
// TAB 1: CATÁLOGO Y MODERACIÓN (Videos, Categorías, Tags, Almacenamiento CDN)
// =========================================================================
const AdminCatalogScreen: React.FC = () => {
  const { userToken } = useAuth();
  const [subTab, setSubTab] = useState<'MODERATION' | 'UPLOAD' | 'CATEGORIES' | 'STORAGE'>('MODERATION');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Moderación
  const [moderationVideos, setModerationVideos] = useState<any[]>([]);
  const [modFilter, setModFilter] = useState<string>('');

  // Subida y Edición
  const [actors, setActors] = useState<ActorItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('Para ti');
  const [newDuration, setNewDuration] = useState('15:00');
  const [newActorId, setNewActorId] = useState('');
  const [newThumbnailUrl, setNewThumbnailUrl] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newCloudinaryId, setNewCloudinaryId] = useState('');
  const [newTags, setNewTags] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Categorías
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');

  // Almacenamiento & CDN
  const [storageStats, setStorageStats] = useState<any>(null);

  const loadData = useCallback(async () => {
    if (!userToken) return;
    setLoading(true);
    try {
      const [modVids, actorList, catList, storage] = await Promise.all([
        api.admin.getModerationVideos(userToken, modFilter || undefined),
        api.actors.getActors(),
        api.admin.getCategories(userToken),
        api.admin.getStorageStats(userToken),
      ]);
      setModerationVideos(modVids || []);
      setActors(actorList || []);
      setCategories(catList || []);
      setStorageStats(storage?.storage || null);
      if (actorList && actorList.length > 0 && !newActorId) {
        setNewActorId(actorList[0].id);
      }
    } catch (err) {
      console.log('Error loading catalog admin data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userToken, modFilter, newActorId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleModerateVideo = async (videoId: string, action: 'APPROVE' | 'REJECT' | 'FLAG' | 'TAKEDOWN') => {
    Alert.alert(
      `Confirmar ${action}`,
      `¿Deseas aplicar la acción "${action}" a este video?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: action === 'TAKEDOWN' || action === 'REJECT' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              const res = await api.admin.moderateVideo(userToken || '', videoId, action);
              if (res) {
                Alert.alert('Éxito', res.message || 'Estado de video actualizado');
                loadData();
              }
            } catch (err) {
              Alert.alert('Error', 'No se pudo aplicar la moderación al video');
            }
          },
        },
      ]
    );
  };

  const handlePickVideo = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setIsUploading(true);
        const asset = res.assets[0];
        const uploadRes = await api.cloudinary.uploadVideoFile(userToken || '', asset.uri);
        if (uploadRes) {
          setNewVideoUrl(uploadRes.secure_url);
          setNewCloudinaryId(uploadRes.public_id);
          if (uploadRes.duration) setNewDuration(uploadRes.duration);
          if (!newTitle && asset.fileName) setNewTitle(asset.fileName.replace(/\.[^/.]+$/, ''));
          Alert.alert('¡Video Cargado!', 'El video se subió y procesó correctamente.');
        }
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudo procesar el video');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePickThumb = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const uploadRes = await api.cloudinary.uploadImageFile(userToken || '', res.assets[0].uri);
        if (uploadRes) {
          setNewThumbnailUrl(uploadRes.secure_url);
          Alert.alert('¡Miniatura Cargada!', 'La miniatura se procesó correctamente.');
        }
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudo subir la miniatura');
    }
  };

  const handleCreateVideo = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Campo Requerido', 'El título del video es obligatorio');
      return;
    }
    if (!newVideoUrl.trim()) {
      Alert.alert('Video Requerido', 'Debes seleccionar y subir un archivo de video');
      return;
    }
    try {
      const res = await api.videos.uploadVideo(userToken || '', {
        title: newTitle.trim(),
        description: newDesc.trim(),
        duration: newDuration.trim(),
        category: newCategory,
        tags: newTags ? newTags.split(',').map((t) => t.trim()) : ['#parati'],
        videoUrl: newVideoUrl,
        cloudinaryPublicId: newCloudinaryId,
        thumbnailUrl: newThumbnailUrl,
        actorId: newActorId,
      });
      if (res) {
        Alert.alert('¡Publicado!', 'El video fue registrado exitosamente en el catálogo');
        setNewTitle('');
        setNewDesc('');
        setNewVideoUrl('');
        setNewThumbnailUrl('');
        setNewTags('');
        setSubTab('MODERATION');
        loadData();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo registrar el video');
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await api.admin.createCategory(userToken || '', newCategoryName.trim(), newCategoryDesc.trim());
      setNewCategoryName('');
      setNewCategoryDesc('');
      Alert.alert('Éxito', 'Categoría creada correctamente');
      loadData();
    } catch (err) {
      Alert.alert('Error', 'No se pudo crear la categoría');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    Alert.alert('Eliminar Categoría', '¿Estás seguro de eliminar esta categoría?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await api.admin.deleteCategory(userToken || '', id);
          loadData();
        },
      },
    ]);
  };

  return (
    <View style={styles.screenContainer}>
      {/* Subtab Selector */}
      <View style={styles.subTabSelector}>
        <TouchableOpacity
          style={[styles.subTabBtn, subTab === 'MODERATION' && styles.subTabBtnActive]}
          onPress={() => setSubTab('MODERATION')}
        >
          <Film size={14} color={subTab === 'MODERATION' ? '#000000' : '#8E8E93'} />
          <Text style={[styles.subTabBtnText, subTab === 'MODERATION' && styles.subTabBtnTextActive]}>
            Moderación
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTabBtn, subTab === 'UPLOAD' && styles.subTabBtnActive]}
          onPress={() => setSubTab('UPLOAD')}
        >
          <Plus size={14} color={subTab === 'UPLOAD' ? '#000000' : '#8E8E93'} />
          <Text style={[styles.subTabBtnText, subTab === 'UPLOAD' && styles.subTabBtnTextActive]}>
            Subir Video
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTabBtn, subTab === 'CATEGORIES' && styles.subTabBtnActive]}
          onPress={() => setSubTab('CATEGORIES')}
        >
          <FileText size={14} color={subTab === 'CATEGORIES' ? '#000000' : '#8E8E93'} />
          <Text style={[styles.subTabBtnText, subTab === 'CATEGORIES' && styles.subTabBtnTextActive]}>
            Categorías
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTabBtn, subTab === 'STORAGE' && styles.subTabBtnActive]}
          onPress={() => setSubTab('STORAGE')}
        >
          <HardDrive size={14} color={subTab === 'STORAGE' ? '#000000' : '#8E8E93'} />
          <Text style={[styles.subTabBtnText, subTab === 'STORAGE' && styles.subTabBtnTextActive]}>
            CDN & Storage
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.neonLime} style={{ marginTop: 40 }} />
      ) : subTab === 'MODERATION' ? (
        /* VISTA DE MODERACIÓN DE VIDEOS */
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Bandeja de Moderación ({moderationVideos.length})</Text>
            <TouchableOpacity onPress={loadData} style={styles.refreshBtn}>
              <RefreshCw size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Filtros de estado */}
          <View style={styles.chipRow}>
            {['', 'READY', 'FLAGGED', 'REJECTED'].map((f) => (
              <TouchableOpacity
                key={f || 'ALL'}
                style={[styles.filterChip, modFilter === f && styles.filterChipActive]}
                onPress={() => setModFilter(f)}
              >
                <Text style={[styles.filterChipText, modFilter === f && styles.filterChipTextActive]}>
                  {f === '' ? 'Todos' : f === 'READY' ? '✅ Aprobados' : f === 'FLAGGED' ? '⚠️ Marcados' : '❌ Retirados'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {moderationVideos.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No hay videos registrados en este estado.</Text>
            </View>
          ) : (
            moderationVideos.map((item) => (
              <View key={item.id} style={styles.adminCard}>
                <Image
                  source={{ uri: item.thumbnailUrl || 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=300' }}
                  style={styles.cardThumb}
                />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                    <View
                      style={[
                        styles.statusPill,
                        item.status === 'READY'
                          ? styles.statusPillReady
                          : item.status === 'FLAGGED'
                          ? styles.statusPillFlagged
                          : styles.statusPillRejected,
                      ]}
                    >
                      <Text style={styles.statusPillText}>{item.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardMeta}>
                    Actriz/Actor: {item.actor?.stageName || item.actor?.name || 'Creador'} • Cat: {item.category}
                  </Text>
                  <Text style={styles.cardMeta}>
                    👁️ {item.viewsCount} vistas • ❤️ {item.likesCount} • 💬 {item.commentsCount}
                  </Text>

                  {item.reportsCount > 0 && (
                    <View style={styles.warningAlertBox}>
                      <AlertTriangle size={12} color="#FF0055" />
                      <Text style={styles.warningAlertText}>{item.reportsCount} reporte(s) pendiente(s)</Text>
                    </View>
                  )}

                  {/* Acciones de Moderación */}
                  <View style={styles.modActionRow}>
                    {item.status !== 'READY' && (
                      <TouchableOpacity
                        style={[styles.actionBtnSmall, { backgroundColor: '#30D158' }]}
                        onPress={() => handleModerateVideo(item.id, 'APPROVE')}
                      >
                        <Check size={12} color="#000000" />
                        <Text style={styles.actionBtnTextDark}>Aprobar</Text>
                      </TouchableOpacity>
                    )}
                    {item.status !== 'FLAGGED' && (
                      <TouchableOpacity
                        style={[styles.actionBtnSmall, { backgroundColor: '#FFD700' }]}
                        onPress={() => handleModerateVideo(item.id, 'FLAG')}
                      >
                        <AlertTriangle size={12} color="#000000" />
                        <Text style={styles.actionBtnTextDark}>Flaggear</Text>
                      </TouchableOpacity>
                    )}
                    {item.status !== 'REJECTED' && (
                      <TouchableOpacity
                        style={[styles.actionBtnSmall, { backgroundColor: '#FF0055' }]}
                        onPress={() => handleModerateVideo(item.id, 'TAKEDOWN')}
                      >
                        <Trash2 size={12} color="#FFFFFF" />
                        <Text style={styles.actionBtnTextLight}>Baja (Takedown)</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      ) : subTab === 'UPLOAD' ? (
        /* VISTA DE SUBIDA DE VIDEO AL CATÁLOGO */
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.headerTitle}>Publicar Nuevo Video al Catálogo</Text>
          <Text style={styles.subtitle}>Sube videos en 1080p o HLS Master con categorías y actriz/actor asignado</Text>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Título del Video *</Text>
            <TextInput
              style={styles.textInput}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Ej: Estreno Exclusivo Full HD"
              placeholderTextColor="#666666"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Descripción</Text>
            <TextInput
              style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
              value={newDesc}
              onChangeText={setNewDesc}
              multiline
              placeholder="Detalles sobre el video..."
              placeholderTextColor="#666666"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Categoría</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
              {['Para ti', 'Amateur', 'Tríos', 'Milfs', 'Estrenos', 'VIP Exclusivo', 'Populares'].map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.pickerChip, newCategory === c && styles.pickerChipSelected]}
                  onPress={() => setNewCategory(c)}
                >
                  <Text style={[styles.pickerChipText, newCategory === c && styles.pickerChipTextSelected]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Hashtags (separados por coma)</Text>
            <TextInput
              style={styles.textInput}
              value={newTags}
              onChangeText={setNewTags}
              placeholder="#parati, #estreno, #hd"
              placeholderTextColor="#666666"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Actriz / Actor Asignado</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
              {actors.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  style={[styles.pickerChip, newActorId === a.id && styles.pickerChipSelected]}
                  onPress={() => setNewActorId(a.id)}
                >
                  <Text style={[styles.pickerChipText, newActorId === a.id && styles.pickerChipTextSelected]}>
                    {a.stageName || a.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Botones de selección de archivos */}
          <TouchableOpacity style={styles.uploadFileBox} onPress={handlePickVideo} disabled={isUploading}>
            <Upload size={22} color={COLORS.neonLime} />
            <Text style={styles.uploadFileText}>
              {isUploading ? 'Subiendo video a Cloudinary...' : newVideoUrl ? '✓ Video Seleccionado' : 'Seleccionar Archivo de Video MP4/MOV'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.uploadFileBox} onPress={handlePickThumb}>
            <Film size={22} color="#00F0FF" />
            <Text style={styles.uploadFileText}>
              {newThumbnailUrl ? '✓ Miniatura Cargada' : 'Seleccionar Miniatura (16:9)'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryBtnLarge, (!newTitle || !newVideoUrl) && { opacity: 0.5 }]}
            onPress={handleCreateVideo}
            disabled={!newTitle || !newVideoUrl || isUploading}
          >
            <Text style={styles.primaryBtnLargeText}>Publicar Video en Plataforma</Text>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      ) : subTab === 'CATEGORIES' ? (
        /* VISTA DE GESTIÓN DE CATEGORÍAS */
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.headerTitle}>Gestión de Categorías del Catálogo</Text>
          <Text style={styles.subtitle}>Organiza las categorías que alimentan el buscador y la barra superior</Text>

          <View style={styles.addCardBox}>
            <Text style={styles.cardSectionTitle}>Crear Nueva Categoría</Text>
            <TextInput
              style={styles.textInput}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="Nombre de categoría (ej: Anal, Cosplay, Realidad Virtual)"
              placeholderTextColor="#666666"
            />
            <TextInput
              style={[styles.textInput, { marginTop: 8 }]}
              value={newCategoryDesc}
              onChangeText={setNewCategoryDesc}
              placeholder="Descripción breve..."
              placeholderTextColor="#666666"
            />
            <TouchableOpacity style={styles.primaryBtnSmall} onPress={handleCreateCategory}>
              <Plus size={14} color="#000000" />
              <Text style={styles.primaryBtnSmallText}>Agregar Categoría</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.cardSectionTitle, { marginTop: 16 }]}>Categorías Existentes ({categories.length})</Text>
          {categories.map((c) => (
            <View key={c.id} style={styles.categoryItemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.categoryNameText}>{c.name}</Text>
                <Text style={styles.categoryMetaText}>Slug: /{c.slug} • {c.videosCount || 0} videos</Text>
              </View>
              <TouchableOpacity onPress={() => handleDeleteCategory(c.id)} style={styles.deleteMiniBtn}>
                <Trash2 size={16} color="#FF0055" />
              </TouchableOpacity>
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        /* VISTA DE ALMACENAMIENTO Y CDN */
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.headerTitle}>Control de Calidad, Almacenamiento y CDN</Text>
          <Text style={styles.subtitle}>Supervisión técnica de ancho de banda y transcodificación HLS</Text>

          <View style={styles.storageCard}>
            <HardDrive size={32} color={COLORS.neonLime} />
            <Text style={styles.storageTitle}>Proveedor Principal de Transmisión</Text>
            <Text style={styles.storageValue}>{storageStats?.provider || 'Bunny.net CDN + Cloudinary + Local'}</Text>
            <Text style={styles.storageHealthText}>{storageStats?.cdnHealth || 'ESTADO ÓPTIMO'}</Text>
          </View>

          <View style={styles.metricsGrid}>
            <View style={styles.metricCardBox}>
              <Text style={styles.metricCardNum}>{storageStats?.totalVideos || 0}</Text>
              <Text style={styles.metricCardLabel}>Videos Totales</Text>
            </View>
            <View style={styles.metricCardBox}>
              <Text style={styles.metricCardNum}>{storageStats?.localStorage?.sizeFormatted || '365 MB'}</Text>
              <Text style={styles.metricCardLabel}>Espacio Local</Text>
            </View>
            <View style={styles.metricCardBox}>
              <Text style={styles.metricCardNum}>{storageStats?.bandwidthEstimateMB || '650'} MB</Text>
              <Text style={styles.metricCardLabel}>Ancho de Banda Est.</Text>
            </View>
            <View style={styles.metricCardBox}>
              <Text style={styles.metricCardNum}>{storageStats?.readyVideos || 0}</Text>
              <Text style={styles.metricCardLabel}>Listos en CDN</Text>
            </View>
          </View>

          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>💡 Optimización de Ancho de Banda y HLS</Text>
            <Text style={styles.noticeBody}>
              El motor de streaming entrega video segmentado (.m3u8 y .ts) mediante caché perimetral CDN.
              Se garantiza resolución adaptativa desde 480p hasta 1080p Full HD para reducir consumo de datos en redes móviles.
            </Text>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
};

// =========================================================================
// TAB 2: USUARIOS Y VERIFICACIÓN DE IDENTIDAD (KYC & RBAC)
// =========================================================================
const AdminUsersKycScreen: React.FC = () => {
  const { userToken } = useAuth();
  const [subTab, setSubTab] = useState<'KYC' | 'USERS'>('KYC');
  const [loading, setLoading] = useState(true);

  // KYC
  const [kycList, setKycList] = useState<KycItem[]>([]);
  const [selectedKycPhoto, setSelectedKycPhoto] = useState<string | null>(null);

  // Usuarios (RBAC)
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal de Suspensión
  const [suspendingUser, setSuspendingUser] = useState<AdminUserItem | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('');

  const loadData = useCallback(async () => {
    if (!userToken) return;
    setLoading(true);
    try {
      const [kycData, usersData] = await Promise.all([
        api.admin.getKycSubmissions(userToken),
        api.admin.getUsers(userToken),
      ]);
      setKycList(kycData || []);
      setUsers(usersData || []);
    } catch (err) {
      console.log('Error loading users/kyc:', err);
    } finally {
      setLoading(false);
    }
  }, [userToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleReviewKyc = async (kycId: string, status: 'APPROVED' | 'REJECTED') => {
    let reason = '';
    if (status === 'REJECTED') {
      reason = 'Documento no legible o datos inconsistentes';
    }
    Alert.alert(
      status === 'APPROVED' ? 'Aprobar Verificación KYC' : 'Rechazar KYC',
      `¿Deseas marcar como ${status === 'APPROVED' ? 'APROBADA' : 'RECHAZADA'} esta solicitud legal?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: status === 'APPROVED' ? 'Aprobar' : 'Rechazar',
          style: status === 'REJECTED' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              const res = await api.admin.reviewKyc(userToken || '', kycId, status, reason);
              if (res) {
                Alert.alert('Éxito', res.message);
                loadData();
              }
            } catch (err) {
              Alert.alert('Error', 'No se pudo procesar la revisión');
            }
          },
        },
      ]
    );
  };

  const handleToggleSuspend = async () => {
    if (!suspendingUser) return;
    try {
      const newStatus = !suspendingUser.isSuspended;
      const res = await api.admin.suspendUser(
        userToken || '',
        suspendingUser.id,
        newStatus,
        suspensionReason.trim() || 'Violación de políticas y términos del servicio'
      );
      if (res) {
        Alert.alert('Éxito', res.message);
        setSuspendingUser(null);
        setSuspensionReason('');
        loadData();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo suspender al usuario');
    }
  };

  const handleRoleChange = async (user: AdminUserItem, newRole: UserRole) => {
    try {
      await api.admin.setUserRole(userToken || '', user.id, newRole);
      Alert.alert('Rol Actualizado', `El usuario @${user.username} ahora tiene rol ${newRole}`);
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo actualizar el rol');
    }
  };

  const handleDeleteUser = async (user: AdminUserItem) => {
    Alert.alert('Eliminar Usuario', `¿Estás seguro de eliminar permanentemente a @${user.username}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar Definitivamente',
        style: 'destructive',
        onPress: async () => {
          await api.admin.deleteUser(userToken || '', user.id);
          loadData();
        },
      },
    ]);
  };

  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  return (
    <View style={styles.screenContainer}>
      <View style={styles.subTabSelector}>
        <TouchableOpacity
          style={[styles.subTabBtn, subTab === 'KYC' && styles.subTabBtnActive]}
          onPress={() => setSubTab('KYC')}
        >
          <Shield size={14} color={subTab === 'KYC' ? '#000000' : '#8E8E93'} />
          <Text style={[styles.subTabBtnText, subTab === 'KYC' && styles.subTabBtnTextActive]}>
            Verificación KYC ({kycList.filter((k) => k.status === 'PENDING').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTabBtn, subTab === 'USERS' && styles.subTabBtnActive]}
          onPress={() => setSubTab('USERS')}
        >
          <Users size={14} color={subTab === 'USERS' ? '#000000' : '#8E8E93'} />
          <Text style={[styles.subTabBtnText, subTab === 'USERS' && styles.subTabBtnTextActive]}>
            Usuarios & Roles ({users.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.neonLime} style={{ marginTop: 40 }} />
      ) : subTab === 'KYC' ? (
        /* BANDEJA KYC */
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.headerTitle}>Verificación de Edad e Identidad (KYC)</Text>
          <Text style={styles.subtitle}>
            Inspecciona documentos de identidad y selfies con documento antes de autorizar la publicación de contenido
          </Text>

          {kycList.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No hay solicitudes de verificación KYC registradas.</Text>
            </View>
          ) : (
            kycList.map((item) => (
              <View key={item.id} style={styles.kycCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.kycUserName}>{item.fullName}</Text>
                  <View
                    style={[
                      styles.statusPill,
                      item.status === 'APPROVED'
                        ? styles.statusPillReady
                        : item.status === 'PENDING'
                        ? styles.statusPillFlagged
                        : styles.statusPillRejected,
                    ]}
                  >
                    <Text style={styles.statusPillText}>{item.status}</Text>
                  </View>
                </View>
                <Text style={styles.kycMeta}>
                  Usuario: @{item.user?.username} • Tipo: {item.documentType} • N°: {item.documentNumber}
                </Text>

                {/* Galería de Documentos KYC */}
                <Text style={[styles.cardSectionTitle, { marginTop: 8, fontSize: 11 }]}>Documentos Adjuntos (Toca para ampliar):</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                  {item.frontDocumentUrl && (
                    <TouchableOpacity onPress={() => setSelectedKycPhoto(item.frontDocumentUrl)} style={styles.docThumbBox}>
                      <Image source={{ uri: item.frontDocumentUrl }} style={styles.docThumbImg} />
                      <Text style={styles.docThumbLabel}>Cédula Frontal</Text>
                    </TouchableOpacity>
                  )}
                  {item.backDocumentUrl && (
                    <TouchableOpacity onPress={() => setSelectedKycPhoto(item.backDocumentUrl || '')} style={styles.docThumbBox}>
                      <Image source={{ uri: item.backDocumentUrl }} style={styles.docThumbImg} />
                      <Text style={styles.docThumbLabel}>Cédula Reverso</Text>
                    </TouchableOpacity>
                  )}
                  {item.selfieWithDocUrl && (
                    <TouchableOpacity onPress={() => setSelectedKycPhoto(item.selfieWithDocUrl)} style={styles.docThumbBox}>
                      <Image source={{ uri: item.selfieWithDocUrl }} style={styles.docThumbImg} />
                      <Text style={styles.docThumbLabel}>Selfie con Cédula</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>

                {item.status === 'PENDING' && (
                  <View style={styles.kycActionRow}>
                    <TouchableOpacity
                      style={[styles.actionBtnSmall, { backgroundColor: '#30D158', flex: 1 }]}
                      onPress={() => handleReviewKyc(item.id, 'APPROVED')}
                    >
                      <Check size={14} color="#000000" />
                      <Text style={styles.actionBtnTextDark}>Aprobar Legalmente</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtnSmall, { backgroundColor: '#FF0055', flex: 1 }]}
                      onPress={() => handleReviewKyc(item.id, 'REJECTED')}
                    >
                      <X size={14} color="#FFFFFF" />
                      <Text style={styles.actionBtnTextLight}>Rechazar</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        /* LISTADO DE USUARIOS Y GESTIÓN DE ROLES / SUSPENSIÓN */
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.headerTitle}>Gestión de Cuentas y Roles (RBAC)</Text>
          <Text style={styles.subtitle}>Asigna roles (Admin, Creador, Espectador) o suspende usuarios infractores</Text>

          <View style={styles.searchBoxRow}>
            <Search size={16} color="#8E8E93" />
            <TextInput
              style={styles.searchBarInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Buscar por usuario, correo o rol..."
              placeholderTextColor="#666666"
            />
          </View>

          {filteredUsers.map((item) => (
            <View key={item.id} style={[styles.userRowCard, item.isSuspended && styles.userRowCardSuspended]}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.userCardName}>@{item.username}</Text>
                  {item.isVip && (
                    <View style={styles.vipBadgeBox}>
                      <Crown size={10} color="#FFD700" />
                      <Text style={styles.vipBadgeText}>VIP</Text>
                    </View>
                  )}
                  {item.isSuspended && (
                    <View style={styles.suspendedBadgeBox}>
                      <Text style={styles.suspendedBadgeText}>SUSPENDIDO</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.userCardEmail}>{item.email}</Text>
                <Text style={styles.userCardMeta}>
                  Rol: {item.role} • KYC: {item.kycStatus || 'NONE'} • Verificado: {item.isVerified ? 'Sí' : 'No'}
                </Text>

                {/* Acciones de rol */}
                <View style={styles.roleActionButtonsRow}>
                  {(['ADMIN', 'CREATOR', 'CONSUMER'] as UserRole[]).map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.roleSelectChip, item.role === r && styles.roleSelectChipActive]}
                      onPress={() => handleRoleChange(item, r)}
                    >
                      <Text style={[styles.roleSelectChipText, item.role === r && styles.roleSelectChipTextActive]}>
                        {r === 'ADMIN' ? 'Admin' : r === 'CREATOR' ? 'Creador' : 'Espectador'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Botones de acción derecha */}
              <View style={{ alignItems: 'flex-end', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.actionIconBtn, item.isSuspended ? { backgroundColor: '#30D158' } : { backgroundColor: '#FFD700' }]}
                  onPress={() => {
                    setSuspendingUser(item);
                    setSuspensionReason(item.suspensionReason || '');
                  }}
                >
                  <Lock size={14} color="#000000" />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionIconBtn, { backgroundColor: '#24242C' }]} onPress={() => handleDeleteUser(item)}>
                  <Trash2 size={14} color="#FF0055" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* MODAL DE VISUALIZACIÓN DE FOTO KYC */}
      <Modal visible={!!selectedKycPhoto} transparent animationType="fade">
        <View style={styles.fullModalOverlay}>
          <TouchableOpacity style={styles.closeModalBtn} onPress={() => setSelectedKycPhoto(null)}>
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
          {selectedKycPhoto && (
            <Image source={{ uri: selectedKycPhoto }} style={styles.fullScreenKycImg} resizeMode="contain" />
          )}
        </View>
      </Modal>

      {/* MODAL DE SUSPENSIÓN DE CUENTA */}
      <Modal visible={!!suspendingUser} transparent animationType="slide">
        <View style={styles.fullModalOverlay}>
          <View style={styles.modalContentBox}>
            <Text style={styles.modalTitle}>
              {suspendingUser?.isSuspended ? 'Reactivar Cuenta' : 'Suspender Cuenta de Usuario'}
            </Text>
            <Text style={styles.modalSubtitle}>Usuario: @{suspendingUser?.username}</Text>

            {!suspendingUser?.isSuspended && (
              <TextInput
                style={[styles.textInput, { marginVertical: 12, height: 70, textAlignVertical: 'top' }]}
                value={suspensionReason}
                onChangeText={setSuspensionReason}
                multiline
                placeholder="Motivo legal de la suspensión..."
                placeholderTextColor="#666666"
              />
            )}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                style={[styles.primaryBtnLarge, { flex: 1, backgroundColor: '#24242C' }]}
                onPress={() => setSuspendingUser(null)}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.primaryBtnLarge,
                  { flex: 1, backgroundColor: suspendingUser?.isSuspended ? '#30D158' : '#FF0055' },
                ]}
                onPress={handleToggleSuspend}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>
                  {suspendingUser?.isSuspended ? 'Confirmar Reactivación' : 'Suspender Cuenta'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// =========================================================================
// TAB 3: SOPORTE Y DISPUTAS (DMCA, Reclamaciones de Derechos y Contenido)
// =========================================================================
const AdminSupportDmcaScreen: React.FC = () => {
  const { userToken } = useAuth();
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('OPEN');

  const loadReports = useCallback(async () => {
    if (!userToken) return;
    setLoading(true);
    try {
      const list = await api.admin.getReports(userToken, filterStatus || undefined);
      setReports(list || []);
    } catch (err) {
      console.log('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  }, [userToken, filterStatus]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleResolve = async (reportId: string, actionTaken: 'TAKEDOWN_VIDEO' | 'SUSPEND_USER' | 'NONE') => {
    Alert.alert(
      'Resolver Reclamación',
      `¿Deseas aplicar la acción "${actionTaken === 'TAKEDOWN_VIDEO' ? 'Retirar Video' : actionTaken === 'SUSPEND_USER' ? 'Suspender Creador' : 'Desestimar'}" a esta disputa?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: actionTaken !== 'NONE' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              const res = await api.admin.resolveReport(userToken || '', reportId, {
                status: actionTaken === 'NONE' ? 'DISMISSED' : 'RESOLVED',
                actionTaken,
                resolutionNotes: `Resuelto por Administración. Acción: ${actionTaken}`,
              });
              if (res) {
                Alert.alert('Éxito', res.message);
                loadReports();
              }
            } catch (err) {
              Alert.alert('Error', 'No se pudo resolver el reporte');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.screenContainer}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Soporte Legal y DMCA</Text>
        <TouchableOpacity onPress={loadReports} style={styles.refreshBtn}>
          <RefreshCw size={14} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      <Text style={styles.subtitle}>
        Gestiona disputas de derechos de autor, suplantación de identidad o contenido no consentido
      </Text>

      {/* Filtros */}
      <View style={styles.chipRow}>
        {['OPEN', 'RESOLVED', 'DISMISSED', ''].map((s) => (
          <TouchableOpacity
            key={s || 'ALL'}
            style={[styles.filterChip, filterStatus === s && styles.filterChipActive]}
            onPress={() => setFilterStatus(s)}
          >
            <Text style={[styles.filterChipText, filterStatus === s && styles.filterChipTextActive]}>
              {s === '' ? 'Todos' : s === 'OPEN' ? '🚨 Pendientes' : s === 'RESOLVED' ? '✅ Resueltos' : '⚪ Desestimados'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.neonLime} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {reports.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No hay reclamaciones en este estado.</Text>
            </View>
          ) : (
            reports.map((r) => (
              <View key={r.id} style={styles.disputeCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={styles.reasonBadgeBox}>
                    <ShieldAlert size={12} color="#FF0055" />
                    <Text style={styles.reasonBadgeText}>{r.reason}</Text>
                  </View>
                  <Text style={styles.dateText}>{new Date(r.createdAt).toLocaleDateString()}</Text>
                </View>

                <Text style={styles.disputeDescText}>"{r.description}"</Text>

                {r.video && (
                  <View style={styles.disputeVideoRow}>
                    <Image source={{ uri: r.video.thumbnailUrl || 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=200' }} style={styles.miniThumb} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.videoTitleMini} numberOfLines={1}>{r.video.title}</Text>
                      <Text style={styles.videoActorMini}>Actor: {r.video.actor?.stageName || 'Creador'}</Text>
                      <Text style={styles.videoStatusMini}>Estado actual: {r.video.status}</Text>
                    </View>
                  </View>
                )}

                <Text style={styles.reporterMeta}>
                  Reclamante: {r.reporterEmail || r.reporter?.email || 'Anónimo'}
                </Text>

                {r.status === 'OPEN' && (
                  <View style={styles.disputeActionRow}>
                    <TouchableOpacity
                      style={[styles.actionBtnSmall, { backgroundColor: '#FF0055', flex: 1 }]}
                      onPress={() => handleResolve(r.id, 'TAKEDOWN_VIDEO')}
                    >
                      <Trash2 size={12} color="#FFFFFF" />
                      <Text style={styles.actionBtnTextLight}>Takedown Video</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtnSmall, { backgroundColor: '#FFD700', flex: 1 }]}
                      onPress={() => handleResolve(r.id, 'SUSPEND_USER')}
                    >
                      <Lock size={12} color="#000000" />
                      <Text style={styles.actionBtnTextDark}>Suspender</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtnSmall, { backgroundColor: '#24242C', flex: 1 }]}
                      onPress={() => handleResolve(r.id, 'NONE')}
                    >
                      <Check size={12} color="#FFFFFF" />
                      <Text style={styles.actionBtnTextLight}>Desestimar</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
};

// =========================================================================
// TAB 4: FINANZAS Y PAYOUTS (Wompi, Suscripciones y Retiros)
// =========================================================================
const AdminFinanceScreen: React.FC = () => {
  const { userToken } = useAuth();
  const [financeOverview, setFinanceOverview] = useState<any>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [subTab, setSubTab] = useState<'OVERVIEW' | 'PAYOUTS'>('OVERVIEW');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!userToken) return;
    setLoading(true);
    try {
      const [fin, pay] = await Promise.all([
        api.admin.getFinanceOverview(userToken),
        api.admin.getPayouts(userToken),
      ]);
      setFinanceOverview(fin);
      setPayouts(pay || []);
    } catch (err) {
      console.log('Error loading finance:', err);
    } finally {
      setLoading(false);
    }
  }, [userToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleReviewPayout = async (payoutId: string, status: 'APPROVED' | 'COMPLETED' | 'REJECTED') => {
    Alert.alert(
      status === 'COMPLETED' ? 'Confirmar Pago' : status === 'APPROVED' ? 'Aprobar Retiro' : 'Rechazar Retiro',
      `¿Deseas marcar esta solicitud de retiro como "${status}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: status === 'REJECTED' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await api.admin.reviewPayout(userToken || '', payoutId, status, `TX-${Date.now().toString().slice(-6)}`);
              Alert.alert('Éxito', `Retiro marcado como ${status}`);
              loadData();
            } catch (err) {
              Alert.alert('Error', 'No se pudo actualizar el retiro');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.screenContainer}>
      <View style={styles.subTabSelector}>
        <TouchableOpacity
          style={[styles.subTabBtn, subTab === 'OVERVIEW' && styles.subTabBtnActive]}
          onPress={() => setSubTab('OVERVIEW')}
        >
          <DollarSign size={14} color={subTab === 'OVERVIEW' ? '#000000' : '#8E8E93'} />
          <Text style={[styles.subTabBtnText, subTab === 'OVERVIEW' && styles.subTabBtnTextActive]}>
            Ingresos Wompi
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTabBtn, subTab === 'PAYOUTS' && styles.subTabBtnActive]}
          onPress={() => setSubTab('PAYOUTS')}
        >
          <TrendingUp size={14} color={subTab === 'PAYOUTS' ? '#000000' : '#8E8E93'} />
          <Text style={[styles.subTabBtnText, subTab === 'PAYOUTS' && styles.subTabBtnTextActive]}>
            Retiros ({payouts.filter((p) => p.status === 'PENDING').length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.neonLime} style={{ marginTop: 40 }} />
      ) : subTab === 'OVERVIEW' ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.headerTitle}>Sostenibilidad Financiera y Pagos</Text>
          <Text style={styles.subtitle}>Supervisión de transacciones Wompi, membresías VIP y comisiones</Text>

          <View style={styles.financeRevenueBox}>
            <Text style={styles.financeRevenueLabel}>TOTAL RECAUDADO EN WOMPI</Text>
            <Text style={styles.financeRevenueBig}>{financeOverview?.revenue?.formattedTotal || '$0 COP'}</Text>
            <Text style={styles.financeRevenueSub}>
              Comisión Plataforma: ${Number(financeOverview?.revenue?.platformKeepCOP || 0).toLocaleString('es-CO')} COP ({100 - Number(financeOverview?.revenue?.commissionPercent || 80)}%)
            </Text>
            <Text style={styles.financeRevenueSub}>
              Fondo de Creadores: ${Number(financeOverview?.revenue?.creatorPoolCOP || 0).toLocaleString('es-CO')} COP ({financeOverview?.revenue?.commissionPercent || 80}%)
            </Text>
          </View>

          <Text style={[styles.cardSectionTitle, { marginTop: 16 }]}>Transacciones Recientes ({financeOverview?.recentTransactions?.length || 0})</Text>
          {financeOverview?.recentTransactions?.map((t: any) => (
            <View key={t.id} style={styles.transRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.transRefText}>{t.reference}</Text>
                <Text style={styles.transMetaText}>{new Date(t.date).toLocaleDateString()} • {t.paymentMethod}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.transAmountText}>{t.formattedAmount}</Text>
                <Text style={[styles.transStatusText, t.status === 'APPROVED' ? { color: '#30D158' } : { color: '#FFD700' }]}>
                  {t.status}
                </Text>
              </View>
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        /* SOLICITUDES DE RETIRO */
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.headerTitle}>Solicitudes de Retiro (Payouts)</Text>
          <Text style={styles.subtitle}>Aprueba y procesa transferencias bancarias a creadores y actores</Text>

          {payouts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No hay solicitudes de retiro registradas.</Text>
            </View>
          ) : (
            payouts.map((p) => (
              <View key={p.id} style={styles.payoutCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.payoutAmountText}>{p.formattedAmount}</Text>
                  <View
                    style={[
                      styles.statusPill,
                      p.status === 'COMPLETED'
                        ? styles.statusPillReady
                        : p.status === 'PENDING'
                        ? styles.statusPillFlagged
                        : styles.statusPillRejected,
                    ]}
                  >
                    <Text style={styles.statusPillText}>{p.status}</Text>
                  </View>
                </View>

                <Text style={styles.payoutUserText}>Creador: @{p.creatorUsername} ({p.creatorEmail})</Text>
                <Text style={styles.payoutBankText}>Cuenta Bancaria: {p.bankDetails}</Text>
                <Text style={styles.payoutDateText}>Fecha: {new Date(p.createdAt).toLocaleDateString()}</Text>

                {p.status === 'PENDING' && (
                  <View style={styles.payoutActionRow}>
                    <TouchableOpacity
                      style={[styles.actionBtnSmall, { backgroundColor: '#30D158', flex: 1 }]}
                      onPress={() => handleReviewPayout(p.id, 'COMPLETED')}
                    >
                      <Check size={14} color="#000000" />
                      <Text style={styles.actionBtnTextDark}>Marcar Transferido</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtnSmall, { backgroundColor: '#FF0055', flex: 1 }]}
                      onPress={() => handleReviewPayout(p.id, 'REJECTED')}
                    >
                      <X size={14} color="#FFFFFF" />
                      <Text style={styles.actionBtnTextLight}>Rechazar</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
};

// =========================================================================
// TAB 5: MÉTRICAS, AUDITORÍA Y AJUSTES GLOBALES
// =========================================================================
const AdminAnalyticsSettingsScreen: React.FC<{ onSwitchToSpectator?: () => void }> = ({ onSwitchToSpectator }) => {
  const { userToken } = useAuth();
  const [subTab, setSubTab] = useState<'ANALYTICS' | 'AUDIT' | 'SETTINGS'>('ANALYTICS');
  const [loading, setLoading] = useState(true);

  // Analíticas
  const [analytics, setAnalytics] = useState<any>(null);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  // Configuración Global
  const [settings, setSettings] = useState<any>({});
  const [watermarkText, setWatermarkText] = useState('TexxxNopor');
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [commissionPercent, setCommissionPercent] = useState('80');
  const [minPayout, setMinPayout] = useState('50000');

  const loadData = useCallback(async () => {
    if (!userToken) return;
    setLoading(true);
    try {
      const [an, logs, sett] = await Promise.all([
        api.admin.getAnalyticsOverview(userToken),
        api.admin.getAuditLogs(userToken, 1, 30),
        api.admin.getSettings(userToken),
      ]);
      setAnalytics(an);
      setAuditLogs(logs?.logs || []);
      setSettings(sett || {});
      if (sett) {
        if (sett.WATERMARK_TEXT) setWatermarkText(sett.WATERMARK_TEXT.value);
        if (sett.WATERMARK_ENABLED) setWatermarkEnabled(sett.WATERMARK_ENABLED.value === 'true');
        if (sett.CREATOR_COMMISSION_PERCENT) setCommissionPercent(sett.CREATOR_COMMISSION_PERCENT.value);
        if (sett.MIN_PAYOUT_AMOUNT) setMinPayout(sett.MIN_PAYOUT_AMOUNT.value);
      }
    } catch (err) {
      console.log('Error loading analytics/settings:', err);
    } finally {
      setLoading(false);
    }
  }, [userToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveSettings = async () => {
    try {
      await Promise.all([
        api.admin.updateSetting(userToken || '', 'WATERMARK_TEXT', watermarkText),
        api.admin.updateSetting(userToken || '', 'WATERMARK_ENABLED', watermarkEnabled ? 'true' : 'false'),
        api.admin.updateSetting(userToken || '', 'CREATOR_COMMISSION_PERCENT', commissionPercent),
        api.admin.updateSetting(userToken || '', 'MIN_PAYOUT_AMOUNT', minPayout),
      ]);
      Alert.alert('¡Ajustes Guardados!', 'Los parámetros globales de la plataforma se actualizaron correctamente.');
      loadData();
    } catch (err) {
      Alert.alert('Error', 'No se pudieron guardar los ajustes globales');
    }
  };

  return (
    <View style={styles.screenContainer}>
      <View style={styles.subTabSelector}>
        <TouchableOpacity
          style={[styles.subTabBtn, subTab === 'ANALYTICS' && styles.subTabBtnActive]}
          onPress={() => setSubTab('ANALYTICS')}
        >
          <BarChart3 size={14} color={subTab === 'ANALYTICS' ? '#000000' : '#8E8E93'} />
          <Text style={[styles.subTabBtnText, subTab === 'ANALYTICS' && styles.subTabBtnTextActive]}>
            Métricas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTabBtn, subTab === 'AUDIT' && styles.subTabBtnActive]}
          onPress={() => setSubTab('AUDIT')}
        >
          <Shield size={14} color={subTab === 'AUDIT' ? '#000000' : '#8E8E93'} />
          <Text style={[styles.subTabBtnText, subTab === 'AUDIT' && styles.subTabBtnTextActive]}>
            Audit Logs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTabBtn, subTab === 'SETTINGS' && styles.subTabBtnActive]}
          onPress={() => setSubTab('SETTINGS')}
        >
          <Sliders size={14} color={subTab === 'SETTINGS' ? '#000000' : '#8E8E93'} />
          <Text style={[styles.subTabBtnText, subTab === 'SETTINGS' && styles.subTabBtnTextActive]}>
            Ajustes
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.neonLime} style={{ marginTop: 40 }} />
      ) : subTab === 'ANALYTICS' ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.headerTitle}>Métricas y Analítica de Plataforma</Text>
          <Text style={styles.subtitle}>Supervisión de usuarios activos diarios, retención y videos más vistos</Text>

          <View style={styles.metricsGrid}>
            <View style={styles.metricCardBox}>
              <Text style={styles.metricCardNum}>{analytics?.platform?.estimatedDAU || 18}</Text>
              <Text style={styles.metricCardLabel}>DAU (Usuarios Activos)</Text>
            </View>
            <View style={styles.metricCardBox}>
              <Text style={styles.metricCardNum}>{analytics?.platform?.estimatedMAU || 45}</Text>
              <Text style={styles.metricCardLabel}>MAU Mensual</Text>
            </View>
            <View style={styles.metricCardBox}>
              <Text style={styles.metricCardNum}>{analytics?.platform?.totalViews || 0}</Text>
              <Text style={styles.metricCardLabel}>Vistas Totales</Text>
            </View>
            <View style={styles.metricCardBox}>
              <Text style={styles.metricCardNum}>{analytics?.platform?.vipUsers || 0}</Text>
              <Text style={styles.metricCardLabel}>Membresías VIP</Text>
            </View>
          </View>

          <Text style={[styles.cardSectionTitle, { marginTop: 16 }]}>Top Videos con Mayor Tráfico</Text>
          {analytics?.topVideos?.map((v: any, index: number) => (
            <View key={v.id} style={styles.topRankingRow}>
              <Text style={styles.rankingNumber}>#{index + 1}</Text>
              <Image source={{ uri: v.thumbnailUrl || 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=100' }} style={styles.miniThumb} />
              <View style={{ flex: 1 }}>
                <Text style={styles.videoTitleMini} numberOfLines={1}>{v.title}</Text>
                <Text style={styles.videoActorMini}>Por: {v.actorName}</Text>
              </View>
              <Text style={styles.rankingViews}>{v.views} vistas</Text>
            </View>
          ))}

          <Text style={[styles.cardSectionTitle, { marginTop: 16 }]}>Top Creadores y Actores</Text>
          {analytics?.topActors?.map((a: any, index: number) => (
            <View key={a.id} style={styles.topRankingRow}>
              <Text style={styles.rankingNumber}>#{index + 1}</Text>
              <Image source={{ uri: a.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100' }} style={[styles.miniThumb, { borderRadius: 16 }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.videoTitleMini}>{a.stageName || a.name}</Text>
                <Text style={styles.videoActorMini}>{a.followersCount || 0} seguidores</Text>
              </View>
              <Text style={styles.rankingViews}>{a.videosCount || 0} videos</Text>
            </View>
          ))}

          {onSwitchToSpectator && (
            <TouchableOpacity style={styles.spectatorBtn} onPress={onSwitchToSpectator}>
              <Eye size={16} color="#000000" />
              <Text style={styles.spectatorBtnText}>Ver Plataforma como Espectador</Text>
            </TouchableOpacity>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      ) : subTab === 'AUDIT' ? (
        /* AUDIT LOGS */
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.headerTitle}>Registro de Auditoría (Audit Logs)</Text>
          <Text style={styles.subtitle}>Historial de acciones críticas ejecutadas por los administradores</Text>

          {auditLogs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No hay logs de auditoría registrados.</Text>
            </View>
          ) : (
            auditLogs.map((log) => (
              <View key={log.id} style={styles.auditLogRow}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.auditActionText}>{log.action}</Text>
                  <Text style={styles.auditDateText}>{new Date(log.createdAt).toLocaleString()}</Text>
                </View>
                <Text style={styles.auditAdminText}>
                  Admin: {log.admin?.username || log.adminId} • Entidad: {log.entityType} ({log.entityId || 'N/A'})
                </Text>
                {log.details && <Text style={styles.auditDetailsText}>{log.details}</Text>}
              </View>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        /* AJUSTES GLOBALES */
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.headerTitle}>Configuración Global de Plataforma</Text>
          <Text style={styles.subtitle}>Ajustes legales, marcas de agua automáticas y parámetros financieros</Text>

          <View style={styles.settingBox}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.settingLabel}>Marca de Agua Automática en Videos</Text>
                <Text style={styles.settingDesc}>Aplica la marca de agua con el nombre de la plataforma en las reproducciones</Text>
              </View>
              <Switch
                value={watermarkEnabled}
                onValueChange={setWatermarkEnabled}
                trackColor={{ false: '#333', true: COLORS.neonLime }}
                thumbColor={watermarkEnabled ? '#000000' : '#8E8E93'}
              />
            </View>
          </View>

          <View style={styles.settingBox}>
            <Text style={styles.settingLabel}>Texto de Marca de Agua</Text>
            <TextInput
              style={styles.textInput}
              value={watermarkText}
              onChangeText={setWatermarkText}
              placeholder="TexxxNopor"
              placeholderTextColor="#666666"
            />
          </View>

          <View style={styles.settingBox}>
            <Text style={styles.settingLabel}>Comisión a Creadores (%)</Text>
            <TextInput
              style={styles.textInput}
              value={commissionPercent}
              onChangeText={setCommissionPercent}
              keyboardType="numeric"
              placeholder="80"
              placeholderTextColor="#666666"
            />
            <Text style={styles.settingDesc}>Porcentaje de los ingresos brutos asignado a las actrices y creadores</Text>
          </View>

          <View style={styles.settingBox}>
            <Text style={styles.settingLabel}>Monto Mínimo de Retiro (COP)</Text>
            <TextInput
              style={styles.textInput}
              value={minPayout}
              onChangeText={setMinPayout}
              keyboardType="numeric"
              placeholder="50000"
              placeholderTextColor="#666666"
            />
            <Text style={styles.settingDesc}>Monto mínimo requerido en COP para que un creador solicite un payout</Text>
          </View>

          <TouchableOpacity style={styles.primaryBtnLarge} onPress={handleSaveSettings}>
            <Text style={styles.primaryBtnLargeText}>Guardar Parámetros Globales</Text>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
};

// =========================================================================
// NAVEGADOR PRINCIPAL DE ADMINISTRACIÓN
// =========================================================================
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
              <LogOut size={18} color="#FF0055" />
            </TouchableOpacity>
          </View>
        ),
      }}
    >
      <Tab.Screen
        name="Catálogo"
        component={AdminCatalogScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Film size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="KYC & Roles"
        component={AdminUsersKycScreen}
        options={{
          tabBarIcon: ({ color, size }) => <UserCheck size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Soporte DMCA"
        component={AdminSupportDmcaScreen}
        options={{
          tabBarIcon: ({ color, size }) => <ShieldAlert size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Finanzas"
        component={AdminFinanceScreen}
        options={{
          tabBarIcon: ({ color, size }) => <DollarSign size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Métricas & Ajustes"
        options={{
          tabBarIcon: ({ color, size }) => <Sliders size={size} color={color} />,
        }}
      >
        {() => <AdminAnalyticsSettingsScreen onSwitchToSpectator={onSwitchToSpectator} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

// =========================================================================
// ESTILOS VISUALES
// =========================================================================
const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#0A0A0C',
    padding: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 11,
    color: '#8E8E93',
    marginBottom: 12,
    lineHeight: 16,
  },
  subTabSelector: {
    flexDirection: 'row',
    backgroundColor: '#16161A',
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#24242C',
  },
  subTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
  },
  subTabBtnActive: {
    backgroundColor: COLORS.neonLime,
  },
  subTabBtnText: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '600',
  },
  subTabBtnTextActive: {
    color: '#000000',
    fontWeight: 'bold',
  },
  refreshBtn: {
    padding: 6,
    backgroundColor: '#16161A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#24242C',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#16161A',
    borderWidth: 1,
    borderColor: '#24242C',
  },
  filterChipActive: {
    backgroundColor: 'rgba(206, 255, 0, 0.15)',
    borderColor: COLORS.neonLime,
  },
  filterChipText: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: COLORS.neonLime,
    fontWeight: 'bold',
  },
  emptyCard: {
    backgroundColor: '#16161A',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#24242C',
    marginVertical: 20,
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 12,
  },
  adminCard: {
    flexDirection: 'row',
    backgroundColor: '#16161A',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#24242C',
    gap: 10,
  },
  cardThumb: {
    width: 84,
    height: 60,
    borderRadius: 6,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    flex: 1,
  },
  cardMeta: {
    color: '#8E8E93',
    fontSize: 10,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusPillReady: {
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    borderColor: '#30D158',
  },
  statusPillFlagged: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderColor: '#FFD700',
  },
  statusPillRejected: {
    backgroundColor: 'rgba(255, 0, 85, 0.15)',
    borderColor: '#FF0055',
  },
  statusPillText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  warningAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 0, 85, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  warningAlertText: {
    color: '#FF0055',
    fontSize: 9,
    fontWeight: 'bold',
  },
  modActionRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  actionBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  actionBtnTextDark: {
    color: '#000000',
    fontSize: 9,
    fontWeight: 'bold',
  },
  actionBtnTextLight: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  formGroup: {
    marginBottom: 12,
  },
  formLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#16161A',
    borderWidth: 1,
    borderColor: '#24242C',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 12,
  },
  pickerChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#16161A',
    borderWidth: 1,
    borderColor: '#24242C',
    marginRight: 6,
  },
  pickerChipSelected: {
    borderColor: COLORS.neonLime,
    backgroundColor: 'rgba(206, 255, 0, 0.12)',
  },
  pickerChipText: {
    color: '#8E8E93',
    fontSize: 10,
  },
  pickerChipTextSelected: {
    color: COLORS.neonLime,
    fontWeight: 'bold',
  },
  uploadFileBox: {
    backgroundColor: '#16161A',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(206, 255, 0, 0.3)',
    borderStyle: 'dashed',
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  uploadFileText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  primaryBtnLarge: {
    backgroundColor: COLORS.neonLime,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryBtnLargeText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  addCardBox: {
    backgroundColor: '#16161A',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#24242C',
    marginBottom: 14,
  },
  cardSectionTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  primaryBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.neonLime,
    borderRadius: 6,
    paddingVertical: 8,
    marginTop: 10,
  },
  primaryBtnSmallText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: 'bold',
  },
  categoryItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16161A',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#24242C',
  },
  categoryNameText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  categoryMetaText: {
    color: '#8E8E93',
    fontSize: 10,
    marginTop: 2,
  },
  deleteMiniBtn: {
    padding: 6,
  },
  storageCard: {
    backgroundColor: '#16161A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.neonLime,
    marginBottom: 14,
    gap: 6,
  },
  storageTitle: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  storageValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  storageHealthText: {
    color: '#30D158',
    fontSize: 10,
    fontWeight: 'bold',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricCardBox: {
    width: '48%',
    backgroundColor: '#16161A',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#24242C',
  },
  metricCardNum: {
    color: COLORS.neonLime,
    fontSize: 18,
    fontWeight: 'bold',
  },
  metricCardLabel: {
    color: '#8E8E93',
    fontSize: 10,
    marginTop: 2,
  },
  noticeCard: {
    backgroundColor: '#141418',
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#24242C',
  },
  noticeTitle: {
    color: '#00F0FF',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  noticeBody: {
    color: '#8E8E93',
    fontSize: 10,
    lineHeight: 14,
  },
  kycCard: {
    backgroundColor: '#16161A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#24242C',
  },
  kycUserName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  kycMeta: {
    color: '#8E8E93',
    fontSize: 10,
    marginTop: 2,
  },
  docThumbBox: {
    width: 90,
    marginRight: 8,
    alignItems: 'center',
  },
  docThumbImg: {
    width: 90,
    height: 60,
    borderRadius: 6,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#333',
  },
  docThumbLabel: {
    color: '#CCCCCC',
    fontSize: 8,
    marginTop: 4,
    textAlign: 'center',
  },
  kycActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  searchBoxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16161A',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#24242C',
    gap: 8,
  },
  searchBarInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 12,
    paddingVertical: 8,
  },
  userRowCard: {
    flexDirection: 'row',
    backgroundColor: '#16161A',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#24242C',
    alignItems: 'center',
  },
  userRowCardSuspended: {
    borderColor: '#FF0055',
    backgroundColor: 'rgba(255, 0, 85, 0.05)',
  },
  userCardName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  userCardEmail: {
    color: '#8E8E93',
    fontSize: 10,
    marginTop: 1,
  },
  userCardMeta: {
    color: '#CCCCCC',
    fontSize: 9,
    marginTop: 2,
  },
  vipBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  vipBadgeText: {
    color: '#FFD700',
    fontSize: 8,
    fontWeight: 'bold',
  },
  suspendedBadgeBox: {
    backgroundColor: 'rgba(255, 0, 85, 0.2)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  suspendedBadgeText: {
    color: '#FF0055',
    fontSize: 8,
    fontWeight: 'bold',
  },
  roleActionButtonsRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
  },
  roleSelectChip: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#24242C',
  },
  roleSelectChipActive: {
    backgroundColor: COLORS.neonLime,
  },
  roleSelectChipText: {
    color: '#8E8E93',
    fontSize: 9,
  },
  roleSelectChipTextActive: {
    color: '#000000',
    fontWeight: 'bold',
  },
  actionIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  closeModalBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    padding: 10,
    zIndex: 10,
  },
  fullScreenKycImg: {
    width: '100%',
    height: '75%',
  },
  modalContentBox: {
    width: '90%',
    backgroundColor: '#16161A',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#24242C',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    color: '#8E8E93',
    fontSize: 11,
    marginTop: 2,
  },
  disputeCard: {
    backgroundColor: '#16161A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#24242C',
  },
  reasonBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 0, 85, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  reasonBadgeText: {
    color: '#FF0055',
    fontSize: 9,
    fontWeight: 'bold',
  },
  dateText: {
    color: '#8E8E93',
    fontSize: 9,
  },
  disputeDescText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontStyle: 'italic',
    marginVertical: 6,
  },
  disputeVideoRow: {
    flexDirection: 'row',
    backgroundColor: '#0A0A0C',
    borderRadius: 8,
    padding: 6,
    gap: 8,
    marginBottom: 6,
    alignItems: 'center',
  },
  miniThumb: {
    width: 44,
    height: 32,
    borderRadius: 4,
  },
  videoTitleMini: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  videoActorMini: {
    color: '#8E8E93',
    fontSize: 9,
  },
  videoStatusMini: {
    color: '#00F0FF',
    fontSize: 8,
  },
  reporterMeta: {
    color: '#8E8E93',
    fontSize: 9,
    marginBottom: 6,
  },
  disputeActionRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  financeRevenueBox: {
    backgroundColor: '#16161A',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#30D158',
    alignItems: 'center',
    marginBottom: 12,
    gap: 4,
  },
  financeRevenueLabel: {
    color: '#8E8E93',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  financeRevenueBig: {
    color: '#30D158',
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 2,
  },
  financeRevenueSub: {
    color: '#CCCCCC',
    fontSize: 10,
  },
  transRow: {
    flexDirection: 'row',
    backgroundColor: '#16161A',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#24242C',
    alignItems: 'center',
  },
  transRefText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  transMetaText: {
    color: '#8E8E93',
    fontSize: 9,
    marginTop: 2,
  },
  transAmountText: {
    color: '#30D158',
    fontSize: 12,
    fontWeight: 'bold',
  },
  transStatusText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  payoutCard: {
    backgroundColor: '#16161A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#24242C',
  },
  payoutAmountText: {
    color: '#30D158',
    fontSize: 16,
    fontWeight: 'bold',
  },
  payoutUserText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 4,
  },
  payoutBankText: {
    color: '#CCCCCC',
    fontSize: 10,
    marginTop: 2,
  },
  payoutDateText: {
    color: '#8E8E93',
    fontSize: 9,
    marginTop: 2,
  },
  payoutActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  topRankingRow: {
    flexDirection: 'row',
    backgroundColor: '#16161A',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#24242C',
    alignItems: 'center',
    gap: 8,
  },
  rankingNumber: {
    color: COLORS.neonLime,
    fontSize: 12,
    fontWeight: 'bold',
    width: 20,
  },
  rankingViews: {
    color: '#8E8E93',
    fontSize: 10,
  },
  spectatorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.neonLime,
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 16,
  },
  spectatorBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  auditLogRow: {
    backgroundColor: '#16161A',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#24242C',
  },
  auditActionText: {
    color: '#00F0FF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  auditDateText: {
    color: '#8E8E93',
    fontSize: 9,
  },
  auditAdminText: {
    color: '#CCCCCC',
    fontSize: 10,
    marginTop: 2,
  },
  auditDetailsText: {
    color: '#8E8E93',
    fontSize: 9,
    marginTop: 2,
  },
  settingBox: {
    backgroundColor: '#16161A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#24242C',
  },
  settingLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  settingDesc: {
    color: '#8E8E93',
    fontSize: 9,
    marginTop: 4,
  },
});

export default AdminNavigator;
