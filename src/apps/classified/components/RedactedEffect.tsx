import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { useAnimatedValue } from '../../../core/hooks/useAnimatedValue';

const { height } = Dimensions.get('window');

export const RedactionEffect = ({ onComplete }: { onComplete: () => void }) => {
  const wipeAnim = useAnimatedValue(0);

  useEffect(() => {
    // 1. Wait 1000ms for the text bars to finish swiping
    // 2. Perform the vertical wipe
    Animated.sequence([
      Animated.delay(1000),
      Animated.timing(wipeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      })
    ]).start(() => onComplete());
  }, []);

  const translateY = wipeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-height, 0],
  });

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 999 }]} pointerEvents="none">
      <Animated.View
        style={[
            StyleSheet.absoluteFill,
            {
                backgroundColor: '#000',
                transform: [{ translateY }]
            }
        ]}
      />
    </View>
  );
};
