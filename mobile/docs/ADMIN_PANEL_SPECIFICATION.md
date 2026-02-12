# Courial Shield Admin Panel Specification

> **Version:** 1.0
> **Created:** January 28, 2026
> **Purpose:** Complete specification for building a web-based admin panel in Lovable

---

## Overview

Build a web-based admin dashboard for **Courial Shield** - a legal defense membership and service warranty platform for gig drivers. This admin panel will manage users, claims, subscriptions, payouts, and system analytics.

**Important Business Context:**
- Courial Shield is NOT an insurance product
- Defense-first model: We contest citations first, then reimburse if unsuccessful
- Courial does NOT pay municipalities directly - payments go to members only
- 30-day waiting period for new members before claims can be filed
- 90-day cancellation restriction after receiving any payout

---

## Tech Stack Recommendation

- **Framework:** React + TypeScript
- **UI Library:** shadcn/ui with Tailwind CSS
- **State Management:** TanStack Query (React Query)
- **Routing:** React Router
- **Charts:** Recharts
- **Tables:** TanStack Table
- **Forms:** React Hook Form + Zod
- **Icons:** Lucide React
- **Date Handling:** date-fns

---

## Brand Colors

```css
:root {
  --black: #000000;
  --dark: #1A1A1A;
  --charcoal: #2D2D2D;
  --grey: #6B7280;
  --light-grey: #E5E7EB;
  --surface: #F5F5F5;
  --white: #FFFFFF;
  --accent: #F97316; /* Orange - primary action color */
  --success: #22C55E;
  --warning: #F59E0B;
  --danger: #EF4444;
}
```

---

## Screen Specifications

### 1. Authentication

#### 1.1 Login Screen

**Route:** `/login`

**UI Components:**
- Courial Shield logo centered at top
- Email input field
- Password input field with show/hide toggle
- "Sign In" button (orange background)
- "Forgot Password?" link
- Footer with copyright

**Functionality:**
- Email/password authentication
- Form validation with error messages
- Redirect to dashboard on success
- Session persistence with JWT

**API Endpoint:**
```
POST /admin/auth/login
Body: { email: string, password: string }
Response: { accessToken: string, refreshToken: string, admin: AdminUser }
```

---

### 2. Dashboard (Home)

#### 2.1 Main Dashboard

**Route:** `/` or `/dashboard`

**UI Layout:**
- Top navigation bar with logo, search, notifications, admin profile
- Left sidebar with navigation menu
- Main content area with cards and charts

**Key Metrics Cards (Top Row):**
| Card | Data | Icon |
|------|------|------|
| Total Users | Count of all registered users | Users |
| Active Subscriptions | Count of active subscriptions | CreditCard |
| Pending Claims | Claims with status "submitted" or "under_review" | Clock |
| Total Payouts (MTD) | Sum of payouts this month | DollarSign |

**Charts Section:**
1. **Claims by Status (Pie Chart)**
   - Submitted, Under Review, Approved, Paid, Denied

2. **Revenue Trend (Line Chart)**
   - Monthly subscription revenue over 12 months

3. **Claims Volume (Bar Chart)**
   - Weekly claim submissions over 8 weeks

4. **Plan Distribution (Donut Chart)**
   - Basic, Pro, Professional breakdown

**Recent Activity Table:**
- Last 10 claims with: User name, Ticket #, Amount, Status, Submitted date
- Click to navigate to claim details

**API Endpoints:**
```
GET /admin/dashboard/stats
GET /admin/dashboard/charts/claims-by-status
GET /admin/dashboard/charts/revenue-trend
GET /admin/dashboard/charts/claims-volume
GET /admin/dashboard/recent-activity
```

---

### 3. Claims Management

#### 3.1 Claims List

**Route:** `/claims`

**UI Components:**
- Page header: "Claims Management"
- Filter bar with:
  - Status dropdown (All, Submitted, Under Review, Approved, Paid, Denied)
  - Date range picker
  - Violation type dropdown
  - Search by ticket number or user
- Data table with columns:
  - Checkbox (for bulk actions)
  - Claim ID
  - User (name + email)
  - Ticket Number
  - Violation Type (with colored badge)
  - Amount
  - Status (colored badge)
  - Submitted Date
  - Actions (View, Approve, Deny)
- Pagination controls
- Bulk action buttons: Approve Selected, Deny Selected

**Status Badge Colors:**
| Status | Color |
|--------|-------|
| Submitted | Blue |
| Under Review | Yellow |
| Approved | Green |
| Paid | Green (darker) |
| Denied | Red |

**Violation Type Badges:**
| Type | Label | Color |
|------|-------|-------|
| parking_meter | Expired Meter | Gray |
| street_cleaning | Street Cleaning | Blue |
| no_parking | No Parking Zone | Orange |
| hydrant | Fire Hydrant | Red (EXCLUDED) |
| loading_zone | Loading Zone | Purple |
| double_parking | Double Parking | Red (EXCLUDED) |
| expired_registration | Expired Registration | Gray (EXCLUDED) |
| other | Other | Gray |

**API Endpoint:**
```
GET /admin/claims
Query: { status?, violationType?, startDate?, endDate?, search?, page, limit, sortBy, sortOrder }
Response: { claims: Claim[], pagination: { page, limit, total, totalPages } }
```

---

#### 3.2 Claim Details

**Route:** `/claims/:claimId`

**UI Layout (Two-column):**

**Left Column (Main Info):**
- Claim header with status badge and claim ID
- Ticket image (large, clickable for full view)
- Additional images gallery if present
- Ticket Information card:
  - Ticket Number
  - Ticket Date & Time
  - Location (City, State)
  - Violation Type
  - Fine Amount
- User Information card:
  - Name
  - Email
  - Phone
  - Plan tier
  - Member since

**Right Column (Actions & History):**
- Action buttons:
  - "Approve & Pay" (green) - if status is submitted/under_review
  - "Deny Claim" (red) - if status is submitted/under_review
  - "Request Proof of Payment" - if status is paid
  - "View User Profile" (outline)
- Decision form (appears when action clicked):
  - For Approve: Notes textarea (optional)
  - For Deny: Denial code dropdown (required), Notes textarea
- Payout Information card (if approved/paid):
  - Estimated Payout
  - Copay Amount (user responsibility)
  - Deductible Rate
  - Final Payout Amount
  - Payout Date
- Timeline/Audit Log:
  - Chronological list of all claim events
  - Status changes, admin actions, timestamps

**Denial Codes Dropdown Options:**
| Code | Label |
|------|-------|
| D001 | Excluded Violation Type |
| D002 | Submission Deadline Exceeded (5 days) |
| D003 | Reimbursement Limit Reached |
| D004 | Inactive Membership |
| D005 | Duplicate Claim |
| D006 | Insufficient Documentation |
| D007 | Non-Gig Activity |
| D008 | Fraudulent Claim |
| D009 | Amount Exceeds Limit |
| D010 | Geographic Restriction |
| D011 | Waiting Period (30-day) |
| D012 | Absolute Exclusion |

**API Endpoints:**
```
GET /admin/claims/:claimId
Response: { claim: ClaimDetail, user: User, timeline: AuditEvent[] }

POST /admin/claims/:claimId/approve
Body: { notes?: string }
Response: { claim: Claim, payout: { amount: number, transactionId: string } }

POST /admin/claims/:claimId/deny
Body: { denialCode: string, notes?: string }
Response: { claim: Claim }

POST /admin/claims/:claimId/request-proof
Response: { requested: true, requestedAt: string }
```

---

#### 3.3 Fraud Detection Queue

**Route:** `/claims/fraud-queue`

**UI Components:**
- Header: "Fraud Detection Queue"
- Description: "Claims flagged for potential fraud based on automated detection"
- Filter by risk level: Low, Medium, High
- Table with columns:
  - Claim ID
  - User
  - Risk Score (0-100 with color coding)
  - Flag Codes
  - Amount
  - Submitted Date
  - Actions

**Risk Score Colors:**
| Score Range | Color | Label |
|-------------|-------|-------|
| 0-30 | Green | Low Risk |
| 31-60 | Yellow | Medium Risk |
| 61-100 | Red | High Risk |

**Fraud Flag Codes:**
| Code | Description |
|------|-------------|
| F001 | Amount exceeds violation type maximum |
| F002 | Duplicate ticket number detected |
| F003 | Future-dated ticket |
| F004 | Multiple tickets same day |
| F005 | Suspicious ticket number format |
| F006 | Image tampering detected |
| F007 | Amount significantly above average |
| F008 | Excessive claims frequency |

**API Endpoint:**
```
GET /admin/claims/fraud-queue
Query: { riskLevel?, page, limit }
Response: { claims: FlaggedClaim[], pagination }
```

---

### 4. User Management

#### 4.1 Users List

**Route:** `/users`

**UI Components:**
- Page header: "User Management"
- Search bar (by name, email, phone)
- Filter dropdown: All, Active Subscription, Inactive, Cancelled
- Data table with columns:
  - User ID
  - Name
  - Email
  - Phone
  - Plan (badge)
  - Status (badge)
  - Courial Driver (checkmark if linked)
  - Registered Date
  - Actions (View)
- Pagination

**Status Badges:**
| Status | Color |
|--------|-------|
| Active | Green |
| Inactive | Gray |
| Cancelled | Red |

**API Endpoint:**
```
GET /admin/users
Query: { search?, status?, plan?, page, limit }
Response: { users: User[], pagination }
```

---

#### 4.2 User Details

**Route:** `/users/:userId`

**UI Layout (Tabs):**

**Tab 1: Profile**
- Profile header with avatar, name, email, plan badge
- Personal Information card:
  - Full Name
  - Email
  - Phone (verified status)
  - Date of Birth
  - Driver's License Number
  - Address
- Courial Integration card:
  - Courial ID (if linked)
  - Discount Eligible (Yes/No)
  - Discount Percentage
  - Completed Rides
- Edit Profile button (opens modal)

**Tab 2: Subscription**
- Current Plan card:
  - Plan name and tier
  - Status
  - Billing period (monthly/annual)
  - Price (with discount if applicable)
  - Period start/end dates
  - Waiting period status
- Coverage Usage card:
  - Annual Cap
  - Used Amount (progress bar)
  - Remaining Amount
  - Tickets Used / Max
- Cancellation Restriction card (if applicable):
  - Last Payout Date
  - Restriction End Date
  - Days Remaining
- Actions: Change Plan, Cancel Subscription

**Tab 3: Claims**
- Claims history table for this user
- Same columns as claims list
- Filter by status

**Tab 4: Vehicles**
- List of registered vehicles
- For each: Make, Model, Year, Color, License Plate, Primary badge
- Vehicle image if available

**Tab 5: Wallet**
- Wallet balance
- Transaction history
- Bank accounts linked (last 4 digits only)

**Tab 6: Audit Log**
- All audit events for this user
- Timestamp, Event Type, Details

**API Endpoints:**
```
GET /admin/users/:userId
GET /admin/users/:userId/subscription
GET /admin/users/:userId/claims
GET /admin/users/:userId/vehicles
GET /admin/users/:userId/wallet
GET /admin/users/:userId/audit-log
PATCH /admin/users/:userId (for updates)
POST /admin/users/:userId/subscription/cancel
POST /admin/users/:userId/subscription/change
```

---

### 5. Subscriptions Management

#### 5.1 Subscriptions List

**Route:** `/subscriptions`

**UI Components:**
- Page header: "Subscriptions"
- Stats row:
  - Total Active
  - Total Cancelled
  - Monthly Revenue
  - Annual Revenue
- Filter by: Plan tier, Status, Billing period
- Data table:
  - User
  - Plan
  - Status
  - Billing Period
  - Price
  - Started Date
  - Renewal Date
  - Actions

**API Endpoint:**
```
GET /admin/subscriptions
Query: { plan?, status?, billingPeriod?, page, limit }
```

---

#### 5.2 Revenue Analytics

**Route:** `/subscriptions/revenue`

**UI Components:**
- Revenue summary cards:
  - MRR (Monthly Recurring Revenue)
  - ARR (Annual Recurring Revenue)
  - Churn Rate
  - Average Revenue Per User
- Charts:
  - Revenue by Plan (stacked bar)
  - Subscription growth over time (line)
  - Cancellation reasons (pie)

**API Endpoint:**
```
GET /admin/subscriptions/analytics
```

---

### 6. Wallet & Payouts

#### 6.1 Payouts List

**Route:** `/payouts`

**UI Components:**
- Page header: "Payouts & Transactions"
- Stats row:
  - Total Payouts (all time)
  - Payouts This Month
  - Pending Withdrawals
  - Average Payout
- Filter by: Type (payout/withdrawal), Status, Date range
- Data table:
  - Transaction ID
  - User
  - Type
  - Amount
  - Status
  - Date
  - Claim ID (if payout)
  - Actions

**API Endpoint:**
```
GET /admin/transactions
Query: { type?, status?, startDate?, endDate?, page, limit }
```

---

#### 6.2 Withdrawal Requests

**Route:** `/payouts/withdrawals`

**UI Components:**
- Pending withdrawals queue
- Table:
  - Withdrawal ID
  - User
  - Amount
  - Bank Account (last 4)
  - Requested Date
  - Status
  - Actions (Approve, Reject)

**API Endpoints:**
```
GET /admin/withdrawals?status=pending
POST /admin/withdrawals/:id/approve
POST /admin/withdrawals/:id/reject
```

---

### 7. Analytics & Reports

#### 7.1 Claims Analytics

**Route:** `/analytics/claims`

**Charts:**
- Claims by Violation Type (bar chart)
- Claims by City/State (map or table)
- Approval Rate Over Time (line chart)
- Average Processing Time (gauge)
- Top Users by Claims Count (table)

---

#### 7.2 Geographic Analytics

**Route:** `/analytics/geography`

**UI Components:**
- US map with heatmap of claims by state
- Table of claims by state with pricing multipliers
- Top cities by claims volume

---

#### 7.3 Fraud Analytics

**Route:** `/analytics/fraud`

**Metrics:**
- Total Flagged Claims
- Confirmed Fraud Cases
- Fraud Detection Rate
- False Positive Rate
- Chart: Fraud flags by type

---

### 8. Settings

#### 8.1 Plans Configuration

**Route:** `/settings/plans`

**UI Components:**
- Editable cards for each plan:
  - Basic, Pro, Professional
- For each plan:
  - Monthly Price
  - Annual Price (calculated)
  - Annual Cap
  - Max Tickets per Year
  - Copay Percentage
  - Features list

**Note:** Plan changes affect new subscriptions only

**API Endpoint:**
```
GET /admin/settings/plans
PATCH /admin/settings/plans/:planId
```

---

#### 8.2 Policy Configuration

**Route:** `/settings/policies`

**Editable Settings:**
- Waiting Period (days): default 30
- Submission Window (days): default 5
- Cancellation Restriction (days): default 90
- Max Claims Per Month: default 10
- Max Vehicles Per Account: default 5

**API Endpoint:**
```
GET /admin/settings/policies
PATCH /admin/settings/policies
```

---

#### 8.3 Denial Codes

**Route:** `/settings/denial-codes`

**UI Components:**
- Table of denial codes
- For each: Code, Reason, User Explanation, Appealable (checkbox)
- Edit modal for each
- Add new denial code button

---

#### 8.4 Admin Users

**Route:** `/settings/admins`

**UI Components:**
- List of admin users
- Columns: Name, Email, Role, Last Active, Status
- Add Admin button
- Edit/Deactivate actions

**Roles:**
- Super Admin: Full access
- Claims Admin: Claims only
- Support Admin: Users and claims (view/action)
- Finance Admin: Payouts and subscriptions
- Viewer: Read-only access

---

### 9. Notifications Center

#### 9.1 Broadcast Notifications

**Route:** `/notifications/broadcast`

**UI Components:**
- Create notification form:
  - Title
  - Message body
  - Target audience: All users, Plan tier, Specific users
  - Delivery method: Push, Email, SMS
  - Schedule: Immediately or schedule for later
- History of sent broadcasts

---

### 10. Support Tools

#### 10.1 Audit Log

**Route:** `/support/audit-log`

**UI Components:**
- Searchable/filterable audit log
- Columns:
  - Timestamp
  - User
  - Event Type
  - Claim ID (if applicable)
  - Details
  - Admin (who performed action)
- Export to CSV

---

#### 10.2 Impersonate User

**Route:** Accessed from User Details

**Functionality:**
- View app as user (read-only)
- Cannot perform actions
- Audit log entry created

---

## Sidebar Navigation Structure

```
Dashboard
Claims
  ├── All Claims
  ├── Pending Review
  ├── Fraud Queue
  └── Proof of Payment Requests
Users
  ├── All Users
  ├── Active Subscriptions
  └── Cancellation Requests
Subscriptions
  ├── All Subscriptions
  └── Revenue Analytics
Payouts
  ├── All Transactions
  └── Pending Withdrawals
Analytics
  ├── Claims Analytics
  ├── Geographic Analytics
  └── Fraud Analytics
Settings
  ├── Plans
  ├── Policies
  ├── Denial Codes
  └── Admin Users
Support
  ├── Audit Log
  └── Documentation
```

---

## API Response Format

All API responses follow this structure:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
  } | null;
  meta: {
    timestamp: string;
    requestId: string;
  };
}

interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

---

## Data Models

### Admin User
```typescript
interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'claims_admin' | 'support_admin' | 'finance_admin' | 'viewer';
  status: 'active' | 'inactive';
  lastActiveAt: string;
  createdAt: string;
}
```

### Claim (Admin View)
```typescript
interface ClaimAdminView {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    plan: 'basic' | 'pro' | 'professional';
  };
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

  // Approval/Denial info
  decisionCode?: string;
  decisionNotes?: string;
  denialReason?: string;
  approvalTimestamp?: string;

  // Payout info
  payoutAmount?: number;
  payoutTimestamp?: string;
  copayAmount?: number;
  deductibleRate?: number;

  // Proof of payment
  proofOfPaymentRequested?: boolean;
  proofOfPaymentRequestedAt?: string;
  proofOfPaymentReceived?: boolean;
  proofOfPaymentReceivedAt?: string;

  // Fraud detection
  riskScore?: number;
  fraudFlags?: string[];

  // Contest info
  wantsToContest?: boolean;
  contestReasons?: string[];
  contestDocuments?: string[];

  // Vehicle
  vehicle?: {
    id: string;
    make: string;
    model: string;
    year: number;
    licensePlate: string;
  };
}
```

### User (Admin View)
```typescript
interface UserAdminView {
  id: string;
  email: string;
  name: string;
  phone: string;
  phoneVerified: boolean;
  profileImage?: string;

  // Plan info
  plan: 'basic' | 'pro' | 'professional' | null;
  subscriptionStatus: 'active' | 'inactive' | 'cancelled';
  billingPeriod?: 'monthly' | 'annual';

  // Identity
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  driversLicenseNumber?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };

  // Courial integration
  courialId?: number;
  discountEligible?: boolean;
  discountPercentage?: number;
  completedRides?: number;

  // Cancellation restriction
  lastPayoutDate?: string;
  cancellationRestrictionEndDate?: string;

  // Profile status
  profileCompleted: boolean;
  profileLockedAt?: string;

  // Stats
  totalClaims: number;
  approvedClaims: number;
  totalPayout: number;
  walletBalance: number;

  // Auth
  authProvider: 'email' | 'google' | 'apple';
  createdAt: string;
}
```

### Dashboard Stats
```typescript
interface DashboardStats {
  totalUsers: number;
  activeSubscriptions: number;
  pendingClaims: number;
  totalPayoutsMTD: number;

  claimsByStatus: {
    submitted: number;
    under_review: number;
    approved: number;
    paid: number;
    denied: number;
  };

  revenueByPlan: {
    basic: number;
    pro: number;
    professional: number;
  };

  subscriptionsByPlan: {
    basic: number;
    pro: number;
    professional: number;
  };
}
```

### Audit Log Entry
```typescript
interface AuditLogEntry {
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  userId: string;
  userName?: string;
  claimId?: string;
  adminId?: string;
  adminName?: string;
  details: Record<string, unknown>;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
  };
}

type AuditEventType =
  | 'CLAIM_SUBMITTED'
  | 'CLAIM_APPROVED'
  | 'CLAIM_DENIED'
  | 'PAYOUT_INITIATED'
  | 'PAYOUT_COMPLETED'
  | 'PROOF_OF_PAYMENT_REQUESTED'
  | 'PROOF_OF_PAYMENT_RECEIVED'
  | 'CANCELLATION_ATTEMPTED'
  | 'CANCELLATION_BLOCKED'
  | 'CANCELLATION_COMPLETED'
  | 'SUBSCRIPTION_CREATED'
  | 'SUBSCRIPTION_CANCELLED'
  | 'SUBSCRIPTION_CHANGED'
  | 'USER_PROFILE_UPDATED'
  | 'ADMIN_ACTION';
```

---

## Admin API Endpoints Summary

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/auth/login` | Admin login |
| POST | `/admin/auth/logout` | Admin logout |
| POST | `/admin/auth/refresh` | Refresh token |
| GET | `/admin/auth/me` | Get current admin |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/dashboard/stats` | Get dashboard stats |
| GET | `/admin/dashboard/charts/*` | Get chart data |
| GET | `/admin/dashboard/recent-activity` | Recent claims |

### Claims
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/claims` | List all claims |
| GET | `/admin/claims/:id` | Get claim details |
| POST | `/admin/claims/:id/approve` | Approve claim |
| POST | `/admin/claims/:id/deny` | Deny claim |
| POST | `/admin/claims/:id/request-proof` | Request proof of payment |
| GET | `/admin/claims/fraud-queue` | Get flagged claims |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/users` | List all users |
| GET | `/admin/users/:id` | Get user details |
| PATCH | `/admin/users/:id` | Update user |
| GET | `/admin/users/:id/claims` | Get user's claims |
| GET | `/admin/users/:id/wallet` | Get user's wallet |
| GET | `/admin/users/:id/vehicles` | Get user's vehicles |
| GET | `/admin/users/:id/audit-log` | Get user's audit log |

### Subscriptions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/subscriptions` | List subscriptions |
| GET | `/admin/subscriptions/:id` | Get subscription details |
| POST | `/admin/subscriptions/:id/cancel` | Cancel subscription |
| POST | `/admin/subscriptions/:id/change` | Change plan |
| GET | `/admin/subscriptions/analytics` | Revenue analytics |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/transactions` | List all transactions |
| GET | `/admin/withdrawals` | List withdrawals |
| POST | `/admin/withdrawals/:id/approve` | Approve withdrawal |
| POST | `/admin/withdrawals/:id/reject` | Reject withdrawal |

### Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/settings/plans` | Get plan configurations |
| PATCH | `/admin/settings/plans/:id` | Update plan |
| GET | `/admin/settings/policies` | Get policies |
| PATCH | `/admin/settings/policies` | Update policies |
| GET | `/admin/settings/admins` | List admin users |
| POST | `/admin/settings/admins` | Create admin |
| PATCH | `/admin/settings/admins/:id` | Update admin |

### Audit
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/audit-log` | Get audit log |
| GET | `/admin/audit-log/export` | Export to CSV |

---

## UI Component Specifications

### Status Badge Component
```typescript
interface StatusBadgeProps {
  status: 'submitted' | 'under_review' | 'approved' | 'paid' | 'denied' | 'active' | 'inactive' | 'cancelled';
}

// Color mapping
const statusColors = {
  submitted: 'bg-blue-100 text-blue-700',
  under_review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  paid: 'bg-emerald-100 text-emerald-700',
  denied: 'bg-red-100 text-red-700',
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
};
```

### Plan Badge Component
```typescript
interface PlanBadgeProps {
  plan: 'basic' | 'pro' | 'professional';
}

const planColors = {
  basic: 'bg-gray-100 text-gray-700',
  pro: 'bg-orange-100 text-orange-700',
  professional: 'bg-sky-100 text-sky-700',
};
```

### Risk Score Component
```typescript
interface RiskScoreProps {
  score: number; // 0-100
}

// Display as colored badge with score
// 0-30: Green (Low Risk)
// 31-60: Yellow (Medium Risk)
// 61-100: Red (High Risk)
```

### Data Table Component
- Use TanStack Table
- Support sorting, filtering, pagination
- Row selection with checkboxes
- Expandable rows for details
- Loading and empty states

### Chart Components
- Consistent styling with brand colors
- Responsive sizing
- Tooltips on hover
- Legend placement

---

## Permissions Matrix

| Feature | Super Admin | Claims Admin | Support Admin | Finance Admin | Viewer |
|---------|-------------|--------------|---------------|---------------|--------|
| View Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Claims | ✅ | ✅ | ✅ | ✅ | ✅ |
| Approve/Deny Claims | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Users | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit Users | ✅ | ❌ | ✅ | ❌ | ❌ |
| View Subscriptions | ✅ | ❌ | ✅ | ✅ | ✅ |
| Cancel Subscriptions | ✅ | ❌ | ❌ | ✅ | ❌ |
| View Transactions | ✅ | ❌ | ✅ | ✅ | ✅ |
| Approve Withdrawals | ✅ | ❌ | ❌ | ✅ | ❌ |
| View Analytics | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit Settings | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Admins | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## Implementation Notes

1. **Real-time Updates:** Consider WebSocket integration for live claim status updates and notifications

2. **Image Handling:** Use a lightbox component for viewing ticket images in detail

3. **Bulk Actions:** Implement confirmation modals for bulk approve/deny actions

4. **Search:** Implement debounced search to reduce API calls

5. **Export:** Allow CSV export for claims, users, and transactions tables

6. **Responsive Design:** Optimize for desktop but support tablet viewing

7. **Error Handling:** Show toast notifications for API errors with retry options

8. **Loading States:** Use skeleton loaders for better perceived performance

9. **Form Validation:** Use Zod schemas matching API validation

10. **Session Management:** Auto-logout after 30 minutes of inactivity

---

## Deployment Checklist

- [ ] Connect to Courial Shield backend API
- [ ] Configure environment variables
- [ ] Set up authentication with JWT
- [ ] Test all CRUD operations
- [ ] Verify role-based access control
- [ ] Test responsive design
- [ ] Set up error tracking (Sentry)
- [ ] Configure analytics (if needed)
- [ ] SSL certificate configured
- [ ] CORS settings verified

---

*Document Version 1.0 - January 28, 2026*
*For Courial Shield Admin Panel*
