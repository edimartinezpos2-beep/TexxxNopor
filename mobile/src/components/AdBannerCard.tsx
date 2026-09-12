import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import { ExternalLink, Sparkles, X, ShieldAlert } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

interface AdBannerCardProps {
  onPress?: () => void;
  title?: string;
  subtitle?: string;
  ctaText?: string;
  imageUrl?: string;
  targetUrl?: string;
  sponsorName?: string;
}

export const AdBannerCard: React.FC<AdBannerCardProps> = ({
  onPress,
  title = 'Juegos Para Adultos #1 Sin Tarjeta de Crédito',
  subtitle = 'Más de 50,000 jugadores en línea ahora mismo. Únete gratis en 10 segundos.',
  ctaText = 'Jugar Gratis',
  imageUrl = 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop',
  targetUrl = 'https://www.trafficjunky.com',
  sponsorName = 'TrafficJunky Network',
}) => {
  const { colors } = useTheme();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handlePress = async () => {
    if (onPress) {
      onPress();
      return;
    }
    if (targetUrl) {
      try {
        await Linking.openURL(targetUrl);
      } catch (_) {}
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
      {/* Barra superior de Publicidad */}
      <View style={[styles.adHeader, { borderBottomColor: colors.borderLight }]}>
        <View style={styles.adLabelRow}>
          <View style={styles.adBadge}>
            <Text style={styles.adBadgeText}>ANUNCIO</Text>
          </View>
          <Text style={[styles.sponsorText, { color: colors.textMuted }]}>
            Patrocinado por {sponsorName}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setDismissed(true)}
          style={styles.closeButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <X size={14} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Contenido del Anuncio */}
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={handlePress}
        style={styles.adContent}
      >
        <Image
          source={{ uri: imageUrl }}
          style={styles.adImage as any}
          resizeMode="cover"
        />

        <View style={styles.adDetails}>
          <View style={styles.titleRow}>
            <Sparkles size={14} color="#FFB800" style={{ marginRight: 4 }} />
            <Text style={[styles.adTitle, { color: colors.textPrimary }]} numberOfLines={2}>
              {title}
            </Text>
          </View>

          <Text style={[styles.adSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>
            {subtitle}
          </Text>

          <View style={styles.ctaRow}>
            <View style={[styles.ctaButton, { backgroundColor: colors.primary }]}>
              <Text style={styles.ctaButtonText}>{ctaText}</Text>
              <ExternalLink size={12} color="#FFFFFF" style={{ marginLeft: 4 }} />
            </View>
            <View style={styles.ageBadge}>
              <Text style={styles.ageBadgeText}>18+</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  adHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 0.5,
  },
  adLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adBadge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  adBadgeText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.4,
  },
  sponsorText: {
    fontSize: 10,
  },
  closeButton: {
    padding: 2,
  },
  adContent: {
    flexDirection: 'row',
    padding: 10,
    alignItems: 'center',
    gap: 12,
  },
  adImage: {
    width: 90,
    height: 90,
    borderRadius: 8,
    backgroundColor: '#1E1E28',
  },
  adDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  adTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    flex: 1,
  },
  adSubtitle: {
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 8,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  ageBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  ageBadgeText: {
    color: '#FF3B30',
    fontSize: 9,
    fontWeight: 'bold',
  },
});
