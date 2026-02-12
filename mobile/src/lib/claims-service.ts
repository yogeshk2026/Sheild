// Courial Shield - Claims Service
// Implements pay-on-approval model, eligibility checks, and cancellation restrictions

import {
  Claim,
  ClaimStatus,
  ClaimDecisionCode,
  Coverage,
  User,
  ViolationType,
  EXCLUDED_VIOLATIONS,
} from './types';
import {
  DENIAL_CODES,
  getCoverageRuleForViolation,
  isViolationCovered,
  calculateReimbursementWithDeductible,
} from './policy';
import { getPlanConfig, normalizePlan, type AppPlanTier } from './plan-config';

// ============================================
// CONSTANTS
// ============================================

// 90-day cancellation restriction after payout (in milliseconds)
export const CANCELLATION_RESTRICTION_DAYS = 90;
export const CANCELLATION_RESTRICTION_MS = CANCELLATION_RESTRICTION_DAYS * 24 * 60 * 60 * 1000;

// Claim submission window (5 days)
export const CLAIM_SUBMISSION_WINDOW_DAYS = 5;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

// ============================================
// AUDIT LOG TYPES
// ============================================

export type AuditEventType =
  | 'CLAIM_SUBMITTED'
  | 'CLAIM_APPROVED'
  | 'CLAIM_DENIED'
  | 'PAYOUT_INITIATED'
  | 'PAYOUT_COMPLETED'
  | 'PROOF_OF_PAYMENT_REQUESTED'
  | 'PROOF_OF_PAYMENT_RECEIVED'
  | 'CANCELLATION_ATTEMPTED'
  | 'CANCELLATION_BLOCKED'
  | 'CANCELLATION_COMPLETED';

export interface AuditLogEntry {
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

// In-memory audit log (in production, this would be persisted to a database)
const auditLog: AuditLogEntry[] = [];

// ============================================
// AUDIT LOGGING FUNCTIONS
// ============================================

export function logAuditEvent(
  eventType: AuditEventType,
  userId: string,
  claimId?: string,
  details: Record<string, unknown> = {},
  metadata?: AuditLogEntry['metadata']
): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    eventType,
    userId,
    claimId,
    details,
    metadata,
  };

  auditLog.push(entry);

  // Log to console for debugging (in production, send to logging service)
  console.log('[AUDIT]', entry);

  return entry;
}

export function getAuditLog(): AuditLogEntry[] {
  return [...auditLog];
}

export function getAuditLogForUser(userId: string): AuditLogEntry[] {
  return auditLog.filter(entry => entry.userId === userId);
}

export function getAuditLogForClaim(claimId: string): AuditLogEntry[] {
  return auditLog.filter(entry => entry.claimId === claimId);
}

// ============================================
// ELIGIBILITY CHECK RESULT
// ============================================

export interface EligibilityCheckResult {
  eligible: boolean;
  reason?: string;
  denialCode?: string;
  details?: Record<string, unknown>;
}

// ============================================
// WAITING PERIOD CHECK
// ============================================

export interface WaitingPeriodCheckResult {
  inWaitingPeriod: boolean;
  waitingPeriodEndDate?: string;
  daysRemaining?: number;
}

/**
 * Check if user is still in the 30-day waiting period
 * Based on membership start date (coverage.periodStart)
 */
export function checkWaitingPeriod(coverage: Coverage | null): WaitingPeriodCheckResult {
  const planId = coverage?.planId ?? 'free';
  const waitingPeriodDays = getPlanConfig(planId).waitingPeriodDays;
  if (waitingPeriodDays <= 0) {
    return { inWaitingPeriod: false };
  }

  if (!coverage?.periodStart) {
    return { inWaitingPeriod: false };
  }

  const membershipStart = new Date(coverage.periodStart);
  const waitingPeriodEnd = new Date(membershipStart.getTime() + waitingPeriodDays * DAY_IN_MS);
  const now = new Date();

  if (now < waitingPeriodEnd) {
    const daysRemaining = Math.ceil(
      (waitingPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      inWaitingPeriod: true,
      waitingPeriodEndDate: waitingPeriodEnd.toISOString(),
      daysRemaining,
    };
  }

  return { inWaitingPeriod: false };
}

/**
 * Check if a ticket date falls within the waiting period
 */
export function isTicketInWaitingPeriod(ticketDate: string, coverage: Coverage | null): boolean {
  const planId = coverage?.planId ?? 'free';
  const waitingPeriodDays = getPlanConfig(planId).waitingPeriodDays;
  if (waitingPeriodDays <= 0 || !coverage?.periodStart) return false;

  const membershipStart = new Date(coverage.periodStart);
  const waitingPeriodEnd = new Date(membershipStart.getTime() + waitingPeriodDays * DAY_IN_MS);
  const ticketDateObj = new Date(ticketDate);

  return ticketDateObj < waitingPeriodEnd;
}

// ============================================
// ELIGIBILITY CHECKS
// ============================================

/**
 * Check if user has an active membership
 */
export function checkActiveSubscription(user: User): EligibilityCheckResult {
  return {
    eligible: true,
    details: {
      hasActiveSubscription: user.hasActiveSubscription,
      currentPlan: user.currentPlan,
    },
  };
}

const getEffectivePlanForUser = (user: User): AppPlanTier => {
  const requestedPlan = normalizePlan(user.currentPlan || user.plan || 'free');
  if (requestedPlan !== 'free' && !user.hasActiveSubscription) {
    return 'free';
  }
  return requestedPlan;
};

const getCoverageUsage = (
  coverage: Coverage | null,
  existingClaims: Claim[]
): { usedAmount: number; ticketsUsed: number } => {
  const relevantClaims = existingClaims.filter((claim) => claim.status !== 'denied');

  if (coverage) {
    return {
      usedAmount: coverage.usedAmount,
      ticketsUsed: coverage.ticketsUsed,
    };
  }

  const usedAmount = relevantClaims.reduce((sum, claim) => {
    const amount = claim.payoutAmount ?? claim.amount ?? 0;
    return sum + amount;
  }, 0);

  return {
    usedAmount,
    ticketsUsed: relevantClaims.length,
  };
};

/**
 * Check if reimbursement limits have not been exceeded
 */
export function checkCoverageLimits(
  planId: AppPlanTier,
  claimAmount: number,
  coverage: Coverage | null,
  existingClaims: Claim[]
): EligibilityCheckResult {
  const planConfig = getPlanConfig(planId);
  const { usedAmount, ticketsUsed } = getCoverageUsage(coverage, existingClaims);
  const remainingCap = Math.max(planConfig.annualCap - usedAmount, 0);

  if (planConfig.maxCoveragePerClaim !== null && claimAmount > planConfig.maxCoveragePerClaim) {
    return {
      eligible: false,
      reason: `Claim amount exceeds the ${planConfig.name} plan per-claim limit`,
      denialCode: 'D003',
      details: {
        planId,
        claimAmount,
        maxCoveragePerClaim: planConfig.maxCoveragePerClaim,
      },
    };
  }

  // Check annual cap
  if (usedAmount + claimAmount > planConfig.annualCap) {
    return {
      eligible: false,
      reason: 'Annual reimbursement limit would be exceeded',
      denialCode: 'D003',
      details: {
        planId,
        annualCap: planConfig.annualCap,
        usedAmount,
        claimAmount,
        remainingCap,
      },
    };
  }

  // Check ticket count
  if (ticketsUsed >= planConfig.maxTicketsPerYear) {
    return {
      eligible: false,
      reason: 'Maximum ticket count for the year has been reached',
      denialCode: 'D003',
      details: {
        planId,
        maxTickets: planConfig.maxTicketsPerYear,
        ticketsUsed,
      },
    };
  }

  return { eligible: true };
}

/**
 * Check if violation type is eligible (including absolute exclusions)
 */
export function checkViolationCoverage(violationType: string): EligibilityCheckResult {
  // Check absolute exclusions first
  const absoluteExclusions = ['hydrant', 'double_parking'];
  if (absoluteExclusions.includes(violationType)) {
    return {
      eligible: false,
      reason: 'This violation type is an ABSOLUTE EXCLUSION and is never eligible for defense or reimbursement',
      denialCode: 'D012',
    };
  }

  if (EXCLUDED_VIOLATIONS.includes(violationType as ViolationType)) {
    return {
      eligible: false,
      reason: 'This violation type is not eligible',
      denialCode: 'D001',
    };
  }

  if (!isViolationCovered(violationType as ViolationType)) {
    return {
      eligible: false,
      reason: 'This violation type is not eligible under your plan',
      denialCode: 'D001',
    };
  }

  return { eligible: true };
}

/**
 * Check if claim is within submission window
 */
export function checkSubmissionWindow(ticketDate: string): EligibilityCheckResult {
  const ticketDateObj = new Date(ticketDate);
  const now = new Date();
  const daysSinceTicket = Math.floor(
    (now.getTime() - ticketDateObj.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceTicket > CLAIM_SUBMISSION_WINDOW_DAYS) {
    return {
      eligible: false,
      reason: `Claim must be submitted within ${CLAIM_SUBMISSION_WINDOW_DAYS} days of ticket date`,
      denialCode: 'D002',
      details: {
        ticketDate,
        daysSinceTicket,
        maxDays: CLAIM_SUBMISSION_WINDOW_DAYS,
      },
    };
  }

  return { eligible: true };
}

/**
 * Check for duplicate claims
 */
export function checkDuplicateClaim(
  ticketNumber: string,
  existingClaims: Claim[]
): EligibilityCheckResult {
  const duplicate = existingClaims.find(
    claim => claim.ticketNumber === ticketNumber && claim.status !== 'denied'
  );

  if (duplicate) {
    return {
      eligible: false,
      reason: 'A claim for this ticket has already been submitted',
      denialCode: 'D005',
      details: {
        existingClaimId: duplicate.id,
        existingClaimStatus: duplicate.status,
      },
    };
  }

  return { eligible: true };
}

/**
 * Run all eligibility checks for a claim
 */
export function runEligibilityChecks(
  user: User,
  coverage: Coverage | null,
  claim: Partial<Claim>,
  existingClaims: Claim[]
): EligibilityCheckResult {
  const effectivePlan = getEffectivePlanForUser(user);
  const planConfig = getPlanConfig(effectivePlan);

  // Check waiting period for plans that require one
  if (claim.ticketDate && isTicketInWaitingPeriod(claim.ticketDate, coverage)) {
    const waitingCheck = checkWaitingPeriod(coverage);
    return {
      eligible: false,
      reason: `This ticket was issued during your ${planConfig.waitingPeriodDays}-day waiting period. Claims can only be filed for tickets issued after ${waitingCheck.waitingPeriodEndDate ? new Date(waitingCheck.waitingPeriodEndDate).toLocaleDateString() : 'the waiting period ends'}.`,
      denialCode: 'D011',
      details: {
        planId: effectivePlan,
        waitingPeriodEndDate: waitingCheck.waitingPeriodEndDate,
        daysRemaining: waitingCheck.daysRemaining,
      },
    };
  }

  // Check reimbursement limits using the effective plan (free/basic/pro/professional)
  const coverageCheck = checkCoverageLimits(
    effectivePlan,
    claim.amount || 0,
    coverage,
    existingClaims
  );
  if (!coverageCheck.eligible) return coverageCheck;

  // Check violation type (including absolute exclusions)
  if (claim.violationType) {
    const violationCheck = checkViolationCoverage(claim.violationType);
    if (!violationCheck.eligible) return violationCheck;
  }

  // Check 5-day submission window
  if (claim.ticketDate) {
    const windowCheck = checkSubmissionWindow(claim.ticketDate);
    if (!windowCheck.eligible) return windowCheck;
  }

  // Check for duplicates
  if (claim.ticketNumber) {
    const duplicateCheck = checkDuplicateClaim(claim.ticketNumber, existingClaims);
    if (!duplicateCheck.eligible) return duplicateCheck;
  }

  return { eligible: true };
}

// ============================================
// CLAIM APPROVAL & REIMBURSEMENT
// ============================================

/**
 * Calculate reimbursement amount based on plan deductible and coverage rules
 * Formula: reimbursement = eligible_amount * (1 - deductible%)
 * Result never exceeds remaining annual cap
 */
export function calculatePayoutAmount(
  claimAmount: number,
  violationType: string,
  coverage: Coverage
): number {
  const rule = getCoverageRuleForViolation(violationType as ViolationType);

  // Apply violation-specific max if applicable
  let eligibleAmount = claimAmount;
  if (rule?.maxAmount !== null && rule?.maxAmount !== undefined) {
    eligibleAmount = Math.min(claimAmount, rule.maxAmount);
  }

  // Apply deductible based on plan
  const { reimbursement } = calculateReimbursementWithDeductible(
    eligibleAmount,
    coverage.planId,
    coverage.remainingAmount
  );

  return reimbursement;
}

/**
 * Approve a claim and initiate reimbursement
 *
 * IMPORTANT: Defense-first model:
 * - Courial Shield contests the citation first
 * - Reimbursement is only considered after a contest is lost
 * - Courial does NOT pay municipalities directly
 * - Reimbursements are sent to members only
 */
export function approveClaim(
  claim: Claim,
  coverage: Coverage,
  user: User,
  payoutAmount: number,
  decisionNotes?: string
): {
  updatedClaim: Claim;
  updatedCoverage: Coverage;
  updatedUser: User;
} {
  const now = new Date().toISOString();

  // Update claim with approval and payout info
  const updatedClaim: Claim = {
    ...claim,
    status: 'paid', // Immediately set to paid (pay-on-approval)
    approvalTimestamp: now,
    payoutTimestamp: now,
    payoutAmount,
    payoutDate: now.split('T')[0],
    decisionCode: 'APPROVED_STANDARD',
    decisionNotes: decisionNotes || 'Claim approved - payout released',
    updatedAt: now,
  };

  // Update coverage usage
  const updatedCoverage: Coverage = {
    ...coverage,
    usedAmount: coverage.usedAmount + payoutAmount,
    remainingAmount: coverage.remainingAmount - payoutAmount,
    ticketsUsed: coverage.ticketsUsed + 1,
  };

  // Update user with payout date and cancellation restriction
  const restrictionEndDate = new Date(Date.now() + CANCELLATION_RESTRICTION_MS);
  const updatedUser: User = {
    ...user,
    lastPayoutDate: now,
    cancellationRestrictionEndDate: restrictionEndDate.toISOString(),
  };

  // Log audit events
  logAuditEvent('CLAIM_APPROVED', user.id, claim.id, {
    payoutAmount,
    decisionCode: 'APPROVED_STANDARD',
  });

  logAuditEvent('PAYOUT_COMPLETED', user.id, claim.id, {
    payoutAmount,
    payoutMethod: 'wallet',
    note: 'Pay-on-approval: Payment released without proof of ticket payment',
  });

  return {
    updatedClaim,
    updatedCoverage,
    updatedUser,
  };
}

/**
 * Deny a claim
 */
export function denyClaim(
  claim: Claim,
  userId: string,
  denialCode: string,
  decisionNotes?: string
): Claim {
  const denialInfo = DENIAL_CODES[denialCode];
  const now = new Date().toISOString();

  const updatedClaim: Claim = {
    ...claim,
    status: 'denied',
    denialReason: denialInfo?.reason || 'Claim denied',
    decisionCode: denialCode as ClaimDecisionCode,
    decisionNotes: decisionNotes || denialInfo?.userExplanation,
    updatedAt: now,
  };

  // Log audit event
  logAuditEvent('CLAIM_DENIED', userId, claim.id, {
    denialCode,
    reason: denialInfo?.reason,
  });

  return updatedClaim;
}

// ============================================
// CANCELLATION RESTRICTION
// ============================================

export interface CancellationCheckResult {
  canCancel: boolean;
  reason?: string;
  restrictionEndDate?: string;
  daysRemaining?: number;
}

/**
 * Check if user can cancel their subscription
 * 90-day restriction applies after any payout
 */
export function checkCancellationEligibility(user: User): CancellationCheckResult {
  if (!user.cancellationRestrictionEndDate) {
    return { canCancel: true };
  }

  const restrictionEnd = new Date(user.cancellationRestrictionEndDate);
  const now = new Date();

  if (now < restrictionEnd) {
    const daysRemaining = Math.ceil(
      (restrictionEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Log the blocked attempt
    logAuditEvent('CANCELLATION_BLOCKED', user.id, undefined, {
      restrictionEndDate: user.cancellationRestrictionEndDate,
      daysRemaining,
      lastPayoutDate: user.lastPayoutDate,
    });

    return {
      canCancel: false,
      reason: `You cannot cancel your subscription until ${daysRemaining} days after your last claim payout. This policy helps prevent abuse of the coverage system.`,
      restrictionEndDate: user.cancellationRestrictionEndDate,
      daysRemaining,
    };
  }

  return { canCancel: true };
}

/**
 * Attempt to cancel subscription
 */
export function attemptCancelSubscription(user: User): {
  success: boolean;
  message: string;
  updatedUser?: User;
} {
  // Log the attempt
  logAuditEvent('CANCELLATION_ATTEMPTED', user.id, undefined, {
    currentPlan: user.plan,
    subscriptionStatus: user.subscriptionStatus,
  });

  const eligibility = checkCancellationEligibility(user);

  if (!eligibility.canCancel) {
    return {
      success: false,
      message: eligibility.reason || 'Cancellation not allowed at this time',
    };
  }

  // Process cancellation
  const updatedUser: User = {
    ...user,
    subscriptionStatus: 'cancelled',
  };

  logAuditEvent('CANCELLATION_COMPLETED', user.id, undefined, {
    previousPlan: user.plan,
  });

  return {
    success: true,
    message: 'Your subscription has been cancelled. Coverage will continue until the end of your current billing period.',
    updatedUser,
  };
}

// ============================================
// POST-PAYOUT AUDIT FUNCTIONS
// ============================================

/**
 * Request proof of payment for audit purposes
 * (Can be requested AFTER payout for fraud detection)
 */
export function requestProofOfPayment(
  claim: Claim,
  userId: string,
  reason: 'audit' | 'fraud_detection' | 'abuse_prevention'
): Claim {
  const now = new Date().toISOString();

  const updatedClaim: Claim = {
    ...claim,
    proofOfPaymentRequested: true,
    proofOfPaymentRequestedAt: now,
  };

  logAuditEvent('PROOF_OF_PAYMENT_REQUESTED', userId, claim.id, {
    reason,
    requestedAt: now,
  });

  return updatedClaim;
}

/**
 * Record receipt of proof of payment
 */
export function recordProofOfPaymentReceived(
  claim: Claim,
  userId: string
): Claim {
  const now = new Date().toISOString();

  const updatedClaim: Claim = {
    ...claim,
    proofOfPaymentReceived: true,
    proofOfPaymentReceivedAt: now,
  };

  logAuditEvent('PROOF_OF_PAYMENT_RECEIVED', userId, claim.id, {
    receivedAt: now,
  });

  return updatedClaim;
}

/**
 * Get claims paid without proof of payment (for admin visibility)
 */
export function getClaimsPaidWithoutProof(claims: Claim[]): Claim[] {
  return claims.filter(
    claim =>
      claim.status === 'paid' &&
      !claim.proofOfPaymentReceived
  );
}

/**
 * Get claims with pending proof of payment requests
 */
export function getClaimsPendingProofOfPayment(claims: Claim[]): Claim[] {
  return claims.filter(
    claim =>
      claim.proofOfPaymentRequested &&
      !claim.proofOfPaymentReceived
  );
}

// ============================================
// PAYMENT MODEL DOCUMENTATION
// ============================================

/**
 * DEFENSE-FIRST REIMBURSEMENT MODEL SUMMARY:
 *
 * 1. User submits a claim with ticket photo and details
 * 2. Claim is reviewed against eligibility criteria:
 *    - Active membership
 *    - Reimbursement limits not exceeded
 *    - Violation type is eligible (not an absolute exclusion)
 *    - Submitted within 5-day window
 *    - Not during 30-day waiting period
 *    - Not a duplicate claim
 * 3. Courial Shield contests the citation first
 * 4. Upon unsuccessful contest or if contest is not viable:
 *    - Reimbursement is calculated: eligible_amount * (1 - deductible%)
 *    - Payment is released to member's wallet
 *    - Member is responsible for paying the municipality
 * 5. Post-payout:
 *    - Courial MAY request proof of payment for:
 *      - Routine audits
 *      - Fraud detection
 *      - Abuse prevention
 *
 * EXPLICIT CONSTRAINTS:
 * - Courial does NOT pay municipalities directly
 * - Payments are made ONLY to users
 * - Payouts are BLOCKED for:
 *   - Denied claims
 *   - Pending/under review claims
 *
 * CANCELLATION RESTRICTION:
 * - 90-day no-cancellation period after any payout
 * - Enforced in subscription cancellation logic
 * - Clear reason message provided if blocked
 */
export const PAYMENT_MODEL_VERSION = '1.0.0';
