import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Animated, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../state/rootStore';
import { HUSH_THEMES } from '../themes/themes';
import { renderClearAnimation } from '../animations/AnimationRegistry';
import { useSoundEffect } from '../hooks/useSoundEffect'
import { useAnimatedValue } from '../hooks/useAnimatedValue';;
import { HushCloseButton, HushButton, HushScreenHeader, HushIconHeader } from '../../apps/hush/components/HushUI';

interface UnburdeningChatProps {
  onComplete: () => void;
  onCancel: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
}

type ChatScreen = 'chat' | 'confirm' | 'burning' | 'complete';

// Helper to get Hush theme properties
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

export const UnburdeningChat: React.FC<UnburdeningChatProps> = ({ onComplete, onCancel }) => {
  // MEMORY FIX: Selective subscriptions instead of destructuring
  const hushTheme = useChatStore((state) => state.hushTheme);
  const hushBurnStyle = useChatStore((state) => state.hushBurnStyle);
  const theme = getHushTheme(hushTheme);
  const { playForAnimation } = useSoundEffect();

  const [screen, setScreen] = useState<ChatScreen>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'ai',
      text: "I'm here. What's on your mind?",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const cancelledRef = useRef(false);

  // Opacity animation for disintegration fadeout
  const confirmationOpacity = useAnimatedValue(1);

  // Manage cancellation flag lifecycle
  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      role: 'user',
      text: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Generate AI response
    try {
      // Pass the updated conversation history including the user's new message
      const updatedHistory = [...messages, userMessage];
      const response = await generateEmpathicResponse(updatedHistory, userMessage.text);

      if (cancelledRef.current) return;

      const aiMessage: ChatMessage = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        role: 'ai',
        text: response,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    } catch (error) {
      if (__DEV__) {
        console.error('Error generating response:', error);
      }
      if (cancelledRef.current) return;
      setIsTyping(false);
    }
  };

  const handleBurnPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setScreen('confirm');
  };

  const handleConfirmBurn = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    playForAnimation(hushBurnStyle);
    setScreen('burning');

    // Fade out confirmation screen elements if using disintegration or clear animation
    if (hushBurnStyle === 'disintegrate') {
      Animated.timing(confirmationOpacity, {
        toValue: 0,
        duration: 1500,
        useNativeDriver: true,
      }).start();
    } else if (hushBurnStyle === 'clear') {
      Animated.timing(confirmationOpacity, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleAnimationComplete = () => {
    setScreen('complete');
    setTimeout(() => {
      onComplete();
    }, 2000);
  };

  // Check if conversation has reached a natural endpoint (3+ user messages)
  const canBurn = messages.filter((m) => m.role === 'user').length >= 3;

  // === CHAT SCREEN ===
  if (screen === 'chat') {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: theme.background,
        }}
      >
        <View style={{ flex: 1, paddingTop: 60 }}>
          {/* Header - conditional: close button OR release button */}
          <View style={{
            paddingHorizontal: 20,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.divider,
          }}>
            {!canBurn ? (
              <HushScreenHeader
                title="Unburdening Chat"
                subtitle="Private session"
                onClose={onCancel}
                style={{ marginBottom: 0 }}
              />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontFamily: theme.fontHeader,
                    fontSize: 28,
                    fontWeight: '700',
                    color: theme.accent,
                    marginBottom: 8,
                  }}>
                    Unburdening Chat
                  </Text>
                  <Text style={{
                    fontFamily: theme.fontBody,
                    fontSize: 14,
                    color: theme.subtext,
                  }}>
                    Private session
                  </Text>
                </View>

                <HushButton
                  variant="secondary"
                  onPress={handleBurnPress}
                  accessibilityHint="Release all messages in this conversation"
                >
                  Release
                </HushButton>
              </View>
            )}
          </View>

          {/* Messages */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 20, paddingBottom: 10 }}
            renderItem={({ item }) => (
              <View style={{
                alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                marginBottom: 16,
              }}>
                <View style={{
                  backgroundColor: item.role === 'user' ? theme.accent : '#262626',
                  borderRadius: 16,
                  padding: 12,
                  minHeight: 44,
                }}>
                  <Text style={{
                    fontFamily: theme.fontBody,
                    fontSize: 16,
                    color: item.role === 'user' ? '#000' : '#FFFFFF',
                    lineHeight: 22,
                  }}>
                    {item.text}
                  </Text>
                </View>
              </View>
            )}
          />

          {/* Typing indicator */}
          {isTyping && (
            <View style={{
              alignSelf: 'flex-start',
              maxWidth: '80%',
              marginLeft: 20,
              marginBottom: 16,
            }}>
              <View style={{
                backgroundColor: '#262626',
                borderRadius: 16,
                padding: 12,
                minHeight: 44,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}>
                <ActivityIndicator size="small" color={theme.subtext} />
                <Text style={{
                  fontFamily: theme.fontBody,
                  fontSize: 16,
                  color: '#FFFFFF',
                }}>
                  thinking
                </Text>
              </View>
            </View>
          )}

          {/* Input */}
          <View style={{
            flexDirection: 'row',
            padding: 20,
            gap: 10,
            alignItems: 'center',
          }}>
            <TextInput
              style={{
                flex: 1,
                minHeight: 50,
                maxHeight: 120,
                borderRadius: 25,
                borderWidth: 1,
                borderColor: theme.accent,
                paddingHorizontal: 20,
                paddingTop: 14,
                paddingBottom: 14,
                fontFamily: theme.fontBody,
                fontSize: 15,
                color: theme.accent,
              }}
              placeholder="Type here..."
              placeholderTextColor={theme.subtext}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSend}
              multiline
              keyboardAppearance="dark"
              textAlignVertical="center"
              editable={!isTyping}
            />

            <TouchableOpacity
              onPress={handleSend}
              disabled={!input.trim() || isTyping}
            >
              <Text style={{
                color: input.trim() && !isTyping ? theme.accent : theme.subtext,
                fontWeight: 'bold',
                fontSize: 16,
              }}>
                Send
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // === CONFIRMATION SCREEN ===
  if (screen === 'confirm') {
    return (
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
      }}>
        <Ionicons name="balloon-outline" size={80} color={theme.accent} style={{ marginBottom: 30 }} />

        <Text style={{
          fontFamily: theme.fontHeader,
          fontSize: 28,
          fontWeight: '700',
          color: theme.text,
          marginBottom: 16,
          textAlign: 'center',
        }}>
          Release All?
        </Text>

        <Text style={{
          fontFamily: theme.fontBody,
          fontSize: 16,
          color: theme.subtext,
          textAlign: 'center',
          lineHeight: 24,
          marginBottom: 40,
          maxWidth: 400,
        }}>
          This will permanently delete the entire conversation. No recovery is possible.
        </Text>

        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View style={{ flex: 1 }}>
            <HushButton
              variant="secondary"
              onPress={() => setScreen('chat')}
              accessibilityHint="Return to the chat"
            >
              Go Back
            </HushButton>
          </View>

          <View style={{ flex: 1 }}>
            <HushButton
              variant="primary"
              onPress={handleConfirmBurn}
              accessibilityHint="Confirm and release all messages"
            >
              Release It
            </HushButton>
          </View>
        </View>
      </View>
    );
  }

  // === BURNING SCREEN ===
  if (screen === 'burning') {
    const animation = renderClearAnimation(hushBurnStyle, false, handleAnimationComplete);

    return (
      <>
        {/* Keep confirmation screen visible for blur effect */}
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}>
          <Animated.View style={{
            opacity: confirmationOpacity,
            alignItems: 'center',
          }}>
            <Ionicons name="balloon-outline" size={80} color={theme.accent} style={{ marginBottom: 30 }} />

          <Text style={{
            fontFamily: theme.fontHeader,
            fontSize: 28,
            fontWeight: '700',
            color: theme.text,
            marginBottom: 16,
            textAlign: 'center',
          }}>
            Release All?
          </Text>

          <Text style={{
            fontFamily: theme.fontBody,
            fontSize: 16,
            color: theme.subtext,
            textAlign: 'center',
            lineHeight: 24,
            marginBottom: 40,
            maxWidth: 400,
          }}>
            This will permanently delete the entire conversation. No recovery is possible.
          </Text>

          <View style={{ flexDirection: 'row', gap: 16 }}>
            <View
              style={{
                backgroundColor: theme.card,
                paddingHorizontal: 32,
                paddingVertical: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.divider,
                minWidth: 140,
              }}
            >
              <Text style={{
                fontFamily: theme.fontHeader,
                fontSize: 16,
                fontWeight: '700',
                color: theme.text,
                textAlign: 'center',
              }}>
                Go Back
              </Text>
            </View>

            <View
              style={{
                backgroundColor: theme.accent,
                paddingHorizontal: 32,
                paddingVertical: 16,
                borderRadius: 12,
                minWidth: 140,
              }}
            >
              <Text style={{
                fontFamily: theme.fontHeader,
                fontSize: 16,
                fontWeight: '700',
                color: '#000',
                textAlign: 'center',
              }}>
                Release It
              </Text>
            </View>
          </View>
          </Animated.View>
        </View>

        {/* Animation overlay */}
        {animation}
      </>
    );
  }

  // === COMPLETION SCREEN ===
  return (
    <View style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    }}>
      <HushIconHeader
        icon="checkmark-circle"
        title="Complete"
        subtitle="Released."
      />
    </View>
  );
};

// Crisis keywords that warrant resources
const CRISIS_KEYWORDS = [
  'kill myself', 'suicide', 'end my life', 'want to die', 'better off dead',
  'hurt myself', 'self harm', 'cut myself', 'kill someone', 'hurt them',
  'abuse', 'abused', 'abusing', 'molest', 'assault'
];

function detectCrisisContent(text: string): boolean {
  const lowerText = text.toLowerCase();
  return CRISIS_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

// Mock AI response generator - validates feelings, not actions
async function generateEmpathicResponse(
  conversationHistory: ChatMessage[],
  userMessage: string
): Promise<string> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));

  // Crisis detection
  if (detectCrisisContent(userMessage)) {
    return "I hear that you're struggling. Please reach out for support:\n\nNational Suicide Prevention Lifeline:\n988\n\nCrisis Text Line:\nText \"HELLO\" to 741741\n\nYou don't have to face this alone.";
  }

  const messageCount = conversationHistory.filter((m) => m.role === 'user').length;

  // Responses that validate FEELINGS, not ACTIONS
  const responses = [
    "I hear the weight you're carrying. Tell me more about how this feels.",
    "Those feelings sound difficult. How long have you been feeling this way?",
    "I hear your pain. What else do you need to express?",
    "It makes sense that you feel this way. What would ease this burden?",
    "You've shared deeply. Ready to release this?",
  ];

  const index = Math.min(messageCount - 1, responses.length - 1);

  return responses[index];
}
