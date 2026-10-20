import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { TrendingUp, Play, Eye, ThumbsUp, ChevronRight, Flame, Award, CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { VideoItem } from '../types/auth';
import { RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../theme/colors';

interface TrendingRankingsSectionProps {
  videos: VideoItem[];
  onSelectVideo?: (video: VideoItem) => void;
}

export const TrendingRankingsSection: React.FC<TrendingRankingsSectionProps> = ({
  videos,
  onSelectVideo,
}) => {
  const { colors, isDark } = useTheme();

  if (!videos || videos.length === 0) return null;

  // Ordenar por vistas para obtener los verdaderos más vistos
  const sortedVideos = [...videos]
    .sort((a, b) => {
      const vA = typeof a.views === 'number' ? a.views : parseInt(String(a.views || '0'), 10) || 0;
      const vB = typeof b.views === 'number' ? b.views : parseInt(String(b.views || '0'), 10) || 0;
      return vB - vA;
    })
    .slice(0, 5);

  // Animaciones para las tarjetas
  const [animations, setAnimations] = React.useState(() => {
    const init = {};
    for (let i = 0; i < 5; i++) {
      init[i] = new Animated.Value(0);
    }
    return init;
  });

  React.useEffect(() => {
    // Animar cada tarjeta con delay escalonado
    for (let i = 0; i < 5; i++) {
      Animated.timing(animations[i], {
        toValue: 1,
        duration: 800,
        delay: i * 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, []);

  return (
    <View style={styles.container}>
      {/* Cabecera */}
      <View style={styles.sectionHeader}>
        <View style={styles.titleWithIcon}>
          <View style={[styles.iconBox, { backgroundColor: colors.primaryGlow }]}>
            <TrendingUp size={16} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Top 5 Más Vistos
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Los videos más reproducidos esta semana
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.seeAllBtn,
            { 
              backgroundColor: colors.primary,
              ...SHADOWS.glow(),
            }
          ]}
          onPress={() => onSelectVideo && onSelectVideo(sortedVideos[0])}
          activeOpacity={0.85}
        >
          <Text style={styles.seeAllText}>VER TODO</Text>
          <ChevronRight size={14} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Carrusel con Grandes Números Premium */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
        contentContainerStyle={{ paddingBottom: SPACING.md }}
      >
        {sortedVideos.map((item, index) => {
          const rankNumber = `0${index + 1}`;
          const satisfactionPercent = Math.min(99, Math.max(92, 95 + (index * 2) % 5));
          
          // Determinar medalla basada en posición
          let medalConfig = null;
          if (index === 0) {
            medalConfig = { color: colors.gold, textColor: '#0A0808', icon: Award, label: '#1' };
          } else if (index === 1) {
            medalConfig = { color: colors.silver, textColor: '#0A0808', icon: null, label: '#2' };
          } else if (index === 2) {
            medalConfig = { color: colors.bronze, textColor: '#FFFFFF', icon: null, label: '#3' };
          } else {
            medalConfig = { color: colors.primary, textColor: '#FFFFFF', icon: null, label: `#${index + 1}` };
          }

          return (
            <Animated.View
              key={`trending-${item.id}-${index}`}
              style={[
                styles.card,
                { 
                  transform: [
                    { scale: animations[index].interpolate({ 
                      inputRange: [0, 1], 
                      outputRange: [0.8, 1] 
                    }) },
                    { 
                      translateY: animations[index].interpolate({ 
                        inputRange: [0, 1], 
                        outputRange: [20, 0] 
                      }) 
                    },
                  ],
                  opacity: animations[index],
                },
                { backgroundColor: colors.surfaceCard, borderColor: colors.borderGlow },
              ]}
            >
              {/* Contenedor de la Imagen */}
              <View style={styles.thumbnailContainer}>
                <Image
                  source={{
                    uri:
                      item.thumbnailUrl ||
                      'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?w=800&auto=format&fit=crop',
                  }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                  onError={() => {
                    if (item.thumbnailUrl && !item.thumbnailUrl.includes('unsplash')) {
                      (item as any).thumbnailUrl = 'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?w=800&auto=format&fit=crop';
                    }
                  }}
                />

                {/* Gran Número de Ranking con estilo premium */}
                <View style={[
                  styles.rankContainer,
                  index === 0 && styles.rankContainerFirst,
                  index === 1 && styles.rankContainerSecond,
                  index === 2 && styles.rankContainerThird,
                ]}>
                  {medalConfig.icon ? (
                    <medalConfig.icon 
                      size={index === 0 ? 24 : 20} 
                      color={medalConfig.textColor} 
                      fill={medalConfig.textColor} 
                      style={{ marginRight: 6 }} 
                    />
                  ) : null}
                  <Text style={[
                    styles.rankText,
                    { color: medalConfig.textColor },
                    index === 0 && { fontSize: 24, fontWeight: '900' },
                    index === 1 && { fontSize: 20, fontWeight: '800' },
                    index === 2 && { fontSize: 18, fontWeight: '800' },
                  ]}>
                    {medalConfig.label}
                  </Text>
                </View>

                {/* Botón Central Play con efecto glow */}
                <View style={[
                  styles.playCenter,
                  { 
                    backgroundColor: 'rgba(230, 30, 58, 0.95)',
                    ...SHADOWS.glowStrong(),
                  }
                ]}>
                  <Play size={22} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 2 }} />
                </View>

                {/* Duración y Calidad */}
                <View style={[
                  statsContainer,
                  { 
                    backgroundColor: 'rgba(230, 30, 58, 0.8)',
                    borderRadius: RADIUS.md,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                  }
                ]}>
                  <Eye size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.statsText}>
                    {typeof item.views === 'number' 
                      ? `${(item.views / 1000).toFixed(0)}k vistas` 
                      : `${item.views || '0'} vistas`}
                  </Text>
                  <Text style={styles.statsText}> • </Text>
                  <Text style={styles.statsText}>
                    {item.duration || '18:30'} • 4K UHD
                  </Text>
                </View>
              </View>

              {/* Información */}
              <View style={styles.detailsContainer}>
                <Text style={[
                  styles.videoTitle,
                  { color: colors.textPrimary },
                  index === 0 && { fontSize: 18, fontWeight: '800' },
                  index === 1 && { fontSize: 16, fontWeight: '700' },
                  index === 2 && { fontSize: 15, fontWeight: '700' },
                ]} numberOfLines={2}>
                  {item.title}
                </Text>

                <View style={styles.metaRow}>
                  {/* Satisfacción/Rating */}
                  <View style={[
                    styles.ratingBadge,
                    { 
                      backgroundColor: 'rgba(230, 30, 58, 0.8)',
                      borderRadius: RADIUS.full,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                    }
                  ]}>
                    <Heart size={14} color="#FFFFFF" fill="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.ratingText}>{satisfactionPercent}%</Text>
                  </View>

                  {/* Categoría */}
                  <View style={[
                    styles.categoryBadge,
                    { 
                      backgroundColor: colors.primary,
                      borderRadius: RADIUS.full,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                    }
                  ]}>
                    <Text style={styles.categoryText}>{item.category || 'Destacado'}</Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          );
        })}
      </ScrollView>
      
      {/* Indicador de progreso para web */}
      {!isDark && (
        <View style={styles.progressIndicator}>
          <View style={[
            styles.progressBar,
            { 
              backgroundColor: colors.primary,
              width: '60%' 
            }
          ]} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    ...TYPOGRAPHY.headlineMedium,
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textSecondary,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCardLight,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  seeAllText: {
    ...TYPOGRAPHY.labelMedium,
    color: colors.primary,
  },
  scrollList: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  card: {
    width: 220,
    height: 320,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: colors.surfaceCard,
    ...SHADOWS.card,
    marginBottom: 0,
  },
  thumbnailContainer: {
    position: 'relative',
    width: '100%',
    height: '60%', // 192px de 320px
    backgroundColor: colors.backgroundDeep,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  rankContainer: {
    position: 'absolute',
    top: SPACING.xs,
    left: SPACING.xs,
    backgroundColor: 'rgba(10,8,8,0.7)',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankContainerFirst: {
    backgroundColor: colors.gold,
    ...SHADOWS.glow(),
  },
  rankContainerSecond: {
    backgroundColor: colors.silver,
  },
  rankContainerThird: {
    backgroundColor: colors.bronze,
  },
  rankText: {
    ...TYPOGRAPHY.titleMedium,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  playCenter: {
    position: 'absolute',
    top: '45%',
    left: '50%',
    transform: [{ translateX: -28 }, { translateY: -28 }],
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    position: 'absolute',
    bottom: SPACING.xs,
    left: SPACING.xs,
    right: SPACING.xs,
  },
  statsText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  detailsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%', // 128px de 320px
    padding: SPACING.md,
    backgroundColor: 'linear-gradient(to top, rgba(10,8,8,0.9), transparent)',
  },
  videoTitle: {
    ...TYPOGRAPHY.titleMedium,
    color: colors.textPrimary,
    marginBottom: SPACING.xs,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
    flexWrap: 'wrap',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  progressIndicator: {
    marginTop: SPACING.xs,
    alignSelf: 'stretch',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
  },
});
