/**
 * AISettings
 *
 * Handles AI, Performance Modes, Conversation Memory, and Advanced Performance screens.
 * Includes model download management with progress tracking, resume logic, and cleanup.
 * Storage information is displayed in Performance Modes footer (cross-platform).
 *
 * Phase 4 of P1.4 SettingsModal refactor.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Device from 'expo-device';
import * as IntentLauncher from 'expo-intent-launcher';
import { useChatStore } from '../../state/rootStore';
import type { AppFlavor } from '../../state/types';
import { SettingsSubHeader } from './shared/SettingsSubHeader';
import { SettingsNavRow } from './shared/SettingsNavRow';
import type { SettingsTheme } from '../../themes/settingsThemeEngine';
import { downloadModel, deleteModel, cancelDownload, hasActiveDownload } from '../../engine/LocalAI';
import { getBalancedWarning, getQualityWarning, canDownloadQuality } from '../../utils/deviceCapabilities';
import type { AIScreen } from './shared/types';
import { estimateConversationTokens, getContextWindowSize, getContextUsagePercent } from '../../utils/tokenCounter';
import { useStorageSummary } from '../../hooks/useStorageSummary';

interface AISettingsProps {
  currentScreen: AIScreen;
  onNavigate: (screen: AIScreen) => void;
  onGoBack: () => void;
  onClose: () => void;
  effectiveMode: AppFlavor | 'BLOCKER';
  theme: SettingsTheme;
  isPro: boolean;
}

export const AISettings: React.FC<AISettingsProps> = ({
  currentScreen,
  onNavigate,
  onGoBack,
  onClose,
  effectiveMode,
  theme,
  isPro,
}) => {
  // SELECTIVE SUBSCRIPTIONS (~15 fields vs 35+)
  const activeMode = useChatStore((state) => state.activeMode);
  const setActiveMode = useChatStore((state) => state.setActiveMode);
  const modeDownloadState = useChatStore((state) => state.modeDownloadState);
  const currentlyDownloading = useChatStore((state) => state.currentlyDownloading);
  const modeDownloadProgress = useChatStore((state) => state.modeDownloadProgress);
  const downloadError = useChatStore((state) => state.downloadError);
  const startModeDownload = useChatStore((state) => state.startModeDownload);
  const completeModeDownload = useChatStore((state) => state.completeModeDownload);
  const failModeDownload = useChatStore((state) => state.failModeDownload);
  const deleteMode = useChatStore((state) => state.deleteMode);
  const cancelModeDownload = useChatStore((state) => state.cancelModeDownload);
  const setModeDownloadProgress = useChatStore((state) => state.setModeDownloadProgress);
  const subscriptionTier = useChatStore((state) => state.subscriptionTier);
  const classifiedTheme = useChatStore((state) => state.classifiedTheme);
  const triggerPaywall = useChatStore((state) => state.triggerPaywall);
  const messages = useChatStore((state) => state.messages);
  const responseStyleHush = useChatStore((state) => state.responseStyleHush);
  const responseStyleClassified = useChatStore((state) => state.responseStyleClassified);
  const responseStyleDiscretion = useChatStore((state) => state.responseStyleDiscretion);
  const clearHistory = useChatStore((state) => state.clearHistory);

  // Storage summary (always called at top level for React Hooks rules)
  const storage = useStorageSummary();

  // Download resume tracking
  const downloadResumeInProgress = useRef(false);

  // Resume downloads when returning to Performance Modes screen
  useEffect(() => {
    let cancelled = false;

    if (currentScreen === 'performanceModes' && currentlyDownloading && !downloadResumeInProgress.current) {
      // Check if there's an active download that needs to continue
      const resumeDownload = async () => {
        downloadResumeInProgress.current = true;
        try {
          const isActive = await hasActiveDownload(currentlyDownloading);
          if (cancelled) return; // Don't proceed if component unmounted

          if (isActive) {
            if (__DEV__) {
              console.log('[AISettings] Resuming download:', currentlyDownloading);
            }
            // Resume download with progress tracking
            await downloadModel(currentlyDownloading, (progress) => {
              if (!cancelled) {
                setModeDownloadProgress(Math.round(progress * 100));
              }
            });

            if (cancelled) return; // Don't update state if unmounted

            // Mark as completed
            completeModeDownload(currentlyDownloading);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        } catch (error) {
          if (__DEV__) {
            console.error('[AISettings] Resume download failed:', error);
          }
          if (!cancelled) {
            failModeDownload(currentlyDownloading, 'interrupted');
          }
        } finally {
          downloadResumeInProgress.current = false;
        }
      };

      resumeDownload();
    }

    return () => {
      cancelled = true; // Set cancellation flag on unmount or dependency change
    };
  }, [currentScreen, currentlyDownloading, completeModeDownload, failModeDownload, setModeDownloadProgress]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      downloadResumeInProgress.current = false;
    };
  }, []);

  // ============================================
  // HANDLERS
  // ============================================

  const handleDeleteModel = useCallback(async (mode: 'balanced' | 'quality', name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      theme.isTerminal ? 'DELETE_MODEL' : 'Delete Model',
      theme.isTerminal ? `REMOVE_${mode.toUpperCase()}_MODE_MODEL?` : `Delete ${name} model? You can re-download it later.`,
      [
        { text: theme.isTerminal ? 'CANCEL' : 'Cancel', style: 'cancel' },
        {
          text: theme.isTerminal ? 'DELETE' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete the model file
              await deleteModel(mode);

              // Update state
              deleteMode(mode);

              // Switch to efficient if deleting active mode
              if (activeMode === mode) {
                setActiveMode('efficient');
              }

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              if (__DEV__) {
                console.error('[AISettings] Delete failed:', error);
              }
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
          },
        },
      ]
    );
  }, [theme.isTerminal, deleteMode, activeMode, setActiveMode]);

  const handleDownloadModel = useCallback(async (mode: 'balanced' | 'quality') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Start download state
    startModeDownload(mode);

    try {
      // Download model with progress tracking
      await downloadModel(mode, (progress) => {
        setModeDownloadProgress(Math.round(progress * 100));
      });

      // Mark as completed
      completeModeDownload(mode);

      // Show success haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      if (__DEV__) {
        console.error('[AISettings] Download failed:', error);
      }

      // Determine error type
      const errorMessage = error instanceof Error ? error.message : String(error);
      let errorType: 'network_timeout' | 'storage_full' | 'corrupted' | 'interrupted' | 'unknown' = 'unknown';

      if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
        errorType = 'network_timeout';
      } else if (errorMessage.includes('storage') || errorMessage.includes('space')) {
        errorType = 'storage_full';
      } else if (errorMessage.includes('corrupt')) {
        errorType = 'corrupted';
      }

      failModeDownload(mode, errorType);

      // Show error haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [startModeDownload, setModeDownloadProgress, completeModeDownload, failModeDownload]);

  const handleCancelDownload = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Cancel the actual download
    if (currentlyDownloading) {
      await cancelDownload(currentlyDownloading);
    }
    // Clear UI state
    cancelModeDownload();
  }, [currentlyDownloading, cancelModeDownload]);

  // ============================================
  // SCREEN RENDERERS
  // ============================================

  const renderAIScreen = () => {
    const modeDisplay =
      activeMode === 'efficient' ? 'Efficient Mode' : activeMode === 'balanced' ? 'Balanced Mode' : 'Quality Mode';

    return (
      <View style={{ flex: 1 }}>
        <SettingsSubHeader
          title={theme.isTerminal ? 'AI_Configuration' : 'AI'}
          onBack={onGoBack}
          theme={theme}
        />
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.navSection}>
            <SettingsNavRow
              icon="speedometer"
              label={theme.isTerminal ? 'Performance_Modes' : 'Performance Modes'}
              sublabel={theme.isTerminal ? modeDisplay.toUpperCase().replace(/ /g, '_') : modeDisplay}
              onPress={() => onNavigate('performanceModes')}
              theme={theme}
              effectiveMode={effectiveMode}
              classifiedTheme={classifiedTheme}
            />
            <SettingsNavRow
              icon="library"
              label={theme.isTerminal ? 'Conversation_Memory' : 'Conversation Memory'}
              sublabel={theme.isTerminal ? 'CONTEXT_WINDOW' : 'How memory works'}
              onPress={() => onNavigate('conversationMemory')}
              theme={theme}
              effectiveMode={effectiveMode}
              classifiedTheme={classifiedTheme}
            />
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderPerformanceModesScreen = () => {
    const { balancedUpgradeOffered } = useChatStore.getState();

    const isBalancedDownloading = currentlyDownloading === 'balanced';
    const isQualityDownloading = currentlyDownloading === 'quality';

    // Get device model name
    const modelName = Device.modelName || 'Unknown Device';

    // Free user: iPhone 13+ eligible for Balanced (simplified check)
    const canUpgradeToBalanced = (modelName.includes('iPhone 13') ||
                                  modelName.includes('iPhone 14') ||
                                  modelName.includes('iPhone 15') ||
                                  modelName.includes('iPhone 16')) && !isPro;
    const showBalancedUpgrade =
      canUpgradeToBalanced && !balancedUpgradeOffered && modeDownloadState.balanced === 'not_downloaded';

    // Check if Quality mode is blocked (iPhone 14 Pro and earlier)
    // Requires iPhone 15 Pro+ (A17 chip, 8GB RAM) AND Pro subscription
    const isIPhone15ProOrNewer = modelName.includes('iPhone 15 Pro') || modelName.includes('iPhone 16');
    const qualityBlocked = !isPro || !isIPhone15ProOrNewer;
    const qualityBlockedReason = !isPro
      ? theme.isTerminal
        ? 'PRO_ONLY'
        : 'Pro Only'
      : theme.isTerminal
      ? 'REQUIRES_IPHONE_15_PRO_PLUS'
      : 'Requires iPhone 15 Pro+';

    // Helper to render a mode option card
    const renderModeOption = (
      mode: 'efficient' | 'balanced' | 'quality',
      icon: string,
      name: string,
      size: string,
      speed: string,
      quality: string,
      description: string,
      warning?: string,
      downloadBlocked?: boolean,
      blockedReason?: string
    ) => {
      const isActive = activeMode === mode;
      const downloadStatus = modeDownloadState[mode];
      const isDownloading = currentlyDownloading === mode;

      return (
        <TouchableOpacity
          key={mode}
          style={[
            styles.modeOptionCard,
            {
              backgroundColor: theme.card,
              borderWidth: isActive ? 2 : 0,
              borderColor: isActive ? theme.accent : 'transparent',
            },
          ]}
          onPress={() => {
            if (downloadStatus === 'downloaded' && !isDownloading) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setActiveMode(mode);
            }
          }}
          activeOpacity={downloadStatus === 'downloaded' ? 0.7 : 1}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Ionicons name={icon as any} size={22} color={theme.accent} />
            <Text
              style={[
                styles.modeOptionTitle,
                { color: theme.text, fontFamily: theme.fontBody, marginLeft: 10, flex: 1 },
              ]}
            >
              {name}
            </Text>
            <Ionicons
              name={isActive ? 'radio-button-on' : 'radio-button-off-outline'}
              size={22}
              color={isActive ? theme.accent : theme.subtext}
            />
          </View>

          <Text
            style={[
              styles.modeOptionSize,
              { color: theme.subtext, fontFamily: theme.fontBody, marginBottom: 8 },
            ]}
          >
            {size}
          </Text>

          <View style={{ flexDirection: 'row', gap: 16, marginBottom: 8 }}>
            <View>
              <Text
                style={[styles.modeOptionLabel, { color: theme.subtext, fontFamily: theme.fontBody }]}
              >
                {theme.isTerminal ? 'SPEED' : 'Speed'}
              </Text>
              <Text
                style={[styles.modeOptionStars, { color: theme.accent, fontFamily: theme.fontBody }]}
              >
                {speed}
              </Text>
            </View>
            <View>
              <Text
                style={[styles.modeOptionLabel, { color: theme.subtext, fontFamily: theme.fontBody }]}
              >
                {theme.isTerminal ? 'QUALITY' : 'Quality'}
              </Text>
              <Text
                style={[styles.modeOptionStars, { color: theme.accent, fontFamily: theme.fontBody }]}
              >
                {quality}
              </Text>
            </View>
          </View>

          <Text
            style={[
              styles.modeOptionDesc,
              { color: theme.subtext, fontFamily: theme.fontBody, marginBottom: 12 },
            ]}
          >
            {description}
          </Text>

          {warning && (
            <Text
              style={[
                styles.modeOptionWarning,
                { color: theme.subtext, fontFamily: theme.fontBody, fontSize: 13, marginBottom: 12 },
              ]}
            >
              ⚠️ {warning}
            </Text>
          )}

          {/* Download/Delete button */}
          {downloadStatus === 'downloaded' && mode !== 'efficient' && (
            <TouchableOpacity
              style={[styles.modeActionBtn, { borderWidth: 1, borderColor: theme.divider }]}
              onPress={() => handleDeleteModel(mode, name)}
            >
              <Text style={[styles.modeActionBtnText, { color: theme.danger, fontFamily: theme.fontBody }]}>
                {theme.isTerminal ? 'DELETE_MODEL' : 'Delete'}
              </Text>
            </TouchableOpacity>
          )}

          {downloadStatus === 'not_downloaded' && mode !== 'efficient' && !isDownloading && (
            downloadBlocked ? (
              <View style={[styles.modeActionBtn, { backgroundColor: theme.divider, opacity: 0.5 }]}>
                <Text
                  style={[
                    styles.modeActionBtnText,
                    { color: theme.subtext, fontFamily: theme.fontBody },
                  ]}
                >
                  {blockedReason || (theme.isTerminal ? 'UNAVAILABLE' : 'Unavailable')}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.modeActionBtn, { backgroundColor: theme.accent }]}
                onPress={() => handleDownloadModel(mode)}
              >
                <Text style={[styles.modeActionBtnText, { color: '#000', fontFamily: theme.fontBody }]}>
                  {theme.isTerminal ? 'DOWNLOAD' : 'Download'} {size}
                </Text>
              </TouchableOpacity>
            )
          )}

          {isDownloading && (
            <View style={{ marginTop: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={[styles.downloadingText, { color: theme.text, fontFamily: theme.fontBody }]}>
                  {theme.isTerminal ? 'DOWNLOADING' : 'Downloading'}... {modeDownloadProgress}%
                </Text>
                <Text
                  style={[styles.downloadingText, { color: theme.subtext, fontFamily: theme.fontBody }]}
                >
                  {((parseFloat(size) * modeDownloadProgress) / 100).toFixed(1)}GB / {size}
                </Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: theme.divider }]}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${modeDownloadProgress}%`, backgroundColor: theme.accent },
                  ]}
                />
              </View>
              <TouchableOpacity
                style={[
                  styles.modeActionBtn,
                  { borderWidth: 1, borderColor: theme.divider, marginTop: 12 },
                ]}
                onPress={handleCancelDownload}
              >
                <Text style={[styles.modeActionBtnText, { color: theme.text, fontFamily: theme.fontBody }]}>
                  {theme.isTerminal ? 'CANCEL' : 'Cancel Download'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      );
    };

    return (
      <View style={{ flex: 1 }}>
        <SettingsSubHeader
          title={theme.isTerminal ? 'Performance_Modes' : 'Performance Modes'}
          onBack={onGoBack}
          theme={theme}
        />
        <ScrollView contentContainerStyle={styles.content}>
          {/* Device display */}
          {modelName && (
            <View
              style={[
                styles.deviceDisplay,
                { backgroundColor: theme.card, marginBottom: 16, padding: 12, borderRadius: 8 },
              ]}
            >
              <Text
                style={[
                  styles.deviceDisplayText,
                  { color: theme.subtext, fontFamily: theme.fontBody, fontSize: 14 },
                ]}
              >
                {theme.isTerminal ? 'YOUR_DEVICE' : 'Your device'}: {modelName}
              </Text>
            </View>
          )}

          {/* Free user: Simple current mode display */}
          {!isPro && (
            <>
              <View style={[styles.modeCard, { backgroundColor: theme.card }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons
                    name={activeMode === 'balanced' ? 'swap-horizontal-outline' : 'flash'}
                    size={24}
                    color={theme.accent}
                  />
                  <Text
                    style={[
                      styles.modeCardTitle,
                      { color: theme.text, fontFamily: theme.fontBody, marginLeft: 10 },
                    ]}
                  >
                    {activeMode === 'balanced' ? 'Balanced Mode' : 'Efficient Mode'}
                  </Text>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={theme.accent}
                    style={{ marginLeft: 'auto' }}
                  />
                </View>
                <Text
                  style={[
                    styles.modeCardSubtext,
                    { color: theme.subtext, fontFamily: theme.fontBody, marginTop: 8 },
                  ]}
                >
                  {theme.isTerminal
                    ? 'AUTO_OPTIMIZED_FOR_DEVICE'
                    : 'Automatically optimized for your device'}
                </Text>
              </View>

              {/* Free user: Balanced upgrade prompt (iPhone 13+) */}
              {showBalancedUpgrade && (
                <>
                  <View style={[styles.separator, { backgroundColor: theme.divider, marginVertical: 20 }]} />
                  <Text
                    style={[styles.upgradePrompt, { color: theme.text, fontFamily: theme.fontBody }]}
                  >
                    Your {modelName || 'device'} can run Balanced mode for better
                    responses (3GB download)
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                    <TouchableOpacity
                      style={[styles.upgradeBtn, { backgroundColor: theme.accent, flex: 1 }]}
                      onPress={async () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        // TODO: Start download
                        useChatStore.getState().setBalancedUpgradeOffered(true);
                      }}
                    >
                      <Text style={[styles.upgradeBtnText, { color: '#000' }]}>
                        Download on Wi-Fi
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.upgradeBtn,
                        { borderWidth: 1, borderColor: theme.divider, flex: 1 },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        useChatStore.getState().setBalancedUpgradeDeclined(true);
                      }}
                    >
                      <Text style={[styles.upgradeBtnText, { color: theme.text }]}>Not Now</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </>
          )}

          {/* Pro user: All 3 mode options */}
          {isPro && (
            <>
              {renderModeOption(
                'efficient',
                'flash',
                theme.isTerminal ? 'EFFICIENT_MODE' : 'Efficient Mode',
                '1.7GB (bundled)',
                '★★★☆☆',
                '★★★☆☆',
                theme.isTerminal
                  ? 'Fastest speed, smallest size, universal compatibility'
                  : 'Fastest speed, smallest size, universal compatibility'
              )}

              {renderModeOption(
                'balanced',
                'swap-horizontal-outline',
                theme.isTerminal ? 'BALANCED_MODE' : 'Balanced Mode',
                '2GB',
                '★★★★☆',
                '★★★★☆',
                theme.isTerminal
                  ? 'Better quality responses, recommended for newer devices'
                  : 'Better quality responses, recommended for newer devices',
                getBalancedWarning(modelName) || undefined
              )}

              {renderModeOption(
                'quality',
                'trophy',
                theme.isTerminal ? 'QUALITY_MODE' : 'Quality Mode',
                '6GB',
                '★★☆☆☆',
                '★★★★★',
                theme.isTerminal
                  ? 'Highest intelligence, requires powerful hardware'
                  : 'Highest intelligence, requires powerful hardware',
                getQualityWarning(modelName) || undefined,
                qualityBlocked,
                qualityBlockedReason
              )}

              <View style={[styles.separator, { backgroundColor: theme.divider, marginVertical: 20 }]} />

              <Text
                style={[
                  styles.infoText,
                  { color: theme.subtext, fontFamily: theme.fontBody, lineHeight: 20 },
                ]}
              >
                {theme.isTerminal
                  ? 'Modes run entirely on your device. You can delete any mode to free up storage.'
                  : 'Modes run entirely on your device. You can delete any mode to free up storage.'}
              </Text>

              <TouchableOpacity
                style={[
                  styles.upgradeBtn,
                  { borderWidth: 1, borderColor: theme.divider, marginTop: 16 },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onNavigate('advancedPerformance');
                }}
              >
                <Text
                  style={[
                    styles.upgradeBtnText,
                    { color: theme.text, fontFamily: theme.fontBody },
                  ]}
                >
                  {theme.isTerminal ? 'ADVANCED_SETTINGS' : 'Advanced Settings'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* Free user: Upgrade to Pro prompt */}
          {!isPro && (
            <>
              <View style={[styles.separator, { backgroundColor: theme.divider, marginVertical: 20 }]} />
              <Text style={[styles.upgradePrompt, { color: theme.text, fontFamily: theme.fontBody }]}>
                Upgrade to Pro to manually choose modes and access Quality mode.
              </Text>
              <TouchableOpacity
                style={[styles.upgradeBtn, { backgroundColor: theme.accent, marginTop: 16 }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  // Close Settings first, then show paywall
                  onClose();
                  setTimeout(() => {
                    // CTA button - bypasses frequency cap (high intent action)
                    // Don't set paywallReason - prevents adding to dismissed list
                    useChatStore.setState({
                      showPaywall: true,
                      paywallReason: null,
                    });
                  }, 400);
                }}
              >
                <Text style={[styles.upgradeBtnText, { color: '#000' }]}>Upgrade to Pro</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Storage Summary Footer */}
          <View style={[styles.separator, { backgroundColor: theme.divider, marginVertical: 20 }]} />
          <View style={[styles.infoSection, { paddingTop: 4 }]}>
            <Text style={[styles.sectionHeader, { color: theme.text, fontFamily: theme.fontBody, fontSize: 16, fontWeight: '600', marginBottom: 12 }]}>
              {theme.isTerminal ? 'STORAGE' : 'Storage'}
            </Text>

            {storage.loading ? (
              <Text style={[styles.infoText, { color: theme.subtext, fontFamily: theme.fontBody }]}>
                {theme.isTerminal ? 'LOADING_STORAGE_INFO' : 'Loading storage info'}...
              </Text>
            ) : (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={[styles.infoText, { color: theme.subtext, fontFamily: theme.fontBody }]}>
                    {theme.isTerminal ? 'AI_MODELS' : 'AI Models'}:
                  </Text>
                  <Text style={[styles.infoText, { color: theme.text, fontFamily: theme.fontBody, fontWeight: '600' }]}>
                    {storage.modelsUsedFormatted}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                  <Text style={[styles.infoText, { color: theme.subtext, fontFamily: theme.fontBody }]}>
                    {theme.isTerminal ? 'DEVICE_FREE' : 'Device Free'}:
                  </Text>
                  <Text style={[styles.infoText, { color: theme.text, fontFamily: theme.fontBody, fontWeight: '600' }]}>
                    {storage.deviceFreeFormatted}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.upgradeBtn,
                    { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.divider, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
                  ]}
                  onPress={async () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

                    try {
                      if (Platform.OS === 'ios') {
                        await Linking.openSettings();
                      } else {
                        // Android
                        await IntentLauncher.startActivityAsync(
                          IntentLauncher.ActivityAction.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION
                        );
                      }
                    } catch (error) {
                      if (__DEV__) {
                        console.error('Failed to open storage settings:', error);
                      }
                      Alert.alert(
                        theme.isTerminal ? 'ERROR' : 'Error',
                        theme.isTerminal
                          ? 'FAILED_TO_OPEN_SETTINGS'
                          : 'Failed to open storage settings'
                      );
                    }
                  }}
                >
                  <Ionicons name="settings-outline" size={18} color={theme.accent} />
                  <Text style={[styles.upgradeBtnText, { color: theme.text, fontFamily: theme.fontBody }]}>
                    {theme.isTerminal ? 'OPEN_STORAGE_SETTINGS' : 'Open Storage Settings'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderConversationMemoryScreen = () => (
    <View style={{ flex: 1 }}>
      <SettingsSubHeader
        title={theme.isTerminal ? 'Conversation_Memory' : 'Conversation Memory'}
        onBack={onGoBack}
        theme={theme}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {/* PRIVACY FIRST: Highlight local-only storage */}
        <View style={[styles.memoryCard, { backgroundColor: theme.card, marginTop: 0 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Ionicons
              name="shield-checkmark"
              size={20}
              color={theme.accent}
              style={{ marginRight: 10, marginTop: 2 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontFamily: theme.fontBody, fontWeight: '600', marginBottom: 4 }}>
                {theme.isTerminal ? 'PRIVACY_FIRST' : 'Privacy First'}
              </Text>
              <Text style={{ color: theme.subtext, fontFamily: theme.fontBody, fontSize: 14, lineHeight: 20 }}>
                {theme.isTerminal
                  ? 'MESSAGES_AES256_ENCRYPTED_LOCALLY_NEVER_CLOUD_FULL_USER_CONTROL'
                  : 'Messages encrypted (AES-256) on your device. Never sent to cloud. Clear history anytime or use Panic Wipe for instant deletion.'}
              </Text>
            </View>
          </View>
        </View>

        {/* CURRENT MEMORY USAGE (Phase 7 Part 2) */}
        {(() => {
          // Calculate current conversation memory usage
          // Determine active response style based on current flavor
          const currentResponseStyle =
            effectiveMode === 'HUSH'
              ? responseStyleHush
              : effectiveMode === 'CLASSIFIED'
              ? responseStyleClassified
              : effectiveMode === 'DISCRETION'
              ? responseStyleDiscretion
              : 'quick'; // Fallback for BLOCKER mode

          const systemPromptLength =
            currentResponseStyle === 'quick' ||
            currentResponseStyle === 'operator' ||
            currentResponseStyle === 'warm'
              ? 'short'
              : 'long';
          const currentTokens = estimateConversationTokens(messages, systemPromptLength);
          const contextWindow = getContextWindowSize(activeMode);
          const usagePercent = getContextUsagePercent(currentTokens, activeMode);
          const messageCount = messages.length;
          const userMessageCount = messages.filter(m => m.role === 'user').length;

          // Determine progress bar color based on usage
          let progressColor = theme.accent;
          if (usagePercent >= 95) progressColor = '#FF0000'; // Red
          else if (usagePercent >= 80) progressColor = '#FF8800'; // Orange
          else if (usagePercent >= 60) progressColor = '#FFBB00'; // Yellow

          return (
            <View style={[styles.memoryCard, { backgroundColor: theme.card, marginTop: 20, borderLeftWidth: 3, borderLeftColor: progressColor }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="stats-chart" size={20} color={progressColor} />
                  <Text style={[styles.memoryTitle, { color: theme.text, fontFamily: theme.fontBody, marginLeft: 8 }]}>
                    {theme.isTerminal ? 'MEMORY_USAGE' : 'Current Memory Usage'}
                  </Text>
                </View>
                <Text style={{ color: theme.subtext, fontFamily: theme.fontBody, fontSize: 13 }}>
                  {usagePercent.toFixed(0)}%
                </Text>
              </View>

              {/* Progress Bar */}
              <View style={{ height: 8, backgroundColor: theme.divider, borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
                <View style={{ height: '100%', width: `${Math.min(100, usagePercent)}%`, backgroundColor: progressColor, borderRadius: 4 }} />
              </View>

              {/* Stats */}
              <Text style={[styles.memorySubtext, { color: theme.subtext, fontFamily: theme.fontBody }]}>
                {theme.isTerminal
                  ? `TOKENS: ${currentTokens.toLocaleString()} / ${contextWindow.toLocaleString()} • MESSAGES: ${messageCount} (${userMessageCount} USER)`
                  : `${currentTokens.toLocaleString()} / ${contextWindow.toLocaleString()} tokens • ${messageCount} messages (${userMessageCount} exchanges)`}
              </Text>

              {/* Tier-specific messaging */}
              {subscriptionTier === 'FREE' ? (
                <>
                  <View style={{ marginTop: 12, padding: 10, backgroundColor: theme.bg, borderRadius: 8 }}>
                    <Text style={{ color: theme.subtext, fontFamily: theme.fontBody, fontSize: 13, lineHeight: 18 }}>
                      {theme.isTerminal
                        ? 'FREE_TIER_SLIDING_WINDOW_AI_FORGETS_OLD_MESSAGES_AS_NEW_ONES_ARRIVE'
                        : 'AI forgets old messages as new ones come in (sliding window). Upgrade to Pro for extended memory.'}
                    </Text>
                  </View>
                  {/* Paywall CTA for Free users */}
                  <TouchableOpacity
                    style={{
                      marginTop: 12,
                      padding: 12,
                      backgroundColor: theme.accent,
                      borderRadius: 8,
                    }}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      triggerPaywall('feature_locked_response_style');
                      onClose();
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: '#FFFFFF', fontFamily: theme.fontBody, fontSize: 14, fontWeight: '600' }}>
                        {theme.isTerminal ? 'UPGRADE_TO_PRO' : 'Upgrade to Pro'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {usagePercent >= 80 ? (
                    <View style={{ marginTop: 12, padding: 10, backgroundColor: theme.bg, borderRadius: 8 }}>
                      <Text style={{ color: theme.subtext, fontFamily: theme.fontBody, fontSize: 13, lineHeight: 18 }}>
                        {theme.isTerminal
                          ? 'PRO_AUTO_SUMMARIZATION_TRIGGERS_AT_80_PERCENT_OLDER_MESSAGES_COMPRESSED'
                          : '✨ Pro: Approaching capacity. Older messages will be automatically summarized to maintain performance.'}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ marginTop: 12, padding: 10, backgroundColor: theme.bg, borderRadius: 8 }}>
                      <Text style={{ color: theme.subtext, fontFamily: theme.fontBody, fontSize: 13, lineHeight: 18 }}>
                        {theme.isTerminal
                          ? 'PRO_FULL_CONTEXT_AVAILABLE_AUTO_SUMMARIZATION_AT_80_PERCENT'
                          : '✨ Pro: Full context available. Auto-summarization triggers at 80% capacity.'}
                      </Text>
                    </View>
                  )}

                  {/* Manual Archive Button (Pro only) */}
                  {messageCount > 0 && (
                    <TouchableOpacity
                      style={{
                        marginTop: 12,
                        padding: 12,
                        backgroundColor: theme.bg,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: theme.divider,
                      }}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        Alert.alert(
                          theme.isTerminal ? 'CLEAR_HISTORY' : 'Clear Conversation',
                          theme.isTerminal
                            ? 'DELETE_ALL_MESSAGES_PERMANENT_CANNOT_UNDO'
                            : 'This will permanently delete all messages in this conversation. This cannot be undone.',
                          [
                            { text: theme.isTerminal ? 'CANCEL' : 'Cancel', style: 'cancel' },
                            {
                              text: theme.isTerminal ? 'DELETE' : 'Clear History',
                              style: 'destructive',
                              onPress: () => {
                                clearHistory();
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                              },
                            },
                          ]
                        );
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="trash-outline" size={18} color={theme.subtext} />
                        <Text style={{ color: theme.subtext, fontFamily: theme.fontBody, fontSize: 14, marginLeft: 8 }}>
                          {theme.isTerminal ? 'CLEAR_HISTORY' : 'Clear Conversation History'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          );
        })()}

        <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: theme.fontBody, marginTop: 24 }]}>
          {theme.isTerminal ? 'HOW_AI_MEMORY_WORKS' : 'How AI Memory Works'}
        </Text>

        {/* Efficient Mode */}
        <View style={[styles.memoryCard, { backgroundColor: theme.card, marginTop: 20 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="flash" size={20} color={theme.accent} />
            <Text
              style={[
                styles.memoryTitle,
                { color: theme.text, fontFamily: theme.fontBody, marginLeft: 8 },
              ]}
            >
              Efficient Mode
            </Text>
          </View>
          <Text
            style={[
              styles.memorySubtext,
              { color: theme.subtext, fontFamily: theme.fontBody, marginTop: 4 },
            ]}
          >
            Context: 8K tokens
          </Text>
          <Text
            style={[
              styles.memoryDesc,
              { color: theme.subtext, fontFamily: theme.fontBody, marginTop: 4 },
            ]}
          >
            {subscriptionTier === 'FREE'
              ? 'Free: Limited context (20% of window) • Best for quick questions'
              : 'Pro: Extended context (80% of window) • Best for quick questions'}
          </Text>
        </View>

        {/* Balanced Mode */}
        <View style={[styles.memoryCard, { backgroundColor: theme.card, marginTop: 12 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="swap-horizontal-outline" size={20} color={theme.accent} />
            <Text
              style={[
                styles.memoryTitle,
                { color: theme.text, fontFamily: theme.fontBody, marginLeft: 8 },
              ]}
            >
              Balanced Mode {subscriptionTier === 'FREE' && '(Pro)'}
            </Text>
          </View>
          <Text
            style={[
              styles.memorySubtext,
              { color: theme.subtext, fontFamily: theme.fontBody, marginTop: 4 },
            ]}
          >
            Context: 8K tokens • Better AI model (3B)
          </Text>
          <Text
            style={[
              styles.memoryDesc,
              { color: theme.subtext, fontFamily: theme.fontBody, marginTop: 4 },
            ]}
          >
            {subscriptionTier === 'FREE'
              ? 'Pro-only: Extended context (80% of window) • Smarter responses than Efficient'
              : 'Pro: Extended context (80% of window) with summarization • Smarter responses than Efficient'}
          </Text>
        </View>

        {/* Quality Mode */}
        <View style={[styles.memoryCard, { backgroundColor: theme.card, marginTop: 12 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="trophy" size={20} color={theme.accent} />
            <Text
              style={[
                styles.memoryTitle,
                { color: theme.text, fontFamily: theme.fontBody, marginLeft: 8 },
              ]}
            >
              Quality Mode {subscriptionTier === 'FREE' && '(Pro)'}
            </Text>
          </View>
          <Text
            style={[
              styles.memorySubtext,
              { color: theme.subtext, fontFamily: theme.fontBody, marginTop: 4 },
            ]}
          >
            Context: 8K tokens • Best AI model (8B)
          </Text>
          <Text
            style={[
              styles.memoryDesc,
              { color: theme.subtext, fontFamily: theme.fontBody, marginTop: 4 },
            ]}
          >
            {subscriptionTier === 'FREE'
              ? 'Pro-only: Extended context (80% of window) • Highest intelligence'
              : 'Pro: Extended context (80% of window) with summarization • Highest intelligence'}
          </Text>
        </View>

        <View style={[styles.separator, { backgroundColor: theme.divider, marginVertical: 24 }]} />

        <Text
          style={[
            styles.sectionTitle,
            { color: theme.text, fontFamily: theme.fontBody, fontSize: 16, fontWeight: '600' },
          ]}
        >
          {theme.isTerminal ? 'MEMORY_EXPLAINED' : 'Memory Explained'}
        </Text>
        <Text
          style={[
            styles.explainerText,
            { color: theme.subtext, fontFamily: theme.fontBody, marginTop: 12, lineHeight: 22 },
          ]}
        >
          <Text style={{ fontWeight: '600' }}>Free tier:</Text> AI uses 20% of the context window for conversation history. Recent exchanges are prioritized; older messages slide out as new ones arrive (sliding window). This keeps the app fast and lightweight.
          {'\n\n'}
          <Text style={{ fontWeight: '600' }}>Pro tier:</Text> AI uses 80% of the context window for conversation history (4x more than Free). When context reaches 80% capacity, older messages are automatically summarized (not deleted) to maintain efficiency.
          {'\n\n'}
          <Text style={{ fontWeight: '600' }}>Your control:</Text> All messages are AES-256 encrypted on your device until you clear them. Use "Clear History" or Panic Wipe to securely delete conversations.
        </Text>

        <View
          style={{
            backgroundColor: theme.card,
            marginTop: 20,
            padding: 16,
            borderRadius: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Ionicons
              name="information-circle"
              size={20}
              color={theme.accent}
              style={{ marginRight: 10, marginTop: 2 }}
            />
            <Text
              style={{
                color: theme.text,
                fontFamily: theme.fontBody,
                flex: 1,
                lineHeight: 20,
                fontSize: 14,
              }}
            >
              <Text style={{ fontWeight: '600' }}>Note: </Text>
              {theme.isTerminal
                ? 'CONTEXT_WINDOW_IS_MODEL_LIMIT_NOT_DEVICE_LIMIT'
                : 'Context window size is determined by the AI model architecture, not your device capabilities.'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );

  const renderAdvancedPerformanceScreen = () => (
    <View style={{ flex: 1 }}>
      <SettingsSubHeader
        title={theme.isTerminal ? 'Advanced_Settings' : 'Advanced Settings'}
        onBack={onGoBack}
        theme={theme}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: theme.fontBody }]}>
          {theme.isTerminal ? 'MULTI_MODEL_OPTIMIZATION' : 'Multi-Model Optimization'}
        </Text>
      </ScrollView>
    </View>
  );

  // ============================================
  // MAIN RENDER
  // ============================================

  if (currentScreen === 'ai') return renderAIScreen();
  if (currentScreen === 'performanceModes') return renderPerformanceModesScreen();
  if (currentScreen === 'conversationMemory') return renderConversationMemoryScreen();
  if (currentScreen === 'advancedPerformance') return renderAdvancedPerformanceScreen();

  return null;
};

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  navSection: { gap: 10 },

  // AI Index Screen
  sectionTitle: { fontSize: 18, fontWeight: '600' },

  // Performance Modes
  modeCard: { padding: 16, borderRadius: 12, marginBottom: 16 },
  modeCardTitle: { fontSize: 18, fontWeight: '600' },
  modeCardSubtext: { fontSize: 14 },
  separator: { height: 1 },
  upgradePrompt: { fontSize: 16, lineHeight: 22 },
  upgradeBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeBtnText: { fontSize: 16, fontWeight: '600' },

  // Pro Performance Modes
  modeOptionCard: { padding: 16, borderRadius: 12, marginBottom: 16 },
  modeOptionTitle: { fontSize: 17, fontWeight: '600' },
  modeOptionSize: { fontSize: 14 },
  modeOptionLabel: { fontSize: 12, marginBottom: 2 },
  modeOptionStars: { fontSize: 14 },
  modeOptionDesc: { fontSize: 14, lineHeight: 20 },
  modeOptionWarning: { fontSize: 13, fontStyle: 'italic' },
  modeActionBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeActionBtnText: { fontSize: 15, fontWeight: '600' },
  downloadingText: { fontSize: 14 },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  infoText: { fontSize: 14 },
  deviceDisplay: {},
  deviceDisplayText: {},

  // Conversation Memory
  memoryCard: { padding: 14, borderRadius: 12 },
  memoryTitle: { fontSize: 16, fontWeight: '600' },
  memorySubtext: { fontSize: 14 },
  memoryDesc: { fontSize: 13 },
  explainerText: { fontSize: 15 },
});
