# Performance Fix: Excessive Re-renders During AI Streaming

## The Problem

During AI response generation in ClassifiedScreen, the component was re-rendering 200+ times, causing:
- "Context changed during AI generation, discarding stale response" errors
- AI responses not rendering on screen
- Console spam with render logs

## Root Cause Analysis

### The Smoking Gun

**File:** `/src/core/ui/BadgeUnlockModal.tsx` (Line 74)
**Original Code:**
```typescript
const { hushTheme, classifiedTheme, discretionTheme, flavor } = useChatStore();
```

**Problem:** This line destructures the ENTIRE Zustand store in a single subscription.

### Why This Caused 200+ Re-renders

1. During AI streaming, `appendStreamingToken()` is called 50-200 times per response
2. Each token update modifies `streamingText` in the Zustand store
3. When ANY part of the store changes, Zustand notifies ALL subscribers
4. **BadgeUnlockModal was subscribed to the ENTIRE store** via destructuring
5. Result: 200+ re-renders of BadgeUnlockModal for a single AI response

### The Cascade Effect

```
Token 1: streamingText updated → BadgeUnlockModal re-renders
Token 2: streamingText updated → BadgeUnlockModal re-renders
Token 3: streamingText updated → BadgeUnlockModal re-renders
... (repeat 50-200 times)
Result: Component tree becomes unstable, causes "context changed" error
```

## The Solution

### Fixed Approach: Selective Subscriptions

Instead of destructuring the entire store, use individual selective subscriptions:

**Fixed Code:**
```typescript
// BEFORE (subscribes to ENTIRE store)
const { hushTheme, classifiedTheme, discretionTheme, flavor } = useChatStore();

// AFTER (subscribes only to needed properties)
const hushTheme = useChatStore((state) => state.hushTheme);
const classifiedTheme = useChatStore((state) => state.classifiedTheme);
const discretionTheme = useChatStore((state) => state.discretionTheme);
const flavor = useChatStore((state) => state.flavor);
```

**Why This Works:**
- Each subscription only triggers re-renders when THAT specific property changes
- Changes to `streamingText` don't notify BadgeUnlockModal
- Component only re-renders when its actual dependencies change

## Files Fixed

1. **BadgeUnlockModal.tsx** - PRIMARY FIX
   - Line 74: Converted destructuring to selective subscriptions
   - This was the main culprit causing 200+ re-renders

2. **ModelDownloadErrorModal.tsx**
   - Line 23: Same fix applied
   - Prevents re-renders during streaming if error modal visible

3. **PaywallModal.tsx**
   - Line 20: Same fix applied
   - Prevents re-renders during streaming if paywall visible

## Performance Impact

### Before Fix
- 200+ re-renders of BadgeUnlockModal per AI response
- Constant "context changed during AI generation" errors
- Responses discarded and not displayed

### After Fix
- 0 unnecessary re-renders (only when badges actually unlock)
- Smooth streaming with no context conflicts
- Responses render correctly on screen

## Technical Details

### Zustand Subscription Mechanics

Zustand has two subscription modes:

**Mode 1: Destructuring (ANTI-PATTERN)**
```typescript
const { a, b, c } = useStore();
// Subscribes to entire store object
// Re-renders on ANY state change
```

**Mode 2: Selective Subscriptions (CORRECT)**
```typescript
const a = useStore((state) => state.a);
const b = useStore((state) => state.b);
const c = useStore((state) => state.c);
// Each subscription only triggers on that property's change
// Minimal re-renders
```

### Why Destructuring is Bad

Zustand's internal mechanism:
1. `useStore()` without a selector subscribes to the entire store object
2. When ANY property changes, the store object reference changes
3. All destructured variables trigger a new reference check
4. React sees "new state" and re-renders the component

### Streaming's Amplification Effect

Streaming calls `appendStreamingToken()` hundreds of times:
```typescript
appendStreamingToken: (token: string) => {
  set({
    streamingText: state.streamingText + token,
    streamingTokenCount: state.streamingTokenCount + 1,
  });
},
```

Each call creates a new store state, triggering all destructured subscriptions.

## Prevention

**Going forward:** Always use selective subscriptions in React Native components:

```typescript
// ✅ GOOD - Selective subscriptions
const userId = useChatStore((state) => state.userId);
const theme = useChatStore((state) => state.theme);

// ❌ BAD - Destructuring entire store
const { userId, theme, ...everything } = useChatStore();

// ❌ BAD - getState() in render function
const state = useChatStore.getState();
```

## Testing

To verify the fix works:
1. Generate a response in ClassifiedScreen
2. Observe console logs - should only see BadgeUnlockModal render when badges actually unlock
3. Response should appear on screen without "context changed" errors
4. Verify no 200+ render spam in React DevTools

## References

- Zustand Selective Subscriptions: https://docs.pmnd.rs/zustand/guides/slices-pattern
- React Performance: https://react.dev/reference/react/memo
- Previous fix (streaming state): Line 982 of chatSlice.ts (appendStreamingToken direct set)
