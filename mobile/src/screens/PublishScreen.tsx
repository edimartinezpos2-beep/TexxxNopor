import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Switch,
  StatusBar,
  Alert,
  ActivityIndicator,
  Modal,
  Linking,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import {
  ShieldCheck,
  UploadCloud,
  CheckCircle2,
  Users,
  User,
  Lock,
  Globe,
  Send,
  Flag,
  AlertOctagon,
  Flame,
  Sparkles,
  Eye,
  Hash,
  Plus,
  Image as ImageIcon,
  Video as VideoIcon,
  Film,
  Check,
  X,
  Banknote,
  Crown,
  Radio,
  Search,
} from 'lucide-react-native';
import { COLORS } from '../theme/colors';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';

export const PublishScreen: React.FC = () => {
  const { userToken, user, updateUser } = useAuth();
  const [publishMode, setPublishMode] = useState<'VIDEO' | 'LIVE'>('VIDEO');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Para ti');
  const [selectedTags, setSelectedTags] = useState<string[]>(['#parati', '#hd']);
  const [customTagInput, setCustomTagInput] = useState('');
  const [selectedVisibility, setSelectedVisibility] = useState('Público');

  // Relación de Aspecto y Formato Short vs Completo
  const [isShort, setIsShort] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('16:9');

  // Transmisión en vivo oficial para actores
  const [liveTitle, setLiveTitle] = useState('');
  const [liveCategory, setLiveCategory] = useState('Para ti');
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [liveStreamData, setLiveStreamData] = useState<any>(null);
  const [isStartingLive, setIsStartingLive] = useState(false);
  const [isStoppingLive, setIsStoppingLive] = useState(false);

  // Modal para convertirse en actor ($5.000 COP)
  const [showBecomeActorModal, setShowBecomeActorModal] = useState(false);
  const [stageName, setStageName] = useState(user?.username || '');
  const [bio, setBio] = useState('');
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isWaitingVerification, setIsWaitingVerification] = useState(false);
  const [transactionRef, setTransactionRef] = useState('');
  const WOMPI_DIRECT_CHECKOUT_URL = 'https://checkout.wompi.co/l/VPOS_4BlRq7';

  // Video y Miniatura seleccionados
  const [selectedVideo, setSelectedVideo] = useState<{ uri: string; name?: string; duration?: number } | null>(null);
  const [selectedThumbnail, setSelectedThumbnail] = useState<{ uri: string } | null>(null);

  // Switches
  const [consentGranted, setConsentGranted] = useState(true);
  const [isOver18, setIsOver18] = useState(true);
  const [allowComments, setAllowComments] = useState(true);

  const [isPublishing, setIsPublishing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [publishSuccess, setPublishSuccess] = useState(false);

  // Categorías de posicionamiento solicitadas
  const categories = [
    { name: 'Para ti', icon: Flame },
    { name: 'Nuevos', icon: Sparkles },
    { name: 'Más videos', icon: Eye },
    { name: 'Amateur', icon: User },
    { name: 'Pareja', icon: Users },
  ];

  // Hashtags sugeridos base para posicionamiento SEO
  const DEFAULT_SUGGESTED_TAGS = [
    '#parati',
    '#nuevos',
    '#masvideos',
    '#amateur',
    '#pareja',
    '#hd',
    '#4k',
    '#estreno',
    '#verificado',
  ];
  const [allAvailableTags, setAllAvailableTags] = useState<string[]>(DEFAULT_SUGGESTED_TAGS);

  // Cargar hashtags persistidos globales del servidor
  React.useEffect(() => {
    let isMounted = true;
    api.tags.getAll().then((tags) => {
      if (isMounted && Array.isArray(tags) && tags.length > 0) {
        setAllAvailableTags((prev) => {
          const combined = new Set([...DEFAULT_SUGGESTED_TAGS, ...tags, ...prev]);
          return Array.from(combined);
        });
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const visibilities = [
    { name: 'Público', icon: Globe },
    { name: 'Solo seguidores', icon: Lock },
  ];

  // Seleccionar Video desde la galería del celular
  const handlePickVideo = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para seleccionar videos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const durationSec = asset.duration ? Math.round(asset.duration / 1000) : undefined;
        const width = asset.width || 1920;
        const height = asset.height || 1080;
        const isVertical = width < height;
        const detectedIsShort = isVertical || (durationSec !== undefined && durationSec <= 60);

        setIsShort(detectedIsShort);
        setAspectRatio(isVertical ? '9:16' : '16:9');

        setSelectedVideo({
          uri: asset.uri,
          name: asset.fileName || 'video.mp4',
          duration: durationSec,
        });

        // Autocompletar título si está vacío
        if (!title.trim() && asset.fileName) {
          setTitle(asset.fileName.replace(/\.[^/.]+$/, ''));
        }
      }
    } catch (err: any) {
      console.log('Error seleccionando video:', err.message);
      Alert.alert('Error', 'No se pudo seleccionar el video de la galería.');
    }
  };

  // Seleccionar Miniatura OPCIONAL
  const handlePickThumbnail = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para seleccionar imágenes.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedThumbnail({ uri: result.assets[0].uri });
      }
    } catch (err: any) {
      console.log('Error seleccionando miniatura:', err.message);
    }
  };

  const toggleTag = (tag: string) => {
    const cleanTag = tag.startsWith('#') ? tag.toLowerCase() : `#${tag.toLowerCase()}`;
    if (selectedTags.includes(cleanTag)) {
      setSelectedTags(selectedTags.filter((t) => t !== cleanTag));
    } else {
      setSelectedTags([...selectedTags, cleanTag]);
    }
  };

  const handleAddCustomTag = () => {
    const raw = customTagInput.trim().replace(/^#+/, '').trim();
    if (!raw) return;
    const cleanTag = `#${raw.toLowerCase()}`;
    
    // Asegurar que esté en la lista visible de disponibles
    if (!allAvailableTags.includes(cleanTag)) {
      setAllAvailableTags((prev) => [...prev, cleanTag]);
    }
    // Asegurar que quede seleccionado
    if (!selectedTags.includes(cleanTag)) {
      setSelectedTags((prev) => [...prev, cleanTag]);
    }
    setCustomTagInput('');
  };

  const handlePublishVideo = async () => {
    if (!userToken) {
      Alert.alert(
        'Sesión Requerida',
        'Debes iniciar sesión en tu cuenta para poder subir y publicar tus videos.'
      );
      return;
    }

    if (!title.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresa un título para el video');
      return;
    }

    if (!consentGranted || !isOver18) {
      Alert.alert(
        'Verificación obligatoria',
        'Debes confirmar que existe consentimiento y que todas las personas son mayores de 18 años.'
      );
      return;
    }

    setIsPublishing(true);
    setUploadStatus('Procesando video...');

    try {
      let uploadedVideoUrl = undefined;
      let uploadedVideoPublicId = undefined;
      let videoDuration = '12:00';
      let videoDurationSeconds = 720;

      // Miniatura: puede venir automática del servidor o manual del usuario
      let uploadedThumbUrl: string | undefined = undefined;
      let uploadedThumbPublicId: string | undefined = undefined;

      // 1. Subir archivo de video (miniatura automática se genera en el servidor)
      if (selectedVideo) {
        setUploadStatus('Subiendo video...');
        const videoRes = await api.cloudinary.uploadVideoFile(
          userToken || 'token_demo',
          selectedVideo.uri
        );

        if (videoRes) {
          uploadedVideoUrl = videoRes.secure_url;
          uploadedVideoPublicId = videoRes.public_id;
          videoDuration = videoRes.duration || '12:00';
          videoDurationSeconds = videoRes.durationSeconds || 720;
          // El servidor genera la miniatura automáticamente desde el fotograma del video
          if (videoRes.thumbnailUrl) {
            uploadedThumbUrl = videoRes.thumbnailUrl;
            uploadedThumbPublicId = videoRes.thumbnailPublicId;
          }
        }
      }

      // 2. Subir miniatura MANUAL si el usuario eligió una (sobreescribe la automática)
      if (selectedThumbnail) {
        setUploadStatus('Subiendo miniatura personalizada...');
        const thumbRes = await api.cloudinary.uploadImageFile(
          userToken || 'token_demo',
          selectedThumbnail.uri
        );
        if (thumbRes) {
          uploadedThumbUrl = thumbRes.secure_url;
          uploadedThumbPublicId = thumbRes.public_id;
        }
      }

      // 3. Registrar video en base de datos PostgreSQL con isShort y aspectRatio
      setUploadStatus('Guardando en catálogo...');
      await api.videos.uploadVideo(userToken || 'token_demo', {
        title: title.trim(),
        description: description.trim(),
        category: selectedCategory,
        tags: selectedTags,
        duration: videoDuration,
        durationSeconds: videoDurationSeconds,
        videoUrl: uploadedVideoUrl,
        cloudinaryPublicId: uploadedVideoPublicId,
        thumbnailUrl: uploadedThumbUrl,
        thumbnailPublicId: uploadedThumbPublicId,
        isShort,
        aspectRatio,
      });

      setPublishSuccess(true);
      setTitle('');
      setDescription('');
      setSelectedVideo(null);
      setSelectedThumbnail(null);
      setSelectedTags(['#parati', '#hd']);
      setIsShort(false);
      setAspectRatio('16:9');
      setTimeout(() => setPublishSuccess(false), 5000);
    } catch (err: any) {
      console.warn('[PublishScreen] Fallo controlado al publicar:', err.message);

      let errorMsg = 'No se pudo publicar el video. Intenta nuevamente.';

      if (err.message?.includes('413') || err.message?.includes('Payload Too Large') || err.message?.includes('large')) {
        errorMsg = 'El video seleccionado supera el límite de transferencia. Comprime el video o selecciona un archivo de menor duración/peso (máx. 1GB).';
      } else if (err.message?.includes('Bunny') || err.message?.includes('upload')) {
        errorMsg = `Error al subir el video a la nube:\n${err.message}\n\nVerifica tu conexión a internet e intenta con un video comprimido.`;
      } else if (err.message?.includes('formato') || err.message?.includes('Formato')) {
        errorMsg = `Formato de video no compatible.\nUsa MP4, MOV o WEBM.`;
      } else if (err.message?.includes('límite') || err.message?.includes('supera')) {
        errorMsg = `El video es demasiado grande.\nEl límite máximo es 1GB.`;
      } else if (err.message) {
        errorMsg = err.message;
      }

      Alert.alert('Error al publicar', errorMsg);
    } finally {
      setIsPublishing(false);
      setUploadStatus('');
    }
  };

  // Transmisión en vivo oficial para actores
  const handleStartLive = async () => {
    if (!userToken) {
      Alert.alert('Sesión Requerida', 'Debes iniciar sesión para transmitir en vivo.');
      return;
    }
    if (user?.role === 'CONSUMER') {
      setShowBecomeActorModal(true);
      return;
    }
    setIsStartingLive(true);
    try {
      const stream = await api.live.start(userToken, {
        title: liveTitle.trim() || `Transmisión oficial de ${user?.stageName || user?.username || 'Actor'}`,
        category: liveCategory,
      });
      setLiveStreamData(stream);
      setIsLiveActive(true);
      Alert.alert('🔴 ¡En Vivo!', 'Tu transmisión oficial ya está activa en TexxxNopor.');
    } catch (err: any) {
      Alert.alert('Error al iniciar live', err.message || 'No se pudo iniciar el live.');
    } finally {
      setIsStartingLive(false);
    }
  };

  const handleStopLive = async () => {
    if (!userToken || !liveStreamData?.id) {
      setIsLiveActive(false);
      setLiveStreamData(null);
      return;
    }
    setIsStoppingLive(true);
    try {
      await api.live.stop(userToken, liveStreamData.id);
      setIsLiveActive(false);
      setLiveStreamData(null);
      Alert.alert('Transmisión Finalizada', 'Tu live ha concluido exitosamente.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo detener la transmisión.');
    } finally {
      setIsStoppingLive(false);
    }
  };

  const handleUpgradeToActor = async () => {
    if (!stageName.trim()) {
      Alert.alert('Nombre Artístico Requerido', 'Por favor ingresa tu nombre artístico para tu perfil de actor/creador.');
      return;
    }

    // Abrir pasarela de pagos oficial Wompi Bancolombia ($5.000 COP) con precio exacto visible
    try {
      const linkData = await api.wompi.getCheckoutLink(
        5000,
        'actor_studio',
        `ACTOR-${user?.id?.slice(0, 8) || 'STUDIO'}-${Date.now()}`
      );
      const targetUrl = linkData?.checkoutUrl || WOMPI_DIRECT_CHECKOUT_URL;
      if (linkData?.reference) {
        setTransactionRef(linkData.reference);
      }
      try {
        await WebBrowser.openBrowserAsync(targetUrl);
      } catch (_) {
        Linking.openURL(targetUrl).catch(() => {});
      }
    } catch (_) {
      try {
        await WebBrowser.openBrowserAsync(WOMPI_DIRECT_CHECKOUT_URL);
      } catch (err) {
        Linking.openURL(WOMPI_DIRECT_CHECKOUT_URL).catch(() => {});
      }
    }

    // Mostrar pantalla de verificación
    setIsWaitingVerification(true);
  };

  const handleConfirmPayment = async () => {
    if (!userToken) return;

    setIsUpgrading(true);
    try {
      await api.user.upgradeToActor(userToken, {
        stageName: stageName.trim(),
        bio: bio.trim(),
        paymentMethod: `WOMPI_COP Ref: ${transactionRef.trim() || 'VPOS_4BlRq7'}`,
      });

      if (updateUser) {
        updateUser({ role: 'CREATOR', isVerified: true });
      }

      setShowBecomeActorModal(false);
      setIsWaitingVerification(false);
      setTransactionRef('');
      Alert.alert(
        '¡Felicitaciones Creador!',
        'Tu pago ha sido verificado con éxito y tu cuenta ascendida a Actor / Creador Oficial. Ya tienes acceso completo para publicar tus producciones.'
      );
    } catch (err: any) {
      Alert.alert('Error al verificar pago', err.message || 'No se pudo verificar el pago. Intenta de nuevo.');
    } finally {
      setIsUpgrading(false);
    }
  };

  // Si el usuario es espectador (CONSUMER), mostrar panel informativo de ascenso por $5.000 COP
  if (user?.role === 'CONSUMER') {
    return (
      <View style={[styles.container, { paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255, 45, 85, 0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 18, borderWidth: 1.5, borderColor: '#FF2D55' }}>
          <Film size={40} color="#FF2D55" />
        </View>
        <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 8 }}>
          Estudio de Publicación Oficial
        </Text>
        <Text style={{ color: '#8E8E93', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24, paddingHorizontal: 10 }}>
          Para publicar videos normales o exclusivos para tus seguidores, necesitas activar tu cuenta como Actor / Creador Oficial por solo $5.000 COP.
        </Text>

        <View style={{ backgroundColor: COLORS.surfaceCard, borderRadius: 16, padding: 18, width: '100%', borderWidth: 1, borderColor: COLORS.border, marginBottom: 24, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <CheckCircle2 size={16} color="#30D158" />
            <Text style={{ color: '#FFFFFF', fontSize: 13, flex: 1, fontWeight: '600' }}>Sube videos públicos y exclusivos en 4K</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <CheckCircle2 size={16} color="#30D158" />
            <Text style={{ color: '#FFFFFF', fontSize: 13, flex: 1, fontWeight: '600' }}>Perfil verificado de actor con portada y playlists</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <CheckCircle2 size={16} color="#30D158" />
            <Text style={{ color: '#FFFFFF', fontSize: 13, flex: 1, fontWeight: '600' }}>Gana seguidores y monetiza tus estrenos</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <CheckCircle2 size={16} color="#FFD700" />
            <Text style={{ color: '#FFD700', fontSize: 13, flex: 1, fontWeight: '700' }}>Tarifa única de activación: $5.000 COP</Text>
          </View>
        </View>

        <TouchableOpacity
          style={{ width: '100%', backgroundColor: '#FF2D55', paddingVertical: 16, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}
          onPress={() => setShowBecomeActorModal(true)}
          activeOpacity={0.85}
        >
          <Crown size={18} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }}>🌟 Convertirme en Actor ($5.000 COP)</Text>
        </TouchableOpacity>

        {/* Modal de Ascenso a Actor */}
        <Modal
          visible={showBecomeActorModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowBecomeActorModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 }}>
            <View style={{ backgroundColor: '#13131A', borderRadius: 20, padding: 22, borderWidth: 1, borderColor: '#FF2D55' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Crown size={20} color="#FFD700" />
                  <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }}>Registro de Actor / Creador</Text>
                </View>
                <TouchableOpacity onPress={() => setShowBecomeActorModal(false)}>
                  <X size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {isWaitingVerification ? (
                <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                  <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255, 45, 85, 0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: '#FF2D55' }}>
                    <Banknote size={30} color="#FF2D55" />
                  </View>
                  <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 6 }}>
                    Esperando Pago Wompi ($5.000 COP)
                  </Text>
                  <Text style={{ color: '#8E8E93', fontSize: 12, textAlign: 'center', marginBottom: 16, lineHeight: 18 }}>
                    Se abrió la pasarela oficial de Wompi Bancolombia en tu navegador. Una vez completado tu pago con Nequi, PSE o Tarjeta, confirma aquí para activar tu acceso de Actor/Creador.
                  </Text>

                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600', alignSelf: 'flex-start', marginBottom: 6 }}>
                    Número de Comprobante / Referencia (Opcional)
                  </Text>
                  <TextInput
                    style={{ backgroundColor: '#1C1C24', borderRadius: 10, padding: 12, color: '#FFFFFF', borderWidth: 1, borderColor: '#2C2C38', width: '100%', marginBottom: 16 }}
                    placeholder="Ej. VPOS-4BL-12345 o tu ID de transacción"
                    placeholderTextColor="#666"
                    value={transactionRef}
                    onChangeText={setTransactionRef}
                  />

                  <TouchableOpacity
                    style={{ backgroundColor: '#30D158', paddingVertical: 14, borderRadius: 12, alignItems: 'center', width: '100%', opacity: isUpgrading ? 0.7 : 1 }}
                    onPress={handleConfirmPayment}
                    disabled={isUpgrading}
                  >
                    {isUpgrading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' }}>Verificar y Activar Rol de Actor</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ marginTop: 14, padding: 8 }}
                    onPress={() => setIsWaitingVerification(false)}
                  >
                    <Text style={{ color: '#8E8E93', fontSize: 13 }}>Volver a abrir pasarela de pago</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={{ color: '#8E8E93', fontSize: 13, marginBottom: 16 }}>
                    Configura tu perfil público de actor y activa tu estudio por un único pago de $5.000 COP con Wompi Bancolombia.
                  </Text>

                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600', marginBottom: 6 }}>Nombre Artístico (Stage Name) *</Text>
                  <TextInput
                    style={{ backgroundColor: '#1C1C24', borderRadius: 10, padding: 12, color: '#FFFFFF', borderWidth: 1, borderColor: '#2C2C38', marginBottom: 14 }}
                    placeholder="Ej. Alexis Texas, Nacho Vidal..."
                    placeholderTextColor="#666"
                    value={stageName}
                    onChangeText={setStageName}
                  />

                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600', marginBottom: 6 }}>Biografía de Presentación</Text>
                  <TextInput
                    style={{ backgroundColor: '#1C1C24', borderRadius: 10, padding: 12, color: '#FFFFFF', borderWidth: 1, borderColor: '#2C2C38', height: 70, marginBottom: 18 }}
                    placeholder="Cuéntale a tus seguidores sobre ti y tu contenido..."
                    placeholderTextColor="#666"
                    value={bio}
                    onChangeText={setBio}
                    multiline
                  />

                  <View style={{ backgroundColor: 'rgba(255, 45, 85, 0.1)', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255, 45, 85, 0.3)', marginBottom: 20 }}>
                    <Text style={{ color: '#FF2D55', fontSize: 13, fontWeight: 'bold', textAlign: 'center' }}>
                      Tarifa Única de Activación: $5.000 COP
                    </Text>
                    <Text style={{ color: '#8E8E93', fontSize: 11, textAlign: 'center', marginTop: 3 }}>
                      Pasarela Segura Oficial Wompi (Bancolombia, Nequi, PSE, Tarjetas)
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={{ backgroundColor: '#FF2D55', paddingVertical: 14, borderRadius: 12, alignItems: 'center', opacity: isUpgrading ? 0.7 : 1 }}
                    onPress={handleUpgradeToActor}
                    disabled={isUpgrading}
                  >
                    {isUpgrading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' }}>Pagar $5.000 COP con Wompi</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* 1. Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Publicar Video</Text>
          <View style={styles.verifiedRow}>
            <CheckCircle2 size={14} color={COLORS.verifiedBlue} fill={COLORS.verifiedBlue} />
            <Text style={styles.verifiedSubtitle}>Panel de Actor / Creador</Text>
          </View>
        </View>

        <View style={styles.avatarContainer}>
          {user?.avatarUrl ? (
            <Image
              source={{ uri: user.avatarUrl }}
              style={styles.headerAvatar}
            />
          ) : (
            <View style={[styles.headerAvatar, { backgroundColor: '#262626', justifyContent: 'center', alignItems: 'center' }]}>
              <User size={18} color="#888888" />
            </View>
          )}
          <View style={styles.onlineDot} />
        </View>
      </View>

      {/* Selector de Modo: Subir Video / Short vs Transmitir en Vivo */}
      <View style={styles.modeTabs}>
        <TouchableOpacity
          style={[styles.modeTab, publishMode === 'VIDEO' && styles.modeTabActive]}
          onPress={() => setPublishMode('VIDEO')}
          activeOpacity={0.8}
        >
          <VideoIcon size={16} color={publishMode === 'VIDEO' ? '#000000' : '#FFFFFF'} style={{ marginRight: 6 }} />
          <Text style={[styles.modeTabText, publishMode === 'VIDEO' && styles.modeTabTextActive]}>
            Subir Video / Short
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeTab, publishMode === 'LIVE' && styles.modeTabLiveActive]}
          onPress={() => setPublishMode('LIVE')}
          activeOpacity={0.8}
        >
          <Radio size={16} color={publishMode === 'LIVE' ? '#FFFFFF' : '#FF2D55'} style={{ marginRight: 6 }} />
          <Text style={[styles.modeTabText, publishMode === 'LIVE' && styles.modeTabTextLiveActive]}>
            🔴 Transmitir en Vivo
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner de éxito al publicar */}
        {publishSuccess && (
          <View style={styles.successBanner}>
            <CheckCircle2 size={20} color="#34C759" />
            <Text style={styles.successBannerText}>
              ¡Video publicado con éxito! Ya está disponible en la categoría "{selectedCategory}" con sus hashtags.
            </Text>
          </View>
        )}

        {publishMode === 'LIVE' ? (
          /* ==================================================== */
          /* MODO TRANSMISIÓN EN VIVO OFICIAL DE ACTORES         */
          /* ==================================================== */
          <View style={styles.liveContainer}>
            <View style={styles.liveHeaderCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.liveBadgeIcon}>
                  <Radio size={22} color="#FF2D55" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.liveStudioTitle}>Estudio de Transmisión Oficial</Text>
                  <Text style={styles.liveStudioSubtitle}>
                    Solo actores y creadores verificados pueden transmitir en vivo cuando ellos deseen.
                  </Text>
                </View>
              </View>
            </View>

            {isLiveActive ? (
              <View style={styles.liveActiveCard}>
                <View style={styles.liveActiveBadgeRow}>
                  <View style={styles.livePill}>
                    <View style={styles.liveDot} />
                    <Text style={styles.livePillText}>EN VIVO OFICIAL</Text>
                  </View>
                  <View style={styles.viewerBadge}>
                    <Eye size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.viewerCountText}>{liveStreamData?.viewersCount || 1} espectadores</Text>
                  </View>
                </View>

                <View style={styles.broadcastPreview}>
                  <Radio size={46} color="#FF2D55" style={{ marginBottom: 12 }} />
                  <Text style={styles.broadcastTitle}>{liveStreamData?.title || liveTitle || 'Transmisión Oficial'}</Text>
                  <Text style={styles.broadcastMeta}>Categoría: {liveCategory} · Actor: {user?.stageName || user?.username}</Text>
                  <Text style={styles.broadcastHint}>
                    Tu stream está en emisión directa. Toda la comunidad de TexxxNopor puede verte en tiempo real.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.stopLiveBtn}
                  onPress={handleStopLive}
                  disabled={isStoppingLive}
                  activeOpacity={0.85}
                >
                  {isStoppingLive ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.stopLiveBtnText}>⏹ Finalizar Transmisión</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.liveSetupCard}>
                <Text style={styles.inputLabel}>Título de tu transmisión en vivo *</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: '#1C1C24', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#2C2C38', marginTop: 6, marginBottom: 14 }]}
                  placeholder="Ej. Sesión en vivo con seguidores VIP..."
                  placeholderTextColor="#777"
                  value={liveTitle}
                  onChangeText={setLiveTitle}
                />

                <Text style={[styles.sectionLabel, { marginBottom: 8 }]}>Categoría del Live</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  {categories.map((cat) => {
                    const isSelected = liveCategory === cat.name;
                    return (
                      <TouchableOpacity
                        key={cat.name}
                        style={[styles.selectorChip, isSelected && styles.selectorChipSelected]}
                        onPress={() => setLiveCategory(cat.name)}
                      >
                        <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{cat.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <View style={styles.liveRulesBox}>
                  <ShieldCheck size={16} color="#34C759" style={{ marginRight: 8 }} />
                  <Text style={styles.liveRulesText}>
                    Cero modelos falsas. Transmisiones reales de creadores y actores verificados. Tu transmisión aparecerá destacada en la app móvil y web.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.startLiveBtn}
                  onPress={handleStartLive}
                  disabled={isStartingLive}
                  activeOpacity={0.85}
                >
                  {isStartingLive ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Radio size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.startLiveBtnText}>🔴 Iniciar Transmisión en Vivo</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          /* ==================================================== */
          /* MODO PUBLICACIÓN DE VIDEO O SHORT                    */
          /* ==================================================== */
          <>
            {/* 2. Hero Card: Selección de Video y Miniatura */}
            <View style={styles.heroCard}>
              <Text style={styles.heroTitle}>Publica con control y verificación</Text>

              <View style={styles.heroRow}>
                <View style={styles.checklist}>
                  <View style={styles.checkItem}>
                    <ShieldCheck size={16} color="#FFFFFF" />
                    <Text style={styles.checkText}>Consentimiento obligatorio</Text>
                  </View>

                  <View style={styles.checkItem}>
                    <View style={styles.ageIcon}>
                      <Text style={styles.ageIconText}>18+</Text>
                    </View>
                    <Text style={styles.checkText}>Solo mayores de edad</Text>
                  </View>

                  <View style={styles.checkItem}>
                    <Flag size={16} color="#FFFFFF" />
                    <Text style={styles.checkText}>Puede ser reportado</Text>
                  </View>
                </View>

                {/* Preview de Miniatura si se seleccionó o fotograma de video */}
                {selectedThumbnail ? (
                  <View style={{ position: 'relative' }}>
                    <Image source={{ uri: selectedThumbnail.uri }} style={styles.heroImage} />
                    <TouchableOpacity
                      style={styles.removeThumbBtn}
                      onPress={() => setSelectedThumbnail(null)}
                    >
                      <X size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ) : selectedVideo ? (
                  <View style={[styles.heroImage, styles.videoPreviewPlaceholder]}>
                    <VideoIcon size={24} color={COLORS.neonLime} />
                    <Text style={styles.videoFrameLabel}>Fotograma de Video</Text>
                  </View>
                ) : (
                  <View style={[styles.heroImage, styles.videoPreviewPlaceholder]}>
                    <Film size={24} color="#555562" />
                    <Text style={styles.videoFrameLabel}>Sin video</Text>
                  </View>
                )}
              </View>

              {/* Botón Seleccionar Video */}
              <TouchableOpacity
                style={[styles.selectVideoBtn, selectedVideo && styles.selectVideoBtnActive]}
                onPress={handlePickVideo}
                activeOpacity={0.85}
              >
                {selectedVideo ? (
                  <Check size={18} color="#000000" style={{ marginRight: 6 }} />
                ) : (
                  <UploadCloud size={20} color="#000000" style={{ marginRight: 6 }} />
                )}
                <Text style={styles.selectVideoBtnText}>
                  {selectedVideo ? `Video Seleccionado ✓` : 'Seleccionar Video MP4/MOV'}
                </Text>
              </TouchableOpacity>

              {/* Selector interactivo de Formato Detectado (Short vs Completo) */}
              {selectedVideo && (
                <View style={styles.aspectRatioContainer}>
                  <View style={styles.aspectRatioHeader}>
                    <Film size={14} color={COLORS.neonLime} style={{ marginRight: 6 }} />
                    <Text style={styles.aspectRatioLabel}>Formato Detectado:</Text>
                    <Text style={styles.aspectRatioValue}>
                      {aspectRatio} · {isShort ? '⚡ Short / Clip' : '🎬 Video Completo'}
                    </Text>
                  </View>
                  <View style={styles.formatToggleRow}>
                    <TouchableOpacity
                      style={[styles.formatToggleBtn, !isShort && styles.formatToggleBtnActive]}
                      onPress={() => {
                        setIsShort(false);
                        setAspectRatio('16:9');
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.formatToggleText, !isShort && styles.formatToggleTextActive]}>
                        🎬 Video Completo (16:9)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.formatToggleBtn, isShort && styles.formatToggleBtnActive]}
                      onPress={() => {
                        setIsShort(true);
                        setAspectRatio('9:16');
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.formatToggleText, isShort && styles.formatToggleTextActive]}>
                        ⚡ Short / Vertical (9:16)
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Botón Seleccionar Miniatura OPCIONAL */}
              <TouchableOpacity
                style={styles.selectThumbBtn}
                onPress={handlePickThumbnail}
                activeOpacity={0.85}
              >
                <ImageIcon size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.selectThumbBtnText}>
                  {selectedThumbnail ? 'Miniatura personalizada ✓' : 'Agregar Miniatura Personalizada (Opcional)'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.formatHint}>
                Formatos soportados: MP4, MOV · Si no eliges miniatura, se extraerá una parte del video automáticamente
              </Text>
            </View>

            {/* 3. Inputs de Formulario */}
            <View style={styles.inputCard}>
              <View style={styles.inputHeader}>
                <Text style={styles.inputLabel}>Título del video *</Text>
                <Text style={styles.charCounter}>{title.length}/100</Text>
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="Ej. Sesión Nocturna 4K Ultra HD"
                placeholderTextColor="#777"
                value={title}
                onChangeText={setTitle}
                maxLength={100}
              />
            </View>

            <View style={[styles.inputCard, { marginTop: 12 }]}>
              <View style={styles.inputHeader}>
                <Text style={styles.inputLabel}>Describe tu publicación...</Text>
                <Text style={styles.charCounter}>{description.length}/500</Text>
              </View>
              <TextInput
                style={[styles.textInput, { height: 70 }]}
                placeholder="Añade detalles, créditos o palabras clave..."
                placeholderTextColor="#777"
                value={description}
                onChangeText={setDescription}
                maxLength={500}
                multiline
              />
            </View>

            {/* 4. Selector de Categoría (Para posicionar en búsquedas) */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>Categoría de Posicionamiento</Text>
              <Text style={styles.sectionHint}>Define en qué sección aparecerá</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.name;
                const IconComp = cat.icon;
                return (
                  <TouchableOpacity
                    key={cat.name}
                    style={[styles.selectorChip, isSelected && styles.selectorChipSelected]}
                    onPress={() => setSelectedCategory(cat.name)}
                    activeOpacity={0.8}
                  >
                    <IconComp
                      size={15}
                      color={isSelected ? '#000000' : '#FFFFFF'}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 5. Selector de Hashtags Dinámicos por Búsqueda */}
            <View style={[styles.sectionHeaderRow, { marginTop: 14 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Hash size={16} color={COLORS.neonLime} />
                <Text style={styles.sectionLabel}>Hashtags para Búsquedas</Text>
              </View>
              <Text style={styles.sectionHint}>Escribe palabras clave para buscar</Text>
            </View>

            {/* Buscador de Hashtags con autocompletado en tiempo real */}
            <View style={styles.tagSearchBox}>
              <Search size={16} color={COLORS.neonLime} style={{ marginLeft: 12, marginRight: 8 }} />
              <TextInput
                style={styles.tagSearchInput}
                placeholder="Escribe palabra clave (ej. amateur, hd, estreno)..."
                placeholderTextColor="#777"
                value={customTagInput}
                onChangeText={setCustomTagInput}
                onSubmitEditing={handleAddCustomTag}
                returnKeyType="done"
              />
              {customTagInput.length > 0 && (
                <TouchableOpacity onPress={() => setCustomTagInput('')} style={{ padding: 8 }}>
                  <X size={15} color="#8E8E93" />
                </TouchableOpacity>
              )}
            </View>

            {/* Sugerencias Dinámicas de Autocompletado: aparecen SOLO al escribir */}
            {customTagInput.trim().length > 0 && (
              <View style={styles.autocompleteSuggestions}>
                <Text style={styles.autocompleteHeader}>Sugerencias coincidentes:</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {allAvailableTags
                    .filter((t) => {
                      const q = customTagInput.trim().toLowerCase().replace(/^#+/, '');
                      return t.toLowerCase().replace(/^#+/, '').includes(q) && !selectedTags.includes(t);
                    })
                    .map((tag) => (
                      <TouchableOpacity
                        key={tag}
                        style={styles.autocompletePill}
                        onPress={() => {
                          toggleTag(tag);
                          setCustomTagInput('');
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.autocompletePillText}>{tag}</Text>
                        <Plus size={13} color={COLORS.neonLime} />
                      </TouchableOpacity>
                    ))}
                  {/* Opción para crear nuevo tag si no existe exacto */}
                  {!allAvailableTags.some(
                    (t) => t.toLowerCase().replace(/^#+/, '') === customTagInput.trim().toLowerCase().replace(/^#+/, '')
                  ) && (
                    <TouchableOpacity
                      style={[styles.autocompletePill, styles.createNewTagPill]}
                      onPress={handleAddCustomTag}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.createNewTagPillText}>
                        + Crear #{customTagInput.trim().toLowerCase().replace(/^#+/, '')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Visualización de Hashtags seleccionados en este video */}
            {selectedTags.length > 0 ? (
              <View style={{ marginTop: 10 }}>
                <Text style={{ color: '#8E8E93', fontSize: 11, marginBottom: 6 }}>
                  Hashtags incluidos en este video ({selectedTags.length}):
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {selectedTags.map((tag) => (
                    <View key={tag} style={styles.selectedTagBadge}>
                      <Text style={styles.selectedTagText}>{tag}</Text>
                      <TouchableOpacity
                        onPress={() => toggleTag(tag)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <X size={13} color={COLORS.neonLime} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <Text style={styles.noTagsHint}>
                Escribe una palabra clave en el buscador para asociar hashtags a tu video.
              </Text>
            )}

            {/* 6. Selector de Visibilidad */}
            <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Visibilidad</Text>
            <View style={styles.chipRow}>
              {visibilities.map((vis) => {
                const isSelected = selectedVisibility === vis.name;
                const IconComp = vis.icon;
                return (
                  <TouchableOpacity
                    key={vis.name}
                    style={[styles.selectorChip, isSelected && styles.selectorChipSelected]}
                    onPress={() => setSelectedVisibility(vis.name)}
                  >
                    <IconComp
                      size={15}
                      color={isSelected ? '#000000' : '#FFFFFF'}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {vis.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 7. Toggles de Consentimiento y Verificación */}
            <View style={styles.togglesCard}>
              <View style={styles.toggleRow}>
                <ShieldCheck size={20} color="#FFFFFF" style={{ marginRight: 10 }} />
                <Text style={styles.toggleLabel}>
                  Confirmo que todas las personas participaron con consentimiento
                </Text>
                <Switch
                  value={consentGranted}
                  onValueChange={setConsentGranted}
                  trackColor={{ false: '#3A3A3C', true: COLORS.neonLime }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={[styles.ageIcon, { marginRight: 10 }]}>
                  <Text style={styles.ageIconText}>18+</Text>
                </View>
                <Text style={styles.toggleLabel}>Todas las personas son mayores de 18</Text>
                <Switch
                  value={isOver18}
                  onValueChange={setIsOver18}
                  trackColor={{ false: '#3A3A3C', true: COLORS.neonLime }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
                <AlertOctagon size={20} color="#FFFFFF" style={{ marginRight: 10 }} />
                <Text style={styles.toggleLabel}>Permitir comentarios y me gustas</Text>
                <Switch
                  value={allowComments}
                  onValueChange={setAllowComments}
                  trackColor={{ false: '#3A3A3C', true: COLORS.neonLime }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {/* 8. Botón Principal Publicar Video */}
            <TouchableOpacity
              style={[styles.publishBtn, isPublishing && styles.publishBtnDisabled]}
              onPress={handlePublishVideo}
              disabled={isPublishing}
              activeOpacity={0.85}
            >
              {isPublishing ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color="#000000" />
                  <Text style={styles.publishBtnText}>{uploadStatus || 'Publicando video...'}</Text>
                </View>
              ) : (
                <>
                  <Send size={18} color="#000000" style={{ marginRight: 8 }} />
                  <Text style={styles.publishBtnText}>Publicar video en {selectedCategory}</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  verifiedSubtitle: {
    color: COLORS.verifiedBlue,
    fontSize: 12,
    fontWeight: '600',
  },
  avatarContainer: {
    position: 'relative',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: COLORS.neonLime,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34C759',
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#34C759',
    marginBottom: 16,
    gap: 10,
  },
  successBannerText: {
    color: '#34C759',
    fontSize: 13,
    flex: 1,
    fontWeight: '600',
  },
  heroCard: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  checklist: {
    flex: 1,
    gap: 8,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkText: {
    color: '#D0D0D8',
    fontSize: 12,
    fontWeight: '500',
  },
  ageIcon: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  ageIconText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  heroImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  removeThumbBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FF3B30',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectVideoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.neonLime,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  selectVideoBtnActive: {
    backgroundColor: '#34C759',
  },
  selectVideoBtnText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  selectThumbBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A2A34',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3E3E4C',
  },
  selectThumbBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  formatHint: {
    color: '#777780',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
  inputCard: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  charCounter: {
    color: '#777780',
    fontSize: 11,
  },
  textInput: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  sectionLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  sectionHint: {
    color: '#8E8E93',
    fontSize: 11,
  },
  chipScroll: {
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  selectorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceCard,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  selectorChipSelected: {
    backgroundColor: COLORS.neonLime,
    borderColor: COLORS.neonLime,
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#000000',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  tagPill: {
    backgroundColor: '#1E1E24',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#30303A',
  },
  tagPillSelected: {
    backgroundColor: 'rgba(206, 255, 0, 0.15)',
    borderColor: COLORS.neonLime,
  },
  tagPillText: {
    color: '#A0A0A8',
    fontSize: 12,
    fontWeight: '500',
  },
  tagPillTextSelected: {
    color: COLORS.neonLime,
    fontWeight: 'bold',
  },
  customTagRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  customTagInput: {
    flex: 1,
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  addTagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neonLime,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    gap: 4,
  },
  addTagBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  togglesCard: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#24242C',
  },
  toggleLabel: {
    flex: 1,
    color: '#E0E0E8',
    fontSize: 12,
    lineHeight: 16,
    marginRight: 10,
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.neonLime,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
  },
  publishBtnDisabled: {
    opacity: 0.6,
  },
  publishBtnText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: 'bold',
  },
  videoPreviewPlaceholder: {
    backgroundColor: '#121218',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#242432',
    borderStyle: 'dashed',
  },
  videoFrameLabel: {
    color: '#8E8E98',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
  modeTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#121218',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1C1C24',
    borderWidth: 1,
    borderColor: '#2C2C38',
  },
  modeTabActive: {
    backgroundColor: COLORS.neonLime,
    borderColor: COLORS.neonLime,
  },
  modeTabLiveActive: {
    backgroundColor: '#FF2D55',
    borderColor: '#FF2D55',
  },
  modeTabText: {
    color: '#8E8E93',
    fontWeight: '700',
    fontSize: 13,
  },
  modeTabTextActive: {
    color: '#000000',
  },
  modeTabTextLiveActive: {
    color: '#FFFFFF',
  },
  aspectRatioContainer: {
    backgroundColor: '#181820',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2A2A38',
    marginBottom: 8,
  },
  aspectRatioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  aspectRatioLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 6,
  },
  aspectRatioValue: {
    color: COLORS.neonLime,
    fontSize: 12,
    fontWeight: 'bold',
  },
  formatToggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  formatToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#242430',
    borderWidth: 1,
    borderColor: '#363646',
  },
  formatToggleBtnActive: {
    backgroundColor: 'rgba(206, 255, 0, 0.15)',
    borderColor: COLORS.neonLime,
  },
  formatToggleText: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
  },
  formatToggleTextActive: {
    color: COLORS.neonLime,
    fontWeight: 'bold',
  },
  tagSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 6,
    marginBottom: 8,
  },
  tagSearchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    paddingVertical: 10,
  },
  autocompleteSuggestions: {
    backgroundColor: '#161620',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2A2A38',
    marginBottom: 10,
  },
  autocompleteHeader: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
  },
  autocompletePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22222E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#363648',
    gap: 4,
  },
  autocompletePillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  createNewTagPill: {
    backgroundColor: 'rgba(206, 255, 0, 0.12)',
    borderColor: COLORS.neonLime,
  },
  createNewTagPillText: {
    color: COLORS.neonLime,
    fontSize: 12,
    fontWeight: 'bold',
  },
  selectedTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(206, 255, 0, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.neonLime,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  selectedTagText: {
    color: COLORS.neonLime,
    fontSize: 12,
    fontWeight: '600',
  },
  noTagsHint: {
    color: '#666672',
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 8,
  },
  liveContainer: {
    gap: 14,
  },
  liveHeaderCard: {
    backgroundColor: '#161622',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2E1824',
  },
  liveBadgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 45, 85, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF2D55',
  },
  liveStudioTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  liveStudioSubtitle: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  liveActiveCard: {
    backgroundColor: '#14141E',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#FF2D55',
    alignItems: 'center',
  },
  liveActiveBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF2D55',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  livePillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  viewerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  viewerCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  broadcastPreview: {
    width: '100%',
    paddingVertical: 24,
    alignItems: 'center',
    backgroundColor: '#0A0A10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#242432',
    marginBottom: 16,
  },
  broadcastTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
    paddingHorizontal: 12,
  },
  broadcastMeta: {
    color: '#FF2D55',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  broadcastHint: {
    color: '#777785',
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 16,
  },
  stopLiveBtn: {
    backgroundColor: '#FF3B30',
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  stopLiveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  liveSetupCard: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  liveRulesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.3)',
    marginBottom: 18,
  },
  liveRulesText: {
    color: '#D0D0D8',
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  startLiveBtn: {
    backgroundColor: '#FF2D55',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  startLiveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});



