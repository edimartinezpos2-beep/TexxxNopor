import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Zap, Play, Eye, Flame, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { VideoItem } from '../types/auth';

interface TexxxClipsSectionProps {
  videos: VideoItem[];
  onSelectVideo?: (video: VideoItem) => void;
}

export const TexxxClipsSection: React.FC<TexxxClipsSectionProps> = ({
  videos,
  onSelectVideo,
}) => {
  const { colors } = useTheme();

  if (!videos || videos.length === 0) return null;

  // Filtrar videos verificados como shorts (isShort === true, aspectRatio === '9:16', o duración <= 60s)
  const shortCandidates = videos.filter(
    (v) => v.isShort === true || v.aspectRatio === '9:16' || (v.durationSeconds && v.durationSeconds <= 60)
  );
  const clips = (shortCandidates.length > 0 ? shortCandidates : videos).slice(0, 8);

  return (
    <View style={styles.container}>
      {/* Cabecera de la sección */}
      <View style={styles.sectionHeader}>
        <View style={styles.titleWithIcon}>
          <View style={[styles.iconPill, { backgroundColor: 'rgba(255, 45, 85, 0.2)' }]}>
            <Zap size={14} color="#FF2D55" fill="#FF2D55" />
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                TexxxClips
              </Text>
              <View style={styles.liveBadge}>
                <Text style={styles.liveBadgeText}>SHORTS 9:16</Text>
              </View>
            </View>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Momentos intensos sin esperas (formato vertical ≤ 60 seg)
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.seeAllBtn}
          onPress={() => onSelectVideo && onSelectVideo(clips[0])}
          activeOpacity={0.7}
        >
          <Text style={[styles.seeAllText, { color: colors.primary }]}>Ver todo</Text>
          <ChevronRight size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Carrusel Horizontal de Clips Verticales */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
      >
        {clips.map((item, idx) => {
          const shortDuration = item.duration || `0:${20 + (idx * 7) % 35}`;

          return (
            <TouchableOpacity
              key={`clip-${item.id}-${idx}`}
              activeOpacity={0.88}
              style={[
                styles.clipCard,
                { backgroundColor: colors.surfaceCard, borderColor: colors.border },
              ]}
              onPress={() => onSelectVideo && onSelectVideo(item)}
            >
              {/* Imagen Vertical 9:16 */}
              <Image
                source={{
                  uri:
                    item.thumbnailUrl ||
                    'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?w=500&auto=format&fit=crop',
                }}
                style={styles.clipThumbnail as any}
                resizeMode="cover"
              />

              {/* Overlays */}
              <View style={styles.clipTopOverlay}>
                <View style={styles.flamePill}>
                  <Flame size={10} color="#FF9500" fill="#FF9500" />
                  <Text style={styles.flamePillText}>HOT</Text>
                </View>
                <View style={styles.durationPill}>
                  <Text style={styles.durationPillText}>{shortDuration}</Text>
                </View>
              </View>

              {/* Botón Central Play translúcido */}
              <View style={styles.playIconWrapper}>
                <Play size={18} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 2 }} />
              </View>

              {/* Gradiente y datos inferiores */}
              <View style={styles.clipBottomOverlay}>
                <Text style={styles.clipTitle} numberOfLines={2}>
                  {item.title}
                </Text>

                <View style={styles.clipMetaRow}>
                  <Eye size={10} color="#FFFFFF" style={{ marginRight: 3 }} />
                  <Text style={styles.clipViewsText}>
                    {typeof item.views === 'number'
                      ? `${(item.views / 1000).toFixed(0)}k`
                      : item.views || '12k'}
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
    marginBottom: 10,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconPill: {
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
  liveBadge: {
    backgroundColor: '#FF2D55',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  liveBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
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
    gap: 10,
  },
  clipCard: {
    width: 124,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  clipThumbnail: {
    width: '100%',
    height: '100%',
  },
  clipTopOverlay: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flamePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  flamePillText: {
    color: '#FF9500',
    fontSize: 8,
    fontWeight: 'bold',
  },
  durationPill: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationPillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  playIconWrapper: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    transform: [{ translateX: -16 }, { translateY: -16 }],
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clipBottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.82)',
  },
  clipTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
    marginBottom: 4,
  },
  clipMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clipViewsText: {
    color: '#D0D0D0',
    fontSize: 9,
    fontWeight: '600',
  },
});
