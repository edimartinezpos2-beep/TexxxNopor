import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  Easing,
  Platform,
  TextInput,
  ScrollView,
  Share,
  PanResponder,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  X,
  Plus,
  Check,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Tv,
  Search,
  Music,
  Send,
  Home,
  Compass,
  MessageSquare,
  User,
  Sparkles,
  Smartphone,
  Monitor,
} from 'lucide-react-native';
import { VideoItem, CommentItem } from '../types/auth';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Mocks de fallback para videos Shorts en caso de no tener clips en backend
const FALLBACK_SHORTS: VideoItem[] = [
  {
    id: 'short_1',
    title: 'Manual Breast Pump Guide',
    description:
      'This video demonstrates the use of a breast pump as part of normal lactation and postpartum care. This content is intended solely for educational and maternal wellness purposes.',
    creatorId: 'usr_creator_luna',
    creatorName: 'Luna Roja',
    creatorAvatar:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop',
    duration: '0:45',
    durationSeconds: 45,
    views: '0',
    likesCount: 0,
    commentsCount: 0,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&auto=format&fit=crop',
    videoUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    hlsMasterUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    category: 'Para ti',
    tags: ['#parati', '#educativo', '#salud', '#mama'],
    isNew: true,
    isShort: true,
    aspectRatio: '9:16',
    isLiked: false,
    isSaved: false,
  },
  {
    id: 'short_2',
    title: 'kalohenao',
    description: '#trillizas #tiktok sesión de prueba en backstage 🔥',
    creatorId: 'usr_creator_kalo',
    creatorName: 'kalohenao',
    creatorAvatar:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop',
    duration: '0:32',
    durationSeconds: 32,
    views: '0',
    likesCount: 0,
    commentsCount: 0,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&auto=format&fit=crop',
    videoUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    hlsMasterUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    category: 'Para ti',
    tags: ['#trillizas', '#tiktok', '#viral'],
    isNew: false,
    isShort: true,
    aspectRatio: '9:16',
    isLiked: false,
    isSaved: false,
  },
  {
    id: 'short_3',
    title: 'Sesión Nocturna Golden Hour',
    description: 'Bailando al ritmo de la noche en el estudio privado ✨ #dance #neon',
    creatorId: 'usr_creator_mia',
    creatorName: 'Mia Bella',
    creatorAvatar:
      'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=200&auto=format&fit=crop',
    duration: '0:28',
    durationSeconds: 28,
    views: '0',
    likesCount: 0,
    commentsCount: 0,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&auto=format&fit=crop',
    videoUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    hlsMasterUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    category: 'Para ti',
    tags: ['#goldenhour', '#latina', '#exclusive'],
    isNew: true,
    isShort: true,
    aspectRatio: '9:16',
    isLiked: false,
    isSaved: false,
  },
];

interface TikTokShortsScreenProps {
  initialVideos?: VideoItem[];
  initialIndex?: number;
  onBack: () => void;
  onOpenLive?: () => void;
  onViewActor?: (actorId?: string, actorName?: string) => void;
}

export const TikTokShortsScreen: React.FC<TikTokShortsScreenProps> = ({
  initialVideos,
  initialIndex = 0,
  onBack,
  onOpenLive,
  onViewActor,
}) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { user, userToken } = useAuth();

  // Determinación de modo responsivo (automático según ancho de pantalla)
  const isAutoDesktop = windowWidth >= 768;
  const [forceMode, setForceMode] = useState<'AUTO' | 'DESKTOP' | 'MOBILE'>('AUTO');
  const isDesktop = forceMode === 'AUTO' ? isAutoDesktop : forceMode === 'DESKTOP';

  // Lista de videos
  const [shortsList, setShortsList] = useState<VideoItem[]>(() => {
    const list = initialVideos && initialVideos.length > 0 ? initialVideos : FALLBACK_SHORTS;
    return list;
  });
  const [currentIndex, setCurrentIndex] = useState(
    Math.min(initialIndex, Math.max(0, shortsList.length - 1))
  );

  const currentVideo = shortsList[currentIndex] || shortsList[0];

  // Estados de reproducción
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLiked, setIsLiked] = useState(currentVideo?.isLiked || false);
  const [likesCount, setLikesCount] = useState<number>(
    typeof currentVideo?.likesCount === 'number' ? currentVideo.likesCount : 0
  );
  const [isSaved, setIsSaved] = useState(currentVideo?.isSaved || false);
  const [bookmarksCount, setBookmarksCount] = useState<number>(0);
  const [sharesCount, setSharesCount] = useState<number>(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);

  // Comentarios
  const [showComments, setShowComments] = useState(false);
  const [commentsList, setCommentsList] = useState<
    { id: string; user: string; text: string; time: string; likes: number; avatar: string }[]
  >([]);
  const [newCommentText, setNewCommentText] = useState('');

  // Animación del disco de vinilo rotatorio
  const spinAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Animación de doble tap de Me Gusta y Single Tap para Pausar/Reanudar
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const lastTapRef = useRef<number>(0);
  const tapTimeoutRef = useRef<any>(null);

  const handleVideoPress = (event: any) => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 280;
    if (now - lastTapRef.current < DOUBLE_PRESS_DELAY) {
      // Doble tap -> Me Gusta
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
      if (!isLiked) {
        setIsLiked(true);
        setLikesCount((c) => c + 1);
      }
      const { locationX, locationY } = event.nativeEvent || {};
      const heartId = Date.now();
      setFloatingHearts((prev) => [
        ...prev,
        { id: heartId, x: locationX || 180, y: locationY || 300 },
      ]);
      setTimeout(() => {
        setFloatingHearts((prev) => prev.filter((h) => h.id !== heartId));
      }, 1000);
    } else {
      // Tap simple -> Pausa / Reproducción
      tapTimeoutRef.current = setTimeout(() => {
        setIsPlaying((p) => !p);
      }, DOUBLE_PRESS_DELAY);
    }
    lastTapRef.current = now;
  };

  const handleDoubleTap = handleVideoPress;

  // Sincronizar estado cuando cambia el video
  useEffect(() => {
    if (currentVideo) {
      setIsLiked(!!currentVideo.isLiked);
      setLikesCount(
        typeof currentVideo.likesCount === 'number' ? currentVideo.likesCount : 0
      );
      setIsSaved(!!currentVideo.isSaved);
      setBookmarksCount(0);
      setSharesCount(0);
      setShowFullDesc(false);
      setProgress(0);
    }
  }, [currentIndex, currentVideo]);

  // Navegación entre shorts
  const goToNextShort = useCallback(() => {
    if (currentIndex < shortsList.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  }, [currentIndex, shortsList.length]);

  const goToPrevShort = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    } else {
      setCurrentIndex(shortsList.length - 1);
    }
  }, [currentIndex, shortsList.length]);

  // Manejador de teclado en Web (Desktop)
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (showComments) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        goToNextShort();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        goToPrevShort();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key === 'm' || e.key === 'M') {
        setIsMuted((m) => !m);
      } else if (e.key === 'l' || e.key === 'L') {
        setIsLiked((l) => {
          setLikesCount((c) => (l ? c - 1 : c + 1));
          return !l;
        });
      } else if (e.key === 'Escape') {
        onBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextShort, goToPrevShort, showComments, onBack]);

  // Gestor de Gestos PanResponder para Swipe vertical
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 20 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -50) {
          goToNextShort();
        } else if (gestureState.dy > 50) {
          goToPrevShort();
        }
      },
    })
  ).current;

  const handleToggleLike = () => {
    const nextState = !isLiked;
    setIsLiked(nextState);
    setLikesCount((c) => (nextState ? c + 1 : Math.max(0, c - 1)));
    if (userToken && currentVideo?.id) {
      api.videos.toggleLike(userToken, currentVideo.id).catch(() => {});
    }
  };

  const handleToggleSave = () => {
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    setBookmarksCount((c) => (nextSaved ? c + 1 : Math.max(0, c - 1)));
  };

  const handleShare = async () => {
    setSharesCount((c) => c + 1);
    try {
      await Share.share({
        message: `Mira este Short de ${currentVideo?.creatorName || 'TexxxNopor'}: ${currentVideo?.title}`,
      });
    } catch (_) {}
  };

  const handleAddComment = () => {
    if (!newCommentText.trim()) return;
    const newC = {
      id: String(Date.now()),
      user: user?.username || 'Tú',
      text: newCommentText.trim(),
      time: 'justo ahora',
      likes: 0,
      avatar:
        user?.avatarUrl ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop',
    };
    setCommentsList([newC, ...commentsList]);
    setNewCommentText('');
  };

  const formatCounter = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return String(num);
  };

  // =========================================================================
  // RENDER: VISTA COMPUTADOR / PC (IMAGEN 1 EXACTA)
  // =========================================================================
  const renderDesktopView = () => {
    return (
      <View style={styles.desktopContainer}>
        {/* Cartel Superior: Para salir de la pantalla completa, mantén pulsado Esc */}
        <View style={styles.desktopTopBanner}>
          <TouchableOpacity
            style={styles.desktopEscPill}
            onPress={onBack}
            activeOpacity={0.85}
          >
            <Text style={styles.desktopEscText}>
              Para salir de la pantalla completa, mantén pulsado{' '}
            </Text>
            <View style={styles.desktopEscKeyBadge}>
              <Text style={styles.desktopEscKeyText}>Esc</Text>
            </View>
          </TouchableOpacity>

          {/* Botones y Perfil Superior Derecho */}
          <View style={styles.desktopTopRightControls}>
            <TouchableOpacity style={styles.desktopPillButton}>
              <Smartphone size={13} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.desktopPillButtonText}>Consigue la app</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.desktopPillButton}>
              <Sparkles size={13} color="#FFD700" style={{ marginRight: 6 }} />
              <Text style={styles.desktopPillButtonText}>Conseguir monedas</Text>
            </TouchableOpacity>

            {/* Selector de modo para probar celular en PC */}
            <TouchableOpacity
              style={[styles.desktopPillButton, styles.desktopSwitchPill]}
              onPress={() => setForceMode('MOBILE')}
            >
              <Smartphone size={13} color="#00F2FE" style={{ marginRight: 5 }} />
              <Text style={[styles.desktopPillButtonText, { color: '#00F2FE' }]}>
                Ver Modo Celular
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.desktopProfileAvatarBtn}
              onPress={() => onViewActor && onViewActor(currentVideo?.creatorId, currentVideo?.creatorName)}
            >
              <Image
                source={{
                  uri:
                    currentVideo?.creatorAvatar ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop',
                }}
                style={styles.desktopProfileAvatar as any}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Zona Central: Tarjeta de Video 9:16 + Barra Lateral de Acciones + Flechas */}
        <View style={styles.desktopContentRow}>
          {/* Tarjeta de Video 9:16 Estilo TikTok */}
          <View style={styles.desktopCardWrapper}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={handleDoubleTap}
              style={styles.desktopVideoTouchArea}
            >
              <Video
                source={{
                  uri:
                    currentVideo?.videoUrl ||
                    currentVideo?.hlsMasterUrl ||
                    'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
                }}
                style={styles.desktopVideo}
                resizeMode={ResizeMode.COVER}
                shouldPlay={isPlaying}
                isLooping
                isMuted={isMuted}
                onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
                  if (status.isLoaded && status.durationMillis) {
                    setProgress(status.positionMillis / status.durationMillis);
                  }
                }}
              />

              {/* Botón flotante Play/Pause al pausar */}
              {!isPlaying && (
                <View style={styles.desktopPlayPauseOverlay}>
                  <Play size={48} color="#FFFFFF" fill="#FFFFFF" />
                </View>
              )}

              {/* Corazones flotantes al hacer doble tap */}
              {floatingHearts.map((h) => (
                <Animated.View
                  key={h.id}
                  style={[
                    styles.floatingHeartItem,
                    { left: h.x - 24, top: h.y - 24 },
                  ]}
                >
                  <Heart size={48} color="#FF2D55" fill="#FF2D55" />
                </Animated.View>
              ))}

              {/* Cartel de Título Superior en Caja Blanca (como en imagen 1) */}
              <View style={styles.desktopTitleBadgeContainer}>
                <View style={styles.desktopTitleBadgeBox}>
                  <Text style={styles.desktopTitleBadgeText}>
                    {currentVideo?.title || 'Manual Breast Pump Guide'}
                  </Text>
                </View>
              </View>

              {/* Controles de Sonido Flotantes en Esquina Superior del Video */}
              <View style={styles.desktopVideoHeaderControls}>
                <TouchableOpacity
                  style={styles.desktopCircleIconBtn}
                  onPress={() => setIsMuted(!isMuted)}
                >
                  {isMuted ? (
                    <VolumeX size={16} color="#FFFFFF" />
                  ) : (
                    <Volume2 size={16} color="#FFFFFF" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.desktopCircleIconBtn}
                  onPress={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? (
                    <Pause size={16} color="#FFFFFF" />
                  ) : (
                    <Play size={16} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Overlay Inferior Izquierdo: Descripción, Más, Ver traducción, Audio */}
              <View style={styles.desktopBottomOverlay}>
                <Text
                  style={styles.desktopDescriptionText}
                  numberOfLines={showFullDesc ? undefined : 3}
                >
                  {currentVideo?.description ||
                    'This video demonstrates the use of a breast pump as part of normal lactation and postpartum care. This content is intended solely for educational and maternal wellness purposes.'}
                </Text>

                <View style={styles.desktopMoreRow}>
                  <Text style={styles.desktopOnlyYouTag}>Only you</Text>
                  <TouchableOpacity onPress={() => setShowFullDesc(!showFullDesc)}>
                    <Text style={styles.desktopMoreBtnText}>
                      {showFullDesc ? 'menos' : 'más'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Subtítulo / Ver traducción */}
                <View style={styles.desktopTranslationRow}>
                  <Text style={styles.desktopSubheaderTitle} numberOfLines={1}>
                    {currentVideo?.title}
                  </Text>
                  <TouchableOpacity>
                    <Text style={styles.desktopTranslationLink}>Ver traducción</Text>
                  </TouchableOpacity>
                </View>

                {/* Barra de Progreso Roja en la Base */}
                <View style={styles.desktopProgressBarTrack}>
                  <View
                    style={[
                      styles.desktopProgressBarFill,
                      { width: `${Math.max(4, progress * 100)}%` },
                    ]}
                  />
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Barra Lateral Derecha de Acciones */}
          <View style={styles.desktopActionSidebar}>
            {/* 1. Avatar del Creador con Botón Circular Rojo + */}
            <View style={styles.desktopAvatarActionWrapper}>
              <TouchableOpacity
                onPress={() => onViewActor && onViewActor(currentVideo?.creatorId, currentVideo?.creatorName)}
                style={styles.desktopCreatorAvatarTouch}
              >
                <Image
                  source={{
                    uri:
                      currentVideo?.creatorAvatar ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop',
                  }}
                  style={styles.desktopCreatorAvatarImg as any}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.desktopFollowBadge,
                  isFollowing && { backgroundColor: '#30D158' },
                ]}
                onPress={() => setIsFollowing(!isFollowing)}
              >
                {isFollowing ? (
                  <Check size={12} color="#FFFFFF" strokeWidth={3} />
                ) : (
                  <Plus size={12} color="#FFFFFF" strokeWidth={3} />
                )}
              </TouchableOpacity>
            </View>

            {/* 2. Me Gusta (740.8K) */}
            <View style={styles.desktopActionItem}>
              <TouchableOpacity
                style={styles.desktopActionCircleBtn}
                onPress={handleToggleLike}
                activeOpacity={0.8}
              >
                <Heart
                  size={24}
                  color={isLiked ? '#FF2D55' : '#FFFFFF'}
                  fill={isLiked ? '#FF2D55' : '#FFFFFF'}
                />
              </TouchableOpacity>
              <Text style={styles.desktopActionCountText}>
                {formatCounter(likesCount)}
              </Text>
            </View>

            {/* 3. Comentarios (7900) */}
            <View style={styles.desktopActionItem}>
              <TouchableOpacity
                style={styles.desktopActionCircleBtn}
                onPress={() => setShowComments(true)}
                activeOpacity={0.8}
              >
                <MessageCircle size={24} color="#FFFFFF" fill="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.desktopActionCountText}>
                {currentVideo?.commentsCount ? formatCounter(currentVideo.commentsCount) : '7900'}
              </Text>
            </View>

            {/* 4. Guardar / Bookmark (136K) */}
            <View style={styles.desktopActionItem}>
              <TouchableOpacity
                style={styles.desktopActionCircleBtn}
                onPress={handleToggleSave}
                activeOpacity={0.8}
              >
                <Bookmark
                  size={24}
                  color={isSaved ? '#FFD700' : '#FFFFFF'}
                  fill={isSaved ? '#FFD700' : '#FFFFFF'}
                />
              </TouchableOpacity>
              <Text style={styles.desktopActionCountText}>136K</Text>
            </View>

            {/* 5. Compartir (239.8K) */}
            <View style={styles.desktopActionItem}>
              <TouchableOpacity
                style={styles.desktopActionCircleBtn}
                onPress={handleShare}
                activeOpacity={0.8}
              >
                <Share2 size={24} color="#FFFFFF" fill="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.desktopActionCountText}>239.8K</Text>
            </View>

            {/* 6. Disco de Vinilo Giratorio con Avatar */}
            <Animated.View
              style={[
                styles.desktopVinylDiscContainer,
                { transform: [{ rotate: spin }] },
              ]}
            >
              <Image
                source={{
                  uri:
                    currentVideo?.creatorAvatar ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop',
                }}
                style={styles.desktopVinylDiscAvatar as any}
              />
            </Animated.View>
          </View>

          {/* Flechas de Navegación Vertical en Extremo Derecho */}
          <View style={styles.desktopNavArrowsCol}>
            <TouchableOpacity
              style={styles.desktopNavArrowBtn}
              onPress={goToPrevShort}
              activeOpacity={0.8}
            >
              <ChevronUp size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.desktopNavArrowBtn}
              onPress={goToNextShort}
              activeOpacity={0.8}
            >
              <ChevronDown size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // =========================================================================
  // RENDER: VISTA CELULAR / MÓVIL (IMAGEN 2 EXACTA)
  // =========================================================================
  const renderMobileView = () => {
    return (
      <View style={styles.mobileContainer} {...panResponder.panHandlers}>
        {/* Video a Pantalla Completa Vertical */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleVideoPress}
          style={styles.mobileVideoTouchWrapper}
        >
          <Video
            source={{
              uri:
                currentVideo?.videoUrl ||
                currentVideo?.hlsMasterUrl ||
                'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
            }}
            style={styles.mobileVideo}
            resizeMode={ResizeMode.COVER}
            shouldPlay={isPlaying}
            isLooping
            isMuted={isMuted}
            onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
              if (status.isLoaded && status.durationMillis) {
                setProgress(status.positionMillis / status.durationMillis);
              }
            }}
          />

          {!isPlaying && (
            <View style={styles.mobilePlayPauseIndicator}>
              <View style={styles.playPauseCircleBg}>
                <Play size={44} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 4 }} />
              </View>
            </View>
          )}

          {floatingHearts.map((h) => (
            <Animated.View
              key={h.id}
              style={[styles.floatingHeartItem, { left: h.x - 24, top: h.y - 24 }]}
            >
              <Heart size={54} color="#FF2D55" fill="#FF2D55" />
            </Animated.View>
          ))}
        </TouchableOpacity>

        {/* 1. Header Superior Móvil: Solo "Para ti" con botón volver a la izquierda */}
        <View style={styles.mobileHeaderBar}>
          <TouchableOpacity
            style={styles.mobileBackBtn}
            onPress={onBack}
            activeOpacity={0.8}
          >
            <ChevronLeft size={28} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.mobileTabsContainer}>
            <View style={styles.mobileTabItemActive}>
              <Text style={styles.mobileTabActiveText}>Para ti</Text>
              <View style={styles.mobileActiveUnderline} />
            </View>
          </View>

          <View style={styles.mobileHeaderRightRow}>
            <TouchableOpacity
              style={styles.mobileCircleIconBtn}
              onPress={() => setIsMuted(!isMuted)}
              activeOpacity={0.8}
            >
              {isMuted ? (
                <VolumeX size={18} color="#FFFFFF" />
              ) : (
                <Volume2 size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Columna Lateral Derecha de Acciones con Contadores Limpios/Dinámicos */}
        <View style={styles.mobileActionColumn}>
          {/* Avatar con Botón Circular Rojo + */}
          <View style={styles.mobileAvatarBox}>
            <TouchableOpacity
              onPress={() => onViewActor && onViewActor(currentVideo?.creatorId, currentVideo?.creatorName)}
              style={styles.mobileAvatarTouch}
            >
              <Image
                source={{
                  uri:
                    currentVideo?.creatorAvatar ||
                    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop',
                }}
                style={styles.mobileAvatarImg as any}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.mobileFollowPlusBadge,
                isFollowing && { backgroundColor: '#30D158' },
              ]}
              onPress={() => setIsFollowing(!isFollowing)}
            >
              {isFollowing ? (
                <Check size={11} color="#FFFFFF" strokeWidth={3} />
              ) : (
                <Plus size={11} color="#FFFFFF" strokeWidth={3} />
              )}
            </TouchableOpacity>
          </View>

          {/* Me Gusta (Reiniciado a valor real) */}
          <View style={styles.mobileActionItem}>
            <TouchableOpacity
              onPress={handleToggleLike}
              style={styles.mobileActionBtn}
              activeOpacity={0.8}
            >
              <Heart
                size={34}
                color={isLiked ? '#FF2D55' : '#FFFFFF'}
                fill={isLiked ? '#FF2D55' : '#FFFFFF'}
              />
            </TouchableOpacity>
            <Text style={styles.mobileActionText}>{formatCounter(likesCount)}</Text>
          </View>

          {/* Comentarios (Reiniciado a comentarios reales) */}
          <View style={styles.mobileActionItem}>
            <TouchableOpacity
              onPress={() => setShowComments(true)}
              style={styles.mobileActionBtn}
              activeOpacity={0.8}
            >
              <MessageCircle size={32} color="#FFFFFF" fill="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.mobileActionText}>{formatCounter(commentsList.length)}</Text>
          </View>

          {/* Favoritos / Guardar (Reiniciado a valor real) */}
          <View style={styles.mobileActionItem}>
            <TouchableOpacity
              onPress={handleToggleSave}
              style={styles.mobileActionBtn}
              activeOpacity={0.8}
            >
              <Bookmark
                size={32}
                color={isSaved ? '#FFD700' : '#FFFFFF'}
                fill={isSaved ? '#FFD700' : '#FFFFFF'}
              />
            </TouchableOpacity>
            <Text style={styles.mobileActionText}>{formatCounter(bookmarksCount)}</Text>
          </View>

          {/* Compartir (Reiniciado a valor real) */}
          <View style={styles.mobileActionItem}>
            <TouchableOpacity
              onPress={handleShare}
              style={styles.mobileActionBtn}
              activeOpacity={0.8}
            >
              <Share2 size={32} color="#FFFFFF" fill="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.mobileActionText}>{formatCounter(sharesCount)}</Text>
          </View>

          {/* Disco de Vinilo con Carátula Rotatoria */}
          <Animated.View
            style={[
              styles.mobileVinylContainer,
              { transform: [{ rotate: spin }] },
            ]}
          >
            <Image
              source={{
                uri:
                  currentVideo?.creatorAvatar ||
                  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop',
              }}
              style={styles.mobileVinylImage as any}
            />
          </Animated.View>
        </View>

        {/* 3. Overlay Inferior Izquierdo: @creador, título y hashtags */}
        <View style={styles.mobileBottomInfoOverlay}>
          <TouchableOpacity
            onPress={() => onViewActor && onViewActor(currentVideo?.creatorId, currentVideo?.creatorName)}
          >
            <Text style={styles.mobileUsernameText}>
              {currentVideo?.creatorName
                ? `@${currentVideo.creatorName.toLowerCase().replace(/\s+/g, '')}`
                : '@texxxnopor'}
            </Text>
          </TouchableOpacity>

          {currentVideo?.title ? (
            <Text style={styles.mobileTitleText} numberOfLines={2}>
              {currentVideo.title}
            </Text>
          ) : null}

          {currentVideo?.description && currentVideo.description !== currentVideo.title ? (
            <Text style={styles.mobileCaptionText} numberOfLines={2}>
              {currentVideo.description}
            </Text>
          ) : null}

          {/* Hashtags */}
          <View style={styles.mobileTagsRow}>
            {currentVideo?.tags && currentVideo.tags.length > 0 ? (
              currentVideo.tags.map((tag, idx) => (
                <Text key={idx} style={styles.mobileTagText}>
                  {tag.startsWith('#') ? tag : `#${tag}`}{' '}
                </Text>
              ))
            ) : (
              <Text style={styles.mobileTagText}>#parati #shorts #texxxnopor</Text>
            )}
          </View>
        </View>

        {/* Barra de Progreso Scrubber del Video en la Base */}
        <View style={styles.mobileProgressLineTrack}>
          <View
            style={[
              styles.mobileProgressLineFill,
              { width: `${Math.max(2, progress * 100)}%` },
            ]}
          />
        </View>
      </View>
    );
  };

  // =========================================================================
  // RENDER: MODAL DRAWER DE COMENTARIOS
  // =========================================================================
  const renderCommentsDrawer = () => {
    if (!showComments) return null;

    return (
      <View style={styles.commentsBackdrop}>
        <TouchableOpacity
          style={styles.commentsBackdropTouch}
          activeOpacity={1}
          onPress={() => setShowComments(false)}
        />
        <View
          style={[
            styles.commentsDrawerContent,
            isDesktop && styles.commentsDrawerContentDesktop,
          ]}
        >
          <View style={styles.commentsHeader}>
            <View style={{ width: 24 }} />
            <Text style={styles.commentsHeaderTitle}>
              {commentsList.length} comentarios
            </Text>
            <TouchableOpacity
              onPress={() => setShowComments(false)}
              style={styles.commentsCloseBtn}
            >
              <X size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.commentsScroll}
            showsVerticalScrollIndicator={false}
          >
            {commentsList.map((c) => (
              <View key={c.id} style={styles.commentRow}>
                <Image source={{ uri: c.avatar }} style={styles.commentAvatar as any} />
                <View style={styles.commentTextCol}>
                  <Text style={styles.commentAuthor}>{c.user}</Text>
                  <Text style={styles.commentBody}>{c.text}</Text>
                  <View style={styles.commentMetaRow}>
                    <Text style={styles.commentTime}>{c.time}</Text>
                    <Text style={styles.commentReplyBtn}>Responder</Text>
                  </View>
                </View>
                <View style={styles.commentLikeCol}>
                  <Heart size={14} color="#8E8E93" />
                  <Text style={styles.commentLikeCount}>{c.likes}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.commentInputRow}>
            <TextInput
              style={styles.commentTextInput}
              placeholder="Añadir comentario..."
              placeholderTextColor="#8E8E93"
              value={newCommentText}
              onChangeText={setNewCommentText}
              onSubmitEditing={handleAddComment}
            />
            <TouchableOpacity
              style={[
                styles.commentSendBtn,
                newCommentText.trim().length > 0 && styles.commentSendBtnActive,
              ]}
              onPress={handleAddComment}
            >
              <Send size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.rootContainer}>
      {isDesktop ? renderDesktopView() : renderMobileView()}
      {renderCommentsDrawer()}
    </View>
  );
};

// =========================================================================
// ESTILOS
// =========================================================================
const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },

  // ESTILOS DESKTOP (IMAGEN 1)
  desktopContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  desktopTopBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
    marginBottom: 8,
  },
  desktopEscPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(28, 28, 36, 0.92)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A2A38',
  },
  desktopEscText: {
    color: '#D8D8E0',
    fontSize: 13,
  },
  desktopEscKeyBadge: {
    backgroundColor: '#101016',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#3E3E50',
    marginLeft: 4,
  },
  desktopEscKeyText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  desktopTopRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  desktopPillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E28',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2E2E3E',
  },
  desktopPillButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  desktopSwitchPill: {
    borderColor: '#00F2FE',
    backgroundColor: 'rgba(0, 242, 254, 0.1)',
  },
  desktopProfileAvatarBtn: {
    padding: 2,
  },
  desktopProfileAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  desktopContentRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  desktopCardWrapper: {
    width: 440,
    height: '92%',
    maxHeight: 740,
    backgroundColor: '#101016',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#22222E',
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  desktopVideoTouchArea: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  desktopVideo: {
    width: '100%',
    height: '100%',
  },
  desktopPlayPauseOverlay: {
    position: 'absolute',
    top: '45%',
    left: '50%',
    transform: [{ translateX: -30 }, { translateY: -30 }],
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopTitleBadgeContainer: {
    position: 'absolute',
    top: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  desktopTitleBadgeBox: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 22,
    borderRadius: 6,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  desktopTitleBadgeText: {
    color: '#000000',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  desktopVideoHeaderControls: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    gap: 8,
    zIndex: 6,
  },
  desktopCircleIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopBottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  desktopDescriptionText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    marginBottom: 4,
  },
  desktopMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  desktopOnlyYouTag: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
  },
  desktopMoreBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  desktopTranslationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  desktopSubheaderTitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    flex: 1,
    marginRight: 8,
  },
  desktopTranslationLink: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  desktopProgressBarTrack: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  desktopProgressBarFill: {
    height: '100%',
    backgroundColor: '#FF2D55',
  },
  desktopActionSidebar: {
    alignItems: 'center',
    gap: 16,
    paddingBottom: 20,
  },
  desktopAvatarActionWrapper: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 4,
  },
  desktopCreatorAvatarTouch: {
    padding: 2,
  },
  desktopCreatorAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  desktopFollowBadge: {
    position: 'absolute',
    bottom: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF2D55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopActionItem: {
    alignItems: 'center',
    gap: 4,
  },
  desktopActionCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(40, 40, 50, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopActionCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  desktopVinylDiscContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#111116',
    borderWidth: 7,
    borderColor: '#22222E',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  desktopVinylDiscAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  desktopNavArrowsCol: {
    gap: 14,
    marginLeft: 10,
  },
  desktopNavArrowBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(34, 34, 44, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#383848',
  },

  // ESTILOS CELULAR (IMAGEN 2)
  mobileContainer: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
  },
  mobileVideoTouchWrapper: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mobileVideo: {
    width: '100%',
    height: '100%',
  },
  mobilePlayPauseIndicator: {
    position: 'absolute',
    top: '46%',
    left: '50%',
    transform: [{ translateX: -37 }, { translateY: -37 }],
    zIndex: 30,
  },
  playPauseCircleBg: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  floatingHeartItem: {
    position: 'absolute',
    zIndex: 99,
  },
  mobileHeaderBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 26,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  mobileBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileTabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileTabItemActive: {
    position: 'relative',
    paddingVertical: 4,
    alignItems: 'center',
  },
  mobileTabActiveText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowRadius: 4,
  },
  mobileActiveUnderline: {
    position: 'absolute',
    bottom: -3,
    width: 28,
    height: 3,
    backgroundColor: '#FF2D55',
    borderRadius: 2,
  },
  mobileHeaderRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mobileCircleIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileActionColumn: {
    position: 'absolute',
    right: 12,
    bottom: 24,
    alignItems: 'center',
    gap: 16,
    zIndex: 20,
  },
  mobileAvatarBox: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 4,
  },
  mobileAvatarTouch: {
    padding: 2,
  },
  mobileAvatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  mobileFollowPlusBadge: {
    position: 'absolute',
    bottom: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF2D55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileActionItem: {
    alignItems: 'center',
    gap: 3,
  },
  mobileActionBtn: {
    padding: 2,
  },
  mobileActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowRadius: 4,
  },
  mobileVinylContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#111116',
    borderWidth: 8,
    borderColor: '#22222E',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  mobileVinylImage: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  mobileBottomInfoOverlay: {
    position: 'absolute',
    left: 14,
    bottom: 18,
    right: 86,
    zIndex: 20,
  },
  mobileUsernameText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 5,
  },
  mobileTitleText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 5,
  },
  mobileCaptionText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 17,
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 5,
  },
  mobileTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  mobileTagText: {
    color: '#FF2D55',
    fontSize: 13,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 5,
  },
  mobileProgressLineTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    zIndex: 25,
  },
  mobileProgressLineFill: {
    height: '100%',
    backgroundColor: '#FF2D55',
  },
  mobileTikTokTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 56,
    backgroundColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 0.5,
    borderTopColor: '#1A1A22',
    zIndex: 25,
  },
  mobileTabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  mobileTabButtonText: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: 'bold',
  },
  mobileTikTokCreateBtn: {
    width: 44,
    height: 28,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileCreateBtnCyanWing: {
    position: 'absolute',
    left: 2,
    width: 38,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#00F2FE',
  },
  mobileCreateBtnPinkWing: {
    position: 'absolute',
    right: 2,
    width: 38,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FF2D55',
  },
  mobileCreateBtnCenter: {
    width: 36,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // MODAL DRAWER DE COMENTARIOS
  commentsBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 100,
    justifyContent: 'flex-end',
  },
  commentsBackdropTouch: {
    flex: 1,
  },
  commentsDrawerContent: {
    backgroundColor: '#16161E',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    height: '62%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  commentsDrawerContentDesktop: {
    alignSelf: 'center',
    width: 480,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    height: '70%',
    marginBottom: 'auto',
    marginTop: 'auto',
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#242432',
  },
  commentsHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  commentsCloseBtn: {
    padding: 4,
  },
  commentsScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  commentRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  commentTextCol: {
    flex: 1,
  },
  commentAuthor: {
    color: '#A0A0B0',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  commentBody: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  commentMetaRow: {
    flexDirection: 'row',
    gap: 14,
  },
  commentTime: {
    color: '#707080',
    fontSize: 11,
  },
  commentReplyBtn: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: 'bold',
  },
  commentLikeCol: {
    alignItems: 'center',
    gap: 2,
  },
  commentLikeCount: {
    color: '#8E8E93',
    fontSize: 11,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#242432',
  },
  commentTextInput: {
    flex: 1,
    backgroundColor: '#242430',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 13,
  },
  commentSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3E3E50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentSendBtnActive: {
    backgroundColor: '#FF2D55',
  },
});
