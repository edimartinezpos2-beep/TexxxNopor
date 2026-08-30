import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Search, Flame, Sparkles, TrendingUp, Play, Eye, Users, User, X } from 'lucide-react-native';
import { COLORS } from '../theme/colors';
import { api, VideoItem } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface ExploreScreenProps {
  onSelectVideo?: (video: VideoItem) => void;
}

export const ExploreScreen: React.FC<ExploreScreenProps> = ({ onSelectVideo }) => {
  const { userToken, user } = useAuth();
  const [query, setQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Categorías y hashtags solicitados para posicionamiento
  const trendingTags = [
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

  const exploreCategories = [
    { name: 'Para ti', icon: Flame, color: '#FF9500' },
    { name: 'Nuevos', icon: Sparkles, color: '#05D9E8' },
    { name: 'Más videos', icon: Eye, color: COLORS.neonLime },
    { name: 'Amateur', icon: User, color: '#FF2A6D' },
    { name: 'Pareja', icon: Users, color: '#AF52DE' },
  ];

  const searchVideos = async (searchText: string, tagText?: string | null) => {
    setLoading(true);
    try {
      const data = await api.videos.getFeed(userToken, user?.id, {
        query: searchText || undefined,
        tag: tagText || undefined,
      });
      setVideos(data);
    } catch (err) {
      console.log('Error searching videos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchVideos(query, selectedTag);
  }, [query, selectedTag]);

  const handleSelectTag = (tag: string) => {
    if (selectedTag === tag) {
      setSelectedTag(null);
    } else {
      setSelectedTag(tag);
    }
  };

  const handleSelectCategory = (catName: string) => {
    if (catName === 'Para ti') {
      setSelectedTag(null);
      setQuery('');
    } else {
      setSelectedTag(`#${catName.toLowerCase().replace(/\s+/g, '')}`);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Barra de Búsqueda */}
      <View style={styles.searchBar}>
        <Search size={18} color={COLORS.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar videos, categorías o #hashtags (#amateur, #pareja)..."
          placeholderTextColor="#777"
          value={query}
          onChangeText={setQuery}
        />
        {(query.length > 0 || selectedTag) && (
          <TouchableOpacity
            onPress={() => {
              setQuery('');
              setSelectedTag(null);
            }}
          >
            <X size={18} color="#888890" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Categorías Principales */}
        <Text style={styles.sectionTitle}>Categorías Destacadas</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          {exploreCategories.map((cat) => {
            const IconComp = cat.icon;
            return (
              <TouchableOpacity
                key={cat.name}
                style={styles.catCard}
                onPress={() => handleSelectCategory(cat.name)}
                activeOpacity={0.8}
              >
                <View style={[styles.catIconBox, { backgroundColor: `${cat.color}20` }]}>
                  <IconComp size={20} color={cat.color} />
                </View>
                <Text style={styles.catName}>{cat.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Etiquetas en Tendencia */}
        <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Hashtags en Tendencia</Text>
        <View style={styles.tagsContainer}>
          {trendingTags.map((tag) => {
            const isSelected = selectedTag === tag;
            return (
              <TouchableOpacity
                key={tag}
                style={[styles.tagChip, isSelected && styles.tagChipSelected]}
                onPress={() => handleSelectTag(tag)}
                activeOpacity={0.7}
              >
                <TrendingUp
                  size={13}
                  color={isSelected ? '#000000' : COLORS.neonLime}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.tagChipText, isSelected && styles.tagChipTextSelected]}>
                  {tag}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Resultados de Búsqueda */}
        <Text style={[styles.sectionTitle, { marginTop: 22 }]}>
          {selectedTag
            ? `Videos con ${selectedTag}`
            : query
            ? `Resultados para "${query}"`
            : 'Explorar Catálogo'}
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.neonLime} style={{ marginVertical: 30 }} />
        ) : videos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Search size={36} color="#444450" style={{ marginBottom: 8 }} />
            <Text style={styles.emptyTitle}>No se encontraron videos</Text>
            <Text style={styles.emptySubtitle}>
              Prueba buscando con otro término, categoría o hashtag.
            </Text>
          </View>
        ) : (
          <View style={styles.resultsGrid}>
            {videos.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.gridCard}
                onPress={() => onSelectVideo && onSelectVideo(item)}
                activeOpacity={0.85}
              >
                <Image source={{ uri: item.thumbnailUrl }} style={styles.gridThumb} />
                <View style={styles.gridPlayOverlay}>
                  <Play size={18} color="#FFFFFF" fill="#FFFFFF" />
                </View>
                <View style={styles.gridDuration}>
                  <Text style={styles.gridDurationText}>{item.duration}</Text>
                </View>
                <View style={styles.gridInfo}>
                  <Text style={styles.gridTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.gridMeta}>{item.actorName || 'Actor'} · {item.views}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceCard,
    margin: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    color: '#FFFFFF',
    fontSize: 14,
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  catScroll: {
    marginBottom: 6,
  },
  catCard: {
    alignItems: 'center',
    marginRight: 14,
    width: 72,
  },
  catIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  catName: {
    color: '#E0E0E8',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceCard,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagChipSelected: {
    backgroundColor: COLORS.neonLime,
    borderColor: COLORS.neonLime,
  },
  tagChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  tagChipTextSelected: {
    color: '#000000',
    fontWeight: 'bold',
  },
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  gridCard: {
    width: '48%',
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gridThumb: {
    width: '100%',
    height: 100,
    backgroundColor: '#1E1E24',
  },
  gridPlayOverlay: {
    position: 'absolute',
    top: 36,
    left: '50%',
    transform: [{ translateX: -14 }],
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridDuration: {
    position: 'absolute',
    top: 76,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  gridDurationText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  gridInfo: {
    padding: 8,
  },
  gridTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  gridMeta: {
    color: '#8E8E93',
    fontSize: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 30,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  emptySubtitle: {
    color: '#777780',
    fontSize: 11,
    textAlign: 'center',
  },
});
