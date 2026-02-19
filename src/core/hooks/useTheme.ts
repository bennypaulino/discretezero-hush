/**
 * Theme Hooks - Centralized theme data access with memoization
 *
 * These hooks provide type-safe, memoized access to theme data across all app flavors.
 * They replace the pattern of manually selecting from the store and looking up theme data.
 *
 * Benefits:
 * - DRY: Theme logic in one place
 * - Performance: Automatic memoization
 * - Type Safety: Full TypeScript support
 * - Consistency: Same pattern across all components
 *
 * Usage:
 *   const theme = useHushTheme();
 *   const theme = useClassifiedTheme();
 *   const theme = useDiscretionTheme();
 */

import React from 'react';
import { useChatStore } from '../state/rootStore';
import { HUSH_THEMES, CLASSIFIED_THEMES, DISCRETION_THEMES } from '../themes/themes';
import type { HushTheme, ClassifiedTheme, DiscretionTheme } from '../themes/themes';

/**
 * Hook to get Hush theme data with memoization
 *
 * @returns Hush theme data object with colors, fonts, and other properties
 *
 * @example
 * ```tsx
 * const HushComponent = () => {
 *   const theme = useHushTheme();
 *   return <View style={{ backgroundColor: theme.colors.background }} />;
 * };
 * ```
 */
export const useHushTheme = () => {
  const hushTheme = useChatStore((state) => state.hushTheme);

  return React.useMemo(
    () => HUSH_THEMES[hushTheme] || HUSH_THEMES.DEFAULT,
    [hushTheme]
  );
};

/**
 * Hook to get Classified theme data with memoization
 *
 * @returns Classified theme data object with colors, fonts, and other properties
 *
 * @example
 * ```tsx
 * const ClassifiedComponent = () => {
 *   const theme = useClassifiedTheme();
 *   return <Text style={{ color: theme.colors.primary }}>CLASSIFIED</Text>;
 * };
 * ```
 */
export const useClassifiedTheme = () => {
  const classifiedTheme = useChatStore((state) => state.classifiedTheme);

  return React.useMemo(
    () => CLASSIFIED_THEMES[classifiedTheme as keyof typeof CLASSIFIED_THEMES] || CLASSIFIED_THEMES.TERMINAL_RED,
    [classifiedTheme]
  );
};

/**
 * Hook to get Discretion theme data with memoization
 *
 * @returns Discretion theme data object with colors, fonts, and other properties
 *
 * @example
 * ```tsx
 * const DiscretionComponent = () => {
 *   const theme = useDiscretionTheme();
 *   return <View style={{ borderColor: theme.colors.primary }} />;
 * };
 * ```
 */
export const useDiscretionTheme = () => {
  const discretionTheme = useChatStore((state) => state.discretionTheme);

  return React.useMemo(
    () => DISCRETION_THEMES[discretionTheme as keyof typeof DISCRETION_THEMES] || DISCRETION_THEMES.PLATINUM,
    [discretionTheme]
  );
};

/**
 * Helper type exports for TypeScript users
 */
export type { HushTheme, ClassifiedTheme, DiscretionTheme };
