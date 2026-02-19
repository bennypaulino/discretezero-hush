import { useEffect, useState } from 'react';
import { useChatStore } from '../state/rootStore';

export interface DiscoveryHintState {
  shouldShowToast: boolean;
  toastMessage: string;
  toastDuration: number;
  shouldFlicker: boolean;
  shouldGlow: boolean;
}

export const useDiscoveryHints = () => {
  // MEMORY FIX: Use selective subscriptions instead of destructuring (was 10 fields!)
  const subscriptionTier = useChatStore((state) => state.subscriptionTier);
  const classifiedDiscovered = useChatStore((state) => state.classifiedDiscovered);
  const discoveryHintsEnabled = useChatStore((state) => state.discoveryHintsEnabled);
  const hintProgressionLevel = useChatStore((state) => state.hintProgressionLevel);
  const lastHintShownDate = useChatStore((state) => state.lastHintShownDate);
  const appOpenCount = useChatStore((state) => state.appOpenCount);
  const advanceHintProgression = useChatStore((state) => state.advanceHintProgression);
  const shouldShowHintToday = useChatStore((state) => state.shouldShowHintToday);
  const markHintShownToday = useChatStore((state) => state.markHintShownToday);

  const [hintState, setHintState] = useState<DiscoveryHintState>({
    shouldShowToast: false,
    toastMessage: '',
    toastDuration: 4000,
    shouldFlicker: false,
    shouldGlow: false,
  });

  const isPro = subscriptionTier !== 'FREE';

  useEffect(() => {
    // Don't show hints if Classified is already discovered
    if (classifiedDiscovered) {
      setHintState({
        shouldShowToast: false,
        toastMessage: '',
        toastDuration: 4000,
        shouldFlicker: false,
        shouldGlow: false,
      });
      return;
    }

    // Pro users can opt out of hints
    if (isPro && !discoveryHintsEnabled) {
      setHintState({
        shouldShowToast: false,
        toastMessage: '',
        toastDuration: 4000,
        shouldFlicker: false,
        shouldGlow: false,
      });
      return;
    }

    // Free users: Wait until app open #2 before showing hints
    if (!isPro && appOpenCount < 2) {
      setHintState({
        shouldShowToast: false,
        toastMessage: '',
        toastDuration: 4000,
        shouldFlicker: false,
        shouldGlow: false,
      });
      return;
    }

    const canShowHint = shouldShowHintToday();

    // If we can show a hint AND we've shown something before (lastHintShownDate exists)
    // AND we're at level 0 (flicker-only for Free users), advance first
    if (canShowHint && lastHintShownDate && !isPro && hintProgressionLevel === 0) {
      advanceHintProgression();
      return; // Will trigger re-render with new level
    }

    // Only show one hint per app open
    if (!canShowHint) {
      setHintState({
        shouldShowToast: false,
        toastMessage: '',
        toastDuration: 4000,
        shouldFlicker: false,
        shouldGlow: false,
      });
      return;
    }

    // PRO USER HINT PROGRESSION (5 levels)
    if (isPro) {
      switch (hintProgressionLevel) {
        case 0:
          // Level 0: Clean welcome (no flicker, reassuring)
          setHintState({
            shouldShowToast: true,
            toastMessage: 'Pro unlocks hidden features. Explore everything.',
            toastDuration: 6000, // Longer so they read it
            shouldFlicker: false,
            shouldGlow: false,
          });
          return;

        case 1:
          // Level 1: Subtle glow + hint
          setHintState({
            shouldShowToast: true,
            toastMessage: "There's more here for Pro users.",
            toastDuration: 4000,
            shouldFlicker: false,
            shouldGlow: true, // Subtle glow
          });
          return;

        case 2:
          // Level 2: Glow + interactive hint
          setHintState({
            shouldShowToast: true,
            toastMessage: 'Try interacting with the title.',
            toastDuration: 4000,
            shouldFlicker: false,
            shouldGlow: true,
          });
          return;

        case 3:
          // Level 3: Direct instruction
          setHintState({
            shouldShowToast: true,
            toastMessage: 'Long-press the title to discover more.',
            toastDuration: 4000,
            shouldFlicker: false,
            shouldGlow: true,
          });
          return;

        case 4:
          // Level 4: Flicker + scanning line
          setHintState({
            shouldShowToast: false,
            toastMessage: '',
            toastDuration: 4000,
            shouldFlicker: true,
            shouldGlow: true, // Scan line after flicker
          });
          return;

        case 5:
          // Level 5: Max progression - keep showing final hint
          setHintState({
            shouldShowToast: false,
            toastMessage: '',
            toastDuration: 4000,
            shouldFlicker: true,
            shouldGlow: true,
          });
          return;
      }
    }

    // FREE USER HINT PROGRESSION (5 levels, spaced by app opens)
    else {
      // Check if user has reached the required app open count for their current level
      const requiredOpens = {
        0: 2,   // L0 at app open 2
        1: 4,   // L1 at app open 4
        2: 8,   // L2 at app open 8
        3: 12,  // L3 at app open 12
        4: 14,  // L4 at app open 14
        5: 14,  // L5 at app open 14+
      };

      const required = requiredOpens[hintProgressionLevel as keyof typeof requiredOpens] || 14;

      if (appOpenCount < required) {
        setHintState({
          shouldShowToast: false,
          toastMessage: '',
          toastDuration: 4000,
          shouldFlicker: false,
          shouldGlow: false,
        });
        return;
      }

      switch (hintProgressionLevel) {
        case 0:
          // Level 0: Flicker only (app open 2)
          setHintState({
            shouldShowToast: false,
            toastMessage: '',
            toastDuration: 4000,
            shouldFlicker: true,
            shouldGlow: false,
          });
          return;

        case 1:
          // Level 1: Flicker → Mystery toast (app open 4)
          setHintState({
            shouldShowToast: true,
            toastMessage: 'Hush has more than one side.',
            toastDuration: 4000,
            shouldFlicker: true,
            shouldGlow: false,
          });
          return;

        case 2:
          // Level 2: Flicker → Cryptic hint (app open 8)
          setHintState({
            shouldShowToast: true,
            toastMessage: 'Something is hidden here.',
            toastDuration: 4000,
            shouldFlicker: true,
            shouldGlow: false,
          });
          return;

        case 3:
          // Level 3: Flicker → Interactive hint (app open 12)
          setHintState({
            shouldShowToast: true,
            toastMessage: 'The title responds to touch.',
            toastDuration: 4000,
            shouldFlicker: true,
            shouldGlow: false,
          });
          return;

        case 4:
          // Level 4: Flicker → Scanning line (app open 14)
          setHintState({
            shouldShowToast: false,
            toastMessage: '',
            toastDuration: 4000,
            shouldFlicker: true,
            shouldGlow: true, // Scan line after flicker
          });
          return;

        case 5:
          // Level 5: Max progression - keep showing final hint (app open 14+)
          setHintState({
            shouldShowToast: false,
            toastMessage: '',
            toastDuration: 4000,
            shouldFlicker: true,
            shouldGlow: true,
          });
          return;
      }
    }

    // Default: no hints
    setHintState({
      shouldShowToast: false,
      toastMessage: '',
      toastDuration: 4000,
      shouldFlicker: false,
      shouldGlow: false,
    });
  }, [
    isPro,
    classifiedDiscovered,
    discoveryHintsEnabled,
    hintProgressionLevel,
    lastHintShownDate,
    appOpenCount,
    shouldShowHintToday,
  ]);

  const dismissToast = () => {
    setHintState((prev) => ({
      ...prev,
      shouldShowToast: false,
    }));

    // Mark hint as shown and advance progression
    // This happens when user dismisses the toast (complete interaction)
    markHintShownToday();
    advanceHintProgression();
  };

  const onFlickerComplete = () => {
    // Important: Don't call markHintShownToday() or advanceHintProgression() here!
    // If we mark it as shown, useEffect re-runs and sees "already shown today"
    // and sets everything to false BEFORE the toast/glow can appear.
    //
    // Instead:
    // - For flicker+toast: wait for dismissToast()
    // - For flicker+glow: mark shown after a delay (scan line needs to play)
    // - For flicker-only: mark shown and advance on NEXT app open

    const hasToast = hintState.shouldShowToast;
    const hasGlow = hintState.shouldGlow;

    if (!hasToast && !hasGlow) {
      // Flicker-only (Free L0): mark shown, will advance on next open
      markHintShownToday();
    } else if (!hasToast && hasGlow) {
      // Flicker+glow (L4-5): Give scan line time to play (1.8 seconds), then mark shown
      setTimeout(() => {
        markHintShownToday();
        if (hintProgressionLevel < 5) {
          advanceHintProgression();
        }
      }, 2500); // 1.8s scan + 0.7s buffer
    }
    // For flicker+toast: dismissToast() will handle marking/advancing

    setHintState((prev) => ({
      ...prev,
      shouldFlicker: false,
    }));
  };

  return {
    ...hintState,
    dismissToast,
    onFlickerComplete,
  };
};
