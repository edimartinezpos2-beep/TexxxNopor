import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { Zap, Play, Eye, Flame, ChevronRight, Heart, Bookmark, MoreHorizontal } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { VideoItem } from '../types/auth';
import { TikTokShortsScreen } from '../screens/TikTokShortsScreen';
import { RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../theme/colors';

interface TexxxClipsSectionProps {
  videos: VideoItem[];
  onSelectVideo?: (video: VideoItem) => void;
  onOpenLive?: () => void;
  onViewActor?: (actorId?: string, actorName?: string) => void;
}

export const TexxxClipsSection: React.FC<TexxxClipsSectionProps> = ({
  videos,
  onSelectVideo,
  onOpenLive,
  onViewActor,
}) => {
  const { colors, isDark } = useTheme();
  const [activeShortIndex, setActiveShortIndex] = useState<number | null>(null);

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
          <View style={[styles.iconPill, { backgroundColor: colors.primaryGlow }]}>
            <Zap size={16} color={colors.primary} />
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                TexxxClips
              </Text>
              <View style={[
                styles.liveBadge,
                { backgroundColor: colors.primary }
              ]}>
                <Text style={styles.liveBadgeText}>SHORTS 9:16</Text>
              </View>
            </View>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Momentos intensos sin esperas (formato vertical ≤ 60 seg)
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
          onPress={() => setActiveShortIndex(0)}
          activeOpacity={0.85}
        >
          <Text style={styles.seeAllText}>VER TODO</Text>
          <ChevronRight size={14} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Carrusel Horizontal de Clips Verticales Premium */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
        contentContainerStyle={{ paddingBottom: SPACING.md }}
      >
        {clips.map((item, idx) => {
          const shortDuration = item.duration || `0:${20 + (idx * 7) % 35}`;
          const satisfactionPercent = Math.min(99, Math.max(88, 90 + ((idx * 5) % 10)));

          return (
            <TouchableOpacity
              key={`clip-${item.id}-${idx}`}
              activeOpacity={0.9}
              style={[
                styles.clipCard,
                { 
                  backgroundColor: colors.surfaceCard,
                  borderColor: colors.border,
                }
              ]}
              onPress={() => setActiveShortIndex(idx)}
            >
              {/* Imagen Vertical 9:16 */}
              <Image
                source={{
                  uri:
                    item.thumbnailUrl ||
                    'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?w=500&auto=format&fit=crop',
                }}
                style={styles.clipThumbnail}
                resizeMode="cover"
                onError={() => {
                  if (item.thumbnailUrl && !item.thumbnailUrl.includes('unsplash')) {
                    (item as any).thumbnailUrl = 'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?w=500&auto=format&fit=crop';
                  }
                }}
              />

              {/* Overlays premium */}
              <View style={styles.clipTopOverlay}>
                {/* Badge de popularidad */}
                <View style={[
                  styles.popularityBadge,
                  { 
                    backgroundColor: 'rgba(230, 30, 58, 0.8)',
                    borderRadius: RADIUS.full,
                  }
                ]}>
                  <Heart size={12} color="#FFFFFF" fill="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.popularityBadgeText}>{satisfactionPercent}%</Text>
                </View>
                
                {/* Duración */}
                <View style={[
                  styles.durationBadge,
                  { 
                    backgroundColor: 'rgba(230, 30, 58, 0.8)',
                    borderRadius: RADIUS.md,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                  }
                ]}>
                  <Text style={styles.durationText}>{shortDuration}</Text>
                </View>
              </View>

              {/* Botón Central Play translúcido con efecto glow */}
              <View style={[
                styles.playIconWrapper,
                { 
                  backgroundColor: 'rgba(230, 30, 58, 0.95)',
                  ...SHADOWS.glow(),
                }
              ]}>
                <Play size={20} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 2 }} />
              </View>

              {/* Gradiente y datos inferiores */}
              <View style={styles.clipBottomOverlay}>
                <Text style={[
                  styles.clipTitle,
                  { 
                    color: colors.textPrimary,
                    fontWeight: '600',
                  }
                ]} numberOfLines={2}>
                  {item.title}
                </Text>

                <View style={styles.clipMetaRow}>
                  <Eye size={10} color={colors.textSecondary} style={{ marginRight: 4 }} />
                  <Text style={[
                    styles.clipViewsText,
                    { 
                      color: colors.textSecondary,
                      fontWeight: '600',
                    }
                  ]}>
                    {typeof item.views === 'number'
                      ? `${(item.views / 1000).toFixed(0)}k`
                      : item.views || '0'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Modal Reproductor Shorts Pantalla Completa estilo TikTok / YouTube Shorts */}
      {activeShortIndex !== null && (
        <Modal
          visible={true}
          animationType="fade"
          onRequestClose={() => setActiveShortIndex(null)}
          transparent
        >
          <View style={styles.modalBackground}>
            <TikTokShortsScreen
              initialVideos={clips}
              initialIndex={activeShortIndex}
              onBack={() => setActiveShortIndex(null)}
              onOpenLive={onOpenLive}
              onViewActor={onViewActor}
            />
          </View>
        </Modal>
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
  iconPill: {
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
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  liveBadgeText: {
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.labelSmall.fontSize,
    fontWeight: TYPOGRAPHY.labelSmall.fontWeight,
    letterSpacing: 0.5,
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
  clipCard: {
    width: 140,
    height: 230,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: colors.surfaceCard,
    ...SHADOWS.card,
    position: 'relative',
  },
  clipThumbnail: {
    width: '100%',
    height: '100%',
  },
  clipTopOverlay: {
    position: 'absolute',
    top: SPACING.xs,
    left: SPACING.xs,
    right: SPACING.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  popularityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs,
  },
  popularityBadgeText: {
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.labelSmall.fontSize,
    fontWeight: TYPOGRAPHY.labelSmall.fontWeight,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.labelSmall.fontSize,
    fontWeight: TYPOGRAPHY.labelSmall.fontWeight,
  },
  playIconWrapper: {
    position: 'absolute',
    top: '45%',
    left: '50%',
    transform: [{ translateX: -24 }, { translateY: -24 }],
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clipBottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%', // 92px de 230px
    padding: SPACING.md,
    backgroundColor: 'linear-gradient(to top, rgba(10,8,8,0.9), transparent)',
  },
  clipTitle: {
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.titleMedium.fontSize,
    fontWeight: TYPOGRAPHY.titleMedium.fontWeight,
    lineHeight: 20,
    marginBottom: SPACING.xs,
  },
  clipMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  clipViewsText: {
    color: '#B8B0A8',
    fontSize: TYPOGRAPHY.bodySmall.fontSize,
    fontWeight: TYPOGRAPHY.bodySmall.fontWeight,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
