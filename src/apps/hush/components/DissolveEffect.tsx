import React, { useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { useAppTheme } from '../../../core/hooks/useAppTheme';
import { useAnimatedValue } from '../../../core/hooks/useAnimatedValue';

interface DissolveEffectProps {
  onComplete: () => void;
}

const AnimatedBlur = Animated.createAnimatedComponent(BlurView);

export const DissolveEffect = ({ onComplete }: DissolveEffectProps) => {
  const intensity = useAnimatedValue(0);
  const opacity = useAnimatedValue(0);
  const activeTheme = useAppTheme();

  useEffect(() => {
    const animation = Animated.parallel([
      // 1. Ramp up the Blur
      Animated.timing(intensity, {
        toValue: 20, // Max Blur Intensity
        duration: 1200,
        useNativeDriver: false, // Blur intensity doesn't support native driver
      }),
      // 2. Fade overlay to background color
      Animated.timing(opacity, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    ]);

    animation.start(() => onComplete());

    return () => {
      animation.stop();
      // Note: intensity and opacity cleanup handled by useAnimatedValue
    };
    // P2 fix: Empty deps array - intensity/opacity are stable refs from useAnimatedValue
    // Animation runs once on mount, onComplete captured in closure
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 999 }]} pointerEvents="none">

      {/* 1. BLUR LAYER */}
      <AnimatedBlur
        intensity={intensity}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />

      {/* 2. FADE LAYER (Solid Background Color) */}
      <Animated.View
        style={[
            StyleSheet.absoluteFill,
            {
                backgroundColor: activeTheme.colors.background,
                opacity
            }
        ]}
      />
    </View>
  );
};
