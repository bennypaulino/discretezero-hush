import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Pressable
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../../core/state/rootStore';
import { useSecureLock } from '../../core/hooks/useSecureLock';
import { useAppTheme } from '../../core/hooks/useAppTheme';
import { useAutoScroll } from '../../core/hooks/useAutoScroll';
import { useFilteredMessages } from '../../core/hooks/useFilteredMessages';
import { Typewriter } from '../../core/ui/Typewriter';
import { SettingsModal } from '../../core/ui/SettingsModal';
import { BlurView } from 'expo-blur';
import { useDoubleTap } from '../../core/hooks/useDoubleTap';
import { LockScreen } from '../../core/security/LockScreen';
// STREAMING (P1.11 Phase 0): Keep screen awake during AI generation
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

const stripEmojis = (str: string) => str.replace(/[^\x00-\x7F]/g, "").trim();

// --- 🛡️ PRIVACY SHIELD COMPONENT 🛡️ ---
interface PrivacyBlockProps {
    children: React.ReactNode;
    isSecure: boolean;
    onToggle: () => void;
    style?: any;
}

const PrivacyBlock = ({ children, isSecure, onToggle, style }: PrivacyBlockProps) => {
    const [isRevealed, setIsRevealed] = useState(false);

    useEffect(() => {
        setIsRevealed(false);
    }, [isSecure]);

    const isBlurVisible = isSecure && !isRevealed;

    return (
        <View style={[style, { position: 'relative' }]}>
            <View style={{ opacity: isBlurVisible ? 0.4 : 1 }}>
                {children}
            </View>

            {isBlurVisible && (
                 <BlurView
                    intensity={25}
                    tint="dark"
                    style={StyleSheet.absoluteFill}
                 />
            )}

            {isSecure && (
                <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={onToggle}
                    onLongPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                        setIsRevealed(prev => !prev);
                    }}
                    delayLongPress={200}
                />
            )}
        </View>
    );
};

export const DiscretionScreen = () => {
  const [input, setInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // FlatList ref for auto-scroll
  const flatListRef = useRef<FlatList>(null);

  const { isLocked, unlock } = useSecureLock();

  const {
      messages,
      sendMessage,
      isTyping,
      clearHistory,
      toggleFlavor,
      togglePrivacyBlur,
      privacyBlurEnabled,
      // STREAMING STATE (P1.11 Phase 0)
      streamingMessageId,
      streamingText,
  } = useChatStore();

  const modeDownloadState = useChatStore((state) => state.modeDownloadState);

  // Get active theme based on user selection
  const appTheme = useAppTheme();

  // Create compatibility layer for existing THEME usage
  // Memoized to prevent FlatList re-renders (P0 fix from expert panel review)
  const THEME = useMemo(() => ({
    bg: appTheme.colors.background,
    surface: appTheme.colors.cardBg,
    text: appTheme.colors.text,
    accent: appTheme.colors.primary,
    userBubble: appTheme.colors.inputBg,
  }), [appTheme.colors]);

  // --- FILTER MESSAGES ---
  // Only show messages that belong to the DISCRETION context.
  // This prevents Hush/Classified messages from "bleeding" into this screen.
  const displayMessages = useFilteredMessages('DISCRETION');

  // --- AUTO-SCROLL ON NEW MESSAGES ---
  // Scroll to bottom when messages change (e.g., AI responds)
  useAutoScroll(flatListRef, displayMessages.length);

  const handleGlobalDoubleTap = useDoubleTap();

  // STREAMING (P1.11 Phase 0): Keep screen awake during AI generation
  useEffect(() => {
    if (isTyping || streamingMessageId) {
      // Keep screen awake while generating response
      activateKeepAwakeAsync('ai-generation');
    } else {
      // Deactivate when done
      deactivateKeepAwake('ai-generation');
    }

    // Cleanup on unmount
    return () => {
      deactivateKeepAwake('ai-generation');
    };
  }, [isTyping, streamingMessageId]);

  // Check if AI model is downloaded
  const modelDownloaded = modeDownloadState.efficient === 'downloaded';

  // Show "no model" placeholder if model not downloaded
  if (!modelDownloaded) {
    return (
      <View style={{ flex: 1, backgroundColor: THEME.bg, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
        <Ionicons name="cloud-offline" size={80} color={appTheme.colors.subtext} />

        <Text style={[styles.noModelTitle, { color: THEME.text }]}>AI Model Not Downloaded</Text>

        <Text style={[styles.noModelDescription, { color: appTheme.colors.subtext }]}>
          To engage executive systems,{'\n'}
          download the 1.6 GB AI model.{'\n'}
          {'\n'}
          Operates 100% offline after download.
        </Text>

        <TouchableOpacity
          style={[styles.downloadButton, { backgroundColor: THEME.accent }]}
          onPress={() => {
            Haptics.selectionAsync();
            useChatStore.setState({ showModelDownloadPrompt: true });
          }}
          accessibilityLabel="Download AI model"
          accessibilityRole="button"
          accessibilityHint="Opens download flow for 1.6 GB AI model"
        >
          <Text style={styles.downloadButtonText}>Download AI Model</Text>
        </TouchableOpacity>

        <Text style={[styles.exploreNote, { color: appTheme.colors.dimSubtext || '#666' }]}>
          Or explore settings via the menu
        </Text>

        {/* Settings Modal */}
        <SettingsModal
          visible={showSettings}
          onClose={() => setShowSettings(false)}
          mode="DISCRETION"
        />

        {/* Menu button in header position */}
        <View style={styles.noModelMenuButton}>
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              setShowSettings(true);
            }}
          >
            <Text style={[styles.brand, { position: 'relative' }]}>DISCRETION.</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleSend = () => {
    if (!input.trim()) return;
    Haptics.selectionAsync();
    sendMessage(input);
    setInput('');

    // Auto-scroll to show the new message
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleClear = () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      clearHistory();
  };

  // FlatList optimization: Memoize callbacks to prevent unnecessary re-renders
  const keyExtractor = useCallback((item: { id: string }) => item.id, []);

  const contentContainerStyle = useMemo(() => ({
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 20
  }), []);

  const renderItem = useCallback(({ item }: { item: any }) => {
    // STREAMING (P1.11 Phase 0): Use streaming text for messages being generated
    const displayText = item.id === streamingMessageId ? streamingText : item.text;
    const cleanContent = stripEmojis(displayText);
    if (!cleanContent) return null;
    const isUser = item.role === 'user';

    return (
      <PrivacyBlock
        isSecure={privacyBlurEnabled}
        onToggle={handleGlobalDoubleTap}
        style={{ marginBottom: 28 }}
      >
        <View style={[
          styles.rowContent,
          isUser ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }
        ]}>
          {isUser ? (
            <View style={[styles.userBubble, { backgroundColor: THEME.userBubble }]}>
              <Text style={styles.userText}>{cleanContent}</Text>
            </View>
          ) : (
            <View style={styles.aiContainer}>
              <View style={[styles.line, { backgroundColor: THEME.accent }]} />
              <Typewriter
                text={cleanContent}
                style={styles.aiText}
                speed={5}
              />
            </View>
          )}
        </View>
      </PrivacyBlock>
    );
  }, [privacyBlurEnabled, handleGlobalDoubleTap, THEME.userBubble, THEME.accent, streamingMessageId, streamingText]);

  return (
    <View
        style={{ flex: 1, backgroundColor: THEME.bg }}
        onTouchEnd={handleGlobalDoubleTap}
    >
        <StatusBar barStyle="light-content" />

        <SettingsModal
            visible={showSettings}
            onClose={() => setShowSettings(false)}
            mode="DISCRETION"
        />

        {/* --- HEADER --- */}
        <PrivacyBlock
            isSecure={privacyBlurEnabled}
            onToggle={handleGlobalDoubleTap}
            style={[styles.headerWrapper, { backgroundColor: THEME.bg, borderBottomColor: THEME.surface }]}
        >
            <View style={styles.headerContent}>
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                        Haptics.selectionAsync();
                        setShowSettings(true);
                    }}
                    onLongPress={() => {
                        if (__DEV__) {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            toggleFlavor();
                        }
                    }}
                    accessibilityLabel="Discretion menu"
                    accessibilityRole="button"
                    accessibilityHint="Opens executive settings and preferences"
                >
                    <Text style={styles.brand}>DISCRETION.</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleClear}
                    accessibilityLabel="Clear record"
                    accessibilityRole="button"
                    accessibilityHint="Permanently removes all conversation history"
                >
                    <Text style={styles.action}>Clear Record</Text>
                </TouchableOpacity>
            </View>
        </PrivacyBlock>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          {/* --- FEED (Using Filtered Data) --- */}
          <FlatList
            ref={flatListRef}
            data={displayMessages}
            keyExtractor={keyExtractor}
            contentContainerStyle={contentContainerStyle}
            renderItem={renderItem}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={10}
            initialNumToRender={15}
            updateCellsBatchingPeriod={50}
          />

          {isTyping && <Text style={styles.status}>Processing...</Text>}

          <PrivacyBlock isSecure={privacyBlurEnabled} onToggle={handleGlobalDoubleTap}>
              <View style={[styles.inputBar, { borderTopColor: THEME.surface, backgroundColor: THEME.bg }]}>
                <TextInput
                  style={styles.input}
                  placeholder="Dictate inquiry..."
                  placeholderTextColor={appTheme.colors.subtext}
                  value={input}
                  onChangeText={setInput}
                  selectionColor={THEME.accent}
                  onSubmitEditing={handleSend}
                  multiline
                  textAlignVertical="center"
                  accessibilityLabel="Inquiry input"
                  accessibilityHint="Compose your confidential message"
                />
                <TouchableOpacity
                  onPress={handleSend}
                  style={styles.sendBtn}
                  accessibilityLabel="Send inquiry"
                  accessibilityRole="button"
                >
                   <View style={[styles.sendIcon, { backgroundColor: THEME.accent }]} />
                </TouchableOpacity>
              </View>
          </PrivacyBlock>
        </KeyboardAvoidingView>

        <LockScreen isLocked={isLocked} onUnlock={unlock} flavor="DISCRETION" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerWrapper: { paddingTop: 60, borderBottomWidth: 1 },
  headerContent: { paddingBottom: 20, paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { fontWeight: '700', fontSize: 16, color: '#FFF', letterSpacing: 2 },
  action: { color: '#444', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  rowContent: { flexDirection: 'row' },
  userBubble: { borderWidth: 1, borderColor: '#333', paddingVertical: 14, paddingHorizontal: 18, borderRadius: 12, borderBottomRightRadius: 2, maxWidth: '80%' },
  userText: { color: '#FFF', fontSize: 16, lineHeight: 22, fontWeight: '400' },
  aiContainer: { maxWidth: '90%', flexDirection: 'row' },
  aiText: { color: '#AAA', fontSize: 16, lineHeight: 24, fontWeight: '400', marginTop: -2 },
  line: { width: 2, marginRight: 16, height: '100%' },
  status: { marginLeft: 24, marginBottom: 10, color: '#444', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  inputBar: { borderTopWidth: 1, padding: 20, flexDirection: 'row', alignItems: 'center', minHeight: 80 },
  input: { flex: 1, color: '#FFF', fontSize: 16, minHeight: 40, maxHeight: 120, paddingTop: 10, paddingBottom: 10 },
  sendBtn: { padding: 10 },
  sendIcon: { width: 6, height: 6, borderRadius: 0 },
  noModelTitle: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  noModelDescription: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  downloadButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginBottom: 16,
  },
  downloadButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  exploreNote: {
    fontSize: 13,
    textAlign: 'center',
  },
  noModelMenuButton: {
    position: 'absolute',
    top: 60,
    left: 24,
  },
});
