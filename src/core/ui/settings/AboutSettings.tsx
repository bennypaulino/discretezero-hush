/**
 * AboutSettings
 *
 * Handles About, Achievement Gallery, Privacy Verification, and Privacy Dashboard screens.
 * Minimal store coupling (gameState, totalMessagesProtected).
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, Alert, Platform, StyleSheet, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useChatStore } from '../../state/rootStore';
import type { AppFlavor, BadgeTier, Badge } from '../../state/types';
import { SettingsSubHeader } from './shared/SettingsSubHeader';
import type { SettingsTheme } from '../../themes/settingsThemeEngine';
import Constants from 'expo-constants';
import type { AboutScreen } from './shared/types';

interface AboutSettingsProps {
  currentScreen: AboutScreen;
  onGoBack: () => void;
  onNavigate?: (screen: AboutScreen) => void;
  effectiveMode: AppFlavor | 'BLOCKER';
  theme: SettingsTheme;
}

/**
 * Helper: Get flavor-specific tier display name
 * (Extracted from old store.ts for backward compatibility)
 */
const getBadgeTierDisplayName = (tier: BadgeTier, flavor: AppFlavor): string => {
  if (flavor === 'HUSH') {
    const hushTiers: Record<BadgeTier, string> = {
      bronze: 'EMBER',
      silver: 'GLOW',
      gold: 'RADIANCE',
      diamond: 'LUMINOUS',
    };
    return hushTiers[tier] || 'EMBER'; // Fallback to EMBER if tier is invalid
  } else if (flavor === 'CLASSIFIED') {
    const classifiedTiers: Record<BadgeTier, string> = {
      bronze: 'TRAINEE',
      silver: 'OPERATIVE',
      gold: 'SPECIALIST',
      diamond: 'LEGEND',
    };
    return classifiedTiers[tier] || 'TRAINEE'; // Fallback to TRAINEE if tier is invalid
  } else {
    // DISCRETION - executive/corporate theme
    const discretionTiers: Record<BadgeTier, string> = {
      bronze: 'MANAGER',
      silver: 'DIRECTOR',
      gold: 'EXECUTIVE',
      diamond: 'CHAIRMAN',
    };
    return discretionTiers[tier] || 'MANAGER'; // Fallback to MANAGER if tier is invalid
  }
};

export const AboutSettings: React.FC<AboutSettingsProps> = ({
  currentScreen,
  onGoBack,
  onNavigate,
  effectiveMode,
  theme,
}) => {
  // SELECTIVE SUBSCRIPTIONS - Only about/privacy fields (~8 fields vs 35+)
  const gameState = useChatStore((state) => state.gameState);
  const totalMessagesProtected = useChatStore((state) => state.totalMessagesProtected);
  const flavor = useChatStore((state) => state.flavor);

  // Local state
  const [easterEggRevealed, setEasterEggRevealed] = useState(false);
  const [heartRevealed, setHeartRevealed] = useState(false);
  const badgeCollectionRef = useRef<View>(null);
  const footerTextOpacity = useRef(new Animated.Value(1)).current;

  // App version and build number
  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const buildNumber = Platform.OS === 'ios'
    ? Constants.expoConfig?.ios?.buildNumber || '1'
    : Constants.expoConfig?.android?.versionCode?.toString() || '1';

  // Animate footer text opacity when heart is revealed (Hush only - Classified switches immediately)
  useEffect(() => {
    if (effectiveMode !== 'CLASSIFIED') {
      Animated.timing(footerTextOpacity, {
        toValue: heartRevealed ? 0.4 : 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [heartRevealed, footerTextOpacity, effectiveMode]);

  // Get effective flavor for badge tier names (ignore BLOCKER)
  const effectiveFlavor: AppFlavor =
    effectiveMode === 'BLOCKER' ? 'CLASSIFIED' : (effectiveMode as AppFlavor);

  // Screen navigation
  const navigateTo = (screen: string) => {
    Haptics.selectionAsync();
    // Navigation handled by parent SettingsContainer, but we can trigger state here if needed
    // For now, just trigger haptic feedback
  };

  // ============================================
  // SCREEN: About (Menu-style)
  // ============================================
  const renderAboutScreen = () => {
    // Handler to navigate to sub-screens
    const handleNavigate = (screen: 'achievementGallery' | 'privacyVerification') => {
      // Parent SettingsContainer will handle navigation via currentScreen prop
      // For now, we'll use a workaround by directly navigating
      Haptics.selectionAsync();
      // This needs to trigger parent navigation - for now using window location trick
      if (screen === 'achievementGallery') {
        // Navigate by calling parent's navigation (handled by SettingsContainer)
        // Temporary: use onGoBack and expect parent to handle screen change
      }
    };

    const handleRateApp = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const appStoreUrl = Platform.OS === 'ios'
        ? 'https://apps.apple.com/app/idYOUR_APP_ID' // TODO: Replace with actual App Store ID
        : 'https://play.google.com/store/apps/details?id=com.discretezero.hush';
      Linking.openURL(appStoreUrl);
    };

    const handleShare = async () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const message = 'Check out Hush - Private AI that works completely offline! Your conversations stay on your device. No cloud, no tracking.';
      const url = 'https://hush.app'; // TODO: Replace with actual app URL

      try {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(url, {
            dialogTitle: 'Share Hush',
            mimeType: 'text/plain',
          });
        } else {
          // Fallback for platforms without Sharing API
          Alert.alert('Share Hush', message);
        }
      } catch (error) {
        console.error('Share error:', error);
      }
    };

    return (
      <View style={{ flex: 1 }}>
        <SettingsSubHeader
          title={effectiveMode === 'CLASSIFIED' ? 'SYSTEM_INFO' : theme.isTerminal ? 'ABOUT' : 'About'}
          onBack={onGoBack}
          theme={theme}
        />

        <ScrollView contentContainerStyle={styles.content}>
          {/* App Icon + Name + Version */}
          {effectiveMode === 'CLASSIFIED' ? (
            // CLASSIFIED: Terminal-style header
            <View style={[styles.card, { backgroundColor: theme.card, padding: 20, marginBottom: 16 }]}>
              <Text
                style={[
                  styles.appName,
                  { color: theme.text, fontFamily: theme.fontHeader, textAlign: 'center', fontSize: 18 },
                ]}
              >
                // CLASSIFIED_TERMINAL //
              </Text>
              <Text
                style={[
                  styles.appVersion,
                  { color: theme.subtext, fontFamily: theme.fontBody, textAlign: 'center', marginTop: 8 },
                ]}
              >
                Version {appVersion} (Build {buildNumber})
              </Text>
            </View>
          ) : (
            // HUSH: Icon + Name + Version
            <View style={[styles.card, { backgroundColor: theme.card, alignItems: 'center', padding: 24, marginBottom: 32 }]}>
              {/* App Icon */}
              <Image
                source={require('../../../../assets/hush-icon-192.png')}
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 22,
                  marginBottom: 16,
                }}
                resizeMode="cover"
              />

              <Text
                style={[
                  styles.appName,
                  { color: theme.text, fontFamily: theme.fontHeader },
                ]}
              >
                {theme.isTerminal ? 'HUSH_—_PRIVATE_AI' : 'Hush — Private AI'}
              </Text>
              <Text
                style={[
                  styles.appVersion,
                  { color: theme.subtext, fontFamily: theme.fontBody },
                ]}
              >
                {theme.isTerminal ? `VERSION_${appVersion}_BUILD_${buildNumber}` : `Version ${appVersion} (Build ${buildNumber})`}
              </Text>
            </View>
          )}

          {/* Menu Items */}
          {/* Achievement Gallery */}
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: theme.card }]}
            onPress={() => {
              Haptics.selectionAsync();
              if (onNavigate) {
                onNavigate('achievementGallery');
              }
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Ionicons name="trophy" size={24} color={theme.accent} style={{ marginRight: 16 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuItemTitle, { color: theme.text, fontFamily: theme.fontBody }]}>
                  {theme.isTerminal ? 'ACHIEVEMENT_GALLERY' : 'Achievement Gallery'}
                </Text>
                <Text style={[styles.menuItemSubtitle, { color: theme.subtext, fontFamily: theme.fontBody }]}>
                  {theme.isTerminal ? 'VIEW_UNLOCKED_BADGES_AND_PROGRESS' : 'View your unlocked badges and progress'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.subtext} />
            </View>
          </TouchableOpacity>

          {/* Verify Local Processing */}
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: theme.card }]}
            onPress={() => {
              Haptics.selectionAsync();
              if (onNavigate) {
                onNavigate('privacyVerification');
              }
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Ionicons name="shield-checkmark" size={24} color={theme.accent} style={{ marginRight: 16 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuItemTitle, { color: theme.text, fontFamily: theme.fontBody }]}>
                  {theme.isTerminal ? 'VERIFY_LOCAL_PROCESSING' : 'Verify Local Processing'}
                </Text>
                <Text style={[styles.menuItemSubtitle, { color: theme.subtext, fontFamily: theme.fontBody }]}>
                  {theme.isTerminal ? 'PROVE_HUSH_WORKS_WITHOUT_INTERNET' : 'Prove that Hush works without internet'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.subtext} />
            </View>
          </TouchableOpacity>

          {/* Rate Hush */}
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: theme.card }]}
            onPress={handleRateApp}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Ionicons name="star" size={24} color={theme.accent} style={{ marginRight: 16 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuItemTitle, { color: theme.text, fontFamily: theme.fontBody }]}>
                  {theme.isTerminal ? 'RATE_HUSH' : 'Rate Hush'}
                </Text>
                <Text style={[styles.menuItemSubtitle, { color: theme.subtext, fontFamily: theme.fontBody }]}>
                  {theme.isTerminal ? 'LEAVE_REVIEW_ON_APP_STORE' : 'Leave a review on the App Store'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.subtext} />
            </View>
          </TouchableOpacity>

          {/* Share with Friends */}
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: theme.card }]}
            onPress={handleShare}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Ionicons name="share-outline" size={24} color={theme.accent} style={{ marginRight: 16 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuItemTitle, { color: theme.text, fontFamily: theme.fontBody }]}>
                  {theme.isTerminal ? 'SHARE_WITH_FRIENDS' : 'Share with Friends'}
                </Text>
                <Text style={[styles.menuItemSubtitle, { color: theme.subtext, fontFamily: theme.fontBody }]}>
                  {theme.isTerminal ? 'TELL_OTHERS_ABOUT_PRIVATE_AI' : 'Tell others about private AI'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.subtext} />
            </View>
          </TouchableOpacity>

          {/* Footer with Easter Egg - Wrapped in Card */}
          <View style={[styles.card, { backgroundColor: theme.card, marginTop: 32, padding: 16 }]}>
            {effectiveMode === 'CLASSIFIED' ? (
              // CLASSIFIED: Show redacted blocks when heart is revealed
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setHeartRevealed(!heartRevealed);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
              >
                {heartRevealed ? (
                  <>
                    <Text style={[styles.footerText, { color: theme.subtext, fontFamily: theme.fontBody }]}>
                      {'// ░░░░░░░░░░░░░ '}
                    </Text>
                    <Text style={{ fontSize: 13 }}>❤️</Text>
                    <Text style={[styles.footerText, { color: theme.subtext, fontFamily: theme.fontBody }]}>
                      {' ░░░░░░░░░░░░░░░ //'}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.footerText, { color: theme.subtext, fontFamily: theme.fontBody }]}>
                      {'// DEPLOYED_WITH '}
                    </Text>
                    <Text style={{ fontSize: 13 }}>🔒</Text>
                    <Text style={[styles.footerText, { color: theme.subtext, fontFamily: theme.fontBody }]}>
                      {' BY_DISCRETEZERO //'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              // HUSH/DISCRETION: Show dimmed text when heart is revealed
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Animated.Text
                  style={[
                    styles.footerText,
                    { color: theme.subtext, fontFamily: theme.fontBody, opacity: footerTextOpacity },
                  ]}
                >
                  {theme.isTerminal ? 'MADE_WITH_' : 'Made with '}
                </Animated.Text>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setHeartRevealed(!heartRevealed);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={{ fontSize: 13 }}>
                    {heartRevealed ? '❤️' : '🔒'}
                  </Text>
                </TouchableOpacity>
                <Animated.Text
                  style={[
                    styles.footerText,
                    { color: theme.subtext, fontFamily: theme.fontBody, opacity: footerTextOpacity },
                  ]}
                >
                  {theme.isTerminal ? '_BY_DISCRETEZERO' : ' by DiscreteZero'}
                </Animated.Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    );
  };

  // ============================================
  // SCREEN: Achievement Gallery
  // ============================================
  const renderAchievementGalleryScreen = () => {
    // DEFENSIVE: Comprehensive safety checks
    if (!gameState) {
      console.warn('[AboutSettings] Achievement Gallery: gameState is undefined');
      return (
        <View style={{ flex: 1 }}>
          <SettingsSubHeader
            title={theme.isTerminal ? 'ACHIEVEMENT_GALLERY' : 'Achievement Gallery'}
            onBack={onGoBack}
            theme={theme}
          />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
            <Text style={{ color: theme.subtext, fontFamily: theme.fontBody, textAlign: 'center' }}>
              Achievement system loading...
            </Text>
            <Text style={{ color: theme.subtext, fontFamily: theme.fontBody, textAlign: 'center', marginTop: 8, fontSize: 12 }}>
              If this persists, please restart the app.
            </Text>
          </View>
        </View>
      );
    }

    if (!gameState.badges || typeof gameState.badges !== 'object') {
      console.warn('[AboutSettings] Achievement Gallery: badges object is invalid', gameState.badges);
      return (
        <View style={{ flex: 1 }}>
          <SettingsSubHeader
            title={theme.isTerminal ? 'ACHIEVEMENT_GALLERY' : 'Achievement Gallery'}
            onBack={onGoBack}
            theme={theme}
          />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
            <Text style={{ color: theme.subtext, fontFamily: theme.fontBody, textAlign: 'center' }}>
              Badge data not available
            </Text>
            <Text style={{ color: theme.subtext, fontFamily: theme.fontBody, textAlign: 'center', marginTop: 8, fontSize: 12 }}>
              Please try again or contact support.
            </Text>
          </View>
        </View>
      );
    }

    const badges = gameState.badges;

    // DEFENSIVE: Ensure badges is iterable
    const badgeEntries = badges && typeof badges === 'object' ? Object.entries(badges) : [];

    // Calculate unlocked badges (where unlockedAt is not null)
    const unlockedBadges = badgeEntries
      .filter(([_, badge]) => badge && badge.unlockedAt !== null && badge.id)
      .map(([_, badge]) => badge.id);

    // Calculate stats
    const totalBadges = badgeEntries.length;
    const unlockedCount = unlockedBadges.length;

    // DEFENSIVE: If no badges at all, show empty state
    if (totalBadges === 0) {
      return (
        <View style={{ flex: 1 }}>
          <SettingsSubHeader
            title={theme.isTerminal ? 'ACHIEVEMENT_GALLERY' : 'Achievement Gallery'}
            onBack={onGoBack}
            theme={theme}
          />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
            <Ionicons name="trophy-outline" size={64} color={theme.subtext} style={{ marginBottom: 16 }} />
            <Text style={{ color: theme.text, fontFamily: theme.fontHeader, fontSize: 18, textAlign: 'center', marginBottom: 8 }}>
              {theme.isTerminal ? 'NO_BADGES_AVAILABLE' : 'No Badges Available'}
            </Text>
            <Text style={{ color: theme.subtext, fontFamily: theme.fontBody, textAlign: 'center', fontSize: 14 }}>
              {theme.isTerminal ? 'COMPLETE_GAMES_TO_UNLOCK_BADGES' : 'Complete games to unlock badges'}
            </Text>
          </View>
        </View>
      );
    }

    const handleExportBadges = useCallback(async () => {
      if (!badgeCollectionRef.current) {
        Alert.alert('Error', 'Badge collection not ready for export.');
        return;
      }

      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const uri = await captureRef(badgeCollectionRef, {
          format: 'png',
          quality: 1.0,
        });

        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri);
        } else {
          Alert.alert('Export Failed', 'Sharing is not available on this device.');
        }
      } catch (error) {
        console.error('Export badges error:', error);
        Alert.alert('Export Failed', 'Could not export badge collection.');
      }
    }, []);

    return (
      <View style={{ flex: 1 }}>
        <SettingsSubHeader
          title={theme.isTerminal ? 'ACHIEVEMENT_GALLERY' : 'Achievement Gallery'}
          onBack={onGoBack}
          theme={theme}
        />

        <ScrollView contentContainerStyle={styles.content}>
          {/* Progress Header */}
          <View style={[styles.card, { backgroundColor: theme.card, marginBottom: 24 }]}>
            <Text
              style={[
                styles.galleryProgress,
                { color: theme.text, fontFamily: theme.fontHeader },
              ]}
            >
              {unlockedCount} / {totalBadges}
            </Text>
            <Text
              style={[
                styles.galleryProgressLabel,
                { color: theme.subtext, fontFamily: theme.fontBody },
              ]}
            >
              {theme.isTerminal ? 'ACHIEVEMENTS_UNLOCKED' : 'Achievements Unlocked'}
            </Text>
          </View>

          {/* Badge Grid */}
          <View ref={badgeCollectionRef} style={{ backgroundColor: theme.bg }}>
            <View style={styles.badgeGrid}>
              {badgeEntries.map(([badgeId, badge]: [string, Badge]) => {
                // DEFENSIVE: Skip badges with missing required fields
                if (!badge || !badge.name || !badge.description || !badge.tier) {
                  console.warn('[AboutSettings] Skipping malformed badge:', badgeId, badge);
                  return null;
                }

                const isUnlocked = badge.unlockedAt !== null;

                // DEFENSIVE: Handle potential undefined effectiveFlavor
                const safeFlavor = effectiveFlavor || 'HUSH';
                const tierName = getBadgeTierDisplayName(badge.tier, safeFlavor);

                return (
                  <View
                    key={badgeId}
                    style={[
                      styles.badgeCard,
                      {
                        backgroundColor: theme.card,
                        opacity: isUnlocked ? 1 : 0.4,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.badgeTierBadge,
                        { backgroundColor: isUnlocked ? theme.accent : theme.divider },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeTierText,
                          { color: isUnlocked ? '#000' : theme.subtext },
                        ]}
                      >
                        {theme.isTerminal ? tierName : tierName}
                      </Text>
                    </View>

                    <Ionicons
                      name={isUnlocked ? 'trophy' : 'lock-closed'}
                      size={32}
                      color={isUnlocked ? theme.accent : theme.subtext}
                      style={{ marginVertical: 8 }}
                    />

                    <Text
                      style={[
                        styles.badgeName,
                        { color: theme.text, fontFamily: theme.fontBody },
                      ]}
                    >
                      {theme.isTerminal ? badge.name.toUpperCase() : badge.name}
                    </Text>

                    <Text
                      style={[
                        styles.badgeDescription,
                        { color: theme.subtext, fontFamily: theme.fontBody },
                      ]}
                    >
                      {badge.description}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Export Button */}
          <TouchableOpacity
            style={[
              styles.exportButton,
              { backgroundColor: theme.accent, marginTop: 24 },
            ]}
            onPress={handleExportBadges}
          >
            <Ionicons name="share-outline" size={20} color="#000" />
            <Text style={[styles.exportButtonText, { color: '#000' }]}>
              {theme.isTerminal ? 'EXPORT_COLLECTION' : 'Export Collection'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

  // ============================================
  // SCREEN: Privacy Verification
  // ============================================
  const renderPrivacyVerificationScreen = () => {
    // Import the appropriate component based on flavor
    if (effectiveMode === 'CLASSIFIED' || effectiveMode === 'BLOCKER') {
      const { PrivacyVerificationClassified } = require('../../../apps/classified/components/PrivacyVerificationClassified');
      return <PrivacyVerificationClassified onClose={onGoBack} />;
    } else if (effectiveMode === 'DISCRETION') {
      const { PrivacyVerificationDiscretion } = require('../../../apps/discretion/components/PrivacyVerificationDiscretion');
      return (
        <PrivacyVerificationDiscretion
          onClose={onGoBack}
          accentColor={theme.accent}
          textColor={theme.text}
          subtextColor={theme.subtext}
          cardBg={theme.card}
          inputBg={theme.card}
          borderColor={theme.divider}
        />
      );
    } else {
      const { PrivacyVerification } = require('../../../apps/hush/components/PrivacyVerification');
      return <PrivacyVerification onClose={onGoBack} />;
    }
  };

  // ============================================
  // SCREEN: Privacy Dashboard
  // ============================================
  const renderPrivacyDashboardScreen = () => {
    return (
      <View style={{ flex: 1 }}>
        <SettingsSubHeader
          title={theme.isTerminal ? 'PRIVACY DASHBOARD' : 'Privacy Dashboard'}
          onBack={onGoBack}
          theme={theme}
        />

        <ScrollView contentContainerStyle={styles.content}>
          {/* Hero Stats */}
          <View style={[styles.card, { backgroundColor: theme.card, marginBottom: 16 }]}>
            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
              <Ionicons name="shield-checkmark" size={64} color={theme.accent} />
              <Text
                style={[
                  styles.privacyDashboardTitle,
                  { color: theme.text, fontFamily: theme.fontHeader, marginTop: 16 },
                ]}
              >
                {theme.isTerminal ? 'PRIVACY PROTECTED' : 'Your Privacy is Protected'}
              </Text>
            </View>
          </View>

          {/* Stats Grid - Combined Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.card,
                marginBottom: 16,
                padding: 20,
                flexDirection: 'row',
                gap: 20,
              },
            ]}
          >
            {/* Left Half: Messages Protected */}
            <View
              style={{
                flex: 1,
                paddingRight: 12,
                borderRightWidth: 1,
                borderRightColor: theme.divider,
              }}
            >
              <Text
                style={[
                  styles.privacyStatLabel,
                  { color: theme.subtext, fontFamily: theme.fontBody },
                ]}
              >
                {theme.isTerminal ? 'MESSAGES PROTECTED' : 'Messages Protected'}
              </Text>
              <Text
                style={[
                  styles.privacyStatValue,
                  { color: theme.accent, fontFamily: theme.fontHeader },
                ]}
              >
                {totalMessagesProtected.toLocaleString()}
              </Text>
            </View>

            {/* Right Half: Data Sent to Cloud */}
            <View style={{ flex: 1, paddingLeft: 12 }}>
              <Text
                style={[
                  styles.privacyStatLabel,
                  { color: theme.subtext, fontFamily: theme.fontBody },
                ]}
              >
                {theme.isTerminal ? 'DATA SENT TO CLOUD' : 'Data Sent to Cloud'}
              </Text>
              <Text
                style={[
                  styles.privacyStatValue,
                  { color: '#4CAF50', fontFamily: theme.fontHeader },
                ]}
              >
                0 MB
              </Text>
              <Text
                style={[
                  styles.privacyStatSubtext,
                  { color: theme.subtext, fontFamily: theme.fontBody, marginTop: 4 },
                ]}
              >
                {theme.isTerminal ? 'ZERO CLOUD STORAGE' : '100% on-device processing'}
              </Text>
            </View>
          </View>

          {/* Comparison Card */}
          <View
            style={[styles.card, { backgroundColor: theme.card, marginBottom: 16, padding: 20 }]}
          >
            <Text
              style={[
                styles.cardTitle,
                { color: theme.text, fontFamily: theme.fontHeader, marginBottom: 16 },
              ]}
            >
              {theme.isTerminal ? 'CLOUD AI COMPARISON' : 'Comparison with Cloud AI'}
            </Text>

            {/* Cloud AI */}
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="close-circle" size={20} color="#F44336" />
                <Text
                  style={[
                    styles.comparisonTitle,
                    { color: '#F44336', fontFamily: theme.fontBody, marginLeft: 8 },
                  ]}
                >
                  {theme.isTerminal
                    ? 'CLOUD_AI'
                    : 'Cloud AI (ChatGPT, Claude, Gemini)'}
                </Text>
              </View>
              <Text
                style={[
                  styles.comparisonText,
                  { color: theme.subtext, fontFamily: theme.fontBody },
                ]}
              >
                {theme.isTerminal
                  ? '• REQUIRES INTERNET\n• DATA SENT TO SERVERS\n• ANALYZED AND STORED\n• USED FOR TRAINING\n• SUBJECT TO BREACHES'
                  : '• Requires internet connection\n• Data sent to remote servers\n• Analyzed and stored\n• May be used for training\n• Subject to data breaches'}
              </Text>
            </View>

            {/* Hush */}
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text
                  style={[
                    styles.comparisonTitle,
                    { color: '#4CAF50', fontFamily: theme.fontBody, marginLeft: 8 },
                  ]}
                >
                  {theme.isTerminal ? 'HUSH' : 'Hush'}
                </Text>
              </View>
              <Text
                style={[
                  styles.comparisonText,
                  { color: theme.subtext, fontFamily: theme.fontBody },
                ]}
              >
                {theme.isTerminal
                  ? '• WORKS OFFLINE\n• PROCESSED ON DEVICE\n• PURGE CHATS ON DEMAND\n• ZERO CLOUD STORAGE\n• PROTECTED FROM CLOUD BREACHES'
                  : '• Works completely offline\n• Processed on your device\n• Clear chats on demand\n• Zero cloud storage\n• Protected from cloud breaches'}
              </Text>
            </View>
          </View>

          {/* Privacy Verification Button */}
          <TouchableOpacity
            style={[styles.settingButton, { backgroundColor: theme.accent }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigateTo('privacyVerification');
            }}
          >
            <Ionicons name="shield-checkmark" size={20} color="#000" />
            <Text style={[styles.settingButtonText, { color: '#000' }]}>
              {theme.isTerminal ? 'VERIFY_PRIVACY' : 'Verify Privacy Claims'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

  // Render appropriate screen
  if (currentScreen === 'about') {
    return renderAboutScreen();
  } else if (currentScreen === 'achievementGallery') {
    return renderAchievementGalleryScreen();
  } else if (currentScreen === 'privacyVerification') {
    return renderPrivacyVerificationScreen();
  } else if (currentScreen === 'privacyDashboard') {
    return renderPrivacyDashboardScreen();
  }

  return null;
};

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
  },
  appVersion: {
    fontSize: 14,
    marginTop: 4,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  card: {
    borderRadius: 12,
    padding: 16,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  linkText: {
    fontSize: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  copyright: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
  },
  galleryProgress: {
    fontSize: 48,
    fontWeight: '700',
    textAlign: 'center',
  },
  galleryProgressLabel: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  badgeCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  badgeTierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  badgeTierText: {
    fontSize: 10,
    fontWeight: '700',
  },
  badgeName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  badgeDescription: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  privacyDashboardTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  privacyStatLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  privacyStatValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  privacyStatSubtext: {
    fontSize: 11,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  comparisonTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  comparisonText: {
    fontSize: 13,
    lineHeight: 20,
  },
  settingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  settingButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  menuItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  menuItemSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  footerText: {
    fontSize: 13,
  },
});
