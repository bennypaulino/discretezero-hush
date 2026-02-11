/**
 * SettingsToggleRow
 *
 * Toggle row component for boolean settings (appearance options, etc.).
 * Displays label and iOS-style switch.
 */

import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { SettingsTheme } from '../../../themes/settingsThemeEngine';

interface SettingsToggleRowProps {
  label: string;
  value: boolean;
  onToggle: (value: boolean) => void;
  theme: SettingsTheme;
}

const SettingsToggleRowComponent: React.FC<SettingsToggleRowProps> = ({ label, value, onToggle, theme }) => {
  return (
    <View style={[styles.toggleRow, { backgroundColor: theme.card }]}>
      <Text style={[styles.toggleLabel, { color: theme.text, fontFamily: theme.fontBody }]}>
        {theme.isTerminal ? label.toUpperCase() : label}
      </Text>
      <Switch
        value={value}
        onValueChange={(v) => {
          Haptics.selectionAsync();
          onToggle(v);
        }}
        trackColor={{ false: theme.isTerminal ? '#330000' : '#3A3A3C', true: theme.accent }}
        thumbColor="#fff"
      />
    </View>
  );
};

export const SettingsToggleRow = React.memo(SettingsToggleRowComponent);

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
  },
  toggleLabel: { fontSize: 16 },
});
