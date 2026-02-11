// src/core/themes/themes.ts
// Complete theme definitions for all three app flavors
// Spec: hush-strategy-v6.md Part 4 (lines 195-229)

export interface ThemeColors {
  background: string;
  text: string;
  subtext: string;
  dimSubtext?: string; // Optional: even dimmer subtext for less important UI elements
  primary: string;
  accent: string;
  cardBg: string;
  inputBg: string;
  border: string;
  userBubbleBg?: string; // For Hush themes: darker background for user message bubbles
  userTextColor?: string; // For Hush themes: text color for user messages (defaults to #000)
}

export interface ThemeFonts {
  body: string;
  display: string;
}

export interface AppTheme {
  name: string;
  displayName: string;
  isPro: boolean;
  colors: ThemeColors;
  fonts: ThemeFonts;
}

// ============================================
// HUSH THEMES (5 total: 1 free, 4 pro)
// ============================================

export type HushTheme = 'DEFAULT' | 'MIDNIGHT' | 'PASTEL_GREEN' | 'PASTEL_YELLOW' | 'PASTEL_PINK';

export const HUSH_THEMES: Record<HushTheme, AppTheme> = {
  DEFAULT: {
    name: 'DEFAULT',
    displayName: 'Lavender',
    isPro: false,
    colors: {
      background: '#0a0a0a',
      text: '#e5e5e5',
      subtext: '#999999',
      primary: '#8b5cf6',
      accent: '#2dd4bf',
      cardBg: 'rgba(139, 92, 246, 0.1)',
      inputBg: 'rgba(255, 255, 255, 0.05)',
      border: 'rgba(139, 92, 246, 0.3)',
      userBubbleBg: '#8b5cf6', // Same purple background
      userTextColor: '#ffffff', // White text for contrast with purple background
    },
    fonts: {
      body: 'System',
      display: 'System',
    },
  },
  MIDNIGHT: {
    name: 'MIDNIGHT',
    displayName: 'Blue',
    isPro: true,
    colors: {
      background: '#0d0d1a',
      text: '#e8e8f0',
      subtext: '#8a8a9f',
      primary: '#9AEAFE',
      accent: '#7c8aff',
      cardBg: 'rgba(74, 95, 217, 0.12)',
      inputBg: 'rgba(255, 255, 255, 0.03)',
      border: 'rgba(154, 234, 254, 0.35)',
      userBubbleBg: '#00102E', // Dark blue background for contrast
      userTextColor: '#000000', // Black text for WCAG AAA contrast (15.56:1)
    },
    fonts: {
      body: 'System',
      display: 'System',
    },
  },
  PASTEL_GREEN: {
    name: 'PASTEL_GREEN',
    displayName: 'Green',
    isPro: true,
    colors: {
      background: '#0f1914',
      text: '#e6fff0',
      subtext: '#8cbfa3',
      primary: '#7AAA5A', // Darker, less bright green
      accent: '#8cb574', // Adjusted to match new primary
      cardBg: 'rgba(122, 170, 90, 0.08)',
      inputBg: 'rgba(255, 255, 255, 0.04)',
      border: 'rgba(122, 170, 90, 0.3)',
      userBubbleBg: '#182B0D', // Dark forest green background for contrast
      userTextColor: '#000000', // Black text for WCAG AAA contrast (7.80:1)
    },
    fonts: {
      body: 'System',
      display: 'System',
    },
  },
  PASTEL_YELLOW: {
    name: 'PASTEL_YELLOW',
    displayName: 'Yellow',
    isPro: true,
    colors: {
      background: '#19170f',
      text: '#fffbe6',
      subtext: '#bfb88c',
      primary: '#FFF995',
      accent: '#ffffe0',
      cardBg: 'rgba(255, 249, 149, 0.08)',
      inputBg: 'rgba(255, 255, 255, 0.04)',
      border: 'rgba(255, 249, 149, 0.3)',
      userBubbleBg: '#2E2900', // Dark yellow/brown background for contrast
      userTextColor: '#000000', // Black text for WCAG AAA contrast (19.26:1)
    },
    fonts: {
      body: 'System',
      display: 'System',
    },
  },
  PASTEL_PINK: {
    name: 'PASTEL_PINK',
    displayName: 'Pink',
    isPro: true,
    colors: {
      background: '#1a0f14',
      text: '#ffe6f0',
      subtext: '#bf8ca3',
      primary: '#FFD1FF',
      accent: '#ffc9e3',
      cardBg: 'rgba(255, 209, 255, 0.1)',
      inputBg: 'rgba(255, 255, 255, 0.04)',
      border: 'rgba(255, 209, 255, 0.3)',
      userBubbleBg: '#2E002E', // Dark magenta background for contrast
      userTextColor: '#000000', // Black text for WCAG AAA contrast (15.92:1)
    },
    fonts: {
      body: 'System',
      display: 'System',
    },
  },
};

// ============================================
// CLASSIFIED THEMES (5 total: all Pro-gated)
// Spec lines 209-217
// Note: Terminal Red is default but all Classified themes are Pro only
// ============================================

export type ClassifiedTheme = 'TERMINAL_RED' | 'TERMINAL_AMBER' | 'MATRIX_GREEN' | 'CYBERPUNK' | 'STEALTH';

export const CLASSIFIED_THEMES: Record<ClassifiedTheme, AppTheme> = {
  TERMINAL_RED: {
    name: 'TERMINAL_RED',
    displayName: 'Terminal Red',
    isPro: true, // Default for Classified but still Pro-gated mode
    colors: {
      background: '#000000', // Pure black
      text: '#FFFFFF', // Pure white for CLASSIFIED title and USER labels
      subtext: '#999999', // Dimmed white
      primary: '#FF3333', // Bright red for EYES ONLY, [PURGE], borders
      accent: '#B0B0B0', // Light gray for SYS: messages (monochrome aesthetic)
      cardBg: 'rgba(255, 51, 51, 0.1)',
      inputBg: 'rgba(255, 255, 255, 0.05)',
      border: 'rgba(255, 51, 51, 0.3)',
    },
    fonts: {
      body: 'Courier',
      display: 'Courier-Bold',
    },
  },
  TERMINAL_AMBER: {
    name: 'TERMINAL_AMBER',
    displayName: 'Terminal Amber',
    isPro: true,
    colors: {
      background: '#1a1300', // Dark amber background
      text: '#FFFFFF', // White for CLASSIFIED title
      subtext: '#999999', // Dimmed white
      primary: '#FFB000', // Bright amber for input/USER messages, EYES ONLY, [PURGE], borders, EXEC
      accent: '#B0B0B0', // Light gray for SYS: messages (consistent with TERMINAL_RED)
      cardBg: 'rgba(255, 176, 0, 0.1)',
      inputBg: 'rgba(255, 255, 255, 0.05)',
      border: 'rgba(255, 176, 0, 0.3)',
    },
    fonts: {
      body: 'Courier',
      display: 'Courier-Bold',
    },
  },
  MATRIX_GREEN: {
    name: 'MATRIX_GREEN',
    displayName: 'Matrix Green',
    isPro: true,
    colors: {
      background: '#001400', // Very deep dark green (Matrix vibes)
      text: '#FFFFFF', // White for CLASSIFIED title
      subtext: '#009900', // Dimmed green
      primary: '#00FF41', // Bright neon green for input/USER messages, EYES ONLY, [PURGE], borders, EXEC
      accent: '#B0B0B0', // Light gray for SYS: (consistent with other terminal themes)
      cardBg: 'rgba(0, 255, 65, 0.08)',
      inputBg: 'rgba(0, 255, 0, 0.03)',
      border: 'rgba(0, 255, 65, 0.3)',
    },
    fonts: {
      body: 'Courier',
      display: 'Courier-Bold',
    },
  },
  CYBERPUNK: {
    name: 'CYBERPUNK',
    displayName: 'Cyberpunk',
    isPro: true,
    colors: {
      background: '#0a0014', // Deep purple-black cyberpunk background
      text: '#FFFFFF', // White for CLASSIFIED title
      subtext: '#b300b3', // Dimmed magenta
      primary: '#00FFFF', // Bright cyan for input/USER messages, EYES ONLY, [PURGE], borders, EXEC
      accent: '#FF00FF', // Bright magenta for SYS: messages (cyberpunk duality)
      cardBg: 'rgba(0, 255, 255, 0.1)',
      inputBg: 'rgba(0, 255, 255, 0.05)',
      border: 'rgba(0, 255, 255, 0.35)',
    },
    fonts: {
      body: 'Courier',
      display: 'Courier-Bold',
    },
  },
  STEALTH: {
    name: 'STEALTH',
    displayName: 'Stealth',
    isPro: true,
    colors: {
      background: '#050505', // Near-black stealth background
      text: '#FFFFFF', // White for CLASSIFIED title
      subtext: '#666666', // Darker gray
      primary: '#777777', // Medium-light gray for input/USER messages, EYES ONLY, [PURGE], borders, EXEC (bumped for visibility)
      accent: '#CCCCCC', // Off-white for SYS: (clearly visible)
      cardBg: 'rgba(51, 51, 51, 0.2)',
      inputBg: 'rgba(255, 255, 255, 0.02)',
      border: 'rgba(51, 51, 51, 0.3)',
    },
    fonts: {
      body: 'Courier',
      display: 'Courier-Bold',
    },
  },
};

// ============================================
// DISCRETION THEMES (4 total: all available)
// Discretion is a paid-only app with no free tier
// All themes available to anyone with Discretion access
// ============================================

export type DiscretionTheme = 'GOLD' | 'PLATINUM' | 'MIDNIGHT_BLUE' | 'EMERALD_GREEN';

export const DISCRETION_THEMES: Record<DiscretionTheme, AppTheme> = {
  GOLD: {
    name: 'GOLD',
    displayName: 'Gold',
    isPro: false,
    colors: {
      background: '#0A0A0A',
      text: '#D4AF37',
      subtext: '#8a7a28',
      primary: '#D4AF37',
      accent: '#B8860B',
      cardBg: 'rgba(212, 175, 55, 0.08)',
      inputBg: 'rgba(212, 175, 55, 0.05)',
      border: 'rgba(212, 175, 55, 0.3)',
    },
    fonts: {
      body: 'System',
      display: 'System',
    },
  },
  PLATINUM: {
    name: 'PLATINUM',
    displayName: 'Platinum',
    isPro: false,
    colors: {
      background: '#0a0a0a',
      text: '#e5e4e2',
      subtext: '#a0a09e',
      primary: '#c0c0c0',
      accent: '#d8d8d8',
      cardBg: 'rgba(192, 192, 192, 0.08)',
      inputBg: 'rgba(192, 192, 192, 0.05)',
      border: 'rgba(192, 192, 192, 0.3)',
    },
    fonts: {
      body: 'System',
      display: 'System',
    },
  },
  MIDNIGHT_BLUE: {
    name: 'MIDNIGHT_BLUE',
    displayName: 'Midnight Blue',
    isPro: false,
    colors: {
      background: '#000814',
      text: '#caf0f8',
      subtext: '#7a9aa8',
      primary: '#0077b6',
      accent: '#00b4d8',
      cardBg: 'rgba(0, 119, 182, 0.1)',
      inputBg: 'rgba(0, 119, 182, 0.05)',
      border: 'rgba(0, 119, 182, 0.3)',
    },
    fonts: {
      body: 'System',
      display: 'System',
    },
  },
  EMERALD_GREEN: {
    name: 'EMERALD_GREEN',
    displayName: 'Emerald Green',
    isPro: false,
    colors: {
      background: '#001a0f',
      text: '#d4f1e8',
      subtext: '#7a9a8e',
      primary: '#2d6a4f',
      accent: '#40916c',
      cardBg: 'rgba(45, 106, 79, 0.1)',
      inputBg: 'rgba(45, 106, 79, 0.05)',
      border: 'rgba(45, 106, 79, 0.3)',
    },
    fonts: {
      body: 'System',
      display: 'System',
    },
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export const getHushTheme = (themeName: HushTheme): AppTheme => {
  return HUSH_THEMES[themeName];
};

export const getClassifiedTheme = (themeName: ClassifiedTheme): AppTheme => {
  return CLASSIFIED_THEMES[themeName];
};

export const getDiscretionTheme = (themeName: DiscretionTheme): AppTheme => {
  return DISCRETION_THEMES[themeName];
};

// Get all theme names for a flavor
export const getHushThemeNames = (): HushTheme[] => {
  return Object.keys(HUSH_THEMES) as HushTheme[];
};

export const getClassifiedThemeNames = (): ClassifiedTheme[] => {
  return Object.keys(CLASSIFIED_THEMES) as ClassifiedTheme[];
};

export const getDiscretionThemeNames = (): DiscretionTheme[] => {
  return Object.keys(DISCRETION_THEMES) as DiscretionTheme[];
};
