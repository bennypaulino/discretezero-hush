import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../state/rootStore';
import { HUSH_THEMES } from '../themes/themes';
import { HushCloseButton, HushButton, HushCard, HushInput, HushScreenHeader, HushIconHeader } from '../../apps/hush/components/HushUI';
import { getLocalDateString } from '../utils/dateUtils';

interface GratitudeProps {
  onComplete: () => void;
  onCancel: () => void;
}

// Helper to get Hush theme properties
// NOTE: Gratitude is Hush-only, no Classified/Discretion support needed
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

export const Gratitude: React.FC<GratitudeProps> = ({ onComplete, onCancel }) => {
  const {
    hushTheme,
    subscriptionTier,
    gameState,
  } = useChatStore();
  const theme = getHushTheme(hushTheme);

  const [gratitudeItems, setGratitudeItems] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);

  // Get current streak info
  const gratitudeProgress = gameState.gameProgress.gratitude;
  const currentStreak = gratitudeProgress.currentStreak || 0;
  const longestStreak = gratitudeProgress.longestStreak || 0;

  // Check if at cap (Free tier: 7-day cap)
  const isFreeTier = subscriptionTier === 'FREE';
  const hasReachedCap = isFreeTier && gameState.gratitudeStreakCapReached;

  // Check if played today
  const lastPlayedDate = gratitudeProgress.lastStreakDate;
  const today = getLocalDateString(new Date()); // Use LOCAL time (not UTC)
  const hasPlayedToday = lastPlayedDate === today;

  const handleAddItem = () => {
    if (currentInput.trim() === '') return;

    if (gratitudeItems.length >= 3) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGratitudeItems([...gratitudeItems, currentInput.trim()]);
    setCurrentInput('');
  };

  const handleRemoveItem = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGratitudeItems(gratitudeItems.filter((_, i) => i !== index));
  };

  const handleComplete = () => {
    if (gratitudeItems.length === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    // Check for milestone celebration (7, 30, 100 days)
    const nextStreak = currentStreak + 1;
    if (nextStreak === 7 || nextStreak === 30 || nextStreak === 100) {
      setShowCelebration(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Auto-complete after celebration
      setTimeout(() => {
        onComplete();
      }, 3000);
    } else {
      // Regular completion - show completion screen
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCompletionScreen(true);
    }
  };

  // Celebration animation
  const celebrationOpacity = new Animated.Value(0);
  const celebrationScale = new Animated.Value(0.5);

  useEffect(() => {
    if (showCelebration) {
      Animated.parallel([
        Animated.timing(celebrationOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(celebrationScale, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showCelebration]);

  const getMilestoneMessage = (streak: number) => {
    if (streak === 7) return 'MINDFULNESS WEEK COMPLETE!';
    if (streak === 30) return 'GRATITUDE MONTH MASTERED!';
    if (streak === 100) return 'CENTURION OF GRATITUDE!';
    return '';
  };

  // If already played today, show message
  if (hasPlayedToday) {
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

        <HushIconHeader
          icon="checkmark-circle"
          title="Ritual Complete"
          subtitle={"You've already practiced gratitude today.\nReturn tomorrow to continue your streak."}
          style={{ marginBottom: 30 }}
        />

        <HushCard padding={20} style={{ marginTop: 30 }}>
          <Text style={{
            fontFamily: theme.fontBody,
            fontSize: 14,
            color: theme.subtext,
            textAlign: 'center',
            marginBottom: 8,
          }}>
            Current Streak
          </Text>
          <Text style={{
            fontFamily: theme.fontHeader,
            fontSize: 48,
            fontWeight: '700',
            color: theme.accent,
            textAlign: 'center',
          }}>
            {currentStreak}
          </Text>
          <Text style={{
            fontFamily: theme.fontBody,
            fontSize: 14,
            color: theme.subtext,
            textAlign: 'center',
            marginTop: 8,
          }}>
            Longest: {longestStreak} days
          </Text>
        </HushCard>
      </View>
    );
  }

  // If Free tier reached cap, show upgrade prompt
  if (hasReachedCap) {
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

        <HushIconHeader
          icon="lock-closed"
          title="7-Day Streak Complete!"
          subtitle={"You've reached the Free tier limit.\nUpgrade to Pro for unlimited streaks and keep building your practice."}
          style={{ marginBottom: 30 }}
        />

        <HushCard padding={20} style={{ marginBottom: 30 }}>
          <Text style={{
            fontFamily: theme.fontBody,
            fontSize: 14,
            color: theme.subtext,
            textAlign: 'center',
            marginBottom: 8,
          }}>
            Your 7-Day Streak
          </Text>
          <Text style={{
            fontFamily: theme.fontHeader,
            fontSize: 48,
            fontWeight: '700',
            color: theme.accent,
            textAlign: 'center',
          }}>
            {currentStreak}
          </Text>
        </HushCard>

        <HushButton
          variant="primary"
          onPress={() => {
            // TODO: Show upgrade modal
            onCancel();
          }}
          accessibilityHint="Upgrade to Pro for unlimited gratitude streaks"
        >
          Upgrade to Pro
        </HushButton>
      </View>
    );
  }

  // Celebration overlay
  if (showCelebration) {
    const nextStreak = currentStreak + 1;
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
        <Animated.View style={{
          opacity: celebrationOpacity,
          transform: [{ scale: celebrationScale }],
          alignItems: 'center',
        }}>
          <Ionicons
            name="trophy"
            size={72}
            color={theme.accent}
            style={{ marginBottom: 20 }}
          />

          <Text style={{
            fontFamily: theme.fontHeader,
            fontSize: 28,
            fontWeight: '700',
            color: theme.accent,
            marginBottom: 12,
            textAlign: 'center',
          }}>
            {getMilestoneMessage(nextStreak)}
          </Text>

          <Text style={{
            fontFamily: theme.fontBody,
            fontSize: 18,
            color: theme.text,
            textAlign: 'center',
          }}>
            {nextStreak} day streak
          </Text>
        </Animated.View>
      </View>
    );
  }

  // Regular completion screen
  if (showCompletionScreen) {
    const nextStreak = currentStreak + 1;
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
        <HushIconHeader
          icon="checkmark-circle"
          title="Ritual Complete"
          subtitle={"Your practice has been recorded.\nReturn tomorrow to continue your streak."}
          style={{ marginBottom: 30 }}
        />

        <HushCard padding={20} style={{ marginBottom: 30 }}>
          <Text style={{
            fontFamily: theme.fontBody,
            fontSize: 14,
            color: theme.subtext,
            textAlign: 'center',
            marginBottom: 8,
          }}>
            Current Streak
          </Text>
          <Text style={{
            fontFamily: theme.fontHeader,
            fontSize: 48,
            fontWeight: '700',
            color: theme.accent,
            textAlign: 'center',
          }}>
            {nextStreak}
          </Text>
          <Text style={{
            fontFamily: theme.fontBody,
            fontSize: 14,
            color: theme.subtext,
            textAlign: 'center',
            marginTop: 8,
          }}>
            Longest: {Math.max(longestStreak, nextStreak)} days
          </Text>
        </HushCard>

        <HushButton
          variant="primary"
          onPress={onComplete}
          fullWidth
          accessibilityHint="Return to main chat"
        >
          Continue
        </HushButton>
      </View>
    );
  }

  // Main gratitude entry screen
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
      <View style={{ flex: 1, padding: 20, paddingTop: 60 }}>
        {/* Header */}
        <HushScreenHeader
          title="Gratitude Ritual"
          subtitle={`${currentStreak} day streak • Longest: ${longestStreak}`}
          onClose={onCancel}
        />

        {/* Instructions */}
        <Text style={{
          fontFamily: theme.fontBody,
          fontSize: 16,
          color: theme.subtext,
          marginBottom: 20,
          lineHeight: 24,
        }}>
          What are you grateful for today? List 1-3 things.
        </Text>

        {/* Gratitude items list */}
        <ScrollView style={{ flex: 1, marginBottom: 20 }}>
          {gratitudeItems.map((item, index) => (
            <HushCard
              key={index}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <Text style={{
                fontFamily: theme.fontHeader,
                fontSize: 20,
                color: theme.accent,
                marginRight: 12,
              }}>
                {index + 1}.
              </Text>
              <Text style={{
                flex: 1,
                fontFamily: theme.fontBody,
                fontSize: 16,
                color: theme.text,
                lineHeight: 24,
              }}>
                {item}
              </Text>
              <TouchableOpacity
                onPress={() => handleRemoveItem(index)}
                style={{ padding: 8 }}
              >
                <Ionicons name="close-circle" size={24} color={theme.subtext} />
              </TouchableOpacity>
            </HushCard>
          ))}
        </ScrollView>

        {/* Input area */}
        {gratitudeItems.length < 3 && (
          <View style={{ marginBottom: 20 }}>
            <HushInput
              value={currentInput}
              onChangeText={setCurrentInput}
              placeholder="I am grateful for..."
              multiline
              onSubmitEditing={handleAddItem}
              style={{ marginBottom: 12, minHeight: 60 }}
              accessibilityLabel="Gratitude item"
              accessibilityHint="Enter what you are grateful for today"
            />

            <HushButton
              variant="primary"
              onPress={handleAddItem}
              disabled={currentInput.trim() === ''}
              fullWidth
              accessibilityHint="Add this item to your gratitude list"
            >
              Add Item
            </HushButton>
          </View>
        )}

        {/* Complete button */}
        {gratitudeItems.length > 0 && (
          <HushButton
            variant="primary"
            onPress={handleComplete}
            fullWidth
            accessibilityHint="Complete the gratitude ritual and update your streak"
          >
            Complete Ritual
          </HushButton>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};
