/**
 * Subscription Slice
 *
 * Manages subscription tiers, paywall logic, and free tier limits:
 * - Subscription tier (FREE, MONTHLY, YEARLY)
 * - Daily message limits for free tier
 * - Paywall frequency capping (smart throttling)
 * - Post-purchase celebration
 * - Session state tracking
 *
 * Dependencies: READ from Chat (flavor), READ from Gamification (activeGameId)
 */

import { StateCreator } from 'zustand';
import type { SubscriptionTier, AppFlavor } from '../types';
import { getLocalDateString } from '../utils/dateUtils';

declare const __DEV__: boolean;

const DAILY_LIMIT = 8;
const SESSION_PAYWALL_CAP = 6; // Maximum paywall shows per session (excluding classified_discovery and banner taps)

// Paywall reason type
type PaywallReason =
  | 'daily_limit'
  | 'unburdening_daily_limit'
  | 'breathe_extended_limit'
  | 'feature_locked_theme'
  | 'feature_locked_clear_style'
  | 'feature_locked_response_style'
  | 'classified_discovery'
  | 'gratitude_streak_cap'
  | null;

// Dismissable triggers (excludes unlimited exceptions)
type DismissablePaywallTrigger =
  | 'daily_limit'
  | 'unburdening_daily_limit'
  | 'breathe_extended_limit'
  | 'feature_locked_theme'
  | 'feature_locked_clear_style'
  | 'feature_locked_response_style';

// Forward declarations for cross-slice access
interface ChatSliceMinimal {
  flavor: AppFlavor;
}

interface GamificationSliceMinimal {
  gameState: {
    currentSession: {
      activeGameId: string | null;
    };
  };
}

interface DiscoverySliceMinimal {
  classifiedDiscovered: boolean;
}

export interface SubscriptionSlice {
  // --- STATE ---
  subscriptionTier: SubscriptionTier;
  dailyCount: number;
  lastActiveDate: string;
  showPaywall: boolean;
  paywallReason: PaywallReason;
  dismissedPaywallTriggers: DismissablePaywallTrigger[];
  sessionPaywallShowCount: number;
  gratitudePaywallShownThisSession: boolean;
  unlimitedPaywallTesting: boolean;
  classifiedPaywallFlowMode: 'direct' | 'reveal_pricing';
  showPostPurchaseCelebration: boolean;
  appOpenCount: number;

  // --- ACTIONS ---
  setSubscription: (tier: SubscriptionTier) => void;
  setShowPaywall: (show: boolean) => void;
  setPaywallReason: (reason: PaywallReason) => void;
  checkDailyReset: () => void;
  canShowPaywall: (
    reason: Exclude<PaywallReason, null>
  ) => boolean;
  triggerPaywall: (reason: Exclude<PaywallReason, null>) => void;
  handleDailyLimitBannerTap: () => void;
  dismissPaywall: () => void;
  setUnlimitedPaywallTesting: (enabled: boolean) => void;
  setClassifiedPaywallFlowMode: (mode: 'direct' | 'reveal_pricing') => void;
  setShowPostPurchaseCelebration: (show: boolean) => void;
  incrementAppOpenCount: () => void;
}

export const createSubscriptionSlice: StateCreator<
  SubscriptionSlice & ChatSliceMinimal & GamificationSliceMinimal & DiscoverySliceMinimal,
  [],
  [],
  SubscriptionSlice
> = (set, get) => ({
  // --- INITIAL STATE ---
  subscriptionTier: 'FREE',
  dailyCount: 0,
  lastActiveDate: getLocalDateString(new Date()), // Use LOCAL time (not UTC)
  showPaywall: false,
  paywallReason: null,
  dismissedPaywallTriggers: [],
  sessionPaywallShowCount: 0,
  gratitudePaywallShownThisSession: false,
  unlimitedPaywallTesting: false, // TESTING: Default off
  classifiedPaywallFlowMode: 'reveal_pricing', // TESTING: Default to new flow
  showPostPurchaseCelebration: false,
  appOpenCount: 0,

  // --- ACTIONS ---
  setSubscription: (tier) => {
    const wasFree = get().subscriptionTier === 'FREE';
    const isPro = tier === 'MONTHLY' || tier === 'YEARLY';

    // DEBUG: Log subscription changes
    if (__DEV__) {
      console.log('[subscriptionSlice] Changing subscription:', get().subscriptionTier, '→', tier);
    }

    set({ subscriptionTier: tier });

    if (__DEV__) {
      console.log('[subscriptionSlice] Subscription changed successfully to:', tier);
    }

    // Show celebration when upgrading from FREE to PRO (Hush/Discretion users only)
    // Check discovery state, not current flavor (user may switch flavors after discovering)
    if (wasFree && isPro && !get().classifiedDiscovered) {
      set({ showPostPurchaseCelebration: true });
    }
  },

  setShowPaywall: (show) => set({ showPaywall: show }),
  setPaywallReason: (reason) => set({ paywallReason: reason }),

  checkDailyReset: () => {
    const state = get();
    const today = getLocalDateString(new Date()); // Use LOCAL time (not UTC)

    // Simple daily reset: if lastActiveDate is not today, reset
    if (state.lastActiveDate !== today) {
      if (__DEV__) {
        console.log(
          '[DailyReset] Resetting daily count on app start. lastActiveDate:',
          state.lastActiveDate,
          'today:',
          today
        );
      }
      set({ dailyCount: 0, lastActiveDate: today });
    } else {
      if (__DEV__) {
        console.log('[DailyReset] No reset needed. lastActiveDate:', state.lastActiveDate);
      }
    }
  },

  canShowPaywall: (reason) => {
    const state = get();

    // TESTING: Unlimited mode always allows
    if (state.unlimitedPaywallTesting) return true;

    // Never show if this specific trigger was already dismissed this session
    if (state.dismissedPaywallTriggers.includes(reason as DismissablePaywallTrigger))
      return false;

    // Cap at SESSION_PAYWALL_CAP shows per session (across all triggers, excluding classified_discovery)
    if (state.sessionPaywallShowCount >= SESSION_PAYWALL_CAP) return false;

    // Never show during active game session (EXCEPT for game-specific feature triggers)
    const activeGame = state.gameState.currentSession.activeGameId;
    if (
      activeGame &&
      reason !== 'unburdening_daily_limit' &&
      reason !== 'breathe_extended_limit' &&
      reason !== 'gratitude_streak_cap'
    ) {
      return false;
    }

    return true;
  },

  triggerPaywall: (reason) => {
    const state = get();

    if (!state.canShowPaywall(reason)) {
      if (__DEV__) {
        console.log('[PaywallGuard] Blocked paywall trigger:', reason, {
          dismissedTriggers: state.dismissedPaywallTriggers,
          showCount: state.sessionPaywallShowCount,
          activeGame: state.gameState.currentSession.activeGameId,
        });
      }
      return;
    }

    set({
      showPaywall: true,
      paywallReason: reason,
      // Only increment for non-exception triggers (classified_discovery and gratitude_streak_cap don't count)
      sessionPaywallShowCount:
        reason === 'classified_discovery' || reason === 'gratitude_streak_cap'
          ? state.sessionPaywallShowCount
          : state.sessionPaywallShowCount + 1,
      // Track if this is a gratitude cap paywall
      gratitudePaywallShownThisSession:
        reason === 'gratitude_streak_cap' ? true : state.gratitudePaywallShownThisSession,
    });
  },

  dismissPaywall: () => {
    const state = get();
    const currentReason = state.paywallReason;

    // Add to dismissed array (exclude unlimited exceptions: classified_discovery and gratitude_streak_cap)
    const updatedDismissed =
      currentReason &&
      currentReason !== 'classified_discovery' &&
      currentReason !== 'gratitude_streak_cap' &&
      !state.dismissedPaywallTriggers.includes(currentReason as DismissablePaywallTrigger)
        ? [...state.dismissedPaywallTriggers, currentReason as DismissablePaywallTrigger]
        : state.dismissedPaywallTriggers;

    set({
      showPaywall: false,
      dismissedPaywallTriggers: updatedDismissed,
    });
  },

  // EXCEPTION: Banner tap always shows paywall (bypasses all checks, never counts toward 6-cap)
  handleDailyLimitBannerTap: () => {
    set({
      showPaywall: true,
      paywallReason: 'daily_limit',
      // Banner tap NEVER increments sessionPaywallShowCount (doesn't count toward 6-cap)
    });
  },

  setUnlimitedPaywallTesting: (enabled) => {
    set({ unlimitedPaywallTesting: enabled });
    // Reset dismissed triggers and counts when toggling testing mode
    // This ensures clean slate whether enabling OR disabling
    set({
      dismissedPaywallTriggers: [],
      sessionPaywallShowCount: 0,
      gratitudePaywallShownThisSession: false,
    });
  },

  setClassifiedPaywallFlowMode: (mode) => {
    set({ classifiedPaywallFlowMode: mode });
  },

  setShowPostPurchaseCelebration: (show) => set({ showPostPurchaseCelebration: show }),

  incrementAppOpenCount: () => {
    set((state) => ({ appOpenCount: state.appOpenCount + 1 }));
  },
});

// Export constants for use in other components
export { SESSION_PAYWALL_CAP, DAILY_LIMIT };
