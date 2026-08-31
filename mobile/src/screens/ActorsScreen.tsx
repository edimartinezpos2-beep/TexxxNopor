import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  ScrollView,
  Alert,
  Modal,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  Search,
  CheckCircle2,
  Film,
  Globe,
  Heart,
  UserCheck,
  UserPlus,
  Sparkles,
  ArrowLeft,
  Edit3,
  Camera,
  Lock,
  List,
  Info,
  Plus,
  Trash2,
  Image as ImageIcon,
  MoreVertical,
  Play,
  Share2,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { ActorItem, VideoItem, Playlist } from '../types/auth';
import { useAuth } from '../context/AuthContext';
import { VideoOptionsModal } from '../components/VideoOptionsModal';

const { width: SCREEN_W } = Dimensions.get('window');
const BANNER_H = 220;
const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop';
const DEFAULT_BANNER = 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1200&auto=format&fit=crop';

type ProfileTab = 'videos' | 'followers' | 'playlists' | 'about';

interface ActorFullProfile extends ActorItem {
  videos: VideoItem[];
  publicVideos: VideoItem[];
  followersOnlyVideos: VideoItem[];
  playlists: Playlist[];
}

interface ActorsScreenProps {
  onSelectVideo?: (video: VideoItem) => void;
}

export const ActorsScreen: React.FC<ActorsScreenProps> = ({ onSelectVideo }) => {
  const { colors, isDark } = useTheme();
  const { userToken, user } = useAuth();
  const [actorsList, setActorsList] = useState<ActorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActor, setSelectedActor] = useState<ActorFullProfile | null>(null);
  const [loadingActorDetails, setLoadingActorDetails] = useState(false);
  const [followedActorIds, setFollowedActorIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<ProfileTab>('videos');

  // Modal de opciones para videos (3 puntos)
  const [selectedVideoForOptions, setSelectedVideoForOptions] = useState<VideoItem | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editStageName, setEditStageName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editNationality, setEditNationality] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editBannerUrl, setEditBannerUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  // Playlist modal
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;

  const fetchActors = useCallback(async (pageNum: number = 1) => {
    try {
      const list = await api.actors.getActors(user?.id, pageNum, 12);
      if (pageNum === 1) {
        setActorsList(list);
      } else {
        setActorsList((prev) => {
          const existing = new Set(prev.map((a) => a.id));
          const fresh = list.filter((a) => !existing.has(a.id));
          return [...prev, ...fresh];
        });
      }
      setHasMore(list.length >= 12);
      setPage(pageNum);
      const followed = new Set<string>(list.filter((a) => a.isFollowing).map((a) => a.id));
      setFollowedActorIds((prev) => new Set([...prev, ...followed]));
    } catch (err) {
      console.log('Error fetching actors:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchActors(1);
  }, [fetchActors]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchActors(1);
  };

  const loadMoreActors = () => {
    if (!loadingMore && !loading && hasMore) {
      setLoadingMore(true);
      fetchActors(page + 1);
    }
  };

  const handleOpenActorProfile = async (actor: ActorItem) => {
    setLoadingActorDetails(true);
    setActiveTab('videos');
    scrollY.setValue(0);
    try {
      const full = await api.actors.getActorFullProfile(actor.id, user?.id);
      if (full) {
        setSelectedActor(full as ActorFullProfile);
      } else {
        setSelectedActor({
          ...actor,
          videos: [],
          publicVideos: [],
          followersOnlyVideos: [],
          playlists: [],
        });
      }
    } catch {
      setSelectedActor({
        ...actor,
        videos: [],
        publicVideos: [],
        followersOnlyVideos: [],
        playlists: [],
      });
    } finally {
      setLoadingActorDetails(false);
    }
  };

  const handleFollow = async (actorId: string) => {
    if (!userToken || !selectedActor) {
      Alert.alert('Iniciar Sesión', 'Debes iniciar sesión para seguir a esta actriz.');
      return;
    }
    const isFollowing = followedActorIds.has(actorId);
    const newSet = new Set(followedActorIds);
    isFollowing ? newSet.delete(actorId) : newSet.add(actorId);
    setFollowedActorIds(newSet);
    setSelectedActor({
      ...selectedActor,
      isFollowing: !isFollowing,
      followersCount: (selectedActor.followersCount || 0) + (isFollowing ? -1 : 1),
    });
    try {
      await (api.actors as any).followActor?.(userToken, actorId);
    } catch {}
  };

  const openEditModal = () => {
    if (!selectedActor) return;
    setEditName(selectedActor.name);
    setEditStageName(selectedActor.stageName);
    setEditBio(selectedActor.bio || '');
    setEditNationality(selectedActor.nationality || '');
    setEditAvatarUrl(selectedActor.avatarUrl || '');
    setEditBannerUrl(selectedActor.bannerUrl || '');
    setShowEditModal(true);
  };

  // Selector de imagen directo para Foto de Perfil o Portada
  const pickImage = async (type: 'avatar' | 'banner') => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería para cambiar la imagen.');
        return;
      }

      const aspect: [number, number] = type === 'avatar' ? [1, 1] : [16, 6];
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect,
        quality: 0.85,
      });

      if (!result.canceled && result.assets?.length > 0) {
        type === 'avatar' ? setIsUploadingAvatar(true) : setIsUploadingBanner(true);
        try {
          const uploadRes = await api.cloudinary.uploadImageFile(userToken || 'token_demo', result.assets[0].uri);
          if (uploadRes?.secure_url) {
            const newUrl = uploadRes.secure_url;
            if (type === 'avatar') {
              setEditAvatarUrl(newUrl);
              // Si no está en el modal de edición, actualizar directo en BD
              if (!showEditModal && selectedActor) {
                const updated = await api.actors.updateActorProfile(userToken || 'token_demo', selectedActor.id, {
                  avatarUrl: newUrl,
                });
                if (updated) {
                  setSelectedActor((prev) => (prev ? { ...prev, avatarUrl: newUrl } : null));
                  setActorsList((prev) => prev.map((a) => (a.id === selectedActor.id ? { ...a, avatarUrl: newUrl } : a)));
                  Alert.alert('¡Foto Actualizada!', 'Tu foto de perfil ha sido guardada correctamente.');
                }
              }
            } else {
              setEditBannerUrl(newUrl);
              if (!showEditModal && selectedActor) {
                const updated = await api.actors.updateActorProfile(userToken || 'token_demo', selectedActor.id, {
                  bannerUrl: newUrl,
                });
                if (updated) {
                  setSelectedActor((prev) => (prev ? { ...prev, bannerUrl: newUrl } : null));
                  Alert.alert('¡Portada Actualizada!', 'La imagen de portada ha sido guardada.');
                }
              }
            }
          }
        } catch {
          Alert.alert('Error', 'No se pudo subir la imagen. Intenta nuevamente.');
        } finally {
          type === 'avatar' ? setIsUploadingAvatar(false) : setIsUploadingBanner(false);
        }
      }
    } catch (err: any) {
      Alert.alert('Error', 'Ocurrió un error al abrir la galería.');
    }
  };

  const handleSaveProfile = async () => {
    if (!selectedActor) return;
    if (!editStageName.trim()) {
      Alert.alert('Error', 'El nombre artístico no puede estar vacío.');
      return;
    }
    setIsSaving(true);
    try {
      const updated = await api.actors.updateActorProfile(userToken || 'token_demo', selectedActor.id, {
        name: editName.trim(),
        stageName: editStageName.trim(),
        bio: editBio.trim(),
        nationality: editNationality.trim(),
        avatarUrl: editAvatarUrl || selectedActor.avatarUrl,
        bannerUrl: editBannerUrl || selectedActor.bannerUrl,
      });
      if (updated) {
        setSelectedActor((prev) => (prev ? { ...prev, ...updated } : null));
        setActorsList((prev) => prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)));
        Alert.alert('Perfil Guardado', 'Los cambios en tu perfil de actriz se guardaron exitosamente.');
        setShowEditModal(false);
      } else {
        Alert.alert('Error', 'No se pudo actualizar el perfil en el servidor.');
      }
    } catch {
      Alert.alert('Error', 'Ocurrió un problema al guardar los cambios.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!selectedActor || !newPlaylistTitle.trim()) {
      Alert.alert('Error', 'El título de la lista es obligatorio.');
      return;
    }
    setIsCreatingPlaylist(true);
    try {
      const pl = await api.actors.createPlaylist(userToken || 'token_demo', selectedActor.id, {
        title: newPlaylistTitle.trim(),
        description: newPlaylistDesc.trim(),
        isPrivate: false,
      });
      if (pl) {
        setSelectedActor((prev) => (prev ? { ...prev, playlists: [pl, ...(prev.playlists || [])] } : null));
        setNewPlaylistTitle('');
        setNewPlaylistDesc('');
        setShowPlaylistModal(false);
        Alert.alert('Lista Creada', `"${pl.title}" se creó exitosamente.`);
      }
    } catch {
      Alert.alert('Error', 'No se pudo crear la lista.');
    } finally {
      setIsCreatingPlaylist(false);
    }
  };

  // Permiso para editar: si es Admin, Creator, dueño o perfil actual
  const isOwnProfile =
    user?.role === 'ADMIN' ||
    user?.role === 'CREATOR' ||
    (selectedActor?.userId && selectedActor.userId === user?.id) ||
    (user?.username && selectedActor?.stageName?.toLowerCase() === user?.username?.toLowerCase());

  const filteredActors = actorsList.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.stageName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─── 1. LISTA DE ACTRICES Y ACTORES ───────────────────────────────────────────
  if (!selectedActor) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Actrices & Actores</Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>{actorsList.length} talentos destacados</Text>
          </View>
          <View style={[styles.sparkleBadge, { backgroundColor: colors.primaryGlow }]}>
            <Sparkles color={colors.primary} size={20} />
          </View>
        </View>

        {/* Buscador */}
        <View style={[styles.searchRow, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Search color={colors.textSecondary} size={16} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Buscar actriz o actor por nombre..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
        ) : (
          <FlatList
            data={filteredActors}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={{ gap: 12 }}
            contentContainerStyle={styles.actorsGrid}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.actorCard, { backgroundColor: colors.surfaceCard }]}
                activeOpacity={0.85}
                onPress={() => handleOpenActorProfile(item)}
              >
                <Image
                  source={{ uri: item.avatarUrl || DEFAULT_AVATAR }}
                  style={StyleSheet.absoluteFillObject as any}
                  resizeMode="cover"
                />
                <View style={styles.cardGrad} />
                {item.isVerified && (
                  <View style={styles.verBadge}>
                    <CheckCircle2 size={12} color="#fff" fill="#0084FF" />
                  </View>
                )}
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {item.stageName}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                    <Film size={11} color={colors.primary} />
                    <Text style={styles.cardMeta}>{item.videosCount || 0} videos</Text>
                    <Heart size={11} color={colors.primary} style={{ marginLeft: 8 }} />
                    <Text style={styles.cardMeta}>{item.followersCount || 0}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
            onEndReached={loadMoreActors}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loadingMore ? (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>Cargando más actrices...</Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={{ alignItems: 'center', marginTop: 60 }}>
                <Sparkles color={colors.textMuted} size={40} />
                <Text style={{ color: colors.textSecondary, marginTop: 12 }}>No se encontraron actrices registradas</Text>
              </View>
            }
          />
        )}
      </View>
    );
  }

  // ─── 2. PERFIL COMPLETO DE LA ACTRIZ / ACTOR ───────────────────────────────────
  const isFollowing = followedActorIds.has(selectedActor.id) || !!selectedActor.isFollowing;
  const tabVideos =
    activeTab === 'videos'
      ? selectedActor.publicVideos && selectedActor.publicVideos.length > 0
        ? selectedActor.publicVideos
        : selectedActor.videos || []
      : activeTab === 'followers'
      ? selectedActor.followersOnlyVideos || []
      : [];

  const bannerOpacity = scrollY.interpolate({
    inputRange: [0, BANNER_H - 80],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.profContainer, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Sticky Header al hacer Scroll */}
      <Animated.View
        style={[
          styles.stickyHeader,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            opacity: bannerOpacity,
          },
        ]}
      >
        <TouchableOpacity onPress={() => setSelectedActor(null)} style={styles.backBtn}>
          <ArrowLeft color={colors.textPrimary} size={20} />
        </TouchableOpacity>
        <Text style={[styles.stickyTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {selectedActor.stageName}
        </Text>
        {isOwnProfile && (
          <TouchableOpacity onPress={openEditModal} style={{ padding: 6 }}>
            <Edit3 color={colors.primary} size={18} />
          </TouchableOpacity>
        )}
      </Animated.View>

      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner de Portada */}
        <View style={{ height: BANNER_H, position: 'relative' }}>
          <Image
            source={{ uri: selectedActor.bannerUrl || DEFAULT_BANNER }}
            style={StyleSheet.absoluteFillObject as any}
            resizeMode="cover"
          />
          <View style={styles.bannerGrad} />

          {/* Botón Volver */}
          <TouchableOpacity onPress={() => setSelectedActor(null)} style={styles.bannerBack}>
            <ArrowLeft color="#fff" size={22} />
          </TouchableOpacity>

          {/* Botón Editar Portada */}
          {isOwnProfile && (
            <TouchableOpacity onPress={() => pickImage('banner')} style={styles.bannerEditBtn} activeOpacity={0.8}>
              {isUploadingBanner ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Camera color="#fff" size={15} />
                  <Text style={styles.bannerEditTxt}>Cambiar portada</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Información del Perfil y Avatar */}
        <View style={[styles.profHeader, { backgroundColor: colors.surface }]}>
          {/* Avatar con botón de cámara */}
          <View style={[styles.avatarWrap, { borderColor: colors.primary }]}>
            <Image source={{ uri: selectedActor.avatarUrl || DEFAULT_AVATAR }} style={styles.profAvatar} />
            {isOwnProfile && (
              <TouchableOpacity
                style={[styles.avatarEditBtn, { backgroundColor: colors.primary }]}
                onPress={() => pickImage('avatar')}
                activeOpacity={0.8}
              >
                {isUploadingAvatar ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Camera color="#fff" size={14} />
                )}
              </TouchableOpacity>
            )}
            {selectedActor.isVerified && (
              <View style={styles.profVerBadge}>
                <CheckCircle2 size={16} color="#fff" fill="#0084FF" />
              </View>
            )}
          </View>

          {/* Nombre, País y Botón de Seguir / Editar */}
          <View style={styles.nameRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.profName, { color: colors.textPrimary }]}>{selectedActor.stageName}</Text>
              {selectedActor.nationality ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                  <Globe size={12} color={colors.textSecondary} />
                  <Text style={[styles.profNat, { color: colors.textSecondary }]}> {selectedActor.nationality}</Text>
                </View>
              ) : null}
            </View>

            {!isOwnProfile ? (
              <TouchableOpacity
                style={[
                  styles.followBtn,
                  { backgroundColor: colors.primary },
                  isFollowing && [styles.followingBtn, { borderColor: colors.primary, backgroundColor: colors.primaryGlow }],
                ]}
                onPress={() => handleFollow(selectedActor.id)}
                activeOpacity={0.8}
              >
                {isFollowing ? (
                  <UserCheck size={16} color={colors.primary} />
                ) : (
                  <UserPlus size={16} color="#FFFFFF" />
                )}
                <Text style={[styles.followTxt, isFollowing && { color: colors.primary }]}>
                  {isFollowing ? 'Siguiendo' : 'Seguir'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.editProfBtn, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}
                onPress={openEditModal}
                activeOpacity={0.8}
              >
                <Edit3 size={15} color={colors.primary} />
                <Text style={[styles.editProfTxt, { color: colors.textPrimary }]}>Editar</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Estadísticas */}
          <View style={[styles.statsRow, { borderColor: colors.border }]}>
            {[
              { n: selectedActor.videos?.length || selectedActor.videosCount || 0, l: 'Videos' },
              { n: selectedActor.followersCount || 0, l: 'Seguidores' },
              { n: selectedActor.playlists?.length || 0, l: 'Listas' },
              { n: selectedActor.followersOnlyVideos?.length || 0, l: 'Exclusivos' },
            ].map((stat, idx) => (
              <React.Fragment key={stat.l}>
                {idx > 0 && <View style={[styles.statDiv, { backgroundColor: colors.border }]} />}
                <View style={styles.statItem}>
                  <Text style={[styles.statNum, { color: colors.textPrimary }]}>{stat.n}</Text>
                  <Text style={[styles.statLbl, { color: colors.textSecondary }]}>{stat.l}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Pestañas de Navegación */}
        <View style={[styles.tabRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          {(
            [
              { key: 'videos', label: 'Videos Subidos', Icon: Film },
              { key: 'followers', label: 'Exclusivos', Icon: Lock },
              { key: 'playlists', label: 'Listas', Icon: List },
              { key: 'about', label: 'Sobre mí', Icon: Info },
            ] as { key: ProfileTab; label: string; Icon: any }[]
          ).map((tab) => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabItem, active && [styles.tabActive, { borderBottomColor: colors.primary }]]}
                onPress={() => setActiveTab(tab.key)}
              >
                <tab.Icon size={16} color={active ? colors.primary : colors.textSecondary} />
                <Text style={[styles.tabLbl, { color: active ? colors.primary : colors.textSecondary }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loadingActorDetails ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* 1. PESTAÑA: VIDEOS SUBIDOS / EXCLUSIVOS */}
            {(activeTab === 'videos' || activeTab === 'followers') && (
              <View style={styles.videosGrid}>
                {tabVideos.length === 0 ? (
                  <View style={styles.emptyTab}>
                    {activeTab === 'followers' ? (
                      <Lock color={colors.textMuted} size={36} />
                    ) : (
                      <Film color={colors.textMuted} size={36} />
                    )}
                    <Text style={[styles.emptyTxt, { color: colors.textSecondary }]}>
                      {activeTab === 'followers'
                        ? 'Sin videos exclusivos aún'
                        : 'No hay videos publicados por esta actriz aún'}
                    </Text>
                  </View>
                ) : (
                  tabVideos.map((v) => (
                    <TouchableOpacity
                      key={v.id}
                      style={[styles.vidCard, { backgroundColor: colors.surfaceCard }]}
                      onPress={() => onSelectVideo?.(v)}
                      activeOpacity={0.85}
                    >
                      <Image
                        source={{
                          uri:
                            v.thumbnailUrl ||
                            'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&auto=format&fit=crop',
                        }}
                        style={StyleSheet.absoluteFillObject as any}
                      />
                      <View style={styles.vidGrad} />

                      {/* Botón de reproducción superpuesto */}
                      <View style={styles.playOverlay}>
                        <Play size={22} color="#FFFFFF" fill="#FFFFFF" />
                      </View>

                      {v.isFollowersOnly && (
                        <View style={[styles.exclBadge, { backgroundColor: colors.primary }]}>
                          <Lock size={10} color="#fff" />
                        </View>
                      )}

                      {/* Botón de 3 puntos en tarjeta */}
                      <TouchableOpacity
                        style={styles.cardMoreBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          setSelectedVideoForOptions(v);
                          setShowOptionsModal(true);
                        }}
                      >
                        <MoreVertical size={16} color="#FFFFFF" />
                      </TouchableOpacity>

                      <View style={styles.vidDur}>
                        <Text style={styles.vidDurTxt}>{v.duration || '10:00'}</Text>
                      </View>
                      <Text style={styles.vidTitle} numberOfLines={2}>
                        {v.title}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {/* 2. PESTAÑA: LISTAS DE REPRODUCCIÓN */}
            {activeTab === 'playlists' && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 }}>
                {isOwnProfile && (
                  <TouchableOpacity
                    style={[
                      styles.createPlBtn,
                      { borderColor: colors.primary, backgroundColor: colors.primaryGlow },
                    ]}
                    onPress={() => setShowPlaylistModal(true)}
                  >
                    <Plus size={18} color={colors.primary} />
                    <Text style={[styles.createPlTxt, { color: colors.primary }]}>Crear nueva lista</Text>
                  </TouchableOpacity>
                )}
                {!selectedActor.playlists || selectedActor.playlists.length === 0 ? (
                  <View style={styles.emptyTab}>
                    <List color={colors.textMuted} size={36} />
                    <Text style={[styles.emptyTxt, { color: colors.textSecondary }]}>Sin listas creadas aún</Text>
                  </View>
                ) : (
                  selectedActor.playlists.map((pl) => (
                    <View
                      key={pl.id}
                      style={[styles.plItem, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}
                    >
                      <Image
                        source={{ uri: pl.coverUrl || DEFAULT_BANNER }}
                        style={styles.plThumb}
                      />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.plTitle, { color: colors.textPrimary }]}>{pl.title}</Text>
                        <Text style={[styles.plMeta, { color: colors.textSecondary }]}>
                          {pl.itemsCount || 0} videos • {pl.isPrivate ? 'Privada' : 'Pública'}
                        </Text>
                        {pl.description ? (
                          <Text style={[styles.plDesc, { color: colors.textMuted }]} numberOfLines={1}>
                            {pl.description}
                          </Text>
                        ) : null}
                      </View>
                      {isOwnProfile && (
                        <TouchableOpacity
                          onPress={() =>
                            Alert.alert('Eliminar Lista', `¿Eliminar "${pl.title}"?`, [
                              { text: 'Cancelar', style: 'cancel' },
                              {
                                text: 'Eliminar',
                                style: 'destructive',
                                onPress: async () => {
                                  await api.actors.deletePlaylist(userToken || 'token_demo', pl.id);
                                  setSelectedActor((prev) =>
                                    prev ? { ...prev, playlists: prev.playlists.filter((p) => p.id !== pl.id) } : null
                                  );
                                },
                              },
                            ])
                          }
                          style={{ padding: 8 }}
                        >
                          <Trash2 size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))
                )}
              </View>
            )}

            {/* 3. PESTAÑA: SOBRE MÍ */}
            {activeTab === 'about' && (
              <View style={styles.aboutSec}>
                <Text style={[styles.aboutBio, { color: colors.textPrimary }]}>
                  {selectedActor.bio || 'Esta actriz aún no ha añadido una biografía descriptiva.'}
                </Text>
                {selectedActor.nationality && (
                  <View style={styles.aboutRow}>
                    <Globe size={16} color={colors.primary} />
                    <Text style={[styles.aboutTxt, { color: colors.textSecondary }]}>
                      {' '}Nacionalidad: {selectedActor.nationality}
                    </Text>
                  </View>
                )}
                {selectedActor.isVerified && (
                  <View style={styles.aboutRow}>
                    <CheckCircle2 size={16} color="#0084FF" fill="#0084FF" />
                    <Text style={[styles.aboutTxt, { color: colors.textSecondary }]}> Talento y actriz verificada</Text>
                  </View>
                )}
                <View style={styles.aboutRow}>
                  <Film size={16} color={colors.primary} />
                  <Text style={[styles.aboutTxt, { color: colors.textSecondary }]}>
                    {' '}{selectedActor.videos?.length || selectedActor.videosCount || 0} videos publicados
                  </Text>
                </View>
                <View style={styles.aboutRow}>
                  <Heart size={16} color={colors.primary} />
                  <Text style={[styles.aboutTxt, { color: colors.textSecondary }]}>
                    {' '}{selectedActor.followersCount || 0} seguidores oficiales
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
      </Animated.ScrollView>

      {/* ─── MODAL DE EDICIÓN DE PERFIL DE ACTRIZ ─── */}
      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.editModal, { backgroundColor: colors.background }]}>
          <View style={[styles.editHdr, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text style={[styles.editCancel, { color: colors.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={[styles.editTitle, { color: colors.textPrimary }]}>Editar Perfil de Actriz</Text>
            <TouchableOpacity onPress={handleSaveProfile} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.editSave, { color: colors.primary }]}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Banner selector */}
            <TouchableOpacity onPress={() => pickImage('banner')} activeOpacity={0.85}>
              <View style={[styles.editBanner, { backgroundColor: colors.surfaceCard }]}>
                <Image
                  source={{ uri: editBannerUrl || DEFAULT_BANNER }}
                  style={StyleSheet.absoluteFillObject as any}
                  resizeMode="cover"
                />
                <View style={styles.editBannerOvl} />
                {isUploadingBanner ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={{ alignItems: 'center', gap: 6 }}>
                    <Camera color="#fff" size={24} />
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Cambiar foto de portada</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            {/* Avatar selector */}
            <View style={{ alignItems: 'center', marginTop: -42, marginBottom: 16 }}>
              <TouchableOpacity
                onPress={() => pickImage('avatar')}
                style={[styles.editAvatarWrap, { borderColor: colors.primary }]}
                activeOpacity={0.85}
              >
                <Image source={{ uri: editAvatarUrl || DEFAULT_AVATAR }} style={{ width: '100%', height: '100%' }} />
                <View style={styles.editAvatarOvl}>
                  {isUploadingAvatar ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Camera color="#fff" size={22} />
                  )}
                </View>
              </TouchableOpacity>
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 6 }}>
                Toca para cambiar foto de perfil
              </Text>
            </View>

            {/* Campos de texto */}
            <View style={styles.editForm}>
              {[
                {
                  label: 'Nombre artístico *',
                  value: editStageName,
                  setter: setEditStageName,
                  placeholder: 'Ej: Luna Roja, Mia Khalifa...',
                },
                {
                  label: 'Nombre completo / Real',
                  value: editName,
                  setter: setEditName,
                  placeholder: 'Nombre real o artístico',
                },
                {
                  label: 'País / Nacionalidad',
                  value: editNationality,
                  setter: setEditNationality,
                  placeholder: 'Colombia, México, España...',
                },
              ].map((field) => (
                <View key={field.label}>
                  <Text style={[styles.editLbl, { color: colors.textSecondary }]}>{field.label}</Text>
                  <TextInput
                    style={[
                      styles.editInput,
                      { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textPrimary },
                    ]}
                    value={field.value}
                    onChangeText={field.setter}
                    placeholder={field.placeholder}
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              ))}

              <Text style={[styles.editLbl, { color: colors.textSecondary }]}>Biografía</Text>
              <TextInput
                style={[
                  styles.editInput,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                    minHeight: 90,
                    textAlignVertical: 'top',
                  },
                ]}
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Cuéntale a tus fans y seguidores sobre ti..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ─── MODAL CREAR PLAYLIST ─── */}
      <Modal visible={showPlaylistModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.plModalBg}>
          <View style={[styles.plModalBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.plModalTitle, { color: colors.textPrimary }]}>Nueva Lista de Reproducción</Text>
            <TextInput
              style={[
                styles.editInput,
                { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textPrimary },
              ]}
              value={newPlaylistTitle}
              onChangeText={setNewPlaylistTitle}
              placeholder="Título de la lista *"
              placeholderTextColor={colors.textMuted}
            />
            <TextInput
              style={[
                styles.editInput,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                  marginTop: 10,
                },
              ]}
              value={newPlaylistDesc}
              onChangeText={setNewPlaylistDesc}
              placeholder="Descripción (opcional)"
              placeholderTextColor={colors.textMuted}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
              <TouchableOpacity
                style={[styles.plModalBtn, { backgroundColor: colors.surfaceCard, flex: 1 }]}
                onPress={() => setShowPlaylistModal(false)}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.plModalBtn, { flex: 1, backgroundColor: colors.primary }]}
                onPress={handleCreatePlaylist}
                disabled={isCreatingPlaylist}
              >
                {isCreatingPlaylist ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Crear Lista</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL DE 3 PUNTOS (OPCIONES DE VIDEO) ─── */}
      <VideoOptionsModal
        visible={showOptionsModal}
        video={selectedVideoForOptions}
        onClose={() => {
          setShowOptionsModal(false);
          setSelectedVideoForOptions(null);
        }}
        onVideoDeleted={(vId) => {
          if (selectedActor) {
            setSelectedActor({
              ...selectedActor,
              videos: selectedActor.videos.filter((v) => v.id !== vId),
              publicVideos: selectedActor.publicVideos.filter((v) => v.id !== vId),
              followersOnlyVideos: selectedActor.followersOnlyVideos.filter((v) => v.id !== vId),
            });
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 14,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, marginTop: 2 },
  sparkleBadge: {
    padding: 8,
    borderRadius: 20,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14 },
  actorsGrid: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
  actorCard: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    height: 210,
    position: 'relative',
  },
  cardGrad: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  verBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 3,
  },
  cardInfo: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 10 },
  cardName: { color: '#fff', fontWeight: '800', fontSize: 14 },
  cardMeta: { color: '#ddd', fontSize: 11, marginLeft: 3 },
  profContainer: { flex: 1 },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  backBtn: { marginRight: 12, padding: 4 },
  stickyTitle: { flex: 1, fontWeight: '700', fontSize: 17 },
  bannerGrad: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  bannerBack: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 36,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    padding: 8,
  },
  bannerEditBtn: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  bannerEditTxt: { color: '#fff', fontSize: 13, fontWeight: '600' },
  profHeader: { paddingHorizontal: 18 },
  avatarWrap: {
    marginTop: -52,
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  profAvatar: { width: 90, height: 90, borderRadius: 45 },
  avatarEditBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    paddingVertical: 4,
    alignItems: 'center',
  },
  profVerBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#0a0a0a',
    borderRadius: 10,
    padding: 1,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 14 },
  profName: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  profNat: { fontSize: 13 },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 22,
  },
  followingBtn: { borderWidth: 1.5 },
  followTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  editProfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 22,
    borderWidth: 1,
  },
  editProfTxt: { fontWeight: '700', fontSize: 14 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '800' },
  statLbl: { fontSize: 11, marginTop: 2 },
  statDiv: { width: 1, height: 28 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, marginBottom: 8 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 4 },
  tabActive: { borderBottomWidth: 2.5 },
  tabLbl: { fontSize: 11, fontWeight: '700' },
  videosGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, paddingBottom: 40 },
  vidCard: {
    width: (SCREEN_W - 36) / 2,
    height: 190,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  vidGrad: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  playOverlay: {
    position: 'absolute',
    top: '35%',
    left: '40%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 6,
  },
  exclBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    borderRadius: 6,
    padding: 4,
  },
  cardMoreBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 5,
  },
  vidDur: {
    position: 'absolute',
    bottom: 30,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  vidDurTxt: { color: '#fff', fontSize: 10, fontWeight: '600' },
  vidTitle: {
    position: 'absolute',
    bottom: 6,
    left: 8,
    right: 8,
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 15,
  },
  emptyTab: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, width: '100%' },
  emptyTxt: { fontSize: 15, marginTop: 12 },
  createPlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderStyle: 'dashed',
  },
  createPlTxt: { fontWeight: '700', fontSize: 15 },
  plItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  plThumb: { width: 66, height: 66, borderRadius: 8, backgroundColor: '#1E1E28' },
  plTitle: { fontWeight: '700', fontSize: 15 },
  plMeta: { fontSize: 12, marginTop: 2 },
  plDesc: { fontSize: 12, marginTop: 3 },
  aboutSec: { paddingHorizontal: 20, paddingBottom: 50, paddingTop: 8 },
  aboutBio: { fontSize: 15, lineHeight: 23, marginBottom: 20 },
  aboutRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  aboutTxt: { fontSize: 14 },
  // Edit modal
  editModal: { flex: 1 },
  editHdr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'ios' ? 56 : 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  editCancel: { fontSize: 16 },
  editTitle: { fontWeight: '800', fontSize: 17 },
  editSave: { fontWeight: '800', fontSize: 16 },
  editBanner: { height: 160, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  editBannerOvl: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  editAvatarWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    overflow: 'hidden',
    borderWidth: 2.5,
    position: 'relative',
  },
  editAvatarOvl: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editForm: { paddingHorizontal: 18, paddingTop: 8 },
  editLbl: { fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.6 },
  editInput: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  // Playlist modal
  plModalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  plModalBox: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  plModalTitle: { fontWeight: '800', fontSize: 18, marginBottom: 18 },
  plModalBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
});
