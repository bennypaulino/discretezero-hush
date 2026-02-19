// src/core/ui/ComponentLibraryComparison.tsx
// Component Library Comparison Screen
// Side-by-side visual comparison of Hush vs Classified design systems
//
// TODO: REMOVE THIS FILE BEFORE EAS MIGRATION - DEV ONLY

import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { HushCloseButton, HushCard, HushInput, HushShareButton, HushInfoBox, HushIconHeader, HushBadge } from '../../apps/hush/components/HushUI';
import { ClassifiedHeader } from '../games/components/ClassifiedUI';
import { useChatStore } from '../state/rootStore';
import { HUSH_THEMES, CLASSIFIED_THEMES } from '../themes/themes';

interface ComponentLibraryComparisonProps {
  onClose: () => void;
}

export const ComponentLibraryComparison: React.FC<ComponentLibraryComparisonProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'buttons' | 'cards' | 'inputs'>('buttons');
  // MEMORY FIX: Selective subscriptions instead of destructuring
  const hushTheme = useChatStore((state) => state.hushTheme);
  const classifiedTheme = useChatStore((state) => state.classifiedTheme);

  // Get theme-aware colors
  const hushThemeData = HUSH_THEMES[hushTheme] || HUSH_THEMES.DEFAULT;
  const classifiedThemeData = CLASSIFIED_THEMES[classifiedTheme] || CLASSIFIED_THEMES.TERMINAL_RED;

  const hushAccent = hushThemeData.colors.primary;
  const classifiedAccent = classifiedThemeData.colors.primary;

  // Convert hex to rgba with 10% opacity for Classified close button background
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const classifiedCloseBg = hexToRgba(classifiedAccent, 0.1);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Component Library Comparison</Text>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onClose();
          }}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabs}>
        {['buttons', 'cards', 'inputs'].map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab(tab as any);
            }}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {activeTab === 'buttons' && (
          <>
            {/* Close Button Comparison */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Close Button</Text>
              <View style={styles.comparison}>
                {/* Hush Column */}
                <View style={styles.column}>
                  <Text style={styles.columnTitle}>HUSH</Text>
                  <Text style={styles.columnSubtitle}>Therapeutic • Soft</Text>

                  <View style={styles.exampleContainer}>
                    <HushCloseButton onClose={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} />
                  </View>

                  <View style={styles.specs}>
                    <Text style={styles.specLabel}>Specs:</Text>
                    <Text style={styles.specText}>• Size: 40×40px</Text>
                    <Text style={styles.specText}>• borderRadius: 20 (circle)</Text>
                    <Text style={styles.specText}>• Background: rgba(255,255,255,0.1)</Text>
                    <Text style={styles.specText}>• Icon: 20px white</Text>
                  </View>
                </View>

                {/* Classified Column */}
                <View style={styles.column}>
                  <Text style={styles.columnTitle}>CLASSIFIED</Text>
                  <Text style={styles.columnSubtitle}>Tactical • Sharp</Text>

                  <View style={styles.exampleContainer}>
                    <TouchableOpacity
                      onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                      style={[styles.classifiedCloseButton, { backgroundColor: classifiedCloseBg }]}
                    >
                      <Ionicons name="close" size={20} color={classifiedAccent} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.specs}>
                    <Text style={styles.specLabel}>Specs:</Text>
                    <Text style={styles.specText}>• Size: 36×36px</Text>
                    <Text style={styles.specText}>• borderRadius: 8 (squared)</Text>
                    <Text style={styles.specText}>• Background: {classifiedCloseBg}</Text>
                    <Text style={styles.specText}>• Icon: 20px {classifiedAccent}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Primary Button Comparison */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Primary Button</Text>
              <View style={styles.comparison}>
                {/* Hush Column */}
                <View style={styles.column}>
                  <Text style={styles.columnTitle}>HUSH</Text>

                  <View style={styles.exampleContainer}>
                    <TouchableOpacity
                      onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
                      style={[styles.hushPrimaryButton, { backgroundColor: hushAccent }]}
                    >
                      <Text style={styles.hushButtonText}>Begin</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.specs}>
                    <Text style={styles.specLabel}>Specs:</Text>
                    <Text style={styles.specText}>• borderRadius: 12 (soft)</Text>
                    <Text style={styles.specText}>• Padding: 16v × 32h</Text>
                    <Text style={styles.specText}>• Background: {hushAccent} (accent)</Text>
                    <Text style={styles.specText}>• Text: #000 (black)</Text>
                    <Text style={styles.specText}>• Font: System, 600 weight</Text>
                  </View>
                </View>

                {/* Classified Column */}
                <View style={styles.column}>
                  <Text style={styles.columnTitle}>CLASSIFIED</Text>

                  <View style={styles.exampleContainer}>
                    <TouchableOpacity
                      onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
                      style={[styles.classifiedPrimaryButton, { backgroundColor: classifiedAccent }]}
                    >
                      <Text style={styles.classifiedButtonText}>EXECUTE</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.specs}>
                    <Text style={styles.specLabel}>Specs:</Text>
                    <Text style={styles.specText}>• borderRadius: 8 (sharp)</Text>
                    <Text style={styles.specText}>• Padding: 16v × 32h</Text>
                    <Text style={styles.specText}>• Background: {classifiedAccent} (tactical)</Text>
                    <Text style={styles.specText}>• Text: #000 (black)</Text>
                    <Text style={styles.specText}>• Font: Courier-Bold</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Secondary Button Comparison */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Secondary Button</Text>
              <View style={styles.comparison}>
                {/* Hush Column */}
                <View style={styles.column}>
                  <Text style={styles.columnTitle}>HUSH</Text>

                  <View style={styles.exampleContainer}>
                    <TouchableOpacity
                      onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                      style={[styles.hushSecondaryButton, { borderColor: hushAccent }]}
                    >
                      <Text style={[styles.hushSecondaryText, { color: hushAccent }]}>Go Back</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.specs}>
                    <Text style={styles.specLabel}>Specs:</Text>
                    <Text style={styles.specText}>• borderRadius: 12</Text>
                    <Text style={styles.specText}>• Border: 1px {hushAccent}</Text>
                    <Text style={styles.specText}>• Background: transparent</Text>
                    <Text style={styles.specText}>• Text: {hushAccent} (accent)</Text>
                  </View>
                </View>

                {/* Classified Column */}
                <View style={styles.column}>
                  <Text style={styles.columnTitle}>CLASSIFIED</Text>

                  <View style={styles.exampleContainer}>
                    <TouchableOpacity
                      onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                      style={[styles.classifiedSecondaryButton, { borderColor: classifiedAccent }]}
                    >
                      <Text style={[styles.classifiedSecondaryText, { color: classifiedAccent }]}>CANCEL</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.specs}>
                    <Text style={styles.specLabel}>Specs:</Text>
                    <Text style={styles.specText}>• borderRadius: 8</Text>
                    <Text style={styles.specText}>• Border: 1px {classifiedAccent}</Text>
                    <Text style={styles.specText}>• Background: transparent</Text>
                    <Text style={styles.specText}>• Text: {classifiedAccent} (tactical)</Text>
                  </View>
                </View>
              </View>
            </View>
          </>
        )}

        {activeTab === 'cards' && (
          <>
            {/* Default Card */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Default Card</Text>
              <View style={styles.comparison}>
                <View style={styles.column}>
                  <Text style={styles.columnTitle}>HUSH</Text>
                  <Text style={styles.columnSubtitle}>Static content card</Text>

                  <View style={styles.exampleContainer}>
                    <HushCard>
                      <Text style={{ color: '#FFFFFF', fontSize: 14, marginBottom: 4 }}>Card Title</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>This is a default card with static content.</Text>
                    </HushCard>
                  </View>

                  <View style={styles.specs}>
                    <Text style={styles.specLabel}>Specs:</Text>
                    <Text style={styles.specText}>• borderRadius: 12</Text>
                    <Text style={styles.specText}>• Background: rgba(255,255,255,0.12)</Text>
                    <Text style={styles.specText}>• Border: 1px rgba(255,255,255,0.2)</Text>
                    <Text style={styles.specText}>• Padding: 16px (default)</Text>
                  </View>
                </View>

                <View style={styles.column}>
                  <Text style={styles.columnTitle}>CLASSIFIED</Text>
                  <Text style={styles.columnSubtitle}>Coming soon</Text>
                  <Text style={styles.placeholder}>Classified card components pending</Text>
                </View>
              </View>
            </View>

            {/* Interactive Card */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Interactive Card</Text>
              <View style={styles.comparison}>
                <View style={styles.column}>
                  <Text style={styles.columnTitle}>HUSH</Text>
                  <Text style={styles.columnSubtitle}>Tappable with haptics</Text>

                  <View style={styles.exampleContainer}>
                    <HushCard onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                      <Text style={{ color: '#FFFFFF', fontSize: 14, marginBottom: 4 }}>Tap Me</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>This card responds to touch</Text>
                    </HushCard>
                  </View>

                  <View style={styles.specs}>
                    <Text style={styles.specLabel}>Specs:</Text>
                    <Text style={styles.specText}>• Auto-wraps in TouchableOpacity</Text>
                    <Text style={styles.specText}>• activeOpacity: 0.7</Text>
                    <Text style={styles.specText}>• Haptic feedback on press</Text>
                    <Text style={styles.specText}>• WCAG: 44x44 minimum touch</Text>
                  </View>
                </View>

                <View style={styles.column}>
                  <Text style={styles.columnTitle}>CLASSIFIED</Text>
                  <Text style={styles.columnSubtitle}>Coming soon</Text>
                  <Text style={styles.placeholder}>Classified card components pending</Text>
                </View>
              </View>
            </View>

            {/* Highlighted Card */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Highlighted Card</Text>
              <View style={styles.comparison}>
                <View style={styles.column}>
                  <Text style={styles.columnTitle}>HUSH</Text>
                  <Text style={styles.columnSubtitle}>Active/selected state</Text>

                  <View style={styles.exampleContainer}>
                    <HushCard variant="highlighted">
                      <Text style={{ color: '#FFFFFF', fontSize: 14, marginBottom: 4 }}>Selected Item</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>This card shows active state</Text>
                    </HushCard>
                  </View>

                  <View style={styles.specs}>
                    <Text style={styles.specLabel}>Specs:</Text>
                    <Text style={styles.specText}>• Background: accent + 1A (10% opacity)</Text>
                    <Text style={styles.specText}>• Border: 1px accent color</Text>
                    <Text style={styles.specText}>• Used for selected/active states</Text>
                  </View>
                </View>

                <View style={styles.column}>
                  <Text style={styles.columnTitle}>CLASSIFIED</Text>
                  <Text style={styles.columnSubtitle}>Coming soon</Text>
                  <Text style={styles.placeholder}>Classified card components pending</Text>
                </View>
              </View>
            </View>

            {/* Share Button */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Share Button</Text>
              <View style={styles.comparison}>
                <View style={styles.column}>
                  <Text style={styles.columnTitle}>HUSH</Text>
                  <Text style={styles.columnSubtitle}>Phase 2 component</Text>

                  <View style={styles.exampleContainer}>
                    <HushShareButton
                      message="Check out this component library!"
                      label="Share this demo"
                    />
                  </View>

                  <View style={styles.specs}>
                    <Text style={styles.specLabel}>Specs:</Text>
                    <Text style={styles.specText}>• Native Share API integration</Text>
                    <Text style={styles.specText}>• Icon + label layout</Text>
                    <Text style={styles.specText}>• Background: accent + 10 (6% opacity)</Text>
                    <Text style={styles.specText}>• Border: accent + 30 (19% opacity)</Text>
                    <Text style={styles.specText}>• minHeight: 52px (WCAG)</Text>
                  </View>
                </View>

                <View style={styles.column}>
                  <Text style={styles.columnTitle}>CLASSIFIED</Text>
                  <Text style={styles.columnSubtitle}>Coming soon</Text>
                  <Text style={styles.placeholder}>Classified share components pending</Text>
                </View>
              </View>
            </View>

            {/* Info Box - Info Variant */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Info Box (Info)</Text>
              <View style={styles.comparison}>
                <View style={styles.column}>
                  <Text style={styles.columnTitle}>HUSH</Text>
                  <Text style={styles.columnSubtitle}>Phase 2 component</Text>

                  <View style={styles.exampleContainer}>
                    <HushInfoBox
                      variant="info"
                      icon="information-circle-outline"
                    >
                      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, lineHeight: 20 }}>
                        This is an info box with helpful information for the user.
                      </Text>
                    </HushInfoBox>
                  </View>

                  <View style={styles.specs}>
                    <Text style={styles.specLabel}>Specs:</Text>
                    <Text style={styles.specText}>• Icon + text layout (row)</Text>
                    <Text style={styles.specText}>• Background: accent + 10</Text>
                    <Text style={styles.specText}>• Border: accent + 30</Text>
                    <Text style={styles.specText}>• Icon color: theme accent</Text>
                    <Text style={styles.specText}>• Optional onPress for interactivity</Text>
                  </View>
                </View>

                <View style={styles.column}>
                  <Text style={styles.columnTitle}>CLASSIFIED</Text>
                  <Text style={styles.columnSubtitle}>Coming soon</Text>
                  <Text style={styles.placeholder}>Classified info components pending</Text>
                </View>
              </View>
            </View>

            {/* Info Box - Warning Variant */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Info Box (Warning)</Text>
              <View style={styles.comparison}>
                <View style={styles.column}>
                  <Text style={styles.columnTitle}>HUSH</Text>
                  <Text style={styles.columnSubtitle}>Warning state</Text>

                  <View style={styles.exampleContainer}>
                    <HushInfoBox
                      variant="warning"
                      icon="warning-outline"
                    >
                      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, lineHeight: 20 }}>
                        Warning: This action cannot be undone.
                      </Text>
                    </HushInfoBox>
                  </View>

                  <View style={styles.specs}>
                    <Text style={styles.specLabel}>Specs:</Text>
                    <Text style={styles.specText}>• Background: #FF9500 + 10</Text>
                    <Text style={styles.specText}>• Border: #FF9500 + 30</Text>
                    <Text style={styles.specText}>• Icon color: #FF9500 (iOS orange)</Text>
                    <Text style={styles.specText}>• Used for cautionary messages</Text>
                  </View>
                </View>

                <View style={styles.column}>
                  <Text style={styles.columnTitle}>CLASSIFIED</Text>
                  <Text style={styles.columnSubtitle}>Coming soon</Text>
                  <Text style={styles.placeholder}>Classified info components pending</Text>
                </View>
              </View>
            </View>

            {/* Info Box - Success Variant */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Info Box (Success)</Text>
              <View style={styles.comparison}>
                <View style={styles.column}>
                  <Text style={styles.columnTitle}>HUSH</Text>
                  <Text style={styles.columnSubtitle}>Success state</Text>

                  <View style={styles.exampleContainer}>
                    <HushInfoBox
                      variant="success"
                      icon="checkmark-circle-outline"
                    >
                      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, lineHeight: 20 }}>
                        Success! Your changes have been saved.
                      </Text>
                    </HushInfoBox>
                  </View>

                  <View style={styles.specs}>
                    <Text style={styles.specLabel}>Specs:</Text>
                    <Text style={styles.specText}>• Background: #34C759 + 10</Text>
                    <Text style={styles.specText}>• Border: #34C759 + 30</Text>
                    <Text style={styles.specText}>• Icon color: #34C759 (iOS green)</Text>
                    <Text style={styles.specText}>• Used for success confirmations</Text>
                  </View>
                </View>

                <View style={styles.column}>
                  <Text style={styles.columnTitle}>CLASSIFIED</Text>
                  <Text style={styles.columnSubtitle}>Coming soon</Text>
                  <Text style={styles.placeholder}>Classified info components pending</Text>
                </View>
              </View>
            </View>

            {/* Icon Header */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Icon Header</Text>
              <View style={styles.comparison}>
                <View style={styles.column}>
                  <Text style={styles.columnTitle}>HUSH</Text>
                  <Text style={styles.columnSubtitle}>Phase 2 component</Text>

                  <View style={styles.exampleContainer}>
                    <HushIconHeader
                      icon="checkmark-circle"
                      title="Complete"
                      subtitle="Released."
                    />
                  </View>

                  <View style={styles.specs}>
                    <Text style={styles.specLabel}>Specs:</Text>
                    <Text style={styles.specText}>• Centered icon + title + subtitle</Text>
                    <Text style={styles.specText}>• Icon: size 80 (default), theme accent</Text>
                    <Text style={styles.specText}>• Title: fontSize 28, fontWeight 700</Text>
                    <Text style={styles.specText}>• Subtitle: fontSize 16, theme subtext</Text>
                    <Text style={styles.specText}>• Used for completion/intro screens</Text>
                  </View>
                </View>

                <View style={styles.column}>
                  <Text style={styles.columnTitle}>CLASSIFIED</Text>
                  <Text style={styles.columnSubtitle}>Coming soon</Text>
                  <Text style={styles.placeholder}>Classified header components pending</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {activeTab === 'inputs' && (
          <>
            {/* Default Input */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Default Input</Text>
              <View style={styles.comparison}>
                <View style={styles.column}>
                  <Text style={styles.columnTitle}>HUSH</Text>
                  <Text style={styles.columnSubtitle}>Standard text input</Text>

                  <View style={styles.exampleContainer}>
                    <HushInput
                      value=""
                      onChangeText={() => {}}
                      placeholder="Enter text..."
                      style={{ width: '100%' }}
                    />
                  </View>

                  <View style={styles.specs}>
                    <Text style={styles.specLabel}>Specs:</Text>
                    <Text style={styles.specText}>• borderRadius: 12</Text>
                    <Text style={styles.specText}>• Background: rgba(255,255,255,0.12)</Text>
                    <Text style={styles.specText}>• Border: 1px rgba(255,255,255,0.2)</Text>
                    <Text style={styles.specText}>• Padding: 16px</Text>
                    <Text style={styles.specText}>• Dark keyboard appearance</Text>
                  </View>
                </View>

                <View style={styles.column}>
                  <Text style={styles.columnTitle}>CLASSIFIED</Text>
                  <Text style={styles.columnSubtitle}>Coming soon</Text>
                  <Text style={styles.placeholder}>Classified input components pending</Text>
                </View>
              </View>
            </View>

            {/* Accent Input */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Accent Input</Text>
              <View style={styles.comparison}>
                <View style={styles.column}>
                  <Text style={styles.columnTitle}>HUSH</Text>
                  <Text style={styles.columnSubtitle}>Highlighted/active state</Text>

                  <View style={styles.exampleContainer}>
                    <HushInput
                      value=""
                      onChangeText={() => {}}
                      placeholder="Important field..."
                      variant="accent"
                      style={{ width: '100%' }}
                    />
                  </View>

                  <View style={styles.specs}>
                    <Text style={styles.specLabel}>Specs:</Text>
                    <Text style={styles.specText}>• Border: 1px accent color</Text>
                    <Text style={styles.specText}>• Used for active/focused inputs</Text>
                    <Text style={styles.specText}>• Example: Chat message input</Text>
                  </View>
                </View>

                <View style={styles.column}>
                  <Text style={styles.columnTitle}>CLASSIFIED</Text>
                  <Text style={styles.columnSubtitle}>Coming soon</Text>
                  <Text style={styles.placeholder}>Classified input components pending</Text>
                </View>
              </View>
            </View>

            {/* Multiline Input */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Multiline Input</Text>
              <View style={styles.comparison}>
                <View style={styles.column}>
                  <Text style={styles.columnTitle}>HUSH</Text>
                  <Text style={styles.columnSubtitle}>Text area variant</Text>

                  <View style={styles.exampleContainer}>
                    <HushInput
                      value=""
                      onChangeText={() => {}}
                      placeholder="Type your thoughts..."
                      multiline
                      style={{ width: '100%', minHeight: 100 }}
                    />
                  </View>

                  <View style={styles.specs}>
                    <Text style={styles.specLabel}>Specs:</Text>
                    <Text style={styles.specText}>• multiline: true</Text>
                    <Text style={styles.specText}>• textAlignVertical: 'top'</Text>
                    <Text style={styles.specText}>• Expandable height</Text>
                    <Text style={styles.specText}>• Used in: Unburdening, Gratitude</Text>
                  </View>
                </View>

                <View style={styles.column}>
                  <Text style={styles.columnTitle}>CLASSIFIED</Text>
                  <Text style={styles.columnSubtitle}>Coming soon</Text>
                  <Text style={styles.placeholder}>Classified input components pending</Text>
                </View>
              </View>
            </View>

            {/* Badge - Tier Indicators */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Badge (Tier)</Text>
              <View style={styles.comparison}>
                <View style={styles.column}>
                  <Text style={styles.columnTitle}>HUSH</Text>
                  <Text style={styles.columnSubtitle}>Phase 3 component</Text>

                  <View style={styles.exampleContainer}>
                    <View style={{ alignItems: 'flex-start' }}>
                      <HushBadge text="Unlimited" />
                      <HushBadge text="1 per day" />
                      <HushBadge text="Pro only" showLock />
                    </View>
                  </View>

                  <View style={styles.specs}>
                    <Text style={styles.specLabel}>Specs:</Text>
                    <Text style={styles.specText}>• fontSize: 12, accent color</Text>
                    <Text style={styles.specText}>• Optional lock icon (12px)</Text>
                    <Text style={styles.specText}>• Used for tier indicators</Text>
                    <Text style={styles.specText}>• Usage: Unburdening modes</Text>
                  </View>
                </View>

                <View style={styles.column}>
                  <Text style={styles.columnTitle}>CLASSIFIED</Text>
                  <Text style={styles.columnSubtitle}>Coming soon</Text>
                  <Text style={styles.placeholder}>Classified badge components pending</Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 8,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 20,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#8B5CF6',
  },
  tabText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#8B5CF6',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  comparison: {
    flexDirection: 'row',
    gap: 20,
  },
  column: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
  },
  columnTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  columnSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 16,
  },
  exampleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    marginBottom: 16,
  },
  specs: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: 12,
  },
  specLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  specText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Courier',
    marginBottom: 2,
  },
  placeholder: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 40,
  },

  // Classified Close Button Example (background applied dynamically)
  classifiedCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hush Primary Button Example (background applied dynamically)
  hushPrimaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 120,
  },
  hushButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
  },

  // Classified Primary Button Example (background applied dynamically)
  classifiedPrimaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    minWidth: 120,
  },
  classifiedButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Courier',
    color: '#000000',
    textAlign: 'center',
  },

  // Hush Secondary Button Example (border/text color applied dynamically)
  hushSecondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 120,
  },
  hushSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Classified Secondary Button Example (border/text color applied dynamically)
  classifiedSecondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 120,
  },
  classifiedSecondaryText: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Courier',
    textAlign: 'center',
  },
});
