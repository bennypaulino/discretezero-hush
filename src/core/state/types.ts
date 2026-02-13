/**
 * Shared Types for Zustand Store Slices
 *
 * This file contains common types used across multiple store slices.
 * Domain-specific types should be defined in their respective slice files.
 */

import type { HushTheme, ClassifiedTheme, DiscretionTheme } from '../themes/themes';

// FLAVOR & THEME TYPES
export type AppFlavor = 'HUSH' | 'CLASSIFIED' | 'DISCRETION';
export type { HushTheme, ClassifiedTheme, DiscretionTheme };

// SUBSCRIPTION TYPES
export type SubscriptionTier = 'FREE' | 'MONTHLY' | 'YEARLY';

// ANIMATION TYPES
export type HushBurnType = 'clear' | 'disintegrate' | 'dissolve' | 'ripple' | 'rain';
export type ClassifiedBurnType = 'cls' | 'purge' | 'redaction' | 'corruption' | 'matrix';

// RESPONSE STYLE TYPES
export type ResponseStyleHush = 'quick' | 'thoughtful';
export type ResponseStyleClassified = 'operator' | 'analyst';
export type ResponseStyleDiscretion = 'warm' | 'formal';

// DECOY PRESETS
export type DecoyPreset = 'AUTO' | 'STUDY_HELPER' | 'MEAL_PLANNING' | 'GENERAL_ASSISTANT' | 'CUSTOM';

// PERFORMANCE MODES
export type PerformanceMode = 'efficient' | 'balanced' | 'quality';

export interface ModeDownloadState {
  efficient: 'not_downloaded' | 'downloading' | 'downloaded';
  balanced: 'not_downloaded' | 'downloading' | 'downloaded';
  quality: 'not_downloaded' | 'downloading' | 'downloaded';
}

// GAMIFICATION TYPES
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

export interface Badge {
  id: BadgeId;
  name: string;
  description: string;
  tier: BadgeTier;
  unlockedAt: number | null;
}

export interface GameProgress {
  id: GameId;
  timesPlayed: number;
  timesCompleted: number;
  lastPlayedAt: number | null;
  highScore?: number;
  bestTime?: number;
  currentStreak?: number;
  longestStreak?: number;
  lastStreakDate?: string;
  completedFlawless?: boolean;
  flawlessVisual?: 'star' | 'crown' | 'trophy';
  mulliganBudget?: number;
  lastMulliganRefresh?: string;
  completedPhases?: number[]; // For DEFCON phase persistence: [1, 2, 3] means phases 1-3 done
}

// DEVICE CAPABILITIES
export interface DeviceCapabilities {
  modelName: string;
  chipGeneration: string;
  totalMemoryGB: number;
  recommendedMode: PerformanceMode;
  canUpgradeToBalanced: boolean;
}

// MESSAGE TYPES
export interface Message {
  id: string;
  role: 'user' | 'system' | 'ai';
  text: string;
  timestamp: number;
  context: AppFlavor;
  isComplete?: boolean; // Streaming: true when message fully generated (backward compatible)
}
