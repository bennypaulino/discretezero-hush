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
 * Hush/Discretion: Bouncing dots (● ● ●)
 * Classified: Terminal spinner (-\|/)
 *
 * Shows during initial AI latency (1-2s) before streaming starts
 */
export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ flavor, color = '#666' }) => {
  // Classified: Terminal spinner animation
  if (flavor === 'CLASSIFIED') {
    return <TerminalSpinner color={color} />;
  }

  // Hush/Discretion: Bouncing dots animation
  return <BouncingDots color={color} />;
};

/**
 * Bouncing dots animation for Hush and Discretion modes
 */
const BouncingDots: React.FC<{ color: string }> = ({ color }) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createBounce = (animValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: -10,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    // Staggered animation (150ms between dots)
    const animation = Animated.parallel([
      createBounce(dot1, 0),
      createBounce(dot2, 150),
      createBounce(dot3, 300),
    ]);

    animation.start();

    return () => animation.stop();
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.dotsContainer}>
      <Animated.View style={[styles.dot, { backgroundColor: color, transform: [{ translateY: dot1 }] }]} />
      <Animated.View style={[styles.dot, { backgroundColor: color, transform: [{ translateY: dot2 }] }]} />
      <Animated.View style={[styles.dot, { backgroundColor: color, transform: [{ translateY: dot3 }] }]} />
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
