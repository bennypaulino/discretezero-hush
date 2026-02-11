import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { useAnimatedValue } from '../hooks/useAnimatedValue';
import * as Haptics from 'expo-haptics';

interface ToastProps {
  message: string;
  duration?: number; // milliseconds
  onDismiss: () => void;
  visible: boolean;
}

export const Toast = ({ message, duration = 4000, onDismiss, visible }: ToastProps) => {
  const translateY = useAnimatedValue(-100);
  const opacity = useAnimatedValue(0);
  const glowPulse = useAnimatedValue(0);
  const dismissTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible) {
      // Slide down from top and fade in
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 600,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();

      // Subtle pulsing glow
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowPulse, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowPulse, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Auto-dismiss after duration
      dismissTimeoutRef.current = setTimeout(() => {
        handleDismiss();
      }, duration);
    } else {
      // Slide up and fade out
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -100,
          duration: 400,
          easing: Easing.bezier(0.4, 0, 1, 1),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }

    // Cleanup timeout on unmount
    return () => {
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
      }
    };
  }, [visible]);

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
  };

  if (!visible) return null;

  const glowOpacity = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 0.35],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleDismiss}
        style={styles.touchable}
      >
        {/* Red glow layers */}
        <Animated.View
          style={[
            styles.glowLayer,
            {
              opacity: glowOpacity,
              shadowOpacity: glowPulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.2, 0.5],
              }),
            },
          ]}
        />

        {/* Main toast content */}
        <View style={styles.toast}>
          {/* Corner brackets for terminal aesthetic */}
          <View style={styles.brackets}>
            <Text style={styles.bracket}>┌</Text>
            <Text style={styles.bracket}>┐</Text>
          </View>

          <Text style={styles.message}>{message}</Text>

          <View style={styles.brackets}>
            <Text style={styles.bracket}>└</Text>
            <Text style={styles.bracket}>┘</Text>
          </View>

          {/* Subtle dismiss hint */}
          <Text style={styles.dismissHint}>tap to dismiss</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    zIndex: 9999,
    alignItems: 'center',
  },
  touchable: {
    width: '100%',
    alignItems: 'center',
  },
  glowLayer: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: '100%',
    backgroundColor: '#FF0000',
    borderRadius: 2,
    shadowColor: '#FF0000',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    elevation: 10,
  },
  toast: {
    width: '100%',
    backgroundColor: 'rgba(10, 10, 10, 0.98)',
    borderRadius: 2,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 0, 0.3)',
    alignItems: 'center',
  },
  brackets: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  bracket: {
    color: 'rgba(255, 0, 0, 0.5)',
    fontSize: 12,
    fontFamily: 'Courier',
    fontWeight: 'bold',
  },
  message: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: 'Courier',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  dismissHint: {
    color: 'rgba(255, 0, 0, 0.4)',
    fontSize: 10,
    fontFamily: 'Courier',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
