// src/config.ts
import { TextStyle, ViewStyle } from 'react-native';

// 1. Define the three identities
export type AppFlavor = 'HUSH' | 'CLASSIFIED' | 'DISCRETION';

// 2. THE MASTER SWITCH
// Change this to 'CLASSIFIED' to switch apps
export const CURRENT_FLAVOR: AppFlavor = 'HUSH';

// 3. Define the Visual Themes
interface Theme {
  colors: {
    background: string;
    text: string;
    primary: string;
    accent: string;
  };
  fonts: {
    body: string; // React Native default fonts for now
    display: string;
  };
}

export const Themes: Record<AppFlavor, Theme> = {
  HUSH: {
    colors: {
      background: '#0a0a0a', // Almost Black
      text: '#e5e5e5', // Soft White
      primary: '#8b5cf6', // Violet
      accent: '#2dd4bf', // Teal
    },
    fonts: {
      body: 'System',
      display: 'System', // Clean Sans-Serif
    },
  },
  CLASSIFIED: {
    colors: {
      background: '#1c1917', // Warm Dark Grey (Paper in shadow)
      text: '#d4d4d4', // Faded White
      primary: '#ef4444', // Redaction Red
      accent: '#f59e0b', // Amber Warning
    },
    fonts: {
      body: 'Courier', // Typewriter
      display: 'Courier-Bold',
    },
  },
  DISCRETION: {
    colors: {
      background: '#0A0A0A',
      text: '#D4AF37',
      primary: '#D4AF37',
      accent: '#B8860B',
    },
    fonts: {
      body: 'System',
      display: 'System',
    },
  },
};

export const activeTheme = Themes[CURRENT_FLAVOR];
