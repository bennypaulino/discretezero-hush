import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Accelerometer } from 'expo-sensors';
import { useChatStore } from '../state/rootStore';

/**
 * useSecureLock - Face-down detection and lock state management
 *
 * This hook manages:
 * - Accelerometer-based face-down detection
 * - Lock state in the global store
 * - App state transitions (background/foreground)
 *
 * REMOVED: Biometric authentication (replaced by PasscodeGate)
 * NOTE: Discretion mode bypasses passcode - only Hush and Classified use locking
 */
export const useSecureLock = () => {
  // MEMORY FIX: Use selective subscriptions instead of destructuring
  const isLocked = useChatStore((state) => state.isLocked);
  const setLocked = useChatStore((state) => state.setLocked);
  const isPasscodeSet = useChatStore((state) => state.isPasscodeSet);
  const flavor = useChatStore((state) => state.flavor);
  const checkDailyReset = useChatStore((state) => state.checkDailyReset);

  const lastUnlockTime = useRef<number>(0);

  // STATIONARY TRACKING
  const stillnessFrameCount = useRef(0);
  const lastCoords = useRef({ x: 0, y: 0, z: 0 });

  // FLIP DETECTION (per spec: detect transition, not just position)
  const wasUprightRecently = useRef(true);

  const appState = useRef(AppState.currentState);

  // Manual unlock trigger (called from PasscodeGate)
  const unlock = () => {
    setLocked(false);
    lastUnlockTime.current = Date.now();
    stillnessFrameCount.current = 0;
    wasUprightRecently.current = true;
  };

  // Manual lock trigger
  const lock = () => {
    if (!isPasscodeSet) return; // Don't lock if no passcode set
    if (flavor === 'DISCRETION') return; // Discretion bypasses passcode
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setLocked(true);
  };

  useEffect(() => {
    // Don't run sensor logic if no passcode set or in Discretion mode
    if (!isPasscodeSet || flavor === 'DISCRETION') return;

    let subscription: any;

    const toggleSensor = async (shouldListen: boolean) => {
      if (shouldListen) {
        const { status } = await Accelerometer.requestPermissionsAsync();
        if (status !== 'granted') return;

        // 100ms interval = 10 checks per second
        Accelerometer.setUpdateInterval(100);

        if (!subscription) {
          subscription = Accelerometer.addListener(({ x, y, z }) => {

            // --- 1. CALCULATE MOVEMENT (JITTER) ---
            const deltaX = Math.abs(x - lastCoords.current.x);
            const deltaY = Math.abs(y - lastCoords.current.y);
            const deltaZ = Math.abs(z - lastCoords.current.z);
            const totalMovement = deltaX + deltaY + deltaZ;

            // Update history
            lastCoords.current = { x, y, z };

            // Threshold: 0.05 is typical "Table Stillness". Hands usually jitter > 0.1
            const isStationary = totalMovement < 0.05;

            // --- 2. CHECK ORIENTATION ---
            // Face-down: z should be negative and strong (< -0.85)
            const isFaceDown = z < -0.85;
            const isNotTilted = Math.abs(x) < 0.15 && Math.abs(y) < 0.15;

            // "Upright" means actively held for use (not flat on table)
            // z between 0.3 and 0.7 = typical handheld angle (30-45 degrees)
            // This excludes both face-up flat (z > 0.85) and face-down (z < -0.85)
            const isActivelyHeld = z > 0.3 && z < 0.7;

            // --- 3. TRACK FLIP TRANSITION (per spec) ---
            // Only trigger if we detect a TRANSITION from actively held to face-down
            if (isActivelyHeld) {
              wasUprightRecently.current = true;
              stillnessFrameCount.current = 0;
            }

            // Reset upright flag if significant movement (user is interacting)
            if (totalMovement > 0.15) {
              stillnessFrameCount.current = 0;
            }

            // If phone is lying flat (face-up or extreme angles), disarm after 2 seconds
            // This prevents false locks when phone is set down on table
            const isFlatOnTable = (z > 0.85 || z < -0.2) && isNotTilted && isStationary;
            if (isFlatOnTable) {
              // After 20 frames (2 seconds) of being flat, disarm the lock trigger
              if (stillnessFrameCount.current < 0) {
                stillnessFrameCount.current -= 1;
                if (stillnessFrameCount.current <= -20) {
                  wasUprightRecently.current = false; // Disarm
                }
              } else {
                stillnessFrameCount.current = -1; // Start counting down
              }
            }

            // --- 4. FACE-DOWN LOCK LOGIC ---
            if (isFaceDown && isNotTilted && isStationary && wasUprightRecently.current) {
              stillnessFrameCount.current += 1;
            } else if (!isFaceDown) {
              stillnessFrameCount.current = 0;
            }

            // TRIGGER LOCK: If face-down and stable for 3 frames (300ms)
            // Per spec: 300ms stillness duration after flip
            if (stillnessFrameCount.current >= 3) {
              // Extended grace period: 5 seconds after unlock to prevent false locks during navigation
              const isImmune = Date.now() - lastUnlockTime.current < 5000;

              if (!isImmune && wasUprightRecently.current) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                setLocked(true);
                wasUprightRecently.current = false; // Prevent re-trigger until lifted
                stillnessFrameCount.current = 0;
              }
            }
          });
        }
      } else {
        if (subscription) {
          subscription.remove();
          subscription = null;
        }
      }
    };

    toggleSensor(true);

    // Lock when app goes to background
    const subscriptionState = AppState.addEventListener('change', nextAppState => {
      if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App backgrounded - lock
        setLocked(true);
        toggleSensor(false);
      } else if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App returned to foreground
        checkDailyReset(); // Check if we need to reset daily counter
        toggleSensor(true);
      }
      appState.current = nextAppState;
    });

    return () => {
      if (subscription) subscription.remove();
      subscriptionState.remove();
    };
  }, [isPasscodeSet, flavor]);

  return { isLocked, unlock, lock };
};
