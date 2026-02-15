import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useChatStore } from '../state/rootStore';
import { useShallow } from 'zustand/react/shallow';
import { CLASSIFIED_THEMES } from '../themes/themes';
import {
  ClassifiedHeader,
  ClassifiedButton,
  ClassifiedTextInput,
} from './components/ClassifiedUI';

interface BreachProtocolProps {
  onComplete: () => void;
  onCancel: () => void;
  onViewGallery?: () => void;
}

type BreachScreen = 'layer' | 'complete';

interface LayerDefinition {
  number: number;
  title: string;
  description: string;
  hint: string;
  answer: string;
  educationalMessage: string;
  validateFn: (answer: string) => boolean;
}

// Layer definitions with educational content
const LAYERS: LayerDefinition[] = [
  {
    number: 1,
    title: 'SOCIAL_ENGINEERING_DEFENSE',
    description: `SCENARIO: Caller claims to be IT, asks for password\nto "fix your account urgently."\n\nCORRECT RESPONSE?`,
    hint: 'Never trust unsolicited requests',
    answer: 'B',
    educationalMessage: 'Never trust unsolicited requests.\nVerify through official channels.',
    validateFn: (answer: string) => answer.toLowerCase().trim() === 'b',
  },
  {
    number: 2,
    title: 'PASSWORD_STRENGTH_ANALYSIS',
    description: `TARGET HASH: 5f4dcc3b5aa765d61d8327deb882cf99\nHINT: Common dictionary word`,
    hint: 'Try the most common password',
    answer: 'password',
    educationalMessage: `✓ CORRECT - Cracked in 0.3 seconds

WEAK (<8 chars, simple):
  "password", "123456" → Instant crack

MEDIUM (8-12 chars, mixed):
  "Pass123!" → Minutes to crack

STRONG (13+ chars, complex):
  "MyDog&Coffee2024!" → Years to crack

Use passphrases: "correct-horse-battery-staple"`,
    validateFn: (answer: string) => answer.toLowerCase().trim() === 'password',
  },
  {
    number: 3,
    title: 'PHISHING_DETECTION',
    description: `FROM: security@paypai.com\nSUBJECT: Urgent: Account suspended\nClick here to verify: paypai.com/verify\n\nRED FLAGS?`,
    hint: 'All three are red flags',
    answer: 'A,B,C',
    educationalMessage: '95% of breaches start with phishing.\nAlways verify sender domains.',
    validateFn: (answer: string) => {
      const normalized = answer.toLowerCase().trim();
      const hasA = normalized.includes('a');
      const hasB = normalized.includes('b');
      const hasC = normalized.includes('c');
      return (hasA && hasB) || (hasB && hasC) || (hasA && hasC); // At least 2
    },
  },
  {
    number: 4,
    title: 'OPSEC_LEAK_DETECTION',
    description: `AGENT POST: "Just landed in [REDACTED] for the\nbig meeting. Hotel room 517 has a great view of\nthe embassy across the street! 📸"\n\nSECURITY VIOLATIONS?`,
    hint: 'All four are violations',
    answer: 'A,B,C,D',
    educationalMessage: 'OPSEC = Operational Security.\nLoose lips sink ships. Every detail matters.',
    validateFn: (answer: string) => {
      const normalized = answer.toLowerCase().trim();
      return normalized.includes('a') && normalized.includes('b') &&
             normalized.includes('c') && normalized.includes('d');
    },
  },
  {
    number: 5,
    title: 'ENCRYPTION_FUNDAMENTALS',
    description: `ENCRYPTED: VHFXULW LV D SURFHVV\nCIPHER: Caesar (ROT3)\n\nDECODE:`,
    hint: 'Each letter shifts back 3 positions',
    answer: 'SECURITY IS A PROCESS',
    educationalMessage: 'Modern encryption uses 256-bit AES.\nCaesar = ancient but teaches principles.',
    validateFn: (answer: string) => {
      const normalized = answer.toLowerCase().trim().replace(/[\s_]/g, '');
      return normalized === 'securityisaprocess';
    },
  },
];

export const BreachProtocol: React.FC<BreachProtocolProps> = ({ onComplete, onCancel, onViewGallery }) => {
  const classifiedTheme = useChatStore((state) => state.classifiedTheme);
  // CRITICAL: Use useShallow to prevent re-renders when gameState reference changes
  const gameProgress = useChatStore(
    useShallow((state) => state.gameState.gameProgress.breach_protocol)
  );

  const [screen, setScreen] = useState<BreachScreen>('layer');
  const [currentLayer, setCurrentLayer] = useState(1);
  const [userAnswer, setUserAnswer] = useState('');
  const [layerResult, setLayerResult] = useState<'pending' | 'correct' | 'incorrect'>('pending');
  const [showEducationalMessage, setShowEducationalMessage] = useState(false);
  const [completedLayers, setCompletedLayers] = useState<number[]>([]);
  const [skippedLayers, setSkippedLayers] = useState<number[]>([]);
  const [wrongAttempts, setWrongAttempts] = useState(0);

  // Note: We intentionally don't load completedLayers from store on mount
  // This allows the game to be replayed from the beginning each time
  // Badge unlocking still works because it's triggered in App.tsx on completion
  // Reset skippedLayers on mount for fresh runs
  useEffect(() => {
    // Clear skipped layers when starting a new game session
    useChatStore.setState((state) => ({
      gameState: {
        ...state.gameState,
        gameProgress: {
          ...state.gameState.gameProgress,
          breach_protocol: {
            ...state.gameState.gameProgress.breach_protocol,
            skippedLayers: [],
          },
        },
      },
    }));
  }, []);

  // Auto-close after completing all layers (only if badge not unlocked)
  useEffect(() => {
    if (screen === 'complete') {
      const badgeUnlocked = completedLayers.length === 5 && skippedLayers.length === 0;
      if (!badgeUnlocked) {
        const timer = setTimeout(() => {
          handleCompleteAndClose();
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [screen, completedLayers, skippedLayers]);

  // Get CLASSIFIED theme
  const themeData = CLASSIFIED_THEMES[classifiedTheme as keyof typeof CLASSIFIED_THEMES] || CLASSIFIED_THEMES.TERMINAL_RED;
  const TACTICAL_COLOR = themeData.colors.primary;
  const BG_COLOR = themeData.colors.background;
  const CARD_BG = themeData.colors.cardBg;

  // Get secondary color for success messages (complementary to primary)
  const getSecondaryColor = () => {
    switch (classifiedTheme) {
      case 'CYBERPUNK': return '#FF00FF'; // Pink/Magenta
      case 'MATRIX_GREEN': return '#FFFFFF'; // White
      case 'TERMINAL_RED': return '#FFB000'; // Amber
      case 'TERMINAL_AMBER': return '#FF3333'; // Red
      case 'STEALTH': return '#CCCCCC'; // Light gray
      default: return themeData.colors.accent;
    }
  };
  const SECONDARY_COLOR = getSecondaryColor();

  const handleSubmit = () => {
    if (!userAnswer.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    const currentLayerDef = LAYERS[currentLayer - 1];
    const isCorrect = currentLayerDef.validateFn(userAnswer);

    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLayerResult('correct');
      setShowEducationalMessage(true);

      // Save progress to store
      const newCompleted = [...completedLayers, currentLayer];
      setCompletedLayers(newCompleted);

      useChatStore.setState((state) => ({
        gameState: {
          ...state.gameState,
          gameProgress: {
            ...state.gameState.gameProgress,
            breach_protocol: {
              ...state.gameState.gameProgress.breach_protocol,
              completedLayers: newCompleted,
            },
          },
        },
      }));

      // Check if all layers complete
      if (currentLayer === 5) {
        // All layers complete - go to complete screen
        setScreen('complete');
      }
      // Otherwise, show NEXT button (no auto-advance)
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setLayerResult('incorrect');
      setWrongAttempts(prev => prev + 1); // Track wrong attempts

      // Allow retry after 1.5 seconds
      setTimeout(() => {
        setLayerResult('pending');
        setUserAnswer('');
      }, 1500);
    }
  };

  const handleCompleteAndClose = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete();
  };

  const handleNextLayer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentLayer(currentLayer + 1);
    setUserAnswer('');
    setLayerResult('pending');
    setShowEducationalMessage(false);
    setWrongAttempts(0); // Reset wrong attempts for new layer
  };

  const handleSkipLayer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Track this as a skipped layer
    const newSkipped = [...skippedLayers, currentLayer];
    setSkippedLayers(newSkipped);

    // Save to store
    useChatStore.setState((state) => ({
      gameState: {
        ...state.gameState,
        gameProgress: {
          ...state.gameState.gameProgress,
          breach_protocol: {
            ...state.gameState.gameProgress.breach_protocol,
            skippedLayers: newSkipped,
          },
        },
      },
    }));

    // Move to next layer or complete if last layer
    if (currentLayer === 5) {
      setScreen('complete');
    } else {
      setCurrentLayer(currentLayer + 1);
      setUserAnswer('');
      setLayerResult('pending');
      setShowEducationalMessage(false);
      setWrongAttempts(0);
    }
  };

  const handleButtonAnswer = (answer: string) => {
    setUserAnswer(answer);
    // Trigger validation immediately
    setTimeout(() => {
      const currentLayerDef = LAYERS[currentLayer - 1];
      const isCorrect = currentLayerDef.validateFn(answer);

      if (isCorrect) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setLayerResult('correct');
        setShowEducationalMessage(true);

        // Save progress to store
        const newCompleted = [...completedLayers, currentLayer];
        setCompletedLayers(newCompleted);

        useChatStore.setState((state) => ({
          gameState: {
            ...state.gameState,
            gameProgress: {
              ...state.gameState.gameProgress,
              breach_protocol: {
                ...state.gameState.gameProgress.breach_protocol,
                completedLayers: newCompleted,
              },
            },
          },
        }));

        // Check if all layers complete
        if (currentLayer === 5) {
          // All layers complete - go to complete screen
          setScreen('complete');
        }
        // Otherwise, show NEXT button (no auto-advance)
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setLayerResult('incorrect');
        setWrongAttempts(prev => prev + 1); // Track wrong attempts

        // Allow retry after 1.5 seconds
        setTimeout(() => {
          setLayerResult('pending');
          setUserAnswer('');
        }, 1500);
      }
    }, 100);
  };

  // === SCREEN: LAYER ===
  const renderLayerScreen = () => {
    const currentLayerDef = LAYERS[currentLayer - 1];

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, paddingHorizontal: 20 }}>
          <ClassifiedHeader
            title={`// FIREWALL_${currentLayer}/5`}
            subtitle={currentLayerDef.title}
            onClose={onCancel}
            tacticalColor={TACTICAL_COLOR}
            cardBg={CARD_BG}
          />

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Description */}
            <View style={{ marginBottom: 30 }}>
              <Text style={{
                fontFamily: 'Courier',
                fontSize: 14,
                color: '#999',
                lineHeight: 22,
              }}>
                {currentLayerDef.description}
              </Text>
            </View>

            {/* Educational Message (after correct answer) */}
            {showEducationalMessage && (
              <>
                <View style={{
                  backgroundColor: TACTICAL_COLOR + '20',
                  borderLeftWidth: 4,
                  borderLeftColor: TACTICAL_COLOR,
                  padding: 16,
                  marginBottom: 20,
                  borderRadius: 4,
                }}>
                  <Text style={{
                    fontFamily: 'Courier',
                    fontSize: 13,
                    color: TACTICAL_COLOR,
                    fontWeight: 'bold',
                    marginBottom: 8,
                  }}>
                    ✓ CORRECT
                  </Text>
                  <Text style={{
                    fontFamily: 'Courier',
                    fontSize: 13,
                    color: '#FFF',
                    lineHeight: 20,
                  }}>
                    {currentLayerDef.educationalMessage}
                  </Text>
                </View>

                {/* NEXT button - only show if not on last layer */}
                {currentLayer < 5 && (
                  <ClassifiedButton
                    label="NEXT_FIREWALL"
                    onPress={handleNextLayer}
                    tacticalColor={TACTICAL_COLOR}
                    style={{ marginBottom: 20 }}
                  />
                )}
              </>
            )}

            {/* Result Message */}
            {layerResult === 'incorrect' && (
              <View style={{
                backgroundColor: '#FF0000' + '20',
                borderLeftWidth: 4,
                borderLeftColor: '#FF0000',
                padding: 16,
                marginBottom: 20,
                borderRadius: 4,
              }}>
                <Text style={{
                  fontFamily: 'Courier',
                  fontSize: 13,
                  color: '#FF0000',
                  fontWeight: 'bold',
                }}>
                  ✗ INCORRECT - TRY AGAIN
                </Text>
              </View>
            )}

            {/* Input */}
            {layerResult === 'pending' && (
              <>
                {/* Layers with button-based answers (1, 3, 4) */}
                {(currentLayer === 1 || currentLayer === 3 || currentLayer === 4) ? (
                  <>
                    <View style={{ marginBottom: 20 }}>
                      {currentLayer === 1 && (
                        // Social Engineering: Single select
                        <>
                          <Text style={{
                            fontFamily: 'Courier',
                            fontSize: 12,
                            color: TACTICAL_COLOR,
                            marginBottom: 12,
                          }}>
                            SELECT_RESPONSE:
                          </Text>
                          <View style={{ gap: 12 }}>
                            <ClassifiedButton
                              label="A) PROVIDE_PASSWORD"
                              onPress={() => handleButtonAnswer('A')}
                              tacticalColor={TACTICAL_COLOR}
                              variant="secondary"
                            />
                            <ClassifiedButton
                              label="B) HANG_UP_AND_VERIFY"
                              onPress={() => handleButtonAnswer('B')}
                              tacticalColor={TACTICAL_COLOR}
                              variant="secondary"
                            />
                            <ClassifiedButton
                              label="C) ASK_FOR_EMPLOYEE_ID"
                              onPress={() => handleButtonAnswer('C')}
                              tacticalColor={TACTICAL_COLOR}
                              variant="secondary"
                            />
                          </View>
                        </>
                      )}

                      {currentLayer === 3 && (
                        // Phishing: Multi-select buttons
                        <>
                          <Text style={{
                            fontFamily: 'Courier',
                            fontSize: 12,
                            color: TACTICAL_COLOR,
                            marginBottom: 12,
                          }}>
                            SELECT_RED_FLAGS:
                          </Text>
                          <View style={{ gap: 12 }}>
                            <ClassifiedButton
                              label="A) MISSPELLED_DOMAIN"
                              onPress={() => handleButtonAnswer('A')}
                              tacticalColor={TACTICAL_COLOR}
                              variant="secondary"
                            />
                            <ClassifiedButton
                              label="B) URGENT_LANGUAGE"
                              onPress={() => handleButtonAnswer('B')}
                              tacticalColor={TACTICAL_COLOR}
                              variant="secondary"
                            />
                            <ClassifiedButton
                              label="C) SUSPICIOUS_LINK"
                              onPress={() => handleButtonAnswer('C')}
                              tacticalColor={TACTICAL_COLOR}
                              variant="secondary"
                            />
                            <ClassifiedButton
                              label="ALL_OF_THE_ABOVE"
                              onPress={() => handleButtonAnswer('A,B,C')}
                              tacticalColor={TACTICAL_COLOR}
                              variant="secondary"
                            />
                          </View>
                        </>
                      )}

                      {currentLayer === 4 && (
                        // OPSEC: Multi-select
                        <>
                          <Text style={{
                            fontFamily: 'Courier',
                            fontSize: 12,
                            color: TACTICAL_COLOR,
                            marginBottom: 12,
                          }}>
                            SELECT_VIOLATIONS:
                          </Text>
                          <View style={{ gap: 12 }}>
                            <ClassifiedButton
                              label="A) LOCATION_DISCLOSURE"
                              onPress={() => handleButtonAnswer('A')}
                              tacticalColor={TACTICAL_COLOR}
                              variant="secondary"
                            />
                            <ClassifiedButton
                              label="B) ROOM_NUMBER"
                              onPress={() => handleButtonAnswer('B')}
                              tacticalColor={TACTICAL_COLOR}
                              variant="secondary"
                            />
                            <ClassifiedButton
                              label="C) TARGET_IDENTIFICATION"
                              onPress={() => handleButtonAnswer('C')}
                              tacticalColor={TACTICAL_COLOR}
                              variant="secondary"
                            />
                            <ClassifiedButton
                              label="D) SOCIAL_MEDIA_USAGE"
                              onPress={() => handleButtonAnswer('D')}
                              tacticalColor={TACTICAL_COLOR}
                              variant="secondary"
                            />
                            <ClassifiedButton
                              label="ALL_OF_THE_ABOVE"
                              onPress={() => handleButtonAnswer('A,B,C,D')}
                              tacticalColor={TACTICAL_COLOR}
                              variant="secondary"
                            />
                          </View>
                        </>
                      )}
                    </View>

                    {/* Hint - only show after 2 wrong attempts */}
                    {wrongAttempts >= 2 && (
                      <Text style={{
                        fontFamily: 'Courier',
                        fontSize: 12,
                        color: '#666',
                        fontStyle: 'italic',
                        textAlign: 'center',
                        marginTop: 20,
                      }}>
                        HINT: {currentLayerDef.hint}
                      </Text>
                    )}
                  </>
                ) : (
                  // Layers with text input (2, 5)
                  <>
                    <ClassifiedTextInput
                      label={
                        currentLayer === 2 ? 'CRACK_IT:' :
                        'DECODED_TEXT:'
                      }
                      value={userAnswer}
                      onChangeText={setUserAnswer}
                      placeholder="Type your answer..."
                      tacticalColor={TACTICAL_COLOR}
                      cardBg={CARD_BG}
                      autoCapitalize="none"
                      autoCorrect={false}
                      onSubmitEditing={handleSubmit}
                      style={{ marginBottom: 20 }}
                    />

                    <ClassifiedButton
                      label="SUBMIT_ANSWER"
                      onPress={handleSubmit}
                      tacticalColor={TACTICAL_COLOR}
                      style={{ marginBottom: 20 }}
                    />

                    {/* Hint - always visible for text input layers */}
                    <Text style={{
                      fontFamily: 'Courier',
                      fontSize: 12,
                      color: '#666',
                      fontStyle: 'italic',
                      textAlign: 'center',
                    }}>
                      HINT: {currentLayerDef.hint}
                    </Text>
                  </>
                )}

                {/* Skip Layer Button - shown after 3 wrong attempts */}
                {wrongAttempts >= 3 && (
                  <ClassifiedButton
                    label="SKIP_LAYER_[NO_BADGE]"
                    onPress={handleSkipLayer}
                    tacticalColor="#666"
                    variant="secondary"
                    style={{ marginTop: 20 }}
                  />
                )}
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    );
  };

  // === SCREEN: COMPLETE ===
  const renderCompleteScreen = () => {
    // Check if badge was unlocked (all 5 layers completed with no skips)
    const badgeUnlocked = completedLayers.length === 5 && skippedLayers.length === 0;

    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }}>
        <Ionicons
          name="shield-checkmark"
          size={64}
          color={TACTICAL_COLOR}
          style={{ marginBottom: 30 }}
        />

        <Text style={{
          fontFamily: 'Courier',
          fontSize: 18,
          fontWeight: 'bold',
          color: TACTICAL_COLOR,
          textAlign: 'center',
          marginBottom: 10,
          letterSpacing: 1,
        }}>
          ✓ SECURITY_TRAINING_COMPLETE
        </Text>

        {badgeUnlocked && (
          <>
            <Text style={{
              fontFamily: 'Courier',
              fontSize: 14,
              color: SECONDARY_COLOR,
              textAlign: 'center',
              marginTop: 20,
            }}>
              BADGE UNLOCKED: SECURITY_CERTIFIED
            </Text>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, width: '100%', paddingHorizontal: 20 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  borderWidth: 2,
                  borderColor: TACTICAL_COLOR,
                  paddingVertical: 14,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onComplete();
                }}
              >
                <Text style={{ fontFamily: 'Courier', fontSize: 13, color: TACTICAL_COLOR, fontWeight: '600' }}>
                  DISMISS
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: TACTICAL_COLOR,
                  paddingVertical: 14,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  if (onViewGallery) {
                    onViewGallery();
                  }
                  onComplete();
                }}
              >
                <Text style={{ fontFamily: 'Courier', fontSize: 13, color: '#000', fontWeight: '600' }}>
                  VIEW_GALLERY
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {!badgeUnlocked && (
          <Text style={{
            fontFamily: 'Courier',
            fontSize: 12,
            color: SECONDARY_COLOR,
            opacity: 0.6,
            fontStyle: 'italic',
            textAlign: 'center',
            marginTop: 40,
          }}>
            [Auto-closing in 3s]
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: BG_COLOR }]}>
      {/* Screen Rendering */}
      {screen === 'layer' && renderLayerScreen()}
      {screen === 'complete' && renderCompleteScreen()}
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
    zIndex: 100,
  },
});
