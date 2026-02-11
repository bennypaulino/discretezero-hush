import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { Typewriter } from '../../../core/ui/Typewriter';
import { ClassifiedBurnType } from '../../../core/state/rootStore';
import { useScrambleText } from '../../../core/hooks/useScrambleText';
import { usePrivacyBlur } from '../../../core/hooks/usePrivacyBlur'
import { useAnimatedValue } from '../../../core/hooks/useAnimatedValue';;

// TACTICAL PALETTE CONSTANTS (fallbacks only)
const REDACTION_BLOCK_COLOR = '#332200'; // Dark Amber Block
const REDACT_ANIM_COLOR = '#000000';     // Pure Black
const DARK_GLITCH_COLOR = '#440000';     // <--- NEW: Deep, "Dead" Red for flickering

interface RedactedMessageProps {
  text: string;
  role: 'user' | 'system' | 'ai';
  isPurging: boolean;
  burnStyle: ClassifiedBurnType;
  glitchColor?: string; // Bright Red (for borders, EYES ONLY)
  sysColor?: string; // Color for SYS: messages (theme-based)
  userColor?: string; // Color for USER labels (theme-based)
  redactionBlockColor?: string; // Color for privacy blur/redaction block (theme-based)
}

export const RedactedMessage = React.memo(({
    text, role, isPurging, burnStyle,
    glitchColor = '#FF3333',
    sysColor = '#FFB000', // Default amber, but theme will override
    userColor = '#FFFFFF', // Default white, but theme will override
    redactionBlockColor = REDACTION_BLOCK_COLOR // Default to hardcoded, but theme can override
}: RedactedMessageProps) => {

  const { isBlurred: isRedacted, handleLongPress } = usePrivacyBlur();
  const redactWidth = useAnimatedValue(0);

  // CORRUPTION LOGIC
  const isCorrupting = isPurging && burnStyle === 'corruption';
  // This hook triggers a re-render every 50ms, which drives the flicker animation below
  const displayedText = useScrambleText(text, isCorrupting);

  // REDACTION ANIMATION
  useEffect(() => {
    if (isPurging && burnStyle === 'redaction') {
      const delay = Math.random() * 600;
      Animated.timing(redactWidth, {
        toValue: 1, duration: 300, delay,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: false,
      }).start();
    }
  }, [isPurging, burnStyle]);

  const textColor = role === 'user' ? userColor : sysColor; // Use theme-based colors
  const animatedBarWidth = redactWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '105%'] });

  // FLICKER CALCULATOR
  // If corrupting, randomly switch between Bright Red and Deep Red.
  // Otherwise, return standard colors.
  const getTextColor = () => {
    if (isCorrupting) {
        return Math.random() > 0.5 ? glitchColor : DARK_GLITCH_COLOR;
    }
    return role === 'user' ? userColor : sysColor; // Use theme-based colors
  };

  return (
    <TouchableOpacity activeOpacity={0.9} onLongPress={handleLongPress} delayLongPress={300} style={styles.logRow}>
      <Text style={[styles.prompt, { color: textColor }]}>
        {role === 'user' ? '> USER:' : '> SYS:'}
      </Text>

      <View style={{ flex: 1, position: 'relative' }}>
        {/* KILL BAR ANIMATION */}
        {isPurging && burnStyle === 'redaction' && (
             <Animated.View style={[styles.killBar, { width: animatedBarWidth }]} />
        )}

        {isRedacted && !isPurging ? (
             // STATIC REDACTED STATE
             <View style={{ backgroundColor: redactionBlockColor, paddingHorizontal: 2, borderRadius: 2, alignSelf: 'flex-start' }}>
                 <Text style={[styles.logText, { color: 'transparent' }]}>{text.toUpperCase()}</Text>
             </View>
        ) : (
             // REVEALED STATE
             role === 'ai' && !isPurging ? (
                 <Typewriter text={text.toUpperCase()} style={[styles.logText, { color: sysColor }]} speed={5} enableHaptics={true} />
             ) : (
                 <Text style={[
                     styles.logText,
                     {
                         // Apply the flicker logic
                         color: getTextColor(),

                         // Shadow flickers with the color for extra intensity
                         textShadowColor: isCorrupting ? getTextColor() : 'transparent',
                         textShadowOffset: isCorrupting ? { width: 0, height: 0 } : { width: 0, height: 0 },
                         textShadowRadius: isCorrupting ? 4 : 0
                     }
                 ]}>
                    {isCorrupting ? displayedText : text.toUpperCase()}
                 </Text>
             )
        )}
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Only re-render if any prop changes
  return (
    prevProps.text === nextProps.text &&
    prevProps.role === nextProps.role &&
    prevProps.isPurging === nextProps.isPurging &&
    prevProps.burnStyle === nextProps.burnStyle &&
    prevProps.glitchColor === nextProps.glitchColor &&
    prevProps.sysColor === nextProps.sysColor &&
    prevProps.userColor === nextProps.userColor &&
    prevProps.redactionBlockColor === nextProps.redactionBlockColor
  );
});

const styles = StyleSheet.create({
  logRow: { flexDirection: 'row', marginBottom: 16, paddingRight: 10, alignItems: 'flex-start' },
  prompt: { fontFamily: 'Courier', fontWeight: 'bold', marginRight: 12, fontSize: 14, minWidth: 50, marginTop: 2 },
  logText: { fontFamily: 'Courier', fontSize: 14, lineHeight: 22, flexWrap: 'wrap' },
  killBar: { position: 'absolute', top: 0, left: -2, height: '100%', backgroundColor: REDACT_ANIM_COLOR, zIndex: 10 }
});
