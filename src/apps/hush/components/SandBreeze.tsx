import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Easing } from 'react-native';
import { useAnimatedValue } from '../../../core/hooks/useAnimatedValue';

const { width, height } = Dimensions.get('window');

// CONFIGURATION
const PARTICLE_COUNT = 80; // Enough to look like sand, low enough for 60fps
const DURATION = 2000;     // 2 seconds (matches spec)

// Random helper
const random = (min: number, max: number) => Math.random() * (max - min) + min;

// Individual Grain of Sand
const SandGrain = ({ delay }: { delay: number }) => {
  // Animation Values
  const anim = useAnimatedValue(0);

  // Random Start Position (concentrated in the middle/bottom where text usually is)
  const startX = random(0, width);
  const startY = random(height * 0.3, height - 100);

  // Random "Wind" Characteristics
  const driftX = random(50, 150);   // Blows right
  const driftY = random(-100, -300); // Blows up
  const size = random(2, 6);        // Varied grain sizes

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: random(1500, 2000), // Varied speed
      delay: delay,
      easing: Easing.out(Easing.sin), // gentle ease out
      useNativeDriver: true,
    }).start();
  }, []);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, driftX],
  });

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, driftY],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 1, 0], // Fade in -> Fade out
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: startX,
        top: startY,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#E0B0FF', // "Mauve" / Light Purple (Hush Theme)
        opacity: opacity,
        transform: [{ translateX }, { translateY }],
      }}
    />
  );
};

export const SandBreeze = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    // End the animation lifecycle after the longest particle finishes
    const timer = setTimeout(() => {
        onComplete();
    }, DURATION);
    return () => clearTimeout(timer);
  }, []);

  // Generate particles
  const particles = Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
    <SandGrain key={i} delay={random(0, 500)} />
  ));

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 999, pointerEvents: 'none' }]}>
      {particles}
    </View>
  );
};
