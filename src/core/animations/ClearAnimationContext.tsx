import React, { createContext, useContext, useState, useRef } from 'react';
import { Animated } from 'react-native';
import { useAnimatedValue } from '../hooks/useAnimatedValue';

interface ClearAnimationContextValue {
  isActive: boolean;
  textOpacity: Animated.Value;
  bubbleOpacity: Animated.Value;
  startAnimation: (onComplete: () => void) => void;
}

const ClearAnimationContext = createContext<ClearAnimationContextValue | null>(null);

export const useClearAnimation = () => {
  const context = useContext(ClearAnimationContext);
  if (!context) {
    // Return inactive state if no provider
    // This happens in Unburdening games which don't have message bubbles to animate
    // In this case, just use a simple timeout and call onComplete
    return {
      isActive: false,
      textOpacity: new Animated.Value(1),
      bubbleOpacity: new Animated.Value(1),
      startAnimation: (onComplete: () => void) => {
        // Simple 800ms delay to match clear animation duration, then complete
        setTimeout(() => onComplete(), 800);
      },
    };
  }
  return context;
};

interface ClearAnimationProviderProps {
  children: React.ReactNode;
  enabled: boolean; // Only active when burnStyle === 'clear'
}

export const ClearAnimationProvider = ({ children, enabled }: ClearAnimationProviderProps) => {
  const [isActive, setIsActive] = useState(false);
  const textOpacity = useAnimatedValue(1);
  const bubbleOpacity = useAnimatedValue(1);

  const startAnimation = (onComplete: () => void) => {
    if (!enabled) {
      onComplete();
      return;
    }

    setIsActive(true);

    // Reset opacities to initial state
    textOpacity.setValue(1);
    bubbleOpacity.setValue(1);

    // Two-stage animation:
    // Stage 1 (0-400ms): Text fades out
    // Stage 2 (400-800ms): Bubbles fade out
    Animated.sequence([
      // Stage 1: Text disappears
      Animated.timing(textOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      // Stage 2: Bubbles fade away
      Animated.timing(bubbleOpacity, {
        toValue: 0,
        duration: 400, // 400ms + 400ms = 800ms total
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsActive(false);
      onComplete();
    });
  };

  return (
    <ClearAnimationContext.Provider value={{ isActive, textOpacity, bubbleOpacity, startAnimation }}>
      {children}
    </ClearAnimationContext.Provider>
  );
};
