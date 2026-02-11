import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Dimensions, Modal, ScrollView, Platform } from 'react-native';
import { useAnimatedValue } from '../hooks/useAnimatedValue';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../state/rootStore';
import { HUSH_THEMES } from '../themes/themes';
import { HushCloseButton, HushButton, HushCard } from '../../apps/hush/components/HushUI';

interface BreatheProps {
  onComplete: () => void;
  onCancel: () => void;
}

type BreathPhase = 'inhale' | 'hold_top' | 'exhale' | 'hold_bottom';

// Helper to get HUSH theme properties (Breathe is HUSH-exclusive)
const getTheme = (hushTheme: string) => {
  const themeData = HUSH_THEMES[hushTheme as keyof typeof HUSH_THEMES] || HUSH_THEMES.DEFAULT;
  return {
    background: themeData.colors.background,
    text: '#FFFFFF',
    subtext: 'rgba(255, 255, 255, 0.6)',
    accent: themeData.colors.primary,
    card: 'rgba(255, 255, 255, 0.12)',
    divider: 'rgba(255, 255, 255, 0.2)',
    fontHeader: 'System',
    fontBody: 'System',
  };
};

export const Breathe: React.FC<BreatheProps> = ({ onComplete, onCancel }) => {
  const { hushTheme, subscriptionTier, triggerPaywall } = useChatStore();
  const theme = getTheme(hushTheme);

  // Duration selection screen or breathing screen
  const [screen, setScreen] = useState<'select' | 'breathing'>('select');
  const [selectedDuration, setSelectedDuration] = useState<number>(60); // Default 1 minute
  const [pickerMinutes, setPickerMinutes] = useState<number>(15); // Default to 15 for picker
  const [isUsingPicker, setIsUsingPicker] = useState<boolean>(false); // Track if user is using picker vs preset buttons

  // Breathing state
  const [breathPhase, setBreathPhase] = useState<BreathPhase>('inhale');
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [isPaused, setIsPaused] = useState(false);

  // Animation
  const scaleAnim = useAnimatedValue(0.3);
  const opacityAnim = useAnimatedValue(0.8);

  // Breathing rhythm: 4-7-8 technique (4s inhale, 7s hold, 8s exhale, 2s hold)
  const breathingPattern = {
    inhale: 4000,
    hold_top: 7000,
    exhale: 8000,
    hold_bottom: 2000,
  };

  const phaseInstructions = {
    inhale: 'Breathe in...',
    hold_top: 'Hold...',
    exhale: 'Breathe out...',
    hold_bottom: 'Hold...',
  };

  // Animation reference for cleanup
  const currentAnimation = useRef<Animated.CompositeAnimation | null>(null);

  // Start breathing animation
  const animateBreath = (phase: BreathPhase) => {
    const duration = breathingPattern[phase];

    if (phase === 'inhale') {
      // Expand circle
      currentAnimation.current = Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }),
      ]);
      currentAnimation.current.start();
    } else if (phase === 'exhale') {
      // Contract circle
      currentAnimation.current = Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.3,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.8,
          duration,
          useNativeDriver: true,
        }),
      ]);
      currentAnimation.current.start();
    }
    // Hold phases don't animate the circle
  };

  // Breathing cycle effect
  useEffect(() => {
    if (screen !== 'breathing') return;

    if (isPaused) {
      // Stop all animations when paused
      if (currentAnimation.current) {
        currentAnimation.current.stop();
      }
      scaleAnim.stopAnimation();
      opacityAnim.stopAnimation();
      return;
    }

    animateBreath(breathPhase);

    const phaseTimer = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Cycle through breathing phases
      const nextPhase: Record<BreathPhase, BreathPhase> = {
        inhale: 'hold_top',
        hold_top: 'exhale',
        exhale: 'hold_bottom',
        hold_bottom: 'inhale',
      };
      setBreathPhase(nextPhase[breathPhase]);
    }, breathingPattern[breathPhase]);

    return () => {
      clearTimeout(phaseTimer);
      if (currentAnimation.current) {
        currentAnimation.current.stop();
      }
      scaleAnim.stopAnimation();
      opacityAnim.stopAnimation();
    };
  }, [breathPhase, screen, isPaused, scaleAnim, opacityAnim]);

  // Countdown timer
  useEffect(() => {
    if (screen !== 'breathing' || isPaused) return;

    if (timeRemaining <= 0) {
      handleComplete();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, screen, isPaused]);

  const handleComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete();
  };

  const startBreathing = (duration: number) => {
    setSelectedDuration(duration);
    setTimeRemaining(duration);
    setScreen('breathing');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const screenWidth = Dimensions.get('window').width;
  const circleSize = screenWidth * 0.6;

  // === DURATION SELECTION SCREEN ===
  if (screen === 'select') {
    return (
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: theme.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
      }}>
        {/* Close button */}
        <View
          style={{
            position: 'absolute',
            top: 60,
            right: 20,
            zIndex: 10,
          }}
        >
          <HushCloseButton onClose={onCancel} />
        </View>

        {/* Title */}
        <Text style={{
          fontFamily: theme.fontHeader,
          fontSize: 28,
          fontWeight: '700',
          color: theme.text,
          marginBottom: 12,
          textAlign: 'center',
        }}>
          Breathe
        </Text>

        <Text style={{
          fontFamily: theme.fontBody,
          fontSize: 16,
          color: theme.subtext,
          marginBottom: 40,
          textAlign: 'center',
          lineHeight: 24,
        }}>
          A guided breathing meditation{'\n'}using the 4-7-8 technique
        </Text>

        {/* Duration options */}
        <View style={{ width: '100%', maxWidth: 400 }}>
          {/* 1 minute - Free */}
          <HushCard
            variant={!isUsingPicker && selectedDuration === 60 ? 'highlighted' : 'default'}
            padding={20}
            style={{ marginBottom: 16, alignItems: 'center' }}
            onPress={() => {
              setIsUsingPicker(false);
              setSelectedDuration(60);
              startBreathing(60);
            }}
            accessibilityLabel="1 minute breathwork session"
            accessibilityHint="Quick session, available on Free tier"
          >
            <Text style={{
              fontFamily: theme.fontHeader,
              fontSize: 20,
              fontWeight: '700',
              color: theme.text,
              marginBottom: 4,
            }}>
              1 Minute
            </Text>
            <Text style={{
              fontFamily: theme.fontBody,
              fontSize: 14,
              color: theme.subtext,
            }}>
              Quick session • Free tier
            </Text>
          </HushCard>

          {/* Pro options */}
          {subscriptionTier !== 'FREE' ? (
            <>
              <HushCard
                variant={!isUsingPicker && selectedDuration === 300 ? 'highlighted' : 'default'}
                padding={20}
                style={{ marginBottom: 16, alignItems: 'center' }}
                onPress={() => {
                  setIsUsingPicker(false);
                  setSelectedDuration(300);
                  startBreathing(300);
                }}
                accessibilityLabel="5 minute breathwork session"
                accessibilityHint="Standard session, requires Pro subscription"
              >
                <Text style={{
                  fontFamily: theme.fontHeader,
                  fontSize: 20,
                  fontWeight: '700',
                  color: theme.text,
                  marginBottom: 4,
                }}>
                  5 Minutes
                </Text>
                <Text style={{
                  fontFamily: theme.fontBody,
                  fontSize: 14,
                  color: theme.subtext,
                }}>
                  Standard session • Pro
                </Text>
              </HushCard>

              <HushCard
                variant={!isUsingPicker && selectedDuration === 600 ? 'highlighted' : 'default'}
                padding={20}
                style={{ marginBottom: 16, alignItems: 'center' }}
                onPress={() => {
                  setIsUsingPicker(false);
                  setSelectedDuration(600);
                  startBreathing(600);
                }}
                accessibilityLabel="10 minute breathwork session"
                accessibilityHint="Deep session, requires Pro subscription"
              >
                <Text style={{
                  fontFamily: theme.fontHeader,
                  fontSize: 20,
                  fontWeight: '700',
                  color: theme.text,
                  marginBottom: 4,
                }}>
                  10 Minutes
                </Text>
                <Text style={{
                  fontFamily: theme.fontBody,
                  fontSize: 14,
                  color: theme.subtext,
                }}>
                  Deep session • Pro
                </Text>
              </HushCard>

              {/* Inline picker wheel */}
              <View
                style={{
                  backgroundColor: isUsingPicker ? `${theme.accent}1A` : theme.card,
                  borderWidth: isUsingPicker ? 2 : 1,
                  borderColor: isUsingPicker ? theme.accent : theme.divider,
                  padding: 20,
                  borderRadius: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{
                  fontFamily: theme.fontHeader,
                  fontSize: 20,
                  fontWeight: '700',
                  color: theme.text,
                  marginBottom: 4,
                }}>
                  Your Time
                </Text>
                <Text style={{
                  fontFamily: theme.fontBody,
                  fontSize: 14,
                  color: theme.subtext,
                  marginBottom: 16,
                }}>
                  Up to 30 minutes • Pro
                </Text>

                {/* Picker wheel container */}
                <View style={{ width: '100%', height: 150, position: 'relative' }}>
                  {/* Soft selection highlight bar (middle) */}
                  <View
                    style={{
                      position: 'absolute',
                      top: '50%',
                      marginTop: -25,
                      left: 0,
                      right: 0,
                      height: 50,
                      backgroundColor: theme.accent + '10',
                      borderRadius: 8,
                      zIndex: 1,
                      pointerEvents: 'none',
                    }}
                  />

                  {/* Scrollable picker */}
                  <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{
                      paddingVertical: 50, // Space for top/bottom padding
                      alignItems: 'center',
                    }}
                    showsVerticalScrollIndicator={false}
                    snapToInterval={50}
                    decelerationRate="fast"
                    onScroll={(event) => {
                      const offsetY = event.nativeEvent.contentOffset.y;
                      const index = Math.round(offsetY / 50);
                      const newMinutes = Math.max(1, Math.min(30, index + 1));
                      if (newMinutes !== pickerMinutes) {
                        setPickerMinutes(newMinutes);
                        setIsUsingPicker(true); // Mark picker as active
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                    }}
                    scrollEventThrottle={16}
                  >
                    {Array.from({ length: 30 }, (_, i) => i + 1).map((minutes) => (
                      <View
                        key={minutes}
                        style={{
                          height: 50,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: theme.fontHeader,
                            fontSize: minutes === pickerMinutes ? 32 : 20,
                            fontWeight: minutes === pickerMinutes ? '700' : '400',
                            color: minutes === pickerMinutes ? theme.accent : theme.subtext,
                          }}
                        >
                          {minutes}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>

                {/* Start button */}
                <View style={{ marginTop: 16 }}>
                  <HushButton
                    variant="primary"
                    onPress={() => startBreathing(pickerMinutes * 60)}
                    accessibilityHint={`Start a ${pickerMinutes} minute breathing session`}
                  >
                    Start
                  </HushButton>
                </View>
              </View>
            </>
          ) : (
            <HushCard
              padding={20}
              style={{ alignItems: 'center' }}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                triggerPaywall('breathe_extended_limit');
              }}
              accessibilityLabel="Extended breathwork sessions"
              accessibilityHint="Tap to upgrade to Pro for 5min, 10min, and custom duration sessions"
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons
                  name="lock-closed"
                  size={16}
                  color={theme.subtext}
                  style={{ marginRight: 6 }}
                />
                <Text style={{
                  fontFamily: theme.fontHeader,
                  fontSize: 16,
                  fontWeight: '600',
                  color: theme.subtext,
                }}>
                  Extended Sessions
                </Text>
              </View>
              <Text style={{
                fontFamily: theme.fontBody,
                fontSize: 14,
                color: theme.subtext,
                textAlign: 'center',
              }}>
                Upgrade to Pro for 5min, 10min, and custom duration sessions
              </Text>
            </HushCard>
          )}
        </View>
      </View>
    );
  }

  // === BREATHING SCREEN ===
  return (
    <View style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.background,
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      {/* Progress bar */}
      <View style={{
        position: 'absolute',
        top: 60,
        left: 20,
        right: 20,
        height: 4,
        backgroundColor: `${theme.accent}33`,
        borderRadius: 2,
        overflow: 'hidden',
      }}>
        <View style={{
          height: '100%',
          backgroundColor: theme.accent,
          width: `${((selectedDuration - timeRemaining) / selectedDuration) * 100}%`,
        }} />
      </View>

      {/* Time remaining */}
      <Text style={{
        position: 'absolute',
        top: 80,
        fontFamily: theme.fontBody,
        fontSize: 16,
        color: theme.subtext,
      }}>
        {formatTime(timeRemaining)}
      </Text>

      {/* Breathing circle */}
      <Animated.View style={{
        width: circleSize,
        height: circleSize,
        borderRadius: circleSize / 2,
        backgroundColor: `${theme.accent}33`,
        borderWidth: 3,
        borderColor: theme.accent,
        justifyContent: 'center',
        alignItems: 'center',
        transform: [{ scale: scaleAnim }],
        opacity: opacityAnim,
      }}>
        {/* Phase instruction */}
        <Text style={{
          fontFamily: theme.fontHeader,
          fontSize: 24,
          fontWeight: '700',
          color: theme.text,
          textAlign: 'center',
        }}>
          {phaseInstructions[breathPhase]}
        </Text>
      </Animated.View>

      {/* Controls */}
      <View style={{
        position: 'absolute',
        bottom: 60,
        flexDirection: 'row',
        gap: 20,
      }}>
        <TouchableOpacity
          style={{
            backgroundColor: theme.card,
            paddingHorizontal: 24,
            paddingVertical: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.divider,
          }}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setIsPaused(!isPaused);
          }}
          accessibilityLabel={isPaused ? "Resume breathing" : "Pause breathing"}
          accessibilityRole="button"
          accessibilityHint={isPaused ? "Resume the breathing exercise" : "Pause the breathing exercise"}
        >
          <Ionicons name={isPaused ? 'play' : 'pause'} size={24} color={theme.text} />
        </TouchableOpacity>

        <HushButton
          variant="secondary"
          onPress={onCancel}
          accessibilityHint="Exit the breathing session"
        >
          Exit
        </HushButton>
      </View>
    </View>
  );
};
