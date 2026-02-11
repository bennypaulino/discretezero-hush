/**
 * Theme Helper Utilities
 *
 * Shared theme helper functions used across Settings components.
 */

import type { ClassifiedTheme } from '../state/types';

/**
 * Get theme-specific selected background color for Classified/Blocker mode
 *
 * Returns appropriate rgba color based on the active Classified theme.
 * Used for selected/active state backgrounds in Settings UI components.
 *
 * @param effectiveMode - Current app mode (CLASSIFIED, BLOCKER, etc.)
 * @param classifiedTheme - Active Classified theme variant
 * @returns rgba color string for selected background
 */
export const getClassifiedSelectedBg = (
  effectiveMode: string,
  classifiedTheme: ClassifiedTheme
): string => {
  if (effectiveMode !== 'CLASSIFIED' && effectiveMode !== 'BLOCKER') {
    return 'rgba(255,51,51,0.15)';
  }

  const colorMap: Record<ClassifiedTheme, string> = {
    MATRIX_GREEN: 'rgba(0, 255, 65, 0.15)',
    STEALTH: 'rgba(119, 119, 119, 0.15)',
    CYBERPUNK: 'rgba(0, 255, 255, 0.15)',
    TERMINAL_AMBER: 'rgba(255, 176, 0, 0.15)',
    TERMINAL_RED: 'rgba(255, 51, 51, 0.15)',
  };

  return colorMap[classifiedTheme] || 'rgba(255, 51, 51, 0.15)';
};
