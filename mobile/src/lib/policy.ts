// Courial Shield - Legal Defense Membership & Service Warranty System
// This is NOT an insurance product

import { BillingPeriod, ViolationType } from './types';
import { PLAN_CONFIGS } from './plan-config';

// ============================================
// POLICY VERSION & ACCEPTANCE
// ============================================

export interface PolicyVersion {
  id: string;
  version: string;
  effectiveDate: string;
  type: 'terms' | 'privacy' | 'coverage';
  title: string;
  lastUpdated: string;
}

export interface UserPolicyAcceptance {
  policyId: string;
  policyVersion: string;
  acceptedAt: string;
  ipAddress?: string;
  deviceId?: string;
}

// Current policy versions - can be updated without app redeploy
export const CURRENT_POLICIES: PolicyVersion[] = [
  {
    id: 'terms-v2',
    version: '2.0.0',
    effectiveDate: '2026-01-25',
    type: 'terms',
    title: 'Terms of Service & Membership Agreement',
    lastUpdated: '2026-01-25',
  },
  {
    id: 'privacy-v1',
    version: '1.0.0',
    effectiveDate: '2026-01-01',
    type: 'privacy',
    title: 'Privacy Policy',
    lastUpdated: '2026-01-01',
  },
  {
    id: 'coverage-v2',
    version: '2.0.0',
    effectiveDate: '2026-01-25',
    type: 'coverage',
    title: 'Protection Policy',
    lastUpdated: '2026-01-25',
  },
];

// ============================================
// PROTECTION & EXCLUSIONS (NOT INSURANCE)
// ============================================

export interface CoverageRule {
  id: string;
  violationType: ViolationType;
  covered: boolean;
  maxAmount: number | null; // null = plan limit applies
  conditions?: string[];
  exclusionReason?: string;
}

// ABSOLUTE EXCLUSIONS - These violations are NEVER eligible for defense or reimbursement
export const ABSOLUTE_EXCLUSIONS = [
  {
    id: 'abs-1',
    violation: 'Fire Hydrant',
    description: 'Parking within 15 feet of a fire hydrant',
    reason: 'Public safety violation - no exceptions',
  },
  {
    id: 'abs-2',
    violation: 'Handicap/Disability Zone',
    description: 'Parking in designated handicap/disability zones without a valid permit',
    reason: 'Public safety violation - no exceptions',
  },
  {
    id: 'abs-3',
    violation: 'Double Parking (Blocking Traffic Lane)',
    description: 'Blocking an active traffic lane',
    reason: 'Public safety violation - no exceptions',
  },
  {
    id: 'abs-4',
    violation: 'Blocking Intersection',
    description: 'Blocking an intersection ("Blocking the Box")',
    reason: 'Public safety violation - no exceptions',
  },
  {
    id: 'abs-5',
    violation: 'Criminal Violations',
    description: 'Citations involving felonies, DUIs, or moving violations',
    reason: 'Criminal matter outside scope of membership',
  },
];

export const COVERAGE_RULES: CoverageRule[] = [
  {
    id: 'cr-1',
    violationType: 'parking_meter',
    covered: true,
    maxAmount: null,
    conditions: ['Ticket must be submitted within 5 days of issuance', 'Must be after 30-day waiting period'],
  },
  {
    id: 'cr-2',
    violationType: 'street_cleaning',
    covered: true,
    maxAmount: null,
    conditions: ['Valid street cleaning sign must be present', 'Submitted within 5 days'],
  },
  {
    id: 'cr-3',
    violationType: 'no_parking',
    covered: true,
    maxAmount: null,
    conditions: ['Temporary no-parking signs must have been posted less than 72 hours prior'],
  },
  {
    id: 'cr-4',
    violationType: 'hydrant',
    covered: false,
    maxAmount: 0,
    exclusionReason: 'ABSOLUTE EXCLUSION: Fire hydrant violations are never eligible - no exceptions',
  },
  {
    id: 'cr-5',
    violationType: 'loading_zone',
    covered: true,
    maxAmount: null,
    conditions: ['Must have been actively loading/unloading for delivery'],
  },
  {
    id: 'cr-6',
    violationType: 'double_parking',
    covered: false,
    maxAmount: 0,
    exclusionReason: 'ABSOLUTE EXCLUSION: Blocking traffic lanes is never eligible - no exceptions',
  },
  {
    id: 'cr-7',
    violationType: 'expired_registration',
    covered: false,
    maxAmount: 0,
    exclusionReason: 'Vehicle registration violations are the responsibility of the vehicle owner',
  },
  {
    id: 'cr-8',
    violationType: 'other',
    covered: false,
    maxAmount: 0,
    exclusionReason: 'Unclassified violations require manual review',
  },
];

export const GENERAL_EXCLUSIONS = [
  'Tickets received while vehicle is parked for personal (non-gig) use',
  'Tickets in designated tow-away zones',
  'Tickets resulting from illegal modifications to vehicle',
  'Tickets for moving violations (speeding, running red lights, etc.)',
  'Tickets issued more than 5 days before claim submission',
  'Tickets from parking in private lots without permission',
  'Tickets received after membership cancellation',
  'Fraudulent or altered tickets',
  'Tickets for vehicles not registered to the account',
  'Tickets issued during the 30-day waiting period after membership start',
  'Fire hydrant violations (within 15 feet) - ABSOLUTE, NO EXCEPTIONS',
  'Handicap/disability zone violations - ABSOLUTE, NO EXCEPTIONS',
  'Double parking / blocking traffic lanes - ABSOLUTE, NO EXCEPTIONS',
  'Blocking intersections - ABSOLUTE, NO EXCEPTIONS',
];

// ============================================
// ELIGIBILITY RULES
// ============================================

export interface EligibilityRule {
  id: string;
  category: 'driver' | 'vehicle' | 'activity' | 'account';
  requirement: string;
  description: string;
}

export const ELIGIBILITY_RULES: EligibilityRule[] = [
  {
    id: 'el-1',
    category: 'driver',
    requirement: 'Valid Driver\'s License',
    description: 'You must hold a valid driver\'s license in the state where you operate.',
  },
  {
    id: 'el-2',
    category: 'driver',
    requirement: 'Age Requirement',
    description: 'You must be at least 18 years old to use Courial Shield.',
  },
  {
    id: 'el-3',
    category: 'vehicle',
    requirement: 'Registered Vehicle',
    description: 'Your vehicle must be properly registered.',
  },
  {
    id: 'el-4',
    category: 'activity',
    requirement: 'Active Gig Work',
    description: 'You must be actively working for a delivery or rideshare platform (DoorDash, Uber Eats, Instacart, etc.).',
  },
  {
    id: 'el-5',
    category: 'account',
    requirement: 'Active Membership',
    description: 'Your membership must be active and in good standing at the time the ticket was issued.',
  },
  {
    id: 'el-6',
    category: 'account',
    requirement: 'Accurate Information',
    description: 'All account information must be accurate and up-to-date.',
  },
  {
    id: 'el-7',
    category: 'account',
    requirement: '30-Day Waiting Period',
    description: 'No claims may be filed for citations issued within the first 30 days of active membership.',
  },
];

// ============================================
// CLAIM SUBMISSION REQUIREMENTS
// ============================================

export interface ClaimRequirement {
  id: string;
  requirement: string;
  description: string;
  required: boolean;
}

export const CLAIM_REQUIREMENTS: ClaimRequirement[] = [
  {
    id: 'req-1',
    requirement: 'Photo of Ticket',
    description: 'Clear, legible photo showing ticket number, date, time, violation type, and amount.',
    required: true,
  },
  {
    id: 'req-2',
    requirement: 'Ticket Number',
    description: 'The unique citation or ticket number printed on the ticket.',
    required: true,
  },
  {
    id: 'req-3',
    requirement: 'Ticket Date',
    description: 'The date the ticket was issued (must be within 5 days of submission).',
    required: true,
  },
  {
    id: 'req-4',
    requirement: 'Location',
    description: 'City and state where the ticket was issued.',
    required: true,
  },
  {
    id: 'req-5',
    requirement: 'Violation Type',
    description: 'The type of parking violation as stated on the ticket.',
    required: true,
  },
  {
    id: 'req-6',
    requirement: 'Ticket Amount',
    description: 'The total fine amount shown on the ticket.',
    required: true,
  },
  {
    id: 'req-7',
    requirement: 'Proof of Gig Activity',
    description: 'Screenshot showing active delivery/ride at the time of ticket (may be requested).',
    required: false,
  },
  {
    id: 'req-8',
    requirement: 'Pre-Submission Questions',
    description: 'Answer three yes/no questions about signage, ticket errors, and payment status before uploading.',
    required: true,
  },
];

// ============================================
// CLAIM DENIAL CODES & REASONS
// ============================================

export interface DenialCode {
  code: string;
  reason: string;
  userExplanation: string;
  appealable: boolean;
}

export const DENIAL_CODES: Record<string, DenialCode> = {
  'D001': {
    code: 'D001',
    reason: 'Excluded Violation Type',
    userExplanation: 'This type of violation is not eligible under your membership. Please review our Protection Policy for details.',
    appealable: false,
  },
  'D002': {
    code: 'D002',
    reason: 'Submission Deadline Exceeded',
    userExplanation: 'Claims must be submitted within 5 days of the ticket date. This ticket was issued more than 5 days ago.',
    appealable: false,
  },
  'D003': {
    code: 'D003',
    reason: 'Reimbursement Limit Reached',
    userExplanation: 'You have reached your annual reimbursement cap for this membership period. Consider upgrading your plan.',
    appealable: false,
  },
  'D004': {
    code: 'D004',
    reason: 'Inactive Membership',
    userExplanation: 'Your membership was not active when this ticket was issued. Protection only applies to tickets received during active membership periods.',
    appealable: false,
  },
  'D005': {
    code: 'D005',
    reason: 'Duplicate Claim',
    userExplanation: 'A claim for this ticket has already been submitted. Each ticket can only be claimed once.',
    appealable: false,
  },
  'D006': {
    code: 'D006',
    reason: 'Insufficient Documentation',
    userExplanation: 'The submitted documentation does not meet our requirements. Please ensure the ticket photo is clear and all required information is visible.',
    appealable: true,
  },
  'D007': {
    code: 'D007',
    reason: 'Non-Gig Activity',
    userExplanation: 'Based on our review, this ticket was not received while performing gig work. Protection only applies to tickets received during active deliveries or rides.',
    appealable: true,
  },
  'D008': {
    code: 'D008',
    reason: 'Fraudulent Claim',
    userExplanation: 'This claim has been flagged for potential fraud. Your account may be subject to review.',
    appealable: true,
  },
  'D009': {
    code: 'D009',
    reason: 'Amount Exceeds Limit',
    userExplanation: 'The ticket amount exceeds the maximum reimbursement for this violation type. A partial reimbursement may be available.',
    appealable: false,
  },
  'D010': {
    code: 'D010',
    reason: 'Geographic Restriction',
    userExplanation: 'Courial Shield protection is not currently available in the location where this ticket was issued.',
    appealable: false,
  },
  'D011': {
    code: 'D011',
    reason: 'Waiting Period',
    userExplanation: 'This ticket was issued during your 30-day waiting period. Claims can only be filed for tickets issued after the waiting period ends.',
    appealable: false,
  },
  'D012': {
    code: 'D012',
    reason: 'Absolute Exclusion',
    userExplanation: 'This violation type (fire hydrant, handicap zone, blocking traffic, or blocking intersection) is never eligible for defense or reimbursement. No exceptions.',
    appealable: false,
  },
};

// ============================================
// SUBSCRIPTION & BILLING POLICIES
// ============================================

export interface SubscriptionPolicy {
  billingPeriod: BillingPeriod;
  advanceBilling: boolean;
  autoRenewal: boolean;
  gracePeriodDays: number;
  refundable: boolean;
  cancellationPolicy: string;
}

export const SUBSCRIPTION_POLICIES: Record<BillingPeriod, SubscriptionPolicy> = {
  monthly: {
    billingPeriod: 'monthly',
    advanceBilling: true,
    autoRenewal: true,
    gracePeriodDays: 3,
    refundable: false,
    cancellationPolicy: 'Cancel anytime. Membership continues until the end of your current billing period.',
  },
  annual: {
    billingPeriod: 'annual',
    advanceBilling: true,
    autoRenewal: true,
    gracePeriodDays: 7,
    refundable: false,
    cancellationPolicy: 'Cancel anytime. Membership continues until the end of your current annual period. No partial refunds.',
  },
};

export const BILLING_POLICIES = {
  paymentFailure: {
    retryAttempts: 3,
    retryIntervalDays: [1, 3, 7],
    suspensionAfterDays: 7,
    cancellationAfterDays: 14,
  },
  coverageReset: {
    type: 'annual' as const,
    description: 'Reimbursement limits reset on your membership anniversary date.',
  },
  // Reimbursement model configuration
  paymentModel: {
    type: 'defense-first' as const,
    description: 'Courial Shield contests the citation first. Reimbursement is only considered after a contest is lost.',
    proofOfPaymentRequired: false,
    proofOfPaymentCanBeRequestedPostPayout: true,
    proofOfPaymentReasons: ['audit', 'fraud_detection', 'abuse_prevention'] as const,
    paymentRecipient: 'user' as const, // Courial does NOT pay municipalities directly
    directMunicipalPayment: false,
  },
  // Cancellation restriction
  cancellationRestriction: {
    enabled: true,
    daysAfterPayout: 90,
    description: 'Users cannot cancel their membership for 90 days after receiving a claim payout.',
    enforcedIn: ['subscription_cancellation', 'account_settings'] as const,
  },
  // 30-day waiting period
  waitingPeriod: {
    enabled: true,
    days: 30,
    description: 'No claims may be filed for citations issued within the first 30 days of active membership.',
  },
  // Submission window
  submissionWindow: {
    days: 5,
    description: 'Citations must be uploaded within 5 days of issuance.',
  },
};

// ============================================
// PLAN DEDUCTIBLES (Member Co-Pay)
// ============================================

export const PLAN_DEDUCTIBLES: Record<string, number> = Object.fromEntries(
  Object.values(PLAN_CONFIGS).map((plan) => [plan.id, plan.deductibleRate])
);

export const PLAN_ANNUAL_CAPS: Record<string, number> = Object.fromEntries(
  Object.values(PLAN_CONFIGS).map((plan) => [plan.id, plan.annualCap])
);

// Professional tier towing credit
export const PROFESSIONAL_TOWING_CREDIT = {
  amount: 100,
  description: '$100 one-time towing credit',
  oneTime: true,
};

/**
 * Calculate reimbursement amount after deductible
 * Formula: reimbursement = eligible_amount * (1 - deductible%)
 * Result never exceeds remaining annual cap
 */
export function calculateReimbursementWithDeductible(
  ticketAmount: number,
  planId: string,
  remainingCap: number
): { reimbursement: number; memberCoPay: number; deductibleRate: number } {
  const deductibleRate = PLAN_DEDUCTIBLES[planId] ?? 0.20;
  const reimbursementBeforeCap = ticketAmount * (1 - deductibleRate);
  const reimbursement = Math.min(reimbursementBeforeCap, remainingCap);
  const memberCoPay = ticketAmount - reimbursement;

  return {
    reimbursement: Math.round(reimbursement * 100) / 100,
    memberCoPay: Math.round(memberCoPay * 100) / 100,
    deductibleRate,
  };
}

// ============================================
// GEOGRAPHIC PRICING & RULES
// ============================================

export interface GeographicRule {
  region: string;
  states: string[];
  available: boolean;
  priceMultiplier: number;
  specialRules?: string[];
}

export const GEOGRAPHIC_RULES: GeographicRule[] = [
  {
    region: 'California',
    states: ['CA'],
    available: true,
    priceMultiplier: 1.0,
    specialRules: ['San Francisco tickets over $150 may require additional documentation'],
  },
  {
    region: 'New York',
    states: ['NY'],
    available: true,
    priceMultiplier: 1.15,
    specialRules: ['NYC tickets have a 7-day submission window due to high volume'],
  },
  {
    region: 'Texas',
    states: ['TX'],
    available: true,
    priceMultiplier: 0.9,
  },
  {
    region: 'Florida',
    states: ['FL'],
    available: true,
    priceMultiplier: 0.95,
  },
  {
    region: 'Northeast',
    states: ['MA', 'CT', 'NJ', 'PA'],
    available: true,
    priceMultiplier: 1.1,
  },
  {
    region: 'Midwest',
    states: ['IL', 'OH', 'MI', 'WI', 'MN'],
    available: true,
    priceMultiplier: 0.9,
  },
  {
    region: 'West Coast',
    states: ['WA', 'OR'],
    available: true,
    priceMultiplier: 1.0,
  },
];

// ============================================
// ABUSE PREVENTION
// ============================================

export const ABUSE_PREVENTION_RULES = {
  maxClaimsPerMonth: 10,
  maxClaimsPerYear: 50, // Across all plans
  duplicateTicketWindow: 30, // Days to check for duplicate submissions
  suspiciousPatterns: [
    'Multiple claims from same location within 24 hours',
    'Ticket dates that don\'t match photo metadata',
    'Frequent claims at maximum coverage amount',
    'Claims immediately after subscription start',
  ],
  consequences: {
    warning: 'First offense - account flagged for review',
    suspension: 'Second offense - 30-day claim suspension',
    termination: 'Third offense - account termination, no refund',
  },
};

// ============================================
// BILLING HISTORY & RECEIPTS
// ============================================

export interface BillingRecord {
  id: string;
  userId: string;
  date: string;
  amount: number;
  type: 'subscription' | 'addon' | 'refund';
  description: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  paymentMethod: string;
  receiptUrl?: string;
}

export interface Receipt {
  id: string;
  billingRecordId: string;
  generatedAt: string;
  items: {
    description: string;
    amount: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  billingAddress?: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getCoverageRuleForViolation(violationType: ViolationType): CoverageRule | undefined {
  return COVERAGE_RULES.find(rule => rule.violationType === violationType);
}

export function isViolationCovered(violationType: ViolationType): boolean {
  const rule = getCoverageRuleForViolation(violationType);
  return rule?.covered ?? false;
}

export function getDenialExplanation(code: string): string {
  return DENIAL_CODES[code]?.userExplanation ?? 'Your claim was denied. Please contact support for more information.';
}

export function getGeographicRuleForState(state: string): GeographicRule | undefined {
  return GEOGRAPHIC_RULES.find(rule => rule.states.includes(state.toUpperCase()));
}

export function isStateSupported(state: string): boolean {
  return GEOGRAPHIC_RULES.some(rule => rule.available && rule.states.includes(state.toUpperCase()));
}

export function getPriceMultiplierForState(state: string): number {
  const rule = getGeographicRuleForState(state);
  return rule?.priceMultiplier ?? 1.0;
}
