import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Easing } from 'react-native';
import { useAppTheme } from '../../../core/hooks/useAppTheme'
import { useAnimatedValue } from '../../../core/hooks/useAnimatedValue';;

const { width, height } = Dimensions.get('window');

// CONFIGURATION
const PARTICLE_COUNT = 150; // High density for "Text" look

// Helper for randomness
const random = (min: number, max: number) => Math.random() * (max - min) + min;

const DustPixel = ({ delay, rowIndex }: { delay: number, rowIndex: number }) => {
  const anim = useAnimatedValue(0);
  const activeTheme = useAppTheme();

  // Distribute particles in "lines" to mimic text rows
  // We divide the screen height into ~20 text rows
  const rowHeight = height / 20;
  const startY = (rowIndex * rowHeight) + random(-10, 10); // Slight jitter

  // Random X start (spread across the width)
  const startX = random(20, width - 20);

  // WIND PHYSICS (Preserved from your code)
  const windForce = random(100, 300); // Strong gust to the right
  const liftForce = random(-20, -100); // Slight lift up

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: random(1000, 1500),
      delay: delay,
      easing: Easing.bezier(0.4, 0.0, 0.2, 1), // "Wind Gust" curve (starts fast)
      useNativeDriver: true,
    }).start();
  }, []);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, windForce],
  });

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, liftForce],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 0.1, 0.8, 1],
    outputRange: [0, 1, 1, 0], // Flash in -> hold -> fade out
  });

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0], // Shrink as they fly away
  });

  // DYNAMIC COLOR SELECTION
  // We mix the text color (whiteish) and the primary theme color (e.g., Pink)
  // to make it look like the actual UI elements are breaking apart.
  const particleColor = Math.random() > 0.6
    ? activeTheme.colors.text
    : activeTheme.colors.primary;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: startX,
        top: startY,
        width: random(2, 4), // Tiny "text fragment" size
        height: random(2, 4),
        backgroundColor: particleColor, // <--- Dynamic Color
        opacity: opacity,
        transform: [{ translateX }, { translateY }, { scale }],
      }}
    />
  );
};

export const TextDust = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1600);
    return () => clearTimeout(timer);
  }, []);

  // Generate particles organized roughly by rows
  const particles = Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
    // Assign each particle to a "text row" (0 to 19)
    const rowIndex = i % 20;
    // Random delay for "crumbling" effect
    return <DustPixel key={i} delay={random(0, 400)} rowIndex={rowIndex} />;
  });

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 999, pointerEvents: 'none' }]}>
      {particles}
    </View>
  );
};
