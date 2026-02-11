/**
 * SettingsSubHeader Tests
 *
 * Test suite for SettingsSubHeader shared component.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SettingsSubHeader } from '../../shared/SettingsSubHeader';

describe('SettingsSubHeader', () => {
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

  it('should render with title', () => {
    const { getByText } = render(
      <SettingsSubHeader
        title="Security"
        onBack={() => {}}
        theme={mockTheme}
      />
    );

    expect(getByText('Security')).toBeTruthy();
  });

  it('should call onBack when back button pressed', () => {
    const onBack = jest.fn();
    const { getByA11yRole } = render(
      <SettingsSubHeader
        title="Security"
        onBack={onBack}
        theme={mockTheme}
      />
    );

    const backButton = getByA11yRole('button');
    fireEvent.press(backButton);

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  // TODO: Add tests for terminal mode formatting
  // TODO: Add tests for accessibility
});
