import React from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ForceUpdateGate } from './src/components/ForceUpdateGate';

if (Platform.OS === 'web') {
  require('./src/styles/global.css');
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <ForceUpdateGate>
            <RootNavigator />
          </ForceUpdateGate>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
