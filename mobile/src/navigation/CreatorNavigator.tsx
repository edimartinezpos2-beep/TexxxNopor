import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  UploadCloud,
  Film,
  Home,
  User,
  LogOut,
  Eye,
  Heart,
  Trash2,
  Sparkles,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react-native';
import { PublishScreen } from '../screens/PublishScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { VideoDetailPlayerScreen } from '../screens/VideoDetailPlayerScreen';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { VideoItem } from '../types/auth';
import { COLORS } from '../theme/colors';

const Tab = createBottomTabNavigator();

// Pantalla: Mis Videos Subidos (Actor / Creador)
const CreatorMyVideosScreen: React.FC<{ onSelectVideo: (video: VideoItem) => void }> = ({
  onSelectVideo,
}) => {
  const { userToken } = useAuth();
  const [myVideos, setMyVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchVideos = useCallback(async () => {
    try {
      const videos = await api.user.getMyVideos(userToken);
      setMyVideos(videos);
    } catch (err) {
      console.log('Error fetching creator videos:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userToken]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleDeleteVideo = (videoId: string, title: string) => {
    Alert.alert(
      'Eliminar Video',
      `¿Estás seguro de eliminar permanentemente "${title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.videos.deleteVideo(userToken || '', videoId);
              setMyVideos((prev) => prev.filter((v) => v.id !== videoId));
              Alert.alert('Éxito', 'El video ha sido eliminado correctamente.');
            } catch (err) {
              Alert.alert('Error', 'No se pudo eliminar el video.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>Mis Videos Publicados</Text>
          <Text style={styles.headerSubtitle}>
            {myVideos.length} {myVideos.length === 1 ? 'video activo' : 'videos activos'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => {
            setRefreshing(true);
            fetchVideos();
          }}
        >
          <RefreshCw size={18} color={COLORS.neonLime} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.neonLime} />
        </View>
      ) : myVideos.length === 0 ? (
        <View style={styles.emptyBox}>
          <Film size={48} color="#444450" />
          <Text style={styles.emptyTitle}>Aún no has publicado videos</Text>
          <Text style={styles.emptySubtitle}>
            Usa la pestaña «Publicar» para subir tu primer video con Cloudinary y posicionarlo en las categorías.
          </Text>
        </View>
      ) : (
        <FlatList
          data={myVideos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.videoCard}
              onPress={() => onSelectVideo(item)}
              activeOpacity={0.8}
            >
              <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbImage} />
              <View style={styles.videoInfo}>
                <Text style={styles.videoTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.videoCategory}>{item.category || 'Para ti'}</Text>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Eye size={12} color="#8E8E93" />
                    <Text style={styles.statText}>{item.views || '0 vistas'}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Heart size={12} color="#E50914" />
                    <Text style={styles.statText}>{item.likesCount || 0}</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDeleteVideo(item.id, item.title)}
              >
                <Trash2 size={18} color="#FF3B30" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

interface CreatorNavigatorProps {
  onLogout?: () => void;
  onSwitchToSpectator?: () => void;
}

export const CreatorNavigator: React.FC<CreatorNavigatorProps> = ({
  onLogout,
  onSwitchToSpectator,
}) => {
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);

  if (selectedVideo) {
    return <VideoDetailPlayerScreen video={selectedVideo} onBack={() => setSelectedVideo(null)} />;
  }

  return (
    <Tab.Navigator
      initialRouteName="Publicar"
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.neonLime,
        tabBarInactiveTintColor: '#8E8E93',
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      {/* 1. TAB PRINCIPAL DE ACTOR: PUBLICAR VIDEO */}
      <Tab.Screen
        name="Publicar"
        component={PublishScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrapper, focused && styles.tabIconWrapperActive]}>
              <UploadCloud size={22} color={color} />
            </View>
          ),
          tabBarLabel: 'Publicar Video',
        }}
      />

      {/* 2. TAB MIS VIDEOS SUBIDOS */}
      <Tab.Screen
        name="MisVideos"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrapper, focused && styles.tabIconWrapperActive]}>
              <Film size={22} color={color} />
            </View>
          ),
          tabBarLabel: 'Mis Videos',
        }}
      >
        {() => <CreatorMyVideosScreen onSelectVideo={(v) => setSelectedVideo(v)} />}
      </Tab.Screen>

      {/* 3. TAB CATÁLOGO / EXPLORAR */}
      <Tab.Screen
        name="Feed"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrapper, focused && styles.tabIconWrapperActive]}>
              <Home size={22} color={color} />
            </View>
          ),
          tabBarLabel: 'Catálogo',
        }}
      >
        {() => (
          <HomeScreen
            onSelectVideo={(video) => setSelectedVideo(video)}
            onOpenAdminPanel={onSwitchToSpectator}
          />
        )}
      </Tab.Screen>

      {/* 4. TAB PERFIL DE ACTOR */}
      <Tab.Screen
        name="PerfilActor"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrapper, focused && styles.tabIconWrapperActive]}>
              <User size={22} color={color} />
            </View>
          ),
          tabBarLabel: 'Mi Perfil',
        }}
      >
        {() => (
          <ProfileScreen
            onSelectVideo={(video) => setSelectedVideo(video)}
            onOpenAdminPanel={undefined}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 25,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E26',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  refreshBtn: {
    padding: 8,
    backgroundColor: '#16161C',
    borderRadius: 8,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 14,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  videoCard: {
    flexDirection: 'row',
    backgroundColor: '#121216',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#22222C',
    alignItems: 'center',
    gap: 12,
  },
  thumbImage: {
    width: 100,
    height: 65,
    borderRadius: 8,
    backgroundColor: '#1E1E24',
  },
  videoInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  videoTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  videoCategory: {
    fontSize: 11,
    color: COLORS.neonLime,
    fontWeight: '600',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 11,
    color: '#8E8E93',
  },
  deleteBtn: {
    padding: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    borderRadius: 8,
  },
  tabBar: {
    backgroundColor: '#0A0A0E',
    borderTopWidth: 1,
    borderTopColor: '#1A1A22',
    height: 60,
    paddingBottom: 6,
    paddingTop: 6,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  tabIconWrapper: {
    padding: 4,
    borderRadius: 8,
  },
  tabIconWrapperActive: {
    backgroundColor: 'rgba(206, 255, 0, 0.15)',
  },
});
