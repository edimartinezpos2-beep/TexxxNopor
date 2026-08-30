import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Modal,
  Dimensions,
  StatusBar,
  Animated,
  Platform,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import Slider from '@react-native-community/slider';
import * as ScreenOrientation from 'expo-screen-orientation';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize2,
  Minimize2,
  Settings,
  AlertCircle,
  ChevronLeft,
  Volume2,
  VolumeX,
  Scan,
  Maximize,
  Tv,
} from 'lucide-react-native';

const { width: INITIAL_WIDTH, height: INITIAL_HEIGHT } = Dimensions.get('window');

export interface HLSVideoPlayerProps {
  hlsMasterUrl: string;
  videoUrl?: string;
  posterUrl?: string;
  title?: string;
  onBack?: () => void;
  autoPlay?: boolean;
}

export const HLSVideoPlayer: React.FC<HLSVideoPlayerProps> = ({
  hlsMasterUrl,
  videoUrl,
  posterUrl,
  title = 'Video TexxxNopor',
  onBack,
  autoPlay = true,
}) => {
  const videoRef = useRef<Video>(null);
  const containerRef = useRef<View>(null);

  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  // Estados de Reproducción
  const [paused, setPaused] = useState(!autoPlay);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Estados de UI y Pantalla Completa
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [resizeModeIndex, setResizeModeIndex] = useState<number>(0);
  const [modeFeedbackText, setModeFeedbackText] = useState<string | null>(null);

  const resizeModes: { mode: ResizeMode; label: string }[] = [
    { mode: ResizeMode.CONTAIN, label: 'Ajustar (Original)' },
    { mode: ResizeMode.COVER, label: 'Llenar Pantalla' },
    { mode: ResizeMode.STRETCH, label: 'Estirar Completo' },
  ];

  const currentResizeMode = resizeModes[resizeModeIndex].mode;

  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimer = useRef<NodeJS.Timeout | null>(null);

  // Determinar fuente de reproducción real del video
  const playSource = videoUrl || hlsMasterUrl || '';
  const [currentSource, setCurrentSource] = useState<string>(playSource);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  // Soporte Fullscreen en Web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const handleFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
      };
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
      return () => {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      };
    }
  }, []);

  useEffect(() => {
    setCurrentSource(videoUrl || hlsMasterUrl || '');
    setCurrentTime(0);
    setHasError(false);
    resetHideControlsTimer();
    return () => {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      try {
        ScreenOrientation.unlockAsync();
      } catch (_) {}
    };
  }, [videoUrl, hlsMasterUrl]);

  const resetHideControlsTimer = () => {
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    Animated.timing(controlsOpacity, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
    setShowControls(true);

    hideControlsTimer.current = setTimeout(() => {
      if (!paused) {
        Animated.timing(controlsOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start(() => setShowControls(false));
      }
    }, 4000);
  };

  const toggleControls = () => {
    if (showControls) {
      Animated.timing(controlsOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setShowControls(false));
    } else {
      resetHideControlsTimer();
    }
  };

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if ('error' in status && status.error) {
        console.log(`[Player Status] Error reproduciendo ${currentSource}:`, status.error);
        setHasError(true);
      }
      return;
    }

    setHasError(false);
    setIsBuffering(status.isBuffering);
    setCurrentTime(Math.floor(status.positionMillis / 1000));
    if (status.durationMillis) {
      setDuration(Math.floor(status.durationMillis / 1000));
    }
    setPaused(!status.isPlaying);
  };

  const handlePlayPause = async () => {
    if (!videoRef.current) return;
    if (paused) {
      await videoRef.current.playAsync();
    } else {
      await videoRef.current.pauseAsync();
    }
    resetHideControlsTimer();
  };

  const handleSeek = async (value: number) => {
    if (!videoRef.current) return;
    await videoRef.current.setPositionAsync(value * 1000);
    resetHideControlsTimer();
  };

  const handleSkip = async (seconds: number) => {
    if (!videoRef.current) return;
    const nextTime = Math.max(0, Math.min(duration, currentTime + seconds));
    await videoRef.current.setPositionAsync(nextTime * 1000);
    resetHideControlsTimer();
  };

  const toggleMute = async () => {
    if (!videoRef.current) return;
    const next = !isMuted;
    setIsMuted(next);
    await videoRef.current.setIsMutedAsync(next);
  };

  // Alternar Modo de Ajuste / Pantalla Completa de Video (Contain / Cover / Stretch)
  const cycleResizeMode = () => {
    const nextIdx = (resizeModeIndex + 1) % resizeModes.length;
    setResizeModeIndex(nextIdx);
    const label = resizeModes[nextIdx].label;
    setModeFeedbackText(label);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => {
      setModeFeedbackText(null);
    }, 2000);
    resetHideControlsTimer();
  };

  // Alternar Pantalla Completa (Web y Nativo Android/iOS)
  const toggleFullscreen = async () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        if (!document.fullscreenElement) {
          const elem =
            document.getElementById('texxx-fullscreen-container') ||
            document.querySelector('video') ||
            document.documentElement;
          if (elem?.requestFullscreen) {
            await elem.requestFullscreen();
          } else if ((elem as any)?.webkitRequestFullscreen) {
            await (elem as any).webkitRequestFullscreen();
          }
          setIsFullscreen(true);
        } else {
          if (document.exitFullscreen) {
            await document.exitFullscreen();
          } else if ((document as any)?.webkitExitFullscreen) {
            await (document as any).webkitExitFullscreen();
          }
          setIsFullscreen(false);
        }
      } catch (err) {
        console.log('Error toggling web fullscreen:', err);
      }
      return;
    }

    // Nativo Mobile
    if (isFullscreen) {
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      } catch (_) {}
      setIsFullscreen(false);
      if (videoRef.current) {
        try {
          await videoRef.current.dismissFullscreenPlayer();
        } catch (_) {}
      }
    } else {
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_LEFT);
      } catch (_) {}
      setIsFullscreen(true);
      if (videoRef.current) {
        try {
          await videoRef.current.presentFullscreenPlayer();
        } catch (_) {}
      }
    }
  };

  const changeRate = async (rate: number) => {
    if (!videoRef.current) return;
    setPlaybackRate(rate);
    await videoRef.current.setRateAsync(rate, true);
    setShowSettingsModal(false);
  };

  const formatTime = (timeInSec: number) => {
    const minutes = Math.floor(timeInSec / 60);
    const seconds = Math.floor(timeInSec % 60);
    return `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Altura responsiva adaptativa: en computadores/web se adapta en proporción 16:9 amplia
  const screenW = dimensions.width;
  const screenH = dimensions.height;
  const isWebWide = screenW > 768;
  const responsiveHeight = isWebWide
    ? Math.min(screenH * 0.75, (screenW * 9) / 16, 560)
    : Math.min(screenH * 0.45, (screenW * 9) / 16, 280);

  return (
    <View
      ref={containerRef}
      // @ts-ignore
      nativeID="texxx-fullscreen-container"
      style={[
        styles.container,
        { height: responsiveHeight },
        isFullscreen && styles.fullscreenContainer,
      ]}
    >
      {Platform.OS === 'web' && (
        // @ts-ignore
        <style>{`
          #texxx-fullscreen-container {
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
          }
          #texxx-fullscreen-container video,
          video {
            width: 100% !important;
            height: 100% !important;
            object-fit: ${
              currentResizeMode === ResizeMode.COVER
                ? 'cover'
                : currentResizeMode === ResizeMode.STRETCH
                ? 'fill'
                : 'contain'
            } !important;
            margin: 0 auto !important;
            display: block !important;
            position: relative !important;
            left: 0 !important;
            right: 0 !important;
            top: 0 !important;
            bottom: 0 !important;
          }
        `}</style>
      )}
      <StatusBar hidden={isFullscreen} barStyle="light-content" />
      <TouchableWithoutFeedback onPress={toggleControls}>
        <View style={styles.videoWrapper}>
          <Video
            ref={videoRef}
            source={{ uri: currentSource }}
            style={styles.video}
            videoStyle={
              {
                width: '100%',
                height: '100%',
                objectFit:
                  currentResizeMode === ResizeMode.COVER
                    ? 'cover'
                    : currentResizeMode === ResizeMode.STRETCH
                    ? 'fill'
                    : 'contain',
                margin: '0 auto',
              } as any
            }
            resizeMode={currentResizeMode}
            shouldPlay={autoPlay}
            isMuted={isMuted}
            usePoster={!!posterUrl}
            posterSource={posterUrl ? { uri: posterUrl } : undefined}
            posterStyle={{ resizeMode: 'cover' }}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            progressUpdateIntervalMillis={500}
          />

          {/* Feedback Visual del Modo de Ajuste (Toast Overlay) */}
          {modeFeedbackText && (
            <View style={styles.modeFeedbackBadge}>
              <Text style={styles.modeFeedbackBadgeText}>{modeFeedbackText}</Text>
            </View>
          )}

          {/* Buffer Indicator */}
          {isBuffering && !hasError && (
            <View style={styles.centerOverlay}>
              <ActivityIndicator size="large" color="#FF2D55" />
            </View>
          )}

          {/* Error Fallback con botón de reintentar */}
          {hasError && (
            <View style={styles.centerOverlay}>
              <AlertCircle size={40} color="#FF3B30" />
              <Text style={styles.errorText}>No se pudo reproducir este formato de video</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => {
                  setHasError(false);
                  setCurrentSource('https://vjs.zencdn.net/v/oceans.mp4');
                }}
              >
                <Text style={styles.retryBtnText}>Reintentar con Stream Seguro</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Controls Overlay */}
          {showControls && (
            <Animated.View style={[styles.controlsOverlay, { opacity: controlsOpacity }]}>
              {/* Top Bar with Settings and Fullscreen */}
              <View style={styles.topBar}>
                {isFullscreen && (
                  <TouchableOpacity onPress={toggleFullscreen} style={styles.iconButton}>
                    <ChevronLeft size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
                <Text style={styles.videoTitle} numberOfLines={1}>
                  {title}
                </Text>
                <View style={styles.topRightControls}>
                  {/* Botón Silenciar / Desilenciar */}
                  <TouchableOpacity onPress={toggleMute} style={styles.iconButton}>
                    {isMuted ? (
                      <VolumeX size={18} color="#FF3B30" />
                    ) : (
                      <Volume2 size={18} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>

                  {/* Botón Ajustar / Llenar Pantalla (Resize Mode) */}
                  <TouchableOpacity
                    onPress={cycleResizeMode}
                    style={[
                      styles.iconButton,
                      resizeModeIndex !== 0 && { backgroundColor: 'rgba(255, 45, 85, 0.4)' },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Scan size={18} color={resizeModeIndex !== 0 ? '#FF2D55' : '#FFFFFF'} />
                  </TouchableOpacity>

                  {/* Botón Velocidad / Calidad */}
                  <TouchableOpacity
                    onPress={() => setShowSettingsModal(true)}
                    style={styles.iconButton}
                  >
                    <Settings size={18} color="#FFFFFF" />
                  </TouchableOpacity>

                  {/* Botón Pantalla Completa */}
                  <TouchableOpacity onPress={toggleFullscreen} style={styles.iconButton}>
                    {isFullscreen ? (
                      <Minimize2 size={18} color="#FF2D55" />
                    ) : (
                      <Maximize2 size={18} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Center Play/Pause & Skip Controls */}
              <View style={styles.centerControls}>
                <TouchableOpacity onPress={() => handleSkip(-10)} style={styles.skipButton}>
                  <SkipBack size={26} color="#FFFFFF" />
                  <Text style={styles.skipText}>-10s</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handlePlayPause} style={styles.mainPlayButton}>
                  {paused ? (
                    <Play size={34} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 4 }} />
                  ) : (
                    <Pause size={34} color="#FFFFFF" fill="#FFFFFF" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => handleSkip(10)} style={styles.skipButton}>
                  <SkipForward size={26} color="#FFFFFF" />
                  <Text style={styles.skipText}>+10s</Text>
                </TouchableOpacity>
              </View>

              {/* Bottom Scrub Bar & Time */}
              <View style={styles.bottomBar}>
                <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={duration > 0 ? duration : 100}
                  value={currentTime}
                  onSlidingComplete={handleSeek}
                  minimumTrackTintColor="#FF2D55"
                  maximumTrackTintColor="rgba(255, 255, 255, 0.3)"
                  thumbTintColor="#FF2D55"
                />
                <Text style={styles.timeText}>{formatTime(duration)}</Text>

                {/* Botón de Pantalla Completa en la barra inferior */}
                <TouchableOpacity onPress={toggleFullscreen} style={styles.bottomFullscreenBtn}>
                  {isFullscreen ? (
                    <Minimize2 size={16} color="#FF2D55" />
                  ) : (
                    <Maximize2 size={16} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </View>
      </TouchableWithoutFeedback>

      {/* Settings Modal (Speed, Rate) */}
      <Modal visible={showSettingsModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowSettingsModal(false)}
        >
          <View style={styles.settingsSheet}>
            <Text style={styles.settingsTitle}>Velocidad de Reproducción</Text>
            {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
              <TouchableOpacity
                key={rate}
                style={[styles.rateOption, playbackRate === rate && styles.rateOptionActive]}
                onPress={() => changeRate(rate)}
              >
                <Text
                  style={[styles.rateText, playbackRate === rate && styles.rateTextActive]}
                >
                  {rate === 1.0 ? 'Normal (1.0x)' : `${rate}x`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  fullscreenContainer: {
    position: Platform.OS === 'web' ? ('fixed' as any) : 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 99999,
  },
  videoWrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  modeFeedbackBadge: {
    position: 'absolute',
    top: 55,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF2D55',
    zIndex: 20,
  },
  modeFeedbackBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 10,
  },
  errorText: {
    color: '#FFFFFF',
    marginTop: 8,
    fontSize: 13,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 10,
    backgroundColor: '#FF2D55',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'space-between',
    padding: 12,
    zIndex: 15,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  videoTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 10,
  },
  topRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 7,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  centerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  mainPlayButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF2D55',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#FF2D55',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  skipButton: {
    alignItems: 'center',
    padding: 8,
  },
  skipText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  slider: {
    flex: 1,
    height: 30,
  },
  bottomFullscreenBtn: {
    padding: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  settingsSheet: {
    backgroundColor: '#16161C',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 34,
    borderWidth: 1,
    borderColor: '#262632',
  },
  settingsTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  rateOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#24242E',
  },
  rateOptionActive: {
    backgroundColor: 'rgba(255, 45, 85, 0.12)',
  },
  rateText: {
    color: '#D0D0D8',
    fontSize: 14,
  },
  rateTextActive: {
    color: '#FF2D55',
    fontWeight: 'bold',
  },
});
