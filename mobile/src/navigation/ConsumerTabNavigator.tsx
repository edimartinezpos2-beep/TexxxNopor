import React, { useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { Home, Compass, Users, Heart, User, Gamepad2 } from 'lucide-react-native';

import { HomeScreen } from '../screens/HomeScreen';
import { ExploreScreen } from '../screens/ExploreScreen';
import { GamesScreen } from '../screens/GamesScreen';
import { ActorsScreen } from '../screens/ActorsScreen';
import { FollowingScreen } from '../screens/FollowingScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { VideoDetailPlayerScreen } from '../screens/VideoDetailPlayerScreen';
import { useTheme } from '../context/ThemeContext';
import { VideoItem } from '../types/auth';

const Tab = createBottomTabNavigator();

interface ConsumerTabNavigatorProps {
  onOpenAdminPanel?: () => void;
}

export const ConsumerTabNavigator: React.FC<ConsumerTabNavigatorProps> = ({ onOpenAdminPanel }) => {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [targetActorId, setTargetActorId] = useState<string | null>(null);

  const handleViewActor = (actorId?: string, actorName?: string) => {
    if (selectedVideo) {
      setSelectedVideo(null);
    }
    if (actorId) {
      setTargetActorId(actorId);
    }
    navigation.navigate('Actores');
  };

  // Si hay un video seleccionado, mostramos la pantalla de detalle/reproductor con botón Volver
  if (selectedVideo) {
    return (
      <VideoDetailPlayerScreen
        video={selectedVideo}
        onBack={() => setSelectedVideo(null)}
        onViewActor={handleViewActor}
      />
    );
  }

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarLabelPosition: isLandscape ? 'beside-icon' : 'below-icon',
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: colors.tabBarBg,
            borderTopColor: colors.tabBarBorder,
            height: isLandscape ? 48 : 64,
            paddingBottom: isLandscape ? 4 : 8,
            paddingTop: isLandscape ? 4 : 6,
          },
        ],
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: [
          styles.tabBarLabel,
          {
            marginTop: isLandscape ? 0 : 2,
            marginLeft: isLandscape ? 6 : 0,
          },
        ],
      }}
    >
      <Tab.Screen
        name="Inicio"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.tabIconWrapper,
                isLandscape && styles.tabIconWrapperLandscape,
                focused && [styles.tabIconWrapperActive, { backgroundColor: colors.primaryGlow }],
              ]}
            >
              <Home size={isLandscape ? 18 : 22} color={color} />
            </View>
          ),
        }}
      >
        {() => (
          <HomeScreen
            onSelectVideo={(video) => setSelectedVideo(video)}
            onOpenAdminPanel={onOpenAdminPanel}
            onViewActor={handleViewActor}
          />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="Explorar"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.tabIconWrapper,
                isLandscape && styles.tabIconWrapperLandscape,
                focused && [styles.tabIconWrapperActive, { backgroundColor: colors.primaryGlow }],
              ]}
            >
              <Compass size={isLandscape ? 18 : 22} color={color} />
            </View>
          ),
        }}
      >
        {() => (
          <ExploreScreen
            onSelectVideo={(video) => setSelectedVideo(video)}
            onViewActor={handleViewActor}
          />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="Juegos"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.tabIconWrapper,
                isLandscape && styles.tabIconWrapperLandscape,
                focused && [styles.tabIconWrapperActive, { backgroundColor: colors.primaryGlow }],
              ]}
            >
              <Gamepad2 size={isLandscape ? 18 : 22} color={color} />
            </View>
          ),
        }}
      >
        {() => <GamesScreen />}
      </Tab.Screen>

      <Tab.Screen
        name="Actores"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.tabIconWrapper,
                isLandscape && styles.tabIconWrapperLandscape,
                focused && [styles.tabIconWrapperActive, { backgroundColor: colors.primaryGlow }],
              ]}
            >
              <Users size={isLandscape ? 18 : 22} color={color} />
            </View>
          ),
        }}
      >
        {() => (
          <ActorsScreen
            onSelectVideo={(video) => setSelectedVideo(video)}
            selectedActorId={targetActorId}
            onClearSelectedActor={() => setTargetActorId(null)}
          />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="Siguiendo"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.tabIconWrapper,
                isLandscape && styles.tabIconWrapperLandscape,
                focused && [styles.tabIconWrapperActive, { backgroundColor: colors.primaryGlow }],
              ]}
            >
              <Heart size={isLandscape ? 18 : 22} color={color} />
            </View>
          ),
        }}
      >
        {() => (
          <FollowingScreen
            onSelectVideo={(video) => setSelectedVideo(video)}
            onViewActor={handleViewActor}
          />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="Perfil"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.tabIconWrapper,
                isLandscape && styles.tabIconWrapperLandscape,
                focused && [styles.tabIconWrapperActive, { backgroundColor: colors.primaryGlow }],
              ]}
            >
              <User size={isLandscape ? 18 : 22} color={color} />
            </View>
          ),
        }}
      >
        {() => (
          <ProfileScreen
            onSelectVideo={(video) => setSelectedVideo(video)}
            onOpenAdminPanel={onOpenAdminPanel}
            onViewActor={handleViewActor}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  tabIconWrapper: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 14,
  },
  tabIconWrapperLandscape: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tabIconWrapperActive: {},
});

