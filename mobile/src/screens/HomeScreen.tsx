import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Linking,
  Platform,
} from 'react-native';
import {
  Search,
  CheckCircle2,
  Play,
  Eye,
  Heart,
  MoreVertical,
  ChevronRight,
  Flame,
  Sparkles,
  User,
  Users,
  X,
  Bell,
  ThumbsUp,
  Award,
  Film,
  Download,
  Hash,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { api, VideoItem, ActorStoryGroup, ActorItem } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AuthScreen } from '../navigation/AuthStack';
import { AccountMenuModal } from '../components/AccountMenuModal';
import { BrandLogo } from '../components/BrandLogo';
import { VideoOptionsModal } from '../components/VideoOptionsModal';
import { NotificationsModal } from '../components/NotificationsModal';
import { StoriesCarousel } from '../components/StoriesCarousel';

// Nuevas Secciones de Alto Nivel
import { OrientationSwitcher, OrientationType } from '../components/OrientationSwitcher';
import { SpotlightHeroCard } from '../components/SpotlightHeroCard';
import { TexxxClipsSection } from '../components/TexxxClipsSection';
import { TopPornstarsSection } from '../components/TopPornstarsSection';
import { TrendingRankingsSection } from '../components/TrendingRankingsSection';
import { VisualCategoriesGrid } from '../components/VisualCategoriesGrid';
import { LiveCamsTeaser } from '../components/LiveCamsTeaser';
import { GamesTeaserBanner } from '../components/GamesTeaserBanner';

interface HomeScreenProps {
  onSelectVideo?: (video: VideoItem) => void;
  onOpenAdminPanel?: () => void;
  onViewActor?: (actorId?: string, actorName?: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onSelectVideo,
  onOpenAdminPanel,
  onViewActor,
}) => {
  const { colors, isDark } = useTheme();
  const { userToken, user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);

  // Estados de navegación y contenido
  const [orientation, setOrientation] = useState<OrientationType>('straight');
  const [selectedCategory, setSelectedCategory] = useState('Para ti');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [videoList, setVideoList] = useState<VideoItem[]>([]);
  const [storyGroups, setStoryGroups] = useState<ActorStoryGroup[]>([]);
  const [actorsList, setActorsList] = useState<ActorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Modal de opciones para videos (3 puntos)
  const [selectedVideoForOptions, setSelectedVideoForOptions] = useState<VideoItem | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);

  // Categorías de posicionamiento exactas
  const categories = [
    { id: '1', name: 'Para ti', icon: Flame },
    { id: '2', name: 'Nuevos', icon: Sparkles },
    { id: '3', name: 'Más videos', icon: Eye },
    { id: '4', name: 'Amateur', icon: User },
    { id: '5', name: 'Pareja', icon: Users },
  ];

  const handleDownloadApk = () => {
    const downloadUrl = api.system ? api.system.getDownloadUrl() : 'https://texxxnopor-backend.onrender.com/api/app/download-apk';
    Linking.openURL(downloadUrl).catch(() => {});
  };

  const loadUnreadNotifs = useCallback(async () => {
    if (!userToken) return;
    try {
      const res = await api.notifications.getNotifications(userToken);
      setUnreadNotifsCount(res.unreadCount);
    } catch (_) {}
  }, [userToken]);

  useEffect(() => {
    loadUnreadNotifs();
    const interval = setInterval(loadUnreadNotifs, 15000);
    return () => clearInterval(interval);
  }, [loadUnreadNotifs]);

  const fetchStories = useCallback(async () => {
    try {
      const list = await api.stories.getStories(user?.id);
      setStoryGroups(list);
    } catch (err) {
      console.log('Error fetching stories:', err);
    }
  }, [user?.id]);

  const fetchActors = useCallback(async () => {
    try {
      const list = await api.actors.getActors(user?.id);
      if (list && list.length > 0) {
        setActorsList(list);
      }
    } catch (err) {
      console.log('Error fetching actors:', err);
    }
  }, [user?.id]);

  const fetchVideos = useCallback(async (pageNum: number = 1) => {
    try {
      const data = await api.videos.getFeed(userToken, undefined, { page: pageNum, limit: 12 });
      if (pageNum === 1) {
        setVideoList(data);
      } else {
        setVideoList((prev) => {
          const existingIds = new Set(prev.map((v) => v.id));
          const newItems = data.filter((v) => !existingIds.has(v.id));
          return [...prev, ...newItems];
        });
      }
      setHasMore(data.length >= 12);
      setPage(pageNum);
    } catch (err) {
      console.log('Error fetching feed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [userToken]);

  useEffect(() => {
    fetchStories();
    fetchActors();
    fetchVideos(1);
  }, [fetchStories, fetchActors, fetchVideos]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStories();
    fetchActors();
    fetchVideos(1);
  };

  const loadMoreVideos = () => {
    if (!loadingMore && !loading && hasMore) {
      setLoadingMore(true);
      fetchVideos(page + 1);
    }
  };

  const handleToggleLike = async (item: VideoItem) => {
    if (!userToken) {
      setShowAuthModal(true);
      return;
    }
    const res = await api.videos.toggleLike(userToken, item.id);
    setVideoList((prev) =>
      prev.map((v) =>
        v.id === item.id ? { ...v, isLiked: res.isLiked, likesCount: res.likesCount } : v
      )
    );
  };

  const handleToggleFollowActor = async (actor: ActorItem) => {
    if (!userToken) {
      setShowAuthModal(true);
      return;
    }
    try {
      const res = await api.actors.toggleFollow(actor.id, userToken);
      setActorsList((prev) =>
        prev.map((a) => (a.id === actor.id ? { ...a, isFollowing: res.isFollowing } : a))
      );
    } catch (err) {
      console.log('Error following actor:', err);
    }
  };

  // Filtrado reactivo por Orientación, Categoría y Búsqueda
  const filteredVideos = videoList.filter((v) => {
    // 1. Filtro por Orientación si es VR, Gay o Trans
    if (orientation === 'vr') {
      const isVr = (v.tags && v.tags.some(t => t.toLowerCase().includes('vr'))) || v.title.toLowerCase().includes('vr');
      if (!isVr) return false;
    } else if (orientation === 'gay') {
      const isGay = (v.tags && v.tags.some(t => t.toLowerCase().includes('gay'))) || (v.category || '').toLowerCase().includes('gay');
      if (!isGay && v.category === 'Gay') return false;
    } else if (orientation === 'trans') {
      const isTrans = (v.tags && v.tags.some(t => t.toLowerCase().includes('trans'))) || (v.category || '').toLowerCase().includes('trans');
      if (!isTrans && v.category === 'Trans') return false;
    }

    // 2. Filtro de Categoría y Hashtags
    let matchesCategory = true;
    if (selectedCategory !== 'Para ti') {
      const catNorm = selectedCategory.toLowerCase().trim();
      const cleanCatTag = catNorm.startsWith('#') ? catNorm : `#${catNorm}`;
      const vCat = (v.category || '').toLowerCase();
      const catWords = catNorm.replace(/^#/, '').split(/\s+/).filter((w) => w.length > 2);

      if (catNorm === 'más videos' || catNorm === 'más vistos') {
        matchesCategory = true;
      } else if (catNorm === 'pareja' || catNorm === 'parejas') {
        matchesCategory =
          vCat.includes('pareja') ||
          (v.tags && v.tags.some((t) => t.toLowerCase().includes('pareja')));
      } else if (catNorm === 'amateur') {
        matchesCategory =
          vCat.includes('amateur') ||
          (v.tags && v.tags.some((t) => t.toLowerCase().includes('amateur')));
      } else if (catNorm === 'nuevos') {
        matchesCategory =
          v.isNew ||
          vCat.includes('nuevo') ||
          (v.tags && v.tags.some((t) => t.toLowerCase().includes('nuevo')));
      } else {
        const matchesDirect =
          vCat.includes(catNorm) ||
          (v.tags &&
            v.tags.some(
              (t) =>
                t.toLowerCase() === cleanCatTag ||
                t.toLowerCase().includes(catNorm.replace(/\s+/g, ''))
            ));
        const matchesKeywords = catWords.some(
          (word) =>
            vCat.includes(word) || (v.tags && v.tags.some((t) => t.toLowerCase().includes(word)))
        );
        matchesCategory = matchesDirect || matchesKeywords;
      }
    }

    // 3. Filtro de Búsqueda
    let matchesSearch = true;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const titleMatch = v.title.toLowerCase().includes(q);
      const descMatch = (v.description || '').toLowerCase().includes(q);
      const actorMatch = (v.actorName || '').toLowerCase().includes(q);
      const catMatch = (v.category || '').toLowerCase().includes(q);
      const tagMatch = v.tags ? v.tags.some((t) => t.toLowerCase().includes(q)) : false;

      matchesSearch = titleMatch || descMatch || actorMatch || catMatch || tagMatch;
    }

    return matchesCategory && matchesSearch;
  });

  const displayedVideos =
    selectedCategory === 'Más videos'
      ? [...filteredVideos].sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0))
      : filteredVideos;

  // Video destacado para Spotlight Hero
  const featuredVideo = displayedVideos.length > 0 ? displayedVideos[0] : null;

  const renderVideoItem = ({ item, index }: { item: VideoItem; index: number }) => {
    return (
      <PremiumVideoCard
        key={item.id}
        video={item}
        onPress={() => onSelectVideo && onSelectVideo(item)}
        onToggleLike={() => handleToggleLike(item)}
        onToggleSave={() => {
          // Implement toggle save logic
          if (!userToken) {
            setShowAuthModal(true);
            return;
          }
          // For now, we'll just call toggleLike as a placeholder
          // In a real implementation, this would toggle watch later
          handleToggleLike(item);
        }}
        onMoreOptions={() => {
          setSelectedVideoForOptions(item);
          setShowOptionsModal(true);
        }}
        onViewActor={onViewActor}
        isLiked={item.isLiked ?? false}
        isSaved={item.isSaved ?? false}
        likesCount={item.likesCount ?? 0}
        index={index}
        variant="standard"
        showSatisfaction={true}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* 1. Header con Logo Oficial y Acciones */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <BrandLogo size="small" showSubtitle={false} />

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[
              styles.searchButton,
              { backgroundColor: colors.surfaceCard, borderColor: colors.border },
              showSearchBar && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setShowSearchBar(!showSearchBar)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={showSearchBar ? 'Cerrar búsqueda' : 'Buscar'}
          >
            <Search size={22} color={showSearchBar ? '#FFFFFF' : colors.textPrimary} />
            <Text
              style={[
                styles.searchButtonText,
                { color: colors.textPrimary },
                showSearchBar && { color: '#FFFFFF', fontWeight: 'bold' },
              ]}
            >
              {showSearchBar ? 'Cerrar' : 'Buscar'}
            </Text>
          </TouchableOpacity>

          {/* Campanita de Notificaciones */}
          {user && (
            <TouchableOpacity
              style={[
                styles.notifButton,
                { backgroundColor: colors.surfaceCard, borderColor: colors.border },
              ]}
              onPress={() => setShowNotificationsModal(true)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Avisos"
            >
              <Bell size={22} color={unreadNotifsCount > 0 ? colors.primary : colors.textPrimary} />
              <Text style={[styles.notifButtonText, { color: colors.textPrimary }]}>Avisos</Text>
              {unreadNotifsCount > 0 && (
                <View style={styles.notifBadgeCircle}>
                  <Text style={styles.notifBadgeText}>
                    {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Botón Descargar APK (En la barra superior al lado del perfil) - Solo visible en versión Web para descargar el APK móvil */}
          {Platform.OS === 'web' && (
            <TouchableOpacity
              style={[styles.downloadHeaderBtn, { backgroundColor: colors.primary }]}
              onPress={handleDownloadApk}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Descargar la aplicación"
            >
              <Download size={20} color="#FFFFFF" />
              <Text style={styles.downloadHeaderBtnText}>Descargar</Text>
            </TouchableOpacity>
          )}

          {/* Avatar de Usuario */}
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() => {
              if (user) {
                setShowAccountModal(true);
              } else {
                setShowAuthModal(true);
              }
            }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={user ? 'Abrir mi cuenta' : 'Iniciar sesión'}
          >
            {user?.avatarUrl ? (
              <Image
                source={{ uri: user.avatarUrl }}
                style={[styles.headerAvatar, { borderColor: colors.primary }] as any}
                accessibilityLabel="Foto de perfil"
                accessible
              />
            ) : (
              <View style={[styles.headerAvatar, styles.avatarGuestPlaceholder, { borderColor: colors.border, backgroundColor: colors.surfaceCardLight }]}>
                <User size={22} color={colors.textSecondary} />
              </View>
            )}
            <View
              style={[
                styles.onlineDot,
                !user && { backgroundColor: colors.primary },
              ]}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Barra de Búsqueda Desplegable */}
      {showSearchBar && (
        <View style={[styles.searchBarContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={[styles.searchInputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <Search size={22} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Buscar videos, actrices, categorías (#amateur, #4k)..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              accessibilityLabel="Campo de búsqueda"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Modal de Autenticación */}
      <Modal
        visible={showAuthModal}
        animationType="slide"
        onRequestClose={() => setShowAuthModal(false)}
      >
        <AuthScreen onClose={() => setShowAuthModal(false)} />
      </Modal>

      {/* Modal de Cuenta */}
      <AccountMenuModal
        visible={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        onOpenAdminPanel={onOpenAdminPanel}
        onSelectVideo={onSelectVideo}
      />

      {/* Feed Principal de Videos con todas las secciones líderes */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Cargando catálogo premium en alta definición...
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayedVideos}
          keyExtractor={(item) => item.id}
          renderItem={renderVideoItem}
          contentContainerStyle={styles.feedList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          onEndReached={loadMoreVideos}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
            <View style={styles.listHeaderWrapper}>
              {/* 1. Selector de Orientación Superior Estilo PornHub (HETERO, GAY, TRANS, VR) */}
              <OrientationSwitcher
                selected={orientation}
                onSelect={(type) => setOrientation(type)}
              />

              {/* 2. Hero Spotlight VIP (El estreno exclusivo del día) */}
              {featuredVideo && !searchQuery && (
                <SpotlightHeroCard
                  video={featuredVideo}
                  onPress={() => onSelectVideo && onSelectVideo(featuredVideo)}
                  onViewActor={onViewActor}
                  onToggleSave={() => handleToggleLike(featuredVideo)}
                  isSaved={featuredVideo.isLiked}
                />
              )}

              {/* 3. Carrusel de Historias Efímeras 24h */}
              <StoriesCarousel
                storyGroups={storyGroups}
                onRefreshStories={fetchStories}
                onViewActor={onViewActor}
              />

              {/* 4. TexxxClips / Shorts Rápidos (Reels verticales 9:16) */}
              {!searchQuery && (
                <TexxxClipsSection
                  videos={videoList}
                  onSelectVideo={onSelectVideo}
                  onViewActor={onViewActor}
                />
              )}

              {/* 5. Top Modelos Verificados de la Semana con Rankings (Corona Dorada #1, Medallas) */}
              {!searchQuery && (
                <TopPornstarsSection
                  actors={actorsList}
                  onViewActor={onViewActor}
                  onToggleFollow={handleToggleFollowActor}
                />
              )}


              {/* 7. Explorar por Categorías Populares con Miniaturas Fotográficas */}
              {!searchQuery && (
                <VisualCategoriesGrid
                  onSelectCategory={(catName) => setSelectedCategory(catName)}
                />
              )}

              {/* 8. Top 5 Videos Más Vistos (Ranking con Grandes Números 01, 02, 03) */}
              {!searchQuery && (
                <TrendingRankingsSection
                  videos={videoList}
                  onSelectVideo={onSelectVideo}
                />
              )}

              {/* 9. Transmisiones en Vivo / Cams Teaser con Sala Interactiva */}
              {!searchQuery && (
                <LiveCamsTeaser
                  onViewActor={onViewActor}
                />
              )}

              {/* 10. Zona de Videojuegos +18 y Nutaku */}
              {!searchQuery && (
                <GamesTeaserBanner />
              )}

              {/* 11. Header del Catálogo y Filtros de Categoría */}
              <View style={[styles.catalogHeaderBox, { borderBottomColor: colors.border }]}>
                <View style={styles.catalogTitleRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Film size={16} color={colors.primary} />
                    <Text style={[styles.catalogMainTitle, { color: colors.textPrimary }]}>
                      {searchQuery ? `Buscando: "${searchQuery}"` : 'Catálogo de Videos'}
                    </Text>
                  </View>
                  <Text style={[styles.catalogCountBadge, { color: colors.textMuted }]}>
                    {displayedVideos.length} títulos
                  </Text>
                </View>

                {/* Chips de Categorías */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryScroll}
                >
                  {categories.map((cat) => {
                    const isSelected = selectedCategory === cat.name;
                    const IconComp = cat.icon;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.categoryChip,
                          { backgroundColor: colors.surfaceCard, borderColor: colors.border },
                          isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                        ]}
                        onPress={() => setSelectedCategory(cat.name)}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel={`Categoría ${cat.name}`}
                      >
                        <IconComp
                          size={18}
                          color={isSelected ? '#FFFFFF' : colors.textPrimary}
                          style={{ marginRight: 5 }}
                        />
                        <Text
                          style={[
                            styles.categoryChipText,
                            { color: colors.textPrimary },
                            isSelected && { color: '#FFFFFF', fontWeight: 'bold' },
                          ]}
                        >
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>
                  Cargando más videos...
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Eye size={42} color={colors.textMuted} style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {searchQuery
                  ? `No hay videos que coincidan con "${searchQuery}"`
                  : `No hay videos en la categoría "${selectedCategory}"`}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Sé el primero en subir un video en esta sección desde el botón de publicar.
              </Text>
            </View>
          }
        />
      )}

      {/* Modal de 3 Puntos (Opciones y Configuración) */}
      <VideoOptionsModal
        visible={showOptionsModal}
        video={selectedVideoForOptions}
        onClose={() => {
          setShowOptionsModal(false);
          setSelectedVideoForOptions(null);
        }}
        onViewActor={onViewActor}
        onVideoDeleted={(deletedId) => {
          setVideoList((prev) => prev.filter((v) => v.id !== deletedId));
        }}
      />

      {/* Modal de Notificaciones en Tiempo Real */}
      <NotificationsModal
        visible={showNotificationsModal}
        onClose={() => {
          setShowNotificationsModal(false);
          loadUnreadNotifs();
        }}
        onSelectVideo={onSelectVideo}
        onViewActor={onViewActor}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    minHeight: 72,
    ...(Platform.OS === 'web'
      ? ({ position: 'sticky', top: 0, zIndex: 50 } as any)
      : null),
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    flexShrink: 1,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 8,
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? 'Inter, Open Sans, sans-serif' : undefined,
  },
  downloadHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    gap: 8,
  },
  downloadHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  notifButton: {
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notifButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  notifBadgeCircle: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#8B1E2D',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  avatarContainer: {
    position: 'relative',
  },
  headerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
  },
  avatarGuestPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#15803D',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  searchInput: {
    flex: 1,
    fontSize: 18,
    lineHeight: 28,
    paddingVertical: 8,
    fontFamily: Platform.OS === 'web' ? 'Inter, Open Sans, sans-serif' : undefined,
  },
  listHeaderWrapper: {
    paddingBottom: 8,
  },
  catalogHeaderBox: {
    marginTop: 16,
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderBottomWidth: 1,
    paddingBottom: 16,
  },
  catalogTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 12,
  },
  catalogMainTitle: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 36,
    fontFamily: Platform.OS === 'web' ? 'Inter, Open Sans, sans-serif' : undefined,
  },
  catalogCountBadge: {
    fontSize: 16,
    fontWeight: '600',
  },
  categoryScroll: {
    gap: 10,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  categoryChipText: {
    fontSize: 16,
    fontWeight: '700',
  },
  feedList: {
    paddingBottom: 32,
  },
  videoCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  thumbnailWrapper: {
    width: '100%',
    height: 220,
    position: 'relative',
    backgroundColor: '#1C1917',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailTopBadges: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  agePill: {
    backgroundColor: '#8B1E2D',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  agePillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  verifiedPill: {
    backgroundColor: '#1D4ED8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  qualityPill: {
    backgroundColor: 'rgba(28,25,23,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  qualityPillText: {
    color: '#FAF6F1',
    fontSize: 13,
    fontWeight: '800',
  },
  centerPlayButton: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    transform: [{ translateX: -28 }, { translateY: -28 }],
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(139, 30, 45, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomThumbRow: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  durationBadge: {
    backgroundColor: 'rgba(28,25,23,0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  videoInfoRow: {
    flexDirection: 'row',
    padding: 14,
    gap: 12,
  },
  creatorAvatarWrapper: {
    position: 'relative',
  },
  creatorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  creatorAvatarCheck: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
  },
  titleContainer: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 28,
    marginBottom: 6,
    maxWidth: 640,
    fontFamily: Platform.OS === 'web' ? 'Inter, Open Sans, sans-serif' : undefined,
  },
  creatorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },
  creatorName: {
    fontSize: 16,
  },
  videoMetaStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  viewsCountText: {
    fontSize: 15,
  },
  videoTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  miniTagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.5,
  },
  miniTagText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionsColumn: {
    alignItems: 'center',
    gap: 6,
  },
  likeButton: {
    alignItems: 'center',
    minHeight: 48,
    minWidth: 48,
    padding: 8,
  },
  likeCountText: {
    fontSize: 14,
    marginTop: 2,
  },
  moreButton: {
    minHeight: 44,
    minWidth: 44,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    gap: 12,
  },
  loadingText: {
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'center',
    maxWidth: 420,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 32,
    maxWidth: 520,
  },
  emptySubtitle: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 28,
    maxWidth: 520,
  },
});
