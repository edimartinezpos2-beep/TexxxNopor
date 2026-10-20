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
import { Play, CheckCircle2, Bookmark, Award, Eye, ThumbsUp, Sparkles, Flame, MoreHorizontal } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { VideoItem } from '../types/auth';
import { RADIUS, SHADOWS, SPACING } from '../theme/colors';

interface SpotlightHeroCardProps {
  video: VideoItem;
  onPress: () => void;
  onViewActor?: (actorId?: string, actorName?: string) => void;
  onToggleSave?: () => void;
  isSaved?: boolean;
  isLiked?: boolean;
  satisfactionPercent?: number;
}

export const SpotlightHeroCard: React.FC<SpotlightHeroCardProps> = ({
  video,
  onPress,
  onViewActor,
  onToggleSave,
  isSaved = false,
  isLiked = false,
  satisfactionPercent = 95,
}) => {
  const { colors, isDark } = useTheme();
  const actorName = video.actorName || video.creatorName || 'Estudio Oficial';
  const formattedViews = typeof video.views === 'number' 
    ? `${(video.views / 1000).toFixed(1)}k vistas` 
    : `${video.views || '0'} vistas`;
  const formattedDuration = video.duration || '24:18';

  // Animaciones
  const pulseAnim = React.useRef(new Animated.Value(0)).current;
  const glowAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Animación de glow pulsante
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Animación de entrada
    pulseAnim.setValue(0);
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const animatedStyle = {
    transform: [
      { scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
    ],
  };

  const glowStyle = {
    opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
  };

  return (
    <Animated.View style={[styles.container, animatedStyle]} accessibilityRole="header">
      {/* Contenido de bienvenida */}
      <View style={styles.welcomeCopy}>
        <Text style={[styles.welcomeTitle, { color: colors.textPrimary }]}>TexxxNopor</Text>
        <Text style={[styles.welcomePhrase, { color: colors.textSecondary }]}>
          Streaming Premium para Adultos
        </Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.92}
        onPress={onPress}
        style={[
          styles.imageContainer,
          { backgroundColor: colors.backgroundDeep },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Reproducir ahora: ${video.title}`}
      >
        <Image
          source={{
            uri:
              video.thumbnailUrl ||
              'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?w=1200&auto=format&fit=crop',
          }}
          style={styles.heroImage}
          resizeMode="cover"
          accessibilityLabel={`Imagen destacada de ${video.title}`}
          accessible
          onError={() => {
            if (video.thumbnailUrl && !video.thumbnailUrl.includes('unsplash')) {
              (video as any).thumbnailUrl = 'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?w=1200&auto=format&fit=crop';
            }
          }}
        />

        {/* Gradientes de overlay */}
        <View style={styles.topGradient} />
        <View style={styles.bottomGradient} />

        {/* Glow alrededor del contenedor */}
        <Animated.View style={[styles.glowContainer, glowStyle]} />

        {/* Badges superiores */}
        <View style={styles.topBadgesRow}>
          <View style={styles.spotlightTag}>
            <Award size={20} color="#FFFFFF" fill={colors.gold} style={{ marginRight: 6 }} />
            <Text style={styles.spotlightTagText}>ESTRENO VIP</Text>
          </View>

          <View style={styles.qualityTag}>
            <Flame size={14} color="#FF6B00" style={{ marginRight: 4 }} />
            <Text style={styles.qualityTagText}>4K UHD HDR</Text>
          </View>

          <View style={styles.verificationTag}>
            <CheckCircle2 size={16} color={colors.verifiedBlue} fill={colors.verifiedBlue} />
            <Text style={styles.verificationTagText}>VERIFICADO</Text>
          </View>
        </View>

        {/* Play button central con animación */}
        <View style={[
          styles.centerPlayCircle,
          { 
            backgroundColor: `rgba(230, 30, 58, 0.95)`,
            ...SHADOWS.glowStrong(),
          }
        ]}>
          <Play size={36} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 4 }} />
          <Animated.View style={[
            styles.playPulse,
            { 
              opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.8] }),
              backgroundColor: `rgba(230, 30, 58, 0.6)`,
            }
          ]} />
        </View>

        {/* Información inferior */}
        <View style={styles.bottomInfoOverlay}>
          <View style={styles.metricsRow}>
            {/* Satisfacción */}
            <View style={[
              styles.satisfactionBadge,
              { backgroundColor: 'rgba(230, 30, 58, 0.8)' }
            ]}>
              <Heart size={14} color="#FFFFFF" fill="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.satisfactionText}>{satisfactionPercent}%</Text>
            </View>

            {/* Vistas */}
            <View style={[
              viewsBadge,
              { backgroundColor: 'rgba(230, 30, 58, 0.8)' }
            ]}>
              <Eye size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.viewsText}>{formattedViews}</Text>
            </View>

            {/* Duración */}
            <View style={[
              durationBadge,
              { backgroundColor: 'rgba(230, 30, 58, 0.8)' }
            ]}>
              <Text style={styles.durationText}>{formattedDuration}</Text>
            </View>
          </View>

          <Text style={styles.heroTitle} numberOfLines={2}>
            {video.title}
          </Text>

          <TouchableOpacity
            style={[
              styles.actorRow,
              { 
                backgroundColor: 'rgba(10, 8, 8, 0.6)',
                borderWidth: 1,
                borderColor: colors.borderLight,
              }
            ]}
            activeOpacity={0.8}
            onPress={() => onViewActor && onViewActor(video.actorId, video.actorName)}
            accessibilityRole="button"
            accessibilityLabel={`Ver perfil de ${actorName}`}
          >
            <View style={styles.actorAvatarRing}>
              <Image
                source={{
                  uri:
                    video.actorAvatar ||
                    video.creatorAvatar ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop',
                }}
                style={styles.actorAvatar}
                accessibilityLabel={`Foto de ${actorName}`}
                accessible
              />
              {video.isVerified && (
                <View style={[
                  styles.verifiedBadge,
                  { backgroundColor: colors.verifiedBlue }
                ]}>
                  <CheckCircle2 size={10} color="#FFFFFF" fill="#FFFFFF" />
                </View>
              )}
            </View>
            <Text style={styles.actorName}>{actorName}</Text>
            <View style={styles.actorVerification}>
              {video.isVerified && (
                <CheckCircle2 size={12} color={colors.verifiedBlue} fill={colors.verifiedBlue} />
              )}
            </View>
            <Text style={styles.categoryLabel}>• {video.category || 'Exclusivo Premium'}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Acciones inferiores */}
      <View style={[styles.bottomActions, { borderTopColor: colors.borderLight }]}>
        <TouchableOpacity
          style={[
            styles.primaryPlayBtn,
            { 
              backgroundColor: colors.primary,
              ...SHADOWS.glow(),
            }
          ]}
          onPress={onPress}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Reproducir ahora"
        >
          <Play size={24} color="#FFFFFF" fill="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.primaryPlayBtnText}>REPRODUCIR AHORA</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.saveBtn,
            { 
              borderWidth: 1,
              borderColor: isSaved ? colors.primary : colors.border,
              backgroundColor: isSaved 
                ? colors.primaryGlow 
                : colors.surfaceCardLight,
            }
          ]}
          onPress={onToggleSave}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={isSaved ? 'Quitar de mi lista' : 'Guardar en mi lista'}
        >
          <Bookmark
            size={24}
            color={isSaved ? colors.primary : colors.textPrimary}
            fill={isSaved ? colors.primary : 'transparent'}
          />
          <Text
            style={[
              styles.saveBtnText,
              { color: isSaved ? colors.primary : colors.textPrimary },
            ]}
          >
            {isSaved ? 'EN MI LISTA' : 'GUARDAR'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.likeBtn,
            { 
              borderWidth: 1,
              borderColor: isLiked ? colors.primary : colors.border,
              backgroundColor: isLiked 
                ? colors.primaryGlow 
                : colors.surfaceCardLight,
            }
          ]}
          onPress={() => {
            // Implement like functionality
            // For now just visual feedback
          }}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={isLiked ? 'Quitar me gusta' : 'Me gusta'}
        >
          <Heart
            size={24}
            color={isLiked ? colors.primary : colors.textPrimary}
            fill={isLiked ? colors.primary : 'transparent'}
          />
          <Text
            style={[
              styles.likeBtnText,
              { color: isLiked ? colors.primary : colors.textPrimary },
            ]}
          >
            {isLiked ? 'TE GUSTA' : 'ME GUSTA'}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.md,
    borderRadius: RADIUS.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...SHADOWS.cardHover,
  },
  welcomeCopy: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'web' ? 'Inter, Open Sans, sans-serif' : undefined,
  },
  welcomePhrase: {
    fontSize: 18,
    lineHeight: 26,
    marginTop: SPACING.xs,
    maxWidth: 560,
    fontWeight: '400',
    fontFamily: Platform.OS === 'web' ? 'Inter, Open Sans, sans-serif' : undefined,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 340,
    backgroundColor: colors.backgroundDeep,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'rgba(10,8,8,0.7)',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: 'rgba(10,8,8,0.85)',
  },
  glowContainer: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: RADIUS.xxl + 8,
  },
  topBadgesRow: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    right: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  spotlightTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  spotlightTagText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  qualityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 0, 0.2)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  qualityTagText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  verificationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(41, 121, 255, 0.2)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  verificationTagText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  centerPlayCircle: {
    position: 'absolute',
    top: '45%',
    left: '50%',
    transform: [{ translateX: -40 }, { translateY: -40 }],
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPulse: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 40,
  },
  bottomInfoOverlay: {
    position: 'absolute',
    bottom: SPACING.md,
    left: SPACING.md,
    right: SPACING.md,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    flexWrap: 'wrap',
  },
  satisfactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  satisfactionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  viewsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  viewsText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 36,
    marginBottom: SPACING.sm,
    maxWidth: 700,
    letterSpacing: -0.3,
    fontFamily: Platform.OS === 'web' ? 'Inter, Open Sans, sans-serif' : undefined,
  },
  actorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: 48,
    paddingVertical: SPACING.xs,
  },
  actorAvatarRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    overflow: 'hidden',
  },
  actorAvatar: {
    width: '100%',
    height: '100%',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actorName: {
    color: '#FAF6F1',
    fontSize: 18,
    fontWeight: '600',
    maxWidth: 180,
  },
  actorVerification: {
    marginLeft: SPACING.xs,
  },
  categoryLabel: {
    color: '#E8E4E0',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
    borderTopWidth: 1,
    flexWrap: 'wrap',
  },
  primaryPlayBtn: {
    flexGrow: 1,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
  },
  primaryPlayBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'web' ? 'Inter, Open Sans, sans-serif' : undefined,
  },
  saveBtn: {
    minHeight: 56,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  saveBtnText: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? 'Inter, Open Sans, sans-serif' : undefined,
  },
  likeBtn: {
    minHeight: 56,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  likeBtnText: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? 'Inter, Open Sans, sans-serif' : undefined,
  },
});
