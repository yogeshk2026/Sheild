# Courial Shield - Socket/Real-Time Event Specification

**Version:** 1.0.0
**Last Updated:** 2026-01-26
**Status:** Contract of Record for Backend Implementation

---

## Table of Contents

1. [Overview](#overview)
2. [Connection Management](#connection-management)
3. [Claim Status Events](#claim-status-events)
4. [Subscription Events](#subscription-events)
5. [Payout Events](#payout-events)
6. [Notification Events](#notification-events)
7. [Admin Events](#admin-events)
8. [Error Events](#error-events)
9. [Implementation Notes](#implementation-notes)

---

## Overview

### Current Implementation Status

**IMPORTANT:** The current Shield app does **NOT** use WebSocket connections for real-time updates. All data synchronization is currently handled via:

1. **HTTP Polling** via React Query with automatic refetching
2. **Push Notifications** for critical status changes
3. **Local state updates** with optimistic UI

### Recommended Real-Time Architecture

For production, we recommend implementing WebSocket/Socket.io for the following benefits:

- Instant claim status updates
- Real-time subscription state changes
- Immediate payout notifications
- Reduced battery/network usage vs polling

### Connection URL

| Environment | WebSocket URL |
|-------------|---------------|
| Production | `wss://api.courial.com/shield/ws` |
| Staging | `wss://staging-api.courial.com/shield/ws` |

### Authentication

```typescript
// Connection with JWT authentication
const socket = io("wss://api.courial.com/shield/ws", {
  auth: {
    token: "Bearer <jwt_token>"
  },
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});
```

---

## Connection Management

### connect

**Direction:** Client → Server (automatic)

**Trigger Condition:** App launch after authentication

**Payload:** None (auth via connection params)

**Expected Server Response:** `connected` event

---

### connected

**Direction:** Server → Client

**Trigger Condition:** Successful WebSocket connection

**Payload:**

```typescript
{
  userId: string;
  connectionId: string;
  timestamp: string;          // ISO 8601
  serverVersion: string;
}
```

**Target:** Single user (connecting client)

**Acknowledgement:** None required

---

### disconnect

**Direction:** Client → Server

**Trigger Condition:** User logout, app backgrounded (optional)

**Payload:**

```typescript
{
  reason?: "logout" | "background" | "manual";
}
```

**Expected Server Response:** Connection closed

---

### reconnect

**Direction:** Client → Server (automatic)

**Trigger Condition:** Connection lost and restored

**Payload:** Auth token in connection params

**Server Behavior:**
- Restore user's room subscriptions
- Send any missed events from last 5 minutes (optional)

---

## Claim Status Events

### claim_submitted

**Direction:** Server → Client

**Trigger Condition:** New claim successfully submitted

**Payload:**

```typescript
{
  event: "claim_submitted";
  timestamp: string;          // ISO 8601
  data: {
    claimId: string;
    ticketNumber: string;
    amount: number;
    status: "submitted";
    city: string;
    state: string;
    violationType: string;
    submittedAt: string;
    estimatedPayout?: number; // After deductible
  };
}
```

**Target:** Single user (claim owner)

**Acknowledgement:** Optional - `claim_submitted_ack`

```typescript
{
  claimId: string;
  received: true;
}
```

**App Behavior:**
- Add claim to local claims list
- Show toast notification
- Update claims count badge

---

### claim_under_review

**Direction:** Server → Client

**Trigger Condition:** Admin moves claim to review status

**Payload:**

```typescript
{
  event: "claim_under_review";
  timestamp: string;
  data: {
    claimId: string;
    ticketNumber: string;
    previousStatus: "submitted";
    newStatus: "under_review";
    updatedAt: string;
  };
}
```

**Target:** Single user (claim owner)

**Acknowledgement:** None required

**App Behavior:**
- Update claim status in local store
- Show push notification (if enabled)

---

### claim_approved

**Direction:** Server → Client

**Trigger Condition:** Admin approves claim

**Payload:**

```typescript
{
  event: "claim_approved";
  timestamp: string;
  data: {
    claimId: string;
    ticketNumber: string;
    previousStatus: "submitted" | "under_review";
    newStatus: "approved";
    payoutAmount: number;
    deductibleApplied: number;
    memberCoPay: number;
    approvalTimestamp: string;
    decisionNotes?: string;
  };
}
```

**Target:** Single user (claim owner)

**Acknowledgement:** Optional - `claim_approved_ack`

**App Behavior:**
- Update claim status
- Show approval notification
- Trigger wallet refresh

---

### claim_paid

**Direction:** Server → Client

**Trigger Condition:** Payout processed to user's wallet

**Payload:**

```typescript
{
  event: "claim_paid";
  timestamp: string;
  data: {
    claimId: string;
    ticketNumber: string;
    previousStatus: "approved";
    newStatus: "paid";
    payoutAmount: number;
    payoutTimestamp: string;
    walletBalance: number;      // Updated balance
    transactionId: string;      // Wallet transaction ID
  };
}
```

**Target:** Single user (claim owner)

**Acknowledgement:** Required - `claim_paid_ack`

```typescript
{
  claimId: string;
  transactionId: string;
  received: true;
}
```

**App Behavior:**
- Update claim status to "paid"
- Update wallet balance
- Add transaction to wallet history
- Show prominent notification
- Update coverage usage

---

### claim_denied

**Direction:** Server → Client

**Trigger Condition:** Admin denies claim

**Payload:**

```typescript
{
  event: "claim_denied";
  timestamp: string;
  data: {
    claimId: string;
    ticketNumber: string;
    previousStatus: "submitted" | "under_review";
    newStatus: "denied";
    denialCode: string;         // D001-D012
    denialReason: string;
    decisionNotes?: string;
    appealable: boolean;
    appealDeadline?: string;    // ISO 8601 (if appealable)
  };
}
```

**Target:** Single user (claim owner)

**Acknowledgement:** Optional - `claim_denied_ack`

**App Behavior:**
- Update claim status
- Show denial notification
- Display denial reason on claim detail

---

### claim_status_changed

**Direction:** Server → Client

**Trigger Condition:** Any claim status change (generic event)

**Payload:**

```typescript
{
  event: "claim_status_changed";
  timestamp: string;
  data: {
    claimId: string;
    ticketNumber: string;
    previousStatus: ClaimStatus;
    newStatus: ClaimStatus;
    updatedAt: string;
    metadata?: Record<string, unknown>;
  };
}
```

**Target:** Single user (claim owner)

**Acknowledgement:** None required

**Notes:** This is a catch-all event. Prefer specific events when possible.

---

## Subscription Events

### subscription_status_changed

**Direction:** Server → Client

**Trigger Condition:** Subscription status changes (active, cancelled, past_due)

**Payload:**

```typescript
{
  event: "subscription_status_changed";
  timestamp: string;
  data: {
    subscriptionId: string;
    previousStatus: "active" | "inactive" | "cancelled" | "past_due";
    newStatus: "active" | "inactive" | "cancelled" | "past_due";
    planId: "basic" | "pro" | "professional";
    effectiveDate?: string;     // When change takes effect
    reason?: string;            // e.g., "payment_failed", "user_cancelled"
  };
}
```

**Target:** Single user (subscription owner)

**Acknowledgement:** None required

**App Behavior:**
- Update local subscription state
- Show appropriate notification
- Update UI to reflect new status

---

### subscription_renewed

**Direction:** Server → Client

**Trigger Condition:** Subscription successfully renewed (billing cycle)

**Payload:**

```typescript
{
  event: "subscription_renewed";
  timestamp: string;
  data: {
    subscriptionId: string;
    planId: string;
    billingPeriod: "monthly" | "annual";
    renewedAt: string;
    nextRenewalDate: string;
    amountCharged: number;
    coverage: {
      annualCap: number;
      remainingAmount: number;
      ticketsUsed: number;
      maxTickets: number;
      periodStart: string;
      periodEnd: string;
    };
  };
}
```

**Target:** Single user

**Acknowledgement:** None required

**App Behavior:**
- Update coverage data (reset if annual anniversary)
- Show renewal confirmation

---

### coverage_updated

**Direction:** Server → Client

**Trigger Condition:** Coverage limits change (after claim payout)

**Payload:**

```typescript
{
  event: "coverage_updated";
  timestamp: string;
  data: {
    coverage: {
      planId: string;
      annualCap: number;
      usedAmount: number;
      remainingAmount: number;
      ticketsUsed: number;
      maxTickets: number;
      periodStart: string;
      periodEnd: string;
    };
    changeReason: "claim_payout" | "plan_upgrade" | "period_reset";
    claimId?: string;           // If changed due to claim
  };
}
```

**Target:** Single user

**Acknowledgement:** None required

**App Behavior:**
- Update local coverage state
- Update UI progress bars/limits

---

### cancellation_restriction_changed

**Direction:** Server → Client

**Trigger Condition:** User receives payout (90-day restriction starts)

**Payload:**

```typescript
{
  event: "cancellation_restriction_changed";
  timestamp: string;
  data: {
    canCancel: boolean;
    restrictionEndDate?: string;  // ISO 8601
    daysRemaining?: number;
    reason: "payout_received" | "restriction_expired";
    lastPayoutDate?: string;
  };
}
```

**Target:** Single user

**Acknowledgement:** None required

**App Behavior:**
- Update cancellation eligibility state
- Show/hide cancel button in settings

---

## Payout Events

### payout_initiated

**Direction:** Server → Client

**Trigger Condition:** Payout processing started

**Payload:**

```typescript
{
  event: "payout_initiated";
  timestamp: string;
  data: {
    payoutId: string;
    claimId: string;
    amount: number;
    status: "pending";
    initiatedAt: string;
    estimatedCompletionAt: string;
  };
}
```

**Target:** Single user

**Acknowledgement:** None required

---

### payout_completed

**Direction:** Server → Client

**Trigger Condition:** Payout successfully credited to wallet

**Payload:**

```typescript
{
  event: "payout_completed";
  timestamp: string;
  data: {
    payoutId: string;
    claimId: string;
    amount: number;
    status: "completed";
    completedAt: string;
    transactionId: string;
    newWalletBalance: number;
  };
}
```

**Target:** Single user

**Acknowledgement:** Required - `payout_completed_ack`

```typescript
{
  payoutId: string;
  received: true;
}
```

**App Behavior:**
- Update wallet balance immediately
- Add transaction to history
- Show success notification

---

### withdrawal_status_changed

**Direction:** Server → Client

**Trigger Condition:** Withdrawal request status updates

**Payload:**

```typescript
{
  event: "withdrawal_status_changed";
  timestamp: string;
  data: {
    withdrawalId: string;
    previousStatus: "pending" | "processing";
    newStatus: "completed" | "failed";
    amount: number;
    bankAccountLastFour: string;
    completedAt?: string;
    failureReason?: string;
    newWalletBalance: number;
  };
}
```

**Target:** Single user

**Acknowledgement:** None required

---

## Notification Events

### notification_received

**Direction:** Server → Client

**Trigger Condition:** New in-app notification created

**Payload:**

```typescript
{
  event: "notification_received";
  timestamp: string;
  data: {
    notification: {
      id: string;
      title: string;
      message: string;
      type: "claim_update" | "coverage_warning" | "payout" | "general";
      read: false;
      createdAt: string;
      data?: {
        claimId?: string;
        route?: string;
      };
    };
    unreadCount: number;
  };
}
```

**Target:** Single user

**Acknowledgement:** None required

**App Behavior:**
- Add notification to list
- Update unread badge count
- Show toast if app is active

---

### proof_of_payment_requested

**Direction:** Server → Client

**Trigger Condition:** Admin requests proof of payment (post-payout audit)

**Payload:**

```typescript
{
  event: "proof_of_payment_requested";
  timestamp: string;
  data: {
    claimId: string;
    ticketNumber: string;
    requestedAt: string;
    dueBy?: string;             // Deadline if any
    message: string;            // User-facing message
  };
}
```

**Target:** Single user

**Acknowledgement:** None required

**App Behavior:**
- Show notification
- Mark claim as needing action
- Deep link to claim detail with upload prompt

---

## Admin Events

> These events are for admin dashboard only.

### admin_claim_submitted

**Direction:** Server → Admin Clients

**Trigger Condition:** Any new claim submitted

**Payload:**

```typescript
{
  event: "admin_claim_submitted";
  timestamp: string;
  data: {
    claimId: string;
    userId: string;
    userEmail: string;
    ticketNumber: string;
    amount: number;
    violationType: string;
    city: string;
    state: string;
    submittedAt: string;
  };
}
```

**Target:** All connected admin clients

---

### admin_action_required

**Direction:** Server → Admin Clients

**Trigger Condition:** Claim needs review, fraud alert, etc.

**Payload:**

```typescript
{
  event: "admin_action_required";
  timestamp: string;
  data: {
    type: "claim_review" | "fraud_alert" | "proof_overdue";
    priority: "low" | "medium" | "high";
    claimId?: string;
    userId?: string;
    message: string;
    metadata?: Record<string, unknown>;
  };
}
```

**Target:** All connected admin clients

---

## Error Events

### error

**Direction:** Server → Client

**Trigger Condition:** Error processing client request or server error

**Payload:**

```typescript
{
  event: "error";
  timestamp: string;
  data: {
    code: string;               // Error code
    message: string;            // Human-readable message
    originalEvent?: string;     // Event that caused error
    details?: Record<string, unknown>;
  };
}
```

**Target:** Single user (requesting client)

**Acknowledgement:** None required

**Common Error Codes:**

| Code | Description |
|------|-------------|
| `AUTH_EXPIRED` | JWT token expired, need to reconnect |
| `AUTH_INVALID` | Invalid authentication |
| `RATE_LIMITED` | Too many requests |
| `INVALID_PAYLOAD` | Malformed event payload |
| `NOT_AUTHORIZED` | Not authorized for this action |
| `INTERNAL_ERROR` | Server error |

---

## Implementation Notes

### Room/Channel Strategy

```typescript
// User joins their personal room on connect
socket.join(`user:${userId}`);

// Admin clients join admin room
socket.join("admin:all");

// Emit to specific user
io.to(`user:${userId}`).emit("claim_status_changed", payload);

// Emit to all admins
io.to("admin:all").emit("admin_claim_submitted", payload);
```

### Event Ordering Guarantees

1. Events for the same claim are delivered in order
2. Acknowledgements ensure critical events are received
3. Retry logic for unacknowledged critical events (payout_completed)

### Reconnection Handling

On reconnect, client should:

1. Re-authenticate with current JWT
2. Fetch any missed state via REST APIs
3. Server may optionally replay recent events (last 5 min)

### Heartbeat/Keep-Alive

```typescript
// Client sends ping every 30 seconds
socket.on("ping", () => {
  socket.emit("pong");
});

// Server disconnects after 60s of no pong
```

### Offline Handling

When client is offline:

1. Critical updates are delivered via push notification
2. On reconnect, client fetches current state via REST
3. Server does NOT queue indefinitely - push notifications are the fallback

### Security Considerations

1. All connections require valid JWT
2. Users can only receive events for their own data
3. Admin events require admin role in JWT
4. Rate limiting on incoming events (10 events/second max)
5. Payload size limit: 64KB per event

---

## Event Summary Table

| Event | Direction | Target | Ack Required |
|-------|-----------|--------|--------------|
| `claim_submitted` | S→C | User | Optional |
| `claim_under_review` | S→C | User | No |
| `claim_approved` | S→C | User | Optional |
| `claim_paid` | S→C | User | **Yes** |
| `claim_denied` | S→C | User | Optional |
| `subscription_status_changed` | S→C | User | No |
| `subscription_renewed` | S→C | User | No |
| `coverage_updated` | S→C | User | No |
| `payout_initiated` | S→C | User | No |
| `payout_completed` | S→C | User | **Yes** |
| `withdrawal_status_changed` | S→C | User | No |
| `notification_received` | S→C | User | No |
| `proof_of_payment_requested` | S→C | User | No |
| `cancellation_restriction_changed` | S→C | User | No |
| `admin_claim_submitted` | S→C | Admins | No |
| `admin_action_required` | S→C | Admins | No |
| `error` | S→C | User | No |

---

## Alternative: Polling Configuration (Current Implementation)

If WebSockets are not immediately implemented, the app currently uses React Query polling:

```typescript
// Claims list - refetch every 30 seconds when focused
useQuery({
  queryKey: ['claims'],
  queryFn: fetchClaims,
  refetchInterval: 30000,
  refetchOnWindowFocus: true,
});

// Wallet - refetch every 60 seconds
useQuery({
  queryKey: ['wallet'],
  queryFn: fetchWallet,
  refetchInterval: 60000,
});

// Subscription - refetch on mount only
useQuery({
  queryKey: ['subscription'],
  queryFn: fetchSubscription,
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

**Push Notifications** fill the gap for critical real-time events:
- Claim approved/denied/paid
- Payment received
- Proof of payment request
