import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  Modal,
  Alert,
  Dimensions,
  FlatList,
  TextInput,
  Platform,
} from 'react-native';
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
  ChevronLeft,
  X,
  Check,
  Sliders,
  Tv,
  ListPlus,
  Play,
  Trash2,
  Plus,
  LayoutDashboard,
  TrendingUp,
  DollarSign,
  Users,
  Share2,
  FolderHeart,
} from 'lucide-react-native';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { PremiumGatewayModal } from './PremiumGatewayModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.88, 380);

type ActiveSubView =
  | 'MENU'
  | 'DASHBOARD'
  | 'PROFILE'
  | 'SUBSCRIPTIONS'
  | 'LIKED_VIDEOS'
  | 'HISTORY'
  | 'WATCH_LATER'
  | 'PLAYLISTS';

interface AccountMenuModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenAdminPanel?: () => void;
  onSelectVideo?: (video: any) => void;
}

export const AccountMenuModal: React.FC<AccountMenuModalProps> = ({
  visible,
  onClose,
  onOpenAdminPanel,
  onSelectVideo,
}) => {
  const { user, userToken, signOut } = useAuth();
  const { isDark, setThemeMode, colors } = useTheme();
  const [currentView, setCurrentView] = useState<ActiveSubView>('MENU');
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // Estados de Configuración de UI (conforme a la imagen)
  const [currency, setCurrency] = useState<'COP' | 'USD' | 'EUR' | 'MXN'>('COP');
  const [columnLayout, setColumnLayout] = useState<'4 columnas' | '2 columnas' | '1 columna'>('4 columnas');
  const [largeUI, setLargeUI] = useState(false);
  const [videoPreview, setVideoPreview] = useState(true);
  const [watchLaterBtn, setWatchLaterBtn] = useState(true);
  const [likedVideosPage, setLikedVideosPage] = useState(true);
  const [watchedIcon, setWatchedIcon] = useState(true);
  const [autoTranslateTitles, setAutoTranslateTitles] = useState(true);

  // Estados de datos dinámicos vinculados a la base de datos (inician en 0 / [])
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [likedVideos, setLikedVideos] = useState<any[]>([]);
  const [historyVideos, setHistoryVideos] = useState<any[]>([]);
  const [watchLaterList, setWatchLaterList] = useState<any[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);

  useEffect(() => {
    if (visible && userToken) {
      api.user.getSubscriptions(userToken).then((subs) => {
        if (Array.isArray(subs)) setSubscriptions(subs);
      });
      api.user.getLikes(userToken).then((likes) => {
        if (Array.isArray(likes)) setLikedVideos(likes);
      });
      api.user.getHistory(userToken).then((hist) => {
        if (Array.isArray(hist)) setHistoryVideos(hist);
      });
      api.user.getFavorites(userToken).then((favs) => {
        if (Array.isArray(favs)) setWatchLaterList(favs);
      });
      api.user.getPlaylists(userToken).then((pls) => {
        if (Array.isArray(pls)) setPlaylists(pls);
      });
    }
  }, [visible, userToken]);

  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  if (!user) return null;

  const isAdmin = user.role === 'ADMIN';
  const isCreator = user.role === 'CREATOR';

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('¿Estás seguro de que deseas salir de tu cuenta?')) {
        onClose();
        signOut();
      }
    } else {
      Alert.alert(
        'Cerrar Sesión',
        '¿Estás seguro de que deseas salir de tu cuenta?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Cerrar Sesión',
            style: 'destructive',
            onPress: () => {
              onClose();
              signOut();
            },
          },
        ]
      );
    }
  };

  const handleCreatePlaylist = () => {
    if (!newPlaylistTitle.trim()) {
      Alert.alert('Error', 'Ingresa un nombre para la lista de reproducción');
      return;
    }
    const newPl = {
      id: `pl_${Date.now()}`,
      title: newPlaylistTitle.trim(),
      count: 0,
      thumb: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400',
    };
    setPlaylists([newPl, ...playlists]);
    setNewPlaylistTitle('');
    setShowCreatePlaylistModal(false);
    Alert.alert('¡Éxito!', `Lista "${newPl.title}" creada correctamente.`);
  };

  const toggleSubscription = (id: string) => {
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isFollowed: !s.isFollowed } : s))
    );
  };

  const removeLikedVideo = (id: string) => {
    setLikedVideos((prev) => prev.filter((v) => v.id !== id));
  };

  const clearHistory = () => {
    Alert.alert('Limpiar Historial', '¿Deseas eliminar todo tu historial de reproducción?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Limpiar Todo', style: 'destructive', onPress: () => setHistoryVideos([]) },
    ]);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropDismiss} activeOpacity={1} onPress={onClose} />

        {/* SIDEBAR DERECHO (DRAWER) */}
        <View style={styles.sideDrawerContainer}>
          {/* Header del Sidebar */}
          <View style={styles.drawerHeader}>
            {currentView !== 'MENU' ? (
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => setCurrentView('MENU')}
                activeOpacity={0.7}
              >
                <ChevronLeft size={22} color="#FFFFFF" />
                <Text style={styles.backBtnText}>Volver</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.headerTitleRow}>
                <User size={18} color="#A0A0A8" />
                <Text style={styles.drawerTitleText}>Menú de Cuenta</Text>
              </View>
            )}

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <X size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* ==================================================== */}
          {/* 1. VISTA PRINCIPAL DEL MENÚ LATERAL (IDÉNTICO A LA FOTO) */}
          {/* ==================================================== */}
          {currentView === 'MENU' && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {/* Tarjeta de Usuario en Cabecera */}
              <TouchableOpacity
                style={styles.userHeaderCard}
                onPress={() => setCurrentView('PROFILE')}
                activeOpacity={0.8}
              >
                <View style={styles.avatarWrapper}>
                  {user.avatarUrl ? (
                    <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <User size={26} color="#FFFFFF" />
                    </View>
                  )}
                  <View style={styles.onlineStatusDot} />
                </View>
                <View style={styles.userHeaderInfo}>
                  <View style={styles.userNameRow}>
                    <Text style={styles.userNameText} numberOfLines={1}>
                      {user.username}
                    </Text>
                    {user.isVerified && (
                      <CheckCircle2 size={15} color={COLORS.verifiedBlue} fill={COLORS.verifiedBlue} />
                    )}
                  </View>
                  <Text style={styles.userRoleTag}>
                    {isAdmin ? '👑 Administrador' : isCreator ? '🎬 Actor' : '👤 Espectador 18+'}
                  </Text>
                </View>
                <ChevronRight size={18} color="#666670" />
              </TouchableOpacity>

              {/* BANNER PROMINENTE TEXXXNOPOR RED (PREMIUM) */}
              <TouchableOpacity
                style={styles.redDrawerBanner}
                onPress={() => setShowPremiumModal(true)}
                activeOpacity={0.85}
              >
                <View style={styles.redBadgeSmall}>
                  <Text style={styles.redBadgeSmallText}>RED</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.redDrawerBannerTitle}>CONSIGUE EXCLUSIVIDAD</Text>
                  <Text style={styles.redDrawerBannerSubtitle}>4K · Sin Anuncios · Acceso VIP</Text>
                </View>
                <ChevronRight size={16} color="#FFFFFF" />
              </TouchableOpacity>

              {/* BOTÓN DESTACADO PARA ADMIN */}
              {isAdmin && onOpenAdminPanel && (
                <TouchableOpacity
                  style={styles.adminDirectBanner}
                  onPress={() => {
                    onClose();
                    onOpenAdminPanel();
                  }}
                  activeOpacity={0.85}
                >
                  <View style={styles.adminBannerIconBox}>
                    <Settings size={20} color="#000000" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.adminBannerTitle}>Panel de Administración</Text>
                    <Text style={styles.adminBannerSubtitle}>CRUD Videos Cloudinary, Actores & RBAC</Text>
                  </View>
                  <ChevronRight size={18} color="#000000" />
                </TouchableOpacity>
              )}

              {/* ============================================== */}
              {/* SECCIÓN 1: 👤 CUENTA (Opciones de la foto) */}
              {/* ============================================== */}
              <View style={styles.menuSection}>
                {/* 👥 Mi panel de instrumentos */}
                <TouchableOpacity
                  style={styles.menuItemRow}
                  onPress={() => setCurrentView('DASHBOARD')}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemLeft}>
                    <LayoutDashboard size={18} color="#E0E0E8" />
                    <Text style={styles.menuItemLabel}>Mi panel de instrumentos</Text>
                  </View>
                  <ChevronRight size={16} color="#666670" />
                </TouchableOpacity>

                {/* 👤 Mi Perfil */}
                <TouchableOpacity
                  style={styles.menuItemRow}
                  onPress={() => setCurrentView('PROFILE')}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemLeft}>
                    <User size={18} color="#E0E0E8" />
                    <Text style={styles.menuItemLabel}>Mi Perfil ({user.username})</Text>
                  </View>
                  <ChevronRight size={16} color="#666670" />
                </TouchableOpacity>

                {/* 📡 Mis Suscripciones */}
                <TouchableOpacity
                  style={styles.menuItemRow}
                  onPress={() => setCurrentView('SUBSCRIPTIONS')}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemLeft}>
                    <Rss size={18} color="#E0E0E8" />
                    <Text style={styles.menuItemLabel}>Mis Suscripciones</Text>
                  </View>
                  <View style={styles.badgeCount}>
                    <Text style={styles.badgeCountText}>{subscriptions.length}</Text>
                    <ChevronRight size={16} color="#666670" />
                  </View>
                </TouchableOpacity>

                {/* 👍 Vídeos que te gustan */}
                <TouchableOpacity
                  style={styles.menuItemRow}
                  onPress={() => setCurrentView('LIKED_VIDEOS')}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemLeft}>
                    <ThumbsUp size={18} color="#E0E0E8" />
                    <Text style={styles.menuItemLabel}>Vídeos que te gustan</Text>
                  </View>
                  <View style={styles.badgeCount}>
                    <Text style={styles.badgeCountText}>{likedVideos.length}</Text>
                    <ChevronRight size={16} color="#666670" />
                  </View>
                </TouchableOpacity>

                {/* 🕒 Historial */}
                <TouchableOpacity
                  style={styles.menuItemRow}
                  onPress={() => setCurrentView('HISTORY')}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemLeft}>
                    <History size={18} color="#E0E0E8" />
                    <Text style={styles.menuItemLabel}>Historial</Text>
                  </View>
                  <View style={styles.badgeCount}>
                    <Text style={styles.badgeCountText}>{historyVideos.length}</Text>
                    <ChevronRight size={16} color="#666670" />
                  </View>
                </TouchableOpacity>

                {/* ⏱️ Ver después */}
                <TouchableOpacity
                  style={styles.menuItemRow}
                  onPress={() => setCurrentView('WATCH_LATER')}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemLeft}>
                    <Clock size={18} color="#E0E0E8" />
                    <Text style={styles.menuItemLabel}>Ver después</Text>
                  </View>
                  <View style={styles.badgeCount}>
                    <Text style={styles.badgeCountText}>{watchLaterList.length}</Text>
                    <ChevronRight size={16} color="#666670" />
                  </View>
                </TouchableOpacity>

                {/* 📑 Mis listas de reproducción (DESTACADA EN ROJO COMO EN LA FOTO) */}
                <TouchableOpacity
                  style={[styles.menuItemRow, styles.activePlaylistsRow]}
                  onPress={() => setCurrentView('PLAYLISTS')}
                  activeOpacity={0.8}
                >
                  <View style={styles.menuItemLeft}>
                    <ListPlus size={18} color="#FFFFFF" />
                    <Text style={[styles.menuItemLabel, styles.activePlaylistsText]}>
                      Mis listas de reproducción
                    </Text>
                  </View>
                  <ChevronRight size={16} color="#FFFFFF" />
                </TouchableOpacity>

                {/* 💵 Moneda de pago */}
                <TouchableOpacity
                  style={[styles.menuItemRow, styles.menuRowNoBorder]}
                  onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemLeft}>
                    <Banknote size={18} color="#E0E0E8" />
                    <Text style={styles.menuItemLabel}>
                      Moneda de pago : <Text style={styles.boldTextWhite}>{currency}</Text>
                    </Text>
                  </View>
                  <ChevronRight size={16} color="#666670" />
                </TouchableOpacity>

                {showCurrencyPicker && (
                  <View style={styles.dropdownPickerBox}>
                    {(['COP', 'USD', 'EUR', 'MXN'] as const).map((curr) => (
                      <TouchableOpacity
                        key={curr}
                        style={[styles.pickerItem, currency === curr && styles.pickerItemSelected]}
                        onPress={() => {
                          setCurrency(curr);
                          setShowCurrencyPicker(false);
                        }}
                      >
                        <Text style={[styles.pickerItemText, currency === curr && styles.pickerItemTextSelected]}>
                          {curr === 'COP' ? '🇨🇴 COP (Colombia)' : curr === 'USD' ? '🇺🇸 USD (Dólar)' : curr === 'EUR' ? '🇪🇺 EUR (Euro)' : '🇲🇽 MXN (México)'}
                        </Text>
                        {currency === curr && <Check size={16} color={COLORS.neonLime} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* ============================================== */}
              {/* SECCIÓN 2: 🎨 INTERFAZ DE USUARIO (Idéntico a la imagen) */}
              {/* ============================================== */}
              <View style={styles.menuSection}>
                <View style={styles.subSectionHeader}>
                  <Palette size={15} color="#A0A0A8" />
                  <Text style={styles.subSectionHeaderText}>Interfaz de usuario</Text>
                </View>

                {/* Colores */}
                <TouchableOpacity
                  style={styles.menuItemRow}
                  onPress={() => setShowThemePicker(!showThemePicker)}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemLeft}>
                    <Palette size={18} color={colors.primary} />
                    <Text style={styles.menuItemLabel}>Color del Tema</Text>
                  </View>
                  <View style={[styles.blackBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.blackBadgeText}>{isDark ? 'Oscuro' : 'Claro'}</Text>
                  </View>
                </TouchableOpacity>

                {showThemePicker && (
                  <View style={styles.dropdownPickerBox}>
                    {(['Oscuro', 'Claro'] as const).map((thm) => {
                      const isSelected = (thm === 'Oscuro' && isDark) || (thm === 'Claro' && !isDark);
                      return (
                        <TouchableOpacity
                          key={thm}
                          style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                          onPress={() => {
                            setThemeMode(thm === 'Oscuro' ? 'dark' : 'light');
                            setShowThemePicker(false);
                          }}
                        >
                          <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextSelected]}>
                            {thm === 'Oscuro' ? '🌙 Modo Oscuro (Elegante)' : '☀️ Modo Claro (Limpio)'}
                          </Text>
                          {isSelected && <Check size={16} color={colors.primary} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* Columnas */}
                <TouchableOpacity
                  style={styles.menuItemRow}
                  onPress={() => setShowColumnPicker(!showColumnPicker)}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemLeft}>
                    <LayoutGrid size={18} color="#E0E0E8" />
                    <Text style={styles.menuItemLabel}>{columnLayout}</Text>
                  </View>
                  <ChevronRight size={16} color="#666670" />
                </TouchableOpacity>

                {showColumnPicker && (
                  <View style={styles.dropdownPickerBox}>
                    {(['4 columnas', '2 columnas', '1 columna'] as const).map((col) => (
                      <TouchableOpacity
                        key={col}
                        style={[styles.pickerItem, columnLayout === col && styles.pickerItemSelected]}
                        onPress={() => {
                          setColumnLayout(col);
                          setShowColumnPicker(false);
                        }}
                      >
                        <Text style={[styles.pickerItemText, columnLayout === col && styles.pickerItemTextSelected]}>
                          {col}
                        </Text>
                        {columnLayout === col && <Check size={16} color={COLORS.neonLime} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Gran interfaz de usuario */}
                <View style={styles.menuItemRow}>
                  <View style={styles.menuItemLeft}>
                    <ZoomIn size={18} color="#E0E0E8" />
                    <Text style={styles.menuItemLabel}>Gran interfaz de usuario</Text>
                  </View>
                  <Switch
                    value={largeUI}
                    onValueChange={setLargeUI}
                    trackColor={{ false: '#444444', true: '#FF3B30' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {/* Vista previa del video */}
                <View style={styles.menuItemRow}>
                  <View style={styles.menuItemLeft}>
                    <PlaySquare size={18} color="#E0E0E8" />
                    <Text style={styles.menuItemLabel}>Vista previa del video</Text>
                  </View>
                  <Switch
                    value={videoPreview}
                    onValueChange={setVideoPreview}
                    trackColor={{ false: '#444444', true: '#FF3B30' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {/* Botón "Ver más tarde" */}
                <View style={styles.menuItemRow}>
                  <View style={styles.menuItemLeft}>
                    <Clock size={18} color="#E0E0E8" />
                    <Text style={styles.menuItemLabel}>Botón "Ver más tarde"</Text>
                  </View>
                  <Switch
                    value={watchLaterBtn}
                    onValueChange={setWatchLaterBtn}
                    trackColor={{ false: '#444444', true: '#FF3B30' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {/* Página de "Vídeos que me gustan" */}
                <View style={styles.menuItemRow}>
                  <View style={styles.menuItemLeft}>
                    <ThumbsUp size={18} color="#E0E0E8" />
                    <Text style={styles.menuItemLabel}>Página de "Vídeos que me gustan"</Text>
                  </View>
                  <Switch
                    value={likedVideosPage}
                    onValueChange={setLikedVideosPage}
                    trackColor={{ false: '#444444', true: '#FF3B30' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {/* Icono "Visto" */}
                <View style={styles.menuItemRow}>
                  <View style={styles.menuItemLeft}>
                    <Eye size={18} color="#E0E0E8" />
                    <Text style={styles.menuItemLabel}>Icono "Visto"</Text>
                  </View>
                  <Switch
                    value={watchedIcon}
                    onValueChange={setWatchedIcon}
                    trackColor={{ false: '#444444', true: '#FF3B30' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {/* Traducción automática de títulos */}
                <View style={[styles.menuItemRow, styles.menuRowNoBorder]}>
                  <View style={styles.menuItemLeft}>
                    <Languages size={18} color="#E0E0E8" />
                    <Text style={styles.menuItemLabel}>Traducción automática de títulos</Text>
                  </View>
                  <Switch
                    value={autoTranslateTitles}
                    onValueChange={setAutoTranslateTitles}
                    trackColor={{ false: '#444444', true: '#FF3B30' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {/* Botón de Cerrar Sesión */}
              <TouchableOpacity style={styles.logoutRowBtn} onPress={handleLogout} activeOpacity={0.85}>
                <LogOut size={18} color="#FF3B30" style={{ marginRight: 8 }} />
                <Text style={styles.logoutRowText}>Cerrar Sesión</Text>
              </TouchableOpacity>

              {/* Pie de Versión de la Aplicación */}
              <View style={styles.versionFooter}>
                <Text style={styles.versionFooterText}>TexxxNopor Mobile v1.0.2 (Build 2)</Text>
                <Text style={styles.versionFooterSubText}>Plataforma Oficial · Producción 2026</Text>
              </View>
            </ScrollView>
          )}

          {/* ==================================================== */}
          {/* 2. SUB-PANEL FUNCIONAL: DASHBOARD / INSTRUMENTOS */}
          {/* ==================================================== */}
          {currentView === 'DASHBOARD' && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              <Text style={styles.subViewTitle}>📊 Mi Panel de Instrumentos</Text>
              <Text style={styles.subViewSubtitle}>Métricas y estadísticas de tu actividad en la plataforma</Text>

              <View style={styles.metricsGrid}>
                <View style={styles.metricCard}>
                  <Eye size={20} color={COLORS.neonLime} />
                  <Text style={styles.metricValue}>2,489</Text>
                  <Text style={styles.metricLabel}>Videos Vistos</Text>
                </View>
                <View style={styles.metricCard}>
                  <ThumbsUp size={20} color="#FF2A6D" />
                  <Text style={styles.metricValue}>{likedVideos.length}</Text>
                  <Text style={styles.metricLabel}>Me Gusta</Text>
                </View>
                <View style={styles.metricCard}>
                  <Rss size={20} color="#05D9E8" />
                  <Text style={styles.metricValue}>{subscriptions.length}</Text>
                  <Text style={styles.metricLabel}>Suscripciones</Text>
                </View>
                <View style={styles.metricCard}>
                  <DollarSign size={20} color="#34C759" />
                  <Text style={styles.metricValue}>0 {currency}</Text>
                  <Text style={styles.metricLabel}>Balance VIP</Text>
                </View>
              </View>

              <View style={styles.infoBanner}>
                <ShieldCheck size={24} color={COLORS.neonLime} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoBannerTitle}>Cuenta 18+ Verificada</Text>
                  <Text style={styles.infoBannerText}>
                    Disfrutas de streaming ilimitado sin restricciones de horario ni anuncios forzados.
                  </Text>
                </View>
              </View>
            </ScrollView>
          )}

          {/* ==================================================== */}
          {/* 3. SUB-PANEL FUNCIONAL: MI PERFIL */}
          {/* ==================================================== */}
          {currentView === 'PROFILE' && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              <Text style={styles.subViewTitle}>👤 Información de Cuenta</Text>

              <View style={styles.profileDetailCard}>
                <Image source={{ uri: user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200' }} style={styles.profileBigAvatar} />
                <Text style={styles.profileBigName}>{user.username}</Text>
                <Text style={styles.profileBigEmail}>{user.email}</Text>
                <View style={styles.roleBadgeBox}>
                  <Text style={styles.roleBadgeText}>Rol Asignado: {user.role}</Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Edad Registrada:</Text>
                <Text style={styles.detailValue}>🔞 {user.age || 22} años (Mayor de 18 confirmado)</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Método de Autenticación:</Text>
                <Text style={styles.detailValue}>{user.authProvider || 'Cuenta Local Segura'}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Estado de Verificación:</Text>
                <Text style={[styles.detailValue, { color: COLORS.verifiedBlue }]}>✓ Verificado por TexxxNopor</Text>
              </View>
            </ScrollView>
          )}

          {/* ==================================================== */}
          {/* 4. SUB-PANEL FUNCIONAL: MIS SUSCRIPCIONES */}
          {/* ==================================================== */}
          {currentView === 'SUBSCRIPTIONS' && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              <Text style={styles.subViewTitle}>📡 Mis Suscripciones ({subscriptions.length})</Text>
              <Text style={styles.subViewSubtitle}>Actores y canales que estás siguiendo activamente</Text>

              {subscriptions.map((sub) => (
                <View key={sub.id} style={styles.subCard}>
                  <Image source={{ uri: sub.avatar }} style={styles.subAvatar} />
                  <View style={styles.subInfo}>
                    <Text style={styles.subName}>{sub.name}</Text>
                    <Text style={styles.subVideoCount}>{sub.videos} videos publicados</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.followToggleBtn, !sub.isFollowed && styles.followToggleBtnInactive]}
                    onPress={() => toggleSubscription(sub.id)}
                  >
                    <Text style={[styles.followToggleText, !sub.isFollowed && styles.followToggleTextInactive]}>
                      {sub.isFollowed ? 'Siguiendo' : '+ Seguir'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          {/* ==================================================== */}
          {/* 5. SUB-PANEL FUNCIONAL: VÍDEOS QUE TE GUSTAN */}
          {/* ==================================================== */}
          {currentView === 'LIKED_VIDEOS' && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              <Text style={styles.subViewTitle}>👍 Vídeos que te gustan ({likedVideos.length})</Text>

              {likedVideos.length === 0 ? (
                <View style={styles.emptyBox}>
                  <ThumbsUp size={40} color="#555555" />
                  <Text style={styles.emptyText}>No tienes videos guardados en favoritos.</Text>
                </View>
              ) : (
                likedVideos.map((video) => (
                  <View key={video.id} style={styles.videoItemCard}>
                    <Image source={{ uri: video.thumb }} style={styles.videoItemThumb} />
                    <View style={styles.videoItemInfo}>
                      <Text style={styles.videoItemTitle} numberOfLines={2}>
                        {video.title}
                      </Text>
                      <Text style={styles.videoItemMeta}>{video.duration} · {video.views} vistas</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteActionBtn}
                      onPress={() => removeLikedVideo(video.id)}
                    >
                      <Trash2 size={18} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          )}

          {/* ==================================================== */}
          {/* 6. SUB-PANEL FUNCIONAL: HISTORIAL */}
          {/* ==================================================== */}
          {currentView === 'HISTORY' && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              <View style={styles.subHeaderActionRow}>
                <Text style={styles.subViewTitle}>🕒 Historial Reciente</Text>
                {historyVideos.length > 0 && (
                  <TouchableOpacity onPress={clearHistory} style={styles.clearHistoryBtn}>
                    <Text style={styles.clearHistoryText}>Limpiar</Text>
                  </TouchableOpacity>
                )}
              </View>

              {historyVideos.length === 0 ? (
                <View style={styles.emptyBox}>
                  <History size={40} color="#555555" />
                  <Text style={styles.emptyText}>Tu historial de reproducción está limpio.</Text>
                </View>
              ) : (
                historyVideos.map((item) => (
                  <View key={item.id} style={styles.videoItemCard}>
                    <Image source={{ uri: item.thumb }} style={styles.videoItemThumb} />
                    <View style={styles.videoItemInfo}>
                      <Text style={styles.videoItemTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <Text style={styles.videoItemMeta}>{item.time}</Text>
                    </View>
                    <Play size={18} color={COLORS.neonLime} />
                  </View>
                ))
              )}
            </ScrollView>
          )}

          {/* ==================================================== */}
          {/* 7. SUB-PANEL FUNCIONAL: VER DESPUÉS */}
          {/* ==================================================== */}
          {currentView === 'WATCH_LATER' && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              <Text style={styles.subViewTitle}>⏱️ Ver Después ({watchLaterList.length})</Text>
              <Text style={styles.subViewSubtitle}>Videos guardados para ver en tu tiempo libre</Text>

              {watchLaterList.map((item) => (
                <View key={item.id} style={styles.videoItemCard}>
                  <Image source={{ uri: item.thumb }} style={styles.videoItemThumb} />
                  <View style={styles.videoItemInfo}>
                    <Text style={styles.videoItemTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.videoItemMeta}>{item.duration}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setWatchLaterList(watchLaterList.filter((w) => w.id !== item.id))}
                  >
                    <Trash2 size={18} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          {/* ==================================================== */}
          {/* 8. SUB-PANEL FUNCIONAL: MIS LISTAS DE REPRODUCCIÓN */}
          {/* ==================================================== */}
          {currentView === 'PLAYLISTS' && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              <View style={styles.subHeaderActionRow}>
                <Text style={styles.subViewTitle}>📑 Mis Listas de Reproducción</Text>
                <TouchableOpacity
                  style={styles.addPlaylistBtn}
                  onPress={() => setShowCreatePlaylistModal(true)}
                >
                  <Plus size={16} color="#000000" />
                  <Text style={styles.addPlaylistBtnText}>Nueva</Text>
                </TouchableOpacity>
              </View>

              {/* Modal para crear nueva lista */}
              {showCreatePlaylistModal && (
                <View style={styles.createPlaylistCard}>
                  <Text style={styles.createPlaylistTitle}>Crear Nueva Lista</Text>
                  <TextInput
                    style={styles.playlistInput}
                    placeholder="Ej: Lo Mejor de Luna Star..."
                    placeholderTextColor="#777777"
                    value={newPlaylistTitle}
                    onChangeText={setNewPlaylistTitle}
                  />
                  <View style={styles.createPlaylistBtnRow}>
                    <TouchableOpacity
                      style={styles.cancelPlaylistBtn}
                      onPress={() => setShowCreatePlaylistModal(false)}
                    >
                      <Text style={styles.cancelPlaylistText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.confirmPlaylistBtn}
                      onPress={handleCreatePlaylist}
                    >
                      <Text style={styles.confirmPlaylistText}>Guardar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {playlists.map((pl) => (
                <View key={pl.id} style={styles.playlistItemCard}>
                  <Image source={{ uri: pl.thumb || pl.coverUrl || 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600' }} style={styles.playlistThumb} />
                  <View style={styles.playlistInfo}>
                    <Text style={styles.playlistTitle}>{pl.title}</Text>
                    <Text style={styles.playlistCount}>{pl.count || pl.itemsCount || (pl.videos ? pl.videos.length : 0)} videos agregados</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.playPlaylistBtn}
                    onPress={() => Alert.alert('Reproducir Lista', `Iniciando reproducción de "${pl.title}"`)}
                  >
                    <Play size={16} color="#000000" fill="#000000" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>

      {/* MODAL DE PASARELA DE PAGO TEXXXNOPOR RED PREMIUM */}
      <PremiumGatewayModal
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        onSuccess={() => {
          if (userToken) {
            api.user.getSubscriptions(userToken).then(setSubscriptions);
          }
        }}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  redDrawerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1218',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#FF2D55',
  },
  redBadgeSmall: {
    backgroundColor: '#FF2D55',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  redBadgeSmallText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 1,
  },
  redDrawerBannerTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  redDrawerBannerSubtitle: {
    color: '#A0A0B0',
    fontSize: 10,
    marginTop: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  backdropDismiss: {
    flex: 1,
  },
  sideDrawerContainer: {
    width: DRAWER_WIDTH,
    height: '100%',
    backgroundColor: '#262626',
    borderLeftWidth: 1,
    borderLeftColor: '#383838',
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: -5, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#383838',
    backgroundColor: '#1F1F1F',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  drawerTitleText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#333333',
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 40,
  },
  userHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
    gap: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImg: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: COLORS.neonLime,
  },
  avatarPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineStatusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: '#1E1E1E',
  },
  userHeaderInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userNameText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  userRoleTag: {
    color: '#9E9EA4',
    fontSize: 11,
    marginTop: 2,
  },
  adminDirectBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neonLime,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  adminBannerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminBannerTitle: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
  },
  adminBannerSubtitle: {
    color: '#222222',
    fontSize: 10,
    marginTop: 1,
  },
  menuSection: {
    backgroundColor: '#2E2E2E',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3D3D3D',
  },
  subSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#3E3E3E',
    marginBottom: 2,
  },
  subSectionHeaderText: {
    color: '#A0A0A8',
    fontSize: 13,
    fontWeight: 'bold',
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  menuRowNoBorder: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  menuItemLabel: {
    color: '#DDDDDD',
    fontSize: 13.5,
    fontWeight: '500',
  },
  boldTextWhite: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  badgeCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeCountText: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
  },
  redPillBadge: {
    backgroundColor: '#E02424',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  redPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  activePlaylistsRow: {
    backgroundColor: '#CC0000',
    marginHorizontal: -12,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  activePlaylistsText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  blackBadge: {
    backgroundColor: '#111111',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#444444',
  },
  blackBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  dropdownPickerBox: {
    backgroundColor: '#1C1C1C',
    borderRadius: 8,
    padding: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#444444',
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  pickerItemSelected: {
    backgroundColor: 'rgba(206, 255, 0, 0.12)',
  },
  pickerItemText: {
    color: '#CCCCCC',
    fontSize: 12,
  },
  pickerItemTextSelected: {
    color: COLORS.neonLime,
    fontWeight: 'bold',
  },
  logoutRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.35)',
    marginTop: 6,
  },
  logoutRowText: {
    color: '#FF3B30',
    fontSize: 13,
    fontWeight: 'bold',
  },
  versionFooter: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    gap: 2,
  },
  versionFooterText: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
  },
  versionFooterSubText: {
    color: '#55555C',
    fontSize: 10,
  },
  // Estilos de Sub-Vistas
  subViewTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subViewSubtitle: {
    color: '#8E8E93',
    fontSize: 12,
    marginBottom: 14,
  },
  subHeaderActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clearHistoryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
  },
  clearHistoryText: {
    color: '#FF3B30',
    fontSize: 11,
    fontWeight: 'bold',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    width: '47%',
    backgroundColor: '#1E1E1E',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 6,
  },
  metricLabel: {
    color: '#8E8E93',
    fontSize: 11,
    marginTop: 2,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#333333',
    gap: 12,
    alignItems: 'center',
  },
  infoBannerTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  infoBannerText: {
    color: '#9E9EA4',
    fontSize: 11,
    marginTop: 2,
  },
  profileDetailCard: {
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#333333',
  },
  profileBigAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: COLORS.neonLime,
    marginBottom: 8,
  },
  profileBigName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileBigEmail: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 2,
  },
  roleBadgeBox: {
    backgroundColor: 'rgba(206, 255, 0, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.neonLime,
    marginTop: 8,
  },
  roleBadgeText: {
    color: COLORS.neonLime,
    fontSize: 11,
    fontWeight: 'bold',
  },
  detailSection: {
    backgroundColor: '#1E1E1E',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  detailLabel: {
    color: '#8E8E93',
    fontSize: 11,
  },
  detailValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 2,
  },
  subCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333333',
    gap: 10,
  },
  subAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  subInfo: {
    flex: 1,
  },
  subName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  subVideoCount: {
    color: '#8E8E93',
    fontSize: 11,
  },
  followToggleBtn: {
    backgroundColor: 'rgba(206, 255, 0, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.neonLime,
  },
  followToggleBtnInactive: {
    backgroundColor: '#333333',
    borderColor: '#555555',
  },
  followToggleText: {
    color: COLORS.neonLime,
    fontSize: 11,
    fontWeight: 'bold',
  },
  followToggleTextInactive: {
    color: '#8E8E93',
  },
  videoItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333333',
    gap: 10,
  },
  videoItemThumb: {
    width: 70,
    height: 45,
    borderRadius: 6,
  },
  videoItemInfo: {
    flex: 1,
  },
  videoItemTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  videoItemMeta: {
    color: '#8E8E93',
    fontSize: 10,
    marginTop: 2,
  },
  deleteActionBtn: {
    padding: 6,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 10,
  },
  emptyText: {
    color: '#777777',
    fontSize: 12,
  },
  addPlaylistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neonLime,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  addPlaylistBtnText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: 'bold',
  },
  createPlaylistCard: {
    backgroundColor: '#1A1A1A',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.neonLime,
  },
  createPlaylistTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  playlistInput: {
    backgroundColor: '#262626',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: '#FFFFFF',
    fontSize: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#444444',
  },
  createPlaylistBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cancelPlaylistBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  cancelPlaylistText: {
    color: '#888888',
    fontSize: 11,
  },
  confirmPlaylistBtn: {
    backgroundColor: COLORS.neonLime,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  confirmPlaylistText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: 'bold',
  },
  playlistItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333333',
    gap: 10,
  },
  playlistThumb: {
    width: 50,
    height: 50,
    borderRadius: 6,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  playlistCount: {
    color: '#8E8E93',
    fontSize: 11,
    marginTop: 2,
  },
  playPlaylistBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.neonLime,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
