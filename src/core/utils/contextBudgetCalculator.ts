/**
 * Context Budget Calculator
 *
 * Phase 3 of P1.11 Dynamic Context Budgets.
 * Runtime calculator that combines model + device + tier into concrete token budgets.
 *
 * This is the "brain" of the conversation memory system that determines:
 * - How many tokens user can send (Free tier only)
 * - How many tokens AI can respond with
 * - How many tokens for conversation history
 * - Expected response time
 *
 * Key Innovation: Dynamic budgets that adapt to model speed, device capability, and user tier.
 */

import type { PerformanceMode, SubscriptionTier } from '../state/types';
import type { ResponseStyleHush, ResponseStyleClassified, ResponseStyleDiscretion } from '../state/types';
import type { ModelProfile } from '../engine/modelProfiles';
import type { DeviceProfile } from './deviceCapabilities';

/**
 * Tier budget configuration
 *
 * Defines how subscription tiers affect token allocations:
 * - Free: Limited message length (600 tokens), 20% context for history
 * - Pro: Unlimited message length, 80% context for history
 */
export interface TierBudget {
  tier: SubscriptionTier;
  maxUserMessageTokens: number | null; // null = unlimited (Pro)
  conversationHistoryPercent: number; // 0.2 (Free) or 0.8 (Pro)
}

/**
 * Calculated context budgets
 *
 * Complete breakdown of token allocation for a message generation:
 * - User message limits
 * - AI response budget
 * - Conversation history budget
 * - System prompt overhead
 * - Total available context
 */
export interface ContextBudgets {
  // User Message
  maxUserTokens: number | null; // null = unlimited (Pro)

  // AI Response
  maxAIResponseTokens: number; // Tokens AI can use for response
  estimatedResponseTime: number; // Seconds (for UX messaging)

  // Conversation History
  conversationHistoryTokens: number; // Tokens available for history

  // System Overhead
  systemPromptTokens: number; // Tokens used by system prompt

  // Context Window
  totalAvailableContext: number; // Total context after device scaling
  deviceScalingApplied: number; // Scaling factor used (0.5-1.0)
}

/**
 * Tier budget definitions
 *
 * Free tier: Conservative limits to ensure good experience with limited resources
 * Pro tier: Generous limits to provide clear value proposition
 */
const TIER_BUDGETS: Record<SubscriptionTier, TierBudget> = {
  FREE: {
    tier: 'FREE',
    maxUserMessageTokens: 600, // ~450 words (per spec)
    conversationHistoryPercent: 0.20, // 20% of context for history
  },
  MONTHLY: {
    tier: 'MONTHLY',
    maxUserMessageTokens: null, // Unlimited
    conversationHistoryPercent: 0.80, // 80% of context for history (huge boost!)
  },
  YEARLY: {
    tier: 'YEARLY',
    maxUserMessageTokens: null, // Unlimited
    conversationHistoryPercent: 0.80, // 80% of context for history
  },
};

/**
 * System prompt token estimates
 *
 * Quick responses have shorter system prompts (personality only).
 * Thoughtful responses have longer prompts (personality + guidance).
 */
const SYSTEM_PROMPT_TOKENS: Record<string, number> = {
  quick: 200, // Short personality prompt
  thoughtful: 400, // Personality + detailed guidance
  operator: 200, // Classified quick mode
  analyst: 400, // Classified thoughtful mode
  warm: 200, // Discretion quick mode
  formal: 400, // Discretion thoughtful mode
};

/**
 * Get tier budget configuration
 *
 * @param tier - Subscription tier
 * @returns Tier budget configuration
 */
export function getTierBudget(tier: SubscriptionTier): TierBudget {
  return TIER_BUDGETS[tier];
}

/**
 * Get system prompt token estimate for a response style
 *
 * @param style - Response style (quick/thoughtful or mode-specific)
 * @returns Estimated system prompt tokens
 */
export function getSystemPromptTokens(style: string): number {
  return SYSTEM_PROMPT_TOKENS[style] || 200; // Default to quick if unknown
}

/**
 * Calculate complete context budgets
 *
 * This is the core budget calculator that combines all factors:
 * - Model capabilities (context window, inference speed)
 * - Device capabilities (scaling factor)
 * - Subscription tier (Free vs Pro allocation)
 * - Response style (quick vs thoughtful)
 *
 * Returns concrete token budgets ready for use in message generation.
 *
 * @param modelProfile - Model profile (from getModelProfile)
 * @param deviceProfile - Device profile (from getDeviceProfile)
 * @param subscriptionTier - User's subscription tier
 * @param responseStyle - Response style (quick/thoughtful/etc)
 * @returns Complete context budgets
 *
 * @example
 * // Free tier + Gemma 2B + iPhone 12 (A14, 4GB)
 * const budgets = calculateContextBudgets(
 *   getModelProfile('efficient'),
 *   getDeviceProfile('A14', 4),
 *   'FREE',
 *   'thoughtful'
 * );
 * // Result: 700 history tokens, 800 AI response tokens, 32s response time
 */
export function calculateContextBudgets(
  modelProfile: ModelProfile,
  deviceProfile: DeviceProfile,
  subscriptionTier: SubscriptionTier,
  responseStyle: ResponseStyleHush | ResponseStyleClassified | ResponseStyleDiscretion
): ContextBudgets {
  // Step 1: Get tier configuration
  const tierBudget = getTierBudget(subscriptionTier);

  // Step 2: Calculate device-adjusted safe context
  // Start with model's recommended context (already has headroom built in)
  const safeContext = Math.floor(
    modelProfile.recommendedContextUsage * deviceProfile.contextScalingFactor
  );

  // Step 3: Determine system prompt size
  const systemPromptTokens = getSystemPromptTokens(responseStyle);

  // Step 4: Select AI response budget from model profile
  // Map response styles to budget types
  const isQuickMode =
    responseStyle === 'quick' ||
    responseStyle === 'operator' ||
    responseStyle === 'warm';

  let maxAIResponseTokens: number;
  let estimatedResponseTime: number;

  if (isQuickMode) {
    // Quick mode: Same budget for Free and Pro
    maxAIResponseTokens = modelProfile.responseTimeBudgets.quick.tokens;
    estimatedResponseTime = modelProfile.responseTimeBudgets.quick.targetSeconds;
  } else {
    // Thoughtful mode: Different budgets for Free vs Pro
    if (subscriptionTier === 'FREE') {
      maxAIResponseTokens = modelProfile.responseTimeBudgets.thoughtful.tokensFree;
      estimatedResponseTime =
        modelProfile.responseTimeBudgets.thoughtful.targetSecondsFree;
    } else {
      // Pro tier: 2x boost!
      maxAIResponseTokens = modelProfile.responseTimeBudgets.thoughtful.tokensPro;
      estimatedResponseTime =
        modelProfile.responseTimeBudgets.thoughtful.targetSecondsPro;
    }
  }

  // Step 5: Calculate conversation history budget
  // Use tier percentage of safe context, minus AI response and system prompt
  const remainingContext = safeContext - maxAIResponseTokens - systemPromptTokens;
  const conversationHistoryTokens = Math.floor(
    remainingContext * tierBudget.conversationHistoryPercent
  );

  // Step 6: Return complete budgets
  return {
    // User message limits
    maxUserTokens: tierBudget.maxUserMessageTokens,

    // AI response
    maxAIResponseTokens,
    estimatedResponseTime,

    // Conversation history
    conversationHistoryTokens,

    // System overhead
    systemPromptTokens,

    // Context window
    totalAvailableContext: safeContext,
    deviceScalingApplied: deviceProfile.contextScalingFactor,
  };
}

/**
 * Validate user message length against tier budget
 *
 * Returns validation result with error message if applicable.
 *
 * @param messageTokens - Estimated tokens in user message
 * @param budgets - Calculated context budgets
 * @returns Validation result { valid: boolean, error?: string }
 */
export function validateUserMessageLength(
  messageTokens: number,
  budgets: ContextBudgets
): { valid: boolean; error?: string } {
  // Pro tier: No limit
  if (budgets.maxUserTokens === null) {
    return { valid: true };
  }

  // Free tier: Check limit
  if (messageTokens > budgets.maxUserTokens) {
    const wordCount = Math.floor(budgets.maxUserTokens * 0.75);
    return {
      valid: false,
      error: `Message too long (${messageTokens} tokens). Free tier limit: ${budgets.maxUserTokens} tokens (~${wordCount} words). Upgrade to Pro for unlimited length.`,
    };
  }

  return { valid: true };
}

/**
 * Calculate percentage of budget used
 *
 * Useful for UI indicators (e.g., "45% of message limit used").
 *
 * @param currentTokens - Current token count
 * @param budgetTokens - Budget limit (null = unlimited)
 * @returns Percentage (0-100) or null if unlimited
 */
export function calculateBudgetPercentage(
  currentTokens: number,
  budgetTokens: number | null
): number | null {
  if (budgetTokens === null) {
    return null; // Unlimited
  }

  return Math.min(100, (currentTokens / budgetTokens) * 100);
}
