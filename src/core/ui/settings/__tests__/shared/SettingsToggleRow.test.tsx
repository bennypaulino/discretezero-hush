/**
 * SettingsToggleRow Tests
 *
 * Test suite for SettingsToggleRow shared component.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SettingsToggleRow } from '../../shared/SettingsToggleRow';

describe('SettingsToggleRow', () => {
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
      <SettingsToggleRow
        label="High Contrast Mode"
        sublabel="Increase text visibility"
        value={false}
        onToggle={() => {}}
        theme={mockTheme}
      />
    );

    expect(getByText('High Contrast Mode')).toBeTruthy();
    expect(getByText('Increase text visibility')).toBeTruthy();
  });

  it('should call onToggle when switch is toggled', () => {
    const onToggle = jest.fn();
    const { getByA11yRole } = render(
      <SettingsToggleRow
        label="High Contrast Mode"
        sublabel="Increase text visibility"
        value={false}
        onToggle={onToggle}
        theme={mockTheme}
      />
    );

    const toggle = getByA11yRole('switch');
    fireEvent(toggle, 'onValueChange', true);

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  // TODO: Add tests for locked state
  // TODO: Add tests for terminal mode formatting
  // TODO: Add tests for accessibility
});
