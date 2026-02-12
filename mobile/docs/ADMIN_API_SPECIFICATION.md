# Shield Admin Dashboard - API Specification

## Base URL
```
https://api.yourbackend.com/v1/admin
```

## Authentication
All endpoints require admin authentication via Bearer token:
```
Authorization: Bearer <admin_jwt_token>
```

---

## 1. Users Endpoints

### GET /users
Fetch paginated list of Shield users with filters.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20, max: 100) |
| `search` | string | Search by name, email, or user ID |
| `status` | string | Filter: `active`, `deactivated`, `pending` |
| `plan` | string | Filter by plan ID |
| `claim_status` | string | Filter: `none`, `pending`, `approved`, `denied`, `paid` |
| `sort_by` | string | `signup_date`, `name`, `last_activity` |
| `sort_order` | string | `asc` or `desc` |
| `signup_date_from` | string | ISO 8601 date |
| `signup_date_to` | string | ISO 8601 date |

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user_abc123",
        "email": "user@example.com",
        "profile": {
          "first_name": "John",
          "last_name": "Doe",
          "phone": "+1234567890",
          "address": {
            "street": "123 Main St",
            "city": "Austin",
            "state": "TX",
            "zip": "78701",
            "country": "US"
          },
          "date_of_birth": "1990-05-15",
          "ssn_last_four": "1234"
        },
        "signup_date": "2024-01-15T10:30:00Z",
        "status": "active",
        "deactivation": null,
        "plan": {
          "id": "plan_premium",
          "name": "Premium Shield",
          "monthly_cost": 29.99,
          "coverage_amount": 5000
        },
        "claim_summary": {
          "total_claims": 2,
          "pending_claims": 1,
          "approved_claims": 1,
          "total_paid_out": 2500.00
        },
        "banking_info": {
          "has_banking_info": true,
          "bank_name": "Chase Bank",
          "account_type": "checking",
          "account_last_four": "5678",
          "routing_last_four": "9012"
        },
        "last_activity": "2024-03-20T14:22:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 50,
      "total_items": 1000,
      "items_per_page": 20
    }
  }
}
```

---

### GET /users/:userId
Fetch detailed user information.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_abc123",
    "email": "user@example.com",
    "profile": {
      "first_name": "John",
      "last_name": "Doe",
      "phone": "+1234567890",
      "address": {
        "street": "123 Main St",
        "city": "Austin",
        "state": "TX",
        "zip": "78701",
        "country": "US"
      },
      "date_of_birth": "1990-05-15",
      "ssn_last_four": "1234",
      "employment_status": "employed",
      "employer_name": "Tech Corp",
      "annual_income": 75000
    },
    "signup_date": "2024-01-15T10:30:00Z",
    "signup_source": "mobile_app",
    "status": "active",
    "deactivation": null,
    "plan": {
      "id": "plan_premium",
      "name": "Premium Shield",
      "monthly_cost": 29.99,
      "coverage_amount": 5000,
      "enrolled_date": "2024-01-15T10:30:00Z",
      "next_billing_date": "2024-04-15T00:00:00Z"
    },
    "banking_info": {
      "id": "bank_xyz789",
      "bank_name": "Chase Bank",
      "account_holder_name": "John Doe",
      "account_type": "checking",
      "account_number_masked": "****5678",
      "routing_number_masked": "****9012",
      "verified": true,
      "verified_date": "2024-01-16T09:00:00Z",
      "added_date": "2024-01-15T10:35:00Z"
    },
    "payment_history": {
      "total_paid": 89.97,
      "last_payment_date": "2024-03-15T00:00:00Z",
      "last_payment_amount": 29.99,
      "payment_method": "card_ending_4242"
    },
    "claims": [],
    "payouts": [],
    "notes": [],
    "audit_log": []
  }
}
```

---

### PATCH /users/:userId
Update user information (with audit logging).

**Request Body:**
```json
{
  "profile": {
    "first_name": "Jonathan",
    "phone": "+1987654321",
    "address": {
      "street": "456 New St"
    }
  },
  "change_reason": "User requested name correction"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user_id": "user_abc123",
    "updated_fields": ["profile.first_name", "profile.phone", "profile.address.street"],
    "audit_entry": {
      "id": "audit_def456",
      "timestamp": "2024-03-21T10:00:00Z",
      "admin_id": "admin_001",
      "admin_email": "admin@shield.com",
      "action": "user_profile_update",
      "changes": [
        {
          "field": "profile.first_name",
          "old_value": "John",
          "new_value": "Jonathan"
        },
        {
          "field": "profile.phone",
          "old_value": "+1234567890",
          "new_value": "+1987654321"
        }
      ],
      "reason": "User requested name correction"
    }
  }
}
```

---

### POST /users/:userId/deactivate
Deactivate a user account.

**Request Body:**
```json
{
  "reason": "non_payment",
  "reason_details": "Failed payment for 3 consecutive months",
  "effective_date": "2024-03-21T00:00:00Z",
  "notify_user": true
}
```

**Reason enum values:**
- `user_requested`
- `non_payment`
- `fraud`
- `policy_violation`
- `deceased`
- `other`

**Response:**
```json
{
  "success": true,
  "data": {
    "user_id": "user_abc123",
    "status": "deactivated",
    "deactivation": {
      "date": "2024-03-21T00:00:00Z",
      "reason": "non_payment",
      "reason_details": "Failed payment for 3 consecutive months",
      "deactivated_by": "admin_001",
      "notification_sent": true
    }
  }
}
```

---

### POST /users/:userId/reactivate
Reactivate a deactivated user.

**Request Body:**
```json
{
  "reason": "Payment issue resolved",
  "plan_id": "plan_premium"
}
```

---

## 2. Claims Endpoints

### GET /claims
Fetch all claims with filters.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number |
| `limit` | number | Items per page |
| `status` | string | `pending`, `under_review`, `approved`, `denied`, `paid` |
| `user_id` | string | Filter by user |
| `date_from` | string | Claim submission date from |
| `date_to` | string | Claim submission date to |

**Response:**
```json
{
  "success": true,
  "data": {
    "claims": [
      {
        "id": "claim_001",
        "user_id": "user_abc123",
        "user_name": "John Doe",
        "user_email": "user@example.com",
        "status": "pending",
        "type": "unemployment",
        "submitted_date": "2024-03-15T10:00:00Z",
        "amount_requested": 2500.00,
        "amount_approved": null,
        "plan_coverage_amount": 5000.00,
        "documents": [
          {
            "id": "doc_001",
            "type": "termination_letter",
            "filename": "termination.pdf",
            "uploaded_date": "2024-03-15T10:05:00Z",
            "url": "https://storage.example.com/docs/doc_001"
          }
        ],
        "last_updated": "2024-03-15T10:00:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 10,
      "total_items": 200
    }
  }
}
```

---

### GET /claims/:claimId
Fetch detailed claim information.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "claim_001",
    "user": {
      "id": "user_abc123",
      "name": "John Doe",
      "email": "user@example.com",
      "plan": "Premium Shield"
    },
    "status": "under_review",
    "status_history": [
      {
        "status": "pending",
        "timestamp": "2024-03-15T10:00:00Z",
        "changed_by": null,
        "notes": "Claim submitted by user"
      },
      {
        "status": "under_review",
        "timestamp": "2024-03-16T09:00:00Z",
        "changed_by": "admin_001",
        "notes": "Assigned for review"
      }
    ],
    "type": "unemployment",
    "reason": "Layoff due to company downsizing",
    "termination_date": "2024-03-01T00:00:00Z",
    "submitted_date": "2024-03-15T10:00:00Z",
    "amount_requested": 2500.00,
    "amount_approved": null,
    "amount_paid": null,
    "plan_coverage_amount": 5000.00,
    "remaining_coverage": 5000.00,
    "documents": [
      {
        "id": "doc_001",
        "type": "termination_letter",
        "filename": "termination.pdf",
        "uploaded_date": "2024-03-15T10:05:00Z",
        "url": "https://storage.example.com/docs/doc_001",
        "verified": false
      },
      {
        "id": "doc_002",
        "type": "id_verification",
        "filename": "drivers_license.jpg",
        "uploaded_date": "2024-03-15T10:06:00Z",
        "url": "https://storage.example.com/docs/doc_002",
        "verified": true
      }
    ],
    "notes": [
      {
        "id": "note_001",
        "admin_id": "admin_001",
        "admin_name": "Sarah Admin",
        "content": "Verified termination letter with employer",
        "timestamp": "2024-03-16T14:00:00Z",
        "internal": true
      }
    ],
    "assigned_to": {
      "admin_id": "admin_001",
      "admin_name": "Sarah Admin"
    }
  }
}
```

---

### PATCH /claims/:claimId
Update claim status or details.

**Request Body:**
```json
{
  "status": "approved",
  "amount_approved": 2500.00,
  "notes": "All documents verified. Claim approved for full amount.",
  "change_reason": "Documentation verified with employer"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "claim_id": "claim_001",
    "status": "approved",
    "amount_approved": 2500.00,
    "audit_entry": {
      "id": "audit_ghi789",
      "timestamp": "2024-03-21T11:00:00Z",
      "admin_id": "admin_001",
      "action": "claim_status_update",
      "changes": [
        {
          "field": "status",
          "old_value": "under_review",
          "new_value": "approved"
        },
        {
          "field": "amount_approved",
          "old_value": null,
          "new_value": 2500.00
        }
      ],
      "reason": "Documentation verified with employer"
    }
  }
}
```

---

### POST /claims/:claimId/notes
Add internal note to a claim.

**Request Body:**
```json
{
  "content": "Called employer to verify termination date",
  "internal": true
}
```

---

## 3. Payouts Endpoints

### GET /payouts
Fetch all payouts with filters.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number |
| `limit` | number | Items per page |
| `status` | string | `pending`, `processing`, `completed`, `failed` |
| `user_id` | string | Filter by user |
| `claim_id` | string | Filter by claim |
| `date_from` | string | Payout date from |
| `date_to` | string | Payout date to |

**Response:**
```json
{
  "success": true,
  "data": {
    "payouts": [
      {
        "id": "payout_001",
        "user_id": "user_abc123",
        "user_name": "John Doe",
        "claim_id": "claim_001",
        "amount": 2500.00,
        "status": "completed",
        "method": "ach",
        "bank_account_last_four": "5678",
        "initiated_date": "2024-03-18T10:00:00Z",
        "completed_date": "2024-03-20T10:00:00Z",
        "initiated_by": "admin_001"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_items": 100
    },
    "summary": {
      "total_pending": 15000.00,
      "total_processing": 8500.00,
      "total_completed_this_month": 125000.00
    }
  }
}
```

---

### GET /payouts/:payoutId
Fetch detailed payout information.

---

### POST /payouts
Create a new payout for an approved claim.

**Request Body:**
```json
{
  "claim_id": "claim_001",
  "amount": 2500.00,
  "method": "ach",
  "notes": "Standard payout for approved claim"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "payout_002",
    "claim_id": "claim_001",
    "user_id": "user_abc123",
    "amount": 2500.00,
    "status": "pending",
    "method": "ach",
    "destination": {
      "bank_name": "Chase Bank",
      "account_last_four": "5678",
      "routing_last_four": "9012"
    },
    "initiated_date": "2024-03-21T12:00:00Z",
    "estimated_arrival": "2024-03-24T00:00:00Z",
    "initiated_by": {
      "admin_id": "admin_001",
      "admin_name": "Sarah Admin"
    }
  }
}
```

---

### PATCH /payouts/:payoutId
Update payout (e.g., cancel, retry failed).

**Request Body:**
```json
{
  "action": "retry",
  "reason": "Bank details updated by user"
}
```

**Action enum values:**
- `cancel`
- `retry`
- `mark_completed` (manual override)

---

## 4. Banking Info Endpoints

### GET /users/:userId/banking
Fetch user's banking information.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "bank_xyz789",
    "user_id": "user_abc123",
    "bank_name": "Chase Bank",
    "account_holder_name": "John Doe",
    "account_type": "checking",
    "account_number_masked": "****5678",
    "routing_number_masked": "****9012",
    "verified": true,
    "verified_date": "2024-01-16T09:00:00Z",
    "verification_method": "micro_deposits",
    "added_date": "2024-01-15T10:35:00Z",
    "last_updated": "2024-01-15T10:35:00Z"
  }
}
```

---

### PATCH /users/:userId/banking
Update banking information (admin override).

**Request Body:**
```json
{
  "bank_name": "Bank of America",
  "account_holder_name": "John A Doe",
  "account_type": "checking",
  "account_number": "123456789",
  "routing_number": "987654321",
  "change_reason": "User provided new bank details via phone support",
  "skip_verification": false
}
```

---

## 5. Plans Endpoints

### GET /plans
Fetch all available plans.

**Response:**
```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": "plan_basic",
        "name": "Basic Shield",
        "monthly_cost": 14.99,
        "coverage_amount": 2500,
        "coverage_duration_months": 3,
        "waiting_period_days": 30,
        "active": true,
        "subscriber_count": 500
      },
      {
        "id": "plan_premium",
        "name": "Premium Shield",
        "monthly_cost": 29.99,
        "coverage_amount": 5000,
        "coverage_duration_months": 6,
        "waiting_period_days": 14,
        "active": true,
        "subscriber_count": 350
      }
    ]
  }
}
```

---

### PATCH /users/:userId/plan
Change user's plan.

**Request Body:**
```json
{
  "plan_id": "plan_premium",
  "effective_date": "2024-04-01T00:00:00Z",
  "prorate": true,
  "change_reason": "User requested upgrade"
}
```

---

## 6. Audit Log Endpoints

### GET /audit-log
Fetch audit log entries.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number |
| `limit` | number | Items per page |
| `admin_id` | string | Filter by admin |
| `user_id` | string | Filter by affected user |
| `action` | string | Filter by action type |
| `date_from` | string | From date |
| `date_to` | string | To date |

**Response:**
```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "id": "audit_001",
        "timestamp": "2024-03-21T10:00:00Z",
        "admin": {
          "id": "admin_001",
          "email": "admin@shield.com",
          "name": "Sarah Admin"
        },
        "action": "user_profile_update",
        "resource_type": "user",
        "resource_id": "user_abc123",
        "changes": [
          {
            "field": "profile.first_name",
            "old_value": "John",
            "new_value": "Jonathan"
          }
        ],
        "reason": "User requested name correction",
        "ip_address": "192.168.1.100",
        "user_agent": "Mozilla/5.0..."
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 100,
      "total_items": 2000
    }
  }
}
```

**Action enum values:**
- `user_profile_update`
- `user_deactivated`
- `user_reactivated`
- `user_plan_changed`
- `claim_status_update`
- `claim_amount_update`
- `claim_note_added`
- `payout_created`
- `payout_cancelled`
- `payout_retried`
- `banking_info_updated`

---

## 7. Dashboard Stats Endpoint

### GET /dashboard/stats
Fetch dashboard summary statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 1500,
      "active": 1350,
      "deactivated": 150,
      "new_this_month": 85,
      "new_this_week": 22
    },
    "claims": {
      "total": 450,
      "pending": 25,
      "under_review": 12,
      "approved": 380,
      "denied": 33,
      "avg_processing_days": 4.5
    },
    "payouts": {
      "total_all_time": 850000.00,
      "total_this_month": 45000.00,
      "total_this_week": 12500.00,
      "pending_amount": 8500.00,
      "avg_payout_amount": 2250.00
    },
    "plans": {
      "basic_subscribers": 500,
      "premium_subscribers": 350,
      "mrr": 17997.50
    }
  }
}
```

---

## 8. Admin Authentication Endpoints

### POST /auth/login
Admin login.

**Request Body:**
```json
{
  "email": "admin@shield.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_at": "2024-03-22T10:00:00Z",
    "admin": {
      "id": "admin_001",
      "email": "admin@shield.com",
      "name": "Sarah Admin",
      "role": "super_admin",
      "permissions": ["users:read", "users:write", "claims:read", "claims:write", "payouts:create"]
    }
  }
}
```

### GET /auth/me
Get current admin info.

### POST /auth/logout
Logout and invalidate token.

---

## Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

**Error Codes:**
- `UNAUTHORIZED` - Invalid or missing authentication
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid request data
- `CONFLICT` - Resource conflict (e.g., duplicate)
- `INTERNAL_ERROR` - Server error

---

## Data Types Reference

### User Status
```typescript
type UserStatus = 'active' | 'deactivated' | 'pending';
```

### Claim Status
```typescript
type ClaimStatus = 'pending' | 'under_review' | 'approved' | 'denied' | 'paid';
```

### Payout Status
```typescript
type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';
```

### Deactivation Reason
```typescript
type DeactivationReason =
  | 'user_requested'
  | 'non_payment'
  | 'fraud'
  | 'policy_violation'
  | 'deceased'
  | 'other';
```

### Account Type
```typescript
type AccountType = 'checking' | 'savings';
```

### Payout Method
```typescript
type PayoutMethod = 'ach' | 'wire' | 'check';
```

---

## Webhook Events (Optional)

If your backend sends webhooks to the mobile app backend:

### user.deactivated
```json
{
  "event": "user.deactivated",
  "timestamp": "2024-03-21T10:00:00Z",
  "data": {
    "user_id": "user_abc123",
    "reason": "non_payment"
  }
}
```

### claim.status_changed
```json
{
  "event": "claim.status_changed",
  "timestamp": "2024-03-21T10:00:00Z",
  "data": {
    "claim_id": "claim_001",
    "user_id": "user_abc123",
    "old_status": "under_review",
    "new_status": "approved"
  }
}
```

### payout.completed
```json
{
  "event": "payout.completed",
  "timestamp": "2024-03-21T10:00:00Z",
  "data": {
    "payout_id": "payout_001",
    "user_id": "user_abc123",
    "amount": 2500.00
  }
}
```

---

## Notes for Backend Team

1. **Audit Logging**: Every write operation MUST create an audit log entry automatically
2. **Soft Deletes**: Never hard delete user data - use status flags
3. **PII Security**: Encrypt sensitive fields (SSN, full bank account numbers) at rest
4. **Rate Limiting**: Implement rate limiting on all endpoints
5. **Pagination**: Always paginate list endpoints
6. **Timestamps**: Use ISO 8601 format for all dates/times in UTC
7. **IDs**: Use prefixed UUIDs (e.g., `user_`, `claim_`, `payout_`) for easier debugging
