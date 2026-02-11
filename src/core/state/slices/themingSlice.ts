/**
 * Theming Slice
 *
 * Manages visual themes and response styles for all three flavors:
 * - Hush: Mindfulness/wellness themes (DEFAULT, LAVENDER, OCEAN, etc.)
 * - Classified: Security/terminal themes (TERMINAL_RED, MATRIX_GREEN, etc.)
 * - Discretion: Executive/luxury themes (GOLD, SAPPHIRE, etc.)
 *
 * Dependencies: Reads `flavor` from Chat slice for getCurrentResponseStyle()
 */

import { StateCreator } from 'zustand';

declare const __DEV__: boolean;

import type {
  HushTheme,
  ClassifiedTheme,
  DiscretionTheme,
  HushBurnType,
  ClassifiedBurnType,
  ResponseStyleHush,
  ResponseStyleClassified,
  ResponseStyleDiscretion,
  AppFlavor,
} from '../types';

// Forward declaration for cross-slice access
interface ChatSliceMinimal {
  flavor: AppFlavor;
}

export interface ThemingSlice {
  // --- STATE ---
  hushTheme: HushTheme;
  classifiedTheme: ClassifiedTheme;
  discretionTheme: DiscretionTheme;
  hushBurnStyle: HushBurnType;
  classifiedBurnStyle: ClassifiedBurnType;
  responseStyleHush: ResponseStyleHush;
  responseStyleClassified: ResponseStyleClassified;
  responseStyleDiscretion: ResponseStyleDiscretion;

  // --- ACTIONS ---
  setHushTheme: (theme: HushTheme) => void;
  setClassifiedTheme: (theme: ClassifiedTheme) => void;
  setDiscretionTheme: (theme: DiscretionTheme) => void;
  setHushBurnStyle: (style: HushBurnType) => void;
  setClassifiedBurnStyle: (style: ClassifiedBurnType) => void;
  setResponseStyleHush: (style: ResponseStyleHush) => void;
  setResponseStyleClassified: (style: ResponseStyleClassified) => void;
  setResponseStyleDiscretion: (style: ResponseStyleDiscretion) => void;
  getCurrentResponseStyle: () => ResponseStyleHush | ResponseStyleClassified | ResponseStyleDiscretion;
}

export const createThemingSlice: StateCreator<
  ThemingSlice & ChatSliceMinimal,
  [],
  [],
  ThemingSlice
> = (set, get) => ({
  // --- INITIAL STATE ---
  hushTheme: 'DEFAULT',
  classifiedTheme: 'TERMINAL_RED',
  discretionTheme: 'GOLD',
  hushBurnStyle: 'clear',
  classifiedBurnStyle: 'cls',
  responseStyleHush: 'quick',
  responseStyleClassified: 'operator',
  responseStyleDiscretion: 'formal',

  // --- ACTIONS ---
  setHushTheme: (theme) => {
    if (__DEV__) {
      console.log('[themingSlice] Setting hushTheme:', get().hushTheme, '→', theme);
    }
    set({ hushTheme: theme });
  },
  setClassifiedTheme: (theme) => {
    if (__DEV__) {
      console.log('[themingSlice] Setting classifiedTheme:', get().classifiedTheme, '→', theme);
    }
    set({ classifiedTheme: theme });
  },
  setDiscretionTheme: (theme) => set({ discretionTheme: theme }),
  setHushBurnStyle: (style) => set({ hushBurnStyle: style }),
  setClassifiedBurnStyle: (style) => set({ classifiedBurnStyle: style }),
  setResponseStyleHush: (style) => set({ responseStyleHush: style }),
  setResponseStyleClassified: (style) => set({ responseStyleClassified: style }),
  setResponseStyleDiscretion: (style) => set({ responseStyleDiscretion: style }),

  // Centralized selector for current response style
  getCurrentResponseStyle: () => {
    const state = get();
    return state.flavor === 'HUSH'
      ? state.responseStyleHush
      : state.flavor === 'CLASSIFIED'
      ? state.responseStyleClassified
      : state.responseStyleDiscretion;
  },
});
