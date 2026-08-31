import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  Animated,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, Heart, Flame, Sparkles, Send, CheckCircle2, Eye, Plus } from 'lucide-react-native';
import { ActorStoryGroup, StorySlide, api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SLIDE_DURATION_MS = 5000;

interface StoryViewerModalProps {
  visible: boolean;
  storyGroups: ActorStoryGroup[];
  initialGroupIndex?: number;
  onClose: () => void;
  onViewActor?: (actorId?: string, actorName?: string) => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  visible,
  storyGroups,
  initialGroupIndex = 0,
  onClose,
  onViewActor,
}) => {
  const { userToken, user } = useAuth();
  const [currentGroupIdx, setCurrentGroupIdx] = useState(initialGroupIndex);
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [reactionText, setReactionText] = useState('');
  const [isSendingReaction, setIsSendingReaction] = useState(false);
  const [reactionSentToast, setReactionSentToast] = useState<string | null>(null);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  const currentGroup = storyGroups[currentGroupIdx] || null;
  const currentSlide: StorySlide | null = currentGroup?.stories?.[currentSlideIdx] || null;

  // Sincronizar índice inicial al abrir
  useEffect(() => {
    if (visible) {
      setCurrentGroupIdx(initialGroupIndex);
      setCurrentSlideIdx(0);
    }
  }, [visible, initialGroupIndex]);

  // Marcar como vista la historia actual
  useEffect(() => {
    if (visible && currentSlide) {
      api.stories.markSeen(currentSlide.id, user?.id);
    }
  }, [visible, currentSlide, user?.id]);

  // Manejar animación de la barra de progreso
  useEffect(() => {
    if (!visible || !currentSlide || isPaused) return;

    progressAnim.setValue(0);
    const animation = Animated.timing(progressAnim, {
      toValue: 1,
      duration: SLIDE_DURATION_MS,
      useNativeDriver: false,
    });

    progressAnimationRef.current = animation;
    animation.start(({ finished }) => {
      if (finished) {
        goToNextSlide();
      }
    });

    return () => {
      animation.stop();
    };
  }, [visible, currentGroupIdx, currentSlideIdx, isPaused]);

  const goToNextSlide = () => {
    if (!currentGroup) return;

    if (currentSlideIdx < currentGroup.stories.length - 1) {
      setCurrentSlideIdx((prev) => prev + 1);
    } else if (currentGroupIdx < storyGroups.length - 1) {
      setCurrentGroupIdx((prev) => prev + 1);
      setCurrentSlideIdx(0);
    } else {
      onClose();
    }
  };

  const goToPrevSlide = () => {
    if (currentSlideIdx > 0) {
      setCurrentSlideIdx((prev) => prev - 1);
    } else if (currentGroupIdx > 0) {
      const prevGroup = storyGroups[currentGroupIdx - 1];
      setCurrentGroupIdx((prev) => prev - 1);
      setCurrentSlideIdx(prevGroup.stories.length - 1);
    }
  };

  const handleScreenTouch = (evt: any) => {
    const x = evt.nativeEvent.locationX;
    if (x < SCREEN_WIDTH * 0.35) {
      goToPrevSlide();
    } else {
      goToNextSlide();
    }
  };

  const handleSendQuickReaction = async (emoji: string) => {
    if (!currentSlide || !userToken) {
      Alert.alert('Acceso Requerido', 'Inicia sesión para enviar reacciones a las historias.');
      return;
    }

    setReactionSentToast(emoji);
    setTimeout(() => setReactionSentToast(null), 1800);

    try {
      await api.stories.sendReaction(userToken, currentSlide.id, emoji);
    } catch (_) {}
  };

  const handleSendCustomReply = async () => {
    if (!reactionText.trim() || !currentSlide || !userToken) return;

    setIsSendingReaction(true);
    try {
      await api.stories.sendReaction(userToken, currentSlide.id, reactionText.trim());
      setReactionText('');
      setReactionSentToast('Mensaje enviado 💬');
      setTimeout(() => setReactionSentToast(null), 1800);
    } catch (_) {
    } finally {
      setIsSendingReaction(false);
    }
  };

  if (!visible || !currentGroup || !currentSlide) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.container}>
        {/* Imagen / Fondo de la Historia */}
        <Image
          source={{ uri: currentSlide.mediaUrl }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
        <View style={styles.darkGradientOverlay} />

        {/* Zona de Toque (Izquierda / Derecha / Pausa en Hold) */}
        <TouchableWithoutFeedback
          onPress={handleScreenTouch}
          onPressIn={() => setIsPaused(true)}
          onPressOut={() => setIsPaused(false)}
        >
          <View style={styles.touchArea} />
        </TouchableWithoutFeedback>

        {/* 1. Barras de Progreso Superiores */}
        <View style={styles.progressContainer}>
          {currentGroup.stories.map((slide, idx) => {
            let widthInterpolated: any = '0%';
            if (idx < currentSlideIdx) {
              widthInterpolated = '100%';
            } else if (idx === currentSlideIdx) {
              widthInterpolated = progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              });
            }

            return (
              <View key={slide.id || idx} style={styles.progressBarBackground}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    {
                      width: widthInterpolated,
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>

        {/* 2. Cabecera con Información de la Actriz / Creador */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.actorInfoRow}
            onPress={() => {
              onClose();
              onViewActor?.(currentGroup.actorId, currentGroup.actorName);
            }}
            activeOpacity={0.8}
          >
            <Image source={{ uri: currentGroup.actorAvatar }} style={styles.actorAvatar} />
            <View style={{ marginLeft: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.actorName}>{currentGroup.actorName}</Text>
                {currentGroup.isVerified && (
                  <CheckCircle2 size={13} color="#0084FF" fill="#0084FF" />
                )}
              </View>
              <Text style={styles.timeAgoText}>Historia de 24 horas</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.8}>
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Toast animado de reacción */}
        {reactionSentToast && (
          <View style={styles.reactionToast}>
            <Text style={styles.reactionToastText}>{reactionSentToast}</Text>
          </View>
        )}

        {/* 3. Pie de la Historia (Pie de foto + Reacciones Rápidas) */}
        <View style={styles.footer}>
          {currentSlide.caption ? (
            <View style={styles.captionBox}>
              <Text style={styles.captionText}>{currentSlide.caption}</Text>
            </View>
          ) : null}

          {/* Botones de Reacción Rápida Flotantes */}
          <View style={styles.quickReactionsRow}>
            {['🔥', '❤️', '💋', '🔞', '✨'].map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={styles.reactionEmojiBtn}
                onPress={() => handleSendQuickReaction(emoji)}
                activeOpacity={0.7}
              >
                <Text style={styles.reactionEmojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Campo para responder / comentar */}
          <View style={styles.replyBar}>
            <TextInput
              style={styles.replyInput}
              placeholder={`Responder a ${currentGroup.actorName}...`}
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={reactionText}
              onChangeText={setReactionText}
              onFocus={() => setIsPaused(true)}
              onBlur={() => setIsPaused(false)}
            />
            {reactionText.length > 0 && (
              <TouchableOpacity
                style={styles.sendReplyBtn}
                onPress={handleSendCustomReply}
                disabled={isSendingReaction}
              >
                {isSendingReaction ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Send size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'space-between',
  },
  darkGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  touchArea: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  progressContainer: {
    flexDirection: 'row',
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 25,
    paddingHorizontal: 12,
    gap: 5,
    zIndex: 10,
  },
  progressBarBackground: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    zIndex: 10,
  },
  actorInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#FF2D55',
  },
  actorName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  timeAgoText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  reactionToast: {
    position: 'absolute',
    top: '45%',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#FF2D55',
    zIndex: 20,
  },
  reactionToastText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    zIndex: 10,
    gap: 12,
  },
  captionBox: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FF2D55',
  },
  captionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 19,
  },
  quickReactionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  reactionEmojiBtn: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  reactionEmojiText: {
    fontSize: 22,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  replyInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    paddingVertical: 8,
  },
  sendReplyBtn: {
    backgroundColor: '#FF2D55',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});
