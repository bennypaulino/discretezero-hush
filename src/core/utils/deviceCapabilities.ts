import * as Device from 'expo-device';
import * as FileSystem from 'expo-file-system';
import { Paths } from 'expo-file-system';
import type { PerformanceMode, DeviceCapabilities } from '../state/rootStore';

/**
 * Device Profile - Context Scaling Information
 *
 * Phase 2 of P1.11 Dynamic Context Budgets.
 * Determines how much of a model's recommended context to actually use
 * based on device capabilities (chip + RAM).
 */
export interface DeviceProfile {
  chipGeneration: number; // Numeric chip generation (13-18)
  ram: number; // RAM in GB
  thermalHeadroom: 'low' | 'medium' | 'high'; // Estimated thermal capability
  contextScalingFactor: number; // 0.5 - 1.0 (how much context to use)
}

/**
 * Detect device capabilities for performance mode recommendation
 *
 * Expo Go compatible - uses expo-device and expo-file-system
 * No native modules required
 */
export async function getDeviceCapabilities(): Promise<DeviceCapabilities> {
  // Get device info (Expo Go compatible)
  const modelName = Device.modelName || 'Unknown iPhone';
  const totalMemory = Device.totalMemory || 4 * 1024 * 1024 * 1024; // Default 4GB
  const memoryGB = totalMemory / (1024 * 1024 * 1024);

  // Parse chip generation from model name
  const chipGeneration = detectChipGeneration(modelName);

  // Determine support based on chip + RAM
  // Per spec: Balanced recommended for A15+ AND 6GB+
  const meetsBalancedRequirements =
    compareChips(chipGeneration, 'A15') >= 0 && memoryGB >= 6;

  // Per spec: Quality recommended for A17+ AND 8GB+
  const meetsQualityRequirements =
    compareChips(chipGeneration, 'A17') >= 0 && memoryGB >= 8;

  // Determine recommended mode (for UI messaging only, not blocking)
  let recommendedMode: PerformanceMode;
  if (meetsQualityRequirements) {
    recommendedMode = 'quality';
  } else if (meetsBalancedRequirements) {
    recommendedMode = 'balanced';
  } else {
    recommendedMode = 'efficient';
  }

  return {
    modelName,
    chipGeneration,
    totalMemoryGB: memoryGB,
    recommendedMode,
    canUpgradeToBalanced: meetsBalancedRequirements,
  };
}

/**
 * Detect chip generation from device model name (iOS and Android)
 *
 * Returns unified chip identifier that maps to performance tier:
 * - iOS: 'A13', 'A14', 'A15', 'A16', 'A17', 'A18'
 * - Android: 'SD865', 'SD888', 'SD8G1', 'SD8G2', 'SD8G3', 'T1', 'T2', 'T3', 'T4', 'D9000', etc.
 *
 * These are then converted to numeric performance tiers by extractChipNumber().
 */
function detectChipGeneration(modelName: string): string {
  // === iOS DETECTION ===
  if (modelName.includes('iPhone')) {
    // iPhone 16 series: A18
    if (modelName.includes('iPhone 16')) return 'A18';

    // iPhone 15 Pro: A17
    if (modelName.includes('iPhone 15 Pro')) return 'A17';

    // iPhone 15: A16
    if (modelName.includes('iPhone 15')) return 'A16';

    // iPhone 14 Pro: A16
    if (modelName.includes('iPhone 14 Pro')) return 'A16';

    // iPhone 14: A15
    if (modelName.includes('iPhone 14')) return 'A15';

    // iPhone 13: A15
    if (modelName.includes('iPhone 13')) return 'A15';

    // iPhone 12: A14
    if (modelName.includes('iPhone 12')) return 'A14';

    // iPhone 11: A13
    if (modelName.includes('iPhone 11')) return 'A13';

    // Fallback for unknown iPhones
    return 'A14';
  }

  // === ANDROID DETECTION ===
  // Google Pixel devices (Tensor chips)
  if (modelName.includes('Pixel 9')) return 'T4';  // Tensor G4 (2024) - equivalent to A18
  if (modelName.includes('Pixel 8')) return 'T3';  // Tensor G3 (2023) - equivalent to A17
  if (modelName.includes('Pixel 7')) return 'T2';  // Tensor G2 (2022) - equivalent to A16
  if (modelName.includes('Pixel 6')) return 'T1';  // Tensor G1 (2021) - equivalent to A15

  // Samsung Galaxy S series (Snapdragon in US, Exynos elsewhere)
  if (modelName.includes('Galaxy S24')) return 'SD8G3'; // Snapdragon 8 Gen 3 (2024) - equivalent to A18
  if (modelName.includes('Galaxy S23')) return 'SD8G2'; // Snapdragon 8 Gen 2 (2023) - equivalent to A17
  if (modelName.includes('Galaxy S22')) return 'SD8G1'; // Snapdragon 8 Gen 1 (2022) - equivalent to A16
  if (modelName.includes('Galaxy S21')) return 'SD888'; // Snapdragon 888 (2021) - equivalent to A15
  if (modelName.includes('Galaxy S20')) return 'SD865'; // Snapdragon 865 (2020) - equivalent to A14

  // OnePlus devices
  if (modelName.includes('OnePlus 12')) return 'SD8G3'; // 2024 - equivalent to A18
  if (modelName.includes('OnePlus 11')) return 'SD8G2'; // 2023 - equivalent to A17
  if (modelName.includes('OnePlus 10')) return 'SD8G1'; // 2022 - equivalent to A16
  if (modelName.includes('OnePlus 9')) return 'SD888';  // 2021 - equivalent to A15
  if (modelName.includes('OnePlus 8')) return 'SD865';  // 2020 - equivalent to A14

  // Generic Snapdragon detection (fallback for other brands)
  if (modelName.includes('SM8650') || modelName.includes('8 Gen 3')) return 'SD8G3'; // A18 equivalent
  if (modelName.includes('SM8550') || modelName.includes('8 Gen 2')) return 'SD8G2'; // A17 equivalent
  if (modelName.includes('SM8450') || modelName.includes('8 Gen 1')) return 'SD8G1'; // A16 equivalent
  if (modelName.includes('SM8350') || modelName.includes('888')) return 'SD888';     // A15 equivalent
  if (modelName.includes('SM8250') || modelName.includes('865')) return 'SD865';     // A14 equivalent

  // MediaTek Dimensity (high-end Android chips)
  if (modelName.includes('Dimensity 9300')) return 'D9300'; // 2024 - equivalent to A18
  if (modelName.includes('Dimensity 9200')) return 'D9200'; // 2023 - equivalent to A17
  if (modelName.includes('Dimensity 9000')) return 'D9000'; // 2022 - equivalent to A16

  // Fallback for unknown Android devices (assume mid-tier)
  return 'SD865'; // Equivalent to A14 (safe default)
}

/**
 * Compare chip generations (iOS and Android)
 *
 * Uses unified performance tiers to compare chips across platforms.
 *
 * @returns -1 if a < b, 0 if equal, 1 if a > b
 *
 * @example
 * compareChips('A17', 'A15') // returns 2 (A17 is 2 tiers higher)
 * compareChips('SD8G2', 'A15') // returns 2 (SD8G2 ~ A17, which is 2 tiers higher than A15)
 * compareChips('T3', 'SD8G1') // returns 1 (T3 ~ A17, SD8G1 ~ A16)
 */
function compareChips(a: string, b: string): number {
  const numA = extractChipNumber(a);
  const numB = extractChipNumber(b);
  return numA - numB;
}

/**
 * Check if device has enough storage for a mode
 * Per spec: Requires 5% remaining after download
 */
export async function hasStorageForMode(mode: PerformanceMode): Promise<boolean> {
  const sizes: Record<PerformanceMode, number> = {
    efficient: 1.7,  // Gemma 2B
    balanced: 2,     // Llama 3.2 3B
    quality: 6,      // Llama 3.1 8B
  };

  const sizeGB = sizes[mode];
  const sizeBytes = sizeGB * 1024 * 1024 * 1024;

  try {
    const available = await FileSystem.getFreeDiskStorageAsync();
    const total = await FileSystem.getTotalDiskCapacityAsync();

    const remainingAfter = available - sizeBytes;
    const percentRemaining = (remainingAfter / total) * 100;

    return percentRemaining >= 5;
  } catch (e) {
    if (__DEV__) {
      console.error('Storage check failed:', e);
    }
    return false;
  }
}

/**
 * Calculate total storage used by downloaded AI models
 *
 * Sums up the file sizes of all .gguf model files that have been downloaded.
 *
 * @returns Total bytes used by downloaded models
 *
 * @example
 * const totalBytes = await getModelStorageUsed();
 * const formatted = formatBytes(totalBytes); // "3.6 GB"
 */
export async function getModelStorageUsed(): Promise<number> {
  const modelFiles = [
    'gemma-2-2b-it-Q4_K_M.gguf',
    'Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    'Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf',
  ];

  let totalBytes = 0;
  for (const fileName of modelFiles) {
    const modelPath = `${Paths.document.uri}models/${fileName}`;

    try {
      const fileInfo = await FileSystem.getInfoAsync(modelPath);
      if (fileInfo.exists && 'size' in fileInfo && fileInfo.size) {
        totalBytes += fileInfo.size;
      }
    } catch (e) {
      // File doesn't exist or can't be accessed, skip it
      if (__DEV__) {
        console.log(`Model file not found: ${fileName}`);
      }
    }
  }

  return totalBytes;
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(1)} GB`;
}

/**
 * Format percentage to string
 */
export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

/**
 * Determine if user should be offered Balanced toast
 * Only iPhone 13+ (A15 chip, 6GB RAM) get proactive toast
 * iPhone 11/12 can access in Settings but no proactive offer
 */
export async function shouldOfferBalanced(): Promise<boolean> {
  const capabilities = await getDeviceCapabilities();

  // Offer Balanced toast to iPhone 13+ (A15 chip, 6GB RAM)
  return compareChips(capabilities.chipGeneration, 'A15') >= 0 &&
         capabilities.totalMemoryGB >= 6;
}

/**
 * Determine if Pro user should be offered both Balanced + Quality in toast
 * iPhone 16+ Pro users see both options
 */
export async function shouldOfferBothModels(subscriptionTier: string): Promise<boolean> {
  const capabilities = await getDeviceCapabilities();
  const isProUser = subscriptionTier !== 'FREE';
  const isIPhone16Plus = capabilities.modelName.includes('iPhone 16') ||
                         capabilities.modelName.includes('iPhone 17');

  return isProUser && isIPhone16Plus;
}

/**
 * Determine if Pro user can download Quality mode
 * BLOCKED for iPhone 14 Pro and earlier
 * Allowed for iPhone 15 Pro+ with Pro subscription
 */
export async function canDownloadQuality(subscriptionTier: string): Promise<boolean> {
  const capabilities = await getDeviceCapabilities();
  const isProUser = subscriptionTier !== 'FREE';

  // Requires iPhone 15 Pro+ (A17 chip, 8GB RAM)
  const meetsHardwareReqs = compareChips(capabilities.chipGeneration, 'A17') >= 0 &&
                            capabilities.totalMemoryGB >= 8;

  return isProUser && meetsHardwareReqs;
}

/**
 * Get performance warning/recommendation for Balanced mode
 * Returns platform-specific device recommendations or performance warnings
 *
 * Balanced mode (Llama 3.2 3B, 2GB model) runs well on:
 * - iOS: iPhone 13+ (A15 chip, 6GB+ RAM)
 * - Android: Pixel 7+, Galaxy S22+, OnePlus 10+ (SD8G1/T2/equivalent, 8GB+ RAM)
 */
export function getBalancedWarning(modelName: string): string | null {
  // Detect chip generation for platform-agnostic comparison
  const chipGen = detectChipGeneration(modelName);
  const chipTier = extractChipNumber(chipGen);

  // Very old devices (tier 13 and below): Performance warning
  // iOS: iPhone 11 and older (A13 and below)
  // Android: Snapdragon 865 and older
  if (chipTier <= 13) {
    return '⚠️ May be slower on your device';
  }

  // Old devices (tier 14): Show recommendation for newer devices
  // iOS: iPhone 12 (A14)
  // Android: Pixel 5, Galaxy S20, OnePlus 8 (SD865)
  if (chipTier === 14) {
    const isIOS = modelName.includes('iPhone');
    if (isIOS) {
      return 'Optimal on iPhone 13 or newer';
    } else {
      return 'Optimal on Pixel 7, Galaxy S22, or equivalent';
    }
  }

  // Modern devices (tier 15+): No warning needed
  // iOS: iPhone 13+ (A15+)
  // Android: Pixel 6+, Galaxy S21+, OnePlus 9+ (SD888/T1+)
  return null;
}

/**
 * Get performance warning/recommendation for Quality mode
 * Returns platform-specific device recommendations or performance warnings
 *
 * Quality mode (Llama 3.1 8B, 4.9GB model) requires high-end hardware:
 * - iOS: iPhone 15 Pro+ (A17+ chip, 8GB+ RAM)
 * - Android: Pixel 8 Pro+, Galaxy S23 Ultra+, OnePlus 11+ (SD8G2/T3+, 12GB+ RAM)
 */
export function getQualityWarning(modelName: string): string | null {
  // Detect chip generation for platform-agnostic comparison
  const chipGen = detectChipGeneration(modelName);
  const chipTier = extractChipNumber(chipGen);
  const isIOS = modelName.includes('iPhone');

  // Minimum tier for Quality mode: 17 (A17, SD8G2, T3)
  // First-gen support (tier 17): May overheat warning
  // iOS: iPhone 15 Pro (A17)
  // Android: Pixel 8 Pro, Galaxy S23 Ultra, OnePlus 11 (SD8G2, T3)
  if (chipTier === 17) {
    if (isIOS) {
      return 'May overheat during extended use. iPhone 16 Pro recommended.';
    } else {
      return 'Optimal on Pixel 9 Pro, Galaxy S24 Ultra, or equivalent';
    }
  }

  // Latest devices (tier 18+): Optimal, no warning
  // iOS: iPhone 16 Pro+ (A18+)
  // Android: Pixel 9 Pro, Galaxy S24 Ultra, OnePlus 12 (SD8G3, T4)
  if (chipTier >= 18) {
    return null;
  }

  // Below minimum tier: Shouldn't reach here (blocked earlier by hardware checks)
  return null;
}

/**
 * Extract numeric performance tier from chip string (iOS and Android)
 *
 * Maps both iOS and Android chips to unified performance tiers (13-18).
 * This allows platform-agnostic performance scaling.
 *
 * @param chipString - Chip string (e.g., 'A14', 'SD8G2', 'T3', 'D9200')
 * @returns Numeric performance tier (13-18)
 *
 * @example
 * // iOS
 * extractChipNumber('A14') // returns 14
 * extractChipNumber('A17 Pro') // returns 17
 *
 * // Android
 * extractChipNumber('SD8G2') // returns 17 (Snapdragon 8 Gen 2 ~ A17)
 * extractChipNumber('T3') // returns 17 (Tensor G3 ~ A17)
 * extractChipNumber('D9200') // returns 17 (Dimensity 9200 ~ A17)
 */
export function extractChipNumber(chipString: string): number {
  // iOS: Extract from A-series (A13, A14, A15, etc.)
  const appleMatch = chipString.match(/A(\d+)/);
  if (appleMatch) {
    return parseInt(appleMatch[1], 10);
  }

  // Android: Map to equivalent iOS tiers
  // Performance tier mapping based on release year and benchmark parity

  // 2024 flagships → tier 18 (A18 equivalent)
  if (chipString === 'SD8G3') return 18;  // Snapdragon 8 Gen 3
  if (chipString === 'T4') return 18;     // Tensor G4
  if (chipString === 'D9300') return 18;  // Dimensity 9300

  // 2023 flagships → tier 17 (A17 equivalent)
  if (chipString === 'SD8G2') return 17;  // Snapdragon 8 Gen 2
  if (chipString === 'T3') return 17;     // Tensor G3
  if (chipString === 'D9200') return 17;  // Dimensity 9200

  // 2022 flagships → tier 16 (A16 equivalent)
  if (chipString === 'SD8G1') return 16;  // Snapdragon 8 Gen 1
  if (chipString === 'T2') return 16;     // Tensor G2
  if (chipString === 'D9000') return 16;  // Dimensity 9000

  // 2021 flagships → tier 15 (A15 equivalent)
  if (chipString === 'SD888') return 15;  // Snapdragon 888
  if (chipString === 'T1') return 15;     // Tensor G1

  // 2020 flagships → tier 14 (A14 equivalent)
  if (chipString === 'SD865') return 14;  // Snapdragon 865

  // Fallback to tier 14 (safe default for unknown chips)
  return 14;
}

/**
 * Get device profile with context scaling factor
 *
 * Phase 2 of P1.11 Dynamic Context Budgets.
 * Determines how much of a model's recommended context to actually use.
 *
 * Conservative scaling for lower-tier devices (per user requirement):
 * - A13-A14 + <6GB RAM: 50% scaling (thermal/memory constraints)
 * - A15-A16 + <8GB RAM: 75% scaling (moderate capability)
 * - A17+ + 8GB+ RAM: 100% scaling (full capability)
 *
 * @param chipString - Chip generation string (e.g., 'A14', 'A17 Pro')
 * @param ram - RAM in GB
 * @returns Device profile with scaling factor
 *
 * @example
 * // iPhone 12 (A14, 4GB)
 * getDeviceProfile('A14', 4) // { chipGeneration: 14, ram: 4, thermalHeadroom: 'low', contextScalingFactor: 0.5 }
 *
 * // iPhone 15 Pro (A17 Pro, 8GB)
 * getDeviceProfile('A17 Pro', 8) // { chipGeneration: 17, ram: 8, thermalHeadroom: 'high', contextScalingFactor: 1.0 }
 */
export function getDeviceProfile(chipString: string, ram: number): DeviceProfile {
  const chipGeneration = extractChipNumber(chipString);

  // Conservative scaling for lower-tier devices
  if (chipGeneration <= 14 && ram < 6) {
    // A13-A14, <6GB: Older devices, conservative (iPhone 11, 12, 13 base)
    return {
      chipGeneration,
      ram,
      thermalHeadroom: 'low',
      contextScalingFactor: 0.5, // Use 50% of recommended context
    };
  } else if (chipGeneration <= 16 && ram < 8) {
    // A15-A16, <8GB: Mid-range (iPhone 13 Pro, 14, 14 Pro, 15 base)
    return {
      chipGeneration,
      ram,
      thermalHeadroom: 'medium',
      contextScalingFactor: 0.75, // Use 75% of recommended context
    };
  } else {
    // A17+, 8GB+: High-end (iPhone 15 Pro, 15 Pro Max, 16 series)
    return {
      chipGeneration,
      ram,
      thermalHeadroom: 'high',
      contextScalingFactor: 1.0, // Use full recommended context
    };
  }
}

/**
 * Get context scaling factor for a device
 *
 * Convenience function that extracts just the scaling factor.
 *
 * @param chipString - Chip generation string
 * @param ram - RAM in GB
 * @returns Scaling factor (0.5, 0.75, or 1.0)
 */
export function getContextScalingFactor(chipString: string, ram: number): number {
  return getDeviceProfile(chipString, ram).contextScalingFactor;
}
