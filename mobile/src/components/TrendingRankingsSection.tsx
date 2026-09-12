import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { TrendingUp, Play, Eye, ThumbsUp, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { VideoItem } from '../types/auth';

interface TrendingRankingsSectionProps {
  videos: VideoItem[];
  onSelectVideo?: (video: VideoItem) => void;
}

export const TrendingRankingsSection: React.FC<TrendingRankingsSectionProps> = ({
  videos,
  onSelectVideo,
}) => {
  const { colors } = useTheme();

  if (!videos || videos.length === 0) return null;

  // Ordenar por vistas para obtener los verdaderos más vistos
  const sortedVideos = [...videos]
    .sort((a, b) => {
      const vA = typeof a.views === 'number' ? a.views : parseInt(String(a.views || '0'), 10) || 0;
      const vB = typeof b.views === 'number' ? b.views : parseInt(String(b.views || '0'), 10) || 0;
      return vB - vA;
    })
    .slice(0, 5);

  return (
    <View style={styles.container}>
      {/* Cabecera */}
      <View style={styles.sectionHeader}>
        <View style={styles.titleWithIcon}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(5, 217, 232, 0.15)' }]}>
            <TrendingUp size={15} color="#05D9E8" />
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
          style={styles.seeAllBtn}
          onPress={() => onSelectVideo && onSelectVideo(sortedVideos[0])}
          activeOpacity={0.7}
        >
          <Text style={[styles.seeAllText, { color: colors.primary }]}>Ver top</Text>
          <ChevronRight size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Carrusel con Grandes Números */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
      >
        {sortedVideos.map((item, index) => {
          const rankNumber = `0${index + 1}`;

          return (
            <TouchableOpacity
              key={`trending-${item.id}-${index}`}
              activeOpacity={0.9}
              style={[
                styles.card,
                { backgroundColor: colors.surfaceCard, borderColor: colors.border },
              ]}
              onPress={() => onSelectVideo && onSelectVideo(item)}
            >
              {/* Contenedor de la Imagen */}
              <View style={styles.thumbnailContainer}>
                <Image
                  source={{
                    uri:
                      item.thumbnailUrl ||
                      'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?w=600&auto=format&fit=crop',
                  }}
                  style={styles.thumbnail as any}
                  resizeMode="cover"
                />

                {/* Gran Número de Ranking en la Esquina */}
                <View style={styles.giantRankBox}>
                  <Text style={styles.giantRankText}>{rankNumber}</Text>
                </View>

                {/* Botón Central Play */}
                <View style={styles.playCenter}>
                  <Play size={20} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 2 }} />
                </View>

                {/* Duración */}
                <View style={styles.durationBadge}>
                  <Text style={styles.durationText}>{item.duration || '18:30'}</Text>
                </View>
              </View>

              {/* Información */}
              <View style={styles.detailsContainer}>
                <Text style={[styles.videoTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                  {item.title}
                </Text>

                <View style={styles.metaRow}>
                  <View style={styles.ratingBadge}>
                    <ThumbsUp size={10} color="#30D158" style={{ marginRight: 3 }} />
                    <Text style={styles.ratingText}>
                      {94 + (index % 5)}%
                    </Text>
                  </View>

                  <View style={styles.viewsBadge}>
                    <Eye size={10} color={colors.textMuted} style={{ marginRight: 3 }} />
                    <Text style={[styles.viewsText, { color: colors.textSecondary }]}>
                      {typeof item.views === 'number'
                        ? `${(item.views / 1000).toFixed(0)}k`
                        : item.views || '85k'}
                    </Text>
                  </View>

                  <Text style={[styles.categoryText, { color: colors.primary }]}>
                    • {item.category || 'Destacado'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
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
  iconBox: {
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
  card: {
    width: 200,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  thumbnailContainer: {
    width: '100%',
    height: 120,
    position: 'relative',
    backgroundColor: '#1E1E28',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  giantRankBox: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#05D9E8',
  },
  giantRankText: {
    color: '#05D9E8',
    fontSize: 13,
    fontWeight: '900',
  },
  playCenter: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    transform: [{ translateX: -18 }, { translateY: -18 }],
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  detailsContainer: {
    padding: 10,
  },
  videoTitle: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  ratingText: {
    color: '#30D158',
    fontSize: 9,
    fontWeight: 'bold',
  },
  viewsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewsText: {
    fontSize: 10,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
