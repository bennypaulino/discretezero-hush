import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { AppFlavor } from '../../config';

interface LockScreenProps {
  /**
   * Whether the screen is currently locked
   */
  isLocked: boolean;

  /**
   * Function to call when user taps to unlock
   */
  onUnlock: () => void;

  /**
   * App flavor to determine lock screen appearance
   */
  flavor: AppFlavor;

  /**
   * Optional custom message to display
   * If not provided, uses flavor-specific default
   */
  message?: string;

  /**
   * Optional condition to hide lock screen even when locked
   * Used in ClassifiedScreen during intro sequence
   */
  hideWhen?: boolean;

  /**
   * Optional theme color for the text/line
   * Defaults to '#222' if not provided
   */
  themeColor?: string;
}

/**
 * Lock Screen Component
 *
 * Displays a full-screen overlay when the app is locked.
 * Supports different visual styles for each app flavor:
 * - HUSH: "SYSTEM LOCKED" text
 * - CLASSIFIED: "SYSTEM LOCKED" text
 * - DISCRETION: Minimal horizontal line
 *
 * @example
 * ```tsx
 * <LockScreen
 *   isLocked={isLocked}
 *   onUnlock={unlock}
 *   flavor="HUSH"
 * />
 * ```
 */
export const LockScreen = ({
  isLocked,
  onUnlock,
  flavor,
  message,
  hideWhen = false,
  themeColor = '#222',
}: LockScreenProps) => {
  // Don't render if hideWhen condition is true
  if (hideWhen) {
    return null;
  }

  // Get default message based on flavor
  const getDefaultMessage = () => {
    switch (flavor) {
      case 'HUSH':
      case 'CLASSIFIED':
        return 'SYSTEM LOCKED';
      case 'DISCRETION':
        return null; // Discretion uses a line instead of text
      default:
        return 'SYSTEM LOCKED';
    }
  };

  const displayMessage = message ?? getDefaultMessage();

  return (
    <View
      pointerEvents={isLocked ? 'auto' : 'none'}
      style={[
        StyleSheet.absoluteFill,
        {
          zIndex: 9999,
          backgroundColor: '#000',
          justifyContent: 'center',
          alignItems: 'center',
          opacity: isLocked ? 1 : 0,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onUnlock}
        style={StyleSheet.absoluteFill}
      >
        <View style={styles.content}>
          {flavor === 'DISCRETION' ? (
            // DISCRETION: Minimal line indicator
            <View style={[styles.discretionLine, { backgroundColor: themeColor }]} />
          ) : (
            // HUSH & CLASSIFIED: Text message
            displayMessage && (
              <Text style={[styles.text, { color: themeColor }]}>{displayMessage}</Text>
            )
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#222',
    letterSpacing: 2,
    fontSize: 10,
    fontFamily: 'Courier',
  },
  discretionLine: {
    width: 40,
    height: 1,
    backgroundColor: '#222',
  },
});
