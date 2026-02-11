import { useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useChatStore } from '../state/rootStore';
import { addVolumeButtonListener } from '../modules/VolumeButtonBridge';

/**
 * Panic Wipe Hook
 *
 * Triggers instant message clearing on triple-press Volume DOWN button.
 *
 * DEV MODE (Expo Go): Use manual trigger in TestingSettings screen
 * PRODUCTION (EAS): Uses VolumeButtonModule for native volume button detection
 *
 * Only active when:
 * - panicWipeEnabled is true
 * - subscriptionTier is not 'FREE'
 * - App is in foreground
 *
 * IMPORTANT iOS LIMITATION:
 * When panic wipe is enabled, the system volume HUD will NOT appear when adjusting volume.
 * This is because we use MPVolumeView to detect volume button presses, which suppresses
 * the system HUD. This is a known iOS limitation and cannot be avoided while maintaining
 * covert volume button detection for panic wipe.
 *
 * SOLUTION: Implement a custom volume indicator component that shows when volume changes
 * are detected while panic wipe is active.
 */

const PRESS_WINDOW = 400; // ms between presses
const REQUIRED_PRESSES = 3;
const COOLDOWN_PERIOD = 2000; // 2 seconds
const MIN_PRESS_INTERVAL = 50; // ms - throttle rapid spam (debounce interval)

export const usePanicWipe = (): { triggerPanicWipe: () => void } => {
  // Only subscribe to values needed for effect dependencies
  const { panicWipeEnabled, subscriptionTier } = useChatStore();

  const pressTimestamps = useRef<number[]>([]);
  const lastTriggerTime = useRef<number>(0);
  const lastPressTime = useRef<number>(0);
  const appState = useRef(AppState.currentState);

  /**
   * Manual trigger function for testing
   * Call this from dev menu or test button
   *
   * FIXED: Uses getState() for all values to prevent stale closures
   */
  const triggerPanicWipe = useCallback(() => {
    const now = Date.now();
    console.log('[usePanicWipe] triggerPanicWipe called');
    // Get ALL values fresh from store to prevent stale closures
    const { panicWipeEnabled, subscriptionTier, clearHistory, isDecoyMode } = useChatStore.getState();

    // Check if panic wipe is enabled
    if (!panicWipeEnabled || subscriptionTier === 'FREE') {
      console.log('[usePanicWipe] ❌ Blocked: disabled or FREE tier');
      return;
    }

    // Check if app is in foreground
    if (appState.current !== 'active') {
      console.log('[usePanicWipe] ❌ Blocked: app not in foreground, state:', appState.current);
      return;
    }

    // Check cooldown
    if (now - lastTriggerTime.current < COOLDOWN_PERIOD) {
      console.log('[usePanicWipe] ❌ Blocked: cooldown active, time since last:', now - lastTriggerTime.current, 'ms');
      return;
    }

    // Update last trigger time
    lastTriggerTime.current = now;

    console.log('[usePanicWipe] 🚨 PANIC WIPE TRIGGERED! Clearing history...');

    // Strong haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Clear messages
    clearHistory();

    // Exit decoy mode if active
    if (isDecoyMode) {
      console.log('[usePanicWipe] Exiting decoy mode');
      useChatStore.setState({ isDecoyMode: false, decoyBurned: false });
    }

    console.log('[usePanicWipe] Panic wipe complete');
  }, []); // Empty deps: getState() always returns fresh values

  useEffect(() => {
    console.log('[usePanicWipe] Effect running - panicWipeEnabled:', panicWipeEnabled, 'subscriptionTier:', subscriptionTier);

    // Only activate if Pro user and panic wipe is enabled
    if (!panicWipeEnabled || subscriptionTier === 'FREE') {
      console.log('[usePanicWipe] NOT activating - disabled or FREE tier');
      return;
    }

    console.log('[usePanicWipe] ✅ Activating panic wipe listeners');

    // Reset refs when effect activates (prevents stale state from previous sessions)
    pressTimestamps.current = [];
    lastTriggerTime.current = 0;
    lastPressTime.current = 0;
    appState.current = AppState.currentState;
    console.log('[usePanicWipe] Initial appState:', AppState.currentState);

    // Listen for app state changes (foreground/background)
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      console.log('[usePanicWipe] AppState changed:', appState.current, '→', nextAppState);
      appState.current = nextAppState;
    });

    /**
     * Pattern detection for triple-press
     * FIXED: Defined inside useEffect to capture fresh triggerPanicWipe on every effect run
     * PERFORMANCE: Throttled to prevent excessive processing during rapid spam
     */
    const handlePress = () => {
      const now = Date.now();
      console.log('[usePanicWipe] 🔊 handlePress called');

      // THROTTLE: Ignore presses that come too rapidly (debounce spam)
      if (now - lastPressTime.current < MIN_PRESS_INTERVAL) {
        console.log('[usePanicWipe] Throttled (too rapid)');
        return; // Ignore this press - too soon after last one
      }
      lastPressTime.current = now;
      console.log('[usePanicWipe] Press accepted, timestamps:', pressTimestamps.current.length);

      // Add current press timestamp
      pressTimestamps.current.push(now);

      // Keep only recent presses within the window
      pressTimestamps.current = pressTimestamps.current.filter(
        (timestamp) => now - timestamp < PRESS_WINDOW * REQUIRED_PRESSES
      );

      // Check if we have enough presses
      if (pressTimestamps.current.length >= REQUIRED_PRESSES) {
        // Check if all presses are within the timing window
        const validPattern = pressTimestamps.current.every((timestamp, index) => {
          if (index === 0) return true;
          const timeSincePrevious = timestamp - pressTimestamps.current[index - 1];
          return timeSincePrevious <= PRESS_WINDOW;
        });

        if (validPattern) {
          console.log('[usePanicWipe] ✅ Valid pattern detected - triggering panic wipe!');
          // Trigger panic wipe
          triggerPanicWipe();
          // Clear press history
          pressTimestamps.current = [];
        } else {
          console.log('[usePanicWipe] Invalid pattern (timing off)');
        }
      }
    };

    // NATIVE MODULE: Volume button listener
    // Calls handlePress() when Volume Down is pressed
    // Returns null in Expo Go (native module not available)
    let removeVolumeListener: (() => void) | null = null;
    try {
      removeVolumeListener = addVolumeButtonListener((event) => {
        if (event.direction === 'down') {
          handlePress();
        }
      });
    } catch (error) {
      if (__DEV__) {
        console.error('[usePanicWipe] Failed to setup volume button listener:', error);
      }
      // Continue without volume button support - manual trigger still works
    }

    // Cleanup
    return () => {
      console.log('[usePanicWipe] 🧹 Cleanup running - removing listeners');
      appStateSubscription.remove();
      // Safe to call even if null (Expo Go fallback)
      removeVolumeListener?.();
      // Reset refs to prevent stale state if effect re-runs or component remounts
      pressTimestamps.current = [];
      lastTriggerTime.current = 0;
      lastPressTime.current = 0;
    };
  }, [panicWipeEnabled, subscriptionTier, triggerPanicWipe]);

  // Return the trigger function for manual testing
  // Note: handlePress is now internal to useEffect (fixes stale closure bug)
  return {
    triggerPanicWipe,
  };
};
