import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../state/rootStore';
import { HUSH_THEMES } from '../themes/themes';
import { renderClearAnimation } from '../animations/AnimationRegistry';
import { useSoundEffect } from '../hooks/useSoundEffect'
import { useAnimatedValue } from '../hooks/useAnimatedValue';;
import { HushCloseButton, HushButton, HushCard, HushInput, HushScreenHeader, HushIconHeader } from '../../apps/hush/components/HushUI';

// Crisis keywords that warrant resources
const CRISIS_KEYWORDS = [
  'kill myself', 'suicide', 'end my life', 'want to die', 'better off dead',
  'hurt myself', 'self harm', 'cut myself', 'kill someone', 'hurt them',
  'abuse', 'abused', 'abusing', 'molest', 'assault'
];

function detectCrisisContent(text: string): boolean {
  const lowerText = text.toLowerCase();
  return CRISIS_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

interface UnburdeningFreeformProps {
  onComplete: () => void;
  onCancel: () => void;
}

// Helper to get Hush theme properties
// NOTE: Unburdening is Hush-only, no Classified/Discretion support needed
const getHushTheme = (hushTheme: string) => {
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

export const UnburdeningFreeform: React.FC<UnburdeningFreeformProps> = ({ onComplete, onCancel }) => {
  const { hushTheme, hushBurnStyle } = useChatStore();
  const theme = getHushTheme(hushTheme);
  const { playForAnimation } = useSoundEffect();

  const [screen, setScreen] = useState<'write' | 'confirm' | 'burning' | 'complete'>('write');
  const [text, setText] = useState('');

  // Opacity animation for disintegration fadeout
  const confirmationOpacity = useAnimatedValue(1);

  const handleAnimationComplete = () => {
    setScreen('complete');
    // Auto-complete after showing completion message
    setTimeout(() => {
      onComplete();
    }, 2000);
  };

  const handleBurnPress = () => {
    if (text.trim().length === 0) return;

    // Crisis detection - show resources if needed
    if (detectCrisisContent(text)) {
      Alert.alert(
        'Support Resources',
        'If you\'re struggling, please reach out for support:\n\nNational Suicide Prevention Lifeline: 988\n\nCrisis Text Line: Text "HELLO" to 741741\n\nYou don\'t have to face this alone.',
        [
          {
            text: 'Continue',
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setScreen('confirm');
            },
          },
        ]
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setScreen('confirm');
  };

  const handleConfirmBurn = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Play sound effect for the animation
    playForAnimation(hushBurnStyle);

    setScreen('burning');

    // Fade out confirmation screen elements if using disintegration or clear animation
    if (hushBurnStyle === 'disintegrate') {
      Animated.timing(confirmationOpacity, {
        toValue: 0,
        duration: 1500,
        useNativeDriver: true,
      }).start();
    } else if (hushBurnStyle === 'clear') {
      Animated.timing(confirmationOpacity, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCancel();
  };

  // Write screen
  if (screen === 'write') {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: theme.background,
        }}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, paddingTop: 60 }}>
          {/* Header */}
          <HushScreenHeader
            title="The Unburdening"
            subtitle="Freeform Mode"
            onClose={handleCancel}
            style={{ marginBottom: 20 }}
          />

          {/* Instructions */}
          <HushCard style={{ marginBottom: 20 }}>
            <Text style={{
              fontFamily: theme.fontBody,
              fontSize: 14,
              color: theme.subtext,
              lineHeight: 22,
            }}>
              Write whatever weighs on you. No AI processing. When ready, release it all.
            </Text>
          </HushCard>

          {/* Text input area */}
          <HushInput
            value={text}
            onChangeText={setText}
            placeholder="Begin typing..."
            multiline
            autoFocus
            style={{ flex: 1, minHeight: 300 }}
            accessibilityLabel="Unburdening text area"
            accessibilityHint="Write your thoughts freely without AI processing"
          />

          {/* Burn button */}
          <View style={{ marginTop: 20 }}>
            <HushButton
              variant="primary"
              onPress={handleBurnPress}
              disabled={text.trim().length === 0}
              icon="balloon-outline"
              fullWidth
              accessibilityHint="Release your thoughts and clear them from the screen"
            >
              Release It
            </HushButton>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Confirmation screen
  if (screen === 'confirm') {
    return (
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
      }}>
        <Ionicons name="balloon-outline" size={80} color={theme.accent} style={{ marginBottom: 30 }} />

        <Text style={{
          fontFamily: theme.fontHeader,
          fontSize: 28,
          fontWeight: '700',
          color: theme.text,
          marginBottom: 16,
          textAlign: 'center',
        }}>
          Release Now?
        </Text>

        <Text style={{
          fontFamily: theme.fontBody,
          fontSize: 16,
          color: theme.subtext,
          textAlign: 'center',
          lineHeight: 24,
          marginBottom: 40,
          maxWidth: 400,
        }}>
          This will permanently delete your words.{'\n'}No recovery is possible. Everything will be released.
        </Text>

        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View style={{ flex: 1 }}>
            <HushButton
              variant="secondary"
              onPress={() => {
                setScreen('write');
              }}
              accessibilityHint="Return to editing your message"
            >
              Go Back
            </HushButton>
          </View>

          <View style={{ flex: 1 }}>
            <HushButton
              variant="primary"
              onPress={handleConfirmBurn}
              accessibilityHint="Confirm and release your thoughts"
            >
              Release It
            </HushButton>
          </View>
        </View>
      </View>
    );
  }

  // Burning animation screen - render confirmation screen with animation overlay
  if (screen === 'burning') {
    const animation = renderClearAnimation(hushBurnStyle, false, handleAnimationComplete);

    return (
      <>
        {/* Keep confirmation screen visible for blur effect */}
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}>
          <Animated.View style={{
            opacity: confirmationOpacity,
            alignItems: 'center',
          }}>
            <Ionicons name="balloon-outline" size={80} color={theme.accent} style={{ marginBottom: 30 }} />

          <Text style={{
            fontFamily: theme.fontHeader,
            fontSize: 28,
            fontWeight: '700',
            color: theme.text,
            marginBottom: 16,
            textAlign: 'center',
          }}>
            Release Now?
          </Text>

          <Text style={{
            fontFamily: theme.fontBody,
            fontSize: 16,
            color: theme.subtext,
            textAlign: 'center',
            lineHeight: 24,
            marginBottom: 40,
            maxWidth: 400,
          }}>
            This will permanently delete your words.{'\n'}No recovery is possible. Everything will be released.
          </Text>

          <View style={{ flexDirection: 'row', gap: 16 }}>
            <View
              style={{
                backgroundColor: theme.card,
                paddingHorizontal: 32,
                paddingVertical: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.divider,
                minWidth: 140,
              }}
            >
              <Text style={{
                fontFamily: theme.fontHeader,
                fontSize: 16,
                fontWeight: '700',
                color: theme.text,
                textAlign: 'center',
              }}>
                Go Back
              </Text>
            </View>

            <View
              style={{
                backgroundColor: theme.accent,
                paddingHorizontal: 32,
                paddingVertical: 16,
                borderRadius: 12,
                minWidth: 140,
              }}
            >
              <Text style={{
                fontFamily: theme.fontHeader,
                fontSize: 16,
                fontWeight: '700',
                color: '#000',
                textAlign: 'center',
              }}>
                Release It
              </Text>
            </View>
          </View>
          </Animated.View>
        </View>

        {/* Animation overlay */}
        {animation}
      </>
    );
  }

  // Completion screen
  return (
    <View style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    }}>
      <HushIconHeader
        icon="checkmark-circle"
        title="Complete"
        subtitle="Released."
      />
    </View>
  );
};
