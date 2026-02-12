// Courial Shield - Driver API Integration
// Base URL: https://gocourial.com/driverApis/shield

const COURIAL_API_BASE = 'https://gocourial.com/driverApis/shield';

// ============================================================================
// Types
// ============================================================================

export interface CourialIdResponse {
  success: boolean;
  courial_id?: number;
  error?: string;
}

export interface CourialProfile {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  profileImage?: string;
  // Vehicle info
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleColor?: string;
  licensePlate?: string;
  // Address
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  // Driver status
  driverStatus?: 'active' | 'inactive' | 'suspended';
  createdAt?: string;
  updatedAt?: string;
}

export interface CourialProfileResponse {
  success: boolean;
  profile?: CourialProfile;
  error?: string;
}

export interface CourialProfileUpdatePayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  profileImage?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  // Note: Identity and vehicle fields are locked - only Courial Support can update
}

export interface CourialProfileUpdateResponse {
  success: boolean;
  profile?: CourialProfile;
  error?: string;
}

export interface CourialApiError {
  success: false;
  error: string;
  code?: string;
}

// Audit log entry for profile updates
export interface CourialAuditLog {
  timestamp: string;
  actingUserId: string;
  actingUserType: 'admin' | 'support' | 'system';
  action: 'profile_update' | 'courial_id_fetch' | 'discount_eligibility_check';
  courialId: number;
  fieldsChanged?: string[];
  details?: Record<string, unknown>;
}

// Discount eligibility types
export interface DiscountEligibilityData {
  eligible: boolean;
  discountPercentage: number;
  completedRides: number;
}

export interface DiscountEligibilityResponse {
  success: boolean;
  data?: DiscountEligibilityData;
  error?: string;
}

// ============================================================================
// API Functions (Server-side calls - do not expose to frontend directly)
// ============================================================================

/**
 * Fetch the Courial ID for a user based on their email address.
 * This should be called ONCE after user login if courial_id is not already stored.
 * The courial_id is immutable and should be persisted.
 */
export async function fetchCourialId(email: string): Promise<CourialIdResponse> {
  try {
    const response = await fetch(`${COURIAL_API_BASE}/users/courial_id`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Log as warning since this is non-blocking
      console.log('[CourialAPI] Courial ID fetch unavailable (non-blocking):', response.status);

      return {
        success: false,
        error: `API error: ${response.status}`,
      };
    }

    const data = await response.json();

    if (!data.success) {
      console.error('[CourialAPI] Courial ID fetch returned success: false', data);
      return {
        success: false,
        error: data.error || 'Failed to resolve Courial ID',
      };
    }

    console.log('[CourialAPI] Successfully resolved courial_id:', data.courial_id);
    return {
      success: true,
      courial_id: data.courial_id,
    };
  } catch (error) {
    // Log as info since network errors are expected when API is unavailable
    console.log('[CourialAPI] Courial API unavailable (non-blocking):', error instanceof Error ? error.message : 'Network error');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Fetch the Courial user profile by their courial_id.
 * Use the stored courial_id - never create a fallback or fake ID.
 */
export async function fetchCourialProfile(courialId: number): Promise<CourialProfileResponse> {
  try {
    if (!courialId || courialId <= 0) {
      console.error('[CourialAPI] Invalid courial_id provided:', courialId);
      return {
        success: false,
        error: 'Invalid Courial ID',
      };
    }

    const response = await fetch(`${COURIAL_API_BASE}/users/${courialId}/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      console.error('[CourialAPI] Profile not found for courial_id:', courialId);
      return {
        success: false,
        error: 'Profile not found',
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CourialAPI] Failed to fetch profile:', response.status, errorText);
      return {
        success: false,
        error: `API error: ${response.status}`,
      };
    }

    const data = await response.json();

    if (!data.success && data.error) {
      return {
        success: false,
        error: data.error,
      };
    }

    return {
      success: true,
      profile: data.profile || data,
    };
  } catch (error) {
    console.error('[CourialAPI] Network error fetching profile:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Update the Courial user profile.
 * IMPORTANT: Only allow profile updates from Admin tools or Courial Support workflows.
 * End users should NOT be able to directly edit locked identity or vehicle fields.
 *
 * @param courialId - The user's Courial ID
 * @param updates - The profile fields to update
 * @param actingUser - The admin/support user making the update (for audit logging)
 */
export async function updateCourialProfile(
  courialId: number,
  updates: CourialProfileUpdatePayload,
  actingUser: { id: string; type: 'admin' | 'support' }
): Promise<CourialProfileUpdateResponse> {
  try {
    if (!courialId || courialId <= 0) {
      console.error('[CourialAPI] Invalid courial_id for update:', courialId);
      return {
        success: false,
        error: 'Invalid Courial ID',
      };
    }

    // Log the update attempt for auditing
    const auditLog: CourialAuditLog = {
      timestamp: new Date().toISOString(),
      actingUserId: actingUser.id,
      actingUserType: actingUser.type,
      action: 'profile_update',
      courialId,
      fieldsChanged: Object.keys(updates),
      details: { updates },
    };

    console.log('[CourialAPI] Profile update audit:', JSON.stringify(auditLog));

    const response = await fetch(`${COURIAL_API_BASE}/users/${courialId}/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (response.status === 404) {
      console.error('[CourialAPI] Profile not found for update, courial_id:', courialId);
      return {
        success: false,
        error: 'Profile not found',
      };
    }

    if (response.status === 401 || response.status === 403) {
      console.error('[CourialAPI] Unauthorized profile update attempt:', response.status);
      return {
        success: false,
        error: 'Unauthorized to update profile',
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CourialAPI] Failed to update profile:', response.status, errorText);
      return {
        success: false,
        error: `API error: ${response.status}`,
      };
    }

    const data = await response.json();

    console.log('[CourialAPI] Profile updated successfully for courial_id:', courialId);

    return {
      success: true,
      profile: data.profile || data,
    };
  } catch (error) {
    console.error('[CourialAPI] Network error updating profile:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// ============================================================================
// Error Handling Utilities
// ============================================================================

/**
 * Check if an API response indicates a retriable error
 */
export function isRetriableError(error: string): boolean {
  const retriablePatterns = ['Network error', 'timeout', 'ECONNREFUSED', '503', '502', '504'];
  return retriablePatterns.some(pattern => error.toLowerCase().includes(pattern.toLowerCase()));
}

/**
 * Format API error for display/logging
 */
export function formatCourialApiError(response: CourialApiError): string {
  return `Courial API Error: ${response.error}${response.code ? ` (${response.code})` : ''}`;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate that a courial_id is in the expected format
 */
export function isValidCourialId(id: unknown): id is number {
  return typeof id === 'number' && Number.isInteger(id) && id > 0;
}

// ============================================================================
// Discount Eligibility
// ============================================================================

/**
 * Fetch discount eligibility for a Courial driver.
 * Determines if the user qualifies for the 20% Courial Driver discount
 * based on completed orders (5+ orders required).
 *
 * This should be called after courialId is resolved.
 * On failure, defaults to not eligible (no discount applied).
 */
export async function fetchDiscountEligibility(
  courialId: number
): Promise<DiscountEligibilityResponse> {
  try {
    if (!isValidCourialId(courialId)) {
      console.error('[CourialAPI] Invalid courial_id for discount check:', courialId);
      return {
        success: false,
        error: 'Invalid Courial ID',
      };
    }

    console.log('[CourialAPI] Checking discount eligibility for courial_id:', courialId);

    const response = await fetch(
      `${COURIAL_API_BASE}/users/${courialId}/discount-eligibility`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.status === 404) {
      console.warn('[CourialAPI] Discount eligibility endpoint returned 404 for:', courialId);
      return {
        success: true,
        data: {
          eligible: false,
          discountPercentage: 0,
          completedRides: 0,
        },
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        '[CourialAPI] Failed to fetch discount eligibility:',
        response.status,
        errorText
      );
      return {
        success: false,
        error: `API error: ${response.status}`,
      };
    }

    const data = await response.json();

    if (!data.success) {
      console.error('[CourialAPI] Discount eligibility returned success: false', data);
      return {
        success: false,
        error: data.error || 'Failed to check discount eligibility',
      };
    }

    console.log('[CourialAPI] Discount eligibility result:', data.data);

    return {
      success: true,
      data: {
        eligible: data.data?.eligible ?? false,
        discountPercentage: data.data?.discountPercentage ?? 0,
        completedRides: data.data?.completedRides ?? 0,
      },
    };
  } catch (error) {
    console.error('[CourialAPI] Network error checking discount eligibility:', error);
    // On failure, default to not eligible (don't block the user)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}
