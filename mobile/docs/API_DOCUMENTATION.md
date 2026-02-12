# Courial Shield Backend API & Socket Documentation

> **Version:** 1.0
> **Last Updated:** January 2026
> **Status:** Specification for Backend Development

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication APIs](#authentication-apis)
3. [User Profile APIs](#user-profile-apis)
4. [Subscription & Plans APIs](#subscription--plans-apis)
5. [Claims APIs](#claims-apis)
6. [Wallet & Transactions APIs](#wallet--transactions-apis)
7. [Vehicles APIs](#vehicles-apis)
8. [Notifications APIs](#notifications-apis)
9. [Documents APIs](#documents-apis)
10. [Socket Events Documentation](#socket-events-documentation)
11. [Webhook Integrations](#webhook-integrations)
12. [Error Codes Reference](#error-codes-reference)
13. [Data Models Reference](#data-models-reference)

---

## Overview

### Base URL
```
Production: https://api.courialshield.com/v1
Staging: https://api-staging.courialshield.com/v1
```

### Authentication
All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

### Response Format
All responses follow this structure:
```json
{
  "success": boolean,
  "data": object | array | null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  } | null,
  "meta": {
    "timestamp": "ISO8601",
    "requestId": "uuid"
  }
}
```

---

## Authentication APIs

### 1. Register User

**Purpose:** Create a new user account with email and password.

| Method | Endpoint |
|--------|----------|
| POST | `/auth/register` |

**Request Body:**
```json
{
  "email": "string (required, valid email)",
  "password": "string (required, min 8 chars)",
  "name": "string (required)",
  "phone": "string (required, E.164 format: +1XXXXXXXXXX)"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "phone": "+15551234567",
      "phoneVerified": false,
      "plan": null,
      "subscriptionStatus": "inactive",
      "profileCompleted": false,
      "createdAt": "2026-01-27T10:00:00Z"
    },
    "tokens": {
      "accessToken": "jwt_access_token",
      "refreshToken": "jwt_refresh_token",
      "expiresIn": 3600
    }
  }
}
```

**Error Responses:**
| Code | Message |
|------|---------|
| EMAIL_EXISTS | Email already registered |
| INVALID_EMAIL | Invalid email format |
| WEAK_PASSWORD | Password does not meet requirements |
| INVALID_PHONE | Invalid phone number format |

---

### 2. Login

**Purpose:** Authenticate existing user with email and password.

| Method | Endpoint |
|--------|----------|
| POST | `/auth/login` |

**Request Body:**
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "phone": "+15551234567",
      "phoneVerified": true,
      "plan": "pro",
      "subscriptionStatus": "active",
      "profileCompleted": true,
      "courialId": 12345,
      "discountEligible": true,
      "discountPercentage": 20,
      "createdAt": "2026-01-27T10:00:00Z"
    },
    "tokens": {
      "accessToken": "jwt_access_token",
      "refreshToken": "jwt_refresh_token",
      "expiresIn": 3600
    }
  }
}
```

**Error Responses:**
| Code | Message |
|------|---------|
| INVALID_CREDENTIALS | Email or password incorrect |
| ACCOUNT_DISABLED | Account has been disabled |
| EMAIL_NOT_VERIFIED | Please verify your email first |

---

### 3. Social OAuth Login

**Purpose:** Authenticate via Google or Apple OAuth.

| Method | Endpoint |
|--------|----------|
| POST | `/auth/oauth` |

**Request Body:**
```json
{
  "provider": "google | apple (required)",
  "idToken": "string (required, OAuth ID token)",
  "nonce": "string (required for Apple)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": { /* User object */ },
    "tokens": { /* Token object */ },
    "isNewUser": true
  }
}
```

---

### 4. Send OTP

**Purpose:** Send OTP code to user's phone for verification.

| Method | Endpoint |
|--------|----------|
| POST | `/auth/otp/send` |

**Authentication:** Required

**Request Body:**
```json
{
  "phone": "string (required, E.164 format)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "expiresIn": 300,
    "retryAfter": 60
  }
}
```

**Error Responses:**
| Code | Message |
|------|---------|
| RATE_LIMITED | Too many OTP requests, try again later |
| INVALID_PHONE | Invalid phone number |

---

### 5. Verify OTP

**Purpose:** Verify the OTP code sent to user's phone.

| Method | Endpoint |
|--------|----------|
| POST | `/auth/otp/verify` |

**Authentication:** Required

**Request Body:**
```json
{
  "phone": "string (required)",
  "code": "string (required, 6 digits)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "phoneVerified": true,
    "phoneVerifiedAt": "2026-01-27T10:05:00Z"
  }
}
```

**Error Responses:**
| Code | Message |
|------|---------|
| INVALID_OTP | Invalid or expired OTP code |
| MAX_ATTEMPTS | Maximum verification attempts exceeded |

---

### 6. Refresh Token

**Purpose:** Refresh expired access token.

| Method | Endpoint |
|--------|----------|
| POST | `/auth/refresh` |

**Request Body:**
```json
{
  "refreshToken": "string (required)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "new_jwt_access_token",
    "refreshToken": "new_jwt_refresh_token",
    "expiresIn": 3600
  }
}
```

---

### 7. Logout

**Purpose:** Invalidate current session and tokens.

| Method | Endpoint |
|--------|----------|
| POST | `/auth/logout` |

**Authentication:** Required

**Request Body:**
```json
{
  "pushToken": "string (optional, to unregister)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": null
}
```

---

### 8. Password Reset Request

**Purpose:** Request password reset email.

| Method | Endpoint |
|--------|----------|
| POST | `/auth/password/reset-request` |

**Request Body:**
```json
{
  "email": "string (required)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "If account exists, reset email sent"
  }
}
```

---

### 9. Password Reset

**Purpose:** Reset password with token from email.

| Method | Endpoint |
|--------|----------|
| POST | `/auth/password/reset` |

**Request Body:**
```json
{
  "token": "string (required, from email)",
  "newPassword": "string (required, min 8 chars)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Password reset successful"
  }
}
```

---

## User Profile APIs

### 1. Get Current User Profile

**Purpose:** Retrieve complete profile of authenticated user.

| Method | Endpoint |
|--------|----------|
| GET | `/users/me` |

**Authentication:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "phone": "+15551234567",
    "profileImage": "https://storage.example.com/profiles/uuid.jpg",
    "plan": "pro",
    "subscriptionStatus": "active",
    "phoneVerified": true,
    "phoneVerifiedAt": "2026-01-27T10:05:00Z",
    "courialId": 12345,
    "discountEligible": true,
    "discountPercentage": 20,
    "completedRides": 15,
    "firstName": "John",
    "lastName": "Doe",
    "address": {
      "street": "123 Main St",
      "unit": "Apt 4B",
      "city": "New York",
      "state": "NY",
      "zip": "10001"
    },
    "driversLicenseNumber": "D12345678",
    "dateOfBirth": "01/15/1990",
    "profileCompleted": true,
    "profileLockedAt": "2026-01-27T10:30:00Z",
    "lastPayoutDate": "2026-01-20T15:00:00Z",
    "cancellationRestrictionEndDate": "2026-04-20T15:00:00Z",
    "vehicles": [
      {
        "id": "uuid",
        "make": "Toyota",
        "model": "Camry",
        "year": 2022,
        "color": "Silver",
        "licensePlate": "ABC1234",
        "isPrimary": true,
        "imageUrl": "https://storage.example.com/vehicles/uuid.jpg"
      }
    ],
    "notificationPreferences": {
      "pushEnabled": true,
      "emailEnabled": true,
      "smsEnabled": false,
      "claimSubmitted": true,
      "claimApproved": true,
      "claimDenied": true,
      "claimPaid": true
    },
    "createdAt": "2026-01-15T08:00:00Z"
  }
}
```

---

### 2. Update User Profile

**Purpose:** Update user profile fields. Some fields become locked after profile completion.

| Method | Endpoint |
|--------|----------|
| PATCH | `/users/me` |

**Authentication:** Required

**Request Body (all fields optional):**
```json
{
  "name": "string",
  "phone": "string (E.164)",
  "profileImage": "string (base64 or URL)",
  "firstName": "string (locked after profile completion)",
  "lastName": "string (locked after profile completion)",
  "address": {
    "street": "string",
    "unit": "string (optional)",
    "city": "string",
    "state": "string (2-letter code)",
    "zip": "string (5 digits)"
  },
  "driversLicenseNumber": "string (locked after profile completion)",
  "dateOfBirth": "string (MM/DD/YYYY, locked after profile completion)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    /* Updated user object */
  }
}
```

**Error Responses:**
| Code | Message |
|------|---------|
| FIELD_LOCKED | This field cannot be modified after profile completion |
| INVALID_ADDRESS | Invalid address format |
| INVALID_DOB | Invalid date of birth format |

---

### 3. Complete Profile

**Purpose:** Mark profile as complete and lock identity fields.

| Method | Endpoint |
|--------|----------|
| POST | `/users/me/complete-profile` |

**Authentication:** Required

**Request Body:**
```json
{
  "firstName": "string (required)",
  "lastName": "string (required)",
  "address": {
    "street": "string (required)",
    "unit": "string (optional)",
    "city": "string (required)",
    "state": "string (required)",
    "zip": "string (required)"
  },
  "driversLicenseNumber": "string (required)",
  "dateOfBirth": "string (required, MM/DD/YYYY)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "profileCompleted": true,
    "profileLockedAt": "2026-01-27T10:30:00Z"
  }
}
```

---

### 4. Resolve Courial ID

**Purpose:** Link Courial Driver account by email. Courial ID is immutable once set.

| Method | Endpoint |
|--------|----------|
| POST | `/users/me/courial-link` |

**Authentication:** Required

**Request Body:**
```json
{
  "email": "string (required, Courial account email)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "courialId": 12345,
    "courialIdFetchedAt": "2026-01-27T10:00:00Z",
    "discountEligible": true,
    "discountPercentage": 20,
    "completedRides": 15
  }
}
```

**Error Responses:**
| Code | Message |
|------|---------|
| COURIAL_NOT_FOUND | No Courial account found with this email |
| COURIAL_ALREADY_LINKED | Courial ID already linked to this account |
| COURIAL_API_ERROR | Unable to connect to Courial services |

---

### 5. Check Discount Eligibility

**Purpose:** Refresh discount eligibility status from Courial.

| Method | Endpoint |
|--------|----------|
| GET | `/users/me/discount-eligibility` |

**Authentication:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "discountEligible": true,
    "discountPercentage": 20,
    "completedRides": 15,
    "requiredRides": 5,
    "checkedAt": "2026-01-27T10:00:00Z"
  }
}
```

---

### 6. Delete Account

**Purpose:** Request account deletion (GDPR compliance).

| Method | Endpoint |
|--------|----------|
| DELETE | `/users/me` |

**Authentication:** Required

**Request Body:**
```json
{
  "confirmPassword": "string (required)",
  "reason": "string (optional)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "scheduledDeletionDate": "2026-02-27T00:00:00Z",
    "message": "Account scheduled for deletion in 30 days"
  }
}
```

---

## Subscription & Plans APIs

### 1. Get Available Plans

**Purpose:** Retrieve all available subscription plans with pricing.

| Method | Endpoint |
|--------|----------|
| GET | `/plans` |

**Authentication:** Optional (shows discount pricing if authenticated with eligible user)

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| billingPeriod | string | `monthly` or `annual` (default: monthly) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": "basic",
        "name": "Basic",
        "monthlyPrice": 9.99,
        "annualPrice": 99.99,
        "annualDiscount": 17,
        "courialDiscountPrice": 7.99,
        "annualCap": 100,
        "maxTicketsPerYear": 12,
        "copayPercentage": 20,
        "features": [
          "$100 annual coverage cap",
          "12 tickets per year",
          "20% member co-pay",
          "Email support"
        ],
        "addOns": [],
        "popular": false
      },
      {
        "id": "pro",
        "name": "Pro",
        "monthlyPrice": 24.99,
        "annualPrice": 249.99,
        "annualDiscount": 17,
        "courialDiscountPrice": 19.99,
        "annualCap": 350,
        "maxTicketsPerYear": 24,
        "copayPercentage": 15,
        "features": [
          "$350 annual coverage cap",
          "24 tickets per year",
          "15% member co-pay",
          "Priority support",
          "Expedited claims"
        ],
        "addOns": ["document_scanning", "priority_review"],
        "popular": true
      },
      {
        "id": "professional",
        "name": "Professional",
        "monthlyPrice": 39.99,
        "annualPrice": 399.99,
        "annualDiscount": 17,
        "courialDiscountPrice": 31.99,
        "annualCap": 600,
        "maxTicketsPerYear": 50,
        "copayPercentage": 15,
        "features": [
          "$600 annual coverage cap",
          "50 tickets per year",
          "15% member co-pay",
          "24/7 support",
          "Expedited claims",
          "Dedicated account manager"
        ],
        "addOns": ["document_scanning", "priority_review", "legal_assistance"],
        "popular": false
      }
    ],
    "discountApplied": true,
    "discountPercentage": 20
  }
}
```

---

### 2. Get Current Subscription

**Purpose:** Get user's current subscription details and coverage status.

| Method | Endpoint |
|--------|----------|
| GET | `/subscriptions/current` |

**Authentication:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "uuid",
      "planId": "pro",
      "planName": "Pro",
      "status": "active",
      "billingPeriod": "monthly",
      "currentPeriodStart": "2026-01-01T00:00:00Z",
      "currentPeriodEnd": "2026-02-01T00:00:00Z",
      "cancelAtPeriodEnd": false,
      "price": 24.99,
      "discountApplied": true,
      "finalPrice": 19.99,
      "waitingPeriodEnds": "2026-01-31T00:00:00Z",
      "isInWaitingPeriod": false,
      "createdAt": "2026-01-01T00:00:00Z"
    },
    "coverage": {
      "planId": "pro",
      "annualCap": 350,
      "usedAmount": 125.50,
      "remainingAmount": 224.50,
      "ticketsUsed": 3,
      "maxTickets": 24,
      "periodStart": "2026-01-01T00:00:00Z",
      "periodEnd": "2026-12-31T23:59:59Z"
    },
    "addOns": [
      {
        "id": "priority_review",
        "name": "Priority Review",
        "enabled": true,
        "price": 4.99
      }
    ]
  }
}
```

---

### 3. Subscribe to Plan

**Purpose:** Create new subscription (integrates with RevenueCat).

| Method | Endpoint |
|--------|----------|
| POST | `/subscriptions` |

**Authentication:** Required

**Request Body:**
```json
{
  "planId": "basic | pro | professional (required)",
  "billingPeriod": "monthly | annual (required)",
  "revenueCatTransactionId": "string (required, from RevenueCat purchase)",
  "addOns": ["string"] // optional list of add-on IDs
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "uuid",
      "planId": "pro",
      "status": "active",
      "waitingPeriodEnds": "2026-02-26T00:00:00Z",
      "isInWaitingPeriod": true
    },
    "coverage": {
      /* Coverage object */
    }
  }
}
```

**Error Responses:**
| Code | Message |
|------|---------|
| INVALID_PLAN | Invalid plan ID |
| PAYMENT_FAILED | Payment processing failed |
| ALREADY_SUBSCRIBED | User already has active subscription |

---

### 4. Change Plan

**Purpose:** Upgrade or downgrade subscription plan.

| Method | Endpoint |
|--------|----------|
| POST | `/subscriptions/change` |

**Authentication:** Required

**Request Body:**
```json
{
  "newPlanId": "string (required)",
  "billingPeriod": "monthly | annual (optional, keep current if not provided)",
  "revenueCatTransactionId": "string (required for upgrades)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "subscription": {
      /* Updated subscription */
    },
    "prorationAmount": -15.00,
    "effectiveDate": "2026-02-01T00:00:00Z"
  }
}
```

---

### 5. Cancel Subscription

**Purpose:** Cancel subscription at end of billing period.

| Method | Endpoint |
|--------|----------|
| POST | `/subscriptions/cancel` |

**Authentication:** Required

**Request Body:**
```json
{
  "reason": "string (optional)",
  "feedback": "string (optional)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "cancelAtPeriodEnd": true,
    "effectiveCancelDate": "2026-02-01T00:00:00Z",
    "message": "Subscription will remain active until end of billing period"
  }
}
```

**Error Responses:**
| Code | Message |
|------|---------|
| CANCELLATION_RESTRICTED | Cannot cancel within 90 days of payout |
| RESTRICTION_END_DATE | Cancellation restricted until {date} |

---

### 6. Restore Subscription

**Purpose:** Restore a cancelled subscription before period ends.

| Method | Endpoint |
|--------|----------|
| POST | `/subscriptions/restore` |

**Authentication:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "cancelAtPeriodEnd": false,
      "status": "active"
    }
  }
}
```

---

### 7. Toggle Add-On

**Purpose:** Enable or disable a subscription add-on.

| Method | Endpoint |
|--------|----------|
| POST | `/subscriptions/addons` |

**Authentication:** Required

**Request Body:**
```json
{
  "addOnId": "string (required)",
  "enabled": "boolean (required)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "addOn": {
      "id": "priority_review",
      "enabled": true,
      "effectiveDate": "2026-01-27T00:00:00Z"
    }
  }
}
```

---

## Claims APIs

### 1. Submit Claim

**Purpose:** Submit a new parking ticket claim for reimbursement.

| Method | Endpoint |
|--------|----------|
| POST | `/claims` |

**Authentication:** Required

**Request Body:**
```json
{
  "ticketDate": "string (required, ISO date YYYY-MM-DD)",
  "ticketTime": "string (optional, HH:MM)",
  "city": "string (required)",
  "state": "string (required, 2-letter code)",
  "violationType": "string (required, see violation types)",
  "ticketNumber": "string (required)",
  "amount": "number (required, ticket amount in USD)",
  "vehicleId": "string (required, UUID of registered vehicle)",
  "imageUri": "string (required, uploaded image URL)",
  "additionalImages": ["string"] // optional additional image URLs
}
```

**Violation Types:**
- `parking_meter`
- `street_cleaning`
- `no_parking`
- `hydrant` (excluded - will be denied)
- `loading_zone`
- `double_parking` (excluded - will be denied)
- `expired_registration` (excluded)
- `other`

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "claim": {
      "id": "uuid",
      "userId": "uuid",
      "ticketDate": "2026-01-25",
      "ticketTime": "14:30",
      "city": "New York",
      "state": "NY",
      "violationType": "parking_meter",
      "ticketNumber": "NYC123456",
      "amount": 65.00,
      "imageUri": "https://storage.example.com/claims/uuid/ticket.jpg",
      "status": "submitted",
      "submittedAt": "2026-01-27T10:00:00Z",
      "updatedAt": "2026-01-27T10:00:00Z",
      "estimatedPayout": 55.25,
      "copayAmount": 9.75
    },
    "eligibility": {
      "eligible": true,
      "coverageRemaining": 224.50,
      "ticketsRemaining": 21
    }
  }
}
```

**Error Responses:**
| Code | Message |
|------|---------|
| INACTIVE_SUBSCRIPTION | No active subscription found |
| IN_WAITING_PERIOD | Cannot submit claims during 30-day waiting period |
| COVERAGE_EXCEEDED | Annual coverage limit reached |
| TICKET_LIMIT_EXCEEDED | Maximum tickets for year reached |
| EXCLUDED_VIOLATION | This violation type is not covered |
| LATE_SUBMISSION | Ticket must be submitted within 5 days |
| DUPLICATE_CLAIM | Claim already exists for this ticket |
| INVALID_VEHICLE | Vehicle not registered to account |

---

### 2. Get All Claims

**Purpose:** Retrieve user's claim history with filtering options.

| Method | Endpoint |
|--------|----------|
| GET | `/claims` |

**Authentication:** Required

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status: `submitted`, `under_review`, `approved`, `paid`, `denied` |
| startDate | string | Filter claims from this date (ISO) |
| endDate | string | Filter claims until this date (ISO) |
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20, max: 100) |
| sortBy | string | Sort field: `submittedAt`, `amount`, `status` |
| sortOrder | string | `asc` or `desc` (default: desc) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "claims": [
      {
        "id": "uuid",
        "ticketDate": "2026-01-25",
        "city": "New York",
        "state": "NY",
        "violationType": "parking_meter",
        "ticketNumber": "NYC123456",
        "amount": 65.00,
        "status": "paid",
        "submittedAt": "2026-01-25T10:00:00Z",
        "payoutAmount": 55.25,
        "payoutDate": "2026-01-26T15:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

---

### 3. Get Claim Details

**Purpose:** Retrieve detailed information for a specific claim.

| Method | Endpoint |
|--------|----------|
| GET | `/claims/{claimId}` |

**Authentication:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "ticketDate": "2026-01-25",
    "ticketTime": "14:30",
    "city": "New York",
    "state": "NY",
    "violationType": "parking_meter",
    "ticketNumber": "NYC123456",
    "amount": 65.00,
    "imageUri": "https://storage.example.com/claims/uuid/ticket.jpg",
    "additionalImages": [],
    "status": "paid",
    "submittedAt": "2026-01-25T10:00:00Z",
    "updatedAt": "2026-01-26T15:00:00Z",
    "vehicle": {
      "id": "uuid",
      "make": "Toyota",
      "model": "Camry",
      "year": 2022,
      "licensePlate": "ABC1234"
    },
    "approvalTimestamp": "2026-01-26T12:00:00Z",
    "payoutTimestamp": "2026-01-26T15:00:00Z",
    "payoutAmount": 55.25,
    "copayAmount": 9.75,
    "decisionCode": "APPROVED_STANDARD",
    "decisionNotes": null,
    "denialReason": null,
    "proofOfPaymentRequested": false,
    "proofOfPaymentReceived": false,
    "wantsToContest": false,
    "contestReasons": [],
    "contestDocuments": [],
    "timeline": [
      {
        "status": "submitted",
        "timestamp": "2026-01-25T10:00:00Z",
        "note": "Claim submitted"
      },
      {
        "status": "under_review",
        "timestamp": "2026-01-25T10:05:00Z",
        "note": "Claim under review"
      },
      {
        "status": "approved",
        "timestamp": "2026-01-26T12:00:00Z",
        "note": "Claim approved"
      },
      {
        "status": "paid",
        "timestamp": "2026-01-26T15:00:00Z",
        "note": "Payout of $55.25 added to wallet"
      }
    ]
  }
}
```

---

### 4. Upload Claim Document

**Purpose:** Upload additional documents for a claim (e.g., proof of payment).

| Method | Endpoint |
|--------|----------|
| POST | `/claims/{claimId}/documents` |

**Authentication:** Required

**Request Body (multipart/form-data):**
| Field | Type | Description |
|-------|------|-------------|
| file | file | Image or PDF file (max 10MB) |
| documentType | string | `ticket_image`, `proof_of_payment`, `contest_evidence` |

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "documentId": "uuid",
    "documentUrl": "https://storage.example.com/claims/uuid/doc.jpg",
    "documentType": "proof_of_payment",
    "uploadedAt": "2026-01-27T10:00:00Z"
  }
}
```

---

### 5. Contest Denied Claim

**Purpose:** Submit a contest/appeal for a denied claim.

| Method | Endpoint |
|--------|----------|
| POST | `/claims/{claimId}/contest` |

**Authentication:** Required

**Request Body:**
```json
{
  "reasons": ["string (required, array of contest reasons)"],
  "additionalNotes": "string (optional)",
  "supportingDocuments": ["string"] // optional document URLs
}
```

**Contest Reasons:**
- `incorrect_denial_reason`
- `documentation_not_reviewed`
- `special_circumstances`
- `policy_misinterpretation`
- `other`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "contestId": "uuid",
    "claimId": "uuid",
    "status": "contest_submitted",
    "submittedAt": "2026-01-27T10:00:00Z"
  }
}
```

---

### 6. Check Claim Eligibility

**Purpose:** Pre-check if a claim would be eligible before submission.

| Method | Endpoint |
|--------|----------|
| POST | `/claims/check-eligibility` |

**Authentication:** Required

**Request Body:**
```json
{
  "ticketDate": "string (required, ISO date)",
  "violationType": "string (required)",
  "amount": "number (required)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "eligible": true,
    "warnings": [],
    "estimatedPayout": 55.25,
    "copayAmount": 9.75,
    "coverageRemaining": 224.50,
    "ticketsRemaining": 21
  }
}
```

Or if ineligible:
```json
{
  "success": true,
  "data": {
    "eligible": false,
    "denialCode": "DENIED_EXCLUDED_VIOLATION",
    "denialReason": "Fire hydrant violations are not covered under any plan",
    "warnings": ["This violation type is an absolute exclusion"]
  }
}
```

---

## Wallet & Transactions APIs

### 1. Get Wallet

**Purpose:** Retrieve user's wallet balance and recent transactions.

| Method | Endpoint |
|--------|----------|
| GET | `/wallet` |

**Authentication:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "balance": 125.50,
    "pendingPayouts": 55.25,
    "lifetimePayouts": 450.75,
    "totalWithdrawals": 325.25
  }
}
```

---

### 2. Get Transaction History

**Purpose:** Retrieve wallet transaction history.

| Method | Endpoint |
|--------|----------|
| GET | `/wallet/transactions` |

**Authentication:** Required

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | Filter by `payout` or `withdrawal` |
| status | string | Filter by `completed`, `pending`, `failed` |
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "uuid",
        "type": "payout",
        "amount": 55.25,
        "date": "2026-01-26T15:00:00Z",
        "status": "completed",
        "description": "Claim #NYC123456 payout",
        "claimId": "uuid"
      },
      {
        "id": "uuid",
        "type": "withdrawal",
        "amount": 100.00,
        "date": "2026-01-20T10:00:00Z",
        "status": "completed",
        "description": "Bank withdrawal to ****1234",
        "bankAccountLast4": "1234"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "totalPages": 1
    }
  }
}
```

---

### 3. Request Withdrawal

**Purpose:** Initiate withdrawal from wallet to linked bank account.

| Method | Endpoint |
|--------|----------|
| POST | `/wallet/withdraw` |

**Authentication:** Required

**Request Body:**
```json
{
  "amount": "number (required, min $10.00)",
  "bankAccountId": "string (required)"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "withdrawalId": "uuid",
    "amount": 100.00,
    "status": "pending",
    "estimatedArrival": "2026-01-30T00:00:00Z",
    "bankAccountLast4": "1234"
  }
}
```

**Error Responses:**
| Code | Message |
|------|---------|
| INSUFFICIENT_BALANCE | Withdrawal amount exceeds available balance |
| MINIMUM_WITHDRAWAL | Minimum withdrawal is $10.00 |
| NO_BANK_ACCOUNT | No bank account linked |
| BANK_NOT_VERIFIED | Bank account not verified |

---

### 4. Get Bank Accounts

**Purpose:** Retrieve user's linked bank accounts.

| Method | Endpoint |
|--------|----------|
| GET | `/wallet/bank-accounts` |

**Authentication:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "bankAccounts": [
      {
        "id": "uuid",
        "bankName": "Chase",
        "accountType": "checking",
        "last4": "1234",
        "isDefault": true,
        "verified": true,
        "addedAt": "2026-01-15T10:00:00Z"
      }
    ]
  }
}
```

---

### 5. Add Bank Account

**Purpose:** Link a new bank account for withdrawals (via Stripe/Plaid).

| Method | Endpoint |
|--------|----------|
| POST | `/wallet/bank-accounts` |

**Authentication:** Required

**Request Body:**
```json
{
  "plaidPublicToken": "string (required, from Plaid Link)",
  "plaidAccountId": "string (required)",
  "setAsDefault": "boolean (optional, default true)"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "bankAccount": {
      "id": "uuid",
      "bankName": "Chase",
      "accountType": "checking",
      "last4": "1234",
      "isDefault": true,
      "verified": true
    }
  }
}
```

---

### 6. Remove Bank Account

**Purpose:** Remove a linked bank account.

| Method | Endpoint |
|--------|----------|
| DELETE | `/wallet/bank-accounts/{accountId}` |

**Authentication:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "data": null
}
```

---

## Vehicles APIs

### 1. Get Vehicles

**Purpose:** Retrieve user's registered vehicles.

| Method | Endpoint |
|--------|----------|
| GET | `/vehicles` |

**Authentication:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "vehicles": [
      {
        "id": "uuid",
        "make": "Toyota",
        "model": "Camry",
        "year": 2022,
        "color": "Silver",
        "licensePlate": "ABC1234",
        "isPrimary": true,
        "imageUrl": "https://storage.example.com/vehicles/uuid.jpg",
        "imageSource": "camera",
        "addedAt": "2026-01-15T10:00:00Z"
      }
    ]
  }
}
```

---

### 2. Add Vehicle

**Purpose:** Register a new vehicle to user's account.

| Method | Endpoint |
|--------|----------|
| POST | `/vehicles` |

**Authentication:** Required

**Request Body:**
```json
{
  "make": "string (required)",
  "model": "string (required)",
  "year": "number (required, 1990-2027)",
  "color": "string (required)",
  "licensePlate": "string (required)",
  "isPrimary": "boolean (optional, default false)",
  "imageUri": "string (optional, base64 or URL)"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "vehicle": {
      "id": "uuid",
      "make": "Toyota",
      "model": "Camry",
      "year": 2022,
      "color": "Silver",
      "licensePlate": "ABC1234",
      "isPrimary": true,
      "imageUrl": "https://storage.example.com/vehicles/uuid.jpg",
      "addedAt": "2026-01-27T10:00:00Z"
    }
  }
}
```

**Error Responses:**
| Code | Message |
|------|---------|
| DUPLICATE_PLATE | Vehicle with this license plate already exists |
| MAX_VEHICLES | Maximum 5 vehicles allowed per account |

---

### 3. Update Vehicle

**Purpose:** Update vehicle details.

| Method | Endpoint |
|--------|----------|
| PATCH | `/vehicles/{vehicleId}` |

**Authentication:** Required

**Request Body (all optional):**
```json
{
  "color": "string",
  "licensePlate": "string",
  "isPrimary": "boolean",
  "imageUri": "string"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "vehicle": {
      /* Updated vehicle object */
    }
  }
}
```

---

### 4. Delete Vehicle

**Purpose:** Remove a vehicle from user's account.

| Method | Endpoint |
|--------|----------|
| DELETE | `/vehicles/{vehicleId}` |

**Authentication:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "data": null
}
```

**Error Responses:**
| Code | Message |
|------|---------|
| VEHICLE_HAS_CLAIMS | Cannot delete vehicle with pending claims |
| LAST_VEHICLE | Cannot delete only vehicle |

---

## Notifications APIs

### 1. Register Push Token

**Purpose:** Register device push notification token.

| Method | Endpoint |
|--------|----------|
| POST | `/notifications/push-token` |

**Authentication:** Required

**Request Body:**
```json
{
  "token": "string (required, Expo push token)",
  "platform": "ios | android (required)",
  "deviceId": "string (optional, unique device identifier)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "registered": true
  }
}
```

---

### 2. Unregister Push Token

**Purpose:** Unregister device push token (on logout).

| Method | Endpoint |
|--------|----------|
| DELETE | `/notifications/push-token` |

**Authentication:** Required

**Request Body:**
```json
{
  "token": "string (required)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": null
}
```

---

### 3. Get Notifications

**Purpose:** Retrieve user's notification history.

| Method | Endpoint |
|--------|----------|
| GET | `/notifications` |

**Authentication:** Required

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| unreadOnly | boolean | Only return unread notifications |
| page | number | Page number |
| limit | number | Items per page |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "title": "Claim Approved!",
        "message": "Your claim #NYC123456 has been approved. $55.25 added to your wallet.",
        "type": "claim_update",
        "read": false,
        "data": {
          "claimId": "uuid",
          "action": "view_claim"
        },
        "createdAt": "2026-01-26T12:00:00Z"
      }
    ],
    "unreadCount": 3,
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15
    }
  }
}
```

---

### 4. Mark Notification Read

**Purpose:** Mark a single notification as read.

| Method | Endpoint |
|--------|----------|
| PATCH | `/notifications/{notificationId}/read` |

**Authentication:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "read": true
  }
}
```

---

### 5. Mark All Notifications Read

**Purpose:** Mark all notifications as read.

| Method | Endpoint |
|--------|----------|
| POST | `/notifications/read-all` |

**Authentication:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "markedCount": 5
  }
}
```

---

### 6. Get Notification Preferences

**Purpose:** Retrieve user's notification preferences.

| Method | Endpoint |
|--------|----------|
| GET | `/notifications/preferences` |

**Authentication:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "pushEnabled": true,
    "emailEnabled": true,
    "smsEnabled": false,
    "claimSubmitted": true,
    "claimApproved": true,
    "claimDenied": true,
    "claimPaid": true,
    "coverageWarning": true,
    "promotions": false
  }
}
```

---

### 7. Update Notification Preferences

**Purpose:** Update notification preferences.

| Method | Endpoint |
|--------|----------|
| PATCH | `/notifications/preferences` |

**Authentication:** Required

**Request Body (all optional):**
```json
{
  "pushEnabled": "boolean",
  "emailEnabled": "boolean",
  "smsEnabled": "boolean",
  "claimSubmitted": "boolean",
  "claimApproved": "boolean",
  "claimDenied": "boolean",
  "claimPaid": "boolean",
  "coverageWarning": "boolean",
  "promotions": "boolean"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    /* Updated preferences object */
  }
}
```

---

## Documents APIs

### 1. Upload Document

**Purpose:** Upload a document/image to storage.

| Method | Endpoint |
|--------|----------|
| POST | `/documents/upload` |

**Authentication:** Required

**Request Body (multipart/form-data):**
| Field | Type | Description |
|-------|------|-------------|
| file | file | Image (JPEG, PNG) or PDF (max 10MB) |
| purpose | string | `claim_ticket`, `proof_of_payment`, `vehicle_image`, `profile_image` |

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "documentId": "uuid",
    "url": "https://storage.example.com/documents/uuid.jpg",
    "mimeType": "image/jpeg",
    "size": 245678,
    "uploadedAt": "2026-01-27T10:00:00Z"
  }
}
```

---

### 2. Get Document

**Purpose:** Retrieve document metadata and signed URL.

| Method | Endpoint |
|--------|----------|
| GET | `/documents/{documentId}` |

**Authentication:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "documentId": "uuid",
    "url": "https://storage.example.com/documents/uuid.jpg?signed=...",
    "expiresAt": "2026-01-27T11:00:00Z"
  }
}
```

---

### 3. Delete Document

**Purpose:** Delete an uploaded document.

| Method | Endpoint |
|--------|----------|
| DELETE | `/documents/{documentId}` |

**Authentication:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "data": null
}
```

---

## Socket Events Documentation

### Connection

**WebSocket URL:**
```
wss://api.courialshield.com/ws
```

**Connection Headers:**
```
Authorization: Bearer <access_token>
```

**Connection Query Parameters:**
```
?userId={userId}&deviceId={deviceId}
```

---

### Server-to-Client Events

#### 1. `claim:status_updated`

**Triggered:** When a claim's status changes.

**Payload:**
```json
{
  "event": "claim:status_updated",
  "data": {
    "claimId": "uuid",
    "previousStatus": "under_review",
    "newStatus": "approved",
    "decisionCode": "APPROVED_STANDARD",
    "payoutAmount": 55.25,
    "timestamp": "2026-01-26T12:00:00Z"
  }
}
```

---

#### 2. `claim:payout_processed`

**Triggered:** When claim payout is added to wallet.

**Payload:**
```json
{
  "event": "claim:payout_processed",
  "data": {
    "claimId": "uuid",
    "payoutAmount": 55.25,
    "newWalletBalance": 180.75,
    "transactionId": "uuid",
    "timestamp": "2026-01-26T15:00:00Z"
  }
}
```

---

#### 3. `claim:proof_requested`

**Triggered:** When admin requests proof of payment for audit.

**Payload:**
```json
{
  "event": "claim:proof_requested",
  "data": {
    "claimId": "uuid",
    "requestedAt": "2026-01-27T10:00:00Z",
    "deadline": "2026-02-03T10:00:00Z"
  }
}
```

---

#### 4. `wallet:balance_updated`

**Triggered:** When wallet balance changes.

**Payload:**
```json
{
  "event": "wallet:balance_updated",
  "data": {
    "previousBalance": 125.50,
    "newBalance": 180.75,
    "changeAmount": 55.25,
    "changeType": "payout",
    "timestamp": "2026-01-26T15:00:00Z"
  }
}
```

---

#### 5. `wallet:withdrawal_completed`

**Triggered:** When a withdrawal is processed.

**Payload:**
```json
{
  "event": "wallet:withdrawal_completed",
  "data": {
    "withdrawalId": "uuid",
    "amount": 100.00,
    "status": "completed",
    "bankAccountLast4": "1234",
    "completedAt": "2026-01-30T10:00:00Z"
  }
}
```

---

#### 6. `subscription:status_changed`

**Triggered:** When subscription status changes.

**Payload:**
```json
{
  "event": "subscription:status_changed",
  "data": {
    "previousStatus": "active",
    "newStatus": "cancelled",
    "planId": "pro",
    "effectiveDate": "2026-02-01T00:00:00Z",
    "timestamp": "2026-01-27T10:00:00Z"
  }
}
```

---

#### 7. `subscription:waiting_period_ended`

**Triggered:** When 30-day waiting period ends.

**Payload:**
```json
{
  "event": "subscription:waiting_period_ended",
  "data": {
    "planId": "pro",
    "canSubmitClaims": true,
    "timestamp": "2026-02-26T00:00:00Z"
  }
}
```

---

#### 8. `coverage:warning`

**Triggered:** When coverage limits are approaching.

**Payload:**
```json
{
  "event": "coverage:warning",
  "data": {
    "warningType": "amount_threshold",
    "threshold": 80,
    "usedAmount": 280.00,
    "remainingAmount": 70.00,
    "annualCap": 350.00,
    "timestamp": "2026-01-27T10:00:00Z"
  }
}
```

---

#### 9. `notification:new`

**Triggered:** When a new notification is created.

**Payload:**
```json
{
  "event": "notification:new",
  "data": {
    "notification": {
      "id": "uuid",
      "title": "Claim Approved!",
      "message": "Your claim has been approved.",
      "type": "claim_update",
      "data": {
        "claimId": "uuid"
      },
      "createdAt": "2026-01-26T12:00:00Z"
    },
    "unreadCount": 4
  }
}
```

---

#### 10. `user:profile_updated`

**Triggered:** When user profile is updated (e.g., by admin).

**Payload:**
```json
{
  "event": "user:profile_updated",
  "data": {
    "updatedFields": ["discountEligible", "discountPercentage"],
    "timestamp": "2026-01-27T10:00:00Z"
  }
}
```

---

### Client-to-Server Events

#### 1. `ping`

**Purpose:** Keep connection alive.

**Payload:**
```json
{
  "event": "ping",
  "data": {
    "timestamp": "2026-01-27T10:00:00Z"
  }
}
```

**Server Response:**
```json
{
  "event": "pong",
  "data": {
    "timestamp": "2026-01-27T10:00:00Z"
  }
}
```

---

#### 2. `subscribe:claim`

**Purpose:** Subscribe to updates for a specific claim.

**Payload:**
```json
{
  "event": "subscribe:claim",
  "data": {
    "claimId": "uuid"
  }
}
```

**Acknowledgement:**
```json
{
  "event": "subscribed",
  "data": {
    "channel": "claim:uuid",
    "success": true
  }
}
```

---

#### 3. `unsubscribe:claim`

**Purpose:** Unsubscribe from claim updates.

**Payload:**
```json
{
  "event": "unsubscribe:claim",
  "data": {
    "claimId": "uuid"
  }
}
```

---

#### 4. `notification:mark_read`

**Purpose:** Mark notification as read via socket.

**Payload:**
```json
{
  "event": "notification:mark_read",
  "data": {
    "notificationId": "uuid"
  }
}
```

**Acknowledgement:**
```json
{
  "event": "notification:marked_read",
  "data": {
    "notificationId": "uuid",
    "success": true,
    "unreadCount": 3
  }
}
```

---

## Webhook Integrations

### RevenueCat Webhooks

**Endpoint:** `POST /webhooks/revenuecat`

**Events to Handle:**
| Event | Action |
|-------|--------|
| `INITIAL_PURCHASE` | Create subscription, start waiting period |
| `RENEWAL` | Extend subscription period |
| `CANCELLATION` | Mark subscription as cancelled at period end |
| `UNCANCELLATION` | Restore subscription |
| `EXPIRATION` | Deactivate subscription |
| `BILLING_ISSUE` | Flag subscription, notify user |
| `PRODUCT_CHANGE` | Update plan tier |

**Payload Example:**
```json
{
  "event": {
    "type": "INITIAL_PURCHASE",
    "id": "uuid",
    "app_user_id": "user_uuid",
    "product_id": "courial_pro_monthly",
    "period_type": "NORMAL",
    "purchased_at_ms": 1706353200000,
    "expiration_at_ms": 1708945200000
  }
}
```

---

### Stripe Webhooks (for Withdrawals)

**Endpoint:** `POST /webhooks/stripe`

**Events to Handle:**
| Event | Action |
|-------|--------|
| `payout.paid` | Mark withdrawal as completed |
| `payout.failed` | Mark withdrawal as failed, refund wallet |

---

## Error Codes Reference

### HTTP Status Codes

| Status | Description |
|--------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Validation Error |
| 429 | Rate Limited |
| 500 | Internal Server Error |

### Application Error Codes

#### Authentication Errors (AUTH_)
| Code | Description |
|------|-------------|
| AUTH_INVALID_CREDENTIALS | Invalid email or password |
| AUTH_ACCOUNT_DISABLED | Account is disabled |
| AUTH_EMAIL_NOT_VERIFIED | Email not verified |
| AUTH_TOKEN_EXPIRED | Access token expired |
| AUTH_TOKEN_INVALID | Invalid access token |
| AUTH_REFRESH_INVALID | Invalid refresh token |

#### User Errors (USER_)
| Code | Description |
|------|-------------|
| USER_NOT_FOUND | User not found |
| USER_EMAIL_EXISTS | Email already registered |
| USER_FIELD_LOCKED | Field cannot be modified |
| USER_PROFILE_INCOMPLETE | Profile not complete |

#### Subscription Errors (SUB_)
| Code | Description |
|------|-------------|
| SUB_NOT_FOUND | No subscription found |
| SUB_ALREADY_EXISTS | Already subscribed |
| SUB_INACTIVE | Subscription not active |
| SUB_IN_WAITING_PERIOD | In 30-day waiting period |
| SUB_CANCEL_RESTRICTED | Cancellation restricted |

#### Claim Errors (CLAIM_)
| Code | Description |
|------|-------------|
| CLAIM_NOT_FOUND | Claim not found |
| CLAIM_DUPLICATE | Duplicate claim |
| CLAIM_LATE_SUBMISSION | Submitted too late |
| CLAIM_EXCLUDED_VIOLATION | Violation not covered |
| CLAIM_COVERAGE_EXCEEDED | Coverage limit reached |
| CLAIM_TICKET_LIMIT | Ticket limit reached |
| CLAIM_CANNOT_CONTEST | Claim cannot be contested |

#### Wallet Errors (WALLET_)
| Code | Description |
|------|-------------|
| WALLET_INSUFFICIENT_BALANCE | Not enough balance |
| WALLET_MIN_WITHDRAWAL | Below minimum withdrawal |
| WALLET_NO_BANK | No bank account linked |
| WALLET_BANK_NOT_VERIFIED | Bank not verified |

#### Vehicle Errors (VEH_)
| Code | Description |
|------|-------------|
| VEH_NOT_FOUND | Vehicle not found |
| VEH_DUPLICATE_PLATE | License plate exists |
| VEH_MAX_LIMIT | Maximum vehicles reached |
| VEH_HAS_CLAIMS | Vehicle has pending claims |

---

## Data Models Reference

### User
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  profileImage?: string;
  plan: 'basic' | 'pro' | 'professional' | null;
  subscriptionStatus: 'active' | 'inactive' | 'cancelled';
  authProvider?: 'email' | 'google' | 'apple';
  phoneVerified: boolean;
  phoneVerifiedAt?: string;
  courialId?: number;
  courialIdFetchedAt?: string;
  discountEligible?: boolean;
  discountPercentage?: number;
  completedRides?: number;
  discountCheckedAt?: string;
  lastPayoutDate?: string;
  cancellationRestrictionEndDate?: string;
  firstName?: string;
  lastName?: string;
  address?: UserAddress;
  driversLicenseNumber?: string;
  dateOfBirth?: string;
  profileCompleted: boolean;
  profileLockedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Claim
```typescript
interface Claim {
  id: string;
  userId: string;
  ticketDate: string;
  ticketTime?: string;
  city: string;
  state: string;
  violationType: ViolationType;
  ticketNumber: string;
  amount: number;
  imageUri: string;
  additionalImages?: string[];
  status: ClaimStatus;
  submittedAt: string;
  updatedAt: string;
  denialReason?: string;
  payoutAmount?: number;
  payoutDate?: string;
  approvalTimestamp?: string;
  payoutTimestamp?: string;
  decisionCode?: ClaimDecisionCode;
  decisionNotes?: string;
  proofOfPaymentRequested?: boolean;
  proofOfPaymentRequestedAt?: string;
  proofOfPaymentReceived?: boolean;
  proofOfPaymentReceivedAt?: string;
  wantsToContest?: boolean;
  contestReasons?: string[];
  contestDocuments?: string[];
}

type ViolationType =
  | 'parking_meter'
  | 'street_cleaning'
  | 'no_parking'
  | 'hydrant'
  | 'loading_zone'
  | 'double_parking'
  | 'expired_registration'
  | 'other';

type ClaimStatus =
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'paid'
  | 'denied';

type ClaimDecisionCode =
  | 'APPROVED_STANDARD'
  | 'APPROVED_EXPEDITED'
  | 'DENIED_INACTIVE_SUBSCRIPTION'
  | 'DENIED_COVERAGE_EXCEEDED'
  | 'DENIED_EXCLUDED_VIOLATION'
  | 'DENIED_LATE_SUBMISSION'
  | 'DENIED_DUPLICATE'
  | 'DENIED_FRAUD'
  | 'DENIED_INSUFFICIENT_DOCS';
```

### Subscription
```typescript
interface Subscription {
  id: string;
  userId: string;
  planId: 'basic' | 'pro' | 'professional';
  status: 'active' | 'cancelled' | 'expired';
  billingPeriod: 'monthly' | 'annual';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  price: number;
  discountApplied: boolean;
  finalPrice: number;
  waitingPeriodEnds: string;
  createdAt: string;
  updatedAt: string;
}
```

### Coverage
```typescript
interface Coverage {
  planId: 'basic' | 'pro' | 'professional';
  annualCap: number;
  usedAmount: number;
  remainingAmount: number;
  ticketsUsed: number;
  maxTickets: number;
  periodStart: string;
  periodEnd: string;
}
```

### Vehicle
```typescript
interface Vehicle {
  id: string;
  userId: string;
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  isPrimary: boolean;
  imageUrl?: string;
  imageSource?: 'camera' | 'gallery' | 'ai_generated';
  addedAt: string;
}
```

### Wallet
```typescript
interface Wallet {
  userId: string;
  balance: number;
  pendingPayouts: number;
  lifetimePayouts: number;
  totalWithdrawals: number;
}

interface WalletTransaction {
  id: string;
  userId: string;
  type: 'payout' | 'withdrawal';
  amount: number;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  description: string;
  claimId?: string;
  bankAccountLast4?: string;
}
```

### Notification
```typescript
interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'claim_update' | 'coverage_warning' | 'payout' | 'general';
  read: boolean;
  data?: Record<string, any>;
  createdAt: string;
}

interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  claimSubmitted: boolean;
  claimApproved: boolean;
  claimDenied: boolean;
  claimPaid: boolean;
  coverageWarning: boolean;
  promotions: boolean;
}
```

---

## Rate Limiting

| Endpoint Category | Limit |
|-------------------|-------|
| Authentication | 10 requests/minute |
| OTP Send | 3 requests/10 minutes |
| Claims Submit | 10 requests/hour |
| General API | 100 requests/minute |
| File Upload | 20 requests/hour |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706356800
```

---

## Security Requirements

1. **HTTPS Only** - All API communication must use TLS 1.2+
2. **JWT Tokens** - Access tokens expire in 1 hour, refresh tokens in 30 days
3. **Input Validation** - All inputs must be validated and sanitized
4. **SQL Injection Prevention** - Use parameterized queries
5. **Rate Limiting** - Implement per-user and per-IP rate limiting
6. **Audit Logging** - Log all sensitive operations
7. **PII Encryption** - Encrypt personal data at rest
8. **CORS** - Restrict to known app origins

---

*Document Version 1.0 - January 2026*
