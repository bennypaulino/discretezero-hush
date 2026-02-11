/**
 * SettingsSecurityRow
 *
 * Security row component for security settings screen.
 * Displays icon, label, sublabel, optional "On" badge, and chevron.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SettingsTheme } from '../../../themes/settingsThemeEngine';
import type { ClassifiedTheme } from '../../../themes/themes';
import { getClassifiedSelectedBg } from '../../../themes/themeHelpers';

interface SettingsSecurityRowProps {
  icon: string;
  label: string;
  sublabel: string;
  isSet: boolean;
  onPress: () => void;
  theme: SettingsTheme;
  classifiedTheme: ClassifiedTheme;
  effectiveMode: string;
}

const SettingsSecurityRowComponent: React.FC<SettingsSecurityRowProps> = ({
  icon,
  label,
  sublabel,
  isSet,
  onPress,
  theme,
  classifiedTheme,
  effectiveMode,
}) => {
  return (
    <TouchableOpacity
      style={[styles.securityRow, { backgroundColor: theme.card }]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={`${label}, ${sublabel}`}
      accessibilityRole="button"
      accessibilityState={{ selected: isSet }}
      accessibilityHint={`Opens ${label} settings`}
    >
      <View style={styles.securityRowLeft}>
        <View
          style={[
            styles.navIcon,
            {
              backgroundColor: theme.isTerminal
                ? getClassifiedSelectedBg(effectiveMode, classifiedTheme)
                : 'rgba(139, 92, 246, 0.2)',
            },
          ]}
        >
          <Ionicons name={icon as any} size={20} color={theme.accent} />
        </View>
        <View>
          <Text style={[styles.navLabel, { color: theme.text, fontFamily: theme.fontBody }]}>
            {theme.isTerminal ? label.toUpperCase() : label}
          </Text>
          <Text style={[styles.navSublabel, { color: theme.subtext, fontFamily: theme.fontBody }]}>
            {theme.isTerminal ? sublabel.toUpperCase() : sublabel}
          </Text>
        </View>
      </View>
      <View style={styles.navRowRight}>
        {isSet && (
          <View
            style={[
              styles.badge,
              { backgroundColor: theme.isTerminal ? '#1A3300' : 'rgba(52, 199, 89, 0.2)' },
            ]}
          >
            <Text style={[styles.badgeText, { color: theme.isTerminal ? '#66FF00' : '#34C759' }]}>
              {theme.isTerminal ? 'ACTIVE' : 'On'}
            </Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={18} color={theme.subtext} />
      </View>
    </TouchableOpacity>
  );
};

export const SettingsSecurityRow = React.memo(SettingsSecurityRowComponent);

const styles = StyleSheet.create({
  securityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
  },
  securityRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  navIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  navLabel: { fontSize: 16, fontWeight: '500' },
  navSublabel: { fontSize: 13, marginTop: 2 },
  navRowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '600' },
});
