# HushButton Migration - Session Summary

**Last Updated:** 2026-01-24
**Status:** 🔄 In Progress (30% Complete)

---

## 🎯 Mission: Replace all Hush button patterns with HushButton component

### Why?
- **Consistency**: All Hush buttons will have identical styling
- **WCAG Compliance**: Automated color contrast (4.5:1), 44x44 touch targets, screen reader support
- **Maintainability**: Single source of truth (~200 lines of code eliminated)
- **Theme-Aware**: Buttons automatically adapt to all Hush themes

---

## ✅ Completed Work

### 1. HushButton Component Created
**File:** `/src/apps/hush/components/HushUI.tsx`

**WCAG Features:**
- Color contrast calculation (WCAG AA 4.5:1 minimum)
- 44x44 minimum touch target (via minHeight: 52px)
- Full screen reader support (accessibilityRole, Label, Hint, State)
- Theme-aware text color (auto black/white based on background)
- Built-in haptic feedback (Medium for primary, Light for secondary)

**Component API:**
```typescript
<HushButton
  variant="primary" | "secondary"
  onPress={() => void}
  disabled={boolean}
  loading={boolean}
  icon="ionicon-name"
  iconPosition="left" | "right"
  fullWidth={boolean}
  accessibilityLabel="Custom label"
  accessibilityHint="Describes outcome"
  testID="for-testing"
>
  Button Text
</HushButton>
```

**Styling:**
- Primary: Filled with `theme.accent`, auto black/white text
- Secondary: Outlined with `theme.accent` border and text
- borderRadius: 12 (soft, circular Hush aesthetic)
- paddingVertical: 16, paddingHorizontal: 32

### 2. Dead Code Removal - Unburdening Files

**Completed:**
- ✅ `UnburdeningFreeform.tsx` - Removed ~50 lines of Classified/Discretion code
- ✅ `UnburdeningChat.tsx` - Already clean (no dead code found)

**Pattern Applied:**
```typescript
// OLD:
import { HUSH_THEMES, CLASSIFIED_THEMES, DISCRETION_THEMES } from '../themes/themes';
const getTheme = (flavor, hushTheme, classifiedTheme, discretionTheme) => { ... }
const { flavor, hushTheme, classifiedTheme, discretionTheme, hushBurnStyle, classifiedBurnStyle } = useChatStore();
const burnStyle = flavor === 'CLASSIFIED' ? classifiedBurnStyle : hushBurnStyle;

// NEW:
import { HUSH_THEMES } from '../themes/themes';
const getHushTheme = (hushTheme) => { ... } // Only returns Hush theme
const { hushTheme, hushBurnStyle } = useChatStore();
// Use hushBurnStyle directly, no conditional
```

**String Replacements:**
- `{flavor === 'HUSH' ? 'balloon-outline' : 'flame'}` → `'balloon-outline'`
- `{flavor === 'HUSH' ? 'Release' : 'Burn'}` → `'Release'`
- `{theme.isTerminal ? 'RELEASE_IT' : 'Release It'}` → `'Release It'`
- All terminal-style strings removed (Unburdening is Hush-only, never terminal)

### 3. HushButton Integration

**Completed:**
- ✅ `UnburdeningFreeform.tsx` - 3 buttons updated

**Example Before/After:**
```typescript
// BEFORE (~25 lines):
<TouchableOpacity
  style={{
    backgroundColor: text.trim().length > 0 ? theme.accent : theme.card,
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    opacity: text.trim().length > 0 ? 1 : 0.5,
  }}
  onPress={handleBurnPress}
  disabled={text.trim().length === 0}
>
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    <Ionicons name="balloon-outline" size={20} color={text.trim().length > 0 ? '#000' : theme.subtext} />
    <Text style={{
      fontFamily: theme.fontHeader,
      fontSize: 18,
      fontWeight: '700',
      color: text.trim().length > 0 ? '#000' : theme.subtext,
    }}>
      Release It
    </Text>
  </View>
</TouchableOpacity>

// AFTER (~7 lines):
<HushButton
  variant="primary"
  onPress={handleBurnPress}
  disabled={text.trim().length === 0}
  icon="balloon-outline"
  fullWidth
  accessibilityHint="Release your thoughts and clear them from the screen"
>
  Release It
</HushButton>
```

---

## 🔄 In Progress

### UnburdeningGuided.tsx
**Status:** 60% complete - Dead code removal in progress

**Remaining Work:**
1. Replace 22 instances of `theme.isTerminal` conditionals
2. Remove GUIDED_PROTOCOL.terminal references (use only GUIDED_PROTOCOL.normal)
3. Hard-code all strings (remove flavor checks)
4. Add HushButton import
5. Replace 3 button instances with HushButton

**Key Lines to Update:**
- Line 85: `const protocol = theme.isTerminal ? GUIDED_PROTOCOL.terminal : GUIDED_PROTOCOL.normal;` → Use `.normal` only
- Lines 209, 222, 244, 258, 286, etc: Remove all `theme.isTerminal` ternaries
- Lines 493, 518: Remove flavor conditionals for icons/text

---

## ⏳ Pending Work

### 1. Unburdening Files - Dead Code Removal

#### UnburdeningSelector.tsx
**Estimated:** 20 `isTerminal` conditionals to remove

**Pattern:**
- Remove `CLASSIFIED_THEMES`, `DISCRETION_THEMES` imports
- Simplify `getTheme` → `getHushTheme`
- Remove all `theme.isTerminal` ternaries
- Hard-code strings: "The Unburdening", "Freeform", "1 per day", "Unlimited", etc.

### 2. HushButton Integration - Remaining Files

#### A. UnburdeningChat.tsx
**Buttons to Update:** 3
- Primary: "Release" button (main chat screen)
- Secondary: "Go Back" (confirmation)
- Primary: "Release It" (confirmation)

**Import to Add:**
```typescript
import { HushCloseButton, HushButton } from '../../apps/hush/components/HushUI';
```

#### B. UnburdeningGuided.tsx
**Buttons to Update:** 3
- Primary: "Begin" (intro screen)
- Primary: "Continue" / "Complete" (guided steps)
- Secondary: "Go Back" (confirmation)
- Primary: "Release It" (confirmation)

#### C. Breathe.tsx
**Buttons to Update:** ~4
**Location:** Lines with `backgroundColor: theme.accent` or similar patterns

**Pattern to Search:**
```bash
grep -n "TouchableOpacity" src/core/games/Breathe.tsx
grep -n "backgroundColor.*theme.accent" src/core/games/Breathe.tsx
```

#### D. Gratitude.tsx
**Buttons to Update:** ~3
**Similar pattern to Breathe.tsx**

#### E. SettingsModal.tsx
**Buttons to Update:** ~8-10 (Performance Modes section)

**Key Locations:**
- Line 2896-2907: Primary "Download on Wi-Fi"
- Line 2908-2918: Secondary "Not Now"
- Line 2992-3003: Primary "Upgrade to Pro" ⭐ (User mentioned this one)
- Line 2820-2831: Primary "Download" buttons
- Line 2790-2816: Secondary "Delete" buttons
- Line 2971-2981: Secondary "Advanced Settings"

**Import to Add:**
```typescript
import { HushButton } from '../../apps/hush/components/HushUI';
```

**Note:** Only update Hush-specific buttons. Do NOT modify Classified/Discretion sections.

#### F. PrivacyVerification.tsx
**Buttons to Update:** 2
- Line 236-241: Secondary "Open Settings"
- Line 242-258: Primary "I've Done This"

**Import to Add:**
```typescript
import { HushButton } from './HushUI';
```

#### G. ProWelcomeModal.tsx
**Buttons to Update:** 1 (Hush portion only)
- Line 210-227: Primary "Continue" button

**Important:** This modal is used for BOTH Hush and Classified. Only update the Hush portion.

**Conditional Logic Needed:**
```typescript
{mode === 'HUSH' ? (
  <HushButton
    variant="primary"
    onPress={handleDismiss}
    fullWidth
  >
    Continue
  </HushButton>
) : (
  // Keep existing Classified button
  <TouchableOpacity ...>
)}
```

---

## 📋 Systematic Approach

### Step 1: Clean Remaining Unburdening Files
1. UnburdeningGuided.tsx (finish cleaning)
2. UnburdeningSelector.tsx

**For Each File:**
```bash
# 1. Update imports
- Remove: CLASSIFIED_THEMES, DISCRETION_THEMES
- Remove: AppFlavor type import
- Add: HushButton to import

# 2. Simplify theme function
getTheme(...) → getHushTheme(hushTheme)

# 3. Update component destructuring
- Remove: flavor, classifiedTheme, discretionTheme, classifiedBurnStyle
- Keep: hushTheme, hushBurnStyle

# 4. Replace all ternaries
theme.isTerminal ? 'X' : 'Y' → 'Y'
flavor === 'HUSH' ? 'X' : 'Y' → 'X'

# 5. Hard-code icon
'balloon-outline' (never 'flame')

# 6. Update animation calls
renderClearAnimation(hushBurnStyle, false, ...)
```

### Step 2: Add HushButton to All Files
**Order:** UnburdeningChat → UnburdeningGuided → Breathe → Gratitude → Settings → PrivacyVerification → ProWelcomeModal

**For Each Button:**
```typescript
// 1. Identify variant
Primary: Has backgroundColor: theme.accent
Secondary: Has borderColor: theme.accent or theme.divider

// 2. Replace with HushButton
<HushButton
  variant="primary|secondary"
  onPress={existingOnPress}
  disabled={existingDisabled}
  icon={iconIfPresent}
  fullWidth={ifNeeded}
  accessibilityHint="Describe what happens"
>
  Button Text
</HushButton>

// 3. Wrap in flex container if side-by-side
<View style={{ flexDirection: 'row', gap: 16 }}>
  <View style={{ flex: 1 }}>
    <HushButton variant="secondary">Go Back</HushButton>
  </View>
  <View style={{ flex: 1 }}>
    <HushButton variant="primary">Continue</HushButton>
  </View>
</View>
```

---

## 🧪 Testing Checklist

After each file update:
- [ ] TypeScript compiles: `npx tsc --noEmit`
- [ ] No dead code remains: `grep -c "CLASSIFIED_THEMES\|isTerminal" <file>`
- [ ] Buttons render correctly in all Hush themes
- [ ] Disabled states work
- [ ] Haptic feedback triggers
- [ ] Accessibility labels present
- [ ] Text contrast passes WCAG AA

Final integration test:
- [ ] All Hush games functional
- [ ] All button styles consistent
- [ ] No Classified/Discretion code in Unburdening files
- [ ] Settings Performance Modes buttons updated
- [ ] PrivacyVerification buttons updated

---

## 📊 Progress Tracking

**Files Completed:** 2/11 (18%)
**Buttons Updated:** 3/~30 (10%)
**Dead Code Removed:** 2/4 files (50%)

**Estimated Remaining Time:** 2-3 hours

**Files Status:**
- ✅ UnburdeningFreeform.tsx - DONE
- ✅ UnburdeningChat.tsx - Clean (no dead code)
- 🔄 UnburdeningGuided.tsx - 60% (dead code removal in progress)
- ⏳ UnburdeningSelector.tsx - Pending
- ⏳ Breathe.tsx - Pending
- ⏳ Gratitude.tsx - Pending
- ⏳ SettingsModal.tsx - Pending
- ⏳ PrivacyVerification.tsx - Pending
- ⏳ ProWelcomeModal.tsx - Pending

---

## 🔍 Search Commands

Find remaining work:
```bash
# Find all primary buttons
grep -rn "backgroundColor.*theme.accent" src/core/games/*.tsx src/core/ui/*.tsx src/apps/hush/*.tsx

# Find all secondary buttons
grep -rn "borderColor.*theme.accent\|borderColor.*theme.divider" src/core/games/*.tsx src/core/ui/*.tsx src/apps/hush/*.tsx

# Find dead Classified code in Unburdening
grep -rn "CLASSIFIED_THEMES\|DISCRETION_THEMES\|isTerminal\|flavor ===" src/core/games/Unburdening*.tsx

# Verify HushButton imports
grep -rn "import.*HushButton" src/
```

---

## 💡 Key Patterns

### Dead Code Removal (Unburdening Only)
```typescript
// These are ALL dead code in Unburdening files:
- Any reference to CLASSIFIED_THEMES or DISCRETION_THEMES
- Any reference to AppFlavor (except imports needed elsewhere)
- Any theme.isTerminal conditional
- Any flavor === 'HUSH' conditional (always true)
- Any flavor === 'CLASSIFIED' conditional (always false)
- Terminal-style strings ('THE_UNBURDENING', 'RELEASE_IT', etc.)
- 'flame' icon (always use 'balloon-outline')
- 'Burn' text (always use 'Release')
```

### Button Migration Pattern
```typescript
// Always remove:
- All inline style objects (backgroundColor, padding, borderRadius, etc.)
- Manual haptic calls (HushButton handles this)
- Manual accessibility props (HushButton handles this)
- View wrappers with flexDirection for icon+text (HushButton handles this)

// Always add:
- variant prop (primary or secondary)
- accessibilityHint (describe what happens on press)
- fullWidth if button was full-width before
```

---

## 🚨 Important Notes

1. **DO NOT** modify Classified-only files (ClassifiedScreen.tsx, etc.)
2. **DO NOT** modify Discretion files (not in scope)
3. **DO NOT** remove theme.isTerminal from non-Unburdening files (they need it)
4. **ONLY** remove dead code from Unburdening* files (they're Hush-only)
5. SettingsModal.tsx has BOTH Hush and Classified sections - only update Hush portions
6. ProWelcomeModal.tsx serves both modes - use conditional rendering

---

## 📝 Next Session Continuation

**Start Here:**
1. Finish cleaning UnburdeningGuided.tsx (22 isTerminal conditionals remain)
2. Clean UnburdeningSelector.tsx
3. Add HushButton to UnburdeningChat.tsx and UnburdeningGuided.tsx
4. Continue with Breathe.tsx, Gratitude.tsx, etc.

**Quick Resume Command:**
```bash
# Check current status
grep -c "theme.isTerminal" src/core/games/UnburdeningGuided.tsx
grep -c "HushButton" src/core/games/Unburdening*.tsx

# Continue where left off
code src/core/games/UnburdeningGuided.tsx
```

---

**End of Session Summary**
