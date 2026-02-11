/**
 * SecuritySettings
 *
 * Handles Security, Passcode Setup, Duress Setup, Change Passcode, and Decoy Preset screens.
 * Includes multi-step passcode flows, animated error handling, and Pro-gated features.
 *
 * Phase 4 of P1.4 SettingsModal refactor.
 */

import React, { useState, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, Alert, Animated } from 'react-native';
import { useAnimatedValue } from '../../hooks/useAnimatedValue';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useChatStore } from '../../state/rootStore';
import type { AppFlavor, ClassifiedTheme } from '../../state/types';
import { SettingsSubHeader } from './shared/SettingsSubHeader';
import { SettingsSecurityRow } from './shared/SettingsSecurityRow';
import type { SettingsTheme } from '../../themes/settingsThemeEngine';
import { getClassifiedSelectedBg } from '../../themes/themeHelpers';
import type { SecurityScreen } from './shared/types';

interface SecuritySettingsProps {
  currentScreen: SecurityScreen;
  onNavigate: (screen: SecurityScreen) => void;
  onGoBack: () => void;
  onClose: () => void;
  effectiveMode: AppFlavor | 'BLOCKER';
  theme: SettingsTheme;
  isPro: boolean;
}

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({
  currentScreen,
  onNavigate,
  onGoBack,
  onClose,
  effectiveMode,
  theme,
  isPro,
}) => {
  // SELECTIVE SUBSCRIPTIONS (~7 fields vs 35+)
  const isPasscodeSet = useChatStore((state) => state.isPasscodeSet);
  const isDuressCodeSet = useChatStore((state) => state.isDuressCodeSet);
  const hushDecoyPreset = useChatStore((state) => state.hushDecoyPreset);
  const classifiedDecoyPreset = useChatStore((state) => state.classifiedDecoyPreset);
  const setHushDecoyPreset = useChatStore((state) => state.setHushDecoyPreset);
  const setClassifiedDecoyPreset = useChatStore((state) => state.setClassifiedDecoyPreset);
  const panicWipeEnabled = useChatStore((state) => state.panicWipeEnabled);
  const setPanicWipeEnabled = useChatStore((state) => state.setPanicWipeEnabled);

  const setPasscode = useChatStore((state) => state.setPasscode);
  const setDuressCode = useChatStore((state) => state.setDuressCode);
  const clearPasscode = useChatStore((state) => state.clearPasscode);
  const validatePasscode = useChatStore((state) => state.validatePasscode);
  const triggerPaywall = useChatStore((state) => state.triggerPaywall);
  const classifiedTheme = useChatStore((state) => state.classifiedTheme);

  // Passcode flow state
  const CODE_LENGTH = 6;
  const [passcodeStep, setPasscodeStep] = useState<'enter' | 'confirm' | 'success'>('enter');
  const [changePasscodeStep, setChangePasscodeStep] = useState<'verify' | 'enter' | 'confirm' | 'success'>('verify');
  const [firstEntry, setFirstEntry] = useState('');
  const [currentEntry, setCurrentEntry] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const shakeAnim = useAnimatedValue(0);

  // ============================================
  // HANDLERS
  // ============================================

  const handleSetupPasscode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onNavigate('passcodeSetup');
  }, [onNavigate]);

  const handleSetupDuress = useCallback(() => {
    if (!isPasscodeSet) {
      Alert.alert('Passcode Required', 'Set up a passcode first before creating a duress code.', [{ text: 'OK' }]);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onNavigate('duressSetup');
  }, [isPasscodeSet, onNavigate]);

  const handleChangePasscode = useCallback(() => {
    if (!isPasscodeSet) {
      Alert.alert(
        theme.isTerminal ? 'NO_PASSCODE_SET' : 'No Passcode',
        theme.isTerminal ? 'SET_PASSCODE_FIRST' : 'You need to set up a passcode before you can change it.',
        [{ text: 'OK' }]
      );
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onNavigate('changePasscode');
  }, [isPasscodeSet, theme.isTerminal, onNavigate]);

  const handleConfigureDecoy = useCallback(() => {
    if (!isDuressCodeSet) {
      Alert.alert(
        theme.isTerminal ? 'DURESS_CODE_REQUIRED' : 'Duress Code Required',
        theme.isTerminal
          ? 'CONFIGURE_DURESS_CODE_BEFORE_DECOY_CONTENT'
          : 'Set up a duress code first. Decoy content appears when you enter the duress code instead of your real passcode.',
        [{ text: 'OK' }]
      );
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onNavigate('decoyPreset');
  }, [isDuressCodeSet, theme.isTerminal, onNavigate]);

  const handleClearPasscode = useCallback(() => {
    Alert.alert(
      theme.isTerminal ? 'CONFIRM_SECURITY_WIPE' : 'Remove Passcode?',
      theme.isTerminal ? 'THIS WILL DISABLE ALL SECURITY PROTOCOLS.' : 'This will disable app lock and remove your duress code.',
      [
        { text: theme.isTerminal ? 'ABORT' : 'Cancel', style: 'cancel' },
        { text: theme.isTerminal ? 'CONFIRM' : 'Remove', style: 'destructive', onPress: () => clearPasscode() }
      ]
    );
  }, [theme.isTerminal, clearPasscode]);

  // ============================================
  // PASSCODE HELPERS
  // ============================================

  const isWeakPasscode = (code: string): boolean => {
    const weakPasscodes = [
      '123456', '654321', '111111', '000000', '222222', '333333',
      '444444', '555555', '666666', '777777', '888888', '999999',
      '121212', '101010', '000001', '123123', '696969'
    ];
    return weakPasscodes.includes(code);
  };

  const triggerPasscodeError = (message: string) => {
    setPasscodeError(true);
    setErrorMessage(message);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      setCurrentEntry('');
      setPasscodeError(false);
      setErrorMessage('');
      if (passcodeStep === 'confirm') {
        setPasscodeStep('enter');
        setFirstEntry('');
      }
    }, 800);
  };

  const getPasscodeTitle = () => {
    const isDuressScreen = currentScreen === 'duressSetup';
    if (passcodeError) return errorMessage;
    if (isDuressScreen) {
      if (passcodeStep === 'enter') return isDuressCodeSet ? 'Enter New Duress Code' : 'Create Duress Code';
      if (passcodeStep === 'confirm') return 'Confirm Duress Code';
      return 'Duress Code Set';
    } else {
      if (passcodeStep === 'enter') return isPasscodeSet ? 'Enter New Passcode' : 'Create Passcode';
      if (passcodeStep === 'confirm') return 'Confirm Passcode';
      return 'Passcode Set';
    }
  };

  const getPasscodeSubtitle = () => {
    const isDuressScreen = currentScreen === 'duressSetup';
    if (isDuressScreen) {
      if (passcodeStep === 'enter') return 'This code shows decoy content when forced';
      if (passcodeStep === 'confirm') return 'Enter the same code again';
      return 'Enter this code if forced to unlock';
    } else {
      if (passcodeStep === 'enter') return 'This code unlocks your real conversations';
      if (passcodeStep === 'confirm') return 'Enter the same code again';
      return 'Your passcode is now active';
    }
  };

  const getDecoyPresetLabel = (preset: string) => {
    switch (preset) {
      case 'AUTO': return 'Auto-generate';
      case 'STUDY_HELPER': return 'Study Helper';
      case 'MEAL_PLANNING': return 'Meal Planning';
      case 'GENERAL_ASSISTANT': return 'General Assistant';
      case 'CUSTOM': return 'Custom';
      default: return 'General Assistant';
    }
  };

  const getDecoyPresetSummary = () => {
    const preset = effectiveMode === 'CLASSIFIED' ? classifiedDecoyPreset : hushDecoyPreset;
    const label = getDecoyPresetLabel(preset);
    return theme.isTerminal ? label.toUpperCase().replace(/ /g, '_') : label;
  };

  // ============================================
  // PASSCODE HANDLERS
  // ============================================

  const handlePasscodeKeyPress = (key: string) => {
    if (currentEntry.length >= CODE_LENGTH || passcodeStep === 'success') return;
    Haptics.selectionAsync();
    const newEntry = currentEntry + key;
    setCurrentEntry(newEntry);

    if (newEntry.length === CODE_LENGTH) {
      handlePasscodeComplete(newEntry);
    }
  };

  const handlePasscodeComplete = async (code: string) => {
    const isDuressScreen = currentScreen === 'duressSetup';

    if (passcodeStep === 'enter') {
      // Check for weak passcode and show warning
      if (isWeakPasscode(code)) {
        Alert.alert(
          theme.isTerminal ? 'WEAK_PASSCODE_WARNING' : 'Weak Passcode',
          theme.isTerminal
            ? 'PASSCODE_PATTERN_PREDICTABLE. RECOMMEND_RANDOM_DIGITS. CONTINUE?'
            : 'This passcode is easy to guess. We recommend using a random combination of digits for better security. Continue anyway?',
          [
            {
              text: theme.isTerminal ? 'ABORT' : 'Go Back',
              style: 'cancel',
              onPress: () => {
                setCurrentEntry('');
                setPasscodeError(false);
              }
            },
            {
              text: theme.isTerminal ? 'CONTINUE' : 'Use Anyway',
              onPress: () => {
                setFirstEntry(code);
                setCurrentEntry('');
                setPasscodeStep('confirm');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
            }
          ]
        );
        return;
      }

      setFirstEntry(code);
      setCurrentEntry('');
      setPasscodeStep('confirm');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (passcodeStep === 'confirm') {
      if (code === firstEntry) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (isDuressScreen) {
          await setDuressCode(code);
        } else {
          await setPasscode(code);
        }
        setPasscodeStep('success');
        setTimeout(() => {
          onNavigate('security');
        }, 1500);
      } else {
        triggerPasscodeError("Codes don't match");
      }
    }
  };

  const handlePasscodeDelete = () => {
    if (currentEntry.length === 0 || passcodeStep === 'success') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentEntry(prev => prev.slice(0, -1));
  };

  // ============================================
  // CHANGE PASSCODE HANDLERS
  // ============================================

  const handleChangePasscodeKeyPress = (key: string) => {
    if (currentEntry.length >= CODE_LENGTH || changePasscodeStep === 'success') return;
    Haptics.selectionAsync();
    const newEntry = currentEntry + key;
    setCurrentEntry(newEntry);

    if (newEntry.length === CODE_LENGTH) {
      handleChangePasscodeComplete(newEntry);
    }
  };

  const handleChangePasscodeComplete = async (code: string) => {
    if (changePasscodeStep === 'verify') {
      // Verify current passcode
      const result = await validatePasscode(code);
      if (result === 'real' || result === 'duress') {
        // Current passcode correct, move to enter new
        setCurrentEntry('');
        setChangePasscodeStep('enter');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        triggerPasscodeError('Incorrect passcode');
      }
    } else if (changePasscodeStep === 'enter') {
      // Check for weak passcode
      if (isWeakPasscode(code)) {
        Alert.alert(
          theme.isTerminal ? 'WEAK_PASSCODE_WARNING' : 'Weak Passcode',
          theme.isTerminal
            ? 'PASSCODE_PATTERN_PREDICTABLE. RECOMMEND_RANDOM_DIGITS. CONTINUE?'
            : 'This passcode is easy to guess. We recommend using a random combination of digits for better security. Continue anyway?',
          [
            {
              text: theme.isTerminal ? 'ABORT' : 'Go Back',
              style: 'cancel',
              onPress: () => {
                setCurrentEntry('');
                setPasscodeError(false);
              }
            },
            {
              text: theme.isTerminal ? 'CONTINUE' : 'Use Anyway',
              onPress: () => {
                setFirstEntry(code);
                setCurrentEntry('');
                setChangePasscodeStep('confirm');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
            }
          ]
        );
        return;
      }

      setFirstEntry(code);
      setCurrentEntry('');
      setChangePasscodeStep('confirm');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (changePasscodeStep === 'confirm') {
      if (code === firstEntry) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await setPasscode(code);
        setChangePasscodeStep('success');
        setTimeout(() => {
          onNavigate('security');
        }, 1500);
      } else {
        triggerPasscodeError("Codes don't match");
      }
    }
  };

  const handleChangePasscodeDelete = () => {
    if (currentEntry.length === 0 || changePasscodeStep === 'success') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentEntry(prev => prev.slice(0, -1));
  };

  const getChangePasscodeTitle = () => {
    if (passcodeError) return errorMessage;
    if (changePasscodeStep === 'verify') return 'Enter Current Passcode';
    if (changePasscodeStep === 'enter') return 'Enter New Passcode';
    if (changePasscodeStep === 'confirm') return 'Confirm New Passcode';
    return 'Passcode Changed';
  };

  const getChangePasscodeSubtitle = () => {
    if (changePasscodeStep === 'verify') return 'Verify your identity';
    if (changePasscodeStep === 'enter') return 'Choose a new passcode';
    if (changePasscodeStep === 'confirm') return 'Enter the same code again';
    return 'Your new passcode is now active';
  };

  // ============================================
  // SCREEN: Security
  // ============================================
  const renderSecurityScreen = () => (
    <View style={{ flex: 1 }}>
      <SettingsSubHeader
        title={theme.isTerminal ? 'Security_Protocols' : 'Security'}
        onBack={onGoBack}
        theme={theme}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.securityContainer}>
          <SettingsSecurityRow
            icon="lock-closed"
            label={theme.isTerminal ? 'App_Passcode' : 'App Passcode'}
            sublabel={isPasscodeSet ? (theme.isTerminal ? 'TAP_TO_CHANGE' : 'Tap to change') : (theme.isTerminal ? 'NOT_SET' : 'Not set')}
            isSet={isPasscodeSet}
            onPress={isPasscodeSet ? handleChangePasscode : handleSetupPasscode}
            theme={theme}
            classifiedTheme={classifiedTheme}
            effectiveMode={effectiveMode}
          />
          <SettingsSecurityRow
            icon="shield-checkmark"
            label={theme.isTerminal ? 'Duress_Protocol' : 'Duress Code'}
            sublabel={
              isDuressCodeSet
                ? (theme.isTerminal ? 'SHOWS_DECOY' : 'Shows decoy content')
                : (isPasscodeSet ? (theme.isTerminal ? 'TAP_TO_SET' : 'Tap to set up') : (theme.isTerminal ? 'REQUIRES_PASSCODE' : 'Requires passcode'))
            }
            isSet={isDuressCodeSet}
            onPress={handleSetupDuress}
            theme={theme}
            classifiedTheme={classifiedTheme}
            effectiveMode={effectiveMode}
          />
          {isPro && (
            <SettingsSecurityRow
              icon="document-text"
              label={
                theme.isTerminal
                  ? (effectiveMode === 'CLASSIFIED' ? 'Decoy_Protocol' : 'Decoy_Mode')
                  : (effectiveMode === 'CLASSIFIED' ? 'Decoy Protocol' : 'Decoy Mode')
              }
              sublabel={getDecoyPresetSummary()}
              isSet={isDuressCodeSet}
              onPress={handleConfigureDecoy}
              theme={theme}
              classifiedTheme={classifiedTheme}
              effectiveMode={effectiveMode}
            />
          )}

          {/* Panic Wipe */}
          <View style={[styles.securityRow, { backgroundColor: theme.card }]}>
            <TouchableOpacity
              style={[styles.securityRowLeft, { flex: 1 }]}
              onPress={() => {
                if (!isPro) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onClose();
                  setTimeout(() => {
                    triggerPaywall('feature_locked_theme');
                  }, 400);
                }
              }}
              activeOpacity={0.7}
              disabled={isPro}
            >
              <View style={[styles.navIcon, { backgroundColor: theme.isTerminal ? getClassifiedSelectedBg(effectiveMode, classifiedTheme) : 'rgba(139, 92, 246, 0.2)' }]}>
                <Ionicons name="flash-off" size={20} color={theme.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.navLabel, { color: theme.text, fontFamily: theme.fontBody }]}>
                  {theme.isTerminal ? 'Panic_Wipe' : 'Panic Wipe'}
                </Text>
                <Text style={[styles.navSublabel, { color: theme.subtext, fontFamily: theme.fontBody }]} numberOfLines={2}>
                  {theme.isTerminal
                    ? 'TRIPLE_PRESS_VOLUME_DOWN'
                    : 'Triple-press Volume Down to instantly clear conversation'}
                </Text>
              </View>
            </TouchableOpacity>
            {isPro ? (
              <Switch
                value={panicWipeEnabled}
                onValueChange={(value) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  if (value) {
                    // Enabling: Show confirmation alert
                    Alert.alert(
                      theme.isTerminal ? 'PANIC_WIPE' : '⚠️ Panic Wipe',
                      theme.isTerminal
                        ? 'TRIPLE PRESS VOLUME DOWN TO INSTANTLY CLEAR CONVERSATION.\n\n• WORKS ONLY WHEN APP IS OPEN\n• NO CONFIRMATION, NO ANIMATION\n• CONVERSATION PERMANENTLY DELETED\n• CANNOT BE UNDONE\n\nTIP: PRACTICE GESTURE FOR MUSCLE MEMORY'
                        : 'Triple-press Volume Down to instantly clear conversation.\n\n• Works only when app is open\n• No confirmation, no animation\n• Conversation is permanently deleted\n• Cannot be undone\n\n💡 Tip: Practice the gesture so it becomes muscle memory.',
                      [
                        {
                          text: theme.isTerminal ? 'CANCEL' : 'Cancel',
                          style: 'cancel',
                          onPress: () => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }
                        },
                        {
                          text: theme.isTerminal ? 'ENABLE' : 'Enable',
                          style: 'default',
                          onPress: () => {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            setPanicWipeEnabled(true);
                          }
                        }
                      ]
                    );
                  } else {
                    // Disabling: Direct
                    setPanicWipeEnabled(value);
                  }
                }}
                trackColor={{ false: theme.divider, true: theme.accent }}
                thumbColor="#fff"
              />
            ) : (
              <Ionicons name="lock-closed" size={18} color={theme.subtext} />
            )}
          </View>
        </View>

        {/* Why no Face ID */}
        <TouchableOpacity
          style={styles.infoLink}
          onPress={() => Alert.alert(
            theme.isTerminal ? 'BIOMETRIC_DISABLED' : 'Why no Face ID?',
            theme.isTerminal
              ? 'BIOMETRICS CAN BE FORCED. PASSCODE REQUIRES COOPERATION. DURESS CODE ENABLES PLAUSIBLE DENIABILITY.'
              : 'Biometrics can be forced — someone can hold your phone to your face. A passcode requires your cooperation.\n\nThis also enables Decoy Mode: enter your duress code to show innocent content.',
            [{ text: 'OK' }]
          )}
        >
          <Ionicons name="information-circle-outline" size={18} color={theme.subtext} />
          <Text style={[styles.infoLinkText, { color: theme.subtext, fontFamily: theme.fontBody }]}>
            {theme.isTerminal ? 'WHY_NO_BIOMETRICS?' : 'Why no Face ID?'}
          </Text>
        </TouchableOpacity>

        {/* Remove passcode */}
        {isPasscodeSet && (
          <TouchableOpacity style={styles.dangerLink} onPress={handleClearPasscode}>
            <Text style={[styles.dangerLinkText, { color: theme.danger, fontFamily: theme.fontBody }]}>
              {theme.isTerminal ? 'DISABLE_SECURITY' : 'Remove Passcode'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );

  // ============================================
  // SCREEN: Passcode Setup (also used for Duress Setup)
  // ============================================
  const renderPasscodeScreen = () => {
    const isDuressScreen = currentScreen === 'duressSetup';
    const passcodeAccent = isDuressScreen ? '#FF9500' : theme.accent;

    const renderDot = (index: number) => {
      const isFilled = index < currentEntry.length;
      return (
        <View
          key={index}
          style={[
            styles.passcodeDot,
            {
              backgroundColor: isFilled ? passcodeAccent : 'transparent',
              borderColor: passcodeError ? '#FF3B30' : (isFilled ? passcodeAccent : 'rgba(255,255,255,0.3)'),
            },
          ]}
        />
      );
    };

    const renderKey = (value: string) => (
      <TouchableOpacity
        key={value}
        style={styles.passcodeKey}
        onPress={() => handlePasscodeKeyPress(value)}
        activeOpacity={0.6}
      >
        <Text style={[styles.passcodeKeyText, { color: theme.text }]}>{value}</Text>
      </TouchableOpacity>
    );

    return (
      <View style={{ flex: 1 }}>
        {/* Header with back button */}
        <View style={styles.subHeader}>
          {passcodeStep !== 'success' && (
            <TouchableOpacity onPress={onGoBack} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color={passcodeAccent} />
              <Text style={[styles.backText, { color: passcodeAccent }]}>Back</Text>
            </TouchableOpacity>
          )}
          {passcodeStep !== 'success' && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressDot, { backgroundColor: passcodeAccent }]} />
              <View style={[styles.progressDot, { backgroundColor: passcodeStep === 'confirm' ? passcodeAccent : 'rgba(255,255,255,0.3)' }]} />
            </View>
          )}
          <View style={{ width: 70 }} />
        </View>

        {/* Title area */}
        <View style={styles.passcodeTitleArea}>
          {passcodeStep === 'success' && (
            <View style={{ marginBottom: 20 }}>
              <Ionicons name="checkmark-circle" size={80} color={passcodeAccent} />
            </View>
          )}
          <Text style={[styles.passcodeTitle, { color: passcodeError ? '#FF3B30' : theme.text }]}>
            {getPasscodeTitle()}
          </Text>
          <Text style={[styles.passcodeSubtitle, { color: theme.subtext }]}>
            {getPasscodeSubtitle()}
          </Text>

          {passcodeStep !== 'success' && (
            <Animated.View style={[styles.dotsContainer, { transform: [{ translateX: shakeAnim }] }]}>
              {[0, 1, 2, 3, 4, 5].map(renderDot)}
            </Animated.View>
          )}
        </View>

        {/* Keypad */}
        {passcodeStep !== 'success' && (
          <View style={styles.keypad}>
            <View style={styles.keyRow}>{['1', '2', '3'].map(renderKey)}</View>
            <View style={styles.keyRow}>{['4', '5', '6'].map(renderKey)}</View>
            <View style={styles.keyRow}>{['7', '8', '9'].map(renderKey)}</View>
            <View style={styles.keyRow}>
              <View style={styles.keyPlaceholder} />
              {renderKey('0')}
              <TouchableOpacity style={styles.deleteKey} onPress={handlePasscodeDelete} activeOpacity={0.6}>
                <Ionicons name="backspace-outline" size={28} color={theme.subtext} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  // ============================================
  // SCREEN: Change Passcode
  // ============================================
  const renderChangePasscodeScreen = () => {
    const renderDot = (index: number) => {
      const isFilled = index < currentEntry.length;
      return (
        <View
          key={index}
          style={[
            styles.passcodeDot,
            {
              backgroundColor: isFilled ? theme.accent : 'transparent',
              borderColor: passcodeError ? '#FF3B30' : (isFilled ? theme.accent : 'rgba(255,255,255,0.3)'),
            },
          ]}
        />
      );
    };

    const renderKey = (value: string) => (
      <TouchableOpacity
        key={value}
        style={styles.passcodeKey}
        onPress={() => handleChangePasscodeKeyPress(value)}
        activeOpacity={0.6}
      >
        <Text style={[styles.passcodeKeyText, { color: theme.text }]}>{value}</Text>
      </TouchableOpacity>
    );

    return (
      <View style={{ flex: 1 }}>
        {/* Header with back button */}
        <View style={styles.subHeader}>
          {changePasscodeStep !== 'success' && (
            <TouchableOpacity onPress={onGoBack} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color={theme.accent} />
              <Text style={[styles.backText, { color: theme.accent }]}>Back</Text>
            </TouchableOpacity>
          )}
          {changePasscodeStep !== 'success' && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressDot, { backgroundColor: theme.accent }]} />
              <View style={[styles.progressDot, { backgroundColor: changePasscodeStep === 'enter' || changePasscodeStep === 'confirm' ? theme.accent : 'rgba(255,255,255,0.3)' }]} />
              <View style={[styles.progressDot, { backgroundColor: changePasscodeStep === 'confirm' ? theme.accent : 'rgba(255,255,255,0.3)' }]} />
            </View>
          )}
          <View style={{ width: 70 }} />
        </View>

        {/* Title area */}
        <View style={styles.passcodeTitleArea}>
          {changePasscodeStep === 'success' && (
            <View style={{ marginBottom: 20 }}>
              <Ionicons name="checkmark-circle" size={80} color={theme.accent} />
            </View>
          )}
          <Text style={[styles.passcodeTitle, { color: passcodeError ? '#FF3B30' : theme.text }]}>
            {getChangePasscodeTitle()}
          </Text>
          <Text style={[styles.passcodeSubtitle, { color: theme.subtext }]}>
            {getChangePasscodeSubtitle()}
          </Text>

          {changePasscodeStep !== 'success' && (
            <Animated.View style={[styles.dotsContainer, { transform: [{ translateX: shakeAnim }] }]}>
              {[0, 1, 2, 3, 4, 5].map(renderDot)}
            </Animated.View>
          )}
        </View>

        {/* Keypad */}
        {changePasscodeStep !== 'success' && (
          <View style={styles.keypad}>
            <View style={styles.keyRow}>{['1', '2', '3'].map(renderKey)}</View>
            <View style={styles.keyRow}>{['4', '5', '6'].map(renderKey)}</View>
            <View style={styles.keyRow}>{['7', '8', '9'].map(renderKey)}</View>
            <View style={styles.keyRow}>
              <View style={styles.keyPlaceholder} />
              {renderKey('0')}
              <TouchableOpacity style={styles.deleteKey} onPress={handleChangePasscodeDelete} activeOpacity={0.6}>
                <Ionicons name="backspace-outline" size={28} color={theme.subtext} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  // ============================================
  // SCREEN: Decoy Preset
  // ============================================
  const renderDecoyPresetScreen = () => {
    const currentPreset = effectiveMode === 'CLASSIFIED' ? classifiedDecoyPreset : hushDecoyPreset;
    const setPreset = effectiveMode === 'CLASSIFIED' ? setClassifiedDecoyPreset : setHushDecoyPreset;

    const decoyTitle = effectiveMode === 'CLASSIFIED'
      ? (theme.isTerminal ? 'Decoy_Protocol' : 'Decoy Protocol')
      : (theme.isTerminal ? 'Decoy_Mode' : 'Decoy Mode');

    const presets: Array<{ value: string; label: string; description: string }> = [
      {
        value: 'AUTO',
        label: 'Auto-generate',
        description: theme.isTerminal
          ? 'RANDOMLY_GENERATED_INNOCENT_QUERIES'
          : 'Randomly generated innocent queries'
      },
      {
        value: 'STUDY_HELPER',
        label: 'Study Helper',
        description: theme.isTerminal
          ? 'ACADEMIC_QUESTIONS_AND_LEARNING'
          : 'Academic questions and learning'
      },
      {
        value: 'MEAL_PLANNING',
        label: 'Meal Planning',
        description: theme.isTerminal
          ? 'RECIPES_AND_GROCERY_LISTS'
          : 'Recipes and grocery lists'
      },
      {
        value: 'GENERAL_ASSISTANT',
        label: 'General Assistant',
        description: theme.isTerminal
          ? 'WEATHER_GIFTS_HOW_TO_QUESTIONS'
          : 'Weather, gifts, how-to questions'
      },
    ];

    return (
      <View style={{ flex: 1 }}>
        <SettingsSubHeader title={decoyTitle} onBack={onGoBack} theme={theme} />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.description, { color: theme.subtext, fontFamily: theme.fontBody, marginBottom: 24 }]}>
            {theme.isTerminal
              ? 'DISPLAYED_ON_DURESS_CODE_ENTRY.'
              : 'Choose what appears when you enter your duress code. This content will look real but protect your actual conversations.'}
          </Text>

          <View style={styles.column}>
            {presets.map((preset) => (
              <TouchableOpacity
                key={preset.value}
                onPress={() => {
                  Haptics.selectionAsync();
                  setPreset(preset.value as any);
                }}
                style={[
                  styles.presetOption,
                  {
                    backgroundColor: currentPreset === preset.value ? theme.card : 'transparent',
                    borderColor: currentPreset === preset.value ? theme.accent : theme.divider,
                    borderWidth: currentPreset === preset.value ? 2 : 1,
                  }
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[
                    styles.presetLabel,
                    {
                      color: currentPreset === preset.value ? theme.accent : theme.text,
                      fontFamily: theme.fontBody,
                      fontWeight: currentPreset === preset.value ? '600' : '400',
                    }
                  ]}>
                    {theme.isTerminal ? preset.label.toUpperCase().replace(/ /g, '_') : preset.label}
                  </Text>
                  <Text style={[
                    styles.presetDescription,
                    {
                      color: theme.subtext,
                      fontFamily: theme.fontBody,
                      marginTop: 4,
                    }
                  ]}>
                    {preset.description}
                  </Text>
                </View>
                {currentPreset === preset.value && (
                  <Ionicons name="checkmark-circle" size={24} color={theme.accent} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Info box */}
          <View style={[styles.infoBox, { backgroundColor: theme.card, borderColor: theme.divider, marginTop: 24 }]}>
            <Ionicons name="information-circle" size={20} color={theme.accent} />
            <Text style={[styles.infoText, { color: theme.subtext, fontFamily: theme.fontBody, marginLeft: 12, flex: 1 }]}>
              {theme.isTerminal
                ? 'DECOY CONTENT ACTIVATES ON DURESS CODE. APPEARS IDENTICAL TO REAL MODE.'
                : 'When you enter your duress code, this content appears instead of your real conversations. It looks identical to the real interface.'}
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  };

  // ============================================
  // RENDER ROUTER
  // ============================================
  if (currentScreen === 'security') {
    return renderSecurityScreen();
  } else if (currentScreen === 'passcodeSetup' || currentScreen === 'duressSetup') {
    return renderPasscodeScreen();
  } else if (currentScreen === 'changePasscode') {
    return renderChangePasscodeScreen();
  } else if (currentScreen === 'decoyPreset') {
    return renderDecoyPresetScreen();
  }

  return null;
};

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  securityContainer: {
    gap: 8,
  },
  securityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
  },
  securityRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  navIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  navLabel: { fontSize: 16, fontWeight: '500' },
  navSublabel: { fontSize: 13, marginTop: 2 },
  infoLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    paddingHorizontal: 4,
  },
  infoLinkText: { fontSize: 14 },
  dangerLink: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 12,
  },
  dangerLinkText: { fontSize: 16, fontWeight: '600' },
  column: { gap: 8 },
  description: { fontSize: 14, lineHeight: 20 },
  presetOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  presetLabel: { fontSize: 16 },
  presetDescription: { fontSize: 13 },
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoText: { fontSize: 13, lineHeight: 18 },
  // Passcode screen styles
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: 16, fontWeight: '500' },
  progressContainer: { flexDirection: 'row', gap: 8 },
  progressDot: { width: 8, height: 8, borderRadius: 4 },
  passcodeTitleArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  passcodeTitle: { fontSize: 24, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  passcodeSubtitle: { fontSize: 15, textAlign: 'center', marginBottom: 40 },
  dotsContainer: { flexDirection: 'row', gap: 16 },
  passcodeDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  keypad: { paddingBottom: 40 },
  keyRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginBottom: 16 },
  passcodeKey: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  passcodeKeyText: { fontSize: 30, fontWeight: '300' },
  deleteKey: {
    width: 76,
    height: 76,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyPlaceholder: { width: 76, height: 76 },
});
