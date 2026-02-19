import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { useChatStore } from './src/core/state/rootStore';

import { HushScreen } from './src/apps/hush/HushScreen';
import { ClassifiedScreen } from './src/apps/classified/ClassifiedScreen';
import { DiscretionScreen } from './src/apps/discretion/DiscretionScreen';
import { DiscoverySequence } from './src/core/ui/DiscoverySequence';
import { PasscodeGate } from './src/core/security/PasscodeGate';
import { usePanicWipe } from './src/core/hooks/usePanicWipe';
import { warmUpModel, syncDownloadedModels } from './src/core/engine/LocalAI';
import { initializePurchases, cleanupPurchases } from './src/core/payment/Purchases';
import { Breathe } from './src/core/games/Breathe';
import { Gratitude } from './src/core/games/Gratitude';
import { Unburdening } from './src/core/games/Unburdening';
import { DeadDrop } from './src/core/games/DeadDrop';
import { Interrogation } from './src/core/games/Interrogation';
import { BreachProtocol } from './src/core/games/BreachProtocol';
import { ZeroDay } from './src/core/games/ZeroDay';
import { Defcon } from './src/core/games/Defcon';
import { ComingSoonOverlay } from './src/core/games/components/ComingSoonOverlay';
import { PrivacyOnboarding } from './src/core/onboarding/PrivacyOnboarding';
import { ModelDownloadOnboarding } from './src/core/onboarding/ModelDownloadOnboarding';

const APP_MODE: 'TROJAN' | 'DISCRETION' = 'TROJAN';

export default function App() {
  const flavor = useChatStore((state) => state.flavor);
  const quickTransition = useChatStore((state) => state.quickTransition);

  // Security state
  const isLocked = useChatStore((state) => state.isLocked);
  const isPasscodeSet = useChatStore((state) => state.isPasscodeSet);
  const lastActiveMode = useChatStore((state) => state.lastActiveMode);
  const setLocked = useChatStore((state) => state.setLocked);
  const setDecoyMode = useChatStore((state) => state.setDecoyMode);
  const loadSecureData = useChatStore((state) => state.loadSecureData);
  const incrementAppOpenCount = useChatStore((state) => state.incrementAppOpenCount);
  const checkDailyReset = useChatStore((state) => state.checkDailyReset);

  // Game state
  const activeGameId = useChatStore((state) => state.gameState.currentSession.activeGameId);
  const showCompletionOverlay = useChatStore((state) => state.gameState.currentSession.showCompletionOverlay);
  const sessionData = useChatStore((state) => state.gameState.currentSession.sessionData);
  const endGame = useChatStore((state) => state.endGame);
  const adjustStressLevel = useChatStore((state) => state.adjustStressLevel);
  const unlockBadge = useChatStore((state) => state.unlockBadge);
  const gameProgress = useChatStore((state) => state.gameState.gameProgress);
  const updateGameStreak = useChatStore((state) => state.updateGameStreak);
  const subscriptionTier = useChatStore((state) => state.subscriptionTier);
  const setShowCompletionOverlay = useChatStore((state) => state.setShowCompletionOverlay);
  const requestSettingsScreen = useChatStore((state) => state.requestSettingsScreen);

  // Onboarding state
  const hasSeenPrivacyOnboarding = useChatStore((state) => state.hasSeenPrivacyOnboarding);
  const hasAttemptedModelDownload = useChatStore((state) => state.hasAttemptedModelDownload);
  const showModelDownloadPrompt = useChatStore((state) => state.showModelDownloadPrompt);
  const modelDownloaded = useChatStore((state) => state.modeDownloadState.efficient === 'downloaded');
  const setHasAttemptedModelDownload = useChatStore((state) => state.setHasAttemptedModelDownload);

  // Initialize panic wipe hook (auto-activates if enabled + Pro + foreground)
  usePanicWipe();

  const [displayedFlavor, setDisplayedFlavor] = useState(flavor);

  // Discovery state
  const [showEffects, setShowEffects] = useState(false);
  const [classifiedIntroMode, setClassifiedIntroMode] = useState(false);

  // Return transition
  const [isReturning, setIsReturning] = useState(false);
  const [returnPhase, setReturnPhase] = useState<'fadeOut' | 'fadeIn' | null>(null);
  const blackOverlayOpacity = useRef(new Animated.Value(0)).current;

  const prevFlavor = useRef(flavor);

  // Timing based on quickTransition setting
  const returnFadeDuration = quickTransition ? 200 : 500;
  const returnHoldDuration = quickTransition ? 100 : 200;

  // Load secure data, check daily reset, increment app open count, and warm up AI model on app start
  useEffect(() => {
    // Request notification permission for background download notifications
    const requestNotificationPermission = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted' && __DEV__) {
        console.log('[Notifications] Permission denied - background download notifications disabled');
      }
    };

    requestNotificationPermission();
    loadSecureData();
    checkDailyReset();
    incrementAppOpenCount();

    // Initialize RevenueCat payment system (non-blocking, fire-and-forget)
    initializePurchases();

    // Sync which models are downloaded and warm up AI model in background (non-blocking)
    syncDownloadedModels();
    warmUpModel();

    // MEMORY MONITORING: OS-native memory pressure detection (dev mode only)
    // Helps catch Low Memory Killer issues early
    if (__DEV__) {
      const memoryWarningListener = AppState.addEventListener('memoryWarning', () => {
        console.warn('[MEMORY] ⚠️ OS memory warning detected - app may be terminated if memory not freed');
        console.warn('[MEMORY] Consider reducing animation complexity or clearing message history');
      });

      // Cleanup function
      return () => {
        cleanupPurchases();
        memoryWarningListener?.remove();
      };
    }

    // Cleanup function (production)
    return () => {
      cleanupPurchases();
    };
  }, []);

  // Handle flavor changes
  useEffect(() => {
    if (flavor === prevFlavor.current) return;
    if (showEffects || isReturning) return;

    const wasHush = prevFlavor.current === 'HUSH';
    const goingToClassified = flavor === 'CLASSIFIED';
    const goingToHush = flavor === 'HUSH';

    if (wasHush && goingToClassified) {
      // Discovery: show effects, then ClassifiedScreen does typewriter
      setShowEffects(true);
      setClassifiedIntroMode(true);
      setDisplayedFlavor('CLASSIFIED');
      prevFlavor.current = 'CLASSIFIED';
    } else if (goingToHush) {
      // Return: fade to black, swap, fade in
      setIsReturning(true);
      setReturnPhase('fadeOut');

      // Phase 1: Fade to black
      Animated.timing(blackOverlayOpacity, {
        toValue: 1,
        duration: returnFadeDuration,
        useNativeDriver: true,
      }).start(() => {
        // Swap screen while black
        setDisplayedFlavor('HUSH');
        prevFlavor.current = 'HUSH';
        setReturnPhase('fadeIn');

        // Brief hold at black
        setTimeout(() => {
          // Phase 2: Fade in from black
          Animated.timing(blackOverlayOpacity, {
            toValue: 0,
            duration: returnFadeDuration,
            useNativeDriver: true,
          }).start(() => {
            setIsReturning(false);
            setReturnPhase(null);
          });
        }, returnHoldDuration);
      });
    } else {
      // Direct swap
      setDisplayedFlavor(flavor);
      prevFlavor.current = flavor;
    }
  }, [flavor, returnFadeDuration, returnHoldDuration]);

  // Effects complete → start ClassifiedScreen typewriter
  const handleEffectsComplete = () => {
    setShowEffects(false);
    // Tell ClassifiedScreen to start its intro sequence
    ClassifiedScreen.startIntro();
  };

  // ClassifiedScreen intro complete
  const handleIntroComplete = () => {
    setClassifiedIntroMode(false);
  };

  // Handle unlock from PasscodeGate
  const handleUnlock = (isDecoy: boolean) => {
    setDecoyMode(isDecoy);
    setLocked(false);
  };

  // Handle game completion
  const handleGameComplete = () => {
    if (activeGameId === 'breathe') {
      // Mark game as completed
      endGame(true);

      // Adjust stress level (-10 to -25 for Hush games)
      adjustStressLevel(-15);
    } else if (activeGameId === 'gratitude') {
      // Mark game as completed
      endGame(true);

      // Update streak (handles daily tracking and Free tier 7-day cap)
      updateGameStreak('gratitude');

      // Adjust stress level (-10 to -15 for Hush games)
      adjustStressLevel(-10);

      // Check for badge unlocks after streak update
      // IMPORTANT: Get fresh state after updateGameStreak() to ensure we read the updated streak value
      const freshState = useChatStore.getState();
      const gratitudeProgress = freshState.gameState.gameProgress.gratitude;
      const currentStreak = gratitudeProgress.currentStreak || 0;

      // "Grateful" badge: 7-day streak (Free tier can unlock)
      if (currentStreak >= 7) {
        unlockBadge('grateful');
      }

      // "Optimist" badge: 30-day streak (Pro only)
      if (currentStreak >= 30 && subscriptionTier !== 'FREE') {
        unlockBadge('optimist');
      }
    } else if (activeGameId === 'unburdening') {
      // Mark game as completed
      endGame(true);

      // Adjust stress level (-15 to -25 for therapeutic Hush games)
      adjustStressLevel(-20);

      // Reset completion overlay flag
      setShowCompletionOverlay(false);

      // Mark as used for Free tier (1 free session limit)
      if (subscriptionTier === 'FREE') {
        // Note: unburdeningUsedFree flag is set in store via persistence
        // The isGameUnlocked() function will handle blocking future uses
      }
    } else if (activeGameId === 'dead_drop') {
      // Mark game as completed
      endGame(true);

      // Update streak (handles daily/weekly tracking)
      updateGameStreak('dead_drop');

      // Adjust stress level (+5 to +15 for Classified games)
      adjustStressLevel(+10);

      // Check for badge unlock after streak update
      // IMPORTANT: Get fresh state after updateGameStreak() to ensure we read the updated streak value
      const freshState = useChatStore.getState();
      const deadDropProgress = freshState.gameState.gameProgress.dead_drop;
      const currentStreak = deadDropProgress.currentStreak || 0;

      // "Field Operative" badge: 30 consecutive check-ins (Pro only - Diamond tier)
      if (currentStreak >= 30 && subscriptionTier !== 'FREE') {
        unlockBadge('field_operative');
      }
    } else if (activeGameId === 'interrogation') {
      // Mark game as completed
      endGame(true);

      // Adjust stress level (+15 for high-intensity Classified games)
      adjustStressLevel(+15);

      // Badge unlock: Only for Mode B wins (defensive success)
      if (sessionData.mode === 'B' && sessionData.success === true) {
        unlockBadge('hardened_target'); // Silver tier badge
      }
    } else if (activeGameId === 'breach_protocol') {
      // Mark game as completed
      endGame(true);

      // Adjust stress level (+12 for Classified games)
      adjustStressLevel(+12);
    } else if (activeGameId === 'zero_day') {
      // Mark game as completed (handles badge unlock internally)
      endGame(true);

      // Adjust stress level (+10 for Classified games)
      adjustStressLevel(+10);
    } else if (activeGameId === 'defcon') {
      // Mark game as completed (handles badge unlock internally)
      endGame(true);

      // Adjust stress level (+15 for strategic decision-making)
      adjustStressLevel(+15);
    }
  };

  // Handle game cancellation
  const handleGameCancel = () => {
    setShowCompletionOverlay(false); // Reset overlay flag
    endGame(false); // Don't count as completed
  };

  // Handle viewing achievement gallery from game completion screen
  const handleViewGallery = () => {
    requestSettingsScreen('achievementGallery');
  };

  const renderScreen = () => {
    switch (displayedFlavor) {
      case 'HUSH':
        return <HushScreen />;
      case 'CLASSIFIED':
        return (
          <ClassifiedScreen
            introMode={classifiedIntroMode}
            quickMode={quickTransition}
            onIntroComplete={handleIntroComplete}
          />
        );
      case 'DISCRETION':
        return <DiscretionScreen />;
      default:
        return <HushScreen />;
    }
  };

  // Determine which mode to show for PasscodeGate theming
  // Use lastActiveMode (the mode we were in when lock triggered)
  const passcodeMode = lastActiveMode === 'CLASSIFIED' ? 'CLASSIFIED' : 'HUSH';

  // Discretion bypasses passcode entirely - only Hush and Classified use passcode
  const shouldShowPasscode = isLocked && isPasscodeSet && flavor !== 'DISCRETION';

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar style="light" />

        {APP_MODE === 'DISCRETION' && <DiscretionScreen />}

        {APP_MODE === 'TROJAN' && (
          <>
            {/* Main screen */}
            <View style={StyleSheet.absoluteFill}>
              {renderScreen()}
            </View>

            {/* Black overlay for return transition */}
            {isReturning && (
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: '#000', opacity: blackOverlayOpacity }
                ]}
                pointerEvents="none"
              />
            )}

            {/* Effects overlay for discovery */}
            {showEffects && (
              <DiscoverySequence
                onEffectsComplete={handleEffectsComplete}
                quickMode={quickTransition}
              />
            )}

            {/* PasscodeGate overlay - shows when locked AND passcode is set (not for Discretion) */}
            {shouldShowPasscode && (
              <PasscodeGate
                visible={true}
                onUnlock={handleUnlock}
                mode={passcodeMode}
                codeLength={6}
              />
            )}

            {/* Game overlays */}
            {activeGameId === 'breathe' && (
              <Breathe
                onComplete={handleGameComplete}
                onCancel={handleGameCancel}
              />
            )}

            {activeGameId === 'gratitude' && (
              <Gratitude
                onComplete={handleGameComplete}
                onCancel={handleGameCancel}
              />
            )}

            {activeGameId === 'unburdening' && (
              <Unburdening
                onComplete={handleGameComplete}
                onCancel={handleGameCancel}
              />
            )}

            {activeGameId === 'dead_drop' && (
              <DeadDrop
                onComplete={handleGameComplete}
                onCancel={handleGameCancel}
                onViewGallery={handleViewGallery}
              />
            )}

            {activeGameId === 'interrogation' && (
              <Interrogation
                onComplete={handleGameComplete}
                onCancel={handleGameCancel}
                onViewGallery={handleViewGallery}
              />
            )}

            {activeGameId === 'breach_protocol' && (
              <BreachProtocol
                onComplete={handleGameComplete}
                onCancel={handleGameCancel}
                onViewGallery={handleViewGallery}
              />
            )}

            {activeGameId === 'zero_day' && (
              <ZeroDay
                onComplete={handleGameComplete}
                onCancel={handleGameCancel}
                onViewGallery={handleViewGallery}
              />
            )}

            {activeGameId === 'defcon' && (
              <Defcon
                onComplete={handleGameComplete}
                onCancel={handleGameCancel}
                onViewGallery={handleViewGallery}
              />
            )}

            {/* Coming Soon overlays for unimplemented games */}

            {activeGameId === 'mole_hunt' && (
              <ComingSoonOverlay
                title="THE MOLE HUNT"
                description="Advanced log analysis • Pro exclusive"
                onClose={handleGameCancel}
              />
            )}

            {activeGameId === 'executive_decision' && (
              <ComingSoonOverlay
                title="EXECUTIVE DECISION"
                description="Ethical dilemma training • Discretion mode"
                onClose={handleGameCancel}
              />
            )}

            {activeGameId === 'negotiation' && (
              <ComingSoonOverlay
                title="NEGOTIATION SIMULATOR"
                description="Strategic deal-making • Discretion mode"
                onClose={handleGameCancel}
              />
            )}

            {activeGameId === 'crisis_management' && (
              <ComingSoonOverlay
                title="CRISIS MANAGEMENT"
                description="Timed decision protocols • Discretion mode"
                onClose={handleGameCancel}
              />
            )}

            {/* Initial Model Download - shows on first launch if no model */}
            {!modelDownloaded && !hasAttemptedModelDownload && (
              <ModelDownloadOnboarding
                visible={true}
                onComplete={() => {
                  // Download succeeded - mark as attempted
                  setHasAttemptedModelDownload(true);
                  // Privacy onboarding will auto-show next (via condition below)
                }}
                onSkip={() => {
                  // User skipped - mark as attempted so we don't show this again
                  setHasAttemptedModelDownload(true);
                  // App will show main chat with "no model" placeholder
                }}
                allowSkip={true}
              />
            )}

            {/* Privacy Onboarding - shows ONLY after model is downloaded */}
            {modelDownloaded && !hasSeenPrivacyOnboarding && (
              <PrivacyOnboarding
                visible={true}
                onComplete={() => {
                  // Onboarding sets hasSeenPrivacyOnboarding to true internally
                }}
              />
            )}

            {/* Model Download Prompt - triggered from chat screen "Download" button */}
            {showModelDownloadPrompt && (
              <ModelDownloadOnboarding
                visible={true}
                onComplete={() => {
                  // Download succeeded - hide prompt
                  useChatStore.setState({ showModelDownloadPrompt: false });
                  // Privacy onboarding will auto-show if not seen
                }}
                onSkip={() => {
                  // User dismissed - just hide the prompt
                  useChatStore.setState({ showModelDownloadPrompt: false });
                }}
                allowSkip={false}
              />
            )}
          </>
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
