// Courial Shield - Backend Notification API
// Handles communication with backend notification services
// The app does NOT send notifications directly - all notifications are sent by the backend

import type { Claim, User, NotificationPreferences } from './types';
import type { ClaimNotificationEvent } from './notification-service';

// ============================================================================
// API Configuration
// ============================================================================

const NOTIFICATION_API_BASE_URL = 'https://api.courial.com/notifications';

// ============================================================================
// Event Payload Types
// ============================================================================

export interface NotificationEventPayload {
  user_id: string;
  claim_id: string;
  event_type: ClaimNotificationEvent;
  timestamp: string;
  // Additional context for the backend
  claim_data?: {
    ticket_number: string;
    amount: number;
    payout_amount?: number;
    status: string;
    city: string;
    state: string;
  };
  user_preferences?: NotificationPreferences;
}

export interface PushTokenPayload {
  user_id: string;
  device_token: string;
  platform: 'ios' | 'android' | 'web';
  token_type: 'apns' | 'fcm' | 'expo';
  app_version?: string;
  device_id?: string;
}

export interface PreferencesSyncPayload {
  user_id: string;
  preferences: NotificationPreferences;
  updated_at: string;
}

// ============================================================================
// API Response Types
// ============================================================================

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// Event Trigger API
// ============================================================================

/**
 * Trigger a notification event to the backend
 * The backend will handle sending push/email/SMS based on user preferences
 */
export async function triggerNotificationEvent(
  event: ClaimNotificationEvent,
  claim: Claim,
  user: User
): Promise<ApiResponse> {
  const payload: NotificationEventPayload = {
    user_id: user.id,
    claim_id: claim.id,
    event_type: event,
    timestamp: new Date().toISOString(),
    claim_data: {
      ticket_number: claim.ticketNumber,
      amount: claim.amount,
      payout_amount: claim.payoutAmount,
      status: claim.status,
      city: claim.city,
      state: claim.state,
    },
    user_preferences: user.notificationPreferences,
  };

  try {
    console.log('[NotificationAPI] Triggering event:', event, 'for claim:', claim.id);

    const response = await fetch(`${NOTIFICATION_API_BASE_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // In production, include auth token
        // 'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[NotificationAPI] Event trigger failed:', response.status, errorText);
      return {
        success: false,
        error: `API error: ${response.status}`,
      };
    }

    const data = await response.json();
    console.log('[NotificationAPI] Event triggered successfully:', event);
    return {
      success: true,
      data,
    };
  } catch (error) {
    // Log error but don't crash the app
    console.error('[NotificationAPI] Failed to trigger event:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// ============================================================================
// Push Token Registration API
// ============================================================================

/**
 * Register a push token with the backend
 * Called on login, app reinstall, and token refresh
 */
export async function registerPushToken(
  userId: string,
  deviceToken: string,
  platform: 'ios' | 'android' | 'web',
  tokenType: 'apns' | 'fcm' | 'expo' = 'expo'
): Promise<ApiResponse> {
  const payload: PushTokenPayload = {
    user_id: userId,
    device_token: deviceToken,
    platform,
    token_type: tokenType,
    app_version: '1.0.0', // In production, get from app.json or Constants
  };

  try {
    console.log('[NotificationAPI] Registering push token for user:', userId);

    const response = await fetch(`${NOTIFICATION_API_BASE_URL}/tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[NotificationAPI] Token registration failed:', response.status, errorText);
      return {
        success: false,
        error: `API error: ${response.status}`,
      };
    }

    const data = await response.json();
    console.log('[NotificationAPI] Push token registered successfully');
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('[NotificationAPI] Failed to register push token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Unregister a push token (e.g., on logout)
 */
export async function unregisterPushToken(
  userId: string,
  deviceToken: string
): Promise<ApiResponse> {
  try {
    console.log('[NotificationAPI] Unregistering push token for user:', userId);

    const response = await fetch(`${NOTIFICATION_API_BASE_URL}/tokens`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        device_token: deviceToken,
      }),
    });

    if (!response.ok) {
      console.error('[NotificationAPI] Token unregistration failed:', response.status);
      return {
        success: false,
        error: `API error: ${response.status}`,
      };
    }

    console.log('[NotificationAPI] Push token unregistered successfully');
    return { success: true };
  } catch (error) {
    console.error('[NotificationAPI] Failed to unregister push token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// ============================================================================
// Preferences Sync API
// ============================================================================

/**
 * Sync notification preferences to the backend
 */
export async function syncNotificationPreferences(
  userId: string,
  preferences: NotificationPreferences
): Promise<ApiResponse> {
  const payload: PreferencesSyncPayload = {
    user_id: userId,
    preferences,
    updated_at: new Date().toISOString(),
  };

  try {
    console.log('[NotificationAPI] Syncing preferences for user:', userId);

    const response = await fetch(`${NOTIFICATION_API_BASE_URL}/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('[NotificationAPI] Preferences sync failed:', response.status);
      return {
        success: false,
        error: `API error: ${response.status}`,
      };
    }

    console.log('[NotificationAPI] Preferences synced successfully');
    return { success: true };
  } catch (error) {
    console.error('[NotificationAPI] Failed to sync preferences:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Fetch notification preferences from the backend
 */
export async function fetchNotificationPreferences(
  userId: string
): Promise<ApiResponse<NotificationPreferences>> {
  try {
    console.log('[NotificationAPI] Fetching preferences for user:', userId);

    const response = await fetch(`${NOTIFICATION_API_BASE_URL}/preferences/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('[NotificationAPI] Preferences fetch failed:', response.status);
      return {
        success: false,
        error: `API error: ${response.status}`,
      };
    }

    const data = await response.json();
    console.log('[NotificationAPI] Preferences fetched successfully');
    return {
      success: true,
      data: data.preferences,
    };
  } catch (error) {
    console.error('[NotificationAPI] Failed to fetch preferences:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}
