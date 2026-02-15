/**
 * Shared types for Settings UI components
 */

import type { AppFlavor } from '../../../../config';

/**
 * All available settings screens
 */
export type Screen =
  | 'main'
  | 'security'
  | 'appearance'
  | 'clearStyle'
  | 'responseStyle'
  | 'passcodeSetup'
  | 'duressSetup'
  | 'changePasscode'
  | 'decoyPreset'
  | 'about'
  | 'privacyVerification'
  | 'privacyDashboard'
  | 'achievementGallery'
  | 'ai'
  | 'performanceModes'
  | 'conversationMemory'
  | 'advancedPerformance'
  | 'testing';

/**
 * Security-related screens
 */
export type SecurityScreen =
  | 'security'
  | 'passcodeSetup'
  | 'duressSetup'
  | 'changePasscode'
  | 'decoyPreset';

/**
 * AI/Performance-related screens
 */
export type AIScreen =
  | 'ai'
  | 'performanceModes'
  | 'conversationMemory'
  | 'advancedPerformance';

/**
 * Appearance-related screens
 */
export type AppearanceScreen =
  | 'appearance'
  | 'clearStyle'
  | 'responseStyle';

/**
 * About/Privacy-related screens
 */
export type AboutScreen =
  | 'about'
  | 'achievementGallery'
  | 'privacyVerification'
  | 'privacyDashboard';

/**
 * Valid navigation targets (can navigate to any screen or main)
 */
export type NavigationTarget = Screen;

/**
 * Props for SettingsModal component (public API)
 */
export interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  mode?: AppFlavor | 'BLOCKER';
  initialScreen?: string; // Screen to open to (e.g., 'about' for Achievement Gallery)
}
