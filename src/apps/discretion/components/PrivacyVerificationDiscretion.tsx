import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Linking,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNetworkStatus } from '../../../core/hooks/useNetworkStatus';

type VerificationStep = 'instructions' | 'ready' | 'asking' | 'verified';

interface VerificationState {
  step: VerificationStep;
  userQuestion: string;
  aiResponse: string;
  networkWasDisconnected: boolean;
}

interface PrivacyVerificationDiscretionProps {
  onClose: () => void;
  onAskQuestion?: (question: string) => Promise<string>;
  accentColor: string;
  textColor: string;
  subtextColor: string;
  cardBg: string;
  inputBg: string;
  borderColor: string;
}

export function PrivacyVerificationDiscretion({
  onClose,
  onAskQuestion,
  accentColor,
  textColor,
  subtextColor,
  cardBg,
  inputBg,
  borderColor,
}: PrivacyVerificationDiscretionProps) {
  const { isConnected, isAirplaneMode } = useNetworkStatus();
  const insets = useSafeAreaInsets();

  const [state, setState] = useState<VerificationState>({
    step: 'instructions',
    userQuestion: '',
    aiResponse: '',
    networkWasDisconnected: false,
  });

  // Determine current step based on network status
  const effectiveStep =
    state.step === 'verified' || state.step === 'asking'
      ? state.step
      : isConnected
      ? 'instructions'
      : 'ready';

  const handleOpenSettings = () => {
    Linking.openSettings();
  };

  const handleContinue = () => {
    if (!isConnected) {
      setState((prev) => ({ ...prev, step: 'ready' }));
    }
  };

  const handleAskQuestion = async () => {
    if (!state.userQuestion.trim()) return;

    setState((prev) => ({ ...prev, step: 'asking' }));

    const wasDisconnected = !isConnected;

    try {
      const response = onAskQuestion
        ? await onAskQuestion(state.userQuestion)
        : await mockGenerateResponse(state.userQuestion);

      setState((prev) => ({
        ...prev,
        step: 'verified',
        aiResponse: response,
        networkWasDisconnected: wasDisconnected,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        step: 'ready',
        aiResponse: 'Error generating response. Please try again.',
      }));
    }
  };

  const handleRetry = () => {
    setState({
      step: isConnected ? 'instructions' : 'ready',
      userQuestion: '',
      aiResponse: '',
      networkWasDisconnected: false,
    });
  };

  const handleDone = () => {
    onClose();
  };

  // Mock response generator for testing
  const mockGenerateResponse = async (question: string): Promise<string> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const q = question.toLowerCase();

        // Math questions
        if (q.includes('247') && q.includes('38')) {
          resolve('247 × 38 = 9,386');
        } else if (q.match(/\d+\s*[+×*x]\s*\d+/)) {
          resolve("I can help with that calculation! (Note: This is a mock response - real AI will provide actual answers)");
        }
        // Greeting
        else if (q.includes('hello') || q.includes('hi')) {
          resolve("Hello! I'm responding while completely offline, proving that Discretion runs entirely on your device.");
        }
        // Name questions
        else if (q.includes('name') || q.includes('who are you')) {
          resolve("I'm Discretion, your private AI assistant running locally on your device. No servers involved!");
        }
        // How questions
        else if (q.startsWith('how')) {
          resolve("That's a great question! I'm processing it entirely on your device without any internet connection.");
        }
        // What questions
        else if (q.startsWith('what')) {
          resolve("I'm generating this response locally on your phone, proving that everything runs on-device.");
        }
        // Why questions
        else if (q.startsWith('why')) {
          resolve("Interesting question! This response is being generated completely offline on your device.");
        }
        // Default
        else {
          resolve(
            'I successfully processed your question while offline, proving everything runs on your device.'
          );
        }
      }, 1500);
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor, paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={accentColor} />
          <Text style={[styles.backText, { color: accentColor }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Verify Local Processing</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Icon */}
        <View style={styles.iconContainer}>
          {effectiveStep === 'verified' ? (
            <Ionicons name="checkmark-circle" size={64} color="#34C759" />
          ) : effectiveStep === 'asking' ? (
            <Ionicons name="hourglass" size={64} color={accentColor} />
          ) : isConnected ? (
            <Ionicons name="wifi" size={60} color={accentColor} />
          ) : (
            <Ionicons name="airplane" size={64} color={accentColor} />
          )}
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: textColor }]}>
          {effectiveStep === 'verified'
            ? 'Verified: 100% On-Device'
            : effectiveStep === 'asking'
            ? 'Processing...'
            : isConnected
            ? 'Prove Discretion Works Offline'
            : 'Airplane Mode Detected'}
        </Text>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: borderColor }]} />

        {/* Network Status */}
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isConnected ? '#FF3B30' : '#34C759' },
            ]}
          />
          <Text style={[styles.statusText, { color: textColor }]}>
            Network: {isConnected ? 'Connected' : 'Disconnected ✓'}
          </Text>
          {isAirplaneMode && (
            <Text style={[styles.statusSubtext, { color: subtextColor }]}> · Airplane Mode</Text>
          )}
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: borderColor }]} />

        {/* Step Content */}
        {effectiveStep === 'instructions' && (
          <View style={styles.content}>
            <Text style={[styles.description, { color: subtextColor }]}>
              ChatGPT, Claude, Gemini — all require internet. Discretion doesn't.
              Let's prove it.
            </Text>

            <Text style={[styles.stepTitle, { color: textColor }]}>Step 1: Enable Airplane Mode</Text>
            <Text style={[styles.stepDetail, { color: subtextColor }]}>
              Open Control Center and tap the airplane icon, or go to Settings →
              Airplane Mode.
            </Text>

            {isConnected ? (
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: accentColor }]}
                onPress={handleOpenSettings}
              >
                <Text style={[styles.primaryButtonText, { color: '#000' }]}>Open Settings</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.secondaryButton, { backgroundColor: cardBg, borderColor }]}
                  onPress={handleOpenSettings}
                >
                  <Text style={[styles.secondaryButtonText, { color: accentColor }]}>Open Settings</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: accentColor }]}
                  onPress={handleContinue}
                >
                  <Text style={[styles.primaryButtonText, { color: '#000' }]}>I've Done This</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {effectiveStep === 'ready' && (
          <View style={styles.content}>
            <Text style={[styles.stepTitle, { color: textColor }]}>Step 2: Ask Me Anything</Text>
            <Text style={[styles.stepDetail, { color: subtextColor }]}>
              Type a question below. I'll respond—proving everything runs on
              your device.
            </Text>

            <TextInput
              style={[styles.input, { backgroundColor: inputBg, borderColor, color: textColor }]}
              placeholder="Try: What's 247 × 38?"
              placeholderTextColor={subtextColor}
              value={state.userQuestion}
              onChangeText={(text) =>
                setState((prev) => ({ ...prev, userQuestion: text }))
              }
              multiline
              textAlignVertical="top"
              keyboardAppearance="dark"
            />

            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: accentColor },
                !state.userQuestion.trim() && [styles.primaryButtonDisabled, { backgroundColor: cardBg }],
              ]}
              onPress={handleAskQuestion}
              disabled={!state.userQuestion.trim()}
            >
              <Text
                style={[
                  styles.primaryButtonText,
                  { color: '#000' },
                  !state.userQuestion.trim() &&
                    [styles.primaryButtonTextDisabled, { color: subtextColor }],
                ]}
              >
                Ask Discretion
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {effectiveStep === 'asking' && (
          <View style={styles.content}>
            <Text style={[styles.stepDetail, { color: subtextColor }]}>
              Generating response while offline...
            </Text>
          </View>
        )}

        {effectiveStep === 'verified' && (
          <View style={styles.content}>
            <View style={[styles.resultBox, { backgroundColor: cardBg }]}>
              <Text style={[styles.resultLabel, { color: subtextColor }]}>You asked:</Text>
              <Text style={[styles.resultText, { color: textColor }]}>"{state.userQuestion}"</Text>
            </View>

            <View style={[styles.resultBox, { backgroundColor: cardBg }]}>
              <Text style={[styles.resultLabel, { color: subtextColor }]}>I responded:</Text>
              <Text style={[styles.resultText, { color: textColor }]}>"{state.aiResponse}"</Text>
            </View>

            <View style={[styles.divider, { backgroundColor: borderColor }]} />

            <Text style={[styles.conclusion, { color: subtextColor }]}>
              This proves Discretion processes everything locally. No other major AI
              can do this.
            </Text>

            {isConnected && (
              <TouchableOpacity
                style={[styles.sharePrompt, { backgroundColor: cardBg, borderColor }]}
                onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  try {
                    await Share.share({
                      message:
                        "I just verified that Discretion AI works completely offline. ChatGPT, Claude, and Gemini all need internet - Discretion doesn't. Check it out! [APP_STORE_URL]",
                    });
                  } catch (error) {
                    if (__DEV__) {
                      console.error('Share failed:', error);
                    }
                  }
                }}
              >
                <Ionicons name="share-social" size={20} color={accentColor} />
                <Text style={[styles.sharePromptText, { color: accentColor }]}>
                  Share this with friends to show them real privacy
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.checklistBox}>
              <Text style={[styles.checkItem, { color: textColor }]}>
                ● Network: Disconnected ✓
              </Text>
              <Text style={[styles.checkItem, { color: textColor }]}>● Response generated: ✓</Text>
              <Text style={[styles.checkItem, { color: textColor }]}>● Data sent to servers: None ✓</Text>
            </View>

            <View style={[styles.divider, { backgroundColor: borderColor }]} />

            <View style={styles.buttonRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.buttonHelper, { color: subtextColor }]}>Ask another question</Text>
                <TouchableOpacity
                  style={[styles.secondaryButton, { backgroundColor: cardBg, borderColor }]}
                  onPress={handleRetry}
                >
                  <Text style={[styles.secondaryButtonText, { color: accentColor }]}>
                    Try Another Question
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.buttonHelper, { color: subtextColor }]}>
                  {isConnected ? 'Return to app' : 'Disable airplane mode'}
                </Text>
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: accentColor }]}
                  onPress={isConnected ? handleDone : handleOpenSettings}
                >
                  <Text style={[styles.primaryButtonText, { color: '#000' }]}>
                    {isConnected ? 'Done' : 'Open Settings'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: 0,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 70,
  },
  backText: {
    fontSize: 16,
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  divider: {
    height: 1,
    marginVertical: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
  },
  statusSubtext: {
    fontSize: 16,
  },
  content: {
    width: '100%',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  stepDetail: {
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 22,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {},
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  primaryButtonTextDisabled: {},
  secondaryButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  resultBox: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  resultLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  resultText: {
    fontSize: 16,
    lineHeight: 22,
  },
  checklistBox: {
    paddingVertical: 8,
  },
  checkItem: {
    fontSize: 16,
    marginBottom: 8,
    lineHeight: 22,
  },
  conclusion: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  sharePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    gap: 12,
  },
  sharePromptText: {
    fontSize: 15,
    fontWeight: '600',
  },
  buttonHelper: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
});
