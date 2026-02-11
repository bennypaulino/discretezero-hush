/**
 * SettingsNavRow
 *
 * Navigation row component for main settings screen.
 * Displays icon, label, sublabel, optional badge, and chevron.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { SettingsTheme } from '../../../themes/settingsThemeEngine';
import type { ClassifiedTheme } from '../../../themes/themes';
import { getClassifiedSelectedBg } from '../../../themes/themeHelpers';

interface SettingsNavRowProps {
  icon: string;
  label: string;
  sublabel: string;
  onPress: () => void;
  badge?: string;
  theme: SettingsTheme;
  effectiveMode: string;
  classifiedTheme: ClassifiedTheme;
}

const SettingsNavRowComponent: React.FC<SettingsNavRowProps> = ({
  icon,
  label,
  sublabel,
  onPress,
  badge,
  theme,
  effectiveMode,
  classifiedTheme,
}) => {
  const iconBg =
    effectiveMode === 'DISCRETION'
      ? '#000'
      : theme.isTerminal
      ? getClassifiedSelectedBg(effectiveMode, classifiedTheme)
      : 'rgba(139, 92, 246, 0.15)';

  return (
    <TouchableOpacity
      style={[styles.navRow, { backgroundColor: theme.card }]}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      activeOpacity={0.7}
      accessibilityLabel={`${label}, ${sublabel}`}
      accessibilityRole="button"
      accessibilityHint={`Opens ${label} settings`}
    >
      <View style={styles.navRowLeft}>
        <View style={[styles.navIcon, { backgroundColor: iconBg }]}>
          <Ionicons name={icon as any} size={20} color={theme.accent} />
        </View>
        <View style={styles.navTextContainer}>
          <Text
            style={[
              styles.navLabel,
              {
                color: effectiveMode === 'DISCRETION' ? '#FFFFFF' : theme.text,
                fontFamily: theme.fontBody,
              },
            ]}
          >
            {theme.isTerminal ? label.toUpperCase() : label}
          </Text>
          <Text style={[styles.navSublabel, { color: theme.subtext, fontFamily: theme.fontBody }]}>
            {theme.isTerminal ? sublabel.toUpperCase() : sublabel}
          </Text>
        </View>
      </View>
      <View style={styles.navRowRight}>
        {badge && (
          <View
            style={[
              styles.badge,
              { backgroundColor: theme.isTerminal ? '#1A3300' : 'rgba(52, 199, 89, 0.2)' },
            ]}
          >
            <Text style={[styles.badgeText, { color: theme.isTerminal ? '#66FF00' : '#34C759' }]}>
              {badge}
            </Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={18} color={theme.subtext} />
      </View>
    </TouchableOpacity>
  );
};

export const SettingsNavRow = React.memo(SettingsNavRowComponent);

const styles = StyleSheet.create({
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
  },
  navRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  navRowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  navTextContainer: { flex: 1 },
  navLabel: { fontSize: 16, fontWeight: '500' },
  navSublabel: { fontSize: 13, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '600' },
});
