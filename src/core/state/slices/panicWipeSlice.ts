/**
 * Panic Wipe Slice
 *
 * Manages the panic wipe feature toggle. The actual wipe logic
 * lives in the Chat slice (clearHistory method).
 *
 * Dependencies: NONE (fully isolated toggle)
 */

import { StateCreator } from 'zustand';

declare const __DEV__: boolean;

export interface PanicWipeSlice {
  // --- STATE ---
  panicWipeEnabled: boolean;

  // --- ACTIONS ---
  setPanicWipeEnabled: (enabled: boolean) => void;
}

export const createPanicWipeSlice: StateCreator<
  PanicWipeSlice,
  [],
  [],
  PanicWipeSlice
> = (set) => ({
  // --- INITIAL STATE ---
  panicWipeEnabled: false,

  // --- ACTIONS ---
  setPanicWipeEnabled: (enabled) => {
    if (__DEV__) {
      console.log('[panicWipeSlice] Setting panicWipeEnabled:', enabled);
    }
    set({ panicWipeEnabled: enabled });
  },
});
