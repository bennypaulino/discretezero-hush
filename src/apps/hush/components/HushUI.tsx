// src/apps/hush/components/HushUI.tsx
// Hush Component Library - soft, circular, therapeutic design language
// Mirrors ClassifiedUI.tsx but with Hush's gentle aesthetic

import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useChatStore } from '../../../core/state/rootStore';
import { HUSH_THEMES } from '../../../core/themes/themes';

// ============================================
// WCAG ACCESSIBILITY HELPERS
// ============================================

/**
 * Calculate relative luminance according to WCAG formula
 * https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
const getRelativeLuminance = (hex: string): number => {
  const rgb = hex.replace('#', '');
  const r = parseInt(rgb.substr(0, 2), 16) / 255;
  const g = parseInt(rgb.substr(2, 2), 16) / 255;
  const b = parseInt(rgb.substr(4, 2), 16) / 255;

  const rsRGB = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gsRGB = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bsRGB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  return 0.2126 * rsRGB + 0.7152 * gsRGB + 0.0722 * bsRGB;
};

/**
 * Calculate contrast ratio between two colors according to WCAG formula
 * https://www.w3.org/WAI/GL/wiki/Contrast_ratio
 */
const getContrastRatio = (color1: string, color2: string): number => {
  const l1 = getRelativeLuminance(color1);
  const l2 = getRelativeLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Get WCAG-compliant text color (black or white) for given background
 * Ensures minimum 4.5:1 contrast ratio (WCAG AA for normal text)
 */
const getAccessibleTextColor = (backgroundColor: string): string => {
  const blackContrast = getContrastRatio(backgroundColor, '#000000');
  const whiteContrast = getContrastRatio(backgroundColor, '#FFFFFF');

  // WCAG AA requires 4.5:1 for normal text
  // If black meets threshold and has higher contrast, use black
  // Otherwise use white
  if (blackContrast >= 4.5 && blackContrast > whiteContrast) {
    return '#000000';
  }
  return '#FFFFFF';
};

// ============================================
// HUSH CLOSE BUTTON
// ============================================
// Circular close button with soft, therapeutic aesthetic
// Perfect circle background (contrast with Classified's borderRadius: 8)
//
// Usage:
//   <HushCloseButton onClose={handleClose} />
//
// Props:
//   - onClose: () => void (required)
//   - iconColor: string (optional, defaults to white)
//   - backgroundColor: string (optional, defaults to semi-transparent dark)

interface HushCloseButtonProps {
  onClose: () => void;
  iconColor?: string;
  backgroundColor?: string;
}

export const HushCloseButton = ({
  onClose,
  iconColor = '#FFFFFF',
  backgroundColor = 'rgba(255, 255, 255, 0.1)',
}: HushCloseButtonProps) => (
  <TouchableOpacity
    onPress={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onClose();
    }}
    style={{
      width: 40,
      height: 40,
      borderRadius: 20, // Perfect circle (half of width/height)
      backgroundColor,
      alignItems: 'center',
      justifyContent: 'center',
    }}
    accessibilityLabel="Close"
    accessibilityRole="button"
    accessibilityHint="Return to previous screen"
  >
    <Ionicons name="close" size={20} color={iconColor} />
  </TouchableOpacity>
);

// ============================================
// HUSH BUTTON
// ============================================
// WCAG-compliant button component with theme-aware styling
// Primary: Filled with theme accent color
// Secondary: Outlined with theme accent color
//
// WCAG Compliance:
// - Minimum touch target: 44x44 (paddingVertical: 16 ensures 50+ height)
// - Color contrast: WCAG AA 4.5:1 for text (calculated dynamically)
// - Accessibility: Full screen reader support with labels, hints, states
// - Haptic feedback: Built-in tactile response
// - Visual states: Disabled, loading, pressed
//
// Usage:
//   <HushButton variant="primary" onPress={handleSubmit}>
//     Continue
//   </HushButton>
//
//   <HushButton variant="secondary" onPress={handleCancel} icon="arrow-back">
//     Go Back
//   </HushButton>
//
// Props:
//   - variant: 'primary' | 'secondary' (required)
//   - onPress: () => void (required)
//   - children: string (button text, required)
//   - disabled?: boolean (default: false)
//   - loading?: boolean (default: false, shows spinner)
//   - icon?: Ionicon name (optional)
//   - iconPosition?: 'left' | 'right' (default: 'left')
//   - fullWidth?: boolean (default: false)
//   - accessibilityLabel?: string (defaults to children)
//   - accessibilityHint?: string (optional, describes what happens on press)
//   - testID?: string (for testing)

interface HushButtonProps {
  variant: 'primary' | 'secondary';
  onPress: () => void;
  children: string;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

export const HushButton: React.FC<HushButtonProps> = ({
  variant,
  onPress,
  children,
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
}) => {
  const { hushTheme } = useChatStore();
  const themeData = HUSH_THEMES[hushTheme] || HUSH_THEMES.DEFAULT;
  const accentColor = themeData.colors.primary;

  // Calculate WCAG-compliant text color for primary button
  const primaryTextColor = getAccessibleTextColor(accentColor);

  // Determine if button is interactable
  const isDisabled = disabled || loading;

  const handlePress = () => {
    if (!isDisabled) {
      Haptics.impactAsync(
        variant === 'primary'
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light
      );
      onPress();
    }
  };

  // Button styles based on variant
  const buttonStyle = [
    styles.button,
    variant === 'primary' && {
      backgroundColor: accentColor,
    },
    variant === 'secondary' && {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: accentColor,
    },
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
  ];

  const textStyle = [
    styles.text,
    variant === 'primary' && { color: primaryTextColor },
    variant === 'secondary' && { color: accentColor },
    isDisabled && styles.textDisabled,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || children}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled }}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? primaryTextColor : accentColor}
        />
      ) : (
        <View style={styles.buttonContent}>
          {icon && iconPosition === 'left' && (
            <Ionicons
              name={icon}
              size={20}
              color={variant === 'primary' ? primaryTextColor : accentColor}
              style={styles.iconLeft}
            />
          )}
          <Text style={textStyle}>{children}</Text>
          {icon && iconPosition === 'right' && (
            <Ionicons
              name={icon}
              size={20}
              color={variant === 'primary' ? primaryTextColor : accentColor}
              style={styles.iconRight}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

// ============================================
// HUSH SCREEN HEADER
// ============================================
// Standard header component for modals and game screens
// Left: Title + optional subtitle
// Right: Close button
//
// Usage:
//   <HushScreenHeader
//     title="Screen Title"
//     subtitle="Optional subtitle"
//     onClose={handleClose}
//   />
//
//   <HushScreenHeader
//     title="Screen Title"
//     onClose={handleClose}
//     showCloseButton={false}  // Hide close button
//   />
//
// Props:
//   - title: string (required)
//   - subtitle?: string (optional)
//   - onClose?: () => void (required if showCloseButton is true)
//   - showCloseButton?: boolean (default: true)
//   - style?: ViewStyle (optional custom styles)

interface HushScreenHeaderProps {
  title: string;
  subtitle?: string;
  onClose?: () => void;
  showCloseButton?: boolean;
  style?: any;
}

export const HushScreenHeader: React.FC<HushScreenHeaderProps> = ({
  title,
  subtitle,
  onClose,
  showCloseButton = true,
  style,
}) => {
  const { hushTheme } = useChatStore();
  const themeData = HUSH_THEMES[hushTheme] || HUSH_THEMES.DEFAULT;

  const theme = {
    accent: themeData.colors.primary,
    text: '#FFFFFF',
    subtext: 'rgba(255, 255, 255, 0.6)',
    fontHeader: 'System',
    fontBody: 'System',
  };

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 30,
        },
        style,
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: theme.fontHeader,
            fontSize: 28,
            fontWeight: '700',
            color: theme.accent,
            marginBottom: subtitle ? 8 : 0,
          }}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={{
              fontFamily: theme.fontBody,
              fontSize: 14,
              color: theme.subtext,
            }}
          >
            {subtitle}
          </Text>
        )}
      </View>

      {showCloseButton && onClose && <HushCloseButton onClose={onClose} />}
    </View>
  );
};

// ============================================
// HUSH INPUT
// ============================================
// Theme-aware text input component
// Default variant: Standard divider border
// Accent variant: Highlighted accent border (for active/important inputs)
//
// WCAG Compliance:
// - Sufficient color contrast for placeholder and input text
// - Consistent dark keyboard appearance
// - Full accessibility support
//
// Usage:
//   <HushInput
//     value={text}
//     onChangeText={setText}
//     placeholder="Enter text..."
//   />
//
//   <HushInput
//     value={text}
//     onChangeText={setText}
//     placeholder="Message..."
//     variant="accent"
//     multiline
//   />
//
// Props:
//   - value: string (required)
//   - onChangeText: (text: string) => void (required)
//   - placeholder?: string (optional)
//   - variant?: 'default' | 'accent' (default: 'default')
//   - multiline?: boolean (default: false)
//   - autoFocus?: boolean (default: false)
//   - onSubmitEditing?: () => void (optional)
//   - accessibilityLabel?: string (optional)
//   - accessibilityHint?: string (optional)
//   - style?: TextInputStyle (optional custom styles)

interface HushInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  variant?: 'default' | 'accent';
  multiline?: boolean;
  autoFocus?: boolean;
  onSubmitEditing?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: any;
}

export const HushInput: React.FC<HushInputProps> = ({
  value,
  onChangeText,
  placeholder,
  variant = 'default',
  multiline = false,
  autoFocus = false,
  onSubmitEditing,
  accessibilityLabel,
  accessibilityHint,
  style,
}) => {
  const { hushTheme } = useChatStore();
  const themeData = HUSH_THEMES[hushTheme] || HUSH_THEMES.DEFAULT;

  const theme = {
    accent: themeData.colors.primary,
    card: 'rgba(255, 255, 255, 0.12)',
    divider: 'rgba(255, 255, 255, 0.2)',
    text: '#FFFFFF',
    subtext: 'rgba(255, 255, 255, 0.6)',
    fontBody: 'System',
  };

  const inputStyle = {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: variant === 'accent' ? theme.accent : theme.divider,
    borderRadius: 12,
    padding: 16,
    fontFamily: theme.fontBody,
    fontSize: 16,
    color: theme.text,
  };

  return (
    <TextInput
      style={[inputStyle, style]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.subtext}
      keyboardAppearance="dark"
      multiline={multiline}
      autoFocus={autoFocus}
      onSubmitEditing={onSubmitEditing}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      textAlignVertical={multiline ? 'top' : 'center'}
    />
  );
};

// ============================================
// HUSH SHARE BUTTON
// ============================================
// Reusable share button component with native share functionality
// Displays as a card-like button with share icon and custom message
//
// WCAG Compliance:
// - 44x44 minimum touch target (enforced by padding)
// - Haptic feedback on press
// - Full accessibility support
//
// Usage:
//   <HushShareButton
//     message="Share message content"
//     label="Share this with friends"
//   />

interface HushShareButtonProps {
  message: string;
  label: string;
  onShareComplete?: () => void;
  style?: any;
}

export const HushShareButton: React.FC<HushShareButtonProps> = ({
  message,
  label,
  onShareComplete,
  style,
}) => {
  const { hushTheme } = useChatStore();
  const themeData = HUSH_THEMES[hushTheme] || HUSH_THEMES.DEFAULT;

  const theme = {
    accent: themeData.colors.primary,
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        message,
      });
      if (onShareComplete) {
        onShareComplete();
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Share failed:', error);
      }
    }
  };

  return (
    <TouchableOpacity
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: `${theme.accent}10`,
          borderWidth: 1,
          borderColor: `${theme.accent}30`,
          borderRadius: 12,
          padding: 16,
          minHeight: 52,
          gap: 12,
        },
        style,
      ]}
      onPress={handleShare}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Share: ${label}`}
      accessibilityHint="Opens share menu to send this content"
    >
      <Ionicons name="share-social" size={20} color={theme.accent} />
      <Text
        style={{
          fontSize: 15,
          color: theme.accent,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

// ============================================
// HUSH CARD
// ============================================
// Reusable card component with theme-aware styling
// Default: Static card with standard styling
// Interactive: Tappable card with press feedback
// Highlighted: Selected/active state with accent border
//
// WCAG Compliance:
// - Interactive variant: 44x44 minimum touch target (enforced by padding)
// - Haptic feedback for interactive cards
// - Full accessibility support
//
// Usage:
//   <HushCard variant="default">
//     <Text>Card content</Text>
//   </HushCard>
//
//   <HushCard variant="interactive" onPress={handlePress}>
//     <Text>Tappable card</Text>
//   </HushCard>
//
//   <HushCard variant="highlighted">
//     <Text>Selected card</Text>
//   </HushCard>
//
// Props:
//   - variant: 'default' | 'interactive' | 'highlighted' (default: 'default')
//   - children: React.ReactNode (required)
//   - onPress?: () => void (required for interactive variant)
//   - padding?: number (default: 16)
//   - style?: ViewStyle (optional custom styles)
//   - accessibilityLabel?: string (for interactive cards)
//   - accessibilityHint?: string (for interactive cards)

interface HushCardProps {
  variant?: 'default' | 'interactive' | 'highlighted';
  children: React.ReactNode;
  onPress?: () => void;
  padding?: number;
  style?: any;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const HushCard: React.FC<HushCardProps> = ({
  variant = 'default',
  children,
  onPress,
  padding = 16,
  style,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const { hushTheme } = useChatStore();
  const themeData = HUSH_THEMES[hushTheme] || HUSH_THEMES.DEFAULT;

  const theme = {
    background: themeData.colors.background,
    text: '#FFFFFF',
    subtext: 'rgba(255, 255, 255, 0.6)',
    accent: themeData.colors.primary,
    card: 'rgba(255, 255, 255, 0.12)',
    divider: 'rgba(255, 255, 255, 0.2)',
  };

  const baseCardStyle = {
    backgroundColor: variant === 'highlighted' ? `${theme.accent}1A` : theme.card,
    borderWidth: 1,
    borderColor: variant === 'highlighted' ? theme.accent : theme.divider,
    borderRadius: 12,
    padding,
  };

  // If onPress provided, make it interactive (regardless of variant)
  if (onPress) {
    return (
      <TouchableOpacity
        style={[baseCardStyle, style]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
      >
        {children}
      </TouchableOpacity>
    );
  }

  // Static View (no onPress)
  return (
    <View style={[baseCardStyle, style]}>
      {children}
    </View>
  );
};

// ============================================
// HUSH ICON HEADER
// ============================================
// Centered icon + title + optional subtitle header
// Used for completion screens, celebration states, and feature intros
//
// Usage:
//   <HushIconHeader
//     icon="checkmark-circle"
//     title="Ritual Complete"
//   />
//
//   <HushIconHeader
//     icon="trophy"
//     iconSize={72}
//     title="7-Day Streak Complete!"
//     subtitle="You've maintained your practice for a full week"
//     iconColor="#FFD700"
//   />
//
// Props:
//   - icon: Ionicon name (required)
//   - title: string (required)
//   - subtitle?: string (optional)
//   - iconSize?: number (default: 80)
//   - iconColor?: string (optional - defaults to theme accent)
//   - style?: ViewStyle (optional custom styles for container)

interface HushIconHeaderProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  iconSize?: number;
  iconColor?: string;
  style?: any;
}

export const HushIconHeader: React.FC<HushIconHeaderProps> = ({
  icon,
  title,
  subtitle,
  iconSize = 80,
  iconColor,
  style,
}) => {
  const { hushTheme } = useChatStore();
  const themeData = HUSH_THEMES[hushTheme] || HUSH_THEMES.DEFAULT;

  const theme = {
    accent: themeData.colors.primary,
    text: '#FFFFFF',
    subtext: 'rgba(255, 255, 255, 0.6)',
    fontHeader: 'System',
    fontBody: 'System',
  };

  return (
    <View
      style={[
        {
          alignItems: 'center',
          paddingHorizontal: 20,
        },
        style,
      ]}
    >
      <Ionicons
        name={icon}
        size={iconSize}
        color={iconColor || theme.accent}
        style={{ marginBottom: 30 }}
      />

      <Text
        style={{
          fontFamily: theme.fontHeader,
          fontSize: 28,
          fontWeight: '700',
          color: theme.text,
          marginBottom: subtitle ? 16 : 0,
          textAlign: 'center',
        }}
      >
        {title}
      </Text>

      {subtitle && (
        <Text
          style={{
            fontFamily: theme.fontBody,
            fontSize: 16,
            color: theme.subtext,
            textAlign: 'center',
            lineHeight: 24,
          }}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
};

// ============================================
// HUSH BADGE
// ============================================
// Small status badge for tier indicators and feature availability
// Used for showing "Unlimited", "1 per day", "Pro only" status
//
// Usage:
//   <HushBadge text="Unlimited" />
//   <HushBadge text="1 per day" />
//   <HushBadge text="Pro only" showLock />
//
// Props:
//   - text: string (required) - Badge text to display
//   - showLock?: boolean (optional) - Show lock icon after text
//   - style?: ViewStyle (optional custom styles)

interface HushBadgeProps {
  text: string;
  showLock?: boolean;
  style?: any;
}

export const HushBadge: React.FC<HushBadgeProps> = ({
  text,
  showLock = false,
  style,
}) => {
  const { hushTheme } = useChatStore();
  const themeData = HUSH_THEMES[hushTheme] || HUSH_THEMES.DEFAULT;

  const theme = {
    accent: themeData.colors.primary,
    fontBody: 'System',
  };

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 4,
        },
        style,
      ]}
    >
      <Text
        style={{
          fontFamily: theme.fontBody,
          fontSize: 12,
          color: theme.accent,
        }}
      >
        {text}
      </Text>
      {showLock && (
        <Ionicons
          name="lock-closed"
          size={12}
          color={theme.accent}
          style={{ marginLeft: 4 }}
        />
      )}
    </View>
  );
};

// ============================================
// HUSH INFO BOX
// ============================================
// Information box component with icon and text/children
// Supports three semantic variants: info, warning, success
// Can be static (default) or interactive (with onPress)
//
// WCAG Compliance:
// - Interactive variant: 44x44 minimum touch target (enforced by padding)
// - Haptic feedback for interactive boxes
// - Semantic colors with sufficient contrast
// - Full accessibility support
//
// Usage:
//   <HushInfoBox variant="info" icon="information-circle-outline">
//     This is some helpful information
//   </HushInfoBox>
//
//   <HushInfoBox
//     variant="warning"
//     icon="warning-outline"
//     onPress={() => setShowPaywall(true)}
//   >
//     Upgrade to Pro for unlimited access
//   </HushInfoBox>
//
//   <HushInfoBox variant="success" icon="checkmark-circle-outline">
//     <Text>Success message</Text>
//   </HushInfoBox>
//
// Props:
//   - variant: 'info' | 'warning' | 'success' (default: 'info')
//   - icon: Ionicon name (required)
//   - iconSize?: number (default: 16)
//   - children: React.ReactNode (required)
//   - onPress?: () => void (optional - makes box interactive)
//   - style?: ViewStyle (optional custom styles)
//   - accessibilityLabel?: string (for interactive boxes)
//   - accessibilityHint?: string (for interactive boxes)

interface HushInfoBoxProps {
  variant?: 'info' | 'warning' | 'success';
  icon: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const HushInfoBox: React.FC<HushInfoBoxProps> = ({
  variant = 'info',
  icon,
  iconSize = 16,
  children,
  onPress,
  style,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const { hushTheme } = useChatStore();
  const themeData = HUSH_THEMES[hushTheme] || HUSH_THEMES.DEFAULT;

  const theme = {
    accent: themeData.colors.primary,
    card: 'rgba(255, 255, 255, 0.12)',
    divider: 'rgba(255, 255, 255, 0.2)',
    subtext: 'rgba(255, 255, 255, 0.6)',
    warning: '#FF9500', // iOS orange
    success: '#34C759', // iOS green
  };

  // Determine colors based on variant
  const iconColor =
    variant === 'warning'
      ? theme.warning
      : variant === 'success'
      ? theme.success
      : theme.accent;

  const borderColor =
    variant === 'warning'
      ? `${theme.warning}30`
      : variant === 'success'
      ? `${theme.success}30`
      : `${theme.accent}30`;

  const backgroundColor =
    variant === 'warning'
      ? `${theme.warning}10`
      : variant === 'success'
      ? `${theme.success}10`
      : `${theme.accent}10`;

  const baseBoxStyle = {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    backgroundColor,
    borderWidth: 1,
    borderColor,
    borderRadius: 12,
    padding: 16,
  };

  // If onPress provided, make it interactive
  if (onPress) {
    return (
      <TouchableOpacity
        style={[baseBoxStyle, style]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
      >
        <Ionicons
          name={icon}
          size={iconSize}
          color={iconColor}
          style={{ marginRight: 8, marginTop: 2 }}
        />
        <View style={{ flex: 1 }}>{children}</View>
      </TouchableOpacity>
    );
  }

  // Static View (no onPress)
  return (
    <View style={[baseBoxStyle, style]}>
      <Ionicons
        name={icon}
        size={iconSize}
        color={iconColor}
        style={{ marginRight: 8, marginTop: 2 }}
      />
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    minHeight: 52, // Ensures WCAG touch target (44x44 minimum)
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  textDisabled: {
    // Opacity handled by parent container
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});
