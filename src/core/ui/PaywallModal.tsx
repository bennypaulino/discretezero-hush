import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Animated, Switch, Alert } from 'react-native';
import { useAnimatedValue } from '../hooks/useAnimatedValue';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useChatStore } from '../state/rootStore';
import { AppFlavor } from '../../config';
import { HushCloseButton } from '../../apps/hush/components/HushUI';
import { ClassifiedPricingCard } from '../games/components/ClassifiedUI';
import { purchaseByTier, restorePurchases } from '../payment/Purchases';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  trigger: 'daily_limit' | 'unburdening_daily_limit' | 'breathe_extended_limit' | 'feature_locked_theme' | 'feature_locked_clear_style' | 'feature_locked_response_style' | 'classified_discovery' | 'gratitude_streak_cap';
  mode: 'fullscreen' | 'modal'; // fullscreen for hard blocks, modal for soft prompts
}

export const PaywallModal: React.FC<PaywallModalProps> = ({ visible, onClose, trigger, mode }) => {
  // PERFORMANCE FIX: Use selective subscriptions instead of destructuring entire store
  // Destructuring subscribes to EVERY state change including streamingText (50-200 updates/response)
  const flavor = useChatStore((state) => state.flavor);
  const dismissPaywall = useChatStore((state) => state.dismissPaywall);
  const setSubscription = useChatStore((state) => state.setSubscription);
  const hushTheme = useChatStore((state) => state.hushTheme);
  const discretionTheme = useChatStore((state) => state.discretionTheme);
  const classifiedTheme = useChatStore((state) => state.classifiedTheme);
  const classifiedPaywallFlowMode = useChatStore((state) => state.classifiedPaywallFlowMode);
  const [showFullFeatures, setShowFullFeatures] = useState(false);
  const [toggleValue, setToggleValue] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const redactedOpacity = useAnimatedValue(1);
  const insets = useSafeAreaInsets();

  // Scanning animation for redacted bar (must be called unconditionally for hooks)
  useEffect(() => {
    if (trigger === 'classified_discovery' && visible) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(redactedOpacity, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(redactedOpacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [trigger, visible]);

  // Reset toggle state when modal closes
  useEffect(() => {
    if (!visible) {
      setToggleValue(false);
      setShowPricing(false);
    }
  }, [visible]);

  // Early return if not visible to prevent unnecessary renders
  if (!visible) return null;

  // Get theme colors based on flavor OR trigger (classified_discovery uses Classified colors)
  const getTheme = () => {
    // Special case: classified_discovery trigger always uses Classified colors (default: terminal red)
    if (trigger === 'classified_discovery') {
      return {
        background: '#000000',
        text: '#FFFFFF',
        subtext: 'rgba(255, 255, 255, 0.6)',
        accent: '#FF0000', // Terminal red (default Classified theme)
        card: 'rgba(255, 0, 0, 0.1)',
        border: 'rgba(255, 0, 0, 0.3)',
        fontHeader: 'Courier',
      };
    }

    if (flavor === 'DISCRETION') {
      return {
        background: '#000000',
        text: '#FFFFFF',
        subtext: 'rgba(255, 255, 255, 0.6)',
        accent: discretionTheme === 'GOLD' ? '#D4AF37' : '#C0C0C0',
        card: 'rgba(255, 255, 255, 0.08)',
        border: 'rgba(255, 255, 255, 0.2)',
        fontHeader: 'System',
      };
    } else {
      // Hush mode
      return {
        background: '#0A0014',
        text: '#FFFFFF',
        subtext: 'rgba(255, 255, 255, 0.6)',
        accent: '#8B5CF6',
        card: 'rgba(139, 92, 246, 0.1)',
        border: 'rgba(139, 92, 246, 0.3)',
        fontHeader: 'System',
      };
    }
  };

  const theme = getTheme();

  // Get context-specific header based on trigger
  const getContextHeader = () => {
    switch (trigger) {
      case 'daily_limit':
        return {
          title: 'Daily Limit Reached',
          subtitle: '8/8 exchanges used today. Resets at midnight.',
        };
      case 'unburdening_daily_limit':
        return {
          title: 'Daily Unburdening Complete',
          subtitle: "You've used your free session today. Upgrade for unlimited access.",
        };
      case 'breathe_extended_limit':
        return {
          title: 'Extended Sessions',
          subtitle: 'Unlock 5min, 10min, and custom duration breathwork.',
        };
      case 'gratitude_streak_cap':
        return {
          title: '7-Day Streak Complete! 🌟',
          subtitle: "You've completed your free trial. Upgrade to continue your practice.",
        };
      case 'feature_locked_theme':
      case 'feature_locked_clear_style':
      case 'feature_locked_response_style':
        return {
          title: 'Premium Feature',
          subtitle: 'Unlock all customization options.',
        };
      case 'classified_discovery':
        return {
          title: '// CLASSIFIED ACCESS REQUIRED //',
          subtitle: 'CLEARANCE LEVEL: OPERATOR',
        };
      default:
        return {
          title: 'Upgrade to Pro',
          subtitle: 'Unlock the full experience.',
        };
    }
  };

  const contextHeader = getContextHeader();

  // Top 5 features
  const topFeatures = [
    { icon: 'flash', text: 'Unlimited daily exchanges' },
    { icon: 'color-palette', text: 'All clear animations' },
    { icon: 'brush', text: 'All themes' },
    { icon: 'leaf', text: 'Extended mindful practices' },
    { icon: 'shield-checkmark', text: 'Premium security features' },
  ];

  // Full feature list (expandable)
  const fullFeatures = [
    'Unlimited daily exchanges',
    'All clear animations',
    'All themes',
    'Extended mindful practices (5min, 10min, custom breathwork)',
    'Premium security features (Panic Wipe)',
    'Classified mode access',
    'Discovery hints toggle',
    'All mindful practices & games unlocked',
    'Performance modes (Balanced, Quality)',
  ];

  const handleClose = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      dismissPaywall();
      onClose();
    } catch (error) {
      if (__DEV__) {
        console.error('[PaywallModal] Error in handleClose:', error);
      }
    }
  };

  const handleUpgrade = async (tier: 'MONTHLY' | 'YEARLY') => {
    try {
      setIsPurchasing(true);

      const result = await purchaseByTier(tier);

      setIsPurchasing(false);

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        dismissPaywall();
        onClose();
      } else {
        // Show error alert (unless user cancelled)
        if (result.error !== 'Purchase cancelled') {
          Alert.alert(
            'Purchase Failed',
            result.error || 'An error occurred. Please try again.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      setIsPurchasing(false);
      if (__DEV__) {
        console.error('[PaywallModal] Error in handleUpgrade:', error);
      }
      Alert.alert(
        'Purchase Failed',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleRestore = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsRestoring(true);

      const result = await restorePurchases();

      setIsRestoring(false);

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Success', 'Your purchases have been restored!', [{ text: 'OK' }]);
        dismissPaywall();
        onClose();
      } else {
        Alert.alert(
          'Restore Failed',
          result.error || 'No previous purchases found.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      setIsRestoring(false);
      if (__DEV__) {
        console.error('[PaywallModal] Error in handleRestore:', error);
      }
      Alert.alert(
        'Restore Failed',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleToggleChange = (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setToggleValue(value);
    setShowPricing(value); // Show pricing when ON, hide when OFF
  };

  const renderPricingCard = (
    tier: 'MONTHLY' | 'YEARLY',
    price: string,
    period: string,
    savings?: string,
    popular?: boolean
  ) => (
    <TouchableOpacity
      onPress={() => handleUpgrade(tier)}
      disabled={isPurchasing || isRestoring}
      activeOpacity={0.7}
      style={[
        styles.pricingCard,
        {
          backgroundColor: theme.card,
          borderColor: popular ? theme.accent : theme.border,
          borderWidth: popular ? 2 : 1,
          opacity: (isPurchasing || isRestoring) ? 0.5 : 1,
        },
      ]}
    >
      {popular && (
        <View style={[styles.popularBadge, { backgroundColor: theme.accent }]}>
          <Text style={styles.popularText}>MOST POPULAR</Text>
        </View>
      )}

      <View style={styles.pricingContent}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.pricingTier, { color: theme.text, fontFamily: theme.fontHeader }]}>
            {tier === 'YEARLY' ? 'Annual' : 'Monthly'}
          </Text>
          {savings && (
            <Text style={[styles.savingsText, { color: theme.accent }]}>
              {savings}
            </Text>
          )}
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.price, { color: theme.text }]}>{price}</Text>
          <Text style={[styles.period, { color: theme.subtext }]}>{period}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Terminal-styled paywall for classified_discovery (Subsequent Access)
  if (trigger === 'classified_discovery') {
    const TERMINAL_RED = '#FF0000';

    return (
      <Modal
        visible={visible}
        animationType="fade"
        transparent={false}
        onRequestClose={handleClose}
      >
        <View style={styles.terminalContainer}>
          <ScrollView
            contentContainerStyle={[styles.terminalScrollContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <Text style={styles.terminalHeader}>// CLASSIFIED TERMINAL //</Text>

            {/* Main Card */}
            <View style={styles.terminalCard}>
              {/* Title */}
              <Text style={styles.terminalCardSubtitle}>// ACCESS DENIED //</Text>

              {/* Clearance Info */}
              <Text style={styles.terminalClearanceText}>
                CLEARANCE: <Text style={styles.terminalClearanceValue}>CIVILIAN</Text>
              </Text>
              <Text style={styles.terminalClearanceText}>
                REQUIRED: <Text style={styles.terminalClearanceValue}>OPERATOR</Text>
              </Text>
            </View>

            {/* Clearance Level Section */}
            <View style={styles.terminalClearanceSection}>
              <Text style={styles.terminalClearanceSectionTitle}>&gt; CLEARANCE_LEVEL</Text>

              {/* Toggle Card */}
              <View style={[styles.terminalToggleCard, toggleValue && styles.terminalToggleCardActive]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.terminalToggleTitle}>
                    {toggleValue ? 'OPERATOR STATUS' : 'CIVILIAN STATUS'}
                  </Text>
                  <Text style={styles.terminalToggleSubtitle}>
                    Upgrade for Operator Clearance
                  </Text>
                </View>
                <Switch
                  value={toggleValue}
                  onValueChange={handleToggleChange}
                  trackColor={{ false: '#330000', true: TERMINAL_RED }}
                  thumbColor="#fff"
                />
              </View>

              {/* Pricing Cards (revealed after toggle) */}
              {showPricing && (
                <View style={styles.terminalPricingSection}>
                  <ClassifiedPricingCard
                    tier="OPERATOR ACCESS - ANNUAL"
                    price="$29.99"
                    period="per year"
                    savings="50% OFF - LIMITED TIME"
                    popular={true}
                    tacticalColor={TERMINAL_RED}
                    onPress={() => !isPurchasing && !isRestoring && handleUpgrade('YEARLY')}
                    disabled={isPurchasing || isRestoring}
                  />
                  <ClassifiedPricingCard
                    tier="OPERATOR ACCESS - MONTHLY"
                    price="$4.99"
                    period="per month"
                    tacticalColor={TERMINAL_RED}
                    onPress={() => !isPurchasing && !isRestoring && handleUpgrade('MONTHLY')}
                    disabled={isPurchasing || isRestoring}
                  />
                </View>
              )}
            </View>

            {/* Benefits Section */}
            <View style={styles.terminalUpgradeSection}>
              <Text style={styles.terminalUpgradeTitle}>UPGRADE TO UNLOCK:</Text>
              <Text style={styles.terminalUpgradeItem}>• Classified Terminal Interface</Text>
              <Text style={styles.terminalUpgradeItem}>• 5 Terminal Themes (Red, Amber, Matrix, Cyberpunk, Stealth)</Text>
              <Text style={styles.terminalUpgradeItem}>• 5 Clear Animations (CLS, Purge, Redaction, Corruption, Matrix)</Text>
              <Text style={styles.terminalUpgradeItem}>• Unlimited Exchanges</Text>

              {/* Visual separator */}
              <View style={styles.terminalProtocolSeparator} />

              {/* Protocols */}
              <Text style={styles.terminalProtocolsTitle}>▼ CLASSIFIED_PROTOCOLS</Text>
              <Text style={styles.terminalProtocolItem}>  - INTERROGATION TRAINING [LOCKED]</Text>
              <Text style={styles.terminalProtocolItem}>  - BREACH PROTOCOL [LOCKED]</Text>
              <Text style={styles.terminalProtocolItem}>  - ZERO DAY EXPLOITS [LOCKED]</Text>
              <Text style={styles.terminalProtocolItem}>  - DEFCON ESCALATION [LOCKED]</Text>
              <Text style={styles.terminalProtocolItem}>  - DEAD DROP [LOCKED]</Text>
              <Text style={styles.terminalProtocolItem}>  - MOLE HUNT [LOCKED]</Text>
            </View>

            {/* Return Button */}
            <TouchableOpacity
              style={styles.terminalReturnButton}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Text style={styles.terminalReturnText}>[ RETURN_TO_SURFACE ]</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType={mode === 'fullscreen' ? 'slide' : 'fade'}
      transparent={mode === 'modal'}
      onRequestClose={handleClose}
      accessibilityViewIsModal={true}
    >
      <View
        style={[
          mode === 'fullscreen' ? styles.fullscreenContainer : styles.modalContainer,
          { backgroundColor: mode === 'fullscreen' ? theme.background : 'rgba(0, 0, 0, 0.9)' },
        ]}
      >
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: theme.background,
              borderColor: theme.border,
              marginTop: mode === 'fullscreen' ? insets.top + 20 : 0,
              marginBottom: mode === 'fullscreen' ? insets.bottom + 20 : 0,
              marginHorizontal: mode === 'fullscreen' ? 20 : 0,
            },
          ]}
        >
          {/* Close Button (top right) - using HushCloseButton from component library */}
          <View style={[styles.closeButton, { top: insets.top > 0 ? 20 : 20 }]}>
            <HushCloseButton
              onClose={handleClose}
              backgroundColor="rgba(255, 255, 255, 0.1)"
            />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Context Header */}
            <View style={styles.header}>
              <Text
                style={[
                  styles.contextTitle,
                  {
                    color: theme.text,
                    fontFamily: theme.fontHeader,
                  },
                ]}
              >
                {contextHeader.title}
              </Text>
              <Text
                style={[
                  styles.contextSubtitle,
                  {
                    color: theme.subtext,
                    fontFamily: theme.fontHeader,
                  },
                ]}
              >
                {contextHeader.subtitle}
              </Text>
            </View>

            {/* Value Proposition */}
            <View style={styles.valueSection}>
              <Text style={[styles.valueTitle, { color: theme.accent, fontFamily: theme.fontHeader }]}>
                {flavor === 'DISCRETION' ? 'Executive Access' : 'Unlimited Peace of Mind'}
              </Text>
              <Text style={[styles.valueSubtitle, { color: theme.subtext }]}>
                {flavor === 'DISCRETION'
                  ? 'Unrestricted access to all features and capabilities.'
                  : 'Boundless privacy, boundless possibilities.'}
              </Text>
            </View>

            {/* Pricing Cards */}
            <View style={styles.pricingSection}>
              {renderPricingCard('YEARLY', '$29.99', 'per year', '50% off — for a limited time only', true)}
              {renderPricingCard('MONTHLY', '$4.99', 'per month')}
            </View>

            {/* Top 5 Features */}
            <View style={styles.featuresSection}>
              <Text style={[styles.featuresSectionTitle, { color: theme.text, fontFamily: theme.fontHeader }]}>
                What's Included
              </Text>
              {topFeatures.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <Ionicons name={feature.icon as any} size={20} color={theme.accent} />
                  <Text style={[styles.featureText, { color: theme.text }]}>{feature.text}</Text>
                </View>
              ))}

              {/* Expandable Full Feature List */}
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowFullFeatures(!showFullFeatures);
                }}
                style={styles.expandButton}
              >
                <Text style={[styles.expandText, { color: theme.accent }]}>
                  {showFullFeatures ? 'Show less' : 'See all features'}
                </Text>
                <Ionicons
                  name={showFullFeatures ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={theme.accent}
                />
              </TouchableOpacity>

              {showFullFeatures && (
                <View style={[styles.fullFeaturesList, { backgroundColor: theme.card }]}>
                  {fullFeatures.map((feature, index) => (
                    <View key={index} style={styles.fullFeatureRow}>
                      <Text style={[styles.fullFeatureBullet, { color: theme.accent }]}>•</Text>
                      <Text style={[styles.fullFeatureText, { color: theme.text }]}>{feature}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Reminder (only for daily_limit) */}
            {trigger === 'daily_limit' && mode === 'fullscreen' && (
              <TouchableOpacity onPress={handleClose} style={styles.reminderButton}>
                <Text style={[styles.reminderText, { color: theme.subtext }]}>
                  Remind me tomorrow
                </Text>
              </TouchableOpacity>
            )}

            {/* Restore Purchase */}
            <TouchableOpacity
              onPress={handleRestore}
              disabled={isPurchasing || isRestoring}
              style={[styles.restoreButton, { opacity: (isPurchasing || isRestoring) ? 0.5 : 1 }]}
            >
              <Text style={[styles.restoreText, { color: theme.subtext }]}>
                {isRestoring ? 'Restoring...' : 'Restore Purchase'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullscreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60, // Increased to avoid overlap with close button
  },
  header: {
    marginBottom: 16,
    alignItems: 'center',
  },
  contextTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  contextSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  valueSection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  valueTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  valueSubtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  pricingSection: {
    marginBottom: 32,
  },
  pricingCard: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  popularBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'center',
    borderRadius: 6,
    marginTop: 12,
  },
  popularText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 0.5,
  },
  pricingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  pricingTier: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  savingsText: {
    fontSize: 13,
    fontWeight: '500',
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
  },
  period: {
    fontSize: 13,
  },
  featuresSection: {
    marginBottom: 24,
  },
  featuresSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 15,
    marginLeft: 12,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  expandText: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  fullFeaturesList: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
  },
  fullFeatureRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  fullFeatureBullet: {
    fontSize: 16,
    marginRight: 8,
    fontWeight: '700',
  },
  fullFeatureText: {
    fontSize: 14,
    flex: 1,
  },
  restoreButton: {
    marginTop: 8, // Reduced from 16 to decrease wasted space
    paddingVertical: 12,
    alignItems: 'center',
  },
  restoreText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  reminderButton: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  reminderText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },

  // Terminal-styled paywall styles
  terminalContainer: {
    flex: 1,
    backgroundColor: '#000000',
    paddingHorizontal: 20,
  },
  terminalScrollContent: {
    paddingBottom: 40,
  },
  terminalHeader: {
    fontFamily: 'Courier',
    fontSize: 18,
    fontWeight: '700',
    color: '#FF0000',
    textAlign: 'center',
    marginBottom: 24,
  },
  terminalCard: {
    borderWidth: 1,
    borderColor: '#FF0000',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
  },
  terminalCardSubtitle: {
    fontFamily: 'Courier',
    fontSize: 14,
    fontWeight: '700',
    color: '#FF0000',
    textAlign: 'center',
    marginBottom: 16,
  },
  terminalClearanceText: {
    fontFamily: 'Courier',
    fontSize: 14,
    color: '#FF0000',
    marginBottom: 4,
  },
  terminalClearanceValue: {
    fontWeight: '700',
  },
  terminalUpgradeSection: {
    marginBottom: 20,
  },
  terminalUpgradeTitle: {
    fontFamily: 'Courier',
    fontSize: 14,
    fontWeight: '700',
    color: '#FF0000',
    marginBottom: 12,
  },
  terminalUpgradeItem: {
    fontFamily: 'Courier',
    fontSize: 13,
    color: '#FF0000',
    marginBottom: 6,
  },
  terminalProtocolItem: {
    fontFamily: 'Courier',
    fontSize: 12,
    color: '#FF0000',
    marginBottom: 4,
    opacity: 0.8,
  },
  terminalClearanceSection: {
    marginBottom: 20,
  },
  terminalClearanceSectionTitle: {
    fontFamily: 'Courier',
    fontSize: 14,
    fontWeight: '700',
    color: '#FF0000',
    marginBottom: 12,
  },
  terminalToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF0000',
    borderRadius: 8,
    padding: 20,
    backgroundColor: '#000000',
    marginBottom: 12,
  },
  terminalToggleCardActive: {
    shadowColor: '#FF0000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  terminalToggleTitle: {
    fontFamily: 'Courier',
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  terminalToggleSubtitle: {
    fontFamily: 'Courier',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  terminalPricingSection: {
    marginTop: 0,
  },
  terminalProtocolSeparator: {
    height: 1,
    backgroundColor: 'rgba(255, 0, 0, 0.3)',
    marginVertical: 16,
  },
  terminalProtocolsTitle: {
    fontFamily: 'Courier',
    fontSize: 14,
    fontWeight: '700',
    color: '#FF0000',
    marginBottom: 8,
  },
  terminalReturnButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  terminalReturnText: {
    fontFamily: 'Courier',
    fontSize: 14,
    fontWeight: '700',
    color: '#FF0000',
    textDecorationLine: 'underline',
  },
});
