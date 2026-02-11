import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { Typewriter } from '../../../core/ui/Typewriter'; // <--- Precise Import
import { useAppTheme } from '../../../core/hooks/useAppTheme';
import { usePrivacyBlur } from '../../../core/hooks/usePrivacyBlur';
import { useClearAnimation } from '../../../core/animations/ClearAnimationContext';

interface PrivacyMessageProps {
  text: string;
  isUser: boolean;
}

export const PrivacyMessage = React.memo(({ text, isUser }: PrivacyMessageProps) => {
  const activeTheme = useAppTheme();
  const { isBlurred, handleLongPress } = usePrivacyBlur();
  const { isActive: isClearAnimating, textOpacity: clearTextOpacity, bubbleOpacity: clearBubbleOpacity } = useClearAnimation();

  // Get bubble background and text color
  // User bubbles: theme-defined background + theme-defined text color
  const userBubbleBg = activeTheme.colors.primary;
  const userTextColor = activeTheme.colors.userTextColor || '#000'; // Fallback to black if not defined

  // Compose opacity: blur opacity (static) + clear animation opacity (animated)
  const blurOpacity = isBlurred ? 0.1 : 1.0;

  // For text: multiply blur opacity with clear text opacity
  const composedTextOpacity = isClearAnimating
    ? Animated.multiply(clearTextOpacity, blurOpacity)
    : blurOpacity;

  return (
    <View style={[styles.row, isUser ? styles.userRow : styles.aiRow]}>
      <Animated.View
        style={{
          opacity: isClearAnimating ? clearBubbleOpacity : 1, // Bubble opacity (only for Clear animation)
          maxWidth: '85%', // Constrain bubble container width
        }}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onLongPress={handleLongPress}
          delayLongPress={300}
          style={[
            styles.bubble,
            isUser
              ? { backgroundColor: userBubbleBg }
              : styles.aiBubble
          ]}
        >
          <Animated.View style={[styles.contentContainer, { opacity: composedTextOpacity }]}>
            {isUser ? (
              <Text style={[
                styles.text,
                { color: userTextColor }
              ]}>
                  {text}
              </Text>
            ) : (
              <Typewriter text={text} style={styles.text} speed={15} />
            )}
          </Animated.View>

          {isBlurred && (
            <BlurView
              intensity={25}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}, (prevProps, nextProps) => {
  // Only re-render if text or isUser changes
  return prevProps.text === nextProps.text && prevProps.isUser === nextProps.isUser;
});

const styles = StyleSheet.create({
  row: {
    width: '100%',
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 12, // Equal spacing from screen edges
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  aiRow: {
    justifyContent: 'flex-start',
  },

  bubble: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    maxWidth: '100%', // Take full width of parent container
    overflow: 'hidden',
  },
  aiBubble: {
    backgroundColor: '#262626', // Dark Grey for AI
  },
  contentContainer: {
    // Container ensures text layout is calculated even when blurred
  },
  text: {
    color: '#fff',
    fontSize: 16,
  },
});
