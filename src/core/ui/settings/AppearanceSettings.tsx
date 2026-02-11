/**
 * AppearanceSettings
 *
 * Handles Appearance, Clear Style (burn animations), and Response Style screens.
 * Includes theme preview timeout logic for Pro themes on Free tier.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useChatStore } from '../../state/rootStore';
import type {
  AppFlavor,
  HushTheme,
  ClassifiedTheme,
  DiscretionTheme,
  HushBurnType,
  ClassifiedBurnType,
  ResponseStyleHush,
  ResponseStyleClassified,
  ResponseStyleDiscretion,
} from '../../state/types';
import {
  HUSH_THEMES,
  CLASSIFIED_THEMES,
  getHushThemeNames,
  getClassifiedThemeNames,
  type AppTheme,
} from '../../themes/themes';
import { SettingsSubHeader } from './shared/SettingsSubHeader';
import { SettingsToggleRow } from './shared/SettingsToggleRow';
import type { SettingsTheme } from '../../themes/settingsThemeEngine';
import { getClassifiedSelectedBg } from '../../themes/themeHelpers';
import type { AppearanceScreen } from './shared/types';

interface AppearanceSettingsProps {
  currentScreen: AppearanceScreen;
  onGoBack: () => void;
  onClose: () => void;
  effectiveMode: AppFlavor | 'BLOCKER';
  theme: SettingsTheme;
  isPro: boolean;
}

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
  currentScreen,
  onGoBack,
  onClose,
  effectiveMode,
  theme,
  isPro,
}) => {
  // SELECTIVE SUBSCRIPTIONS - Only appearance-related fields (~12 fields vs 35+)
  const hushTheme = useChatStore((state) => state.hushTheme);
  const setHushTheme = useChatStore((state) => state.setHushTheme);
  const classifiedTheme = useChatStore((state) => state.classifiedTheme);
  const setClassifiedTheme = useChatStore((state) => state.setClassifiedTheme);

  const hushBurnStyle = useChatStore((state) => state.hushBurnStyle);
  const setHushBurnStyle = useChatStore((state) => state.setHushBurnStyle);
  const classifiedBurnStyle = useChatStore((state) => state.classifiedBurnStyle);
  const setClassifiedBurnStyle = useChatStore((state) => state.setClassifiedBurnStyle);

  const quickTransition = useChatStore((state) => state.quickTransition);
  const setQuickTransition = useChatStore((state) => state.setQuickTransition);
  const highContrastMode = useChatStore((state) => state.highContrastMode);
  const setHighContrastMode = useChatStore((state) => state.setHighContrastMode);
  const animationSounds = useChatStore((state) => state.animationSounds);
  const setAnimationSounds = useChatStore((state) => state.setAnimationSounds);
  const animationSoundsPro = useChatStore((state) => state.animationSoundsPro);
  const setAnimationSoundsPro = useChatStore((state) => state.setAnimationSoundsPro);
  const discoveryHintsEnabled = useChatStore((state) => state.discoveryHintsEnabled);
  const setDiscoveryHintsEnabled = useChatStore((state) => state.setDiscoveryHintsEnabled);
  const classifiedDiscovered = useChatStore((state) => state.classifiedDiscovered);

  const responseStyleHush = useChatStore((state) => state.responseStyleHush);
  const setResponseStyleHush = useChatStore((state) => state.setResponseStyleHush);
  const responseStyleClassified = useChatStore((state) => state.responseStyleClassified);
  const setResponseStyleClassified = useChatStore((state) => state.setResponseStyleClassified);
  const responseStyleDiscretion = useChatStore((state) => state.responseStyleDiscretion);
  const setResponseStyleDiscretion = useChatStore((state) => state.setResponseStyleDiscretion);

  const triggerPaywall = useChatStore((state) => state.triggerPaywall);

  /**
   * Theme Preview State (Pro Theme Preview Flow)
   *
   * When a free-tier user taps a Pro-locked theme, we apply it immediately for 5 seconds
   * so they can explore different screens and see how the theme looks in context.
   * After 5 seconds, we revert to the free theme, close settings, and show the paywall.
   *
   * IMPORTANT: Preview timeout is NOT cleaned up on screen navigation - this is intentional!
   * We want users to navigate around (main → appearance → other screens) to evaluate the theme
   * before being prompted to upgrade. The timeout only clears on unmount (modal close).
   */
  const [previewTheme, setPreviewTheme] = useState<HushTheme | ClassifiedTheme | null>(null);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Theme selection with Pro preview and paywall
  const handleThemeSelect = useCallback(
    (
      themeName: HushTheme | ClassifiedTheme,
      themeData: AppTheme,
      isHush: boolean
    ) => {
    // Clear any existing preview timeout
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }

    // If Pro or theme is free, apply immediately
    if (isPro || !themeData.isPro) {
      Haptics.selectionAsync();
      if (isHush) {
        setHushTheme(themeName as HushTheme);
      } else {
        setClassifiedTheme(themeName as ClassifiedTheme);
      }
      setPreviewTheme(null);
      return;
    }

    // Theme is locked (Pro-only) and user is free tier
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Apply preview for 5 seconds
    setPreviewTheme(themeName);
    if (isHush) {
      setHushTheme(themeName as HushTheme);
    } else {
      setClassifiedTheme(themeName as ClassifiedTheme);
    }

    // After 5 seconds, revert to previous theme and show paywall
    previewTimeoutRef.current = setTimeout(() => {
      // Revert to free theme
      if (isHush) {
        setHushTheme('DEFAULT');
      } else {
        setClassifiedTheme('TERMINAL_RED');
      }
      setPreviewTheme(null);

      // Close Settings FIRST, then show paywall after animation completes
      onClose();

      // Wait for Settings modal close animation (300ms) before showing paywall
      setTimeout(() => {
        triggerPaywall('feature_locked_theme');
      }, 400);
    }, 5000);
  },
  [isPro, setHushTheme, setClassifiedTheme, setPreviewTheme, onClose, triggerPaywall]
);

  /**
   * DO NOT clean up preview timeout on component unmount
   *
   * CRITICAL: The preview timeout must continue running even after the Settings modal closes.
   * This allows the theme reversion and paywall to trigger after the user exits Settings.
   * The timeout is only cleared when:
   * 1. User selects a different theme (cleared in handleThemeSelect)
   * 2. User upgrades to Pro (timeout completes, theme becomes permanent)
   * 3. Timeout completes (auto-clears after reversion)
   *
   * Previous bug: Cleanup on unmount prevented theme reversion, causing locked themes to persist.
   */
  // NOTE: No useEffect cleanup - intentionally let timeout run to completion

  // ============================================
  // SCREEN: Appearance
  // ============================================
  const renderAppearanceScreen = () => {
    const isHushMode = effectiveMode === 'HUSH';
    const isClassifiedMode = effectiveMode === 'CLASSIFIED' || effectiveMode === 'BLOCKER';

    return (
      <View style={{ flex: 1 }}>
        <SettingsSubHeader
          title={theme.isTerminal ? 'Display_Config' : 'Appearance'}
          onBack={onGoBack}
          theme={theme}
        />

        <ScrollView contentContainerStyle={styles.content}>
          {/* THEME SELECTOR */}
          {(isHushMode || isClassifiedMode) && (
            <View style={[styles.section, { marginBottom: 24 }]}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.subtext, fontFamily: theme.fontHeader },
                ]}
              >
                {theme.isTerminal ? 'VISUAL_THEME' : 'Theme'}
              </Text>
              <View style={styles.column}>
                {isHushMode &&
                  getHushThemeNames().map((themeName) => {
                    const themeData = HUSH_THEMES[themeName];
                    const isSelected = hushTheme === themeName;
                    const isLocked = !isPro && themeData.isPro;
                    return (
                      <TouchableOpacity
                        key={themeName}
                        onPress={() => handleThemeSelect(themeName, themeData, true)}
                        style={[
                          styles.optionBtn,
                          {
                            borderColor: isSelected ? theme.accent : 'transparent',
                            backgroundColor: isSelected ? 'rgba(139, 92, 246, 0.2)' : theme.card,
                            borderWidth: isSelected ? 2 : 0,
                            opacity: isLocked ? 0.6 : 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            {
                              color: isSelected ? theme.accent : theme.text,
                              fontFamily: theme.fontBody,
                            },
                          ]}
                        >
                          {themeData.displayName}
                        </Text>
                        {isLocked && (
                          <Ionicons
                            name="lock-closed"
                            size={14}
                            color={theme.subtext}
                            style={{ marginLeft: 6 }}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                {isClassifiedMode &&
                  getClassifiedThemeNames().map((themeName) => {
                    const themeData = CLASSIFIED_THEMES[themeName];
                    const isSelected = classifiedTheme === themeName;
                    const isLocked = !isPro && themeData.isPro;
                    return (
                      <TouchableOpacity
                        key={themeName}
                        onPress={() => handleThemeSelect(themeName, themeData, false)}
                        style={[
                          styles.optionBtn,
                          {
                            borderColor: isSelected ? theme.accent : 'transparent',
                            backgroundColor: isSelected
                              ? getClassifiedSelectedBg(effectiveMode, classifiedTheme)
                              : theme.card,
                            borderWidth: isSelected ? 2 : 0,
                            opacity: isLocked ? 0.6 : 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            {
                              color: isSelected ? theme.accent : theme.text,
                              fontFamily: theme.fontBody,
                            },
                          ]}
                        >
                          [ {themeData.displayName.toUpperCase()} ]
                        </Text>
                        {isLocked && (
                          <Ionicons
                            name="lock-closed"
                            size={14}
                            color={theme.subtext}
                            style={{ marginLeft: 6 }}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
              </View>
            </View>
          )}

          {/* TOGGLES */}
          <View style={styles.toggleContainer}>
            {classifiedDiscovered && (
              <SettingsToggleRow
                label={theme.isTerminal ? 'QUICK_TRANSITION' : 'Quick Transition'}
                value={quickTransition}
                onToggle={setQuickTransition}
                theme={theme}
              />
            )}
            {isPro && !classifiedDiscovered && (
              <SettingsToggleRow
                label={
                  theme.isTerminal ? 'Hidden_Features_Discovery' : 'Hidden Features Discovery'
                }
                value={discoveryHintsEnabled}
                onToggle={setDiscoveryHintsEnabled}
                theme={theme}
              />
            )}
            <SettingsToggleRow
              label={theme.isTerminal ? 'HIGH_CONTRAST_MODE' : 'High Contrast Mode'}
              value={highContrastMode}
              onToggle={setHighContrastMode}
              theme={theme}
            />
          </View>
          {((classifiedDiscovered && quickTransition) ||
            (isPro && !classifiedDiscovered && discoveryHintsEnabled) ||
            highContrastMode) && (
            <Text
              style={[
                styles.explainer,
                { color: theme.subtext, fontFamily: theme.fontBody },
              ]}
            >
              {theme.isTerminal
                ? (classifiedDiscovered && quickTransition
                    ? '0.5S VS 1.8S WHEN ACCESSING CLASSIFIED FROM HUSH. '
                    : '') +
                  (isPro && !classifiedDiscovered && discoveryHintsEnabled
                    ? 'HIDDEN_FEATURES_DISCOVERY: ENABLE PROGRESSIVE HINTS FOR PRO EASTER EGGS. '
                    : '') +
                  (highContrastMode
                    ? 'INCREASES_OPACITY_AND_BORDERS_FOR_WCAG_AA_COMPLIANCE.'
                    : '')
                : (classifiedDiscovered && quickTransition
                    ? 'Quick Transition shortens mode-switching. '
                    : '') +
                  (isPro && !classifiedDiscovered && discoveryHintsEnabled
                    ? 'Hidden Features Discovery enables progressive hints for Pro easter eggs. '
                    : '') +
                  (highContrastMode
                    ? 'Increases opacity and borders for better visibility (WCAG AA compliance).'
                    : '')}
            </Text>
          )}
        </ScrollView>
      </View>
    );
  };

  // ============================================
  // SCREEN: Clear Style (Burn Animations)
  // ============================================
  const renderClearStyleScreen = () => {
    const isHush = effectiveMode === 'HUSH';
    const hushOptions: { label: string; value: HushBurnType }[] = [
      { label: 'Clear', value: 'clear' }, // FREE (index 0) - NEW DEFAULT
      { label: 'Dissolve', value: 'dissolve' }, // FREE (index 1)
      { label: 'Disintegration', value: 'disintegrate' }, // PRO (index 2)
      { label: 'Ripple', value: 'ripple' }, // PRO (index 3)
      { label: 'Rain', value: 'rain' }, // PRO (index 4)
    ];
    const classifiedOptions: { label: string; value: ClassifiedBurnType }[] = [
      { label: 'CLS', value: 'cls' }, // NEW (index 0) - Terminal clear screen
      { label: 'Corruption', value: 'corruption' }, // Alpha order (index 1)
      { label: 'Matrix', value: 'matrix' }, // Alpha order (index 2)
      { label: 'Terminal Purge', value: 'purge' }, // Alpha order (index 3)
      { label: 'Redaction Sweep', value: 'redaction' }, // Alpha order (index 4)
    ];

    return (
      <View style={{ flex: 1 }}>
        <SettingsSubHeader
          title={
            isHush
              ? 'Clear Style'
              : theme.isTerminal
              ? 'Burn_Protocol'
              : 'Burn Protocol'
          }
          onBack={onGoBack}
          theme={theme}
        />

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.column}>
            {isHush ? (
              <>
                {/* SECTION 1: Free Tier Animations */}
                <View style={{ marginBottom: 16 }}>
                  {hushOptions.slice(0, 2).map((opt) => (
                    <React.Fragment key={opt.value}>
                      <TouchableOpacity
                        style={[
                          styles.styleOption,
                          {
                            backgroundColor: theme.card,
                            borderColor: hushBurnStyle === opt.value ? theme.accent : 'transparent',
                            borderWidth: hushBurnStyle === opt.value ? 2 : 0,
                            marginBottom: 8,
                          },
                        ]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setHushBurnStyle(opt.value);
                        }}
                      >
                        <Text
                          style={[
                            styles.styleLabel,
                            { color: hushBurnStyle === opt.value ? theme.accent : theme.text },
                          ]}
                        >
                          {opt.label}
                        </Text>
                        {hushBurnStyle === opt.value && (
                          <Ionicons name="checkmark-circle" size={22} color={theme.accent} />
                        )}
                      </TouchableOpacity>
                      {/* Dissolve silent hint */}
                      {opt.value === 'dissolve' && hushBurnStyle === 'dissolve' && (
                        <Text
                          style={{
                            fontSize: 13,
                            color: theme.subtext,
                            textAlign: 'center',
                            marginTop: 8,
                            marginBottom: 12,
                            fontStyle: 'italic',
                          }}
                        >
                          Dissolve is intentionally silent
                        </Text>
                      )}
                    </React.Fragment>
                  ))}
                </View>

                {/* SECTION DIVIDER: Sound Toggle (Pro) or CTA Button (Free) */}
                {isPro ? (
                  <View style={{ marginVertical: 16 }}>
                    <SettingsToggleRow
                      label={
                        theme.isTerminal ? 'ANIMATION_SOUND_EFFECTS' : 'Animation Sound Effects'
                      }
                      value={animationSoundsPro}
                      onToggle={(val) => {
                        setAnimationSoundsPro(val);
                        setAnimationSounds(val); // Keep system-wide toggle in sync
                      }}
                      theme={theme}
                    />
                    <Text
                      style={[
                        styles.explainer,
                        { color: theme.subtext, fontFamily: theme.fontBody, marginTop: 12 },
                      ]}
                    >
                      {theme.isTerminal
                        ? animationSoundsPro
                          ? 'SOUND ENABLED FOR DISINTEGRATION, RIPPLE, AND RAIN'
                          : 'ALL ANIMATIONS SILENT'
                        : animationSoundsPro
                        ? 'Sound enabled for Disintegration, Ripple, and Rain'
                        : 'All animations silent'}
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      onClose();
                      setTimeout(() => {
                        // CTA button - bypasses frequency cap (high intent action)
                        useChatStore.setState({
                          showPaywall: true,
                          paywallReason: null,
                        });
                      }, 400);
                    }}
                    style={{
                      marginVertical: 16,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: theme.accent + '50',
                      backgroundColor: theme.accent + '10',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: theme.fontBody,
                        fontSize: 14,
                        color: theme.accent,
                        textAlign: 'center',
                        fontWeight: '600',
                      }}
                    >
                      Unlock 3 more styles with sound
                    </Text>
                  </TouchableOpacity>
                )}

                {/* SECTION 2: Pro Tier Animations */}
                <View style={{ marginBottom: 16 }}>
                  {hushOptions.slice(2).map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.styleOption,
                        {
                          backgroundColor: theme.card,
                          borderColor: hushBurnStyle === opt.value ? theme.accent : 'transparent',
                          borderWidth: hushBurnStyle === opt.value ? 2 : 0,
                          opacity: !isPro ? 0.5 : 1,
                          marginBottom: 8,
                        },
                      ]}
                      onPress={() => {
                        if (isPro) {
                          Haptics.selectionAsync();
                          setHushBurnStyle(opt.value);
                        } else {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          onClose();
                          setTimeout(() => {
                            triggerPaywall('feature_locked_clear_style');
                          }, 400);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.styleLabel,
                          { color: hushBurnStyle === opt.value ? theme.accent : theme.text },
                        ]}
                      >
                        {opt.label}
                      </Text>
                      {hushBurnStyle === opt.value && isPro && (
                        <Ionicons name="checkmark-circle" size={22} color={theme.accent} />
                      )}
                      {!isPro && (
                        <Ionicons name="lock-closed" size={16} color={theme.subtext} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : (
              <>
                {/* Classified Animations - CLS (silent) */}
                {classifiedOptions.slice(0, 1).map((opt) => (
                  <React.Fragment key={opt.value}>
                    <TouchableOpacity
                      style={[
                        styles.styleOption,
                        {
                          backgroundColor: theme.card,
                          borderColor:
                            classifiedBurnStyle === opt.value ? theme.accent : 'transparent',
                          borderWidth: classifiedBurnStyle === opt.value ? 2 : 0,
                          marginBottom: 8,
                        },
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setClassifiedBurnStyle(opt.value);
                      }}
                    >
                      <Text
                        style={[
                          styles.styleLabel,
                          {
                            color: classifiedBurnStyle === opt.value ? theme.accent : theme.text,
                            fontFamily: theme.fontBody,
                          },
                        ]}
                      >
                        {theme.isTerminal ? opt.label.toUpperCase().replace(/ /g, '_') : opt.label}
                      </Text>
                      {classifiedBurnStyle === opt.value && (
                        <Ionicons name="checkmark-circle" size={22} color={theme.accent} />
                      )}
                    </TouchableOpacity>
                    {/* CLS silent hint */}
                    {opt.value === 'cls' && classifiedBurnStyle === 'cls' && (
                      <Text
                        style={{
                          fontSize: 13,
                          color: theme.subtext,
                          textAlign: 'center',
                          marginTop: 8,
                          marginBottom: 12,
                          fontStyle: 'italic',
                          fontFamily: theme.fontBody,
                        }}
                      >
                        {theme.isTerminal
                          ? 'CLS IS INTENTIONALLY SILENT'
                          : 'CLS is intentionally silent'}
                      </Text>
                    )}
                  </React.Fragment>
                ))}

                {/* Animation Sound Effects Toggle - Between silent and sound animations */}
                <View style={{ marginVertical: 16 }}>
                  <SettingsToggleRow
                    label={theme.isTerminal ? 'ANIMATION_SOUND_EFFECTS' : 'Animation Sound Effects'}
                    value={animationSoundsPro}
                    onToggle={(val) => {
                      setAnimationSoundsPro(val);
                      setAnimationSounds(val); // Keep system-wide toggle in sync
                    }}
                    theme={theme}
                  />
                  <Text
                    style={[
                      styles.explainer,
                      { color: theme.subtext, fontFamily: theme.fontBody, marginTop: 12 },
                    ]}
                  >
                    {theme.isTerminal
                      ? animationSoundsPro
                        ? 'SOUND ENABLED FOR CORRUPTION, MATRIX, PURGE, AND REDACTION'
                        : 'ALL ANIMATIONS SILENT'
                      : animationSoundsPro
                      ? 'Sound enabled for Corruption, Matrix, Purge, and Redaction'
                      : 'All animations silent'}
                  </Text>
                </View>

                {/* Classified Animations - Sound-capable (Corruption, Matrix, Purge, Redaction) */}
                {classifiedOptions.slice(1).map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.styleOption,
                      {
                        backgroundColor: theme.card,
                        borderColor:
                          classifiedBurnStyle === opt.value ? theme.accent : 'transparent',
                        borderWidth: classifiedBurnStyle === opt.value ? 2 : 0,
                        marginBottom: 8,
                      },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setClassifiedBurnStyle(opt.value);
                    }}
                  >
                    <Text
                      style={[
                        styles.styleLabel,
                        {
                          color: classifiedBurnStyle === opt.value ? theme.accent : theme.text,
                          fontFamily: theme.fontBody,
                        },
                      ]}
                    >
                      {theme.isTerminal ? opt.label.toUpperCase().replace(/ /g, '_') : opt.label}
                    </Text>
                    {classifiedBurnStyle === opt.value && (
                      <Ionicons name="checkmark-circle" size={22} color={theme.accent} />
                    )}
                  </TouchableOpacity>
                ))}
              </>
            )}
          </View>
        </ScrollView>
      </View>
    );
  };

  // ============================================
  // SCREEN: Response Style
  // ============================================
  const renderResponseStyleScreen = () => {
    if (effectiveMode === 'HUSH') {
      const options: { label: string; value: ResponseStyleHush; description: string }[] = [
        { label: 'Quick', value: 'quick', description: 'Short, fast responses (1-2 sentences)' },
        { label: 'Thoughtful', value: 'thoughtful', description: 'Nuanced, contextual answers' },
      ];
      return (
        <View style={{ flex: 1 }}>
          <SettingsSubHeader
            title={theme.isTerminal ? 'Response_Mode' : 'Response Style'}
            onBack={onGoBack}
            theme={theme}
          />
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.column}>
              {options.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.styleOption,
                    {
                      backgroundColor: theme.card,
                      borderColor: responseStyleHush === opt.value ? theme.accent : 'transparent',
                      borderWidth: responseStyleHush === opt.value ? 2 : 0,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setResponseStyleHush(opt.value);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.styleLabel,
                        { color: responseStyleHush === opt.value ? theme.accent : theme.text },
                      ]}
                    >
                      {theme.isTerminal ? opt.label.toUpperCase() : opt.label}
                    </Text>
                    <Text style={[styles.navSublabel, { color: theme.subtext, marginTop: 4 }]}>
                      {theme.isTerminal ? opt.description.toUpperCase() : opt.description}
                    </Text>
                  </View>
                  {responseStyleHush === opt.value && (
                    <Ionicons name="checkmark-circle" size={22} color={theme.accent} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      );
    } else if (effectiveMode === 'CLASSIFIED' || effectiveMode === 'BLOCKER') {
      const options: { label: string; value: ResponseStyleClassified; description: string }[] = [
        { label: 'Operator', value: 'operator', description: 'Direct, action-oriented intel' },
        { label: 'Analyst', value: 'analyst', description: 'Strategic context & assessment' },
      ];
      return (
        <View style={{ flex: 1 }}>
          <SettingsSubHeader
            title={theme.isTerminal ? 'Response_Mode' : 'Response Style'}
            onBack={onGoBack}
            theme={theme}
          />
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.column}>
              {options.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.styleOption,
                    {
                      backgroundColor: theme.card,
                      borderColor:
                        responseStyleClassified === opt.value ? theme.accent : 'transparent',
                      borderWidth: responseStyleClassified === opt.value ? 2 : 0,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setResponseStyleClassified(opt.value);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.styleLabel,
                        {
                          color: responseStyleClassified === opt.value ? theme.accent : theme.text,
                          fontFamily: theme.fontBody,
                        },
                      ]}
                    >
                      {theme.isTerminal ? opt.label.toUpperCase() : opt.label}
                    </Text>
                    <Text
                      style={[
                        styles.navSublabel,
                        { color: theme.subtext, marginTop: 4, fontFamily: theme.fontBody },
                      ]}
                    >
                      {theme.isTerminal
                        ? opt.description.toUpperCase().replace(/ /g, '_')
                        : opt.description}
                    </Text>
                  </View>
                  {responseStyleClassified === opt.value && (
                    <Ionicons name="checkmark-circle" size={22} color={theme.accent} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      );
    } else {
      // DISCRETION
      const options: { label: string; value: ResponseStyleDiscretion; description: string }[] = [
        { label: 'Warm', value: 'warm', description: 'Professional with personality' },
        { label: 'Formal', value: 'formal', description: 'Precise and authoritative' },
      ];
      return (
        <View style={{ flex: 1 }}>
          <SettingsSubHeader title="Response Style" onBack={onGoBack} theme={theme} />
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.column}>
              {options.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.styleOption,
                    {
                      backgroundColor: theme.card,
                      borderColor:
                        responseStyleDiscretion === opt.value ? theme.accent : 'transparent',
                      borderWidth: responseStyleDiscretion === opt.value ? 2 : 0,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setResponseStyleDiscretion(opt.value);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.styleLabel,
                        {
                          color: responseStyleDiscretion === opt.value ? theme.accent : theme.text,
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    <Text style={[styles.navSublabel, { color: theme.subtext, marginTop: 4 }]}>
                      {opt.description}
                    </Text>
                  </View>
                  {responseStyleDiscretion === opt.value && (
                    <Ionicons name="checkmark-circle" size={22} color={theme.accent} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      );
    }
  };

  // Render appropriate screen
  if (currentScreen === 'appearance') {
    return renderAppearanceScreen();
  } else if (currentScreen === 'clearStyle') {
    return renderClearStyleScreen();
  } else if (currentScreen === 'responseStyle') {
    return renderResponseStyleScreen();
  }

  return null;
};

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  column: {
    gap: 8,
  },
  optionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '500',
  },
  toggleContainer: {
    gap: 8,
  },
  explainer: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
  },
  styleOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  styleLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  navSublabel: {
    fontSize: 13,
  },
});
