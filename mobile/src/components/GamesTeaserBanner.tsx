import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Gamepad2, Sparkles, Play, Dices, ChevronRight, Flame, Lock, Crown } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export const GamesTeaserBanner: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const isVip = Boolean(user?.isVerified || user?.role === 'ADMIN');

  const handleNavigateToGames = () => {
    try {
      navigation.navigate('Juegos');
    } catch (_) {}
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
      {/* Cabecera del Banner */}
      <View style={[styles.headerRow, { borderBottomColor: colors.borderLight }]}>
        <View style={styles.titleRow}>
          <View style={styles.iconBox}>
            <Gamepad2 size={16} color="#FF2D55" />
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.bannerTitle, { color: colors.textPrimary }]}>
                Zona de Videojuegos +18
              </Text>
              <View style={[styles.nutakuBadge, !isVip && { backgroundColor: '#FFD700' }]}>
                <Text style={[styles.nutakuBadgeText, !isVip && { color: '#000000' }]}>
                  {isVip ? 'NUTAKU VIP' : 'VIP $15.000'}
                </Text>
              </View>
            </View>
            <Text style={[styles.bannerSubtitle, { color: colors.textSecondary }]}>
              {isVip
                ? 'Juegos interactivos de citas, RPG y Ruleta sin descarga'
                : 'Exclusivo miembros VIP ($15.000 COP) • 1,000 gemas de bienvenida'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.seeAllBtn}
          onPress={handleNavigateToGames}
          activeOpacity={0.7}
        >
          <Text style={[styles.seeAllText, { color: colors.primary }]}>
            {isVip ? 'Ver sala' : 'Activar'}
          </Text>
          <ChevronRight size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Miniaturas de Juegos y Recompensas */}
      <View style={styles.contentRow}>
        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.gameCardItem}
          onPress={handleNavigateToGames}
        >
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop' }}
            style={styles.gameCardImg as any}
          />
          <View style={styles.gameOverlay} />
          <View style={styles.gameBadge}>
            <Text style={styles.gameBadgeText}>HOT</Text>
          </View>
          <Text style={styles.gameCardLabel} numberOfLines={1}>
            Booty Calls
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.gameCardItem}
          onPress={handleNavigateToGames}
        >
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop' }}
            style={styles.gameCardImg as any}
          />
          <View style={styles.gameOverlay} />
          <View style={[styles.gameBadge, { backgroundColor: '#FFB800' }]}>
            <Text style={[styles.gameBadgeText, { color: '#000000' }]}>VIP</Text>
          </View>
          <Text style={styles.gameCardLabel} numberOfLines={1}>
            Fap CEO Studio
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.88}
          style={[styles.gameCardItem, styles.rouletteCard]}
          onPress={handleNavigateToGames}
        >
          <View style={styles.rouletteInner}>
            <Dices size={24} color="#05D9E8" />
            <Text style={styles.rouletteText}>Ruleta +18</Text>
            <Text style={styles.rouletteSub}>Gana Gemas</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Botón CTA principal */}
      <View style={styles.footerRow}>
        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: isVip ? colors.primary : '#FF9500' }]}
          onPress={handleNavigateToGames}
          activeOpacity={0.85}
        >
          {isVip ? (
            <>
              <Play size={14} color="#FFFFFF" fill="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.ctaButtonText}>ENTRAR A JUGAR AHORA</Text>
            </>
          ) : (
            <>
              <Lock size={14} color="#000000" style={{ marginRight: 6 }} />
              <Text style={[styles.ctaButtonText, { color: '#000000' }]}>
                DESBLOQUEAR JUEGOS CON VIP ($15.000 COP)
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={[styles.freeBadge, !isVip && { borderColor: '#FFD700' }]}>
          <Text style={[styles.freeBadgeText, !isVip && { color: '#FFD700' }]}>
            {isVip ? 'VIP ACTIVO' : '$15.000 COP'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 45, 85, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  nutakuBadge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  nutakuBadgeText: {
    color: '#000000',
    fontSize: 8,
    fontWeight: '900',
  },
  bannerSubtitle: {
    fontSize: 10,
    marginTop: 2,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  contentRow: {
    flexDirection: 'row',
    padding: 10,
    gap: 8,
  },
  gameCardItem: {
    flex: 1,
    height: 90,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1E1E28',
  },
  gameCardImg: {
    width: '100%',
    height: '100%',
  },
  gameOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  gameBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: '#FF2D55',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  gameBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  gameCardLabel: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  rouletteCard: {
    borderWidth: 1,
    borderColor: 'rgba(5, 217, 232, 0.4)',
    backgroundColor: 'rgba(5, 217, 232, 0.08)',
  },
  rouletteInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  rouletteText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 4,
  },
  rouletteSub: {
    color: '#05D9E8',
    fontSize: 9,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingBottom: 10,
    gap: 8,
  },
  ctaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  freeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#30D158',
  },
  freeBadgeText: {
    color: '#30D158',
    fontSize: 9,
    fontWeight: 'bold',
  },
});
