import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Linking,
  Dimensions,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import {
  Gamepad2,
  Sparkles,
  Flame,
  Trophy,
  Dices,
  ExternalLink,
  RotateCw,
  Gift,
  Coins,
  CheckCircle2,
  X,
  Play,
  Star,
  ShieldCheck,
  Zap,
  Lock,
  Crown,
  ShieldAlert,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { PremiumGatewayModal } from '../components/PremiumGatewayModal';

const { width } = Dimensions.get('window');

interface AdultGame {
  id: string;
  title: string;
  category: string;
  rating: number;
  playersCount: string;
  thumbnailUrl: string;
  bannerUrl: string;
  description: string;
  playUrl: string;
  tag?: string;
}

export const GamesScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user, updateUser } = useAuth();

  // Comprobación de estado VIP
  const isVip = Boolean(user?.isVerified || user?.role === 'ADMIN');
  const [showVipModal, setShowVipModal] = useState(false);

  // Monedas y recompensas del usuario
  const [gems, setGems] = useState(isVip ? 1000 : 500);

  // Estados de la Ruleta de la Pasión
  const [spinning, setSpinning] = useState(false);
  const [wheelResult, setWheelResult] = useState<string | null>(null);
  const [showWheelModal, setShowWheelModal] = useState(false);
  const spinValue = useState(new Animated.Value(0))[0];

  // Estados de Memory Game
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [memoryCards, setMemoryCards] = useState<{ id: number; img: string; flipped: boolean; matched: boolean }[]>([]);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [memoryMoves, setMemoryMoves] = useState(0);
  const [memoryWon, setMemoryWon] = useState(false);

  // Catálogo de Juegos Estilo Nutaku / Adult Web Games
  const gamesList: AdultGame[] = [
    {
      id: 'g-1',
      title: 'Booty Calls: Citas en la Playa',
      category: 'Dating Sim • Citas',
      rating: 4.9,
      playersCount: '240k',
      thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop',
      bannerUrl: 'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?w=800&auto=format&fit=crop',
      description: 'El juego de citas para adultos más jugado del mundo. Conoce chicas increíbles y desbloquea escenas secretas.',
      playUrl: 'https://xvideos.nutaku.net/es/get-started/',
      tag: '🔥 #1 MÁS JUGADO',
    },
    {
      id: 'g-2',
      title: 'Fap CEO: Crea tu Imperio Adulto',
      category: 'Simulador • Estrategia',
      rating: 4.8,
      playersCount: '185k',
      thumbnailUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop',
      bannerUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&auto=format&fit=crop',
      description: 'Administra tu propio estudio de modelos webcam, contrata a las chicas más atractivas y hazte millonario.',
      playUrl: 'https://xvideos.nutaku.net/es/get-started/',
      tag: '⭐ EXCLUSIVO',
    },
    {
      id: 'g-3',
      title: 'Harem Heroes: La Leyenda Prohibida',
      category: 'RPG • Fantasía +18',
      rating: 4.9,
      playersCount: '310k',
      thumbnailUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&auto=format&fit=crop',
      bannerUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop',
      description: 'Conquista reinos misteriosos y recluta a las guerreras más sensuales para tu harén personal.',
      playUrl: 'https://xvideos.nutaku.net/es/get-started/',
      tag: '⚔️ ÉPICO',
    },
    {
      id: 'g-4',
      title: 'Pocket Waifu: Tu Compañera Virtual',
      category: 'Anime • Waifu Sim',
      rating: 4.7,
      playersCount: '95k',
      thumbnailUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&auto=format&fit=crop',
      bannerUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop',
      description: 'Cuida, viste y seduce a tu waifu favorita con miles de prendas interactivas y regalos ardientes.',
      playUrl: 'https://xvideos.nutaku.net/es/get-started/',
    },
    {
      id: 'g-5',
      title: 'Sinverse City: Mafia y Placer',
      category: 'Mundo Abierto • 3D',
      rating: 4.8,
      playersCount: '140k',
      thumbnailUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop',
      bannerUrl: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800&auto=format&fit=crop',
      description: 'Domina los clubes nocturnos de la ciudad, haz tratos con mafias y disfruta de fiestas privadas.',
      playUrl: 'https://xvideos.nutaku.net/es/get-started/',
      tag: '🔞 3D REAL',
    },
  ];

  // Comprobar si puede jugar
  const checkVipAccess = (): boolean => {
    if (!isVip) {
      Alert.alert(
        '🔒 Exclusivo Suscriptores VIP',
        'Para jugar a los videojuegos interactivos y acceder a Nutaku necesitas la Suscripción VIP por solo $15.000 COP al mes.\n\nIncluye 1,000 gemas de bienvenida, minijuegos y videos 4K sin publicidad.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Activar VIP ($15.000 COP)',
            onPress: () => setShowVipModal(true),
          },
        ]
      );
      return false;
    }
    return true;
  };

  // Iniciar juego de memoria
  const initMemoryGame = () => {
    if (!checkVipAccess()) return;

    const images = [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop',
    ];
    const deck = [...images, ...images]
      .sort(() => Math.random() - 0.5)
      .map((img, index) => ({
        id: index,
        img,
        flipped: false,
        matched: false,
      }));
    setMemoryCards(deck);
    setSelectedCards([]);
    setMemoryMoves(0);
    setMemoryWon(false);
    setShowMemoryModal(true);
  };

  const handleCardClick = (index: number) => {
    if (selectedCards.length === 2 || memoryCards[index].flipped || memoryCards[index].matched) return;

    const newCards = [...memoryCards];
    newCards[index].flipped = true;
    setMemoryCards(newCards);

    const newSelected = [...selectedCards, index];
    setSelectedCards(newSelected);

    if (newSelected.length === 2) {
      setMemoryMoves((m) => m + 1);
      const [first, second] = newSelected;
      if (newCards[first].img === newCards[second].img) {
        newCards[first].matched = true;
        newCards[second].matched = true;
        setMemoryCards(newCards);
        setSelectedCards([]);

        if (newCards.every((c) => c.matched)) {
          setMemoryWon(true);
          setGems((g) => g + 150);
        }
      } else {
        setTimeout(() => {
          newCards[first].flipped = false;
          newCards[second].flipped = false;
          setMemoryCards([...newCards]);
          setSelectedCards([]);
        }, 800);
      }
    }
  };

  // Girar Ruleta de la Pasión
  const spinWheel = () => {
    if (!checkVipAccess()) return;
    if (spinning) return;
    if (gems < 50) {
      Alert.alert('Gemas Insuficientes', 'Necesitas al menos 50 gemas para girar la ruleta.');
      return;
    }

    setGems((g) => g - 50);
    setSpinning(true);
    setWheelResult(null);

    const prizes = [
      '💎 +200 Gemas VIP',
      '📸 Foto Exclusiva Desbloqueada',
      '⭐ Pase Premium 24 Horas',
      '🔥 Video Privado Revelado',
      '💎 +500 Super Gemas',
      '🎁 Regalo Sorpresa +18',
    ];

    const randomDeg = 1440 + Math.floor(Math.random() * 360);

    Animated.timing(spinValue, {
      toValue: randomDeg,
      duration: 3500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      const prizeIndex = Math.floor(Math.random() * prizes.length);
      const wonPrize = prizes[prizeIndex];
      setWheelResult(wonPrize);
      setSpinning(false);
      spinValue.setValue(randomDeg % 360);
      if (wonPrize.includes('200')) setGems((g) => g + 200);
      if (wonPrize.includes('500')) setGems((g) => g + 500);
    });
  };

  const handleOpenGame = async (url: string) => {
    if (!checkVipAccess()) return;
    try {
      await Linking.openURL(url);
    } catch (_) {
      Alert.alert('Aviso', 'Abriendo juego en línea seguro...');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 1. Header con Saldo de Gemas y Estado VIP */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.titleRow}>
          <Gamepad2 size={22} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>TexxxGames +18</Text>
        </View>

        <View style={styles.headerRight}>
          {isVip ? (
            <View style={styles.vipActiveBadge}>
              <Crown size={13} color="#FFD700" fill="#FFD700" />
              <Text style={styles.vipActiveText}>VIP ACTIVO</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.vipUnlockHeaderBtn}
              onPress={() => setShowVipModal(true)}
              activeOpacity={0.8}
            >
              <Lock size={12} color="#FFFFFF" />
              <Text style={styles.vipUnlockHeaderText}>VIP $15.000</Text>
            </TouchableOpacity>
          )}

          {/* Contador de Gemas */}
          <View style={[styles.gemsBadge, { backgroundColor: colors.surfaceCard, borderColor: '#05D9E8' }]}>
            <Sparkles size={14} color="#05D9E8" />
            <Text style={styles.gemsText}>{gems} Gemas</Text>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Banner Requerimiento VIP si el usuario no es suscriptor */}
        {!isVip && (
          <TouchableOpacity
            style={styles.vipRequiredBanner}
            activeOpacity={0.9}
            onPress={() => setShowVipModal(true)}
          >
            <View style={styles.vipBannerIconBox}>
              <Lock size={22} color="#FFD700" />
            </View>
            <View style={styles.vipBannerTextCol}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.vipBannerTitle}>ZONA BLOQUEADA · SUSCRIPCIÓN VIP</Text>
                <View style={styles.pricePill}>
                  <Text style={styles.pricePillText}>$15.000 COP</Text>
                </View>
              </View>
              <Text style={styles.vipBannerDesc}>
                Desbloquea todos los juegos interactivos, minijuegos y recibe 1,000 gemas de bienvenida.
              </Text>
            </View>
            <View style={styles.vipBannerBtn}>
              <Text style={styles.vipBannerBtnText}>ACTIVAR</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* 2. Banner VIP de Bienvenida a los Juegos */}
        <View style={[styles.heroBanner, { borderColor: colors.border }]}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?w=1000&auto=format&fit=crop' }}
            style={styles.heroBannerImg as any}
          />
          <View style={styles.heroOverlay} />

          <View style={styles.heroContent}>
            <View style={styles.heroPill}>
              <Crown size={12} color="#FFD700" fill="#FFD700" />
              <Text style={styles.heroPillText}>
                {isVip ? 'PASE VIP ACTIVO' : 'EXCLUSIVO SUSCRIPCIÓN VIP ($15.000 COP)'}
              </Text>
            </View>
            <Text style={styles.heroTitle}>Juegos Para Adultos Sin Descarga</Text>
            <Text style={styles.heroSubtitle}>
              Disfruta de más de 50 juegos interactivos +18 en tu navegador o juega a los minijuegos nativos para ganar premios VIP.
            </Text>

            <View style={styles.heroActions}>
              <TouchableOpacity
                style={[styles.primaryActionBtn, { backgroundColor: isVip ? colors.primary : '#FF9500' }]}
                onPress={() => {
                  if (isVip) {
                    handleOpenGame('https://xvideos.nutaku.net/es/get-started/');
                  } else {
                    setShowVipModal(true);
                  }
                }}
                activeOpacity={0.85}
              >
                {isVip ? (
                  <>
                    <Play size={14} color="#FFFFFF" fill="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.primaryActionBtnText}>JUGAR EN LÍNEA AHORA</Text>
                  </>
                ) : (
                  <>
                    <Lock size={14} color="#000000" style={{ marginRight: 6 }} />
                    <Text style={[styles.primaryActionBtnText, { color: '#000000' }]}>
                      DESBLOQUEAR CON VIP ($15.000)
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryActionBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
                onPress={() => {
                  if (checkVipAccess()) setShowWheelModal(true);
                }}
                activeOpacity={0.8}
              >
                <Dices size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.secondaryActionBtnText}>Ruleta VIP</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 3. Minijuegos Nativos Rápidos (Jugables en la App) */}
        <View style={styles.sectionTitleRow}>
          <View style={styles.sectionHeaderLeft}>
            <Dices size={18} color="#FF2D55" />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Minijuegos Jugables en App
            </Text>
          </View>
          <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
            {isVip ? '100% interactivos' : 'Requiere VIP $15.000'}
          </Text>
        </View>

        <View style={styles.minigamesRow}>
          {/* Tarjeta Minijuego 1: Ruleta de la Pasión */}
          <TouchableOpacity
            style={[styles.minigameCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}
            activeOpacity={0.88}
            onPress={() => {
              if (checkVipAccess()) setShowWheelModal(true);
            }}
          >
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?w=500&auto=format&fit=crop' }}
              style={styles.minigameImg as any}
            />
            <View style={styles.minigameOverlay} />
            <View style={[styles.minigameBadge, !isVip && { backgroundColor: '#FF9500' }]}>
              <Text style={[styles.minigameBadgeText, !isVip && { color: '#000000' }]}>
                {isVip ? 'POPULAR' : 'VIP $15.000'}
              </Text>
            </View>
            <View style={styles.minigameDetails}>
              <Text style={styles.minigameTitle}>🎰 Ruleta de la Pasión</Text>
              <Text style={styles.minigameDesc}>Gira y gana fotos VIP y gemas</Text>
              <View style={[styles.playMiniBtn, { backgroundColor: isVip ? colors.primary : '#FF9500' }]}>
                <Text style={[styles.playMiniBtnText, !isVip && { color: '#000000' }]}>
                  {isVip ? 'GIRAR AHORA' : 'DESBLOQUEAR VIP'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Tarjeta Minijuego 2: Strip Memory */}
          <TouchableOpacity
            style={[styles.minigameCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}
            activeOpacity={0.88}
            onPress={initMemoryGame}
          >
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&auto=format&fit=crop' }}
              style={styles.minigameImg as any}
            />
            <View style={styles.minigameOverlay} />
            <View style={[styles.minigameBadge, { backgroundColor: '#30D158' }]}>
              <Text style={styles.minigameBadgeText}>+150 GEMAS</Text>
            </View>
            <View style={styles.minigameDetails}>
              <Text style={styles.minigameTitle}>🃏 Strip Memory</Text>
              <Text style={styles.minigameDesc}>Encuentra las parejas prohibidas</Text>
              <View style={[styles.playMiniBtn, { backgroundColor: isVip ? '#30D158' : '#FF9500' }]}>
                <Text style={[styles.playMiniBtnText, !isVip && { color: '#000000' }]}>
                  {isVip ? 'JUGAR MEMORY' : 'DESBLOQUEAR VIP'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* 4. Catálogo Nutaku / Juegos de Navegador para Adultos */}
        <View style={[styles.sectionTitleRow, { marginTop: 24 }]}>
          <View style={styles.sectionHeaderLeft}>
            <Trophy size={18} color="#FFB800" />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Juegos Top de Nutaku (+18)
            </Text>
          </View>
          <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
            {isVip ? 'Acceso Ilimitado' : 'Requiere VIP $15.000'}
          </Text>
        </View>

        {gamesList.map((game) => (
          <TouchableOpacity
            key={game.id}
            style={[styles.gameListItem, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}
            activeOpacity={0.88}
            onPress={() => handleOpenGame(game.playUrl)}
          >
            <Image source={{ uri: game.thumbnailUrl }} style={styles.gameThumb as any} />

            <View style={styles.gameInfo}>
              <View style={styles.gameTitleRow}>
                <Text style={[styles.gameTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                  {game.title}
                </Text>
                {game.tag && (
                  <View style={styles.gameTagBadge}>
                    <Text style={styles.gameTagBadgeText}>{game.tag}</Text>
                  </View>
                )}
              </View>

              <Text style={[styles.gameCategory, { color: colors.textSecondary }]}>
                {game.category} • 👥 {game.playersCount} jugando
              </Text>

              <Text style={[styles.gameDesc, { color: colors.textMuted }]} numberOfLines={2}>
                {game.description}
              </Text>

              <View style={styles.gameBottomRow}>
                <View style={styles.ratingBox}>
                  <Star size={12} color="#FFB800" fill="#FFB800" />
                  <Text style={styles.ratingScore}>{game.rating}</Text>
                </View>

                <TouchableOpacity
                  style={[styles.playGameBtn, { backgroundColor: isVip ? colors.primary : '#FF9500' }]}
                  onPress={() => handleOpenGame(game.playUrl)}
                >
                  {isVip ? (
                    <>
                      <Text style={styles.playGameBtnText}>JUGAR AHORA</Text>
                      <ExternalLink size={12} color="#FFFFFF" style={{ marginLeft: 4 }} />
                    </>
                  ) : (
                    <>
                      <Lock size={12} color="#000000" style={{ marginRight: 4 }} />
                      <Text style={[styles.playGameBtnText, { color: '#000000' }]}>VIP $15.000</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {/* 5. Banner de Suscripción VIP $15.000 COP */}
        <View style={[styles.promoBox, { backgroundColor: colors.surfaceCard, borderColor: '#FFD700' }]}>
          <Crown size={32} color="#FFD700" style={{ marginBottom: 6 }} />
          <Text style={[styles.promoTitle, { color: colors.textPrimary }]}>
            Suscripción TexxxNopor RED VIP ($15.000 COP)
          </Text>
          <Text style={[styles.promoDesc, { color: colors.textSecondary }]}>
            Desbloquea acceso completo e ilimitado a todos los videojuegos interactivos, ruletas, 1,000 gemas de regalo y transmisiones 4K sin anuncios.
          </Text>
          <TouchableOpacity
            style={[styles.promoBtn, { backgroundColor: '#FFD700' }]}
            onPress={() => setShowVipModal(true)}
          >
            <Text style={styles.promoBtnText}>
              {isVip ? 'VER DETALLES DE MI PLAN VIP' : 'SUSCRIBIRME POR $15.000 COP'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal de Pago / Pasarela Bancaria Wompi PSE / Nequi */}
      <PremiumGatewayModal
        visible={showVipModal}
        onClose={() => setShowVipModal(false)}
        onSuccess={() => {
          setShowVipModal(false);
          setGems((g) => g + 1000);
          if (updateUser) {
            updateUser({ isVerified: true });
          }
          Alert.alert(
            '¡Bienvenido a VIP!',
            'Tu suscripción por $15.000 COP ha sido activada con éxito. Ya puedes jugar a todos los videojuegos y girar la ruleta sin límites.'
          );
        }}
      />

      {/* Modal: Ruleta de la Pasión */}
      <Modal
        visible={showWheelModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowWheelModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.wheelModalContainer, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.wheelModalTitle, { color: colors.textPrimary }]}>
                🎰 Ruleta de la Pasión +18
              </Text>
              <TouchableOpacity onPress={() => setShowWheelModal(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.wheelModalSubtitle, { color: colors.textSecondary }]}>
              Costo: 50 Gemas por giro. Tu saldo actual: {gems} Gemas
            </Text>

            {/* Rueda animada */}
            <View style={styles.wheelCenterContainer}>
              <Animated.View
                style={[
                  styles.wheelDisk,
                  {
                    borderColor: colors.primary,
                    transform: [
                      {
                        rotate: spinValue.interpolate({
                          inputRange: [0, 360],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Dices size={44} color={colors.primary} />
                <Sparkles size={24} color="#FFB800" style={{ position: 'absolute', top: 12, right: 12 }} />
                <Flame size={24} color="#FF2D55" style={{ position: 'absolute', bottom: 12, left: 12 }} />
              </Animated.View>
            </View>

            {/* Resultado si terminó */}
            {wheelResult && (
              <View style={styles.resultBox}>
                <Text style={styles.resultTitle}>¡FELICIDADES!</Text>
                <Text style={styles.resultPrize}>{wheelResult}</Text>
              </View>
            )}

            {/* Botón Girar */}
            <TouchableOpacity
              style={[
                styles.spinBtn,
                { backgroundColor: spinning ? '#555566' : colors.primary },
              ]}
              onPress={spinWheel}
              disabled={spinning}
            >
              <RotateCw size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.spinBtnText}>
                {spinning ? 'GIRANDO LA RULETA...' : 'GIRAR POR 50 GEMAS'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Minijuego Strip Memory */}
      <Modal
        visible={showMemoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMemoryModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.memoryModalContainer, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.wheelModalTitle, { color: colors.textPrimary }]}>
                🃏 Strip Memory (Movimientos: {memoryMoves})
              </Text>
              <TouchableOpacity onPress={() => setShowMemoryModal(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {memoryWon ? (
              <View style={styles.wonContainer}>
                <Trophy size={48} color="#FFD700" />
                <Text style={[styles.wonTitle, { color: colors.textPrimary }]}>
                  ¡Completaste el Desafío!
                </Text>
                <Text style={[styles.wonSubtitle, { color: colors.textSecondary }]}>
                  Has ganado +150 Gemas VIP por tu destreza.
                </Text>
                <TouchableOpacity
                  style={[styles.primaryActionBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
                  onPress={initMemoryGame}
                >
                  <Text style={styles.primaryActionBtnText}>JUGAR OTRA VEZ</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.memoryGrid}>
                {memoryCards.map((card, idx) => (
                  <TouchableOpacity
                    key={card.id}
                    style={[
                      styles.memoryCard,
                      { backgroundColor: card.flipped || card.matched ? '#262634' : colors.primary },
                    ]}
                    onPress={() => handleCardClick(idx)}
                    activeOpacity={0.8}
                  >
                    {card.flipped || card.matched ? (
                      <Image source={{ uri: card.img }} style={styles.memoryCardImg as any} />
                    ) : (
                      <Dices size={24} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
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
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vipActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD700',
    gap: 4,
  },
  vipActiveText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '900',
  },
  vipUnlockHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF2D55',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  vipUnlockHeaderText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  gemsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    gap: 5,
  },
  gemsText: {
    color: '#05D9E8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    padding: 12,
    paddingBottom: 30,
  },
  vipRequiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 45, 85, 0.12)',
    borderWidth: 1,
    borderColor: '#FF2D55',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  vipBannerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vipBannerTextCol: {
    flex: 1,
  },
  vipBannerTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  pricePill: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  pricePillText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '900',
  },
  vipBannerDesc: {
    color: '#E0E0E0',
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },
  vipBannerBtn: {
    backgroundColor: '#FF2D55',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  vipBannerBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  heroBanner: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    height: 220,
    borderWidth: 1,
    marginBottom: 20,
  },
  heroBannerImg: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  heroContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    justifyContent: 'center',
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.25)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    marginBottom: 6,
  },
  heroPillText: {
    color: '#FFD700',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },
  heroSubtitle: {
    color: '#D0D0E0',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
  },
  secondaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  sectionHint: {
    fontSize: 11,
  },
  minigamesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  minigameCard: {
    flex: 1,
    height: 180,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  minigameImg: {
    width: '100%',
    height: '100%',
  },
  minigameOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  minigameBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF2D55',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  minigameBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  minigameDetails: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
  },
  minigameTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  minigameDesc: {
    color: '#B0B0C0',
    fontSize: 10,
    marginBottom: 8,
  },
  playMiniBtn: {
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  playMiniBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  gameListItem: {
    flexDirection: 'row',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    gap: 10,
  },
  gameThumb: {
    width: 85,
    height: 85,
    borderRadius: 10,
    backgroundColor: '#1C1C24',
  },
  gameInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  gameTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gameTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    flex: 1,
  },
  gameTagBadge: {
    backgroundColor: 'rgba(255, 45, 85, 0.2)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    marginLeft: 4,
  },
  gameTagBadgeText: {
    color: '#FF2D55',
    fontSize: 8,
    fontWeight: 'bold',
  },
  gameCategory: {
    fontSize: 10,
    marginTop: 2,
  },
  gameDesc: {
    fontSize: 10,
    lineHeight: 14,
    marginVertical: 4,
  },
  gameBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingScore: {
    color: '#FFB800',
    fontSize: 11,
    fontWeight: 'bold',
  },
  playGameBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  playGameBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  promoBox: {
    marginVertical: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  promoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  promoDesc: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 12,
  },
  promoBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  promoBtnText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  wheelModalContainer: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  wheelModalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  wheelModalSubtitle: {
    fontSize: 11,
    marginBottom: 16,
  },
  wheelCenterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  wheelDisk: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 4,
    backgroundColor: '#1E1E28',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  resultBox: {
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#30D158',
  },
  resultTitle: {
    color: '#30D158',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  resultPrize: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
  },
  spinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  spinBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  memoryModalContainer: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  memoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginVertical: 14,
  },
  memoryCard: {
    width: 72,
    height: 72,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memoryCardImg: {
    width: '100%',
    height: '100%',
  },
  wonContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  wonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  wonSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});
