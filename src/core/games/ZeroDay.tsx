import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Clipboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useChatStore } from '../state/rootStore';
import { CLASSIFIED_THEMES } from '../themes/themes';
import {
  ClassifiedHeader,
  ClassifiedButton,
} from './components/ClassifiedUI';

interface ZeroDayProps {
  onComplete: () => void;
  onCancel: () => void;
  onViewGallery?: () => void;
}

type ZeroScreen = 'challenge' | 'success' | 'failed';

interface ExploitDefinition {
  number: number;
  title: string;
  objective: string;
  hints: string[]; // Progressive hints: [basic, intermediate, advanced, solution]
  sampleLog: string;
  solution: string;
  patterns: RegExp[];
}

// Exploit definitions with command-line puzzles
const EXPLOITS: ExploitDefinition[] = [
  {
    number: 1,
    title: 'BASIC_FILTERING',
    objective: 'List all failed login attempts',
    hints: [
      'Use grep to search for lines containing specific text',
      'Search for "Failed" in /var/logs/auth.log',
      'Structure: grep [search_term] [file_path]',
      'Solution: grep "Failed" /var/logs/auth.log',
    ],
    sampleLog: `Jan 15 10:23:11 Failed password for root from 192.168.1.100
Jan 15 10:23:45 Accepted password for admin from 192.168.1.50
Jan 15 10:24:02 Failed password for root from 192.168.1.100

Expected output: Only lines containing "Failed"`,
    solution: 'grep "Failed" /var/logs/auth.log',
    patterns: [
      /grep\s+failed\s+\/var\/logs\/auth\.log/,
    ],
  },
  {
    number: 2,
    title: 'COUNT_OCCURRENCES',
    objective: 'Count how many failed attempts occurred',
    hints: [
      'Use pipes (|) to connect commands - send grep output to another tool',
      'The wc -l command counts lines. Combine it with your grep from Exploit 1',
      'Structure: [previous_command] | wc -l',
      'Solution: grep "Failed" /var/logs/auth.log | wc -l',
    ],
    sampleLog: `Use the same log file from Exploit 1.
Pipe the output to count lines.

Expected output: A single number (line count)`,
    solution: 'grep "Failed" /var/logs/auth.log | wc -l',
    patterns: [
      /grep\s+failed\s+\/var\/logs\/auth\.log\s*\|\s*wc\s+-l/,
    ],
  },
  {
    number: 3,
    title: 'EXTRACT_FIELD',
    objective: 'Extract IP addresses from failed login lines',
    hints: [
      'Use cut to extract specific fields (columns) from text',
      'The IP is in field 11 when splitting by spaces. Use: cut -d\' \' -f11',
      'Pipe your grep output to cut: grep ... | cut -d\' \' -f11',
      'Solution: grep "Failed" /var/logs/auth.log | cut -d\' \' -f11',
    ],
    sampleLog: `Failed password for root from 192.168.1.100
                            ^ field 11

The IP address is in the 11th field when split by spaces.

Expected output: List of IP addresses only`,
    solution: 'grep "Failed" /var/logs/auth.log | cut -d\' \' -f11',
    patterns: [
      /grep\s+failed\s+\/var\/logs\/auth\.log.*cut.*-d.*-f\s*11/,
    ],
  },
  {
    number: 4,
    title: 'SORT_AND_UNIQUE',
    objective: 'Find unique IPs attacking the server',
    hints: [
      'Build on Exploit 3 by adding two more pipes: sort and uniq',
      'sort organizes data, uniq removes duplicates (must sort first)',
      'Chain: [exploit_3_command] | sort | uniq',
      'Solution: grep "Failed" /var/logs/auth.log | cut -d\' \' -f11 | sort | uniq',
    ],
    sampleLog: `Chain multiple commands with pipes (|).
After extracting IPs, sort them and get unique values.

Expected output: Each unique IP address listed once`,
    solution: 'grep "Failed" /var/logs/auth.log | cut -d\' \' -f11 | sort | uniq',
    patterns: [
      /grep.*failed.*auth\.log.*\|.*cut.*\|.*sort.*\|.*uniq/,
    ],
  },
  {
    number: 5,
    title: 'ADVANCED_ANALYSIS',
    objective: 'Find IP with most failed attempts (top attacker)',
    hints: [
      'Start with Exploit 4, then add: uniq -c (count), sort -nr (numeric reverse), head -1 (top result)',
      'uniq -c counts occurrences, sort -nr sorts numbers high to low, head -1 shows top line',
      'Full chain: [exploit_4] | uniq -c | sort -nr | head -1',
      'Solution: grep "Failed" /var/logs/auth.log | cut -d\' \' -f11 | sort | uniq -c | sort -nr | head -1',
    ],
    sampleLog: `Full pipeline: grep → cut → sort → uniq -c → sort -nr → head -1

This will show which IP has the most failed login attempts.

Expected output: [count] [IP_address] for the top attacker`,
    solution: 'grep "Failed" /var/logs/auth.log | cut -d\' \' -f11 | sort | uniq -c | sort -nr | head -1',
    patterns: [
      /grep.*failed.*auth\.log.*\|.*cut.*\|.*sort.*\|.*uniq\s+-c.*\|.*sort\s+-nr.*\|.*head\s+-1/,
    ],
  },
];

export const ZeroDay: React.FC<ZeroDayProps> = ({ onComplete, onCancel, onViewGallery }) => {
  const classifiedTheme = useChatStore((state) => state.classifiedTheme);
  // NOTE: Zustand has built-in shallow comparison for primitive values
  // No need for useShallow - it causes hooks violations in React 19
  const gameProgress = useChatStore((state) => state.gameState.gameProgress.zero_day);

  const [screen, setScreen] = useState<ZeroScreen>('challenge');
  const [currentExploit, setCurrentExploit] = useState(1);
  const [userCommand, setUserCommand] = useState('');
  const [result, setResult] = useState<'pending' | 'correct' | 'incorrect'>('pending');
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [lastSuccessfulCommand, setLastSuccessfulCommand] = useState<string>('');

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

  const validateCommand = (exploit: number, cmd: string): boolean => {
    // Normalize: remove quotes around failed (case-insensitive), then lowercase, then collapse spaces
    const normalized = cmd
      .trim()
      .replace(/(['"])failed\1/gi, 'failed') // Remove matching quotes around Failed/failed (case-insensitive)
      .toLowerCase()
      .replace(/\s+/g, ' ');

    const exploitDef = EXPLOITS[exploit - 1];

    return exploitDef.patterns.some((pattern) => pattern.test(normalized));
  };

  const handleSubmit = () => {
    if (!userCommand.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    const isCorrect = validateCommand(currentExploit, userCommand);

    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setResult('correct');
      setScreen('success');

      // Save successful command for next exploit
      setLastSuccessfulCommand(userCommand.trim());

      // Auto-close only for final exploit (unless badge is being unlocked)
      if (currentExploit === 5) {
        // Check if this is the 3rd completion (badge unlock)
        const isThirdCompletion = gameProgress.timesCompleted === 2; // Check before incrementing
        if (!isThirdCompletion) {
          setTimeout(() => {
            onComplete();
          }, 2000);
        }
      }
      // For exploits 1-4, show NEXT button (no auto-advance)
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setResult('incorrect');
      setWrongAttempts(prev => prev + 1); // Track wrong attempts

      // Allow retry after 1.5 seconds
      setTimeout(() => {
        setResult('pending');
      }, 1500);
    }
  };

  const handleGiveUp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Show solution and allow continuing
    setUserCommand(EXPLOITS[currentExploit - 1].solution);
    setWrongAttempts(4); // Show all hints including solution
  };

  const handleNextExploit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentExploit(currentExploit + 1);

    // Auto-populate input with last successful command
    setUserCommand(lastSuccessfulCommand);

    setResult('pending');
    setScreen('challenge');
    setWrongAttempts(0); // Reset for next exploit
  };

  const handleCopyCommand = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Clipboard.setString(lastSuccessfulCommand);
  };

  // === SCREEN: CHALLENGE ===
  const renderChallengeScreen = () => {
    const currentExploitDef = EXPLOITS[currentExploit - 1];

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, paddingHorizontal: 20 }}>
          <ClassifiedHeader
            title={`// EXPLOIT_${currentExploit}/5`}
            subtitle={currentExploitDef.title}
            onClose={onCancel}
            tacticalColor={TACTICAL_COLOR}
            cardBg={CARD_BG}
          />

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Target Info */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{
                fontFamily: 'Courier',
                fontSize: 13,
                color: TACTICAL_COLOR,
                fontWeight: '600',
                letterSpacing: 0.5,
              }}>
                TARGET: /var/logs/auth.log
              </Text>
              <Text style={{
                fontFamily: 'Courier',
                fontSize: 13,
                color: '#FFF',
                fontWeight: '600',
                letterSpacing: 0.5,
                marginTop: 10,
              }}>
                OBJECTIVE: {currentExploitDef.objective}
              </Text>
            </View>

            {/* Sample Log */}
            <View style={{
              backgroundColor: CARD_BG,
              borderLeftWidth: 4,
              borderLeftColor: TACTICAL_COLOR,
              padding: 15,
              marginBottom: 20,
            }}>
              <Text style={{
                fontFamily: 'Courier',
                fontSize: 12,
                color: '#999',
                lineHeight: 18,
              }}>
                {currentExploitDef.sampleLog}
              </Text>
            </View>

            {/* Result Message */}
            {result === 'incorrect' && (
              <View style={{
                backgroundColor: '#FF0000' + '20',
                borderLeftWidth: 4,
                borderLeftColor: '#FF0000',
                padding: 15,
                marginBottom: 20,
                borderRadius: 4,
              }}>
                <Text style={{
                  fontFamily: 'Courier',
                  fontSize: 13,
                  color: '#FF0000',
                  fontWeight: '700',
                }}>
                  ✗ INVALID_COMMAND - TRY AGAIN
                </Text>
              </View>
            )}

            {/* Progressive Hints */}
            {wrongAttempts > 0 && currentExploitDef.hints.slice(0, wrongAttempts).map((hint, index) => (
              <View key={index} style={{
                backgroundColor: index === wrongAttempts - 1 ? '#FFA500' + '20' : '#666' + '10',
                borderLeftWidth: 4,
                borderLeftColor: index === wrongAttempts - 1 ? '#FFA500' : '#666',
                padding: 15,
                marginBottom: 12,
                borderRadius: 4,
              }}>
                <Text style={{
                  fontFamily: 'Courier',
                  fontSize: 12,
                  color: index === wrongAttempts - 1 ? '#FFA500' : '#999',
                  fontWeight: '700',
                  letterSpacing: 1,
                  marginBottom: 5,
                }}>
                  HINT {index + 1}:
                </Text>
                <Text style={{
                  fontFamily: 'Courier',
                  fontSize: 12,
                  color: '#FFF',
                  lineHeight: 18,
                }}>
                  {hint}
                </Text>
              </View>
            ))}

            {/* Previous Command Reference (Exploits 2-5) */}
            {result === 'pending' && lastSuccessfulCommand && currentExploit > 1 && (
              <View style={{
                backgroundColor: TACTICAL_COLOR + '15',
                borderLeftWidth: 4,
                borderLeftColor: TACTICAL_COLOR,
                padding: 12,
                marginBottom: 16,
                borderRadius: 4,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{
                    fontFamily: 'Courier',
                    fontSize: 11,
                    color: TACTICAL_COLOR,
                    fontWeight: 'bold',
                    marginBottom: 6,
                  }}>
                    PREVIOUS_COMMAND:
                  </Text>
                  <Text style={{
                    fontFamily: 'Courier',
                    fontSize: 12,
                    color: '#FFF',
                  }}>
                    {lastSuccessfulCommand}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleCopyCommand}
                  style={{
                    padding: 8,
                  }}
                >
                  <Ionicons name="clipboard-outline" size={20} color={TACTICAL_COLOR} />
                </TouchableOpacity>
              </View>
            )}

            {/* Command Input */}
            {result === 'pending' && (
              <>
                <View style={{ marginBottom: 20 }}>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: CARD_BG,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: TACTICAL_COLOR + '30',
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}>
                    <Text style={{
                      fontFamily: 'Courier',
                      fontSize: 16,
                      color: TACTICAL_COLOR,
                      marginRight: 12,
                    }}>
                      $
                    </Text>
                    <TextInput
                      style={{
                        flex: 1,
                        fontFamily: 'Courier',
                        fontSize: 13,
                        color: TACTICAL_COLOR,
                        minHeight: 44,
                        paddingVertical: 8,
                      }}
                      placeholder="Type your command..."
                      placeholderTextColor={themeData.colors.subtext}
                      value={userCommand}
                      onChangeText={setUserCommand}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardAppearance="dark"
                      onSubmitEditing={handleSubmit}
                    />
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={{ flexDirection: 'row', gap: 15, marginBottom: 20 }}>
                  <ClassifiedButton
                    label="EXECUTE"
                    onPress={handleSubmit}
                    tacticalColor={TACTICAL_COLOR}
                    style={{ flex: 1 }}
                  />

                  {wrongAttempts >= 3 && (
                    <ClassifiedButton
                      label="GIVE_UP"
                      onPress={handleGiveUp}
                      tacticalColor="#FF6B6B"
                      variant="secondary"
                      style={{ flex: 1 }}
                    />
                  )}
                </View>

                {/* Attempt Counter */}
                {wrongAttempts > 0 && (
                  <Text style={{
                    fontFamily: 'Courier',
                    fontSize: 11,
                    color: '#666',
                    textAlign: 'center',
                    marginTop: -10,
                    marginBottom: 10,
                  }}>
                    Wrong attempts: {wrongAttempts} | Hints shown: {wrongAttempts}/4
                  </Text>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    );
  };

  // === SCREEN: SUCCESS ===
  const renderSuccessScreen = () => {
    const currentExploitDef = EXPLOITS[currentExploit - 1];
    // Check if this is the 3rd completion (white_hat badge unlock)
    const isThirdCompletion = currentExploit === 5 && gameProgress.timesCompleted === 2;

    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }}>
        <Ionicons
          name="checkmark-circle"
          size={64}
          color={TACTICAL_COLOR}
          style={{ marginBottom: 30 }}
        />

        <Text style={{
          fontFamily: 'Courier',
          fontSize: 22,
          fontWeight: 'bold',
          color: TACTICAL_COLOR,
          textAlign: 'center',
          letterSpacing: 1,
        }}>
          ✓ EXPLOIT_SUCCESSFUL
        </Text>

        <Text style={{
          fontFamily: 'Courier',
          fontSize: 14,
          color: SECONDARY_COLOR,
          textAlign: 'center',
          marginTop: 30,
        }}>
          {currentExploitDef.title} compromised.
        </Text>

        {currentExploit < 5 && (
          <ClassifiedButton
            label="NEXT_EXPLOIT"
            onPress={handleNextExploit}
            tacticalColor={TACTICAL_COLOR}
            style={{ marginTop: 40, paddingHorizontal: 40 }}
          />
        )}

        {currentExploit === 5 && !isThirdCompletion && (
          <Text style={{
            fontFamily: 'Courier',
            fontSize: 12,
            color: TACTICAL_COLOR,
            fontWeight: 'bold',
            textAlign: 'center',
            marginTop: 10,
          }}>
            [All exploits complete. Closing...]
          </Text>
        )}

        {isThirdCompletion && (
          <>
            <Text style={{
              fontFamily: 'Courier',
              fontSize: 14,
              color: SECONDARY_COLOR,
              textAlign: 'center',
              marginTop: 20,
            }}>
              BADGE UNLOCKED: WHITE_HAT
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
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: BG_COLOR }]}>
      {/* Screen Rendering */}
      {screen === 'challenge' && renderChallengeScreen()}
      {screen === 'success' && renderSuccessScreen()}
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
