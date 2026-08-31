import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { Sparkles, Flame, Heart } from 'lucide-react-native';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface Particle {
  id: string;
  emoji: string;
  startX: number;
  animY: Animated.Value;
  animX: Animated.Value;
  animOpacity: Animated.Value;
  animScale: Animated.Value;
}

interface LiveFloatingReactionsProps {
  videoId: string;
  isOverlay?: boolean;
}

const REACTION_EMOJIS = [
  { emoji: '🔥', label: 'Fuego', color: '#FF2D55' },
  { emoji: '💋', label: 'Beso', color: '#FF375F' },
  { emoji: '🔞', label: '18+', color: '#FF9500' },
  { emoji: '✨', label: '4K HD', color: '#FFD700' },
  { emoji: '❤️', label: 'Amor', color: '#FF2D55' },
  { emoji: '💦', label: 'Pasión', color: '#0A84FF' },
];

export const LiveFloatingReactions: React.FC<LiveFloatingReactionsProps> = ({
  videoId,
  isOverlay = false,
}) => {
  const { user, userToken } = useAuth();
  const [particles, setParticles] = useState<Particle[]>([]);
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({
    '🔥': 145,
    '💋': 88,
    '🔞': 270,
    '✨': 95,
    '❤️': 160,
    '💦': 120,
  });

  // Cargar conteo inicial de reacciones
  useEffect(() => {
    let isMounted = true;
    api.videos.getReactions(videoId).then((data) => {
      if (isMounted && data) {
        setReactionCounts(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [videoId]);

  const handlePressEmoji = (emojiObj: { emoji: string; label: string; color: string }, originX?: number) => {
    const emoji = emojiObj.emoji;

    // 1. Incrementar contador reactivo
    setReactionCounts((prev) => ({
      ...prev,
      [emoji]: (prev[emoji] || 0) + 1,
    }));

    // 2. Disparar API en segundo plano
    api.videos.sendReaction(videoId, emoji, user?.id).catch(() => {});

    // 3. Generar 3-4 partículas con física ascendente aleatoria
    const burstCount = Math.floor(Math.random() * 2) + 3;
    const newParticles: Particle[] = [];

    for (let i = 0; i < burstCount; i++) {
      const particleId = `p_${Date.now()}_${Math.random()}`;
      const randomOffsetX = (Math.random() - 0.5) * 60;
      const randomTargetX = (Math.random() - 0.5) * 120;
      const randomDuration = 1600 + Math.random() * 600;

      const animY = new Animated.Value(0);
      const animX = new Animated.Value(randomOffsetX);
      const animOpacity = new Animated.Value(1);
      const animScale = new Animated.Value(0.4);

      const p: Particle = {
        id: particleId,
        emoji,
        startX: originX || 0,
        animY,
        animX,
        animOpacity,
        animScale,
      };

      newParticles.push(p);

      // Lanzar animación
      Animated.parallel([
        Animated.timing(animY, {
          toValue: -260 - Math.random() * 60,
          duration: randomDuration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(animX, {
          toValue: randomTargetX,
          duration: randomDuration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(animScale, {
            toValue: 1.3,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(animScale, {
            toValue: 0.9,
            duration: randomDuration - 250,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(randomDuration * 0.45),
          Animated.timing(animOpacity, {
            toValue: 0,
            duration: randomDuration * 0.55,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        // Limpiar partícula tras terminar
        setParticles((prev) => prev.filter((item) => item.id !== particleId));
      });
    }

    setParticles((prev) => [...prev, ...newParticles]);
  };

  return (
    <View style={[styles.wrapper, isOverlay && styles.overlayWrapper]}>
      {/* Contenedor Flotante de Partículas */}
      <View style={styles.particlesContainer} pointerEvents="none">
        {particles.map((p) => (
          <Animated.View
            key={p.id}
            style={[
              styles.floatingEmojiParticle,
              {
                opacity: p.animOpacity,
                transform: [
                  { translateY: p.animY },
                  { translateX: p.animX },
                  { scale: p.animScale },
                ],
              },
            ]}
          >
            <Text style={styles.particleEmojiText}>{p.emoji}</Text>
          </Animated.View>
        ))}
      </View>

      {/* Barra de Botones de Reacción */}
      <View style={[styles.barCard, isOverlay && styles.barCardOverlay]}>
        <View style={styles.headerTitleRow}>
          <View style={styles.liveDot} />
          <Text style={styles.headerLabel}>Reacciones Flotantes en Vivo</Text>
          <Sparkles size={13} color="#FFD700" style={{ marginLeft: 4 }} />
        </View>

        <View style={styles.emojisRow}>
          {REACTION_EMOJIS.map((item) => {
            const count = reactionCounts[item.emoji] || 0;
            return (
              <TouchableOpacity
                key={item.emoji}
                style={[styles.emojiBtn, { borderColor: `${item.color}40` }]}
                onPress={(evt) => {
                  const x = evt.nativeEvent.pageX;
                  handlePressEmoji(item, x);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.emojiIcon}>{item.emoji}</Text>
                <View style={[styles.countPill, { backgroundColor: `${item.color}25` }]}>
                  <Text style={[styles.countText, { color: item.color }]}>
                    {count > 999 ? `${(count / 1000).toFixed(1)}k` : count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 12,
    position: 'relative',
  },
  overlayWrapper: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    zIndex: 50,
  },
  particlesContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    height: 300,
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 100,
  },
  floatingEmojiParticle: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 8,
  },
  particleEmojiText: {
    fontSize: 34,
  },
  barCard: {
    backgroundColor: '#121218',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#242430',
  },
  barCardOverlay: {
    backgroundColor: 'rgba(10,10,15,0.85)',
    borderColor: '#FF2D55',
    padding: 8,
    borderRadius: 24,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#30D158',
    marginRight: 6,
  },
  headerLabel: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  emojisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  emojiBtn: {
    flex: 1,
    backgroundColor: '#1C1C24',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  emojiIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  countPill: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
  },
  countText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
});
