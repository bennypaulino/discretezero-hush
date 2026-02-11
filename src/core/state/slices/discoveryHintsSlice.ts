/**
 * Discovery Hints Slice
 *
 * Manages progressive discovery hints for Classified and other hidden features:
 * - Hint progression system (0-5 levels)
 * - Once-per-app-open logic
 * - Pro user opt-out capability
 *
 * Dependencies: NONE (self-contained)
 */

import { StateCreator } from 'zustand';
import { getLocalDateString } from '../utils/dateUtils';

export interface DiscoveryHintsSlice {
  // --- STATE ---
  discoveryHintsEnabled: boolean; // Pro users can opt out of hints
  hintProgressionLevel: number; // 0-5, increments with each hint shown
  lastHintShownDate: string | null; // Track last hint shown (once per app-open logic)

  // --- ACTIONS ---
  advanceHintProgression: () => void;
  setDiscoveryHintsEnabled: (enabled: boolean) => void;
  shouldShowHintToday: () => boolean;
  markHintShownToday: () => void;
  clearLastHintDate: () => void;
}

export const createDiscoveryHintsSlice: StateCreator<
  DiscoveryHintsSlice,
  [],
  [],
  DiscoveryHintsSlice
> = (set, get) => ({
  // --- INITIAL STATE ---
  discoveryHintsEnabled: true, // Default on, Pro users can disable
  hintProgressionLevel: 0, // 0 = no hints shown yet
  lastHintShownDate: null,

  // --- ACTIONS ---
  advanceHintProgression: () => {
    set((state) => ({
      hintProgressionLevel: Math.min(state.hintProgressionLevel + 1, 5),
    }));
  },

  setDiscoveryHintsEnabled: (enabled) => set({ discoveryHintsEnabled: enabled }),

  shouldShowHintToday: () => {
    const { lastHintShownDate } = get();
    const today = getLocalDateString(new Date()); // Use LOCAL time (not UTC)
    return lastHintShownDate !== today;
  },

  markHintShownToday: () => {
    set({ lastHintShownDate: getLocalDateString(new Date()) }); // Use LOCAL time (not UTC)
  },

  clearLastHintDate: () => {
    set({ lastHintShownDate: null });
  },
});
