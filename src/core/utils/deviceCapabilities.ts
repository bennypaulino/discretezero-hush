import * as Device from 'expo-device';
import * as FileSystem from 'expo-file-system';
import type { PerformanceMode, DeviceCapabilities } from '../state/rootStore';

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
 * Detect chip generation from iPhone model name
 * Returns: 'A14', 'A15', 'A16', 'A17', 'A18', etc.
 */
function detectChipGeneration(modelName: string): string {
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

  // Fallback
  return 'A14';
}

/**
 * Compare chip generations
 * Returns: -1 if a < b, 0 if equal, 1 if a > b
 */
function compareChips(a: string, b: string): number {
  const extractNumber = (chip: string) => parseInt(chip.replace('A', ''));
  const numA = extractNumber(a);
  const numB = extractNumber(b);
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
 */
export function getBalancedWarning(modelName: string): string | null {
  // Detect platform
  const isIOS = modelName.includes('iPhone');
  const isAndroid = !isIOS; // Assume Android if not iPhone

  if (isIOS) {
    // iOS device detection

    // Very old devices (iPhone 11 and older): Performance warning
    if (modelName.includes('iPhone 11') ||
        modelName.includes('iPhone X') ||
        modelName.includes('iPhone 8') ||
        modelName.includes('iPhone SE (2nd')) {
      return '⚠️ May be slower on your device';
    }

    // iPhone 12: Show recommendation for newer devices
    if (modelName.includes('iPhone 12')) {
      return 'Optimal on iPhone 13 or newer';
    }

    // iPhone 13+: No warning needed
    return null;
  }

  if (isAndroid) {
    // Android device detection

    // Very old devices: Performance warning
    if (modelName.includes('Pixel 5') ||
        modelName.includes('Pixel 4') ||
        modelName.includes('Galaxy S20') ||
        modelName.includes('Galaxy S10') ||
        modelName.includes('OnePlus 8')) {
      return '⚠️ May be slower on your device';
    }

    // Mid-range older devices: Show recommendation
    if (modelName.includes('Pixel 6') ||
        modelName.includes('Galaxy S21') ||
        modelName.includes('OnePlus 9')) {
      return 'Optimal on Pixel 7, Galaxy S22, or equivalent';
    }

    // Pixel 7+, Galaxy S22+: No warning needed
    return null;
  }

  return null;
}

/**
 * Get performance warning/recommendation for Quality mode
 * Returns platform-specific device recommendations or performance warnings
 */
export function getQualityWarning(modelName: string): string | null {
  // Detect platform
  const isIOS = modelName.includes('iPhone');
  const isAndroid = !isIOS; // Assume Android if not iPhone

  if (isIOS) {
    // iPhone 15 Pro: May overheat warning
    if (modelName.includes('iPhone 15 Pro')) {
      return 'May overheat during extended use. iPhone 16 Pro recommended.';
    }

    // iPhone 16 Pro+: Optimal
    return null;
  }

  if (isAndroid) {
    // Android flagship detection

    // 2023 flagships: Show recommendation for newer devices
    if (modelName.includes('Pixel 8') ||
        modelName.includes('Galaxy S23') ||
        modelName.includes('OnePlus 11')) {
      return 'Optimal on Pixel 9 Pro, Galaxy S24 Ultra, or equivalent';
    }

    // 2024+ flagships: No warning needed
    return null;
  }

  return null;
}
