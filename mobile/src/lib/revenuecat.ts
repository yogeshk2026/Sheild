// RevenueCat Integration for Courial Shield
import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PurchasesOffering,
  PurchasesPackage,
  CustomerInfo,
} from 'react-native-purchases';
import type { AppPlanTier, PaidPlanTier } from './plan-config';

// RevenueCat API Keys - These should be set in your RevenueCat dashboard
const REVENUECAT_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '';
const REVENUECAT_ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '';

// Entitlement identifier from RevenueCat dashboard
export const ENTITLEMENT_ID = 'premium';

// Product identifiers matching RevenueCat products
export const PRODUCT_IDS = {
  basic: 'courial_basic_monthly',
  pro: 'courial_pro_monthly',
  professional: 'courial_professional_monthly',
} as const;

let isConfigured = false;
let lastInitError: string | null = null;
let lastInitReason: RevenueCatInitReason = 'not_initialized';
let initPromise: Promise<RevenueCatInitResult> | null = null;

export type RevenueCatInitReason =
  | 'ok'
  | 'missing_ios_key'
  | 'missing_android_key'
  | 'web_unsupported'
  | 'configure_failed'
  | 'not_initialized';

export interface RevenueCatInitResult {
  ok: boolean;
  reason: RevenueCatInitReason;
  message: string;
}

const getInitMessage = (reason: RevenueCatInitReason, fallback?: string): string => {
  if (fallback) return fallback;
  switch (reason) {
    case 'missing_ios_key':
      return 'RevenueCat iOS API key is missing. Set EXPO_PUBLIC_REVENUECAT_IOS_KEY and rebuild the app.';
    case 'missing_android_key':
      return 'RevenueCat Android API key is missing. Set EXPO_PUBLIC_REVENUECAT_ANDROID_KEY and rebuild the app.';
    case 'web_unsupported':
      return 'Purchases available on mobile only.';
    case 'configure_failed':
      return 'Failed to initialize in-app purchases.';
    case 'not_initialized':
      return 'Payments are not initialized yet.';
    default:
      return '';
  }
};

/**
 * Initialize RevenueCat SDK
 * Call this early in your app lifecycle
 */
export async function initRevenueCat(): Promise<RevenueCatInitResult> {
  if (isConfigured) {
    return { ok: true, reason: 'ok', message: '' };
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    if (Platform.OS === 'web') {
      const message = getInitMessage('web_unsupported');
      lastInitReason = 'web_unsupported';
      lastInitError = message;
      return { ok: false, reason: 'web_unsupported', message };
    }

    const apiKey = Platform.OS === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;
    const missingReason: RevenueCatInitReason =
      Platform.OS === 'ios' ? 'missing_ios_key' : 'missing_android_key';

    if (!apiKey) {
      const message = getInitMessage(missingReason);
      lastInitReason = missingReason;
      lastInitError = message;
      console.warn(`[RevenueCat] ${message}`);
      return { ok: false, reason: missingReason, message };
    }

    try {
      if (__DEV__) {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        console.log(
          `[RevenueCat] Initializing on ${Platform.OS}. Key present: ${Boolean(apiKey)}`
        );
      }

      await Purchases.configure({ apiKey });
      isConfigured = true;
      lastInitReason = 'ok';
      lastInitError = null;
      console.log('[RevenueCat] Initialized successfully');
      return { ok: true, reason: 'ok', message: '' };
    } catch (error) {
      const message =
        error instanceof Error
          ? getInitMessage('configure_failed', error.message)
          : getInitMessage('configure_failed');
      lastInitReason = 'configure_failed';
      lastInitError = message;
      console.error('[RevenueCat] Failed to initialize:', error);
      return { ok: false, reason: 'configure_failed', message };
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

export async function initializeRevenueCat(): Promise<RevenueCatInitResult> {
  return initRevenueCat();
}

export function isRevenueCatConfigured(): boolean {
  return isConfigured;
}

export function getRevenueCatInitError(): string | null {
  return lastInitError;
}

export function getRevenueCatInitStatus(): RevenueCatInitResult {
  if (isConfigured) {
    return { ok: true, reason: 'ok', message: '' };
  }
  return {
    ok: false,
    reason: lastInitReason,
    message: getInitMessage(lastInitReason, lastInitError || undefined),
  };
}

/**
 * Get available subscription offerings
 */
export async function getOfferings(): Promise<PurchasesOffering | null> {
  if (!isConfigured) {
    console.warn('RevenueCat not configured. Skipping getOfferings.');
    return null;
  }
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error) {
    console.error('Failed to get offerings:', error);
    return null;
  }
}

/**
 * Get all available packages from offerings
 */
export async function getPackages(): Promise<PurchasesPackage[]> {
  if (!isConfigured) {
    console.warn('RevenueCat not configured. Skipping getPackages.');
    return [];
  }
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages || [];
  } catch (error) {
    console.error('Failed to get packages:', error);
    return [];
  }
}

/**
 * Purchase a subscription package
 */
export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }> {
  if (!isConfigured) {
    console.warn('RevenueCat not configured. Skipping purchase.');
    return { success: false, error: 'Payments not configured' };
  }
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { success: true, customerInfo };
  } catch (error: any) {
    if (error.userCancelled) {
      return { success: false, error: 'Purchase cancelled' };
    }
    console.error('Purchase failed:', error);
    return { success: false, error: error.message || 'Purchase failed' };
  }
}

/**
 * Get current customer info including active subscriptions
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!isConfigured) {
    console.warn('RevenueCat not configured. Skipping getCustomerInfo.');
    return null;
  }
  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    console.error('Failed to get customer info:', error);
    return null;
  }
}

/**
 * Check if user has active premium subscription
 */
export async function checkPremiumAccess(): Promise<boolean> {
  if (!isConfigured) {
    console.warn('RevenueCat not configured. Skipping checkPremiumAccess.');
    return false;
  }
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
  } catch (error) {
    console.error('Failed to check premium access:', error);
    return false;
  }
}

/**
 * Restore previous purchases
 */
export async function restorePurchases(): Promise<{
  success: boolean;
  customerInfo?: CustomerInfo;
  error?: string;
}> {
  if (!isConfigured) {
    console.warn('RevenueCat not configured. Skipping restorePurchases.');
    return { success: false, error: 'Payments not configured' };
  }
  try {
    const customerInfo = await Purchases.restorePurchases();
    return { success: true, customerInfo };
  } catch (error: any) {
    console.error('Failed to restore purchases:', error);
    return { success: false, error: error.message || 'Restore failed' };
  }
}

/**
 * Identify user with RevenueCat (call after login)
 */
export async function identifyUser(userId: string): Promise<void> {
  if (!isConfigured) {
    console.warn('RevenueCat not configured. Skipping identifyUser.');
    return;
  }
  try {
    await Purchases.logIn(userId);
    console.log('User identified with RevenueCat:', userId);
  } catch (error) {
    console.error('Failed to identify user:', error);
  }
}

/**
 * Log out user from RevenueCat
 */
export async function logoutUser(): Promise<void> {
  if (!isConfigured) {
    console.warn('RevenueCat not configured. Skipping logoutUser.');
    return;
  }
  try {
    await Purchases.logOut();
    console.log('User logged out from RevenueCat');
  } catch (error) {
    console.error('Failed to logout user:', error);
  }
}

/**
 * Get the active subscription plan tier from customer info
 */
export function getActivePlanFromCustomerInfo(
  customerInfo: CustomerInfo
): PaidPlanTier | null {
  const activeEntitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];

  if (!activeEntitlement) return null;

  const productId = activeEntitlement.productIdentifier.toLowerCase();

  if (productId.includes('basic')) return 'basic';
  if (productId.includes('professional')) return 'professional';
  if (productId.includes('pro')) return 'pro';

  return null;
}

export interface RevenueCatSubscriptionState {
  hasActiveSubscription: boolean;
  currentPlan: AppPlanTier;
  paidPlan: PaidPlanTier | null;
}

export function getSubscriptionStateFromCustomerInfo(
  customerInfo: CustomerInfo
): RevenueCatSubscriptionState {
  const activePlan = getActivePlanFromCustomerInfo(customerInfo);
  if (!activePlan) {
    return {
      hasActiveSubscription: false,
      currentPlan: 'free',
      paidPlan: null,
    };
  }

  return {
    hasActiveSubscription: true,
    currentPlan: activePlan,
    paidPlan: activePlan,
  };
}
