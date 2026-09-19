import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Hash, Layers, Flame } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';

interface VisualCategory {
  id: string;
  name: string;
  imageUrl: string;
  count: string;
  badge?: string;
}

interface VisualCategoriesGridProps {
  onSelectCategory: (categoryName: string) => void;
}

export const VisualCategoriesGrid: React.FC<VisualCategoriesGridProps> = ({
  onSelectCategory,
}) => {
  const { colors } = useTheme();
  const [categories, setCategories] = useState<VisualCategory[]>([
    {
      id: 'cat-1',
      name: '#parati',
      imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop',
      count: 'Cargando...',
      badge: 'HOT',
    },
    {
      id: 'cat-2',
      name: '#hd',
      imageUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop',
      count: 'Cargando...',
      badge: '4K',
    },
    {
      id: 'cat-3',
      name: '#amateur',
      imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop',
      count: 'Cargando...',
      badge: 'POPULAR',
    },
    {
      id: 'cat-4',
      name: '#pareja',
      imageUrl: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=500&auto=format&fit=crop',
      count: 'Cargando...',
    },
    {
      id: 'cat-5',
      name: '#nuevos',
      imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500&auto=format&fit=crop',
      count: 'Cargando...',
    },
  ]);

  useEffect(() => {
    let isMounted = true;
    api.tags.getPopular().then((tags) => {
      if (isMounted && Array.isArray(tags) && tags.length > 0) {
        setCategories(
          tags.map((t) => ({
            id: t.id,
            name: t.name.startsWith('#') ? t.name : `#${t.name}`,
            imageUrl: t.imageUrl,
            count: t.countFormatted || `${t.count} videos`,
            badge: t.badge,
          }))
        );
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* Cabecera */}
      <View style={styles.sectionHeader}>
        <View style={styles.titleWithIcon}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(255, 149, 0, 0.15)' }]}>
            <Hash size={16} color="#FF9500" />
          </View>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Categorías Populares #Hashtags
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Valores y catálogo real por etiqueta
            </Text>
          </View>
        </View>
      </View>

      {/* Carrusel Horizontal de Tarjetas Visuales */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            activeOpacity={0.88}
            style={[
              styles.categoryCard,
              { borderColor: colors.border },
            ]}
            onPress={() => onSelectCategory(cat.name)}
          >
            <Image
              source={{ uri: cat.imageUrl }}
              style={styles.categoryImage as any}
              resizeMode="cover"
            />
            {/* Overlay oscuro para legibilidad */}
            <View style={styles.darkOverlay} />

            {/* Badge si existe */}
            {cat.badge && (
              <View style={[styles.badge, cat.badge === 'HOT' ? { backgroundColor: '#FF2D55' } : { backgroundColor: colors.primary }]}>
                <Text style={styles.badgeText}>{cat.badge}</Text>
              </View>
            )}

            {/* Texto de la Categoría */}
            <View style={styles.labelContainer}>
              <Text style={styles.categoryTitle} numberOfLines={1}>
                {cat.name}
              </Text>
              <Text style={styles.categoryCount}>{cat.count}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
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
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  scrollList: {
    paddingHorizontal: 12,
    gap: 10,
  },
  categoryCard: {
    width: 140,
    height: 95,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
    backgroundColor: '#1E1E28',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  darkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  labelContainer: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
  },
  categoryTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  categoryCount: {
    color: '#B0B0C0',
    fontSize: 10,
  },
});
