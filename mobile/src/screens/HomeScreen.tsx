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
  ShieldCheck,
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
  Hash,
  Bell,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { api, VideoItem, ActorStoryGroup } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AuthScreen } from '../navigation/AuthStack';
import { AccountMenuModal } from '../components/AccountMenuModal';
import { BrandLogo } from '../components/BrandLogo';
import { VideoOptionsModal } from '../components/VideoOptionsModal';
import { NotificationsModal } from '../components/NotificationsModal';
import { StoriesCarousel } from '../components/StoriesCarousel';

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
  const [selectedCategory, setSelectedCategory] = useState('Para ti');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [videoList, setVideoList] = useState<VideoItem[]>([]);
  const [storyGroups, setStoryGroups] = useState<ActorStoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Modal de opciones para videos (3 puntos)
  const [selectedVideoForOptions, setSelectedVideoForOptions] = useState<VideoItem | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);

  // Categorías de posicionamiento exactas solicitadas
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
    fetchVideos(1);
  }, [fetchStories, fetchVideos]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStories();
    fetchVideos(1);
  };

  const loadMoreVideos = () => {
    if (!loadingMore && !loading && hasMore) {
      setLoadingMore(true);
      fetchVideos(page + 1);
    }
  };

  const handleToggleLike = async (item: VideoItem) => {
    if (!userToken) return;
    const res = await api.videos.toggleLike(userToken, item.id);
    setVideoList((prev) =>
      prev.map((v) =>
        v.id === item.id ? { ...v, isLiked: res.isLiked, likesCount: res.likesCount } : v
      )
    );
  };

  // Filtrado reactivo por Categoría y Hashtags/Búsqueda
  const filteredVideos = videoList.filter((v) => {
    // 1. Filtro de Categoría
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

    // 2. Filtro de Búsqueda y Hashtags
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

  const renderVideoItem = ({ item }: { item: VideoItem }) => (
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

        {/* Badges superiores (18+ & VERIFICADO) */}
        <View style={styles.thumbnailTopBadges}>
          <View style={styles.agePill}>
            <Text style={styles.agePillText}>18+</Text>
          </View>
          <View style={styles.verifiedPill}>
            <Text style={styles.verifiedPillText}>VERIFICADO</Text>
          </View>
        </View>

        {/* Botón Central de Play */}
        <View style={styles.centerPlayButton}>
          <Play size={24} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 3 }} />
        </View>

        {/* Duración */}
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{item.duration}</Text>
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
          <Text style={[styles.videoTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.creatorNameRow}>
            <Text style={[styles.creatorName, { color: colors.textSecondary }]}>
              {item.actorName || item.creatorName || 'Actor Principal'}
            </Text>
            <CheckCircle2 size={12} color={colors.verifiedBlue} fill={colors.verifiedBlue} />
            <Text style={{ color: colors.primary, fontSize: 10, fontWeight: 'bold', marginLeft: 4 }}>
              • {item.category || 'Para ti'}
            </Text>
          </View>

          {/* Tags o Hashtags asociados al video */}
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

          {item.isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NUEVO</Text>
            </View>
          )}
        </View>

        {/* Acciones Rápidas (Like y 3 Puntos Opciones) */}
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

          {/* Botón de 3 Puntos para Configuración y Opciones */}
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
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* 1. Header con Logo Oficial */}
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

          {/* Campanita de Notificaciones para el Usuario / Actor */}
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

          {/* Foto de perfil / Botón de Acceso */}
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
              placeholder="Buscar por título, categoría o #hashtag (#amateur, #pareja)..."
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

      {/* Modal de Autenticación / Registro */}
      <Modal
        visible={showAuthModal}
        animationType="slide"
        onRequestClose={() => setShowAuthModal(false)}
      >
        <AuthScreen onClose={() => setShowAuthModal(false)} />
      </Modal>

      {/* Modal de Cuenta e Interfaz de Usuario */}
      <AccountMenuModal
        visible={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        onOpenAdminPanel={onOpenAdminPanel}
        onSelectVideo={onSelectVideo}
      />

      {/* 1.5. Carrusel de Historias Efímeras (Stories 24h) */}
      <StoriesCarousel
        storyGroups={storyGroups}
        onRefreshStories={fetchStories}
        onViewActor={onViewActor}
      />

      {/* 2. Categorías / Chips de Posicionamiento */}
      <View style={[styles.categoriesContainer, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
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
                  size={14}
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

      {/* 3. Feed Principal de Videos */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando catálogo en alta definición...</Text>
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
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>Cargando más videos...</Text>
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

      {/* 4. Modal de 3 Puntos (Opciones y Configuración) */}
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

      {/* 5. Modal de Notificaciones en Tiempo Real */}
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
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notifButton: {
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifBadgeCircle: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF2D55',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
  },
  searchButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  avatarContainer: {
    position: 'relative',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  avatarGuestPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#30D158',
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  categoriesContainer: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  feedList: {
    padding: 16,
    paddingBottom: 30,
    gap: 18,
  },
  videoCard: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
  },
  thumbnailWrapper: {
    position: 'relative',
    width: '100%',
    height: 200,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailTopBadges: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    gap: 6,
  },
  agePill: {
    backgroundColor: '#E50914',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  agePillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  verifiedPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#0084FF',
  },
  verifiedPillText: {
    color: '#0084FF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  centerPlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -24 }, { translateY: -24 }],
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  videoInfoRow: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'flex-start',
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
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  creatorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  creatorName: {
    fontSize: 12,
  },
  videoTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  miniTagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.5,
  },
  miniTagText: {
    fontSize: 10,
    fontWeight: '500',
  },
  newBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(229, 9, 20, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 4,
    borderWidth: 0.5,
    borderColor: '#E50914',
  },
  newBadgeText: {
    color: '#E50914',
    fontSize: 9,
    fontWeight: 'bold',
  },
  actionsColumn: {
    alignItems: 'center',
    gap: 8,
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
