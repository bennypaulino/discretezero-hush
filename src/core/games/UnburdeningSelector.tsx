import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../state/rootStore';
import { HUSH_THEMES } from '../themes/themes';
import { HushCloseButton, HushCard, HushInfoBox, HushBadge, HushButton } from '../../apps/hush/components/HushUI';
import { getLocalDateString } from '../utils/dateUtils';

export type UnburdeningMode = 'freeform' | 'chat' | 'guided';

interface UnburdingSelectorProps {
  onModeSelect: (mode: UnburdeningMode) => void;
  onCancel: () => void;
}

// Helper to get Hush theme properties
// NOTE: Unburdening is Hush-only, no Classified/Discretion support needed
const getHushTheme = (hushTheme: string) => {
  const themeData = HUSH_THEMES[hushTheme as keyof typeof HUSH_THEMES] || HUSH_THEMES.DEFAULT;
  return {
    background: themeData.colors.background,
    text: '#FFFFFF',
    subtext: 'rgba(255, 255, 255, 0.6)',
    accent: themeData.colors.primary,
    card: 'rgba(255, 255, 255, 0.12)',
    divider: 'rgba(255, 255, 255, 0.2)',
    fontHeader: 'System',
    fontBody: 'System',
  };
};

export const UnburdeningSelector: React.FC<UnburdingSelectorProps> = ({ onModeSelect, onCancel }) => {
  const {
    hushTheme,
    subscriptionTier,
    gameState,
    triggerPaywall,
  } = useChatStore();
  const theme = getHushTheme(hushTheme);

  const isPro = subscriptionTier === 'MONTHLY' || subscriptionTier === 'YEARLY';

  // Check if Free user has used their daily unburdening
  const canUseFree = (() => {
    if (isPro) return true; // Pro can always use

    const lastUse = gameState.unburdeningLastFreeUse;
    if (!lastUse) return true; // Never used

    // Compare local date strings (YYYY-MM-DD format)
    const today = getLocalDateString(new Date());
    const isSameDay = lastUse === today;

    return !isSameDay; // Can use if not used today
  })();

  const handleModePress = (mode: UnburdeningMode, locked: boolean) => {
    if (locked) {
      // Show paywall for locked Pro modes (Chat/Guided)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      triggerPaywall('unburdening_daily_limit');
      return;
    }

    if (!canUseFree && !isPro) {
      // Free tier already used today - show paywall for unlimited access
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      triggerPaywall('unburdening_daily_limit'); // Daily limit for this game
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onModeSelect(mode);
  };

  // CTA button handler - bypasses frequency cap (high intent action)
  const handleCTAPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Direct paywall trigger, bypassing frequency cap
    // Note: Don't set paywallReason here - it would get added to dismissed list
    // The PaywallModal will use a default reason if null
    useChatStore.setState({
      showPaywall: true,
      paywallReason: null, // CTA bypass - doesn't count toward any trigger
    });
  };

  return (
    <View style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.background,
    }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, paddingTop: 60 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 30 }}>
          <View style={{ flex: 1 }}>
            <Text style={{
              fontFamily: theme.fontHeader,
              fontSize: 28,
              fontWeight: '700',
              color: theme.accent,
              marginBottom: 8,
            }}>
              The Unburdening
            </Text>
            <Text style={{
              fontFamily: theme.fontBody,
              fontSize: 14,
              color: theme.subtext,
            }}>
              Choose your mode
            </Text>
          </View>

          <HushCloseButton onClose={onCancel} />
        </View>

        {/* Free tier usage notice - tappable to trigger paywall */}
        {!isPro && !canUseFree && (
          <>
            <HushCard
              variant="highlighted"
              onPress={() => {
                triggerPaywall('unburdening_daily_limit');
              }}
              style={{ marginBottom: 16 }}
              accessibilityLabel="Daily session complete"
              accessibilityHint="Tap to upgrade to Pro for unlimited access"
            >
              <Text style={{
                fontFamily: theme.fontHeader,
                fontSize: 14,
                fontWeight: '600',
                color: theme.text,
                marginBottom: 8,
              }}>
                Daily Unburdening Complete
              </Text>
              <Text style={{
                fontFamily: theme.fontBody,
                fontSize: 14,
                color: theme.subtext,
                lineHeight: 20,
              }}>
                You've used your daily session. Upgrade to Pro for unlimited access or return tomorrow.
              </Text>
            </HushCard>

            {/* CTA Button - bypasses frequency cap */}
            <View style={{ marginBottom: 20 }}>
              <HushButton
                variant="primary"
                onPress={handleCTAPress}
                fullWidth
                accessibilityLabel="Upgrade to Pro"
                accessibilityHint="Unlock unlimited unburdening sessions"
              >
                Unlock Unlimited Access
              </HushButton>
            </View>
          </>
        )}

        {/* Info - tappable to trigger paywall */}
        {!isPro && (
          <HushInfoBox
            variant="info"
            icon="information-circle-outline"
            onPress={() => {
              triggerPaywall('unburdening_daily_limit');
            }}
            style={{ marginBottom: 20 }}
            accessibilityLabel="Pro features info"
            accessibilityHint="Tap to upgrade and unlock all features"
          >
            <Text style={{
              fontFamily: theme.fontBody,
              fontSize: 12,
              color: theme.subtext,
              lineHeight: 20,
            }}>
              Upgrade to Pro for:{'\n'}• Unlimited Freeform sessions{'\n'}• Chat mode with AI support{'\n'}• Guided mode with structured prompts{'\n'}• No daily limits
            </Text>
          </HushInfoBox>
        )}

        {/* Freeform Mode */}
        <HushCard
          variant="default"
          padding={20}
          style={{
            marginBottom: 16,
            opacity: (!canUseFree && !isPro) ? 0.5 : 1,
          }}
          onPress={() => handleModePress('freeform', false)}
          accessibilityLabel="Freeform mode"
          accessibilityHint={isPro ? "Write freely without AI, unlimited sessions" : "Write freely without AI, 1 session per day"}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Ionicons name="create-outline" size={28} color={theme.accent} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{
                fontFamily: theme.fontHeader,
                fontSize: 20,
                fontWeight: '700',
                color: theme.text,
              }}>
                Freeform
              </Text>
              <HushBadge text={isPro ? 'Unlimited' : '1 per day'} />
            </View>
          </View>
          <Text style={{
            fontFamily: theme.fontBody,
            fontSize: 14,
            color: theme.subtext,
            lineHeight: 22,
          }}>
            Write freely in a private text area. No AI processing, just you and your thoughts. Release it all when ready.
          </Text>
        </HushCard>

        {/* Chat Mode */}
        <HushCard
          variant="default"
          padding={20}
          style={{
            marginBottom: 16,
            opacity: isPro ? 1 : 0.7,
          }}
          onPress={() => handleModePress('chat', !isPro)}
          accessibilityLabel="Chat mode"
          accessibilityHint={isPro ? "Conversational AI support, unlimited sessions" : "Pro-only feature, upgrade to unlock"}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Ionicons name="chatbubbles-outline" size={28} color={isPro ? theme.accent : theme.subtext} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{
                fontFamily: theme.fontHeader,
                fontSize: 20,
                fontWeight: '700',
                color: isPro ? theme.text : theme.subtext,
              }}>
                Chat
              </Text>
              <HushBadge
                text={isPro ? 'Unlimited' : 'Pro only'}
                showLock={!isPro}
              />
            </View>
          </View>
          <Text style={{
            fontFamily: theme.fontBody,
            fontSize: 14,
            color: theme.subtext,
            lineHeight: 22,
          }}>
            Conversational AI support. Vent naturally, AI listens and validates. Release the entire chat when done.
          </Text>
        </HushCard>

        {/* Guided Mode */}
        <HushCard
          variant="default"
          padding={20}
          style={{
            marginBottom: 20,
            opacity: isPro ? 1 : 0.7,
          }}
          onPress={() => handleModePress('guided', !isPro)}
          accessibilityLabel="Guided mode"
          accessibilityHint={isPro ? "Structured AI prompts to help you process, unlimited sessions" : "Pro-only feature, upgrade to unlock"}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Ionicons name="compass-outline" size={28} color={isPro ? theme.accent : theme.subtext} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{
                fontFamily: theme.fontHeader,
                fontSize: 20,
                fontWeight: '700',
                color: isPro ? theme.text : theme.subtext,
              }}>
                Guided
              </Text>
              <HushBadge
                text={isPro ? 'Unlimited' : 'Pro only'}
                showLock={!isPro}
              />
            </View>
          </View>
          <Text style={{
            fontFamily: theme.fontBody,
            fontSize: 14,
            color: theme.subtext,
            lineHeight: 22,
          }}>
            Structured prompts guide your unburdening. AI asks questions to help you process. Release everything at the end.
          </Text>
        </HushCard>
      </ScrollView>
    </View>
  );
};
