import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { Hash, Layers, Flame, ChevronRight, Edit3, Sparkles, Users, Flame as FlameIcon, Star, Zap } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { HashtagListModal } from './HashtagListModal';
import { RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../theme/colors';

interface VisualCategory {
  id: string;
  name: string;
  imageUrl: string;
  count: string;
  badge?: string;
  isNew?: boolean;
  isHot?: boolean;
  isPremium?: boolean;
}

interface VisualCategoriesGridProps {
  onSelectCategory: (categoryName: string) => void;
}

export const VisualCategoriesGrid: React.FC<VisualCategoriesGridProps> = ({
  onSelectCategory,
}) => {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const isActor = Boolean(user?.role === 'CREATOR' || user?.role === 'ADMIN');
  const [showHashtagModal, setShowHashtagModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [categories, setCategories] = useState<VisualCategory[]>([
    {
      id: 'cat-1',
      name: '#parati',
      imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop',
      count: '1.2M videos',
      badge: 'RECOMENDADO',
      isHot: true,
    },
    {
      id: 'cat-2',
      name: '#hd',
      imageUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop',
      count: '856K videos',
      badge: '4K ULTRA HD',
      isPremium: true,
    },
    {
      id: 'cat-3',
      name: '#amateur',
      imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop',
      count: '2.1M videos',
      badge: 'POPULAR',
      isHot: true,
    },
    {
      id: 'cat-4',
      name: '#pareja',
      imageUrl: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=500&auto=format&fit=crop',
      count: '943K videos',
      badge: 'TENDENCIA',
    },
    {
      id: 'cat-5',
      name: '#nuevos',
      imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500&auto=format&fit=crop',
      count: '324K videos',
      badge: 'NUEVO',
      isNew: true,
    },
    {
      id: 'cat-6',
      name: '#vr',
      imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&auto=format&fit=crop',
      count: '156K videos',
      badge: 'VR 360°',
    },
    {
      id: 'cat-7',
      name: '#trans',
      imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&auto=format&fit=crop',
      count: '412K videos',
      badge: 'EXCLUSIVO',
    },
    {
      id: 'cat-8',
      name: '#fetish',
      imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&auto=format&fit=crop',
      count: '187K videos',
      badge: 'ESPECIAL',
    },
  ]);

  const loadTags = () => {
    setIsLoading(true);
    api.tags.getPopular().then((tags) => {
      if (Array.isArray(tags) && tags.length > 0) {
        setCategories(
          tags.map((t) => ({
            id: t.id,
            name: t.name.startsWith('#') ? t.name : `#${t.name}`,
            imageUrl: t.imageUrl,
            count: t.countFormatted || `${t.count} videos`,
            badge: t.badge,
            isHot: t.badge === 'HOT' || t.badge === 'TRENDING',
            isNew: t.badge === 'NEW',
            isPremium: t.badge === 'PREMIUM' || t.badge === 'VIP',
          }))
        );
      }
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });
  };

  useEffect(() => {
    loadTags();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando categorías...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Cabecera */}
      <View style={styles.sectionHeader}>
        <View style={styles.titleWithIcon}>
          <View style={[styles.iconBox, { backgroundColor: colors.primaryGlow }]}>
            <Hash size={18} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Explorar por Categorías
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              {isActor ? 'Los creadores pueden destacar sus categorías' : 'Descubre contenido por etiquetas premium'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.manageBtn,
            { 
              backgroundColor: isActor ? colors.primary : colors.surfaceCardLight,
              borderColor: isActor ? colors.primary : colors.border,
            }
          ]}
          onPress={() => setShowHashtagModal(true)}
          activeOpacity={0.8}
        >
          {isActor ? (
            <Edit3 size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
          ) : (
            <Sparkles size={14} color={colors.primary} style={{ marginRight: 4 }} />
          )}
          <Text style={[
            styles.manageBtnText, 
            isActor && { color: '#FFFFFF' },
            !isActor && { color: colors.primary }
          ]}>
            {isActor ? 'Gestionar' : 'Explorar todo'}
          </Text>
          <ChevronRight size={15} color={isActor ? '#FFFFFF' : colors.primary} />
        </TouchableOpacity>
      </View>

      <HashtagListModal
        visible={showHashtagModal}
        onClose={() => {
          setShowHashtagModal(false);
          loadTags();
        }}
        onSelectHashtag={onSelectCategory}
      />

      {/* Título de sección */}
      {!isActor && (
        <View style={styles.sectionTitleContainer}>
          <Text style={styles.sectionTitle}>Colecciones Destacadas</Text>
          <Text style={styles.sectionSubtitle}>Las más vistas y favoritas de la comunidad</Text>
        </View>
      )}

      {/* Carrusel Horizontal de Tarjetas Visuales Premium */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
        contentContainerStyle={{ paddingBottom: SPACING.md }}
      >
        {categories.map((cat) => {
          // Determinar estilo basado en propiedades
          const isHot = cat.isHot ?? false;
          const isNew = cat.isNew ?? false;
          const isPremium = cat.isPremium ?? false;
          
          return (
            <TouchableOpacity
              key={cat.id}
              activeOpacity={0.9}
              style={[
                styles.categoryCard,
                isHot && styles.categoryCardHot,
                isNew && styles.categoryCardNew,
                isPremium && styles.categoryCardPremium,
                { borderColor: colors.border },
              ]}
              onPress={() => onSelectCategory(cat.name)}
            >
              {/* Imagen principal */}
              <Image
                source={{ uri: cat.imageUrl }}
                style={styles.categoryImage}
                resizeMode="cover"
                accessibilityLabel={`Categoría ${cat.name}`}
                accessible
                onError={() => {
                  // Fallback a imagen genérica
                  const fallbackUrls = {
                    '#parati': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop',
                    '#hd': 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop',
                    '#amateur': 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop',
                    '#pareja': 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=500&auto=format&fit=crop',
                    '#nuevos': 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500&auto=format&fit=crop',
                    '#vr': 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&auto=format&fit=crop',
                    '#trans': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&auto=format&fit=crop',
                    '#fetish': 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&auto=format&fit=crop',
                  };
                  (cat as any).imageUrl = fallbackUrls[cat.name] || 
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop';
                }}
              />

              {/* Overlay de gradiente para mejor legibilidad del texto */}
              <View style={styles.imageOverlay} />

              {/* Ribbons y badges */}
              {isHot && (
                <View style={styles.ribbonHot}>
                  <Text style={styles.ribbonText}>🔥 TENDENCIA</Text>
                </View>
              )}
              {isNew && (
                <View style={styles.ribbonNew}>
                  <Text style={styles.ribbonText}>NUEVO</Text>
                </View>
              )}
              {isPremium && (
                <View style={styles.ribbonPremium}>
                  <Text style={styles.ribbonText}>💎 PREMIUM</Text>
                </View>
              )}

              {/* Badge esquina superior derecha */}
              {cat.badge && (
                <View style={[
                  styles.badgeContainer,
                  isHot && { backgroundColor: '#FF6B00' },
                  isNew && { backgroundColor: colors.primary },
                  isPremium && { backgroundColor: colors.gold },
                ]}>
                  <Text style={styles.badgeText}>{cat.badge}</Text>
                </View>
              )}

              {/* Contenido de texto */}
              <View style={styles.contentContainer}>
                <Text style={[
                  styles.categoryTitle,
                  isHot && { color: '#FF6B00' },
                  isNew && { color: colors.primary },
                  isPremium && { color: colors.gold },
                ]} numberOfLines={1}>
                  {cat.name}
                </Text>
                <Text style={[
                  styles.categoryCount,
                  isHot && { color: '#FF6B00' },
                  isNew && { color: colors.primaryLight },
                  isPremium && { color: colors.goldLight },
                ]}>
                  {cat.count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      
      {/* Indicador de scroll para web */}
      {!isActor && (
        <View style={styles.scrollIndicator}>
          <View style={[
            styles.scrollIndicatorBar,
            { backgroundColor: colors.primary }
          ]} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E28',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  manageBtnText: {
    fontSize: TYPOGRAPHY.labelMedium.fontSize,
    fontWeight: TYPOGRAPHY.labelMedium.fontWeight,
    marginRight: SPACING.xs,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    ...TYPOGRAPHY.headlineMedium,
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textSecondary,
  },
  sectionTitleContainer: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  scrollList: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  loadingContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...TYPOGRAPHY.bodyMedium,
    color: colors.textSecondary,
  },
  categoryCard: {
    width: 180,
    height: 220,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: colors.surfaceCard,
    ...SHADOWS.card,
    position: 'relative',
  },
  categoryCardHot: {
    borderColor: '#FF6B00',
    backgroundColor: 'rgba(255, 107, 0, 0.05)',
  },
  categoryCardNew: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(230, 30, 58, 0.05)',
  },
  categoryCardPremium: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    ...SHADOWS.glow(),
  },
  categoryImage: {
    width: '100%',
    height: '60%', // 132px de 220px
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.7))',
  },
  ribbonHot: {
    position: 'absolute',
    top: -8,
    left: -8,
    backgroundColor: '#FF6B00',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    transform: [{ rotate: '-15deg' }],
  },
  ribbonNew: {
    position: 'absolute',
    top: -8,
    left: -8,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    transform: [{ rotate: '-15deg' }],
  },
  ribbonPremium: {
    position: 'absolute',
    top: -8,
    left: -8,
    backgroundColor: colors.gold,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    transform: [{ rotate: '-15deg' }],
  },
  ribbonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  badgeContainer: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.xs,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.labelSmall.fontSize,
    fontWeight: TYPOGRAPHY.labelSmall.fontWeight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contentContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.md,
  },
  categoryTitle: {
    ...TYPOGRAPHY.titleMedium,
    color: colors.textPrimary,
    marginBottom: SPACING.xs,
    maxWidth: '80%',
  },
  categoryCount: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textSecondary,
  },
  scrollIndicator: {
    marginTop: SPACING.xs,
    alignSelf: 'stretch',
  },
  scrollIndicatorBar: {
    height: 4,
    borderRadius: 2,
  },
});

// Estilos para el modal de hashtags (mantener consistencia)
import { Modal, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Plus, CheckCircle2, X, Camera, Image as ImageIcon, Video as VideoIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { ActorStoryGroup } from '../services/api';

// Mantener el HashtagListModal existente pero actualizar sus estilos si es necesario
// Por ahora, dejamos el modal tal como está para no romper funcionalidad existente