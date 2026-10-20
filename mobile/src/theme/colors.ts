// ============================================================================
// TEXXXNOPOR PREMIUM THEME - Adult +18 Design System
// Inspirado en Pornhub Premium + Netflix + OnlyFans estética oscura cinematográfica
// ============================================================================

export interface ThemeColors {
  // Fondos base - Negro profundo con tonos cálidos
  background: string;
  backgroundDeep: string;
  backgroundElevated: string;
  surface: string;
  surfaceCard: string;
  surfaceCardLight: string;
  surfaceGlass: string;        // Glassmorphism base
  surfaceGlassStrong: string;  // Glassmorphism fuerte
  border: string;
  borderLight: string;
  borderGlow: string;

  // Acentos principales - Rojo Pornhub Premium refinado
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryGlow: string;
  primaryGlowStrong: string;

  // Acento secundario - Naranja/Ámbar para CTAs y highlights
  accent: string;
  accentDark: string;
  accentLight: string;
  accentGlow: string;

  // Colores de estado semánticos
  success: string;
  successGlow: string;
  warning: string;
  warningGlow: string;
  error: string;
  errorGlow: string;
  verifiedBlue: string;
  verifiedBlueGlow: string;
  onlineGreen: string;
  onlineGreenGlow: string;

  // VIP / Premium / Gold
  gold: string;
  goldLight: string;
  goldGlow: string;
  silver: string;
  bronze: string;

  // Textos con jerarquía clara
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textMuted: string;
  textInverse: string;
  textOnPrimary: string;

  // Overlays y elementos
  overlayDark: string;
  overlayDarker: string;
  overlayGlass: string;
  cardBg: string;
  inputBg: string;
  tabBarBg: string;
  tabBarBorder: string;

  // Sombras y profundidad
  shadowSoft: string;
  shadowMedium: string;
  shadowStrong: string;
  shadowGlow: string;

  // Gradientes predefinidos
  gradientPrimary: string[];
  gradientAccent: string[];
  gradientDark: string[];
  gradientGlass: string[];
}

// ============================================================================
// TEMA OSCURO PREMIUM (Por defecto para contenido adulto)
// ============================================================================
export const DARK_THEME: ThemeColors = {
  // Fondos - Negro profundo con calor sutil
  background: '#0A0808',           // Negro casi puro, cálido
  backgroundDeep: '#050404',       // Para áreas más profundas
  backgroundElevated: '#141111',   // Cards elevadas
  surface: '#110F0F',              // Superficie base
  surfaceCard: '#161313',          // Cards principales
  surfaceCardLight: '#1E1A1A',     // Cards hover/pressed
  surfaceGlass: 'rgba(22, 19, 19, 0.85)',     // Glassmorphism
  surfaceGlassStrong: 'rgba(22, 19, 19, 0.95)',
  border: '#2A2525',               // Bordes sutiles
  borderLight: '#3A3333',          // Bordes más visibles
  borderGlow: 'rgba(230, 30, 58, 0.3)',       // Bordes con glow

  // Primario - Rojo Pornhub Premium refinado
  primary: '#E61E3A',              // Rojo principal vibrante
  primaryDark: '#B8182D',          // Hover/pressed
  primaryLight: '#FF5A6F',         // Highlights
  primaryGlow: 'rgba(230, 30, 58, 0.35)',
  primaryGlowStrong: 'rgba(230, 30, 58, 0.55)',

  // Acento - Naranja/Ámbar para CTAs secundarios
  accent: '#FF6B00',               // Naranja vibrante
  accentDark: '#E85D00',
  accentLight: '#FF8A33',
  accentGlow: 'rgba(255, 107, 0, 0.35)',

  // Estados semánticos
  success: '#00E676',
  successGlow: 'rgba(0, 230, 118, 0.35)',
  warning: '#FFD600',
  warningGlow: 'rgba(255, 214, 0, 0.35)',
  error: '#FF1744',
  errorGlow: 'rgba(255, 23, 68, 0.35)',
  verifiedBlue: '#2979FF',
  verifiedBlueGlow: 'rgba(41, 121, 255, 0.35)',
  onlineGreen: '#00E676',
  onlineGreenGlow: 'rgba(0, 230, 118, 0.45)',

  // VIP / Premium
  gold: '#FFD700',
  goldLight: '#FFEA80',
  goldGlow: 'rgba(255, 215, 0, 0.45)',
  silver: '#C0C0C0',
  bronze: '#CD7F32',

  // Textos - Jerarquía tipográfica clara
  textPrimary: '#FFFFFF',          // Blanco puro para títulos
  textSecondary: '#E8E4E0',        // Casi blanco para subtítulos
  textTertiary: '#B8B0A8',         // Gris cálido para cuerpo
  textMuted: '#8A8078',            // Muted para metadatos
  textInverse: '#0A0808',          // Sobre fondos claros
  textOnPrimary: '#FFFFFF',        // Sobre primary

  // Overlays
  overlayDark: 'rgba(10, 8, 8, 0.85)',
  overlayDarker: 'rgba(5, 4, 4, 0.95)',
  overlayGlass: 'rgba(10, 8, 8, 0.6)',
  cardBg: '#161313',
  inputBg: '#1E1A1A',
  tabBarBg: '#0A0808',
  tabBarBorder: '#2A2525',

  // Sombras
  shadowSoft: 'rgba(0, 0, 0, 0.2)',
  shadowMedium: 'rgba(0, 0, 0, 0.35)',
  shadowStrong: 'rgba(0, 0, 0, 0.5)',
  shadowGlow: 'rgba(230, 30, 58, 0.25)',

  // Gradientes (para uso en CSS-in-JS o Skia)
  gradientPrimary: ['#E61E3A', '#B8182D', '#8B121E'],
  gradientAccent: ['#FF6B00', '#E85D00', '#CC4A00'],
  gradientDark: ['#161313', '#110F0F', '#0A0808'],
  gradientGlass: ['rgba(22,19,19,0.9)', 'rgba(22,19,19,0.7)', 'rgba(22,19,19,0.5)'],
};

// ============================================================================
// TEMA CLARO (Accesibilidad - WCAG AAA)
// ============================================================================
export const LIGHT_THEME: ThemeColors = {
  background: '#FAF6F1',
  backgroundDeep: '#F5EFE6',
  backgroundElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceCard: '#FFFFFF',
  surfaceCardLight: '#F5EFE6',
  surfaceGlass: 'rgba(255, 255, 255, 0.9)',
  surfaceGlassStrong: 'rgba(255, 255, 255, 0.98)',
  border: '#E7E0D6',
  borderLight: '#D6CFC4',
  borderGlow: 'rgba(230, 30, 58, 0.25)',

  primary: '#B8182D',
  primaryDark: '#8B121E',
  primaryLight: '#E61E3A',
  primaryGlow: 'rgba(184, 24, 45, 0.25)',
  primaryGlowStrong: 'rgba(184, 24, 45, 0.4)',

  accent: '#E85D00',
  accentDark: '#CC4A00',
  accentLight: '#FF8A33',
  accentGlow: 'rgba(232, 93, 0, 0.25)',

  success: '#00A85C',
  successGlow: 'rgba(0, 168, 92, 0.25)',
  warning: '#B88600',
  warningGlow: 'rgba(184, 134, 0, 0.25)',
  error: '#D32F2F',
  errorGlow: 'rgba(211, 47, 47, 0.25)',
  verifiedBlue: '#1D4ED8',
  verifiedBlueGlow: 'rgba(29, 78, 216, 0.25)',
  onlineGreen: '#00A85C',
  onlineGreenGlow: 'rgba(0, 168, 92, 0.35)',

  gold: '#B88600',
  goldLight: '#D4A81A',
  goldGlow: 'rgba(184, 134, 0, 0.35)',
  silver: '#9E9E9E',
  bronze: '#A0522D',

  textPrimary: '#1C1917',
  textSecondary: '#44403C',
  textTertiary: '#57534E',
  textMuted: '#78716C',
  textInverse: '#FFFFFF',
  textOnPrimary: '#FFFFFF',

  overlayDark: 'rgba(28, 25, 23, 0.6)',
  overlayDarker: 'rgba(28, 25, 23, 0.85)',
  overlayGlass: 'rgba(28, 25, 23, 0.4)',
  cardBg: '#FFFFFF',
  inputBg: '#F5EFE6',
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#E7E0D6',

  shadowSoft: 'rgba(0, 0, 0, 0.08)',
  shadowMedium: 'rgba(0, 0, 0, 0.15)',
  shadowStrong: 'rgba(0, 0, 0, 0.25)',
  shadowGlow: 'rgba(184, 24, 45, 0.2)',

  gradientPrimary: ['#B8182D', '#8B121E', '#6B0E16'],
  gradientAccent: ['#E85D00', '#CC4A00', '#A03D00'],
  gradientDark: ['#F5EFE6', '#E7E0D6', '#D6CFC4'],
  gradientGlass: ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.8)', 'rgba(255,255,255,0.6)'],
};

// ============================================================================
// COMPATIBILIDAD LEGACY
// ============================================================================
export const COLORS = {
  ...DARK_THEME,
  neonLime: '#E61E3A',
  neonLimeDark: '#B8182D',
};

// ============================================================================
// UTILIDADES DE ESTILO
// ============================================================================
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  full: 9999,
};

export const SHADOWS = {
  card: {
    shadowColor: DARK_THEME.shadowMedium,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHover: {
    shadowColor: DARK_THEME.shadowStrong,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 8,
  },
  glow: (color: string = DARK_THEME.primaryGlow) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 0,
  }),
  glowStrong: (color: string = DARK_THEME.primaryGlowStrong) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 0,
  }),
};

export const TYPOGRAPHY = {
  // Display
  displayLarge: { fontSize: 48, fontWeight: '800' as const, lineHeight: 56, letterSpacing: -0.5 },
  displayMedium: { fontSize: 36, fontWeight: '800' as const, lineHeight: 44, letterSpacing: -0.3 },
  displaySmall: { fontSize: 28, fontWeight: '700' as const, lineHeight: 36, letterSpacing: -0.2 },
  // Headline
  headlineLarge: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32 },
  headlineMedium: { fontSize: 20, fontWeight: '700' as const, lineHeight: 28 },
  headlineSmall: { fontSize: 18, fontWeight: '700' as const, lineHeight: 26 },
  // Title
  titleLarge: { fontSize: 16, fontWeight: '700' as const, lineHeight: 24 },
  titleMedium: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20 },
  titleSmall: { fontSize: 12, fontWeight: '600' as const, lineHeight: 18 },
  // Body
  bodyLarge: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodyMedium: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  bodySmall: { fontSize: 12, fontWeight: '400' as const, lineHeight: 18 },
  // Label
  labelLarge: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20 },
  labelMedium: { fontSize: 12, fontWeight: '600' as const, lineHeight: 18 },
  labelSmall: { fontSize: 10, fontWeight: '700' as const, lineHeight: 14, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
};

// Z-index layers
export const Z_INDEX = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  modal: 300,
  modalOverlay: 250,
  tooltip: 400,
  toast: 500,
};

// Breakpoints (para web responsive)
export const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
};

export type ThemeMode = 'dark' | 'light';
export type ThemeColorsKey = keyof ThemeColors;

export const getTheme = (mode: ThemeMode): ThemeColors => mode === 'dark' ? DARK_THEME : LIGHT_THEME;

export const withOpacity = (color: string, opacity: number): string => {
  // Convierte hex a rgba
  const hex = color.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// Estilos de botón predefinidos
export const BUTTON_STYLES = {
  primary: {
    backgroundColor: DARK_THEME.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  primaryOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: DARK_THEME.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  glass: {
    backgroundColor: DARK_THEME.surfaceGlass,
    borderWidth: 1,
    borderColor: DARK_THEME.borderLight,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
};

export const CARD_STYLES = {
  base: {
    backgroundColor: DARK_THEME.surfaceCard,
    borderWidth: 1,
    borderColor: DARK_THEME.border,
    borderRadius: RADIUS.lg,
  },
  glass: {
    backgroundColor: DARK_THEME.surfaceGlass,
    borderWidth: 1,
    borderColor: DARK_THEME.borderLight,
    borderRadius: RADIUS.lg,
  },
  premium: {
    backgroundColor: DARK_THEME.surfaceCard,
    borderWidth: 1,
    borderColor: DARK_THEME.borderGlow,
    borderRadius: RADIUS.xl,
    ...SHADOWS.cardHover,
  },
};