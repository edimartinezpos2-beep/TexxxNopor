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
import { AdBannerCard } from '../components/AdBannerCard';
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

    // 2. Filtro de Categoría
    let matchesCategory = true;
    if (selectedCategory !== 'Para ti') {
      const catNorm = selectedCategory.toLowerCase();
      const vCat = (v.category || '').toLowerCase();

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
        matchesCategory =
          vCat.includes(catNorm) ||
          (v.tags && v.tags.some((t) => t.toLowerCase().includes(catNorm)));
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
    // Calculamos un porcentaje simulado de likes basado en las métricas
    const satisfactionPercent = Math.min(99, Math.max(88, 90 + ((index * 3) % 10)));

    return (
      <View key={item.id}>
        {/* Cada 6 videos, insertamos un banner publicitario nativo de TrafficJunky */}
        {index > 0 && index % 6 === 0 && (
          <AdBannerCard
            title="Citas para Adultos Verificadas en tu Ciudad"
            subtitle="Conoce solteras y solteros dispuestos a todo esta noche. Registro 100% privado."
            ctaText="Ver Fotos Gratis"
            imageUrl="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop"
            sponsorName="TrafficJunky Ads"
          />
        )}

        <TouchableOpacity
          style={[
            styles.videoCard,
            { backgroundColor: colors.surfaceCard, borderColor: colors.border },
          ]}
          activeOpacity={0.9}
          onPress={() => onSelectVideo && onSelectVideo(item)}
        >
          {/* Thumbnail */}
          <View style={[styles.thumbnailWrapper, { backgroundColor: colors.surfaceCardLight }]}>
            <Image
              source={{
                uri:
                  item.thumbnailUrl ||
                  'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop',
              }}
              style={styles.thumbnail as any}
              resizeMode="cover"
            />

            {/* Badges superiores (18+ & VERIFICADO & 4K) */}
            <View style={styles.thumbnailTopBadges}>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                <View style={styles.agePill}>
                  <Text style={styles.agePillText}>18+</Text>
                </View>
                <View style={styles.verifiedPill}>
                  <Text style={styles.verifiedPillText}>VERIFICADO</Text>
                </View>
              </View>

              <View style={styles.qualityPill}>
                <Text style={styles.qualityPillText}>4K</Text>
              </View>
            </View>

            {/* Botón Central de Play */}
            <View style={styles.centerPlayButton}>
              <Play size={24} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 3 }} />
            </View>

            {/* Duración y Satisfacción */}
            <View style={styles.bottomThumbRow}>
              <View style={styles.ratingBadgePill}>
                <ThumbsUp size={10} color="#30D158" style={{ marginRight: 3 }} />
                <Text style={styles.ratingBadgeText}>{satisfactionPercent}%</Text>
              </View>

              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>{item.duration || '20:15'}</Text>
              </View>
            </View>
          </View>

          {/* Metadatos del Video */}
          <View style={styles.videoInfoRow}>
            <TouchableOpacity
              style={styles.creatorAvatarWrapper}
              onPress={() => onViewActor && onViewActor(item.actorId, item.actorName)}
              activeOpacity={0.8}
            >
              <Image
                source={{
                  uri:
                    item.actorAvatar ||
                    item.creatorAvatar ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop',
                }}
                style={styles.creatorAvatar as any}
              />
              <View style={styles.creatorAvatarCheck}>
                <CheckCircle2 size={10} color="#000000" fill={colors.verifiedBlue} />
              </View>
            </TouchableOpacity>

            <View style={styles.titleContainer}>
              <Text style={[styles.videoTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                {item.title}
              </Text>
              <View style={styles.creatorNameRow}>
                <Text style={[styles.creatorName, { color: colors.textSecondary }]}>
                  {item.actorName || item.creatorName || 'Canal Oficial'}
                </Text>
                <CheckCircle2 size={12} color={colors.verifiedBlue} fill={colors.verifiedBlue} />
                <Text style={{ color: colors.primary, fontSize: 10, fontWeight: 'bold', marginLeft: 4 }}>
                  • {item.category || 'Para ti'}
                </Text>
              </View>

              {/* Vistas y Fecha */}
              <View style={styles.videoMetaStatsRow}>
                <Eye size={11} color={colors.textMuted} style={{ marginRight: 4 }} />
                <Text style={[styles.viewsCountText, { color: colors.textMuted }]}>
                  {typeof item.views === 'number'
                    ? `${(item.views / 1000).toFixed(1)}k vistas`
                    : `${item.views || '15k'} vistas`}
                </Text>
                <Text style={[styles.viewsCountText, { color: colors.textMuted }]}> • HD 1080p</Text>
              </View>

              {/* Tags o Hashtags */}
              {item.tags && item.tags.length > 0 && (
                <View style={styles.videoTagsRow}>
                  {item.tags.slice(0, 3).map((tag, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.miniTagBadge,
                        { backgroundColor: colors.surfaceCardLight, borderColor: colors.border },
                      ]}
                    >
                      <Text style={[styles.miniTagText, { color: colors.primary }]}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Acciones Rápidas (Like y 3 Puntos) */}
            <View style={styles.actionsColumn}>
              <TouchableOpacity
                style={styles.likeButton}
                onPress={() => handleToggleLike(item)}
                activeOpacity={0.7}
              >
                <Heart
                  size={18}
                  color={item.isLiked ? colors.primary : colors.textMuted}
                  fill={item.isLiked ? colors.primary : 'transparent'}
                />
                <Text
                  style={[
                    styles.likeCountText,
                    { color: colors.textSecondary },
                    item.isLiked && { color: colors.primary, fontWeight: 'bold' },
                  ]}
                >
                  {item.likesCount > 999
                    ? `${(item.likesCount / 1000).toFixed(1)}k`
                    : item.likesCount}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.moreButton}
                activeOpacity={0.7}
                onPress={() => {
                  setSelectedVideoForOptions(item);
                  setShowOptionsModal(true);
                }}
              >
                <MoreVertical size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </View>
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
        <BrandLogo size="small" />

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[
              styles.searchButton,
              { backgroundColor: colors.surfaceCard, borderColor: colors.border },
              showSearchBar && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setShowSearchBar(!showSearchBar)}
            activeOpacity={0.8}
          >
            <Search size={16} color={showSearchBar ? '#FFFFFF' : colors.textPrimary} />
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
            >
              <Bell size={18} color={unreadNotifsCount > 0 ? '#FF2D55' : colors.textPrimary} />
              {unreadNotifsCount > 0 && (
                <View style={styles.notifBadgeCircle}>
                  <Text style={styles.notifBadgeText}>
                    {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
                  </Text>
                </View>
              )}
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
          >
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={[styles.headerAvatar, { borderColor: colors.primary }] as any} />
            ) : (
              <View style={[styles.headerAvatar, styles.avatarGuestPlaceholder, { borderColor: colors.border, backgroundColor: colors.surfaceCardLight }]}>
                <User size={18} color={colors.textSecondary} />
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
            <Search size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Buscar videos, actrices, categorías (#amateur, #4k)..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
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

              {/* 6. Banner Publicitario Nativo (TrafficJunky / Adult Ads Slot) */}
              {!searchQuery && (
                <AdBannerCard
                  title="Juegos Para Adultos #1 Sin Tarjeta de Crédito"
                  subtitle="Más de 50,000 jugadores en línea ahora mismo. Únete gratis en 10 segundos."
                  ctaText="Jugar Gratis"
                  imageUrl="https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop"
                  sponsorName="TrafficJunky Ads"
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
                <LiveCamsTeaser />
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
                      >
                        <IconComp
                          size={13}
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  searchButtonText: {
    fontSize: 12,
  },
  notifButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    position: 'relative',
  },
  notifBadgeCircle: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#FF2D55',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  avatarContainer: {
    position: 'relative',
  },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
  },
  avatarGuestPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#30D158',
    borderWidth: 1.5,
    borderColor: '#0A0A0E',
  },
  searchBarContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  listHeaderWrapper: {
    paddingBottom: 4,
  },
  catalogHeaderBox: {
    marginTop: 8,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderBottomWidth: 0.5,
    paddingBottom: 10,
  },
  catalogTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  catalogMainTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  catalogCountBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryScroll: {
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  feedList: {
    paddingBottom: 20,
  },
  videoCard: {
    marginHorizontal: 12,
    marginBottom: 14,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
  },
  thumbnailWrapper: {
    width: '100%',
    height: 200,
    position: 'relative',
    backgroundColor: '#1E1E28',
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
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  agePillText: {
    color: '#FF3B30',
    fontSize: 9,
    fontWeight: 'bold',
  },
  verifiedPill: {
    backgroundColor: '#0084FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedPillText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  qualityPill: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#05D9E8',
  },
  qualityPillText: {
    color: '#05D9E8',
    fontSize: 9,
    fontWeight: '900',
  },
  centerPlayButton: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    transform: [{ translateX: -24 }, { translateY: -24 }],
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.65)',
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
    color: '#30D158',
    fontSize: 10,
    fontWeight: 'bold',
  },
  durationBadge: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  videoInfoRow: {
    flexDirection: 'row',
    padding: 10,
    gap: 10,
  },
  creatorAvatarWrapper: {
    position: 'relative',
  },
  creatorAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
    fontSize: 13,
    fontWeight: 'bold',
    lineHeight: 18,
    marginBottom: 4,
  },
  creatorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },
  creatorName: {
    fontSize: 12,
  },
  videoMetaStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  viewsCountText: {
    fontSize: 10,
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
    fontSize: 9,
    fontWeight: '600',
  },
  actionsColumn: {
    alignItems: 'center',
    gap: 6,
  },
  likeButton: {
    alignItems: 'center',
    padding: 4,
  },
  likeCountText: {
    fontSize: 10,
    marginTop: 2,
  },
  moreButton: {
    padding: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
