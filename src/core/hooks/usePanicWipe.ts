import { useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Accelerometer } from 'expo-sensors';
import { useChatStore } from '../state/rootStore';

/**
 * Panic Wipe Hook
 *
 * Triggers instant message clearing on triple-shake gesture.
 *
 * DEV MODE (Expo Go): Use manual trigger in TestingSettings screen
 * PRODUCTION (EAS): Uses device accelerometer to detect shake gestures
 *
 * Only active when:
 * - panicWipeEnabled is true
 * - subscriptionTier is not 'FREE'
 * - App is in foreground
 *
 * How it works:
 * - Monitors device accelerometer for sudden movements
 * - Detects 3 rapid shakes within 2 seconds
 * - Each shake must have acceleration above threshold (2.5g)
 * - Provides haptic feedback on successful trigger
 *
 * Why shake instead of volume buttons:
 * iOS does not fire volume button events when volume is at min/max limits,
 * making volume buttons unreliable (50% success rate). Shake gesture works
 * 100% of the time regardless of device state.
 */

const SHAKE_WINDOW = 2000; // ms - time window for 3 shakes
const REQUIRED_SHAKES = 3;
const COOLDOWN_PERIOD = 2000; // 2 seconds between triggers
const MIN_SHAKE_INTERVAL = 200; // ms - minimum time between shakes (debounce)
const SHAKE_THRESHOLD = 2.5; // g-force threshold to detect a shake
const ACCELEROMETER_UPDATE_INTERVAL = 100; // ms - how often to check accelerometer

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
    const { panicWipeEnabled, subscriptionTier, clearAllMessages, isDecoyMode } = useChatStore.getState();

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

    console.log('[usePanicWipe] 🚨 PANIC WIPE TRIGGERED! Clearing ALL messages...');

    // Strong haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // CRITICAL: Clear ALL messages (real + decoy) for emergency situations
    clearAllMessages();

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
     * Pattern detection for triple-shake
     * FIXED: Defined inside useEffect to capture fresh triggerPanicWipe on every effect run
     * PERFORMANCE: Throttled to prevent excessive processing during rapid spam
     */
    const handleShake = () => {
      const now = Date.now();
      console.log('[usePanicWipe] 🔊 Shake detected');

      // THROTTLE: Ignore shakes that come too rapidly (debounce spam)
      if (now - lastPressTime.current < MIN_SHAKE_INTERVAL) {
        console.log('[usePanicWipe] Throttled (too rapid)');
        return; // Ignore this shake - too soon after last one
      }
      lastPressTime.current = now;
      console.log('[usePanicWipe] Shake accepted, timestamps:', pressTimestamps.current.length);

      // Add current shake timestamp
      pressTimestamps.current.push(now);

      // Keep only recent shakes within the window
      pressTimestamps.current = pressTimestamps.current.filter(
        (timestamp) => now - timestamp < SHAKE_WINDOW
      );

      // Check if we have enough shakes
      if (pressTimestamps.current.length >= REQUIRED_SHAKES) {
        console.log('[usePanicWipe] ✅ Valid shake pattern detected - triggering panic wipe!');
        // Trigger panic wipe
        triggerPanicWipe();
        // Clear shake history
        pressTimestamps.current = [];
      }
    };

    // ACCELEROMETER: Shake gesture detection
    // Monitors device acceleration for sudden movements
    console.log('[usePanicWipe] Setting up accelerometer shake detection');

    // Set accelerometer update interval
    Accelerometer.setUpdateInterval(ACCELEROMETER_UPDATE_INTERVAL);

    // Subscribe to accelerometer data
    const accelerometerSubscription = Accelerometer.addListener((accelerometerData) => {
      const { x, y, z } = accelerometerData;

      // Calculate total acceleration (magnitude of 3D vector)
      // Subtract 1g to account for gravity
      const totalAcceleration = Math.sqrt(x * x + y * y + z * z) - 1;

      // Detect shake if acceleration exceeds threshold
      if (totalAcceleration > SHAKE_THRESHOLD) {
        handleShake();
      }
    });

    console.log('[usePanicWipe] Accelerometer shake detection active');

    // Cleanup
    return () => {
      console.log('[usePanicWipe] 🧹 Cleanup running - removing listeners');
      appStateSubscription.remove();
      accelerometerSubscription.remove();
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
