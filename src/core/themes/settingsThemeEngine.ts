/**
 * Settings Theme Engine
 *
 * Provides theme configuration for SettingsModal and its sub-components.
 * Supports all three app flavors (HUSH, CLASSIFIED, DISCRETION) plus BLOCKER mode.
 */

import type { AppFlavor } from '../../config';
import type { HushTheme, ClassifiedTheme, DiscretionTheme } from './themes';
import { HUSH_THEMES, CLASSIFIED_THEMES } from './themes';

/**
 * Theme interface for Settings UI
 */
export interface SettingsTheme {
  bg: string;
  text: string;
  subtext: string;
  accent: string;
  card: string;
  fontHeader: string;
  fontBody: string;
  label: string;
  blurTint: 'dark' | 'light';
  danger: string;
  isTerminal: boolean;
  divider: string;
}

/**
 * Get Settings theme configuration based on app flavor and theme selection
 *
 * @param mode - App flavor (HUSH, CLASSIFIED, DISCRETION) or BLOCKER
 * @param discretionTheme - Discretion sub-theme selection
 * @param hushTheme - Hush sub-theme selection
 * @param classifiedTheme - Classified sub-theme selection
 * @returns SettingsTheme configuration object
 */
export const getSettingsTheme = (
  mode: AppFlavor | 'BLOCKER',
  discretionTheme: DiscretionTheme,
  hushTheme: HushTheme,
  classifiedTheme: ClassifiedTheme
): SettingsTheme => {
  if (mode === 'HUSH') {
    const hushThemeData = HUSH_THEMES[hushTheme];
    return {
      bg: 'transparent',
      text: '#FFFFFF',
      subtext: 'rgba(255, 255, 255, 0.6)',
      accent: hushThemeData.colors.primary,
      card: 'rgba(255, 255, 255, 0.12)',
      fontHeader: 'System',
      fontBody: 'System',
      label: 'Settings',
      blurTint: 'dark' as const,
      danger: '#FF6B6B',
      isTerminal: false,
      divider: 'rgba(255, 255, 255, 0.1)',
    };
  }

  if (mode === 'CLASSIFIED' || mode === 'BLOCKER') {
    const classifiedThemeData = CLASSIFIED_THEMES[classifiedTheme];

    // Theme-specific card backgrounds
    let cardBg = '#1A0808'; // Default deep red for Terminal Red
    let dividerColor = '#331111'; // Default red divider

    if (classifiedTheme === 'MATRIX_GREEN') {
      cardBg = '#001a00'; // Dark green
      dividerColor = '#002200'; // Dark green divider
    } else if (classifiedTheme === 'CYBERPUNK') {
      cardBg = '#1a1a1a'; // Dark gray
      dividerColor = '#2a2a2a'; // Lighter gray divider
    } else if (classifiedTheme === 'STEALTH') {
      cardBg = '#1a1a1a'; // Dark gray
      dividerColor = '#2a2a2a'; // Lighter gray divider
    } else if (classifiedTheme === 'TERMINAL_AMBER') {
      cardBg = '#1a1300'; // Dark amber/brown
      dividerColor = '#332600'; // Amber divider
    }

    return {
      bg: '#000000',
      text: classifiedThemeData.colors.primary,
      subtext: classifiedThemeData.colors.subtext,
      accent: classifiedThemeData.colors.primary,
      card: cardBg,
      fontHeader: 'Courier',
      fontBody: 'Courier',
      label: mode === 'BLOCKER' ? '// ACCESS_DENIED //' : '// SYSTEM_CONFIG',
      blurTint: 'dark' as const,
      danger: classifiedThemeData.colors.primary,
      isTerminal: true,
      divider: dividerColor,
    };
  }

  // DISCRETION
  const baseDiscretion = {
    bg: '#0C0C0C',
    card: '#161618',
    fontHeader: 'System',
    fontBody: 'System',
    label: 'SETTINGS.',
    blurTint: 'dark' as const,
    danger: '#CF6679',
    isTerminal: false,
    divider: '#2C2C2E',
  };

  switch (discretionTheme) {
    case 'PLATINUM':
      return { ...baseDiscretion, text: '#E5E4E2', subtext: '#8E8E93', accent: '#E5E4E2' };
    case 'EMERALD_GREEN':
      return { ...baseDiscretion, text: '#50c878', subtext: '#3A5F45', accent: '#50c878' };
    case 'MIDNIGHT_BLUE':
      return { ...baseDiscretion, text: '#4169E1', subtext: '#2A3A6B', accent: '#4169E1' };
    case 'GOLD':
    default:
      return { ...baseDiscretion, text: '#D4AF37', subtext: '#7A6A3E', accent: '#D4AF37' };
  }
};
