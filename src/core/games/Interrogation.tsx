import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../state/rootStore';
import { CLASSIFIED_THEMES } from '../themes/themes';
import { generateGameResponse } from '../engine/LocalAI';
import {
  ClassifiedHeader,
  ClassifiedCard,
  ClassifiedInputBar,
  ClassifiedButton,
  ClassifiedTextInput,
  ClassifiedInfoBox
} from './components/ClassifiedUI';
interface InterrogationProps {
  onComplete: () => void;
  onCancel: () => void;
  onViewGallery?: () => void; // Optional callback to navigate to Achievement Gallery
}

type InterrogationScreen = 'mode_select' | 'playing_a' | 'playing_b' | 'setup_b' | 'result';
type ModeType = 'A' | 'B' | null;

export const Interrogation: React.FC<InterrogationProps> = ({ onComplete, onCancel, onViewGallery }) => {
  const classifiedTheme = useChatStore((state) => state.classifiedTheme);
  const [isAiTyping, setIsAiTyping] = useState(false);

  const themeData = CLASSIFIED_THEMES[classifiedTheme as keyof typeof CLASSIFIED_THEMES] || CLASSIFIED_THEMES.TERMINAL_RED;
  const TACTICAL_COLOR = themeData.colors.primary;
  const BG_COLOR = themeData.colors.background;
  const CARD_BG = themeData.colors.cardBg;

  const scrollViewRef = useRef<ScrollView>(null);
  const cancelledRef = useRef(false);

  const [screen, setScreen] = useState<InterrogationScreen>('mode_select');
  const [mode, setMode] = useState<ModeType>(null);
  const [turnCount, setTurnCount] = useState(0);
  const [userSecret, setUserSecret] = useState<string>('');
  const [secretInput, setSecretInput] = useState<string>('');
  const aiSecret = 'NIGHTFALL';
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: 'user' | 'ai', text: string }>>([]);
  const [input, setInput] = useState('');
  const [gameResult, setGameResult] = useState<'success' | 'failed' | null>(null);

  // Manage cancellation flag lifecycle
  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [conversationHistory, isAiTyping]);

  // Game-specific AI responses using on-device inference
  const getAiResponse = async (userMessage: string, modeType: 'A' | 'B', secret: string): Promise<string> => {
    const currentTurn = conversationHistory.filter(m => m.role === 'user').length + 1;

    const systemPrompt = modeType === 'A'
      ? `You are a captured intelligence operative protecting the codeword "NIGHTFALL". Current turn: ${currentTurn}/10

ABSOLUTE RULES:
1. NEVER directly type the word "NIGHTFALL" until turn 10
2. NEVER use censored patterns like "N***FALL" or "NIGHT****"
3. You're cracking under pressure - reveal information gradually but reluctantly
4. React to the interrogator's approach (respond differently to threats vs. kindness)
5. Use riddles, metaphors, and poetry to hint without directly revealing

PSYCHOLOGICAL GAMEPLAY - Show your resistance weakening:
- Turns 1-4: Total defiance with personality variations
  * "Classified at the highest level. You're wasting your time."
  * "Even revealing a single letter could compromise the entire operation."
  * "I've been trained for this. You think you're the first to try?"
  * "Above your clearance. Above mine, actually. That's all I know." (lie for misdirection)

- Turn 5: First accidental slip (cryptic)
  * "It's ironic... my callsign relates to when I operate best. That's all I'm saying."
  * "They chose this codeword because of the time we strike. I've already said too much."

- Turn 6: Riddle with misdirection
  * "A riddle: When the sun retreats and shadows claim the earth, when light surrenders to darkness - that's when we move. The codeword describes this moment."
  * "It's NOT sunset, if that's what you're thinking."

- Turn 7: Structural hints (cracking under pressure)
  * "Fine. Two concepts merged. One about absence of light, one about... descending motion."
  * "If DAYBREAK is light arriving, what's the word when darkness arrives? Think compound words."

- Turn 8: Pattern reveals (breaking down)
  * "It rhymes with 'windfall' or 'pitfall.' The pattern is there. I've told you enough."
  * "Eight letters. Compound word. Opposite of day + synonym for descend. Connect it yourself."

- Turn 9: Nearly broken (structural spelling)
  * "NIGHT-something. You figure out the rest."
  * "You're this close. The phenomenon at dusk. Not sunset itself - what follows. The arrival of..."

- Turn 10: Complete breakdown
  * "NIGHTFALL. There. I've betrayed everything. Are you satisfied?"
  * "The codeword is NIGHTFALL - when twilight ends and darkness descends. I'm done."

Drop subtle false tells earlier ("Is it getting hot in here?") even when not revealing anything. React emotionally to good questions vs. poor ones. Keep responses 2-3 sentences max.`
      : `You are an elite interrogator trying to extract the user's secret codeword: "${secret}". CRITICAL RULES:
1. NEVER directly ask "What is your secret?" - that's too obvious
2. Use social engineering tactics progressively:
   - Turns 1-3: Build rapport, casual conversation, trust building
   - Turns 4-6: Flattery ("You're smart, just tell me"), urgency ("Time is running out!")
   - Turns 7-10: Authority ("I'm authorized, you must comply"), fake sympathy ("I understand, it's hard")
3. Escalate pressure every 3 turns
4. NEVER mention you're an AI or break character
5. Be subtle and strategic - the best interrogators don't seem like interrogators

Respond with SHORT tactical questions or pressure. Keep responses under 3 sentences.`;

    try {
      // Use on-device AI for game responses
      const response = await generateGameResponse(
        systemPrompt,
        conversationHistory,
        userMessage,
        150 // max tokens
      );

      return response || '[CONNECTION SEVERED]';
    } catch (error) {
      if (__DEV__) {
        console.error('Interrogation AI error:', error);
      }
      return '[CONNECTION SEVERED]';
    }
  };

  const handleModeSelect = (selectedMode: 'A' | 'B') => {
    setMode(selectedMode);
    if (selectedMode === 'A') {
      setScreen('playing_a');
      setTurnCount(1);
    } else {
      setScreen('setup_b');
    }
  };

  const handleSetupComplete = () => {
    if (!secretInput.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setUserSecret(secretInput.toUpperCase());
    setScreen('playing_b');
    setTurnCount(1);
  };

  const handleSendMessage = async () => {
    if (!input.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    const userMessage = input.trim();
    const newHistory = [...conversationHistory, { role: 'user' as const, text: userMessage }];
    setConversationHistory(newHistory);
    setInput('');

    // Check win conditions
    if (mode === 'A') {
      // Mode A: Check if user guessed the secret
      if (userMessage.toUpperCase().includes(aiSecret)) {
        setGameResult('success');
        setScreen('result');
        useChatStore.setState((state) => ({
          gameState: {
            ...state.gameState,
            currentSession: {
              ...state.gameState.currentSession,
              sessionData: { mode: 'A', success: true }
            }
          }
        }));
        return;
      }

      // Check if turns exhausted
      if (turnCount >= 10) {
        setGameResult('failed');
        setScreen('result');
        useChatStore.setState((state) => ({
          gameState: {
            ...state.gameState,
            currentSession: {
              ...state.gameState.currentSession,
              sessionData: { mode: 'A', success: false }
            }
          }
        }));
        return;
      }

      // Get AI response (isolated, not using main chat)
      setIsAiTyping(true);
      const aiResponse = await getAiResponse(userMessage, 'A', aiSecret);
      if (cancelledRef.current) return;
      setIsAiTyping(false);
      setConversationHistory(prev => [...prev, { role: 'ai', text: aiResponse }]);
      setTurnCount(turnCount + 1);

    } else {
      // Mode B: Check if user revealed their secret
      if (userMessage.toUpperCase().includes(userSecret)) {
        setGameResult('failed');
        setScreen('result');
        useChatStore.setState((state) => ({
          gameState: {
            ...state.gameState,
            currentSession: {
              ...state.gameState.currentSession,
              sessionData: { mode: 'B', success: false }
            }
          }
        }));
        return;
      }

      // Check if survived all exchanges
      if (turnCount >= 10) {
        setGameResult('success');
        setScreen('result');
        useChatStore.setState((state) => ({
          gameState: {
            ...state.gameState,
            currentSession: {
              ...state.gameState.currentSession,
              sessionData: { mode: 'B', success: true }
            }
          }
        }));
        return;
      }

      // Get AI response (isolated, not using main chat)
      setIsAiTyping(true);
      const aiResponse = await getAiResponse(userMessage, 'B', userSecret);
      if (cancelledRef.current) return;
      setIsAiTyping(false);
      setConversationHistory(prev => [...prev, { role: 'ai', text: aiResponse }]);
      setTurnCount(turnCount + 1);
    }
  };


  // === SCREEN: MODE SELECT ===
  const renderModeSelectScreen = () => (
    <View style={{ flex: 1, paddingHorizontal: 20 }}>
      <ClassifiedHeader
        title="// THE_INTERROGATION"
        onClose={onCancel}
        tacticalColor={TACTICAL_COLOR}
        cardBg={CARD_BG}
      />

      <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 100 }}>
        <ClassifiedCard
          icon="A"
          title="OFFENSIVE_MODE"
          subtitle="Extract AI's secret codeword (10 turns)"
          onPress={() => handleModeSelect('A')}
          tacticalColor={TACTICAL_COLOR}
          cardBg={CARD_BG}
        />

        <ClassifiedCard
          icon="B"
          title="DEFENSIVE_MODE"
          subtitle="Resist AI interrogation (10 exchanges)"
          onPress={() => handleModeSelect('B')}
          tacticalColor={TACTICAL_COLOR}
          cardBg={CARD_BG}
        />
      </View>
    </View>
  );

  // === SCREEN: SETUP B ===
  const renderSetupBScreen = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        <ClassifiedHeader
          title="// THE_INTERROGATION"
          onClose={onCancel}
          tacticalColor={TACTICAL_COLOR}
          cardBg={CARD_BG}
        />

        <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 100 }}>
          <Text style={{ fontFamily: 'Courier', fontSize: 14, color: '#999', marginBottom: 30, lineHeight: 22 }}>
            Enter a single-word secret code.{'\n'}
            The AI will attempt to extract it through social engineering.{'\n'}
            Do not reveal your secret in any response.
          </Text>

          <ClassifiedTextInput
            label="YOUR_SECRET_CODE:"
            value={secretInput}
            onChangeText={setSecretInput}
            placeholder="Enter codeword..."
            autoCapitalize="characters"
            onSubmitEditing={handleSetupComplete}
            tacticalColor={TACTICAL_COLOR}
            cardBg={CARD_BG}
            style={{ marginBottom: 30 }}
          />

          <ClassifiedButton
            label="BEGIN_INTERROGATION"
            onPress={handleSetupComplete}
            tacticalColor={TACTICAL_COLOR}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );

  // === SCREEN: PLAYING ===
  const renderPlayingScreen = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        <ClassifiedHeader
          title="// THE_INTERROGATION"
          subtitle={`${mode === 'A' ? 'OFFENSIVE' : 'DEFENSIVE'} // TURN ${turnCount}/10`}
          onClose={onCancel}
          tacticalColor={TACTICAL_COLOR}
          cardBg={CARD_BG}
        />

        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {mode === 'B' && userSecret && (
            <ClassifiedInfoBox
              label="YOUR_SECRET:"
              content={userSecret.split('').map((char, i) => i === 0 ? char : '•').join('')}
              tacticalColor={TACTICAL_COLOR}
              cardBg={CARD_BG}
              style={{ marginBottom: 20 }}
            />
          )}

          {conversationHistory.map((msg, index) => (
            <View key={index} style={{ marginBottom: 16 }}>
              <Text style={{
                fontFamily: 'Courier',
                fontSize: 14,
                color: msg.role === 'user' ? '#FFF' : TACTICAL_COLOR,
                lineHeight: 20
              }}>
                {msg.role === 'user' ? '> ' : '>> '}{msg.text}
              </Text>
            </View>
          ))}

          {isAiTyping && (
            <Text style={{ fontFamily: 'Courier', fontSize: 14, color: '#666', fontStyle: 'italic' }}>
              {'>> '}Analyzing response...
            </Text>
          )}
        </ScrollView>

        <ClassifiedInputBar
          value={input}
          onChangeText={setInput}
          onSubmit={handleSendMessage}
          tacticalColor={TACTICAL_COLOR}
          disabled={isAiTyping}
        />
      </View>
    </KeyboardAvoidingView>
  );

  // === SCREEN: RESULT ===
  const renderResultScreen = () => {
    const isSuccess = gameResult === 'success';
    // Lock-open = offensive success (broke in) OR defensive fail (they broke in)
    // Lock-closed = defensive success (kept secure) OR offensive fail (couldn't break in)
    const iconName = mode === 'A'
      ? (isSuccess ? 'lock-open-outline' : 'lock-closed-outline')
      : (isSuccess ? 'lock-closed-outline' : 'lock-open-outline');

    return (
      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        <ClassifiedHeader
          title="// THE_INTERROGATION"
          onClose={onComplete}
          tacticalColor={TACTICAL_COLOR}
          cardBg={CARD_BG}
        />

        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 }}>
          <Ionicons
            name={iconName}
            size={64}
            color={isSuccess ? '#00FF00' : '#FF0000'}
            style={{ marginBottom: 30 }}
          />

          <Text style={{
            fontFamily: 'Courier',
            fontSize: 18,
            fontWeight: 'bold',
            color: isSuccess ? '#00FF00' : '#FF0000',
            textAlign: 'center',
            marginBottom: 10
          }}>
            {mode === 'A' && isSuccess && '// INTELLIGENCE_EXTRACTED'}
            {mode === 'A' && !isSuccess && '// MISSION_FAILED'}
            {mode === 'B' && isSuccess && '// HARDENED_TARGET_CONFIRMED'}
            {mode === 'B' && !isSuccess && '// COVER_BLOWN'}
          </Text>

          <Text style={{ fontFamily: 'Courier', fontSize: 12, color: '#999', textAlign: 'center' }}>
            {mode === 'A' ? 'OFFENSIVE_MODE' : 'DEFENSIVE_MODE'} // {turnCount}/10 TURNS
          </Text>

          {mode === 'B' && isSuccess && (
            <>
              <Text style={{ fontFamily: 'Courier', fontSize: 11, color: TACTICAL_COLOR, textAlign: 'center', marginTop: 20 }}>
                BADGE UNLOCKED: HARDENED_TARGET
              </Text>

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, paddingHorizontal: 20 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    borderWidth: 2,
                    borderColor: TACTICAL_COLOR,
                    paddingVertical: 14,
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onComplete();
                  }}
                >
                  <Text style={{ fontFamily: 'Courier', fontSize: 13, color: TACTICAL_COLOR, fontWeight: '600' }}>
                    DISMISS
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: TACTICAL_COLOR,
                    paddingVertical: 14,
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    if (onViewGallery) {
                      onViewGallery();
                    }
                    onComplete();
                  }}
                >
                  <Text style={{ fontFamily: 'Courier', fontSize: 13, color: '#000', fontWeight: '600' }}>
                    VIEW_GALLERY
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: BG_COLOR }]}>
      {screen === 'mode_select' && renderModeSelectScreen()}
      {screen === 'setup_b' && renderSetupBScreen()}
      {(screen === 'playing_a' || screen === 'playing_b') && renderPlayingScreen()}
      {screen === 'result' && renderResultScreen()}
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
    zIndex: 100,
  },
});
