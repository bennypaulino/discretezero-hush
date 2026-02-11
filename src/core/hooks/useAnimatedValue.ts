// src/core/hooks/useAnimatedValue.ts
// Hook for creating Animated.Value with automatic cleanup
import { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

/**
 * Create an Animated.Value with automatic cleanup on unmount
 *
 * Prevents memory leaks by stopping animations and releasing references
 * when the component unmounts.
 *
 * @param initialValue - The initial value for the animation
 * @returns Animated.Value instance that will be cleaned up on unmount
 *
 * @example
 * ```typescript
 * // Before:
 * const opacity = useRef(new Animated.Value(0)).current;
 *
 * // After:
 * const opacity = useAnimatedValue(0);
 * ```
 */
export function useAnimatedValue(initialValue: number): Animated.Value {
  const animRef = useRef<Animated.Value | null>(null);

  // Initialize on first render only
  if (!animRef.current) {
    animRef.current = new Animated.Value(initialValue);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animRef.current) {
        // Stop any running animations
        animRef.current.stopAnimation();
        // Release reference
        animRef.current = null;
      }
    };
  }, []); // Empty deps - cleanup only runs on unmount

  return animRef.current;
}

/**
 * Create an Animated.ValueXY with automatic cleanup on unmount
 *
 * Prevents memory leaks for 2D animated values (x, y coordinates)
 *
 * @param initialValue - Initial {x, y} coordinates
 * @returns Animated.ValueXY instance that will be cleaned up on unmount
 *
 * @example
 * ```typescript
 * // Before:
 * const position = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
 *
 * // After:
 * const position = useAnimatedValueXY({ x: 0, y: 0 });
 * ```
 */
export function useAnimatedValueXY(initialValue: { x: number; y: number }): Animated.ValueXY {
  const animRef = useRef<Animated.ValueXY | null>(null);

  // Initialize on first render only
  if (!animRef.current) {
    animRef.current = new Animated.ValueXY(initialValue);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animRef.current) {
        // Stop any running animations
        animRef.current.stopAnimation();
        // Release reference
        animRef.current = null;
      }
    };
  }, []); // Empty deps - cleanup only runs on unmount

  return animRef.current;
}
