import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Share,
} from 'react-native';
import {
  ArrowLeft,
  Tv,
  MoreVertical,
  Heart,
  ThumbsUp,
  Bookmark,
  Share2,
  Flag,
  CheckCircle2,
  Send,
  UserCheck,
  UserPlus,
  Hash,
} from 'lucide-react-native';
import { HLSVideoPlayer } from '../components/HLSVideoPlayer';
import { useTheme } from '../context/ThemeContext';
import { api, VideoItem, CommentItem } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { VideoOptionsModal } from '../components/VideoOptionsModal';

interface VideoDetailPlayerScreenProps {
  video?: VideoItem;
  onBack?: () => void;
  onViewActor?: (actorId?: string, actorName?: string) => void;
}

export const VideoDetailPlayerScreen: React.FC<VideoDetailPlayerScreenProps> = ({
  video: initialVideo,
  onBack,
  onViewActor,
}) => {
  const { colors, isDark } = useTheme();
  const { userToken, user } = useAuth();

  const currentVideo: VideoItem = initialVideo || {
    id: 'v1',
    title: 'Noche de verano',
    description: 'Una sesión nocturna entre luces rojas y seda',
    creatorId: 'usr_creator_luna',
    creatorName: 'Luna Roja',
    creatorAvatar:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop',
    duration: '18:42',
    views: '1 vista',
    likesCount: 0,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop',
    hlsMasterUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    category: 'Para ti',
    tags: ['#parati', '#hd'],
    isNew: true,
    isLiked: false,
  };

  const [isLiked, setIsLiked] = useState(currentVideo.isLiked || false);
  const [likesCount, setLikesCount] = useState(currentVideo.likesCount || 0);
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Registrar en Historial de Reproducción real en PostgreSQL
    if (userToken) {
      api.videos.recordHistory(userToken, currentVideo.id).catch(() => {});
    }

    // Cargar detalles reales del video
    api.videos.getVideo(currentVideo.id, user?.id).then((videoData: any) => {
      if (!isMounted || !videoData) return;
      setIsLiked(!!videoData.isLiked);
      setLikesCount(videoData.likesCount || 0);
      setIsSaved(!!videoData.isSaved);
      if (videoData.actorFollowersCount !== undefined) {
        setFollowersCount(videoData.actorFollowersCount);
      }
      if (videoData.isFollowingActor !== undefined) {
        setIsFollowing(videoData.isFollowingActor);
      }
      if (videoData.comments) {
        setComments(videoData.comments);
      }
    });

    // Cargar comentarios
    api.videos.getComments(currentVideo.id).then((data) => {
      if (isMounted) setComments(data);
    });

    return () => {
      isMounted = false;
    };
  }, [currentVideo.id, userToken, user?.id]);

  const handleToggleLike = async () => {
    if (!userToken) {
      Alert.alert('Inicia Sesión', 'Debes iniciar sesión para dar me gusta a este video.');
      return;
    }
    const previousState = isLiked;
    const previousCount = likesCount;

    setIsLiked(!previousState);
    setLikesCount(previousState ? Math.max(0, previousCount - 1) : previousCount + 1);

    try {
      const res = await api.videos.toggleLike(userToken, currentVideo.id);
      setIsLiked(res.isLiked);
      setLikesCount(res.likesCount);
    } catch (err) {
      setIsLiked(previousState);
      setLikesCount(previousCount);
    }
  };

  const handleToggleSave = async () => {
    if (!userToken) {
      Alert.alert('Inicia Sesión', 'Debes iniciar sesión para guardar videos en Ver después.');
      return;
    }
    const prev = isSaved;
    setIsSaved(!prev);

    try {
      const res = await api.videos.toggleWatchLater(userToken, currentVideo.id);
      setIsSaved(res.isSaved);
      Alert.alert('Ver después', res.message);
    } catch (err) {
      setIsSaved(prev);
    }
  };

  const handleToggleFollow = async () => {
    if (!userToken) {
      Alert.alert('Inicia Sesión', 'Debes iniciar sesión para seguir a esta actriz.');
      return;
    }
    const targetId = currentVideo.actorId || currentVideo.creatorId || currentVideo.id;
    const prev = isFollowing;
    setIsFollowing(!prev);
    setFollowersCount((c) => (prev ? Math.max(0, c - 1) : c + 1));

    try {
      const res = await api.creators.toggleFollow(userToken, targetId);
      setIsFollowing(res.isFollowing);
      setFollowersCount(res.followersCount);
    } catch (err) {
      setIsFollowing(prev);
    }
  };

  const handleSendComment = async () => {
    if (!commentText.trim() || isSendingComment || !userToken) {
      if (!userToken) {
        Alert.alert('Inicia Sesión', 'Debes iniciar sesión para escribir comentarios.');
      }
      return;
    }

    const textToSend = commentText.trim();
    setCommentText('');
    setIsSendingComment(true);

    try {
      const newComment = await api.videos.addComment(
        userToken,
        currentVideo.id,
        textToSend,
        user
      );
      setComments((prev) => [newComment, ...prev]);
    } catch (err) {
      console.log('Error enviando comentario:', err);
    } finally {
      setIsSendingComment(false);
    }
  };

  const handleShare = async () => {
    try {
      const url = currentVideo.videoUrl || `https://texxxnopor.com/v/${currentVideo.id}`;
      await Share.share({
        title: currentVideo.title,
        message: `🔥 Mira "${currentVideo.title}" en TexxxNopor: ${url}`,
        url,
      });
    } catch (err) {
      console.log('Error sharing:', err);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* 1. Header Superior */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.iconButton}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {currentVideo.title}
        </Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton} onPress={() => setShowOptionsModal(true)}>
            <Tv size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          {/* Botón 3 Puntos para Configuración */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowOptionsModal(true)}
            activeOpacity={0.7}
          >
            <MoreVertical size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Reproductor HLS / Cloudinary */}
      <HLSVideoPlayer
        hlsMasterUrl={currentVideo.hlsMasterUrl || ''}
        videoUrl={currentVideo.videoUrl}
        posterUrl={currentVideo.thumbnailUrl}
        title={currentVideo.title}
        onBack={onBack}
        autoPlay={true}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Título y Categoría */}
        <View style={styles.videoTitleSection}>
          <Text style={[styles.videoMainTitle, { color: colors.textPrimary }]}>{currentVideo.title}</Text>
          <View style={styles.categoryAndTagsRow}>
            <View style={[styles.categoryPill, { backgroundColor: colors.primaryGlow, borderColor: colors.primary }]}>
              <Text style={[styles.categoryPillText, { color: colors.primary }]}>{currentVideo.category || 'Para ti'}</Text>
            </View>

            {currentVideo.tags &&
              currentVideo.tags.map((tag, i) => (
                <View key={i} style={[styles.tagPill, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
                  <Text style={[styles.tagPillText, { color: colors.textSecondary }]}>{tag}</Text>
                </View>
              ))}
          </View>
        </View>

        {/* 3. Barra de Interacciones */}
        <View style={[styles.actionsBar, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={handleToggleLike}
            activeOpacity={0.7}
          >
            <Heart
              size={22}
              color={isLiked ? colors.primary : colors.textPrimary}
              fill={isLiked ? colors.primary : 'transparent'}
            />
            <Text
              style={[
                styles.actionText,
                { color: colors.textSecondary },
                isLiked && { color: colors.primary, fontWeight: 'bold' },
              ]}
            >
              {likesCount > 999 ? `${(likesCount / 1000).toFixed(1)}k` : likesCount}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={handleToggleLike}
            activeOpacity={0.7}
          >
            <ThumbsUp
              size={22}
              color={isLiked ? colors.primary : colors.textPrimary}
            />
            <Text style={[styles.actionText, { color: colors.textSecondary }, isLiked && { color: colors.primary }]}>
              {isLiked ? 'Te gusta' : 'Me gusta'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={handleToggleSave}
            activeOpacity={0.7}
          >
            <Bookmark
              size={22}
              color={isSaved ? colors.primary : colors.textPrimary}
              fill={isSaved ? colors.primary : 'transparent'}
            />
            <Text style={[styles.actionText, { color: colors.textSecondary }, isSaved && { color: colors.primary }]}>
              {isSaved ? 'Guardado' : 'Guardar'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <Share2 size={22} color={colors.textPrimary} />
            <Text style={[styles.actionText, { color: colors.textSecondary }]}>Compartir</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => setShowOptionsModal(true)}
            activeOpacity={0.7}
          >
            <MoreVertical size={22} color={colors.textPrimary} />
            <Text style={[styles.actionText, { color: colors.textSecondary }]}>Más</Text>
          </TouchableOpacity>
        </View>

        {/* 4. Tarjeta del Actor / Creador */}
        <TouchableOpacity
          style={[styles.creatorCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}
          onPress={() => onViewActor && onViewActor(currentVideo.actorId, currentVideo.actorName)}
          activeOpacity={0.85}
        >
          <View style={[styles.creatorAvatarRing, { borderColor: colors.primary }]}>
            <Image
              source={{
                uri:
                  currentVideo.actorAvatar ||
                  currentVideo.creatorAvatar ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop',
              }}
              style={styles.creatorAvatar}
            />
          </View>

          <View style={styles.creatorInfo}>
            <View style={styles.creatorTitleRow}>
              <Text style={[styles.creatorName, { color: colors.textPrimary }]}>
                {currentVideo.actorName || currentVideo.creatorName || 'Actor Principal'}
              </Text>
              <CheckCircle2 size={16} color={colors.verifiedBlue} fill={colors.verifiedBlue} />
            </View>
            <Text style={[styles.creatorBadge, { color: colors.primary }]}>⭐ Talento verificado de TexxxNopor</Text>
            <Text style={[styles.creatorFollowers, { color: colors.textSecondary }]}>
              {followersCount} {followersCount === 1 ? 'seguidor' : 'seguidores'}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.followButton,
              { backgroundColor: colors.primary },
              isFollowing && [styles.followButtonActive, { backgroundColor: colors.primaryGlow, borderColor: colors.primary }],
            ]}
            onPress={(e) => {
              e.stopPropagation();
              handleToggleFollow();
            }}
            activeOpacity={0.8}
          >
            {isFollowing ? (
              <>
                <UserCheck size={16} color={colors.primary} style={{ marginRight: 4 }} />
                <Text style={[styles.followButtonTextActive, { color: colors.primary }]}>Siguiendo</Text>
              </>
            ) : (
              <>
                <UserPlus size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.followButtonText}>Seguir</Text>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>

        {/* 5. Descripción y Consentimiento */}
        <View style={[styles.descriptionCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          <Text style={[styles.descriptionText, { color: colors.textPrimary }]}>{currentVideo.description}</Text>
          <View style={[styles.consentDivider, { backgroundColor: colors.border }]} />
          <View style={styles.consentRow}>
            <Text style={[styles.consentTag, { color: colors.textSecondary }]}>🛡️ Producción 100% Consentida</Text>
            <Text style={[styles.consentTag, { color: colors.textSecondary }]}>🔞 Verificado 18+</Text>
          </View>
        </View>

        {/* 6. Sección de Comentarios */}
        <View style={styles.commentsSection}>
          <Text style={[styles.commentsTitle, { color: colors.textPrimary }]}>Comentarios ({comments.length})</Text>

          {/* Input de nuevo comentario */}
          <View style={[styles.commentInputRow, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
            <TextInput
              style={[styles.commentInput, { color: colors.textPrimary }]}
              placeholder="Escribe un comentario verificado..."
              placeholderTextColor={colors.textMuted}
              value={commentText}
              onChangeText={setCommentText}
            />
            <TouchableOpacity
              style={[
                styles.sendCommentBtn,
                { backgroundColor: colors.primary },
                (!commentText.trim() || isSendingComment) && styles.sendCommentBtnDisabled,
              ]}
              onPress={handleSendComment}
              disabled={!commentText.trim() || isSendingComment}
            >
              {isSendingComment ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Send size={16} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>

          {/* Lista de comentarios */}
          {comments.map((item) => (
            <View key={item.id} style={[styles.commentItem, { borderBottomColor: colors.border }]}>
              <Image
                source={{
                  uri:
                    item.userAvatar ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop',
                }}
                style={styles.commentAvatar}
              />
              <View style={[styles.commentBubble, { backgroundColor: colors.surfaceCard }]}>
                <View style={styles.commentHeader}>
                  <Text style={[styles.commentUser, { color: colors.textPrimary }]}>{item.userName}</Text>
                  <Text style={[styles.commentTime, { color: colors.textMuted }]}>reciente</Text>
                </View>
                <Text style={[styles.commentText, { color: colors.textSecondary }]}>{item.text}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* 7. Modal de Opciones y Configuración (3 Puntos) */}
      <VideoOptionsModal
        visible={showOptionsModal}
        video={currentVideo}
        onClose={() => setShowOptionsModal(false)}
        onViewActor={onViewActor}
        onVideoDeleted={() => {
          if (onBack) onBack();
        }}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  iconButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginHorizontal: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scrollContent: {
    paddingBottom: 40,
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },
  videoTitleSection: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  videoMainTitle: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
    marginBottom: 8,
  },
  categoryAndTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  tagPillText: {
    fontSize: 11,
  },
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionItem: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  creatorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
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
  creatorInfo: {
    flex: 1,
  },
  creatorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  creatorName: {
    fontSize: 15,
    fontWeight: '700',
  },
  creatorBadge: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  creatorFollowers: {
    fontSize: 11,
    marginTop: 2,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  followButtonActive: {
    borderWidth: 1.5,
  },
  followButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  followButtonTextActive: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  descriptionCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  descriptionText: {
    fontSize: 13,
    lineHeight: 19,
  },
  consentDivider: {
    height: 1,
    marginVertical: 10,
  },
  consentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  consentTag: {
    fontSize: 11,
    fontWeight: '600',
  },
  commentsSection: {
    paddingHorizontal: 16,
    marginTop: 18,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    marginBottom: 16,
  },
  commentInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 6,
  },
  sendCommentBtn: {
    padding: 8,
    borderRadius: 18,
    marginLeft: 6,
  },
  sendCommentBtnDisabled: {
    opacity: 0.4,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 10,
  },
  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  commentBubble: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentUser: {
    fontSize: 12,
    fontWeight: '700',
  },
  commentTime: {
    fontSize: 10,
  },
  commentText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
