import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../../state/rootStore';
import { CLASSIFIED_THEMES, DISCRETION_THEMES } from '../../themes/themes';
import type { AppFlavor } from '../../../config';

interface ComingSoonOverlayProps {
  title: string;
  description: string;
  onClose: () => void;
}

// Helper to get theme properties based on current flavor
const getTheme = (
  flavor: AppFlavor,
  classifiedTheme: string,
  discretionTheme: string
) => {
  if (flavor === 'CLASSIFIED') {
    const themeData = CLASSIFIED_THEMES[classifiedTheme as keyof typeof CLASSIFIED_THEMES] || CLASSIFIED_THEMES.TERMINAL_RED;
    return {
      background: themeData.colors.background,
      text: themeData.colors.text,
      subtext: themeData.colors.subtext,
      accent: themeData.colors.primary,
      card: themeData.colors.cardBg,
      divider: themeData.colors.border,
      fontFamily: 'Courier',
      isTerminal: true,
    };
  } else {
    // DISCRETION
    const themeData = DISCRETION_THEMES[discretionTheme as keyof typeof DISCRETION_THEMES] || DISCRETION_THEMES.GOLD;
    return {
      background: themeData.colors.background,
      text: themeData.colors.text,
      subtext: themeData.colors.subtext,
      accent: themeData.colors.accent,
      card: 'rgba(212, 175, 55, 0.08)',
      divider: 'rgba(212, 175, 55, 0.2)',
      fontFamily: 'System',
      isTerminal: false,
    };
  }
};

export const ComingSoonOverlay: React.FC<ComingSoonOverlayProps> = ({
  title,
  description,
  onClose,
}) => {
  // MEMORY FIX: Selective subscriptions instead of destructuring
  const flavor = useChatStore((state) => state.flavor);
  const classifiedTheme = useChatStore((state) => state.classifiedTheme);
  const discretionTheme = useChatStore((state) => state.discretionTheme);
  const theme = getTheme(flavor, classifiedTheme, discretionTheme);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Close button */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={handleClose}
      >
        <Ionicons name="close" size={32} color={theme.text} />
      </TouchableOpacity>

      {/* Content */}
      <View style={styles.content}>
        {/* Title with ASCII border for Classified, clean for Discretion */}
        {theme.isTerminal ? (
          <View style={styles.terminalHeader}>
            <Text style={[styles.terminalBorder, { color: theme.accent, fontFamily: theme.fontFamily }]}>
              ═══════════════════════════════════
            </Text>
            <Text style={[styles.title, { color: theme.text, fontFamily: theme.fontFamily }]}>
              {title}
            </Text>
            <Text style={[styles.terminalBorder, { color: theme.accent, fontFamily: theme.fontFamily }]}>
              ═══════════════════════════════════
            </Text>
          </View>
        ) : (
          <Text style={[styles.title, { color: theme.text, fontFamily: theme.fontFamily }]}>
            {title}
          </Text>
        )}

        {/* Description */}
        <Text style={[styles.description, { color: theme.subtext, fontFamily: theme.fontFamily }]}>
          {description}
        </Text>

        {/* Status badge */}
        <View style={[styles.statusBadge, { backgroundColor: theme.card, borderColor: theme.accent }]}>
          <Ionicons name="hammer-outline" size={20} color={theme.accent} style={styles.statusIcon} />
          <Text style={[styles.statusText, { color: theme.accent, fontFamily: theme.fontFamily }]}>
            {theme.isTerminal ? 'UNDER_DEVELOPMENT' : 'Under Development'}
          </Text>
        </View>

        {/* Informational text */}
        <Text style={[styles.infoText, { color: theme.subtext, fontFamily: theme.fontFamily }]}>
          {theme.isTerminal
            ? 'THIS_PROTOCOL_IS_NOT_YET_OPERATIONAL.\nCHECK_BACK_SOON_FOR_UPDATES.'
            : 'This feature is currently in development.\nCheck back soon for updates.'}
        </Text>

        {/* Close button */}
        <TouchableOpacity
          style={[styles.closeButtonBottom, { backgroundColor: theme.accent }]}
          onPress={handleClose}
        >
          <Text style={[styles.closeButtonText, { color: theme.background, fontFamily: theme.fontFamily }]}>
            {theme.isTerminal ? 'DISMISS' : 'Close'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  content: {
    width: '100%',
    maxWidth: 500,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  terminalHeader: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  terminalBorder: {
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 8,
    letterSpacing: 2,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    lineHeight: 24,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: 24,
  },
  statusIcon: {
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  infoText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
    opacity: 0.8,
  },
  closeButtonBottom: {
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 8,
    minWidth: 200,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
  },
});
