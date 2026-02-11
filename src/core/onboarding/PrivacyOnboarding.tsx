import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useChatStore } from '../state/rootStore';
import { HUSH_THEMES } from '../themes/themes';
import { PrivacyVerification } from '../../apps/hush/components/PrivacyVerification';
import { PrivacyVerificationClassified } from '../../apps/classified/components/PrivacyVerificationClassified';
import { PrivacyVerificationDiscretion } from '../../apps/discretion/components/PrivacyVerificationDiscretion';

interface PrivacyOnboardingProps {
  visible: boolean;
  onComplete: () => void;
}

export function PrivacyOnboarding({ visible, onComplete }: PrivacyOnboardingProps) {
  const [step, setStep] = useState<'welcome' | 'verification' | 'comparison'>('welcome');
  const { hushTheme, flavor, subscriptionTier } = useChatStore();
  const theme = HUSH_THEMES[hushTheme] || HUSH_THEMES.DEFAULT;
  const isPro = subscriptionTier !== 'FREE';

  const handleProveIt = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep('verification');
  };

  const handleSkipToComparison = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep('comparison');
  };

  const handleVerificationComplete = () => {
    // After verification, show comparison screen
    setStep('comparison');
  };

  const handleComplete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    useChatStore.setState({ hasSeenPrivacyOnboarding: true });
    onComplete();
  };

  // Get app name based on flavor
  const appName = flavor === 'CLASSIFIED' ? 'Classified' : flavor === 'DISCRETION' ? 'Discretion' : 'Hush';

  // Show Privacy Verification full screen when in verification step
  if (step === 'verification') {
    // Show appropriate verification screen based on flavor
    if (flavor === 'CLASSIFIED') {
      return (
        <PrivacyVerificationClassified
          onClose={handleVerificationComplete}
        />
      );
    } else if (flavor === 'DISCRETION') {
      return (
        <PrivacyVerificationDiscretion
          onClose={handleVerificationComplete}
          accentColor={theme.colors.primary}
          textColor={theme.colors.text}
          subtextColor={theme.colors.subtext}
          cardBg="rgba(255, 255, 255, 0.05)"
          inputBg="rgba(255, 255, 255, 0.08)"
          borderColor="rgba(255, 255, 255, 0.2)"
        />
      );
    } else {
      // Default to Hush
      return (
        <PrivacyVerification
          onClose={handleVerificationComplete}
        />
      );
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleComplete}
      accessibilityViewIsModal={true}
    >
      <View style={styles.overlay}>
        <View style={[
          styles.modal,
          {
            backgroundColor: theme.colors.background,
            borderColor: theme.colors.primary,
          }
        ]}>
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Welcome Screen */}
            {step === 'welcome' && (
              <>
                <View style={styles.iconContainer}>
                  <Ionicons name="shield-checkmark" size={80} color={theme.colors.primary} />
                </View>
                <Text style={[styles.title, { color: theme.colors.text }]}>
                  Welcome to {appName}
                </Text>
                <Text style={[styles.body, { color: theme.colors.subtext }]}>
                  The first AI that works 100% offline. Unlike ChatGPT or Claude, your conversations never leave your device.
                  {'\n\n'}
                  Let's prove it in 60 seconds.
                </Text>

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    { backgroundColor: theme.colors.primary }
                  ]}
                  onPress={handleProveIt}
                >
                  <Text style={styles.primaryButtonText}>
                    Prove It Now
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={handleSkipToComparison}
                >
                  <Text style={[styles.skipText, { color: theme.colors.subtext }]}>
                    Skip for Now
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Comparison Screen */}
            {step === 'comparison' && (
              <>
                <View style={styles.iconContainer}>
                  <Ionicons name="lock-closed" size={80} color={theme.colors.primary} />
                </View>
                <Text style={[styles.title, { color: theme.colors.text }]}>
                  Your Privacy, Protected
                </Text>

                {/* Comparison */}
                <View style={styles.comparisonContainer}>
                  <View style={[styles.comparisonBox, { borderColor: '#F44336' }]}>
                    <Text style={[styles.comparisonTitle, { color: '#F44336' }]}>
                      ❌ Cloud AI
                    </Text>
                    <Text style={[styles.comparisonText, { color: theme.colors.subtext }]}>
                      • Requires internet
                      {'\n'}• Data sent to servers
                      {'\n'}• Analyzed & stored
                      {'\n'}• Used for training
                      {'\n'}• Subject to breaches
                    </Text>
                  </View>

                  <View style={[styles.comparisonBox, { borderColor: '#4CAF50' }]}>
                    <Text style={[styles.comparisonTitle, { color: '#4CAF50' }]}>
                      ✅ {appName}
                    </Text>
                    <Text style={[styles.comparisonText, { color: theme.colors.subtext }]}>
                      • Works offline
                      {'\n'}• Processed on-device
                      {'\n'}• {flavor === 'CLASSIFIED' ? 'Purge chats on demand' : 'Clear chats on demand'}
                      {'\n'}• Zero cloud storage
                      {'\n'}• Protected from cloud breaches
                    </Text>
                  </View>
                </View>

                <Text style={[styles.body, { color: theme.colors.subtext, marginTop: 16 }]}>
                  You can verify offline mode anytime in Settings → {flavor === 'CLASSIFIED' ? 'VERIFY_PRIVACY' : 'Privacy Verification'}.
                </Text>

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    { backgroundColor: theme.colors.primary }
                  ]}
                  onPress={handleComplete}
                >
                  <Text style={styles.primaryButtonText}>
                    Start Chatting
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 24,
    maxWidth: 500,
    width: '100%',
    maxHeight: '85%',
  },
  content: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
  },
  comparisonContainer: {
    width: '100%',
    gap: 12,
    marginTop: 16,
    marginBottom: 24,
  },
  comparisonBox: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  comparisonTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  comparisonText: {
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
