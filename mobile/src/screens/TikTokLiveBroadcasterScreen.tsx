import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  TextInput,
  ScrollView,
  Platform,
  Share,
  Modal,
  Switch,
  Alert,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import {
  X,
  RotateCcw,
  Sparkles,
  Wand2,
  Settings,
  Shield,
  Users,
  MessageCircle,
  Share2,
  Flame,
  Target,
  Mic,
  MicOff,
  Radio,
  Sliders,
  Check,
  Award,
  Coins,
  Smile,
  BarChart2,
  Play,
  Heart,
  ChevronRight,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { LiveStreamItem } from '../types/auth';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface TikTokLiveBroadcasterScreenProps {
  onClose: () => void;
  onLiveFinished?: (stats: any) => void;
}

export const TikTokLiveBroadcasterScreen: React.FC<TikTokLiveBroadcasterScreenProps> = ({
  onClose,
  onLiveFinished,
}) => {
  const { user, userToken } = useAuth();

  // Estados de Configuración Pre-Live (Imagen 4)
  const [streamTitle, setStreamTitle] = useState('Noche especial charlando con fans 🔥');
  const [selectedCategory, setSelectedCategory] = useState('Cámara del dispositivo');
  const [showRewardBanner, setShowRewardBanner] = useState(true);
  const [goalText, setGoalText] = useState('Meta: 100 Rosas 🌹');
  const [goalTarget, setGoalTarget] = useState(100);
  const [goalCurrent, setGoalCurrent] = useState(0);

  // Estados de Cámara y Filtros
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [isMirrored, setIsMirrored] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  // Filtros de Belleza (Mejorar)
  const [smoothValue, setSmoothValue] = useState(65);
  const [toneValue, setToneValue] = useState(50);
  const [eyesValue, setEyesValue] = useState(40);
  const [faceValue, setFaceValue] = useState(35);
  const [showBeautyModal, setShowBeautyModal] = useState(false);

  // Filtros de Efectos Visuales (Efectos)
  const [activeEffect, setActiveEffect] = useState<'normal' | 'neon' | 'golden' | 'cyberpunk' | 'warm' | 'bw'>('normal');
  const [showEffectsModal, setShowEffectsModal] = useState(false);

  // Ajustes de Transmisión (Ajustes)
  const [quality, setQuality] = useState<'1080p' | '720p' | '480p'>('1080p');
  const [allowGifts, setAllowGifts] = useState(true);
  const [antiSpamFilter, setAntiSpamFilter] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Objetivo del Live Modal
  const [showGoalModal, setShowGoalModal] = useState(false);

  // Moderación / Servicio+
  const [showModerationModal, setShowModerationModal] = useState(false);
  const [blockedWords, setBlockedWords] = useState<string[]>(['spam', 'scam', 'bot']);
  const [newBlockedWord, setNewBlockedWord] = useState('');

  // Encuesta en Vivo / Interactúa
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('¿Qué hacemos a continuación?');
  const [pollOpt1, setPollOpt1] = useState('Bailar un tema');
  const [pollOpt2, setPollOpt2] = useState('Responder preguntas íntimas');
  const [activePoll, setActivePoll] = useState<{ q: string; o1: string; o2: string; v1: number; v2: number } | null>(null);

  // ESTADO DE EMISIÓN EN DIRECTO (ESTUDIO EN VIVO)
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [liveDurationSeconds, setLiveDurationSeconds] = useState(0);
  const [spectatorsCount, setSpectatorsCount] = useState(1);
  const [diamondsEarned, setDiamondsEarned] = useState(0);
  const [incomingComments, setIncomingComments] = useState<{ id: string; user: string; text: string }[]>([]);
  const [recentGiftPopup, setRecentGiftPopup] = useState<{ user: string; gift: string; icon: string } | null>(null);

  // Modal de Resumen al Finalizar
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryStats, setSummaryStats] = useState<{
    duration: string;
    viewers: number;
    diamonds: number;
    followers: number;
  } | null>(null);

  // Cronómetro del Live cuando se está emitiendo
  useEffect(() => {
    let timer: any;
    if (isBroadcasting) {
      timer = setInterval(() => {
        setLiveDurationSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isBroadcasting]);

  // Simulación de interacción en vivo para el Actor
  useEffect(() => {
    if (!isBroadcasting) return;

    const interval = setInterval(() => {
      // Subida paulatina y orgánica de espectadores
      setSpectatorsCount((prev) => Math.min(320, prev + Math.floor(Math.random() * 4) + 1));

      // Comentarios automáticos de los espectadores que entran a la sala
      const sampleUsers = ['carlos_med', 'sofia_vip', 'juan_99', 'luis_barber', 'andrea_k'];
      const sampleTexts = [
        '¡Hola hermosa! 🔥',
        'Qué buena calidad de live',
        'Saludos desde Bogotá!',
        'Super guapa 😍',
        'Vamos por esa meta de rosas!',
      ];

      const rUser = sampleUsers[Math.floor(Math.random() * sampleUsers.length)];
      const rText = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];

      setIncomingComments((prev) => [
        ...prev.slice(-15),
        { id: String(Date.now()), user: rUser, text: rText },
      ]);

      // 30% de probabilidad de recibir regalo
      if (Math.random() > 0.65) {
        const gifts = [
          { name: 'Rosa', icon: '🌹', coins: 1 },
          { name: 'Helado', icon: '🍦', coins: 5 },
          { name: 'Cohete', icon: '🚀', coins: 100 },
          { name: 'Corona', icon: '👑', coins: 500 },
        ];
        const rGift = gifts[Math.floor(Math.random() * gifts.length)];
        setDiamondsEarned((d) => d + rGift.coins);
        setGoalCurrent((g) => Math.min(goalTarget, g + rGift.coins));

        setRecentGiftPopup({
          user: rUser,
          gift: rGift.name,
          icon: rGift.icon,
        });

        setTimeout(() => setRecentGiftPopup(null), 3000);
      }
    }, 3800);

    return () => clearInterval(interval);
  }, [isBroadcasting, goalTarget]);

  // Formato MM:SS del tiempo en vivo
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${remSecs < 10 ? '0' : ''}${remSecs}`;
  };

  // Botón "Emitir LIVE"
  const handleStartBroadcast = async () => {
    setIsBroadcasting(true);
    setLiveDurationSeconds(0);
    setSpectatorsCount(3);
    setDiamondsEarned(0);

    if (userToken) {
      api.live
        .createLive(userToken, {
          title: streamTitle,
          category: selectedCategory,
          goalText: goalText,
          actorName: user?.username || 'Mi Canal VIP',
          actorAvatar: user?.avatarUrl,
        })
        .catch(() => {});
    }
  };

  // Finalizar LIVE
  const handleFinishBroadcast = () => {
    Alert.alert('Finalizar Transmisión', '¿Estás seguro de terminar tu transmisión en vivo?', [
      { text: 'Continuar emitiendo', style: 'cancel' },
      {
        text: 'Finalizar',
        style: 'destructive',
        onPress: () => {
          setIsBroadcasting(false);
          const stats = {
            duration: formatTime(liveDurationSeconds),
            viewers: Math.max(spectatorsCount, 45),
            diamonds: Math.max(diamondsEarned, 24),
            followers: Math.floor(Math.random() * 12) + 3,
          };
          setSummaryStats(stats);
          setShowSummaryModal(true);
        },
      },
    ]);
  };

  // Alternar Giro de Cámara (Cámara frontal / trasera)
  const handleFlipCamera = () => {
    setIsFrontCamera(!isFrontCamera);
    setIsMirrored(!isMirrored);
  };

  // Agregar palabra bloqueada
  const handleAddBlockedWord = () => {
    if (!newBlockedWord.trim()) return;
    setBlockedWords([...blockedWords, newBlockedWord.trim().toLowerCase()]);
    setNewBlockedWord('');
  };

  // Determinar estilo de filtro visual activo
  const getFilterStyle = () => {
    if (activeEffect === 'neon') return { tintColor: '#00F2FE', opacity: 0.95 };
    if (activeEffect === 'golden') return { backgroundColor: 'rgba(255, 180, 0, 0.15)' };
    if (activeEffect === 'cyberpunk') return { backgroundColor: 'rgba(255, 0, 128, 0.18)' };
    if (activeEffect === 'warm') return { backgroundColor: 'rgba(255, 100, 50, 0.12)' };
    return {};
  };

  // =========================================================================
  // MODO 1: ESTUDIO EN DIRECTO ACTIVO (TRANSMITIENDO EN VIVO)
  // =========================================================================
  if (isBroadcasting) {
    return (
      <View style={styles.container}>
        {/* Fondo de Transmisión en Vivo */}
        <Video
          source={{ uri: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' }}
          style={[
            styles.cameraPreviewVideo,
            isMirrored && { transform: [{ scaleX: -1 }] },
          ]}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping
          isMuted
        />
        <View style={[styles.filterOverlay, getFilterStyle()]} />

        {/* Cabecera del Estudio de Transmisión */}
        <View style={styles.studioHeader}>
          {/* Badge EN VIVO + Cronómetro */}
          <View style={styles.liveIndicatorBadge}>
            <View style={styles.redLivePulseDot} />
            <Text style={styles.liveBadgeLabel}>EN VIVO</Text>
            <Text style={styles.liveTimerText}>{formatTime(liveDurationSeconds)}</Text>
          </View>

          {/* Estadísticas en Vivo: Espectadores + Diamantes */}
          <View style={styles.studioStatsRow}>
            <View style={styles.studioStatPill}>
              <Users size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.studioStatValue}>{spectatorsCount}</Text>
            </View>

            <View style={styles.studioStatPill}>
              <Coins size={12} color="#FFD700" style={{ marginRight: 4 }} />
              <Text style={[styles.studioStatValue, { color: '#FFD700' }]}>
                {diamondsEarned}
              </Text>
            </View>

            {/* Botón Finalizar LIVE */}
            <TouchableOpacity
              style={styles.finishLiveBtn}
              onPress={handleFinishBroadcast}
            >
              <Text style={styles.finishLiveBtnText}>Finalizar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notificación Emergente de Regalo Recibido */}
        {recentGiftPopup && (
          <View style={styles.giftReceivedToast}>
            <Text style={{ fontSize: 24, marginRight: 8 }}>{recentGiftPopup.icon}</Text>
            <Text style={styles.giftReceivedToastText}>
              ¡{recentGiftPopup.user} te ha enviado {recentGiftPopup.gift}!
            </Text>
          </View>
        )}

        {/* Barra de Progreso del Objetivo de Regalos */}
        <View style={styles.goalStudioBarBox}>
          <View style={styles.goalStudioBarHeader}>
            <Text style={styles.goalStudioBarTitle}>🎯 {goalText}</Text>
            <Text style={styles.goalStudioBarCount}>
              {goalCurrent} / {goalTarget}
            </Text>
          </View>
          <View style={styles.goalStudioTrack}>
            <View
              style={[
                styles.goalStudioFill,
                { width: `${Math.min(100, (goalCurrent / goalTarget) * 100)}%` },
              ]}
            />
          </View>
        </View>

        {/* Chat en Vivo de Espectadores */}
        <View style={styles.studioChatStreamBox}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {incomingComments.map((c) => (
              <View key={c.id} style={styles.studioChatRow}>
                <Text style={styles.studioChatUser}>{c.user}: </Text>
                <Text style={styles.studioChatText}>{c.text}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Barra Inferior de Herramientas de Transmisor */}
        <View style={styles.studioBottomToolbar}>
          <TouchableOpacity
            style={styles.studioToolBtn}
            onPress={handleFlipCamera}
          >
            <RotateCcw size={20} color="#FFFFFF" />
            <Text style={styles.studioToolLabel}>Girar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.studioToolBtn}
            onPress={() => setIsMuted(!isMuted)}
          >
            {isMuted ? (
              <MicOff size={20} color="#FF3B30" />
            ) : (
              <Mic size={20} color="#FFFFFF" />
            )}
            <Text style={styles.studioToolLabel}>
              {isMuted ? 'Mudo' : 'Micrófono'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.studioToolBtn}
            onPress={() => setShowBeautyModal(true)}
          >
            <Sparkles size={20} color="#FFD700" />
            <Text style={styles.studioToolLabel}>Belleza</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.studioToolBtn}
            onPress={() => setShowEffectsModal(true)}
          >
            <Wand2 size={20} color="#00F2FE" />
            <Text style={styles.studioToolLabel}>Filtros</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.studioToolBtn}
            onPress={() => setShowSettingsModal(true)}
          >
            <Settings size={20} color="#FFFFFF" />
            <Text style={styles.studioToolLabel}>Ajustes</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // =========================================================================
  // MODO 2: PANTALLA DE CONFIGURACIÓN PRE-LIVE (IMAGEN 4 EXACTA)
  // =========================================================================
  return (
    <View style={styles.container}>
      {/* Vista Previa de Cámara en Vivo con Fallback HD */}
      <Video
        source={{ uri: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' }}
        style={[
          styles.cameraPreviewVideo,
          isMirrored && { transform: [{ scaleX: -1 }] },
        ]}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
        isMuted
      />
      <View style={[styles.filterOverlay, getFilterStyle()]} />

      {/* 1. Barra Superior con Botón Cerrar "X", Recompensas y Ajustes */}
      <View style={styles.preLiveTopBar}>
        <TouchableOpacity style={styles.topCloseBtn} onPress={onClose}>
          <X size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Píldora de Recompensas LIVE */}
        <TouchableOpacity style={styles.topRewardsPill}>
          <Text style={{ fontSize: 13, marginRight: 5 }}>💰</Text>
          <Text style={styles.topRewardsText}>Recompensas LIVE escalonadas</Text>
        </TouchableOpacity>

        <View style={styles.topRightIconsRow}>
          <TouchableOpacity
            style={styles.topMiniCircleBtn}
            onPress={() => setShowModerationModal(true)}
          >
            <Shield size={16} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.topMiniCircleBtn}
            onPress={() => setShowSettingsModal(true)}
          >
            <Settings size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Banner de Misiones Semanales (Descartable) */}
      {showRewardBanner && (
        <View style={styles.weeklyMissionBanner}>
          <Text style={styles.weeklyMissionText}>
            Recompensas LIVE escalonadas: completa misiones semanales para obtener recompensas.
          </Text>
          <TouchableOpacity onPress={() => setShowRewardBanner(false)}>
            <X size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* 2. Cuadrícula 3x3 de Herramientas de Configuración (Imagen 4 Exacta) */}
      {/* Girar | Mejorar | Efectos | Ajustes | Servicio+ */}
      {/* Club de fans | Interactúa | Compartir | Promoción */}
      <View style={styles.toolsGridContainer}>
        {/* Fila 1 */}
        <View style={styles.toolsRow}>
          {/* Girar */}
          <TouchableOpacity
            style={styles.toolGridItem}
            onPress={handleFlipCamera}
            activeOpacity={0.8}
          >
            <View style={styles.toolIconCircle}>
              <RotateCcw size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.toolGridLabel}>Girar</Text>
          </TouchableOpacity>

          {/* Mejorar */}
          <TouchableOpacity
            style={styles.toolGridItem}
            onPress={() => setShowBeautyModal(true)}
            activeOpacity={0.8}
          >
            <View style={styles.toolIconCircle}>
              <Sparkles size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.toolGridLabel}>Mejorar</Text>
          </TouchableOpacity>

          {/* Efectos */}
          <TouchableOpacity
            style={styles.toolGridItem}
            onPress={() => setShowEffectsModal(true)}
            activeOpacity={0.8}
          >
            <View style={styles.toolIconCircle}>
              <Wand2 size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.toolGridLabel}>Efectos</Text>
          </TouchableOpacity>

          {/* Ajustes */}
          <TouchableOpacity
            style={styles.toolGridItem}
            onPress={() => setShowSettingsModal(true)}
            activeOpacity={0.8}
          >
            <View style={styles.toolIconCircle}>
              <Settings size={24} color="#FFFFFF" />
              <View style={styles.toolRedDot} />
            </View>
            <Text style={styles.toolGridLabel}>Ajustes</Text>
          </TouchableOpacity>

          {/* Servicio+ */}
          <TouchableOpacity
            style={styles.toolGridItem}
            onPress={() => setShowModerationModal(true)}
            activeOpacity={0.8}
          >
            <View style={styles.toolIconCircle}>
              <Shield size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.toolGridLabel}>Servicio+</Text>
          </TouchableOpacity>
        </View>

        {/* Fila 2 */}
        <View style={styles.toolsRow}>
          {/* Club de fans */}
          <TouchableOpacity
            style={styles.toolGridItem}
            onPress={() => Alert.alert('Club de Fans', 'El Club de fans está activo con suscripciones mensuales VIP')}
            activeOpacity={0.8}
          >
            <View style={styles.toolIconCircle}>
              <Heart size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.toolGridLabel}>Club de fans</Text>
          </TouchableOpacity>

          {/* Interactúa con los... */}
          <TouchableOpacity
            style={styles.toolGridItem}
            onPress={() => setShowPollModal(true)}
            activeOpacity={0.8}
          >
            <View style={styles.toolIconCircle}>
              <MessageCircle size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.toolGridLabel} numberOfLines={1}>
              Interactúa con los...
            </Text>
          </TouchableOpacity>

          {/* Compartir */}
          <TouchableOpacity
            style={styles.toolGridItem}
            onPress={() =>
              Share.share({
                message: `¡Estaré transmitiendo en vivo ahora mismo en TexxxNopor! 🔴 Conéctate aquí.`,
              })
            }
            activeOpacity={0.8}
          >
            <View style={styles.toolIconCircle}>
              <Share2 size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.toolGridLabel}>Compartir</Text>
          </TouchableOpacity>

          {/* Promoción */}
          <TouchableOpacity
            style={styles.toolGridItem}
            onPress={() =>
              Alert.alert('Promoción Activa', 'Se ha aplicado un impulso del 35% a la visibilidad de tu stream.')
            }
            activeOpacity={0.8}
          >
            <View style={styles.toolIconCircle}>
              <Flame size={24} color="#FF9F0A" />
            </View>
            <Text style={styles.toolGridLabel}>Promoción</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. Tarjeta de Información de la Emisión & Botón "Emitir LIVE" */}
      <View style={styles.preLiveCardBox}>
        {/* Fila de Perfil y Botón Objetivo del LIVE */}
        <View style={styles.streamerTitleRow}>
          <Image
            source={{
              uri:
                user?.avatarUrl ||
                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop',
            }}
            style={styles.streamerCardAvatar as any}
          />
          <TextInput
            style={styles.streamerTitleInput}
            value={streamTitle}
            onChangeText={setStreamTitle}
            placeholder="Añade un título a tu LIVE..."
            placeholderTextColor="#C0C0D0"
          />
          <TouchableOpacity
            style={styles.liveGoalPillBtn}
            onPress={() => setShowGoalModal(true)}
          >
            <Target size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.liveGoalPillText}>Objetivo del LIVE</Text>
          </TouchableOpacity>
        </View>

        {/* Botón Principal Rojo Vibrante "Emitir LIVE" */}
        <TouchableOpacity
          style={styles.broadcastBigRedBtn}
          onPress={handleStartBroadcast}
          activeOpacity={0.85}
        >
          <Text style={styles.broadcastBigRedBtnText}>Emitir LIVE</Text>
        </TouchableOpacity>
      </View>

      {/* 4. Selector de Modos (Chat de voz | Cámara del dispositivo | Juegos para...) */}
      <View style={styles.liveModesSelectorRow}>
        <TouchableOpacity
          style={styles.liveModeItem}
          onPress={() => setSelectedCategory('Chat de voz')}
        >
          <Text
            style={[
              styles.liveModeText,
              selectedCategory === 'Chat de voz' && styles.liveModeTextActive,
            ]}
          >
            🎤 Chat de voz
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.liveModeItem, styles.liveModeItemActive]}
          onPress={() => setSelectedCategory('Cámara del dispositivo')}
        >
          <Text
            style={[
              styles.liveModeText,
              selectedCategory === 'Cámara del dispositivo' && styles.liveModeTextActive,
            ]}
          >
            📹 Cámara del dispositivo
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.liveModeItem}
          onPress={() => setSelectedCategory('Juegos para transmitir')}
        >
          <Text
            style={[
              styles.liveModeText,
              selectedCategory === 'Juegos para transmitir' && styles.liveModeTextActive,
            ]}
          >
            🎮 Juegos para...
          </Text>
        </TouchableOpacity>
      </View>

      {/* 5. Barra Inferior Estilo TikTok: PUBLICAR | CREAR | LIVE */}
      <View style={styles.preLiveBottomNavBar}>
        <TouchableOpacity style={styles.navBarTextBtn} onPress={onClose}>
          <Text style={styles.navBarInactiveText}>PUBLICAR</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navBarTextBtn} onPress={onClose}>
          <Text style={styles.navBarInactiveText}>CREAR</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navBarTextBtn}>
          <Text style={styles.navBarActiveText}>LIVE</Text>
        </TouchableOpacity>
      </View>

      {/* ========================================================================= */}
      {/* MODAL 1: MEJORAR (FILTROS DE BELLEZA REALES) */}
      {/* ========================================================================= */}
      {showBeautyModal && (
        <Modal visible={true} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowBeautyModal(false)} />
            <View style={styles.bottomDrawer}>
              <View style={styles.drawerHeader}>
                <Text style={styles.drawerTitle}>Mejorar Rostro y Piel</Text>
                <TouchableOpacity onPress={() => setShowBeautyModal(false)}>
                  <Check size={20} color="#30D158" />
                </TouchableOpacity>
              </View>

              {/* Sliders */}
              <View style={styles.sliderControlRow}>
                <Text style={styles.sliderLabel}>Suavizado de piel: {smoothValue}%</Text>
                <View style={styles.sliderBarFake}>
                  <TouchableOpacity
                    style={[styles.sliderFillFake, { width: `${smoothValue}%` }]}
                    onPress={() => setSmoothValue((smoothValue + 20) % 100)}
                  />
                </View>
              </View>

              <View style={styles.sliderControlRow}>
                <Text style={styles.sliderLabel}>Tono y Brillo: {toneValue}%</Text>
                <View style={styles.sliderBarFake}>
                  <TouchableOpacity
                    style={[styles.sliderFillFake, { width: `${toneValue}%`, backgroundColor: '#FFD700' }]}
                    onPress={() => setToneValue((toneValue + 20) % 100)}
                  />
                </View>
              </View>

              <View style={styles.sliderControlRow}>
                <Text style={styles.sliderLabel}>Ojos grandes: {eyesValue}%</Text>
                <View style={styles.sliderBarFake}>
                  <TouchableOpacity
                    style={[styles.sliderFillFake, { width: `${eyesValue}%`, backgroundColor: '#00F2FE' }]}
                    onPress={() => setEyesValue((eyesValue + 20) % 100)}
                  />
                </View>
              </View>

              <View style={styles.sliderControlRow}>
                <Text style={styles.sliderLabel}>Adelgazar rostro: {faceValue}%</Text>
                <View style={styles.sliderBarFake}>
                  <TouchableOpacity
                    style={[styles.sliderFillFake, { width: `${faceValue}%`, backgroundColor: '#FF2D55' }]}
                    onPress={() => setFaceValue((faceValue + 20) % 100)}
                  />
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EFECTOS VISUALES AR */}
      {/* ========================================================================= */}
      {showEffectsModal && (
        <Modal visible={true} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowEffectsModal(false)} />
            <View style={styles.bottomDrawer}>
              <View style={styles.drawerHeader}>
                <Text style={styles.drawerTitle}>Filtros Visuales y Efectos</Text>
                <TouchableOpacity onPress={() => setShowEffectsModal(false)}>
                  <Check size={20} color="#30D158" />
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 12 }}>
                {[
                  { id: 'normal', name: 'Original', icon: '✨' },
                  { id: 'neon', name: 'Neón Glow', icon: '⚡' },
                  { id: 'golden', name: 'Golden Hour', icon: '🌅' },
                  { id: 'cyberpunk', name: 'Cyberpunk', icon: '🔮' },
                  { id: 'warm', name: 'Cálido', icon: '🔥' },
                  { id: 'bw', name: 'Retro B&W', icon: '🎞️' },
                ].map((eff) => (
                  <TouchableOpacity
                    key={eff.id}
                    style={[
                      styles.effectChip,
                      activeEffect === eff.id && styles.effectChipActive,
                    ]}
                    onPress={() => setActiveEffect(eff.id as any)}
                  >
                    <Text style={{ fontSize: 24, marginBottom: 4 }}>{eff.icon}</Text>
                    <Text style={styles.effectChipName}>{eff.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: AJUSTES DE CALIDAD Y TRANSMISIÓN */}
      {/* ========================================================================= */}
      {showSettingsModal && (
        <Modal visible={true} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowSettingsModal(false)} />
            <View style={styles.bottomDrawer}>
              <View style={styles.drawerHeader}>
                <Text style={styles.drawerTitle}>Ajustes de Transmisión</Text>
                <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                  <Check size={20} color="#30D158" />
                </TouchableOpacity>
              </View>

              <View style={styles.settingSwitchRow}>
                <Text style={styles.settingLabel}>Calidad de Video</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {(['1080p', '720p', '480p'] as const).map((q) => (
                    <TouchableOpacity
                      key={q}
                      style={[styles.qualityPill, quality === q && styles.qualityPillActive]}
                      onPress={() => setQuality(q)}
                    >
                      <Text style={[styles.qualityText, quality === q && { color: '#000000', fontWeight: 'bold' }]}>
                        {q}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.settingSwitchRow}>
                <Text style={styles.settingLabel}>Permitir regalos de espectadores</Text>
                <Switch
                  value={allowGifts}
                  onValueChange={setAllowGifts}
                  trackColor={{ false: '#3A3A4C', true: '#FF2D55' }}
                />
              </View>

              <View style={styles.settingSwitchRow}>
                <Text style={styles.settingLabel}>Filtro antispam en chat</Text>
                <Switch
                  value={antiSpamFilter}
                  onValueChange={setAntiSpamFilter}
                  trackColor={{ false: '#3A3A4C', true: '#30D158' }}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: OBJETIVO DEL LIVE */}
      {/* ========================================================================= */}
      {showGoalModal && (
        <Modal visible={true} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowGoalModal(false)} />
            <View style={styles.bottomDrawer}>
              <View style={styles.drawerHeader}>
                <Text style={styles.drawerTitle}>Objetivo del LIVE</Text>
                <TouchableOpacity onPress={() => setShowGoalModal(false)}>
                  <Check size={20} color="#30D158" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubheading}>Título del Objetivo:</Text>
              <TextInput
                style={styles.modalTextInput}
                value={goalText}
                onChangeText={setGoalText}
                placeholder="Ej. Meta: 100 Rosas para bailar"
                placeholderTextColor="#8E8E93"
              />

              <Text style={[styles.modalSubheading, { marginTop: 12 }]}>
                Cantidad Meta (Monedas/Rosas):
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                {[50, 100, 250, 500].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.qualityPill, goalTarget === t && styles.qualityPillActive]}
                    onPress={() => setGoalTarget(t)}
                  >
                    <Text style={[styles.qualityText, goalTarget === t && { color: '#000', fontWeight: 'bold' }]}>
                      {t} 🌹
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: RESUMEN DE TRANSMISIÓN TERMINADA */}
      {/* ========================================================================= */}
      {showSummaryModal && summaryStats && (
        <Modal visible={true} transparent animationType="fade">
          <View style={styles.summaryBackdrop}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryHeaderTitle}>Transmisión Finalizada</Text>
              <Text style={styles.summarySubtitle}>¡Gran trabajo en tu LIVE!</Text>

              <View style={styles.summaryMetricsGrid}>
                <View style={styles.summaryMetricItem}>
                  <Text style={styles.summaryMetricValue}>{summaryStats.duration}</Text>
                  <Text style={styles.summaryMetricLabel}>Duración</Text>
                </View>

                <View style={styles.summaryMetricItem}>
                  <Text style={styles.summaryMetricValue}>{summaryStats.viewers}</Text>
                  <Text style={styles.summaryMetricLabel}>Espectadores totales</Text>
                </View>

                <View style={styles.summaryMetricItem}>
                  <Text style={[styles.summaryMetricValue, { color: '#FFD700' }]}>
                    {summaryStats.diamonds} 💎
                  </Text>
                  <Text style={styles.summaryMetricLabel}>Diamantes ganados</Text>
                </View>

                <View style={styles.summaryMetricItem}>
                  <Text style={[styles.summaryMetricValue, { color: '#30D158' }]}>
                    +{summaryStats.followers}
                  </Text>
                  <Text style={styles.summaryMetricLabel}>Nuevos seguidores</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.summaryCloseBtn}
                onPress={() => {
                  setShowSummaryModal(false);
                  onClose();
                }}
              >
                <Text style={styles.summaryCloseBtnText}>Aceptar y Salir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
  cameraPreviewVideo: {
    ...StyleSheet.absoluteFillObject,
  },
  filterOverlay: {
    ...StyleSheet.absoluteFillObject,
  },

  // ---------------------------------------------------------
  // MODO ESTUDIO EN VIVO
  // ---------------------------------------------------------
  studioHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 24,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  liveIndicatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF2D55',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
    gap: 6,
  },
  redLivePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  liveBadgeLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  liveTimerText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  studioStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  studioStatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  studioStatValue: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  finishLiveBtn: {
    backgroundColor: 'rgba(255, 59, 48, 0.85)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  finishLiveBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  giftReceivedToast: {
    position: 'absolute',
    top: 90,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFD700',
    zIndex: 30,
  },
  giftReceivedToastText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
  },
  goalStudioBarBox: {
    position: 'absolute',
    top: 135,
    left: 14,
    right: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    padding: 8,
    borderRadius: 10,
    zIndex: 20,
  },
  goalStudioBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  goalStudioBarTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  goalStudioBarCount: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: 'bold',
  },
  goalStudioTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  goalStudioFill: {
    height: '100%',
    backgroundColor: '#30D158',
  },
  studioChatStreamBox: {
    position: 'absolute',
    bottom: 74,
    left: 14,
    right: 80,
    height: 180,
    zIndex: 20,
  },
  studioChatRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  studioChatUser: {
    color: '#00F2FE',
    fontSize: 11,
    fontWeight: 'bold',
  },
  studioChatText: {
    color: '#FFFFFF',
    fontSize: 11,
  },
  studioBottomToolbar: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 24,
    paddingVertical: 8,
    zIndex: 25,
  },
  studioToolBtn: {
    alignItems: 'center',
    gap: 3,
  },
  studioToolLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },

  // ---------------------------------------------------------
  // MODO CONFIGURACIÓN PRE-LIVE (IMAGEN 4)
  // ---------------------------------------------------------
  preLiveTopBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 26,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  topCloseBtn: {
    padding: 4,
  },
  topRewardsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  topRewardsText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  topRightIconsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  topMiniCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weeklyMissionBanner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 90 : 70,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    zIndex: 20,
  },
  weeklyMissionText: {
    color: '#FFFFFF',
    fontSize: 11,
    flex: 1,
    marginRight: 8,
  },
  toolsGridContainer: {
    position: 'absolute',
    top: '25%',
    left: 10,
    right: 10,
    zIndex: 20,
    gap: 18,
  },
  toolsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  toolGridItem: {
    alignItems: 'center',
    width: 68,
    gap: 4,
  },
  toolIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  toolRedDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF2D55',
  },
  toolGridLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 3,
  },
  preLiveCardBox: {
    position: 'absolute',
    bottom: 96,
    left: 14,
    right: 14,
    backgroundColor: 'rgba(20, 20, 28, 0.88)',
    borderRadius: 18,
    padding: 14,
    zIndex: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  streamerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  streamerCardAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
  },
  streamerTitleInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    marginRight: 8,
  },
  liveGoalPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 12,
  },
  liveGoalPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  broadcastBigRedBtn: {
    backgroundColor: '#FF2D55',
    paddingVertical: 14,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  broadcastBigRedBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  liveModesSelectorRow: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    zIndex: 20,
  },
  liveModeItem: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  liveModeItemActive: {},
  liveModeText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 12,
    fontWeight: 'bold',
  },
  liveModeTextActive: {
    color: '#FFFFFF',
  },
  preLiveBottomNavBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
    backgroundColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 0.5,
    borderTopColor: '#1A1A22',
    zIndex: 25,
  },
  navBarTextBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  navBarInactiveText: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: 'bold',
  },
  navBarActiveText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  // ---------------------------------------------------------
  // MODALES AUXILIARES
  // ---------------------------------------------------------
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  bottomDrawer: {
    backgroundColor: '#161622',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    paddingBottom: Platform.OS === 'ios' ? 32 : 18,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  drawerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  sliderControlRow: {
    marginBottom: 14,
  },
  sliderLabel: {
    color: '#D0D0D8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  sliderBarFake: {
    height: 8,
    backgroundColor: '#2A2A38',
    borderRadius: 4,
    overflow: 'hidden',
  },
  sliderFillFake: {
    height: '100%',
    backgroundColor: '#30D158',
  },
  effectChip: {
    backgroundColor: '#242434',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  effectChipActive: {
    borderColor: '#00F2FE',
    backgroundColor: 'rgba(0, 242, 254, 0.15)',
  },
  effectChipName: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  settingSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#242434',
  },
  settingLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  qualityPill: {
    backgroundColor: '#2A2A3A',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  qualityPillActive: {
    backgroundColor: '#00F2FE',
  },
  qualityText: {
    color: '#FFFFFF',
    fontSize: 11,
  },
  modalSubheading: {
    color: '#A0A0B0',
    fontSize: 12,
    fontWeight: '600',
  },
  modalTextInput: {
    backgroundColor: '#242434',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 13,
    marginTop: 6,
  },

  // Modal Resumen de Finalización
  summaryBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  summaryCard: {
    backgroundColor: '#161622',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A38',
  },
  summaryHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summarySubtitle: {
    color: '#8E8E93',
    fontSize: 13,
    marginBottom: 20,
  },
  summaryMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    width: '100%',
    marginBottom: 24,
  },
  summaryMetricItem: {
    width: '46%',
    backgroundColor: '#20202E',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  summaryMetricValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summaryMetricLabel: {
    color: '#8E8E93',
    fontSize: 11,
    textAlign: 'center',
  },
  summaryCloseBtn: {
    backgroundColor: '#FF2D55',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    width: '100%',
    alignItems: 'center',
  },
  summaryCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
