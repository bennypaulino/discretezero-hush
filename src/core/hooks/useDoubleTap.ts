import { useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { useChatStore } from '../state/rootStore';

export const useDoubleTap = () => {
  const lastTap = useRef<number>(0);
  // MEMORY FIX: Use selective subscription instead of destructuring
  const togglePrivacyBlur = useChatStore((state) => state.togglePrivacyBlur);

  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (lastTap.current && (now - lastTap.current) < DOUBLE_TAP_DELAY) {
      // Double tap confirmed
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      togglePrivacyBlur();
      lastTap.current = 0; // Reset to prevent triple-tap triggering
    } else {
      lastTap.current = now;
    }
  };

  return handleDoubleTap;
};
