/**
 * ESLint Configuration - DiscreteZero
 *
 * Custom rules to enforce memory-optimized patterns and prevent regressions.
 */

module.exports = {
  root: true,
  extends: ['@react-native'],
  rules: {
    /**
     * CRITICAL: Prevent store destructuring anti-pattern
     *
     * ❌ BAD:  const { hushTheme, flavor } = useChatStore();
     * ✅ GOOD: const hushTheme = useChatStore((state) => state.hushTheme);
     *
     * Destructuring subscribes to ALL store changes, causing unnecessary re-renders.
     * This rule prevents the pattern that caused the Low Memory Killer crash.
     *
     * Error: "Use selective subscriptions: useChatStore((state) => state.field)"
     */
    'no-restricted-syntax': [
      'error',
      {
        selector:
          'VariableDeclarator[init.callee.name="useChatStore"] > ObjectPattern',
        message:
          'Store destructuring causes unnecessary re-renders. Use selective subscriptions: useChatStore((state) => state.field) or import from selectors.ts',
      },
      {
        selector:
          'VariableDeclarator[init.callee.name=/.*Store$/] > ObjectPattern',
        message:
          'Store destructuring causes unnecessary re-renders. Use selective subscriptions: useStore((state) => state.field)',
      },
    ],
  },
};
