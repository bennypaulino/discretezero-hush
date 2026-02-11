import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useAppTheme } from '../../../core/hooks/useAppTheme'
import { useAnimatedValue } from '../../../core/hooks/useAnimatedValue';;

interface CLSEffectProps {
  onComplete: () => void;
}

export const CLSEffect = ({ onComplete }: CLSEffectProps) => {
  const flashOpacity = useAnimatedValue(0);
  const activeTheme = useAppTheme();

  // Determine flash color and opacity based on theme
  let flashColor: string;
  let maxOpacity: number;

  switch (activeTheme.name) {
    case 'TERMINAL_RED':
      flashColor = activeTheme.colors.primary; // Bright red
      maxOpacity = 0.75;
      break;
    case 'TERMINAL_AMBER':
      flashColor = activeTheme.colors.primary; // Bright amber
      maxOpacity = 0.75;
      break;
    case 'MATRIX_GREEN':
      flashColor = activeTheme.colors.primary; // Neon green
      maxOpacity = 0.75;
      break;
    case 'CYBERPUNK':
      flashColor = activeTheme.colors.accent; // Bright magenta/pink
      maxOpacity = 0.75;
      break;
    case 'STEALTH':
      flashColor = activeTheme.colors.primary; // Gray
      maxOpacity = 0.15; // Very subtle for stealth
      break;
    default:
      flashColor = 'rgba(255, 255, 255, 0.75)'; // Fallback white
      maxOpacity = 0.75;
  }

  useEffect(() => {
    // Sharp terminal CLS flash:
    // Flash in (100ms) → Flash out (100ms)
    // Total: 200ms
    Animated.sequence([
      // Flash in
      Animated.timing(flashOpacity, {
        toValue: maxOpacity,
        duration: 100,
        useNativeDriver: true,
      }),
      // Flash out
      Animated.timing(flashOpacity, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => onComplete());
  }, [maxOpacity]);

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 999 }]} pointerEvents="none">
      {/* Sharp screen flash (terminal clear screen effect) */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: flashColor,
            opacity: flashOpacity,
          },
        ]}
      />
    </View>
  );
};
