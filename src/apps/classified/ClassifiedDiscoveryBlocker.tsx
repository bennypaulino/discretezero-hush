import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Switch, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useChatStore } from '../../core/state/rootStore';
import { ClassifiedPricingCard } from '../../core/games/components/ClassifiedUI';
import { purchaseByTier } from '../../core/payment/Purchases';

interface ClassifiedDiscoveryBlockerProps {
  visible: boolean; // Control visibility via Modal
  onUpgrade: () => void; // Toggle switch tapped → show upgrade flow
  onReturn: () => void; // Return to Hush
}

export const ClassifiedDiscoveryBlocker: React.FC<ClassifiedDiscoveryBlockerProps> = ({
  visible,
  onUpgrade,
  onReturn,
}) => {
  const insets = useSafeAreaInsets();
  // MEMORY FIX: Selective subscription instead of destructuring
  const dismissPaywall = useChatStore((state) => state.dismissPaywall);
  const [toggleValue, setToggleValue] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Reset toggle state when modal closes
  useEffect(() => {
    if (!visible) {
      setToggleValue(false);
      setShowPricing(false);
    }
  }, [visible]);

  // This blocker is ONLY shown on first-time discovery
  const isFirstTime = true;

  const handleToggleChange = (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setToggleValue(value);
    setShowPricing(value); // Show pricing when ON, hide when OFF
  };

  const handlePurchase = async (tier: 'MONTHLY' | 'YEARLY') => {
    setIsPurchasing(true);

    const result = await purchaseByTier(tier);

    setIsPurchasing(false);

    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      dismissPaywall();
      onReturn(); // Return to Hush after purchase
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
  };

  const handleReturnTap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onReturn();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
    >
      <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      {/* Header */}
      <Text style={styles.header}>// CLASSIFIED TERMINAL //</Text>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* First-time discovery message */}
        {isFirstTime && (
          <Text style={styles.discoveryText}>
            You long-pressed on the title and found the back door!
          </Text>
        )}

        {/* Main Card */}
        <View style={styles.card}>
          {/* Title */}
          <Text style={styles.cardSubtitle}>// ACCESS DENIED //</Text>

          {/* Clearance Info */}
          <Text style={styles.clearanceText}>
            CLEARANCE: <Text style={styles.clearanceValue}>CIVILIAN</Text>
          </Text>
          <Text style={styles.clearanceText}>
            REQUIRED: <Text style={styles.clearanceValue}>OPERATOR</Text>
          </Text>
        </View>

        {/* Clearance Level Section */}
        <View style={styles.clearanceSection}>
          <Text style={styles.clearanceSectionTitle}>&gt; CLEARANCE_LEVEL</Text>

          {/* Toggle Card */}
          <View style={[styles.toggleCard, toggleValue && styles.toggleCardActive]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>
                {toggleValue ? 'OPERATOR STATUS' : 'CIVILIAN STATUS'}
              </Text>
              <Text style={styles.toggleSubtitle}>
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
            <View style={styles.pricingSection}>
              <ClassifiedPricingCard
                tier="OPERATOR ACCESS - ANNUAL"
                price="$29.99"
                period="per year"
                savings="50% OFF - LIMITED TIME"
                popular={true}
                tacticalColor={TERMINAL_RED}
                onPress={() => !isPurchasing && handlePurchase('YEARLY')}
                disabled={isPurchasing}
              />
              <ClassifiedPricingCard
                tier="OPERATOR ACCESS - MONTHLY"
                price="$4.99"
                period="per month"
                tacticalColor={TERMINAL_RED}
                onPress={() => !isPurchasing && handlePurchase('MONTHLY')}
                disabled={isPurchasing}
              />
            </View>
          )}
        </View>

        {/* Upgrade Section */}
        <View style={styles.upgradeSection}>
          <Text style={styles.upgradeTitle}>UPGRADE TO UNLOCK:</Text>
          <Text style={styles.upgradeItem}>• Classified Terminal Interface</Text>
          <Text style={styles.upgradeItem}>• 5 Terminal Themes (Red, Amber, Matrix, Cyberpunk, Stealth)</Text>
          <Text style={styles.upgradeItem}>• 5 Clear Animations (CLS, Purge, Redaction, Corruption, Matrix)</Text>
          <Text style={styles.upgradeItem}>• Unlimited Exchanges</Text>

          {/* Visual separator */}
          <View style={styles.protocolSeparator} />

          {/* Protocols */}
          <Text style={styles.protocolsTitle}>▼ CLASSIFIED_PROTOCOLS</Text>
          <Text style={styles.protocolItem}>  - INTERROGATION TRAINING [LOCKED]</Text>
          <Text style={styles.protocolItem}>  - BREACH PROTOCOL [LOCKED]</Text>
          <Text style={styles.protocolItem}>  - ZERO DAY EXPLOITS [LOCKED]</Text>
          <Text style={styles.protocolItem}>  - DEFCON ESCALATION [LOCKED]</Text>
          <Text style={styles.protocolItem}>  - DEAD DROP [LOCKED]</Text>
          <Text style={styles.protocolItem}>  - MOLE HUNT [LOCKED]</Text>
        </View>

        {/* Return Button */}
        <TouchableOpacity
          style={styles.returnButton}
          onPress={handleReturnTap}
          activeOpacity={0.7}
        >
          <Text style={styles.returnText}>[ RETURN TO SURFACE ]</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
    </Modal>
  );
};

const TERMINAL_RED = '#FF0000';
const CARD_BORDER = '#FF0000';
const BACKGROUND = '#000000';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: BACKGROUND,
    paddingHorizontal: 20,
  },
  header: {
    fontFamily: 'Courier',
    fontSize: 18,
    fontWeight: '700',
    color: TERMINAL_RED,
    textAlign: 'center',
    marginBottom: 24,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  discoveryText: {
    fontFamily: 'Courier',
    fontSize: 14,
    color: TERMINAL_RED,
    marginBottom: 20,
  },
  card: {
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
  },
  cardSubtitle: {
    fontFamily: 'Courier',
    fontSize: 14,
    fontWeight: '700',
    color: TERMINAL_RED,
    textAlign: 'center',
    marginBottom: 16,
  },
  clearanceText: {
    fontFamily: 'Courier',
    fontSize: 14,
    color: TERMINAL_RED,
    marginBottom: 4,
  },
  clearanceValue: {
    fontWeight: '700',
  },
  upgradeSection: {
    marginBottom: 20,
  },
  upgradeTitle: {
    fontFamily: 'Courier',
    fontSize: 14,
    fontWeight: '700',
    color: TERMINAL_RED,
    marginBottom: 12,
  },
  upgradeItem: {
    fontFamily: 'Courier',
    fontSize: 13,
    color: TERMINAL_RED,
    marginBottom: 6,
  },
  protocolSeparator: {
    height: 1,
    backgroundColor: 'rgba(255, 0, 0, 0.3)',
    marginVertical: 16,
  },
  protocolsTitle: {
    fontFamily: 'Courier',
    fontSize: 14,
    fontWeight: '700',
    color: TERMINAL_RED,
    marginBottom: 8,
  },
  protocolItem: {
    fontFamily: 'Courier',
    fontSize: 12,
    color: TERMINAL_RED,
    marginBottom: 4,
    opacity: 0.8,
  },
  clearanceSection: {
    marginBottom: 20,
  },
  clearanceSectionTitle: {
    fontFamily: 'Courier',
    fontSize: 14,
    fontWeight: '700',
    color: TERMINAL_RED,
    marginBottom: 12,
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: TERMINAL_RED,
    borderRadius: 8,
    padding: 20,
    backgroundColor: BACKGROUND,
    marginBottom: 12,
  },
  toggleCardActive: {
    shadowColor: TERMINAL_RED,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  toggleTitle: {
    fontFamily: 'Courier',
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  toggleSubtitle: {
    fontFamily: 'Courier',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  pricingSection: {
    marginTop: 0,
  },
  returnButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  returnText: {
    fontFamily: 'Courier',
    fontSize: 14,
    fontWeight: '700',
    color: TERMINAL_RED,
    textDecorationLine: 'underline',
  },
});
