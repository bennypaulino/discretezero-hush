/**
 * Zustand Selector Library
 *
 * Centralized selectors for common store access patterns.
 * Use these instead of inline selectors for better maintainability and type safety.
 *
 * Benefits:
 * - Named selectors are self-documenting
 * - Easier to refactor store structure
 * - Better TypeScript inference
 * - Consistent patterns across codebase
 *
 * Usage:
 *   const hushTheme = useChatStore(selectHushTheme);
 *   const tier = useChatStore(selectSubscriptionTier);
 *   const isPro = useChatStore(selectIsProUser);
 */

import type { StoreState } from './rootStore';

// ============================================================================
// Theme Selectors
// ============================================================================

export const selectHushTheme = (state: StoreState) => state.hushTheme;
export const selectClassifiedTheme = (state: StoreState) => state.classifiedTheme;
export const selectDiscretionTheme = (state: StoreState) => state.discretionTheme;
export const selectHushBurnStyle = (state: StoreState) => state.hushBurnStyle;
export const selectFlavor = (state: StoreState) => state.flavor;

// ============================================================================
// Subscription Selectors
// ============================================================================

export const selectSubscriptionTier = (state: StoreState) => state.subscriptionTier;
export const selectRevenueCatUserId = (state: StoreState) => state.revenueCatUserId;
export const selectDailyCount = (state: StoreState) => state.dailyCount;
export const selectLastActiveDate = (state: StoreState) => state.lastActiveDate;

// Derived selector - Pro user check
export const selectIsProUser = (state: StoreState) =>
  state.subscriptionTier === 'MONTHLY' || state.subscriptionTier === 'YEARLY';

// ============================================================================
// Chat Selectors
// ============================================================================

export const selectMessages = (state: StoreState) => state.messages;
export const selectStreamingText = (state: StoreState) => state.streamingText;
export const selectStreamingMessageId = (state: StoreState) => state.streamingMessageId;
export const selectResponseStyleHush = (state: StoreState) => state.responseStyleHush;
export const selectResponseStyleClassified = (state: StoreState) => state.responseStyleClassified;

// ============================================================================
// Game State Selectors
// ============================================================================

export const selectGameState = (state: StoreState) => state.gameState;
export const selectNewlyUnlockedBadge = (state: StoreState) => state.gameState?.newlyUnlockedBadge;
export const selectCurrentGameSession = (state: StoreState) => state.gameState?.currentSession;
export const selectActiveGameId = (state: StoreState) => state.gameState?.currentSession?.activeGameId;
export const selectGameProgress = (state: StoreState) => state.gameState?.gameProgress;
export const selectBadges = (state: StoreState) => state.gameState?.badges;

// ============================================================================
// Security Selectors
// ============================================================================

export const selectIsPasscodeSet = (state: StoreState) => state.isPasscodeSet;
export const selectIsDuressCodeSet = (state: StoreState) => state.isDuressCodeSet;
export const selectIsDecoyMode = (state: StoreState) => state.isDecoyMode;

// ============================================================================
// Onboarding Selectors
// ============================================================================

export const selectHasSeenPrivacyOnboarding = (state: StoreState) => state.hasSeenPrivacyOnboarding;
export const selectHasAttemptedModelDownload = (state: StoreState) => state.hasAttemptedModelDownload;

// ============================================================================
// Discovery Selectors
// ============================================================================

export const selectClassifiedDiscovered = (state: StoreState) => state.classifiedDiscovered;

// ============================================================================
// Store Actions (for when you need the setter functions)
// ============================================================================

export const selectTriggerPaywall = (state: StoreState) => state.triggerPaywall;
export const selectDismissPaywall = (state: StoreState) => state.dismissPaywall;
export const selectSetSubscription = (state: StoreState) => state.setSubscription;
export const selectSetRevenueCatUserId = (state: StoreState) => state.setRevenueCatUserId;
export const selectAddMessage = (state: StoreState) => state.addMessage;
export const selectClearAllMessages = (state: StoreState) => state.clearAllMessages;
export const selectUnlockBadge = (state: StoreState) => state.unlockBadge;
export const selectForceUpdateDeadDropStreak = (state: StoreState) => state.forceUpdateDeadDropStreak;
