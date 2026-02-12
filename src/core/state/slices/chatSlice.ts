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
import type { AppFlavor, Message, ResponseStyleHush, ResponseStyleClassified, ResponseStyleDiscretion, GameId } from '../types';

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

export interface ChatSlice {
  // --- STATE ---
  flavor: AppFlavor;
  privacyBlurEnabled: boolean;
  messages: Message[];
  isTyping: boolean;
  totalMessagesProtected: number; // Counter for Privacy Dashboard

  // --- ACTIONS ---
  toggleFlavor: () => void;
  setFlavor: (flavor: AppFlavor) => void;
  togglePrivacyBlur: () => void;
  addMessage: (text: string, role: 'user' | 'ai' | 'system') => void;
  sendMessage: (text: string) => Promise<void>;
  clearHistory: () => void;
  clearAllMessages: () => void; // Panic wipe: clears EVERYTHING
}

export const createChatSlice: StateCreator<
  ChatSlice & SecuritySliceMinimal & SubscriptionSliceMinimal & GamificationSliceMinimal & ThemingSliceMinimal & DiscoverySliceMinimal,
  [],
  [],
  ChatSlice
> = (set, get) => ({
  // --- INITIAL STATE ---
  flavor: 'HUSH' as AppFlavor, // Default to HUSH
  privacyBlurEnabled: true,
  messages: [],
  isTyping: false,
  totalMessagesProtected: 0,

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

      const response = await generateResponse(sanitizedText, capturedFlavor, responseStyle);

      // Verify context hasn't changed before adding message (async cancellation check)
      const currentState = get();
      if (currentState.flavor === capturedFlavor && currentState.messages === capturedMessages) {
        state.addMessage(response, 'ai');
      } else {
        if (__DEV__) {
          console.log('[sendMessage] Context changed during AI generation, discarding stale response');
        }
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
});
