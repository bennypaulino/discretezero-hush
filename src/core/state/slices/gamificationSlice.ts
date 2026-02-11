/**
 * Gamification Slice
 *
 * Manages the complete game system including:
 * - Game progress tracking (12 games)
 * - Badge system (17 badges with tiers)
 * - Unlock tier progression (0-4)
 * - Stress meter (-100 to +100)
 * - Streak tracking (Gratitude, Dead Drop)
 * - Performance analytics opt-in
 *
 * Dependencies: VERY HIGH - Coordinates with Subscription, Discovery
 */

import { StateCreator } from 'zustand';
import type { GameId, BadgeId, Badge, GameProgress, BadgeTier, SubscriptionTier, AppFlavor } from '../types';
import { getLocalDateString } from '../utils/dateUtils';

declare const __DEV__: boolean;

// Initialize empty game progress for a game
const createEmptyGameProgress = (id: GameId): GameProgress => ({
  id,
  timesPlayed: 0,
  timesCompleted: 0,
  lastPlayedAt: null,
  currentStreak: 0,
  longestStreak: 0,
  lastStreakDate: undefined,
  // Dead Drop flawless system (initialized for all games, but only used by dead_drop)
  completedFlawless: false,
  flawlessVisual: 'star',
  mulliganBudget: 0,
  lastMulliganRefresh: undefined,
});

// Initialize badge registry (all locked by default)
const createBadgeRegistry = (): Record<BadgeId, Badge> => ({
  // Free tier badges
  centered: { id: 'centered', name: 'Centered', description: 'Complete Breathe 10 times', tier: 'bronze', unlockedAt: null },
  grateful: { id: 'grateful', name: 'Grateful', description: '7-day Gratitude streak', tier: 'bronze', unlockedAt: null },
  released: { id: 'released', name: 'Released', description: 'Complete 1 Unburdening', tier: 'bronze', unlockedAt: null },

  // Pro tier badges
  hardened_target: { id: 'hardened_target', name: 'Hardened Target', description: 'Resist social engineering for 10 exchanges', tier: 'silver', unlockedAt: null },
  security_certified: { id: 'security_certified', name: 'Security Certified', description: 'Complete all 5 Breach Protocol firewalls', tier: 'gold', unlockedAt: null },
  unburdened: { id: 'unburdened', name: 'Unburdened', description: 'Complete 5 Unburdenings', tier: 'silver', unlockedAt: null },
  optimist: { id: 'optimist', name: 'Optimist', description: '30-day Gratitude streak', tier: 'gold', unlockedAt: null },
  analyst: { id: 'analyst', name: 'Analyst', description: 'Find 5 moles correctly', tier: 'gold', unlockedAt: null },
  white_hat: { id: 'white_hat', name: 'White Hat', description: 'Complete Zero Day 3 times', tier: 'silver', unlockedAt: null },
  strategist: { id: 'strategist', name: 'Strategist', description: 'Complete DEFCON campaign', tier: 'diamond', unlockedAt: null },
  steady_hand: { id: 'steady_hand', name: 'Steady Hand', description: 'Complete Crisis Management with 90%+ score', tier: 'gold', unlockedAt: null },
  closer: { id: 'closer', name: 'Closer', description: 'Win 10 negotiations', tier: 'silver', unlockedAt: null },
  decisive: { id: 'decisive', name: 'Decisive', description: 'Complete 10 Executive Decisions', tier: 'silver', unlockedAt: null },
  field_operative: { id: 'field_operative', name: 'Field Operative', description: '30-day Dead Drop streak', tier: 'diamond', unlockedAt: null },
  completionist: { id: 'completionist', name: 'Completionist', description: 'Unlock all badges', tier: 'diamond', unlockedAt: null },

  // Special badges
  beta_tester: { id: 'beta_tester', name: 'Beta Tester', description: 'Opt in to performance analytics', tier: 'bronze', unlockedAt: null },
  backchannel: { id: 'backchannel', name: 'Backchannel', description: 'Discovered the Classified backdoor', tier: 'bronze', unlockedAt: null }, // Tier set dynamically on unlock (bronze with hints, silver without)
});

export interface GameSession {
  activeGameId: GameId | null;
  sessionStartedAt: number | null;
  sessionData: Record<string, any>; // Game-specific state (DEFCON resources, Interrogation mode, etc.)
  showCompletionOverlay: boolean; // For Unburdening "burn" confirmation
}

export interface GameState {
  // Progressive unlock tier (0-4)
  unlockTier: number;

  // Stress Meter (0-100) - links Hush and Classified
  stressLevel: number;

  // Badge unlock notification
  newlyUnlockedBadge: BadgeId | null; // Tracks badge that just unlocked (triggers modal)

  // Game progress tracking
  gameProgress: Record<GameId, GameProgress>;

  // Badge tracking
  badges: Record<BadgeId, Badge>;

  // Current game session
  currentSession: GameSession;

  // Free tier limits
  unburdeningLastFreeUse: string | null; // ISO date string of last free use (for 1/day limit)
  gratitudeStreakCapReached: boolean; // True if hit 7-day cap on Free

  // Dead Drop mulligan system
  deadDropMulliganUsed: boolean; // True if user has used their 1 mulligan during badge quest (Days 1-30)

  // Performance analytics opt-in
  performanceAnalyticsEnabled: boolean;
  analyticsContributionCount: number; // Local counter for "You've contributed X data points"
}

// Forward declarations for cross-slice access
interface SubscriptionSliceMinimal {
  subscriptionTier: SubscriptionTier;
}

interface DiscoverySliceMinimal {
  classifiedDiscovered: boolean;
  classifiedDiscoveryUsedHints: boolean | null;
}

export interface GamificationSlice {
  // --- STATE ---
  gameState: GameState;
  requestedSettingsScreen: string | null;

  // --- ACTIONS ---
  startGame: (gameId: GameId) => void;
  endGame: (completed: boolean, score?: number, time?: number) => void;
  adjustStressLevel: (delta: number) => void;
  unlockBadge: (badgeId: BadgeId) => void;
  setNewlyUnlockedBadge: (badgeId: BadgeId | null) => void;
  resetBadgeForTesting: (badgeId: BadgeId) => void;
  resetGameProgressForTesting: (gameId: GameId) => void;
  checkUnlockTier: () => number;
  advanceUnlockTier: () => void;
  updateGameStreak: (gameId: GameId) => void;
  forceUpdateDeadDropStreak: () => void;
  setPerformanceAnalytics: (enabled: boolean) => void;
  recordAnalyticsContribution: () => void;
  setShowCompletionOverlay: (show: boolean) => void;
  isGameUnlocked: (gameId: GameId) => boolean;
  requestSettingsScreen: (screen: string | null) => void;
}

export const createGamificationSlice: StateCreator<
  GamificationSlice & SubscriptionSliceMinimal & DiscoverySliceMinimal,
  [],
  [],
  GamificationSlice
> = (set, get) => ({
  // --- INITIAL STATE ---
  gameState: {
    unlockTier: 0, // Start at tier 0 (only Breathe unlocked)
    stressLevel: 50, // Start at neutral stress
    newlyUnlockedBadge: null, // No badge notification at start
    gameProgress: {
      // Initialize all games with empty progress
      breathe: createEmptyGameProgress('breathe'),
      unburdening: createEmptyGameProgress('unburdening'),
      gratitude: createEmptyGameProgress('gratitude'),
      interrogation: createEmptyGameProgress('interrogation'),
      breach_protocol: createEmptyGameProgress('breach_protocol'),
      mole_hunt: createEmptyGameProgress('mole_hunt'),
      zero_day: createEmptyGameProgress('zero_day'),
      defcon: createEmptyGameProgress('defcon'),
      dead_drop: createEmptyGameProgress('dead_drop'),
      executive_decision: createEmptyGameProgress('executive_decision'),
      negotiation: createEmptyGameProgress('negotiation'),
      crisis_management: createEmptyGameProgress('crisis_management'),
    },
    badges: createBadgeRegistry(),
    currentSession: {
      activeGameId: null,
      sessionStartedAt: null,
      sessionData: {},
      showCompletionOverlay: false,
    },
    unburdeningLastFreeUse: null,
    gratitudeStreakCapReached: false,
    deadDropMulliganUsed: false,
    performanceAnalyticsEnabled: false,
    analyticsContributionCount: 0,
  },
  requestedSettingsScreen: null,

  // --- ACTIONS ---
  startGame: (gameId) => {
    set((state) => {
      const currentProgress = state.gameState.gameProgress[gameId] || createEmptyGameProgress(gameId);

      // Multi-session games that persist campaign data between sessions
      const multiSessionGames = ['defcon', 'dead_drop'];
      const preserveSessionData = multiSessionGames.includes(gameId);

      return {
        gameState: {
          ...state.gameState,
          currentSession: {
            activeGameId: gameId,
            sessionStartedAt: Date.now(),
            // Preserve sessionData for multi-session games, clear for single-session games
            sessionData: preserveSessionData ? state.gameState.currentSession.sessionData : {},
            showCompletionOverlay: false,
          },
          gameProgress: {
            ...state.gameState.gameProgress,
            [gameId]: {
              ...currentProgress,
              timesPlayed: currentProgress.timesPlayed + 1,
              lastPlayedAt: Date.now(),
            },
          },
        },
      };
    });
  },

  endGame: (completed, score, time) => {
    const { gameState } = get();
    const activeGameId = gameState.currentSession.activeGameId;

    if (!activeGameId) {
      if (__DEV__) console.warn('[endGame] No active game');
      return;
    }

    const state = get();
    const progress = state.gameState.gameProgress[activeGameId];

    // Update progress
    const updatedProgress: GameProgress = {
      ...progress,
      timesCompleted: completed ? progress.timesCompleted + 1 : progress.timesCompleted,
      highScore:
        score !== undefined && (progress.highScore === undefined || score > progress.highScore)
          ? score
          : progress.highScore,
      bestTime:
        time !== undefined && (progress.bestTime === undefined || time < progress.bestTime)
          ? time
          : progress.bestTime,
    };

    // Set unburdening last free use date for Free tier (daily limit)
    const unburdeningLastFreeUse =
      activeGameId === 'unburdening' && completed && get().subscriptionTier === 'FREE'
        ? getLocalDateString(new Date()) // Use local date string (YYYY-MM-DD), not ISO timestamp
        : state.gameState.unburdeningLastFreeUse;

    set({
      gameState: {
        ...state.gameState,
        currentSession: {
          activeGameId: null,
          sessionStartedAt: null,
          sessionData: {},
          showCompletionOverlay: false,
        },
        gameProgress: {
          ...state.gameState.gameProgress,
          [activeGameId]: updatedProgress,
        },
        unburdeningLastFreeUse,
      },
    });
  },

  adjustStressLevel: (delta) => {
    set((state) => ({
      gameState: {
        ...state.gameState,
        stressLevel: Math.max(0, Math.min(100, state.gameState.stressLevel + delta)),
      },
    }));
  },

  unlockBadge: (badgeId) => {
    if (__DEV__) console.log('[unlockBadge] Attempting to unlock badge:', badgeId);
    set((state) => {
      // Safety check: if badge doesn't exist in persisted state, it needs to be created
      const badgeExists = !!state.gameState.badges[badgeId];
      if (!badgeExists) {
        if (__DEV__) console.warn('[unlockBadge] Badge not found in state, skipping:', badgeId);
        return state; // Don't modify state if badge doesn't exist
      }

      // Check if already unlocked
      if (state.gameState.badges[badgeId].unlockedAt) {
        if (__DEV__) console.log('[unlockBadge] Badge already unlocked:', badgeId);
        return state;
      }

      // Determine badge tier (most are fixed, some are dynamic)
      let badgeTier = badgeExists ? state.gameState.badges[badgeId].tier : 'bronze';
      if (badgeId === 'backchannel') {
        // GLOW (silver) if hints were disabled, EMBER (bronze) if hints were enabled
        badgeTier = state.classifiedDiscoveryUsedHints === false ? 'silver' : 'bronze';
        if (__DEV__) {
          console.log(
            '[unlockBadge] Backchannel badge tier set to',
            badgeTier,
            '(hintsEnabled:',
            state.classifiedDiscoveryUsedHints,
            ')'
          );
        }
      }

      if (__DEV__) console.log('[unlockBadge] Badge', badgeId, 'unlocked! Setting newlyUnlockedBadge to', badgeId);
      return {
        gameState: {
          ...state.gameState,
          badges: {
            ...state.gameState.badges,
            [badgeId]: {
              ...state.gameState.badges[badgeId],
              tier: badgeTier,
              unlockedAt: Date.now(),
            },
          },
          // Set newly unlocked badge to trigger notification modal
          newlyUnlockedBadge: badgeId,
        },
      };
    });
  },

  setNewlyUnlockedBadge: (badgeId) => {
    set((state) => ({
      gameState: {
        ...state.gameState,
        newlyUnlockedBadge: badgeId,
      },
    }));
  },

  // TEMPORARY: Reset badge for testing (remove before production)
  resetBadgeForTesting: (badgeId: BadgeId) => {
    if (__DEV__) console.log('[TESTING] Resetting badge:', badgeId);
    set((state) => ({
      gameState: {
        ...state.gameState,
        badges: {
          ...state.gameState.badges,
          [badgeId]: {
            ...state.gameState.badges[badgeId],
            unlockedAt: null,
          },
        },
        newlyUnlockedBadge: null,
      },
    }));
  },

  // TEMPORARY: Reset game progress for testing (remove before production)
  resetGameProgressForTesting: (gameId: GameId) => {
    if (__DEV__) console.log('[TESTING] Resetting game progress:', gameId);
    set((state) => ({
      gameState: {
        ...state.gameState,
        gameProgress: {
          ...state.gameState.gameProgress,
          [gameId]: createEmptyGameProgress(gameId),
        },
      },
    }));
  },

  checkUnlockTier: () => {
    const { gameState, subscriptionTier, classifiedDiscovered } = get();

    // Tier 0: Discovery phase (everyone starts here)
    if (!classifiedDiscovered) return 0;

    // Tier 1: After discovering Classified (Pro users only for games)
    if (subscriptionTier === 'FREE') return 0; // Free users stay at tier 0 (only free games)

    // Pro users progress through tiers
    const classifiedUses = Object.values(gameState.gameProgress)
      .filter((p) => {
        const id = p.id;
        return (
          id === 'interrogation' ||
          id === 'breach_protocol' ||
          id === 'mole_hunt' ||
          id === 'zero_day' ||
          id === 'defcon' ||
          id === 'dead_drop'
        );
      })
      .reduce((sum, p) => sum + p.timesPlayed, 0);

    if (classifiedUses < 5) return 1; // Beginner: 0-4 uses
    if (classifiedUses < 15) return 2; // Intermediate: 5-14 uses

    // Tier 3: Advanced (must complete 5 different Classified games)
    const completedGames = Object.values(gameState.gameProgress)
      .filter((p) => {
        const id = p.id;
        return (
          id === 'interrogation' ||
          id === 'breach_protocol' ||
          id === 'mole_hunt' ||
          id === 'zero_day' ||
          id === 'defcon' ||
          id === 'dead_drop'
        );
      })
      .filter((p) => p.timesCompleted > 0).length;

    if (completedGames < 5) return 3;

    return 4; // Master level
  },

  advanceUnlockTier: () => {
    const currentTier = get().checkUnlockTier();
    set((state) => ({
      gameState: {
        ...state.gameState,
        unlockTier: currentTier,
      },
    }));
  },

  updateGameStreak: (gameId) => {
    const today = getLocalDateString(new Date()); // Use LOCAL time (not UTC)
    const { gameState } = get();
    const progress = gameState.gameProgress[gameId];

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = getLocalDateString(yesterday);

    let newStreak = progress.currentStreak || 0;

    // Same day logic
    if (progress.lastStreakDate === today) {
      // Streak already updated today
      return;
    } else if (progress.lastStreakDate === yesterdayString || progress.lastStreakDate === undefined) {
      // Streak continues (played yesterday) or first play
      newStreak += 1;
    } else {
      // Streak broken, restart
      newStreak = 1;
    }

    set((state) => ({
      gameState: {
        ...state.gameState,
        gameProgress: {
          ...state.gameState.gameProgress,
          [gameId]: {
            ...state.gameState.gameProgress[gameId],
            currentStreak: newStreak,
            longestStreak: Math.max(newStreak, state.gameState.gameProgress[gameId].longestStreak || 0),
            lastStreakDate: today,
          },
        },
      },
    }));

    // Check for Gratitude streak cap on Free tier
    if (gameId === 'gratitude' && get().subscriptionTier === 'FREE' && newStreak >= 7) {
      set((state) => ({
        gameState: {
          ...state.gameState,
          gratitudeStreakCapReached: true,
        },
      }));
    }
  },

  forceUpdateDeadDropStreak: () => {
    const now = new Date();
    const today = getLocalDateString(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = getLocalDateString(yesterday);

    const { gameState } = get();
    const ddProgress = gameState.gameProgress.dead_drop;
    let newStreak = ddProgress.currentStreak || 0;

    if (__DEV__) {
      console.log('[DeadDrop] Force updating streak. Current:', newStreak, 'lastStreakDate:', ddProgress.lastStreakDate);
    }

    if (ddProgress.lastStreakDate === today) {
      if (__DEV__) {
        console.log('[DeadDrop] Streak already updated today');
      }
    } else if (ddProgress.lastStreakDate === yesterdayString || !ddProgress.lastStreakDate) {
      newStreak += 1;
      if (__DEV__) {
        console.log('[DeadDrop] Incrementing streak to:', newStreak);
      }
    } else {
      newStreak = 1;
      if (__DEV__) {
        console.log('[DeadDrop] Streak broken, resetting to 1');
      }
    }

    if (__DEV__) {
      console.log('[DeadDrop] Setting new streak:', newStreak, 'lastStreakDate:', today);
    }

    set((state) => ({
      gameState: {
        ...state.gameState,
        gameProgress: {
          ...state.gameState.gameProgress,
          dead_drop: {
            ...state.gameState.gameProgress.dead_drop,
            currentStreak: newStreak,
            longestStreak: Math.max(newStreak, state.gameState.gameProgress.dead_drop.longestStreak || 0),
            lastStreakDate: today,
          },
        },
      },
    }));

    if (__DEV__) {
      console.log('[DeadDrop] State updated, new streak should be:', newStreak);
    }
  },

  setPerformanceAnalytics: (enabled) => {
    set((state) => ({
      gameState: {
        ...state.gameState,
        performanceAnalyticsEnabled: enabled,
      },
    }));

    // Unlock beta tester badge if enabling
    if (enabled) {
      get().unlockBadge('beta_tester');
    }
  },

  recordAnalyticsContribution: () => {
    set((state) => ({
      gameState: {
        ...state.gameState,
        analyticsContributionCount: state.gameState.analyticsContributionCount + 1,
      },
    }));
  },

  setShowCompletionOverlay: (show) => {
    set((state) => ({
      gameState: {
        ...state.gameState,
        currentSession: {
          ...state.gameState.currentSession,
          showCompletionOverlay: show,
        },
      },
    }));
  },

  isGameUnlocked: (gameId) => {
    const { subscriptionTier, gameState } = get();
    const isPro = subscriptionTier === 'MONTHLY' || subscriptionTier === 'YEARLY';

    // Free tier games (available to everyone)
    if (gameId === 'breathe') return true; // Always available
    if (gameId === 'unburdening') {
      // First use is always free. After that, Free tier has 1/day limit
      if (!gameState.unburdeningLastFreeUse) return true; // First time
      if (subscriptionTier === 'FREE') {
        const lastUse = gameState.unburdeningLastFreeUse;
        const today = getLocalDateString(new Date());

        // Validate date format (YYYY-MM-DD) to handle corrupted data gracefully
        if (!/^\d{4}-\d{2}-\d{2}$/.test(lastUse)) {
          if (__DEV__) console.warn('[isGameUnlocked] Invalid lastUse format:', lastUse);
          return true; // Allow access if data is corrupted (favor user experience)
        }

        return lastUse !== today; // Can use again if last use was not today
      }
      return true; // Pro users have unlimited access
    }
    if (gameId === 'gratitude') {
      // Free tier has 7-day streak cap
      if (subscriptionTier === 'FREE' && gameState.gratitudeStreakCapReached) {
        return false; // Hit the cap
      }
      return true;
    }

    // All Classified games require Pro
    const classifiedGames = ['interrogation', 'breach_protocol', 'mole_hunt', 'zero_day', 'defcon', 'dead_drop'];
    if (classifiedGames.includes(gameId)) {
      return isPro;
    }

    // Discretion games require Pro
    const discretionGames = ['executive_decision', 'negotiation', 'crisis_management'];
    if (discretionGames.includes(gameId)) {
      return isPro;
    }

    return false;
  },

  requestSettingsScreen: (screen) => {
    set({ requestedSettingsScreen: screen });
  },
});
