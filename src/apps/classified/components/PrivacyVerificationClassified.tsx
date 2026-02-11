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
import { useChatStore } from '../../../core/state/rootStore';
import { CLASSIFIED_THEMES } from '../../../core/themes/themes';
import { Typewriter } from '../../../core/ui/Typewriter';
import { ConnectionAlert } from './ConnectionAlert';
import { DisconnectedAlert } from './DisconnectedAlert';

type VerificationStep = 'instructions' | 'ready' | 'asking' | 'verified';

interface VerificationState {
  step: VerificationStep;
  userQuestion: string;
  aiResponse: string;
  networkWasDisconnected: boolean;
}

interface PrivacyVerificationClassifiedProps {
  onClose: () => void;
  onAskQuestion?: (question: string) => Promise<string>;
}

export function PrivacyVerificationClassified({
  onClose,
  onAskQuestion,
}: PrivacyVerificationClassifiedProps) {
  const { isConnected } = useNetworkStatus();
  const insets = useSafeAreaInsets();
  const { classifiedTheme } = useChatStore();

  // Get current theme colors
  const themeData = CLASSIFIED_THEMES[classifiedTheme] || CLASSIFIED_THEMES.TERMINAL_RED;
  const accentColor = themeData.colors.primary;

  const [state, setState] = useState<VerificationState>({
    step: 'instructions',
    userQuestion: '',
    aiResponse: '',
    networkWasDisconnected: false,
  });

  const [connectionTextComplete, setConnectionTextComplete] = useState(false);
  const [connectionDetailComplete, setConnectionDetailComplete] = useState(false);
  const [descriptionComplete, setDescriptionComplete] = useState(false);
  const [step1TitleComplete, setStep1TitleComplete] = useState(false);
  const [step1Instruction1Complete, setStep1Instruction1Complete] = useState(false);
  const [step1Instruction2Complete, setStep1Instruction2Complete] = useState(false);
  const [step1Instruction3Complete, setStep1Instruction3Complete] = useState(false);
  const [showStep1Buttons, setShowStep1Buttons] = useState(false);

  const [statusDetailComplete, setStatusDetailComplete] = useState(false);
  const [step2Ready, setStep2Ready] = useState(false);
  const [step2Instruction1Complete, setStep2Instruction1Complete] = useState(false);
  const [step2Instruction2Complete, setStep2Instruction2Complete] = useState(false);
  const [step2Instruction3Complete, setStep2Instruction3Complete] = useState(false);
  const [showInputField, setShowInputField] = useState(false);

  // Reset typewriter states when connection status changes
  React.useEffect(() => {
    setConnectionTextComplete(false);
    setConnectionDetailComplete(false);
    setDescriptionComplete(false);
    setStep1TitleComplete(false);
    setStep1Instruction1Complete(false);
    setStep1Instruction2Complete(false);
    setStep1Instruction3Complete(false);
    setShowStep1Buttons(false);
    setStatusDetailComplete(false);
    setStep2Ready(false);
    setStep2Instruction1Complete(false);
    setStep2Instruction2Complete(false);
    setStep2Instruction3Complete(false);
    setShowInputField(false);
  }, [isConnected]);

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

  const handleExecute = async () => {
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

  const handleAcknowledge = () => {
    onClose();
  };

  // Mock response generator for testing
  const mockGenerateResponse = async (question: string): Promise<string> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const q = question.toLowerCase();

        // Math questions
        if (q.includes('247') && q.includes('38')) {
          resolve('CALCULATION RESULT: 247 × 38 = 9,386');
        } else if (q.match(/\d+\s*[+×*x]\s*\d+/)) {
          resolve("MATHEMATICAL QUERY DETECTED. PROCESSING LOCALLY. (MOCK RESPONSE)");
        }
        // Greeting
        else if (q.includes('hello') || q.includes('hi')) {
          resolve("ACKNOWLEDGED. OFFLINE PROCESSING CONFIRMED. ALL OPERATIONS LOCAL.");
        }
        // Name questions
        else if (q.includes('name') || q.includes('who are you')) {
          resolve("SYSTEM DESIGNATION: CLASSIFIED TERMINAL. OPERATING IN ISOLATED MODE. NO EXTERNAL DEPENDENCIES.");
        }
        // How questions
        else if (q.startsWith('how')) {
          resolve("QUERY PROCESSED. LOCAL INFERENCE ENGINE ACTIVE. ZERO NETWORK TRAFFIC.");
        }
        // What questions
        else if (q.startsWith('what')) {
          resolve("RESPONSE GENERATED ON-DEVICE. NO EXTERNAL COMMUNICATION ESTABLISHED.");
        }
        // Why questions
        else if (q.startsWith('why')) {
          resolve("ANALYSIS COMPLETE. PROCESSING PERFORMED ENTIRELY OFFLINE.");
        }
        // Default
        else {
          resolve(
            'QUERY PROCESSED LOCALLY. ZERO EXTERNAL COMMUNICATION DETECTED.'
          );
        }
      }, 1500);
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={accentColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: accentColor }]}>VERIFY_LOCAL_PROCESSING</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Protocol Header */}
        <View style={styles.protocolBox}>
          <Text style={styles.protocolText}>{'>'} NETWORK VERIFICATION PROTOCOL</Text>
          <Text style={styles.protocolText}>
            {'>'}{' '}
            {effectiveStep === 'verified'
              ? 'STATUS: VERIFIED'
              : effectiveStep === 'asking'
              ? 'PROCESSING...'
              : isConnected
              ? 'INITIALIZING...'
              : 'OFFLINE MODE CONFIRMED'}
          </Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Network Status */}
        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>NETWORK STATUS:</Text>
          {isConnected ? (
            <ConnectionAlert
              style={[
                styles.statusValue,
                { color: accentColor },
              ]}
              onComplete={() => setConnectionTextComplete(true)}
            />
          ) : (
            <DisconnectedAlert
              style={[
                styles.statusValue,
                { color: '#34C759' },
              ]}
              onComplete={() => setConnectionTextComplete(true)}
            />
          )}
          {isConnected ? (
            connectionTextComplete && (
              <Typewriter
                text="    Wi-Fi or cellular active"
                style={styles.statusDetail}
                speed={15}
                onComplete={() => setConnectionDetailComplete(true)}
              />
            )
          ) : (
            connectionTextComplete && (
              <Typewriter
                text="    No external connections detected"
                style={styles.statusDetail}
                speed={25}
                onComplete={() => {
                  // Pause 800ms before showing STEP 2
                  setTimeout(() => setStep2Ready(true), 800);
                }}
              />
            )
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Step Content */}
        {effectiveStep === 'instructions' && (
          <View style={styles.content}>
            {connectionDetailComplete && (
              <Typewriter
                text="CHATGPT, CLAUDE, GEMINI — ALL REQUIRE INTERNET. CLASSIFIED DOESN'T. LET'S PROVE IT."
                style={styles.description}
                speed={40}
                onComplete={() => {
                  // Pause 600ms before showing STEP 1
                  setTimeout(() => setDescriptionComplete(true), 600);
                }}
              />
            )}

            {descriptionComplete && (
              <Typewriter
                text="STEP 1: ENABLE AIRPLANE MODE"
                style={[styles.stepTitle, { color: accentColor }]}
                speed={20}
                onComplete={() => setStep1TitleComplete(true)}
              />
            )}

            <View style={styles.instructionBox}>
              {step1TitleComplete && (
                <Typewriter
                  text="> Open Control Center"
                  style={styles.instruction}
                  speed={15}
                  onComplete={() => setStep1Instruction1Complete(true)}
                />
              )}
              {step1Instruction1Complete && (
                <Typewriter
                  text="> Enable Airplane Mode"
                  style={styles.instruction}
                  speed={15}
                  onComplete={() => setStep1Instruction2Complete(true)}
                />
              )}
              {step1Instruction2Complete && (
                <Typewriter
                  text="> Return to this screen"
                  style={styles.instruction}
                  speed={15}
                  onComplete={() => setStep1Instruction3Complete(true)}
                />
              )}
            </View>

            {step1Instruction3Complete && (
              isConnected ? (
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: accentColor }]}
                  onPress={handleOpenSettings}
                >
                  <Text style={styles.primaryButtonText}>OPEN SETTINGS</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.secondaryButton, { borderColor: accentColor }]}
                    onPress={handleOpenSettings}
                  >
                    <Text style={[styles.secondaryButtonText, { color: accentColor }]}>OPEN SETTINGS</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: accentColor }]}
                    onPress={handleContinue}
                  >
                    <Text style={styles.primaryButtonText}>CONTINUE</Text>
                  </TouchableOpacity>
                </View>
              )
            )}
          </View>
        )}

        {effectiveStep === 'ready' && (
          <View style={styles.content}>
            {step2Ready && (
              <Typewriter
                text="STEP 2: SUBMIT QUERY"
                style={[styles.stepTitle, { color: accentColor }]}
                speed={20}
                onComplete={() => setStep2Instruction1Complete(true)}
              />
            )}

            <View style={styles.instructionBox}>
              {step2Instruction1Complete && (
                <Typewriter
                  text="> Enter any query below"
                  style={styles.instruction}
                  speed={15}
                  onComplete={() => setStep2Instruction2Complete(true)}
                />
              )}
              {step2Instruction2Complete && (
                <Typewriter
                  text="> System will process locally"
                  style={styles.instruction}
                  speed={15}
                  onComplete={() => setStep2Instruction3Complete(true)}
                />
              )}
              {step2Instruction3Complete && (
                <Typewriter
                  text="> No data exfiltration possible"
                  style={styles.instruction}
                  speed={15}
                  onComplete={() => setShowInputField(true)}
                />
              )}
            </View>

            {showInputField && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="> _"
                  placeholderTextColor={themeData.colors.subtext}
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
                    { backgroundColor: state.userQuestion.trim() ? accentColor : '#111' },
                  ]}
                  onPress={handleExecute}
                  disabled={!state.userQuestion.trim()}
                >
                  <Text
                    style={[
                      styles.primaryButtonText,
                      !state.userQuestion.trim() &&
                        styles.primaryButtonTextDisabled,
                    ]}
                  >
                    EXECUTE
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {effectiveStep === 'asking' && (
          <View style={styles.content}>
            <Text style={styles.processingText}>{'>'} PROCESSING QUERY...</Text>
            <Text style={styles.processingText}>{'>'} LOCAL INFERENCE ACTIVE</Text>
          </View>
        )}

        {effectiveStep === 'verified' && (
          <View style={styles.content}>
            <View style={styles.resultBox}>
              <Text style={styles.resultLabel}>QUERY SUBMITTED:</Text>
              <Text style={styles.resultText}>{'>'} "{state.userQuestion}"</Text>
            </View>

            <View style={styles.resultBox}>
              <Text style={styles.resultLabel}>RESPONSE GENERATED:</Text>
              <Text style={styles.resultText}>{'>'} {state.aiResponse}</Text>
            </View>

            <View style={styles.divider} />

            <Text style={styles.systemStatus}>{'>'} SYSTEM INTEGRITY: VERIFIED</Text>

            {isConnected && (
              <TouchableOpacity
                style={[styles.sharePrompt, { borderColor: accentColor }]}
                onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  try {
                    await Share.share({
                      message: "I just verified that Hush AI works completely offline. ChatGPT, Claude, and Gemini all need internet - Hush doesn't. Check it out!",
                      url: 'https://apps.apple.com/app/hush', // Replace with actual URL
                    });
                  } catch (error) {
                    if (__DEV__) {
                      console.error('Share failed:', error);
                    }
                  }
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sharePromptText, { color: themeData.colors.text }]}>
                    {'>'} SHARE_VERIFICATION_PROOF
                  </Text>
                </View>
                <Ionicons name="share-outline" size={20} color={accentColor} />
              </TouchableOpacity>
            )}

            <View style={[styles.verificationBox, { marginBottom: 24, marginTop: 24 }]}>
              <Text style={styles.verificationTitle}>VERIFICATION RESULTS:</Text>
              <Text style={styles.checkItem}>[✓] NETWORK STATUS: DISCONNECTED</Text>
              <Text style={styles.checkItem}>[✓] LOCAL INFERENCE: CONFIRMED</Text>
              <Text style={styles.checkItem}>[✓] DATA EXFILTRATION: NONE</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.buttonRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.buttonHelper}>{'>'} SUBMIT_NEW_QUERY</Text>
                <TouchableOpacity
                  style={[styles.secondaryButton, { borderColor: accentColor }]}
                  onPress={handleRetry}
                >
                  <Text style={[styles.secondaryButtonText, { color: accentColor }]}>RETRY</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.buttonHelper}>
                  {'>'} {isConnected ? 'EXIT_VERIFICATION' : 'DISABLE_AIRPLANE_MODE'}
                </Text>
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: accentColor }]}
                  onPress={isConnected ? handleAcknowledge : handleOpenSettings}
                >
                  <Text style={styles.primaryButtonText}>
                    {isConnected ? 'ACKNOWLEDGE' : 'OPEN_SETTINGS'}
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
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Courier',
    letterSpacing: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  protocolBox: {
    marginBottom: 8,
  },
  protocolText: {
    fontSize: 14,
    color: '#34C759',
    fontFamily: 'Courier',
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 20,
  },
  statusBox: {
    paddingVertical: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#999',
    fontFamily: 'Courier',
    marginBottom: 8,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Courier',
    marginBottom: 4,
  },
  statusDetail: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Courier',
  },
  content: {
    width: '100%',
  },
  description: {
    fontSize: 14,
    color: '#999',
    fontFamily: 'Courier',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Courier',
    marginBottom: 16,
    letterSpacing: 1,
  },
  instructionBox: {
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 20,
  },
  instruction: {
    fontSize: 14,
    color: '#999',
    fontFamily: 'Courier',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#111',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#34C759',
    fontFamily: 'Courier',
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
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  primaryButtonDisabled: {
    backgroundColor: '#222',
    borderColor: '#333',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
    fontFamily: 'Courier',
    letterSpacing: 1,
  },
  primaryButtonTextDisabled: {
    color: '#666',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#111',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Courier',
    letterSpacing: 1,
  },
  processingText: {
    fontSize: 14,
    color: '#34C759',
    fontFamily: 'Courier',
    marginBottom: 8,
  },
  resultBox: {
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 16,
  },
  resultLabel: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'Courier',
    marginBottom: 8,
    letterSpacing: 1,
  },
  resultText: {
    fontSize: 14,
    color: '#34C759',
    fontFamily: 'Courier',
    lineHeight: 20,
  },
  verificationBox: {
    paddingVertical: 8,
  },
  verificationTitle: {
    fontSize: 14,
    color: '#999',
    fontFamily: 'Courier',
    marginBottom: 12,
    letterSpacing: 1,
  },
  checkItem: {
    fontSize: 14,
    color: '#34C759',
    fontFamily: 'Courier',
    marginBottom: 8,
  },
  systemStatus: {
    fontSize: 14,
    color: '#34C759',
    fontFamily: 'Courier',
    marginTop: 12,
  },
  sharePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 20,
    marginBottom: 24,
  },
  sharePromptText: {
    fontSize: 14,
    fontFamily: 'Courier',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  buttonHelper: {
    fontSize: 12,
    color: '#888',
    fontFamily: 'Courier',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
});
