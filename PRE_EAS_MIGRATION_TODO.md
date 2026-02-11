# Pre-EAS Migration TODO

**⚠️ CRITICAL: Remove all dev-only features before deploying to EAS**

## Files to DELETE

1. `/src/core/ui/ComponentLibraryComparison.tsx`
   - Dev-only visual design system comparison screen
   - Not meant for production

## Code to REMOVE from `/src/core/ui/SettingsModal.tsx`

### Import Statement (line ~14)
```typescript
import { ComponentLibraryComparison } from './ComponentLibraryComparison';
```

### State Declaration (line ~178)
```typescript
const [showComparisonScreen, setShowComparisonScreen] = useState(false);
```

### Navigation Button in About Screen (line ~2035)
```typescript
{/* DEV ONLY: Component Library Comparison - REMOVE BEFORE EAS MIGRATION */}
{__DEV__ && (
  <TouchableOpacity
    style={[styles.aboutRow, { borderBottomWidth: 0, marginTop: 16 }]}
    onPress={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setShowComparisonScreen(true);
    }}
  >
    <View style={{ flex: 1 }}>
      <Text style={[styles.aboutRowLabel, { color: theme.text, fontFamily: theme.fontBody, fontSize: 16, fontWeight: '600' }]}>
        {theme.isTerminal ? 'Component_Library_Comparison' : 'Component Library Comparison'}
      </Text>
      <Text style={[styles.aboutRowHint, { color: theme.subtext, fontFamily: theme.fontBody, fontSize: 14, marginTop: 4 }]}>
        {theme.isTerminal ? 'DEV_ONLY_-_VISUAL_DESIGN_SYSTEM' : 'Dev only - Visual design system comparison'}
      </Text>
    </View>
    <Ionicons name="color-palette-outline" size={20} color={theme.accent} />
  </TouchableOpacity>
)}
```

### Overlay Rendering (line ~3190)
```typescript
{/* DEV ONLY: Component Library Comparison Overlay - REMOVE BEFORE EAS MIGRATION */}
{__DEV__ && showComparisonScreen && (
  <ComponentLibraryComparison onClose={() => setShowComparisonScreen(false)} />
)}
```

## Verification Checklist

- [ ] Delete ComponentLibraryComparison.tsx file
- [ ] Remove import statement from SettingsModal.tsx
- [ ] Remove showComparisonScreen state from SettingsModal.tsx
- [ ] Remove navigation button from About screen
- [ ] Remove overlay rendering code
- [ ] Search codebase for any remaining references to "ComponentLibraryComparison"
- [ ] Run `npx tsc --noEmit` to verify no TypeScript errors
- [ ] Test Settings → About screen (should not have comparison button)
- [ ] Delete this TODO document after completion

## Search Commands

```bash
# Find all references to ComponentLibraryComparison
grep -r "ComponentLibraryComparison" src/

# Find all __DEV__ guards (review each one)
grep -r "__DEV__" src/
```

---

**Last Updated:** 2026-01-24
**Status:** Pending
