import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChatStore, Message } from '../../core/state/rootStore';
import { useAppTheme } from '../../core/hooks/useAppTheme';
import { useSecureLock } from '../../core/hooks/useSecureLock';
import { useDoubleTap } from '../../core/hooks/useDoubleTap';
import { useSoundEffect } from '../../core/hooks/useSoundEffect';
import { useAutoScroll } from '../../core/hooks/useAutoScroll';
import { useFilteredMessages } from '../../core/hooks/useFilteredMessages';
import { useAnimatedValue } from '../../core/hooks/useAnimatedValue';
import { PrivacyMessage } from './components/PrivacyMessage';
import { SettingsModal } from '../../core/ui/SettingsModal';
import { TypingIndicator } from '../../core/ui/TypingIndicator';
import { BadgeUnlockModal } from '../../core/ui/BadgeUnlockModal';
import { ModelDownloadErrorModal } from '../../core/ui/ModelDownloadErrorModal';
import { UsageIndicator } from '../../core/ui/UsageIndicator';
import { Toast } from '../../core/ui/Toast';
import { PaywallModal } from '../../core/ui/PaywallModal';
import { PostPurchaseCelebration } from '../../core/ui/PostPurchaseCelebration';
import { TitleFlicker } from '../../core/ui/TitleFlicker';
import { TitleGlow } from '../../core/ui/TitleGlow';
import { useDiscoveryHints } from '../../core/hooks/useDiscoveryHints';
import { LockScreen } from '../../core/security/LockScreen';
import { GAME_TRIGGERS } from '../../core/engine/GameTriggers';
import { ProWelcomeModal } from '../../core/ui/ProWelcomeModal';
import { BalancedUpgradeToast } from '../../core/ui/BalancedUpgradeToast';
//burn animations
import { renderClearAnimation } from '../../core/animations/AnimationRegistry';
import { ClearAnimationProvider } from '../../core/animations/ClearAnimationContext';
import NetInfo from '@react-native-community/netinfo';
import { shouldOfferBalanced } from '../../core/utils/deviceCapabilities';
// STREAMING (P1.11 Phase 0): Keep screen awake during AI generation
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
// TOKEN COUNTER (P1.11 Phase 6.5): Live token counter
import { useTokenCounter } from '../../core/hooks/useTokenCounter';


export const HushScreen = () => {
  const [input, setInput] = useState('');
  const [isClearing, setIsClearing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [showProWelcome, setShowProWelcome] = useState(false);
  const [settingsInitialScreen, setSettingsInitialScreen] = useState<string | undefined>(undefined);
  const [showBalancedToast, setShowBalancedToast] = useState(false);

  // Layout Safe Areas
  const insets = useSafeAreaInsets();

  // Animation Values
  const contentOpacity = useAnimatedValue(1);
  const contentOffset = useAnimatedValue(0);

  // FlatList ref for auto-scroll
  const flatListRef = useRef<FlatList>(null);

  // --- DOUBLE TAP HOOK ---
  // Replaces the local ref and manual function
  const handleGlobalTouch = useDoubleTap();

  // Use the Shared Brain
  const { isLocked, unlock } = useSecureLock();

  // Sound effects for animations
  const { playForAnimation } = useSoundEffect();

  const {
    messages, sendMessage, addMessage, isTyping, clearHistory,
    toggleFlavor, showPaywall, paywallReason, setShowPaywall, triggerPaywall, handleDailyLimitBannerTap, togglePrivacyBlur,
    hushBurnStyle, subscriptionTier, proFirstLaunchSeen, setProFirstLaunchSeen,
    showPostPurchaseCelebration, setShowPostPurchaseCelebration,
    // STREAMING STATE (P1.11 Phase 0)
    streamingMessageId, streamingText,
  } = useChatStore();

  // Badge unlock notification
  const newlyUnlockedBadge = useChatStore((state) => state.gameState.newlyUnlockedBadge);
  const setNewlyUnlockedBadge = useChatStore((state) => state.setNewlyUnlockedBadge);

  // Balanced upgrade toast state
  const messageCountSinceUpgradeOffer = useChatStore((state) => state.messageCountSinceUpgradeOffer);
  const balancedUpgradeOffered = useChatStore((state) => state.balancedUpgradeOffered);
  const activeGameId = useChatStore((state) => state.gameState.currentSession.activeGameId);
  const modeDownloadState = useChatStore((state) => state.modeDownloadState);

  // Model download error state
  const downloadError = useChatStore((state) => state.downloadError);
  const clearDownloadError = useChatStore((state) => state.clearDownloadError);
  const startModeDownload = useChatStore((state) => state.startModeDownload);

  // Navigation state
  const requestedSettingsScreen = useChatStore((state) => state.requestedSettingsScreen);
  const requestSettingsScreen = useChatStore((state) => state.requestSettingsScreen);

  const isPro = subscriptionTier !== 'FREE';

  // Get active theme based on user selection
  const activeTheme = useAppTheme();

  // Check if AI model is downloaded
  const modelDownloaded = modeDownloadState.efficient === 'downloaded';

  // DEBUG: Log model state
  if (__DEV__) {
    console.log('[HushScreen] modeDownloadState.efficient:', modeDownloadState.efficient);
    console.log('[HushScreen] modelDownloaded:', modelDownloaded);
    console.log('[HushScreen] Should show placeholder:', !modelDownloaded);
  }

  // Progressive discovery hints
  const {
    shouldShowToast,
    toastMessage,
    toastDuration,
    shouldFlicker,
    shouldGlow,
    dismissToast,
    onFlickerComplete,
  } = useDiscoveryHints();

  // Sequencing state: control when effects appear after flicker
  const [flickerDone, setFlickerDone] = useState(false);
  const [showToastNow, setShowToastNow] = useState(false);
  const [showGlowNow, setShowGlowNow] = useState(false);

  // Handle flicker completion and trigger next effect
  const handleFlickerComplete = () => {
    onFlickerComplete();
    setFlickerDone(true);

    // If there's a toast to show, show it now
    if (shouldShowToast) {
      setShowToastNow(true);
    }
    // If there's a glow to show, show it now
    if (shouldGlow) {
      setShowGlowNow(true);
    }
  };

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

  // Reset sequencing when hints change
  useEffect(() => {
    if (!shouldFlicker) {
      setFlickerDone(false);
    }
    if (!shouldShowToast) {
      setShowToastNow(false);
    }
    if (!shouldGlow) {
      setShowGlowNow(false);
    }

    // If flicker is active with toast or glow, reset the sequence
    if (shouldFlicker && (shouldShowToast || shouldGlow)) {
      setFlickerDone(false);
      setShowToastNow(false);
      setShowGlowNow(false);
    }
    // If no flicker but toast/glow are active, show them immediately
    if (!shouldFlicker && shouldShowToast) {
      setShowToastNow(true);
    }
    if (!shouldFlicker && shouldGlow) {
      setShowGlowNow(true);
    }
  }, [shouldFlicker, shouldShowToast, shouldGlow]);

  // Handle navigation requests from game completion screens
  useEffect(() => {
    if (requestedSettingsScreen) {
      setSettingsInitialScreen(requestedSettingsScreen);
      setModalVisible(true);
      requestSettingsScreen(null); // Clear the request
    }
  }, [requestedSettingsScreen]);

  // Get messages to display based on decoy mode
  const displayMessages = useFilteredMessages('HUSH');

  // --- TOKEN COUNTER (P1.11 Phase 6.5) ---
  // TOKEN COUNTER (P1.11 Phase 6.5): Live token counter with blocking
  const tokenCountInfo = useTokenCounter({
    input,
    subscriptionTier,
    subtextColor: activeTheme.colors.subtext,
    isInputEditable: true, // Hush: Always editable
  });

  // --- AUTOMATIC PAYWALL LISTENER ---
  // PaywallModal now renders independently based on showPaywall state
  // No need to open SettingsModal anymore

  // --- BALANCED UPGRADE TOAST ---
  const balancedToastCancelledRef = useRef(false);

  useEffect(() => {
    balancedToastCancelledRef.current = false;

    const checkBalancedToast = async () => {
      // Guardrails: Check message count (10-20), not offered yet, not already downloaded
      if (
        messageCountSinceUpgradeOffer < 10 ||
        messageCountSinceUpgradeOffer > 20 ||
        balancedUpgradeOffered ||
        modeDownloadState.balanced === 'downloaded'
      ) {
        return;
      }

      // Check if device supports Balanced
      const deviceSupportsBalanced = await shouldOfferBalanced();
      if (balancedToastCancelledRef.current) return;
      if (!deviceSupportsBalanced) {
        return;
      }

      // Check network connectivity (only offer when online)
      const networkState = await NetInfo.fetch();
      if (balancedToastCancelledRef.current) return;
      if (!networkState.isConnected) {
        return;
      }

      // Check if not during active game
      if (activeGameId !== null) {
        return;
      }

      // Final cancellation check before state updates
      if (balancedToastCancelledRef.current) return;

      // All conditions met - show toast
      setShowBalancedToast(true);
      useChatStore.setState({ balancedUpgradeOffered: true });
    };

    checkBalancedToast();

    return () => {
      balancedToastCancelledRef.current = true;
    };
  }, [messageCountSinceUpgradeOffer, balancedUpgradeOffered, modeDownloadState.balanced, activeGameId]);

  // --- AUTO-SCROLL ON NEW MESSAGES ---
  // Scroll to bottom when messages change (e.g., AI responds)
  useAutoScroll(flatListRef, displayMessages.length);

  // Show "no model" placeholder if model not downloaded
  if (!modelDownloaded) {
    return (
      <View style={[styles.container, { backgroundColor: activeTheme.colors.background, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }]}>
        <Ionicons name="cloud-offline" size={80} color={activeTheme.colors.subtext} />

        <Text style={[styles.noModelTitle, { color: activeTheme.colors.text }]}>AI Model Not Downloaded</Text>

        <Text style={[styles.noModelDescription, { color: activeTheme.colors.subtext }]}>
          To chat, download the 1.6 GB AI model.{'\n'}
          Works 100% offline after download.
        </Text>

        <TouchableOpacity
          style={[styles.downloadButton, { backgroundColor: activeTheme.colors.primary }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            useChatStore.setState({ showModelDownloadPrompt: true });
          }}
          accessibilityLabel="Download AI model"
          accessibilityRole="button"
          accessibilityHint="Opens download flow for 1.6 GB AI model"
        >
          <Text style={styles.downloadButtonText}>Download AI Model</Text>
        </TouchableOpacity>

        <Text style={[styles.exploreNote, { color: activeTheme.colors.dimSubtext || '#666' }]}>
          Or explore settings via the menu
        </Text>

        <SettingsModal
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setSettingsInitialScreen(undefined);
          }}
          initialScreen={settingsInitialScreen}
        />

        <View style={styles.noModelMenuButton}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setModalVisible(true);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="menu" size={24} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleSend = () => {
    if (!input.trim()) return;

    const cmd = input.trim();

    // Check for help command
    const helpKeywords = ['help', 'games', 'commands', 'protocols'];
    const isHelpCommand = helpKeywords.some(keyword =>
      cmd.toLowerCase() === keyword || cmd.toLowerCase() === `/${keyword}`
    );

    if (isHelpCommand) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Get games for HUSH mode
      const hushGames = GAME_TRIGGERS.filter(trigger =>
        trigger.flavors.includes('HUSH')
      );

      // Build help message
      const gameList = hushGames.map(game => {
        const keywords = game.keywords.slice(0, 2).map(k => `'${k}'`).join(' or ');
        return `• ${keywords}`;
      }).join('\n');

      const helpMessage = `Mindful Practices

${gameList}

Choose what you need right now.`;

      // Add system message to history
      addMessage(helpMessage, 'ai');

      setInput('');

      // Auto-scroll to show the help message
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    sendMessage(input);
    setInput('');

    // Increment message count for Balanced upgrade toast tracking
    if (!balancedUpgradeOffered && modeDownloadState.balanced !== 'downloaded') {
      useChatStore.setState((state) => ({
        messageCountSinceUpgradeOffer: state.messageCountSinceUpgradeOffer + 1,
      }));
    }

    // Auto-scroll to show the new message
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSecretTrigger = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    toggleFlavor();
  };

  const handleProWelcomeDismiss = () => {
    setShowProWelcome(false);
    setProFirstLaunchSeen(true);
  };

  const handleBalancedUpgrade = () => {
    setShowBalancedToast(false);
    // For iPhone 16+ Pro users showing both options, open Settings
    // For others, trigger download directly
    // TODO: Implement download trigger or Settings navigation
    setModalVisible(true);
    setSettingsInitialScreen('performance');
  };

  const handleBalancedDismiss = () => {
    setShowBalancedToast(false);
    useChatStore.setState({ balancedUpgradeDeclined: true });
  };

  // Show Pro welcome modal if user just upgraded
  useEffect(() => {
    if (isPro && !proFirstLaunchSeen) {
      const timer = setTimeout(() => {
        setShowProWelcome(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isPro, proFirstLaunchSeen]);

  // --- ANIMATION HANDLERS ---
    const handleClear = () => {
        if (messages.length === 0) return;

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        playForAnimation(hushBurnStyle); // Play sound based on selected animation
        setIsClearing(true);

        // DYNAMIC ANIMATION SETTINGS
        let fadeDuration = 800;
        let shouldSlide = false;

        // Customize timing based on selected style
        switch (hushBurnStyle) {
            case 'clear':
                fadeDuration = 800; // Two-stage clear (text + bubbles)
                shouldSlide = false;
                break;
            case 'disintegrate':
                fadeDuration = 800; // Fast fade for dust
                shouldSlide = true; // Slide away
                break;
            case 'dissolve':
                fadeDuration = 2000; // Medium fade
                shouldSlide = false;
                break;
            case 'ripple':
                fadeDuration = 5000; // VERY SLOW fade to let ripples work
                shouldSlide = false;
                break;
            case 'rain':
                fadeDuration = 5500; // Very slow fade for rain animation
                shouldSlide = false;
                break;
        }

        // Execute Animation
        // For 'clear' animation: messages animate internally, skip parent contentOpacity
        // For other animations: use existing contentOpacity system
        if (hushBurnStyle !== 'clear') {
            Animated.parallel([
                Animated.timing(contentOpacity, {
                    toValue: 0,
                    duration: fadeDuration,
                    useNativeDriver: true
                }),
                shouldSlide ? Animated.timing(contentOffset, {
                    toValue: 100,
                    duration: 1000,
                    useNativeDriver: true
                }) : Animated.delay(0)
            ]).start();
        }
        // For 'clear': animation triggered by ClearEffect via context
    };

  const onDustComplete = () => {
      // 2. Delete the data while Opacity is still 0
      clearHistory();

      // 3. Wait 100ms to ensure React has fully rendered the empty list
      setTimeout(() => {
          setIsClearing(false); // Remove particles

          // Reset position instantly (it's invisible)
          contentOffset.setValue(0);

          // 4. Gently fade the "Empty" screen back in
          Animated.timing(contentOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true
          }).start();
      }, 100);
  };

  // FlatList optimization: Memoize callbacks to prevent unnecessary re-renders
  const keyExtractor = useCallback((item: { id: string }) => item.id, []);

  const contentContainerStyle = useMemo(() => ({
    paddingBottom: 180,
    flexGrow: 1
  }), []);

  const renderItem = useCallback(({ item }: { item: Message }) => {
    // STREAMING (P1.11 Phase 0): Use streaming text for messages being generated
    const displayText = item.id === streamingMessageId ? streamingText : item.text;

    // TYPING INDICATOR (P1.11 Phase 7): Show typing animation for placeholder messages
    // Placeholder messages have empty text and are waiting for AI response
    const isPlaceholder = item.role === 'ai' && !displayText.trim() && !item.isComplete;

    if (isPlaceholder) {
      // Render typing indicator inside AI bubble
      return (
        <View style={[styles.messageRow, styles.aiRow]}>
          <View style={styles.aiBubble}>
            <TypingIndicator flavor="HUSH" color={activeTheme.colors.primary} />
          </View>
        </View>
      );
    }

    return <PrivacyMessage text={displayText} isUser={item.role === 'user'} />;
  }, [streamingMessageId, streamingText, activeTheme.colors.primary]);

  return (
    // ROOT VIEW: Attach the hook handler here
    <View
        style={{ flex: 1, backgroundColor: activeTheme.colors.background }}
        onTouchEnd={handleGlobalTouch}
    >

        {/* --- SETTINGS / PAYWALL MODAL --- */}
        <SettingsModal
            visible={modalVisible}
            onClose={() => {
                setModalVisible(false);
                setSettingsInitialScreen(undefined);
            }}
            initialScreen={settingsInitialScreen}
        />

        {/* --- BADGE UNLOCK MODAL --- */}
        <BadgeUnlockModal
            visible={!!newlyUnlockedBadge}
            onClose={() => setNewlyUnlockedBadge(null)}
            onViewGallery={() => {
                setNewlyUnlockedBadge(null);
                setSettingsInitialScreen('achievementGallery');
                setModalVisible(true);
            }}
        />

        {/* --- PRO WELCOME MODAL --- */}
        <ProWelcomeModal
          visible={showProWelcome}
          onDismiss={handleProWelcomeDismiss}
          mode="HUSH"
        />

        {/* --- BALANCED UPGRADE TOAST --- */}
        <BalancedUpgradeToast
          visible={showBalancedToast}
          onUpgrade={handleBalancedUpgrade}
          onDismiss={handleBalancedDismiss}
        />

        {/* --- MODEL DOWNLOAD ERROR MODAL --- */}
        <ModelDownloadErrorModal
          visible={!!downloadError}
          mode={downloadError?.mode || null}
          error={downloadError?.error || null}
          onRetry={() => {
            if (downloadError?.mode) {
              startModeDownload(downloadError.mode);
              clearDownloadError();
            }
          }}
          onDismiss={clearDownloadError}
        />

        {/* --- PAYWALL MODAL --- */}
        <PaywallModal
          visible={showPaywall && !showPostPurchaseCelebration}
          onClose={() => setShowPaywall(false)}
          trigger={paywallReason || 'feature_locked_theme'}
          mode={paywallReason === 'daily_limit' || paywallReason === 'gratitude_streak_cap' ? 'fullscreen' : 'modal'}
        />

        {/* --- ANIMATION CONTEXT PROVIDER --- */}
        <ClearAnimationProvider enabled={hushBurnStyle === 'clear'}>
            {/* --- PARTICLE LAYER --- */}
            {isClearing && renderClearAnimation(hushBurnStyle, false, onDustComplete)}

            {/* --- NORMAL INTERFACE --- */}
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex: 1 }}
            >
            <View style={[styles.container, { paddingTop: 60 }]}>

                {/* HEADER */}
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 20 }}>

                        {/* LEFT: HAMBURGER MENU */}
                        <TouchableOpacity
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setModalVisible(true);
                            }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            accessibilityLabel="Open settings menu"
                            accessibilityRole="button"
                            accessibilityHint="Opens app settings and options"
                        >
                            <Ionicons name="menu" size={24} color="#666" />
                        </TouchableOpacity>

                        {/* CENTER: TITLE (Secret Trigger) */}
                        <TouchableOpacity
                            onLongPress={handleSecretTrigger}
                            delayLongPress={800}
                            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                            accessibilityLabel="Hush"
                            accessibilityRole="header"
                            accessibilityHint="Long press to discover additional modes"
                        >
                            <TitleGlow shouldGlow={showGlowNow}>
                                <TitleFlicker
                                    shouldFlicker={shouldFlicker}
                                    onComplete={handleFlickerComplete}
                                    softMode={shouldShowToast || shouldGlow}
                                >
                                    <Text style={[styles.title, { color: activeTheme.colors.text }]}>Hush</Text>
                                </TitleFlicker>
                            </TitleGlow>
                        </TouchableOpacity>

                        {/* RIGHT: CLEAR BUTTON */}
                        <TouchableOpacity
                            onPress={handleClear}
                            disabled={isClearing}
                            accessibilityLabel="Clear conversation"
                            accessibilityRole="button"
                            accessibilityHint="Releases all messages permanently"
                        >
                            <Text style={{ color: '#666', fontSize: 16 }}>Clear</Text>
                        </TouchableOpacity>

                    </View>
                </View>

                {/* FEED (Wrapped in Animated View) */}
                <View style={{ flex: 1 }}>
                    <Animated.View style={{
                        flex: 1,
                        opacity: contentOpacity,
                        transform: [{ translateX: contentOffset }]
                    }}>
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
                    </Animated.View>
                </View>

                {/* USAGE INDICATOR */}
                <UsageIndicator
                  flavor="HUSH"
                  onPress={() => {
                    // Banner tap exception: Always shows paywall (bypasses dismissed check, doesn't count toward 6-cap)
                    handleDailyLimitBannerTap();
                  }}
                />

                {/* INPUT */}
                <View style={styles.inputContainer}>
                    <View style={{ flex: 1 }}>
                        <TextInput
                            style={[styles.input, { color: activeTheme.colors.primary, borderColor: activeTheme.colors.primary }]}
                            placeholder="Whisper something..."
                            placeholderTextColor={activeTheme.colors.subtext}
                            value={input}
                            onChangeText={setInput}
                            onSubmitEditing={handleSend}
                            keyboardAppearance="dark"
                            multiline
                            textAlignVertical="center"
                            accessibilityLabel="Message input"
                            accessibilityHint="Type your message here"
                        />
                        {/* TOKEN COUNTER (P1.11 Phase 6.5) */}
                        {tokenCountInfo.show && (
                            <Text style={[styles.tokenCounter, { color: tokenCountInfo.color }]}>
                                {tokenCountInfo.text}
                            </Text>
                        )}
                    </View>
                    <TouchableOpacity
                        onPress={handleSend}
                        disabled={tokenCountInfo.isBlocking}
                        accessibilityLabel="Send message"
                        accessibilityRole="button"
                        accessibilityHint={tokenCountInfo.isBlocking ? 'Message exceeds token limit' : undefined}
                    >
                        <Text style={{
                            color: tokenCountInfo.isBlocking ? '#666' : activeTheme.colors.primary,
                            fontWeight: 'bold',
                            opacity: tokenCountInfo.isBlocking ? 0.5 : 1,
                        }}>
                            Send
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
        </ClearAnimationProvider>

        {/* SPACER for Home Bar */}
        <View style={{ height: Math.max(insets.bottom, 20), backgroundColor: activeTheme.colors.background }} />

        {/* DISCOVERY HINTS TOAST */}
        <Toast
          message={toastMessage}
          duration={toastDuration}
          visible={showToastNow}
          onDismiss={dismissToast}
        />

        {/* --- STEALTH LOCK SCREEN --- */}
        <LockScreen isLocked={isLocked} onUnlock={unlock} flavor="HUSH" themeColor={activeTheme.colors.primary} />

        {/* --- POST-PURCHASE CELEBRATION (renders on top) --- */}
        <PostPurchaseCelebration
          visible={showPostPurchaseCelebration}
          onComplete={() => {
            setShowPostPurchaseCelebration(false);
            // Mark Pro welcome as seen to skip redundant ProWelcomeModal
            setProFirstLaunchSeen(true);
          }}
        />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#222', paddingBottom: 20 },
  title: { fontSize: 24, fontWeight: '800' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  inputContainer: { flexDirection: 'row', padding: 20, alignItems: 'center', gap: 10 },
  input: { flex: 1, minHeight: 50, maxHeight: 120, borderRadius: 25, borderWidth: 1, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14 },
  tokenCounter: { fontSize: 12, textAlign: 'right', marginTop: 4, marginRight: 20 },
  noModelTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  noModelDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  downloadButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 16,
  },
  downloadButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  exploreNote: {
    fontSize: 14,
    textAlign: 'center',
  },
  noModelMenuButton: {
    position: 'absolute',
    top: 60,
    left: 20,
  },
  messageRow: {
    width: '100%',
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 12,
  },
  aiRow: {
    justifyContent: 'flex-start',
  },
  aiBubble: {
    backgroundColor: '#262626',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    maxWidth: '85%',
  },
});
