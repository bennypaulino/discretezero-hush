import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
  LOG_LEVEL,
  PACKAGE_TYPE,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import { useChatStore } from '../state/rootStore';

// ============================================================================
// Module State (Singleton Pattern)
// ============================================================================

let hasInitialized = false;
let initializationPromise: Promise<void> | null = null;
let currentUserId: string | null = null;

// ============================================================================
// Constants
// ============================================================================

// TEMPORARY: Hardcoded test key for development (TODO: Fix env var loading)
const REVENUECAT_IOS_KEY = 'test_VRDsgfUfaiRQRLgBfubmRguySlu';
const REVENUECAT_ANDROID_KEY = 'test_VRDsgfUfaiRQRLgBfubmRguySlu';
// NOTE: Test Store uses 'DiscreteZero', production will use 'pro'
const ENTITLEMENT_ID = 'DiscreteZero';

// Note: Using hardcoded test keys - env vars from eas.json not loading correctly
if (__DEV__) {
  console.log('[Purchases] Using hardcoded test API keys');
}

// Product identifiers
// NOTE: Test Store uses simple IDs ('monthly', 'yearly')
// Production will use: 'discretezero_hush_pro_monthly', 'discretezero_hush_pro_annual'
const PRODUCT_IDS = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
} as const;

// ============================================================================
// Initialization (Fire-and-Forget with Guard)
// ============================================================================

/**
 * Initialize RevenueCat SDK
 * Fire-and-forget pattern: Call from App.tsx, doesn't block startup
 * Purchase functions wait for completion automatically
 */
export function initializePurchases(): Promise<void> {
  // Return existing promise if already initializing
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    if (hasInitialized) return;

    try {
      // Configure SDK
      if (__DEV__) {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      }

      // Initialize with platform-specific API key
      const apiKey = Platform.OS === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;

      if (!apiKey) {
        throw new Error('RevenueCat API key not configured');
      }

      await Purchases.configure({ apiKey });
      hasInitialized = true;

      if (__DEV__) {
        console.log('[Purchases] SDK initialized successfully');
      }

      // Sync subscription state immediately
      await checkEntitlementStatus();

      // Listen for subscription changes (cross-device sync)
      Purchases.addCustomerInfoUpdateListener((customerInfo) => {
        if (__DEV__) {
          console.log('[Purchases] Customer info updated:', customerInfo);
        }
        updateSubscriptionFromEntitlements(customerInfo);
      });

    } catch (error) {
      if (__DEV__) {
        console.error('[Purchases] Initialization failed:', error);
      }
      // Non-blocking - app continues in FREE mode (graceful degradation)
    }
  })();

  return initializationPromise;
}

/**
 * Wait for initialization to complete
 * Used internally by purchase functions
 */
async function ensureInitialized(): Promise<void> {
  if (hasInitialized) return;

  if (initializationPromise) {
    await initializationPromise;
  } else {
    await initializePurchases();
  }
}

// ============================================================================
// LOW-LEVEL API (RevenueCat Primitives)
// ============================================================================

/**
 * Get customer info (for debugging, display, and user ID)
 * Low-level access to RevenueCat customer data
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  await ensureInitialized();

  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    if (__DEV__) {
      console.error('[Purchases] Failed to get customer info:', error);
    }
    return null;
  }
}

/**
 * Get current offering (respects dashboard "Current" setting)
 * Returns packages for all subscription tiers
 */
export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  await ensureInitialized();

  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error) {
    if (__DEV__) {
      console.error('[Purchases] Failed to get offering:', error);
    }
    return null;
  }
}

/**
 * Get all available offerings
 * Useful for A/B testing different paywall configurations
 */
export async function getAllOfferings(): Promise<Record<string, PurchasesOffering>> {
  await ensureInitialized();

  try {
    const offerings = await Purchases.getOfferings();
    return offerings.all;
  } catch (error) {
    if (__DEV__) {
      console.error('[Purchases] Failed to get offerings:', error);
    }
    return {};
  }
}

/**
 * Purchase a specific package
 * Low-level purchase function - UI should use purchaseByTier() instead
 */
export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }> {
  await ensureInitialized();

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);

    // Update state immediately
    updateSubscriptionFromEntitlements(customerInfo);

    const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

    if (__DEV__) {
      console.log('[Purchases] Package purchased:', pkg.identifier);
    }

    return { success: isPro, customerInfo };
  } catch (error: any) {
    // Handle user cancellation gracefully
    if (error.userCancelled) {
      if (__DEV__) {
        console.log('[Purchases] User cancelled purchase');
      }
      return { success: false, error: 'Purchase cancelled' };
    }

    if (__DEV__) {
      console.error('[Purchases] Purchase failed:', error);
    }

    return {
      success: false,
      error: error.message || 'Purchase failed. Please try again.',
    };
  }
}

// ============================================================================
// HIGH-LEVEL API (Domain-Specific Convenience)
// ============================================================================

/**
 * Check if user has Pro access
 * Convenience function for feature gating
 */
export async function checkProStatus(): Promise<boolean> {
  const customerInfo = await getCustomerInfo();
  if (!customerInfo) return false;

  return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
}

/**
 * Check current entitlement status and update Zustand state
 * Called on app startup and after purchases/restores
 */
export async function checkEntitlementStatus(): Promise<void> {
  await ensureInitialized();

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    updateSubscriptionFromEntitlements(customerInfo);

    // Store RevenueCat user ID for web linking
    currentUserId = customerInfo.originalAppUserId;
    useChatStore.getState().setRevenueCatUserId(currentUserId);

    if (__DEV__) {
      console.log('[Purchases] Entitlement check complete:', {
        userId: currentUserId,
        hasProEntitlement: customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined,
      });
    }
  } catch (error) {
    if (__DEV__) {
      console.error('[Purchases] Failed to check entitlements:', error);
    }
  }
}

/**
 * Update Zustand subscription state from RevenueCat customer info
 * Maps RevenueCat entitlements to app subscription tiers
 * @param customerInfo - RevenueCat customer info object
 */
function updateSubscriptionFromEntitlements(customerInfo: CustomerInfo): void {
  const proEntitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];

  if (!proEntitlement) {
    // No active Pro entitlement - set to FREE
    useChatStore.getState().setSubscription('FREE');
    if (__DEV__) {
      console.log('[Purchases] No active Pro entitlement - user is FREE');
    }
    return;
  }

  // Has Pro entitlement - determine tier from product identifier
  const productId = proEntitlement.productIdentifier;

  let tier: 'MONTHLY' | 'YEARLY' = 'MONTHLY'; // default

  if (productId === PRODUCT_IDS.YEARLY) {
    tier = 'YEARLY';
  } else if (productId === PRODUCT_IDS.MONTHLY) {
    tier = 'MONTHLY';
  } else {
    // Unknown product (shouldn't happen) - default to MONTHLY
    if (__DEV__) {
      console.warn('[Purchases] Unknown product identifier:', productId);
    }
    tier = 'MONTHLY';
  }

  useChatStore.getState().setSubscription(tier);

  if (__DEV__) {
    console.log('[Purchases] Active Pro entitlement detected:', {
      productId,
      tier,
      expirationDate: proEntitlement.expirationDate,
    });
  }
}

/**
 * Purchase a subscription by tier
 * High-level convenience function for UI
 * Replaces mock purchase in PaywallModal.tsx
 *
 * @param tier - Subscription tier to purchase
 * @returns Success status and optional error message
 */
export async function purchaseByTier(
  tier: 'MONTHLY' | 'YEARLY'
): Promise<{ success: boolean; error?: string }> {
  await ensureInitialized();

  try {
    // Get available offerings
    const offerings = await Purchases.getOfferings();
    const currentOffering = offerings.current;

    if (!currentOffering) {
      return { success: false, error: 'No subscription plans available' };
    }

    // Find the package for the requested tier
    const productId = tier === 'MONTHLY' ? PRODUCT_IDS.MONTHLY : PRODUCT_IDS.YEARLY;
    const selectedPackage = currentOffering.availablePackages.find(
      (pkg) => pkg.product.identifier === productId
    );

    if (!selectedPackage) {
      return { success: false, error: `${tier} plan not found` };
    }

    if (__DEV__) {
      console.log('[Purchases] Initiating purchase:', {
        tier,
        productId,
        price: selectedPackage.product.priceString,
      });
    }

    // Use low-level purchase function
    const result = await purchasePackage(selectedPackage);

    return {
      success: result.success,
      error: result.error,
    };

  } catch (error: any) {
    if (__DEV__) {
      console.error('[Purchases] Purchase by tier failed:', error);
    }

    return {
      success: false,
      error: error.message || 'Purchase failed. Please try again.',
    };
  }
}

/**
 * Restore previous purchases
 * Called from PaywallModal "Restore Purchases" button
 *
 * @returns Success status and optional error message
 */
export async function restorePurchases(): Promise<{ success: boolean; error?: string }> {
  await ensureInitialized();

  try {
    if (__DEV__) {
      console.log('[Purchases] Restoring purchases...');
    }

    const customerInfo = await Purchases.restorePurchases();
    updateSubscriptionFromEntitlements(customerInfo);

    // Check if any entitlements were restored
    const hasProEntitlement = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

    if (__DEV__) {
      console.log('[Purchases] Restore complete:', {
        hasProEntitlement,
        activeEntitlements: Object.keys(customerInfo.entitlements.active),
      });
    }

    if (hasProEntitlement) {
      return { success: true };
    } else {
      return { success: false, error: 'No previous purchases found' };
    }

  } catch (error: any) {
    if (__DEV__) {
      console.error('[Purchases] Restore failed:', error);
    }

    return {
      success: false,
      error: error.message || 'Failed to restore purchases. Please try again.',
    };
  }
}

/**
 * Get RevenueCat anonymous user ID
 * Used for linking web purchases via Stripe
 *
 * @returns RevenueCat user ID or null if not initialized
 */
export async function getRevenueCatUserId(): Promise<string | null> {
  await ensureInitialized();

  try {
    if (currentUserId) {
      return currentUserId;
    }

    // Fetch from SDK if not cached
    const customerInfo = await Purchases.getCustomerInfo();
    currentUserId = customerInfo.originalAppUserId;
    return currentUserId;

  } catch (error) {
    if (__DEV__) {
      console.error('[Purchases] Failed to get user ID:', error);
    }
    return null;
  }
}

// ============================================================================
// UI HELPER FUNCTIONS (Formatting & Display)
// ============================================================================

/**
 * Get formatted price string from package
 * @param pkg - RevenueCat package
 * @returns Formatted price (e.g., "$4.99")
 */
export function getPackagePrice(pkg: PurchasesPackage): string {
  return pkg.product.priceString;
}

/**
 * Get billing period label
 * @param pkg - RevenueCat package
 * @returns Period string (e.g., "/month", "/year", " once")
 */
export function getPackagePeriod(pkg: PurchasesPackage): string {
  switch (pkg.packageType) {
    case PACKAGE_TYPE.MONTHLY:
      return '/month';
    case PACKAGE_TYPE.ANNUAL:
      return '/year';
    case PACKAGE_TYPE.LIFETIME:
      return ' once';
    default:
      return '';
  }
}

/**
 * Get package display label
 * @param pkg - RevenueCat package
 * @returns Label (e.g., "Monthly", "Annual")
 */
export function getPackageLabel(pkg: PurchasesPackage): string {
  switch (pkg.packageType) {
    case PACKAGE_TYPE.MONTHLY:
      return 'Monthly';
    case PACKAGE_TYPE.ANNUAL:
      return 'Annual';
    case PACKAGE_TYPE.LIFETIME:
      return 'Lifetime';
    default:
      return pkg.identifier;
  }
}

/**
 * Calculate monthly equivalent for annual package
 * @param pkg - RevenueCat package (must be annual)
 * @returns Monthly equivalent price string or null
 */
export function getMonthlyEquivalent(pkg: PurchasesPackage): string | null {
  if (pkg.packageType === PACKAGE_TYPE.ANNUAL) {
    const monthlyPrice = pkg.product.price / 12;
    return `$${monthlyPrice.toFixed(2)}/mo`;
  }
  return null;
}

/**
 * Calculate savings percentage for annual vs monthly
 * @param monthlyPkg - Monthly package
 * @param annualPkg - Annual package
 * @returns Savings percentage (e.g., 33 for 33% savings) or null
 */
export function getSavingsPercentage(
  monthlyPkg: PurchasesPackage | undefined,
  annualPkg: PurchasesPackage | undefined
): number | null {
  if (!monthlyPkg || !annualPkg) return null;

  const yearlyAtMonthly = monthlyPkg.product.price * 12;
  const actualYearly = annualPkg.product.price;
  const savings = ((yearlyAtMonthly - actualYearly) / yearlyAtMonthly) * 100;

  return Math.round(savings);
}
