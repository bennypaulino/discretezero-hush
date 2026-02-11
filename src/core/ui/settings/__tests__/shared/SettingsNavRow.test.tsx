/**
 * SettingsNavRow Tests
 *
 * Test suite for SettingsNavRow shared component.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SettingsNavRow } from '../../shared/SettingsNavRow';

describe('SettingsNavRow', () => {
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
      <SettingsNavRow
        icon="shield-checkmark"
        label="Security"
        sublabel="Passcode & privacy"
        onPress={() => {}}
        theme={mockTheme}
        effectiveMode="HUSH"
        classifiedTheme="TERMINAL_RED"
      />
    );

    expect(getByText('Security')).toBeTruthy();
    expect(getByText('Passcode & privacy')).toBeTruthy();
  });

  it('should call onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByA11yRole } = render(
      <SettingsNavRow
        icon="shield-checkmark"
        label="Security"
        sublabel="Passcode & privacy"
        onPress={onPress}
        theme={mockTheme}
        effectiveMode="HUSH"
        classifiedTheme="TERMINAL_RED"
      />
    );

    const button = getByA11yRole('button');
    fireEvent.press(button);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('should render badge when provided', () => {
    const { getByText } = render(
      <SettingsNavRow
        icon="shield-checkmark"
        label="Security"
        sublabel="Passcode & privacy"
        onPress={() => {}}
        badge="New"
        theme={mockTheme}
        effectiveMode="HUSH"
        classifiedTheme="TERMINAL_RED"
      />
    );

    expect(getByText('New')).toBeTruthy();
  });

  it('should uppercase labels in terminal mode', () => {
    const terminalTheme = { ...mockTheme, isTerminal: true };
    const { getByText } = render(
      <SettingsNavRow
        icon="shield-checkmark"
        label="Security"
        sublabel="Passcode & privacy"
        onPress={() => {}}
        theme={terminalTheme}
        effectiveMode="CLASSIFIED"
        classifiedTheme="TERMINAL_RED"
      />
    );

    expect(getByText('SECURITY')).toBeTruthy();
    expect(getByText('PASSCODE & PRIVACY')).toBeTruthy();
  });

  // TODO: Add tests for accessibility props
  // TODO: Add tests for theme-specific icon backgrounds
});
