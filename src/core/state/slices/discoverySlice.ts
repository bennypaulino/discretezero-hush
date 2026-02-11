/**
 * Discovery Slice
 *
 * Manages Classified flavor discovery state:
 * - Discovery status (has user found Classified?)
 * - First-time blocker tracking
 * - Hint usage tracking for badge tier calculation
 *
 * Dependencies: READ from Subscription (for paywall logic)
 */

import { StateCreator } from 'zustand';

export interface DiscoverySlice {
  // --- STATE ---
  classifiedDiscovered: boolean;
  firstClassifiedBlockerSeen: boolean; // Tracks if user has seen the first-time discovery blocker
  classifiedDiscoveryUsedHints: boolean | null; // True if hints were enabled at discovery time, null if not discovered yet

  // --- ACTIONS ---
  setClassifiedDiscovered: (discovered: boolean) => void;
}

export const createDiscoverySlice: StateCreator<
  DiscoverySlice,
  [],
  [],
  DiscoverySlice
> = (set) => ({
  // --- INITIAL STATE ---
  classifiedDiscovered: false,
  firstClassifiedBlockerSeen: false, // First-time discovery blocker not shown yet
  classifiedDiscoveryUsedHints: null, // Null until Classified is discovered

  // --- ACTIONS ---
  setClassifiedDiscovered: (discovered) => {
    set({ classifiedDiscovered: discovered });
  },
});
