/**
 * SettingsContainer
 *
 * Phase 5 of P1.4 SettingsModal refactor - Final Integration.
 * Orchestrator component that routes to all extracted sub-components.
 *
 * Handles:
 * - Main screen navigation hub (6 nav rows)
 * - Modal wrapper with background blur/solid
 * - Navigation state and routing logic
 * - Theme engine integration
 * - initialScreen routing
 *
 * Sub-components:
 * - SecuritySettings: security, passcodeSetup, duressSetup, changePasscode, decoyPreset
 * - AISettings: ai, performanceModes, conversationMemory
 * - AppearanceSettings: appearance, clearStyle, responseStyle
 * - AboutSettings: about, achievementGallery, privacyVerification, privacyDashboard
 * - TestingSettings: testing (DEV only)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useChatStore } from '../../state/rootStore';
import type { AppFlavor, SubscriptionTier } from '../../state/types';
import { getSettingsTheme } from '../../themes/settingsThemeEngine';
import { HushCloseButton } from '../../../apps/hush/components/HushUI';
import { SettingsNavRow } from './shared/SettingsNavRow';
import { SettingsOptionButton } from './shared/SettingsOptionButton';
import { SecuritySettings } from './SecuritySettings';
import { AISettings } from './AISettings';
import { AppearanceSettings } from './AppearanceSettings';
import { AboutSettings } from './AboutSettings';
import { TestingSettings } from './TestingSettings';
import { MembershipSettings } from './MembershipSettings';
import type { Screen } from './shared/types';
import { getRevenueCatUserId } from '../../payment/Purchases';

interface SettingsContainerProps {
  visible: boolean;
  onClose: () => void;
  mode?: AppFlavor | 'BLOCKER';
  initialScreen?: string;
}

export const SettingsContainer: React.FC<SettingsContainerProps> = ({
  visible,
  onClose,
  mode,
  initialScreen,
}) => {
  const insets = useSafeAreaInsets();

  // SELECTIVE SUBSCRIPTIONS (~10 fields for main screen only)
  const flavor = useChatStore((state) => state.flavor);
  const subscriptionTier = useChatStore((state) => state.subscriptionTier);
  const setSubscription = useChatStore((state) => state.setSubscription);
  const discretionTheme = useChatStore((state) => state.discretionTheme);
  const setDiscretionTheme = useChatStore((state) => state.setDiscretionTheme);
  const hushTheme = useChatStore((state) => state.hushTheme);
  const classifiedTheme = useChatStore((state) => state.classifiedTheme);
  const toggleFlavor = useChatStore((state) => state.toggleFlavor);
  const paywallReason = useChatStore((state) => state.paywallReason);
  const isPasscodeSet = useChatStore((state) => state.isPasscodeSet);
  const isDuressCodeSet = useChatStore((state) => state.isDuressCodeSet);
  const responseStyleHush = useChatStore((state) => state.responseStyleHush);
  const responseStyleClassified = useChatStore((state) => state.responseStyleClassified);
  const responseStyleDiscretion = useChatStore((state) => state.responseStyleDiscretion);

  // Navigation state
  const [currentScreen, setCurrentScreen] = useState<Screen>('main');

  // Calculate effective mode and theme
  const effectiveMode = mode || flavor;
  const isPro = subscriptionTier !== 'FREE';
  const isBlocker = effectiveMode === 'BLOCKER';
  const isDailyLimitPaywall = paywallReason === 'daily_limit' && !isPro;
  const theme = getSettingsTheme(effectiveMode, discretionTheme, hushTheme, classifiedTheme);

  // Reset to initialScreen when modal opens
  useEffect(() => {
    if (visible && initialScreen) {
      setCurrentScreen(initialScreen as Screen);
    } else if (!visible) {
      // Reset to main when closing
      setCurrentScreen('main');
    }
  }, [visible, initialScreen]);

  // Calculate hours until reset (midnight local time)
  const getHoursUntilReset = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msUntilReset = tomorrow.getTime() - now.getTime();
    const hoursUntilReset = Math.ceil(msUntilReset / (1000 * 60 * 60));
    return hoursUntilReset;
  };

  // ============================================
  // NAVIGATION HANDLERS
  // ============================================

  const navigateTo = useCallback((screen: Screen) => {
    Haptics.selectionAsync();
    setCurrentScreen(screen);
  }, []);

  const goBack = useCallback(() => {
    Haptics.selectionAsync();
    // Navigate back through the screen hierarchy
    setCurrentScreen((current) => {
      if (
        current === 'passcodeSetup' ||
        current === 'duressSetup' ||
        current === 'changePasscode' ||
        current === 'decoyPreset'
      ) {
        return 'security';
      } else if (
        current === 'achievementGallery' ||
        current === 'privacyVerification' ||
        current === 'privacyDashboard'
      ) {
        return 'about';
      } else if (
        current === 'performanceModes' ||
        current === 'conversationMemory'
      ) {
        return 'ai';
      } else {
        // All other screens (including clearStyle, responseStyle, appearance) go back to main
        return 'main';
      }
    });
  }, []);

  const handleClose = useCallback(() => {
    setCurrentScreen('main');
    onClose();
  }, [onClose]);

  const handleExit = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    handleClose();
    setTimeout(() => {
      toggleFlavor();
    }, 300);
  }, [handleClose, toggleFlavor]);

  const handleSubChange = useCallback((tier: SubscriptionTier) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSubscription(tier);
    if (isBlocker) handleClose();
  }, [setSubscription, isBlocker, handleClose]);

  // ============================================
  // SUMMARY HELPERS (for nav rows)
  // ============================================

  const getAISummary = () => {
    const activeMode = useChatStore.getState().activeMode;
    const modeNames: Record<string, string> = {
      efficient: 'Efficient',
      balanced: 'Balanced',
      quality: 'Quality',
    };
    const modeName = modeNames[activeMode] || 'Efficient';
    return theme.isTerminal ? modeName.toUpperCase() : modeName;
  };

  const getSecuritySummary = () => {
    if (isPasscodeSet && isDuressCodeSet)
      return theme.isTerminal ? 'FULL_PROTOCOLS' : 'Passcode + Duress';
    if (isPasscodeSet) return theme.isTerminal ? 'PASSCODE_ACTIVE' : 'Passcode enabled';
    return theme.isTerminal ? 'NOT_CONFIGURED' : 'Not set up';
  };

  const getResponseStyleSummary = () => {
    if (effectiveMode === 'HUSH') {
      const style = responseStyleHush === 'quick' ? 'Quick' : 'Thoughtful';
      return theme.isTerminal ? style.toUpperCase() : style;
    } else if (effectiveMode === 'CLASSIFIED') {
      const style = responseStyleClassified === 'operator' ? 'Operator' : 'Analyst';
      return theme.isTerminal ? style.toUpperCase() : style;
    } else {
      const style = responseStyleDiscretion === 'warm' ? 'Warm' : 'Formal';
      return style;
    }
  };

  // ============================================
  // MAIN SCREEN RENDERING
  // ============================================

  const renderMainScreen = () => (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* DAILY LIMIT PAYWALL */}
      {isDailyLimitPaywall && (
        <View style={{ marginBottom: 24, paddingHorizontal: 20 }}>
          <Text
            style={{
              fontFamily: theme.fontHeader,
              color: theme.text,
              fontSize: 18,
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: 16,
            }}
          >
            Daily Limit Reached
          </Text>
          <Text
            style={{ color: theme.subtext, fontSize: 14, textAlign: 'center', marginBottom: 8 }}
          >
            8/8 exchanges used.
          </Text>
          <Text
            style={{ color: theme.subtext, fontSize: 14, textAlign: 'center', marginBottom: 16 }}
          >
            Resets in {getHoursUntilReset()} hours.
          </Text>
          <Text
            style={{ color: theme.text, fontSize: 15, textAlign: 'center', marginBottom: 24 }}
          >
            Want unlimited?
          </Text>
        </View>
      )}

      {/* CLASSIFIED BLOCKER ASCII */}
      {isBlocker && !isPro && !isDailyLimitPaywall && (
        <View style={{ marginBottom: 24, alignItems: 'center' }}>
          <Text
            style={{ fontFamily: 'Courier', color: theme.text, fontSize: 10, lineHeight: 12 }}
          >
            {`┌──────────────────────────────────────┐
│        // CLASSIFIED TERMINAL //     │
│                                      │
│          CLEARANCE: CIVILIAN         │
│          REQUIRED: OPERATOR          │
└──────────────────────────────────────┘`}
          </Text>
        </View>
      )}

      {/* DISCRETION THEME - Show above nav rows for Discretion */}
      {effectiveMode === 'DISCRETION' && !isBlocker && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#FFFFFF' }]}>INTERFACE THEME</Text>
          <View style={styles.column}>
            <SettingsOptionButton
              label="Gold"
              isSelected={discretionTheme === 'GOLD'}
              onSelect={() => setDiscretionTheme('GOLD')}
              theme={theme}
              effectiveMode={effectiveMode}
              classifiedTheme={classifiedTheme}
            />
            <SettingsOptionButton
              label="Platinum"
              isSelected={discretionTheme === 'PLATINUM'}
              onSelect={() => setDiscretionTheme('PLATINUM')}
              theme={theme}
              effectiveMode={effectiveMode}
              classifiedTheme={classifiedTheme}
            />
            <SettingsOptionButton
              label="Emerald Green"
              isSelected={discretionTheme === 'EMERALD_GREEN'}
              onSelect={() => setDiscretionTheme('EMERALD_GREEN')}
              theme={theme}
              effectiveMode={effectiveMode}
              classifiedTheme={classifiedTheme}
            />
            <SettingsOptionButton
              label="Midnight Blue"
              isSelected={discretionTheme === 'MIDNIGHT_BLUE'}
              onSelect={() => setDiscretionTheme('MIDNIGHT_BLUE')}
              theme={theme}
              effectiveMode={effectiveMode}
              classifiedTheme={classifiedTheme}
            />
          </View>
        </View>
      )}

      {/* NAV ROWS - Only in HUSH/CLASSIFIED/DISCRETION (not BLOCKER) */}
      {!isBlocker && (
        <View style={styles.navSection}>
          {/* Membership - FREE users only */}
          {subscriptionTier === 'FREE' && (
            <SettingsNavRow
              icon="lock-open"
              label="Membership"
              sublabel={
                subscriptionTier === 'FREE' ? 'Free' :
                subscriptionTier === 'MONTHLY' ? 'Monthly' : 'Yearly'
              }
              onPress={() => navigateTo('membership')}
              theme={theme}
              effectiveMode={effectiveMode}
              classifiedTheme={classifiedTheme}
            />
          )}

          {/* AI - All flavors (A) */}
          <SettingsNavRow
            icon="sparkles"
            label={theme.isTerminal ? 'AI_Config' : 'AI'}
            sublabel={getAISummary()}
            onPress={() => navigateTo('ai')}
            theme={theme}
            effectiveMode={effectiveMode}
            classifiedTheme={classifiedTheme}
          />

          {/* Appearance - Only Hush and Classified (A for Appearance, D for Display_Config) */}
          {(effectiveMode === 'HUSH' || effectiveMode === 'CLASSIFIED') &&
            effectiveMode === 'HUSH' && (
              <SettingsNavRow
                icon="color-palette"
                label="Appearance"
                sublabel="Themes & transitions"
                onPress={() => navigateTo('appearance')}
                theme={theme}
                effectiveMode={effectiveMode}
                classifiedTheme={classifiedTheme}
              />
            )}

          {/* Clear Style - Only Hush and Classified (B for Burn_Protocol, C for Clear Style) */}
          {(effectiveMode === 'HUSH' || effectiveMode === 'CLASSIFIED') && (
            <SettingsNavRow
              icon="flame"
              label={
                effectiveMode === 'CLASSIFIED'
                  ? theme.isTerminal
                    ? 'Burn_Protocol'
                    : 'Burn Protocol'
                  : 'Clear Style'
              }
              sublabel={theme.isTerminal ? 'DATA_DESTRUCTION' : 'Animation & sound'}
              onPress={() => navigateTo('clearStyle')}
              theme={theme}
              effectiveMode={effectiveMode}
              classifiedTheme={classifiedTheme}
            />
          )}

          {/* Appearance (CLASSIFIED only) - D for Display_Config */}
          {effectiveMode === 'CLASSIFIED' && (
            <SettingsNavRow
              icon="color-palette"
              label={theme.isTerminal ? 'Display_Config' : 'Appearance'}
              sublabel={theme.isTerminal ? 'VISUAL_SETTINGS' : 'Themes & transitions'}
              onPress={() => navigateTo('appearance')}
              theme={theme}
              effectiveMode={effectiveMode}
              classifiedTheme={classifiedTheme}
            />
          )}

          {/* Response Style - All flavors (R) */}
          <SettingsNavRow
            icon="chatbubbles"
            label={theme.isTerminal ? 'Response_Mode' : 'Response Style'}
            sublabel={getResponseStyleSummary()}
            onPress={() => navigateTo('responseStyle')}
            theme={theme}
            effectiveMode={effectiveMode}
            classifiedTheme={classifiedTheme}
          />

          {/* Security - Only Hush and Classified (S) */}
          {(effectiveMode === 'HUSH' || effectiveMode === 'CLASSIFIED') && (
            <SettingsNavRow
              icon="shield-checkmark"
              label={theme.isTerminal ? 'Security_Protocols' : 'Security'}
              sublabel={getSecuritySummary()}
              onPress={() => navigateTo('security')}
              badge={isPasscodeSet ? (theme.isTerminal ? 'ACTIVE' : 'On') : undefined}
              theme={theme}
              effectiveMode={effectiveMode}
              classifiedTheme={classifiedTheme}
            />
          )}

          {/* TEMPORARY: Developer Testing (enabled for production testing) */}
          {true && (
            <SettingsNavRow
              icon="bug"
              label={theme.isTerminal ? 'Developer_Testing' : '🧪 Testing'}
              sublabel="Badge & modal tests"
              onPress={() => navigateTo('testing')}
              theme={theme}
              effectiveMode={effectiveMode}
              classifiedTheme={classifiedTheme}
            />
          )}

          {/* About - All modes (always last) */}
          <SettingsNavRow
            icon="information-circle"
            label={theme.isTerminal ? 'System_Info' : 'About'}
            sublabel={theme.isTerminal ? 'VERSION_AND_INFO' : 'Version & info'}
            onPress={() => navigateTo('about')}
            theme={theme}
            effectiveMode={effectiveMode}
            classifiedTheme={classifiedTheme}
          />
        </View>
      )}

      {/* DISCRETION EXIT */}
      {effectiveMode === 'DISCRETION' && !isBlocker && (
        <TouchableOpacity
          onPress={handleExit}
          style={[styles.exitBtn, { borderColor: theme.danger }]}
        >
          <Text
            style={{
              color: theme.danger,
              fontFamily: theme.fontBody,
              letterSpacing: 2,
              fontSize: 12,
              fontWeight: '700',
            }}
          >
            END SESSION
          </Text>
        </TouchableOpacity>
      )}

      {/* DAILY LIMIT PAYWALL BUTTON */}
      {isDailyLimitPaywall && (
        <TouchableOpacity onPress={handleClose} style={{ marginTop: 24, alignItems: 'center' }}>
          <Text style={{ color: theme.subtext, fontSize: 14, textDecorationLine: 'underline' }}>
            Remind me tomorrow
          </Text>
        </TouchableOpacity>
      )}

      {/* DAILY LIMIT REASSURANCE */}
      {isDailyLimitPaywall && (
        <Text
          style={{
            color: theme.subtext,
            fontSize: 12,
            textAlign: 'center',
            marginTop: 24,
            paddingHorizontal: 20,
          }}
        >
          Free users get 8/day. Always private.
        </Text>
      )}

      {/* CLASSIFIED BLOCKER RETURN */}
      {isBlocker && !isPro && !isDailyLimitPaywall && (
        <TouchableOpacity onPress={handleClose} style={{ marginTop: 40, alignItems: 'center' }}>
          <Text
            style={{
              fontFamily: 'Courier',
              color: theme.text,
              textDecorationLine: 'underline',
            }}
          >
            [ RETURN TO SURFACE ]
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );

  // ============================================
  // SCREEN ROUTING
  // ============================================

  const renderScreen = () => {
    // Main screen
    if (currentScreen === 'main') return renderMainScreen();

    // Security screens
    if (
      ['security', 'passcodeSetup', 'duressSetup', 'changePasscode', 'decoyPreset'].includes(
        currentScreen
      )
    ) {
      return (
        <SecuritySettings
          currentScreen={currentScreen as import('./shared/types').SecurityScreen}
          onNavigate={navigateTo as (screen: import('./shared/types').SecurityScreen) => void}
          onGoBack={goBack}
          onClose={onClose}
          effectiveMode={effectiveMode}
          theme={theme}
          isPro={isPro}
        />
      );
    }

    // AI screens
    if (
      [
        'ai',
        'performanceModes',
        'conversationMemory',
      ].includes(currentScreen)
    ) {
      return (
        <AISettings
          currentScreen={currentScreen as import('./shared/types').AIScreen}
          onNavigate={navigateTo as (screen: import('./shared/types').AIScreen) => void}
          onGoBack={goBack}
          onClose={onClose}
          effectiveMode={effectiveMode}
          theme={theme}
          isPro={isPro}
        />
      );
    }

    // Membership screen
    if (currentScreen === 'membership') {
      return (
        <MembershipSettings
          currentScreen={currentScreen as import('./shared/types').MembershipScreen}
          onGoBack={goBack}
          onClose={onClose}
          effectiveMode={effectiveMode}
          theme={theme}
          isPro={isPro}
        />
      );
    }

    // Appearance screens
    if (['appearance', 'clearStyle', 'responseStyle'].includes(currentScreen)) {
      return (
        <AppearanceSettings
          currentScreen={currentScreen as import('./shared/types').AppearanceScreen}
          onGoBack={goBack}
          onClose={onClose}
          effectiveMode={effectiveMode}
          theme={theme}
          isPro={isPro}
        />
      );
    }

    // About screens
    if (
      ['about', 'achievementGallery', 'privacyVerification', 'privacyDashboard'].includes(
        currentScreen
      )
    ) {
      return (
        <AboutSettings
          currentScreen={currentScreen as import('./shared/types').AboutScreen}
          onGoBack={goBack}
          onNavigate={navigateTo as (screen: import('./shared/types').AboutScreen) => void}
          effectiveMode={effectiveMode}
          theme={theme}
        />
      );
    }

    // Testing screen (enabled for production testing)
    if (true && currentScreen === 'testing') {
      return <TestingSettings onGoBack={goBack} theme={theme} />;
    }

    // Fallback (should never reach)
    return null;
  };

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <Modal
      visible={visible}
      animationType={theme.isTerminal ? 'fade' : 'slide'}
      transparent
      accessibilityViewIsModal={true}
    >
      {/* Background */}
      {effectiveMode === 'HUSH' ? (
        <View style={StyleSheet.absoluteFill}>
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.3)' }]} />
        </View>
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.bg, opacity: 0.98 }]} />
      )}

      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 20,
            zIndex: 1, // iOS: Ensure content renders above background
            elevation: 10, // Android: Ensure content renders above background and prevents chat bleed-through
          },
        ]}
      >
        {/* Main screen header (only show on main) */}
        {currentScreen === 'main' && (
          <>
            {!theme.isTerminal && (
              <View
                style={[styles.handle, { backgroundColor: 'rgba(255, 255, 255, 0.3)' }]}
              />
            )}
            <View style={styles.header}>
              <Text
                style={[
                  styles.title,
                  {
                    color: theme.text,
                    fontFamily: theme.fontHeader,
                    fontSize: effectiveMode === 'DISCRETION' ? 16 : 28,
                  },
                ]}
              >
                {theme.label}
              </Text>
              {!(isBlocker && !isPro) &&
                (theme.isTerminal ? (
                  // Classified: Squared circle (borderRadius: 8)
                  <TouchableOpacity
                    onPress={handleClose}
                    style={[styles.closeBtn, { backgroundColor: theme.card }]}
                    accessibilityLabel="Close settings"
                    accessibilityRole="button"
                    accessibilityHint="Close the settings menu"
                  >
                    <Ionicons name="close" size={20} color={theme.text} />
                  </TouchableOpacity>
                ) : (
                  // Hush: Perfect circle (HushCloseButton)
                  <HushCloseButton
                    onClose={handleClose}
                    backgroundColor="rgba(255, 255, 255, 0.1)"
                  />
                ))}
            </View>
          </>
        )}

        {/* Screen content */}
        {renderScreen()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 8,
    borderRadius: 8,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  column: {
    gap: 10,
  },
  navSection: {
    gap: 10,
    marginBottom: 24,
  },
  exitBtn: {
    marginTop: 40,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
    borderRadius: 8,
  },
});
