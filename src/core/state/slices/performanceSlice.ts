/**
 * Performance Modes Slice
 *
 * Manages AI model performance modes and downloads:
 * - Efficient: Fast, smaller model (Gemma 2B, 1.6GB)
 * - Balanced: Mid-tier model (future)
 * - Quality: Best quality model (future)
 *
 * Handles download state, progress tracking, error handling, and mode switching.
 *
 * Dependencies: NONE (self-contained)
 */

import { StateCreator } from 'zustand';
import type { PerformanceMode, ModeDownloadState, DeviceCapabilities } from '../types';

declare const __DEV__: boolean;

export interface PerformanceSlice {
  // --- STATE ---
  activeMode: PerformanceMode;
  deviceCapabilities: DeviceCapabilities | null; // Detected at app startup
  modeDownloadState: ModeDownloadState;
  modeDownloadProgress: number;
  currentlyDownloading: PerformanceMode | null;
  downloadError: {
    mode: PerformanceMode;
    error: 'network_timeout' | 'storage_full' | 'corrupted' | 'interrupted' | 'unknown';
  } | null;
  multiModelEnabled: boolean;
  balancedUpgradeOffered: boolean;
  balancedUpgradeDeclined: boolean;

  // --- ACTIONS ---
  setActiveMode: (mode: PerformanceMode) => void;
  setDeviceCapabilities: (capabilities: DeviceCapabilities) => void;
  startModeDownload: (mode: PerformanceMode) => void;
  cancelModeDownload: () => void;
  setModeDownloadProgress: (progress: number) => void;
  completeModeDownload: (mode: PerformanceMode) => void;
  failModeDownload: (
    mode: PerformanceMode,
    error: 'network_timeout' | 'storage_full' | 'corrupted' | 'interrupted' | 'unknown'
  ) => void;
  clearDownloadError: () => void;
  deleteMode: (mode: PerformanceMode) => void;
  setMultiModelEnabled: (enabled: boolean) => void;
  setBalancedUpgradeOffered: (offered: boolean) => void;
  setBalancedUpgradeDeclined: (declined: boolean) => void;
}

export const createPerformanceSlice: StateCreator<
  PerformanceSlice,
  [],
  [],
  PerformanceSlice
> = (set, get) => ({
  // --- INITIAL STATE ---
  activeMode: 'efficient',
  deviceCapabilities: null, // Detected at app startup
  modeDownloadState: {
    efficient: 'not_downloaded', // Downloaded on-demand (1.6GB)
    balanced: 'not_downloaded',
    quality: 'not_downloaded',
  },
  modeDownloadProgress: 0,
  currentlyDownloading: null,
  downloadError: null,
  multiModelEnabled: false,
  balancedUpgradeOffered: false,
  balancedUpgradeDeclined: false,

  // --- ACTIONS ---
  setDeviceCapabilities: (capabilities) => set({ deviceCapabilities: capabilities }),

  setActiveMode: (mode) => {
    const state = get();
    // Only allow setting mode if it's downloaded
    if (state.modeDownloadState[mode] === 'downloaded') {
      set({ activeMode: mode });
      if (__DEV__) console.log('[setActiveMode] Set active mode to:', mode);
    } else {
      if (__DEV__) console.warn('[setActiveMode] Cannot set mode - not downloaded:', mode);
      // Fallback to efficient if trying to set undownloaded mode
      set({ activeMode: 'efficient' });
    }
  },

  startModeDownload: (mode) =>
    set({
      currentlyDownloading: mode,
      modeDownloadState: {
        ...get().modeDownloadState,
        [mode]: 'downloading',
      },
      modeDownloadProgress: 0,
      downloadError: null,
    }),

  cancelModeDownload: () =>
    set({
      currentlyDownloading: null,
      modeDownloadProgress: 0,
    }),

  setModeDownloadProgress: (progress) => set({ modeDownloadProgress: progress }),

  completeModeDownload: (mode) =>
    set((state) => ({
      modeDownloadState: {
        ...state.modeDownloadState,
        [mode]: 'downloaded',
      },
      currentlyDownloading: null,
      modeDownloadProgress: 0,
      downloadError: null,
      activeMode: mode, // Auto-switch to downloaded mode
    })),

  failModeDownload: (mode, error) =>
    set({
      currentlyDownloading: null,
      modeDownloadProgress: 0,
      downloadError: { mode, error },
    }),

  clearDownloadError: () => set({ downloadError: null }),

  deleteMode: (mode) =>
    set((state) => ({
      modeDownloadState: {
        ...state.modeDownloadState,
        [mode]: 'not_downloaded',
      },
    })),

  setMultiModelEnabled: (enabled) => set({ multiModelEnabled: enabled }),
  setBalancedUpgradeOffered: (offered) => set({ balancedUpgradeOffered: offered }),
  setBalancedUpgradeDeclined: (declined) => set({ balancedUpgradeDeclined: declined }),
});
