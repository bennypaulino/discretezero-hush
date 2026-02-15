import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChatStore, Message } from '../../core/state/rootStore';
import { useShallow } from 'zustand/react/shallow';
import { useSecureLock } from '../../core/hooks/useSecureLock';
import { useDoubleTap } from '../../core/hooks/useDoubleTap';
import { useAppTheme } from '../../core/hooks/useAppTheme';
import { useSoundEffect } from '../../core/hooks/useSoundEffect';
import { useAutoScroll } from '../../core/hooks/useAutoScroll';
import { useFilteredMessages } from '../../core/hooks/useFilteredMessages';
import { useAnimatedValue } from '../../core/hooks/useAnimatedValue';
import { SettingsModal } from '../../core/ui/SettingsModal';
import { BadgeUnlockModal } from '../../core/ui/BadgeUnlockModal';
import { ModelDownloadErrorModal } from '../../core/ui/ModelDownloadErrorModal';
import { PaywallModal } from '../../core/ui/PaywallModal';
import { PostPurchaseCelebration } from '../../core/ui/PostPurchaseCelebration';
import { RedactedMessage } from './components/RedactedMessage';
import { renderClearAnimation } from '../../core/animations/AnimationRegistry';
import { TypingIndicator } from '../../core/ui/TypingIndicator';
import { LockScreen } from '../../core/security/LockScreen';
import { GAME_TRIGGERS } from '../../core/engine/GameTriggers';
import { ProWelcomeModal } from '../../core/ui/ProWelcomeModal';
import { BalancedUpgradeToast } from '../../core/ui/BalancedUpgradeToast';
import { ClassifiedDiscoveryBlocker } from './ClassifiedDiscoveryBlocker';
import NetInfo from '@react-native-community/netinfo';
import { shouldOfferBalanced } from '../../core/utils/deviceCapabilities';
// STREAMING (P1.11 Phase 0): Keep screen awake during AI generation
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
// TOKEN COUNTER (P1.11 Phase 6.5): Live token counter
import { useTokenCounter } from '../../core/hooks/useTokenCounter';

// Typewriter configs
const TITLE = 'CLASSIFIED';
const TOP_SECRET = '// TOP SECRET //';
const EYES_ONLY = '[ EYES ONLY ]';

// Timing - full mode
const CHAR_DELAY = 70;
const FAST_CHAR_DELAY = 40;

// Timing - quick mode (2x speed per spec)
const QUICK_CHAR_DELAY = 20;
const QUICK_FAST_CHAR_DELAY = 15;

// Intro phases
type IntroPhase =
  | 'waiting'           // Waiting for effects to complete
  | 'title'             // Typing "CLASSIFIED"
  | 'cursor'            // Cursor blink after title (skipped in quick mode)
  | 'hamburger'         // Hamburger icon fades in
  | 'topSecret'         // Typing "// TOP SECRET //"
  | 'eyesOnly'          // Typing "[EYES ONLY]"
  | 'purge'             // [PURGE] fades in
  | 'content'           // Content and input fade in
  | 'complete';         // Done

interface ClassifiedScreenProps {
  introMode?: boolean;
  quickMode?: boolean;            // Fast intro (no cursor blink, 2x speed typewriter)
  onStartTypewriter?: () => void;
  onIntroComplete?: () => void;
}

export const ClassifiedScreen = ({
  introMode = false,
  quickMode = false,
  onStartTypewriter,
  onIntroComplete
}: ClassifiedScreenProps) => {
  const [input, setInput] = useState('');
  const [isPurging, setIsPurging] = useState(false);

  // MODAL STATES
  const [showSettings, setShowSettings] = useState(false);
  const [showProWelcome, setShowProWelcome] = useState(false);
  const [showBalancedToast, setShowBalancedToast] = useState(false);
  const [showDiscoveryBlocker, setShowDiscoveryBlocker] = useState(false);
  const [settingsInitialScreen, setSettingsInitialScreen] = useState<string | undefined>(undefined);

  // INTRO STATE
  const [introPhase, setIntroPhase] = useState<IntroPhase>(introMode ? 'waiting' : 'complete');
  const [displayedTitle, setDisplayedTitle] = useState(introMode ? '' : TITLE);
  const [displayedTopSecret, setDisplayedTopSecret] = useState(introMode ? '' : TOP_SECRET);
  const [displayedEyesOnly, setDisplayedEyesOnly] = useState(introMode ? '' : EYES_ONLY);
  const [showCursor, setShowCursor] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [cursorPosition, setCursorPosition] = useState<'title' | 'topSecret' | 'eyesOnly'>('title');

  // Animation values
  const hamburgerOpacity = useAnimatedValue(introMode ? 0 : 1);
  const purgeOpacity = useAnimatedValue(introMode ? 0 : 1);
  const contentOpacity = useAnimatedValue(introMode ? 0 : 1);

  // FlatList ref for auto-scroll
  const flatListRef = useRef<FlatList>(null);

  // Calculate timing based on mode
  const titleCharDelay = quickMode ? QUICK_CHAR_DELAY : CHAR_DELAY;
  const fastCharDelay = quickMode ? QUICK_FAST_CHAR_DELAY : FAST_CHAR_DELAY;
  const fadeSpeed = quickMode ? 100 : 200;

  const handleGlobalTouch = useDoubleTap();
  const insets = useSafeAreaInsets();
  const { isLocked, unlock } = useSecureLock();

  // Sound effects for animations
  const { playForAnimation } = useSoundEffect();

  // Selective Zustand subscriptions to prevent excessive re-renders
  const messages = useChatStore((state) => state.messages);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const addMessage = useChatStore((state) => state.addMessage);
  const isTyping = useChatStore((state) => state.isTyping);
  const clearHistory = useChatStore((state) => state.clearHistory);
  const toggleFlavor = useChatStore((state) => state.toggleFlavor);
  const togglePrivacyBlur = useChatStore((state) => state.togglePrivacyBlur);
  const privacyBlurEnabled = useChatStore((state) => state.privacyBlurEnabled);
  const setFlavor = useChatStore((state) => state.setFlavor);
  const subscriptionTier = useChatStore((state) => state.subscriptionTier);
  const classifiedBurnStyle = useChatStore((state) => state.classifiedBurnStyle);
  const proFirstLaunchSeen = useChatStore((state) => state.proFirstLaunchSeen);
  const setProFirstLaunchSeen = useChatStore((state) => state.setProFirstLaunchSeen);
  const showPaywall = useChatStore((state) => state.showPaywall);
  const paywallReason = useChatStore((state) => state.paywallReason);
  const setShowPaywall = useChatStore((state) => state.setShowPaywall);
  const triggerPaywall = useChatStore((state) => state.triggerPaywall);
  const showPostPurchaseCelebration = useChatStore((state) => state.showPostPurchaseCelebration);
  const setShowPostPurchaseCelebration = useChatStore((state) => state.setShowPostPurchaseCelebration);
  const firstClassifiedBlockerSeen = useChatStore((state) => state.firstClassifiedBlockerSeen);
  const classifiedDiscoveryUsedHints = useChatStore((state) => state.classifiedDiscoveryUsedHints);
  const discoveryHintsEnabled = useChatStore((state) => state.discoveryHintsEnabled);

  // STREAMING STATE (P1.11 Phase 0) - Only subscribe to streamingMessageId (changes rarely)
  // DON'T subscribe to streamingText (changes 50-200 times per response)
  // Access streamingText via getState() in renderItem to avoid excessive re-renders
  const streamingMessageId = useChatStore((state) => state.streamingMessageId);

  const unlockBadge = useChatStore((state) => state.unlockBadge);

  // Badge unlock notification
  // CRITICAL: Use useShallow to prevent re-renders when gameState reference changes
  // Only re-render when newlyUnlockedBadge VALUE changes (not gameState object reference)
  const newlyUnlockedBadge = useChatStore(
    useShallow((state) => state.gameState.newlyUnlockedBadge)
  );
  const setNewlyUnlockedBadge = useChatStore((state) => state.setNewlyUnlockedBadge);

  // Balanced upgrade toast state
  const messageCountSinceUpgradeOffer = useChatStore((state) => state.messageCountSinceUpgradeOffer);
  const balancedUpgradeOffered = useChatStore((state) => state.balancedUpgradeOffered);
  // CRITICAL: Use useShallow to prevent re-renders when gameState reference changes
  const activeGameId = useChatStore(
    useShallow((state) => state.gameState.currentSession.activeGameId)
  );
  const modeDownloadState = useChatStore((state) => state.modeDownloadState);

  // Model download error state
  const downloadError = useChatStore((state) => state.downloadError);
  const clearDownloadError = useChatStore((state) => state.clearDownloadError);
  const startModeDownload = useChatStore((state) => state.startModeDownload);

  // Navigation state
  const requestedSettingsScreen = useChatStore((state) => state.requestedSettingsScreen);
  const requestSettingsScreen = useChatStore((state) => state.requestSettingsScreen);

  // Get active theme based on user selection
  const theme = useAppTheme();
  const ACTIVE_THEME_COLOR = theme.colors.primary;
  const TACTICAL_COLOR = theme.colors.primary;
  const BG_COLOR = theme.colors.background;

  const isPro = subscriptionTier !== 'FREE';

  // Get messages to display based on decoy mode
  const displayMessages = useFilteredMessages('CLASSIFIED');

  // --- TOKEN COUNTER (P1.11 Phase 6.5) ---
  // TOKEN COUNTER (P1.11 Phase 6.5): Live token counter with blocking
  const tokenCountInfo = useTokenCounter({
    input,
    subscriptionTier,
    subtextColor: theme.colors.subtext,
    isInputEditable: isPro, // Classified: Only Pro users can type
  });

  // --- AUTO-SCROLL ON NEW MESSAGES ---
  // Scroll to bottom when messages change (e.g., AI responds)
  useEffect(() => {
    if (displayMessages.length > 0 && introPhase === 'complete') {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [displayMessages.length, introPhase]);

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

  // Start typewriter when effects are done
  const startIntroSequence = () => {
    if (introPhase === 'waiting') {
      setIntroPhase('title');
      onStartTypewriter?.();
    }
  };

  // Expose start method to parent
  useEffect(() => {
    (ClassifiedScreen as any)._startIntro = startIntroSequence;
  }, [introPhase]);

  // Show Pro welcome modal if user just upgraded
  useEffect(() => {
    if (isPro && !proFirstLaunchSeen && introPhase === 'complete') {
      // Small delay to let intro complete first
      const timer = setTimeout(() => {
        setShowProWelcome(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isPro, proFirstLaunchSeen, introPhase]);

  // --- BALANCED UPGRADE TOAST ---
  const balancedToastCancelledRef = useRef(false);

  useEffect(() => {
    balancedToastCancelledRef.current = false;

    const checkBalancedToast = async () => {
      // Wait for intro to complete
      if (introPhase !== 'complete') {
        return;
      }

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
  }, [messageCountSinceUpgradeOffer, balancedUpgradeOffered, modeDownloadState.balanced, activeGameId, introPhase]);

  // PHASE: Title typewriter
  useEffect(() => {
    if (introPhase !== 'title') return;

    let charIndex = 0;
    if (!quickMode) {
      setShowCursor(true);
      setCursorPosition('title');
    }

    const typeInterval = setInterval(() => {
      if (charIndex < TITLE.length) {
        setDisplayedTitle(TITLE.substring(0, charIndex + 1));
        charIndex++;
      } else {
        clearInterval(typeInterval);
        // In quick mode, skip cursor blink
        setIntroPhase(quickMode ? 'hamburger' : 'cursor');
      }
    }, titleCharDelay);

    return () => clearInterval(typeInterval);
  }, [introPhase, quickMode, titleCharDelay]);

  // PHASE: Cursor blink (skipped in quick mode)
  useEffect(() => {
    if (introPhase !== 'cursor') return;

    // Blink sequence
    setTimeout(() => setCursorVisible(false), 200);
    setTimeout(() => setCursorVisible(true), 400);
    setTimeout(() => setCursorVisible(false), 600);
    setTimeout(() => {
      setShowCursor(false);
      setIntroPhase('hamburger');
    }, 800);
  }, [introPhase]);

  // PHASE: Hamburger fade in
  useEffect(() => {
    if (introPhase !== 'hamburger') return;

    Animated.timing(hamburgerOpacity, {
      toValue: 1,
      duration: fadeSpeed,
      useNativeDriver: true,
    }).start(() => {
      setIntroPhase('topSecret');
    });
  }, [introPhase, fadeSpeed]);

  // PHASE: "// TOP SECRET //" typewriter
  useEffect(() => {
    if (introPhase !== 'topSecret') return;

    let charIndex = 0;
    if (!quickMode) {
      setShowCursor(true);
      setCursorPosition('topSecret');
    }

    const typeInterval = setInterval(() => {
      if (charIndex < TOP_SECRET.length) {
        setDisplayedTopSecret(TOP_SECRET.substring(0, charIndex + 1));
        charIndex++;
      } else {
        clearInterval(typeInterval);
        setShowCursor(false);
        setTimeout(() => setIntroPhase('eyesOnly'), quickMode ? 50 : 100);
      }
    }, fastCharDelay);

    return () => clearInterval(typeInterval);
  }, [introPhase, quickMode, fastCharDelay]);

  // PHASE: "[EYES ONLY]" typewriter
  useEffect(() => {
    if (introPhase !== 'eyesOnly') return;

    let charIndex = 0;
    if (!quickMode) {
      setShowCursor(true);
      setCursorPosition('eyesOnly');
    }

    const typeInterval = setInterval(() => {
      if (charIndex < EYES_ONLY.length) {
        setDisplayedEyesOnly(EYES_ONLY.substring(0, charIndex + 1));
        charIndex++;
      } else {
        clearInterval(typeInterval);
        setShowCursor(false);
        setTimeout(() => setIntroPhase('purge'), quickMode ? 50 : 100);
      }
    }, fastCharDelay);

    return () => clearInterval(typeInterval);
  }, [introPhase, quickMode, fastCharDelay]);

  // PHASE: [PURGE] fade in
  useEffect(() => {
    if (introPhase !== 'purge') return;

    Animated.timing(purgeOpacity, {
      toValue: 1,
      duration: fadeSpeed,
      useNativeDriver: true,
    }).start(() => {
      setIntroPhase('content');
    });
  }, [introPhase, fadeSpeed]);

  // PHASE: Content fade in
  useEffect(() => {
    if (introPhase !== 'content') return;

    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: quickMode ? 150 : 300,
      useNativeDriver: true,
    }).start(() => {
      setIntroPhase('complete');
      onIntroComplete?.();
    });
  }, [introPhase, quickMode]);

  // THE BOUNCER - show discovery blocker on first visit, paywall on subsequent visits
  useEffect(() => {
    if (introPhase !== 'complete') return;
    if (isPro) return; // Pro users don't see any blocker

    // First-time discovery: show blocker screen
    if (!firstClassifiedBlockerSeen) {
      if (__DEV__) console.log('[ClassifiedScreen] First discovery - showing blocker screen after delay');

      // Track hint status at discovery time
      useChatStore.setState({ classifiedDiscoveryUsedHints: discoveryHintsEnabled });

      // Unlock backchannel badge immediately (discovery moment)
      // Note: Badge modal won't show here because we're in Classified and badge is Hush-only
      // User will see it when they return to Hush (either via blocker or later)
      unlockBadge('backchannel');

      // Show the discovery blocker after 1.5 second delay
      const timer = setTimeout(() => {
        setShowDiscoveryBlocker(true);
        // Mark blocker as seen AFTER showing it (so blocker knows it's first-time)
        useChatStore.setState({ firstClassifiedBlockerSeen: true });
      }, 1500);

      return () => clearTimeout(timer);
    } else {
      // Subsequent visits: show regular paywall after delay
      // Allow user to see header animation and absorb the moment
      if (__DEV__) console.log('[ClassifiedScreen] Return visit - showing paywall after delay');
      const timer = setTimeout(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        triggerPaywall('classified_discovery');
      }, 2000); // 2 second delay to see header animation

      return () => clearTimeout(timer);
    }
  }, [isPro, introPhase, firstClassifiedBlockerSeen, discoveryHintsEnabled, triggerPaywall, unlockBadge]);

  // Handle navigation requests from game completion screens
  useEffect(() => {
    if (requestedSettingsScreen) {
      setSettingsInitialScreen(requestedSettingsScreen);
      setShowSettings(true);
      requestSettingsScreen(null); // Clear the request
    }

    // Clean up any pending requests on unmount
    return () => {
      if (requestedSettingsScreen) {
        requestSettingsScreen(null);
      }
    };
  }, [requestedSettingsScreen]);

  const handleProWelcomeDismiss = () => {
    setShowProWelcome(false);
    setProFirstLaunchSeen(true);
  };

  const handleBalancedUpgrade = () => {
    setShowBalancedToast(false);
    // For iPhone 16+ Pro users showing both options, open Settings
    // For others, trigger download directly
    setShowSettings(true);
    setSettingsInitialScreen('performance');
  };

  const handleBalancedDismiss = () => {
    setShowBalancedToast(false);
    useChatStore.setState({ balancedUpgradeDeclined: true });
  };

  // Discovery blocker handlers
  const handleDiscoveryUpgrade = () => {
    setShowDiscoveryBlocker(false);
    // Show upgrade paywall
    triggerPaywall('classified_discovery');
  };

  const handleDiscoveryReturn = () => {
    setShowDiscoveryBlocker(false);
    // Switch back to Hush (badge was already unlocked at discovery time)
    toggleFlavor();
  };

  const handleSend = () => {
    const cmd = input.trim();
    if (!cmd) return;

    // Check for help command
    const helpKeywords = ['help', 'games', 'commands', 'protocols'];
    const isHelpCommand = helpKeywords.some(keyword =>
      cmd.toLowerCase() === keyword || cmd.toLowerCase() === `/${keyword}`
    );

    if (isHelpCommand) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Get games for CLASSIFIED mode
      const classifiedGames = GAME_TRIGGERS.filter(trigger =>
        trigger.flavors.includes('CLASSIFIED')
      );

      // Build help message
      const gameList = classifiedGames.map(game => {
        const keywords = game.keywords.slice(0, 2).map(k => `'${k}'`).join(' or ');
        const isProOnly = !['breathe', 'gratitude', 'unburdening'].includes(game.gameId);
        const proTag = isProOnly && !isPro ? ' (Pro)' : '';
        return `• ${keywords}${proTag}`;
      }).join('\n');

      const helpMessage = `═══ AVAILABLE_PROTOCOLS ═══

${gameList}

${!isPro ? '\nNote: Pro-only protocols require subscription upgrade.\n' : ''}
Type any protocol keyword to begin.`;

      // Add system message to history
      addMessage(helpMessage, 'ai');

      setInput('');

      // Auto-scroll to show the help message
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      return;
    }

    if (__DEV__) {
      if (cmd.toUpperCase() === 'EXECUTIVE PROTOCOL') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setFlavor('DISCRETION');
        setInput('');
        return;
      }
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

  const handlePurge = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    playForAnimation(classifiedBurnStyle); // Play sound based on selected animation
    setIsPurging(true);
  };

  const onPurgeComplete = () => {
    clearHistory(); // Clear messages

    // Small delay to ensure React updates before removing overlay
    setTimeout(() => {
      setIsPurging(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 100);
  };

  const isInIntro = introPhase !== 'complete';

  // Render cursor at current position (only in full mode)
  const renderCursor = () => {
    if (!showCursor || quickMode) return null;
    return <Text style={[styles.cursor, { color: ACTIVE_THEME_COLOR, opacity: cursorVisible ? 1 : 0 }]}>█</Text>;
  };

  // Check if AI model is downloaded
  const modelDownloaded = modeDownloadState.efficient === 'downloaded';

  // Show "no model" placeholder if model not downloaded
  if (!modelDownloaded) {
    return (
      <View style={{ flex: 1, backgroundColor: BG_COLOR, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
        <Ionicons name="cloud-offline" size={80} color={theme.colors.subtext} />

        <Text style={[styles.noModelTitle, { color: theme.colors.text }]}>AI MODEL NOT DOWNLOADED</Text>

        <Text style={[styles.noModelDescription, { color: theme.colors.subtext }]}>
          To engage CLASSIFIED systems,{'\n'}
          download the 1.6 GB AI model.{'\n'}
          {'\n'}
          Operates 100% offline after download.
        </Text>

        <TouchableOpacity
          style={[styles.downloadButton, { backgroundColor: TACTICAL_COLOR }]}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            useChatStore.setState({ showModelDownloadPrompt: true });
          }}
          accessibilityLabel="Initiate AI model download"
          accessibilityRole="button"
          accessibilityHint="Opens download flow for 1.6 GB AI model"
        >
          <Text style={styles.downloadButtonText}>INITIATE DOWNLOAD</Text>
        </TouchableOpacity>

        <Text style={[styles.exploreNote, { color: theme.colors.dimSubtext || '#666' }]}>
          Or explore settings via the menu
        </Text>

        {/* Settings Modal */}
        <SettingsModal
          visible={showSettings}
          onClose={() => {
            setShowSettings(false);
            setSettingsInitialScreen(undefined);
          }}
          mode="CLASSIFIED"
          initialScreen={settingsInitialScreen}
        />

        {/* Hamburger menu in top-left corner */}
        <View style={styles.noModelMenuButton}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowSettings(true);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="menu" size={24} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // FlatList optimization: Memoize callbacks to prevent unnecessary re-renders
  const keyExtractor = useCallback((item: { id: string }) => item.id, []);

  const contentContainerStyle = useMemo(() => ({
    paddingBottom: 180,
    flexGrow: 1
  }), []);

  const renderItem = useCallback(({ item }: { item: Message }) => {
    // STREAMING (P1.11 Phase 0): Access streamingText via getState() to avoid subscription
    // This prevents 50-200 re-renders per response while still getting latest text
    const currentStreamingText = useChatStore.getState().streamingText;
    const displayText = item.id === streamingMessageId ? currentStreamingText : item.text;

    // TYPING INDICATOR (P1.11 Phase 7): Show typing animation for placeholder messages
    const isPlaceholder = item.role === 'ai' && !displayText.trim() && !item.isComplete;

    if (isPlaceholder) {
      // Render typing indicator in terminal style matching RedactedMessage
      return (
        <View style={styles.typingRow}>
          <Text style={[styles.typingPrompt, { color: theme.colors.accent }]}>
            {'> SYS:'}
          </Text>
          <TypingIndicator flavor="CLASSIFIED" color={theme.colors.accent} />
        </View>
      );
    }

    return (
      <RedactedMessage
        text={displayText}
        role={item.role}
        isPurging={isPurging}
        burnStyle={classifiedBurnStyle}
        glitchColor={ACTIVE_THEME_COLOR}
        sysColor={theme.colors.accent}
        userColor={theme.colors.primary}
        redactionBlockColor={theme.colors.cardBg}
      />
    );
  }, [isPurging, classifiedBurnStyle, theme.colors.accent, theme.colors.primary, theme.colors.cardBg]);

  return (
    <View
      style={{ flex: 1, backgroundColor: BG_COLOR }}
      onTouchEnd={isInIntro ? undefined : handleGlobalTouch}
    >
      {!isInIntro && (
        <SettingsModal
          visible={showSettings}
          onClose={() => {
            setShowSettings(false);
            setSettingsInitialScreen(undefined);
          }}
          mode="CLASSIFIED"
          initialScreen={settingsInitialScreen}
        />
      )}
      {!isInIntro && (
        <>
          {__DEV__ && console.log('[ClassifiedScreen] Rendering BadgeUnlockModal - newlyUnlockedBadge:', newlyUnlockedBadge, 'visible:', !!newlyUnlockedBadge, 'isInIntro:', isInIntro)}
          <BadgeUnlockModal
            visible={!!newlyUnlockedBadge}
            onClose={() => {
              if (__DEV__) console.log('[ClassifiedScreen] Badge modal onClose called');
              setNewlyUnlockedBadge(null);

              // If free user dismisses backchannel badge, return them to Hush
              // (they can't access Classified without Pro)
              if (subscriptionTier === 'FREE' && newlyUnlockedBadge === 'backchannel') {
                setFlavor('HUSH');
              }
            }}
            onViewGallery={() => {
              if (__DEV__) console.log('[ClassifiedScreen] Badge modal onViewGallery called');
              setNewlyUnlockedBadge(null);

              // Mark discovery blocker as seen (user acknowledged by viewing gallery)
              useChatStore.setState({ firstClassifiedBlockerSeen: true });

              // Open achievement gallery in Hush (badges are Hush-only feature)
              // Use global requestSettingsScreen instead of local state so it persists across mode switch
              requestSettingsScreen('achievementGallery');

              // Delay flavor change to ensure navigation request is processed first
              setTimeout(() => setFlavor('HUSH'), 100);
            }}
          />
        </>
      )}
      {!isInIntro && (
        <ProWelcomeModal
          visible={showProWelcome}
          onDismiss={handleProWelcomeDismiss}
          mode="CLASSIFIED"
        />
      )}
      {!isInIntro && (
        <BalancedUpgradeToast
          visible={showBalancedToast}
          onUpgrade={handleBalancedUpgrade}
          onDismiss={handleBalancedDismiss}
        />
      )}
      {!isInIntro && (
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
      )}

      {/* --- CLASSIFIED DISCOVERY BLOCKER (First-time only) --- */}
      <ClassifiedDiscoveryBlocker
        visible={!isInIntro && showDiscoveryBlocker}
        onUpgrade={handleDiscoveryUpgrade}
        onReturn={handleDiscoveryReturn}
      />

      {/* --- PAYWALL MODAL --- */}
      {!isInIntro && (
        <PaywallModal
          visible={showPaywall && !showPostPurchaseCelebration && !showDiscoveryBlocker}
          onClose={() => {
            setShowPaywall(false);
            // If free user dismisses Classified discovery paywall, switch back to Hush
            if (!isPro && paywallReason === 'classified_discovery') {
              toggleFlavor();
              // Badge was already unlocked at first discovery time
            }
          }}
          trigger={paywallReason || 'classified_discovery'}
          mode={paywallReason === 'daily_limit' ? 'fullscreen' : 'modal'}
        />
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        pointerEvents={isInIntro ? 'none' : 'auto'}
      >
        <View style={[styles.container, { paddingTop: 60 }]}>

          {/* HEADER */}
          <View style={[styles.header, { borderBottomColor: TACTICAL_COLOR }]}>
            {/* Toolbar row */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>

                {/* Hamburger - fades in during intro, disabled for free users */}
                <Animated.View style={{ opacity: hamburgerOpacity, marginRight: 16 }}>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowSettings(true);
                    }}
                    disabled={isInIntro || !isPro}
                    accessibilityLabel="Access command center"
                    accessibilityRole="button"
                    accessibilityHint="Opens settings and configuration"
                  >
                    <Ionicons
                      name="menu"
                      size={24}
                      color={!isPro ? 'rgba(255, 0, 0, 0.3)' : TACTICAL_COLOR}
                    />
                  </TouchableOpacity>
                </Animated.View>

                {/* // TOP SECRET // - types during intro */}
                <Text style={[styles.topSecret, { color: TACTICAL_COLOR, marginRight: 8, marginBottom: 0 }]}>
                  {displayedTopSecret}
                  {cursorPosition === 'topSecret' && renderCursor()}
                </Text>

                {/* [EYES ONLY] - types during intro */}
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    togglePrivacyBlur();
                  }}
                  disabled={isInIntro}
                  style={{ justifyContent: 'center' }}
                  accessibilityLabel={privacyBlurEnabled ? "Privacy blur enabled" : "Privacy blur disabled"}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: privacyBlurEnabled }}
                  accessibilityHint="Toggle privacy blur for secure viewing"
                >
                  <Text style={[
                    styles.topSecret,
                    {
                      color: privacyBlurEnabled ? '#000' : TACTICAL_COLOR,
                      backgroundColor: privacyBlurEnabled ? TACTICAL_COLOR : 'transparent',
                      marginBottom: 0,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }
                  ]}>
                    {displayedEyesOnly}
                    {cursorPosition === 'eyesOnly' && renderCursor()}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* [ PURGE ] - fades in during intro */}
              <Animated.View style={{ opacity: purgeOpacity }}>
                <TouchableOpacity
                  onPress={handlePurge}
                  disabled={isInIntro}
                  accessibilityLabel="Purge all data"
                  accessibilityRole="button"
                  accessibilityHint="Permanently destroys all classified communications"
                >
                  <Text style={[styles.topSecret, {
                    color: TACTICAL_COLOR,
                    paddingHorizontal: 4,
                    marginBottom: 0,
                  }]}>[ PURGE ]</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Title - types during intro */}
            <TouchableOpacity
              onLongPress={() => {
                if (isInIntro) return;
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                toggleFlavor();
              }}
              disabled={isInIntro}
              accessibilityLabel="Classified"
              accessibilityRole="header"
              accessibilityHint="Long press to change operational mode"
            >
              <Text style={[styles.title, { color: '#FFF' }]}>
                {displayedTitle}
                {cursorPosition === 'title' && renderCursor()}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content - fades in during intro */}
          <Animated.View style={{ flex: 1, opacity: contentOpacity }}>
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

          {/* Input bar - fades in during intro */}
          <Animated.View style={[styles.inputBar, { borderColor: TACTICAL_COLOR, opacity: contentOpacity }]}>
            <Text style={{ color: TACTICAL_COLOR, marginRight: 8, fontFamily: 'Courier', fontWeight: 'bold' }}>{'>'}</Text>
            <View style={{ flex: 1 }}>
              <TextInput
                style={[styles.input, { color: TACTICAL_COLOR }]}
                placeholder={!isPro ? "CLEARANCE REQUIRED" : "ENTER COMMAND..."}
                placeholderTextColor={theme.colors.subtext}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={handleSend}
                autoCapitalize="none"
                keyboardAppearance="dark"
                editable={!isInIntro && isPro}
                multiline
                textAlignVertical="center"
                accessibilityLabel="Command input"
                accessibilityHint={isPro ? "Enter tactical commands or communications" : "Pro access required"}
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
              disabled={isInIntro || !isPro || tokenCountInfo.isBlocking}
              accessibilityLabel="Execute command"
              accessibilityRole="button"
              accessibilityHint={tokenCountInfo.isBlocking ? 'Message exceeds token limit' : undefined}
            >
              <Text style={[styles.sendBtn, {
                backgroundColor: (!isPro || tokenCountInfo.isBlocking) ? 'rgba(255, 0, 0, 0.3)' : TACTICAL_COLOR,
                color: (!isPro || tokenCountInfo.isBlocking) ? 'rgba(255, 255, 255, 0.3)' : '#000'
              }]}>EXEC</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>

      <View style={{ height: Math.max(insets.bottom, 20), backgroundColor: BG_COLOR }} />

      {isPurging && renderClearAnimation(classifiedBurnStyle, true, onPurgeComplete)}

      <LockScreen
        isLocked={isLocked}
        onUnlock={unlock}
        flavor="CLASSIFIED"
        hideWhen={isInIntro}
      />

      {/* --- POST-PURCHASE CELEBRATION (renders on top) --- */}
      {!isInIntro && (
        <PostPurchaseCelebration
          visible={showPostPurchaseCelebration}
          onComplete={() => {
            setShowPostPurchaseCelebration(false);
            // Mark Pro welcome as seen to skip redundant ProWelcomeModal
            setProFirstLaunchSeen(true);
          }}
        />
      )}
    </View>
  );
};

// Static method to trigger intro start
ClassifiedScreen.startIntro = () => {
  if ((ClassifiedScreen as any)._startIntro) {
    (ClassifiedScreen as any)._startIntro();
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: { borderBottomWidth: 1, paddingBottom: 16, marginBottom: 20 },
  topSecret: { fontFamily: 'Courier', fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 4 },
  title: { fontFamily: 'Courier', fontSize: 28, fontWeight: 'bold', letterSpacing: -1 },
  cursor: { fontFamily: 'Courier' },
  logText: { fontFamily: 'Courier', fontSize: 14, lineHeight: 20, flex: 1 },
  inputBar: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, paddingTop: 16, paddingBottom: 16, minHeight: 70 },
  input: { flex: 1, fontFamily: 'Courier', fontSize: 16, minHeight: 40, maxHeight: 120, paddingTop: 10, paddingBottom: 10 },
  tokenCounter: { fontFamily: 'Courier', fontSize: 11, textAlign: 'right', marginTop: 4, marginRight: 8 },
  sendBtn: { fontFamily: 'Courier', fontWeight: 'bold', paddingHorizontal: 12, paddingVertical: 6, fontSize: 12 },
  noModelTitle: {
    fontFamily: 'Courier',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: -0.5,
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  noModelDescription: {
    fontFamily: 'Courier',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  downloadButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 0,
    marginBottom: 16,
  },
  downloadButtonText: {
    fontFamily: 'Courier',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: 1,
  },
  exploreNote: {
    fontFamily: 'Courier',
    fontSize: 12,
    textAlign: 'center',
  },
  noModelMenuButton: {
    position: 'absolute',
    top: 60,
    left: 20,
  },
  typingRow: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingRight: 10,
    alignItems: 'flex-start',
  },
  typingPrompt: {
    fontFamily: 'Courier',
    fontWeight: 'bold',
    marginRight: 12,
    fontSize: 14,
    minWidth: 50,
    marginTop: 2,
  },
});
