import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Keyboard,
  Alert,
} from 'react-native';
import { useAnimatedValue } from '../hooks/useAnimatedValue';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChatStore } from '../state/rootStore';
import { HUSH_THEMES, CLASSIFIED_THEMES } from '../themes/themes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PasscodeGateProps {
  visible: boolean;
  onUnlock: (isDecoy: boolean) => void;
  mode: 'HUSH' | 'CLASSIFIED';
  codeLength?: number;
}

export const PasscodeGate: React.FC<PasscodeGateProps> = ({
  visible,
  onUnlock,
  mode,
  codeLength = 6,
}) => {
  const [enteredCode, setEnteredCode] = useState('');
  const [error, setError] = useState(false);
  const [lockoutSecondsRemaining, setLockoutSecondsRemaining] = useState(0);
  const shakeAnim = useAnimatedValue(0);
  const insets = useSafeAreaInsets();
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const validatePasscode = useChatStore((state) => state.validatePasscode);
  const passcodeLockoutUntil = useChatStore((state) => state.passcodeLockoutUntil);
  const hasSeenLockScreenTutorial = useChatStore((state) => state.hasSeenLockScreenTutorial);
  const hasSeenPrivacyOnboarding = useChatStore((state) => state.hasSeenPrivacyOnboarding);
  const setHasSeenLockScreenTutorial = (seen: boolean) => useChatStore.setState({ hasSeenLockScreenTutorial: seen });
  const hushTheme = useChatStore((state) => state.hushTheme);
  const classifiedTheme = useChatStore((state) => state.classifiedTheme);

  // Get active theme's primary color
  const activeThemeColor = mode === 'CLASSIFIED'
    ? CLASSIFIED_THEMES[classifiedTheme].colors.primary
    : HUSH_THEMES[hushTheme].colors.primary;

  // Theme based on mode
  const theme = mode === 'CLASSIFIED'
    ? {
        bg: '#0a0a0a',
        text: activeThemeColor,
        subtext: '#661a16',
        accent: activeThemeColor,
        keyBg: `rgba(${parseInt(activeThemeColor.slice(1, 3), 16)}, ${parseInt(activeThemeColor.slice(3, 5), 16)}, ${parseInt(activeThemeColor.slice(5, 7), 16)}, 0.1)`,
        keyBorder: `rgba(${parseInt(activeThemeColor.slice(1, 3), 16)}, ${parseInt(activeThemeColor.slice(3, 5), 16)}, ${parseInt(activeThemeColor.slice(5, 7), 16)}, 0.3)`,
        dotEmpty: `rgba(${parseInt(activeThemeColor.slice(1, 3), 16)}, ${parseInt(activeThemeColor.slice(3, 5), 16)}, ${parseInt(activeThemeColor.slice(5, 7), 16)}, 0.3)`,
        dotFilled: activeThemeColor,
        title: 'ENTER ACCESS CODE',
        errorText: 'ACCESS DENIED',
        fontFamily: 'Courier',
      }
    : {
        bg: '#0a0a0a',
        text: '#FFFFFF',
        subtext: 'rgba(255, 255, 255, 0.5)',
        accent: activeThemeColor,
        keyBg: 'rgba(255, 255, 255, 0.1)',
        keyBorder: 'rgba(255, 255, 255, 0.2)',
        dotEmpty: 'rgba(255, 255, 255, 0.3)',
        dotFilled: activeThemeColor,
        title: 'Enter Passcode',
        errorText: 'Incorrect passcode',
        fontFamily: 'System',
      };

  // Reset on visibility change and dismiss keyboard
  useEffect(() => {
    if (visible) {
      setEnteredCode('');
      setError(false);
      // Dismiss any open keyboard to prevent blocking passcode entry
      Keyboard.dismiss();
    }
  }, [visible]);

  // Handle lockout countdown timer
  useEffect(() => {
    // Clear any existing interval
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    if (passcodeLockoutUntil) {
      const now = Date.now();
      const secondsRemaining = Math.ceil((passcodeLockoutUntil - now) / 1000);

      if (secondsRemaining > 0) {
        setLockoutSecondsRemaining(secondsRemaining);

        // Update countdown every second
        countdownIntervalRef.current = setInterval(() => {
          const nowInInterval = Date.now();
          const remaining = Math.ceil((passcodeLockoutUntil - nowInInterval) / 1000);

          if (remaining <= 0) {
            setLockoutSecondsRemaining(0);
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
          } else {
            setLockoutSecondsRemaining(remaining);
          }
        }, 1000);
      } else {
        setLockoutSecondsRemaining(0);
      }
    } else {
      setLockoutSecondsRemaining(0);
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [passcodeLockoutUntil]);

  // Check passcode when complete
  useEffect(() => {
    if (enteredCode.length === codeLength) {
      validateCode();
    }
  }, [enteredCode]);

  const validateCode = async () => {
    const result = await validatePasscode(enteredCode);

    if (result === 'duress') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEnteredCode('');
      onUnlock(true); // Decoy mode
      return;
    }

    if (result === 'real') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEnteredCode('');
      onUnlock(false); // Real mode

      // Show first-time tutorial if not seen yet
      // BUT: Don't show during Privacy Onboarding (wait until that's completed)
      if (!hasSeenLockScreenTutorial && hasSeenPrivacyOnboarding) {
        setTimeout(() => {
          Alert.alert(
            mode === 'CLASSIFIED' ? 'SECURITY_ACTIVE' : 'Security Active',
            mode === 'CLASSIFIED'
              ? 'APP_LOCKS_WHEN_BACKGROUNDED. PLACE_FACE_DOWN_TO_LOCK_INSTANTLY.'
              : 'The app will lock when you background it or switch apps. You can also place your phone face-down to lock instantly.',
            [{ text: mode === 'CLASSIFIED' ? 'ACKNOWLEDGED' : 'Got it' }]
          );
          setHasSeenLockScreenTutorial(true);
        }, 500);
      }
      return;
    }

    if (result === 'locked_out') {
      // User is in lockout period - this shouldn't happen as UI prevents entry
      // But handle it gracefully just in case
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setEnteredCode('');
      return;
    }

    // Wrong code
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setError(true);
    triggerShake();

    // Clear after shake (increased from 600ms to 1000ms for better readability)
    setTimeout(() => {
      setEnteredCode('');
      setError(false);
    }, 1000);
  };

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleKeyPress = (key: string) => {
    // Prevent input during lockout
    if (lockoutSecondsRemaining > 0) return;
    if (enteredCode.length >= codeLength) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEnteredCode(prev => prev + key);
  };

  const handleDelete = () => {
    // Prevent input during lockout
    if (lockoutSecondsRemaining > 0) return;
    if (enteredCode.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEnteredCode(prev => prev.slice(0, -1));
  };

  const renderDots = () => {
    const dots = [];

    for (let i = 0; i < codeLength; i++) {
      const isFilled = i < enteredCode.length;
      dots.push(
        <View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor: isFilled ? theme.dotFilled : 'transparent',
              borderColor: error ? '#FF3B30' : (isFilled ? theme.dotFilled : theme.dotEmpty),
            },
          ]}
        />
      );
    }
    return dots;
  };

  const renderKey = (value: string) => (
    <TouchableOpacity
      key={value}
      style={[
        styles.key,
        {
          backgroundColor: theme.keyBg,
          borderColor: theme.keyBorder,
        },
      ]}
      onPress={() => handleKeyPress(value)}
      activeOpacity={0.6}
      accessible={true}
      accessibilityLabel={`Digit ${value}`}
      accessibilityRole="button"
      accessibilityHint="Enter passcode digit"
    >
      <Text style={[styles.keyText, { color: theme.text, fontFamily: theme.fontFamily }]}>
        {value}
      </Text>
    </TouchableOpacity>
  );

  if (!visible) return null;

  // Determine title based on state
  const getTitleText = () => {
    if (lockoutSecondsRemaining > 0) {
      const minutes = Math.floor(lockoutSecondsRemaining / 60);
      const seconds = lockoutSecondsRemaining % 60;
      const timeString = minutes > 0
        ? `${minutes}:${seconds.toString().padStart(2, '0')}`
        : `${seconds}s`;

      return mode === 'CLASSIFIED'
        ? `LOCKOUT: ${timeString}`
        : `Try again in ${timeString}`;
    }

    if (error) {
      return theme.errorText;
    }

    return theme.title;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 60 }]}>
        <Text style={[styles.title, { color: lockoutSecondsRemaining > 0 ? '#FF9500' : (error ? '#FF3B30' : theme.text), fontFamily: theme.fontFamily }]}>
          {getTitleText()}
        </Text>

        {/* Dot indicator */}
        <Animated.View
          style={[
            styles.dotsContainer,
            { transform: [{ translateX: shakeAnim }] }
          ]}
        >
          {renderDots()}
        </Animated.View>
      </View>

      {/* Keypad */}
      <View style={styles.keypad}>
        <View style={styles.keyRow}>
          {renderKey('1')}
          {renderKey('2')}
          {renderKey('3')}
        </View>
        <View style={styles.keyRow}>
          {renderKey('4')}
          {renderKey('5')}
          {renderKey('6')}
        </View>
        <View style={styles.keyRow}>
          {renderKey('7')}
          {renderKey('8')}
          {renderKey('9')}
        </View>
        <View style={styles.keyRow}>
          {/* Empty space */}
          <View style={styles.keyPlaceholder} />
          {renderKey('0')}
          {/* Delete button */}
          <TouchableOpacity
            style={[styles.key, styles.deleteKey]}
            onPress={handleDelete}
            activeOpacity={0.6}
            accessible={true}
            accessibilityLabel="Delete"
            accessibilityRole="button"
            accessibilityHint="Delete last digit"
          >
            <Ionicons name="backspace-outline" size={28} color={theme.subtext} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom spacer */}
      <View style={{ height: insets.bottom + 40 }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    gap: 30,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 1,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  keypad: {
    alignItems: 'center',
    gap: 15,
    paddingBottom: 20,
  },
  keyRow: {
    flexDirection: 'row',
    gap: 20,
  },
  key: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyText: {
    fontSize: 32,
    fontWeight: '300',
  },
  keyPlaceholder: {
    width: 80,
    height: 80,
  },
  deleteKey: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
});
