/**
 * Root Store - Combined Zustand Store
 *
 * Combines all domain-specific slices into a single store export.
 * Maintains backward compatibility with existing useChatStore imports.
 *
 * Architecture:
 * - Uses Zustand slice pattern for domain separation
 * - Persists to AsyncStorage (excluding ephemeral session state)
 * - Provides single export for all components
 *
 * Migration Status:
 * [✅] Appearance Slice
 * [✅] Theming Slice
 * [✅] Panic Wipe Slice
 * [✅] Performance Modes Slice
 * [✅] Discovery Hints Slice
 * [✅] Discovery Slice
 * [✅] Security Slice
 * [✅] Chat Slice
 * [✅] Subscription Slice
 * [✅] Gamification Slice
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import { EncryptedStorage } from '../storage/EncryptedStorage';

declare const __DEV__: boolean;

import { createAppearanceSlice, AppearanceSlice } from './slices/appearanceSlice';
import { createPanicWipeSlice, PanicWipeSlice } from './slices/panicWipeSlice';
import { createThemingSlice, ThemingSlice } from './slices/themingSlice';
import { createChatSlice, ChatSlice } from './slices/chatSlice';
import { createPerformanceSlice, PerformanceSlice } from './slices/performanceSlice';
import { createDiscoveryHintsSlice, DiscoveryHintsSlice } from './slices/discoveryHintsSlice';
import { createDiscoverySlice, DiscoverySlice } from './slices/discoverySlice';
import { createSecuritySlice, SecuritySlice } from './slices/securitySlice';
import { createSubscriptionSlice, SubscriptionSlice } from './slices/subscriptionSlice';
import { createGamificationSlice, GamificationSlice, GameSession, GameState } from './slices/gamificationSlice';
import type { BadgeTier, AppFlavor } from './types';

// Re-export all types for backward compatibility with old store.ts imports
export type {
  AppFlavor,
  HushTheme,
  ClassifiedTheme,
  DiscretionTheme,
  SubscriptionTier,
  HushBurnType,
  ClassifiedBurnType,
  ResponseStyleHush,
  ResponseStyleClassified,
  ResponseStyleDiscretion,
  DecoyPreset,
  PerformanceMode,
  ModeDownloadState,
  GameId,
  BadgeId,
  BadgeTier,
  Badge,
  GameProgress,
  Message,
  DeviceCapabilities,
} from './types';

export type { GameSession, GameState } from './slices/gamificationSlice';

// Re-export helper function for badge tier display names
export const getBadgeTierDisplayName = (tier: BadgeTier, flavor: AppFlavor): string => {
  if (flavor === 'HUSH') {
    const hushTiers = {
      bronze: 'EMBER',
      silver: 'GLOW',
      gold: 'RADIANCE',
      diamond: 'LUMINOUS'
    };
    return hushTiers[tier];
  } else if (flavor === 'CLASSIFIED') {
    const classifiedTiers = {
      bronze: 'TRAINEE',
      silver: 'OPERATIVE',
      gold: 'SPECIALIST',
      diamond: 'LEGEND'
    };
    return classifiedTiers[tier];
  } else {
    // DISCRETION - executive/corporate theme
    const discretionTiers = {
      bronze: 'MANAGER',
      silver: 'DIRECTOR',
      gold: 'EXECUTIVE',
      diamond: 'CHAIRMAN'
    };
    return discretionTiers[tier];
  }
};

// Compatibility layer for properties not yet migrated to slices
interface LegacyCompatibilitySlice {
  // Onboarding state
  hasSeenPrivacyOnboarding: boolean;
  hasAttemptedModelDownload: boolean;
  showModelDownloadPrompt: boolean;
  proFirstLaunchSeen: boolean;
  hasSeenLockScreenTutorial: boolean;

  // Subscription/Paywall state
  messageCountSinceUpgradeOffer: number;

  // Actions
  setHasAttemptedModelDownload: (attempted: boolean) => void;
  setProFirstLaunchSeen: (seen: boolean) => void;
}

// Combined store type (will expand as we add more slices)
type StoreState = AppearanceSlice
  & PanicWipeSlice
  & ThemingSlice
  & ChatSlice
  & PerformanceSlice
  & DiscoveryHintsSlice
  & DiscoverySlice
  & SecuritySlice
  & SubscriptionSlice
  & GamificationSlice
  & LegacyCompatibilitySlice;

export const useChatStore = create<StoreState>()(
  persist(
    (set, ...a) => ({
      ...createAppearanceSlice(set, ...a),
      ...createPanicWipeSlice(set, ...a),
      ...createChatSlice(set, ...a),
      ...createThemingSlice(set, ...a),
      ...createPerformanceSlice(set, ...a),
      ...createDiscoveryHintsSlice(set, ...a),
      ...createDiscoverySlice(set, ...a),
      ...createSecuritySlice(set, ...a),
      ...createSubscriptionSlice(set, ...a),
      ...createGamificationSlice(set, ...a),

      // Legacy compatibility properties (TODO: migrate to proper slices)
      hasSeenPrivacyOnboarding: false,
      hasAttemptedModelDownload: false,
      showModelDownloadPrompt: false,
      proFirstLaunchSeen: false,
      hasSeenLockScreenTutorial: false,
      messageCountSinceUpgradeOffer: 0,

      // Legacy compatibility actions
      setHasAttemptedModelDownload: (attempted) => set({ hasAttemptedModelDownload: attempted }),
      setProFirstLaunchSeen: (seen) => set({ proFirstLaunchSeen: seen }),
    }),
    {
      name: 'discrete-zero-storage',
      // TEMPORARY: Using plain AsyncStorage to debug crash
      // TODO: Re-enable EncryptedStorage after identifying crash cause
      storage: createJSONStorage(() => AsyncStorage),
      // Don't persist sensitive security state or session-based state
      partialize: (state) => ({
        ...state,
        // Security: Exclude ephemeral session state (reset on app restart)
        isLocked: undefined,
        isDecoyMode: undefined,
        failedPasscodeAttempts: undefined,
        passcodeLockoutUntil: undefined,
        // Subscription: Exclude session-based paywall frequency caps
        dismissedPaywallTriggers: undefined,
        sessionPaywallShowCount: undefined,
        gratitudePaywallShownThisSession: undefined,
        // Performance: Exclude transient download state
        currentlyDownloading: undefined,
        modeDownloadProgress: undefined,
        downloadError: undefined,
        // Chat: Exclude UI state
        isTyping: undefined,
      }),
      // Validate activeMode after rehydration
      onRehydrateStorage: () => {
        if (__DEV__) {
          console.log('[rootStore] Rehydration started');
        }
        return (state, error) => {
          if (error) {
            console.error('[rootStore] Rehydration error:', error);
            return;
          }

          if (!state) {
            console.warn('[rootStore] No state to rehydrate');
            return;
          }

          // DEBUG: Log critical state values
          if (__DEV__) {
            console.log('[rootStore] Rehydration complete');
            console.log('[rootStore] subscriptionTier:', state.subscriptionTier);
            console.log('[rootStore] panicWipeEnabled:', state.panicWipeEnabled);
            console.log('[rootStore] hushTheme:', state.hushTheme);
            console.log('[rootStore] classifiedTheme:', state.classifiedTheme);
          }

          // All migrations and validations below

          // MIGRATION: Rename old "speed" mode to "efficient" (legacy data)
          if (state.activeMode === 'speed' as any) {
            if (__DEV__) {
              console.log('[Store Migration] Renaming activeMode "speed" to "efficient"');
            }
            state.activeMode = 'efficient';
          }

          if (state.modeDownloadState) {
            // MIGRATION: Rename "speed" key to "efficient" in modeDownloadState
            const oldState = state.modeDownloadState as any;
            if (oldState.speed !== undefined) {
              if (__DEV__) {
                console.log('[Store Migration] Renaming modeDownloadState.speed to efficient');
              }
              state.modeDownloadState = {
                efficient: oldState.speed,
                balanced: oldState.balanced || 'not_downloaded',
                quality: oldState.quality || 'not_downloaded',
              };
            }

            // If activeMode is not downloaded, fallback to efficient
            if (state.modeDownloadState[state.activeMode] !== 'downloaded') {
              if (__DEV__) {
                console.warn(
                  '[Store Rehydration] activeMode',
                  state.activeMode,
                  'is not downloaded, resetting to efficient'
                );
              }
              state.activeMode = 'efficient';
            }
          }

          // MIGRATION: Update flawlessVisual 'text' to 'star' (legacy data from old schema)
          if (state.gameState?.gameProgress) {
            const gameProgress = state.gameState.gameProgress as any;
            for (const gameId in gameProgress) {
              if (gameProgress[gameId]?.flawlessVisual === 'text') {
                if (__DEV__) {
                  console.log(`[Store Migration] Updating ${gameId} flawlessVisual from "text" to "star"`);
                }
                gameProgress[gameId].flawlessVisual = 'star';
              }
            }
          }

          // FIX: Revert locked themes for free users on app restart
          // This prevents locked themes from persisting if app closed during preview
          if (state.subscriptionTier === 'FREE') {
            try {
              // Dynamically import theme data to check if themes are locked
              const { HUSH_THEMES, CLASSIFIED_THEMES } = require('../themes/themes');

              // Check Hush theme
              const hushThemeData = HUSH_THEMES[state.hushTheme];
              if (hushThemeData?.isPro) {
                if (__DEV__) {
                  console.log('[Store Rehydration] Reverting locked Hush theme for free user:', state.hushTheme);
                }
                state.hushTheme = 'DEFAULT';
              }

              // Check Classified theme
              const classifiedThemeData = CLASSIFIED_THEMES[state.classifiedTheme];
              if (classifiedThemeData?.isPro) {
                if (__DEV__) {
                  console.log('[Store Rehydration] Reverting locked Classified theme for free user:', state.classifiedTheme);
                }
                state.classifiedTheme = 'TERMINAL_RED';
              }
            } catch (error) {
              if (__DEV__) {
                console.error('[Store Rehydration] Error reverting locked themes:', error);
              }
            }
          }
        }
      },
    }
  )
);
