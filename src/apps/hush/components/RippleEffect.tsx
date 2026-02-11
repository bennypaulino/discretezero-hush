import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Easing } from 'react-native';
import { BlurView } from 'expo-blur';
import { useAppTheme } from '../../../core/hooks/useAppTheme'
import { useAnimatedValue } from '../../../core/hooks/useAnimatedValue';;

const { width, height } = Dimensions.get('window');
const MAX_SIZE = Math.max(width, height) * 2.5;

const AnimatedBlur = Animated.createAnimatedComponent(BlurView);

interface RippleEffectProps {
  onComplete: () => void;
}

const RippleWave = ({ delay }: { delay: number }) => {
  const anim = useAnimatedValue(0);
  const activeTheme = useAppTheme();

  useEffect(() => {
    const animation = Animated.timing(anim, {
      toValue: 1,
      duration: 5500, // Increased from 4000 to 5500 (Much Slower)
      delay: delay,
      // Even gentler curve: Fast start, then near-stop coasting
      easing: Easing.bezier(0.2, 1, 0.4, 1),
      useNativeDriver: true,
    });

    animation.start();

    return () => {
      animation.stop();
      anim.stopAnimation();
    };
  }, [anim, delay]);

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 1],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 0.1, 0.5, 1],
    outputRange: [0, 0.12, 0.06, 0], // Slightly lower opacity for subtler look
  });

  return (
    <Animated.View
      style={[
        styles.wave,
        {
          opacity,
          transform: [{ scale }],
          backgroundColor: activeTheme.colors.text,
        },
      ]}
    />
  );
};

export const RippleEffect = ({ onComplete }: RippleEffectProps) => {
  const blurIntensity = useAnimatedValue(0);
  const overlayOpacity = useAnimatedValue(0);
  const activeTheme = useAppTheme();

  useEffect(() => {
    const animation = Animated.parallel([
      // 1. STAGGERED BLUR: Slower accumulation
      Animated.sequence([
        Animated.timing(blurIntensity, {
            toValue: 5,
            duration: 1000,
            useNativeDriver: false,
        }),
        Animated.timing(blurIntensity, {
            toValue: 15,
            duration: 1000,
            useNativeDriver: false,
        }),
        Animated.timing(blurIntensity, {
            toValue: 30,
            duration: 1000,
            useNativeDriver: false,
        }),
        Animated.timing(blurIntensity, {
            toValue: 60,
            duration: 1500, // Longer final wash
            useNativeDriver: false,
        }),
      ]),

      // 2. FINAL FADE: Delayed significantly
      Animated.sequence([
        Animated.delay(3500), // Wait longer before fading out
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 2000, // Very slow exit
          useNativeDriver: true,
        }),
      ]),
    ]);

    animation.start(() => onComplete());

    return () => {
      animation.stop();
      blurIntensity.stopAnimation();
      overlayOpacity.stopAnimation();
    };
  }, [blurIntensity, overlayOpacity, onComplete]);

  return (
    <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', zIndex: 999 }]} pointerEvents="none">

      {/* RIPPLES: Wider spacing (1.2s gap) */}
      <RippleWave delay={0} />
      <RippleWave delay={1200} />
      <RippleWave delay={2400} />

      {/* BLUR LAYER */}
      <AnimatedBlur
        intensity={blurIntensity}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />

      {/* SOLID OVERLAY */}
      <Animated.View
        style={[
            StyleSheet.absoluteFill,
            {
                backgroundColor: activeTheme.colors.background,
                opacity: overlayOpacity
            }
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wave: {
    position: 'absolute',
    width: MAX_SIZE,
    height: MAX_SIZE,
    borderRadius: MAX_SIZE / 2,
  },
});
