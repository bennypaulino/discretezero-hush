import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Easing } from 'react-native';
import { useAnimatedValue } from '../../../core/hooks/useAnimatedValue';
import { CLASSIFIED_THEMES } from '../../../core/themes/themes';
import { useChatStore } from '../../../core/state/rootStore';

const { width, height } = Dimensions.get('window');

// CONFIGURATION - Increased density for authentic Matrix look
const COLUMN_COUNT = 55; // Denser columns to match classic Matrix
const MIN_CHARS_PER_COLUMN = 12; // Minimum trail length
const MAX_CHARS_PER_COLUMN = 25; // Maximum trail length (varies per column)
const ANIMATION_DURATION = 4000; // Total duration in ms
const FADE_DURATION = 2000; // Background fade completes in 2 seconds

// Matrix-style character set (Japanese katakana, Latin, Greek, numbers, symbols)
const MATRIX_CHARS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$+-*/=%"\'#&_(),.;:?!\\|{}<>[]^~αβγδεζηθικλμνξοπρστυφχψω';

// Helper for randomness
const random = (min: number, max: number) => Math.random() * (max - min) + min;

// Get random character from matrix set
const getRandomChar = () => MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];

interface MatrixColumnProps {
  columnIndex: number;
  delay: number;
  themeColor: string;
  trailLength: number; // Variable trail length per column
}

const MatrixColumn = ({ columnIndex, delay, themeColor, trailLength }: MatrixColumnProps) => {
  const anim = useAnimatedValue(0);

  const columnWidth = width / COLUMN_COUNT;
  const startX = columnIndex * columnWidth;

  // Random starting position (some columns start partway down for variety)
  const startYOffset = random(-height * 0.8, -height * 0.2);

  // Generate character trail - randomize characters during animation
  const [chars, setChars] = React.useState(
    Array.from({ length: trailLength }).map(() => getRandomChar())
  );

  useEffect(() => {
    // Start falling animation with moderate speed variation
    const animation = Animated.timing(anim, {
      toValue: 1,
      duration: random(2500, 4000), // Slower, more consistent cascade
      delay: delay,
      easing: Easing.linear,
      useNativeDriver: true,
    });

    animation.start();

    // Randomly change some characters during animation for glitch effect
    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        setChars(prev => {
          const newChars = [...prev];
          const randomIndex = Math.floor(Math.random() * newChars.length);
          newChars[randomIndex] = getRandomChar();
          return newChars;
        });
      }
    }, 100);

    return () => {
      clearInterval(glitchInterval);
      animation.stop();
      anim.stopAnimation();
    };
  }, [anim, delay]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [startYOffset, height + 150],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: startX,
        top: 0,
        transform: [{ translateY }],
      }}
    >
      {chars.map((char, charIndex) => {
        const isLeadChar = charIndex === trailLength - 1; // Last character is brightest (lead at bottom)
        const distanceFromLead = trailLength - 1 - charIndex; // 0 at lead, increases toward tail
        const trailPosition = distanceFromLead / trailLength; // 0 to 1, fading away from lead

        // Opacity: Lead is bright white, trail fades dramatically as distance increases
        const baseOpacity = isLeadChar ? 1 : Math.max(0, 0.9 - (trailPosition * 0.85));

        return (
          <Text
            key={charIndex}
            style={{
              fontFamily: 'Courier',
              fontSize: 12, // Slightly smaller for denser columns
              color: isLeadChar ? '#FFFFFF' : themeColor, // Lead is white, trail is theme color
              opacity: baseOpacity,
              textShadowColor: isLeadChar ? themeColor : 'transparent',
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: isLeadChar ? 10 : 0, // Lead char glows brightly
              marginVertical: 0.5, // Tighter spacing
            }}
          >
            {char}
          </Text>
        );
      })}
    </Animated.View>
  );
};

export const MatrixRainEffect = ({ onComplete }: { onComplete: () => void }) => {
  const classifiedTheme = useChatStore((state) => state.classifiedTheme);
  const themeData = CLASSIFIED_THEMES[classifiedTheme as keyof typeof CLASSIFIED_THEMES] || CLASSIFIED_THEMES.TERMINAL_RED;
  const themeColor = themeData.colors.primary; // Theme-aware color (not always green)

  // Progressive fade to black as rain falls
  const fadeAnim = useAnimatedValue(0);

  useEffect(() => {
    // Progressive darkening (completes 0.5s before rain stops)
    const animation = Animated.timing(fadeAnim, {
      toValue: 1,
      duration: FADE_DURATION,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    });

    animation.start();

    const timer = setTimeout(onComplete, ANIMATION_DURATION);

    return () => {
      clearTimeout(timer);
      animation.stop();
      fadeAnim.stopAnimation();
    };
  }, [fadeAnim, onComplete]);

  // Generate columns with staggered delays and variable trail lengths
  const columns = Array.from({ length: COLUMN_COUNT }).map((_, i) => {
    const delay = random(0, 800); // Stagger column starts (wider range)
    const trailLength = Math.floor(random(MIN_CHARS_PER_COLUMN, MAX_CHARS_PER_COLUMN)); // Random trail length

    return (
      <MatrixColumn
        key={i}
        columnIndex={i}
        delay={delay}
        themeColor={themeColor}
        trailLength={trailLength}
      />
    );
  });

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 999, pointerEvents: 'none' }]}>
      {/* Progressive fade to black as rain falls */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: '#000000',
            opacity: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.95], // Messages visible at start, nearly black by end
            }),
          },
        ]}
      />

      {/* Matrix rain columns */}
      {columns}
    </View>
  );
};
