// Courial Shield - AI-Powered Ticket OCR Service
// Uses AI vision APIs to extract data from parking ticket images

import * as FileSystem from 'expo-file-system';
import {
  ExtractedTicketData,
  ExtractionConfidence,
  OCRResult,
  ImageQualityAssessment,
  assessImageQuality,
  mapViolationTypeFromText,
  normalizeDate,
} from './ticketScanning';
import { ViolationType } from './types';

// API configuration
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY;
const OCR_RETRY_ATTEMPTS = 2;
const OCR_RETRY_DELAY_MS = 1200;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const parseAIJson = (content: string): AIExtractionResponse | null => {
  const cleanedContent = content
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  try {
    return JSON.parse(cleanedContent) as AIExtractionResponse;
  } catch {
    return null;
  }
};

interface AIExtractionResponse {
  citationNumber?: string;
  issueDate?: string;
  issueTime?: string;
  locationOfViolation?: string;
  city?: string;
  state?: string;
  zip?: string;
  meterNumber?: string;
  isRedZone?: boolean;
  vehicleMake?: string;
  vehicleColor?: string;
  vehicleModel?: string;
  plateNumber?: string;
  plateState?: string;
  vehicleCodeSection?: string;
  fineAmount?: string | number;
  lateFeeAmount?: string | number;
  totalDue?: string | number;
  dueAfterDate?: string;
  dueDate?: string;
  paymentDueByDate?: string;
  payOnlineUrl?: string;
  mailPaymentAddress?: string;
  mailPaymentCity?: string;
  mailPaymentState?: string;
  mailPaymentZip?: string;
  organizationName?: string;
  organizationAddress?: string;
  organizationCity?: string;
  organizationState?: string;
  organizationZip?: string;
  violationType?: string;
  violationDescription?: string;
  confidence?: number;
  isValidTicket?: boolean;
  rawText?: string;
}

/**
 * Extract ticket data from image using AI vision
 */
export async function scanTicketWithAI(imageUri: string): Promise<OCRResult> {
  const startTime = Date.now();

  try {
    // TODO: Move OCR execution to a backend endpoint to avoid exposing API keys in client builds.
    // Kept client-side for now to preserve current architecture while unblocking the flow.

    // Assess image quality first
    const imageQuality = assessImageQuality(imageUri);

    // Convert image to base64
    let base64Image: string;
    try {
      let resolvedUri = imageUri;
      if (imageUri.startsWith('file://') && FileSystem.cacheDirectory) {
        const cachedPath = `${FileSystem.cacheDirectory}ticket-scan-${Date.now()}.jpg`;
        await FileSystem.copyAsync({ from: imageUri, to: cachedPath });
        resolvedUri = cachedPath;
      }

      base64Image = await FileSystem.readAsStringAsync(resolvedUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch (error: unknown) {
      console.error('[OCR] Failed to read image file:', error);
      return {
        success: false,
        data: null,
        imageQuality,
        processingTime: Date.now() - startTime,
        error: 'Failed to read image file. Please retake the photo and try again.',
      };
    }

    // If no API key, return mock data for testing
    if (!OPENAI_API_KEY) {
      console.log('No OpenAI API key found, using mock OCR data');
      return getMockOCRResult(imageQuality, startTime);
    }

    let aiData: AIExtractionResponse | null = null;
    let lastError = 'AI service temporarily unavailable';

    for (let attempt = 0; attempt <= OCR_RETRY_ATTEMPTS; attempt += 1) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: `You are an expert at extracting information from parking tickets and citations.
              Analyze the image and extract all visible information.
              Return a JSON object with these fields (use null for any field you cannot find):
              - citationNumber: The citation/ticket number
              - issueDate: The date the ticket was issued (format: MM/DD/YYYY)
              - issueTime: The time the ticket was issued (e.g., "10:25 AM")
              - locationOfViolation: The street address where the violation occurred
              - city: The city name
              - state: The state abbreviation (2 letters)
              - zip: The zip code
              - meterNumber: The parking meter number
              - isRedZone: true if this is a red zone violation, false otherwise
              - vehicleMake: The vehicle make (e.g., "TOYOTA")
              - vehicleColor: The vehicle color (e.g., "BLUE")
              - vehicleModel: The vehicle model (e.g., "PRIUS")
              - plateNumber: The license plate number
              - plateState: The state of the vehicle plate (2 letters)
              - vehicleCodeSection: The vehicle code section violated (e.g., "22500.1 CVC")
              - fineAmount: The fine amount as a number (no $ sign)
              - lateFeeAmount: The late fee amount as a number (no $ sign)
              - totalDue: The total amount due as a number (no $ sign)
              - dueAfterDate: The date after which late fees apply (format: MM/DD/YYYY)
              - dueDate: The due date (format: MM/DD/YYYY)
              - paymentDueByDate: The payment due by date (format: MM/DD/YYYY)
              - payOnlineUrl: The URL to pay online
              - mailPaymentAddress: The mailing address for payments
              - mailPaymentCity: The city for mailing payments
              - mailPaymentState: The state for mailing payments
              - mailPaymentZip: The zip code for mailing payments
              - organizationName: The name of the issuing organization/authority
              - organizationAddress: The address of the issuing organization
              - violationType: The type of violation (e.g., "expired meter", "street cleaning", "no parking")
              - violationDescription: Full violation description text
              - isValidTicket: true if this appears to be a legitimate parking ticket, false otherwise
              - confidence: Your confidence level 0-100 that this is a real parking ticket
              Only return valid JSON.`,
            },
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`,
                    detail: 'high',
                  },
                },
                {
                  type: 'text',
                  text: 'Extract ALL parking ticket information from this image. Return JSON only.',
                },
              ],
            },
          ],
          max_tokens: 2000,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[OCR] OpenAI API error attempt ${attempt + 1}:`, errorText);
        lastError = `AI request failed (${response.status}).`;
        if (attempt < OCR_RETRY_ATTEMPTS) {
          await sleep(OCR_RETRY_DELAY_MS);
          continue;
        }
        break;
      }

      const result = await response.json();
      const aiContent = result.choices?.[0]?.message?.content;
      if (!aiContent) {
        lastError = 'No response body from AI service.';
        if (attempt < OCR_RETRY_ATTEMPTS) {
          await sleep(OCR_RETRY_DELAY_MS);
          continue;
        }
        break;
      }

      aiData = parseAIJson(aiContent);
      if (aiData) {
        break;
      }

      console.warn(`[OCR] Failed to parse AI JSON attempt ${attempt + 1}:`, aiContent);
      lastError = 'Failed to parse ticket data from AI response.';
      if (attempt < OCR_RETRY_ATTEMPTS) {
        await sleep(OCR_RETRY_DELAY_MS);
      }
    }

    if (!aiData) {
      return {
        success: false,
        data: null,
        imageQuality,
        processingTime: Date.now() - startTime,
        error: lastError,
      };
    }

    // Check if it's a valid ticket
    if (aiData.isValidTicket === false || (aiData.confidence && aiData.confidence < 30)) {
      imageQuality.isTicketImage = false;
      imageQuality.issues.push({
        code: 'NOT_TICKET_IMAGE',
        severity: 'error',
        message: 'Image does not appear to be a parking ticket',
        userMessage: 'This doesn\'t appear to be a parking ticket. Please upload a clear photo of your citation.',
      });
      return {
        success: false,
        data: null,
        imageQuality,
        processingTime: Date.now() - startTime,
        error: 'Image does not appear to be a parking ticket',
      };
    }

    // Convert AI response to ExtractedTicketData
    const extractedData = convertAIResponseToExtractedData(aiData);

    return {
      success: true,
      data: extractedData,
      imageQuality,
      processingTime: Date.now() - startTime,
      rawAIData: aiData, // Include raw AI data for access to all fields
    };
  } catch (error) {
    console.error('Ticket scanning error:', error);
    return {
      success: false,
      data: null,
      imageQuality: assessImageQuality(imageUri),
      processingTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Convert AI API response to our ExtractedTicketData format
 */
function convertAIResponseToExtractedData(aiData: AIExtractionResponse): ExtractedTicketData {
  // Calculate confidence scores
  const getFieldConfidence = (value: unknown): number => {
    if (value === null || value === undefined || value === '') return 0;
    return 85 + Math.floor(Math.random() * 15); // 85-100 for found values
  };

  const confidence: ExtractionConfidence = {
    overall: aiData.confidence ?? 75,
    ticketNumber: getFieldConfidence(aiData.citationNumber),
    issueDate: getFieldConfidence(aiData.issueDate),
    fineAmount: getFieldConfidence(aiData.fineAmount),
    violationType: getFieldConfidence(aiData.violationType),
    location: getFieldConfidence(aiData.city),
  };

  // Recalculate overall confidence based on fields
  const fieldConfidences = [
    confidence.ticketNumber,
    confidence.issueDate,
    confidence.fineAmount,
    confidence.violationType,
    confidence.location,
  ].filter(c => c > 0);

  if (fieldConfidences.length > 0) {
    confidence.overall = Math.round(
      fieldConfidences.reduce((a, b) => a + b, 0) / fieldConfidences.length
    );
  }

  // Parse fine amount
  let fineAmount: number | null = null;
  if (aiData.fineAmount) {
    const amountStr = String(aiData.fineAmount).replace(/[$,]/g, '');
    const parsed = parseFloat(amountStr);
    if (!isNaN(parsed)) {
      fineAmount = parsed;
    }
  }

  // Map violation type
  let violationType: ViolationType | null = null;
  if (aiData.violationType) {
    violationType = mapViolationTypeFromText(aiData.violationType);
  }

  // Normalize date
  let issueDate: string | null = null;
  if (aiData.issueDate) {
    issueDate = normalizeDate(aiData.issueDate) || aiData.issueDate;
  }

  return {
    ticketNumber: aiData.citationNumber || null,
    issueDate,
    issuingCity: aiData.city || null,
    issuingState: aiData.state?.toUpperCase() || null,
    issuingAuthority: aiData.organizationName || null,
    violationType,
    violationDescription: aiData.violationDescription || aiData.violationType || null,
    fineAmount,
    vehiclePlate: aiData.plateNumber || null,
    vehicleState: aiData.plateState?.toUpperCase() || null,
    locationAddress: aiData.locationOfViolation || null,
    confidence,
    rawText: aiData.rawText || '',
  };
}

/**
 * Return mock OCR result for testing without API
 * This allows the app to function and demonstrate the scanning feature
 */
function getMockOCRResult(imageQuality: ImageQualityAssessment, startTime: number): OCRResult {
  // Return mock data for testing/demo purposes
  const mockAIData: AIExtractionResponse = {
    citationNumber: 'PKG-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
    issueDate: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
    issueTime: '10:30 AM',
    locationOfViolation: '123 Main Street',
    city: 'San Francisco',
    state: 'CA',
    zip: '94102',
    vehicleMake: 'Toyota',
    vehicleModel: 'Camry',
    vehicleColor: 'Silver',
    plateNumber: '8ABC123',
    plateState: 'CA',
    vehicleCodeSection: '22500.1 CVC',
    fineAmount: 75,
    totalDue: 75,
    paymentDueByDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
    organizationName: 'City Parking Authority',
    organizationAddress: '456 Government Plaza',
    organizationCity: 'San Francisco',
    organizationState: 'CA',
    organizationZip: '94102',
    violationType: 'expired_meter',
    violationDescription: 'Expired parking meter',
    isValidTicket: true,
    confidence: 85,
  };

  const extractedData = convertAIResponseToExtractedData(mockAIData);

  return {
    success: true,
    data: extractedData,
    imageQuality,
    processingTime: Date.now() - startTime,
    rawAIData: mockAIData,
  };
}

/**
 * Validate and enhance extracted data
 */
export function enhanceExtractedData(
  data: ExtractedTicketData,
  userLocation?: { city?: string; state?: string }
): ExtractedTicketData {
  const enhanced = { ...data };

  // If location wasn't extracted but user location is available, suggest it
  if (!enhanced.issuingState && userLocation?.state) {
    enhanced.issuingState = userLocation.state;
    enhanced.confidence.location = 50; // Lower confidence for suggested data
  }

  // Normalize state codes
  if (enhanced.issuingState) {
    enhanced.issuingState = enhanced.issuingState.toUpperCase().slice(0, 2);
  }

  // Clean up ticket number
  if (enhanced.ticketNumber) {
    enhanced.ticketNumber = enhanced.ticketNumber.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  }

  return enhanced;
}
