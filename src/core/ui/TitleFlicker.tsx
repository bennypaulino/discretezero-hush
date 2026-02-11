import React, { useEffect, useRef, useState } from 'react';
import { Animated, View, StyleSheet, Easing } from 'react-native';
import { useAnimatedValue } from '../hooks/useAnimatedValue';

interface TitleFlickerProps {
  children: React.ReactNode;
  shouldFlicker: boolean;
  onComplete?: () => void;
  softMode?: boolean; // Less intense flicker when preceding toast
}

// Generate screen tear sections - horizontal slices that shift independently
const generateTearSections = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    top: Math.random() * 100, // Random placement instead of evenly spaced
    height: 1 + Math.random() * 4, // Much thinner: 1-5% instead of full sections
    offsetX: (Math.random() - 0.5) * 80, // Keep extreme horizontal shift
    offsetY: (Math.random() - 0.5) * 20, // Keep vertical shift
    delay: Math.random() * 100,
    color: Math.random() > 0.5 ? '#FF0000' : '#FF3366',
  }));
};

// Generate static noise blocks
const generateNoiseBlocks = (count: number) => {
  return Array.from({ length: count }, () => ({
    left: Math.random() * 100,
    top: Math.random() * 100,
    width: 1 + Math.random() * 8,
    height: 1 + Math.random() * 8,
    delay: Math.random() * 120,
  }));
};

export const TitleFlicker = ({ children, shouldFlicker, onComplete, softMode = false }: TitleFlickerProps) => {
  const mainOpacity = useAnimatedValue(0);
  const rgbRedOffset = useAnimatedValue(0);
  const rgbCyanOffset = useAnimatedValue(0);
  const rgbMagentaOffset = useAnimatedValue(0);
  const verticalShake = useAnimatedValue(0);
  const distortion = useAnimatedValue(0);

  // Reduce intensity in soft mode
  const [tearSections] = useState(() => generateTearSections(softMode ? 2 : 5));
  const [noiseBlocks] = useState(() => generateNoiseBlocks(softMode ? 15 : 40));

  const tearAnims = useRef(tearSections.map(() => new Animated.Value(0))).current;
  const noiseAnims = useRef(noiseBlocks.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (shouldFlicker) {
      // Main intensity sequence - chaotic pulsing
      const mainSequence = Animated.sequence([
        // Initial spike
        Animated.timing(mainOpacity, {
          toValue: 1,
          duration: 40,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
        // First corruption wave
        Animated.timing(mainOpacity, {
          toValue: 0.5,
          duration: 25,
          useNativeDriver: true,
        }),
        Animated.timing(mainOpacity, {
          toValue: 1,
          duration: 20,
          useNativeDriver: true,
        }),
        // Brief dropout
        Animated.timing(mainOpacity, {
          toValue: 0.3,
          duration: 15,
          useNativeDriver: true,
        }),
        // Second corruption wave
        Animated.timing(mainOpacity, {
          toValue: 0.95,
          duration: 30,
          useNativeDriver: true,
        }),
        Animated.timing(mainOpacity, {
          toValue: 0.6,
          duration: 20,
          useNativeDriver: true,
        }),
        Animated.timing(mainOpacity, {
          toValue: 1,
          duration: 25,
          useNativeDriver: true,
        }),
        // Third pulse
        Animated.timing(mainOpacity, {
          toValue: 0.7,
          duration: 20,
          useNativeDriver: true,
        }),
        Animated.timing(mainOpacity, {
          toValue: 1,
          duration: 20,
          useNativeDriver: true,
        }),
        // Final fade
        Animated.delay(30),
        Animated.timing(mainOpacity, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.exp),
          useNativeDriver: true,
        }),
      ]);

      // Extreme RGB channel separation - all three channels
      const redSequence = Animated.sequence([
        Animated.timing(rgbRedOffset, {
          toValue: -8,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(rgbRedOffset, {
          toValue: -4,
          duration: 40,
          useNativeDriver: true,
        }),
        Animated.timing(rgbRedOffset, {
          toValue: -10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(rgbRedOffset, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
      ]);

      const cyanSequence = Animated.sequence([
        Animated.delay(20),
        Animated.timing(rgbCyanOffset, {
          toValue: 6,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(rgbCyanOffset, {
          toValue: 9,
          duration: 45,
          useNativeDriver: true,
        }),
        Animated.timing(rgbCyanOffset, {
          toValue: 3,
          duration: 40,
          useNativeDriver: true,
        }),
        Animated.timing(rgbCyanOffset, {
          toValue: 0,
          duration: 115,
          useNativeDriver: true,
        }),
      ]);

      const magentaSequence = Animated.sequence([
        Animated.delay(35),
        Animated.timing(rgbMagentaOffset, {
          toValue: 5,
          duration: 55,
          useNativeDriver: true,
        }),
        Animated.timing(rgbMagentaOffset, {
          toValue: -3,
          duration: 40,
          useNativeDriver: true,
        }),
        Animated.timing(rgbMagentaOffset, {
          toValue: 7,
          duration: 45,
          useNativeDriver: true,
        }),
        Animated.timing(rgbMagentaOffset, {
          toValue: 0,
          duration: 90,
          useNativeDriver: true,
        }),
      ]);

      // Vertical shake/jitter
      const shakeSequence = Animated.sequence([
        Animated.timing(verticalShake, {
          toValue: -3,
          duration: 40,
          useNativeDriver: true,
        }),
        Animated.timing(verticalShake, {
          toValue: 4,
          duration: 30,
          useNativeDriver: true,
        }),
        Animated.timing(verticalShake, {
          toValue: -2,
          duration: 35,
          useNativeDriver: true,
        }),
        Animated.timing(verticalShake, {
          toValue: 3,
          duration: 30,
          useNativeDriver: true,
        }),
        Animated.timing(verticalShake, {
          toValue: 0,
          duration: 80,
          useNativeDriver: true,
        }),
      ]);

      // Distortion wave
      const distortionSequence = Animated.loop(
        Animated.sequence([
          Animated.timing(distortion, {
            toValue: 1,
            duration: 70,
            useNativeDriver: true,
          }),
          Animated.timing(distortion, {
            toValue: 0,
            duration: 70,
            useNativeDriver: true,
          }),
        ]),
        { iterations: 3 }
      );

      // Screen tear animations - each section shifts independently
      const tearSequences = tearAnims.map((anim, i) =>
        Animated.sequence([
          Animated.delay(tearSections[i].delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 60 + Math.random() * 50,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.5,
            duration: 40,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 1,
            duration: 40,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 80,
            useNativeDriver: true,
          }),
        ])
      );

      // Static noise animations - rapid flickering
      const noiseSequences = noiseAnims.map((anim, i) =>
        Animated.sequence([
          Animated.delay(noiseBlocks[i].delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 20 + Math.random() * 30,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 20 + Math.random() * 20,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 1,
            duration: 15 + Math.random() * 25,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 30,
            useNativeDriver: true,
          }),
        ])
      );

      // Run all corruption effects in parallel
      const animation = Animated.parallel([
        mainSequence,
        redSequence,
        cyanSequence,
        magentaSequence,
        shakeSequence,
        distortionSequence,
        ...tearSequences,
        ...noiseSequences,
      ]);

      animation.start(() => {
        if (onComplete) onComplete();
      });

      return () => {
        animation.stop();
        mainOpacity.stopAnimation();
        rgbRedOffset.stopAnimation();
        rgbCyanOffset.stopAnimation();
        rgbMagentaOffset.stopAnimation();
        verticalShake.stopAnimation();
        distortion.stopAnimation();
        tearAnims.forEach(anim => anim.stopAnimation());
        noiseAnims.forEach(anim => anim.stopAnimation());
      };
    }
  }, [shouldFlicker, mainOpacity, rgbRedOffset, rgbCyanOffset, rgbMagentaOffset, verticalShake, distortion, tearAnims, noiseAnims, tearSections, noiseBlocks, onComplete]);

  if (!shouldFlicker) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateY: verticalShake }],
          },
        ]}
      >
        {/* Red channel - extreme left shift */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: Animated.multiply(mainOpacity, softMode ? 0.4 : 0.7),
              transform: [{ translateX: rgbRedOffset }],
            },
          ]}
          pointerEvents="none"
        >
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#FF0000' }]} />
        </Animated.View>

        {/* Cyan channel - extreme right shift */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: Animated.multiply(mainOpacity, softMode ? 0.3 : 0.6),
              transform: [{ translateX: rgbCyanOffset }],
            },
          ]}
          pointerEvents="none"
        >
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#00FFFF' }]} />
        </Animated.View>

        {/* Magenta channel - variable shift (reduced) */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: Animated.multiply(mainOpacity, softMode ? 0.1 : 0.2),
              transform: [{ translateX: rgbMagentaOffset }],
            },
          ]}
          pointerEvents="none"
        >
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#FF00FF' }]} />
        </Animated.View>

        {/* Main content */}
        {children}

        {/* Screen tear sections - horizontal slices that shift independently */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {tearSections.map((section, i) => (
            <Animated.View
              key={`tear-${i}`}
              style={[
                {
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: `${section.top}%`,
                  height: `${section.height}%`,
                  backgroundColor: section.color,
                  opacity: tearAnims[i],
                  transform: [
                    {
                      translateX: tearAnims[i].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, section.offsetX],
                      }),
                    },
                    {
                      translateY: tearAnims[i].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, section.offsetY],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>

        {/* Static noise blocks - random flickering pixels */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {noiseBlocks.map((block, i) => (
            <Animated.View
              key={`noise-${i}`}
              style={[
                {
                  position: 'absolute',
                  left: `${block.left}%`,
                  top: `${block.top}%`,
                  width: `${block.width}%`,
                  height: `${block.height}%`,
                  backgroundColor: Math.random() > 0.5 ? '#FFFFFF' : '#FF0000',
                  opacity: noiseAnims[i],
                },
              ]}
            />
          ))}
        </View>

        {/* Distortion wave overlay */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: '#CC0000',
              opacity: Animated.multiply(
                mainOpacity,
                distortion.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.3],
                })
              ),
            },
          ]}
          pointerEvents="none"
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
});
