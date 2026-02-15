import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useChatStore, PerformanceMode } from '../state/rootStore';
import { HUSH_THEMES, CLASSIFIED_THEMES, DISCRETION_THEMES } from '../themes/themes';

interface ModelDownloadErrorModalProps {
  visible: boolean;
  mode: PerformanceMode | null;
  error: 'network_timeout' | 'storage_full' | 'corrupted' | 'interrupted' | 'unknown' | null;
  onRetry: () => void;
  onDismiss: () => void;
}

export function ModelDownloadErrorModal({
  visible,
  mode,
  error,
  onRetry,
  onDismiss,
}: ModelDownloadErrorModalProps) {
  // PERFORMANCE FIX: Use selective subscriptions instead of destructuring entire store
  // Destructuring subscribes to EVERY state change including streamingText (50-200 updates/response)
  const hushTheme = useChatStore((state) => state.hushTheme);
  const classifiedTheme = useChatStore((state) => state.classifiedTheme);
  const discretionTheme = useChatStore((state) => state.discretionTheme);
  const flavor = useChatStore((state) => state.flavor);

  const getTheme = () => {
    if (flavor === 'CLASSIFIED') {
      return CLASSIFIED_THEMES[classifiedTheme] || CLASSIFIED_THEMES.TERMINAL_RED;
    } else if (flavor === 'DISCRETION') {
      return DISCRETION_THEMES[discretionTheme] || DISCRETION_THEMES.PLATINUM;
    }
    return HUSH_THEMES[hushTheme] || HUSH_THEMES.DEFAULT;
  };

  const theme = getTheme();
  const isTerminal = flavor === 'CLASSIFIED';

  if (!mode || !error) return null;

  const modeName = mode === 'efficient' ? 'Efficient' : mode === 'balanced' ? 'Balanced' : 'Quality';
  const modeSize = mode === 'efficient' ? '1.7GB' : mode === 'balanced' ? '2GB' : '6GB';

  const getErrorDetails = () => {
    switch (error) {
      case 'network_timeout':
        return {
          icon: 'cloud-offline' as const,
          title: isTerminal ? 'DOWNLOAD_TIMEOUT' : 'Download Timeout',
          message: isTerminal
            ? `${modeName.toUpperCase()}_MODE_DOWNLOAD_TIMEOUT_CHECK_CONNECTION_AND_RETRY`
            : `The ${modeName} mode download timed out. Check your internet connection and try again.`,
          actionLabel: isTerminal ? 'RETRY_DOWNLOAD' : 'Retry Download',
        };
      case 'storage_full':
        return {
          icon: 'save-outline' as const,
          title: isTerminal ? 'INSUFFICIENT_STORAGE' : 'Storage Full',
          message: isTerminal
            ? `INSUFFICIENT_SPACE_FOR_${modeName.toUpperCase()}_MODE_(${modeSize}_REQUIRED)_FREE_SPACE_AND_RETRY`
            : `Not enough space to download ${modeName} mode (${modeSize} required). Free up space and try again.`,
          actionLabel: isTerminal ? 'OPEN_STORAGE_MANAGEMENT' : 'Go to Storage',
        };
      case 'corrupted':
        return {
          icon: 'alert-circle' as const,
          title: isTerminal ? 'DOWNLOAD_CORRUPTED' : 'Download Corrupted',
          message: isTerminal
            ? `${modeName.toUpperCase()}_MODE_DOWNLOAD_CORRUPTED_RETRY_REQUIRED`
            : `The ${modeName} mode download was corrupted. Please retry the download.`,
          actionLabel: isTerminal ? 'RETRY_DOWNLOAD' : 'Retry Download',
        };
      case 'interrupted':
        return {
          icon: 'pause-circle' as const,
          title: isTerminal ? 'DOWNLOAD_INTERRUPTED' : 'Download Interrupted',
          message: isTerminal
            ? `${modeName.toUpperCase()}_MODE_DOWNLOAD_INTERRUPTED_APP_BACKGROUNDED_OR_NETWORK_LOST`
            : `The ${modeName} mode download was interrupted. This can happen if the app was backgrounded or airplane mode was enabled.`,
          actionLabel: isTerminal ? 'RETRY_DOWNLOAD' : 'Retry Download',
        };
      default:
        return {
          icon: 'warning' as const,
          title: isTerminal ? 'DOWNLOAD_FAILED' : 'Download Failed',
          message: isTerminal
            ? `${modeName.toUpperCase()}_MODE_DOWNLOAD_FAILED_RETRY_REQUIRED`
            : `Failed to download ${modeName} mode. Please try again.`,
          actionLabel: isTerminal ? 'RETRY_DOWNLOAD' : 'Retry Download',
        };
    }
  };

  const getFallbackMessage = () => {
    if (isTerminal) {
      return 'EFFICIENT_MODE_REMAINS_OPERATIONAL';
    } else if (flavor === 'DISCRETION') {
      return 'Efficient mode continues to serve you reliably.';
    } else {
      return 'Efficient mode remains available for uninterrupted conversations.';
    }
  };

  const details = getErrorDetails();

  const handleRetry = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRetry();
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
      accessibilityViewIsModal={true}
    >
      <View style={styles.overlay}>
        <View style={[
          styles.modal,
          {
            backgroundColor: theme.colors.background,
            borderColor: '#FF3B30',
          }
        ]}>
          {/* Error Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name={details.icon} size={64} color="#FF3B30" />
          </View>

          {/* Title */}
          <Text style={[
            styles.title,
            { color: theme.colors.text }
          ]}>
            {details.title}
          </Text>

          {/* Message */}
          <Text style={[
            styles.message,
            { color: theme.colors.subtext }
          ]}>
            {details.message}
          </Text>

          {/* Fallback Info */}
          <View style={[
            styles.infoBox,
            { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.primary }
          ]}>
            <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
            <Text style={[
              styles.infoText,
              { color: theme.colors.subtext, fontFamily: isTerminal ? 'Courier' : 'System' }
            ]}>
              {getFallbackMessage()}
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.secondaryButton,
                { borderColor: theme.colors.primary }
              ]}
              onPress={handleDismiss}
            >
              <Text style={[
                styles.buttonText,
                { color: theme.colors.primary }
              ]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.primaryButton,
                { backgroundColor: theme.colors.primary }
              ]}
              onPress={handleRetry}
            >
              <Text style={[
                styles.buttonText,
                { color: '#000' }
              ]}>
                {details.actionLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 24,
    maxWidth: 400,
    width: '100%',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 20,
  },
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {},
  secondaryButton: {
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
