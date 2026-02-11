import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useAnimatedValue } from '../hooks/useAnimatedValue';

interface TitleGlowProps {
  children: React.ReactNode;
  shouldGlow: boolean;
}

export const TitleGlow = ({ children, shouldGlow }: TitleGlowProps) => {
  const scanPosition = useAnimatedValue(0);
  const scanOpacity = useAnimatedValue(0);
  const scanThickness = useAnimatedValue(0);

  useEffect(() => {
    if (shouldGlow) {
      // Run scan animation once
      const scanCycle = () => {
        return Animated.parallel([
          // Position: sweep from top (-40) to bottom (40)
          Animated.timing(scanPosition, {
            toValue: 40,
            duration: 1800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
          }),
          // Opacity: fade in at start, peak at center, fade out at end
          Animated.sequence([
            Animated.timing(scanOpacity, {
              toValue: 1,
              duration: 600,
              easing: Easing.out(Easing.quad),
              useNativeDriver: false,
            }),
            Animated.delay(600),
            Animated.timing(scanOpacity, {
              toValue: 0,
              duration: 600,
              easing: Easing.in(Easing.quad),
              useNativeDriver: false,
            }),
          ]),
          // Thickness: thin at edges, thicker at center
          Animated.sequence([
            Animated.timing(scanThickness, {
              toValue: 1,
              duration: 900,
              easing: Easing.out(Easing.quad),
              useNativeDriver: false,
            }),
            Animated.timing(scanThickness, {
              toValue: 0,
              duration: 900,
              easing: Easing.in(Easing.quad),
              useNativeDriver: false,
            }),
          ]),
        ]);
      };

      // Initialize at starting position
      scanPosition.setValue(-40);
      scanOpacity.setValue(0);
      scanThickness.setValue(0);

      // Run scan cycle once (~1.8 seconds)
      scanCycle().start();
    } else {
      scanPosition.setValue(-40);
      scanOpacity.setValue(0);
      scanThickness.setValue(0);
    }
  }, [shouldGlow]);

  if (!shouldGlow) {
    return <>{children}</>;
  }

  // Scan line opacity - brighter when in title zone (center)
  // Glow up when passing through title zone (around Y = 0)
  const lineOpacity = Animated.multiply(
    scanOpacity,
    scanPosition.interpolate({
      inputRange: [-40, -10, 0, 10, 40],
      outputRange: [0.15, 0.5, 0.6, 0.5, 0.15], // Peak brightness at center (title)
    })
  );

  const lineHeight = scanThickness.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 5], // Slightly thicker when glowing: 1-5px
  });

  return (
    <View style={styles.container}>
      {/* Scanning line - clean and simple */}
      <Animated.View
        style={[
          styles.scanLine,
          {
            transform: [{ translateY: scanPosition }],
            opacity: lineOpacity,
            height: lineHeight,
          },
        ]}
      />

      {/* Original text content */}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  scanLine: {
    position: 'absolute',
    left: -30, // Extends about 1.5 letter-widths left
    right: -30, // Extends about 1.5 letter-widths right
    backgroundColor: '#FF3333',
  },
});
