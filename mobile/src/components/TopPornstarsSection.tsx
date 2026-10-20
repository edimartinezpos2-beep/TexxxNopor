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
import { Crown, CheckCircle2, ChevronRight, UserPlus, Check, Star, Heart, Flame } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { ActorItem } from '../types/auth';
import { RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../theme/colors';

interface TopPornstarsSectionProps {
  actors: ActorItem[];
  onViewActor?: (actorId?: string, actorName?: string) => void;
  onToggleFollow?: (actor: ActorItem) => void;
}

export const TopPornstarsSection: React.FC<TopPornstarsSectionProps> = ({
  actors,
  onViewActor,
  onToggleFollow,
}) => {
  const { colors, isDark } = useTheme();

  // Actores destacados para ranking o fallback si la BD está vacía
  const defaultActors: Partial<ActorItem>[] = [
    {
      id: 'top-1',
      name: 'Mia Sweet',
      stageName: 'Mia Sweet',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop',
      videosCount: 48,
      followersCount: 142000,
      isVerified: true,
      isFollowing: false,
    },
    {
      id: 'top-2',
      name: 'Sofia Moon',
      stageName: 'Sofia Moon',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop',
      videosCount: 36,
      followersCount: 98400,
      isVerized: true,
      isFollowing: true,
    },
    {
      id: 'top-3',
      name: 'Luna Fox',
      stageName: 'Luna Fox',
      avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop',
      videosCount: 29,
      followersCount: 76500,
      isVerified: true,
      isFollowing: false,
    },
    {
      id: 'top-4',
      name: 'Elena Rose',
      stageName: 'Elena Rose',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop',
      videosCount: 22,
      followersCount: 54100,
      isVerified: true,
      isFollowing: false,
    },
  ];

  const displayList = actors && actors.length > 0 ? actors.slice(0, 10) : defaultActors;

  // Animaciones para las tarjetas
  const [animations, setAnimations] = React.useState(() => {
    const init = {};
    for (let i = 0; i < Math.min(10, displayList.length); i++) {
      init[i] = new Animated.Value(0);
    }
    return init;
  });

  React.useEffect(() => {
    // Animar cada tarjeta con delay escalonado
    for (let i = 0; i < Math.min(10, displayList.length); i++) {
      Animated.timing(animations[i], {
        toValue: 1,
        duration: 800,
        delay: i * 80,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [displayList.length]);

  const getRankConfig = (index: number) => {
    if (index === 0) {
      return { 
        color: colors.gold, 
        textColor: '#0A0808', 
        icon: Crown, 
        label: '#1',
        backgroundColor: colors.gold,
        textShadow: '0 0 10px rgba(255,215,0,0.5)'
      };
    }
    if (index === 1) {
      return { 
        color: colors.silver, 
        textColor: '#0A0808', 
        icon: null, 
        label: '#2',
        backgroundColor: colors.silver,
        textShadow: '0 0 5px rgba(192,192,192,0.5)'
      };
    }
    if (index === 2) {
      return { 
        color: colors.bronze, 
        textColor: '#FFFFFF', 
        icon: null, 
        label: '#3',
        backgroundColor: colors.bronze,
        textShadow: '0 0 5px rgba(205,127,50,0.5)'
      };
    }
    return { 
      color: colors.primary, 
      textColor: '#FFFFFF', 
      icon: null, 
      label: `#${index + 1}`,
      backgroundColor: colors.primary,
      textShadow: '0 0 5px rgba(230,30,58,0.3)'
    };
  };

  return (
    <View style={styles.container}>
      {/* Encabezado de la sección */}
      <View style={styles.sectionHeader}>
        <View style={styles.titleWithIcon}>
          <View style={[styles.crownIconBox, { backgroundColor: colors.primaryGlow }]}>
            <Crown size={16} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Top Modelos Verificados
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Creadores más populares y activos
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
          onPress={() => onViewActor && onViewActor()}
          activeOpacity={0.85}
        >
          <Text style={styles.seeAllText}>VER RANKING COMPLETO</Text>
          <ChevronRight size={14} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Título de sección alternativa */}
      <View style={styles.sectionTitleContainer}>
        <Text style={styles.sectionTitle}>Las Más Seguidas y Deseadas</Text>
        <Text style={styles.sectionSubtitle}>Elite de creadores verificados</Text>
      </View>

      {/* Carrusel de Modelos Premium */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
        contentContainerStyle={{ paddingBottom: SPACING.md }}
      >
        {displayList.map((item, index) => {
          const rankConfig = getRankConfig(index);
          const RankIcon = rankConfig.icon;

          return (
            <Animated.View
              key={item.id || index}
              style={[
                styles.actorCardContainer,
                { 
                  transform: [
                    { scale: animations[index].interpolate({ 
                      inputRange: [0, 1], 
                      outputRange: [0.85, 1] 
                    }) },
                    { 
                      translateY: animations[index].interpolate({ 
                        inputRange: [0, 1], 
                        outputRange: [15, 0] 
                      }) 
                    },
                  ],
                  opacity: animations[index],
                },
              ]}
            >
              <View
                style={[
                  styles.actorCard,
                  { 
                    backgroundColor: colors.surfaceCard,
                    borderColor: colors.border,
                  }
                ]}
              >
                {/* Badge de Ranking con efecto premium */}
                <View style={[
                  styles.rankBadge,
                  { 
                    backgroundColor: rankConfig.backgroundColor,
                    ...(rankConfig.textShadow && { 
                      textShadow: rankConfig.textShadow 
                    }),
                  }
                ]}>
                  {RankIcon ? (
                    <RankIcon 
                      size={index === 0 ? 20 : 16} 
                      color={rankConfig.textColor} 
                      fill={rankConfig.textColor} 
                      style={{ marginRight: 6 }} 
                    />
                  ) : null}
                  <Text style={[
                    styles.rankBadgeText,
                    { 
                      color: rankConfig.textColor,
                      fontWeight: index === 0 ? '900' : '800',
                    }
                  ]}>
                    {rankConfig.label}
                  </Text>
                </View>

                {/* Avatar con efecto premium y verificación */}
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => onViewActor && onViewActor(item.id, item.stageName || item.name)}
                >
                  <View style={[
                    styles.avatarWrapper,
                    index === 0 && { 
                      borderWidth: 3, 
                      borderColor: colors.gold,
                      ...SHADOWS.glow(),
                    }
                  ]}>
                    <Image
                      source={{
                        uri:
                          item.avatarUrl ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop',
                      }}
                      style={styles.avatarImage}
                    />
                    {item.isVerified && (
                      <View style={styles.verifiedBanner}>
                        <CheckCircle2 size={16} color={colors.verifiedBlue} fill={colors.verifiedBlue} />
                        <Text style={styles.verifiedText}>VERIFICADO</Text>
                      </View>
                    )}
                    {/* Estado en línea */}
                    <View style={[
                      styles.onlineStatusDot,
                      item.isOnline && { backgroundColor: colors.success }
                    ]} />
                  </View>
                </TouchableOpacity>

                {/* Nombre y información */}
                <View style={styles.actorInfo}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => onViewActor && onViewActor(item.id, item.stageName || item.name)}
                  >
                    <Text style={[
                      styles.actorName,
                      { color: colors.textPrimary }
                    ]} numberOfLines={1}>
                      {item.stageName || item.name}
                    </Text>
                    {item.isVerified && (
                      <CheckCircle2 size={14} color={colors.verifiedBlue} fill={colors.verifiedBlue} />
                    )}
                  </TouchableOpacity>
                  
                  <Text style={styles.actorTitle}>
                    ⭐ {item.stageName || item.name} - {item.videosCount} videos
                  </Text>
                  
                  <View style={styles.statsContainer}>
                    <Text style={[
                      statsText,
                      { color: colors.textSecondary }
                    ]}>
                      {typeof item.followersCount === 'number'
                        ? `${(item.followersCount / 1000).toFixed(0)}K`
                        : '0K'} followers
                    </Text>
                    <Text style={[
                      statsText,
                      { color: colors.textSecondary }
                    ]}>
                      • {item.videosCount} videos
                    </Text>
                    <Text style={[
                      statsText,
                      { color: colors.textSecondary }
                    ]}>
                      • {item.rating || '98%'} satisfaction
                    </Text>
                  </View>
                </View>

                {/* Botón Seguir con efectos premium */}
                <TouchableOpacity
                  style={[
                    styles.followBtn,
                    { 
                      backgroundColor: item.isFollowing 
                        ? colors.surfaceCardLight 
                        : colors.primary,
                      borderColor: item.isFollowing 
                        ? colors.border 
                        : colors.primary,
                      ...(item.isFollowing ? {} : SHADOWS.glow()),
                    }
                  ]}
                  onPress={() => onToggleFollow && onToggleFollow(item as ActorItem)}
                  activeOpacity={0.85}
                >
                  {item.isFollowing ? (
                    <>
                      <Check size={16} color={colors.textPrimary} style={{ marginRight: 6 }} />
                      <Text style={styles.followBtnText}>YA SIGUES</Text>
                    </>
                  ) : (
                    <>
                      <Heart size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.followBtnText}>SEGUIR</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          );
        })}
      </ScrollView>
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
  crownIconBox: {
    width: 40,
    height: 40,
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
  sectionTitleContainer: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    ...TYPOGRAPHY.titleMedium,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  sectionSubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  scrollList: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  actorCardContainer: {
    width: 180,
    marginRight: 12,
  },
  actorCard: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  rankBadge: {
    position: 'absolute',
    top: SPACING.xs,
    left: SPACING.xs,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  rankBadgeText: {
    ...TYPOGRAPHY.titleMedium,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  avatarWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    marginVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  verifiedBanner: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    backgroundColor: colors.verifiedBlue,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 20,
  },
  verifiedText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  onlineStatusDot: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#30D158',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  actorInfo: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  actorName: {
    ...TYPOGRAPHY.titleMedium,
    color: colors.textPrimary,
    marginBottom: SPACING.xs,
  },
  actorTitle: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textSecondary,
    marginBottom: SPACING.sm,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
    flexWrap: 'wrap',
  },
  statsText: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textSecondary,
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceCardLight,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  followBtnText: {
    ...TYPOGRAPHY.labelMedium,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
