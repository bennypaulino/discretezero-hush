import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useChatStore } from '../state/rootStore';
import { AppFlavor } from '../../config';

interface UsageIndicatorProps {
  flavor: 'HUSH' | 'CLASSIFIED';
  onPress?: () => void;
}

const DAILY_LIMIT = 8;
const SHOW_AFTER_COUNT = 4;

export const UsageIndicator = ({ flavor, onPress }: UsageIndicatorProps) => {
  const { dailyCount, subscriptionTier } = useChatStore();
  const isPro = subscriptionTier !== 'FREE';

  // Don't show if user is Pro or hasn't reached the threshold
  if (isPro || dailyCount < SHOW_AFTER_COUNT) {
    return null;
  }

  const remaining = Math.max(0, DAILY_LIMIT - dailyCount); // Prevent negative
  const isUrgent = remaining <= 2;

  // Theme based on flavor
  const theme = flavor === 'CLASSIFIED'
    ? {
        bg: '#1A0808',
        text: isUrgent ? '#FF6666' : '#FF3333',
        icon: 'warning' as const,
        message: `[ WARNING ] ${remaining} EXCHANGES REMAINING`,
      }
    : {
        bg: 'rgba(255, 255, 255, 0.08)',
        text: isUrgent ? '#FF9500' : '#8B5CF6',
        icon: 'flash' as const,
        message: `${remaining} left today`,
      };

  const isTerminal = flavor === 'CLASSIFIED';

  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={[styles.container, { backgroundColor: theme.bg }]}
    >
      <Ionicons name={theme.icon} size={16} color={theme.text} style={{ marginRight: 8 }} />
      <Text style={[styles.text, { color: theme.text, fontFamily: isTerminal ? 'Courier' : 'System' }]}>
        {theme.message}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 8,
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
  },
});
