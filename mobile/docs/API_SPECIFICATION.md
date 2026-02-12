# Courial Shield - Backend API Specification

**Version:** 1.0.0
**Last Updated:** 2026-01-26
**Status:** Contract of Record for Backend Implementation

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication APIs](#1-authentication-apis)
3. [User Profile APIs](#2-user-profile-apis)
4. [Courial Driver Integration APIs](#3-courial-driver-integration-apis)
5. [Subscription & Entitlement APIs](#4-subscription--entitlement-apis)
6. [Claims APIs](#5-claims-apis)
7. [Wallet & Payout APIs](#6-wallet--payout-apis)
8. [Notification APIs](#7-notification-apis)
9. [Admin APIs](#8-admin-apis)
10. [Error Response Schema](#error-response-schema)
11. [Data Models](#data-models)

---

## Overview

### Base URLs

| Environment | URL |
|-------------|-----|
| Production | `https://api.courial.com/shield/v1` |
| Staging | `https://staging-api.courial.com/shield/v1` |
| Courial Driver API | `https://gocourial.com/driverApis/shield` |

### Authentication

All APIs (except public endpoints) require authentication via Bearer token:

```
Authorization: Bearer <jwt_token>
```

### Standard Response Envelope

All API responses follow this structure:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}
```

---

## 1. Authentication APIs

### 1.1 Send OTP

**Purpose:** Send a one-time password to user's phone for verification

| Field | Value |
|-------|-------|
| **Endpoint** | `POST /auth/otp/send` |
| **Authentication** | None (public) |

**Request Body:**

```typescript
{
  phone: string;        // Required - E.164 format (e.g., "+14155551234")
  purpose: "signup" | "login" | "verify_phone";  // Required
}
```

**Success Response (200):**

```typescript
{
  success: true,
  data: {
    otpId: string;              // UUID for OTP session
    expiresAt: string;          // ISO 8601 timestamp
    resendAvailableAt: string;  // ISO 8601 timestamp (rate limiting)
  }
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | `INVALID_PHONE` | Phone number format is invalid |
| 429 | `RATE_LIMITED` | Too many OTP requests |

**Triggered By:** Sign-in screen, Phone verification screen

---

### 1.2 Verify OTP

**Purpose:** Verify the OTP entered by user

| Field | Value |
|-------|-------|
| **Endpoint** | `POST /auth/otp/verify` |
| **Authentication** | None (public) |

**Request Body:**

```typescript
{
  otpId: string;    // Required - OTP session ID from send response
  phone: string;    // Required - E.164 format
  code: string;     // Required - 6-digit OTP
}
```

**Success Response (200):**

```typescript
{
  success: true,
  data: {
    verified: true,
    userId?: string;           // Present if existing user
    isNewUser: boolean;
    accessToken?: string;      // JWT - present if existing user
    refreshToken?: string;     // Present if existing user
  }
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | `INVALID_OTP` | OTP is incorrect |
| 400 | `OTP_EXPIRED` | OTP has expired |
| 429 | `TOO_MANY_ATTEMPTS` | Too many failed verification attempts |

**Triggered By:** OTP verification screen

---

### 1.3 Register User (Email)

**Purpose:** Create a new user account with email

| Field | Value |
|-------|-------|
| **Endpoint** | `POST /auth/register` |
| **Authentication** | None (public) |

**Request Body:**

```typescript
{
  email: string;              // Required - Valid email
  password: string;           // Required - Min 8 chars
  name: string;               // Required - Full name
  phone: string;              // Required - E.164 format (must be pre-verified via OTP)
  phoneVerificationId: string; // Required - OTP verification ID
}
```

**Success Response (201):**

```typescript
{
  success: true,
  data: {
    user: User;               // Full user object (see Data Models)
    accessToken: string;      // JWT (expires in 1 hour)
    refreshToken: string;     // Refresh token (expires in 30 days)
  }
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | `EMAIL_EXISTS` | Email already registered |
| 400 | `PHONE_NOT_VERIFIED` | Phone verification required |
| 400 | `INVALID_EMAIL` | Email format invalid |
| 400 | `WEAK_PASSWORD` | Password doesn't meet requirements |

**Triggered By:** Sign-up screen (email flow)

---

### 1.4 Login (Email)

**Purpose:** Authenticate existing user with email/password

| Field | Value |
|-------|-------|
| **Endpoint** | `POST /auth/login` |
| **Authentication** | None (public) |

**Request Body:**

```typescript
{
  email: string;     // Required
  password: string;  // Required
}
```

**Success Response (200):**

```typescript
{
  success: true,
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  }
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 401 | `INVALID_CREDENTIALS` | Email or password incorrect |
| 403 | `ACCOUNT_SUSPENDED` | Account has been suspended |

**Triggered By:** Sign-in screen (email flow)

---

### 1.5 Social Auth (Apple/Google)

**Purpose:** Authenticate via Apple or Google Sign-In

| Field | Value |
|-------|-------|
| **Endpoint** | `POST /auth/social` |
| **Authentication** | None (public) |

**Request Body:**

```typescript
{
  provider: "apple" | "google";   // Required
  idToken: string;                // Required - Token from Apple/Google
  nonce?: string;                 // Required for Apple
  email?: string;                 // May be provided by provider
  name?: string;                  // May be provided by provider
}
```

**Success Response (200):**

```typescript
{
  success: true,
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
    isNewUser: boolean;
    requiresPhoneVerification: boolean;  // True if phone not yet verified
  }
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | `INVALID_TOKEN` | Social provider token invalid |
| 400 | `PROVIDER_ERROR` | Error from social provider |

**Triggered By:** Sign-in screen (Apple/Google buttons)

---

### 1.6 Refresh Token

**Purpose:** Get new access token using refresh token

| Field | Value |
|-------|-------|
| **Endpoint** | `POST /auth/refresh` |
| **Authentication** | None (public) |

**Request Body:**

```typescript
{
  refreshToken: string;  // Required
}
```

**Success Response (200):**

```typescript
{
  success: true,
  data: {
    accessToken: string;
    refreshToken: string;  // New refresh token (rotation)
  }
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 401 | `INVALID_REFRESH_TOKEN` | Refresh token invalid or expired |

**Triggered By:** Automatic token refresh in app

---

### 1.7 Logout

**Purpose:** Invalidate user session and tokens

| Field | Value |
|-------|-------|
| **Endpoint** | `POST /auth/logout` |
| **Authentication** | Bearer Token (User) |

**Request Body:**

```typescript
{
  refreshToken: string;        // Required - To invalidate
  deviceToken?: string;        // Optional - Push token to unregister
}
```

**Success Response (200):**

```typescript
{
  success: true,
  data: {
    loggedOut: true
  }
}
```

**Triggered By:** Settings screen (Log Out button)

---

## 2. User Profile APIs

### 2.1 Get User Profile

**Purpose:** Fetch current user's profile data

| Field | Value |
|-------|-------|
| **Endpoint** | `GET /users/me` |
| **Authentication** | Bearer Token (User) |

**Success Response (200):**

```typescript
{
  success: true,
  data: {
    user: User;  // Full user object
  }
}
```

**Triggered By:** App launch, Profile screen, after login

---

### 2.2 Update User Profile

**Purpose:** Update user profile fields (pre-lock only)

| Field | Value |
|-------|-------|
| **Endpoint** | `PATCH /users/me` |
| **Authentication** | Bearer Token (User) |

**Request Body:**

```typescript
{
  // All fields optional - only include fields to update
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;                    // Requires re-verification
  profileImage?: string;             // Base64 or URL
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  driversLicenseNumber?: string;
  dateOfBirth?: string;              // MM/DD/YYYY format
  vin?: string;                      // 17 characters
}
```

**Success Response (200):**

```typescript
{
  success: true,
  data: {
    user: User;
    profileLocked: boolean;  // True if this update triggered lock
  }
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | `PROFILE_LOCKED` | Profile is locked and cannot be edited |
| 400 | `INVALID_VIN` | VIN format invalid |
| 400 | `INVALID_DOB` | Date of birth format invalid |

**Business Rules:**
- Profile becomes **locked** after first claim submission
- Once locked, only Courial Support can edit identity fields
- `profileLockedAt` timestamp is set when locked

**Triggered By:** Edit Profile screen, Complete Profile flow

---

### 2.3 Complete Profile

**Purpose:** Complete all required profile fields and lock profile

| Field | Value |
|-------|-------|
| **Endpoint** | `POST /users/me/complete-profile` |
| **Authentication** | Bearer Token (User) |

**Request Body:**

```typescript
{
  firstName: string;              // Required
  lastName: string;               // Required
  address: {                      // Required
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  driversLicenseNumber: string;   // Required
  dateOfBirth: string;            // Required - MM/DD/YYYY
  vin: string;                    // Required - 17 chars
}
```

**Success Response (200):**

```typescript
{
  success: true,
  data: {
    user: User;
    profileCompleted: true;
    profileLockedAt: string;  // ISO 8601 timestamp
  }
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | `MISSING_REQUIRED_FIELDS` | One or more required fields missing |
| 400 | `PROFILE_ALREADY_COMPLETE` | Profile already completed |

**Triggered By:** Complete Profile screen (required before first claim)

---

### 2.4 Add Vehicle

**Purpose:** Add a vehicle to user's account

| Field | Value |
|-------|-------|
| **Endpoint** | `POST /users/me/vehicles` |
| **Authentication** | Bearer Token (User) |

**Request Body:**

```typescript
{
  make: string;           // Required
  model: string;          // Required
  year: number;           // Required
  color: string;          // Required
  licensePlate: string;   // Required
  isPrimary?: boolean;    // Optional, default false
  imageUrl?: string;      // Optional
  imageSource?: "camera" | "gallery" | "ai_generated";
}
```

**Success Response (201):**

```typescript
{
  success: true,
  data: {
    vehicle: Vehicle;
    vehicles: Vehicle[];  // Updated list of all vehicles
  }
}
```

**Triggered By:** Add Vehicle screen, Onboarding vehicle setup

---

### 2.5 Get Vehicles

**Purpose:** Get all vehicles for user

| Field | Value |
|-------|-------|
| **Endpoint** | `GET /users/me/vehicles` |
| **Authentication** | Bearer Token (User) |

**Success Response (200):**

```typescript
{
  success: true,
  data: {
    vehicles: Vehicle[];
  }
}
```

**Triggered By:** Vehicles screen, Claim submission (vehicle selection)

---

## 3. Courial Driver Integration APIs

### 3.1 Resolve Courial ID

**Purpose:** Look up user's Courial Driver ID by email (for driver discount eligibility)

| Field | Value |
|-------|-------|
| **Endpoint** | `POST https://gocourial.com/driverApis/shield/users/courial_id` |
| **Authentication** | API Key (server-side) |

**Request Body:**

```typescript
{
  email: string;  // Required - User's email address
}
```

**Success Response (200):**

```typescript
{
  success: true,
  courial_id: number;  // The user's Courial driver ID
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 404 | `NOT_FOUND` | No Courial account for this email |
| 500 | `INTERNAL_ERROR` | Courial API error |

**Business Rules:**
- `courial_id` is **immutable** once fetched - store permanently
- Called once after user login if `courialId` not already stored
- Non-blocking - failure should not prevent app usage

**Triggered By:** Post-login flow (automatic)

---

### 3.2 Get Courial Profile

**Purpose:** Fetch driver profile from Courial main app

| Field | Value |
|-------|-------|
| **Endpoint** | `GET https://gocourial.com/driverApis/shield/users/{courialId}/profile` |
| **Authentication** | API Key (server-side) |

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `courialId` | number | User's Courial ID |

**Success Response (200):**

```typescript
{
  success: true,
  profile: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    profileImage?: string;
    vehicleMake?: string;
    vehicleModel?: string;
    vehicleYear?: number;
    vehicleColor?: string;
    licensePlate?: string;
    address?: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
    };
    driverStatus?: "active" | "inactive" | "suspended";
    createdAt?: string;
    updatedAt?: string;
  }
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 404 | `NOT_FOUND` | Profile not found for Courial ID |

**Triggered By:** Profile sync, Claim verification

---

### 3.3 Check Discount Eligibility

**Purpose:** Check if user qualifies for 20% Courial Driver discount

| Field | Value |
|-------|-------|
| **Endpoint** | `GET https://gocourial.com/driverApis/shield/users/{courialId}/discount-eligibility` |
| **Authentication** | API Key (server-side) |

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `courialId` | number | User's Courial ID |

**Success Response (200):**

```typescript
{
  success: true,
  data: {
    eligible: boolean;           // True if qualifies for discount
    discountPercentage: number;  // 20 if eligible, 0 otherwise
    completedRides: number;      // Number of completed Courial orders
  }
}
```

**Business Rules:**
- User qualifies for 20% discount if `completedRides >= 5`
- Check can be performed periodically (cache for 24 hours)

**Triggered By:** Plans screen, Checkout flow

---

## 4. Subscription & Entitlement APIs

### 4.1 Get Subscription Status

**Purpose:** Get user's current subscription and coverage details

| Field | Value |
|-------|-------|
| **Endpoint** | `GET /subscriptions/me` |
| **Authentication** | Bearer Token (User) |

**Success Response (200):**

```typescript
{
  success: true,
  data: {
    subscription: {
      id: string;
      userId: string;
      planId: "basic" | "pro" | "professional";
      status: "active" | "inactive" | "cancelled" | "past_due";
      billingPeriod: "monthly" | "annual";
      currentPeriodStart: string;  // ISO 8601
      currentPeriodEnd: string;    // ISO 8601
      cancelAtPeriodEnd: boolean;
      createdAt: string;
      updatedAt: string;
    };
    coverage: {
      planId: "basic" | "pro" | "professional";
      annualCap: number;
      usedAmount: number;
      remainingAmount: number;
      ticketsUsed: number;
      maxTickets: number;
      periodStart: string;
      periodEnd: string;
    };
    entitlements: {
      canSubmitClaims: boolean;
      inWaitingPeriod: boolean;
      waitingPeriodEndDate?: string;
      daysRemainingInWaitingPeriod?: number;
    };
  }
}
```

**Triggered By:** App launch, Claims screen, Home screen

---

### 4.2 Cancel Subscription

**Purpose:** Request subscription cancellation

| Field | Value |
|-------|-------|
| **Endpoint** | `POST /subscriptions/me/cancel` |
| **Authentication** | Bearer Token (User) |

**Request Body:**

```typescript
{
  reason?: string;                    // Optional cancellation reason
  feedback?: string;                  // Optional feedback
}
```

**Success Response (200):**

```typescript
{
  success: true,
  data: {
    cancelled: true;
    cancelAtPeriodEnd: true;          // Membership continues until period end
    currentPeriodEnd: string;         // When coverage ends
    message: string;
  }
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 403 | `CANCELLATION_RESTRICTED` | Cannot cancel due to 90-day post-payout restriction |

**Error Response Body (403):**

```typescript
{
  success: false,
  error: {
    code: "CANCELLATION_RESTRICTED",
    message: "You cannot cancel your subscription until 90 days after your last claim payout.",
    details: {
      restrictionEndDate: string;     // ISO 8601
      daysRemaining: number;
      lastPayoutDate: string;
    }
  }
}
```

**Business Rules:**
- 90-day cancellation restriction after any claim payout
- Membership continues until end of current billing period
- No partial refunds

**Triggered By:** Settings > Manage Subscription > Cancel

---

### 4.3 Check Cancellation Eligibility

**Purpose:** Check if user can cancel (before showing cancel UI)

| Field | Value |
|-------|-------|
| **Endpoint** | `GET /subscriptions/me/can-cancel` |
| **Authentication** | Bearer Token (User) |

**Success Response (200):**

```typescript
{
  success: true,
  data: {
    canCancel: boolean;
    restrictionEndDate?: string;      // Present if cannot cancel
    daysRemaining?: number;           // Days until can cancel
    reason?: string;                  // Explanation if cannot cancel
  }
}
```

**Triggered By:** Settings screen (to show/hide cancel option)

---

## 5. Claims APIs

### 5.1 Submit Claim

**Purpose:** Submit a new parking ticket claim

| Field | Value |
|-------|-------|
| **Endpoint** | `POST /claims` |
| **Authentication** | Bearer Token (User) |

**Request Body:**

```typescript
{
  ticketNumber: string;           // Required - Citation number
  ticketDate: string;             // Required - YYYY-MM-DD format
  city: string;                   // Required
  state: string;                  // Required - 2-letter code
  violationType: string;          // Required - See violation types
  amount: number;                 // Required - Ticket amount in dollars
  imageUri: string;               // Required - Ticket photo (base64 or uploaded URL)

  // Optional fields from AI extraction
  issueTime?: string;
  locationOfViolation?: string;
  meterNumber?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  plateNumber?: string;
  plateState?: string;
  vehicleCodeSection?: string;
  dueDate?: string;

  // Contest intention
  wantsToContest?: boolean;
  contestReasons?: string[];      // Array of ContestReason codes
}
```

**Violation Types (violationType values):**

| Code | Description | Covered |
|------|-------------|---------|
| `parking_meter` | Expired Meter | Yes |
| `street_cleaning` | Street Cleaning | Yes |
| `no_parking` | No Parking Zone | Yes |
| `loading_zone` | Loading Zone | Yes |
| `hydrant` | Fire Hydrant | **NO - Absolute Exclusion** |
| `double_parking` | Double Parking | **NO - Absolute Exclusion** |
| `expired_registration` | Expired Registration | No |
| `other` | Other | No (manual review) |

**Success Response (201):**

```typescript
{
  success: true,
  data: {
    claim: Claim;                 // Full claim object
    eligibility: {
      eligible: true;
      estimatedPayout: number;    // After deductible
      deductibleRate: number;     // 0.15 or 0.20
      memberCoPay: number;
    };
  }
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | `DENIED_INACTIVE_SUBSCRIPTION` | Subscription not active (D004) |
| 400 | `DENIED_COVERAGE_EXCEEDED` | Annual cap or ticket limit reached (D003) |
| 400 | `DENIED_EXCLUDED_VIOLATION` | Violation type not covered (D001) |
| 400 | `DENIED_LATE_SUBMISSION` | Outside 5-day submission window (D002) |
| 400 | `DENIED_DUPLICATE` | Claim already exists for this ticket (D005) |
| 400 | `DENIED_WAITING_PERIOD` | Ticket issued during 30-day waiting period (D011) |
| 400 | `DENIED_ABSOLUTE_EXCLUSION` | Fire hydrant/handicap/double parking (D012) |
| 400 | `PROFILE_INCOMPLETE` | Must complete profile before first claim |

**Error Response Body Example:**

```typescript
{
  success: false,
  error: {
    code: "DENIED_WAITING_PERIOD",
    message: "This ticket was issued during your 30-day waiting period.",
    details: {
      denialCode: "D011",
      waitingPeriodEndDate: "2026-02-15T00:00:00Z",
      daysRemaining: 20,
      appealable: false
    }
  }
}
```

**Business Rules:**
- 5-day submission window from ticket date
- 30-day waiting period for new members
- Profile must be completed before first claim
- Absolute exclusions (hydrant, double parking, handicap) are NEVER covered

**Triggered By:** Submit Claim screen (after photo capture/upload)

---

### 5.2 Get Claims

**Purpose:** Get all claims for current user

| Field | Value |
|-------|-------|
| **Endpoint** | `GET /claims` |
| **Authentication** | Bearer Token (User) |

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Optional - Filter by status |
| `limit` | number | Optional - Pagination (default 20) |
| `offset` | number | Optional - Pagination offset |

**Success Response (200):**

```typescript
{
  success: true,
  data: {
    claims: Claim[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }
}
```

**Triggered By:** Claims tab/screen

---

### 5.3 Get Claim by ID

**Purpose:** Get single claim details

| Field | Value |
|-------|-------|
| **Endpoint** | `GET /claims/{claimId}` |
| **Authentication** | Bearer Token (User) |

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `claimId` | string | Claim UUID |

**Success Response (200):**

```typescript
{
  success: true,
  data: {
    claim: Claim;
  }
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 404 | `NOT_FOUND` | Claim not found or not owned by user |

**Triggered By:** Claim detail screen, Notification deep link

---

### 5.4 Upload Claim Document

**Purpose:** Upload additional documents for a claim

| Field | Value |
|-------|-------|
| **Endpoint** | `POST /claims/{claimId}/documents` |
| **Authentication** | Bearer Token (User) |

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `claimId` | string | Claim UUID |

**Request Body:**

```typescript
{
  type: "proof_of_payment" | "contest_evidence" | "additional";
  document: string;               // Base64 encoded or presigned URL
  mimeType: string;               // e.g., "image/jpeg", "application/pdf"
  filename?: string;
}
```

**Success Response (201):**

```typescript
{
  success: true,
  data: {
    documentId: string;
    uploadedAt: string;
  }
}
```

**Triggered By:** Upload proof of payment, Contest documentation

---

## 6. Wallet & Payout APIs

### 6.1 Get Wallet

**Purpose:** Get user's wallet balance and transactions

| Field | Value |
|-------|-------|
| **Endpoint** | `GET /wallet` |
| **Authentication** | Bearer Token (User) |

**Success Response (200):**

```typescript
{
  success: true,
  data: {
    wallet: {
      balance: number;            // Available balance
      pendingPayouts: number;     // Pending claim payouts
      totalEarned: number;        // Lifetime earnings
    };
    transactions: WalletTransaction[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }
}
```

**Triggered By:** Wallet tab/screen

---

### 6.2 Request Withdrawal

**Purpose:** Withdraw funds to linked bank account

| Field | Value |
|-------|-------|
| **Endpoint** | `POST /wallet/withdraw` |
| **Authentication** | Bearer Token (User) |

**Request Body:**

```typescript
{
  amount: number;                 // Required - Amount to withdraw
  bankAccountId: string;          // Required - Linked bank account ID
}
```

**Success Response (200):**

```typescript
{
  success: true,
  data: {
    transactionId: string;
    amount: number;
    status: "pending";
    estimatedArrival: string;     // ISO 8601
  }
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | `INSUFFICIENT_BALANCE` | Balance too low |
| 400 | `MINIMUM_WITHDRAWAL` | Below minimum ($10) |
| 400 | `NO_BANK_ACCOUNT` | No linked bank account |

**Triggered By:** Wallet > Withdraw button

---

### 6.3 Add Bank Account

**Purpose:** Link a bank account for withdrawals

| Field | Value |
|-------|-------|
| **Endpoint** | `POST /wallet/bank-accounts` |
| **Authentication** | Bearer Token (User) |

**Request Body:**

```typescript
{
  accountHolderName: string;      // Required
  routingNumber: string;          // Required - 9 digits
  accountNumber: string;          // Required
  accountType: "checking" | "savings";  // Required
}
```

**Success Response (201):**

```typescript
{
  success: true,
  data: {
    bankAccount: {
      id: string;
      accountHolderName: string;
      lastFour: string;           // Last 4 digits
      accountType: string;
      isDefault: boolean;
      createdAt: string;
    };
  }
}
```

**Triggered By:** Add Bank Account screen

---

### 6.4 Get Bank Accounts

**Purpose:** Get linked bank accounts

| Field | Value |
|-------|-------|
| **Endpoint** | `GET /wallet/bank-accounts` |
| **Authentication** | Bearer Token (User) |

**Success Response (200):**

```typescript
{
  success: true,
  data: {
    bankAccounts: {
      id: string;
      accountHolderName: string;
      lastFour: string;
      accountType: string;
      isDefault: boolean;
      createdAt: string;
    }[];
  }
}
```

**Triggered By:** Wallet > Bank Accounts, Withdraw flow

---

## 7. Notification APIs

### 7.1 Trigger Notification Event

**Purpose:** Backend triggers notification delivery for claim events

| Field | Value |
|-------|-------|
| **Endpoint** | `POST /notifications/events` |
| **Authentication** | Bearer Token or API Key (internal) |

**Request Body:**

```typescript
{
  user_id: string;                    // Required
  claim_id: string;                   // Required
  event_type: ClaimNotificationEvent; // Required - See event types below
  timestamp: string;                  // Required - ISO 8601
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
```

**Event Types (event_type values):**

| Event | Push | Email | SMS |
|-------|------|-------|-----|
| `claim_submitted` | Yes | Yes | No |
| `claim_under_review` | Yes | No | No |
| `claim_approved` | Yes | Yes | No |
| `claim_paid` | Yes | Yes | Yes (if opted in) |
| `claim_denied` | Yes | Yes | No |

**Success Response (200):**

```typescript
{
  success: true,
  data: {
    notificationsSent: {
      push: boolean;
      email: boolean;
      sms: boolean;
    };
  }
}
```

**Triggered By:** Backend claim status changes (not direct app call)

---

### 7.2 Register Push Token

**Purpose:** Register device for push notifications

| Field | Value |
|-------|-------|
| **Endpoint** | `POST /notifications/tokens` |
| **Authentication** | Bearer Token (User) |

**Request Body:**

```typescript
{
  user_id: string;                // Required
  device_token: string;           // Required - Expo push token
  platform: "ios" | "android" | "web";  // Required
  token_type: "apns" | "fcm" | "expo";  // Required
  app_version?: string;
  device_id?: string;
}
```

**Success Response (200):**

```typescript
{
  success: true,
  data: {
    registered: true;
  }
}
```

**Triggered By:** App launch (after login)

---

### 7.3 Unregister Push Token

**Purpose:** Remove push token on logout

| Field | Value |
|-------|-------|
| **Endpoint** | `DELETE /notifications/tokens` |
| **Authentication** | Bearer Token (User) |

**Request Body:**

```typescript
{
  user_id: string;
  device_token: string;
}
```

**Success Response (200):**

```typescript
{
  success: true
}
```

**Triggered By:** Logout flow

---

### 7.4 Update Notification Preferences

**Purpose:** Sync notification preferences to backend

| Field | Value |
|-------|-------|
| **Endpoint** | `PUT /notifications/preferences` |
| **Authentication** | Bearer Token (User) |

**Request Body:**

```typescript
{
  user_id: string;
  preferences: {
    pushEnabled: boolean;
    emailEnabled: boolean;
    smsEnabled: boolean;          // Opt-in only
    claimSubmitted: boolean;
    claimApproved: boolean;
    claimDenied: boolean;
    claimPaid: boolean;
  };
  updated_at: string;             // ISO 8601
}
```

**Success Response (200):**

```typescript
{
  success: true
}
```

**Triggered By:** Settings > Notifications

---

### 7.5 Get Notification Preferences

**Purpose:** Fetch stored notification preferences

| Field | Value |
|-------|-------|
| **Endpoint** | `GET /notifications/preferences/{userId}` |
| **Authentication** | Bearer Token (User) |

**Success Response (200):**

```typescript
{
  success: true,
  data: {
    preferences: NotificationPreferences;
  }
}
```

**Triggered By:** Settings > Notifications (initial load)

---

## 8. Admin APIs

> **Note:** These APIs are for internal admin tools only and require admin-level authentication.

### 8.1 Update Claim Status (Admin)

**Purpose:** Admin updates claim status (approve/deny/request docs)

| Field | Value |
|-------|-------|
| **Endpoint** | `PATCH /admin/claims/{claimId}/status` |
| **Authentication** | Bearer Token (Admin) |

**Request Body:**

```typescript
{
  status: "under_review" | "approved" | "paid" | "denied";
  decisionCode?: ClaimDecisionCode;
  decisionNotes?: string;
  denialReason?: string;          // Required if status = denied
  payoutAmount?: number;          // Required if status = approved/paid
  requestProofOfPayment?: boolean;
}
```

**Success Response (200):**

```typescript
{
  success: true,
  data: {
    claim: Claim;
    notificationTriggered: boolean;
  }
}
```

**Triggered By:** Admin dashboard claim review

---

### 8.2 Request Proof of Payment (Admin)

**Purpose:** Request proof of payment for audit purposes (post-payout)

| Field | Value |
|-------|-------|
| **Endpoint** | `POST /admin/claims/{claimId}/request-proof` |
| **Authentication** | Bearer Token (Admin) |

**Request Body:**

```typescript
{
  reason: "audit" | "fraud_detection" | "abuse_prevention";
  notes?: string;
}
```

**Success Response (200):**

```typescript
{
  success: true,
  data: {
    claim: Claim;
    requestSentAt: string;
  }
}
```

**Business Rules:**
- Proof can be requested AFTER payout (pay-on-approval model)
- User is notified via push/email to upload proof

**Triggered By:** Admin dashboard audit tools

---

### 8.3 Get Audit Log (Admin)

**Purpose:** Retrieve audit log entries

| Field | Value |
|-------|-------|
| **Endpoint** | `GET /admin/audit-log` |
| **Authentication** | Bearer Token (Admin) |

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | string | Filter by user |
| `claimId` | string | Filter by claim |
| `eventType` | string | Filter by event type |
| `startDate` | string | Filter by date range |
| `endDate` | string | Filter by date range |
| `limit` | number | Pagination |
| `offset` | number | Pagination |

**Success Response (200):**

```typescript
{
  success: true,
  data: {
    entries: AuditLogEntry[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }
}
```

**Audit Event Types:**

| Event | Description |
|-------|-------------|
| `CLAIM_SUBMITTED` | New claim submitted |
| `CLAIM_APPROVED` | Claim approved |
| `CLAIM_DENIED` | Claim denied |
| `PAYOUT_INITIATED` | Payout started |
| `PAYOUT_COMPLETED` | Payout completed |
| `PROOF_OF_PAYMENT_REQUESTED` | Proof requested |
| `PROOF_OF_PAYMENT_RECEIVED` | Proof received |
| `CANCELLATION_ATTEMPTED` | User tried to cancel |
| `CANCELLATION_BLOCKED` | Cancellation blocked (90-day rule) |
| `CANCELLATION_COMPLETED` | Subscription cancelled |

**Triggered By:** Admin dashboard audit section

---

### 8.4 Update Courial Profile (Admin)

**Purpose:** Admin updates locked profile fields

| Field | Value |
|-------|-------|
| **Endpoint** | `PUT /admin/users/{userId}/profile` |
| **Authentication** | Bearer Token (Admin) |

**Request Body:**

```typescript
{
  // Only admin-editable fields
  firstName?: string;
  lastName?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  driversLicenseNumber?: string;
  dateOfBirth?: string;
  vin?: string;
  adminNotes?: string;
}
```

**Success Response (200):**

```typescript
{
  success: true,
  data: {
    user: User;
    auditLogId: string;           // Reference to audit entry
  }
}
```

**Triggered By:** Admin dashboard user management

---

## Error Response Schema

All error responses follow this structure:

```typescript
{
  success: false,
  error: {
    code: string;                 // Machine-readable error code
    message: string;              // Human-readable message
    details?: {
      field?: string;             // Field that caused error
      value?: unknown;            // Invalid value (sanitized)
      denialCode?: string;        // For claim denials (D001-D012)
      appealable?: boolean;       // If denial can be appealed
      [key: string]: unknown;
    };
  },
  meta?: {
    timestamp: string;
    requestId: string;
  }
}
```

### HTTP Status Codes

| Status | Usage |
|--------|-------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request / Validation Error / Business Rule Violation |
| 401 | Unauthorized (no/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate resource) |
| 429 | Rate Limited |
| 500 | Internal Server Error |

---

## Data Models

### User

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  profileImage?: string;
  plan: "basic" | "pro" | "professional" | null;
  subscriptionStatus: "active" | "inactive" | "cancelled";
  createdAt: string;

  // Auth
  authProvider?: "email" | "google" | "apple";
  phoneVerified?: boolean;
  phoneVerifiedAt?: string;

  // Courial Integration
  courialId?: number;             // Immutable once set
  courialIdFetchedAt?: string;
  courialIdError?: string;

  // Courial Driver Discount
  discountEligible?: boolean;
  discountPercentage?: number;
  completedRides?: number;
  discountCheckedAt?: string;

  // Cancellation Restriction
  lastPayoutDate?: string;
  cancellationRestrictionEndDate?: string;

  // Identity (required for claims)
  firstName?: string;
  lastName?: string;
  address?: UserAddress;
  driversLicenseNumber?: string;
  dateOfBirth?: string;           // MM/DD/YYYY
  vin?: string;                   // 17 characters

  // Profile Status
  profileCompleted?: boolean;
  profileLockedAt?: string;

  // Vehicles
  vehicles?: Vehicle[];

  // Notifications
  notificationPreferences?: NotificationPreferences;
}
```

### Claim

```typescript
interface Claim {
  id: string;
  userId: string;
  ticketDate: string;
  city: string;
  state: string;
  violationType: string;
  ticketNumber: string;
  amount: number;
  imageUri: string;
  status: "submitted" | "under_review" | "approved" | "paid" | "denied";
  submittedAt: string;
  updatedAt: string;

  // Denial Info
  denialReason?: string;
  decisionCode?: ClaimDecisionCode;
  decisionNotes?: string;

  // Payout Info
  payoutAmount?: number;
  payoutDate?: string;
  approvalTimestamp?: string;
  payoutTimestamp?: string;

  // Audit Fields
  proofOfPaymentRequested?: boolean;
  proofOfPaymentRequestedAt?: string;
  proofOfPaymentReceived?: boolean;
  proofOfPaymentReceivedAt?: string;

  // Contest Fields
  wantsToContest?: boolean;
  contestReasons?: ContestReason[];
  contestDocuments?: string[];
}
```

### Coverage

```typescript
interface Coverage {
  planId: "basic" | "pro" | "professional";
  annualCap: number;              // 100, 350, or 600
  usedAmount: number;
  remainingAmount: number;
  ticketsUsed: number;
  maxTickets: number;             // 12, 24, or 50
  periodStart: string;
  periodEnd: string;
}
```

### WalletTransaction

```typescript
interface WalletTransaction {
  id: string;
  type: "payout" | "withdrawal";
  amount: number;
  date: string;
  claimId?: string;
  status: "completed" | "pending" | "failed";
  description: string;
}
```

### Vehicle

```typescript
interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  isPrimary: boolean;
  addedAt: string;
  imageUrl?: string;
  imageSource?: "camera" | "gallery" | "ai_generated";
}
```

### NotificationPreferences

```typescript
interface NotificationPreferences {
  pushEnabled: boolean;           // Default: true
  emailEnabled: boolean;          // Default: true
  smsEnabled: boolean;            // Default: false (opt-in only)
  claimSubmitted: boolean;        // Default: true
  claimApproved: boolean;         // Default: true
  claimDenied: boolean;           // Default: true
  claimPaid: boolean;             // Default: true
}
```

### AuditLogEntry

```typescript
interface AuditLogEntry {
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  userId: string;
  claimId?: string;
  details: Record<string, unknown>;
  metadata?: {
    ipAddress?: string;
    deviceId?: string;
    userAgent?: string;
  };
}
```

---

## Appendix: Denial Codes

| Code | Reason | Appealable |
|------|--------|------------|
| D001 | Excluded Violation Type | No |
| D002 | Submission Deadline Exceeded (5 days) | No |
| D003 | Coverage Limit Reached | No |
| D004 | Inactive Membership | No |
| D005 | Duplicate Claim | No |
| D006 | Insufficient Documentation | Yes |
| D007 | Non-Gig Activity | Yes |
| D008 | Fraudulent Claim | Yes |
| D009 | Amount Exceeds Limit | No |
| D010 | Geographic Restriction | No |
| D011 | Waiting Period (30 days) | No |
| D012 | Absolute Exclusion (hydrant/handicap/blocking) | No |

---

## Appendix: Plan Configuration

| Plan | Monthly | Annual Cap | Max Tickets | Co-Pay |
|------|---------|------------|-------------|--------|
| Basic | $9.99 | $100 | 12/year | 20% |
| Pro | $24.99 | $350 | 24/year | 15% |
| Professional | $39.99 | $600 | 50/year | 15% |

**Courial Driver Discount:** 20% off for drivers with 5+ completed Courial orders
