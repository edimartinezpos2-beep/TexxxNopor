import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ForceUpdateGate } from './src/components/ForceUpdateGate';

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
