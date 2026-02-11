/**
 * SettingsOptionButton
 *
 * Option button component for settings selections (membership tiers, burn styles, etc.).
 * Supports selected state, locked state, and theme-aware styling.
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { SettingsTheme } from '../../../themes/settingsThemeEngine';
import type { ClassifiedTheme } from '../../../themes/themes';
import { getClassifiedSelectedBg } from '../../../themes/themeHelpers';

interface SettingsOptionButtonProps {
  label: string;
  isSelected: boolean;
  onSelect: () => void;
  locked?: boolean;
  theme: SettingsTheme;
  effectiveMode: string;
  classifiedTheme: ClassifiedTheme;
}

const SettingsOptionButtonComponent: React.FC<SettingsOptionButtonProps> = ({
  label,
  isSelected,
  onSelect,
  locked,
  theme,
  effectiveMode,
  classifiedTheme,
}) => {
  const selectedBg =
    effectiveMode === 'DISCRETION'
      ? '#000'
      : theme.isTerminal
      ? getClassifiedSelectedBg(effectiveMode, classifiedTheme)
      : 'rgba(139, 92, 246, 0.2)';

  // For Discretion, unselected items have lower opacity
  const getOpacity = () => {
    if (locked) return 0.5;
    if (effectiveMode === 'DISCRETION' && !isSelected) return 0.4;
    return 1;
  };

  return (
    <TouchableOpacity
      onPress={() => {
        if (!locked) {
          Haptics.selectionAsync();
          onSelect();
        }
      }}
      style={[
        styles.optionBtn,
        {
          borderColor: isSelected ? theme.accent : 'transparent',
          backgroundColor: isSelected ? selectedBg : theme.card,
          borderWidth: isSelected ? 2 : 0,
          opacity: getOpacity(),
        },
      ]}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected, disabled: locked }}
      accessibilityHint={
        locked ? 'Requires Pro subscription' : isSelected ? 'Currently selected' : `Select ${label}`
      }
    >
      <Text
        style={[
          styles.optionText,
          { color: isSelected ? theme.accent : theme.text, fontFamily: theme.fontBody },
        ]}
      >
        {theme.isTerminal ? `[ ${label.toUpperCase()} ]` : label}
      </Text>
      {locked && <Ionicons name="lock-closed" size={12} color={theme.subtext} style={{ marginLeft: 6 }} />}
    </TouchableOpacity>
  );
};

export const SettingsOptionButton = React.memo(SettingsOptionButtonComponent);

const styles = StyleSheet.create({
  optionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  optionText: { fontSize: 14 },
});
