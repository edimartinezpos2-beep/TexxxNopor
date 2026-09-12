import React, { useState } from 'react';
import { View, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { ConsumerTabNavigator } from './ConsumerTabNavigator';
import { AdminNavigator } from './AdminNavigator';
import { CreatorNavigator } from './CreatorNavigator';
import { COLORS } from '../theme/colors';

export const RootNavigator: React.FC = () => {
  const { user, signOut, isLoading } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isActor = user?.role === 'CREATOR';

  const [adminViewMode, setAdminViewMode] = useState<'ADMIN_PANEL' | 'SPECTATOR'>('ADMIN_PANEL');
  const [actorViewMode, setActorViewMode] = useState<'ACTOR_PANEL' | 'SPECTATOR'>('ACTOR_PANEL');

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <ActivityIndicator size="large" color={COLORS?.neonLime || '#CCFF00'} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <View style={styles.rootContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />

        <View style={styles.screenArea}>
          {isAdmin && adminViewMode === 'ADMIN_PANEL' ? (
            <AdminNavigator
              onLogout={signOut}
              onSwitchToSpectator={() => setAdminViewMode('SPECTATOR')}
            />
          ) : isActor && actorViewMode === 'ACTOR_PANEL' ? (
            <CreatorNavigator
              onLogout={signOut}
              onSwitchToSpectator={() => setActorViewMode('SPECTATOR')}
            />
          ) : (
            <ConsumerTabNavigator
              onOpenAdminPanel={
                isAdmin
                  ? () => setAdminViewMode('ADMIN_PANEL')
                  : isActor
                  ? () => setActorViewMode('ACTOR_PANEL')
                  : undefined
              }
            />
          )}
        </View>
      </View>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  screenArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
