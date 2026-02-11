import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Dimensions, Easing } from 'react-native';
import { BlurView } from 'expo-blur';
import { useAppTheme } from '../../../core/hooks/useAppTheme'
import { useAnimatedValue } from '../../../core/hooks/useAnimatedValue';;

const { width, height } = Dimensions.get('window');

const AnimatedBlur = Animated.createAnimatedComponent(BlurView);

// CONFIGURATION - Gentle rain
const RIPPLE_COUNT = 25; // Multiple gentle raindrops
const ANIMATION_DURATION = 4000; // 4 seconds total

// Helper for randomness
const random = (min: number, max: number) => Math.random() * (max - min) + min;

interface RainRippleProps {
  x: number;
  y: number;
  delay: number;
}

const RainRipple = ({ x, y, delay }: RainRippleProps) => {
  const anim = useAnimatedValue(0);
  const activeTheme = useAppTheme();

  useEffect(() => {
    const animation = Animated.timing(anim, {
      toValue: 1,
      duration: 2000, // Each ripple expands over 2 seconds
      delay: delay,
      easing: Easing.out(Easing.ease),
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
    inputRange: [0, 0.2, 0.6, 1],
    outputRange: [0, 0.3, 0.15, 0],
  });

  // Each ripple is smaller than the giant Ripple effect
  const rippleSize = 150;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x - rippleSize / 2,
        top: y - rippleSize / 2,
        width: rippleSize,
        height: rippleSize,
        borderRadius: rippleSize / 2,
        borderWidth: 2,
        borderColor: activeTheme.colors.primary,
        opacity: opacity,
        transform: [{ scale }],
      }}
    />
  );
};

export const RainEffect = ({ onComplete }: { onComplete: () => void }) => {
  const blurIntensity = useAnimatedValue(0);
  const overlayOpacity = useAnimatedValue(0);
  const [showBlur, setShowBlur] = useState(false);
  const activeTheme = useAppTheme();

  useEffect(() => {
    // Only show blur component after 2500ms
    const blurTimer = setTimeout(() => setShowBlur(true), 2500);

    const animation = Animated.parallel([
      // Progressive blur as raindrops accumulate - 2500-3700ms (accelerating)
      Animated.sequence([
        Animated.delay(2500), // Messages clear for 2.5s while rain builds up
        Animated.timing(blurIntensity, {
          toValue: 5,
          duration: 400, // Quick ramp
          useNativeDriver: false,
        }),
        Animated.timing(blurIntensity, {
          toValue: 10,
          duration: 300, // Faster
          useNativeDriver: false,
        }),
        Animated.timing(blurIntensity, {
          toValue: 15,
          duration: 200, // Faster
          useNativeDriver: false,
        }),
        Animated.timing(blurIntensity, {
          toValue: 20,
          duration: 200, // Fastest
          useNativeDriver: false,
        }),
        Animated.timing(blurIntensity, {
          toValue: 25,
          duration: 100, // Fastest
          useNativeDriver: false,
        }),
      ]),

      // Final fade to solid overlay - 3500-4000ms
      Animated.sequence([
        Animated.delay(3500), // Messages persist blurred until final fade
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]);

    animation.start(() => onComplete());

    return () => {
      clearTimeout(blurTimer);
      animation.stop();
      blurIntensity.stopAnimation();
      overlayOpacity.stopAnimation();
    };
  }, [blurIntensity, overlayOpacity, onComplete]);

  // Generate ripples at random positions with staggered timing
  const ripples = Array.from({ length: RIPPLE_COUNT }).map((_, i) => {
    const x = random(width * 0.1, width * 0.9);
    const y = random(height * 0.2, height * 0.8);
    const delay = random(0, 4000); // Spread ripples throughout animation

    return <RainRipple key={i} x={x} y={y} delay={delay} />;
  });

  return (
    <View
      style={[StyleSheet.absoluteFill, { zIndex: 999 }]}
      pointerEvents="none"
    >
      {/* Rain ripples - visual indicators */}
      {ripples}

      {/* Blur layer - progressively obscures content (only after 2500ms) */}
      {showBlur && (
        <AnimatedBlur
          intensity={blurIntensity}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Final solid overlay */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: activeTheme.colors.background,
            opacity: overlayOpacity,
          },
        ]}
      />
    </View>
  );
};
