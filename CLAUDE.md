# Working with Claude on DiscreteZero Hush

This document outlines the development workflow, conventions, and guidelines for working on this project with Claude Code.

## Git Workflow

### Branch Strategy

- **`main`** - Production-ready code, protected branch
- **`develop`** - Active development branch (current working branch)
- **Feature branches** - Created from `develop` for specific features/fixes

### Feature Development Workflow

1. **Create a feature branch from develop:**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/issue-number-description
   # Example: git checkout -b feature/3-fix-panic-wipe
   ```

2. **Make your changes and commit:**
   ```bash
   git add .
   git commit -m "Descriptive commit message

   - Detail 1
   - Detail 2

   Fixes #issue-number"
   ```

3. **Push and create a Pull Request:**
   ```bash
   git push -u origin feature/issue-number-description
   # Then create PR on GitHub: develop ← feature branch
   ```

4. **After PR is merged, delete the feature branch:**
   ```bash
   git checkout develop
   git pull origin develop
   git branch -d feature/issue-number-description
   ```

### Hotfix Workflow (Urgent fixes to production)

1. **Create hotfix branch from main:**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b hotfix/critical-issue-description
   ```

2. **Fix, commit, and create PRs:**
   ```bash
   git add .
   git commit -m "Hotfix: description"
   git push -u origin hotfix/critical-issue-description
   ```

3. **Create TWO pull requests:**
   - PR 1: `main ← hotfix branch` (to fix production)
   - PR 2: `develop ← hotfix branch` (to keep develop in sync)

---

## Project Structure

```
DiscreteZero/
├── src/
│   ├── apps/                    # App flavor implementations
│   │   ├── hush/               # Hush mode (privacy-focused)
│   │   ├── classified/         # Classified mode (military theme)
│   │   └── discretion/         # Discretion mode (professional)
│   ├── core/
│   │   ├── animations/         # Clear animations, effects
│   │   ├── data/               # Static data (decoy presets, etc.)
│   │   ├── engine/             # AI engines (LocalAI, GroqAI, MockAI)
│   │   ├── games/              # Interactive games (Interrogation, Breathe, etc.)
│   │   ├── hooks/              # Custom React hooks
│   │   ├── modules/            # Native module bridges
│   │   ├── onboarding/         # Onboarding flows
│   │   ├── security/           # Security features (passcode, biometric, decoy)
│   │   ├── state/              # Zustand state management
│   │   ├── storage/            # Encrypted storage
│   │   ├── themes/             # Theme engine
│   │   ├── ui/                 # Reusable UI components
│   │   └── utils/              # Utility functions
│   └── types/                  # TypeScript type definitions
├── ios-module/                 # iOS native modules (Swift)
├── android-module/             # Android native modules (Kotlin)
├── plugins/                    # Expo config plugins
└── assets/                     # Images, sounds, fonts
```

---

## Development Guidelines

### TypeScript

- **Always use TypeScript** - No plain JavaScript files
- **Type everything** - Avoid `any`, use proper interfaces/types
- **Use strict mode** - Already configured in `tsconfig.json`

### React Patterns

- **Use functional components** - No class components
- **Use hooks** - Custom hooks for reusable logic
- **Zustand for state** - Global state in `src/core/state/`
- **Avoid prop drilling** - Use Zustand or context for deep props

### File Naming

- **Components:** PascalCase (e.g., `SecuritySettings.tsx`)
- **Hooks:** camelCase with `use` prefix (e.g., `usePanicWipe.ts`)
- **Utilities:** camelCase (e.g., `inputSanitizer.ts`)
- **Types:** PascalCase (e.g., `types.ts`)

### Commit Messages

Follow conventional commits format:

```
<type>: <description>

[optional body]

[optional footer]
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `style:` - Code style changes (formatting, no logic change)
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `test:` - Adding tests
- `chore:` - Maintenance tasks

**Examples:**
```bash
git commit -m "fix: prevent Achievement Gallery crash on malformed badge data

- Add null/undefined checks for gameState
- Validate badges object type
- Skip malformed badges with console warning
- Add empty state handling

Fixes #1"
```

```bash
git commit -m "feat: add custom volume indicator component

- Create VolumeIndicator.tsx
- Monitor AVAudioSession volume changes
- Auto-hide after 3 seconds
- Style per app mode theme

Closes #2"
```

---

## Testing Guidelines

### Before Committing

1. **TypeScript check:**
   ```bash
   npx tsc --noEmit --skipLibCheck
   ```

2. **Test in Expo Go (if possible):**
   ```bash
   npx expo start
   ```

3. **Test with development build (for native features):**
   ```bash
   npx expo start --dev-client
   ```

### Testing Panic Wipe

- **Expo Go:** Use manual trigger in Settings > Testing
- **Development build:** Use triple-shake gesture (shake device 3 times rapidly)
- **Check logs:** Look for `[usePanicWipe]` and `[ShakeDetector]` messages

**Note:** Panic wipe previously used volume buttons but was changed to shake gesture due to iOS API limitations (volume buttons don't fire events when volume is at min/max limits).

### Building for Testing

**⚠️ IMPORTANT: Only build when native code changes! See "EAS Build Credit Management" section below.**

```bash
# STEP 1: Build ONCE when native code changes (uses EAS credit)
eas build --platform ios --profile development

# STEP 2: For ALL JavaScript changes, just reload (FREE!)
npx expo start --dev-client
# Scan QR code or press 'i' to open on device

# Production builds (when ready for release)
eas build --platform all --profile production
```

**When to rebuild:**
- ✅ Changed Swift/Kotlin native modules
- ✅ Modified Expo config plugins
- ✅ Added/updated native dependencies
- ❌ Changed TypeScript/React files (just reload!)
- ❌ Updated UI components (just reload!)
- ❌ Modified Zustand state (just reload!)

---

## EAS Build Credit Management

### ⚠️ CRITICAL: Build Credits Are Limited

**Current Status (as of Feb 2026):**
- Used 93% of monthly build credits in 6 days (22 builds)
- **FREE tier has limited builds per month**
- Additional builds beyond limit are charged at pay-as-you-go rates

### The Two-Stage Development Workflow

#### Stage 1: Build Once (Uses 1 EAS Credit)

**Only build when you change:**
- Native code (Swift, Objective-C, Java, Kotlin files)
- Expo config plugins (`app.json` plugins array)
- Native dependencies (adding/updating packages with native modules)
- Build configuration (eas.json profiles)

```bash
# iOS development build (requires EAS credit)
eas build --platform ios --profile development

# Android development build (requires EAS credit)
eas build --platform android --profile development
```

**⚠️ IMPORTANT: Xcode is NOT available on this laptop**
- Local iOS builds with Xcode are NOT an option
- ALWAYS use EAS build for iOS builds
- Cannot use `npx expo prebuild` + Xcode workflow
- EAS cloud builds are the ONLY way to build iOS apps

**After building:**
1. Download and install the development build on your device
2. This is a custom "container" app with your native code baked in
3. Keep this installed - you'll reuse it for weeks/months!

#### Stage 2: Reload Unlimited (FREE - No Credits!)

**For ALL JavaScript/TypeScript changes:**
- React components
- TypeScript files
- Zustand state
- Hooks, utilities, themes
- ANY non-native code

```bash
# Start dev server (FREE, unlimited reloads!)
npx expo start --dev-client

# Then on your device:
# - Scan QR code, OR
# - Press 'i' in terminal to open on iOS device
```

**How it works:**
- Connects to the development build you installed from EAS
- Changes reload instantly via Metro bundler
- Does NOT require rebuilding
- Does NOT use Expo Go
- Does NOT consume build credits

### When to Build vs. Reload

| Change Type | Action Required | Credits Used |
|-------------|----------------|--------------|
| TypeScript/React files | `npx expo start --dev-client` | 0 (FREE) |
| Zustand state changes | `npx expo start --dev-client` | 0 (FREE) |
| UI components | `npx expo start --dev-client` | 0 (FREE) |
| Hooks, utilities | `npx expo start --dev-client` | 0 (FREE) |
| Theme changes | `npx expo start --dev-client` | 0 (FREE) |
| **Swift/Kotlin files** | `eas build` | **1 credit** |
| **Config plugins** | `eas build` | **1 credit** |
| **Native dependencies** | `eas build` | **1 credit** |
| **app.json plugins** | `eas build` | **1 credit** |

### Examples

#### ✅ NO BUILD NEEDED (Reload Only)

```bash
# Scenario: Fixed a bug in usePanicWipe.ts
npx expo start --dev-client
# Shake device → Reload → Bug fix applied (FREE!)
```

```bash
# Scenario: Updated SecuritySettings.tsx UI
npx expo start --dev-client
# Changes appear immediately (FREE!)
```

#### ❌ BUILD REQUIRED (Uses Credit)

```bash
# Scenario: Modified VolumeButtonModule.swift
eas build --platform ios --profile development
# Must rebuild to include Swift changes (1 credit)
```

```bash
# Scenario: Added new Expo config plugin
eas build --platform ios --profile development
# Must rebuild to apply plugin (1 credit)
```

### Typical Monthly Usage

**With proper workflow:**
- 2-3 builds per month (when native code changes)
- Unlimited free JS reloads via dev-client
- Well within free tier limits

**Without proper workflow (our first week):**
- 22 builds in 6 days
- 93% of monthly credits consumed
- Mostly unnecessary rebuilds for JS changes

### Quick Reference

```bash
# After EAS build is installed, ALWAYS use this first:
npx expo start --dev-client

# Only run EAS build when you see errors like:
# "Native module not found"
# "Config plugin changes detected"
# Or when you modified .swift/.kt files
```

### Checking Build Credit Usage

```bash
# View your EAS account and remaining credits
eas account:view

# View build history
eas build:list
```

---

## Security Considerations

### Never Commit

- **API keys** - Use environment variables
- **Secrets** - Use SecureStore or .env files
- **Large model files** - Already in .gitignore (`*.gguf`)

### Always Check

Before committing, scan for secrets:
```bash
grep -r "api.*key\|secret\|password\|token" src/ --include="*.ts" --include="*.tsx" -i
```

---

## Current Open Issues

Track active work on GitHub Issues:

- [#1](https://github.com/bennypaulino/discretezero-hush/issues/1) - **Achievement Gallery crashes** (High priority)
- [#2](https://github.com/bennypaulino/discretezero-hush/issues/2) - **Custom volume indicator** (Medium priority)
- [#3](https://github.com/bennypaulino/discretezero-hush/issues/3) - **Panic wipe reliability** (High priority)

When starting work on an issue:
```bash
git checkout develop
git pull origin develop
git checkout -b feature/3-fix-panic-wipe
```

---

## Working with Claude

### Starting a Session

1. Ensure you're on the correct branch (usually `develop`)
2. Reference the issue number you're working on
3. Share relevant context (logs, errors, reproduction steps)

### During Development

- **Be specific** - Provide exact file paths and line numbers
- **Share errors** - Include full error messages and stack traces
- **Test iteratively** - Test after each significant change
- **Commit frequently** - Small, focused commits are better

### Before Ending a Session

1. Commit all changes
2. Push to remote branch
3. Update issue with progress notes
4. Document any blockers or questions

---

## Key Technologies

- **React Native** - Mobile framework
- **Expo** - Development platform (EAS builds)
- **TypeScript** - Type-safe JavaScript
- **Zustand** - State management
- **llama.rn** - On-device AI inference
- **expo-secure-store** - Hardware-backed encryption
- **Native Modules** - Swift (iOS) and Kotlin (Android)

---

## Useful Commands

```bash
# Start development server
npx expo start

# Start with development build
npx expo start --dev-client

# Type check
npx tsc --noEmit --skipLibCheck

# Clean and rebuild
npx expo prebuild --clean

# Check git status
git status

# View commit history
git log --oneline -10

# View branches
git branch -vv

# Stash changes
git stash
git stash pop
```

---

## Resources

- **GitHub Repository:** https://github.com/bennypaulino/discretezero-hush
- **Expo Documentation:** https://docs.expo.dev/
- **React Native Docs:** https://reactnative.dev/
- **Zustand Docs:** https://docs.pmnd.rs/zustand/

---

## Notes

- **Main branch is protected** - All work happens on `develop` or feature branches
- **Test on real devices** - Some features (panic wipe, biometric) require physical devices
- **Debugging:** Use console logs with prefixes like `[ComponentName]` for easy filtering
- **Code style:** The project favors explicit over implicit, verbose over clever

---

*Last updated: 2026-02-11*
