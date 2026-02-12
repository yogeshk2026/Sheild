// OTP Configuration - Sandbox vs Production Mode
// This file controls OTP verification behavior based on environment
//
// SECURITY CRITICAL: This file determines whether OTP verification is enforced.
// Production builds MUST always require exact OTP match.

import Constants from 'expo-constants';

/**
 * FAIL-SAFE: Default to production mode (strict OTP validation).
 * Sandbox mode must be EXPLICITLY enabled and can ONLY be enabled
 * via environment variable in development builds.
 *
 * Safety guarantees:
 * 1. __DEV__ is ALWAYS false in production builds (React Native/Metro guarantee)
 * 2. Environment variable alone is NOT sufficient - __DEV__ must also be true
 * 3. If any check is ambiguous, defaults to production (strict) mode
 * 4. No user-controllable bypass exists
 */
export function isOTPSandboxMode(): boolean {
  // FAIL-SAFE: If __DEV__ is false, ALWAYS return false (production mode)
  // __DEV__ is guaranteed to be false in:
  // - EAS production builds
  // - App Store / Play Store builds
  // - Any release/production build from Metro bundler
  if (!__DEV__) {
    return false;
  }

  // Only in development (__DEV__ === true), check for explicit opt-in
  // Environment variable must be explicitly set to 'true'
  const envSandboxMode = process.env.EXPO_PUBLIC_OTP_SANDBOX_MODE;

  // STRICT CHECK: Only enable sandbox if explicitly set to 'true'
  // Any other value (undefined, 'false', '', etc.) = production mode
  if (envSandboxMode === 'true') {
    // Double-check: Verify we're truly in development
    // Check EAS app variant as additional safety layer
    const appVariant = Constants.expoConfig?.extra?.appVariant;
    if (appVariant === 'production') {
      // Even if __DEV__ somehow got through, reject if variant is production
      console.warn('[OTP] Sandbox mode blocked: appVariant is production');
      return false;
    }

    console.log('[OTP] Sandbox mode enabled (development only)');
    return true;
  }

  // Default: Production mode (strict OTP validation)
  return false;
}

/**
 * Validates an OTP code.
 *
 * PRODUCTION mode (default): Code must match the expected OTP exactly.
 * SANDBOX mode (dev only): Any 6-digit numeric code is accepted.
 *
 * @param enteredOTP - The OTP code entered by the user
 * @param expectedOTP - The OTP code that was generated/sent
 * @returns boolean - Whether the OTP is valid
 */
export function validateOTP(enteredOTP: string, expectedOTP: string): boolean {
  // Ensure the entered code is exactly 6 digits
  if (!/^\d{6}$/.test(enteredOTP)) {
    return false;
  }

  // FAIL-SAFE: Check sandbox mode with all safety checks
  const isSandbox = isOTPSandboxMode();

  if (isSandbox) {
    // Sandbox mode: Accept any valid 6-digit code
    // This branch can ONLY be reached if:
    // 1. __DEV__ is true (development build)
    // 2. EXPO_PUBLIC_OTP_SANDBOX_MODE is explicitly 'true'
    // 3. appVariant is NOT 'production'
    console.log('[OTP Sandbox] Accepting 6-digit code in sandbox mode');
    return true;
  }

  // Production mode: Require exact match
  return enteredOTP === expectedOTP;
}

/**
 * Determines if SMS should be sent for OTP.
 *
 * PRODUCTION mode (default): SMS should be sent via provider.
 * SANDBOX mode (dev only): No SMS is sent (simulated only).
 *
 * @returns boolean - Whether to send actual SMS
 */
export function shouldSendSMS(): boolean {
  return !isOTPSandboxMode();
}

/**
 * Generates a 6-digit OTP code.
 * Used in both sandbox and production modes for consistency.
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Sends an OTP via SMS.
 * In sandbox mode, just logs to console.
 * In production mode, this would integrate with SMS provider.
 *
 * @param phoneNumber - The phone number to send OTP to
 * @param otp - The OTP code to send
 */
export async function sendOTP(phoneNumber: string, otp: string): Promise<{ success: boolean; error?: string }> {
  const isSandbox = isOTPSandboxMode();

  if (isSandbox) {
    // Sandbox mode: Log only, don't send real SMS
    console.log(`[OTP Sandbox] Simulated OTP ${otp} for ${phoneNumber} (SMS not sent)`);
    return { success: true };
  }

  // Production mode: Send SMS via provider
  try {
    console.log(`[OTP Production] Sending OTP to ${phoneNumber}`);
    // TODO: Implement actual SMS sending via backend API
    // In production, this should call your backend which uses Twilio, AWS SNS, etc.
    // const response = await fetch('/api/otp/send', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ phoneNumber, otp }),
    // });
    // return await response.json();

    // Placeholder: Returns success (replace with actual SMS implementation)
    return { success: true };
  } catch (error) {
    console.error('[OTP Production] Failed to send SMS:', error);
    return { success: false, error: 'Failed to send verification code' };
  }
}

/**
 * Returns the current OTP mode for debugging/logging purposes.
 * Does NOT affect OTP validation behavior.
 */
export function getOTPModeInfo(): { mode: 'sandbox' | 'production'; reason: string } {
  if (!__DEV__) {
    return { mode: 'production', reason: '__DEV__ is false (production build)' };
  }

  const envSandboxMode = process.env.EXPO_PUBLIC_OTP_SANDBOX_MODE;
  if (envSandboxMode !== 'true') {
    return { mode: 'production', reason: 'EXPO_PUBLIC_OTP_SANDBOX_MODE is not "true"' };
  }

  const appVariant = Constants.expoConfig?.extra?.appVariant;
  if (appVariant === 'production') {
    return { mode: 'production', reason: 'appVariant is production' };
  }

  return { mode: 'sandbox', reason: 'Development build with sandbox mode enabled' };
}
