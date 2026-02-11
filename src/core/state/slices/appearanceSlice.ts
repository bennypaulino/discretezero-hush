/**
 * Appearance Slice
 *
 * Manages UI appearance preferences including:
 * - Quick transition mode (reduces animation duration)
 * - Animation sounds (haptic/audio feedback)
 * - Animation sounds Pro (premium-only toggle)
 * - High contrast mode (WCAG AA accessibility)
 *
 * Dependencies: NONE (fully isolated)
 */

import { StateCreator } from 'zustand';

export interface AppearanceSlice {
  // --- STATE ---
  quickTransition: boolean;
  animationSounds: boolean;
  animationSoundsPro: boolean; // Pro-only toggle for clear animation sounds
  highContrastMode: boolean; // WCAG AA compliance: Increase opacity for better contrast

  // --- ACTIONS ---
  setQuickTransition: (enabled: boolean) => void;
  setAnimationSounds: (enabled: boolean) => void;
  setAnimationSoundsPro: (enabled: boolean) => void;
  setHighContrastMode: (enabled: boolean) => void;
}

export const createAppearanceSlice: StateCreator<
  AppearanceSlice,
  [],
  [],
  AppearanceSlice
> = (set) => ({
  // --- INITIAL STATE ---
  // Per spec: both OFF by default, except animationSounds for Pro
  quickTransition: false,
  animationSounds: true, // Defaults ON (Pro users have sounds enabled by default)
  animationSoundsPro: true, // Pro-only toggle, defaults ON for Pro users
  highContrastMode: false, // Accessibility: OFF by default, users can opt-in

  // --- ACTIONS ---
  setQuickTransition: (enabled) => set({ quickTransition: enabled }),
  setAnimationSounds: (enabled) => set({ animationSounds: enabled }),
  setAnimationSoundsPro: (enabled) => set({ animationSoundsPro: enabled }),
  setHighContrastMode: (enabled) => set({ highContrastMode: enabled }),
});
