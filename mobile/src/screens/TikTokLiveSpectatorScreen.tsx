import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  TextInput,
  ScrollView,
  Platform,
  Share,
  Modal,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import {
  X,
  Plus,
  Check,
  Heart,
  Share2,
  Gift,
  MoreHorizontal,
  Send,
  Flame,
  Users,
  ShieldAlert,
  Sparkles,
  Award,
  Coins,
  CheckCircle2,
} from 'lucide-react-native';
import { LiveStreamItem } from '../types/auth';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Catálogo de Regalos Interactivos estilo TikTok
interface GiftOption {
  id: string;
  name: string;
  icon: string;
  coins: number;
  effect: 'rose' | 'rocket' | 'crown' | 'lion' | 'sports_car' | 'standard';
}

const GIFT_CATALOG: GiftOption[] = [
  { id: 'g_rose', name: 'Rosa', icon: '🌹', coins: 1, effect: 'rose' },
  { id: 'g_icecream', name: 'Helado', icon: '🍦', coins: 5, effect: 'standard' },
  { id: 'g_donut', name: 'Donut', icon: '🍩', coins: 10, effect: 'standard' },
  { id: 'g_rocket', name: 'Cohete', icon: '🚀', coins: 100, effect: 'rocket' },
  { id: 'g_crown', name: 'Corona VIP', icon: '👑', coins: 500, effect: 'crown' },
  { id: 'g_lion', name: 'León Real', icon: '🦁', coins: 1000, effect: 'lion' },
  { id: 'g_car', name: 'Deportivo', icon: '🏎️', coins: 3000, effect: 'sports_car' },
];

export interface CoinPackage {
  id: string;
  coins: number;
  bonus: number;
  priceCOP: string;
  priceUSD: string;
  popular?: boolean;
}

export const COIN_PACKAGES: CoinPackage[] = [
  { id: 'p_70', coins: 70, bonus: 0, priceCOP: '3.500', priceUSD: '0.99', popular: false },
  { id: 'p_350', coins: 350, bonus: 0, priceCOP: '17.500', priceUSD: '4.99', popular: false },
  { id: 'p_700', coins: 700, bonus: 35, priceCOP: '35.000', priceUSD: '9.99', popular: true },
  { id: 'p_1400', coins: 1400, bonus: 100, priceCOP: '70.000', priceUSD: '19.99', popular: false },
  { id: 'p_3500', coins: 3500, bonus: 350, priceCOP: '175.000', priceUSD: '49.99', popular: false },
  { id: 'p_7000', coins: 7000, bonus: 1000, priceCOP: '350.000', priceUSD: '99.99', popular: false },
];

interface ChatMessage {
  id: string;
  user: string;
  avatar?: string;
  text: string;
  isHost?: boolean;
  isSystem?: boolean;
  isJoin?: boolean;
  isGift?: boolean;
  giftIcon?: string;
  giftName?: string;
}

interface TikTokLiveSpectatorScreenProps {
  stream?: LiveStreamItem;
  onClose: () => void;
  onViewActor?: (actorId?: string, actorName?: string) => void;
}

export const TikTokLiveSpectatorScreen: React.FC<TikTokLiveSpectatorScreenProps> = ({
  stream: initialStream,
  onClose,
  onViewActor,
}) => {
  const { user, userToken } = useAuth();

  // Datos del stream (con valores por defecto basados exactamente en la Imagen 3: Deiby Gómez)
  const stream: LiveStreamItem = initialStream || {
    id: 'live_deiby',
    actorId: 'act_deiby',
    actorName: 'Deiby Gómez',
    actorAvatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop',
    title: 'Corte y Estilo VIP en Vivo 🔥 Agenda abierta',
    category: 'Para ti',
    viewersCount: 13,
    likesCount: 1200,
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    streamThumbnail:
      'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&auto=format&fit=crop',
    startedAt: new Date().toISOString(),
  };

  const [isFollowing, setIsFollowing] = useState(false);
  const [likesCount, setLikesCount] = useState<number>(stream.likesCount || 1200);
  const [viewersCount, setViewersCount] = useState<number>(stream.viewersCount || 13);
  const [inputText, setInputText] = useState('');
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<CoinPackage>(COIN_PACKAGES[2]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'NEQUI' | 'BANCOLOMBIA' | 'PSE' | 'TARJETA'>('NEQUI');
  const [rechargeToast, setRechargeToast] = useState<string | null>(null);
  const [userCoins, setUserCoins] = useState(250);
  const [selectedGift, setSelectedGift] = useState<GiftOption>(GIFT_CATALOG[0]);
  const [activeGiftCelebration, setActiveGiftCelebration] = useState<{
    icon: string;
    name: string;
    sender: string;
  } | null>(null);

  // Lista de espectadores (avatares miniatura de la derecha)
  const viewerAvatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=100&auto=format&fit=crop',
  ];

  // Mensajes de Chat (exactos a la Imagen 3)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'sys_rules',
      user: 'Sistema',
      text: 'para poder emitir un LIVE, mientras que los espectadores deben ser mayores de 18 años para recargar y enviar Regalos. No te olvides de seguir las Normas de la comunidad.',
      isSystem: true,
    },
    {
      id: 'host_msg',
      user: 'Deiby Gómez',
      text: 'Agenda Con Nosotros +573117248877',
      isHost: true,
    },
    {
      id: 'usr_yeison',
      user: 'yeison',
      text: 'calbielo',
    },
    {
      id: 'join_agustin',
      user: '💀 Agustín💀',
      text: 'se ha unido',
      isJoin: true,
    },
  ]);

  const chatScrollRef = useRef<ScrollView>(null);

  // Auto-scroll hacia abajo cuando llegan mensajes
  useEffect(() => {
    chatScrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // Fluctuación orgánica de espectadores y mensajes simulados de la sala
  useEffect(() => {
    const interval = setInterval(() => {
      // Variar espectadores levemente (+/- 1 a 2)
      setViewersCount((prev) => Math.max(8, prev + (Math.random() > 0.5 ? 1 : -1)));

      // Ocasionalmente agregar un usuario uniéndose o comentando
      if (Math.random() > 0.65) {
        const sampleNames = ['camila_99', 'juan_vip', 'laura_b', 'diego_barber', 'alejandro_x'];
        const sampleTexts = [
          'saludos desde Medellín 🔥',
          'buena vibra bro',
          '🔥 corte épico',
          'cuánto vale el corte?',
          '👏👏👏',
        ];
        const randomName = sampleNames[Math.floor(Math.random() * sampleNames.length)];
        const isJoinEvent = Math.random() > 0.5;

        if (isJoinEvent) {
          setMessages((prev) => [
            ...prev,
            { id: String(Date.now()), user: randomName, text: 'se ha unido', isJoin: true },
          ]);
        } else {
          const randomText = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
          setMessages((prev) => [
            ...prev,
            { id: String(Date.now()), user: randomName, text: randomText },
          ]);
        }
      }
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  // Animación de corazones flotantes al tocar la pantalla
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; x: number; y: number; color: string }[]>([]);
  const handleScreenTap = (e: any) => {
    const { locationX, locationY } = e.nativeEvent || {};
    const heartId = Date.now();
    const colors = ['#FF2D55', '#FF375F', '#BF5AF2', '#FF9F0A', '#30D158', '#0A84FF'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    setFloatingHearts((prev) => [
      ...prev,
      {
        id: heartId,
        x: locationX || SCREEN_WIDTH / 2,
        y: locationY || SCREEN_HEIGHT / 2,
        color: randomColor,
      },
    ]);

    setLikesCount((c) => c + 1);

    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== heartId));
    }, 1200);
  };

  // Enviar comentario propio
  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    const newMsg: ChatMessage = {
      id: String(Date.now()),
      user: user?.username || 'Tú',
      text: inputText.trim(),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputText('');

    if (stream.id) {
      api.live.sendComment(userToken, stream.id, newMsg.text, newMsg.user).catch(() => {});
    }
  };

  // Enviar Rosa de acceso rápido
  const handleQuickSendRose = () => {
    const roseGift = GIFT_CATALOG[0];
    handleSendGift(roseGift);
  };

  // Confirmar recarga de monedas
  const handleConfirmRecharge = () => {
    const totalCoinsAdded = selectedPackage.coins + selectedPackage.bonus;
    setUserCoins((prev) => prev + totalCoinsAdded);
    setRechargeToast(`¡Recarga exitosa! +${totalCoinsAdded} monedas acreditadas.`);
    setShowRechargeModal(false);
    setTimeout(() => setRechargeToast(null), 3500);

    if (userToken) {
      api.live.rechargeCoins?.(userToken, totalCoinsAdded, parseInt(selectedPackage.priceCOP.replace('.', ''), 10)).catch(() => {});
    }
  };

  // Enviar cualquier regalo del catálogo (92% para el actor / 8% para la plataforma)
  const handleSendGift = (giftItem: GiftOption) => {
    if (userCoins < giftItem.coins) {
      setShowGiftModal(false);
      setShowRechargeModal(true);
      return;
    }

    // Reducir monedas del espectador
    setUserCoins((c) => Math.max(0, c - giftItem.coins));
    setLikesCount((c) => c + giftItem.coins * 15);

    const actorCoins = Math.round(giftItem.coins * 0.92);
    const platformCoins = Math.round(giftItem.coins * 0.08);

    // Mensaje en chat
    const giftMsg: ChatMessage = {
      id: String(Date.now()),
      user: user?.username || 'Tú',
      text: `ha enviado ${giftItem.name} ${giftItem.icon} (92% para el actor: +${actorCoins} monedas)`,
      isGift: true,
      giftIcon: giftItem.icon,
      giftName: giftItem.name,
    };
    setMessages((prev) => [...prev, giftMsg]);

    // Celebración visual en pantalla completa
    setActiveGiftCelebration({
      icon: giftItem.icon,
      name: `${giftItem.name} (+${actorCoins} al actor)`,
      sender: user?.username || 'Tú',
    });
    setTimeout(() => {
      setActiveGiftCelebration(null);
    }, 2500);

    setShowGiftModal(false);

    if (stream.id) {
      api.live.sendGift(userToken, stream.id, giftItem.name, giftItem.coins).catch(() => {});
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `¡Únete a la transmisión en vivo de ${stream.actorName} en TexxxNopor! 🔥`,
      });
    } catch (_) {}
  };

  return (
    <View style={styles.container}>
      {/* 1. Video en Pantalla Completa del Live Stream */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleScreenTap}
        style={styles.videoBackgroundArea}
      >
        <Video
          source={{
            uri:
              stream.streamUrl ||
              'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
          }}
          style={styles.fullVideo}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping
          isMuted={false}
        />

        {/* Corazones flotantes interactivos */}
        {floatingHearts.map((h) => (
          <Animated.View
            key={h.id}
            style={[
              styles.floatingHeartItem,
              { left: h.x - 20, top: h.y - 40 },
            ]}
          >
            <Heart size={36} color={h.color} fill={h.color} />
          </Animated.View>
        ))}
      </TouchableOpacity>

      {/* 2. Cabecera Superior: Streamer Info Capsule | Espectadores y Cerrar (Imagen 3) */}
      <View style={styles.topHeaderContainer}>
        {/* Píldora del Anfitrión (Avatar + Nombre + Me gusta + Botón Seguir) */}
        <View style={styles.hostCapsuleRow}>
          <TouchableOpacity
            style={styles.hostAvatarTouch}
            onPress={() => onViewActor && onViewActor(stream.actorId, stream.actorName)}
          >
            <Image
              source={{ uri: stream.actorAvatar }}
              style={styles.hostAvatar as any}
            />
          </TouchableOpacity>

          <View style={styles.hostInfoTextCol}>
            <Text style={styles.hostName} numberOfLines={1}>
              {stream.actorName || 'Deiby Gó...'}
            </Text>
            <Text style={styles.hostLikesCount}>
              {(likesCount / 1000).toFixed(1)}K me gusta
            </Text>
          </View>

          {/* Botón Rojo + Seguir / Siguiendo */}
          <TouchableOpacity
            style={[
              styles.followButton,
              isFollowing && styles.followingButton,
            ]}
            onPress={() => setIsFollowing(!isFollowing)}
          >
            {isFollowing ? (
              <Check size={13} color="#FFFFFF" strokeWidth={2.5} />
            ) : (
              <Plus size={13} color="#FFFFFF" strokeWidth={2.5} />
            )}
            <Text style={styles.followButtonText}>
              {isFollowing ? 'Siguiendo' : 'Seguir'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Zona Derecha: Avatares de espectadores + Contador "13" + Cerrar "X" */}
        <View style={styles.viewersAndCloseRow}>
          {/* Micro-avatares de espectadores en fila */}
          <View style={styles.viewerAvatarsCluster}>
            {viewerAvatars.map((uri, idx) => (
              <Image
                key={`v-${idx}`}
                source={{ uri }}
                style={[
                  styles.microViewerAvatar as any,
                  { marginLeft: idx === 0 ? 0 : -8 },
                ]}
              />
            ))}
          </View>

          {/* Contador de Espectadores estilo "👥 13" */}
          <View style={styles.viewersCountPill}>
            <Users size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.viewersCountText}>{viewersCount}</Text>
          </View>

          {/* Botón Cerrar "X" */}
          <TouchableOpacity style={styles.closeLiveBtn} onPress={onClose}>
            <X size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Subcabecera: Píldora "🔥 Clasificación diaria" */}
      <View style={styles.dailyRankPillContainer}>
        <View style={styles.dailyRankPill}>
          <Flame size={12} color="#FFD700" fill="#FFD700" style={{ marginRight: 4 }} />
          <Text style={styles.dailyRankText}>Clasificación diaria</Text>
        </View>
      </View>

      {/* Celebración de Regalo en Pantalla Completa */}
      {activeGiftCelebration && (
        <View style={styles.giftCelebrationOverlay}>
          <Text style={styles.giftCelebrationEmoji}>
            {activeGiftCelebration.icon}
          </Text>
          <View style={styles.giftCelebrationBadge}>
            <Text style={styles.giftCelebrationText}>
              {activeGiftCelebration.sender} envió {activeGiftCelebration.name}!
            </Text>
          </View>
        </View>
      )}

      {/* 3. Flujo de Chat en Vivo Translúcido (Inferior Izquierdo) */}
      <View style={styles.chatStreamContainer}>
        <ScrollView
          ref={chatScrollRef}
          style={styles.chatScrollView}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg) => {
            // Caso 1: Advertencia de normas de la comunidad
            if (msg.isSystem) {
              return (
                <View key={msg.id} style={styles.systemRulesBubble}>
                  <Text style={styles.systemRulesText}>{msg.text}</Text>
                </View>
              );
            }

            // Caso 2: Mensaje fijado del anfitrión (con insignia Anfitrión)
            if (msg.isHost) {
              return (
                <View key={msg.id} style={styles.hostMessageBubble}>
                  <View style={styles.hostHeaderRow}>
                    <Text style={styles.hostNameInChat}>{msg.user}</Text>
                    <View style={styles.hostBadgePill}>
                      <Text style={styles.hostBadgeText}>Anfitrión</Text>
                    </View>
                  </View>
                  <Text style={styles.hostTextInChat}>{msg.text}</Text>
                </View>
              );
            }

            // Caso 3: Alerta de usuario uniéndose
            if (msg.isJoin) {
              return (
                <View key={msg.id} style={styles.joinMessageBubble}>
                  <Text style={styles.joinUserText}>{msg.user}</Text>
                  <Text style={styles.joinActionText}> {msg.text}</Text>
                </View>
              );
            }

            // Caso 4: Alerta de regalo
            if (msg.isGift) {
              return (
                <View key={msg.id} style={styles.giftMessageBubble}>
                  <Text style={styles.giftSenderText}>{msg.user}: </Text>
                  <Text style={styles.giftActionText}>
                    envió {msg.giftName} {msg.giftIcon}
                  </Text>
                </View>
              );
            }

            // Caso 5: Comentario regular de usuario
            return (
              <View key={msg.id} style={styles.regularChatBubble}>
                <Text style={styles.regularChatUser}>{msg.user}</Text>
                <Text style={styles.regularChatBody}>{msg.text}</Text>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* 4. Barra de Interacción Inferior (Imagen 3) */}
      {/* "Añadir comentario..." | "Varios..." | "Rosa" | "Regalo" | "Compartir 1" */}
      <View style={styles.bottomActionBar}>
        {/* Input Redondeado "Añadir comentario..." */}
        <View style={styles.commentInputPillWrapper}>
          <TextInput
            style={styles.commentInputPill}
            placeholder="Añadir comentario..."
            placeholderTextColor="#C0C0D0"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSendMessage}
          />
          {inputText.trim().length > 0 && (
            <TouchableOpacity
              style={styles.commentSendCircleBtn}
              onPress={handleSendMessage}
            >
              <Send size={15} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Botón "Varios..." */}
        <TouchableOpacity style={styles.actionIconCol}>
          <View style={styles.actionCircleBtn}>
            <MoreHorizontal size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.actionIconLabel}>Varios...</Text>
        </TouchableOpacity>

        {/* Botón de Envío Rápido "Rosa" */}
        <TouchableOpacity
          style={styles.actionIconCol}
          onPress={handleQuickSendRose}
          activeOpacity={0.8}
        >
          <View style={[styles.actionCircleBtn, styles.roseActionBtn]}>
            <Text style={{ fontSize: 22 }}>🌹</Text>
          </View>
          <Text style={styles.actionIconLabel}>Rosa</Text>
        </TouchableOpacity>

        {/* Botón de Cofre de "Regalo" (Abre Modal de Regalos) */}
        <TouchableOpacity
          style={styles.actionIconCol}
          onPress={() => setShowGiftModal(true)}
          activeOpacity={0.8}
        >
          <View style={[styles.actionCircleBtn, styles.giftActionBtn]}>
            <Text style={{ fontSize: 22 }}>🎁</Text>
            <View style={styles.giftGlowBadge} />
          </View>
          <Text style={styles.actionIconLabel}>Regalo</Text>
        </TouchableOpacity>

        {/* Botón "Compartir" con Contador "1" */}
        <TouchableOpacity
          style={styles.actionIconCol}
          onPress={handleShare}
          activeOpacity={0.8}
        >
          <View style={styles.actionCircleBtn}>
            <Share2 size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.actionIconLabel}>1</Text>
        </TouchableOpacity>
      </View>

      {/* 5. Modal Interactivo de Regalos estilo TikTok */}
      {showGiftModal && (
        <Modal
          visible={true}
          transparent
          animationType="slide"
          onRequestClose={() => setShowGiftModal(false)}
        >
          <View style={styles.giftModalBackdrop}>
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => setShowGiftModal(false)}
            />
            <View style={styles.giftModalContent}>
              {/* Header del Modal */}
              <View style={styles.giftModalHeader}>
                <View style={styles.giftCoinsBalanceRow}>
                  <Coins size={18} color="#FFD700" style={{ marginRight: 6 }} />
                  <Text style={styles.giftCoinsText}>{userCoins} monedas</Text>
                  <TouchableOpacity
                    style={styles.rechargeBtn}
                    onPress={() => {
                      setShowGiftModal(false);
                      setShowRechargeModal(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.rechargeBtnText}>+ Recargar</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => setShowGiftModal(false)}>
                  <X size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Banner Informativo de Reparto de Ingresos (92% Actor / 8% Plataforma) */}
              <View style={styles.giftRevenueSharePill}>
                <Text style={styles.giftRevenueShareText}>
                  ✨ 92% de tu regalo apoya directamente al actor como ingreso extra (8% comisión TexxxNopor)
                </Text>
              </View>

              {/* Grid de Regalos */}
              <View style={styles.giftGridContainer}>
                {GIFT_CATALOG.map((g) => {
                  const isSelected = selectedGift.id === g.id;
                  return (
                    <TouchableOpacity
                      key={g.id}
                      style={[
                        styles.giftCard,
                        isSelected && styles.giftCardSelected,
                      ]}
                      onPress={() => setSelectedGift(g)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.giftCardEmoji}>{g.icon}</Text>
                      <Text style={styles.giftCardName}>{g.name}</Text>
                      <View style={styles.giftCardPriceRow}>
                        <Coins size={10} color="#FFD700" style={{ marginRight: 2 }} />
                        <Text style={styles.giftCardPriceText}>{g.coins}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Barra Inferior del Modal de Regalo con Botón Enviar */}
              <View style={styles.giftModalBottomRow}>
                <View style={styles.selectedGiftPreview}>
                  <Text style={{ fontSize: 24, marginRight: 8 }}>
                    {selectedGift.icon}
                  </Text>
                  <View>
                    <Text style={styles.selectedGiftName}>{selectedGift.name}</Text>
                    <Text style={styles.selectedGiftCost}>
                      Costo: {selectedGift.coins} monedas · Actor recibe: {Math.round(selectedGift.coins * 0.92)}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.sendGiftActionBtn,
                    userCoins < selectedGift.coins && styles.sendGiftActionBtnDisabled,
                  ]}
                  onPress={() => handleSendGift(selectedGift)}
                >
                  <Text style={styles.sendGiftActionText}>
                    {userCoins < selectedGift.coins ? 'Recargar monedas' : 'Enviar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* MODAL DE RECARGA DE MONEDAS CON COSTO REAL (COP) */}
      {showRechargeModal && (
        <Modal
          visible={true}
          transparent
          animationType="slide"
          onRequestClose={() => setShowRechargeModal(false)}
        >
          <View style={styles.giftModalBackdrop}>
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => setShowRechargeModal(false)}
            />
            <View style={styles.rechargeModalContent}>
              <View style={styles.rechargeModalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Coins size={22} color="#FFD700" style={{ marginRight: 8 }} />
                  <Text style={styles.rechargeModalTitle}>Recargar Monedas</Text>
                </View>
                <TouchableOpacity onPress={() => setShowRechargeModal(false)}>
                  <X size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <Text style={styles.rechargeSubtitle}>
                Saldo actual: <Text style={{ color: '#FFD700', fontWeight: 'bold' }}>{userCoins} monedas</Text>.
                Tus monedas se usan para enviar regalos a los actores y apoyarlos en sus transmisiones.
              </Text>

              {/* Lista de Paquetes de Monedas */}
              <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
                <View style={styles.rechargePackagesGrid}>
                  {COIN_PACKAGES.map((pkg) => {
                    const isSelected = selectedPackage.id === pkg.id;
                    return (
                      <TouchableOpacity
                        key={pkg.id}
                        style={[
                          styles.packageCard,
                          isSelected && styles.packageCardSelected,
                        ]}
                        onPress={() => setSelectedPackage(pkg)}
                        activeOpacity={0.8}
                      >
                        {pkg.popular && (
                          <View style={styles.popularBadge}>
                            <Text style={styles.popularBadgeText}>MÁS POPULAR</Text>
                          </View>
                        )}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Coins size={16} color="#FFD700" style={{ marginRight: 5 }} />
                          <Text style={styles.packageCoinsText}>{pkg.coins}</Text>
                          {pkg.bonus > 0 && (
                            <Text style={styles.packageBonusText}>+{pkg.bonus}</Text>
                          )}
                        </View>
                        <Text style={styles.packagePriceText}>${pkg.priceCOP} COP</Text>
                        <Text style={styles.packageUsdText}>(${pkg.priceUSD} USD)</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Selector de Método de Pago */}
              <Text style={styles.paymentMethodLabel}>Método de Pago:</Text>
              <View style={styles.paymentMethodsRow}>
                {(['NEQUI', 'BANCOLOMBIA', 'PSE', 'TARJETA'] as const).map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={[
                      styles.paymentMethodPill,
                      selectedPaymentMethod === method && styles.paymentMethodPillActive,
                    ]}
                    onPress={() => setSelectedPaymentMethod(method)}
                  >
                    <Text
                      style={[
                        styles.paymentMethodText,
                        selectedPaymentMethod === method && styles.paymentMethodTextActive,
                      ]}
                    >
                      {method}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Botón de Confirmación de Recarga */}
              <TouchableOpacity
                style={styles.confirmRechargeBtn}
                onPress={handleConfirmRecharge}
                activeOpacity={0.85}
              >
                <Text style={styles.confirmRechargeBtnText}>
                  Pagar ${selectedPackage.priceCOP} COP y Obtener {selectedPackage.coins + selectedPackage.bonus} Monedas
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Toast de Recarga Exitosa */}
      {rechargeToast && (
        <View style={styles.rechargeSuccessToast}>
          <Text style={styles.rechargeSuccessToastText}>{rechargeToast}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
  },
  videoBackgroundArea: {
    ...StyleSheet.absoluteFillObject,
  },
  fullVideo: {
    width: '100%',
    height: '100%',
  },
  floatingHeartItem: {
    position: 'absolute',
    zIndex: 99,
  },

  // ---------------------------------------------------------
  // CABECERA SUPERIOR (IMAGEN 3)
  // ---------------------------------------------------------
  topHeaderContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 26,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  hostCapsuleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: 24,
    paddingVertical: 3,
    paddingLeft: 3,
    paddingRight: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  hostAvatarTouch: {
    marginRight: 6,
  },
  hostAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: '#FF2D55',
  },
  hostInfoTextCol: {
    marginRight: 8,
  },
  hostName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  hostLikesCount: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 10,
    marginTop: 1,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF2D55',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
    gap: 2,
  },
  followingButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  followButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  viewersAndCloseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewerAvatarsCluster: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  microViewerAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#000000',
  },
  viewersCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  viewersCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  closeLiveBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyRankPillContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 90 : 70,
    left: 12,
    zIndex: 20,
  },
  dailyRankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  dailyRankText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // ---------------------------------------------------------
  // CELEBRACIÓN DE REGALOS EN PANTALLA COMPLETA
  // ---------------------------------------------------------
  giftCelebrationOverlay: {
    position: 'absolute',
    top: '35%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 40,
  },
  giftCelebrationEmoji: {
    fontSize: 84,
  },
  giftCelebrationBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFD700',
    marginTop: 8,
  },
  giftCelebrationText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // ---------------------------------------------------------
  // CHAT EN VIVO TRANSLÚCIDO (INFERIOR IZQUIERDO)
  // ---------------------------------------------------------
  chatStreamContainer: {
    position: 'absolute',
    bottom: 74,
    left: 12,
    right: 80,
    height: 240,
    zIndex: 20,
  },
  chatScrollView: {
    flex: 1,
  },
  systemRulesBubble: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9F0A',
  },
  systemRulesText: {
    color: '#E0E0E8',
    fontSize: 11,
    lineHeight: 15,
  },
  hostMessageBubble: {
    backgroundColor: 'rgba(255, 45, 85, 0.25)',
    borderRadius: 8,
    padding: 7,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 45, 85, 0.4)',
  },
  hostHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  hostNameInChat: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  hostBadgePill: {
    backgroundColor: '#FF2D55',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  hostBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  hostTextInChat: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  joinMessageBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  joinUserText: {
    color: '#00F2FE',
    fontSize: 11,
    fontWeight: 'bold',
  },
  joinActionText: {
    color: '#D0D0D8',
    fontSize: 11,
  },
  giftMessageBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginBottom: 4,
    borderWidth: 0.5,
    borderColor: '#FFD700',
    alignSelf: 'flex-start',
  },
  giftSenderText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: 'bold',
  },
  giftActionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  regularChatBubble: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 9,
    marginBottom: 4,
    alignSelf: 'flex-start',
    maxWidth: '92%',
  },
  regularChatUser: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 1,
  },
  regularChatBody: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },

  // ---------------------------------------------------------
  // BARRA DE INTERACCIÓN INFERIOR (IMAGEN 3)
  // ---------------------------------------------------------
  bottomActionBar: {
    position: 'absolute',
    bottom: 12,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 25,
  },
  commentInputPillWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: 22,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  commentInputPill: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 12,
  },
  commentSendCircleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF2D55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconCol: {
    alignItems: 'center',
    gap: 2,
  },
  actionCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    position: 'relative',
  },
  roseActionBtn: {
    backgroundColor: 'rgba(255, 45, 85, 0.25)',
    borderColor: '#FF2D55',
  },
  giftActionBtn: {
    backgroundColor: 'rgba(255, 215, 0, 0.25)',
    borderColor: '#FFD700',
  },
  giftGlowBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF2D55',
  },
  actionIconLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 3,
  },

  // ---------------------------------------------------------
  // MODAL DE REGALOS
  // ---------------------------------------------------------
  giftModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  giftModalContent: {
    backgroundColor: '#14141C',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
  },
  giftModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  giftCoinsBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  giftCoinsText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 12,
  },
  rechargeBtn: {
    backgroundColor: '#282838',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  rechargeBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  giftGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  giftCard: {
    width: '23%',
    backgroundColor: '#1E1E2A',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  giftCardSelected: {
    borderColor: '#FF2D55',
    backgroundColor: 'rgba(255, 45, 85, 0.15)',
  },
  giftCardEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  giftCardName: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  giftCardPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  giftCardPriceText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: 'bold',
  },
  giftModalBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#282838',
    paddingTop: 12,
  },
  selectedGiftPreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedGiftName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  selectedGiftCost: {
    color: '#A0A0B0',
    fontSize: 11,
  },
  sendGiftActionBtn: {
    backgroundColor: '#FF2D55',
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 20,
  },
  sendGiftActionBtnDisabled: {
    backgroundColor: '#3E3E50',
  },
  sendGiftActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  giftRevenueSharePill: {
    backgroundColor: 'rgba(255, 45, 85, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 45, 85, 0.3)',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  giftRevenueShareText: {
    color: '#FF7B92',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    textAlign: 'center',
  },

  // ---------------------------------------------------------
  // MODAL DE RECARGA DE MONEDAS
  // ---------------------------------------------------------
  rechargeModalContent: {
    backgroundColor: '#161622',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.25)',
  },
  rechargeModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rechargeModalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  rechargeSubtitle: {
    color: '#A0A0B0',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 14,
  },
  rechargePackagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  packageCard: {
    width: '48%',
    backgroundColor: '#1E1E2C',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
    alignItems: 'center',
  },
  packageCardSelected: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: 8,
    backgroundColor: '#FF2D55',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  popularBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  packageCoinsText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
  },
  packageBonusText: {
    color: '#30D158',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  packagePriceText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  packageUsdText: {
    color: '#8E8E98',
    fontSize: 10,
  },
  paymentMethodLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 4,
  },
  paymentMethodsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  paymentMethodPill: {
    flex: 1,
    backgroundColor: '#20202E',
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  paymentMethodPillActive: {
    borderColor: '#FF2D55',
    backgroundColor: 'rgba(255, 45, 85, 0.18)',
  },
  paymentMethodText: {
    color: '#A0A0B0',
    fontSize: 11,
    fontWeight: 'bold',
  },
  paymentMethodTextActive: {
    color: '#FFFFFF',
  },
  confirmRechargeBtn: {
    backgroundColor: '#E50914',
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmRechargeBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  rechargeSuccessToast: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: 'rgba(48, 209, 88, 0.95)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    zIndex: 99,
  },
  rechargeSuccessToastText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
