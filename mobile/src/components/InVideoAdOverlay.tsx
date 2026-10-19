import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { ExternalLink, X, Clock, Sparkles } from 'lucide-react-native';
import { api } from '../services/api';
import { COLORS } from '../theme/colors';

interface InVideoAdOverlayProps {
  onAdFinished?: () => void;
}

export const InVideoAdOverlay: React.FC<InVideoAdOverlayProps> = ({ onAdFinished }) => {
  const [ad, setAd] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [canSkip, setCanSkip] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let isMounted = true;

    const fetchAd = async () => {
      try {
        const ads = await api.ads.getActive('IN_VIDEO_PLAYER');
        if (isMounted && ads && ads.length > 0) {
          const activeAd = ads[0];
          setAd(activeAd);
          const duration = Math.max(3, activeAd.durationSeconds || 5);
          setTimeLeft(duration);
          // Registrar impresión
          api.ads.recordImpression(activeAd.id).catch(() => {});
        } else {
          if (isMounted) {
            setAd(null);
            onAdFinished?.();
          }
        }
      } catch (err) {
        if (isMounted) {
          setAd(null);
          onAdFinished?.();
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAd();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!ad || timeLeft <= 0) {
      if (timeLeft === 0 && ad) {
        setCanSkip(true);
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanSkip(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [ad, timeLeft]);

  const handleDismiss = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setDismissed(true);
      onAdFinished?.();
    });
  };

  const handlePressAd = async () => {
    if (!ad) return;
    try {
      api.ads.recordClick(ad.id).catch(() => {});
      if (ad.targetUrl) {
        const url = ad.targetUrl.startsWith('http') ? ad.targetUrl : `https://${ad.targetUrl}`;
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
        }
      }
    } catch (e) {
      console.log('Error opening ad URL:', e);
    }
  };

  if (loading || !ad || dismissed) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Header con contador */}
      <View style={styles.topBar}>
        <View style={styles.badgeBox}>
          <Sparkles size={12} color="#000" />
          <Text style={styles.badgeText}>ANUNCIO PATROCINADO</Text>
        </View>

        {timeLeft > 0 ? (
          <View style={styles.timerBadge}>
            <Clock size={12} color="#FFF" />
            <Text style={styles.timerText}>Video en {timeLeft}s</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.skipBtn} onPress={handleDismiss} activeOpacity={0.8}>
            <Text style={styles.skipBtnText}>Saltar Anuncio</Text>
            <X size={14} color="#000" />
          </TouchableOpacity>
        )}
      </View>

      {/* Contenido del anuncio */}
      <TouchableOpacity
        style={styles.adContentBox}
        activeOpacity={0.9}
        onPress={handlePressAd}
      >
        {ad.mediaUrl ? (
          <Image
            source={{ uri: ad.mediaUrl }}
            style={styles.adImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderMedia}>
            <Sparkles size={32} color={COLORS.neonLime} />
          </View>
        )}

        <View style={styles.infoRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.adTitle} numberOfLines={1}>
              {ad.title}
            </Text>
            <Text style={styles.adSubtext} numberOfLines={1}>
              Toca para visitar el patrocinador oficial
            </Text>
          </View>
          <View style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>Visitar</Text>
            <ExternalLink size={14} color="#000" />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    zIndex: 999,
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neonLime,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  badgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  timerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  skipBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
  },
  adContentBox: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: 10,
  },
  adImage: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    backgroundColor: '#1E1E1E',
  },
  placeholderMedia: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 10,
    borderRadius: 10,
  },
  adTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  adSubtext: {
    color: '#AAAAAA',
    fontSize: 11,
    marginTop: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neonLime,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
  },
});
