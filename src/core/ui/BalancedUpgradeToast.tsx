import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useChatStore } from '../state/rootStore';
import * as Device from 'expo-device';

interface BalancedUpgradeToastProps {
  visible: boolean;
  onUpgrade: () => void;
  onDismiss: () => void;
}

export function BalancedUpgradeToast({ visible, onUpgrade, onDismiss }: BalancedUpgradeToastProps) {
  const subscriptionTier = useChatStore((state) => state.subscriptionTier);
  const isPro = subscriptionTier !== 'FREE';

  // Get device model to determine which toast variant to show
  const deviceModel = Device.modelName || '';

  // Determine device category
  const isIPhone16Plus = deviceModel.includes('iPhone 16') || deviceModel.includes('iPhone 17');
  const isIPhone15Pro = deviceModel.includes('iPhone 15 Pro');
  const isIPhone13_14 =
    deviceModel.includes('iPhone 13') ||
    deviceModel.includes('iPhone 14');

  const handleUpgrade = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onUpgrade();
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
  };

  const handleChooseModel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // This will be handled by parent - open Settings → Performance Modes
    onUpgrade();
  };

  // iPhone 16+ Pro users: Show both Balanced + Quality
  if (isIPhone16Plus && isPro) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleDismiss}
        accessibilityViewIsModal={true}
      >
        <View style={styles.overlay}>
          <View style={styles.toast}>
            <View style={styles.header}>
              <Ionicons name="sparkles" size={24} color="#4CAF50" />
              <Text style={styles.title}>Your {deviceModel} supports Pro models</Text>
            </View>

            <View style={styles.optionContainer}>
              <View style={styles.option}>
                <Text style={styles.optionIcon}>⚖️</Text>
                <Text style={styles.optionTitle}>Balanced (2GB)</Text>
                <Text style={styles.optionDesc}>• Faster responses (32+ t/s)</Text>
                <Text style={styles.optionDesc}>• Extended memory</Text>
              </View>

              <View style={styles.option}>
                <Text style={styles.optionIcon}>🎯</Text>
                <Text style={styles.optionTitle}>Quality (6GB)</Text>
                <Text style={styles.optionDesc}>• Maximum intelligence (30 t/s)</Text>
                <Text style={styles.optionDesc}>• Highest capability</Text>
              </View>
            </View>

            <View style={styles.buttons}>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handleChooseModel}
              >
                <Text style={styles.primaryButtonText}>Choose Model</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={handleDismiss}
              >
                <Text style={styles.secondaryButtonText}>Not Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // iPhone 15 Pro (Pro users): Show Balanced only
  if (isIPhone15Pro && isPro) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleDismiss}
        accessibilityViewIsModal={true}
      >
        <View style={styles.overlay}>
          <View style={styles.toast}>
            <View style={styles.header}>
              <Ionicons name="sparkles" size={24} color="#4CAF50" />
              <Text style={styles.title}>Your {deviceModel} can run Balanced mode</Text>
            </View>

            <View style={styles.benefits}>
              <Text style={styles.benefit}>• Faster responses (30+ t/s vs 22 t/s)</Text>
              <Text style={styles.benefit}>• Smarter AI (3B model vs 2B)</Text>
              <Text style={styles.benefit}>• 2GB download</Text>
            </View>

            <View style={styles.buttons}>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handleUpgrade}
              >
                <Text style={styles.primaryButtonText}>Upgrade to Balanced</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={handleDismiss}
              >
                <Text style={styles.secondaryButtonText}>Not Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // iPhone 13-14: Show Balanced (Free or Pro)
  if (isIPhone13_14) {
    // Extract device number (e.g., "iPhone 13" from "iPhone 13 Pro")
    const deviceName = deviceModel.split(' ').slice(0, 2).join(' ');

    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleDismiss}
        accessibilityViewIsModal={true}
      >
        <View style={styles.overlay}>
          <View style={styles.toast}>
            <View style={styles.header}>
              <Ionicons name="sparkles" size={24} color="#4CAF50" />
              <Text style={styles.title}>Your {deviceName} can run Balanced mode</Text>
            </View>

            <View style={styles.benefits}>
              <Text style={styles.benefit}>• Faster responses (25+ t/s vs 18 t/s)</Text>
              <Text style={styles.benefit}>• Smarter AI (3B model vs 2B)</Text>
              <Text style={styles.benefit}>• 2GB download</Text>
            </View>

            <View style={styles.buttons}>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handleUpgrade}
              >
                <Text style={styles.primaryButtonText}>Upgrade to Balanced</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={handleDismiss}
              >
                <Text style={styles.secondaryButtonText}>Not Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Default: Don't show toast (iPhone 11/12 don't get proactive toast)
  return null;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  toast: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#4CAF50',
    padding: 24,
    maxWidth: 400,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  benefits: {
    marginBottom: 20,
  },
  benefit: {
    fontSize: 16,
    color: '#ccc',
    lineHeight: 24,
    marginBottom: 4,
  },
  optionContainer: {
    gap: 16,
    marginBottom: 20,
  },
  option: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  optionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  optionDesc: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
  },
  buttons: {
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ccc',
  },
});
