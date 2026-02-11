import { useState, useEffect, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { useChatStore } from '../state/rootStore';

/**
 * Privacy blur hook for message components
 *
 * Manages the privacy blur/reveal state for sensitive messages.
 * Handles long-press interactions to temporarily reveal blurred content.
 *
 * @returns Object containing blur state and interaction handlers
 *
 * @example
 * ```tsx
 * const { isBlurred, isPeeking, handleLongPress, handlePressOut } = usePrivacyBlur();
 *
 * <TouchableOpacity
 *   onLongPress={handleLongPress}
 *   onPressOut={handlePressOut}
 * >
 *   <Text style={{ opacity: isBlurred ? 0.1 : 1 }}>
 *     {message}
 *   </Text>
 *   {isBlurred && <BlurView />}
 * </TouchableOpacity>
 * ```
 */
export const usePrivacyBlur = () => {
  const { privacyBlurEnabled } = useChatStore();
  const [isPeeking, setIsPeeking] = useState(false);

  // Reset peek state when privacy blur is disabled globally
  useEffect(() => {
    if (!privacyBlurEnabled) {
      setIsPeeking(false);
    }
  }, [privacyBlurEnabled]);

  /**
   * Handle long press to toggle peek state
   * Provides haptic feedback when blur is enabled
   */
  const handleLongPress = useCallback(() => {
    if (!privacyBlurEnabled) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsPeeking((prev) => !prev);
  }, [privacyBlurEnabled]);

  /**
   * Handle press out to hide content again (optional)
   * Can be used for temporary reveal on hold
   */
  const handlePressOut = useCallback(() => {
    setIsPeeking(false);
  }, []);

  return {
    /**
     * Whether the content should be blurred
     * True when privacy blur is enabled AND user is not peeking
     */
    isBlurred: privacyBlurEnabled && !isPeeking,

    /**
     * Whether the user is currently peeking at blurred content
     */
    isPeeking,

    /**
     * Handler for long press gesture to toggle peek
     */
    handleLongPress,

    /**
     * Handler for press out gesture to end peek
     */
    handlePressOut,
  };
};
