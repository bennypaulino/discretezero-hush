import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import type { AppFlavor } from '../../config';

interface TypingIndicatorProps {
  flavor: AppFlavor;
  color?: string;
}

/**
 * Unified typing indicator component for all app flavors
 *
 * Hush/Discretion: Progressive squishing dots (each dot compresses + sinks in sequence)
 * Classified: Terminal spinner (-\|/)
 *
 * Shows during initial AI latency (1-2s) before streaming starts
 */
export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ flavor, color = '#666' }) => {
  // Classified: Terminal spinner animation
  if (flavor === 'CLASSIFIED') {
    return <TerminalSpinner color={color} />;
  }

  // Hush/Discretion: Squishing dots animation
  return <SquishingDots color={color} />;
};

/**
 * Squishing dots animation for Hush and Discretion modes
 * Progressive animation where each dot squishes (color + compress + sink) in sequence
 */
const SquishingDots: React.FC<{ color: string }> = ({ color }) => {
  // Progress values for each dot (0 = normal, 1 = fully squished)
  const dot1Progress = useRef(new Animated.Value(0)).current;
  const dot2Progress = useRef(new Animated.Value(0)).current;
  const dot3Progress = useRef(new Animated.Value(0)).current;

  const GRAY_COLOR = '#666';
  const SQUISH_DURATION = 200; // Duration for each dot to squish and return

  useEffect(() => {
    // Create squish animation for a single dot
    const createSquishSequence = (progress: Animated.Value, delay: number) => {
      return Animated.sequence([
        Animated.delay(delay),
        // Squish down
        Animated.timing(progress, {
          toValue: 1,
          duration: SQUISH_DURATION,
          useNativeDriver: false, // Need for color interpolation
        }),
        // Return to normal
        Animated.timing(progress, {
          toValue: 0,
          duration: SQUISH_DURATION,
          useNativeDriver: false,
        }),
      ]);
    };

    // Loop the sequence: dot1 → dot2 → dot3 → repeat
    const animation = Animated.loop(
      Animated.sequence([
        createSquishSequence(dot1Progress, 0),
        createSquishSequence(dot2Progress, 0),
        createSquishSequence(dot3Progress, 0),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [dot1Progress, dot2Progress, dot3Progress]);

  // Interpolate values for each dot
  const createDotStyle = (progress: Animated.Value) => {
    const dotColor = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [GRAY_COLOR, color],
    });

    const scaleX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.8], // Wider when squished
    });

    const scaleY = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0.5], // Flatter when squished
    });

    const translateY = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 5], // Sink below baseline when squished
    });

    return {
      backgroundColor: dotColor,
      transform: [
        { scaleX },
        { scaleY },
        { translateY },
      ],
    };
  };

  return (
    <View style={styles.dotsContainer}>
      <Animated.View style={[styles.dot, createDotStyle(dot1Progress)]} />
      <Animated.View style={[styles.dot, createDotStyle(dot2Progress)]} />
      <Animated.View style={[styles.dot, createDotStyle(dot3Progress)]} />
    </View>
  );
};

/**
 * Terminal spinner animation for Classified mode
 */
const TerminalSpinner: React.FC<{ color: string }> = ({ color }) => {
  const spinnerChars = ['-', '\\', '|', '/'];
  const [charIndex, setCharIndex] = React.useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCharIndex((prev) => (prev + 1) % spinnerChars.length);
    }, 150);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.spinnerContainer}>
      <Text style={[styles.spinnerText, { color }]}>
        {spinnerChars[charIndex]}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  spinnerContainer: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  spinnerText: {
    fontFamily: 'Courier',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
