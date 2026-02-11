import { useEffect } from 'react';
import { FlatList } from 'react-native';

/**
 * Auto-scroll hook for FlatList components
 *
 * Automatically scrolls to the end of a FlatList when a dependency changes.
 * Commonly used to scroll to the latest message in chat interfaces.
 *
 * @param ref - React ref to the FlatList component
 * @param dependency - Value to watch for changes (typically message count)
 * @param delay - Delay in milliseconds before scrolling (default: 100ms)
 *
 * @example
 * ```tsx
 * const flatListRef = useRef<FlatList>(null);
 * useAutoScroll(flatListRef, messages.length);
 * ```
 */
export const useAutoScroll = (
  ref: React.RefObject<FlatList | null>,
  dependency: number,
  delay: number = 100
) => {
  useEffect(() => {
    if (dependency > 0) {
      const timer = setTimeout(() => {
        ref.current?.scrollToEnd({ animated: true });
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [dependency, delay]);
};
