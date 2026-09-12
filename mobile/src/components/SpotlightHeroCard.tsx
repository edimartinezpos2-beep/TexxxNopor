import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Play, Flame, CheckCircle2, Bookmark, Award, Eye, ThumbsUp } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { VideoItem } from '../types/auth';

interface SpotlightHeroCardProps {
  video: VideoItem;
  onPress: () => void;
  onViewActor?: (actorId?: string, actorName?: string) => void;
  onToggleSave?: () => void;
  isSaved?: boolean;
}

const { width } = Dimensions.get('window');

export const SpotlightHeroCard: React.FC<SpotlightHeroCardProps> = ({
  video,
  onPress,
  onViewActor,
  onToggleSave,
  isSaved = false,
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
      {/* Thumbnail grande con overlay */}
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={onPress}
        style={styles.imageContainer}
      >
        <Image
          source={{
            uri:
              video.thumbnailUrl ||
              'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?w=1000&auto=format&fit=crop',
          }}
          style={styles.heroImage as any}
          resizeMode="cover"
        />

        {/* Degradado oscuro simulado con overlays */}
        <View style={styles.topGradient} />
        <View style={styles.bottomGradient} />

        {/* Badges superiores */}
        <View style={styles.topBadgesRow}>
          <View style={styles.spotlightTag}>
            <Award size={12} color="#000000" style={{ marginRight: 4 }} />
            <Text style={styles.spotlightTagText}>ESTRENO VIP DEL DÍA</Text>
          </View>

          <View style={styles.qualityTag}>
            <Text style={styles.qualityTagText}>4K UHD</Text>
          </View>
        </View>

        {/* Botón Central de Play Grande */}
        <View style={styles.centerPlayCircle}>
          <Play size={28} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 3 }} />
        </View>

        {/* Metadatos sobre la imagen */}
        <View style={styles.bottomInfoOverlay}>
          <View style={styles.metricsRow}>
            <View style={styles.ratingBadge}>
              <ThumbsUp size={11} color="#30D158" style={{ marginRight: 4 }} />
              <Text style={styles.ratingText}>98%</Text>
            </View>
            <View style={styles.viewsBadge}>
              <Eye size={11} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.viewsText}>
                {typeof video.views === 'number'
                  ? `${(video.views / 1000).toFixed(1)}k vistas`
                  : `${video.views} vistas`}
              </Text>
            </View>
            <View style={styles.durationPill}>
              <Text style={styles.durationPillText}>{video.duration || '24:18'}</Text>
            </View>
          </View>

          <Text style={styles.heroTitle} numberOfLines={2}>
            {video.title}
          </Text>

          {/* Creador / Actor */}
          <TouchableOpacity
            style={styles.actorRow}
            activeOpacity={0.8}
            onPress={() => onViewActor && onViewActor(video.actorId, video.actorName)}
          >
            <Image
              source={{
                uri:
                  video.actorAvatar ||
                  video.creatorAvatar ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop',
              }}
              style={styles.actorAvatar as any}
            />
            <Text style={styles.actorName}>
              {video.actorName || video.creatorName || 'Estudio Oficial'}
            </Text>
            <CheckCircle2 size={13} color="#0084FF" fill="#0084FF" />
            <Text style={styles.categoryLabel}>• {video.category || 'Exclusivo'}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Barra inferior de acciones (Reproducir y Mi Lista) */}
      <View style={[styles.bottomActions, { borderTopColor: colors.borderLight }]}>
        <TouchableOpacity
          style={[styles.primaryPlayBtn, { backgroundColor: colors.primary }]}
          onPress={onPress}
          activeOpacity={0.85}
        >
          <Play size={16} color="#FFFFFF" fill="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.primaryPlayBtnText}>REPRODUCIR AHORA</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.saveBtn,
            { borderColor: colors.border, backgroundColor: colors.surfaceCardLight },
            isSaved && { borderColor: colors.primary },
          ]}
          onPress={onToggleSave}
          activeOpacity={0.75}
        >
          <Bookmark
            size={16}
            color={isSaved ? colors.primary : colors.textPrimary}
            fill={isSaved ? colors.primary : 'transparent'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 220,
    backgroundColor: '#121217',
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
    height: 60,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  topBadgesRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spotlightTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFB800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  spotlightTagText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  qualityTag: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#05D9E8',
  },
  qualityTagText: {
    color: '#05D9E8',
    fontSize: 10,
    fontWeight: 'bold',
  },
  centerPlayCircle: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    transform: [{ translateX: -26 }, { translateY: -26 }],
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(229, 9, 20, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  bottomInfoOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    right: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(48, 209, 88, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingText: {
    color: '#30D158',
    fontSize: 10,
    fontWeight: 'bold',
  },
  viewsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  viewsText: {
    color: '#FFFFFF',
    fontSize: 10,
  },
  durationPill: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  actorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actorAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  actorName: {
    color: '#E0E0E0',
    fontSize: 11,
    fontWeight: '600',
  },
  categoryLabel: {
    color: '#A0A0B0',
    fontSize: 10,
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 10,
    borderTopWidth: 0.5,
  },
  primaryPlayBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
  },
  primaryPlayBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  saveBtn: {
    padding: 9,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
