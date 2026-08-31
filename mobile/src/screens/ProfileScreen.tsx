import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Alert,
  Switch,
  Modal,
  FlatList,
  ActivityIndicator,
  Platform,
  TextInput,
  Linking,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import {
  User,
  Rss,
  ThumbsUp,
  History,
  Clock,
  Banknote,
  Palette,
  LayoutGrid,
  ZoomIn,
  PlaySquare,
  Eye,
  Languages,
  CheckCircle2,
  Settings,
  ShieldCheck,
  Film,
  Sparkles,
  Lock,
  LogOut,
  ChevronRight,
  Check,
  Sliders,
  Tv,
  X,
  Play,
  Trash2,
  Camera,
  UploadCloud,
  Sun,
  Moon,
  Crown,
  EyeOff,
  ListPlus,
  Bell,
  DownloadCloud,
  Download,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { AuthScreen } from '../navigation/AuthStack';
import { api, UserStats, SubscriptionItem, VideoItem } from '../services/api';
import { PremiumGatewayModal } from '../components/PremiumGatewayModal';
import { NotificationsModal } from '../components/NotificationsModal';
import { OfflineDownloadsModal } from '../components/OfflineDownloadsModal';
import { offlineStorage } from '../services/offlineStorage';

interface ProfileScreenProps {
  onSelectVideo?: (video: any) => void;
  onOpenAdminPanel?: () => void;
  onViewActor?: (actorId?: string, actorName?: string) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onSelectVideo, onOpenAdminPanel, onViewActor }) => {
  const { colors, isDark, themeMode, setThemeMode, toggleTheme } = useTheme();
  const { userToken, user, signOut, updateUser } = useAuth();

  // Estadísticas reales del usuario desde PostgreSQL
  const [stats, setStats] = useState<UserStats>({
    subscriptionsCount: 0,
    likedVideosCount: 0,
    historyCount: 0,
    watchLaterCount: 0,
  });
  const [myVideosCount, setMyVideosCount] = useState(0);
  const [playlistsCount, setPlaylistsCount] = useState(0);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showBecomeActorModal, setShowBecomeActorModal] = useState(false);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [offlineCount, setOfflineCount] = useState(0);
  const [actorStageName, setActorStageName] = useState('');
  const [actorBio, setActorBio] = useState('');
  const [isUpgradingActor, setIsUpgradingActor] = useState(false);
  const [isWaitingActorVerification, setIsWaitingActorVerification] = useState(false);
  const [actorTransactionRef, setActorTransactionRef] = useState('');

  // Modal para ver listas detalladas
  const [activeModalList, setActiveModalList] = useState<
    'SUBSCRIPTIONS' | 'LIKED' | 'HISTORY' | 'WATCH_LATER' | 'MY_VIDEOS' | 'PLAYLISTS' | null
  >(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalItems, setModalItems] = useState<any[]>([]);
  const [loadingModal, setLoadingModal] = useState(false);

  // Estados interactivos para las opciones de Interfaz de Usuario
  const [currency, setCurrency] = useState<'COP' | 'USD' | 'EUR' | 'MXN'>('COP');
  const [columnLayout, setColumnLayout] = useState<'1 columna' | '2 columnas' | '4 columnas'>('4 columnas');

  // Switches interactivos
  const [largeUI, setLargeUI] = useState(false);
  const [videoPreview, setVideoPreview] = useState(true);
  const [watchLaterBtn, setWatchLaterBtn] = useState(true);
  const [likedVideosPage, setLikedVideosPage] = useState(true);
  const [watchedIcon, setWatchedIcon] = useState(true);
  const [autoTranslateTitles, setAutoTranslateTitles] = useState(true);

  // Selectores desplegables
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  // Cargar estadísticas reales, videos subidos, listas y notificaciones del usuario
  const loadUserStats = useCallback(async () => {
    // Cargar descargas offline siempre
    offlineStorage.getDownloads().then((downloads) => setOfflineCount(downloads.length));

    if (!userToken) return;
    try {
      const [data, myVids, myPlaylists, notifs] = await Promise.all([
        api.user.getStats(userToken),
        api.user.getMyVideos(userToken),
        api.user.getPlaylists(userToken),
        api.notifications.getNotifications(userToken),
      ]);
      setStats(data);
      setMyVideosCount(myVids.length);
      setPlaylistsCount(myPlaylists.length);
      setUnreadNotifsCount(notifs.unreadCount);
    } catch (err) {
      console.log('Error fetching user stats:', err);
    }
  }, [userToken]);

  useEffect(() => {
    loadUserStats();
  }, [loadUserStats]);

  // Cambiar foto de perfil desde la galería y subir a la nube
  const handleChangeAvatar = async () => {
    Alert.alert(
      'Foto de Perfil',
      'Personaliza tu foto de perfil o avatar de usuario:',
      [
        {
          text: 'Seleccionar de Galería',
          onPress: async () => {
            try {
              const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (!permission.granted) {
                Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería para cambiar la foto.');
                return;
              }

              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.85,
              });

              if (!result.canceled && result.assets && result.assets.length > 0) {
                setIsUploadingAvatar(true);
                const uploadRes = await api.cloudinary.uploadImageFile(
                  userToken || 'token_demo',
                  result.assets[0].uri
                );

                if (uploadRes && uploadRes.secure_url) {
                  await api.user.updateProfile(userToken || '', {
                    avatarUrl: uploadRes.secure_url,
                  });
                  if (updateUser) {
                    updateUser({ avatarUrl: uploadRes.secure_url });
                  }
                  Alert.alert('¡Foto Actualizada!', 'Tu foto de perfil se guardó correctamente en la nube.');
                } else {
                  Alert.alert('Error', 'No se pudo procesar la subida de la imagen.');
                }
              }
            } catch (err: any) {
              Alert.alert('Error', 'No se pudo actualizar la foto de perfil.');
            } finally {
              setIsUploadingAvatar(false);
            }
          },
        },
        ...(user?.avatarUrl
          ? [
              {
                text: 'Eliminar Foto (Dejar sin foto)',
                style: 'destructive' as const,
                onPress: async () => {
                  setIsUploadingAvatar(true);
                  try {
                    await api.user.updateProfile(userToken || '', { avatarUrl: null });
                    if (updateUser) {
                      updateUser({ avatarUrl: undefined });
                    }
                    Alert.alert('Foto Eliminada', 'Tu perfil ahora no tiene ninguna foto asignada.');
                  } catch (err) {
                    Alert.alert('Error', 'No se pudo eliminar la foto.');
                  } finally {
                    setIsUploadingAvatar(false);
                  }
                },
              },
            ]
          : []),
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  if (!user) {
    return <AuthScreen />;
  }

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('¿Estás seguro de que deseas salir de tu cuenta?')) {
        signOut();
      }
    } else {
      Alert.alert('Cerrar Sesión', '¿Estás seguro de que deseas salir de tu cuenta?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar Sesión', style: 'destructive', onPress: signOut },
      ]);
    }
  };

  // Abrir modal con Mis Videos Subidos (Para gestionar, pausar o eliminar)
  const openMyVideos = async () => {
    setModalTitle('Mis Videos Subidos');
    setActiveModalList('MY_VIDEOS');
    setLoadingModal(true);
    try {
      const data = await api.user.getMyVideos(userToken);
      setModalItems(data);
      setMyVideosCount(data.length);
    } finally {
      setLoadingModal(false);
    }
  };

  // Pausar o Reactivar Video de Actor
  const handleToggleVideoStatus = async (video: any) => {
    const isCurrentlyActive = video.status === 'READY';
    const newStatus = isCurrentlyActive ? 'FLAGGED' : 'READY';
    const actionName = isCurrentlyActive ? 'Pausar / Desactivar' : 'Activar';

    Alert.alert(
      `${actionName} Video`,
      `¿Deseas ${isCurrentlyActive ? 'ocultar temporalmente este video del catálogo público' : 'volver a publicar y activar este video'}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              if (userToken) {
                await api.videos.updateStatus(userToken, video.id, newStatus);
              }
              setModalItems((prev) =>
                prev.map((v) => (v.id === video.id ? { ...v, status: newStatus } : v))
              );
              Alert.alert('¡Éxito!', `El video ha sido ${isCurrentlyActive ? 'desactivado' : 'activado'} correctamente.`);
            } catch (err: any) {
              Alert.alert('Error', 'No se pudo actualizar el estado del video.');
            }
          },
        },
      ]
    );
  };

  // Eliminar Video Permanentemente
  const handleDeleteMyVideo = async (video: any) => {
    Alert.alert(
      'Eliminar Video',
      `¿Estás seguro de que deseas eliminar permanentemente "${video.title}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar Definitivamente',
          style: 'destructive',
          onPress: async () => {
            try {
              if (userToken) {
                await api.videos.deleteVideo(userToken, video.id);
              }
              setModalItems((prev) => prev.filter((v) => v.id !== video.id));
              setMyVideosCount((prev) => Math.max(0, prev - 1));
              Alert.alert('Eliminado', 'Tu video ha sido eliminado permanentemente de la base de datos.');
            } catch (err: any) {
              Alert.alert('Error', 'No se pudo eliminar el video.');
            }
          },
        },
      ]
    );
  };

  // Abrir modal con Mis Listas de Reproducción
  const openPlaylists = async () => {
    setModalTitle('Mis Listas de Reproducción');
    setActiveModalList('PLAYLISTS');
    setLoadingModal(true);
    try {
      const data = await api.user.getPlaylists(userToken);
      setModalItems(data);
      setPlaylistsCount(data.length);
    } finally {
      setLoadingModal(false);
    }
  };

  // Abrir modal con lista de Suscripciones reales
  const openSubscriptions = async () => {
    setModalTitle('Mis Suscripciones');
    setActiveModalList('SUBSCRIPTIONS');
    setLoadingModal(true);
    try {
      const data = await api.user.getSubscriptions(userToken);
      setModalItems(data);
    } finally {
      setLoadingModal(false);
    }
  };

  // Abrir modal con Videos que le gustan reales
  const openLikedVideos = async () => {
    setModalTitle('Vídeos que te gustan');
    setActiveModalList('LIKED');
    setLoadingModal(true);
    try {
      const data = await api.user.getLikes(userToken);
      setModalItems(data);
    } finally {
      setLoadingModal(false);
    }
  };

  // Abrir modal con Historial de reproducción real
  const openHistory = async () => {
    setModalTitle('Historial de Reproducción');
    setActiveModalList('HISTORY');
    setLoadingModal(true);
    try {
      const data = await api.user.getHistory(userToken);
      setModalItems(data);
    } finally {
      setLoadingModal(false);
    }
  };

  // Abrir modal con Ver después real
  const openWatchLater = async () => {
    setModalTitle('Ver después');
    setActiveModalList('WATCH_LATER');
    setLoadingModal(true);
    try {
      const data = await api.user.getFavorites(userToken);
      setModalItems(data);
    } finally {
      setLoadingModal(false);
    }
  };

  // 1. Abrir pasarela Wompi para pago de $5.000 COP
  const handleUpgradeToActor = async () => {
    if (!actorStageName.trim()) {
      Alert.alert('Nombre Artístico Requerido', 'Por favor ingresa tu nombre artístico para tu perfil de actor.');
      return;
    }

    // Abrir pasarela de pagos oficial Wompi Bancolombia ($5.000 COP)
    const WOMPI_DIRECT_CHECKOUT_URL = 'https://checkout.wompi.co/l/VPOS_4BlRq7';
    try {
      await WebBrowser.openBrowserAsync(WOMPI_DIRECT_CHECKOUT_URL);
    } catch (_) {
      Linking.openURL(WOMPI_DIRECT_CHECKOUT_URL).catch(() => {});
    }

    // Mostrar pantalla de espera y confirmación de pago
    setIsWaitingActorVerification(true);
  };

  // 2. Confirmar y verificar el pago real de $5.000 COP
  const handleConfirmActorPayment = async () => {
    if (!userToken) return;

    setIsUpgradingActor(true);
    try {
      const res = await api.user.upgradeToActor(userToken, {
        stageName: actorStageName.trim(),
        bio: actorBio.trim(),
        paymentMethod: `Wompi Bancolombia Ref: ${actorTransactionRef.trim() || 'VPOS_4BlRq7'}`,
      });

      if (res && res.user) {
        if (updateUser) {
          updateUser({ role: 'CREATOR', isVerified: true });
        }
        setShowBecomeActorModal(false);
        setIsWaitingActorVerification(false);
        setActorTransactionRef('');
        loadUserStats();
        Alert.alert(
          '¡Bienvenido a los Creadores Oficiales!',
          'Tu pago ha sido verificado con éxito y tu cuenta fue ascendida al rol de Creador/Actor ($5.000 COP). Ya tienes acceso al estudio de publicación y tu perfil público.'
        );
      }
    } catch (err: any) {
      Alert.alert('Error al verificar pago', err.message || 'No se pudo verificar el pago. Intenta de nuevo.');
    } finally {
      setIsUpgradingActor(false);
    }
  };

  const handleClearHistory = async () => {
    Alert.alert('Limpiar Historial', '¿Deseas eliminar todo tu historial de reproducción?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Limpiar Todo',
        style: 'destructive',
        onPress: async () => {
          await api.user.clearHistory(userToken);
          setModalItems([]);
          loadUserStats();
        },
      },
    ]);
  };

  const isAdmin = user.role === 'ADMIN';
  const isCreator = user.role === 'CREATOR';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header del Perfil del Usuario Autenticado */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {user.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={[styles.profileAvatar, { borderColor: colors.primary }]} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
                <User size={38} color={colors.textSecondary} />
              </View>
            )}
            <TouchableOpacity
              style={[styles.avatarEditBtn, { backgroundColor: colors.primary }]}
              onPress={handleChangeAvatar}
              disabled={isUploadingAvatar}
              activeOpacity={0.8}
            >
              {isUploadingAvatar ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Camera size={14} color="#FFFFFF" />
              )}
            </TouchableOpacity>
            <View style={styles.onlineDot} />
          </View>

          <View style={styles.nameRow}>
            <Text style={[styles.profileName, { color: colors.textPrimary }]}>{user.username}</Text>
            {user.isVerified && (
              <CheckCircle2 size={18} color={colors.verifiedBlue} fill={colors.verifiedBlue} />
            )}
          </View>

          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user.email}</Text>

          {/* Botón Cambiar Foto de Perfil */}
          <TouchableOpacity
            style={[styles.editPhotoPill, { backgroundColor: colors.primaryGlow, borderColor: colors.primary }]}
            onPress={handleChangeAvatar}
            disabled={isUploadingAvatar}
            activeOpacity={0.8}
          >
            <Camera size={13} color={colors.primary} />
            <Text style={[styles.editPhotoPillText, { color: colors.primary }]}>
              {user.avatarUrl ? 'Cambiar Foto de Perfil' : 'Personalizar Foto de Perfil'}
            </Text>
          </TouchableOpacity>

          {/* Badges de Estado y Mayoría de Edad */}
          <View style={styles.badgeRow}>
            <View style={[styles.age18Badge, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
              <Text style={[styles.age18Text, { color: colors.textSecondary }]}>🔞 {user.age || 22} años · Verificado 18+</Text>
            </View>

            <View
              style={[
                styles.roleBadge,
                isAdmin
                  ? styles.roleBadgeAdmin
                  : isCreator
                  ? styles.roleBadgeCreator
                  : [styles.roleBadgeConsumer, { borderColor: colors.primary, backgroundColor: colors.primaryGlow }],
              ]}
            >
              <Text
                style={[
                  styles.roleBadgeText,
                  isAdmin
                    ? { color: '#0084FF' }
                    : isCreator
                    ? { color: '#FF2D55' }
                    : { color: colors.primary },
                ]}
              >
                Rol: {isAdmin ? '👑 Administrador' : isCreator ? '🎬 Actriz / Creador' : '👤 Espectador'}
              </Text>
            </View>
          </View>

          <Text style={[styles.authProviderText, { color: colors.textMuted }]}>
            Método de acceso: {user.authProvider || 'Cuenta Local'}
          </Text>
        </View>

        {/* BANNER PROMINENTE TEXXXNOPOR RED (PREMIUM) */}
        <TouchableOpacity
          style={styles.premiumBanner}
          onPress={() => setShowPremiumModal(true)}
          activeOpacity={0.85}
        >
          <View style={styles.premiumBannerLeft}>
            <View style={styles.redBadgeSmall}>
              <Text style={styles.redBadgeSmallText}>RED</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.premiumBannerTitle}>CONSIGUE EXCLUSIVIDAD</Text>
                <Crown size={14} color="#FFD700" />
              </View>
              <Text style={styles.premiumBannerSubtitle}>
                4K Ultra HD · Sin Anuncios · Contenido VIP de Actrices
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color="#FFFFFF" />
        </TouchableOpacity>

        {/* BOTÓN PARA CONVERTIRSE EN ACTOR / CREADOR ($5.000 COP) */}
        {!isAdmin && !isCreator && (
          <TouchableOpacity
            style={[styles.becomeActorBanner, { borderColor: '#FF2D55' }]}
            onPress={() => setShowBecomeActorModal(true)}
            activeOpacity={0.85}
          >
            <View style={styles.becomeActorIconBox}>
              <Film size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.becomeActorTitle}>¿QUIERES SER ACTOR / CREADOR?</Text>
                <Sparkles size={14} color="#FFD700" />
              </View>
              <Text style={styles.becomeActorSubtitle}>
                Publica tus producciones y gana seguidores · Solo $5.000 COP
              </Text>
            </View>
            <ChevronRight size={18} color="#FF2D55" />
          </TouchableOpacity>
        )}

        {/* BOTÓN DESTACADO PARA ADMINISTRADORES: ABRIR PANEL DE ADMIN */}
        {isAdmin && onOpenAdminPanel && (
          <TouchableOpacity
            style={styles.adminPanelButton}
            onPress={onOpenAdminPanel}
            activeOpacity={0.85}
          >
            <View style={styles.adminIconBox}>
              <Settings size={22} color="#000000" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.adminPanelTitle}>Panel de Administración (CRUD)</Text>
              <Text style={styles.adminPanelSubtitle}>
                Gestionar videos, catálogo de actores y roles RBAC
              </Text>
            </View>
            <ChevronRight size={18} color="#000000" />
          </TouchableOpacity>
        )}

        {/* ==================================================== */}
        {/* SECCIÓN 1: 👤 CUENTA (CONTADORES REALES DINÁMICOS) */}
        {/* ==================================================== */}
        <View style={[styles.sectionContainer, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          <View style={[styles.sectionHeaderRow, { borderBottomColor: colors.border }]}>
            <User size={16} color={colors.textSecondary} />
            <Text style={[styles.sectionHeaderText, { color: colors.textSecondary }]}>Cuenta</Text>
          </View>

          {/* Notificaciones (Seguidores, Likes y Comentarios) */}
          <TouchableOpacity
            style={[styles.menuRow, { borderBottomColor: colors.border }]}
            onPress={() => setShowNotificationsModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <Bell size={19} color="#FF2D55" fill={unreadNotifsCount > 0 ? '#FF2D55' : 'transparent'} />
              <Text style={[styles.menuLabel, { color: colors.textPrimary, fontWeight: unreadNotifsCount > 0 ? 'bold' : 'normal' }]}>
                Notificaciones
              </Text>
            </View>
            <View style={styles.menuRightBadge}>
              {unreadNotifsCount > 0 ? (
                <View style={styles.notifBadgePill}>
                  <Text style={styles.notifBadgePillText}>{unreadNotifsCount} nuevas</Text>
                </View>
              ) : (
                <Text style={[styles.menuBadgeText, { color: colors.textMuted }]}>Al día</Text>
              )}
              <ChevronRight size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          {/* Mis Videos Subidos (Para todos los usuarios y actores) */}
          <TouchableOpacity
            style={[styles.menuRow, { borderBottomColor: colors.border }]}
            onPress={openMyVideos}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <Film size={19} color={colors.primary} />
              <Text style={[styles.menuLabel, { color: colors.textPrimary, fontWeight: 'bold' }]}>
                Mis Videos Subidos
              </Text>
            </View>
            <View style={styles.menuRightBadge}>
              <Text style={[styles.menuBadgeText, { color: colors.primary, fontWeight: 'bold' }]}>
                {myVideosCount}
              </Text>
              <ChevronRight size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          {/* Mis Listas de Reproducción */}
          <TouchableOpacity
            style={[styles.menuRow, { borderBottomColor: colors.border }]}
            onPress={openPlaylists}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <ListPlus size={19} color={colors.textSecondary} />
              <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Mis Listas de Reproducción</Text>
            </View>
            <View style={styles.menuRightBadge}>
              <Text style={[styles.menuBadgeText, { color: colors.textSecondary }]}>{playlistsCount}</Text>
              <ChevronRight size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          {/* Mis Suscripciones */}
          <TouchableOpacity
            style={[styles.menuRow, { borderBottomColor: colors.border }]}
            onPress={openSubscriptions}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <Rss size={19} color={colors.textSecondary} />
              <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Mis Suscripciones</Text>
            </View>
            <View style={styles.menuRightBadge}>
              <Text style={[styles.menuBadgeText, { color: colors.textSecondary }]}>{stats.subscriptionsCount}</Text>
              <ChevronRight size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          {/* Vídeos que te gustan */}
          <TouchableOpacity
            style={[styles.menuRow, { borderBottomColor: colors.border }]}
            onPress={openLikedVideos}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <ThumbsUp size={19} color={colors.textSecondary} />
              <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Vídeos que te gustan</Text>
            </View>
            <View style={styles.menuRightBadge}>
              <Text style={[styles.menuBadgeText, { color: colors.textSecondary }]}>{stats.likedVideosCount}</Text>
              <ChevronRight size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          {/* Historial */}
          <TouchableOpacity
            style={[styles.menuRow, { borderBottomColor: colors.border }]}
            onPress={openHistory}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <History size={19} color={colors.textSecondary} />
              <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Historial</Text>
            </View>
            <View style={styles.menuRightBadge}>
              <Text style={[styles.menuBadgeText, { color: colors.textSecondary }]}>{stats.historyCount}</Text>
              <ChevronRight size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          {/* Ver después */}
          <TouchableOpacity
            style={[styles.menuRow, { borderBottomColor: colors.border }]}
            onPress={openWatchLater}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <Clock size={19} color={colors.textSecondary} />
              <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Ver después</Text>
            </View>
            <View style={styles.menuRightBadge}>
              <Text style={[styles.menuBadgeText, { color: colors.textSecondary }]}>{stats.watchLaterCount}</Text>
              <ChevronRight size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          {/* Mis Descargas Offline */}
          <TouchableOpacity
            style={[styles.menuRow, styles.menuRowNoBorder]}
            onPress={() => setShowOfflineModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <DownloadCloud size={19} color="#30D158" />
              <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Mis Descargas Offline</Text>
            </View>
            <View style={styles.menuRightBadge}>
              <View style={{ backgroundColor: 'rgba(48, 209, 88, 0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginRight: 6 }}>
                <Text style={{ color: '#30D158', fontSize: 11, fontWeight: 'bold' }}>{offlineCount} {offlineCount === 1 ? 'video' : 'videos'}</Text>
              </View>
              <ChevronRight size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        {/* ==================================================== */}
        {/* SECCIÓN 2: ⚙️ PREFERENCIAS DE LA INTERFAZ DE USUARIO */}
        {/* ==================================================== */}
        <View style={[styles.sectionContainer, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          <View style={[styles.sectionHeaderRow, { borderBottomColor: colors.border }]}>
            <Sliders size={16} color={colors.textSecondary} />
            <Text style={[styles.sectionHeaderText, { color: colors.textSecondary }]}>Opciones de Interfaz</Text>
          </View>

          {/* COLOR DEL TEMA: OSCURO O CLARO (SIN NEÓN) */}
          <TouchableOpacity
            style={[styles.menuRow, { borderBottomColor: colors.border }]}
            onPress={() => setShowThemePicker(!showThemePicker)}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              {isDark ? <Moon size={19} color={colors.primary} /> : <Sun size={19} color="#FFB800" />}
              <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>
                Color del tema : <Text style={{ color: colors.primary, fontWeight: 'bold' }}>{isDark ? 'Oscuro' : 'Claro'}</Text>
              </Text>
            </View>
            <View style={[styles.pillValueBox, { backgroundColor: colors.primary }]}>
              <Text style={styles.pillValueText}>{isDark ? 'Oscuro' : 'Claro'}</Text>
              <ChevronRight size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {showThemePicker && (
            <View style={[styles.dropdownOptionContainer, { backgroundColor: colors.surfaceCardLight, borderColor: colors.border }]}>
              {(['Oscuro', 'Claro'] as const).map((thm) => {
                const isSelected = (thm === 'Oscuro' && isDark) || (thm === 'Claro' && !isDark);
                return (
                  <TouchableOpacity
                    key={thm}
                    style={[
                      styles.dropdownOption,
                      isSelected && [styles.dropdownOptionSelected, { backgroundColor: colors.primaryGlow }],
                    ]}
                    onPress={() => {
                      setThemeMode(thm === 'Oscuro' ? 'dark' : 'light');
                      setShowThemePicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        { color: colors.textSecondary },
                        isSelected && { color: colors.primary, fontWeight: 'bold' },
                      ]}
                    >
                      {thm === 'Oscuro' ? '🌙 Modo Oscuro (Elegante)' : '☀️ Modo Claro (Limpio)'}
                    </Text>
                    {isSelected && <Check size={16} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Moneda */}
          <TouchableOpacity
            style={[styles.menuRow, { borderBottomColor: colors.border }]}
            onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <Banknote size={19} color={colors.textSecondary} />
              <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>
                Moneda : <Text style={{ color: colors.textPrimary, fontWeight: 'bold' }}>{currency}</Text>
              </Text>
            </View>
            <View style={[styles.pillValueBox, { backgroundColor: colors.primary }]}>
              <Text style={styles.pillValueText}>{currency}</Text>
              <ChevronRight size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {showCurrencyPicker && (
            <View style={[styles.dropdownOptionContainer, { backgroundColor: colors.surfaceCardLight, borderColor: colors.border }]}>
              {(['COP', 'USD', 'EUR', 'MXN'] as const).map((curr) => (
                <TouchableOpacity
                  key={curr}
                  style={[
                    styles.dropdownOption,
                    currency === curr && [styles.dropdownOptionSelected, { backgroundColor: colors.primaryGlow }],
                  ]}
                  onPress={() => {
                    setCurrency(curr);
                    setShowCurrencyPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownOptionText,
                      { color: colors.textSecondary },
                      currency === curr && { color: colors.primary, fontWeight: 'bold' },
                    ]}
                  >
                    {curr}
                  </Text>
                  {currency === curr && <Check size={16} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Filas por columna */}
          <TouchableOpacity
            style={[styles.menuRow, { borderBottomColor: colors.border }]}
            onPress={() => setShowColumnPicker(!showColumnPicker)}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <LayoutGrid size={19} color={colors.textSecondary} />
              <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>
                Filas por columna : <Text style={{ color: colors.textPrimary, fontWeight: 'bold' }}>{columnLayout}</Text>
              </Text>
            </View>
            <View style={[styles.pillValueBox, { backgroundColor: colors.primary }]}>
              <Text style={styles.pillValueText}>{columnLayout}</Text>
              <ChevronRight size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {showColumnPicker && (
            <View style={[styles.dropdownOptionContainer, { backgroundColor: colors.surfaceCardLight, borderColor: colors.border }]}>
              {(['4 columnas', '2 columnas', '1 columna'] as const).map((col) => (
                <TouchableOpacity
                  key={col}
                  style={[
                    styles.dropdownOption,
                    columnLayout === col && [styles.dropdownOptionSelected, { backgroundColor: colors.primaryGlow }],
                  ]}
                  onPress={() => {
                    setColumnLayout(col);
                    setShowColumnPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownOptionText,
                      { color: colors.textSecondary },
                      columnLayout === col && { color: colors.primary, fontWeight: 'bold' },
                    ]}
                  >
                    {col}
                  </Text>
                  {columnLayout === col && <Check size={16} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Interruptor interfaz grande */}
          <View style={[styles.menuRow, { borderBottomColor: colors.border }]}>
            <View style={styles.menuLeft}>
              <ZoomIn size={19} color={colors.textSecondary} />
              <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Interruptor de interfaz grande</Text>
            </View>
            <Switch
              value={largeUI}
              onValueChange={setLargeUI}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Vista previa de vídeos */}
          <View style={[styles.menuRow, { borderBottomColor: colors.border }]}>
            <View style={styles.menuLeft}>
              <PlaySquare size={19} color={colors.textSecondary} />
              <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Vista previa de vídeos</Text>
            </View>
            <Switch
              value={videoPreview}
              onValueChange={setVideoPreview}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Botón Ver después */}
          <View style={[styles.menuRow, { borderBottomColor: colors.border }]}>
            <View style={styles.menuLeft}>
              <Clock size={19} color={colors.textSecondary} />
              <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Botón «Ver después»</Text>
            </View>
            <Switch
              value={watchLaterBtn}
              onValueChange={setWatchLaterBtn}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Traducir títulos automáticamente */}
          <View style={[styles.menuRow, styles.menuRowNoBorder]}>
            <View style={styles.menuLeft}>
              <Languages size={19} color={colors.textSecondary} />
              <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Traducir títulos automáticamente</Text>
            </View>
            <Switch
              value={autoTranslateTitles}
              onValueChange={setAutoTranslateTitles}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Verificación de seguridad */}
        <View style={[styles.sectionContainer, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          <View style={[styles.menuRow, styles.menuRowNoBorder]}>
            <View style={styles.menuLeft}>
              <ShieldCheck size={19} color={colors.primary} />
              <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Seguridad TexxxNopor 18+</Text>
            </View>
            <CheckCircle2 size={18} color={colors.verifiedBlue} fill={colors.verifiedBlue} />
          </View>
        </View>

        {/* Footer de Versión y Estado de Seguridad */}
        <View style={{ alignItems: 'center', marginVertical: 14 }}>
          <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600' }}>
            TexxxNopor v1.4.0 (Build 5) · Modo Seguro & Offline
          </Text>
          <Text style={{ color: '#30D158', fontSize: 11, marginTop: 2 }}>
            ● Conexión Cifrada SSL/TLS con PostgreSQL & Wompi
          </Text>
        </View>

        {/* Botón de Cerrar Sesión */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.85}>
          <LogOut size={18} color="#FF3B30" style={{ marginRight: 8 }} />
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* MODAL DETALLADO PARA MIS VIDEOS SUBIDOS / SUSCRIPCIONES / ME GUSTA / HISTORIAL / VER DESPUÉS */}
      <Modal
        visible={!!activeModalList}
        animationType="slide"
        onRequestClose={() => setActiveModalList(null)}
      >
        <View style={[styles.detailModalContainer, { backgroundColor: colors.background }]}>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />

          {/* Header del Modal */}
          <View style={[styles.detailModalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <Text style={[styles.detailModalTitle, { color: colors.textPrimary }]}>{modalTitle}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {activeModalList === 'HISTORY' && modalItems.length > 0 && (
                <TouchableOpacity onPress={handleClearHistory} style={styles.clearHistoryBtn}>
                  <Trash2 size={16} color="#FF3B30" />
                  <Text style={styles.clearHistoryText}>Limpiar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setActiveModalList(null)}
                style={styles.closeModalBtn}
              >
                <X size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          {loadingModal ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : modalItems.length === 0 ? (
            <View style={styles.emptyModalContainer}>
              <Film size={48} color={colors.textMuted} style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyModalTitle, { color: colors.textPrimary }]}>No tienes elementos aquí aún</Text>
              <Text style={[styles.emptyModalSubtitle, { color: colors.textSecondary }]}>
                {activeModalList === 'MY_VIDEOS'
                  ? 'Aún no has subido ningún video. Usa la pestaña Publicar para subir tus producciones.'
                  : activeModalList === 'PLAYLISTS'
                  ? 'No has creado listas de reproducción aún.'
                  : activeModalList === 'SUBSCRIPTIONS'
                  ? 'Sigue a actrices o creadores desde los videos para verlos aquí.'
                  : activeModalList === 'LIKED'
                  ? 'Dale me gusta a tus videos favoritos para guardarlos en esta lista.'
                  : activeModalList === 'HISTORY'
                  ? 'Los videos que reproduzcas aparecerán automáticamente en tu historial.'
                  : 'Guarda videos usando el botón de marcador para verlos más tarde.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={modalItems}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16, gap: 12 }}
              renderItem={({ item }) => {
                if (activeModalList === 'SUBSCRIPTIONS') {
                  return (
                    <View style={[styles.subItemRow, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
                      <Image source={{ uri: item.avatar }} style={styles.subAvatar} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.subName, { color: colors.textPrimary }]}>{item.name}</Text>
                        <Text style={[styles.subCount, { color: colors.textSecondary }]}>{item.videos} producciones</Text>
                      </View>
                      <View style={[styles.followingPill, { backgroundColor: colors.primaryGlow, borderColor: colors.primary }]}>
                        <Check size={12} color={colors.primary} />
                        <Text style={[styles.followingPillText, { color: colors.primary }]}>Siguiendo</Text>
                      </View>
                    </View>
                  );
                }

                if (activeModalList === 'PLAYLISTS') {
                  return (
                    <View style={[styles.subItemRow, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
                      <Image
                        source={{
                          uri:
                            item.coverUrl ||
                            'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop',
                        }}
                        style={styles.subAvatar}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.subName, { color: colors.textPrimary }]}>{item.title}</Text>
                        <Text style={[styles.subCount, { color: colors.textSecondary }]}>
                          {item.itemsCount || (item.videos ? item.videos.length : 0)} videos incluidos
                        </Text>
                      </View>
                      <View style={[styles.followingPill, { backgroundColor: colors.primaryGlow, borderColor: colors.primary }]}>
                        <PlaySquare size={12} color={colors.primary} />
                        <Text style={[styles.followingPillText, { color: colors.primary }]}>Lista</Text>
                      </View>
                    </View>
                  );
                }

                // Elemento de Mis Videos Subidos (Con Gestión de Estado y Eliminación)
                if (activeModalList === 'MY_VIDEOS') {
                  const isActive = item.status === 'READY';
                  return (
                    <View
                      style={[
                        styles.myVideoCard,
                        { backgroundColor: colors.surfaceCard, borderColor: colors.border },
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.myVideoTopRow}
                        activeOpacity={0.85}
                        onPress={() => {
                          setActiveModalList(null);
                          if (onSelectVideo) onSelectVideo(item);
                        }}
                      >
                        <Image
                          source={{
                            uri:
                              item.thumbnailUrl ||
                              item.thumb ||
                              'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&auto=format&fit=crop',
                          }}
                          style={styles.videoItemThumb}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.videoItemTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                            {item.title}
                          </Text>
                          <Text style={[styles.videoItemMeta, { color: colors.textSecondary }]}>
                            {item.duration || '12:00'} · {item.views || '0 vistas'}
                          </Text>

                          {/* Badge de Estado del Video */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                            <View
                              style={[
                                styles.statusPill,
                                isActive ? styles.statusPillActive : styles.statusPillInactive,
                              ]}
                            >
                              <View
                                style={[
                                  styles.statusDot,
                                  { backgroundColor: isActive ? '#30D158' : '#FF9500' },
                                ]}
                              />
                              <Text
                                style={[
                                  styles.statusPillText,
                                  { color: isActive ? '#30D158' : '#FF9500' },
                                ]}
                              >
                                {isActive ? 'Activo / Público' : 'Pausado / Oculto'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>

                      {/* Botones de Acción para el Actor/Creador */}
                      <View style={[styles.myVideoActionsRow, { borderTopColor: colors.border }]}>
                        <TouchableOpacity
                          style={[styles.actionBtnSecondary, { borderColor: colors.border }]}
                          onPress={() => handleToggleVideoStatus(item)}
                          activeOpacity={0.7}
                        >
                          {isActive ? <EyeOff size={14} color="#FF9500" /> : <Eye size={14} color="#30D158" />}
                          <Text
                            style={[
                              styles.actionBtnSecondaryText,
                              { color: isActive ? '#FF9500' : '#30D158' },
                            ]}
                          >
                            {isActive ? 'Pausar Video' : 'Reactivar Video'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.actionBtnDelete}
                          onPress={() => handleDeleteMyVideo(item)}
                          activeOpacity={0.7}
                        >
                          <Trash2 size={14} color="#FF3B30" />
                          <Text style={styles.actionBtnDeleteText}>Eliminar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }

                // Elemento de Video Estándar (Liked, History, Watch Later)
                return (
                  <TouchableOpacity
                    style={[styles.videoItemRow, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}
                    activeOpacity={0.85}
                    onPress={() => {
                      setActiveModalList(null);
                      if (onSelectVideo) onSelectVideo(item);
                    }}
                  >
                    <Image
                      source={{
                        uri:
                          item.thumbnailUrl ||
                          item.thumb ||
                          'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&auto=format&fit=crop',
                      }}
                      style={styles.videoItemThumb}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.videoItemTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <Text style={[styles.videoItemMeta, { color: colors.textSecondary }]}>
                        {item.actorName || item.creatorName || 'Actor'} · {item.duration || '15:00'}
                      </Text>
                      {item.viewedAt && (
                        <Text style={[styles.videoItemTime, { color: colors.primary }]}>
                          Visto: {new Date(item.viewedAt).toLocaleDateString()}
                        </Text>
                      )}
                    </View>
                    <Play size={18} color={colors.primary} fill={colors.primary} />
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </Modal>

      {/* MODAL DE PASARELA DE PAGO TEXXXNOPOR RED PREMIUM */}
      <PremiumGatewayModal
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        onSuccess={() => {
          loadUserStats();
        }}
      />

      {/* MODAL DE NOTIFICACIONES EN TIEMPO REAL */}
      <NotificationsModal
        visible={showNotificationsModal}
        onClose={() => {
          setShowNotificationsModal(false);
          loadUserStats();
        }}
        onSelectVideo={onSelectVideo}
        onViewActor={onViewActor}
      />

      {/* MODAL PARA CONVERTIRSE EN ACTOR / CREADOR ($5.000 COP) */}
      <Modal
        visible={showBecomeActorModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowBecomeActorModal(false)}
      >
        <View style={styles.actorModalOverlay}>
          <View style={[styles.actorModalBox, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
            <View style={styles.actorModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Film size={20} color="#FF2D55" />
                <Text style={[styles.actorModalTitle, { color: colors.textPrimary }]}>
                  Ascenso a Actor / Creador
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowBecomeActorModal(false)} style={styles.closeModalBtn}>
                <X size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {isWaitingActorVerification ? (
                /* PANTALLA DE ESPERA / CONFIRMACIÓN DE PAGO WOMPI */
                <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                  <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255, 45, 85, 0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: '#FF2D55' }}>
                    <Banknote size={30} color="#FF2D55" />
                  </View>
                  <Text style={[styles.actorPriceTitle, { fontSize: 16, textAlign: 'center', marginBottom: 6 }]}>
                    Esperando Pago Wompi ($5.000 COP)
                  </Text>
                  <Text style={[styles.actorPriceDesc, { textAlign: 'center', marginBottom: 16 }]}>
                    Se abrió la pasarela oficial de Wompi Bancolombia en tu navegador. Una vez completado tu pago con Nequi, PSE o Tarjeta, confirma aquí para activar tu perfil de Actor Oficial.
                  </Text>

                  <Text style={[styles.actorInputLabel, { color: colors.textSecondary, alignSelf: 'flex-start' }]}>
                    Número de Comprobante / Referencia (Opcional)
                  </Text>
                  <TextInput
                    style={[styles.actorTextInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface, width: '100%', marginBottom: 16 }]}
                    placeholder="Ej. VPOS-4BL-12345 o tu ID de transacción"
                    placeholderTextColor={colors.textMuted}
                    value={actorTransactionRef}
                    onChangeText={setActorTransactionRef}
                  />

                  <TouchableOpacity
                    style={[styles.actorPayBtn, { width: '100%', backgroundColor: '#30D158' }, isUpgradingActor && { opacity: 0.6 }]}
                    onPress={handleConfirmActorPayment}
                    disabled={isUpgradingActor}
                    activeOpacity={0.85}
                  >
                    {isUpgradingActor ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <CheckCircle2 size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.actorPayBtnText}>Verificar y Activar Rol de Actor</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ marginTop: 12, padding: 8 }}
                    onPress={() => setIsWaitingActorVerification(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: colors.textMuted, fontSize: 13 }}>Volver a abrir pasarela de pago</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* FORMULARIO INICIAL DE ASCENSO A ACTOR */
                <>
                  <View style={styles.actorPriceCard}>
                    <Text style={styles.actorPriceTitle}>Plan Creador Oficial</Text>
                    <Text style={styles.actorPriceAmount}>$5.000 COP</Text>
                    <Text style={styles.actorPriceDesc}>
                      Pago único vía Wompi Bancolombia / Nequi / PSE para desbloquear el estudio de publicación y perfil público de actor.
                    </Text>
                  </View>

                  <Text style={[styles.actorInputLabel, { color: colors.textSecondary }]}>
                    Nombre Artístico (Stage Name) *
                  </Text>
                  <TextInput
                    style={[styles.actorTextInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
                    placeholder="Ej. Alex Savage, Bella Star..."
                    placeholderTextColor={colors.textMuted}
                    value={actorStageName}
                    onChangeText={setActorStageName}
                  />

                  <Text style={[styles.actorInputLabel, { color: colors.textSecondary }]}>
                    Biografía o Descripción (Opcional)
                  </Text>
                  <TextInput
                    style={[styles.actorTextInput, styles.actorTextArea, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
                    placeholder="Cuéntale a tus seguidores sobre ti y tus producciones..."
                    placeholderTextColor={colors.textMuted}
                    value={actorBio}
                    onChangeText={setActorBio}
                    multiline
                    numberOfLines={3}
                  />

                  <TouchableOpacity
                    style={[styles.actorPayBtn, isUpgradingActor && { opacity: 0.6 }]}
                    onPress={handleUpgradeToActor}
                    disabled={isUpgradingActor}
                    activeOpacity={0.85}
                  >
                    {isUpgradingActor ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Banknote size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.actorPayBtnText}>Pagar $5.000 COP con Wompi</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de Descargas Offline */}
      <OfflineDownloadsModal
        visible={showOfflineModal}
        onClose={() => {
          setShowOfflineModal(false);
          loadUserStats();
        }}
        onSelectVideo={onSelectVideo}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  notifBadgePill: {
    backgroundColor: '#FF2D55',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 4,
  },
  notifBadgePillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 20,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  avatarEditBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
    elevation: 4,
  },
  editPhotoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  editPhotoPillText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#30D158',
    borderWidth: 2,
    borderColor: '#000000',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  userEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  age18Badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  age18Text: {
    fontSize: 11,
    fontWeight: '600',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleBadgeAdmin: {
    backgroundColor: 'rgba(0, 132, 255, 0.12)',
    borderColor: '#0084FF',
  },
  roleBadgeCreator: {
    backgroundColor: 'rgba(255, 45, 85, 0.12)',
    borderColor: '#FF2D55',
  },
  roleBadgeConsumer: {
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  authProviderText: {
    fontSize: 11,
    marginTop: 6,
  },
  adminPanelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0084FF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
    gap: 12,
  },
  becomeActorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E24',
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1.5,
    gap: 12,
  },
  becomeActorIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FF2D55',
    justifyContent: 'center',
    alignItems: 'center',
  },
  becomeActorTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  becomeActorSubtitle: {
    color: '#8E8E93',
    fontSize: 11,
    marginTop: 2,
  },
  actorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: 16,
  },
  actorModalBox: {
    borderRadius: 18,
    padding: 18,
    maxHeight: '90%',
    borderWidth: 1,
  },
  actorModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  actorModalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  actorPriceCard: {
    backgroundColor: '#141418',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FF2D55',
    alignItems: 'center',
  },
  actorPriceTitle: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  actorPriceAmount: {
    color: '#FF2D55',
    fontSize: 26,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  actorPriceDesc: {
    color: '#CCCCCC',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  actorInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 8,
  },
  actorTextInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    marginBottom: 8,
  },
  actorTextArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  actorPayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF2D55',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 14,
    marginBottom: 10,
  },
  actorPayBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  adminIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminPanelTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  adminPanelSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    marginTop: 2,
  },
  sectionContainer: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  menuRowNoBorder: {
    borderBottomWidth: 0,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  menuRightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  menuBadgeText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  pillValueBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  pillValueText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  dropdownOptionContainer: {
    borderRadius: 10,
    padding: 6,
    marginTop: 4,
    marginBottom: 10,
    borderWidth: 1,
  },
  dropdownOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  dropdownOptionSelected: {
    borderRadius: 6,
  },
  dropdownOptionText: {
    fontSize: 13,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
    marginTop: 6,
    marginBottom: 20,
  },
  logoutButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: 'bold',
  },
  detailModalContainer: {
    flex: 1,
  },
  detailModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  detailModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  clearHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  clearHistoryText: {
    color: '#FF3B30',
    fontSize: 12,
    fontWeight: 'bold',
  },
  closeModalBtn: {
    padding: 6,
  },
  modalLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyModalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyModalSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  subItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  subAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  subName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  subCount: {
    fontSize: 11,
    marginTop: 2,
  },
  followingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  followingPillText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  videoItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  videoItemThumb: {
    width: 80,
    height: 55,
    borderRadius: 8,
  },
  videoItemTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  videoItemMeta: {
    fontSize: 11,
    marginTop: 3,
  },
  videoItemTime: {
    fontSize: 10,
    marginTop: 2,
  },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1218',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#FF2D55',
  },
  premiumBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  redBadgeSmall: {
    backgroundColor: '#FF2D55',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  redBadgeSmallText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1,
  },
  premiumBannerTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  premiumBannerSubtitle: {
    color: '#A0A0B0',
    fontSize: 11,
    marginTop: 2,
  },
  myVideoCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  myVideoTopRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillActive: {
    backgroundColor: 'rgba(48, 209, 88, 0.12)',
  },
  statusPillInactive: {
    backgroundColor: 'rgba(255, 149, 0, 0.12)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  myVideoActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnSecondaryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionBtnDelete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnDeleteText: {
    color: '#FF3B30',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
