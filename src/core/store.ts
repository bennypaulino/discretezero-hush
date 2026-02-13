import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import { EncryptedStorage } from './storage/EncryptedStorage';
import * as SecureStore from 'expo-secure-store';
import { Keyboard } from 'react-native';
import { generateResponse } from './engine/LocalAI';
import { CURRENT_FLAVOR, AppFlavor } from '../config';
import type { HushTheme, ClassifiedTheme, DiscretionTheme } from './themes/themes';
import { detectGameTrigger } from './engine/GameTriggers';
import { getLocalDateString } from './utils/dateUtils';

// ANIMATION TYPES
export type HushBurnType = 'clear' | 'disintegrate' | 'dissolve' | 'ripple' | 'rain';
export type ClassifiedBurnType = 'cls' | 'purge' | 'redaction' | 'corruption' | 'matrix';

// THEME TYPES (imported from themes.ts)
export type { HushTheme, ClassifiedTheme, DiscretionTheme };
export type SubscriptionTier = 'FREE' | 'MONTHLY' | 'YEARLY';

// RESPONSE STYLE TYPES
export type ResponseStyleHush = 'quick' | 'thoughtful';
export type ResponseStyleClassified = 'operator' | 'analyst';
export type ResponseStyleDiscretion = 'warm' | 'formal';

// DECOY PRESETS
export type DecoyPreset = 'AUTO' | 'STUDY_HELPER' | 'MEAL_PLANNING' | 'GENERAL_ASSISTANT' | 'CUSTOM';

// PERFORMANCE MODES
export type PerformanceMode = 'efficient' | 'balanced' | 'quality';

export interface ModeDownloadState {
  efficient: 'not_downloaded' | 'downloading' | 'downloaded';  // Downloaded on-demand (Gemma 2B, 1.6GB)
  balanced: 'not_downloaded' | 'downloading' | 'downloaded';
  quality: 'not_downloaded' | 'downloading' | 'downloaded';
}

// GAMIFICATION SYSTEM
export type GameId =
  // Hush games (3)
  | 'breathe' | 'unburdening' | 'gratitude'
  // Classified games (6)
  | 'interrogation' | 'breach_protocol' | 'mole_hunt' | 'zero_day' | 'defcon' | 'dead_drop'
  // Discretion games (3)
  | 'executive_decision' | 'negotiation' | 'crisis_management';

export type BadgeId =
  // Achievement badges
  | 'centered' | 'grateful' | 'released' | 'hardened_target' | 'security_certified'
  | 'unburdened' | 'optimist' | 'analyst' | 'white_hat' | 'strategist'
  | 'steady_hand' | 'closer' | 'decisive' | 'field_operative' | 'completionist'
  // Special badges
  | 'beta_tester' // Performance analytics opt-in
  | 'backchannel'; // Discovered Classified (tier determined by hint usage)

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'diamond';

// Helper: Get flavor-specific tier display name
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

export interface Badge {
  id: BadgeId;
  name: string;
  description: string;
  tier: BadgeTier;
  unlockedAt: number | null; // Timestamp or null if locked
}

export interface GameProgress {
  id: GameId;
  timesPlayed: number;
  timesCompleted: number;
  lastPlayedAt: number | null; // Timestamp
  highScore?: number; // For games with scoring
  bestTime?: number; // For timed games
  currentStreak?: number; // For streak-based games (Gratitude, Dead Drop)
  longestStreak?: number;
  lastStreakDate?: string; // ISO date for daily tracking
  completedLayers?: number[]; // For Breach Protocol layer persistence: [1, 2, 3] means layers 1-3 done
  skippedLayers?: number[]; // For Breach Protocol: tracks layers user gave up on (badge requires 0 skips)
  completedPhases?: number[]; // For DEFCON phase persistence: [1, 2, 3] means phases 1-3 done
  // Dead Drop flawless completion system
  completedFlawless?: boolean; // Reached Day 30 without using mulligan
  flawlessVisual?: 'star' | 'text'; // Display preference (⭐ or [FLAWLESS])
  mulliganBudget?: number; // Available mulligans (Days 31+ only)
  lastMulliganRefresh?: string; // ISO date of last 30-day cycle reset
}

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

export interface DeviceCapabilities {
  modelName: string;
  chipGeneration: string;
  totalMemoryGB: number;
  recommendedMode: PerformanceMode;
  canUpgradeToBalanced: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'system' | 'ai';
  text: string;
  timestamp: number;
  context: AppFlavor;
}

interface ChatState {
  flavor: AppFlavor;
  privacyBlurEnabled: boolean;
  messages: Message[];
  isTyping: boolean;

  // --- PRIVACY METRICS ---
  totalMessagesProtected: number; // Counter for Privacy Dashboard

  // --- ECONOMY ---
  subscriptionTier: SubscriptionTier;

  dailyCount: number;
  lastActiveDate: string;
  showPaywall: boolean;
  paywallReason: 'daily_limit' | 'unburdening_daily_limit' | 'breathe_extended_limit' | 'feature_locked_theme' | 'feature_locked_clear_style' | 'feature_locked_response_style' | 'classified_discovery' | 'gratitude_streak_cap' | null;
  classifiedDiscovered: boolean;
  firstClassifiedBlockerSeen: boolean; // Tracks if user has seen the first-time discovery blocker
  classifiedDiscoveryUsedHints: boolean | null; // True if hints were enabled at discovery time, null if not discovered yet

  // --- TIER 4 SMART FREQUENCY CAP ---
  dismissedPaywallTriggers: ('daily_limit' | 'unburdening_daily_limit' | 'breathe_extended_limit' | 'feature_locked_theme' | 'feature_locked_clear_style' | 'feature_locked_response_style')[]; // Track which triggers were dismissed (classified_discovery and gratitude_streak_cap never added - unlimited exceptions)
  sessionPaywallShowCount: number; // Cap at 6 per session (excluding classified_discovery and banner taps)
  gratitudePaywallShownThisSession: boolean; // Track if gratitude cap paywall shown this session (for copy differentiation)
  unlimitedPaywallTesting: boolean; // TESTING: Disable frequency cap for testing paywalls
  classifiedPaywallFlowMode: 'direct' | 'reveal_pricing'; // TESTING: Toggle between direct upgrade vs reveal pricing flow

  // --- POST-PURCHASE CELEBRATION ---
  showPostPurchaseCelebration: boolean;

  // --- PROGRESSIVE DISCOVERY HINTS ---
  discoveryHintsEnabled: boolean; // Pro users can opt out of hints
  hintProgressionLevel: number; // 0-5, increments with each hint shown
  lastHintShownDate: string | null; // Track last hint shown (once per app-open logic)
  appOpenCount: number; // Track how many times app has been opened

  // --- PREFERENCES ---
  hushBurnStyle: HushBurnType;
  classifiedBurnStyle: ClassifiedBurnType;

  // --- THEMES ---
  hushTheme: HushTheme;
  classifiedTheme: ClassifiedTheme;
  discretionTheme: DiscretionTheme;

  // --- RESPONSE STYLES ---
  responseStyleHush: ResponseStyleHush;
  responseStyleClassified: ResponseStyleClassified;
  responseStyleDiscretion: ResponseStyleDiscretion;

  // --- APPEARANCE ---
  quickTransition: boolean;
  animationSounds: boolean;
  animationSoundsPro: boolean; // Pro-only toggle for clear animation sounds
  highContrastMode: boolean; // WCAG AA compliance: Increase opacity for better contrast

  // --- SECURITY (SEC-002, SEC-003, SEC-004) ---
  isLocked: boolean;
  isPasscodeSet: boolean;
  isDuressCodeSet: boolean;
  useAppPasscode: boolean;        // Use separate app passcode vs device
  lastActiveMode: AppFlavor;      // Track mode when lock triggered (for decoy routing)
  isDecoyMode: boolean;           // Currently showing decoy content
  decoyBurned: boolean;           // Track if decoy messages were intentionally burned

  // Decoy configuration
  hushDecoyPreset: DecoyPreset;
  classifiedDecoyPreset: DecoyPreset;
  customDecoyHushMessages: Message[];
  customDecoyClassifiedMessages: Message[];

  // Rate limiting for passcode attempts
  failedPasscodeAttempts: number;
  passcodeLockoutUntil: number | null;

  // First-time hints
  hasSeenLockScreenTutorial: boolean;
  hasSeenFaceDownHint: boolean;
  hasSeenPrivacyOnboarding: boolean;

  // Model download onboarding (SEC-005)
  hasAttemptedModelDownload: boolean; // User was offered download (skipped or completed)
  showModelDownloadPrompt: boolean;   // Show download modal from chat screen

  // --- PERFORMANCE MODES ---
  activeMode: PerformanceMode;
  modeDownloadState: ModeDownloadState;
  modeDownloadProgress: number;
  currentlyDownloading: PerformanceMode | null;
  downloadError: { mode: PerformanceMode; error: 'network_timeout' | 'storage_full' | 'corrupted' | 'interrupted' | 'unknown' } | null;
  multiModelEnabled: boolean;
  balancedUpgradeOffered: boolean;
  balancedUpgradeDeclined: boolean;
  messageCountSinceUpgradeOffer: number;  // Track messages for toast timing (10-20 threshold)
  deviceCapabilities: DeviceCapabilities | null;
  proFirstLaunchSeen: boolean;

  // Storage tracking
  modelStorageUsed: number; // Bytes
  deviceStorageTotal: number; // Bytes
  deviceStorageAvailable: number; // Bytes

  // --- PANIC WIPE ---
  panicWipeEnabled: boolean;

  // --- GAMIFICATION ---
  gameState: GameState;

  // Navigation trigger (for opening settings from game completion screens)
  requestedSettingsScreen: string | null; // Screen to open in settings (e.g., 'achievementGallery')

  // ACTIONS
  toggleFlavor: () => void;
  setFlavor: (flavor: AppFlavor) => void;
  togglePrivacyBlur: () => void;

  setSubscription: (tier: SubscriptionTier) => void;
  setShowPaywall: (show: boolean) => void;
  setPaywallReason: (reason: 'daily_limit' | 'unburdening_daily_limit' | 'breathe_extended_limit' | 'feature_locked_theme' | 'feature_locked_clear_style' | 'feature_locked_response_style' | 'classified_discovery' | 'gratitude_streak_cap' | null) => void;
  checkDailyReset: () => void; // Check and reset daily counter if new day

  // TIER 4 PAYWALL FREQUENCY CAP ACTIONS
  canShowPaywall: (reason: 'daily_limit' | 'unburdening_daily_limit' | 'breathe_extended_limit' | 'feature_locked_theme' | 'feature_locked_clear_style' | 'feature_locked_response_style' | 'classified_discovery' | 'gratitude_streak_cap') => boolean;
  triggerPaywall: (reason: 'daily_limit' | 'unburdening_daily_limit' | 'breathe_extended_limit' | 'feature_locked_theme' | 'feature_locked_clear_style' | 'feature_locked_response_style' | 'classified_discovery' | 'gratitude_streak_cap') => void;
  handleDailyLimitBannerTap: () => void; // Banner tap exception (always shows paywall)
  dismissPaywall: () => void;
  setUnlimitedPaywallTesting: (enabled: boolean) => void; // TESTING
  setClassifiedPaywallFlowMode: (mode: 'direct' | 'reveal_pricing') => void; // TESTING
  setClassifiedDiscovered: (discovered: boolean) => void; // TESTING

  // POST-PURCHASE CELEBRATION ACTIONS
  setShowPostPurchaseCelebration: (show: boolean) => void;

  // HINT ACTIONS
  advanceHintProgression: () => void;
  setDiscoveryHintsEnabled: (enabled: boolean) => void;
  shouldShowHintToday: () => boolean;
  markHintShownToday: () => void;
  clearLastHintDate: () => void;
  incrementAppOpenCount: () => void;

  setHushBurnStyle: (style: HushBurnType) => void;
  setClassifiedBurnStyle: (style: ClassifiedBurnType) => void;

  // THEME ACTIONS
  setHushTheme: (theme: HushTheme) => void;
  setClassifiedTheme: (theme: ClassifiedTheme) => void;
  setDiscretionTheme: (theme: DiscretionTheme) => void;

  // RESPONSE STYLE ACTIONS
  setResponseStyleHush: (style: ResponseStyleHush) => void;
  setResponseStyleClassified: (style: ResponseStyleClassified) => void;
  setResponseStyleDiscretion: (style: ResponseStyleDiscretion) => void;
  getCurrentResponseStyle: () => ResponseStyleHush | ResponseStyleClassified | ResponseStyleDiscretion;

  // APPEARANCE ACTIONS
  setQuickTransition: (enabled: boolean) => void;
  setHighContrastMode: (enabled: boolean) => void;
  setAnimationSounds: (enabled: boolean) => void;
  setAnimationSoundsPro: (enabled: boolean) => void;

  // SECURITY ACTIONS
  setLocked: (locked: boolean) => void;
  setPasscode: (code: string) => Promise<void>;
  setDuressCode: (code: string | null) => Promise<void>;
  clearPasscode: () => Promise<void>;
  setUseAppPasscode: (use: boolean) => void;
  setLastActiveMode: (mode: AppFlavor) => void;
  setDecoyMode: (isDecoy: boolean) => void;
  setHushDecoyPreset: (preset: DecoyPreset) => void;
  setClassifiedDecoyPreset: (preset: DecoyPreset) => void;

  // Passcode validation (returns 'real' | 'duress' | 'invalid')
  validatePasscode: (code: string) => Promise<'real' | 'duress' | 'invalid' | 'locked_out'>;

  // Load secure data on app start
  loadSecureData: () => Promise<void>;

  // PERFORMANCE MODE ACTIONS
  setActiveMode: (mode: PerformanceMode) => void;
  startModeDownload: (mode: PerformanceMode) => void;
  cancelModeDownload: () => void;
  setModeDownloadProgress: (progress: number) => void;
  completeModeDownload: (mode: PerformanceMode) => void;
  failModeDownload: (mode: PerformanceMode, error: 'network_timeout' | 'storage_full' | 'corrupted' | 'interrupted' | 'unknown') => void;
  clearDownloadError: () => void;
  deleteMode: (mode: PerformanceMode) => void;
  setMultiModelEnabled: (enabled: boolean) => void;
  setBalancedUpgradeOffered: (offered: boolean) => void;
  setBalancedUpgradeDeclined: (declined: boolean) => void;
  setDeviceCapabilities: (caps: DeviceCapabilities) => void;
  setProFirstLaunchSeen: (seen: boolean) => void;
  updateStorageInfo: () => Promise<void>;

  // MODEL DOWNLOAD ONBOARDING ACTIONS (SEC-005)
  setHasAttemptedModelDownload: (attempted: boolean) => void;

  // PANIC WIPE ACTIONS
  setPanicWipeEnabled: (enabled: boolean) => void;

  // GAMIFICATION ACTIONS
  startGame: (gameId: GameId) => void;
  endGame: (completed: boolean, score?: number, time?: number) => void;
  adjustStressLevel: (delta: number) => void; // +5 to +15 for Classified, -10 to -25 for Hush
  unlockBadge: (badgeId: BadgeId) => void;
  setNewlyUnlockedBadge: (badgeId: BadgeId | null) => void; // Set/clear badge unlock notification
  resetBadgeForTesting: (badgeId: BadgeId) => void; // TEMPORARY: Reset badge for testing
  resetGameProgressForTesting: (gameId: GameId) => void; // TEMPORARY: Reset game progress for testing
  checkUnlockTier: () => number; // Returns current unlock tier (0-4)
  advanceUnlockTier: () => void;
  updateGameStreak: (gameId: GameId) => void; // For Gratitude, Dead Drop
  forceUpdateDeadDropStreak: () => void; // For Dead Drop confirmed check-ins (bypasses daily guard)
  setPerformanceAnalytics: (enabled: boolean) => void;
  recordAnalyticsContribution: () => void;
  setShowCompletionOverlay: (show: boolean) => void; // For Unburdening burn confirmation
  isGameUnlocked: (gameId: GameId) => boolean; // Check if game is available based on tier/subscription
  requestSettingsScreen: (screen: string | null) => void; // Request opening settings to a specific screen

  addMessage: (text: string, role: 'user' | 'ai' | 'system') => void;
  sendMessage: (text: string) => Promise<void>;
  clearHistory: () => void;
}

const getTodayString = () => new Date().toISOString().split('T')[0];

const DAILY_LIMIT = 8;
const SESSION_PAYWALL_CAP = 6; // Maximum paywall shows per session (excluding classified_discovery and banner taps)

// SecureStore keys
const PASSCODE_KEY = 'hush_passcode';
const DURESS_KEY = 'hush_duress';

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

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      flavor: CURRENT_FLAVOR,
      privacyBlurEnabled: true,
      messages: [],
      isTyping: false,

      // DEFAULTS
      subscriptionTier: 'FREE',

      dailyCount: 0,
      lastActiveDate: getLocalDateString(new Date()), // Use LOCAL time (not UTC)
      showPaywall: false,
      paywallReason: null,
      classifiedDiscovered: false,
      firstClassifiedBlockerSeen: false, // First-time discovery blocker not shown yet
      classifiedDiscoveryUsedHints: null, // Null until Classified is discovered

      // TIER 4 SMART FREQUENCY CAP DEFAULTS
      dismissedPaywallTriggers: [],
      sessionPaywallShowCount: 0,
      gratitudePaywallShownThisSession: false,
      unlimitedPaywallTesting: false, // TESTING: Default off
      classifiedPaywallFlowMode: 'reveal_pricing', // TESTING: Default to new flow

      // POST-PURCHASE CELEBRATION DEFAULT
      showPostPurchaseCelebration: false,

      // HINT DEFAULTS
      discoveryHintsEnabled: true, // Default on, Pro users can disable
      hintProgressionLevel: 0, // 0 = no hints shown yet
      lastHintShownDate: null,
      appOpenCount: 0,

      // PREFERENCES DEFAULTS
      hushBurnStyle: 'clear',
      classifiedBurnStyle: 'cls',

      // THEME DEFAULTS
      hushTheme: 'DEFAULT',
      classifiedTheme: 'TERMINAL_RED',
      discretionTheme: 'GOLD',

      // RESPONSE STYLE DEFAULTS
      responseStyleHush: 'quick',
      responseStyleClassified: 'operator',
      responseStyleDiscretion: 'formal',

      // APPEARANCE DEFAULTS (per spec: both OFF by default, except animationSounds for Pro)
      quickTransition: false,
      animationSounds: true, // Defaults ON (Pro users have sounds enabled by default)
      animationSoundsPro: true, // Pro-only toggle, defaults ON for Pro users
      highContrastMode: false, // Accessibility: OFF by default, users can opt-in

      // SECURITY DEFAULTS
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

      // First-time hints defaults
      hasSeenLockScreenTutorial: false,
      hasSeenFaceDownHint: false,
      hasSeenPrivacyOnboarding: false,

      // Model download onboarding defaults
      hasAttemptedModelDownload: false,
      showModelDownloadPrompt: false,

      // Privacy metrics defaults
      totalMessagesProtected: 0,

      // PERFORMANCE MODE DEFAULTS
      activeMode: 'efficient',
      modeDownloadState: {
        efficient: 'not_downloaded',  // Downloaded on-demand (1.6GB)
        balanced: 'not_downloaded',
        quality: 'not_downloaded',
      },
      modeDownloadProgress: 0,
      currentlyDownloading: null,
      downloadError: null,
      multiModelEnabled: false,
      balancedUpgradeOffered: false,
      balancedUpgradeDeclined: false,
      messageCountSinceUpgradeOffer: 0,
      deviceCapabilities: null,
      proFirstLaunchSeen: false,
      modelStorageUsed: 1.7 * 1024 * 1024 * 1024, // 1.7GB for Efficient mode (Gemma 2B)
      deviceStorageTotal: 0,
      deviceStorageAvailable: 0,

      // PANIC WIPE DEFAULT
      panicWipeEnabled: false,

      // NAVIGATION DEFAULTS
      requestedSettingsScreen: null, // Screen to open in settings (e.g., 'achievementGallery')

      // GAMIFICATION DEFAULTS
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

      toggleFlavor: () => {
        const { flavor } = get();

        let next: AppFlavor = 'HUSH';
        if (flavor === 'HUSH') next = 'CLASSIFIED';
        else if (flavor === 'CLASSIFIED') next = 'HUSH';
        else if (flavor === 'DISCRETION') next = 'CLASSIFIED';

        if (next === 'CLASSIFIED') {
            set({ classifiedDiscovered: true });
        }

        const alert = next === 'HUSH'
          ? 'Protocol Omega: Going dark.'
          : 'PROTOCOL ALPHA: SECURE TERMINAL ACCESSED.';

        set({ flavor: next });
        get().addMessage(alert, 'system');
      },

      setFlavor: (flavor) => set({ flavor }),
      togglePrivacyBlur: () => set((s) => ({ privacyBlurEnabled: !s.privacyBlurEnabled })),

      // Model download onboarding actions
      setHasAttemptedModelDownload: (attempted: boolean) => set({ hasAttemptedModelDownload: attempted }),

      setSubscription: (tier) => {
        const wasFree = get().subscriptionTier === 'FREE';
        const isPro = tier === 'MONTHLY' || tier === 'YEARLY';

        set({ subscriptionTier: tier });

        // Show celebration when upgrading from FREE to PRO (not for Classified - no free access)
        if (wasFree && isPro && get().flavor !== 'CLASSIFIED') {
          set({ showPostPurchaseCelebration: true });
        }
      },
      setShowPaywall: (show) => set({ showPaywall: show }),
      setPaywallReason: (reason) => set({ paywallReason: reason }),

      // TIER 4 PAYWALL FREQUENCY CAP ACTIONS
      canShowPaywall: (reason) => {
        const state = get();

        // EXCEPTION: classified_discovery and gratitude_streak_cap always show (unlimited)
        if (reason === 'classified_discovery' || reason === 'gratitude_streak_cap') return true;

        // TESTING MODE: Skip all frequency cap checks
        if (state.unlimitedPaywallTesting) return true;

        // Never show if this specific trigger was already dismissed this session
        if (state.dismissedPaywallTriggers.includes(reason)) return false;

        // Cap at SESSION_PAYWALL_CAP shows per session (across all triggers, excluding classified_discovery)
        if (state.sessionPaywallShowCount >= SESSION_PAYWALL_CAP) return false;

        // Never show during active game session (EXCEPT for game-specific feature triggers)
        const activeGame = state.gameState.currentSession.activeGameId;
        if (activeGame !== null) {
          // Allow game-specific triggers to show within their own games
          const isGameSpecificTrigger =
            (reason === 'breathe_extended_limit' && activeGame === 'breathe') ||
            (reason === 'unburdening_daily_limit' && activeGame === 'unburdening');

          if (!isGameSpecificTrigger) return false;
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
          sessionPaywallShowCount: reason === 'classified_discovery' || reason === 'gratitude_streak_cap'
            ? state.sessionPaywallShowCount
            : state.sessionPaywallShowCount + 1,
          // Track if gratitude paywall was shown (for copy differentiation)
          gratitudePaywallShownThisSession: reason === 'gratitude_streak_cap' ? true : state.gratitudePaywallShownThisSession,
        });
      },

      dismissPaywall: () => {
        const state = get();
        const currentReason = state.paywallReason;

        // Add to dismissed array (exclude unlimited exceptions: classified_discovery and gratitude_streak_cap)
        const updatedDismissed = currentReason &&
          currentReason !== 'classified_discovery' &&
          currentReason !== 'gratitude_streak_cap' &&
          !state.dismissedPaywallTriggers.includes(currentReason)
          ? [...state.dismissedPaywallTriggers, currentReason]
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
        set({ dismissedPaywallTriggers: [], sessionPaywallShowCount: 0, gratitudePaywallShownThisSession: false });
      },

      setClassifiedPaywallFlowMode: (mode) => {
        set({ classifiedPaywallFlowMode: mode });
      },

      setClassifiedDiscovered: (discovered) => {
        set({ classifiedDiscovered: discovered });
      },

      // POST-PURCHASE CELEBRATION ACTIONS
      setShowPostPurchaseCelebration: (show) => set({ showPostPurchaseCelebration: show }),

      // HINT ACTIONS
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

      incrementAppOpenCount: () => {
        set((state) => ({ appOpenCount: state.appOpenCount + 1 }));
      },

      setHushBurnStyle: (style) => set({ hushBurnStyle: style }),
      setClassifiedBurnStyle: (style) => set({ classifiedBurnStyle: style }),

      // THEME ACTIONS
      setHushTheme: (theme) => set({ hushTheme: theme }),
      setClassifiedTheme: (theme) => set({ classifiedTheme: theme }),
      setDiscretionTheme: (theme) => set({ discretionTheme: theme }),

      // RESPONSE STYLE ACTIONS
      setResponseStyleHush: (style) => set({ responseStyleHush: style }),
      setResponseStyleClassified: (style) => set({ responseStyleClassified: style }),
      setResponseStyleDiscretion: (style) => set({ responseStyleDiscretion: style }),
      getCurrentResponseStyle: () => {
        const state = get();
        return state.flavor === 'HUSH' ? state.responseStyleHush :
               state.flavor === 'CLASSIFIED' ? state.responseStyleClassified :
               state.responseStyleDiscretion;
      },

      // APPEARANCE ACTIONS
      setQuickTransition: (enabled) => set({ quickTransition: enabled }),
      setHighContrastMode: (enabled) => set({ highContrastMode: enabled }),
      setAnimationSounds: (enabled) => set({ animationSounds: enabled }),
      setAnimationSoundsPro: (enabled) => set({ animationSoundsPro: enabled }),

      // SECURITY ACTIONS
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
      setDecoyMode: (isDecoy) => set({
        isDecoyMode: isDecoy,
        // Reset decoyBurned when exiting decoy mode (entering real passcode)
        // This ensures next duress entry shows preset messages, not empty screen
        decoyBurned: isDecoy ? get().decoyBurned : false
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
            passcodeLockoutUntil: lockoutUntil
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

      checkDailyReset: () => {
        const state = get();
        const today = getLocalDateString(new Date()); // Use LOCAL time (not UTC)

        // Simple daily reset: if lastActiveDate is not today, reset
        if (state.lastActiveDate !== today) {
          if (__DEV__) {
            console.log('[DailyReset] Resetting daily count on app start. lastActiveDate:', state.lastActiveDate, 'today:', today);
          }
          set({ dailyCount: 0, lastActiveDate: today });
        } else {
          if (__DEV__) {
            console.log('[DailyReset] No reset needed on app start. lastActiveDate:', state.lastActiveDate, 'today:', today, 'dailyCount:', state.dailyCount);
          }
        }
      },

      addMessage: (text, role) => {
        const { flavor, isDecoyMode } = get();
        const newMessage: Message = {
          id: Date.now().toString(),
          role,
          text,
          timestamp: Date.now(),
          context: flavor,
        };

        // System messages never go to decoy arrays (they're UI alerts, not conversations)
        // In decoy mode, only user/ai messages go to custom decoy arrays
        if (isDecoyMode && role !== 'system') {
          if (flavor === 'HUSH') {
            set((state) => ({
              customDecoyHushMessages: [...state.customDecoyHushMessages, newMessage],
              // Clear decoyBurned flag when new message added (allow display)
              decoyBurned: false
            }));
          } else if (flavor === 'CLASSIFIED') {
            set((state) => ({
              customDecoyClassifiedMessages: [...state.customDecoyClassifiedMessages, newMessage],
              // Clear decoyBurned flag when new message added (allow display)
              decoyBurned: false
            }));
          }
        } else {
          // Real messages OR system messages always go to main array
          set((state) => ({
            messages: [...state.messages, newMessage],
            // Increment privacy counter for AI messages (not decoy, not system)
            totalMessagesProtected: role === 'ai' ? state.totalMessagesProtected + 1 : state.totalMessagesProtected
          }));
        }
      },

      sendMessage: async (text) => {
        const state = get();

        // Check for daily reset before processing message
        state.checkDailyReset();

        // === GAME TRIGGER DETECTION (BEFORE DAILY LIMIT) ===
        // Check if this is a game trigger - if so, don't count against daily limit
        const gameTrigger = detectGameTrigger(text, state.flavor);

        // Only check daily limit for non-game messages
        if (!gameTrigger && state.subscriptionTier === 'FREE' && state.dailyCount >= DAILY_LIMIT) {
            if (__DEV__) {
              console.log('[DailyLimit] Triggering paywall. dailyCount:', state.dailyCount, 'DAILY_LIMIT:', DAILY_LIMIT);
            }
            state.triggerPaywall('daily_limit');
            // Don't add harsh system message - just show friendly paywall modal
            return;
        }

        // Only increment daily count for regular chat messages (not game triggers)
        if (!gameTrigger) {
          const newCount = state.dailyCount + 1;
          if (__DEV__) {
            console.log('[DailyCount] Incrementing:', state.dailyCount, '->', newCount);
          }
          set({ dailyCount: newCount });
        } else {
          if (__DEV__) {
            console.log('[DailyCount] Skipping increment (game trigger detected):', text);
          }
        }

        state.addMessage(text, 'user');
        set({ isTyping: true });

        try {
          // Process game trigger if detected

          if (gameTrigger) {
            // Special handling for unburdening - always show selector (don't block at trigger level)
            // The selector itself will show state and handle paywall for locked modes
            if (gameTrigger.gameId === 'unburdening') {
              Keyboard.dismiss();
              state.startGame('unburdening');
              set({ isTyping: false });
              return;
            }

            // For other games, check if unlocked
            const isUnlocked = state.isGameUnlocked(gameTrigger.gameId);

            if (!isUnlocked) {
              // Determine which paywall to show based on game and unlock reason
              set({ isTyping: false });

              // Special case: Gratitude streak cap (Free tier hit 7-day limit)
              if (gameTrigger.gameId === 'gratitude' && state.gameState.gratitudeStreakCapReached) {
                state.triggerPaywall('gratitude_streak_cap');

                // Different message for first vs subsequent attempts this session
                const isFirstAttempt = !state.gratitudePaywallShownThisSession;
                const message = isFirstAttempt
                  ? `🌟 You've completed 7 days of Gratitude practice! Upgrade to Pro to continue your streak and unlock unlimited access.`
                  : `Gratitude requires Pro (7-day trial complete). Upgrade to keep the practice going.`;

                state.addMessage(message, 'system');
                return;
              }

              // Default: Classified games and other Pro-only games
              // Use classified_discovery (unlimited, doesn't count toward cap)
              state.triggerPaywall('classified_discovery');
              state.addMessage(
                `🔒 ${gameTrigger.gameId.toUpperCase()} requires Pro access. Upgrade to unlock all training protocols.`,
                'system'
              );
              return;
            }

            // Dismiss keyboard before starting game
            Keyboard.dismiss();

            // Game is unlocked - start the game session
            state.startGame(gameTrigger.gameId);

            // Don't add system prompt to chat - games open as overlays
            // (Adding messages causes confusing text to remain after completion)
            set({ isTyping: false });
            return;
          }

          // === NORMAL AI RESPONSE (no game trigger) ===
          // Pass response style to AI engine based on current flavor
          const responseStyle = state.flavor === 'HUSH'
            ? state.responseStyleHush
            : state.flavor === 'CLASSIFIED'
              ? state.responseStyleClassified
              : state.flavor === 'DISCRETION'
                ? state.responseStyleDiscretion
                : undefined;

          const response = await generateResponse(text, state.flavor, responseStyle);
          state.addMessage(response, 'ai');
        } catch (e) {
          state.addMessage('Error: Connection lost.', 'system');
        } finally {
          set({ isTyping: false });
        }
      },

      // PERFORMANCE MODE ACTIONS
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

      startModeDownload: (mode) => set({
        currentlyDownloading: mode,
        modeDownloadProgress: 0,
      }),

      cancelModeDownload: () => set({
        currentlyDownloading: null,
        modeDownloadProgress: 0,
      }),

      setModeDownloadProgress: (progress) => set({ modeDownloadProgress: progress }),

      completeModeDownload: (mode) => set((state) => ({
        modeDownloadState: {
          ...state.modeDownloadState,
          [mode]: 'downloaded',
        },
        currentlyDownloading: null,
        modeDownloadProgress: 0,
        downloadError: null,
        activeMode: mode, // Auto-switch to downloaded mode
      })),

      failModeDownload: (mode, error) => set({
        currentlyDownloading: null,
        modeDownloadProgress: 0,
        downloadError: { mode, error },
      }),

      clearDownloadError: () => set({ downloadError: null }),

      deleteMode: (mode) => set((state) => ({
        modeDownloadState: {
          ...state.modeDownloadState,
          [mode]: 'not_downloaded',
        },
      })),

      setMultiModelEnabled: (enabled) => set({ multiModelEnabled: enabled }),
      setBalancedUpgradeOffered: (offered) => set({ balancedUpgradeOffered: offered }),
      setBalancedUpgradeDeclined: (declined) => set({ balancedUpgradeDeclined: declined }),
      setDeviceCapabilities: (caps) => set({ deviceCapabilities: caps }),
      setProFirstLaunchSeen: (seen) => set({ proFirstLaunchSeen: seen }),

      updateStorageInfo: async () => {
        try {
          const FileSystem = await import('expo-file-system');
          const available = await FileSystem.getFreeDiskStorageAsync();
          const total = await FileSystem.getTotalDiskCapacityAsync();
          set({
            deviceStorageAvailable: available || 0,
            deviceStorageTotal: total || 0,
          });
        } catch (e) {
          if (__DEV__) {
            console.error('Storage check failed:', e);
          }
        }
      },

      // PANIC WIPE ACTION
      setPanicWipeEnabled: (enabled) => set({ panicWipeEnabled: enabled }),

      // GAMIFICATION ACTIONS
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
        const { activeGameId } = gameState.currentSession;

        if (!activeGameId) return;

        set((state) => {
          const progress = state.gameState.gameProgress[activeGameId];
          const updatedProgress = {
            ...progress,
            timesCompleted: completed ? progress.timesCompleted + 1 : progress.timesCompleted,
            highScore: score !== undefined && (progress.highScore === undefined || score > progress.highScore)
              ? score
              : progress.highScore,
            bestTime: time !== undefined && (progress.bestTime === undefined || time < progress.bestTime)
              ? time
              : progress.bestTime,
          };

          // Set unburdening last free use date for Free tier (daily limit)
          const unburdeningLastFreeUse = activeGameId === 'unburdening' && completed && get().subscriptionTier === 'FREE'
            ? getLocalDateString(new Date()) // Use local date string (YYYY-MM-DD), not ISO timestamp
            : state.gameState.unburdeningLastFreeUse;

          return {
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
          };
        });

        // CRITICAL FIX: Check for badge unlocks and update in SAME set() call
        // Previously, calling get().unlockBadge() created nested state updates that didn't persist
        // Now we unlock badges directly in the same state update as endGame
        if (completed) {
          const updatedState = get();
          const finalProgress = updatedState.gameState.gameProgress[activeGameId];
          const sessionData = gameState.currentSession.sessionData; // Capture sessionData before state update clears it
          const subscriptionTier = get().subscriptionTier;
          const currentBadges = updatedState.gameState.badges;

          if (__DEV__) {
            console.log('[endGame] Checking badge unlocks for', activeGameId, 'timesCompleted:', finalProgress.timesCompleted);
          }

          // Collect badges to unlock
          const badgesToUnlock: BadgeId[] = [];

          // Check game-specific completion badges
          if (activeGameId === 'breathe' && finalProgress.timesCompleted >= 10) {
            if (__DEV__) console.log('[endGame] ✅ Centered badge earned (Breathe 10/10)');
            badgesToUnlock.push('centered');
          } else if (activeGameId === 'unburdening') {
            if (__DEV__) {
              console.log('[endGame] 🎮 Unburdening completed! timesCompleted:', finalProgress.timesCompleted);
              console.log('[endGame] Checking badge unlock conditions...');
            }
            if (finalProgress.timesCompleted >= 1) {
              if (__DEV__) console.log('[endGame] ✅ Released badge earned (Unburdening 1/1)');
              badgesToUnlock.push('released');
            }
            if (finalProgress.timesCompleted >= 5) {
              if (__DEV__) console.log('[endGame] ✅ Unburdened badge earned (Unburdening 5/5)');
              badgesToUnlock.push('unburdened');
            }
          } else if (activeGameId === 'zero_day' && finalProgress.timesCompleted >= 3) {
            if (__DEV__) console.log('[endGame] ✅ White Hat badge earned (Zero Day 3/3)');
            badgesToUnlock.push('white_hat');
          } else if (activeGameId === 'defcon') {
            // DEFCON: Strategist badge requires campaign victory (Pro only, Diamond tier)
            const campaign = sessionData.defconCampaign;
            if (campaign?.completed && campaign.outcome === 'victory' && subscriptionTier !== 'FREE') {
              if (__DEV__) console.log('[endGame] ✅ Strategist badge earned (DEFCON victory)');
              badgesToUnlock.push('strategist');
            }
          } else if (activeGameId === 'crisis_management' && score !== undefined && score >= 90) {
            if (__DEV__) console.log('[endGame] ✅ Steady Hand badge earned (Crisis 90%+)');
            badgesToUnlock.push('steady_hand');
          } else if (activeGameId === 'negotiation' && finalProgress.timesCompleted >= 10) {
            if (__DEV__) console.log('[endGame] ✅ Closer badge earned (Negotiation 10/10)');
            badgesToUnlock.push('closer');
          } else if (activeGameId === 'executive_decision' && finalProgress.timesCompleted >= 10) {
            if (__DEV__) console.log('[endGame] ✅ Decisive badge earned (Executive 10/10)');
            badgesToUnlock.push('decisive');
          }

          // Check for Breach Protocol security certified badge (all 5 layers)
          if (activeGameId === 'breach_protocol') {
            const completedLayers = finalProgress.completedLayers || [];
            const skippedLayers = finalProgress.skippedLayers || [];
            // Badge requires all 5 layers completed with 0 skips
            if (completedLayers.length >= 5 && skippedLayers.length === 0) {
              if (__DEV__) console.log('[endGame] ✅ Security Certified badge earned (Breach 5/5, no skips)');
              badgesToUnlock.push('security_certified');
            }
          }

          // Unlock badges in a single state update
          if (badgesToUnlock.length > 0) {
            const updatedBadges = { ...currentBadges };
            let newlyUnlocked: BadgeId | null = null;

            for (const badgeId of badgesToUnlock) {
              // Skip if already unlocked
              if (updatedBadges[badgeId]?.unlockedAt !== null) {
                if (__DEV__) console.log('[endGame] Badge', badgeId, 'already unlocked, skipping');
                continue;
              }

              // Unlock badge
              updatedBadges[badgeId] = {
                ...updatedBadges[badgeId],
                unlockedAt: Date.now(),
              };

              // Set first unlocked badge as newly unlocked (for modal)
              if (!newlyUnlocked) {
                newlyUnlocked = badgeId;
                if (__DEV__) console.log('[endGame] 🏆 Setting newlyUnlockedBadge to', badgeId);
              }
            }

            // Update state with unlocked badges
            set((state) => ({
              gameState: {
                ...state.gameState,
                badges: updatedBadges,
                newlyUnlockedBadge: newlyUnlocked,
              },
            }));

            if (__DEV__) console.log('[endGame] ✅ Badges unlocked in single state update');
          }
        }
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
        if (__DEV__) console.log('[unlockBadge] 🏆 Attempting to unlock badge:', badgeId);
        set((state) => {
          // Safety check: if badge doesn't exist in persisted state, it needs to be created
          const badgeExists = state.gameState.badges[badgeId] !== undefined;
          if (__DEV__) console.log('[unlockBadge] Badge exists in state:', badgeExists);

          // Don't unlock if already unlocked
          if (badgeExists && state.gameState.badges[badgeId].unlockedAt !== null) {
            if (__DEV__) {
              console.log('[unlockBadge] ❌ Badge', badgeId, 'already unlocked at', new Date(state.gameState.badges[badgeId].unlockedAt!).toISOString());
              console.log('[unlockBadge] Skipping unlock (already unlocked)');
            }
            return state;
          }

          // Special handling for backchannel badge: set tier based on discovery hint status
          let badgeTier = badgeExists ? state.gameState.badges[badgeId].tier : 'bronze';
          if (badgeId === 'backchannel') {
            // GLOW (silver) if hints were disabled, EMBER (bronze) if hints were enabled
            badgeTier = state.classifiedDiscoveryUsedHints === false ? 'silver' : 'bronze';
            if (__DEV__) {
              console.log('[unlockBadge] Backchannel badge tier set to', badgeTier, '(hintsEnabled:', state.classifiedDiscoveryUsedHints, ')');
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
          .filter(p => ['interrogation', 'breach_protocol', 'mole_hunt', 'zero_day', 'defcon', 'dead_drop'].includes(p.id))
          .reduce((sum, p) => sum + p.timesPlayed, 0);

        // Tier 2: After 5 uses of Classified games
        if (classifiedUses < 5) return 1;

        // Tier 3: After 14 days Pro (check if account is old enough)
        // For now, we'll use a simpler metric: 10+ total games played
        const totalGamesPlayed = Object.values(gameState.gameProgress)
          .reduce((sum, p) => sum + p.timesPlayed, 0);

        if (totalGamesPlayed < 10) return 2;

        // Tier 4: After completing 5 different games
        const completedGames = Object.values(gameState.gameProgress)
          .filter(p => p.timesCompleted > 0).length;

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

        // Check if played yesterday (streak continues) or today (already counted)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = getLocalDateString(yesterday); // Use LOCAL time (not UTC)

        let newStreak = progress.currentStreak || 0;

        if (progress.lastStreakDate === today) {
          // Already played today, no change
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
        const today = getLocalDateString(now); // Use LOCAL time (not UTC) to match DeadDrop component
        const { gameState } = get();
        const progress = gameState.gameProgress.dead_drop;

        if (__DEV__) {
          console.log('[DeadDrop] forceUpdateDeadDropStreak called');
          console.log('[DeadDrop] today:', today);
          console.log('[DeadDrop] lastStreakDate:', progress.lastStreakDate);
          console.log('[DeadDrop] currentStreak before:', progress.currentStreak);
        }

        // Check if played yesterday (streak continues) or today (already counted)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = getLocalDateString(yesterday); // Use LOCAL time (not UTC)

        let newStreak = progress.currentStreak || 0;

        // For Dead Drop, we ALWAYS update when called (no daily guard)
        // The DeadDrop component already prevents double check-ins with ALREADY_CHECKED_IN state
        if (progress.lastStreakDate === yesterdayString || progress.lastStreakDate === undefined) {
          // Streak continues (played yesterday) or first play
          newStreak += 1;
          if (__DEV__) {
            console.log('[DeadDrop] Incrementing streak to:', newStreak);
          }
        } else if (progress.lastStreakDate === today) {
          // Already checked in today - this shouldn't happen due to UI guard
          // But if it does, don't increment
          if (__DEV__) {
            console.log('[DeadDrop] Already checked in today, returning early');
          }
          return;
        } else {
          // lastStreakDate is NOT today and NOT yesterday
          // Could be from the past (streak broken) OR from the future (UTC migration bug)
          const lastDate = progress.lastStreakDate ? new Date(progress.lastStreakDate + 'T00:00:00') : new Date(0);
          const todayDate = new Date(today + 'T00:00:00');

          if (lastDate > todayDate) {
            // lastStreakDate is in the future (UTC migration bug) - treat as "already checked in yesterday"
            if (__DEV__) {
              console.log('[DeadDrop] Migration: lastStreakDate is in future, treating as yesterday check-in');
            }
            newStreak += 1;
          } else {
            // Streak broken, restart
            newStreak = 1;
            if (__DEV__) {
              console.log('[DeadDrop] Streak broken, resetting to 1');
            }
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

      requestSettingsScreen: (screen) => {
        set({ requestedSettingsScreen: screen });
      },

      isGameUnlocked: (gameId) => {
        const { subscriptionTier, gameState } = get();
        const isPro = subscriptionTier === 'MONTHLY' || subscriptionTier === 'YEARLY';

        // Free tier games (available to everyone)
        if (gameId === 'breathe') return true; // Always available

        // Unburdening: 1 free use per day
        if (gameId === 'unburdening') {
          const lastUse = gameState.unburdeningLastFreeUse;
          if (!lastUse) return true; // Never used

          // Compare local date strings (YYYY-MM-DD format)
          const today = getLocalDateString(new Date());
          const isSameDay = lastUse === today;

          return !isSameDay; // Available if not used today
        }

        if (gameId === 'gratitude' && !gameState.gratitudeStreakCapReached) return true; // Available until 7-day cap

        // All other games require Pro subscription
        // Pro users get immediate access to all games (no progressive unlocking)
        return isPro;
      },

      clearHistory: () => {
        const { flavor, messages, isDecoyMode } = get();

        if (isDecoyMode) {
          // Clear decoy messages for current flavor and mark as burned
          // STAY in decoy mode so new messages go to decoy (safe during duress)
          if (flavor === 'HUSH') {
            set({
              customDecoyHushMessages: [],
              decoyBurned: true  // Mark as burned to prevent preset refill
            });
          } else if (flavor === 'CLASSIFIED') {
            set({
              customDecoyClassifiedMessages: [],
              decoyBurned: true
            });
          }
          // Note: We STAY in decoy mode after burning for safety
        } else {
          // Filters out messages from the CURRENT context
          set({ messages: messages.filter(m => m.context !== flavor) });
        }
      },
    }),
    {
      name: 'discrete-zero-storage',
      // TEMPORARY: Using plain AsyncStorage to debug crash
      // TODO: Re-enable EncryptedStorage after identifying crash cause
      storage: createJSONStorage(() => AsyncStorage),
      // Don't persist sensitive security state or session-based paywall caps
      partialize: (state) => ({
        ...state,
        // Exclude these from persistence (they're in SecureStore or ephemeral)
        isLocked: undefined,
        isDecoyMode: undefined,
        // Exclude session-based paywall frequency caps (should reset on app restart)
        dismissedPaywallTriggers: undefined,
        sessionPaywallShowCount: undefined,
        gratitudePaywallShownThisSession: undefined,
      }),
      // Validate activeMode after rehydration
      onRehydrateStorage: () => (state) => {
        if (state) {
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
        }
      },
    }
  )
);

// Export constants for use in other components
export { SESSION_PAYWALL_CAP };
