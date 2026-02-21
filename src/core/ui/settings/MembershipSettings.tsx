/**
 * MembershipSettings
 *
 * Handles subscription/membership screen for FREE users.
 * Shows upgrade options, account linking, and restore purchases.
 *
 * Only displayed for FREE tier users (PRO users hidden from nav).
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useChatStore } from '../../state/rootStore';
import type { AppFlavor } from '../../state/types';
import { SettingsSubHeader } from './shared/SettingsSubHeader';
import type { SettingsTheme } from '../../themes/settingsThemeEngine';
import type { MembershipScreen } from './shared/types';
import { purchaseByTier, restorePurchases } from '../../payment/Purchases';

interface MembershipSettingsProps {
  currentScreen: MembershipScreen;
  onGoBack: () => void;
  onClose: () => void;
  effectiveMode: AppFlavor | 'BLOCKER';
  theme: SettingsTheme;
  isPro: boolean;
}

export const MembershipSettings: React.FC<MembershipSettingsProps> = ({
  currentScreen,
  onGoBack,
  onClose,
  effectiveMode,
  theme,
  isPro,
}) => {
  // State
  const subscriptionTier = useChatStore((state) => state.subscriptionTier);
  const revenueCatUserId = useChatStore((state) => state.revenueCatUserId);
  const handleSettingsManualUpgrade = useChatStore((state) => state.handleSettingsManualUpgrade);
  const dismissPaywall = useChatStore((state) => state.dismissPaywall);

  const [userIdCopied, setUserIdCopied] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Handlers
  const handleCopyUserId = async () => {
    if (revenueCatUserId) {
      await Clipboard.setStringAsync(revenueCatUserId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setUserIdCopied(true);
      setTimeout(() => setUserIdCopied(false), 2000);
    }
  };

  const handleUpgrade = async (tier: 'MONTHLY' | 'YEARLY') => {
    setIsPurchasing(true);

    const result = await purchaseByTier(tier);

    setIsPurchasing(false);

    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      dismissPaywall();
      onClose();
    } else {
      Alert.alert('Purchase Failed', result.error || 'An error occurred. Please try again.', [
        { text: 'OK' },
      ]);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);

    const result = await restorePurchases();

    setIsRestoring(false);

    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Your purchases have been restored!', [{ text: 'OK' }]);
      dismissPaywall();
      onClose();
    } else {
      Alert.alert('Restore Failed', result.error || 'No previous purchases found.', [{ text: 'OK' }]);
    }
  };

  // Main screen render
  if (currentScreen === 'membership') {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <SettingsSubHeader
          title="Membership"
          onBack={onGoBack}
          theme={theme}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* CARD #1: CURRENT PLAN WITH PRO BENEFITS */}
          <View
            style={[
              styles.card,
              { backgroundColor: theme.card, borderColor: theme.divider },
            ]}
          >
            <Text
              style={[
                styles.cardLabel,
                { color: theme.subtext, fontFamily: theme.fontHeader },
              ]}
            >
              MEMBERSHIP
            </Text>

            <View style={styles.planHeader}>
              <Text
                style={[
                  styles.planTitle,
                  { color: theme.text, fontFamily: theme.fontBody },
                ]}
              >
                Free Plan
              </Text>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: theme.bg },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: theme.subtext, fontFamily: theme.fontBody },
                  ]}
                >
                  8 messages per day
                </Text>
              </View>
            </View>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: theme.divider }]} />

            {/* Pro Benefits */}
            <Text
              style={[
                styles.proLabel,
                { color: theme.text, fontFamily: theme.fontBody },
              ]}
            >
              Upgrade to Pro unlocks:
            </Text>

            <View style={styles.features}>
              <Text style={[styles.feature, { color: theme.text, fontFamily: theme.fontBody }]}>
                • Unlimited daily messages (vs 8/day)
              </Text>
              <Text style={[styles.feature, { color: theme.text, fontFamily: theme.fontBody }]}>
                • Keep longer conversation threads
              </Text>
              <Text style={[styles.feature, { color: theme.text, fontFamily: theme.fontBody }]}>
                • Unlock premium themes & clear animations
              </Text>
            </View>
          </View>

          {/* CARD #2: IN-APP UPGRADE */}
          <View
            style={[
              styles.card,
              { backgroundColor: theme.card, borderColor: theme.divider },
            ]}
          >
            <Text
              style={[
                styles.upgradeTitle,
                { color: theme.text, fontFamily: theme.fontBody },
              ]}
            >
              {Platform.OS === 'ios' ? 'Upgrade in App Store' : 'Upgrade via Google Play'}
            </Text>

            <TouchableOpacity
              onPress={() => {
                console.log('[MembershipSettings] In-app upgrade pressed');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                handleSettingsManualUpgrade();
                // Close MembershipSettings so PaywallModal can appear
                onClose();
              }}
              disabled={isPurchasing || isRestoring}
              style={[
                styles.primaryButton,
                { backgroundColor: theme.accent },
                (isPurchasing || isRestoring) && styles.buttonDisabled,
              ]}
            >
              <Text style={[styles.primaryButtonText, { fontFamily: theme.fontBody }]}>
                Upgrade
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* CARD #3: BROWSER UPGRADE */}
          {revenueCatUserId && (
            <View
              style={[
                styles.card,
                { backgroundColor: theme.card, borderColor: theme.divider },
              ]}
            >
              <Text
                style={[
                  styles.upgradeTitle,
                  { color: theme.text, fontFamily: theme.fontBody },
                ]}
              >
                Upgrade via Browser
              </Text>

              {/* Step 1 */}
              <Text
                style={[
                  styles.stepLabel,
                  { color: theme.subtext, fontFamily: theme.fontBody },
                ]}
              >
                Step 1: Copy your User ID
              </Text>

              <View
                style={[
                  styles.userIdBox,
                  { backgroundColor: theme.bg, borderColor: theme.divider },
                ]}
              >
                <View style={styles.userIdHeader}>
                  <Text
                    style={[
                      styles.userIdLabel,
                      { color: theme.subtext, fontFamily: theme.fontBody },
                    ]}
                  >
                    Your User ID:
                  </Text>
                  <TouchableOpacity
                    onPress={handleCopyUserId}
                    style={[
                      styles.copyButton,
                      {
                        backgroundColor: userIdCopied ? theme.accent : 'transparent',
                      },
                    ]}
                  >
                    <Ionicons
                      name={userIdCopied ? 'checkmark' : 'copy-outline'}
                      size={16}
                      color={userIdCopied ? '#FFFFFF' : theme.accent}
                      style={styles.copyIcon}
                    />
                    <Text
                      style={[
                        styles.copyButtonText,
                        {
                          color: userIdCopied ? '#FFFFFF' : theme.accent,
                          fontFamily: theme.fontBody,
                        },
                      ]}
                    >
                      {userIdCopied ? 'Copied!' : 'Copy'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text
                  style={[
                    styles.userIdText,
                    { color: theme.text, fontFamily: 'Courier' },
                  ]}
                  selectable
                >
                  {revenueCatUserId}
                </Text>
              </View>

              {/* Helper text */}
              <Text
                style={[
                  styles.helperText,
                  { color: theme.subtext, fontFamily: theme.fontBody, marginTop: 8 },
                ]}
              >
                You'll paste this during web checkout
              </Text>

              {/* Step 2 */}
              <Text
                style={[
                  styles.stepLabel,
                  { color: theme.subtext, fontFamily: theme.fontBody, marginTop: 20 },
                ]}
              >
                Step 2: Continue to Web Checkout
              </Text>

              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  Linking.openURL('https://discretezero.com/hush/upgrade');
                }}
                disabled={isPurchasing || isRestoring}
                style={[
                  styles.secondaryButton,
                  { borderColor: theme.accent },
                  (isPurchasing || isRestoring) && styles.buttonDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.secondaryButtonText,
                    { color: theme.accent, fontFamily: theme.fontBody },
                  ]}
                >
                  Upgrade via Browser
                </Text>
                <Ionicons name="chevron-forward" size={20} color={theme.accent} />
              </TouchableOpacity>
            </View>
          )}

          {/* RESTORE PURCHASES LINK (small, bottom) */}
          <TouchableOpacity
            onPress={handleRestore}
            disabled={isPurchasing || isRestoring}
            style={styles.restoreButton}
          >
            <Text
              style={[
                styles.restoreText,
                { color: theme.accent, fontFamily: theme.fontBody },
                (isPurchasing || isRestoring) && { opacity: 0.5 },
              ]}
            >
              {isRestoring ? 'Restoring...' : 'Restore Purchases'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardLabel: {
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  planSubtitle: {
    fontSize: 14,
  },
  proLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  upgradeTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 16,
  },
  stepLabel: {
    fontSize: 14,
    marginBottom: 12,
  },
  features: {
    marginBottom: 0,
  },
  feature: {
    fontSize: 14,
    marginBottom: 4,
  },
  primaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 20,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  helperText: {
    fontSize: 13,
  },
  userIdBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  userIdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  userIdLabel: {
    fontSize: 11,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  copyIcon: {
    marginRight: 4,
  },
  copyButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  userIdText: {
    fontSize: 13,
    marginBottom: 8,
  },
  userIdHint: {
    fontSize: 11,
  },
  restoreButton: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  restoreText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
