import { useMemo } from 'react';
import { estimateTokens } from '../utils/tokenCounter';

interface TokenCounterResult {
  text: string;
  color: string;
  show: boolean;
  isBlocking: boolean;
}

interface TokenCounterParams {
  input: string;
  subscriptionTier: 'FREE' | 'MONTHLY' | 'YEARLY';
  subtextColor: string; // Default color from theme
}

/**
 * Custom hook for live token counter with tier-appropriate visibility and warnings
 *
 * Behavior:
 * - FREE tier: Shows at 80%+ of 600 token limit, format "X / 600 tokens"
 * - PRO tier: Shows at 80%+ of 10k token limit, format "X tokens remaining"
 * - Warning thresholds: 88% (Yellow), 94% (Orange), 100% (Red + Blocking)
 *
 * @param input - User input text
 * @param subscriptionTier - User's subscription tier
 * @param subtextColor - Default color from theme for normal state
 * @returns Token counter display info with blocking state
 */
export function useTokenCounter({
  input,
  subscriptionTier,
  subtextColor,
}: TokenCounterParams): TokenCounterResult {
  return useMemo(() => {
    const tokenCount = estimateTokens(input);

    // Free tier: 600 token limit
    if (subscriptionTier === 'FREE') {
      const FREE_LIMIT = 600;
      const percentage = (tokenCount / FREE_LIMIT) * 100;

      // Only show at 80%+ (480+ tokens)
      if (percentage < 80) {
        return { text: '', color: '', show: false, isBlocking: false };
      }

      // Determine color based on new thresholds
      let color = subtextColor; // Default gray

      if (percentage >= 100) {
        color = '#FF0000'; // Red - blocking
      } else if (percentage >= 94) {
        color = '#FF8800'; // Orange - critical warning
      } else if (percentage >= 88) {
        color = '#FFBB00'; // Yellow - warning
      }

      return {
        text: `${tokenCount} / ${FREE_LIMIT} tokens`,
        color,
        show: true,
        isBlocking: percentage >= 100,
      };
    }

    // Pro tier (MONTHLY/YEARLY): 10,000 token hard cap
    const PRO_HARD_CAP = 10000;
    const percentage = (tokenCount / PRO_HARD_CAP) * 100;

    // Only show at 80%+ (8000+ tokens)
    if (percentage < 80) {
      return { text: '', color: '', show: false, isBlocking: false };
    }

    const remaining = PRO_HARD_CAP - tokenCount;

    // Determine color based on new thresholds
    let color = subtextColor; // Default gray

    if (percentage >= 100) {
      color = '#FF0000'; // Red - blocking
    } else if (percentage >= 94) {
      color = '#FF8800'; // Orange - critical warning
    } else if (percentage >= 88) {
      color = '#FFBB00'; // Yellow - warning
    }

    return {
      text: `${remaining} tokens remaining`,
      color,
      show: true,
      isBlocking: percentage >= 100,
    };
  }, [input, subscriptionTier, subtextColor]);
}
