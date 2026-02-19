import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../state/rootStore';
import { HUSH_THEMES } from '../themes/themes';
import { renderClearAnimation } from '../animations/AnimationRegistry';
import { useSoundEffect } from '../hooks/useSoundEffect'
import { useAnimatedValue } from '../hooks/useAnimatedValue';;
import { HushCloseButton, HushButton, HushCard, HushInput, HushIconHeader } from '../../apps/hush/components/HushUI';

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

interface UnburdeningGuidedProps {
  onComplete: () => void;
  onCancel: () => void;
}

type GuidedStep = 1 | 2 | 3 | 4 | 5;
type GuidedScreen = 'intro' | 'guided' | 'confirm' | 'burning' | 'complete';

interface StepResponse {
  step: GuidedStep;
  question: string;
  answer: string;
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

// Guided protocol steps (Hush-only, non-terminal)
const GUIDED_PROTOCOL = {
  1: { title: 'Step 1: Identify', question: "What's weighing on you right now? Name it." },
  2: { title: 'Step 2: Feel', question: "What emotions come up when you think about this?\n(Anger? Sadness? Fear? Something else?)" },
  3: { title: 'Step 3: Impact', question: "How is this affecting you?\nYour sleep? Your relationships? Your work?" },
  4: { title: 'Step 4: Root', question: "What do you think this is really about?\nWhat's underneath?" },
  5: { title: 'Step 5: Release', question: "Imagine letting this go completely.\nWhat would that feel like?" },
};

export const UnburdeningGuided: React.FC<UnburdeningGuidedProps> = ({ onComplete, onCancel }) => {
  // MEMORY FIX: Selective subscriptions instead of destructuring
  const hushTheme = useChatStore((state) => state.hushTheme);
  const hushBurnStyle = useChatStore((state) => state.hushBurnStyle);
  const theme = getHushTheme(hushTheme);
  const { playForAnimation } = useSoundEffect();

  // Unburdening is Hush-only

  const [screen, setScreen] = useState<GuidedScreen>('intro');
  const [currentStep, setCurrentStep] = useState<GuidedStep>(1);
  const [currentInput, setCurrentInput] = useState('');
  const [responses, setResponses] = useState<StepResponse[]>([]);

  // Opacity animation for disintegration fadeout
  const confirmationOpacity = useAnimatedValue(1);

  const currentPrompt = GUIDED_PROTOCOL[currentStep];

  const handleContinue = () => {
    if (!currentInput.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    // Crisis detection - show resources if needed
    if (detectCrisisContent(currentInput)) {
      Alert.alert(
        'Support Resources',
        'If you\'re struggling, please reach out for support:\n\nNational Suicide Prevention Lifeline: 988\n\nCrisis Text Line: Text "HELLO" to 741741\n\nYou don\'t have to face this alone.',
        [
          {
            text: 'Continue',
            onPress: () => proceedToNextStep(),
          },
        ]
      );
      return;
    }

    proceedToNextStep();
  };

  const proceedToNextStep = () => {
    // Save response
    const response: StepResponse = {
      step: currentStep,
      question: currentPrompt.question,
      answer: currentInput.trim(),
    };

    setResponses((prev) => [...prev, response]);
    setCurrentInput('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Move to next step or completion
    if (currentStep === 5) {
      setScreen('confirm');
    } else {
      setCurrentStep((prev) => (prev + 1) as GuidedStep);
    }
  };

  const handleBack = () => {
    if (currentStep === 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setScreen('intro');
    } else {
      // Go to previous step and restore its answer
      const newStep = (currentStep - 1) as GuidedStep;
      const previousResponse = responses.find((r) => r.step === newStep);

      setCurrentStep(newStep);
      setCurrentInput(previousResponse?.answer || '');
      setResponses((prev) => prev.filter((r) => r.step !== currentStep));

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleConfirmBurn = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

  const handleAnimationComplete = () => {
    setScreen('complete');
    setTimeout(() => {
      onComplete();
    }, 2000);
  };

  // === INTRO SCREEN ===
  if (screen === 'intro') {
    return (
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: theme.background,
      }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, paddingTop: 80, justifyContent: 'center' }}>
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

          <HushIconHeader
            icon="compass-outline"
            title="Guided Unburdening"
            subtitle="A structured 5-step protocol to help you process and release. Take your time with each question. Everything will be deleted when complete."
            style={{ marginBottom: 40 }}
          />

          <HushCard
            padding={20}
            style={{
              marginBottom: 30,
              minWidth: 280,
              alignSelf: 'center',
            }}
          >
            <Text style={{
              fontFamily: theme.fontHeader,
              fontSize: 14,
              fontWeight: '600',
              color: theme.text,
              marginBottom: 12,
            }}>
              The 5 Steps:
            </Text>

            {[1, 2, 3, 4, 5].map((step) => (
              <Text
                key={step}
                style={{
                  fontFamily: theme.fontBody,
                  fontSize: 14,
                  color: theme.subtext,
                  marginBottom: 8,
                  lineHeight: 20,
                }}
              >
                {`${step}. ${GUIDED_PROTOCOL[step as GuidedStep].title.split(': ')[1]}`}
              </Text>
            ))}
          </HushCard>

          <View style={{ alignSelf: 'center', minWidth: 200 }}>
            <HushButton
              variant="primary"
              onPress={() => setScreen('guided')}
              accessibilityHint="Begin the 5-step guided unburdening process"
            >
              Begin
            </HushButton>
          </View>
        </ScrollView>
      </View>
    );
  }

  // === GUIDED STEPS SCREEN ===
  if (screen === 'guided') {
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
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 30,
          }}>
            <TouchableOpacity
              onPress={handleBack}
              style={{ marginRight: 12 }}
            >
              <Ionicons name="arrow-back" size={28} color={theme.text} />
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text style={{
                fontFamily: theme.fontHeader,
                fontSize: 18,
                fontWeight: '700',
                color: theme.text,
              }}>
                {currentPrompt.title}
              </Text>
              <Text style={{
                fontFamily: theme.fontBody,
                fontSize: 12,
                color: theme.subtext,
              }}>
                {`Progress: ${currentStep}/5`}
              </Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={{
            height: 4,
            backgroundColor: `${theme.accent}20`,
            borderRadius: 2,
            marginBottom: 30,
          }}>
            <View style={{
              height: '100%',
              backgroundColor: theme.accent,
              borderRadius: 2,
              width: `${(currentStep / 5) * 100}%`,
            }} />
          </View>

          {/* Current question */}
          <HushCard
            variant="highlighted"
            padding={20}
            style={{ marginBottom: 20 }}
          >
            <Text style={{
              fontFamily: theme.fontBody,
              fontSize: 18,
              color: theme.text,
              lineHeight: 28,
              textAlign: 'center',
            }}>
              {currentPrompt.question}
            </Text>
          </HushCard>

          {/* Previous responses (collapsed) */}
          {responses.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <Text style={{
                fontFamily: theme.fontHeader,
                fontSize: 14,
                fontWeight: '600',
                color: theme.subtext,
                marginBottom: 12,
              }}>
                Your responses:
              </Text>

              {responses.map((response, index) => (
                <HushCard
                  key={`response-${response.step}-${index}`}
                  padding={12}
                  style={{
                    borderRadius: 8,
                    marginBottom: 8,
                  }}
                >
                  <Text style={{
                    fontFamily: theme.fontBody,
                    fontSize: 12,
                    color: theme.subtext,
                    marginBottom: 6,
                  }}>
                    {GUIDED_PROTOCOL[response.step].title.split(': ')[1]}
                  </Text>
                  <Text style={{
                    fontFamily: theme.fontBody,
                    fontSize: 14,
                    color: theme.text,
                    lineHeight: 20,
                  }}>
                    {response.answer}
                  </Text>
                </HushCard>
              ))}
            </View>
          )}

          {/* Input area */}
          <View style={{ flex: 1, minHeight: 200 }}>
            <HushInput
              value={currentInput}
              onChangeText={setCurrentInput}
              placeholder="Type your response..."
              multiline
              autoFocus
              style={{ flex: 1, minHeight: 200 }}
              accessibilityLabel="Step response"
              accessibilityHint={`Type your response to: ${currentPrompt.question}`}
            />
          </View>

          {/* Continue button */}
          <View style={{ marginTop: 20 }}>
            <HushButton
              variant="primary"
              onPress={handleContinue}
              disabled={!currentInput.trim()}
              fullWidth
              accessibilityHint={currentStep === 5 ? "Complete the final step and proceed to release" : "Continue to the next guided step"}
            >
              {currentStep === 5 ? 'Complete' : 'Continue'}
            </HushButton>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // === CONFIRMATION SCREEN ===
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
          Journey Complete
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
          You've worked through all 5 steps.{'\n'}Ready to release everything?
        </Text>

        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View style={{ flex: 1 }}>
            <HushButton
              variant="secondary"
              onPress={() => setScreen('guided')}
              accessibilityHint="Return to the guided steps"
            >
              Go Back
            </HushButton>
          </View>

          <View style={{ flex: 1 }}>
            <HushButton
              variant="primary"
              onPress={handleConfirmBurn}
              accessibilityHint="Confirm and release all your responses"
            >
              Release It
            </HushButton>
          </View>
        </View>
      </View>
    );
  }

  // === BURNING SCREEN ===
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
            Journey Complete
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
            You've worked through all 5 steps.{'\n'}Ready to release everything?
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

  // === COMPLETION SCREEN ===
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
