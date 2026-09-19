import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import { Radio, Users, Eye, Play, X, Send, Heart, Flame } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

import { api } from '../services/api';
import { LiveStreamItem } from '../types/auth';
import { TikTokLiveSpectatorScreen } from '../screens/TikTokLiveSpectatorScreen';

const { height } = Dimensions.get('window');

interface LiveCamsTeaserProps {
  onSelectLive?: (stream: LiveStreamItem) => void;
  onViewActor?: (actorId?: string, actorName?: string) => void;
}

export const LiveCamsTeaser: React.FC<LiveCamsTeaserProps> = ({
  onSelectLive,
  onViewActor,
}) => {
  const { colors } = useTheme();
  const [activeStreams, setActiveStreams] = useState<LiveStreamItem[]>([]);
  const [activeStream, setActiveStream] = useState<LiveStreamItem | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [streamLikes, setStreamLikes] = useState(12);
  const [chatMessages, setChatMessages] = useState<{ id: string; user: string; text: string }[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchLives = async () => {
      try {
        const lives = await api.live.getActive();
        if (isMounted) setActiveStreams(lives || []);
      } catch (_) {}
    };
    fetchLives();
    const interval = setInterval(fetchLives, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleSendChat = () => {
    if (!chatMessage.trim()) return;
    setChatMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), user: 'Tú', text: chatMessage.trim() },
    ]);
    setChatMessage('');
  };

  // Si no hay actores transmitiendo en vivo actualmente, no mostramos modelos simuladas
  if (!activeStreams || activeStreams.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Cabecera con Punto Rojo Parpadeante */}
      <View style={styles.sectionHeader}>
        <View style={styles.titleWithIcon}>
          <View style={styles.livePulseBox}>
            <View style={styles.livePulseDot} />
            <Radio size={14} color="#FF2D55" />
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Cams & Modelos En Vivo
              </Text>
              <View style={styles.liveTag}>
                <Text style={styles.liveTagText}>EN VIVO</Text>
              </View>
            </View>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Transmisiones interactivas en tiempo real
            </Text>
          </View>
        </View>
      </View>

      {/* Carrusel de Streamers */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
      >
        {activeStreams.map((item) => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.9}
            style={[
              styles.streamCard,
              { backgroundColor: colors.surfaceCard, borderColor: colors.border },
            ]}
            onPress={() => setActiveStream(item)}
          >
            {/* Imagen del Stream */}
            <View style={styles.thumbnailContainer}>
              <Image
                source={{ uri: item.actorAvatar }}
                style={styles.thumbnail as any}
                resizeMode="cover"
              />

              {/* Badge EN VIVO con espectadores */}
              <View style={styles.badgeRow}>
                <View style={styles.livePill}>
                  <View style={styles.redDot} />
                  <Text style={styles.livePillText}>LIVE</Text>
                </View>
                <View style={styles.viewersPill}>
                  <Eye size={10} color="#FFFFFF" style={{ marginRight: 3 }} />
                  <Text style={styles.viewersText}>{item.viewersCount}</Text>
                </View>
              </View>

              {/* Botón Central */}
              <View style={styles.centerPlay}>
                <Play size={18} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 2 }} />
              </View>
            </View>

            {/* Info del Stream */}
            <View style={styles.infoContainer}>
              <View style={styles.modelHeader}>
                <Image source={{ uri: item.actorAvatar }} style={styles.modelAvatar as any} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modelName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {item.actorName}
                  </Text>
                  <Text style={[styles.goalText, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                </View>
              </View>

              {/* Botón Entrar a Sala */}
              <TouchableOpacity
                style={[styles.enterRoomBtn, { backgroundColor: colors.primary }]}
                onPress={() => setActiveStream(item)}
                activeOpacity={0.8}
              >
                <Text style={styles.enterRoomBtnText}>VER TRANSMISIÓN EN VIVO</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Modal Interactivo de Transmisión en Vivo Estilo TikTok (Imagen 3) */}
      {activeStream && (
        <Modal
          visible={true}
          animationType="slide"
          onRequestClose={() => setActiveStream(null)}
        >
          <TikTokLiveSpectatorScreen
            stream={activeStream}
            onClose={() => setActiveStream(null)}
            onViewActor={onViewActor}
          />
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  livePulseBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 45, 85, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  livePulseDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF2D55',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  liveTag: {
    backgroundColor: '#FF2D55',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  liveTagText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
  },
  sectionSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  scrollList: {
    paddingHorizontal: 12,
    gap: 12,
  },
  streamCard: {
    width: 210,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
  },
  thumbnailContainer: {
    width: '100%',
    height: 126,
    position: 'relative',
    backgroundColor: '#1E1E28',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  badgeRow: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF2D55',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  redDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  livePillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  viewersPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  viewersText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  centerPlay: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    transform: [{ translateX: -16 }, { translateY: -16 }],
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  goalBarFill: {
    height: '100%',
    backgroundColor: '#30D158',
  },
  infoContainer: {
    padding: 10,
  },
  modelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  modelAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FF2D55',
  },
  modelName: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  goalText: {
    fontSize: 10,
    marginTop: 1,
  },
  enterRoomBtn: {
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  enterRoomBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#262634',
  },
  modalStreamerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FF2D55',
  },
  modalStreamerName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  modalLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF2D55',
  },
  modalLiveText: {
    color: '#A0A0B0',
    fontSize: 11,
  },
  modalCloseBtn: {
    padding: 6,
  },
  streamScreenWrapper: {
    width: '100%',
    height: height * 0.35,
    position: 'relative',
    backgroundColor: '#000000',
  },
  streamMainImage: {
    width: '100%',
    height: '100%',
  },
  streamGoalBox: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.75)',
    padding: 8,
    borderRadius: 8,
  },
  streamGoalTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  streamProgressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  streamProgressFill: {
    height: '100%',
    backgroundColor: '#30D158',
  },
  streamProgressLabel: {
    color: '#D0D0D0',
    fontSize: 9,
    marginTop: 3,
    textAlign: 'right',
  },
  chatSection: {
    flex: 1,
    backgroundColor: '#121217',
    padding: 12,
  },
  chatHeaderTitle: {
    color: '#A0A0B0',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  chatScroll: {
    flex: 1,
  },
  chatMessageRow: {
    flexDirection: 'row',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  chatUser: {
    color: '#FFB800',
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 6,
  },
  chatText: {
    color: '#E0E0E0',
    fontSize: 12,
    flex: 1,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#1C1C24',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 13,
  },
  sendBtn: {
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  heartText: {
    color: '#FF2D55',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
});
