import React, { ReactNode, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, TextInputProps, ViewStyle, TextStyle, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface ClassifiedHeaderProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  tacticalColor: string;
  cardBg: string;
}

export const ClassifiedHeader: React.FC<ClassifiedHeaderProps> = ({ title, subtitle, onClose, tacticalColor, cardBg }) => (
  <View style={{
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    marginBottom: subtitle ? 20 : 40,
    borderBottomWidth: subtitle ? 1 : 0,
    borderBottomColor: subtitle ? tacticalColor + '30' : 'transparent',
    paddingBottom: subtitle ? 16 : 0
  }}>
    <View>
      <Text style={{
        fontFamily: 'Courier',
        fontSize: 20,
        fontWeight: 'bold',
        color: tacticalColor,
        marginBottom: subtitle ? 4 : 0
      }}>
        {title}
      </Text>
      {subtitle && (
        <Text style={{ fontFamily: 'Courier', fontSize: 12, color: '#999' }}>
          {subtitle}
        </Text>
      )}
    </View>
    <TouchableOpacity
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onClose();
      }}
      style={{ backgroundColor: cardBg, padding: 8, borderRadius: 8 }}
    >
      <Ionicons name="close" size={20} color={tacticalColor} />
    </TouchableOpacity>
  </View>
);

interface ClassifiedCardProps {
  icon?: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  tacticalColor: string;
  cardBg: string;
  style?: ViewStyle;
}

export const ClassifiedCard: React.FC<ClassifiedCardProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  tacticalColor,
  cardBg,
  style
}) => (
  <TouchableOpacity
    style={[{
      padding: 20,
      borderRadius: 12,
      marginBottom: 16,
      borderWidth: 1,
      backgroundColor: cardBg,
      borderColor: tacticalColor
    }, style]}
    onPress={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPress();
    }}
    activeOpacity={0.8}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {icon && (
        <View style={{ backgroundColor: tacticalColor + '30', padding: 12, borderRadius: 8, marginRight: 16 }}>
          <Text style={{ fontFamily: 'Courier', fontSize: 20, fontWeight: 'bold', color: tacticalColor }}>
            {icon}
          </Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{
          fontFamily: 'Courier',
          fontSize: 16,
          fontWeight: 'bold',
          color: tacticalColor,
          marginBottom: 4
        }}>
          {title}
        </Text>
        <Text style={{ fontFamily: 'Courier', fontSize: 12, color: '#999' }}>
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color={tacticalColor} />
    </View>
  </TouchableOpacity>
);

interface ClassifiedInputBarProps extends Omit<TextInputProps, 'style'> {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  tacticalColor: string;
  subtextColor?: string;
  disabled?: boolean;
}

export const ClassifiedInputBar: React.FC<ClassifiedInputBarProps> = ({
  value,
  onChangeText,
  onSubmit,
  placeholder = "ENTER COMMAND...",
  tacticalColor,
  subtextColor = "#666",
  disabled = false,
  ...textInputProps
}) => (
  <View style={{
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: tacticalColor + '30',
    paddingTop: 16,
    paddingBottom: 16,
    minHeight: 70
  }}>
    <Text style={{ fontFamily: 'Courier', fontSize: 16, color: tacticalColor, marginRight: 12 }}>
      {'>'}
    </Text>
    <TextInput
      style={{
        flex: 1,
        fontFamily: 'Courier',
        fontSize: 16,
        color: tacticalColor,
        minHeight: 40,
        maxHeight: 120,
        paddingTop: 10,
        paddingBottom: 10
      }}
      placeholder={placeholder}
      placeholderTextColor={subtextColor}
      value={value}
      onChangeText={onChangeText}
      onSubmitEditing={onSubmit}
      keyboardAppearance="dark"
      multiline
      editable={!disabled}
      {...textInputProps}
    />
    <TouchableOpacity
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSubmit();
      }}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text style={{
        fontFamily: 'Courier',
        fontSize: 12,
        fontWeight: 'bold',
        color: '#000',
        backgroundColor: tacticalColor,
        paddingHorizontal: 12,
        paddingVertical: 6,
        opacity: disabled ? 0.5 : 1
      }}>
        EXEC
      </Text>
    </TouchableOpacity>
  </View>
);

interface ClassifiedButtonProps {
  label: string;
  onPress: () => void;
  tacticalColor: string;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  style?: ViewStyle;
}

export const ClassifiedButton: React.FC<ClassifiedButtonProps> = ({
  label,
  onPress,
  tacticalColor,
  variant = 'primary',
  disabled = false,
  style
}) => (
  <TouchableOpacity
    style={[{
      backgroundColor: variant === 'primary' ? tacticalColor : 'transparent',
      borderWidth: variant === 'secondary' ? 1 : 0,
      borderColor: tacticalColor,
      padding: 16,
      borderRadius: 8,
      alignItems: 'center',
      opacity: disabled ? 0.5 : 1
    }, style]}
    onPress={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPress();
    }}
    disabled={disabled}
    activeOpacity={0.8}
  >
    <Text style={{
      fontFamily: 'Courier',
      fontSize: 14,
      fontWeight: 'bold',
      color: variant === 'primary' ? '#000' : tacticalColor
    }}>
      {label}
    </Text>
  </TouchableOpacity>
);

interface ClassifiedTextInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  tacticalColor: string;
  cardBg: string;
  subtextColor?: string;
  style?: TextStyle;
}

export const ClassifiedTextInput: React.FC<ClassifiedTextInputProps> = ({
  label,
  value,
  onChangeText,
  tacticalColor,
  cardBg,
  subtextColor = "#666",
  style,
  ...textInputProps
}) => (
  <View>
    {label && (
      <Text style={{
        fontFamily: 'Courier',
        fontSize: 12,
        color: tacticalColor,
        marginBottom: 10
      }}>
        {label}
      </Text>
    )}
    <TextInput
      style={[{
        fontFamily: 'Courier',
        fontSize: 16,
        color: tacticalColor,
        backgroundColor: cardBg,
        borderRadius: 8,
        padding: 16,
        borderWidth: 1,
        borderColor: tacticalColor + '30'
      }, style]}
      placeholderTextColor={subtextColor}
      value={value}
      onChangeText={onChangeText}
      keyboardAppearance="dark"
      {...textInputProps}
    />
  </View>
);

interface ClassifiedInfoBoxProps {
  label?: string;
  content: string | ReactNode;
  tacticalColor: string;
  cardBg: string;
  style?: ViewStyle;
}

export const ClassifiedInfoBox: React.FC<ClassifiedInfoBoxProps> = ({
  label,
  content,
  tacticalColor,
  cardBg,
  style
}) => (
  <View style={[{
    padding: 12,
    backgroundColor: cardBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: tacticalColor + '30'
  }, style]}>
    {label && (
      <Text style={{
        fontFamily: 'Courier',
        fontSize: 11,
        color: '#666',
        marginBottom: 4
      }}>
        {label}
      </Text>
    )}
    {typeof content === 'string' ? (
      <Text style={{ fontFamily: 'Courier', fontSize: 14, color: tacticalColor }}>
        {content}
      </Text>
    ) : content}
  </View>
);

// ============================================
// CLASSIFIED TOGGLE CARD (Paywall Component)
// ============================================
// Card with animated toggle switch for paywall flows
// Usage: <ClassifiedToggleCard title="..." subtitle="..." onPress={...} />

interface ClassifiedToggleCardProps {
  title: string;
  subtitle: string;
  onPress: () => void;
  tacticalColor: string;
  toggleAnimation: Animated.Value; // 0 = off, 1 = on
  disabled?: boolean;
}

export const ClassifiedToggleCard: React.FC<ClassifiedToggleCardProps> = ({
  title,
  subtitle,
  onPress,
  tacticalColor,
  toggleAnimation,
  disabled = false
}) => {
  const knobTranslate = toggleAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });

  return (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: tacticalColor,
        borderRadius: 8,
        padding: 20,
      }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <View style={{ flex: 1 }}>
        <Text style={{
          fontFamily: 'Courier',
          fontSize: 16,
          fontWeight: '700',
          color: '#FFFFFF',
          marginBottom: 6,
        }}>
          {title}
        </Text>
        <Text style={{
          fontFamily: 'Courier',
          fontSize: 13,
          color: 'rgba(255, 255, 255, 0.6)',
        }}>
          {subtitle}
        </Text>
      </View>

      {/* Toggle Switch Visual */}
      <View style={{
        width: 50,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        padding: 3,
        justifyContent: 'center',
      }}>
        <Animated.View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: '#FFFFFF',
            transform: [{ translateX: knobTranslate }],
          }}
        />
      </View>
    </TouchableOpacity>
  );
};

// ============================================
// CLASSIFIED PRICING CARD (Paywall Component)
// ============================================
// Pricing tier card for subscription paywalls
// Usage: <ClassifiedPricingCard tier="..." price="..." onPress={...} />

interface ClassifiedPricingCardProps {
  tier: string;
  price: string;
  period: string;
  savings?: string;
  popular?: boolean;
  tacticalColor: string;
  onPress: () => void;
}

export const ClassifiedPricingCard: React.FC<ClassifiedPricingCardProps> = ({
  tier,
  price,
  period,
  savings,
  popular = false,
  tacticalColor,
  onPress
}) => (
  <TouchableOpacity
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: popular ? 2 : 1,
      borderColor: tacticalColor,
      borderRadius: 8,
      padding: 20,
      marginBottom: 12,
    }}
    onPress={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPress();
    }}
    activeOpacity={0.7}
  >
    <View style={{ flex: 1 }}>
      <Text style={{
        fontFamily: 'Courier',
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: savings ? 4 : 0,
      }}>
        {tier}
      </Text>
      {savings && (
        <Text style={{
          fontFamily: 'Courier',
          fontSize: 12,
          color: tacticalColor,
        }}>
          {savings}
        </Text>
      )}
    </View>
    <View style={{ alignItems: 'flex-end' }}>
      <Text style={{
        fontFamily: 'Courier',
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
      }}>
        {price}
      </Text>
      <Text style={{
        fontFamily: 'Courier',
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.6)',
      }}>
        {period}
      </Text>
    </View>
  </TouchableOpacity>
);

// ============================================
// CLASSIFIED ACCORDION (Collapsible Section)
// ============================================
// Collapsible section with chevron indicator
// Usage: <ClassifiedAccordion title="..." tacticalColor="...">{content}</ClassifiedAccordion>

interface ClassifiedAccordionProps {
  title: string;
  tacticalColor: string;
  children: ReactNode;
  defaultExpanded?: boolean;
}

export const ClassifiedAccordion: React.FC<ClassifiedAccordionProps> = ({
  title,
  tacticalColor,
  children,
  defaultExpanded = false
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <View>
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setExpanded(!expanded);
        }}
        style={{ marginTop: 12, marginBottom: 8 }}
      >
        <Text style={{
          fontFamily: 'Courier',
          fontSize: 14,
          fontWeight: '700',
          color: tacticalColor,
        }}>
          {expanded ? '▼' : '▶'} {title}
        </Text>
      </TouchableOpacity>
      {expanded && (
        <View style={{ marginTop: 4 }}>
          {children}
        </View>
      )}
    </View>
  );
};
