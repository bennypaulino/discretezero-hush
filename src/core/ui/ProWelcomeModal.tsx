import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChatStore } from '../state/rootStore';
import { GAME_TRIGGERS } from '../engine/GameTriggers';
import { useAppTheme } from '../hooks/useAppTheme';
import { HushButton } from '../../apps/hush/components/HushUI';

interface ProWelcomeModalProps {
  visible: boolean;
  onDismiss: () => void;
  mode: 'HUSH' | 'CLASSIFIED'; // Which mode the user is currently in
}

export const ProWelcomeModal: React.FC<ProWelcomeModalProps> = ({ visible, onDismiss, mode }) => {
  const insets = useSafeAreaInsets();
  const isTerminal = mode === 'CLASSIFIED';
  const activeTheme = useAppTheme();

  // For CLASSIFIED mode, use theme colors (defaults to TERMINAL_RED)
  // For HUSH mode, use softer colors
  const themeColor = isTerminal ? activeTheme.colors.primary : '#FFFFFF';
  const backgroundColor = isTerminal ? activeTheme.colors.background : '#1A1A1A';

  // Get Pro-only games based on current mode
  const proGames = GAME_TRIGGERS.filter(trigger => {
    const isPro = !['breathe', 'gratitude', 'unburdening'].includes(trigger.gameId);
    const isInMode = trigger.flavors.includes(mode);
    return isPro && isInMode;
  });

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleDismiss}
      accessibilityViewIsModal={true}
    >
      <BlurView
        intensity={80}
        tint="dark"
        style={StyleSheet.absoluteFill}
      >
        <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
          <View style={[
            styles.modalContent,
            {
              backgroundColor: backgroundColor,
              borderColor: themeColor,
            }
          ]}>
            {/* Header */}
            <View style={styles.header}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={[
                  styles.title,
                  {
                    fontFamily: isTerminal ? 'Courier' : 'System',
                    color: themeColor,
                  }
                ]}>
                  {isTerminal ? '═══ PRO_ACCESS_GRANTED ═══' : 'Welcome'}
                </Text>
                <Text style={[
                  styles.subtitle,
                  {
                    fontFamily: isTerminal ? 'Courier' : 'System',
                    color: isTerminal ? activeTheme.colors.subtext : 'rgba(255, 255, 255, 0.6)',
                  }
                ]}>
                  {isTerminal ? 'ADVANCED_PROTOCOLS_UNLOCKED' : 'Your journey deepens'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleDismiss}
                style={[
                  styles.closeButton,
                  { backgroundColor: `${themeColor}20` }
                ]}
              >
                <Ionicons name="close" size={24} color={themeColor} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              {/* Welcome message and protocol list */}
              {isTerminal ? (
                <>
                  <Text style={[
                    styles.welcomeText,
                    {
                      fontFamily: 'Courier',
                      color: activeTheme.colors.text,
                    }
                  ]}>
                    You now have access to all classified training protocols.
                  </Text>

                  <View style={[
                    styles.protocolBox,
                    {
                      backgroundColor: `${themeColor}10`,
                      borderLeftColor: themeColor,
                    }
                  ]}>
                    <Text style={[
                      styles.protocolHeader,
                      {
                        fontFamily: 'Courier',
                        color: themeColor,
                      }
                    ]}>
                      AVAILABLE_PROTOCOLS:
                    </Text>

                    {proGames.map((game, index) => (
                      <View key={game.gameId} style={styles.protocolItem}>
                        <Text style={[
                          styles.protocolText,
                          {
                            fontFamily: 'Courier',
                            color: activeTheme.colors.text,
                          }
                        ]}>
                          {'>'} {game.keywords[0]}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <>
                  <Text style={[
                    styles.welcomeText,
                    {
                      fontFamily: 'System',
                      color: 'rgba(255, 255, 255, 0.9)',
                      marginBottom: 12,
                    }
                  ]}>
                    Everything is now unlocked, whenever you need it:
                  </Text>

                  <View style={[
                    styles.protocolBox,
                    {
                      backgroundColor: `${themeColor}10`,
                      borderLeftColor: themeColor,
                    }
                  ]}>
                    {proGames.map((game, index) => (
                      <View key={game.gameId} style={styles.protocolItem}>
                        <Text style={[
                          styles.protocolText,
                          {
                            fontFamily: 'System',
                            color: 'rgba(255, 255, 255, 0.9)',
                          }
                        ]}>
                          {'•'} {game.keywords[0]}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {/* Help command hint */}
              <View style={[
                styles.hintBox,
                {
                  backgroundColor: isTerminal ? `${activeTheme.colors.accent}20` : 'rgba(255, 165, 0, 0.1)',
                  borderLeftColor: isTerminal ? activeTheme.colors.accent : '#FFA500',
                }
              ]}>
                <Text style={[
                  styles.hintTitle,
                  {
                    fontFamily: isTerminal ? 'Courier' : 'System',
                    color: isTerminal ? activeTheme.colors.accent : '#FFA500',
                  }
                ]}>
                  {isTerminal ? 'PRO_TIP:' : 'Remember'}
                </Text>
                <Text style={[
                  styles.hintText,
                  {
                    fontFamily: isTerminal ? 'Courier' : 'System',
                    color: isTerminal ? activeTheme.colors.text : 'rgba(255, 255, 255, 0.9)',
                  }
                ]}>
                  {isTerminal
                    ? `Type 'help' anytime to see all available protocols`
                    : `Explore at your own pace. Each practice is here when you need it.`}
                </Text>
              </View>
            </ScrollView>

            {/* Footer button */}
            {mode === 'HUSH' ? (
              <HushButton
                variant="primary"
                onPress={handleDismiss}
                fullWidth
                accessibilityHint="Continue using Hush Pro features"
              >
                Continue
              </HushButton>
            ) : (
              <TouchableOpacity
                style={[
                  styles.dismissButton,
                  {
                    backgroundColor: themeColor,
                  }
                ]}
                onPress={handleDismiss}
              >
                <Text style={[
                  styles.dismissButtonText,
                  {
                    fontFamily: 'Courier',
                    color: '#000',
                  }
                ]}>
                  ACKNOWLEDGED
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    borderRadius: 16,
    borderWidth: 2,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  subtitle: {
    fontSize: 14,
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
  },
  scrollView: {
    flex: 1,
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  protocolBox: {
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: 20,
  },
  protocolHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  protocolItem: {
    marginBottom: 8,
  },
  protocolText: {
    fontSize: 13,
    lineHeight: 20,
  },
  hintBox: {
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: 8,
  },
  hintTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  hintText: {
    fontSize: 13,
    lineHeight: 20,
  },
  dismissButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  dismissButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
