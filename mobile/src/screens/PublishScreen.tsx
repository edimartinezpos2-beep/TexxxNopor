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
} from 'react-native';
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
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../theme/colors';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const PublishScreen: React.FC = () => {
  const { userToken, user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Para ti');
  const [selectedTags, setSelectedTags] = useState<string[]>(['#parati', '#hd']);
  const [customTagInput, setCustomTagInput] = useState('');
  const [selectedVisibility, setSelectedVisibility] = useState('Público');

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

  // Hashtags sugeridos para posicionamiento SEO
  const suggestedTags = [
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
        setSelectedVideo({
          uri: asset.uri,
          name: asset.fileName || 'video.mp4',
          duration: asset.duration ? Math.round(asset.duration / 1000) : undefined,
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
    if (!customTagInput.trim()) return;
    const cleanTag = customTagInput.trim().startsWith('#')
      ? customTagInput.trim().toLowerCase()
      : `#${customTagInput.trim().toLowerCase()}`;
    if (!selectedTags.includes(cleanTag)) {
      setSelectedTags([...selectedTags, cleanTag]);
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

      // 3. Registrar video en base de datos PostgreSQL
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
      });

      setPublishSuccess(true);
      setTitle('');
      setDescription('');
      setSelectedVideo(null);
      setSelectedThumbnail(null);
      setSelectedTags(['#parati', '#hd']);
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
          <Image
            source={{
              uri:
                user?.avatarUrl ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop',
            }}
            style={styles.headerAvatar}
          />
          <View style={styles.onlineDot} />
        </View>
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
            placeholder="Añade detalles, créditos o hashtags adicionales (#amateur #hd)..."
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

        {/* 5. Selector de Hashtags / Tags para búsquedas */}
        <View style={[styles.sectionHeaderRow, { marginTop: 14 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Hash size={16} color={COLORS.neonLime} />
            <Text style={styles.sectionLabel}>Hashtags para Búsquedas</Text>
          </View>
          <Text style={styles.sectionHint}>Selecciona o escribe tags</Text>
        </View>

        {/* Pills de Tags Seleccionados y Sugeridos */}
        <View style={styles.tagsContainer}>
          {suggestedTags.map((tag) => {
            const isSelected = selectedTags.includes(tag);
            return (
              <TouchableOpacity
                key={tag}
                style={[styles.tagPill, isSelected && styles.tagPillSelected]}
                onPress={() => toggleTag(tag)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tagPillText, isSelected && styles.tagPillTextSelected]}>
                  {tag} {isSelected ? '✓' : '+'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Input para agregar tag personalizado */}
        <View style={styles.customTagRow}>
          <TextInput
            style={styles.customTagInput}
            placeholder="Añadir hashtag personalizado (ej. #estreno)"
            placeholderTextColor="#777"
            value={customTagInput}
            onChangeText={setCustomTagInput}
            onSubmitEditing={handleAddCustomTag}
          />
          <TouchableOpacity style={styles.addTagBtn} onPress={handleAddCustomTag} activeOpacity={0.8}>
            <Plus size={16} color="#000000" />
            <Text style={styles.addTagBtnText}>Agregar</Text>
          </TouchableOpacity>
        </View>

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
});



