// src/core/hooks/useAppTheme.ts
// Custom hook to get the current app theme based on flavor and user selection

import { useChatStore } from '../state/rootStore';
import { getHushTheme, getClassifiedTheme, getDiscretionTheme, type AppTheme } from '../themes/themes';
import { CURRENT_FLAVOR } from '../../config';

/**
 * Applies high contrast adjustments to a theme for WCAG AA compliance
 * Increases opacity values for better visibility when highContrastMode is enabled
 */
const applyHighContrastAdjustments = (theme: AppTheme): AppTheme => {
  return {
    ...theme,
    colors: {
      ...theme.colors,
      // Increase input background opacity from 0.03-0.05 to 0.08
      inputBg: theme.colors.inputBg.replace(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/, (match, r, g, b, a) => {
        const newAlpha = Math.min(parseFloat(a) + 0.05, 0.08);
        return `rgba(${r}, ${g}, ${b}, ${newAlpha})`;
      }),
      // Increase card background opacity
      cardBg: theme.colors.cardBg.replace(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/, (match, r, g, b, a) => {
        const newAlpha = Math.min(parseFloat(a) + 0.05, 0.15);
        return `rgba(${r}, ${g}, ${b}, ${newAlpha})`;
      }),
      // Increase border opacity from 0.3 to 0.4
      border: theme.colors.border.replace(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/, (match, r, g, b, a) => {
        const newAlpha = Math.min(parseFloat(a) + 0.1, 0.4);
        return `rgba(${r}, ${g}, ${b}, ${newAlpha})`;
      }),
    },
  };
};

/**
 * Returns the currently active theme based on:
 * - Current app flavor (HUSH, CLASSIFIED, DISCRETION)
 * - User's selected theme for that flavor
 * - High contrast mode (for WCAG AA compliance)
 */
export const useAppTheme = (): AppTheme => {
  const { flavor, hushTheme, classifiedTheme, discretionTheme, highContrastMode } = useChatStore();

  // Use current flavor or build-time flavor as fallback
  const activeFlavor = flavor || CURRENT_FLAVOR;

  let theme: AppTheme;
  switch (activeFlavor) {
    case 'HUSH':
      theme = getHushTheme(hushTheme);
      break;
    case 'CLASSIFIED':
      theme = getClassifiedTheme(classifiedTheme);
      break;
    case 'DISCRETION':
      theme = getDiscretionTheme(discretionTheme);
      break;
    default:
      theme = getHushTheme('DEFAULT');
  }

  // Apply high contrast adjustments if enabled
  if (highContrastMode) {
    return applyHighContrastAdjustments(theme);
  }

  return theme;
};
