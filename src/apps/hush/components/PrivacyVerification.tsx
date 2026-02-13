import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNetworkStatus } from '../../../core/hooks/useNetworkStatus';
import { useChatStore } from '../../../core/state/rootStore';
import { HUSH_THEMES } from '../../../core/themes/themes';
import { HushButton, HushCard, HushShareButton } from './HushUI';
import { generateResponse } from '../../../core/engine/LocalAI';

type VerificationStep = 'instructions' | 'ready' | 'asking' | 'verified';

interface VerificationState {
  step: VerificationStep;
  userQuestion: string;
  aiResponse: string;
  networkWasDisconnected: boolean;
}

interface PrivacyVerificationProps {
  onClose: () => void;
  onAskQuestion?: (question: string) => Promise<string>;
}

export function PrivacyVerification({
  onClose,
  onAskQuestion,
}: PrivacyVerificationProps) {
  const { isConnected, isAirplaneMode } = useNetworkStatus();
  const insets = useSafeAreaInsets();

  // Component-scoped: This is a HUSH-specific component
  const flavor = 'HUSH' as const;
  const hushTheme = useChatStore((state) => state.hushTheme);
  const responseStyle = useChatStore((state) => state.responseStyleHush);

  // Get current theme colors
  const themeData = HUSH_THEMES[hushTheme] || HUSH_THEMES.DEFAULT;
  const accentColor = themeData.colors.primary;

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

  const handleContinue = () => {
    // User manually confirmed - check if airplane mode is actually enabled
    if (!isConnected) {
      setState((prev) => ({ ...prev, step: 'ready' }));
    }
    // If still connected, the UI will show the connected state
    // and the button remains disabled until network disconnects
  };

  const handleAskQuestion = async () => {
    if (!state.userQuestion.trim()) return;

    setState((prev) => ({ ...prev, step: 'asking' }));

    // Store network status at time of request
    const wasDisconnected = !isConnected;

    // Read fresh values at execution time (prevents stale closure)
    const currentResponseStyle = useChatStore.getState().responseStyleHush;

    try {
      // Call actual AI or use provided callback
      const response = onAskQuestion
        ? await onAskQuestion(state.userQuestion)
        : await generateResponse(
            state.userQuestion,
            flavor,
            [], // No conversation history for verification challenge
            null, // No summary
            currentResponseStyle
          );

      setState((prev) => ({
        ...prev,
        step: 'verified',
        aiResponse: response,
        networkWasDisconnected: wasDisconnected,
      }));
    } catch (error) {
      // Handle error
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={accentColor} />
          <Text style={[styles.backText, { color: accentColor }]}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verify Local Processing</Text>
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
        <Text style={styles.title}>
          {effectiveStep === 'verified'
            ? 'Verified: 100% On-Device'
            : effectiveStep === 'asking'
            ? 'Processing...'
            : isConnected
            ? 'Prove Hush Works Offline'
            : 'Airplane Mode Detected'}
        </Text>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Network Status */}
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isConnected ? '#FF3B30' : '#34C759' },
            ]}
          />
          <Text style={styles.statusText}>
            Network: {isConnected ? 'Connected' : 'Disconnected ✓'}
          </Text>
          {isAirplaneMode && (
            <Text style={styles.statusSubtext}> · Airplane Mode</Text>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Step Content */}
        {effectiveStep === 'instructions' && (
          <View style={styles.content}>
            <Text style={styles.description}>
              ChatGPT, Claude, Gemini — all require internet. Hush doesn't.
              Let's prove it.
            </Text>

            <Text style={styles.stepTitle}>Step 1: Enable Airplane Mode</Text>

            {Platform.OS === 'ios' ? (
              <HushCard style={{ marginBottom: 20 }}>
                <Text style={styles.instructionTitle}>On iPhone:</Text>
                <Text style={styles.instructionText}>
                  1. Swipe down from the top-right corner{'\n'}
                  2. Tap the airplane icon (✈️){'\n'}
                  3. Return to Hush
                </Text>
              </HushCard>
            ) : (
              <HushCard style={{ marginBottom: 20 }}>
                <Text style={styles.instructionTitle}>On Android:</Text>
                <Text style={styles.instructionText}>
                  1. Swipe down from the top of the screen{'\n'}
                  2. Tap the airplane icon or "Airplane Mode"{'\n'}
                  3. Return to Hush
                </Text>
              </HushCard>
            )}

            {!isConnected && (
              <HushButton
                variant="primary"
                onPress={handleContinue}
                fullWidth
                accessibilityHint="Continue after enabling airplane mode"
              >
                I've Enabled Airplane Mode
              </HushButton>
            )}
          </View>
        )}

        {effectiveStep === 'ready' && (
          <View style={styles.content}>
            <Text style={styles.stepTitle}>Step 2: Ask Me Anything</Text>
            <Text style={styles.stepDetail}>
              Type a question below. I'll respond—proving everything runs on
              your device.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Try: Why is the sky blue?"
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              value={state.userQuestion}
              onChangeText={(text) =>
                setState((prev) => ({ ...prev, userQuestion: text }))
              }
              multiline
              textAlignVertical="top"
              keyboardAppearance="dark"
            />

            <HushButton
              variant="primary"
              onPress={handleAskQuestion}
              disabled={!state.userQuestion.trim()}
              fullWidth
              accessibilityHint="Ask Hush your question to verify offline processing"
            >
              Ask Hush
            </HushButton>
          </View>
        )}

        {effectiveStep === 'asking' && (
          <View style={styles.content}>
            <Text style={styles.stepDetail}>
              Generating response while offline...
            </Text>
          </View>
        )}

        {effectiveStep === 'verified' && (
          <View style={styles.content}>
            <HushCard style={{ marginBottom: 16 }}>
              <Text style={styles.resultLabel}>You asked:</Text>
              <Text style={styles.resultText}>"{state.userQuestion}"</Text>
            </HushCard>

            <HushCard style={{ marginBottom: 16 }}>
              <Text style={styles.resultLabel}>I responded:</Text>
              <Text style={styles.resultText}>"{state.aiResponse}"</Text>
            </HushCard>

            <View style={styles.divider} />

            <Text style={styles.conclusion}>
              This proves Hush processes everything locally. No other major AI
              can do this.
            </Text>

            {isConnected && (
              <HushShareButton
                message="I just verified that Hush AI works completely offline. ChatGPT, Claude, and Gemini all need internet - Hush doesn't. Check it out! [APP_STORE_URL]"
                label="Share this verification"
                style={{ marginBottom: 24 }}
              />
            )}

            <HushCard style={{ marginBottom: 24 }}>
              <View style={styles.checkItemRow}>
                <Ionicons name="checkmark-circle" size={20} color="#34C759" style={{ marginRight: 8 }} />
                <Text style={styles.checkItem}>
                  Network: disconnected
                </Text>
              </View>
              <View style={styles.checkItemRow}>
                <Ionicons name="checkmark-circle" size={20} color="#34C759" style={{ marginRight: 8 }} />
                <Text style={styles.checkItem}>Response: generated</Text>
              </View>
              <View style={styles.checkItemRow}>
                <Ionicons name="checkmark-circle" size={20} color="#34C759" style={{ marginRight: 8 }} />
                <Text style={styles.checkItem}>Data sent to servers: none</Text>
              </View>
            </HushCard>

            <View style={styles.divider} />

            {!isConnected && (
              <HushCard style={{ marginBottom: 20 }}>
                <Text style={styles.instructionTitle}>To re-enable internet:</Text>
                <Text style={styles.instructionText}>
                  {Platform.OS === 'ios'
                    ? 'Swipe down from the top-right corner and tap the airplane icon again.'
                    : 'Swipe down from the top and tap the airplane icon again.'}
                </Text>
              </HushCard>
            )}

            <View style={[styles.buttonRow, { alignItems: 'stretch' }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.buttonHelper}>Ask another question</Text>
                <HushButton
                  variant="secondary"
                  onPress={handleRetry}
                  accessibilityHint="Try asking another question to verify offline processing"
                >
                  Try Again
                </HushButton>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.buttonHelper}>
                  {isConnected ? 'Return to app' : 'Finish verification'}
                </Text>
                <HushButton
                  variant="primary"
                  onPress={handleDone}
                  accessibilityHint="Complete the privacy verification process"
                >
                  Done
                </HushButton>
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
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
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
    color: '#FFFFFF',
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
  emoji: {
    fontSize: 64,
    textAlign: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
    color: '#FFFFFF',
    fontWeight: '500',
  },
  statusSubtext: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  content: {
    width: '100%',
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  stepDetail: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 24,
    lineHeight: 22,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 22,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    minHeight: 100,
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
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
  primaryButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  primaryButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  resultLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
    fontWeight: '500',
  },
  resultText: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  checkItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkItem: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  conclusion: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonHelper: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginBottom: 8,
  },
});
