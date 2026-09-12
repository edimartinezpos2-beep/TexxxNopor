import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Crown, CheckCircle2, ChevronRight, UserPlus, Check } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { ActorItem } from '../types/auth';

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
  const { colors } = useTheme();

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
      isVerified: true,
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

  const getRankBadge = (index: number) => {
    if (index === 0) {
      return { bg: '#FFD700', text: '#000000', icon: Crown, label: '#1' };
    }
    if (index === 1) {
      return { bg: '#E0E0E0', text: '#000000', icon: null, label: '#2' };
    }
    if (index === 2) {
      return { bg: '#CD7F32', text: '#FFFFFF', icon: null, label: '#3' };
    }
    return { bg: 'rgba(255,255,255,0.15)', text: '#FFFFFF', icon: null, label: `#${index + 1}` };
  };

  return (
    <View style={styles.container}>
      {/* Encabezado de la sección */}
      <View style={styles.sectionHeader}>
        <View style={styles.titleWithIcon}>
          <View style={[styles.crownIconBox, { backgroundColor: 'rgba(255, 215, 0, 0.15)' }]}>
            <Crown size={15} color="#FFD700" fill="#FFD700" />
          </View>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Top Modelos Verificados
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Creadores más populares de la semana
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.seeAllBtn}
          onPress={() => onViewActor && onViewActor()}
          activeOpacity={0.7}
        >
          <Text style={[styles.seeAllText, { color: colors.primary }]}>Ver ranking</Text>
          <ChevronRight size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Carrusel de Modelos */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
      >
        {displayList.map((item, index) => {
          const rank = getRankBadge(index);
          const RankIcon = rank.icon;

          return (
            <View
              key={item.id || index}
              style={[
                styles.actorCard,
                { backgroundColor: colors.surfaceCard, borderColor: colors.border },
              ]}
            >
              {/* Badge de Ranking */}
              <View style={[styles.rankBadge, { backgroundColor: rank.bg }]}>
                {RankIcon ? (
                  <RankIcon size={10} color={rank.text} fill={rank.text} style={{ marginRight: 2 }} />
                ) : null}
                <Text style={[styles.rankBadgeText, { color: rank.text }]}>{rank.label}</Text>
              </View>

              {/* Avatar con anillo y dot verde */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => onViewActor && onViewActor(item.id, item.stageName || item.name)}
                style={styles.avatarWrapper}
              >
                <Image
                  source={{
                    uri:
                      item.avatarUrl ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop',
                  }}
                  style={[
                    styles.avatarImage as any,
                    index === 0 && { borderColor: '#FFD700', borderWidth: 2 },
                  ]}
                />
                {/* Dot en línea */}
                <View style={styles.onlineStatusDot} />
              </TouchableOpacity>

              {/* Nombre y Verificado */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => onViewActor && onViewActor(item.id, item.stageName || item.name)}
                style={styles.actorNameRow}
              >
                <Text style={[styles.actorName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {item.stageName || item.name}
                </Text>
                <CheckCircle2 size={12} color="#0084FF" fill="#0084FF" />
              </TouchableOpacity>

              {/* Métricas */}
              <Text style={[styles.followersText, { color: colors.textSecondary }]}>
                {typeof item.followersCount === 'number'
                  ? `${(item.followersCount / 1000).toFixed(0)}k fans`
                  : '45k fans'}
                {' • '}
                {item.videosCount || 12} videos
              </Text>

              {/* Botón Seguir */}
              <TouchableOpacity
                style={[
                  styles.followBtn,
                  item.isFollowing
                    ? { backgroundColor: colors.surfaceCardLight, borderColor: colors.border }
                    : { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => onToggleFollow && onToggleFollow(item as ActorItem)}
                activeOpacity={0.75}
              >
                {item.isFollowing ? (
                  <>
                    <Check size={12} color={colors.textPrimary} style={{ marginRight: 4 }} />
                    <Text style={[styles.followBtnText, { color: colors.textPrimary }]}>Siguiendo</Text>
                  </>
                ) : (
                  <>
                    <UserPlus size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={[styles.followBtnText, { color: '#FFFFFF' }]}>Seguir</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  crownIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  scrollList: {
    paddingHorizontal: 12,
    gap: 12,
  },
  actorCard: {
    width: 140,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  rankBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    zIndex: 2,
  },
  rankBadgeText: {
    fontSize: 9,
    fontWeight: '900',
  },
  avatarWrapper: {
    position: 'relative',
    marginVertical: 4,
  },
  avatarImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  onlineStatusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#30D158',
    borderWidth: 2,
    borderColor: '#181820',
  },
  actorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  actorName: {
    fontSize: 13,
    fontWeight: 'bold',
    maxWidth: 100,
  },
  followersText: {
    fontSize: 10,
    marginTop: 2,
    marginBottom: 8,
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  followBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
