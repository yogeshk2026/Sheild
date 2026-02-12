// Courial Shield - Type Definitions
// Legal Defense Membership & Service Warranty Platform
import type { AppPlanTier, PaidPlanTier } from './plan-config';
import { getPaidPlanConfigs } from './plan-config';

export type PlanTier = PaidPlanTier;
export type BillingPeriod = 'monthly' | 'annual';

export interface Plan {
  id: PlanTier;
  name: string;
  price: number; // Monthly base price
  annualCap: number;
  maxTicketsPerYear: number;
  features: string[];
  addOns: string[];
  popular?: boolean;
}

// Billing period discounts
export const BILLING_DISCOUNTS: Record<BillingPeriod, number> = {
  monthly: 0,      // No discount
  annual: 0.17,    // ~17% off (annual price is ~10x monthly)
};

export const BILLING_LABELS: Record<BillingPeriod, string> = {
  monthly: 'Monthly',
  annual: 'Annual',
};

// Calculate price for a billing period
export function getPriceForBillingPeriod(monthlyPrice: number, period: BillingPeriod): number {
  const discount = BILLING_DISCOUNTS[period];
  const months = period === 'monthly' ? 1 : 12;
  const totalBeforeDiscount = monthlyPrice * months;
  const discountAmount = totalBeforeDiscount * discount;
  return Math.round((totalBeforeDiscount - discountAmount) * 100) / 100;
}

// Get monthly equivalent price after discount
export function getMonthlyEquivalent(monthlyPrice: number, period: BillingPeriod): number {
  const discount = BILLING_DISCOUNTS[period];
  return Math.round((monthlyPrice * (1 - discount)) * 100) / 100;
}

// ============================================================================
// Courial Driver Discount Pricing Helpers
// ============================================================================

export const COURIAL_DRIVER_DISCOUNT_PERCENTAGE = 20;
export const COURIAL_DRIVER_DISCOUNT_LABEL = 'Courial Driver Benefit – 20% Off';

/**
 * Apply the Courial Driver discount to a price
 * @param price The original price
 * @param discountPercentage The discount percentage (e.g., 20 for 20%)
 * @returns The discounted price
 */
export function applyDriverDiscount(price: number, discountPercentage: number): number {
  if (discountPercentage <= 0) return price;
  const discountAmount = price * (discountPercentage / 100);
  return Math.round((price - discountAmount) * 100) / 100;
}

/**
 * Get price for billing period with optional Courial Driver discount
 * @param monthlyPrice The base monthly price
 * @param period The billing period
 * @param driverDiscountPercentage Optional driver discount (e.g., 20 for 20%)
 * @returns The final price after all discounts
 */
export function getPriceWithDriverDiscount(
  monthlyPrice: number,
  period: BillingPeriod,
  driverDiscountPercentage: number = 0
): number {
  // First apply billing period discount
  const periodPrice = getPriceForBillingPeriod(monthlyPrice, period);
  // Then apply driver discount
  return applyDriverDiscount(periodPrice, driverDiscountPercentage);
}

/**
 * Get monthly equivalent price with optional Courial Driver discount
 * @param monthlyPrice The base monthly price
 * @param period The billing period
 * @param driverDiscountPercentage Optional driver discount (e.g., 20 for 20%)
 * @returns The monthly equivalent price after all discounts
 */
export function getMonthlyEquivalentWithDriverDiscount(
  monthlyPrice: number,
  period: BillingPeriod,
  driverDiscountPercentage: number = 0
): number {
  // First apply billing period discount to get monthly equivalent
  const monthlyEquiv = getMonthlyEquivalent(monthlyPrice, period);
  // Then apply driver discount
  return applyDriverDiscount(monthlyEquiv, driverDiscountPercentage);
}

// User address
export interface UserAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

// Registered vehicle
export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  isPrimary: boolean;
  addedAt: string;
  imageUrl?: string;
  imageSource?: 'camera' | 'gallery' | 'ai_generated'; // How the image was added
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  profileImage?: string;
  plan: PlanTier | null;
  subscriptionStatus: 'active' | 'inactive' | 'cancelled';
  hasActiveSubscription: boolean;
  currentPlan: AppPlanTier;
  createdAt: string;
  // Authentication provider (for tracking social sign-ups)
  authProvider?: 'email' | 'google' | 'apple';
  // Phone verification
  phoneVerified?: boolean; // True if phone was verified via OTP
  phoneVerifiedAt?: string; // Timestamp when phone was verified
  // Courial Driver API integration
  courialId?: number; // Immutable once set - fetched from Courial API
  courialIdFetchedAt?: string; // Timestamp when courialId was fetched
  courialIdError?: string; // Error message if courialId fetch failed
  // Courial Driver Discount Eligibility
  discountEligible?: boolean; // True if user qualifies for 20% Courial Driver discount
  discountPercentage?: number; // The discount percentage (e.g., 20)
  completedRides?: number; // Number of completed Courial orders
  discountCheckedAt?: string; // Timestamp when discount eligibility was last checked
  // Cancellation restriction fields
  lastPayoutDate?: string;
  cancellationRestrictionEndDate?: string;
  // Identity fields (required for claims)
  firstName?: string;
  lastName?: string;
  address?: UserAddress;
  // Additional identity fields (required for profile completion)
  driversLicenseNumber?: string;
  dateOfBirth?: string | null; // Optional, format: YYYY-MM-DD (ISO date)
  vin?: string; // Vehicle Identification Number (17 characters)
  // Profile completion status
  profileCompleted?: boolean;
  profileLockedAt?: string; // Once locked, can't be edited without support
  profileStep?: 'identity' | 'vehicle' | 'review';
  // Vehicles
  vehicles?: Vehicle[];
  // Notification preferences
  notificationPreferences?: NotificationPreferences;
}

// Notification preferences for push, email, and SMS
export interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean; // Opt-in only, default false
  // Granular claim event preferences
  claimSubmitted: boolean;
  claimApproved: boolean;
  claimDenied: boolean;
  claimPaid: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  pushEnabled: true,
  emailEnabled: true,
  smsEnabled: false, // Off by default, opt-in only
  claimSubmitted: true,
  claimApproved: true,
  claimDenied: true,
  claimPaid: true,
};

export interface Coverage {
  planId: AppPlanTier;
  annualCap: number;
  usedAmount: number;
  remainingAmount: number;
  ticketsUsed: number;
  maxTickets: number;
  periodStart: string;
  periodEnd: string;
}

export type ClaimStatus = 'submitted' | 'under_review' | 'approved' | 'paid' | 'denied';

// Claim decision reason codes
export type ClaimDecisionCode =
  | 'APPROVED_STANDARD'
  | 'APPROVED_EXPEDITED'
  | 'DENIED_INACTIVE_SUBSCRIPTION'
  | 'DENIED_COVERAGE_EXCEEDED'
  | 'DENIED_EXCLUDED_VIOLATION'
  | 'DENIED_LATE_SUBMISSION'
  | 'DENIED_DUPLICATE'
  | 'DENIED_FRAUD'
  | 'DENIED_INSUFFICIENT_DOCS';

// Contest reason options for claim disputes
export type ContestReason =
  | 'incorrect_license_plate'
  | 'missing_incorrect_vin'
  | 'incorrect_vehicle_color'
  | 'location_missing_incorrect';

export const CONTEST_REASON_LABELS: Record<ContestReason, string> = {
  incorrect_license_plate: 'Incorrect license plate number',
  missing_incorrect_vin: 'Missing or incorrect VIN',
  incorrect_vehicle_color: 'Incorrect vehicle color',
  location_missing_incorrect: 'Occurrence location missing or incorrect',
};

export interface Claim {
  id: string;
  userId: string;
  ticketDate: string;
  city: string;
  state: string;
  violationType: string;
  ticketNumber: string;
  amount: number;
  imageUri: string;
  status: ClaimStatus;
  submittedAt: string;
  updatedAt: string;
  denialReason?: string;
  payoutAmount?: number;
  payoutDate?: string;
  // New fields for pay-on-approval model
  approvalTimestamp?: string;
  payoutTimestamp?: string;
  decisionCode?: ClaimDecisionCode;
  decisionNotes?: string;
  // Audit fields
  proofOfPaymentRequested?: boolean;
  proofOfPaymentRequestedAt?: string;
  proofOfPaymentReceived?: boolean;
  proofOfPaymentReceivedAt?: string;
  // Contest fields
  wantsToContest?: boolean;
  contestReasons?: ContestReason[];
  contestDocuments?: string[]; // Array of document URIs
  issueDate?: string;
  issueDateISO?: string | null;
  issueTime?: string;
  paymentDueByDate?: string;
  paymentDueByDateISO?: string | null;
  dueDate?: string;
  dueAfterDate?: string;
}

export type ViolationType =
  | 'parking_meter'
  | 'street_cleaning'
  | 'no_parking'
  | 'hydrant'
  | 'loading_zone'
  | 'double_parking'
  | 'expired_registration'
  | 'other';

export const VIOLATION_LABELS: Record<ViolationType, string> = {
  parking_meter: 'Expired Meter',
  street_cleaning: 'Street Cleaning',
  no_parking: 'No Parking Zone',
  hydrant: 'Fire Hydrant',
  loading_zone: 'Loading Zone',
  double_parking: 'Double Parking',
  expired_registration: 'Expired Registration',
  other: 'Other',
};

export const EXCLUDED_VIOLATIONS: ViolationType[] = [
  'expired_registration',
];

export interface WalletTransaction {
  id: string;
  type: 'payout' | 'withdrawal';
  amount: number;
  date: string;
  claimId?: string;
  status: 'completed' | 'pending' | 'failed';
  description: string;
}

export interface Wallet {
  balance: number;
  pendingPayouts: number;
  transactions: WalletTransaction[];
}

export interface BankAccount {
  id: string;
  accountHolderName: string;
  routingNumber: string;
  accountNumberLast4: string;
  accountNumberMasked: string;
  bankName?: string;
  isDefault: boolean;
  verified: boolean;
  createdAt: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'apple_pay' | 'paypal' | 'bank';
  isDefault: boolean;
  last4?: string;
  brand?: string;
  bankAccountId?: string;
  label: string;
  createdAt: string;
}

export interface AddOn {
  id: string;
  name: string;
  description: string;
  price: number;
  enabled: boolean;
}

export const PLANS: Plan[] = getPaidPlanConfigs().map((plan) => ({
  id: plan.id,
  name: plan.name,
  price: plan.monthlyPrice,
  annualCap: plan.annualCap,
  maxTicketsPerYear: plan.maxTicketsPerYear,
  features: plan.features,
  addOns: plan.addOns,
  popular: plan.popular,
}));

export const ADD_ONS: AddOn[] = [
  {
    id: 'towing',
    name: 'Towing Coverage',
    description: 'Coverage for towing fees up to $250 per incident',
    price: 4.99,
    enabled: false,
  },
  {
    id: 'fast_payout',
    name: 'Fast Payout',
    description: 'Get your payouts within 24 hours instead of 5-7 days',
    price: 2.99,
    enabled: false,
  },
  {
    id: 'dispute_concierge',
    name: 'Dispute Concierge',
    description: 'Our team handles ticket disputes on your behalf',
    price: 7.99,
    enabled: false,
  },
];

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'claim_update' | 'coverage_warning' | 'payout' | 'general';
  read: boolean;
  createdAt: string;
}

// Claim verification result
export interface ClaimVerificationResult {
  isValid: boolean;
  issues: ClaimVerificationIssue[];
  requiresManualReview: boolean;
}

export interface ClaimVerificationIssue {
  field: 'name' | 'licensePlate' | 'location' | 'vehicle';
  expected: string;
  found: string;
  severity: 'warning' | 'error';
  message: string;
}
