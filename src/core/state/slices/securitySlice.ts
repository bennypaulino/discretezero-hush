/**
 * Security Slice
 *
 * Manages app security features:
 * - Passcode authentication (real + duress codes)
 * - Lock/unlock state
 * - Decoy mode (alternate UI under duress)
 * - Rate limiting for passcode attempts
 * - SecureStore integration
 *
 * Dependencies: READ from Chat (flavor for lock tracking)
 */

import { StateCreator } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { AppFlavor, DecoyPreset, Message } from '../types';

declare const __DEV__: boolean;

// SecureStore keys
const PASSCODE_KEY = 'hush_passcode';
const DURESS_KEY = 'hush_duress';

// Forward declaration for cross-slice access
interface ChatSliceMinimal {
  flavor: AppFlavor;
}

export interface SecuritySlice {
  // --- STATE ---
  isLocked: boolean;
  isPasscodeSet: boolean;
  isDuressCodeSet: boolean;
  useAppPasscode: boolean; // Use separate app passcode vs device
  lastActiveMode: AppFlavor; // Track mode when lock triggered (for decoy routing)
  isDecoyMode: boolean; // Currently showing decoy content
  decoyBurned: boolean; // Track if decoy messages were intentionally burned

  // Decoy configuration
  hushDecoyPreset: DecoyPreset;
  classifiedDecoyPreset: DecoyPreset;
  customDecoyHushMessages: Message[];
  customDecoyClassifiedMessages: Message[];

  // Rate limiting for passcode attempts
  failedPasscodeAttempts: number;
  passcodeLockoutUntil: number | null;

  // --- ACTIONS ---
  setLocked: (locked: boolean) => void;
  setPasscode: (code: string) => Promise<void>;
  setDuressCode: (code: string | null) => Promise<void>;
  clearPasscode: () => Promise<void>;
  setUseAppPasscode: (use: boolean) => void;
  setLastActiveMode: (mode: AppFlavor) => void;
  setDecoyMode: (isDecoy: boolean) => void;
  setHushDecoyPreset: (preset: DecoyPreset) => void;
  setClassifiedDecoyPreset: (preset: DecoyPreset) => void;
  validatePasscode: (code: string) => Promise<'real' | 'duress' | 'invalid' | 'locked_out'>;
  loadSecureData: () => Promise<void>;
}

export const createSecuritySlice: StateCreator<
  SecuritySlice & ChatSliceMinimal,
  [],
  [],
  SecuritySlice
> = (set, get) => ({
  // --- INITIAL STATE ---
  isLocked: false,
  isPasscodeSet: false,
  isDuressCodeSet: false,
  useAppPasscode: false,
  lastActiveMode: 'HUSH',
  isDecoyMode: false,
  decoyBurned: false,

  // Decoy defaults
  hushDecoyPreset: 'GENERAL_ASSISTANT',
  classifiedDecoyPreset: 'STUDY_HELPER',
  customDecoyHushMessages: [],
  customDecoyClassifiedMessages: [],

  // Rate limiting defaults
  failedPasscodeAttempts: 0,
  passcodeLockoutUntil: null,

  // --- ACTIONS ---
  setLocked: (locked) => {
    const { flavor } = get();
    if (locked) {
      // Track which mode we were in when lock triggered
      set({ isLocked: true, lastActiveMode: flavor });
    } else {
      set({ isLocked: false });
    }
  },

  setPasscode: async (code: string) => {
    try {
      await SecureStore.setItemAsync(PASSCODE_KEY, code);
      set({ isPasscodeSet: true });
    } catch (e) {
      if (__DEV__) {
        console.error('Failed to save passcode:', e);
      }
    }
  },

  setDuressCode: async (code: string | null) => {
    try {
      if (code) {
        await SecureStore.setItemAsync(DURESS_KEY, code);
        set({ isDuressCodeSet: true });
      } else {
        await SecureStore.deleteItemAsync(DURESS_KEY);
        set({ isDuressCodeSet: false });
      }
    } catch (e) {
      if (__DEV__) {
        console.error('Failed to save duress code:', e);
      }
    }
  },

  clearPasscode: async () => {
    try {
      await SecureStore.deleteItemAsync(PASSCODE_KEY);
      await SecureStore.deleteItemAsync(DURESS_KEY);
      set({ isPasscodeSet: false, isDuressCodeSet: false });
    } catch (e) {
      if (__DEV__) {
        console.error('Failed to clear passcode:', e);
      }
    }
  },

  setUseAppPasscode: (use) => set({ useAppPasscode: use }),
  setLastActiveMode: (mode) => set({ lastActiveMode: mode }),
  setDecoyMode: (isDecoy) =>
    set({
      isDecoyMode: isDecoy,
      // Reset decoyBurned when exiting decoy mode (entering real passcode)
      // This ensures next duress entry shows preset messages, not empty screen
      decoyBurned: isDecoy ? get().decoyBurned : false,
    }),
  setHushDecoyPreset: (preset) => set({ hushDecoyPreset: preset }),
  setClassifiedDecoyPreset: (preset) => set({ classifiedDecoyPreset: preset }),

  validatePasscode: async (code: string) => {
    try {
      const state = get();
      const now = Date.now();

      // Check if currently in lockout period
      if (state.passcodeLockoutUntil && now < state.passcodeLockoutUntil) {
        return 'locked_out';
      }

      const realPasscode = await SecureStore.getItemAsync(PASSCODE_KEY);
      const duressCode = await SecureStore.getItemAsync(DURESS_KEY);

      // Check duress code first
      if (duressCode && code === duressCode) {
        // Reset failed attempts on successful unlock
        set({ failedPasscodeAttempts: 0, passcodeLockoutUntil: null });
        return 'duress';
      }

      // Check real passcode
      if (realPasscode && code === realPasscode) {
        // Reset failed attempts on successful unlock
        set({ failedPasscodeAttempts: 0, passcodeLockoutUntil: null });
        return 'real';
      }

      // Invalid passcode - implement rate limiting
      const attempts = state.failedPasscodeAttempts + 1;
      let lockoutUntil = null;

      if (attempts >= 6) {
        // 6 or more attempts: 5 minute lockout
        lockoutUntil = now + 5 * 60 * 1000;
      } else if (attempts >= 3) {
        // 3-5 attempts: 30 second lockout
        lockoutUntil = now + 30 * 1000;
      }

      set({
        failedPasscodeAttempts: attempts,
        passcodeLockoutUntil: lockoutUntil,
      });

      return 'invalid';
    } catch (e) {
      if (__DEV__) {
        console.error('Failed to validate passcode:', e);
      }
      return 'invalid';
    }
  },

  loadSecureData: async () => {
    try {
      const passcode = await SecureStore.getItemAsync(PASSCODE_KEY);
      const duressCode = await SecureStore.getItemAsync(DURESS_KEY);
      set({
        isPasscodeSet: !!passcode,
        isDuressCodeSet: !!duressCode,
      });
    } catch (e) {
      if (__DEV__) {
        console.error('Failed to load secure data:', e);
      }
    }
  },
});
