// Courial Shield - Notification Service
// Handles notification event triggers and preferences
// NOTE: This service triggers backend events - the app does NOT send notifications directly

import type { Claim, ClaimStatus, User, NotificationPreferences } from './types';
import { triggerNotificationEvent } from './notification-api';

// ============================================================================
// Notification Types & Templates
// ============================================================================

export type NotificationChannel = 'push' | 'email' | 'sms';

export type ClaimNotificationEvent =
  | 'claim_submitted'
  | 'claim_under_review'
  | 'claim_approved'
  | 'claim_paid'
  | 'claim_denied';

// Re-export from types for backwards compatibility
export type { NotificationPreferences } from './types';
export { DEFAULT_NOTIFICATION_PREFERENCES } from './types';

// ============================================================================
// Push Notification Templates
// ============================================================================

interface PushNotificationContent {
  title: string;
  body: string;
  data: {
    type: ClaimNotificationEvent;
    claimId: string;
    route: string; // Deep link route
  };
}

export function getPushNotificationContent(
  event: ClaimNotificationEvent,
  claim: Claim
): PushNotificationContent {
  const claimRef = claim.ticketNumber.slice(-6).toUpperCase();

  switch (event) {
    case 'claim_submitted':
      return {
        title: 'Claim Received',
        body: `Your claim #${claimRef} has been submitted and is being processed.`,
        data: {
          type: event,
          claimId: claim.id,
          route: `/claim/${claim.id}`,
        },
      };

    case 'claim_under_review':
      return {
        title: 'Claim Under Review',
        body: `Your claim #${claimRef} is now being reviewed by our team.`,
        data: {
          type: event,
          claimId: claim.id,
          route: `/claim/${claim.id}`,
        },
      };

    case 'claim_approved':
      return {
        title: 'Claim Approved',
        body: `Great news! Your claim #${claimRef} has been approved.`,
        data: {
          type: event,
          claimId: claim.id,
          route: `/claim/${claim.id}`,
        },
      };

    case 'claim_paid':
      return {
        title: 'Payment Sent',
        body: `$${claim.payoutAmount?.toFixed(2) || claim.amount.toFixed(2)} has been added to your wallet for claim #${claimRef}.`,
        data: {
          type: event,
          claimId: claim.id,
          route: `/claim/${claim.id}`,
        },
      };

    case 'claim_denied':
      return {
        title: 'Claim Update',
        body: `Your claim #${claimRef} was not approved. Tap to view details.`,
        data: {
          type: event,
          claimId: claim.id,
          route: `/claim/${claim.id}`,
        },
      };
  }
}

// ============================================================================
// Email Notification Templates
// ============================================================================

interface EmailContent {
  subject: string;
  body: string;
  claimLink: string;
}

export function getEmailContent(
  event: ClaimNotificationEvent,
  claim: Claim,
  user: User
): EmailContent {
  const claimRef = claim.ticketNumber.slice(-6).toUpperCase();
  const claimLink = `courial://claim/${claim.id}`; // Deep link
  const firstName = user.firstName || user.name?.split(' ')[0] || 'Driver';

  switch (event) {
    case 'claim_submitted':
      return {
        subject: `Claim #${claimRef} Received`,
        body: `Hi ${firstName},

Your claim has been submitted and is being processed.

Claim Reference: #${claimRef}
Status: Submitted
Amount: $${claim.amount.toFixed(2)}

We typically review claims within 24-48 hours. You'll receive an update once our review is complete.

View your claim: ${claimLink}

– Courial Shield Team`,
        claimLink,
      };

    case 'claim_approved':
      return {
        subject: `Claim #${claimRef} Approved`,
        body: `Hi ${firstName},

Great news! Your claim has been approved.

Claim Reference: #${claimRef}
Status: Approved
Payout Amount: $${(claim.payoutAmount || claim.amount).toFixed(2)}

Your payout is being processed and will be added to your wallet shortly.

View your claim: ${claimLink}

– Courial Shield Team`,
        claimLink,
      };

    case 'claim_paid':
      return {
        subject: `Payment Sent - Claim #${claimRef}`,
        body: `Hi ${firstName},

Your payout has been processed.

Claim Reference: #${claimRef}
Status: Paid
Amount: $${(claim.payoutAmount || claim.amount).toFixed(2)}

The funds have been added to your Courial Shield wallet. You can withdraw to your bank account at any time.

View your claim: ${claimLink}

– Courial Shield Team`,
        claimLink,
      };

    case 'claim_denied':
      return {
        subject: `Claim #${claimRef} Update`,
        body: `Hi ${firstName},

We've completed our review of your claim.

Claim Reference: #${claimRef}
Status: Not Approved
Reason: ${claim.denialReason || 'See app for details'}

If you believe this decision was made in error, you may be eligible to submit an appeal. View your claim for more information.

View your claim: ${claimLink}

– Courial Shield Team`,
        claimLink,
      };

    // Email not sent for under_review status
    case 'claim_under_review':
      return {
        subject: '',
        body: '',
        claimLink: '',
      };
  }
}

// ============================================================================
// SMS Notification Templates
// ============================================================================

interface SMSContent {
  body: string;
}

// SMS is only sent for claim_paid event
export function getSMSContent(claim: Claim): SMSContent {
  const claimRef = claim.ticketNumber.slice(-6).toUpperCase();
  const amount = claim.payoutAmount || claim.amount;

  return {
    body: `Courial Shield: $${amount.toFixed(2)} paid to your wallet for claim #${claimRef}`,
  };
}

// ============================================================================
// Notification Dispatcher
// ============================================================================

export interface NotificationResult {
  channel: NotificationChannel;
  success: boolean;
  error?: string;
}

/**
 * Determine which notification channels should be used for an event
 */
export function getChannelsForEvent(
  event: ClaimNotificationEvent,
  preferences: NotificationPreferences
): NotificationChannel[] {
  const channels: NotificationChannel[] = [];

  // Check if the specific event type is enabled
  const eventEnabled = (() => {
    switch (event) {
      case 'claim_submitted':
        return preferences.claimSubmitted;
      case 'claim_under_review':
        return preferences.claimSubmitted; // Follows submitted preference
      case 'claim_approved':
        return preferences.claimApproved;
      case 'claim_paid':
        return preferences.claimPaid;
      case 'claim_denied':
        return preferences.claimDenied;
    }
  })();

  if (!eventEnabled) {
    return channels;
  }

  // Push - all events if enabled
  if (preferences.pushEnabled) {
    channels.push('push');
  }

  // Email - only for submitted, approved, paid, denied (not under_review)
  if (preferences.emailEnabled && event !== 'claim_under_review') {
    channels.push('email');
  }

  // SMS - ONLY for claim_paid if opted in
  if (preferences.smsEnabled && event === 'claim_paid') {
    channels.push('sms');
  }

  return channels;
}

/**
 * Map claim status to notification event
 */
export function statusToEvent(status: ClaimStatus): ClaimNotificationEvent | null {
  switch (status) {
    case 'submitted':
      return 'claim_submitted';
    case 'under_review':
      return 'claim_under_review';
    case 'approved':
      return 'claim_approved';
    case 'paid':
      return 'claim_paid';
    case 'denied':
      return 'claim_denied';
    default:
      return null;
  }
}

// ============================================================================
// Send Functions (Simulated)
// ============================================================================

/**
 * Send push notification
 * In production, this would use expo-notifications
 */
export async function sendPushNotification(
  content: PushNotificationContent,
  pushToken?: string
): Promise<NotificationResult> {
  console.log('[NotificationService] Push notification:', {
    title: content.title,
    body: content.body,
    route: content.data.route,
  });

  // Simulated success - in production would use Expo push notifications
  return {
    channel: 'push',
    success: true,
  };
}

/**
 * Send email notification
 * In production, this would call a backend email service
 */
export async function sendEmailNotification(
  content: EmailContent,
  email: string
): Promise<NotificationResult> {
  if (!content.subject) {
    // No email for this event type
    return {
      channel: 'email',
      success: true,
    };
  }

  console.log('[NotificationService] Email notification:', {
    to: email,
    subject: content.subject,
  });

  // Simulated success - in production would call email API
  return {
    channel: 'email',
    success: true,
  };
}

/**
 * Send SMS notification
 * In production, this would call a backend SMS service (Twilio, etc.)
 */
export async function sendSMSNotification(
  content: SMSContent,
  phone: string
): Promise<NotificationResult> {
  console.log('[NotificationService] SMS notification:', {
    to: phone,
    body: content.body,
  });

  // Simulated success - in production would call SMS API
  return {
    channel: 'sms',
    success: true,
  };
}

// ============================================================================
// Main Notification Trigger
// ============================================================================

export interface SendNotificationsResult {
  event: ClaimNotificationEvent;
  success: boolean;
  error?: string;
}

/**
 * Trigger notification event to backend
 * The backend handles all actual notification sending (push, email, SMS)
 * This function checks preferences and triggers the backend API
 */
export async function sendClaimNotifications(
  event: ClaimNotificationEvent,
  claim: Claim,
  user: User,
  preferences: NotificationPreferences
): Promise<SendNotificationsResult> {
  // Check if the specific event type is enabled in preferences
  const eventEnabled = (() => {
    switch (event) {
      case 'claim_submitted':
        return preferences.claimSubmitted;
      case 'claim_under_review':
        return preferences.claimSubmitted; // Follows submitted preference
      case 'claim_approved':
        return preferences.claimApproved;
      case 'claim_paid':
        return preferences.claimPaid;
      case 'claim_denied':
        return preferences.claimDenied;
    }
  })();

  if (!eventEnabled) {
    console.log('[NotificationService] Event disabled by user preferences:', event);
    return {
      event,
      success: true, // Not an error - just skipped
    };
  }

  // Trigger backend notification event
  // Backend will handle sending push, email, SMS based on user preferences
  try {
    const result = await triggerNotificationEvent(event, claim, user);

    if (!result.success) {
      console.error('[NotificationService] Backend event trigger failed:', result.error);
      // Don't throw - log and continue
      return {
        event,
        success: false,
        error: result.error,
      };
    }

    console.log('[NotificationService] Event triggered successfully:', event);
    return {
      event,
      success: true,
    };
  } catch (error) {
    // Catch any errors but don't crash the app
    console.error('[NotificationService] Error triggering event:', error);
    return {
      event,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
