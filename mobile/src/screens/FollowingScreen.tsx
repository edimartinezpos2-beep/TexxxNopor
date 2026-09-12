import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Heart, CheckCircle2, Play, Users, Sparkles } from 'lucide-react-native';
import { COLORS } from '../theme/colors';
import { api, SubscriptionItem, VideoItem } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface FollowingScreenProps {
  onSelectVideo?: (video: VideoItem) => void;
  onViewActor?: (actorId?: string, actorName?: string) => void;
}

export const FollowingScreen: React.FC<FollowingScreenProps> = ({
  onSelectVideo,
  onViewActor,
}) => {
  const { userToken, user } = useAuth();
  const { colors } = useTheme();

  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [followedVideos, setFollowedVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFollowedData = useCallback(async () => {
    try {
      if (userToken) {
        const [subs, allVideos] = await Promise.all([
          api.user.getSubscriptions(userToken),
          api.videos.getFeed(userToken, user?.id),
        ]);
        setSubscriptions(subs || []);

        if (subs && subs.length > 0) {
          const followedActorIds = new Set(subs.map((s) => s.id));
          const filtered = allVideos.filter(
            (v) => v.actorId && followedActorIds.has(v.actorId)
          );
          setFollowedVideos(filtered.length > 0 ? filtered : allVideos.slice(0, 8));
        } else {
          setFollowedVideos([]);
        }
      } else {
        setSubscriptions([]);
        setFollowedVideos([]);
      }
    } catch (err) {
      console.log('Error loading followed data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userToken, user?.id]);

  useEffect(() => {
    loadFollowedData();
  }, [loadFollowedData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadFollowedData();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Siguiendo</Text>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Creadores Seguidos */}
        {subscriptions.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.storiesScroll}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            {subscriptions.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.creatorItem}
                onPress={() => onViewActor && onViewActor(c.id, c.name)}
                activeOpacity={0.8}
              >
                <View style={[styles.avatarRing, { borderColor: colors.primary }]}>
                  <Image
                    source={{
                      uri:
                        c.avatar ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop',
                    }}
                    style={styles.avatar}
                  />
                  <View style={styles.verifiedCheck}>
                    <CheckCircle2 size={12} color="#FFFFFF" fill={colors.verifiedBlue} />
                  </View>
                </View>
                <Text style={[styles.creatorName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.textSecondary, marginTop: 10, fontSize: 13 }}>
              Cargando tus suscripciones...
            </Text>
          </View>
        ) : subscriptions.length === 0 ? (
          <View style={styles.emptyFeed}>
            <Heart size={48} color={colors.primary} style={{ marginBottom: 14 }} />
            <Text style={[styles.emptyFeedTitle, { color: colors.textPrimary }]}>
              No sigues a ningún actor aún
            </Text>
            <Text style={[styles.emptyFeedSubtitle, { color: colors.textSecondary }]}>
              Sigue a tus actrices y creadores favoritos desde los videos o la pestaña Actores para ver sus nuevas publicaciones y directos aquí.
            </Text>
            {onViewActor && (
              <TouchableOpacity
                style={[styles.exploreBtn, { backgroundColor: colors.primary }]}
                onPress={() => onViewActor()}
                activeOpacity={0.8}
              >
                <Users size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.exploreBtnText}>Explorar Actores</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : followedVideos.length > 0 ? (
          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Últimas Publicaciones de tus Creadores
            </Text>
            <View style={styles.videosGrid}>
              {followedVideos.map((video) => (
                <TouchableOpacity
                  key={video.id}
                  style={[styles.videoCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}
                  onPress={() => onSelectVideo && onSelectVideo(video)}
                  activeOpacity={0.85}
                >
                  <View style={styles.thumbWrap}>
                    <Image source={{ uri: video.thumbnailUrl }} style={styles.thumb} />
                    <View style={styles.playBadge}>
                      <Play size={14} color="#FFFFFF" fill="#FFFFFF" />
                    </View>
                    <View style={styles.durBadge}>
                      <Text style={styles.durText}>{video.duration}</Text>
                    </View>
                  </View>
                  <View style={styles.videoInfo}>
                    <Text style={[styles.videoTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                      {video.title}
                    </Text>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation?.();
                        onViewActor?.(video.actorId, video.actorName);
                      }}
                    >
                      <Text style={[styles.actorMeta, { color: colors.primary }]}>
                        {video.actorName || 'Actor'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.emptyFeed}>
            <Sparkles size={44} color={colors.textMuted} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyFeedTitle, { color: colors.textPrimary }]}>
              Estás al día con tus creadores
            </Text>
            <Text style={[styles.emptyFeedSubtitle, { color: colors.textSecondary }]}>
              Tus actores seguidos no tienen nuevas publicaciones en este momento.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  storiesScroll: {
    maxHeight: 110,
    marginBottom: 10,
  },
  creatorItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 72,
  },
  avatarRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    padding: 2,
    borderWidth: 2,
    position: 'relative',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  verifiedCheck: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#000000',
    borderRadius: 8,
  },
  creatorName: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  loadingBox: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyFeed: {
    paddingVertical: 60,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyFeedTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyFeedSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  videosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  videoCard: {
    width: '48%',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 6,
  },
  thumbWrap: {
    height: 105,
    position: 'relative',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  playBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 4,
  },
  durBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  durText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  videoInfo: {
    padding: 8,
  },
  videoTitle: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  actorMeta: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: 'bold',
  },
});
