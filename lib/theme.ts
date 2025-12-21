// Oz Tracker Design System
// Warm, artisanal aesthetic with golden amber tones

export const colors = {
  // Primary palette - warm golden amber
  primary: {
    50: '#FFF8F0',
    100: '#FFEDD5',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#F97316', // Main brand color
    600: '#EA580C',
    700: '#C2410C',
  },

  // Accent - terracotta/rust
  accent: {
    light: '#E8D5C4',
    main: '#C4A484',
    warm: '#B87333',
  },

  // Backgrounds - creamy warmth
  background: {
    primary: '#FFFBF7',
    secondary: '#FFF5EB',
    card: '#FFFFFF',
    muted: '#FAF5F0',
  },

  // Status colors
  status: {
    success: '#4ADE80',
    successBg: '#DCFCE7',
    pending: '#D4D4D8',
    pendingBg: '#F4F4F5',
    warning: '#FBBF24',
    warningBg: '#FEF3C7',
    error: '#EF4444',
    errorBg: '#FEE2E2',
  },

  // Text
  text: {
    primary: '#292524',
    secondary: '#78716C',
    muted: '#A8A29E',
    inverse: '#FFFFFF',
  },

  // Borders
  border: {
    light: '#F5E6D3',
    medium: '#E8D5C4',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const typography = {
  // Display - for headers and emphasis
  display: {
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  // Body text
  body: {
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
  // Labels and captions
  caption: {
    fontWeight: '500' as const,
    letterSpacing: 0.5,
  },
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
} as const;
