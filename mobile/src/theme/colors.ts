// Paleta de colores moderna y elegante para TexxxNopor (Tema Oscuro y Claro)
// Sin color Neón: se utiliza Crimson Red / Rojo Carmesí elegante y refinado

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceCard: string;
  surfaceCardLight: string;
  border: string;
  borderLight: string;

  // Acentos principales
  primary: string;             // Rojo Carmesí (#E50914 / #FF2D55)
  primaryDark: string;
  primaryLight: string;
  primaryGlow: string;
  
  // Colores de estado
  crimsonRed: string;
  crimsonRedGlow: string;
  verifiedBlue: string;
  onlineGreen: string;

  // Textos
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Overlays y elementos
  overlayDark: string;
  cardBg: string;
  inputBg: string;
  tabBarBg: string;
  tabBarBorder: string;
}

export const DARK_THEME: ThemeColors = {
  background: '#0A0A0E',
  surface: '#121217',
  surfaceCard: '#181820',
  surfaceCardLight: '#20202A',
  border: '#262634',
  borderLight: '#323244',

  primary: '#E50914',
  primaryDark: '#B80710',
  primaryLight: '#FF3B47',
  primaryGlow: 'rgba(229, 9, 20, 0.35)',

  crimsonRed: '#E50914',
  crimsonRedGlow: 'rgba(229, 9, 20, 0.4)',
  verifiedBlue: '#0084FF',
  onlineGreen: '#30D158',

  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B0',
  textMuted: '#686878',

  overlayDark: 'rgba(0, 0, 0, 0.78)',
  cardBg: '#16161E',
  inputBg: '#15151D',
  tabBarBg: '#0A0A0E',
  tabBarBorder: '#1F1F2A',
};

export const LIGHT_THEME: ThemeColors = {
  background: '#F5F6F9',
  surface: '#FFFFFF',
  surfaceCard: '#FFFFFF',
  surfaceCardLight: '#F0F2F6',
  border: '#E2E5EB',
  borderLight: '#CBD2DC',

  primary: '#E50914',
  primaryDark: '#B80710',
  primaryLight: '#FF3B47',
  primaryGlow: 'rgba(229, 9, 20, 0.2)',

  crimsonRed: '#E50914',
  crimsonRedGlow: 'rgba(229, 9, 20, 0.3)',
  verifiedBlue: '#0070E0',
  onlineGreen: '#28A745',

  textPrimary: '#0F172A',
  textSecondary: '#556070',
  textMuted: '#8894A4',

  overlayDark: 'rgba(0, 0, 0, 0.55)',
  cardBg: '#FFFFFF',
  inputBg: '#F0F2F5',
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#E5E8EE',
};

// Objeto COLORS de compatibilidad por defecto (Tema Oscuro sin Neón)
export const COLORS = {
  ...DARK_THEME,
  // Alias de compatibilidad hacia atrás mapeados al rojo carmesí moderno
  neonLime: '#E50914',
  neonLimeDark: '#B80710',
};
