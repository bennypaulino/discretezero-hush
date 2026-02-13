/**
 * TestingSettings
 *
 * DEV-only testing utilities for Classified discovery, paywall testing, and badge unlocks.
 * Only rendered when __DEV__ is true.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useChatStore } from '../../state/rootStore';
import { SESSION_PAYWALL_CAP } from '../../state/slices/subscriptionSlice';
import type { BadgeId, GameId } from '../../state/types';
import { SettingsSubHeader } from './shared/SettingsSubHeader';
import { SettingsToggleRow } from './shared/SettingsToggleRow';
import type { SettingsTheme } from '../../themes/settingsThemeEngine';

interface TestingSettingsProps {
  onGoBack: () => void;
  theme: SettingsTheme;
}

export const TestingSettings: React.FC<TestingSettingsProps> = ({ onGoBack, theme }) => {
  // CRITICAL: Prevent production exposure of testing interface
  // Temporarily enabled for production testing
  // if (!__DEV__) return null;

  // SELECTIVE SUBSCRIPTIONS - Only testing-related fields (~10 fields vs 35+)
  const classifiedDiscovered = useChatStore((state) => state.classifiedDiscovered);
  const setClassifiedDiscovered = useChatStore((state) => state.setClassifiedDiscovered);
  const advanceHintProgression = useChatStore((state) => state.advanceHintProgression);
  const clearLastHintDate = useChatStore((state) => state.clearLastHintDate);

  const unlimitedPaywallTesting = useChatStore((state) => state.unlimitedPaywallTesting);
  const setUnlimitedPaywallTesting = useChatStore((state) => state.setUnlimitedPaywallTesting);
  const dailyCount = useChatStore((state) => state.dailyCount);
  const lastActiveDate = useChatStore((state) => state.lastActiveDate);
  const subscriptionTier = useChatStore((state) => state.subscriptionTier);
  const sessionPaywallShowCount = useChatStore((state) => state.sessionPaywallShowCount);
  const dismissedPaywallTriggers = useChatStore((state) => state.dismissedPaywallTriggers);

  const panicWipeEnabled = useChatStore((state) => state.panicWipeEnabled);
  const clearHistory = useChatStore((state) => state.clearHistory);
  const isDecoyMode = useChatStore((state) => state.isDecoyMode);

  const resetBadgeForTesting = useChatStore((state) => state.resetBadgeForTesting);
  const resetGameProgressForTesting = useChatStore((state) => state.resetGameProgressForTesting);
  const setNewlyUnlockedBadge = useChatStore((state) => state.setNewlyUnlockedBadge);

  // Local accordion state
  const [onboardingExpanded, setOnboardingExpanded] = useState(false);
  const [badgeTestingExpanded, setBadgeTestingExpanded] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <SettingsSubHeader
        title={theme.isTerminal ? 'Developer_Testing' : '🧪 Testing'}
        onBack={onGoBack}
        theme={theme}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* 1. CLASSIFIED MODE DISCOVERY */}
        <Text
          style={[
            styles.sectionTitle,
            { color: theme.text, fontFamily: theme.fontHeader, marginBottom: 16 },
          ]}
        >
          Classified Mode Discovery
        </Text>
        <Text style={{ color: theme.subtext, fontSize: 14, marginBottom: 16 }}>
          Toggle Classified mode discovery status for testing the unlock flow and tier progression.
          {'\n\n'}
          <Text style={{ fontWeight: '600' }}>Enabled = Classified has been discovered</Text>
          {'\n'}
          <Text style={{ fontWeight: '600' }}>Disabled = Classified is still locked</Text>
        </Text>
        <SettingsToggleRow
          label="Classified Mode Discovered"
          value={classifiedDiscovered}
          onToggle={(discovered) => {
            setClassifiedDiscovered(discovered);
            if (discovered) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
          }}
          theme={theme}
        />

        {/* Discovery Hint Controls */}
        <TouchableOpacity
          style={[
            styles.testButton,
            { backgroundColor: theme.card, borderColor: theme.accent, marginTop: 16 },
          ]}
          onPress={() => {
            advanceHintProgression();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            Alert.alert('Hint Progression', 'Advanced to next hint level.');
          }}
        >
          <Text style={{ color: theme.text, fontFamily: theme.fontBody }}>
            Advance Hint Progression
          </Text>
          <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 4 }}>
            Skip to next discovery hint level
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: theme.card, borderColor: theme.accent }]}
          onPress={() => {
            clearLastHintDate();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            Alert.alert('Hint Date Cleared', 'Hints can now show again today.');
          }}
        >
          <Text style={{ color: theme.text, fontFamily: theme.fontBody }}>Clear Last Hint Date</Text>
          <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 4 }}>
            Allow hints to show again today
          </Text>
        </TouchableOpacity>

        {/* 2. ONBOARDING (ACCORDION) */}
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 32,
            marginBottom: onboardingExpanded ? 16 : 0,
            paddingVertical: 8,
          }}
          onPress={() => {
            setOnboardingExpanded(!onboardingExpanded);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Text
            style={[
              styles.sectionTitle,
              { color: theme.text, fontFamily: theme.fontHeader, marginBottom: 0 },
            ]}
          >
            Onboarding
          </Text>
          <Ionicons
            name={onboardingExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={theme.text}
          />
        </TouchableOpacity>

        {onboardingExpanded && (
          <>
            <Text style={{ color: theme.subtext, fontSize: 14, marginBottom: 16 }}>
              Reset onboarding flows and celebration modals.
            </Text>

            <TouchableOpacity
              style={[
                styles.testButton,
                { backgroundColor: '#DC2626', borderColor: '#DC2626' },
              ]}
              onPress={() => {
                useChatStore.getState().setShowPostPurchaseCelebration(false);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Reset', 'Post-purchase celebration state has been reset.');
              }}
            >
              <Text style={{ color: '#FFFFFF', fontFamily: theme.fontBody, fontWeight: 'bold' }}>
                Reset Celebration Modal
              </Text>
              <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 12, marginTop: 4 }}>
                Clear stuck post-purchase screen
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* 3. PAYWALL TESTING */}
        <Text
          style={[
            styles.sectionTitle,
            { color: theme.text, fontFamily: theme.fontHeader, marginTop: 32, marginBottom: 16 },
          ]}
        >
          Paywall Testing
        </Text>
        <Text style={{ color: theme.subtext, fontSize: 14, marginBottom: 16 }}>
          Remove frequency caps to test all paywall triggers unlimited times per session.
        </Text>
        <SettingsToggleRow
          label="Unlimited Paywall Testing"
          value={unlimitedPaywallTesting}
          onToggle={(enabled) => {
            setUnlimitedPaywallTesting(enabled);
            if (enabled) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          }}
          theme={theme}
        />

        {/* Debug: Daily Limit State */}
        <View
          style={{
            marginTop: 16,
            padding: 12,
            backgroundColor: theme.card,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: theme.divider,
          }}
        >
          <Text
            style={{
              color: theme.subtext,
              fontSize: 12,
              fontFamily: 'Courier',
              marginBottom: 8,
            }}
          >
            DEBUG: Daily Limit State
          </Text>
          <Text style={{ color: theme.text, fontSize: 11, fontFamily: 'Courier' }}>
            Daily Count: {dailyCount} / 8
          </Text>
          <Text
            style={{ color: theme.text, fontSize: 11, fontFamily: 'Courier', marginTop: 4 }}
          >
            Last Active: {lastActiveDate}
          </Text>
          <Text
            style={{ color: theme.text, fontSize: 11, fontFamily: 'Courier', marginTop: 4 }}
          >
            Subscription: {subscriptionTier}
          </Text>
          <Text
            style={{
              color: theme.subtext,
              fontSize: 10,
              fontFamily: 'Courier',
              marginTop: 8,
              fontStyle: 'italic',
            }}
          >
            {dailyCount >= 8
              ? '⚠️ Should trigger paywall on next message'
              : `✓ ${8 - dailyCount} messages remaining`}
          </Text>
        </View>

        {/* Debug: Paywall Frequency Cap State */}
        <View
          style={{
            marginTop: 12,
            padding: 12,
            backgroundColor: theme.card,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: theme.divider,
          }}
        >
          <Text
            style={{
              color: theme.subtext,
              fontSize: 12,
              fontFamily: 'Courier',
              marginBottom: 8,
            }}
          >
            DEBUG: Paywall Frequency Cap State
          </Text>
          <Text style={{ color: theme.text, fontSize: 11, fontFamily: 'Courier' }}>
            Session Count: {sessionPaywallShowCount} / {SESSION_PAYWALL_CAP}
          </Text>
          <Text
            style={{ color: theme.text, fontSize: 11, fontFamily: 'Courier', marginTop: 4 }}
          >
            Dismissed: [{dismissedPaywallTriggers.join(', ') || 'none'}]
          </Text>
          <Text
            style={{
              color: theme.subtext,
              fontSize: 10,
              fontFamily: 'Courier',
              marginTop: 8,
              fontStyle: 'italic',
            }}
          >
            {sessionPaywallShowCount >= SESSION_PAYWALL_CAP
              ? `⚠️ Session limit reached (${SESSION_PAYWALL_CAP}/${SESSION_PAYWALL_CAP})`
              : dismissedPaywallTriggers.length > 0
              ? `⚠️ ${dismissedPaywallTriggers.length} trigger(s) dismissed`
              : '✓ Can show paywalls'}
          </Text>
        </View>

        {/* Manual reset button */}
        <TouchableOpacity
          style={[
            styles.testButton,
            { backgroundColor: theme.card, borderColor: theme.accent, marginTop: 12 },
          ]}
          onPress={() => {
            useChatStore.setState({ dismissedPaywallTriggers: [], sessionPaywallShowCount: 0 });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Reset', 'Paywall frequency cap state has been reset.');
          }}
        >
          <Text style={{ color: theme.text, fontFamily: theme.fontBody }}>
            Reset Frequency Cap State
          </Text>
          <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 4 }}>
            Clear dismissed triggers and session count
          </Text>
        </TouchableOpacity>

        {/* PANIC WIPE TESTING */}
        <Text
          style={[
            styles.sectionTitle,
            {
              color: theme.text,
              fontFamily: theme.fontHeader,
              marginTop: 32,
              marginBottom: 16,
            },
          ]}
        >
          Panic Wipe Testing
        </Text>

        <Text style={{ color: theme.subtext, fontSize: 14, marginBottom: 16 }}>
          Manual trigger for testing shake gesture (works in all builds).
        </Text>

        <TouchableOpacity
          style={[
            styles.testButton,
            {
              backgroundColor: '#DC2626',
              borderColor: '#DC2626',
              opacity: panicWipeEnabled ? 1 : 0.5,
            },
          ]}
          onPress={() => {
            if (!panicWipeEnabled) {
              Alert.alert('Panic Wipe Disabled', 'Enable Panic Wipe in Security settings first.');
              return;
            }

            if (subscriptionTier === 'FREE') {
              Alert.alert('Pro Feature', 'Panic Wipe requires Pro subscription.');
              return;
            }

            // Manual trigger
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            clearHistory();
            if (isDecoyMode) {
              useChatStore.setState({ isDecoyMode: false, decoyBurned: false });
            }

            Alert.alert('✓ Panic Wipe Triggered', 'Conversation cleared.');
          }}
          disabled={!panicWipeEnabled}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Trigger Panic Wipe</Text>
          <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 12, marginTop: 4 }}>
            Instant conversation clear (no confirmation)
          </Text>
        </TouchableOpacity>

        {/* Debug Status */}
        <View
          style={{
            marginTop: 12,
            padding: 12,
            backgroundColor: theme.card,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: theme.divider,
          }}
        >
          <Text style={{ color: theme.subtext, fontSize: 12, fontFamily: 'Courier' }}>
            DEBUG: Panic Wipe State
          </Text>
          <Text style={{ color: theme.text, fontSize: 11, fontFamily: 'Courier', marginTop: 4 }}>
            Enabled: {panicWipeEnabled ? 'YES' : 'NO'}
          </Text>
          <Text style={{ color: theme.text, fontSize: 11, fontFamily: 'Courier', marginTop: 4 }}>
            Subscription: {subscriptionTier}
          </Text>
          <Text style={{ color: theme.subtext, fontSize: 10, marginTop: 8 }}>
            {!panicWipeEnabled
              ? '⚠️ Enable in Security settings'
              : subscriptionTier === 'FREE'
              ? '⚠️ Requires Pro subscription'
              : '✓ Ready to trigger'}
          </Text>
        </View>

        {/* Classified Paywall Testing */}
        <View
          style={{
            marginTop: 24,
            padding: 16,
            backgroundColor: theme.card,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#FF0000',
          }}
        >
          <Text
            style={{
              color: '#FF0000',
              fontSize: 14,
              fontFamily: 'Courier',
              fontWeight: '700',
              marginBottom: 12,
            }}
          >
            &gt; CLASSIFIED_PAYWALL_TESTING
          </Text>

          {/* Discovery Blocker Trigger */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{ color: theme.subtext, fontSize: 12, marginBottom: 6 }}>
              ○ Discovery Blocker (First Time)
            </Text>
            <TouchableOpacity
              style={[
                styles.testButton,
                { backgroundColor: 'rgba(255, 0, 0, 0.1)', borderColor: '#FF0000', marginTop: 4 },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                // Reset discovery state and show blocker
                useChatStore.setState({
                  firstClassifiedBlockerSeen: false,
                  classifiedDiscovered: false,
                });
                // Switch to Classified to trigger blocker
                useChatStore.setState({ flavor: 'CLASSIFIED' });
              }}
            >
              <Text style={{ color: '#FF0000', fontFamily: 'Courier', fontSize: 12 }}>
                [ TRIGGER_NOW ]
              </Text>
            </TouchableOpacity>
          </View>

          {/* PaywallModal Trigger */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{ color: theme.subtext, fontSize: 12, marginBottom: 6 }}>
              ○ Subsequent Access (PaywallModal)
            </Text>
            <TouchableOpacity
              style={[
                styles.testButton,
                { backgroundColor: 'rgba(255, 0, 0, 0.1)', borderColor: '#FF0000', marginTop: 4 },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                // Show paywall immediately
                useChatStore.setState({
                  showPaywall: true,
                  paywallReason: 'classified_discovery',
                });
              }}
            >
              <Text style={{ color: '#FF0000', fontFamily: 'Courier', fontSize: 12 }}>
                [ TRIGGER_NOW ]
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. BADGE UNLOCK TESTING (ACCORDION) */}
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 32,
            marginBottom: badgeTestingExpanded ? 16 : 0,
            paddingVertical: 8,
          }}
          onPress={() => {
            setBadgeTestingExpanded(!badgeTestingExpanded);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Text
            style={[
              styles.sectionTitle,
              { color: theme.text, fontFamily: theme.fontHeader, marginBottom: 0 },
            ]}
          >
            Badge Unlock Testing
          </Text>
          <Ionicons
            name={badgeTestingExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={theme.text}
          />
        </TouchableOpacity>

        {badgeTestingExpanded && (
          <>
            <Text style={{ color: theme.subtext, fontSize: 14, marginBottom: 24 }}>
              Reset badges and game progress to test the unlock modal flow.
            </Text>

            {/* Hush Badges */}
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: theme.accent,
                  fontFamily: theme.fontHeader,
                  fontSize: 16,
                  marginBottom: 12,
                },
              ]}
            >
              HUSH Badges
            </Text>
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: theme.card, borderColor: theme.accent }]}
              onPress={() => {
                resetBadgeForTesting('released');
                resetGameProgressForTesting('unburdening');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert(
                  'Badge Reset',
                  'Complete Unburdening once to test the "Released" badge unlock modal.'
                );
              }}
            >
              <Text style={{ color: theme.text, fontFamily: theme.fontBody }}>
                Reset "Released" Badge
              </Text>
              <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 4 }}>
                Complete Unburdening × 1
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: theme.card, borderColor: theme.accent }]}
              onPress={() => {
                resetBadgeForTesting('centered');
                resetGameProgressForTesting('breathe');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert(
                  'Badge Reset',
                  'Complete Breathe 10 times to test the "Centered" badge unlock modal.'
                );
              }}
            >
              <Text style={{ color: theme.text, fontFamily: theme.fontBody }}>
                Reset "Centered" Badge
              </Text>
              <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 4 }}>
                Complete Breathe × 10
              </Text>
            </TouchableOpacity>

            {/* Classified Badges */}
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: theme.accent,
                  fontFamily: theme.fontHeader,
                  fontSize: 16,
                  marginTop: 24,
                  marginBottom: 12,
                },
              ]}
            >
              CLASSIFIED Badges
            </Text>
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: theme.card, borderColor: theme.accent }]}
              onPress={() => {
                resetBadgeForTesting('hardened_target');
                resetGameProgressForTesting('interrogation');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert(
                  'Badge Reset',
                  'Win Interrogation Mode B once to test the "Hardened Target" badge unlock modal.'
                );
              }}
            >
              <Text style={{ color: theme.text, fontFamily: theme.fontBody }}>
                Reset "Hardened Target" Badge
              </Text>
              <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 4 }}>
                Win Interrogation Mode B × 1
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: theme.card, borderColor: theme.accent }]}
              onPress={() => {
                resetBadgeForTesting('white_hat');
                resetGameProgressForTesting('zero_day');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert(
                  'Badge Reset',
                  'Complete Zero Day 3 times to test the "White Hat" badge unlock modal.'
                );
              }}
            >
              <Text style={{ color: theme.text, fontFamily: theme.fontBody }}>
                Reset "White Hat" Badge
              </Text>
              <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 4 }}>
                Complete Zero Day × 3
              </Text>
            </TouchableOpacity>

            {/* Manual Modal Test */}
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: theme.accent,
                  fontFamily: theme.fontHeader,
                  fontSize: 16,
                  marginTop: 24,
                  marginBottom: 12,
                },
              ]}
            >
              Manual Modal Test
            </Text>
            <TouchableOpacity
              style={[
                styles.testButton,
                { backgroundColor: theme.accent, borderColor: theme.accent },
              ]}
              onPress={() => {
                setNewlyUnlockedBadge('released');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }}
            >
              <Text style={{ color: '#000', fontFamily: theme.fontBody, fontWeight: 'bold' }}>
                Show Badge Modal (Released)
              </Text>
              <Text style={{ color: '#000', fontSize: 12, marginTop: 4 }}>
                Instantly display modal (no gameplay)
              </Text>
            </TouchableOpacity>

            {/* SET BADGE READY TO UNLOCK */}
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: theme.accent,
                  fontFamily: theme.fontHeader,
                  fontSize: 16,
                  marginTop: 32,
                  marginBottom: 12,
                },
              ]}
            >
              Set Badge Ready to Unlock
            </Text>
            <Text style={{ color: theme.subtext, fontSize: 14, marginBottom: 16 }}>
              Set game progress to one step before unlocking. Complete the game once to test badge unlock.
            </Text>

            {/* Centered Badge */}
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: '#10B981', borderColor: '#10B981' }]}
              onPress={() => {
                const state = useChatStore.getState();
                useChatStore.setState({
                  gameState: {
                    ...state.gameState,
                    gameProgress: {
                      ...state.gameState.gameProgress,
                      breathe: {
                        ...state.gameState.gameProgress.breathe,
                        timesCompleted: 9,
                        lastPlayedAt: Date.now(),
                      },
                    },
                  },
                });
                resetBadgeForTesting('centered');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Ready', 'Breathe set to 9/10. Complete Breathe once to unlock "Centered" badge.');
              }}
            >
              <Text style={{ color: '#000', fontFamily: theme.fontBody, fontWeight: 'bold' }}>
                Set Centered Ready
              </Text>
              <Text style={{ color: '#000', fontSize: 12, marginTop: 4 }}>
                Breathe 9/10 → Complete 1 more
              </Text>
            </TouchableOpacity>

            {/* Grateful Badge (7-day streak) */}
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: '#10B981', borderColor: '#10B981' }]}
              onPress={() => {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayString = yesterday.toISOString().split('T')[0];

                const state = useChatStore.getState();
                useChatStore.setState({
                  gameState: {
                    ...state.gameState,
                    gameProgress: {
                      ...state.gameState.gameProgress,
                      gratitude: {
                        ...state.gameState.gameProgress.gratitude,
                        currentStreak: 6,
                        lastStreakDate: yesterdayString,
                        lastPlayedAt: yesterday.getTime(),
                      },
                    },
                  },
                });
                resetBadgeForTesting('grateful');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Ready', 'Gratitude streak set to 6 days. Complete Gratitude once to unlock "Grateful" badge.');
              }}
            >
              <Text style={{ color: '#000', fontFamily: theme.fontBody, fontWeight: 'bold' }}>
                Set Grateful Ready
              </Text>
              <Text style={{ color: '#000', fontSize: 12, marginTop: 4 }}>
                Gratitude 6-day streak → Complete 1 more
              </Text>
            </TouchableOpacity>

            {/* Optimist Badge (30-day streak) */}
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: '#10B981', borderColor: '#10B981' }]}
              onPress={() => {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayString = yesterday.toISOString().split('T')[0];

                const state = useChatStore.getState();
                useChatStore.setState({
                  gameState: {
                    ...state.gameState,
                    gameProgress: {
                      ...state.gameState.gameProgress,
                      gratitude: {
                        ...state.gameState.gameProgress.gratitude,
                        currentStreak: 29,
                        lastStreakDate: yesterdayString,
                        lastPlayedAt: yesterday.getTime(),
                      },
                    },
                  },
                });
                resetBadgeForTesting('optimist');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Ready', 'Gratitude streak set to 29 days. Complete Gratitude once to unlock "Optimist" badge.');
              }}
            >
              <Text style={{ color: '#000', fontFamily: theme.fontBody, fontWeight: 'bold' }}>
                Set Optimist Ready
              </Text>
              <Text style={{ color: '#000', fontSize: 12, marginTop: 4 }}>
                Gratitude 29-day streak → Complete 1 more
              </Text>
            </TouchableOpacity>

            {/* Unburdened Badge */}
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: '#10B981', borderColor: '#10B981' }]}
              onPress={() => {
                const state = useChatStore.getState();
                useChatStore.setState({
                  gameState: {
                    ...state.gameState,
                    gameProgress: {
                      ...state.gameState.gameProgress,
                      unburdening: {
                        ...state.gameState.gameProgress.unburdening,
                        timesCompleted: 4,
                        lastPlayedAt: Date.now(),
                      },
                    },
                  },
                });
                resetBadgeForTesting('unburdened');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Ready', 'Unburdening set to 4/5. Complete Unburdening once to unlock "Unburdened" badge.');
              }}
            >
              <Text style={{ color: '#000', fontFamily: theme.fontBody, fontWeight: 'bold' }}>
                Set Unburdened Ready
              </Text>
              <Text style={{ color: '#000', fontSize: 12, marginTop: 4 }}>
                Unburdening 4/5 → Complete 1 more
              </Text>
            </TouchableOpacity>

            {/* White Hat Badge */}
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: '#10B981', borderColor: '#10B981' }]}
              onPress={() => {
                const state = useChatStore.getState();
                useChatStore.setState({
                  gameState: {
                    ...state.gameState,
                    gameProgress: {
                      ...state.gameState.gameProgress,
                      zero_day: {
                        ...state.gameState.gameProgress.zero_day,
                        timesCompleted: 2,
                        lastPlayedAt: Date.now(),
                      },
                    },
                  },
                });
                resetBadgeForTesting('white_hat');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Ready', 'Zero Day set to 2/3. Complete Zero Day once to unlock "White Hat" badge.');
              }}
            >
              <Text style={{ color: '#000', fontFamily: theme.fontBody, fontWeight: 'bold' }}>
                Set White Hat Ready
              </Text>
              <Text style={{ color: '#000', fontSize: 12, marginTop: 4 }}>
                Zero Day 2/3 → Complete 1 more
              </Text>
            </TouchableOpacity>

            {/* Hardened Target Badge */}
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: '#10B981', borderColor: '#10B981' }]}
              onPress={() => {
                const state = useChatStore.getState();
                useChatStore.setState({
                  gameState: {
                    ...state.gameState,
                    gameProgress: {
                      ...state.gameState.gameProgress,
                      interrogation: {
                        ...state.gameState.gameProgress.interrogation,
                        timesCompleted: 9,
                        lastPlayedAt: Date.now(),
                      },
                    },
                  },
                });
                resetBadgeForTesting('hardened_target');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Ready', 'Interrogation set to 9/10 wins. Win Interrogation Mode B once to unlock "Hardened Target" badge.');
              }}
            >
              <Text style={{ color: '#000', fontFamily: theme.fontBody, fontWeight: 'bold' }}>
                Set Hardened Target Ready
              </Text>
              <Text style={{ color: '#000', fontSize: 12, marginTop: 4 }}>
                Interrogation 9/10 wins → Win Mode B once
              </Text>
            </TouchableOpacity>

            {/* Security Certified Badge */}
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: '#10B981', borderColor: '#10B981' }]}
              onPress={() => {
                const state = useChatStore.getState();
                useChatStore.setState({
                  gameState: {
                    ...state.gameState,
                    gameProgress: {
                      ...state.gameState.gameProgress,
                      breach_protocol: {
                        ...state.gameState.gameProgress.breach_protocol,
                        timesCompleted: 4,
                        lastPlayedAt: Date.now(),
                        completedLayers: [1, 2, 3, 4],
                        skippedLayers: [],
                      },
                    },
                  },
                });
                resetBadgeForTesting('security_certified');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Ready', 'Breach Protocol set to 4/5 layers (no skips). Complete layer 5 without skipping to unlock "Security Certified" badge.');
              }}
            >
              <Text style={{ color: '#000', fontFamily: theme.fontBody, fontWeight: 'bold' }}>
                Set Security Certified Ready
              </Text>
              <Text style={{ color: '#000', fontSize: 12, marginTop: 4 }}>
                Breach Protocol 4/5 layers → Complete 1 more (no skip)
              </Text>
            </TouchableOpacity>

            {/* Field Operative Badge */}
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: '#10B981', borderColor: '#10B981' }]}
              onPress={() => {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayString = yesterday.toISOString().split('T')[0];

                const state = useChatStore.getState();
                useChatStore.setState({
                  gameState: {
                    ...state.gameState,
                    gameProgress: {
                      ...state.gameState.gameProgress,
                      dead_drop: {
                        ...state.gameState.gameProgress.dead_drop,
                        currentStreak: 29,
                        lastStreakDate: yesterdayString,
                        lastPlayedAt: yesterday.getTime(),
                      },
                    },
                  },
                });
                resetBadgeForTesting('field_operative');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Ready', 'Dead Drop streak set to 29 days. Complete Dead Drop once to unlock "Field Operative" badge.');
              }}
            >
              <Text style={{ color: '#000', fontFamily: theme.fontBody, fontWeight: 'bold' }}>
                Set Field Operative Ready
              </Text>
              <Text style={{ color: '#000', fontSize: 12, marginTop: 4 }}>
                Dead Drop 29-day streak → Complete 1 more
              </Text>
            </TouchableOpacity>

            {/* Reset All Game Progress */}
            <TouchableOpacity
              style={[
                styles.testButton,
                { backgroundColor: '#DC2626', borderColor: '#DC2626', marginTop: 24 },
              ]}
              onPress={() => {
                Alert.alert(
                  'Reset All Game Progress?',
                  'This will reset ALL game progress (times completed, streaks, scores, etc.) for ALL games. Badges will NOT be affected.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Reset All',
                      style: 'destructive',
                      onPress: () => {
                        const gameIds: Array<'breathe' | 'gratitude' | 'unburdening' | 'dead_drop' | 'interrogation' | 'breach_protocol' | 'mole_hunt' | 'zero_day' | 'defcon' | 'crisis_management' | 'negotiation' | 'executive_decision'> = [
                          'breathe',
                          'gratitude',
                          'unburdening',
                          'dead_drop',
                          'interrogation',
                          'breach_protocol',
                          'mole_hunt',
                          'zero_day',
                          'defcon',
                          'crisis_management',
                          'negotiation',
                          'executive_decision',
                        ];
                        gameIds.forEach((gameId) => resetGameProgressForTesting(gameId));
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        Alert.alert('Reset Complete', 'All game progress has been reset to 0.');
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={{ color: '#FFF', fontFamily: theme.fontBody, fontWeight: 'bold' }}>
                Reset All Game Progress
              </Text>
              <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 12, marginTop: 4 }}>
                Clear all completions, streaks, and scores
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  testButton: {
    padding: 14,
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
  },
});
