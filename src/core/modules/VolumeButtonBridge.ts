import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

/**
 * Volume Button Bridge Module
 *
 * Provides type-safe interface to native volume button detection modules.
 * Works with both iOS (AVAudioSession) and Android (KeyEvent) implementations.
 *
 * @module VolumeButtonBridge
 *
 * Usage:
 * ```typescript
 * import { addVolumeButtonListener, isVolumeButtonSupported } from './VolumeButtonBridge';
 *
 * // Check if native module is available (false in Expo Go)
 * if (isVolumeButtonSupported()) {
 *   const removeListener = addVolumeButtonListener((event) => {
 *     if (event.direction === 'up') {
 *       console.log('Volume Up pressed!');
 *     }
 *   });
 *
 *   // Cleanup when done
 *   removeListener();
 * }
 * ```
 */

export interface VolumeButtonEvent {
  /** Direction of volume button press */
  direction: 'up' | 'down';
}

export type VolumeButtonListener = (event: VolumeButtonEvent) => void;

// Get native module reference (null in Expo Go)
let VolumeButtonModule: any = null;
let eventEmitter: NativeEventEmitter | null = null;

try {
  VolumeButtonModule = NativeModules.VolumeButtonModule;
  // Create event emitter if module is available
  if (VolumeButtonModule) {
    eventEmitter = new NativeEventEmitter(VolumeButtonModule);
    console.log('[VolumeButtonBridge] ✅ Native module loaded successfully');
    console.log('[VolumeButtonBridge] Platform:', Platform.OS);
    console.log('[VolumeButtonBridge] Module methods:', Object.keys(VolumeButtonModule));
  } else {
    console.warn('[VolumeButtonBridge] ⚠️ Native module NOT found in NativeModules');
    console.log('[VolumeButtonBridge] Available modules:', Object.keys(NativeModules).filter(k => k.includes('Volume') || k.includes('Button')));
  }
} catch (error) {
  console.error('[VolumeButtonBridge] ❌ Failed to initialize native module:', error);
  // Module unavailable - will fallback to manual trigger
  VolumeButtonModule = null;
  eventEmitter = null;
}

/**
 * Add listener for volume button presses.
 *
 * Returns a cleanup function to remove the listener, or null if module is unavailable.
 *
 * @param listener - Callback function to handle volume button events
 * @returns Cleanup function or null if module unavailable (Expo Go)
 *
 * @example
 * ```typescript
 * const removeListener = addVolumeButtonListener((event) => {
 *   if (event.direction === 'up') {
 *     handleVolumeUp();
 *   }
 * });
 *
 * // Later, cleanup
 * if (removeListener) {
 *   removeListener();
 * }
 * ```
 */
export function addVolumeButtonListener(
  listener: VolumeButtonListener
): (() => void) | null {
  if (!eventEmitter) {
    console.warn(
      '[VolumeButtonBridge] ⚠️ Native module not available. ' +
      'This is expected in Expo Go. ' +
      'Use a development build or the manual trigger in TestingSettings for testing.'
    );
    return null;
  }

  console.log('[VolumeButtonBridge] ✅ Adding volume button listener');
  const subscription = eventEmitter.addListener(
    'onVolumeButtonPress',
    (event) => {
      console.log('[VolumeButtonBridge] 🔊 Volume button event received:', event);
      listener(event);
    }
  );

  return () => {
    console.log('[VolumeButtonBridge] Removing volume button listener');
    subscription.remove();
  };
}

/**
 * Initialize error monitoring for volume button native module.
 *
 * Should be called once at app startup to catch iOS audio session failures.
 * Errors are logged in development mode and can be sent to analytics/Sentry.
 *
 * @example
 * ```typescript
 * // In App.tsx or root component:
 * useEffect(() => {
 *   const removeErrorListener = initVolumeButtonErrorMonitoring();
 *   return removeErrorListener;
 * }, []);
 * ```
 */
export function initVolumeButtonErrorMonitoring(): (() => void) | null {
  if (!eventEmitter) {
    return null;
  }

  const errorListener = (errorEvent: { error: string; code: string }) => {
    if (__DEV__) {
      console.error(
        '[VolumeButtonBridge] Native module error:',
        errorEvent.code,
        errorEvent.error
      );
    }

    // TODO: Send to analytics/Sentry in production
    // Example: Sentry.captureMessage(`Volume button error: ${errorEvent.code}`, 'error');
  };

  const subscription = eventEmitter.addListener(
    'onVolumeButtonError',
    errorListener
  );

  return () => subscription.remove();
}

/**
 * Check if native volume button module is available.
 *
 * Returns false in Expo Go (native modules not supported).
 * Returns true in development/production builds with native code.
 *
 * @returns true if volume button detection is supported, false otherwise
 *
 * @example
 * ```typescript
 * if (isVolumeButtonSupported()) {
 *   console.log('Volume button detection available');
 * } else {
 *   console.log('Use manual trigger for testing');
 * }
 * ```
 */
export function isVolumeButtonSupported(): boolean {
  return eventEmitter !== null;
}

/**
 * Get platform-specific information about volume button support.
 *
 * @returns Object with platform details and support status
 */
export function getVolumeButtonInfo(): {
  platform: string;
  supported: boolean;
  moduleAvailable: boolean;
  implementation: string;
  limitations: string;
} {
  return {
    platform: Platform.OS,
    supported: isVolumeButtonSupported(),
    moduleAvailable: VolumeButtonModule !== undefined && VolumeButtonModule !== null,
    implementation: Platform.select({
      ios: 'AVAudioSession volume monitoring',
      android: 'KeyEvent.KEYCODE_VOLUME_UP',
      default: 'Not implemented'
    }),
    limitations: Platform.select({
      ios: 'Volume HUD overlay will appear (iOS system restriction)',
      android: 'Volume dialog suppressed',
      default: 'N/A'
    })
  };
}
