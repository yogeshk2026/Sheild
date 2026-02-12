# Courial Shield

A legal defense membership and service warranty platform for gig drivers. Courial Shield provides administrative assistance to contest parking citations and offers discretionary reimbursement credits for eligible tickets. **This is NOT an insurance product.**

## Features

### For Drivers
- **Plan Selection**: Choose from Basic ($9.99/mo), Pro ($24.99/mo), or Professional ($39.99/mo) memberships
- **Protection Tracking**: Real-time visibility into reimbursement limits and remaining balance
- **Easy Claim Submission**: Photo upload with automated ticket data extraction
- **Claim Status Tracking**: Track claims from submission through reimbursement
- **Wallet & Payouts**: Manage reimbursements and withdraw to bank account
- **Add-ons**: Towing coverage, fast payout, dispute concierge

### Membership Plans

| Plan | Monthly | Annual (~17% off) | Annual Cap | Member Co-Pay | Target |
|------|---------|-------------------|------------|---------------|--------|
| Basic | $9.99/mo | $99/yr | $100 | 20% | Suburban / Part-time |
| Pro | $24.99/mo | $249/yr | $350 | 15% | City drivers (20-30 hrs/week) |
| Professional | $39.99/mo | $399/yr | $600 | 15% | Full-time (40+ hrs/week) |

**Professional Plan Includes:** $100 one-time towing credit, concierge defense, dedicated account manager

**Default billing period: Annual** (users can switch to monthly at checkout)

## Important Disclosures

- **NOT Insurance**: Courial Shield is a legal defense membership and service warranty, NOT an insurance product
- **Defense First Model**: We contest citations first; reimbursement is only considered after a contest is lost
- **Member Responsibility**: Reimbursements are sent to members only; members are responsible for paying municipalities
- **Deductible/Co-Pay**: Members pay a percentage of each ticket (20% Basic, 15% Pro/Professional)

## Tech Stack

- **Framework**: Expo SDK 53 + React Native 0.76.7
- **Routing**: Expo Router (file-based)
- **State Management**: Zustand with AsyncStorage persistence
- **Server State**: React Query
- **Styling**: NativeWind (TailwindCSS)
- **Animations**: React Native Reanimated v3
- **Icons**: Lucide React Native
- **Typography**: Nunito Sans (Avenir-style font)
- **Payments**: RevenueCat (connected to Stripe backend)

## Payments Integration

The app uses RevenueCat for membership management, which connects to your Stripe backend. Supported payment methods:
- **Apple Pay** (iOS)
- **Credit Card**
- **PayPal** (via Stripe)

### RevenueCat Setup
The integration is configured in `src/lib/revenuecat.ts`. To fully enable payments:
1. Set up products in RevenueCat dashboard matching plan IDs (basic, pro, professional)
2. Connect your Stripe account in RevenueCat
3. Add platform keys to `mobile/.env`:
   - `EXPO_PUBLIC_REVENUECAT_IOS_KEY=...`
   - `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=...`
4. Rebuild the native app after setting/changing keys (see build notes below)

#### Build Notes (Important)
- `react-native-purchases` does not run purchases in plain Expo Go. Use a Development Build or production build.
- After adding/changing RevenueCat env vars, restart Metro and rebuild native binaries so keys are embedded.
- Web builds intentionally disable purchases and show a friendly "mobile only" message.

#### Quick Setup Steps
1. Copy `mobile/.env.example` to `mobile/.env`.
2. Paste your RevenueCat iOS/Android public SDK keys into `mobile/.env`.
3. Build and run a native client:
   - Android: `npx expo run:android` (or your EAS/dev-client workflow)
   - iOS: `npx expo run:ios` (or your EAS/dev-client workflow)
4. Start Metro: `npm start`

## Terms, Protection & Membership Agreement

The app includes a comprehensive policy system (`src/lib/policy.ts`) covering:

### Protection & Exclusions
- **Eligible Violations**: Parking meter, street cleaning, no parking zone, loading zone
- **ABSOLUTE EXCLUSIONS (Never Eligible - No Exceptions)**:
  - Fire hydrant violations (within 15 feet)
  - Handicap/disability zone violations
  - Double parking / blocking traffic lanes
  - Blocking intersections ("blocking the box")
  - Criminal violations (DUIs, moving violations)
- **Other Exclusions**: Personal use, tow-away zones, tickets over 5 days old, fraud

### Membership Policies
- **Advance Billing**: All plans billed at start of period
- **Auto-Renewal**: Memberships auto-renew unless cancelled
- **Grace Period**: 3-7 days depending on billing period
- **Non-Refundable**: No partial refunds on cancellation
- **Reimbursement Reset**: Limits reset annually on anniversary date
- **30-Day Waiting Period**: Claims cannot be filed for tickets issued within 30 days of membership start
- **5-Day Submission Window**: Tickets must be submitted within 5 days of issuance
- **90-Day Cancellation Restriction**: Cannot cancel within 90 days of receiving a payout

### Reimbursement Calculation
```
Reimbursement = Eligible Amount × (1 - Deductible%)
```
Result never exceeds remaining annual cap.

### Claim Denial Codes
| Code | Reason | Appealable |
|------|--------|------------|
| D001 | Excluded Violation Type | No |
| D002 | Submission Deadline Exceeded (5 days) | No |
| D003 | Reimbursement Limit Reached | No |
| D004 | Inactive Membership | No |
| D005 | Duplicate Claim | No |
| D006 | Insufficient Documentation | Yes |
| D007 | Non-Gig Activity | Yes |
| D008 | Fraudulent Claim | Yes |
| D009 | Amount Exceeds Limit | No |
| D010 | Geographic Restriction | No |
| D011 | Waiting Period (30-day) | No |
| D012 | Absolute Exclusion | No |

### Geographic Pricing
Regional price multipliers are supported for different states (e.g., NY +15%, TX -10%).

## Ticket Scanning & Fraud Detection

The app includes AI-powered ticket scanning with validation and fraud detection (`src/lib/ticketScanning.ts`, `src/lib/ocrService.ts`).

### OCR Extraction
- Uses OpenAI GPT-4 Vision API for ticket data extraction
- Auto-extracts: ticket number, date, city/state, violation type, fine amount, vehicle plate, location
- Confidence scores shown for each extracted field
- Manual entry fallback if OCR fails or API unavailable

### Image Quality Assessment
- Resolution check (minimum 800x600)
- Blur detection
- Lighting validation
- Tampering detection (digital manipulation)
- Issues reported with user-friendly messages

### Fraud Detection
Automated risk scoring with the following checks:
| Flag Code | Description |
|-----------|-------------|
| F001 | Amount exceeds violation type maximum |
| F002 | Duplicate ticket number detected |
| F003 | Future-dated ticket |
| F004 | Multiple tickets same day |
| F005 | Suspicious ticket number format |
| F006 | Image tampering detected |
| F007 | Amount significantly above average |
| F008 | Excessive claims frequency |

Risk levels: Low (0-30), Medium (31-60), High (61-100)
- High-risk claims automatically flagged for admin review
- Medium-risk may proceed with warning

### Validation Rules
- Ticket date within 5 days
- Fine amount within violation type limits
- Required fields: ticket number, date, violation type, fine amount
- Violation type must be eligible under user's plan
- Ticket must not be during 30-day waiting period

## Claims Service & Reimbursement Model

The app implements a **defense-first reimbursement** model (`src/lib/claims-service.ts`).

### Reimbursement Flow
1. User submits claim with ticket photo
2. User answers 3 pre-submission questions (required)
3. Eligibility checks performed automatically (including waiting period)
4. Courial Shield contests the citation first
5. Upon unsuccessful contest, reimbursement is calculated with deductible
6. Payment released to user's wallet
7. **User is responsible for paying the municipality**

### Pre-Submission Questions (Required)
Before uploading a ticket photo, users must answer:
1. "Was the signage confusing or hidden?"
2. "Is there a typo or error on the ticket?"
3. "Did you have a valid permit/payment?"

### Contest This Summons Section
At the end of the ticket submission form, users can opt to contest their summons:
- **Contest Confirmation**: Yes/No radio buttons (required)
- **If Yes - Reasons for Contest** (multi-select, at least one required):
  - Incorrect license plate number
  - Missing or incorrect VIN
  - Incorrect vehicle color
  - Occurrence location missing or incorrect
- **Supporting Documents**: Optional file upload for vehicle registration or photos
- Contest data is stored with the claim record (does not affect approval logic)

### Key Business Rules
- **Courial does NOT pay municipalities** - all reimbursements to members only
- **Payouts blocked** for denied or pending claims
- **90-day cancellation restriction** after any payout
- **30-day waiting period** for new members
- Audit logging for all claim events

### Cancellation Restriction
After receiving any claim payout, users cannot cancel their membership for 90 days. This policy:
- Prevents abuse of the reimbursement system
- Keeps costs sustainable for all members
- Is clearly disclosed before first claim submission

## Professional Plan Requirements

The Professional plan ($39.99/mo) requires proof of gig work:
- Users must upload a screenshot of their earnings dashboard
- This is required before Professional membership can be activated
- Proof is stored securely as "verification_document"

## Vehicle Registration System

The app requires users to register vehicles for claim verification. Vehicle information is locked after registration for security.

### Vehicle Limits
- **Primary Vehicle**: Required (registered during profile completion)
- **Additional Vehicle**: Optional (maximum 1)
- **Total Maximum**: 2 vehicles per account

### Required Identity Fields
During profile completion, users must provide:
- First Name & Last Name (as shown on driver's license)
- Phone Number (verified via OTP)
- Address (ZIP code auto-fills city/state)
- **Driver's License Number** (required for claim verification)
- **Date of Birth** (required for claim verification)
- **VIN** (17-character Vehicle Identification Number, validated format)

### Registration Flow
1. **Complete Profile**: User registers primary vehicle during initial profile setup
2. **Add Vehicle**: User can add one additional vehicle from Registered Vehicles screen
3. **Locking**: Once added, vehicle details cannot be edited by user
4. **Changes**: Any modifications require contacting Courial Support

### Claim Verification
When a claim is submitted:
1. License plate is extracted from ticket via OCR
2. Plate is matched against both registered vehicles
3. If no match found, claim is flagged for manual review
4. Clear user messaging provided for mismatches

## Driver Education & Explainer System

The app includes a comprehensive "How It Works" explainer system to educate users about the service and ensure compliance.

### Explainer Access Points
- **Plans Screen**: "How It Works" link before purchase
- **First Claim**: Mandatory explainer with acknowledgment before submitting first claim
- **Settings**: "How It Works" option in Support & Legal section
- **Subscription Screen**: Cancellation policy disclosure

### Mandatory Disclosures
- Courial Shield is a legal defense membership, NOT insurance
- Courial does NOT pay municipalities directly
- Reimbursements sent to members upon successful defense or approval
- 90-day cancellation restriction after claim payout
- 30-day waiting period for new members
- All claims subject to eligibility review and approval

## Project Structure

```
src/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab navigation screens
│   │   ├── index.tsx      # Dashboard/Home
│   │   ├── claims.tsx     # Claims history
│   │   ├── wallet.tsx     # Wallet & payouts
│   │   └── settings.tsx   # Settings & profile
│   ├── auth.tsx           # Authentication
│   ├── onboarding.tsx     # Onboarding flow (5 slides with explainer)
│   ├── plans.tsx          # Plan selection with billing periods
│   ├── subscription.tsx   # Membership management & billing history
│   ├── terms.tsx          # Terms, Protection Policy & Privacy
│   ├── how-it-works.tsx   # Driver education & explainer
│   ├── submit-claim.tsx   # Claim submission with auto-scanning
│   ├── claim-success.tsx  # Success confirmation
│   ├── claim/[id].tsx     # Claim details with denial explanations
│   └── notifications.tsx  # Notifications list
├── components/
│   └── ui/                # Reusable UI components
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Badge.tsx
│       ├── Progress.tsx
│       ├── Disclaimer.tsx # Legal disclaimer component
│       └── Input.tsx
└── lib/
    ├── store.ts           # Zustand store (includes explainer acknowledgment)
    ├── types.ts           # TypeScript types & billing helpers
    ├── policy.ts          # Terms, protection rules, denial codes
    ├── revenuecat.ts      # RevenueCat integration
    ├── claims-service.ts  # Claim eligibility, waiting period, deductibles
    ├── ticketScanning.ts  # Ticket validation & fraud detection
    ├── ocrService.ts      # AI-powered OCR extraction
    └── cn.ts              # className utilities
```

## App Flow

1. **Onboarding**: 5-screen introduction (includes "How It Works" explainer)
2. **Authentication**: Sign up or sign in
3. **Plan Selection**: Choose membership plan
4. **30-Day Waiting Period**: Claims cannot be filed during this period
5. **Dashboard**: View protection status, submit claims, track stats
6. **First Claim**: Mandatory explainer acknowledgment
7. **Claims**: Answer pre-submission questions, submit photos, track status, receive reimbursements
8. **Wallet**: View balance, withdraw funds

## Brand Colors

- Black: `#000000` (primary dark)
- Dark: `#1A1A1A` (secondary dark)
- Charcoal: `#2D2D2D` (tertiary dark)
- Grey: `#6B7280` (muted text)
- Light Grey: `#E5E7EB` (borders, dividers)
- Surface: `#F5F5F5` (background)
- White: `#FFFFFF` (cards, content)
- Orange: `#F97316` (accent/primary action)
- Green: `#22C55E` (success - used sparingly)

## Hero Tagline

**"Parking Protection for Gig Drivers. We fight your tickets so you keep your earnings."**

## Footer & Checkout Disclaimer

The following disclaimer appears in the footer and checkout areas:

> "This is a legal defense membership and service warranty, not an insurance product. We provide administrative assistance to contest citations and discretionary reimbursement credits. We do not cover criminal fines or egregious violations affecting public safety."

## App Store Metadata

### App Store Description (Short)
Parking ticket protection for gig drivers. We fight your tickets so you keep your earnings.

### App Store Description (Full)
Courial Shield helps gig economy drivers manage parking tickets received while working.

**How It Works:**
• Subscribe to a monthly membership
• When you get a parking ticket while on a delivery or rideshare job, snap a photo
• Answer a few quick questions and submit your claim in seconds
• We contest the citation on your behalf
• Receive reimbursement directly to your wallet if defense is unsuccessful

**Features:**
• Easy claim submission with AI-powered ticket scanning
• Track claim status from submission to payout
• Withdraw funds to your bank account
• View protection details and plan limits
• Manage your membership and payment methods

**Membership Plans:**
• Basic: $9.99/mo — Up to $100/year cap (20% member co-pay)
• Pro: $24.99/mo — Up to $350/year cap (15% member co-pay)
• Professional: $39.99/mo — Up to $600/year cap + $100 towing credit

**Important Disclosures:**
• Courial Shield is a legal defense membership, NOT insurance
• All claims are subject to eligibility review and approval
• Reimbursement is not guaranteed
• Protection applies only to parking violations received while actively performing gig work
• 30-day waiting period applies for new members
• Plan limits and deductibles apply

**Support:**
Contact us at support@courial.com

### App Store Keywords
parking ticket, gig driver, delivery driver, rideshare, protection, DoorDash, Uber Eats, Instacart, parking fine, ticket defense

### Promotional Text
Parking protection for gig drivers. We fight your tickets so you keep your earnings.

### App Category
Finance

### Age Rating
4+ (No objectionable content)

### Privacy Policy URL
In-app at /terms?tab=privacy

### Terms of Service URL
In-app at /terms?tab=terms

### Policy Effective Dates
All policies effective: January 25, 2026

## Recent Updates (January 28, 2026)

### UI/UX Bug Fixes & Improvements
1. **Login Screen**: Terms and Privacy Policy links are now clickable and navigate to their respective legal pages (App Store compliance fix)
2. **Terms Screen**: Fixed border-radius styling on content boxes for consistent rounded corners
3. **Help Center**: Fixed state management bug where Quick Actions buttons would disappear when closing FAQ accordion items
4. **Plan Selection**: Fixed "Pro" plan selection indicator - "Selected" text now displays correctly (was invisible due to white text on white background)
5. **DatePicker**: Added year and month selector dropdowns - users can now quickly jump to any year (1920-2036) instead of scrolling month-by-month
6. **Platform Selection**: Improved checkmark indicator styling with orange border highlight and circular checkmark badge on far right

## Backend API Documentation

A comprehensive API and Socket documentation is available for backend development:

📄 **[API Documentation](./docs/API_DOCUMENTATION.md)**

This document includes:
- Complete list of all required REST APIs (Authentication, Users, Subscriptions, Claims, Wallet, Vehicles, Notifications, Documents)
- Request/response schemas for all endpoints
- Real-time WebSocket events documentation
- RevenueCat and Stripe webhook integrations
- Error codes reference
- Data models reference
- Rate limiting and security requirements

## Supabase Integration

The app now integrates with Supabase for claim submission and storage.

### Environment Variables Required

Set these in the ENV tab on Vibecode:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Claims Table Schema

The Supabase `claims` table stores claim submissions with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key (auto-generated) |
| ticket_number | TEXT | Citation number from ticket |
| violation_type | TEXT | Vehicle code section / violation type |
| amount | DECIMAL | Fine amount |
| ticket_date | TIMESTAMP | Date/time of ticket issuance |
| location | TEXT | Full address of violation |
| plate_number | TEXT | Vehicle license plate |
| vehicle_make | TEXT | Vehicle manufacturer |
| vehicle_color | TEXT | Vehicle color |
| status | TEXT | Workflow status (submitted, under_review, approved, denied, paid) |
| risk_score | INT | Fraud detection score |
| ticket_image_url | TEXT | URL to uploaded ticket image |
| user_id | UUID | Reference to auth.users |
| user_name | TEXT | User's full name (denormalized) |
| user_email | TEXT | User's email (denormalized) |
| user_plan | TEXT | User's subscription plan |
| submitted_at | TIMESTAMP | Submission timestamp |

### Claim Submission Flow

1. User fills out the claim form with ticket details
2. Ticket image is uploaded to Supabase Storage (optional)
3. Claim payload is sent to Supabase `claims` table
4. Claim is also saved locally for offline access
5. User is redirected to home screen

### Storage Bucket

Create a `ticket-images` bucket in Supabase Storage for ticket photo uploads.

**Note:** Courial Shield currently does NOT have its own backend. The API documentation serves as the specification for backend development.
