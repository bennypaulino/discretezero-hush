import { useMemo } from 'react';
import { useChatStore } from '../state/rootStore';
import { HUSH_DECOY_PRESETS, CLASSIFIED_DECOY_PRESETS } from '../data/DecoyPresets';
import type { AppFlavor } from '../../config';

/**
 * Filtered messages hook for chat screens
 *
 * Filters messages based on the current flavor and decoy mode state.
 * In normal mode, returns real messages filtered by context.
 * In decoy mode, returns preset or custom decoy messages.
 *
 * @param flavor - The app flavor (HUSH, CLASSIFIED, or DISCRETION)
 * @returns Filtered array of messages to display
 *
 * @example
 * ```tsx
 * const displayMessages = useFilteredMessages('HUSH');
 * ```
 */
export const useFilteredMessages = (flavor: AppFlavor) => {
  // PERFORMANCE FIX: Use selective subscriptions instead of destructuring
  // Destructuring subscribes to ENTIRE store, causing re-renders on ANY state change
  // Selective subscriptions only re-render when specific values change
  const messages = useChatStore((state) => state.messages);
  const isDecoyMode = useChatStore((state) => state.isDecoyMode);
  const decoyBurned = useChatStore((state) => state.decoyBurned);
  const hushDecoyPreset = useChatStore((state) => state.hushDecoyPreset);
  const classifiedDecoyPreset = useChatStore((state) => state.classifiedDecoyPreset);
  const customDecoyHushMessages = useChatStore((state) => state.customDecoyHushMessages);
  const customDecoyClassifiedMessages = useChatStore((state) => state.customDecoyClassifiedMessages);

  return useMemo(() => {
    // Real mode - filter real messages by context
    if (!isDecoyMode) {
      return messages.filter((m) => m.context === flavor);
    }

    // Decoy mode - check if messages were intentionally burned
    if (decoyBurned) {
      // Return empty to prevent preset refill after burn
      // User stays in decoy mode for safety (new messages go to decoy)
      return [];
    }

    // Decoy mode - use custom messages or preset
    const presetMap = {
      HUSH: {
        preset: hushDecoyPreset,
        custom: customDecoyHushMessages,
        presets: HUSH_DECOY_PRESETS,
      },
      CLASSIFIED: {
        preset: classifiedDecoyPreset,
        custom: customDecoyClassifiedMessages,
        presets: CLASSIFIED_DECOY_PRESETS,
      },
      DISCRETION: {
        preset: null,
        custom: [],
        presets: {},
      },
    };

    const config = presetMap[flavor];

    // Use custom decoy messages if they exist
    if (config.custom.length > 0) {
      return config.custom;
    }

    // Fall back to preset decoy messages
    if (config.preset && config.presets[config.preset]) {
      return config.presets[config.preset];
    }

    // If no preset or custom messages, return empty array
    return [];
  }, [
    messages, // Changed from messages.length to detect content changes
    isDecoyMode,
    decoyBurned,
    flavor,
    hushDecoyPreset,
    classifiedDecoyPreset,
    customDecoyHushMessages,
    customDecoyClassifiedMessages,
  ]);
};
