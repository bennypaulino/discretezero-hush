// src/core/onboarding/ModelDownloadOnboarding.tsx
// Model download onboarding flow with skip option and background download support
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useChatStore } from '../state/rootStore';
import { useAppTheme } from '../hooks/useAppTheme';
import { validateDownloadRequirements, downloadModelInBackground } from '../engine/LocalAI';

// Screen types
type DownloadScreen =
  | 'welcome'
  | 'pre_check'
  | 'cellular_warning'
  | 'downloading'
  | 'error'
  | 'complete';

interface ModelDownloadOnboardingProps {
  visible: boolean;
  onComplete: () => void; // Called when download succeeds
  onSkip: () => void; // Called when user skips
  allowSkip: boolean; // Show skip button?
}

export function ModelDownloadOnboarding({
  visible,
  onComplete,
  onSkip,
  allowSkip,
}: ModelDownloadOnboardingProps) {
  const [screen, setScreen] = useState<DownloadScreen>('welcome');
  const [progress, setProgress] = useState(0); // 0-100
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  // Cancellation ref for async operations
  const cancelledRef = useRef(false);

  // Get active theme
  const theme = useAppTheme();

  // Reset state when modal becomes visible
  useEffect(() => {
    if (visible) {
      setScreen('welcome');
      setProgress(0);
      setErrorMessage(null);
      setValidationMessage(null);
    }
  }, [visible]);

  // Manage cancellation flag lifecycle
  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  // --- SCREEN HANDLERS ---

  const handleDownloadNow = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setScreen('pre_check');

    // Run pre-flight validation
    const validation = await validateDownloadRequirements();

    if (!validation.canProceed) {
      // Show error
      setErrorMessage(validation.message || 'Cannot proceed with download');
      setScreen('error');
      return;
    }

    // Check for cellular warning
    if (validation.warning === 'cellular_data' && validation.requiresConfirmation) {
      setValidationMessage(validation.message || '');
      setScreen('cellular_warning');
      return;
    }

    // All checks passed - start download
    startDownload();
  };

  const handleSkipNow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSkip();
  };

  const handleCellularConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setScreen('pre_check');
    // Start download
    startDownload();
  };

  const handleCellularDecline = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setScreen('welcome');
  };

  const startDownload = async () => {
    setScreen('downloading');

    try {
      await downloadModelInBackground('efficient', (prog) => {
        if (!cancelledRef.current) {
          setProgress(Math.round(prog * 100));
        }
      });

      if (cancelledRef.current) return;

      // Download complete
      setScreen('complete');

      // Mark as downloaded in store
      useChatStore.getState().completeModeDownload('efficient');
    } catch (error) {
      if (cancelledRef.current) return;
      setErrorMessage(error instanceof Error ? error.message : 'Download failed');
      setScreen('error');
    }
  };

  const handleRetry = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setErrorMessage(null);
    setScreen('welcome');
  };

  const handleComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete();
  };

  // --- SCREEN RENDERERS ---

  const renderWelcome = () => (
    <View style={styles.screen}>
      <Ionicons name="shield-checkmark" size={80} color={theme.colors.primary} />

      <Text style={[styles.title, { color: theme.colors.text }]}>Welcome to Hush</Text>

      <Text style={[styles.body, { color: theme.colors.subtext }]}>
        To protect your privacy, Hush runs{'\n'}
        AI entirely on your device.
      </Text>

      <View style={styles.bulletList}>
        <Text style={[styles.bullet, { color: theme.colors.subtext }]}>• 1.6 GB AI model</Text>
        <Text style={[styles.bullet, { color: theme.colors.subtext }]}>• ~3 minutes on Wi-Fi</Text>
        <Text style={[styles.bullet, { color: theme.colors.subtext }]}>• Works offline forever</Text>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
        onPress={handleDownloadNow}
        accessibilityLabel="Download AI model now"
        accessibilityRole="button"
        accessibilityHint="Downloads 1.6 GB AI model for offline use"
      >
        <Text style={styles.primaryButtonText}>Download Now</Text>
      </TouchableOpacity>

      {allowSkip && (
        <>
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
            onPress={handleSkipNow}
            accessibilityLabel="Skip download for now"
            accessibilityRole="button"
            accessibilityHint="Chat will be disabled until model is downloaded"
          >
            <Text style={[styles.secondaryButtonText, { color: theme.colors.subtext }]}>Skip for Now</Text>
          </TouchableOpacity>
          <Text style={[styles.skipHelper, { color: theme.colors.dimSubtext || theme.colors.subtext }]}>Chat will be disabled until downloaded</Text>
        </>
      )}
    </View>
  );

  const renderPreCheck = () => (
    <View style={styles.screen}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={[styles.title, { color: theme.colors.text }]}>Checking requirements...</Text>
      <Text style={[styles.body, { color: theme.colors.subtext }]}>
        ☐ Wi-Fi connection{'\n'}
        ☐ 2 GB free storage{'\n'}
        ☐ Battery level
      </Text>
    </View>
  );

  const renderCellularWarning = () => (
    <View style={styles.screen}>
      <Ionicons name="warning" size={80} color="#FF9800" />

      <Text style={[styles.title, { color: theme.colors.text }]}>Cellular Data Warning</Text>

      <Text style={[styles.body, { color: theme.colors.subtext }]}>
        This will download 1.6 GB using{'\n'}
        your cellular data plan.{'\n'}
        {'\n'}
        Estimated cost: Varies by carrier.{'\n'}
        We recommend using Wi-Fi.
      </Text>

      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
        onPress={handleCellularConfirm}
        accessibilityLabel="Use cellular data"
        accessibilityRole="button"
        accessibilityHint="Proceeds with download using cellular data"
      >
        <Text style={styles.primaryButtonText}>Use Cellular Anyway</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
        onPress={handleCellularDecline}
        accessibilityLabel="Wait for Wi-Fi"
        accessibilityRole="button"
        accessibilityHint="Returns to previous screen"
      >
        <Text style={[styles.secondaryButtonText, { color: theme.colors.subtext }]}>Wait for Wi-Fi</Text>
      </TouchableOpacity>
    </View>
  );

  const renderDownloading = () => {
    const bytesDownloaded = (progress / 100) * 1.6;

    return (
      <View style={styles.screen}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Setting Up Hush</Text>
        <Text style={[styles.subtitle, { color: theme.colors.subtext }]}>Downloading AI Model</Text>

        {/* Progress bar */}
        <View style={[styles.progressBarContainer, { backgroundColor: theme.colors.border }]}>
          <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: theme.colors.primary }]} />
        </View>

        <Text style={[styles.progressText, { color: theme.colors.text }]}>{progress}%</Text>

        <Text style={[styles.body, { color: theme.colors.subtext }]}>
          {bytesDownloaded.toFixed(1)} GB / 1.6 GB
        </Text>

        <Text style={[styles.backgroundNote, { color: theme.colors.dimSubtext || theme.colors.subtext }]}>
          You can background this app{'\n'}
          while downloading.
        </Text>
      </View>
    );
  };

  const renderError = () => (
    <View style={styles.screen}>
      <Ionicons name="close-circle" size={80} color="#F44336" />

      <Text style={[styles.title, { color: theme.colors.text }]}>Download Failed</Text>

      <Text style={[styles.body, { color: theme.colors.subtext }]}>
        {errorMessage || 'An unexpected error occurred'}
      </Text>

      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
        onPress={handleRetry}
        accessibilityLabel="Try download again"
        accessibilityRole="button"
        accessibilityHint="Attempts to download the AI model again"
      >
        <Text style={styles.primaryButtonText}>Try Again</Text>
      </TouchableOpacity>

      {allowSkip && (
        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
          onPress={handleSkipNow}
          accessibilityLabel="Skip download for now"
          accessibilityRole="button"
          accessibilityHint="Returns to app without downloading"
        >
          <Text style={[styles.secondaryButtonText, { color: theme.colors.subtext }]}>Skip for Now</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderComplete = () => (
    <View style={styles.screen}>
      <Ionicons name="checkmark-circle" size={80} color={theme.colors.primary} />

      <Text style={[styles.title, { color: theme.colors.text }]}>✅ Setup Complete</Text>

      <Text style={[styles.body, { color: theme.colors.subtext }]}>
        Your AI is ready and will work{'\n'}
        completely offline.{'\n'}
        {'\n'}
        Next, let's verify it works.
      </Text>

      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
        onPress={handleComplete}
        accessibilityLabel="Continue to app"
        accessibilityRole="button"
        accessibilityHint="Proceeds to privacy onboarding"
      >
        <Text style={styles.primaryButtonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );

  // --- MAIN RENDER ---

  const renderCurrentScreen = () => {
    switch (screen) {
      case 'welcome':
        return renderWelcome();
      case 'pre_check':
        return renderPreCheck();
      case 'cellular_warning':
        return renderCellularWarning();
      case 'downloading':
        return renderDownloading();
      case 'error':
        return renderError();
      case 'complete':
        return renderComplete();
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={() => {
        // Cannot dismiss during download
        if (screen !== 'downloading') {
          handleSkipNow();
        }
      }}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.colors.cardBg }]}>{renderCurrentScreen()}</View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000000', // Fully opaque black
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  screen: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '400',
    color: '#A0A0A0',
    marginBottom: 24,
    textAlign: 'center',
  },
  body: {
    fontSize: 16,
    color: '#A0A0A0',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  bulletList: {
    alignSelf: 'stretch',
    marginBottom: 32,
  },
  bullet: {
    fontSize: 15,
    color: '#A0A0A0',
    marginBottom: 8,
    paddingLeft: 16,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#00BFA5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3A3A3C',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '400',
    color: '#A0A0A0',
  },
  skipHelper: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 4,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#3A3A3C',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 16,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00BFA5',
  },
  progressText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  backgroundNote: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
});
