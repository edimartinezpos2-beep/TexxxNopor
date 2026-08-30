import React, { createContext, useContext, useState, useEffect } from 'react';
import { DARK_THEME, LIGHT_THEME, ThemeColors } from '../theme/colors';

export type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');

  const isDark = themeMode === 'dark';
  const colors: ThemeColors = isDark ? DARK_THEME : LIGHT_THEME;

  const toggleTheme = () => {
    setThemeModeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
  };

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        isDark,
        colors,
        toggleTheme,
        setThemeMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    // Fallback seguro si se usa fuera del Provider
    return {
      themeMode: 'dark',
      isDark: true,
      colors: DARK_THEME,
      toggleTheme: () => {},
      setThemeMode: () => {},
    };
  }
  return context;
};
