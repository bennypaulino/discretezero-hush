/**
 * SettingsModal (Thin Wrapper)
 *
 * Backward-compatible wrapper for SettingsContainer.
 * Maintains the same public API while delegating to the refactored component architecture.
 *
 * Refactored from 4046-line mega-component to domain-specific sub-components:
 * - SecuritySettings (5 screens)
 * - AISettings (5 screens)
 * - AppearanceSettings (3 screens)
 * - AboutSettings (4 screens)
 * - TestingSettings (1 screen - DEV only)
 *
 * See /legacy/SettingsModal.tsx.2026-02-07-backup for original implementation.
 */

import React from 'react';
import type { AppFlavor } from '../state/types';
import { SettingsContainer } from './settings/SettingsContainer';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  mode?: AppFlavor | 'BLOCKER';
  initialScreen?: string;
}

/**
 * SettingsModal component - Thin wrapper for SettingsContainer
 *
 * @param visible - Whether modal is visible
 * @param onClose - Callback when modal closes
 * @param mode - Optional mode override (defaults to current flavor)
 * @param initialScreen - Optional initial screen to navigate to
 */
export const SettingsModal: React.FC<SettingsModalProps> = (props) => {
  return <SettingsContainer {...props} />;
};

// Export types for backward compatibility
export type { SettingsModalProps };
