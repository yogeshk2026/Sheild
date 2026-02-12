// Courial Shield - Push Notification Setup
// Handles device token registration, permissions, and notification listeners
// Does NOT send notifications - only registers tokens and handles incoming notifications

import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import { registerPushToken, unregisterPushToken } from './notification-api';

// Only import expo-notifications on native platforms
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Notifications: any = null;

// Subscription type for cleanup
interface Subscription {
  remove: () => void;
}

// ============================================================================
// Configuration
// ============================================================================

// Configure how notifications are displayed when app is in foreground
// Only run on native platforms, not web
if (Platform.OS !== 'web') {
  try {
    // Dynamic import to avoid web issues
    Notifications = require('expo-notifications');
    Notifications?.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (error) {
    console.warn('[PushSetup] Failed to set notification handler:', error);
  }
}

// ============================================================================
// Token Registration
// ============================================================================

let cachedPushToken: string | null = null;

/**
 * Get the current push token (cached)
 */
export function getCachedPushToken(): string | null {
  return cachedPushToken;
}

/**
 * Register for push notifications and get device token
 * Call this on login, app reinstall, and when token refreshes
 */
export async function registerForPushNotifications(
  userId: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  // Skip on web
  if (Platform.OS === 'web' || !Notifications) {
    console.log('[PushSetup] Push notifications not available on web');
    return {
      success: false,
      error: 'Push notifications not available on web',
    };
  }

  // Check if we're on a physical device
  if (!Device.isDevice) {
    console.log('[PushSetup] Push notifications require a physical device');
    return {
      success: false,
      error: 'Push notifications require a physical device',
    };
  }

  try {
    // Check/request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[PushSetup] Push notification permission denied');
      return {
        success: false,
        error: 'Push notification permission denied',
      };
    }

    // Get the Expo push token
    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID, // Set in ENV tab
    });

    const token = tokenResponse.data;
    cachedPushToken = token;

    console.log('[PushSetup] Got push token:', token);

    // Determine platform
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';

    // Register token with backend
    const result = await registerPushToken(userId, token, platform, 'expo');

    if (!result.success) {
      console.warn('[PushSetup] Failed to register token with backend:', result.error);
      // Don't fail - token is still valid locally
    }

    // Set up Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('claims', {
        name: 'Claim Updates',
        importance: Notifications.AndroidImportance?.HIGH ?? 4,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#F97316',
        sound: 'default',
      });
    }

    return {
      success: true,
      token,
    };
  } catch (error) {
    console.error('[PushSetup] Error registering for push notifications:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Unregister push token on logout
 */
export async function unregisterPushNotifications(userId: string): Promise<void> {
  if (cachedPushToken) {
    try {
      await unregisterPushToken(userId, cachedPushToken);
      cachedPushToken = null;
      console.log('[PushSetup] Push token unregistered');
    } catch (error) {
      console.error('[PushSetup] Error unregistering push token:', error);
    }
  }
}

// ============================================================================
// Deep Link Handling
// ============================================================================

interface NotificationData {
  type?: string;
  claimId?: string;
  route?: string;
}

/**
 * Handle deep link navigation from notification
 */
function handleNotificationNavigation(data: NotificationData): void {
  console.log('[PushSetup] Handling notification navigation:', data);

  // If we have a direct route, use it
  if (data.route) {
    // Small delay to ensure navigation is ready
    setTimeout(() => {
      router.push(data.route as string);
    }, 100);
    return;
  }

  // If we have a claimId, navigate to claim detail
  if (data.claimId) {
    setTimeout(() => {
      router.push(`/claim/${data.claimId}`);
    }, 100);
    return;
  }

  console.log('[PushSetup] No navigation data in notification');
}

// ============================================================================
// Notification Listeners
// ============================================================================

let notificationReceivedSubscription: Subscription | null = null;
let notificationResponseSubscription: Subscription | null = null;

/**
 * Set up notification listeners
 * Call this once when the app starts
 */
export function setupNotificationListeners(): void {
  // Skip on web or if Notifications not available
  if (Platform.OS === 'web' || !Notifications) {
    console.log('[PushSetup] Notification listeners not available on web');
    return;
  }

  // Clean up existing subscriptions
  removeNotificationListeners();

  try {
    // Handle notification received while app is in foreground
    notificationReceivedSubscription = Notifications.addNotificationReceivedListener(
      (notification: { request: { content: { title: string } } }) => {
        console.log('[PushSetup] Notification received:', notification.request.content.title);
        // Notification will be displayed by the handler configured above
      }
    );

    // Handle user tapping on a notification (deep link)
    notificationResponseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response: { notification: { request: { content: { data: unknown } } } }) => {
        console.log('[PushSetup] Notification tapped');
        const data = response.notification.request.content.data as NotificationData;
        handleNotificationNavigation(data);
      }
    );

    console.log('[PushSetup] Notification listeners set up');
  } catch (error) {
    console.warn('[PushSetup] Failed to set up notification listeners:', error);
  }
}

/**
 * Remove notification listeners
 * Call this on cleanup
 */
export function removeNotificationListeners(): void {
  if (notificationReceivedSubscription) {
    notificationReceivedSubscription.remove();
    notificationReceivedSubscription = null;
  }
  if (notificationResponseSubscription) {
    notificationResponseSubscription.remove();
    notificationResponseSubscription = null;
  }
}

/**
 * Check if app was launched from a notification and handle deep link
 * Call this on app start
 */
export async function handleInitialNotification(): Promise<void> {
  // Skip on web or if Notifications not available
  if (Platform.OS === 'web' || !Notifications) {
    return;
  }

  try {
    // Get the notification that opened the app (if any)
    const response = await Notifications.getLastNotificationResponseAsync();

    if (response) {
      console.log('[PushSetup] App opened from notification');
      const data = response.notification.request.content.data as NotificationData;
      handleNotificationNavigation(data);
    }
  } catch (error) {
    console.error('[PushSetup] Error handling initial notification:', error);
  }
}

// ============================================================================
// Badge Management
// ============================================================================

/**
 * Set the app badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  // Skip on web or if Notifications not available
  if (Platform.OS === 'web' || !Notifications) {
    return;
  }

  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.error('[PushSetup] Error setting badge count:', error);
  }
}

/**
 * Clear the app badge
 */
export async function clearBadge(): Promise<void> {
  await setBadgeCount(0);
}
