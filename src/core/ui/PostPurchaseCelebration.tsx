import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useAnimatedValue } from '../hooks/useAnimatedValue';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useChatStore } from '../state/rootStore';

interface PostPurchaseCelebrationProps {
  visible: boolean;
  onComplete: () => void;
}

export const PostPurchaseCelebration: React.FC<PostPurchaseCelebrationProps> = ({
  visible,
  onComplete,
}) => {
  const { flavor, discretionTheme } = useChatStore();
  const scaleAnim = useAnimatedValue(0.5);
  const opacityAnim = useAnimatedValue(0);
  const buttonOpacityAnim = useAnimatedValue(1); // Separate button fade
  const heartScaleAnim = useAnimatedValue(1); // Heart beat animation

  // IMPORTANT: All hooks must be called unconditionally (Rules of Hooks)
  useEffect(() => {
    if (visible) {
      try {
        // Reset animations for entrance
        buttonOpacityAnim.setValue(1);
        heartScaleAnim.setValue(1);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Entrance animation
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      } catch (error) {
        if (__DEV__) {
          console.error('[PostPurchaseCelebration] Error in entrance animation:', error);
        }
      }

      // Safety timeout: Auto-dismiss after 30 seconds if user doesn't tap
      const timeoutId = setTimeout(() => {
        if (__DEV__) {
          console.log('[PostPurchaseCelebration] Auto-dismissing after 30s timeout');
        }
        onComplete();
      }, 30000);

      // Cleanup timeout on unmount or when visible changes
      return () => clearTimeout(timeoutId);
    }
  }, [visible, scaleAnim, opacityAnim, buttonOpacityAnim, heartScaleAnim, onComplete]);

  // Early return AFTER all hooks
  if (!visible) return null;

  // Get theme colors
  const getTheme = () => {
    if (flavor === 'DISCRETION') {
      return {
        background: '#000000',
        text: '#FFFFFF',
        subtext: 'rgba(255, 255, 255, 0.7)',
        accent: discretionTheme === 'GOLD' ? '#D4AF37' : '#C0C0C0',
        fontHeader: 'System',
      };
    } else {
      // Hush mode
      return {
        background: '#0A0014',
        text: '#FFFFFF',
        subtext: 'rgba(255, 255, 255, 0.7)',
        accent: '#8B5CF6',
        fontHeader: 'System',
      };
    }
  };

  const theme = getTheme();

  // Flavor-specific copy
  const getCopy = () => {
    if (flavor === 'DISCRETION') {
      return {
        icon: 'briefcase' as const,
        title: 'Executive Access Granted',
        subtitle: 'All features unlocked',
      };
    } else {
      // Hush mode
      return {
        icon: 'heart' as const,
        title: 'Your Sanctuary Is Now Limitless',
        subtitle: 'Unlimited peace of mind',
      };
    }
  };

  const copy = getCopy();

  const handleClose = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Stage 1: Button fades to black (400ms)
      Animated.timing(buttonOpacityAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        // Stage 2: Heart beats one time (scale 1.0 → 1.2 → 1.0)
        Animated.sequence([
          Animated.spring(heartScaleAnim, {
            toValue: 1.2,
            tension: 100,
            friction: 5,
            useNativeDriver: true,
          }),
          Animated.spring(heartScaleAnim, {
            toValue: 1.0,
            tension: 100,
            friction: 5,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Stage 3: Content grows bigger and fades out
          Animated.parallel([
            Animated.spring(scaleAnim, {
              toValue: 1.6, // Grow bigger
              tension: 15,
              friction: 14,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0,
              duration: 1800,
              useNativeDriver: true,
            }),
          ]).start(() => {
            onComplete();
          });
        });
      });
    } catch (error) {
      if (__DEV__) {
        console.error('[PostPurchaseCelebration] Error in handleClose:', error);
      }
      // Fallback - just call onComplete
      onComplete();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Icon */}
        <Animated.View style={{ transform: [{ scale: heartScaleAnim }] }}>
          <View style={[styles.iconContainer, { backgroundColor: `${theme.accent}20` }]}>
            <Ionicons name={copy.icon} size={64} color={theme.accent} />
          </View>
        </Animated.View>

        {/* Title */}
        <Text style={[styles.title, { color: theme.text, fontFamily: theme.fontHeader }]}>
          {copy.title}
        </Text>

        {/* Subtitle */}
        <Text style={[styles.subtitle, { color: theme.subtext }]}>{copy.subtitle}</Text>

        {/* CTA Button */}
        <Animated.View style={{ opacity: buttonOpacityAnim }}>
          <TouchableOpacity
            onPress={handleClose}
            style={[styles.button, { backgroundColor: theme.accent }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.buttonText, { fontFamily: theme.fontHeader }]}>
              Start Exploring
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
});
