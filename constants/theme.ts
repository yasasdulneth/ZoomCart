import { useColorScheme } from 'react-native';

// ─── Raw palette ──────────────────────────────────────────────────────────────

export const DarkColors = {
  background: '#000000',
  surface: 'rgba(28,28,30,0.75)',
  surfaceElevated: 'rgba(44,44,46,0.80)',
  surfaceLight: '#1C1C1E',
  text: '#FFFFFF',
  textSecondary: '#AEAEB2',
  textTertiary: '#636366',
  border: 'rgba(255,255,255,0.12)',
  borderSubtle: 'rgba(255,255,255,0.06)',
};

export const LightColors = {
  background: '#F2F2F7',
  surface: 'rgba(255,255,255,0.92)',
  surfaceElevated: 'rgba(255,255,255,0.96)',
  surfaceLight: '#FFFFFF',
  text: '#1C1C1E',
  textSecondary: '#48484A',
  textTertiary: '#8E8E93',
  border: 'rgba(60,60,67,0.18)',
  borderSubtle: 'rgba(60,60,67,0.12)',
};

export const AccentColors = {
  primary: '#007AFF',     // iOS blue
  secondary: '#5856D6',   // iOS indigo
  tertiary: '#FF2D55',    // iOS red/pink
  gradient: ['#007AFF', '#5856D6', '#FF2D55'] as const,
  neon: '#00F5FF',
  green: '#34C759',
  red: '#FF3B30',
  orange: '#FF9F0A',
  purple: '#AF52DE',
};

// Legacy aliases kept for backward compat
export const Colors = {
  dark: DarkColors,
  light: LightColors,
  accent: {
    primary: AccentColors.primary,
    secondary: AccentColors.secondary,
    tertiary: AccentColors.tertiary,
    gradient: AccentColors.gradient,
    neon: AccentColors.neon,
    green: AccentColors.green,
    red: AccentColors.red,
    orange: AccentColors.orange,
    purple: AccentColors.purple,
  },
  glass: {
    light: 'rgba(255,255,255,0.10)',
    medium: 'rgba(255,255,255,0.15)',
    dark: 'rgba(255,255,255,0.05)',
  },
  glassLight: {
    light: 'rgba(0,0,0,0.06)',
    medium: 'rgba(0,0,0,0.08)',
    dark: 'rgba(0,0,0,0.04)',
  },
  shadow: {
    soft: 'rgba(0,122,255,0.18)',
    medium: 'rgba(0,122,255,0.28)',
    strong: 'rgba(0,122,255,0.42)',
  },
};

// ─── Mode-aware theme helper ──────────────────────────────────────────────────

export type ColorScheme = 'light' | 'dark';

export function getThemeColors(scheme: ColorScheme | null | undefined) {
  return scheme === 'light' ? LightColors : DarkColors;
}

/** Hook: returns mode-aware colors */
export function useThemeColors() {
  const scheme = useColorScheme();
  return getThemeColors(scheme);
}

// ─── Typography ───────────────────────────────────────────────────────────────

export const Typography = {
  fonts: {
    primary: 'Poppins-Regular',
    primaryMedium: 'Poppins-Medium',
    primarySemiBold: 'Poppins-SemiBold',
    primaryBold: 'Poppins-Bold',
    secondary: 'Inter-Regular',
    secondaryMedium: 'Inter-Medium',
    accent: 'Montserrat-Regular',
    accentBold: 'Montserrat-Bold',
  },
  // Legacy size scale (keep for backward compat)
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  // iOS-style named scale
  scale: {
    largeTitle: { fontSize: 34, fontWeight: '700' as const, letterSpacing: 0.37 },
    title1:     { fontSize: 28, fontWeight: '700' as const, letterSpacing: 0.36 },
    title2:     { fontSize: 22, fontWeight: '600' as const, letterSpacing: 0.35 },
    title3:     { fontSize: 20, fontWeight: '600' as const, letterSpacing: 0.38 },
    headline:   { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.41 },
    body:       { fontSize: 17, fontWeight: '400' as const, letterSpacing: -0.41 },
    callout:    { fontSize: 16, fontWeight: '400' as const, letterSpacing: -0.32 },
    subhead:    { fontSize: 15, fontWeight: '400' as const, letterSpacing: -0.24 },
    footnote:   { fontSize: 13, fontWeight: '400' as const, letterSpacing: -0.08 },
    caption:    { fontSize: 12, fontWeight: '400' as const, letterSpacing: 0 },
  },
};

// ─── Spacing ──────────────────────────────────────────────────────────────────

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
  xxl: 48, // alias
};

// ─── Border radii ─────────────────────────────────────────────────────────────

export const BorderRadius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
  full: 9999,
};

// ─── Blur intensities ─────────────────────────────────────────────────────────

export const BlurIntensity = {
  light: 40,
  medium: 60,
  heavy: 80,
};

// ─── Shadows ─────────────────────────────────────────────────────────────────

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 10,
  },
  accent: {
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  accentGlow: {
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
};
