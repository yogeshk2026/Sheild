// Courial Shield - Ticket Scanning, Validation & Fraud Detection System

import { ViolationType, VIOLATION_LABELS } from './types';
import {
  COVERAGE_RULES,
  GENERAL_EXCLUSIONS,
  ABUSE_PREVENTION_RULES,
  isViolationCovered,
  isStateSupported,
} from './policy';

// ============================================
// OCR EXTRACTION TYPES
// ============================================

export interface ExtractedTicketData {
  ticketNumber: string | null;
  issueDate: string | null;
  issuingCity: string | null;
  issuingState: string | null;
  issuingAuthority: string | null;
  violationType: ViolationType | null;
  violationDescription: string | null;
  fineAmount: number | null;
  vehiclePlate: string | null;
  vehicleState: string | null;
  locationAddress: string | null;
  confidence: ExtractionConfidence;
  rawText: string;
}

export interface ExtractionConfidence {
  overall: number; // 0-100
  ticketNumber: number;
  issueDate: number;
  fineAmount: number;
  violationType: number;
  location: number;
}

export interface OCRResult {
  success: boolean;
  data: ExtractedTicketData | null;
  imageQuality: ImageQualityAssessment;
  processingTime: number;
  error?: string;
  rawAIData?: any; // Raw AI response with all extracted fields
}

// ============================================
// IMAGE QUALITY & FRAUD DETECTION
// ============================================

export interface ImageQualityAssessment {
  isReadable: boolean;
  isBlurry: boolean;
  isTooDark: boolean;
  isTooLight: boolean;
  hasText: boolean;
  isTicketImage: boolean;
  isScreenshot: boolean;
  hasEditingMarkers: boolean;
  resolution: {
    width: number;
    height: number;
    adequate: boolean;
  };
  issues: ImageQualityIssue[];
}

export interface ImageQualityIssue {
  code: ImageQualityCode;
  severity: 'warning' | 'error';
  message: string;
  userMessage: string;
}

export type ImageQualityCode =
  | 'BLURRY_IMAGE'
  | 'LOW_RESOLUTION'
  | 'TOO_DARK'
  | 'TOO_LIGHT'
  | 'NO_TEXT_DETECTED'
  | 'NOT_TICKET_IMAGE'
  | 'SCREENSHOT_DETECTED'
  | 'EDITING_DETECTED'
  | 'METADATA_MISMATCH'
  | 'DUPLICATE_IMAGE';

export const IMAGE_QUALITY_MESSAGES: Record<ImageQualityCode, { title: string; description: string }> = {
  BLURRY_IMAGE: {
    title: 'Image is Blurry',
    description: 'Please take a clearer photo. Make sure your camera is focused and hold steady.',
  },
  LOW_RESOLUTION: {
    title: 'Low Resolution',
    description: 'The image quality is too low. Please take a higher resolution photo.',
  },
  TOO_DARK: {
    title: 'Image Too Dark',
    description: 'The photo is too dark to read. Please retake in better lighting.',
  },
  TOO_LIGHT: {
    title: 'Image Overexposed',
    description: 'The photo is too bright. Please avoid direct sunlight or flash glare.',
  },
  NO_TEXT_DETECTED: {
    title: 'No Text Found',
    description: 'We couldn\'t detect any text in this image. Please upload a photo of your parking ticket.',
  },
  NOT_TICKET_IMAGE: {
    title: 'Not a Parking Ticket',
    description: 'This doesn\'t appear to be a parking ticket. Please upload a clear photo of your citation.',
  },
  SCREENSHOT_DETECTED: {
    title: 'Screenshot Detected',
    description: 'Please upload an original photo of your physical ticket, not a screenshot.',
  },
  EDITING_DETECTED: {
    title: 'Image May Be Altered',
    description: 'This image appears to have been edited. Please upload an unmodified photo of your ticket.',
  },
  METADATA_MISMATCH: {
    title: 'Image Date Mismatch',
    description: 'The photo date doesn\'t match the ticket date. Please upload a recent photo of the ticket.',
  },
  DUPLICATE_IMAGE: {
    title: 'Duplicate Image',
    description: 'This image has already been used in a previous claim submission.',
  },
};

// ============================================
// FRAUD DETECTION TYPES
// ============================================

export interface FraudDetectionResult {
  isFlagged: boolean;
  riskScore: number; // 0-100, higher = more suspicious
  flags: FraudFlag[];
  requiresManualReview: boolean;
  autoRejectReason?: string;
}

export interface FraudFlag {
  code: FraudFlagCode;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence?: string;
}

export type FraudFlagCode =
  | 'DUPLICATE_TICKET'
  | 'DUPLICATE_IMAGE_HASH'
  | 'TICKET_NUMBER_REUSED'
  | 'SUSPICIOUS_PATTERN'
  | 'RAPID_SUBMISSIONS'
  | 'MAX_AMOUNT_PATTERN'
  | 'METADATA_TAMPERING'
  | 'IMAGE_MANIPULATION'
  | 'DATE_INCONSISTENCY'
  | 'LOCATION_MISMATCH'
  | 'KNOWN_FRAUD_INDICATOR';

export const FRAUD_FLAG_DESCRIPTIONS: Record<FraudFlagCode, string> = {
  DUPLICATE_TICKET: 'This ticket number has been submitted before',
  DUPLICATE_IMAGE_HASH: 'This exact image has been used in a previous claim',
  TICKET_NUMBER_REUSED: 'This ticket number appears in another account',
  SUSPICIOUS_PATTERN: 'Submission pattern matches known fraud indicators',
  RAPID_SUBMISSIONS: 'Multiple claims submitted in a short time period',
  MAX_AMOUNT_PATTERN: 'Frequent claims at or near maximum coverage amount',
  METADATA_TAMPERING: 'Image metadata appears to have been modified',
  IMAGE_MANIPULATION: 'Image shows signs of digital manipulation',
  DATE_INCONSISTENCY: 'Ticket date doesn\'t match image creation date',
  LOCATION_MISMATCH: 'Ticket location doesn\'t match user\'s typical area',
  KNOWN_FRAUD_INDICATOR: 'Matches a known fraudulent ticket pattern',
};

// ============================================
// VALIDATION TYPES
// ============================================

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  autoPopulatedFields: string[];
}

export interface ValidationError {
  code: ValidationErrorCode;
  field?: string;
  message: string;
  userMessage: string;
}

export interface ValidationWarning {
  code: string;
  field?: string;
  message: string;
}

export type ValidationErrorCode =
  | 'MISSING_TICKET_NUMBER'
  | 'MISSING_DATE'
  | 'MISSING_AMOUNT'
  | 'MISSING_VIOLATION_TYPE'
  | 'MISSING_LOCATION'
  | 'INVALID_DATE_FORMAT'
  | 'DATE_TOO_OLD'
  | 'DATE_IN_FUTURE'
  | 'OUTSIDE_COVERAGE_PERIOD'
  | 'EXCLUDED_VIOLATION'
  | 'UNSUPPORTED_LOCATION'
  | 'AMOUNT_EXCEEDS_LIMIT'
  | 'COVERAGE_LIMIT_REACHED'
  | 'MAX_TICKETS_REACHED'
  | 'DUPLICATE_SUBMISSION'
  | 'INACTIVE_SUBSCRIPTION';

export const VALIDATION_ERROR_MESSAGES: Record<ValidationErrorCode, string> = {
  MISSING_TICKET_NUMBER: 'Please enter the ticket number from your citation.',
  MISSING_DATE: 'Please enter the date the ticket was issued.',
  MISSING_AMOUNT: 'Please enter the fine amount shown on the ticket.',
  MISSING_VIOLATION_TYPE: 'Please select the type of violation.',
  MISSING_LOCATION: 'Please enter the city where the ticket was issued.',
  INVALID_DATE_FORMAT: 'Please enter a valid date in MM/DD/YYYY format.',
  DATE_TOO_OLD: 'This ticket is more than 5 days old and cannot be claimed.',
  DATE_IN_FUTURE: 'The ticket date cannot be in the future.',
  OUTSIDE_COVERAGE_PERIOD: 'This ticket was issued before your coverage started.',
  EXCLUDED_VIOLATION: 'This violation type is not covered under your plan.',
  UNSUPPORTED_LOCATION: 'Courial Shield is not yet available in this location.',
  AMOUNT_EXCEEDS_LIMIT: 'The ticket amount exceeds your plan\'s per-ticket limit.',
  COVERAGE_LIMIT_REACHED: 'You\'ve reached your annual coverage limit.',
  MAX_TICKETS_REACHED: 'You\'ve reached your maximum tickets for this period.',
  DUPLICATE_SUBMISSION: 'A claim for this ticket has already been submitted.',
  INACTIVE_SUBSCRIPTION: 'Your subscription must be active to submit claims.',
};

// ============================================
// ADMIN REVIEW TYPES
// ============================================

export interface AdminReviewItem {
  id: string;
  claimId: string;
  userId: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'denied' | 'resubmit_requested';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  flagCodes: FraudFlagCode[];
  qualityIssues: ImageQualityCode[];
  extractedData: ExtractedTicketData | null;
  userProvidedData: {
    ticketNumber: string;
    ticketDate: string;
    city: string;
    state: string;
    violationType: string;
    amount: number;
  };
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  decision?: {
    action: 'approve' | 'deny' | 'request_resubmit';
    reason: string;
    denialCode?: string;
  };
  auditLog: AuditLogEntry[];
}

export interface AuditLogEntry {
  timestamp: string;
  action: string;
  actor: string; // 'system' | 'user:{id}' | 'admin:{id}'
  details: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// SCANNING SERVICE FUNCTIONS
// ============================================

/**
 * Assess image quality before OCR processing
 */
export function assessImageQuality(
  imageUri: string,
  metadata?: { width: number; height: number; fileSize: number; mimeType: string }
): ImageQualityAssessment {
  const issues: ImageQualityIssue[] = [];

  // Check resolution
  const minWidth = 800;
  const minHeight = 600;
  const hasAdequateResolution = metadata
    ? metadata.width >= minWidth && metadata.height >= minHeight
    : true;

  if (metadata && !hasAdequateResolution) {
    issues.push({
      code: 'LOW_RESOLUTION',
      severity: 'error',
      message: `Image resolution ${metadata.width}x${metadata.height} is below minimum ${minWidth}x${minHeight}`,
      userMessage: IMAGE_QUALITY_MESSAGES.LOW_RESOLUTION.description,
    });
  }

  // In a real implementation, these would use actual image analysis
  // For now, we'll return a mock assessment
  return {
    isReadable: issues.filter(i => i.severity === 'error').length === 0,
    isBlurry: false,
    isTooDark: false,
    isTooLight: false,
    hasText: true,
    isTicketImage: true,
    isScreenshot: false,
    hasEditingMarkers: false,
    resolution: {
      width: metadata?.width ?? 1200,
      height: metadata?.height ?? 900,
      adequate: hasAdequateResolution,
    },
    issues,
  };
}

/**
 * Extract ticket data from image using OCR
 * In production, this would call an AI vision API (GPT-4 Vision, Claude, etc.)
 */
export async function extractTicketData(
  imageUri: string,
  imageBase64?: string
): Promise<OCRResult> {
  const startTime = Date.now();

  // Assess image quality first
  const imageQuality = assessImageQuality(imageUri);

  if (!imageQuality.isReadable) {
    return {
      success: false,
      data: null,
      imageQuality,
      processingTime: Date.now() - startTime,
      error: 'Image quality too low for text extraction',
    };
  }

  // In production, call AI vision API here
  // For demo, return mock extracted data with confidence scores
  const mockExtractedData: ExtractedTicketData = {
    ticketNumber: null,
    issueDate: null,
    issuingCity: null,
    issuingState: null,
    issuingAuthority: null,
    violationType: null,
    violationDescription: null,
    fineAmount: null,
    vehiclePlate: null,
    vehicleState: null,
    locationAddress: null,
    confidence: {
      overall: 0,
      ticketNumber: 0,
      issueDate: 0,
      fineAmount: 0,
      violationType: 0,
      location: 0,
    },
    rawText: '',
  };

  return {
    success: true,
    data: mockExtractedData,
    imageQuality,
    processingTime: Date.now() - startTime,
  };
}

/**
 * Detect potential fraud indicators
 */
export function detectFraud(
  extractedData: ExtractedTicketData | null,
  userProvidedData: {
    ticketNumber: string;
    ticketDate: string;
    city: string;
    state: string;
    amount: number;
  },
  userHistory: {
    previousClaims: Array<{ ticketNumber: string; imageHash?: string; submittedAt: string }>;
    submissionsLast24h: number;
    submissionsLast7d: number;
  }
): FraudDetectionResult {
  const flags: FraudFlag[] = [];
  let riskScore = 0;

  // Check for duplicate ticket number
  const isDuplicateTicket = userHistory.previousClaims.some(
    claim => claim.ticketNumber.toLowerCase() === userProvidedData.ticketNumber.toLowerCase()
  );
  if (isDuplicateTicket) {
    flags.push({
      code: 'DUPLICATE_TICKET',
      severity: 'critical',
      description: FRAUD_FLAG_DESCRIPTIONS.DUPLICATE_TICKET,
    });
    riskScore += 50;
  }

  // Check for rapid submissions
  if (userHistory.submissionsLast24h >= 3) {
    flags.push({
      code: 'RAPID_SUBMISSIONS',
      severity: 'medium',
      description: FRAUD_FLAG_DESCRIPTIONS.RAPID_SUBMISSIONS,
      evidence: `${userHistory.submissionsLast24h} submissions in last 24 hours`,
    });
    riskScore += 20;
  }

  // Check data consistency between OCR and user input
  if (extractedData) {
    // Date consistency check
    if (extractedData.issueDate && extractedData.issueDate !== userProvidedData.ticketDate) {
      flags.push({
        code: 'DATE_INCONSISTENCY',
        severity: 'medium',
        description: FRAUD_FLAG_DESCRIPTIONS.DATE_INCONSISTENCY,
        evidence: `OCR: ${extractedData.issueDate}, User: ${userProvidedData.ticketDate}`,
      });
      riskScore += 15;
    }

    // Amount consistency check (allow 10% variance for OCR errors)
    if (extractedData.fineAmount) {
      const amountDiff = Math.abs(extractedData.fineAmount - userProvidedData.amount);
      const variance = amountDiff / userProvidedData.amount;
      if (variance > 0.1) {
        flags.push({
          code: 'SUSPICIOUS_PATTERN',
          severity: 'medium',
          description: 'Amount mismatch between extracted and entered data',
          evidence: `OCR: $${extractedData.fineAmount}, User: $${userProvidedData.amount}`,
        });
        riskScore += 15;
      }
    }
  }

  // Determine if manual review is required
  const requiresManualReview = riskScore >= 30 || flags.some(f => f.severity === 'critical' || f.severity === 'high');

  // Auto-reject if risk score is too high
  const autoRejectReason = riskScore >= 70
    ? 'Claim flagged for potential fraud based on multiple indicators'
    : undefined;

  return {
    isFlagged: flags.length > 0,
    riskScore: Math.min(riskScore, 100),
    flags,
    requiresManualReview,
    autoRejectReason,
  };
}

/**
 * Validate ticket data against coverage rules
 */
export function validateTicketData(
  data: {
    ticketNumber: string;
    ticketDate: string;
    city: string;
    state: string;
    violationType: ViolationType | string;
    amount: number;
  },
  coverage: {
    planId: string;
    periodStart: string;
    periodEnd: string;
    usedAmount: number;
    remainingAmount: number;
    ticketsUsed: number;
    maxTickets: number;
    annualCap: number;
  } | null,
  existingClaims: Array<{ ticketNumber: string }>
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const autoPopulatedFields: string[] = [];

  // Required field checks
  if (!data.ticketNumber?.trim()) {
    errors.push({
      code: 'MISSING_TICKET_NUMBER',
      field: 'ticketNumber',
      message: 'Ticket number is required',
      userMessage: VALIDATION_ERROR_MESSAGES.MISSING_TICKET_NUMBER,
    });
  }

  if (!data.ticketDate?.trim()) {
    errors.push({
      code: 'MISSING_DATE',
      field: 'ticketDate',
      message: 'Ticket date is required',
      userMessage: VALIDATION_ERROR_MESSAGES.MISSING_DATE,
    });
  }

  if (!data.amount || data.amount <= 0) {
    errors.push({
      code: 'MISSING_AMOUNT',
      field: 'amount',
      message: 'Fine amount is required',
      userMessage: VALIDATION_ERROR_MESSAGES.MISSING_AMOUNT,
    });
  }

  if (!data.city?.trim()) {
    errors.push({
      code: 'MISSING_LOCATION',
      field: 'city',
      message: 'City is required',
      userMessage: VALIDATION_ERROR_MESSAGES.MISSING_LOCATION,
    });
  }

  // Date validation
  if (data.ticketDate) {
    const ticketDate = new Date(data.ticketDate);
    const now = new Date();
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    if (isNaN(ticketDate.getTime())) {
      errors.push({
        code: 'INVALID_DATE_FORMAT',
        field: 'ticketDate',
        message: 'Invalid date format',
        userMessage: VALIDATION_ERROR_MESSAGES.INVALID_DATE_FORMAT,
      });
    } else if (ticketDate > now) {
      errors.push({
        code: 'DATE_IN_FUTURE',
        field: 'ticketDate',
        message: 'Ticket date cannot be in the future',
        userMessage: VALIDATION_ERROR_MESSAGES.DATE_IN_FUTURE,
      });
    } else if (ticketDate < fiveDaysAgo) {
      errors.push({
        code: 'DATE_TOO_OLD',
        field: 'ticketDate',
        message: 'Ticket is more than 5 days old',
        userMessage: VALIDATION_ERROR_MESSAGES.DATE_TOO_OLD,
      });
    }

    // Check if within coverage period
    if (coverage && ticketDate < new Date(coverage.periodStart)) {
      errors.push({
        code: 'OUTSIDE_COVERAGE_PERIOD',
        field: 'ticketDate',
        message: 'Ticket was issued before coverage started',
        userMessage: VALIDATION_ERROR_MESSAGES.OUTSIDE_COVERAGE_PERIOD,
      });
    }
  }

  // Location validation
  if (data.state && !isStateSupported(data.state)) {
    errors.push({
      code: 'UNSUPPORTED_LOCATION',
      field: 'state',
      message: `State ${data.state} is not supported`,
      userMessage: VALIDATION_ERROR_MESSAGES.UNSUPPORTED_LOCATION,
    });
  }

  // Violation type validation
  if (data.violationType && !isViolationCovered(data.violationType as ViolationType)) {
    errors.push({
      code: 'EXCLUDED_VIOLATION',
      field: 'violationType',
      message: 'Violation type is excluded from coverage',
      userMessage: VALIDATION_ERROR_MESSAGES.EXCLUDED_VIOLATION,
    });
  }

  // Coverage limit checks
  if (coverage) {
    if (coverage.ticketsUsed >= coverage.maxTickets) {
      errors.push({
        code: 'MAX_TICKETS_REACHED',
        message: 'Maximum tickets for period reached',
        userMessage: VALIDATION_ERROR_MESSAGES.MAX_TICKETS_REACHED,
      });
    }

    if (coverage.remainingAmount <= 0) {
      errors.push({
        code: 'COVERAGE_LIMIT_REACHED',
        message: 'Annual coverage limit reached',
        userMessage: VALIDATION_ERROR_MESSAGES.COVERAGE_LIMIT_REACHED,
      });
    } else if (data.amount > coverage.remainingAmount) {
      warnings.push({
        code: 'PARTIAL_COVERAGE',
        field: 'amount',
        message: `Only $${coverage.remainingAmount} of coverage remaining`,
      });
    }
  } else {
    errors.push({
      code: 'INACTIVE_SUBSCRIPTION',
      message: 'No active subscription',
      userMessage: VALIDATION_ERROR_MESSAGES.INACTIVE_SUBSCRIPTION,
    });
  }

  // Duplicate check
  const isDuplicate = existingClaims.some(
    claim => claim.ticketNumber.toLowerCase() === data.ticketNumber?.toLowerCase()
  );
  if (isDuplicate) {
    errors.push({
      code: 'DUPLICATE_SUBMISSION',
      field: 'ticketNumber',
      message: 'This ticket has already been submitted',
      userMessage: VALIDATION_ERROR_MESSAGES.DUPLICATE_SUBMISSION,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    autoPopulatedFields,
  };
}

/**
 * Map raw violation text to violation type
 */
export function mapViolationTypeFromText(text: string): ViolationType | null {
  const normalizedText = text.toLowerCase();

  const mappings: Array<{ keywords: string[]; type: ViolationType }> = [
    { keywords: ['meter', 'expired meter', 'parking meter'], type: 'parking_meter' },
    { keywords: ['street cleaning', 'street sweep', 'sweeping'], type: 'street_cleaning' },
    { keywords: ['no parking', 'no-parking', 'no standing'], type: 'no_parking' },
    { keywords: ['hydrant', 'fire hydrant'], type: 'hydrant' },
    { keywords: ['loading', 'loading zone', 'commercial'], type: 'loading_zone' },
    { keywords: ['double park', 'double-park', 'double parked'], type: 'double_parking' },
    { keywords: ['registration', 'expired reg', 'expired tag'], type: 'expired_registration' },
  ];

  for (const mapping of mappings) {
    if (mapping.keywords.some(keyword => normalizedText.includes(keyword))) {
      return mapping.type;
    }
  }

  return 'other';
}

/**
 * Format date from various formats to MM/DD/YYYY
 */
export function normalizeDate(dateString: string): string | null {
  if (!dateString) return null;

  // Try various date formats
  const formats = [
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY
    /(\d{1,2})-(\d{1,2})-(\d{4})/, // MM-DD-YYYY
    /(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
    /([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/, // Month DD, YYYY
  ];

  for (const format of formats) {
    const match = dateString.match(format);
    if (match) {
      try {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
        }
      } catch {
        continue;
      }
    }
  }

  return null;
}

/**
 * Create audit log entry
 */
export function createAuditLogEntry(
  action: string,
  actor: string,
  details: string,
  metadata?: Record<string, unknown>
): AuditLogEntry {
  return {
    timestamp: new Date().toISOString(),
    action,
    actor,
    details,
    metadata,
  };
}
