import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Compass, Users, Heart, User } from 'lucide-react-native';

import { HomeScreen } from '../screens/HomeScreen';
import { ExploreScreen } from '../screens/ExploreScreen';
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
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);

  // Si hay un video seleccionado, mostramos la pantalla de detalle/reproductor con botón Volver
  if (selectedVideo) {
    return (
      <VideoDetailPlayerScreen
        video={selectedVideo}
        onBack={() => setSelectedVideo(null)}
      />
    );
  }

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: colors.tabBarBg,
            borderTopColor: colors.tabBarBorder,
          },
        ],
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen
        name="Inicio"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.tabIconWrapper,
                focused && [styles.tabIconWrapperActive, { backgroundColor: colors.primaryGlow }],
              ]}
            >
              <Home size={22} color={color} />
            </View>
          ),
        }}
      >
        {() => (
          <HomeScreen
            onSelectVideo={(video) => setSelectedVideo(video)}
            onOpenAdminPanel={onOpenAdminPanel}
          />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="Explorar"
        component={ExploreScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.tabIconWrapper,
                focused && [styles.tabIconWrapperActive, { backgroundColor: colors.primaryGlow }],
              ]}
            >
              <Compass size={22} color={color} />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Actores"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.tabIconWrapper,
                focused && [styles.tabIconWrapperActive, { backgroundColor: colors.primaryGlow }],
              ]}
            >
              <Users size={22} color={color} />
            </View>
          ),
        }}
      >
        {() => <ActorsScreen onSelectVideo={(video) => setSelectedVideo(video)} />}
      </Tab.Screen>

      <Tab.Screen
        name="Siguiendo"
        component={FollowingScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.tabIconWrapper,
                focused && [styles.tabIconWrapperActive, { backgroundColor: colors.primaryGlow }],
              ]}
            >
              <Heart size={22} color={color} />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Perfil"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.tabIconWrapper,
                focused && [styles.tabIconWrapperActive, { backgroundColor: colors.primaryGlow }],
              ]}
            >
              <User size={22} color={color} />
            </View>
          ),
        }}
      >
        {() => (
          <ProfileScreen
            onSelectVideo={(video) => setSelectedVideo(video)}
            onOpenAdminPanel={onOpenAdminPanel}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    height: 64,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
  tabIconWrapper: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 14,
  },
  tabIconWrapperActive: {},
});
