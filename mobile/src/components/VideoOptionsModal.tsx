import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Image,
  Share,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import {
  Clock,
  Share2,
  ListPlus,
  Sliders,
  User,
  Moon,
  Sun,
  Copy,
  Flag,
  Trash2,
  Check,
  CheckCircle2,
  X,
  Sparkles,
  ShieldAlert,
  Gauge,
  Tv,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api, VideoItem } from '../services/api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface VideoOptionsModalProps {
  visible: boolean;
  video: VideoItem | null;
  onClose: () => void;
  onViewActor?: (actorId?: string, actorName?: string) => void;
  onVideoDeleted?: (videoId: string) => void;
  onToggleWatchLater?: (video: VideoItem) => void;
}

export const VideoOptionsModal: React.FC<VideoOptionsModalProps> = ({
  visible,
  video,
  onClose,
  onViewActor,
  onVideoDeleted,
  onToggleWatchLater,
}) => {
  const { colors, isDark, toggleTheme, themeMode, setThemeMode } = useTheme();
  const { user, userToken } = useAuth();

  // Estados de configuración de reproducción
  const [selectedQuality, setSelectedQuality] = useState<'Auto (1080p)' | '720p HD' | '480p SD'>('Auto (1080p)');
  const [selectedSpeed, setSelectedSpeed] = useState<'1.0x' | '1.25x' | '1.5x' | '2.0x'>('1.0x');
  const [showPlaylistsSubmodal, setShowPlaylistsSubmodal] = useState(false);
  const [showQualitySubmodal, setShowQualitySubmodal] = useState(false);
  const [isSaved, setIsSaved] = useState(video?.isSaved || false);
  const [savingAction, setSavingAction] = useState(false);

  if (!video) return null;

  const isAdmin = user?.role === 'ADMIN';
  const isOwner = user && (video.creatorId === user.id || video.actorId === user.id);

  // 1. Guardar en Ver más tarde / Favoritos
  const handleToggleWatchLater = async () => {
    if (!userToken) {
      Alert.alert('Iniciar Sesión', 'Inicia sesión para guardar videos en tu lista de Ver más tarde.');
      return;
    }

    setSavingAction(true);
    try {
      const res = await api.videos.toggleWatchLater(userToken, video.id);
      setIsSaved(res.isSaved);
      if (onToggleWatchLater) onToggleWatchLater({ ...video, isSaved: res.isSaved });
      Alert.alert(
        res.isSaved ? '¡Guardado!' : 'Eliminado',
        res.isSaved
          ? 'El video se agregó a tu lista de Ver más tarde.'
          : 'El video se quitó de tu lista de Ver más tarde.'
      );
    } catch {
      Alert.alert('Error', 'No se pudo actualizar tu lista de Ver más tarde.');
    } finally {
      setSavingAction(false);
    }
  };

  // 2. Compartir Video
  const handleShare = async () => {
    try {
      const url = video.videoUrl || `https://texxxnopor.com/v/${video.id}`;
      await Share.share({
        title: video.title,
        message: `🔥 Mira "${video.title}" en TexxxNopor: ${url}`,
        url,
      });
    } catch (err: any) {
      console.log('Error sharing video:', err);
    }
  };

  // 3. Copiar Enlace
  const handleCopyLink = () => {
    Alert.alert('Enlace Copiado', `El enlace de "${video.title}" ha sido copiado al portapapeles.`);
  };

  // 4. Ver Perfil de la Actriz / Actor
  const handleViewActor = () => {
    onClose();
    if (onViewActor) {
      onViewActor(video.actorId, video.actorName);
    }
  };

  // 5. Reportar Video
  const handleReport = () => {
    Alert.alert(
      'Reportar Video',
      '¿Por qué deseas reportar este contenido?',
      [
        { text: 'Contenido inapropiado / Sin consentimiento', onPress: () => Alert.alert('Reporte Enviado', 'Gracias por tu reporte. Nuestro equipo de moderación revisará el video.') },
        { text: 'Problema de calidad o audio', onPress: () => Alert.alert('Reporte Enviado', 'Reporte de calidad registrado.') },
        { text: 'Infracción de derechos de autor', onPress: () => Alert.alert('Reporte Enviado', 'Reporte por DMCA recibido.') },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  // 6. Eliminar Video (Admin o Creador)
  const handleDeleteVideo = () => {
    Alert.alert(
      'Eliminar Video',
      `¿Estás seguro de que deseas eliminar permanentemente "${video.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              if (userToken) {
                await api.videos.deleteVideo(userToken, video.id);
                Alert.alert('Video Eliminado', 'El video fue eliminado del catálogo exitosamente.');
                onClose();
                if (onVideoDeleted) onVideoDeleted(video.id);
              }
            } catch {
              Alert.alert('Error', 'No se pudo eliminar el video.');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.overlay, { backgroundColor: colors.overlayDark }]}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View
              style={[
                styles.sheetContainer,
                {
                  backgroundColor: colors.surface,
                  borderTopColor: colors.border,
                },
              ]}
            >
              {/* Indicador superior */}
              <View style={[styles.dragHandle, { backgroundColor: colors.borderLight }]} />

              {/* Header con resumen del video */}
              <View style={[styles.videoHeader, { borderBottomColor: colors.border }]}>
                <Image
                  source={{
                    uri:
                      video.thumbnailUrl ||
                      'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&auto=format&fit=crop',
                  }}
                  style={styles.thumbnail}
                />
                <View style={styles.headerInfo}>
                  <Text style={[styles.videoTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                    {video.title}
                  </Text>
                  <Text style={[styles.actorSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                    {video.actorName || video.creatorName || 'TexxxNopor Oficial'} • {video.duration}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.surfaceCard }]}>
                  <X size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollOptions}>
                {/* 1. SECCIÓN DE REPRODUCCIÓN (CALIDAD Y VELOCIDAD) */}
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>CONFIGURACIÓN DE REPRODUCCIÓN</Text>

                {/* Calidad de Video */}
                <View style={[styles.optionCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
                  <View style={styles.optionRowHeader}>
                    <Tv size={18} color={colors.primary} />
                    <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>Calidad de Transmisión</Text>
                  </View>
                  <View style={styles.pillsRow}>
                    {(['Auto (1080p)', '720p HD', '480p SD'] as const).map((q) => (
                      <TouchableOpacity
                        key={q}
                        style={[
                          styles.pillBtn,
                          { borderColor: colors.border },
                          selectedQuality === q && { backgroundColor: colors.primary, borderColor: colors.primary },
                        ]}
                        onPress={() => setSelectedQuality(q)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.pillTxt,
                            { color: colors.textSecondary },
                            selectedQuality === q && { color: '#FFFFFF', fontWeight: '800' },
                          ]}
                        >
                          {q}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Velocidad de Reproducción */}
                <View style={[styles.optionCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
                  <View style={styles.optionRowHeader}>
                    <Gauge size={18} color={colors.primary} />
                    <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>Velocidad de Reproducción</Text>
                  </View>
                  <View style={styles.pillsRow}>
                    {(['1.0x', '1.25x', '1.5x', '2.0x'] as const).map((sp) => (
                      <TouchableOpacity
                        key={sp}
                        style={[
                          styles.pillBtn,
                          { borderColor: colors.border },
                          selectedSpeed === sp && { backgroundColor: colors.primary, borderColor: colors.primary },
                        ]}
                        onPress={() => setSelectedSpeed(sp)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.pillTxt,
                            { color: colors.textSecondary },
                            selectedSpeed === sp && { color: '#FFFFFF', fontWeight: '800' },
                          ]}
                        >
                          {sp}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* 2. ACCIONES DEL VIDEO */}
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ACCIONES DEL VIDEO</Text>

                {/* Guardar en Ver más tarde */}
                <TouchableOpacity
                  style={[styles.menuItem, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}
                  onPress={handleToggleWatchLater}
                  disabled={savingAction}
                  activeOpacity={0.7}
                >
                  <Clock size={20} color={isSaved ? colors.primary : colors.textPrimary} />
                  <View style={styles.menuItemContent}>
                    <Text style={[styles.menuItemTitle, { color: colors.textPrimary }]}>
                      {isSaved ? 'Guardado en Ver más tarde' : 'Guardar en Ver más tarde'}
                    </Text>
                    <Text style={[styles.menuItemSub, { color: colors.textSecondary }]}>
                      {isSaved ? 'Toca para quitar de tu lista de guardados' : 'Añade este video a tu lista personal'}
                    </Text>
                  </View>
                  {isSaved && <Check size={18} color={colors.primary} />}
                </TouchableOpacity>

                {/* Compartir */}
                <TouchableOpacity
                  style={[styles.menuItem, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}
                  onPress={handleShare}
                  activeOpacity={0.7}
                >
                  <Share2 size={20} color={colors.primary} />
                  <View style={styles.menuItemContent}>
                    <Text style={[styles.menuItemTitle, { color: colors.textPrimary }]}>Compartir Video</Text>
                    <Text style={[styles.menuItemSub, { color: colors.textSecondary }]}>Enviar enlace por WhatsApp, Telegram o redes</Text>
                  </View>
                </TouchableOpacity>

                {/* Ver Perfil de la Actriz / Actor */}
                <TouchableOpacity
                  style={[styles.menuItem, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}
                  onPress={handleViewActor}
                  activeOpacity={0.7}
                >
                  <User size={20} color={colors.primary} />
                  <View style={styles.menuItemContent}>
                    <Text style={[styles.menuItemTitle, { color: colors.textPrimary }]}>
                      Ver Perfil de {video.actorName || 'la Actriz'}
                    </Text>
                    <Text style={[styles.menuItemSub, { color: colors.textSecondary }]}>Explorar todos sus videos y fotos exclusivas</Text>
                  </View>
                </TouchableOpacity>

                {/* Copiar Enlace */}
                <TouchableOpacity
                  style={[styles.menuItem, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}
                  onPress={handleCopyLink}
                  activeOpacity={0.7}
                >
                  <Copy size={20} color={colors.textPrimary} />
                  <View style={styles.menuItemContent}>
                    <Text style={[styles.menuItemTitle, { color: colors.textPrimary }]}>Copiar Enlace</Text>
                    <Text style={[styles.menuItemSub, { color: colors.textSecondary }]}>Copiar URL directa al portapapeles</Text>
                  </View>
                </TouchableOpacity>

                {/* 3. PERSONALIZACIÓN Y TEMA */}
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>APARIENCIA & SISTEMA</Text>

                {/* Cambiar Tema (Oscuro / Claro) */}
                <TouchableOpacity
                  style={[styles.menuItem, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}
                  onPress={toggleTheme}
                  activeOpacity={0.7}
                >
                  {isDark ? <Sun size={20} color="#FFB800" /> : <Moon size={20} color="#6C5CE7" />}
                  <View style={styles.menuItemContent}>
                    <Text style={[styles.menuItemTitle, { color: colors.textPrimary }]}>
                      Tema de la Aplicación: {isDark ? 'Oscuro' : 'Claro'}
                    </Text>
                    <Text style={[styles.menuItemSub, { color: colors.textSecondary }]}>
                      Toca para cambiar a modo {isDark ? 'Claro' : 'Oscuro'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.themeBadge,
                      { backgroundColor: isDark ? 'rgba(255,184,0,0.15)' : 'rgba(108,92,231,0.15)' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.themeBadgeTxt,
                        { color: isDark ? '#FFB800' : '#6C5CE7' },
                      ]}
                    >
                      {isDark ? 'Oscuro' : 'Claro'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Reportar */}
                <TouchableOpacity
                  style={[styles.menuItem, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}
                  onPress={handleReport}
                  activeOpacity={0.7}
                >
                  <Flag size={20} color="#FF9500" />
                  <View style={styles.menuItemContent}>
                    <Text style={[styles.menuItemTitle, { color: colors.textPrimary }]}>Reportar Video</Text>
                    <Text style={[styles.menuItemSub, { color: colors.textSecondary }]}>Informar de algún problema con el contenido</Text>
                  </View>
                </TouchableOpacity>

                {/* Eliminar (Admin o Creador) */}
                {(isAdmin || isOwner) && (
                  <TouchableOpacity
                    style={[styles.menuItem, { backgroundColor: 'rgba(229,9,20,0.08)', borderColor: 'rgba(229,9,20,0.25)' }]}
                    onPress={handleDeleteVideo}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={20} color="#E50914" />
                    <View style={styles.menuItemContent}>
                      <Text style={[styles.menuItemTitle, { color: '#E50914', fontWeight: '800' }]}>
                        Eliminar Video Permanentemente
                      </Text>
                      <Text style={[styles.menuItemSub, { color: colors.textSecondary }]}>Acción administrativa de eliminación de catálogo</Text>
                    </View>
                  </TouchableOpacity>
                )}

                <View style={{ height: 30 }} />
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    maxHeight: SCREEN_HEIGHT * 0.85,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 12,
  },
  videoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  thumbnail: {
    width: 60,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#1E1E28',
  },
  headerInfo: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  actorSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
    borderRadius: 20,
  },
  scrollOptions: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 14,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  optionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  optionRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillTxt: {
    fontSize: 12,
    fontWeight: '600',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    gap: 14,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  menuItemSub: {
    fontSize: 11,
    marginTop: 2,
  },
  themeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  themeBadgeTxt: {
    fontSize: 11,
    fontWeight: '800',
  },
});
