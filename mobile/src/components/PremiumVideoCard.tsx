import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { Play, Eye, Heart, Bookmark, MoreHorizontal, Flame, Award, CheckCircle2, Zap, Sparkles } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { VideoItem } from '../types/auth';
import { RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../theme/colors';

interface PremiumVideoCardProps {
  video: VideoItem;
  onPress: () => void;
  onToggleLike: () => void;
  onToggleSave: () => void;
  onMoreOptions: () => void;
  onViewActor: (actorId?: string, actorName?: string) => void;
  isLiked: boolean;
  isSaved: boolean;
  likesCount: number;
  index?: number;
  variant?: 'standard' | 'hero' | 'compact';
  showSatisfaction?: boolean;
}

export const PremiumVideoCard: React.FC<PremiumVideoCardProps> = ({
  video,
  onPress,
  onToggleLike,
  onToggleSave,
  onMoreOptions,
  onViewActor,
  isLiked,
  isSaved,
  likesCount,
  index = 0,
  variant = 'standard',
  showSatisfaction = true,
}) => {
  const { colors } = useTheme();
  const actorName = video.actorName || video.creatorName || 'Canal Oficial';
  const satisfactionPercent = Math.min(99, Math.max(88, 90 + ((index * 7) % 10)));

  // Animaciones
  const pressAnim = React.useRef(new Animated.Value(0)).current;
  const hoverAnim = React.useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.timing(pressAnim, {
      toValue: 1,
      duration: 100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(pressAnim, {
      toValue: 0,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const animatedStyle = {
    transform: [
      { scale: pressAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] }) },
    ],
    ...SHADOWS.cardHover,
  };

  // Calcular duración formateada
  const formatDuration = (duration: string | undefined) => {
    if (!duration) return '0:00';
    if (duration.includes(':')) return duration;
    const mins = Math.floor(Number(duration) / 60);
    const secs = Number(duration) % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Badges basados en propiedades del video
  const badges = [];
  if (video.isNew) badges.push({ label: 'NUEVO', color: colors.accent, icon: Sparkles });
  if (video.isVerified) badges.push({ label: 'VERIFICADO', color: colors.verifiedBlue, icon: CheckCircle2 });
  if (video.isPremium) badges.push({ label: 'PREMIUM', color: colors.gold, icon: Award });
  if (video.isShort) badges.push({ label: 'SHORTS', color: colors.primary, icon: Zap });
  if (video.category === 'VR') badges.push({ label: 'VR', color: colors.accent, icon: Flame });

  if (variant === 'compact') {
    return (
      <TouchableOpacity
        style={[styles.compactCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}
        onPress={onPress}
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={`Reproducir: ${video.title}`}
      >
        <View style={styles.compactThumbnailWrapper}>
          <Image
            source={{
              uri: video.thumbnailUrl || 'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?w=400&auto=format&fit=crop',
            }}
            style={styles.compactThumbnail}
            resizeMode="cover"
          />
          <View style={styles.compactDurationBadge}>
            <Text style={styles.compactDurationText}>{formatDuration(video.duration)}</Text>
          </View>
          <View style={styles.compactPlayOverlay}>
            <Play size={20} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 2 }} />
          </View>
        </View>
        <View style={styles.compactInfo}>
          <Text style={[styles.compactTitle, { color: colors.textPrimary }]} numberOfLines={2}>
            {video.title}
          </Text>
          <View style={styles.compactMeta}>
            <Text style={[styles.compactCreator, { color: colors.textSecondary }]}>{actorName}</Text>
            <View style={styles.compactStats}>
              <Eye size={10} color={colors.textMuted} style={{ marginRight: 3 }} />
              <Text style={[styles.compactStatText, { color: colors.textMuted }]}>
                {typeof video.views === 'number' ? `${(video.views / 1000).toFixed(1)}k` : video.views || '0'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (variant === 'hero') {
    return (
      <TouchableOpacity
        style={[styles.heroCard, { backgroundColor: colors.surfaceCard, borderColor: colors.borderGlow }, animatedStyle]}
        onPress={onPress}
        activeOpacity={0.92}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={`Reproducir ahora: ${video.title}`}
      >
        <View style={styles.heroImageContainer}>
          <Image
            source={{
              uri: video.thumbnailUrl || 'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?w=1200&auto=format&fit=crop',
            }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          
          {/* Gradientes de overlay */}
          <View style={styles.heroTopGradient} />
          <View style={styles.heroBottomGradient} />
          
          {/* Badges superiores */}
          <View style={styles.heroTopBadges}>
            <View style={styles.heroBadgesLeft}>
              {badges.slice(0, 3).map((badge, i) => (
                <View key={i} style={[styles.heroBadge, { backgroundColor: badge.color }]}>
                  <badge.icon size={10} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.heroBadgeText}>{badge.label}</Text>
                </View>
              ))}
            </View>
            <View style={styles.heroBadgesRight}>
              <View style={[styles.heroQualityBadge, { backgroundColor: 'rgba(10,8,8,0.8)' }]}>
                <Text style={styles.heroQualityText}>4K UHD</Text>
              </View>
            </View>
          </View>

          {/* Play button central */}
          <View style={styles.heroCenterPlay}>
            <Play size={36} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 4 }} />
          </View>

          {/* Info inferior */}
          <View style={styles.heroBottomInfo}>
            <View style={styles.heroMetrics}>
              {showSatisfaction && (
                <View style={[styles.heroMetricPill, { backgroundColor: 'rgba(10,8,8,0.75)' }]}>
                  <Heart size={14} color="#FFFFFF" fill="#FFFFFF" style={{ marginRight: 5 }} />
                  <Text style={styles.heroMetricText}>{satisfactionPercent}%</Text>
                </View>
              )}
              <View style={[styles.heroMetricPill, { backgroundColor: 'rgba(10,8,8,0.75)' }]}>
                <Eye size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
                <Text style={styles.heroMetricText}>
                  {typeof video.views === 'number' ? `${(video.views / 1000).toFixed(1)}k vistas` : `${video.views || '0'} vistas`}
                </Text>
              </View>
              <View style={[styles.heroMetricPill, { backgroundColor: 'rgba(10,8,8,0.75)' }]}>
                <Text style={styles.heroMetricText}>{formatDuration(video.duration)}</Text>
              </View>
            </View>

            <Text style={styles.heroTitle} numberOfLines={2}>{video.title}</Text>

            <TouchableOpacity
              style={styles.heroActorRow}
              onPress={() => onViewActor(video.actorId, video.actorName)}
              activeOpacity={0.8}
            >
              <Image
                source={{
                  uri: video.actorAvatar || video.creatorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop',
                }}
                style={styles.heroActorAvatar}
              />
              <Text style={styles.heroActorName}>{actorName}</Text>
              {video.isVerified && (
                <CheckCircle2 size={16} color={colors.verifiedBlue} fill={colors.verifiedBlue} />
              )}
              <Text style={styles.heroCategory}>• {video.category || 'Premium'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Acciones inferiores */}
        <View style={[styles.heroActions, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.heroActionBtn, { backgroundColor: colors.primary }]}
            onPress={onPress}
            activeOpacity={0.85}
          >
            <Play size={20} color="#FFFFFF" fill="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.heroActionBtnText}>Reproducir ahora</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.heroActionBtn,
              { 
                backgroundColor: isSaved ? colors.primaryGlow : colors.surfaceCardLight, 
                borderColor: isSaved ? colors.primary : colors.border,
                borderWidth: isSaved ? 0 : 1,
              }
            ]}
            onPress={onToggleSave}
            activeOpacity={0.75}
          >
            <Bookmark
              size={20}
              color={isSaved ? colors.primary : colors.textPrimary}
              fill={isSaved ? colors.primary : 'transparent'}
            />
            <Text
              style={[
                styles.heroActionBtnText,
                { color: isSaved ? colors.primary : colors.textPrimary },
              ]}
            >
              {isSaved ? 'En mi lista' : 'Guardar'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.heroActionBtnGhost}
            onPress={onMoreOptions}
            activeOpacity={0.75}
          >
            <MoreHorizontal size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  // Variant estándar (default)
  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: colors.surfaceCard, borderColor: colors.border },
        animatedStyle,
      ]}
      onPress={onPress}
      activeOpacity={0.9}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={`Abrir video: ${video.title}`}
    >
      {/* Thumbnail */}
      <View style={styles.thumbnailWrapper}>
        <Image
          source={{
            uri: video.thumbnailUrl || 'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?w=800&auto=format&fit=crop',
          }}
          style={styles.thumbnail}
          resizeMode="cover"
          onError={() => {
            if (video.thumbnailUrl && !video.thumbnailUrl.includes('unsplash')) {
              (video as any).thumbnailUrl = 'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?w=800&auto=format&fit=crop';
            }
          }}
        />

        {/* Badges superiores */}
        <View style={styles.thumbnailTopBadges}>
          <View style={styles.badgeRowLeft}>
            <View style={[styles.agePill, { backgroundColor: colors.primary }]}>
              <Text style={styles.agePillText}>18+</Text>
            </View>
            {video.isVerified && (
              <View style={[styles.verifiedPill, { backgroundColor: colors.verifiedBlue }]}>
                <CheckCircle2 size={10} color="#FFFFFF" fill="#FFFFFF" style={{ marginRight: 3 }} />
                <Text style={styles.verifiedPillText}>VERIFICADO</Text>
              </View>
            )}
            {badges.slice(0, 2).map((badge, i) => (
              <View key={i} style={[styles.featureBadge, { backgroundColor: badge.color }]}>
                <badge.icon size={10} color="#FFFFFF" style={{ marginRight: 3 }} />
                <Text style={styles.featureBadgeText}>{badge.label}</Text>
              </View>
            ))}
          </View>
          <View style={[styles.qualityPill, { backgroundColor: 'rgba(10,8,8,0.85)' }]}>
            <Text style={styles.qualityPillText}>4K</Text>
          </View>
        </View>

        {/* Play button central */}
        <View style={styles.centerPlayButton}>
          <Play size={26} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 3 }} />
        </View>

        {/* Duración y Satisfacción */}
        <View style={styles.bottomThumbRow}>
          {showSatisfaction && (
            <View style={[styles.ratingBadgePill, { backgroundColor: 'rgba(10,8,8,0.8)' }]}>
              <Heart size={12} color="#FFFFFF" fill="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.ratingBadgeText}>{satisfactionPercent}%</Text>
            </View>
          )}
          <View style={[styles.durationBadge, { backgroundColor: 'rgba(10,8,8,0.9)' }]}>
            <Text style={styles.durationText}>{formatDuration(video.duration)}</Text>
          </View>
        </View>
      </View>

      {/* Metadatos del Video */}
      <View style={styles.videoInfoRow}>
        <TouchableOpacity
          style={styles.creatorAvatarWrapper}
          onPress={() => onViewActor(video.actorId, video.actorName)}
          activeOpacity={0.8}
        >
          <View style={[styles.creatorAvatarRing, { borderColor: colors.primary }]}>
            <Image
              source={{
                uri: video.actorAvatar || video.creatorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop',
              }}
              style={styles.creatorAvatar}
            />
          </View>
          {video.isVerified && (
            <View style={[styles.creatorAvatarCheck, { backgroundColor: colors.verifiedBlue }]}>
              <CheckCircle2 size={10} color="#FFFFFF" fill="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={[styles.videoTitle, { color: colors.textPrimary }]} numberOfLines={2}>
            {video.title}
          </Text>
          <View style={styles.creatorNameRow}>
            <TouchableOpacity
              onPress={() => onViewActor(video.actorId, video.actorName)}
              activeOpacity={0.8}
            >
              <Text style={[styles.creatorName, { color: colors.textSecondary }]}>
                {actorName}
              </Text>
            </TouchableOpacity>
            {video.isVerified && (
              <CheckCircle2 size={14} color={colors.verifiedBlue} fill={colors.verifiedBlue} />
            )}
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700', marginLeft: 4 }}>
              • {video.category || 'Para ti'}
            </Text>
          </View>

          {/* Vistas y Calidad */}
          <View style={styles.videoMetaStatsRow}>
            <Eye size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
            <Text style={[styles.viewsCountText, { color: colors.textMuted }]}>
              {typeof video.views === 'number' ? `${(video.views / 1000).toFixed(1)}k vistas` : `${video.views || '0'} vistas`}
            </Text>
            <Text style={[styles.viewsCountText, { color: colors.textMuted }]}> • HD 1080p</Text>
          </View>

          {/* Tags/Hashtags */}
          {video.tags && video.tags.length > 0 && (
            <View style={styles.videoTagsRow}>
              {video.tags.slice(0, 3).map((tag, idx) => (
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

        {/* Acciones Rápidas */}
        <View style={styles.actionsColumn}>
          <TouchableOpacity
            style={styles.likeButton}
            onPress={onToggleLike}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={isLiked ? 'Quitar me gusta' : 'Me gusta'}
          >
            <Heart
              size={20}
              color={isLiked ? colors.primary : colors.textSecondary}
              fill={isLiked ? colors.primary : 'transparent'}
            />
            <Text
              style={[
                styles.likeCountText,
                { color: colors.textSecondary },
                isLiked && { color: colors.primary, fontWeight: '700' },
              ]}
            >
              {likesCount > 999 ? `${(likesCount / 1000).toFixed(1)}k` : likesCount}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={onToggleSave}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={isSaved ? 'Quitar de guardados' : 'Guardar para después'}
          >
            <Bookmark
              size={20}
              color={isSaved ? colors.primary : colors.textSecondary}
              fill={isSaved ? colors.primary : 'transparent'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moreButton}
            onPress={onMoreOptions}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Más opciones"
          >
            <MoreHorizontal size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Card estándar
  card: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    ...SHADOWS.card,
  },
  thumbnailWrapper: {
    width: '100%',
    height: 220,
    position: 'relative',
    backgroundColor: colors.backgroundDeep,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailTopBadges: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badgeRowLeft: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  agePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  agePillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  verifiedPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  featureBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  qualityPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  qualityPillText: {
    color: '#FAF6F1',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  centerPlayButton: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    transform: [{ translateX: -30 }, { translateY: -30 }],
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(230, 30, 58, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.glow(),
  },
  bottomThumbRow: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  ratingBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  durationBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  videoInfoRow: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: 12,
  },
  creatorAvatarWrapper: {
    position: 'relative',
  },
  creatorAvatarRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    overflow: 'hidden',
  },
  creatorAvatar: {
    width: '100%',
    height: '100%',
  },
  creatorAvatarCheck: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0A0808',
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  videoTitle: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: 5,
    maxWidth: 640,
    fontFamily: Platform.OS === 'web' ? 'Inter, Open Sans, sans-serif' : undefined,
  },
  creatorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  creatorName: {
    fontSize: 15,
    fontWeight: '500',
    maxWidth: 180,
  },
  videoMetaStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  viewsCountText: {
    fontSize: 14,
    fontWeight: '400',
  },
  videoTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 2,
  },
  miniTagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  miniTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionsColumn: {
    alignItems: 'center',
    gap: 8,
    paddingRight: 4,
  },
  likeButton: {
    alignItems: 'center',
    minHeight: 48,
    minWidth: 48,
    padding: 8,
  },
  likeCountText: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  saveButton: {
    minHeight: 48,
    minWidth: 48,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreButton: {
    minHeight: 48,
    minWidth: 48,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Card Compacta
  compactCard: {
    width: 160,
    marginRight: 10,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    ...SHADOWS.card,
  },
  compactThumbnailWrapper: {
    width: '100%',
    height: 90,
    position: 'relative',
    backgroundColor: colors.backgroundDeep,
  },
  compactThumbnail: {
    width: '100%',
    height: '100%',
  },
  compactDurationBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'rgba(10,8,8,0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  compactDurationText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  compactPlayOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -16 }, { translateY: -16 }],
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(230, 30, 58, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactInfo: {
    padding: 8,
  },
  compactTitle: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    marginBottom: 4,
  },
  compactMeta: {
    gap: 4,
  },
  compactCreator: {
    fontSize: 10,
    fontWeight: '500',
  },
  compactStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactStatText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Card Hero
  heroCard: {
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.md,
    borderRadius: RADIUS.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    ...SHADOWS.cardHover,
  },
  heroImageContainer: {
    position: 'relative',
    width: '100%',
    height: 320,
    backgroundColor: colors.backgroundDeep,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroTopGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'rgba(10,8,8,0.6)',
  },
  heroBottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: 'rgba(10,8,8,0.85)',
  },
  heroTopBadges: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroBadgesLeft: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
  },
  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  heroBadgesRight: {
    flexDirection: 'row',
    gap: 8,
  },
  heroQualityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
  },
  heroQualityText: {
    color: '#FAF6F1',
    fontSize: 13,
    fontWeight: '700',
  },
  heroCenterPlay: {
    position: 'absolute',
    top: '45%',
    left: '50%',
    transform: [{ translateX: -40 }, { translateY: -40 }],
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(230, 30, 58, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.glowStrong(),
  },
  heroBottomInfo: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  heroMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  heroMetricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  heroMetricText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 34,
    marginBottom: 10,
    maxWidth: 700,
    fontFamily: Platform.OS === 'web' ? 'Inter, Open Sans, sans-serif' : undefined,
  },
  heroActorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
  },
  heroActorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  heroActorName: {
    color: '#FAF6F1',
    fontSize: 17,
    fontWeight: '600',
  },
  heroCategory: {
    color: '#D6D3D1',
    fontSize: 16,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    flexWrap: 'wrap',
  },
  heroActionBtn: {
    flexGrow: 1,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: RADIUS.lg,
  },
  heroActionBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? 'Inter, Open Sans, sans-serif' : undefined,
  },
  heroActionBtnGhost: {
    minHeight: 56,
    minWidth: 56,
    padding: 12,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceCardLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
});