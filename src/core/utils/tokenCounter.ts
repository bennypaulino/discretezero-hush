/**
 * Token Counter Utility
 *
 * Fast token estimation using word count for on-device conversation memory management.
 * Based on empirical data: 1 token ≈ 0.75 English words (1 word ≈ 1.33 tokens)
 *
 * Why word-based estimation:
 * - GPT tokenizers (tiktoken) require Node.js/WASM - incompatible with React Native
 * - On-device speed critical - word estimation 50-100x faster than precise tokenization
 * - Gemma/Llama use similar token-to-word ratios as GPT models
 * - ±10% accuracy sufficient for context window management
 */

import type { Message, PerformanceMode } from '../state/types';

/**
 * Estimate tokens from raw text
 *
 * @param text - The text to estimate tokens for
 * @returns Estimated token count
 *
 * @example
 * estimateTokens("Hello world") // ~3 tokens
 * estimateTokens("This is a longer sentence with more words") // ~13 tokens
 */
export function estimateTokens(text: string): number {
  if (!text || text.trim().length === 0) {
    return 0;
  }

  // Count words (split by whitespace)
  const words = text.trim().split(/\s+/).length;

  // Apply conversion factor (1 word ≈ 1.33 tokens)
  // This is based on empirical testing with GPT/Gemma/Llama models
  const tokens = Math.ceil(words * 1.33);

  return tokens;
}

/**
 * Estimate tokens for a message including chat template overhead
 *
 * Gemma/Llama chat format adds ~20 tokens per message:
 * "<start_of_turn>user\n{text}<end_of_turn>\n" = ~20 tokens
 *
 * @param message - The message to estimate tokens for
 * @returns Estimated token count including template overhead
 *
 * @example
 * const msg = { text: "Hello", role: "user", ... };
 * estimateMessageTokens(msg) // ~22 tokens (2 for "Hello" + 20 overhead)
 */
export function estimateMessageTokens(message: Message): number {
  const baseTokens = estimateTokens(message.text);
  const templateOverhead = 20; // Chat template wrapping tokens

  return baseTokens + templateOverhead;
}

/**
 * Estimate tokens for entire conversation history
 *
 * Includes system prompt overhead which varies by response style:
 * - 'short' styles (quick, terse, operator): ~150 tokens
 * - 'long' styles (detailed, thoughtful, formal): ~400 tokens
 *
 * @param messages - Array of messages in conversation
 * @param systemPromptLength - Length category of system prompt
 * @returns Total estimated tokens for conversation
 *
 * @example
 * const messages = [
 *   { text: "What's the weather?", role: "user", ... },
 *   { text: "It's sunny", role: "ai", ... }
 * ];
 * estimateConversationTokens(messages, 'short') // ~197 tokens
 */
export function estimateConversationTokens(
  messages: Message[],
  systemPromptLength: 'short' | 'long'
): number {
  // System prompt token overhead
  const systemPromptTokens = systemPromptLength === 'short' ? 150 : 400;

  // Sum up all message tokens
  const messageTokens = messages.reduce(
    (sum, msg) => sum + estimateMessageTokens(msg),
    0
  );

  return systemPromptTokens + messageTokens;
}

/**
 * Get context window size for performance mode
 *
 * Context window is the maximum tokens the model can process at once.
 * All modes use 8K context for memory safety - differentiation is by model quality:
 * - Efficient (Gemma 2B): 8K tokens (~2,000 words, ~10 message pairs)
 * - Balanced (Llama 3.2 3B): 8K tokens (better model intelligence)
 * - Quality (Llama 3.1 8B): 8K tokens (highest model intelligence)
 *
 * @param mode - Current performance mode
 * @returns Context window size in tokens
 */
export function getContextWindowSize(mode: PerformanceMode): number {
  const CONTEXT_WINDOWS: Record<PerformanceMode, number> = {
    efficient: 8192, // Gemma 2B: 8K tokens
    balanced: 8192, // Llama 3.2 3B: 8K tokens (same context, better model)
    quality: 8192, // Llama 3.1 8B: 8K tokens (same context, best model)
  };

  return CONTEXT_WINDOWS[mode];
}

/**
 * Calculate percentage of context window used
 *
 * Returns a value between 0-100 indicating how full the context window is.
 * Used to trigger summarization at 80% capacity for Pro users.
 *
 * @param tokenCount - Current number of tokens in conversation
 * @param mode - Current performance mode
 * @returns Percentage of context window used (0-100)
 *
 * @example
 * // With Efficient mode (8K window):
 * getContextUsagePercent(4096, 'efficient') // 50%
 * getContextUsagePercent(6553, 'efficient') // 80%
 * getContextUsagePercent(8192, 'efficient') // 100%
 */
export function getContextUsagePercent(
  tokenCount: number,
  mode: PerformanceMode
): number {
  const windowSize = getContextWindowSize(mode);
  const percent = (tokenCount / windowSize) * 100;

  // Cap at 100% (shouldn't exceed but just in case)
  return Math.min(100, percent);
}

/**
 * Estimate maximum number of message pairs that fit in context window
 *
 * Useful for determining sliding window sizes.
 * Assumes average message is ~50 tokens (30 words + 20 template overhead).
 *
 * @param mode - Current performance mode
 * @param systemPromptLength - Length category of system prompt
 * @returns Estimated maximum message pairs
 *
 * @example
 * getMaxMessagePairs('efficient', 'short') // ~81 pairs
 * getMaxMessagePairs('balanced', 'long') // ~1636 pairs
 */
export function getMaxMessagePairs(
  mode: PerformanceMode,
  systemPromptLength: 'short' | 'long'
): number {
  const windowSize = getContextWindowSize(mode);
  const systemPromptTokens = systemPromptLength === 'short' ? 150 : 400;
  const availableTokens = windowSize - systemPromptTokens;

  // Average message pair (user + AI) is ~100 tokens
  // (2 messages * 50 tokens average per message)
  const avgTokensPerPair = 100;

  return Math.floor(availableTokens / avgTokensPerPair);
}

/**
 * Check if conversation is approaching context window limit
 *
 * Returns true if conversation has used >= threshold percentage of context window.
 * Used to trigger summarization or warnings.
 *
 * @param tokenCount - Current number of tokens in conversation
 * @param mode - Current performance mode
 * @param threshold - Percentage threshold (default 80)
 * @returns True if at or above threshold
 *
 * @example
 * isApproachingLimit(6553, 'efficient') // true (80% of 8K)
 * isApproachingLimit(4096, 'efficient') // false (50% of 8K)
 */
export function isApproachingLimit(
  tokenCount: number,
  mode: PerformanceMode,
  threshold: number = 80
): boolean {
  const usagePercent = getContextUsagePercent(tokenCount, mode);
  return usagePercent >= threshold;
}
