import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useChatStore, getBadgeTierDisplayName, BadgeId } from '../state/rootStore';
import { useShallow } from 'zustand/react/shallow';
import { HUSH_THEMES, CLASSIFIED_THEMES, DISCRETION_THEMES } from '../themes/themes';
import { CURRENT_FLAVOR, AppFlavor } from '../../config';

interface BadgeUnlockModalProps {
  visible: boolean;
  onClose: () => void;
  onViewGallery: () => void;
}

// Map badges to their origin flavor (determines tier naming)
const BADGE_FLAVOR_MAP: Record<BadgeId, AppFlavor> = {
  // Hush badges
  centered: 'HUSH',
  grateful: 'HUSH',
  released: 'HUSH',
  unburdened: 'HUSH',
  optimist: 'HUSH',

  // Classified badges
  hardened_target: 'CLASSIFIED',
  security_certified: 'CLASSIFIED',
  white_hat: 'CLASSIFIED',
  strategist: 'CLASSIFIED',
  analyst: 'CLASSIFIED',
  field_operative: 'CLASSIFIED',

  // Discretion badges
  steady_hand: 'DISCRETION',
  closer: 'DISCRETION',
  decisive: 'DISCRETION',

  // Universal badges (use current flavor)
  completionist: 'HUSH', // Default to HUSH for universal badges
  beta_tester: 'HUSH',
  backchannel: 'HUSH', // Discovery badge (Hush-only)
};

// Universal achievement gold color (trophy + title)
const ACHIEVEMENT_GOLD = '#D4AF37';

// Badge definitions (must match store.ts and SettingsModal.tsx)
const BADGE_DEFINITIONS: Record<string, { name: string; description: string; tier: 'bronze' | 'silver' | 'gold' | 'diamond' }> = {
  centered: { name: 'Centered', description: 'Complete Breathe 10 times', tier: 'bronze' },
  grateful: { name: 'Grateful', description: '7-day Gratitude streak', tier: 'bronze' },
  released: { name: 'Released', description: 'Complete 1 Unburdening', tier: 'bronze' },
  hardened_target: { name: 'Hardened Target', description: 'Resist social engineering for 10 exchanges', tier: 'silver' },
  security_certified: { name: 'Security Certified', description: 'Complete all 5 Breach Protocol firewalls', tier: 'gold' },
  unburdened: { name: 'Unburdened', description: 'Complete 5 Unburdenings', tier: 'silver' },
  optimist: { name: 'Optimist', description: '30-day Gratitude streak', tier: 'gold' },
  analyst: { name: 'Analyst', description: 'Find 5 moles correctly', tier: 'gold' },
  white_hat: { name: 'White Hat', description: 'Complete Zero Day 3 times', tier: 'silver' },
  strategist: { name: 'Strategist', description: 'Complete DEFCON campaign', tier: 'diamond' },
  steady_hand: { name: 'Steady Hand', description: 'Complete Crisis Management with 90%+ score', tier: 'gold' },
  closer: { name: 'Closer', description: 'Win 10 negotiations', tier: 'silver' },
  decisive: { name: 'Decisive', description: 'Complete 10 Executive Decisions', tier: 'silver' },
  field_operative: { name: 'Field Operative', description: '30-day Dead Drop streak', tier: 'diamond' },
  completionist: { name: 'Completionist', description: 'Unlock all badges', tier: 'diamond' },
  beta_tester: { name: 'Beta Tester', description: 'Opt in to performance analytics', tier: 'bronze' },
  backchannel: { name: 'Backchannel', description: 'Discovered the Classified backdoor', tier: 'bronze' }, // Tier is dynamic (bronze with hints, silver without) - actual tier comes from store
};

export function BadgeUnlockModal({ visible, onClose, onViewGallery }: BadgeUnlockModalProps) {
  // Access newlyUnlockedBadge from gameState (nested property)
  // CRITICAL: Use useShallow to prevent re-renders when gameState reference changes
  const newlyUnlockedBadge = useChatStore(
    useShallow((state) => state.gameState?.newlyUnlockedBadge)
  );
  const { hushTheme, classifiedTheme, discretionTheme, flavor } = useChatStore();

  if (__DEV__) {
    console.log('[BadgeUnlockModal] Render - newlyUnlockedBadge:', newlyUnlockedBadge, 'visible prop:', visible);
  }

  if (!newlyUnlockedBadge || !visible) {
    if (__DEV__) {
      console.log('[BadgeUnlockModal] Not showing modal (newlyUnlockedBadge:', newlyUnlockedBadge, 'visible:', visible, ')');
    }
    return null;
  }

  // CLASSIFIED badges should NOT show this modal - they have inline buttons on completion screens
  const badgeFlavor = BADGE_FLAVOR_MAP[newlyUnlockedBadge as BadgeId] || flavor;
  if (badgeFlavor === 'CLASSIFIED') {
    if (__DEV__) {
      console.log('[BadgeUnlockModal] Skipping modal for CLASSIFIED badge:', newlyUnlockedBadge);
    }
    return null;
  }

  const badgeInfo = BADGE_DEFINITIONS[newlyUnlockedBadge];
  if (!badgeInfo) {
    if (__DEV__) {
      console.log('[BadgeUnlockModal] Badge info not found for:', newlyUnlockedBadge);
    }
    return null;
  }

  if (__DEV__) {
    console.log('[BadgeUnlockModal] SHOWING MODAL for badge:', newlyUnlockedBadge, badgeInfo);
  }

  // badgeFlavor already determined above for CLASSIFIED check, use it for tier naming

  // Get theme based on current flavor (for visual styling)
  const getTheme = () => {
    if (flavor === 'HUSH') {
      const themeData = HUSH_THEMES[hushTheme] || HUSH_THEMES.DEFAULT;
      return {
        background: themeData.colors.background,
        text: '#FFFFFF',
        subtext: 'rgba(255, 255, 255, 0.6)',
        accent: themeData.colors.primary,
        card: 'rgba(255, 255, 255, 0.12)',
        fontHeader: 'System',
        fontBody: 'System',
      };
    } else if (flavor === 'CLASSIFIED') {
      const themeData = CLASSIFIED_THEMES[classifiedTheme] || CLASSIFIED_THEMES.TERMINAL_RED;
      return {
        background: themeData.colors.background,
        text: themeData.colors.text,
        subtext: themeData.colors.subtext,
        accent: themeData.colors.primary,
        card: themeData.colors.cardBg,
        fontHeader: 'Courier',
        fontBody: 'Courier',
      };
    } else {
      const themeData = DISCRETION_THEMES[discretionTheme] || DISCRETION_THEMES.PLATINUM;
      return {
        background: themeData.colors.background,
        text: themeData.colors.text,
        subtext: themeData.colors.subtext,
        accent: themeData.colors.primary,
        card: themeData.colors.cardBg,
        fontHeader: 'System',
        fontBody: 'System',
      };
    }
  };

  const theme = getTheme();
  // Use badge's origin flavor for tier naming (Hush badges get Hush tier names, etc.)
  const tierName = getBadgeTierDisplayName(badgeInfo.tier, badgeFlavor);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const handleViewGallery = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onViewGallery();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      accessibilityViewIsModal={true}
    >
      <View style={styles.overlay}>
        <View style={[
          styles.modal,
          {
            backgroundColor: theme.background,
            borderColor: theme.accent,
          }
        ]}>
          {/* Success Icon - Always Gold */}
          <View style={styles.iconContainer}>
            <Ionicons name="trophy" size={64} color={ACHIEVEMENT_GOLD} />
          </View>

          {/* Title - Always Gold */}
          <Text style={[
            styles.title,
            {
              fontFamily: theme.fontHeader,
              color: ACHIEVEMENT_GOLD,
            }
          ]}>
            {flavor === 'CLASSIFIED' ? 'ACHIEVEMENT_UNLOCKED' : 'Achievement Unlocked!'}
          </Text>

          {/* Badge Card */}
          {flavor === 'CLASSIFIED' ? (
            // CLASSIFIED: Terminal aesthetic
            <View style={[
              styles.badgeCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.accent,
              }
            ]}>
              <Text style={[
                styles.badgeNameClassified,
                { color: theme.accent }
              ]}>
                ◆ {badgeInfo.name.toUpperCase()} ◆
              </Text>
              <Text style={[
                styles.separator,
                { color: theme.accent }
              ]}>
                ═════════════════════════
              </Text>
              <Text style={[
                styles.badgeDescription,
                {
                  fontFamily: theme.fontBody,
                  color: theme.accent,
                }
              ]}>
                {badgeInfo.description}
              </Text>
              <Text style={[
                styles.separator,
                { color: theme.accent }
              ]}>
                ─────────────────────────
              </Text>
              <Text style={[
                styles.badgeTier,
                {
                  fontFamily: theme.fontBody,
                  color: theme.accent,
                }
              ]}>
                {tierName}
              </Text>
            </View>
          ) : (
            // HUSH/DISCRETION: Modern design
            <View style={[
              styles.badgeCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.accent,
              }
            ]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={[
                  styles.badgeName,
                  {
                    fontFamily: theme.fontHeader,
                    color: theme.accent,
                  }
                ]}>
                  ◆
                </Text>
                <Text style={[
                  styles.badgeName,
                  {
                    fontFamily: theme.fontHeader,
                    color: theme.accent,
                    marginHorizontal: 12,
                  }
                ]}>
                  {badgeInfo.name}
                </Text>
                <Text style={[
                  styles.badgeName,
                  {
                    fontFamily: theme.fontHeader,
                    color: theme.accent,
                  }
                ]}>
                  ◆
                </Text>
              </View>
              <Text style={[
                styles.badgeDescription,
                {
                  fontFamily: theme.fontBody,
                  color: theme.subtext,
                }
              ]}>
                {badgeInfo.description}
              </Text>
              <View style={{
                height: 1,
                backgroundColor: theme.accent + '30',
                marginVertical: 12,
              }} />
              <Text style={[
                styles.badgeTier,
                {
                  fontFamily: theme.fontBody,
                  color: theme.accent,
                }
              ]}>
                {tierName}
              </Text>
            </View>
          )}

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.secondaryButton,
                {
                  borderColor: theme.accent,
                }
              ]}
              onPress={handleClose}
            >
              <Text style={[
                styles.buttonText,
                {
                  fontFamily: theme.fontHeader,
                  color: theme.accent,
                }
              ]}>
                {flavor === 'CLASSIFIED' ? 'DISMISS' : 'Close'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.primaryButton,
                {
                  backgroundColor: theme.accent,
                }
              ]}
              onPress={handleViewGallery}
            >
              <Text style={[
                styles.buttonText,
                {
                  fontFamily: theme.fontHeader,
                  color: '#000',
                }
              ]}>
                {flavor === 'CLASSIFIED' ? 'VIEW_GALLERY' : 'View Gallery'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 24,
    maxWidth: 400,
    width: '100%',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  badgeCard: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  badgeName: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  badgeNameClassified: {
    fontFamily: 'Courier',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  separator: {
    fontFamily: 'Courier',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  badgeDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  badgeTier: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    // backgroundColor set dynamically
  },
  secondaryButton: {
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
