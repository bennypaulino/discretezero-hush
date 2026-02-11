import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useChatStore } from '../state/rootStore';
import { CLASSIFIED_THEMES } from '../themes/themes';
import { ClassifiedHeader } from './components/ClassifiedUI';
import { getLocalDateString } from '../utils/dateUtils';

interface DeadDropProps {
  onComplete: () => void;
  onCancel: () => void;
  onViewGallery?: () => void;
}

// NATO phonetic alphabet (Days 1-26)
const NATO_ALPHABET = [
  'ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO', 'FOXTROT',
  'GOLF', 'HOTEL', 'INDIA', 'JULIET', 'KILO', 'LIMA',
  'MIKE', 'NOVEMBER', 'OSCAR', 'PAPA', 'QUEBEC', 'ROMEO',
  'SIERRA', 'TANGO', 'UNIFORM', 'VICTOR', 'WHISKEY', 'X-RAY',
  'YANKEE', 'ZULU'
];

// Single-word 007 movie titles (Days 27-30, randomized)
const BOND_TITLES = [
  'GOLDFINGER',
  'THUNDERBALL',
  'MOONRAKER',
  'GOLDENEYE',
  'SKYFALL',
  'SPECTRE'
];

// Spy operation names for Days 31+ (flawless players only)
const OPERATION_NAMES = [
  'KINGFISHER', 'CROSSBOW', 'TEMPEST', 'RAVEN',
  'PHOENIX', 'DRAGON', 'VIPER', 'COBRA',
  'FALCON', 'EAGLE', 'HAWK', 'CONDOR',
  'WOLF', 'PANTHER', 'TIGER', 'BEAR',
  'GHOST', 'SHADOW', 'PHANTOM', 'SPECTER'
];

// Shuffle utility (Fisher-Yates)
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Helper to get CLASSIFIED theme properties (DeadDrop is CLASSIFIED-only)
const getTheme = (classifiedTheme: string) => {
  const themeData = CLASSIFIED_THEMES[classifiedTheme as keyof typeof CLASSIFIED_THEMES] || CLASSIFIED_THEMES.TERMINAL_RED;
  return {
    background: themeData.colors.background,
    text: themeData.colors.text,
    subtext: themeData.colors.subtext,
    accent: themeData.colors.primary,
    card: themeData.colors.cardBg,
    divider: themeData.colors.border,
    success: '#00FF00',
    warning: '#FFA500',
    fontHeader: 'Courier',
    fontBody: 'Courier',
  };
};

export const DeadDrop: React.FC<DeadDropProps> = ({ onComplete, onCancel, onViewGallery }) => {
  const {
    classifiedTheme,
    forceUpdateDeadDropStreak,
  } = useChatStore();

  // Subscribe to gameState changes - this will cause re-render when streak updates
  const gameState = useChatStore((state) => state.gameState);

  const theme = getTheme(classifiedTheme);

  const [inputCode, setInputCode] = useState('');
  const [status, setStatus] = useState<'ready' | 'success' | 'failed'>('ready');
  const [showMulliganChoice, setShowMulliganChoice] = useState(false);
  const [flashNumbers, setFlashNumbers] = useState(false);

  // Get Dead Drop progress from game state (MUST be defined before useEffect)
  const deadDropProgress = gameState.gameProgress.dead_drop;
  const currentStreak = deadDropProgress.currentStreak || 0;
  const lastCheckIn = deadDropProgress.lastStreakDate;
  const completedFlawless = deadDropProgress.completedFlawless || false;
  const mulliganBudget = deadDropProgress.mulliganBudget || 0;

  // Check and refresh mulligan budget every 30 days (Days 31+ only)
  useEffect(() => {
    if (currentStreak >= 30 && deadDropProgress.lastMulliganRefresh) {
      const now = new Date();
      const lastRefresh = new Date(deadDropProgress.lastMulliganRefresh);
      const daysSinceRefresh = Math.floor(
        (now.getTime() - lastRefresh.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Refresh every 30 days
      if (daysSinceRefresh >= 30) {
        const newBudget = completedFlawless ? 2 : 1;
        useChatStore.setState((state) => ({
          gameState: {
            ...state.gameState,
            gameProgress: {
              ...state.gameState.gameProgress,
              dead_drop: {
                ...state.gameState.gameProgress.dead_drop,
                mulliganBudget: newBudget,
                lastMulliganRefresh: getLocalDateString(now),
              }
            }
          }
        }));
      }
    }
  }, [currentStreak, deadDropProgress.lastMulliganRefresh, completedFlawless]);

  // Randomize Bond titles once (stable across re-renders)
  const shuffledBondTitles = useMemo(() => shuffleArray(BOND_TITLES), []);

  // Calculate current codeword
  const currentCodeword = useMemo(() => {
    if (currentStreak < 26) {
      // Days 1-26: NATO alphabet
      return NATO_ALPHABET[currentStreak];
    } else if (currentStreak < 30) {
      // Days 27-30: Randomized Bond titles (pick 4 from 6)
      const bondIndex = (currentStreak - 26) % 4;
      return shuffledBondTitles[bondIndex];
    } else {
      // Days 31+: Flawless players get operation names, others repeat NATO
      if (completedFlawless) {
        const opIndex = (currentStreak - 30) % OPERATION_NAMES.length;
        return OPERATION_NAMES[opIndex];
      } else {
        const natoIndex = (currentStreak - 30) % NATO_ALPHABET.length;
        return NATO_ALPHABET[natoIndex];
      }
    }
  }, [currentStreak, shuffledBondTitles, completedFlawless]);

  // Check-in window calculation (calendar-day based)
  const getCheckInWindow = () => {
    if (!lastCheckIn) {
      return {
        status: 'FIRST_TIME' as const,
        countdown: null,
        canUseMulligan: false
      };
    }

    const now = new Date();

    // Get calendar dates in LOCAL time (NOT UTC - fixes timezone bug)
    const lastCheckInDate = lastCheckIn; // Already in ISO format (YYYY-MM-DD)
    const today = getLocalDateString(now); // Use local date, not UTC

    if (__DEV__) {
      console.log('[DeadDrop] Status check - lastCheckInDate:', lastCheckInDate, 'today:', today, 'now:', now.toISOString());
    }

    // Check if already checked in today (simple string comparison is sufficient)
    if (lastCheckInDate === today) {
      if (__DEV__) {
        console.log('[DeadDrop] Already checked in today');
      }
      return {
        status: 'ALREADY_CHECKED_IN' as const,
        countdown: null,
        canUseMulligan: false
      };
    }

    // Parse lastCheckInDate as LOCAL time (not UTC) for day calculations
    const lastDate = new Date(lastCheckInDate + 'T00:00:00'); // Parse as local midnight
    const daysDiff = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    // Days 1-30: Daily check-ins
    if (currentStreak < 30) {
      if (daysDiff === 1) {
        // Checked in yesterday - perfect!
        const hoursUntilMidnight = getMidnightCountdown();
        return {
          status: 'OPEN' as const,
          countdown: hoursUntilMidnight,
          canUseMulligan: false
        };
      } else if (daysDiff > 1) {
        // Missed a day - offer mulligan choice if available
        const canUseMulligan = !gameState.deadDropMulliganUsed;
        return {
          status: 'OVERDUE' as const,
          countdown: null,
          canUseMulligan
        };
      }
    }

    // Days 31+: Every 2 days
    else {
      if (daysDiff === 1) {
        // Checked in yesterday - window open
        return {
          status: 'OPEN' as const,
          countdown: 'CHECKED IN YESTERDAY',
          canUseMulligan: false
        };
      } else if (daysDiff === 2) {
        // Checked in 2 days ago - last chance
        return {
          status: 'OPEN' as const,
          countdown: 'CHECKED IN 2 DAYS AGO',
          canUseMulligan: false
        };
      } else if (daysDiff > 2) {
        // Missed the 2-day window - offer mulligan if available
        return {
          status: 'OVERDUE' as const,
          countdown: null,
          canUseMulligan: mulliganBudget > 0
        };
      }
    }

    // Fallback (shouldn't reach here)
    return {
      status: 'OPEN' as const,
      countdown: null,
      canUseMulligan: false
    };
  };

  // Helper: Get time until midnight
  const getMidnightCountdown = () => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);

    const hoursUntilMidnight = (midnight.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilMidnight < 1) {
      return `${Math.ceil(hoursUntilMidnight * 60)} MIN`;
    } else {
      return `${Math.ceil(hoursUntilMidnight)} HR`;
    }
  };

  const windowState = getCheckInWindow();
  const isOverdue = windowState.status === 'OVERDUE';
  const isFirstTime = windowState.status === 'FIRST_TIME';
  const isAlreadyCheckedIn = windowState.status === 'ALREADY_CHECKED_IN';
  const isWindowOpen = windowState.status === 'OPEN';
  const canUseMulligan = windowState.canUseMulligan;

  const handleSubmit = () => {
    // If overdue and mulligan available, show choice modal first
    if (isOverdue && canUseMulligan && !showMulliganChoice) {
      setShowMulliganChoice(true);
      return;
    }

    if (inputCode.trim().toUpperCase() === currentCodeword) {
      // Correct codeword
      setStatus('success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Check if completing Day 30 without mulligan (flawless run)
      const nextStreak = currentStreak + 1;
      if (nextStreak === 30 && !gameState.deadDropMulliganUsed) {
        // Flawless completion! Set flag and initialize mulligan budget
        useChatStore.setState((state) => ({
          gameState: {
            ...state.gameState,
            gameProgress: {
              ...state.gameState.gameProgress,
              dead_drop: {
                ...state.gameState.gameProgress.dead_drop,
                completedFlawless: true,
                mulliganBudget: 2, // Flawless players get 2 per cycle
                lastMulliganRefresh: getLocalDateString(new Date()),
              }
            }
          }
        }));
      } else if (nextStreak === 30 && gameState.deadDropMulliganUsed) {
        // Standard completion (mulligan was used)
        useChatStore.setState((state) => ({
          gameState: {
            ...state.gameState,
            gameProgress: {
              ...state.gameState.gameProgress,
              dead_drop: {
                ...state.gameState.gameProgress.dead_drop,
                completedFlawless: false,
                mulliganBudget: 1, // Standard players get 1 per cycle
                lastMulliganRefresh: getLocalDateString(new Date()),
              }
            }
          }
        }));
      }

      // Update streak immediately so UI updates before returning to main screen
      forceUpdateDeadDropStreak();

      // Flash the incremented numbers white for 4 seconds
      setFlashNumbers(true);
      setTimeout(() => {
        setFlashNumbers(false);
      }, 4000);

      // Check if badge is being unlocked (reaching Day 30)
      const badgeUnlocked = currentStreak === 30;

      // Wait 4 seconds for user to see updated streak/progress bar, then complete (unless badge unlocked)
      if (!badgeUnlocked) {
        setTimeout(() => {
          onComplete();
        }, 4000);
      }
    } else {
      // Incorrect codeword
      setStatus('failed');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      setTimeout(() => {
        setStatus('ready');
        setInputCode('');
      }, 2000);
    }
  };

  const handleHardMode = () => {
    // User chose to reset streak (no mulligan)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowMulliganChoice(false);
    // Streak will reset when they complete (handled by App.tsx)
  };

  const handleEasyMode = () => {
    // User chose to use their mulligan
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Days 1-30: Mark mulligan as used (affects flawless completion)
    if (currentStreak < 30) {
      useChatStore.setState((state) => ({
        gameState: {
          ...state.gameState,
          deadDropMulliganUsed: true
        }
      }));
    }
    // Days 31+: Decrement mulligan budget
    else {
      useChatStore.setState((state) => ({
        gameState: {
          ...state.gameState,
          gameProgress: {
            ...state.gameState.gameProgress,
            dead_drop: {
              ...state.gameState.gameProgress.dead_drop,
              mulliganBudget: Math.max(0, (state.gameState.gameProgress.dead_drop.mulliganBudget || 0) - 1)
            }
          }
        }
      }));
    }

    setShowMulliganChoice(false);
    // Streak continues (mulligan consumed)
  };

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
      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        {/* Header */}
        <ClassifiedHeader
          title="// DEAD_DROP_PROTOCOL"
          onClose={onCancel}
          tacticalColor={theme.accent}
          cardBg={theme.card}
        />

        {/* Custom subtitle with flash effect */}
        <Text style={{
          fontFamily: theme.fontBody,
          fontSize: 12,
          color: theme.subtext,
          marginTop: -16,
          marginBottom: 24,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: theme.accent + '30',
        }}>
          STREAK: <Text style={{ color: flashNumbers ? '#FFFFFF' : theme.subtext }}>{currentStreak}</Text> | {currentStreak < 30 ? 'DAILY' : 'EVERY 2 DAYS'}
        </Text>

      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}>

        {/* Status Card */}
        <View style={{
          backgroundColor: theme.card,
          borderWidth: 1,
          borderColor: isOverdue ? theme.warning : theme.accent,
          borderRadius: 12,
          padding: 20,
          marginBottom: 30,
        }}>
          {isFirstTime ? (
            <>
              <Text style={{
                fontFamily: theme.fontHeader,
                fontSize: 18,
                fontWeight: '700',
                color: theme.text,
                marginBottom: 12,
              }}>
                INITIATING_PROTOCOL
              </Text>
              <Text style={{
                fontFamily: theme.fontBody,
                fontSize: 14,
                color: theme.subtext,
                lineHeight: 22,
              }}>
                ENTER CODEWORD TO ESTABLISH SECURE COMMUNICATION PROTOCOL.{'\n'}DAILY CHECK-INS REQUIRED.
              </Text>
            </>
          ) : isAlreadyCheckedIn ? (
            <>
              <Text style={{
                fontFamily: theme.fontHeader,
                fontSize: 18,
                fontWeight: '700',
                color: theme.success,
                marginBottom: 12,
              }}>
                ✓ DROP_CONFIRMED_TODAY
              </Text>
              <Text style={{
                fontFamily: theme.fontBody,
                fontSize: 14,
                color: theme.subtext,
                lineHeight: 22,
              }}>
                CHECK-IN LOGGED.{'\n\n'}NEXT WINDOW: TOMORROW
              </Text>
            </>
          ) : isOverdue ? (
            <>
              <Text style={{
                fontFamily: theme.fontHeader,
                fontSize: 18,
                fontWeight: '700',
                color: theme.warning,
                marginBottom: 12,
              }}>
                ⚠️ PROTOCOL_COMPROMISED
              </Text>
              <Text style={{
                fontFamily: theme.fontBody,
                fontSize: 14,
                color: theme.subtext,
                lineHeight: 22,
              }}>
                MISSED CHECK-IN WINDOW{'\n'}STREAK RESET TO 1{'\n\n'}ENTER CODEWORD TO RE-ESTABLISH
              </Text>
            </>
          ) : (
            <>
              <Text style={{
                fontFamily: theme.fontHeader,
                fontSize: 18,
                fontWeight: '700',
                color: theme.success,
                marginBottom: 12,
              }}>
                ✓ WINDOW_OPEN
              </Text>
              <Text style={{
                fontFamily: theme.fontBody,
                fontSize: 14,
                color: theme.subtext,
                lineHeight: 22,
              }}>
                {windowState.countdown ? `WINDOW CLOSES IN: ${windowState.countdown}` + '\n\n' : ''}ENTER CODEWORD TO CONFIRM DROP
              </Text>
            </>
          )}
        </View>

        {/* Codeword Display */}
        <View style={{
          backgroundColor: theme.card,
          borderWidth: 2,
          borderColor: status === 'failed' ? theme.warning : theme.accent,
          borderRadius: 12,
          padding: 30,
          marginBottom: 30,
          alignItems: 'center',
        }}>
          <Text style={{
            fontFamily: theme.fontBody,
            fontSize: 14,
            color: theme.subtext,
            marginBottom: 12,
          }}>
            CODEWORD:
          </Text>
          <Text style={{
            fontFamily: theme.fontHeader,
            fontSize: 36,
            fontWeight: '700',
            color: theme.accent,
            letterSpacing: 4,
            textAlign: 'center',
          }}>
            {isAlreadyCheckedIn ? '[LOGGED]' : currentCodeword}
          </Text>
        </View>

        {/* Status Message */}
        {status === 'success' && (
          <>
            <View style={{
              backgroundColor: `${theme.success}20`,
              borderWidth: 1,
              borderColor: theme.success,
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
              alignItems: 'center',
            }}>
              <Text style={{
                fontFamily: theme.fontHeader,
                fontSize: 16,
                fontWeight: '700',
                color: theme.success,
              }}>
                ✓ CONFIRMED
              </Text>
            </View>

            {/* Badge Unlock Buttons - shown when reaching Day 30 */}
            {currentStreak === 30 && (
              <>
                <Text style={{
                  fontFamily: theme.fontHeader,
                  fontSize: 14,
                  color: theme.success,
                  textAlign: 'center',
                  marginBottom: 20,
                }}>
                  BADGE UNLOCKED: FIELD_OPERATIVE
                </Text>

                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      borderWidth: 2,
                      borderColor: theme.accent,
                      paddingVertical: 14,
                      borderRadius: 8,
                      alignItems: 'center',
                    }}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onComplete();
                    }}
                  >
                    <Text style={{ fontFamily: theme.fontHeader, fontSize: 13, color: theme.accent, fontWeight: '600' }}>
                      DISMISS
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: theme.accent,
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
                    <Text style={{ fontFamily: theme.fontHeader, fontSize: 13, color: theme.background, fontWeight: '600' }}>
                      VIEW_GALLERY
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </>
        )}

        {status === 'failed' && (
          <View style={{
            backgroundColor: `${theme.warning}20`,
            borderWidth: 1,
            borderColor: theme.warning,
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
            alignItems: 'center',
          }}>
            <Text style={{
              fontFamily: theme.fontHeader,
              fontSize: 16,
              fontWeight: '700',
              color: theme.warning,
            }}>
              ✗ INVALID_CODEWORD
            </Text>
          </View>
        )}

        {/* Input */}
        {status === 'ready' && !isAlreadyCheckedIn && !showMulliganChoice && (
          <>
            <TextInput
              style={{
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.divider,
                borderRadius: 12,
                padding: 16,
                fontFamily: theme.fontHeader,
                fontSize: 18,
                color: theme.text,
                textAlign: 'center',
                letterSpacing: 2,
                marginBottom: 16,
              }}
              placeholder="ENTER_CODEWORD..."
              placeholderTextColor={theme.subtext}
              value={inputCode}
              onChangeText={setInputCode}
              autoCapitalize="characters"
              autoCorrect={false}
              keyboardAppearance="dark"
              onSubmitEditing={handleSubmit}
            />

            <TouchableOpacity
              style={{
                backgroundColor: inputCode.trim() === '' ? theme.card : theme.accent,
                paddingVertical: 20,
                borderRadius: 12,
                alignItems: 'center',
                opacity: inputCode.trim() === '' ? 0.5 : 1,
              }}
              onPress={handleSubmit}
              disabled={inputCode.trim() === ''}
            >
              <Text style={{
                fontFamily: theme.fontHeader,
                fontSize: 18,
                fontWeight: '700',
                color: inputCode.trim() === '' ? theme.subtext : '#000',
              }}>
                CONFIRM_DROP
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* Mulligan Choice Modal */}
        {showMulliganChoice && canUseMulligan && (
          <View style={{
            backgroundColor: theme.card,
            borderWidth: 2,
            borderColor: theme.warning,
            borderRadius: 12,
            padding: 24,
            marginBottom: 20,
          }}>
            <Text style={{
              fontFamily: theme.fontHeader,
              fontSize: 20,
              fontWeight: '700',
              color: theme.warning,
              marginBottom: 16,
              textAlign: 'center',
            }}>
              CHOOSE_DIFFICULTY
            </Text>

            <Text style={{
              fontFamily: theme.fontBody,
              fontSize: 14,
              color: theme.subtext,
              marginBottom: 24,
              lineHeight: 22,
              textAlign: 'center',
            }}>
              MISSED CHECK-IN DETECTED{'\n\n'}SELECT YOUR RESPONSE:
            </Text>

            {/* Hard Mode Button */}
            <TouchableOpacity
              style={{
                backgroundColor: theme.warning,
                paddingVertical: 16,
                borderRadius: 12,
                marginBottom: 12,
                alignItems: 'center',
              }}
              onPress={handleHardMode}
            >
              <Text style={{
                fontFamily: theme.fontHeader,
                fontSize: 16,
                fontWeight: '700',
                color: '#000',
                marginBottom: 4,
              }}>
                HARD_MODE
              </Text>
              <Text style={{
                fontFamily: theme.fontBody,
                fontSize: 12,
                color: '#000',
                opacity: 0.7,
              }}>
                RESET STREAK TO 1
              </Text>
            </TouchableOpacity>

            {/* Easy Mode Button */}
            <TouchableOpacity
              style={{
                backgroundColor: theme.accent,
                paddingVertical: 16,
                borderRadius: 12,
                alignItems: 'center',
              }}
              onPress={handleEasyMode}
            >
              <Text style={{
                fontFamily: theme.fontHeader,
                fontSize: 16,
                fontWeight: '700',
                color: '#000',
                marginBottom: 4,
              }}>
                EASY_MODE
              </Text>
              <Text style={{
                fontFamily: theme.fontBody,
                fontSize: 12,
                color: '#000',
                opacity: 0.7,
              }}>
                USE MULLIGAN (1X ONLY)
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Info */}
        <View style={{
          marginTop: 30,
          padding: 20,
          backgroundColor: theme.card,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.divider,
        }}>
          {/* Progress Bar */}
          <Text style={{
            fontFamily: theme.fontBody,
            fontSize: 11,
            color: theme.subtext,
            marginBottom: 6,
          }}>
            CAMPAIGN PROGRESS: <Text style={{ color: flashNumbers ? '#FFFFFF' : theme.subtext }}>{currentStreak}</Text>/30 DAYS
          </Text>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 4,
          }}>
            <Text style={{
              fontFamily: theme.fontBody,
              fontSize: 14,
              color: theme.accent,
              letterSpacing: -0.5,
              marginRight: 4,
            }}>
              {'['}
            </Text>
            <View style={{
              flex: 1,
              height: 16,
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.divider,
              flexDirection: 'row',
              overflow: 'hidden',
            }}>
              <View style={{
                width: `${(Math.min(currentStreak, 30) / 30) * 100}%`,
                backgroundColor: theme.accent,
                height: '100%',
              }} />
            </View>
            <Text style={{
              fontFamily: theme.fontBody,
              fontSize: 14,
              color: theme.accent,
              letterSpacing: -0.5,
              marginLeft: 4,
            }}>
              {']'}
            </Text>
          </View>
          <Text style={{
            fontFamily: theme.fontBody,
            fontSize: 11,
            color: currentStreak >= 30 ? theme.success : theme.subtext,
            marginBottom: 16,
            textAlign: 'center',
          }}>
            {currentStreak >= 30
              ? '✓ FIELD_OPERATIVE BADGE UNLOCKED'
              : <>
                  <Text style={{ color: flashNumbers ? '#FFFFFF' : (currentStreak >= 30 ? theme.success : theme.subtext) }}>
                    {30 - currentStreak}
                  </Text>
                  {' DAYS TO FIELD_OPERATIVE BADGE'}
                </>}
          </Text>

          <Text style={{
            fontFamily: theme.fontBody,
            fontSize: 12,
            color: theme.subtext,
            lineHeight: 20,
          }}>
            {currentStreak < 30
              ? 'CHECK-IN PROTOCOL:' + '\n' + '• DAYS 1-30: DAILY (ONCE PER CALENDAR DAY)' + '\n' + '• POST-BADGE: EVERY 2 DAYS' + '\n\n' + 'MULLIGAN SYSTEM:' + '\n' + '• 1 MULLIGAN AVAILABLE DURING DAYS 1-30' + '\n' + '• USE TO SAVE STREAK IF YOU MISS A DAY' + '\n' + '• HARD MODE: RESET STREAK' + '\n' + '• EASY MODE: USE MULLIGAN (1X ONLY)' + '\n\n' + 'MISSING A WINDOW RESETS STREAK TO 1.'
              : 'CHECK-IN PROTOCOL:' + '\n' + '• POST-BADGE: EVERY 2 DAYS' + '\n\n' + 'MULLIGAN BUDGET:' + '\n' + `• CURRENT: ${mulliganBudget}/${completedFlawless ? '2' : '1'}` + '\n' + '• REFRESHES EVERY 30 DAYS' + '\n' + `• ${completedFlawless ? 'FLAWLESS COMPLETION BONUS: 2 PER CYCLE' : 'STANDARD: 1 PER CYCLE'}` + '\n\n' + 'SPECIAL CODEWORDS:' + '\n' + `• ${completedFlawless ? 'OPERATION NAMES (FLAWLESS BONUS)' : 'REPEATING NATO ALPHABET'}`}
          </Text>
        </View>
      </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};
