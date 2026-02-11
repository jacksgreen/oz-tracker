// Dog Duty Design System
// Fashion-editorial aesthetic — Instrument Serif + refined minimalism

import { StyleSheet } from 'react-native';

export const fonts = {
  serif: 'InstrumentSerif_400Regular',
  serifItalic: 'InstrumentSerif_400Regular_Italic',
  sans: 'System',
} as const;

// --- Core editorial palette (flat tokens) ---

const palette = {
  ink: '#1A1A1A',
  inkLight: '#3D3D3D',
  inkMuted: '#6B6B6B',
  inkFaint: '#999999',

  cream: '#FAF7F2',
  creamDark: '#F2EDE5',
  parchment: '#EDE8DF',
  white: '#FFFFFF',

  accent: '#C8A97E',
  accentLight: '#E8DCCB',
  accentDark: '#A68B5B',

  success: '#5C8A5E',
  successLight: '#E8F0E8',
  warning: '#C4964C',
  warningLight: '#FAF0E1',
  error: '#B85450',
  errorLight: '#F5E5E4',

  border: '#E2DDD5',
  borderDark: '#C8C2B8',

  overlay: 'rgba(26, 26, 26, 0.5)',
  overlayLight: 'rgba(26, 26, 26, 0.03)',
} as const;

// --- Backward-compatible nested structure ---
// All screens reference these paths (e.g. colors.primary[500], colors.background.card)

export const colors = {
  // Flat editorial tokens (for new code)
  ...palette,

  // Indexed primary scale — mapped from amber/orange to gold/ink editorial tones
  primary: {
    50: palette.creamDark,        // very light background tint
    100: palette.accentLight,     // light accent background
    200: palette.border,          // subtle border / light accent
    300: palette.accentLight,     // medium-light accent
    400: palette.accent,          // warm gold
    500: palette.ink,             // primary action — ink
    600: palette.ink,             // primary emphasis — ink
    700: palette.ink,             // primary dark — ink
  },

  // Named background tokens
  background: {
    primary: palette.cream,       // page background
    secondary: palette.creamDark, // grouped background
    card: palette.white,          // card surfaces
    muted: palette.parchment,     // muted fill
  },

  // Named text tokens
  text: {
    primary: palette.ink,
    secondary: palette.inkMuted,
    muted: palette.inkFaint,
    inverse: palette.cream,
  },

  // Named border tokens
  border: {
    light: palette.border,
    medium: palette.borderDark,
  },

  // Named status tokens
  status: {
    success: palette.success,
    successBg: palette.successLight,
    warning: palette.warning,
    warningBg: palette.warningLight,
    error: palette.error,
  },

  // Named accent tokens
  accent: {
    light: palette.accentLight,
    warm: palette.accent,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 8,
  xl: 12,
  full: 9999,
} as const;

export const typography = {
  // Instrument Serif — display headings
  displayLarge: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 38,
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  displayMedium: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  displaySmall: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  // Italic display — for emphasis moments
  displayItalic: {
    fontFamily: 'InstrumentSerif_400Regular_Italic',
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: 0,
  },
  // System sans — body and UI
  label: {
    fontWeight: '500' as const,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
  body: {
    fontWeight: '400' as const,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  bodySmall: {
    fontWeight: '400' as const,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.1,
  },
  caption: {
    fontWeight: '400' as const,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.3,
  },
  button: {
    fontWeight: '500' as const,
    fontSize: 14,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
} as const;

export const hairline = StyleSheet.hairlineWidth;
