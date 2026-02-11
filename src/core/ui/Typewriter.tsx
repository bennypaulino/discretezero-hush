import React, { useState, useEffect, useRef } from 'react';
import { Text, TextStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

interface TypewriterProps {
  text: string;
  speed?: number;
  style?: TextStyle | TextStyle[];
  onComplete?: () => void;
  enableHaptics?: boolean;
}

export const Typewriter = ({
  text,
  speed = 30,
  style,
  onComplete,
  enableHaptics = false
}: TypewriterProps) => {
  const [displayedText, setDisplayedText] = useState('');

  // We use a ref to track the "Target" text so we can restart if props change
  const currentTextRef = useRef(text);

  useEffect(() => {
    // 1. Reset if the text changed completely
    if (text !== currentTextRef.current) {
      setDisplayedText('');
      currentTextRef.current = text;
    }

    // 2. Split text into "Visual Characters" (Code Points) to avoid cutting emojis in half
    // Array.from("ABC🤫") becomes ['A', 'B', 'C', '🤫']
    const characters = Array.from(text);

    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex < characters.length) {
        // Add the next COMPLETE character (including emojis)
        const nextChar = characters[currentIndex];

        setDisplayedText((prev) => prev + nextChar);
        currentIndex++;

        // Optional: Mechanical feel (only vibrate on non-space characters)
        if (enableHaptics && nextChar !== ' ' && currentIndex % 3 === 0) {
           Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } else {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, enableHaptics]);

  return <Text style={style}>{displayedText}</Text>;
};
