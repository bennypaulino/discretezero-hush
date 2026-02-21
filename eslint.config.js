/**
 * ESLint Flat Config (v9+) - DiscreteZero
 *
 * Custom rules to enforce memory-optimized patterns and prevent regressions.
 *
 * Migration from .eslintrc.js to eslint.config.js (ESLint v9 flat config format)
 *
 * Usage:
 *   npx eslint src/                     # Lint all source files
 *   npx eslint src/ --fix               # Auto-fix issues where possible
 *   npx eslint src/core/hooks/*.ts      # Lint specific directory
 *
 * VS Code Integration:
 *   Install the ESLint extension and it will automatically use this config.
 *   Errors will appear as red squiggles in the editor.
 *
 * Note: This is a focused config for preventing memory regressions.
 * For full type checking, use TypeScript: cmd+shift+B (VS Code)
 */

const tsParser = require('@typescript-eslint/parser');

module.exports = [
  {
    // Apply to all TypeScript/JavaScript files
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],

    // Language options for parsing TypeScript
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },

    // Custom rules for memory optimization enforcement
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
       * Root Cause: Store destructuring creates subscriptions to every field in the store.
       * On 4GB Android devices, this caused ~10,000 unnecessary re-renders per AI response,
       * triggering the Low Memory Killer and crashing the app after 26 seconds.
       *
       * Solution: Selective subscriptions only re-render when the specific field changes.
       *
       * Example violations this rule catches:
       * - const { hushTheme, flavor } = useChatStore();
       * - const { field1, field2, field3 } = useAnyStore();
       *
       * Approved patterns:
       * - const hushTheme = useChatStore((state) => state.hushTheme);
       * - const theme = useChatStore(selectHushTheme); // Using named selectors
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
  },
];
