/**
 * Chat Slice
 *
 * Manages conversation state and message handling:
 * - Message history (real and decoy)
 * - Flavor switching (HUSH, CLASSIFIED, DISCRETION)
 * - AI response generation
 * - Game trigger detection
 * - Daily limit checking
 * - Privacy metrics
 *
 * Dependencies: VERY HIGH - Coordinates with Security, Subscription, Gamification
 */

import { StateCreator } from 'zustand';
import { Keyboard } from 'react-native';
import { generateResponse } from '../../engine/LocalAI';
import { detectGameTrigger } from '../../engine/GameTriggers';
import { validateMessageInput } from '../../utils/inputSanitizer';
import {
  estimateConversationTokens,
  getContextWindowSize,
  estimateTokens,
} from '../../utils/tokenCounter';
import type { AppFlavor, Message, ResponseStyleHush, ResponseStyleClassified, ResponseStyleDiscretion, GameId, PerformanceMode } from '../types';

declare const __DEV__: boolean;

const DAILY_LIMIT = 8;

// Forward declarations for cross-slice access
interface SecuritySliceMinimal {
  isDecoyMode: boolean;
  customDecoyHushMessages: Message[];
  customDecoyClassifiedMessages: Message[];
  decoyBurned: boolean;
}

interface SubscriptionSliceMinimal {
  subscriptionTier: 'FREE' | 'MONTHLY' | 'YEARLY';
  dailyCount: number;
  triggerPaywall: (reason: 'daily_limit' | 'classified_discovery' | 'gratitude_streak_cap') => void;
  checkDailyReset: () => void;
}

interface GamificationSliceMinimal {
  gameState: {
    gratitudeStreakCapReached?: boolean;
  };
  startGame: (gameId: GameId) => void;
  isGameUnlocked: (gameId: GameId) => boolean;
}

interface ThemingSliceMinimal {
  responseStyleHush: ResponseStyleHush;
  responseStyleClassified: ResponseStyleClassified;
  responseStyleDiscretion: ResponseStyleDiscretion;
}

interface DiscoverySliceMinimal {
  classifiedDiscovered: boolean;
  setClassifiedDiscovered: (discovered: boolean) => void;
}

interface PerformanceSliceMinimal {
  activeMode: PerformanceMode;
}

/**
 * Conversation Summary for Pro users
 * Stores AI-generated summary of oldest conversation messages
 */
interface ConversationSummary {
  summaryText: string; // AI-generated summary
  summarizedUpToMessageId: string; // Last message ID included in summary
  createdAt: number; // Timestamp when summary was generated
  tokenCount: number; // Estimated tokens in summary
}

export interface ChatSlice {
  // --- STATE ---
  flavor: AppFlavor;
  privacyBlurEnabled: boolean;
  messages: Message[];
  isTyping: boolean;
  totalMessagesProtected: number; // Counter for Privacy Dashboard

  // --- CONVERSATION MEMORY STATE (New) ---
  conversationSummaries: Record<AppFlavor, ConversationSummary | null>; // Per-flavor AI summaries (Pro)
  lastSummarizationCheck: Record<AppFlavor, number>; // Timestamp of last summarization check

  // --- STREAMING STATE (P1.11 Phase 0) ---
  streamingMessageId: string | null; // ID of message currently streaming
  streamingText: string; // Accumulated text being streamed
  streamingTokenCount: number; // Number of tokens streamed so far

  // --- ACTIONS ---
  toggleFlavor: () => void;
  setFlavor: (flavor: AppFlavor) => void;
  togglePrivacyBlur: () => void;
  addMessage: (text: string, role: 'user' | 'ai' | 'system') => void;
  sendMessage: (text: string) => Promise<void>;
  clearHistory: () => void;
  clearAllMessages: () => void; // Panic wipe: clears EVERYTHING

  // --- STREAMING ACTIONS (P1.11 Phase 0) ---
  startStreaming: (messageId: string) => void;
  appendStreamingToken: (token: string) => void;
  finishStreaming: () => void;
}

export const createChatSlice: StateCreator<
  ChatSlice & SecuritySliceMinimal & SubscriptionSliceMinimal & GamificationSliceMinimal & ThemingSliceMinimal & DiscoverySliceMinimal & PerformanceSliceMinimal,
  [],
  [],
  ChatSlice
> = (set, get) => {
  /**
   * Get conversation history for AI context
   *
   * FREE TIER: Sliding window - last N message pairs
   * - Efficient mode: 3 pairs (6 messages)
   * - Balanced/Quality: 5 pairs (10 messages)
   *
   * PRO TIER: Full history
   * - Returns all messages for current flavor
   * - Summarization handles overflow at 80% capacity
   *
   * @param messages - Message array (real or decoy)
   * @param flavor - Current flavor (HUSH, CLASSIFIED, DISCRETION)
   * @param subscriptionTier - User's subscription tier
   * @param activeMode - Current performance mode
   * @returns Filtered message history for AI
   */
  const getConversationHistory = (
    messages: Message[],
    flavor: AppFlavor,
    subscriptionTier: 'FREE' | 'MONTHLY' | 'YEARLY',
    activeMode: PerformanceMode
  ): Message[] => {
    // Filter to current flavor, exclude system messages
    // System messages are UI alerts, not part of conversation
    const flavorMessages = messages.filter(
      (m) => m.context === flavor && m.role !== 'system'
    );

    // PRO USERS: Return full history
    // Summarization will handle context window overflow
    if (subscriptionTier !== 'FREE') {
      return flavorMessages;
    }

    // FREE USERS: Sliding window
    // Efficient mode: 3 pairs (6 messages) ≈ 300-500 tokens
    // Balanced/Quality: 5 pairs (10 messages) ≈ 500-800 tokens
    const maxPairs = activeMode === 'efficient' ? 3 : 5;

    // Take last N*2 messages (N pairs = N user + N AI)
    const recentMessages = flavorMessages.slice(-maxPairs * 2);

    if (__DEV__ && flavorMessages.length > recentMessages.length) {
      console.log(
        `[Memory] Free tier sliding window: Showing ${recentMessages.length}/${flavorMessages.length} messages (last ${maxPairs} pairs)`
      );
    }

    return recentMessages;
  };

  /**
   * Check if summarization is needed and trigger if so (Pro tier only)
   *
   * Monitors conversation token usage and triggers AI summarization
   * when context window reaches 80% capacity.
   *
   * FREE TIER: No-op (sliding window handles memory)
   * PRO TIER: Summarizes oldest 50% of messages at 80% capacity
   *
   * @param flavor - Current flavor to check
   */
  const checkAndSummarizeIfNeeded = async (flavor: AppFlavor): Promise<void> => {
    const state = get();

    // Only Pro users get summarization
    if (state.subscriptionTier === 'FREE') {
      return;
    }

    // Calculate current context usage
    const flavorMessages = state.messages.filter(
      (m) => m.context === flavor && m.role !== 'system'
    );

    if (flavorMessages.length === 0) {
      return; // No messages to summarize
    }

    const currentTokens = estimateConversationTokens(flavorMessages, 'long');
    const contextWindow = getContextWindowSize(state.activeMode);
    const usagePercent = (currentTokens / contextWindow) * 100;

    // Trigger at 80% capacity
    if (usagePercent >= 80) {
      console.log(
        `[Memory] Context ${usagePercent.toFixed(0)}% full (${currentTokens}/${contextWindow} tokens) - triggering summarization`
      );
      await summarizeConversation(flavor);
    }
  };

  /**
   * Generate AI summary of oldest conversation messages (Pro tier)
   *
   * Summarizes oldest 50% of messages and stores the summary.
   * The summary is injected into future prompts to provide compressed context.
   *
   * This is a BLOCKING operation (~2-3 seconds) that shows a loading state.
   *
   * @param flavor - Flavor to summarize
   */
  const summarizeConversation = async (flavor: AppFlavor): Promise<void> => {
    const state = get();

    // Get messages to summarize (oldest 50%)
    const flavorMessages = state.messages.filter(
      (m) => m.context === flavor && m.role !== 'system'
    );

    if (flavorMessages.length < 10) {
      // Don't summarize very short conversations
      return;
    }

    const midpoint = Math.floor(flavorMessages.length / 2);
    const messagesToSummarize = flavorMessages.slice(0, midpoint);

    // Build summary prompt
    const conversationText = messagesToSummarize
      .map((m) => `${m.role === 'user' ? 'User' : 'AI'}: ${m.text}`)
      .join('\n');

    const summaryPrompt = `Summarize this conversation concisely (2-3 sentences). Focus on key topics, user preferences, and important context:

${conversationText}

Summary:`;

    try {
      // Show loading state while summarizing
      set({ isTyping: true });

      // Call AI for summarization (no history, no prior summary)
      const summary = await generateResponse(
        summaryPrompt,
        flavor,
        [], // No history for summarization call
        null, // No prior summary
        state.responseStyleHush // Or appropriate style for flavor
      );

      // Store summary
      const summaryObj: ConversationSummary = {
        summaryText: summary,
        summarizedUpToMessageId: messagesToSummarize[messagesToSummarize.length - 1].id,
        createdAt: Date.now(),
        tokenCount: estimateTokens(summary) + 20, // +20 for template overhead
      };

      set((state) => ({
        conversationSummaries: {
          ...state.conversationSummaries,
          [flavor]: summaryObj,
        },
        lastSummarizationCheck: {
          ...state.lastSummarizationCheck,
          [flavor]: Date.now(),
        },
        isTyping: false,
      }));

      console.log('[Memory] Summary generated:', summary.substring(0, 100) + '...');
    } catch (error) {
      console.error('[Memory] Summarization failed:', error);
      // Fail silently - don't block user
      set({ isTyping: false });
    }
  };

  return {
  // --- INITIAL STATE ---
  flavor: 'HUSH' as AppFlavor, // Default to HUSH
  privacyBlurEnabled: true,
  messages: [],
  isTyping: false,
  totalMessagesProtected: 0,

  // --- CONVERSATION MEMORY INITIAL STATE ---
  conversationSummaries: {
    HUSH: null,
    CLASSIFIED: null,
    DISCRETION: null,
  },
  lastSummarizationCheck: {
    HUSH: 0,
    CLASSIFIED: 0,
    DISCRETION: 0,
  },

  // --- STREAMING INITIAL STATE (P1.11 Phase 0) ---
  streamingMessageId: null,
  streamingText: '',
  streamingTokenCount: 0,

  // --- ACTIONS ---
  toggleFlavor: () => {
    const { flavor } = get();

    let next: AppFlavor = 'HUSH';
    if (flavor === 'HUSH') next = 'CLASSIFIED';
    else if (flavor === 'CLASSIFIED') next = 'HUSH';
    else if (flavor === 'DISCRETION') next = 'CLASSIFIED';

    if (next === 'CLASSIFIED') {
      get().setClassifiedDiscovered(true);
    }

    const alert =
      next === 'HUSH'
        ? 'Protocol Omega: Going dark.'
        : 'PROTOCOL ALPHA: SECURE TERMINAL ACCESSED.';

    set({ flavor: next });
    get().addMessage(alert, 'system');
  },

  setFlavor: (flavor) => set({ flavor }),
  togglePrivacyBlur: () => set((s) => ({ privacyBlurEnabled: !s.privacyBlurEnabled })),

  addMessage: (text, role) => {
    const { flavor, isDecoyMode } = get();
    const newMessage: Message = {
      id: Date.now().toString(),
      role,
      text,
      timestamp: Date.now(),
      context: flavor,
    };

    // System messages never go to decoy arrays (they're UI alerts, not conversations)
    // In decoy mode, only user/ai messages go to custom decoy arrays
    if (isDecoyMode && role !== 'system') {
      if (flavor === 'HUSH') {
        set((state) => ({
          customDecoyHushMessages: [...state.customDecoyHushMessages, newMessage],
          // Clear decoyBurned flag when new message added (allow display)
          decoyBurned: false,
        }));
      } else if (flavor === 'CLASSIFIED') {
        set((state) => ({
          customDecoyClassifiedMessages: [...state.customDecoyClassifiedMessages, newMessage],
          // Clear decoyBurned flag when new message added (allow display)
          decoyBurned: false,
        }));
      }
    } else {
      // Real messages OR system messages always go to main array
      set((state) => ({
        messages: [...state.messages, newMessage],
        // Increment privacy counter for AI messages (not decoy, not system)
        totalMessagesProtected:
          role === 'ai' ? state.totalMessagesProtected + 1 : state.totalMessagesProtected,
      }));
    }
  },

  sendMessage: async (text) => {
    // P1.9: Validate and sanitize input
    const validation = validateMessageInput(text);
    if (!validation.valid) {
      // P0 Fix: Provide user feedback for validation errors (not silent)
      if (__DEV__) {
        console.warn('[sendMessage] Invalid input:', validation.error);
      }

      // Only show error for meaningful failures (not empty input)
      if (validation.error && !validation.error.includes('empty')) {
        // Add system message to inform user
        const state = get();
        state.addMessage(
          `⚠️ ${validation.error}. Please try again with a shorter message.`,
          'system'
        );
      }

      return;
    }

    // Use sanitized text for all subsequent processing
    const sanitizedText = validation.sanitized!;

    // P0 Fix: Warn if sanitization significantly changed input
    if (sanitizedText.length < text.trim().length * 0.8) {
      // Sanitization removed >20% of content - notify user
      if (__DEV__) {
        console.warn(
          '[sendMessage] Sanitization removed significant content:',
          `Original: ${text.length}, Sanitized: ${sanitizedText.length}`
        );
      }

      const state = get();
      state.addMessage(
        '⚠️ Your message contained invalid characters that were removed. ' +
        'If the message looks wrong, please rephrase it.',
        'system'
      );
    }

    let state = get();

    // Check for daily reset before processing message
    state.checkDailyReset();

    // === GAME TRIGGER DETECTION (BEFORE DAILY LIMIT) ===
    // Check if this is a game trigger - if so, don't count against daily limit
    const gameTrigger = detectGameTrigger(sanitizedText, state.flavor);

    // Re-read state before daily limit check (avoid stale closure on rapid messages)
    state = get();

    // Only check daily limit for non-game messages
    if (!gameTrigger && state.subscriptionTier === 'FREE' && state.dailyCount >= DAILY_LIMIT) {
      if (__DEV__) {
        console.log('[DailyLimit] Triggering paywall. dailyCount:', state.dailyCount, 'DAILY_LIMIT:', DAILY_LIMIT);
      }
      state.triggerPaywall('daily_limit');
      // Don't add harsh system message - just show friendly paywall modal
      return;
    }

    // If this is a non-game message, increment the daily counter
    if (!gameTrigger && state.subscriptionTier === 'FREE') {
      set({ dailyCount: state.dailyCount + 1 });
      if (__DEV__) {
        console.log('[DailyCount] Incremented daily count:', state.dailyCount + 1);
      }
    }

    state.addMessage(sanitizedText, 'user');
    set({ isTyping: true });

    try {
      // Process game trigger if detected
      if (gameTrigger) {
        // Unburdening is a special case - always start immediately (Free tier has 1/day after first use)
        if (gameTrigger.gameId === 'unburdening') {
          Keyboard.dismiss();
          state.startGame('unburdening');
          set({ isTyping: false });
          return;
        }

        // Check if game is unlocked (handles paywall logic internally)
        const isUnlocked = state.isGameUnlocked(gameTrigger.gameId);

        if (!isUnlocked) {
          // Determine which paywall to show based on game and unlock reason
          set({ isTyping: false });

          // Special case: Gratitude streak cap (Free tier hit 7-day limit)
          if (gameTrigger.gameId === 'gratitude' && state.gameState.gratitudeStreakCapReached) {
            state.triggerPaywall('gratitude_streak_cap');

            const message = state.subscriptionTier === 'FREE'
              ? `🌟 You've completed 7 days of Gratitude practice! Upgrade to Pro to continue your streak and unlock unlimited access.`
              : `Gratitude requires Pro (7-day trial complete). Upgrade to keep the practice going.`;

            state.addMessage(message, 'system');
            return;
          }

          // Default: Classified games and other Pro-only games
          // Use classified_discovery (unlimited, doesn't count toward cap)
          state.triggerPaywall('classified_discovery');
          state.addMessage(
            `🔒 ${gameTrigger.gameId.toUpperCase()} requires Pro access. Upgrade to unlock all training protocols.`,
            'system'
          );
          return;
        }

        // Game is unlocked - start it
        Keyboard.dismiss();
        state.startGame(gameTrigger.gameId);

        // Don't add system prompt to chat - games open as overlays
        // (Adding messages causes confusing text to remain after completion)
        set({ isTyping: false });
        return;
      }

      // === NORMAL AI RESPONSE (no game trigger) ===
      // Re-read state before AI generation to get fresh flavor and response style
      state = get();

      // Pass response style to AI engine based on current flavor
      const responseStyle =
        state.flavor === 'HUSH'
          ? state.responseStyleHush
          : state.flavor === 'CLASSIFIED'
          ? state.responseStyleClassified
          : state.flavor === 'DISCRETION'
          ? state.responseStyleDiscretion
          : undefined;

      const capturedFlavor = state.flavor;
      const capturedMessages = state.messages;

      // === CONVERSATION MEMORY (P1.10) ===
      // Determine which message array to use (real vs decoy)
      const messagesArray = state.isDecoyMode
        ? (capturedFlavor === 'HUSH' ? state.customDecoyHushMessages : state.customDecoyClassifiedMessages)
        : state.messages;

      // Get conversation history (sliding window for Free, full for Pro)
      const conversationHistory = getConversationHistory(
        messagesArray,
        capturedFlavor,
        state.subscriptionTier,
        state.activeMode
      );

      // Get summary if available (Pro users only)
      const summary = state.conversationSummaries[capturedFlavor]?.summaryText || null;

      if (__DEV__) {
        console.log(
          `[Memory] Passing ${conversationHistory.length} messages to AI (${state.subscriptionTier} tier, ${state.activeMode} mode)`
        );
        if (summary) {
          console.log('[Memory] Including conversation summary');
        }
      }

      // === STREAMING (P1.11 Phase 0): Create placeholder message ===
      const streamingMessageId = Date.now().toString();
      const placeholderMessage: Message = {
        id: streamingMessageId,
        role: 'ai',
        text: '', // Empty - will be filled by streaming
        timestamp: Date.now(),
        context: capturedFlavor,
        isComplete: false, // Mark as incomplete during streaming
      };

      // Add placeholder to appropriate array
      if (state.isDecoyMode) {
        if (capturedFlavor === 'HUSH') {
          set((s) => ({
            customDecoyHushMessages: [...s.customDecoyHushMessages, placeholderMessage],
          }));
        } else if (capturedFlavor === 'CLASSIFIED') {
          set((s) => ({
            customDecoyClassifiedMessages: [...s.customDecoyClassifiedMessages, placeholderMessage],
          }));
        }
      } else {
        set((s) => ({
          messages: [...s.messages, placeholderMessage],
        }));
      }

      // Start streaming state
      get().startStreaming(streamingMessageId);

      // Call AI with streaming callback
      const response = await generateResponse(
        sanitizedText,
        capturedFlavor,
        conversationHistory, // NEW: conversation history
        summary, // NEW: conversation summary (Pro)
        responseStyle,
        // STREAMING CALLBACK: Update streaming text on each token
        (token: string) => {
          get().appendStreamingToken(token);
        }
      );

      // Finish streaming
      get().finishStreaming();

      // Verify context hasn't changed before finalizing message (async cancellation check)
      const currentState = get();
      if (currentState.flavor === capturedFlavor && currentState.messages === capturedMessages) {
        // Update placeholder message with final text and mark complete
        const finalMessage: Message = {
          ...placeholderMessage,
          text: response,
          isComplete: true,
        };

        if (state.isDecoyMode) {
          if (capturedFlavor === 'HUSH') {
            set((s) => ({
              customDecoyHushMessages: s.customDecoyHushMessages.map((m) =>
                m.id === streamingMessageId ? finalMessage : m
              ),
            }));
          } else if (capturedFlavor === 'CLASSIFIED') {
            set((s) => ({
              customDecoyClassifiedMessages: s.customDecoyClassifiedMessages.map((m) =>
                m.id === streamingMessageId ? finalMessage : m
              ),
            }));
          }
        } else {
          set((s) => ({
            messages: s.messages.map((m) => (m.id === streamingMessageId ? finalMessage : m)),
            totalMessagesProtected: s.totalMessagesProtected + 1, // Count completed AI message
          }));
        }

        // === CONVERSATION MEMORY: Check if summarization needed (Pro tier) ===
        if (currentState.subscriptionTier !== 'FREE') {
          // Run summarization check asynchronously (don't block UI)
          // This is safe because it only reads state and updates summarization metadata
          checkAndSummarizeIfNeeded(capturedFlavor).catch((err) => {
            if (__DEV__) {
              console.error('[Memory] Summarization check failed:', err);
            }
          });
        }
      } else {
        if (__DEV__) {
          console.log('[sendMessage] Context changed during AI generation, discarding stale response');
        }
        // Clean up streaming state
        get().finishStreaming();
      }
    } catch (e) {
      state.addMessage('Error: Connection lost.', 'system');
    } finally {
      set({ isTyping: false });
    }
  },

  clearHistory: () => {
    const { flavor, messages, isDecoyMode, customDecoyHushMessages, customDecoyClassifiedMessages } = get();

    console.log('[clearHistory] Called - flavor:', flavor, 'isDecoyMode:', isDecoyMode);
    console.log('[clearHistory] Total messages before clear:', messages.length);
    console.log('[clearHistory] Message contexts:', messages.map(m => m.context).join(', '));

    if (isDecoyMode) {
      console.log('[clearHistory] DECOY MODE - clearing decoy messages');
      // SECURITY: Overwrite decoy message contents before clearing
      if (flavor === 'HUSH') {
        console.log('[clearHistory] Clearing', customDecoyHushMessages.length, 'Hush decoy messages');
        // Overwrite message text with random data for forensic protection
        customDecoyHushMessages.forEach((msg) => {
          if (msg.text) {
            // Generate random string of same length
            const randomChars = Array.from({ length: msg.text.length }, () =>
              String.fromCharCode(Math.floor(Math.random() * 94) + 33)
            ).join('');
            msg.text = randomChars;
          }
        });
        set({
          customDecoyHushMessages: [],
          decoyBurned: true, // Mark as burned to prevent preset refill
        });
      } else if (flavor === 'CLASSIFIED') {
        console.log('[clearHistory] Clearing', customDecoyClassifiedMessages.length, 'Classified decoy messages');
        // Overwrite message text with random data
        customDecoyClassifiedMessages.forEach((msg) => {
          if (msg.text) {
            const randomChars = Array.from({ length: msg.text.length }, () =>
              String.fromCharCode(Math.floor(Math.random() * 94) + 33)
            ).join('');
            msg.text = randomChars;
          }
        });
        set({
          customDecoyClassifiedMessages: [],
          decoyBurned: true,
        });
      }
      // Note: We STAY in decoy mode after burning for safety
    } else {
      // SECURITY: Overwrite deleted message contents before filtering
      const messagesToDelete = messages.filter((m) => m.context === flavor);
      messagesToDelete.forEach((msg) => {
        if (msg.text) {
          // Generate random string of same length for forensic protection
          const randomChars = Array.from({ length: msg.text.length }, () =>
            String.fromCharCode(Math.floor(Math.random() * 94) + 33)
          ).join('');
          msg.text = randomChars;
        }
      });

      // Filters out messages from the CURRENT context
      const filteredMessages = messages.filter((m) => m.context !== flavor);
      console.log('[clearHistory] Messages after filter:', filteredMessages.length);
      console.log('[clearHistory] Clearing', messages.length - filteredMessages.length, 'messages from', flavor, 'context');
      set({ messages: filteredMessages });
    }

    console.log('[clearHistory] Complete - new message count:', get().messages.length);

    // NOTE: Zustand persist middleware will automatically flush to AsyncStorage
    // after this set() call completes. For additional security, consider:
    // 1. Manually triggering GC if available: if (global.gc) global.gc();
    // 2. Multiple overwrite passes (DoD 5220.22-M standard)
  },

  /**
   * PANIC WIPE: Clears ALL messages (real + decoy) for emergency situations
   * Unlike clearHistory(), this clears EVERYTHING regardless of mode/context
   *
   * Called by: usePanicWipe hook when triple-shake detected
   *
   * Security behavior:
   * - Overwrites all message text with random data (forensic protection)
   * - Clears all real messages (all contexts: HUSH, CLASSIFIED, DISCRETION)
   * - Clears all decoy messages (Hush + Classified presets and custom)
   * - Marks decoy as burned (prevents refill)
   * - Does NOT exit decoy mode (handled by usePanicWipe)
   */
  clearAllMessages: () => {
    const { messages, customDecoyHushMessages, customDecoyClassifiedMessages } = get();

    console.log('[clearAllMessages] 🚨 PANIC WIPE - clearing ALL messages');
    console.log('[clearAllMessages] Real messages:', messages.length);
    console.log('[clearAllMessages] Hush decoy messages:', customDecoyHushMessages.length);
    console.log('[clearAllMessages] Classified decoy messages:', customDecoyClassifiedMessages.length);

    // SECURITY: Overwrite all real message contents with random data
    messages.forEach((msg) => {
      if (msg.text) {
        const randomChars = Array.from({ length: msg.text.length }, () =>
          String.fromCharCode(Math.floor(Math.random() * 94) + 33)
        ).join('');
        msg.text = randomChars;
      }
    });

    // SECURITY: Overwrite all Hush decoy message contents
    customDecoyHushMessages.forEach((msg) => {
      if (msg.text) {
        const randomChars = Array.from({ length: msg.text.length }, () =>
          String.fromCharCode(Math.floor(Math.random() * 94) + 33)
        ).join('');
        msg.text = randomChars;
      }
    });

    // SECURITY: Overwrite all Classified decoy message contents
    customDecoyClassifiedMessages.forEach((msg) => {
      if (msg.text) {
        const randomChars = Array.from({ length: msg.text.length }, () =>
          String.fromCharCode(Math.floor(Math.random() * 94) + 33)
        ).join('');
        msg.text = randomChars;
      }
    });

    // Clear everything
    set({
      messages: [], // Clear all real messages
      customDecoyHushMessages: [], // Clear Hush decoy messages
      customDecoyClassifiedMessages: [], // Clear Classified decoy messages
      decoyBurned: true, // Mark as burned to prevent preset refill
    });

    console.log('[clearAllMessages] ✅ Complete - all messages wiped');
    console.log('[clearAllMessages] Messages remaining:', get().messages.length);
  },

  // --- STREAMING ACTIONS (P1.11 Phase 0) ---
  /**
   * Start streaming a new AI response
   * Creates a placeholder message and sets streaming state
   */
  startStreaming: (messageId: string) => {
    set({
      streamingMessageId: messageId,
      streamingText: '',
      streamingTokenCount: 0,
    });
  },

  /**
   * Append a token to the streaming text
   * Called for each token received from AI
   */
  appendStreamingToken: (token: string) => {
    set((state) => ({
      streamingText: state.streamingText + token,
      streamingTokenCount: state.streamingTokenCount + 1,
    }));
  },

  /**
   * Finish streaming and finalize the message
   * Marks streaming as complete and clears streaming state
   */
  finishStreaming: () => {
    set({
      streamingMessageId: null,
      streamingText: '',
      streamingTokenCount: 0,
    });
  },
  }; // Close returned object
}; // Close createChatSlice function
