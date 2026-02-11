/**
 * SettingsSubHeader
 *
 * Sub-screen header component with back button and title.
 * Used for all non-main settings screens.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SettingsTheme } from '../../../themes/settingsThemeEngine';

interface SettingsSubHeaderProps {
  title: string;
  onBack: () => void;
  theme: SettingsTheme;
}

const SettingsSubHeaderComponent: React.FC<SettingsSubHeaderProps> = ({ title, onBack, theme }) => {
  return (
    <View style={styles.subHeader}>
      <TouchableOpacity
        onPress={onBack}
        style={styles.backBtn}
        accessibilityLabel="Back"
        accessibilityRole="button"
        accessibilityHint="Return to previous screen"
      >
        <Ionicons name="chevron-back" size={24} color={theme.accent} />
        <Text style={[styles.backText, { color: theme.accent, fontFamily: theme.fontBody }]}>
          {theme.isTerminal ? 'BACK' : 'Back'}
        </Text>
      </TouchableOpacity>
      <Text style={[styles.subTitle, { color: theme.text, fontFamily: theme.fontBody }]}>
        {theme.isTerminal ? title.toUpperCase() : title}
      </Text>
      <View style={{ width: 70 }} />
    </View>
  );
};

export const SettingsSubHeader = React.memo(SettingsSubHeaderComponent);

const styles = StyleSheet.create({
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    marginBottom: 16,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', width: 70 },
  backText: { fontSize: 16 },
  subTitle: { fontSize: 17, fontWeight: '600' },
});
