/**
 * SettingsSecurityRow Tests
 *
 * Test suite for SettingsSecurityRow shared component.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SettingsSecurityRow } from '../../shared/SettingsSecurityRow';

describe('SettingsSecurityRow', () => {
  const mockTheme = {
    bg: 'transparent',
    text: '#FFFFFF',
    subtext: 'rgba(255, 255, 255, 0.6)',
    accent: '#8B5CF6',
    card: 'rgba(255, 255, 255, 0.12)',
    fontHeader: 'System',
    fontBody: 'System',
    label: 'Settings',
    blurTint: 'dark' as const,
    danger: '#FF6B6B',
    isTerminal: false,
    divider: 'rgba(255, 255, 255, 0.1)',
  };

  it('should render with label and sublabel', () => {
    const { getByText } = render(
      <SettingsSecurityRow
        icon="lock-closed"
        label="Passcode Lock"
        sublabel="Set up app lock code"
        isSet={false}
        onPress={() => {}}
        theme={mockTheme}
        classifiedTheme="TERMINAL_RED"
        effectiveMode="HUSH"
      />
    );

    expect(getByText('Passcode Lock')).toBeTruthy();
    expect(getByText('Set up app lock code')).toBeTruthy();
  });

  it('should show "On" badge when isSet is true', () => {
    const { getByText } = render(
      <SettingsSecurityRow
        icon="lock-closed"
        label="Passcode Lock"
        sublabel="Set up app lock code"
        isSet={true}
        onPress={() => {}}
        theme={mockTheme}
        classifiedTheme="TERMINAL_RED"
        effectiveMode="HUSH"
      />
    );

    expect(getByText('On')).toBeTruthy();
  });

  // TODO: Add tests for accessibility labels
  // TODO: Add tests for terminal mode formatting
  // TODO: Add tests for onPress handler
});
