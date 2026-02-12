// Courial Shield - Claim Verification Service
// AI-based verification of claim data against user profile

import type { User, Vehicle, ClaimVerificationResult, ClaimVerificationIssue } from './types';

interface ClaimData {
  ticketNumber: string;
  ticketDate: string;
  city: string;
  state: string;
  amount: number;
  violationType: string;
  // Fields extracted from ticket (via OCR/AI)
  nameOnTicket?: string;
  licensePlateOnTicket?: string;
  vehicleMakeOnTicket?: string;
  vehicleModelOnTicket?: string;
  vehicleColorOnTicket?: string;
}

/**
 * Normalize a string for comparison (lowercase, remove extra spaces)
 */
function normalizeString(str: string): string {
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Check if two names match (with some flexibility for variations)
 */
function namesMatch(name1: string, name2: string): boolean {
  const n1 = normalizeString(name1);
  const n2 = normalizeString(name2);

  // Exact match
  if (n1 === n2) return true;

  // Check if one contains the other (e.g., "John Smith" vs "J Smith")
  const parts1 = n1.split(' ');
  const parts2 = n2.split(' ');

  // Last name must match
  const lastName1 = parts1[parts1.length - 1];
  const lastName2 = parts2[parts2.length - 1];

  if (lastName1 !== lastName2) return false;

  // First name can be initial
  const firstName1 = parts1[0];
  const firstName2 = parts2[0];

  if (firstName1 === firstName2) return true;
  if (firstName1.charAt(0) === firstName2.charAt(0)) return true;

  return false;
}

/**
 * Check if license plates match (with normalization)
 */
function licensePlatesMatch(plate1: string, plate2: string): boolean {
  // Remove spaces, dashes, and convert to uppercase
  const normalize = (p: string) => p.toUpperCase().replace(/[\s-]/g, '');
  return normalize(plate1) === normalize(plate2);
}

/**
 * Check if location matches user's profile or typical operating area
 */
function locationMatches(ticketCity: string, ticketState: string, user: User): boolean {
  // Check if ticket state matches user's state
  if (user.address?.state) {
    const userState = user.address.state.toUpperCase();
    const tState = ticketState.toUpperCase();

    // Same state = definitely matches
    if (userState === tState) return true;

    // Adjacent states are often valid for gig workers near borders
    const adjacentStates: Record<string, string[]> = {
      'CA': ['NV', 'AZ', 'OR'],
      'NY': ['NJ', 'CT', 'PA', 'MA', 'VT'],
      'TX': ['NM', 'OK', 'AR', 'LA'],
      'FL': ['GA', 'AL'],
      // Add more as needed
    };

    if (adjacentStates[userState]?.includes(tState)) return true;
  }

  return false;
}

/**
 * Verify claim data against user profile
 * Returns verification result with any issues found
 */
export function verifyClaimAgainstProfile(
  user: User,
  claimData: ClaimData
): ClaimVerificationResult {
  const issues: ClaimVerificationIssue[] = [];

  // Get user's full name
  const userFullName = user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`
    : user.name || '';

  // Get user's primary vehicle
  const primaryVehicle = user.vehicles?.find(v => v.isPrimary) || user.vehicles?.[0];

  // 1. Verify name on ticket matches user profile
  if (claimData.nameOnTicket && userFullName) {
    if (!namesMatch(claimData.nameOnTicket, userFullName)) {
      issues.push({
        field: 'name',
        expected: userFullName,
        found: claimData.nameOnTicket,
        severity: 'error',
        message: `Name on ticket "${claimData.nameOnTicket}" does not match profile name "${userFullName}".`,
      });
    }
  }

  // 2. Verify license plate matches registered vehicle
  if (claimData.licensePlateOnTicket && primaryVehicle) {
    if (!licensePlatesMatch(claimData.licensePlateOnTicket, primaryVehicle.licensePlate)) {
      // Check all registered vehicles, not just primary
      const matchingVehicle = user.vehicles?.find(v =>
        licensePlatesMatch(claimData.licensePlateOnTicket!, v.licensePlate)
      );

      if (!matchingVehicle) {
        issues.push({
          field: 'licensePlate',
          expected: primaryVehicle.licensePlate,
          found: claimData.licensePlateOnTicket,
          severity: 'error',
          message: `License plate "${claimData.licensePlateOnTicket}" does not match any registered vehicle.`,
        });
      }
    }
  }

  // 3. Verify location is within user's typical operating area
  if (!locationMatches(claimData.city, claimData.state, user)) {
    issues.push({
      field: 'location',
      expected: user.address?.state || 'Unknown',
      found: claimData.state,
      severity: 'warning',
      message: `Ticket location (${claimData.city}, ${claimData.state}) is outside your typical operating area.`,
    });
  }

  // 4. Verify vehicle attributes if provided on ticket
  if (primaryVehicle) {
    if (claimData.vehicleMakeOnTicket) {
      const ticketMake = normalizeString(claimData.vehicleMakeOnTicket);
      const profileMake = normalizeString(primaryVehicle.make);

      if (ticketMake !== profileMake && !ticketMake.includes(profileMake) && !profileMake.includes(ticketMake)) {
        issues.push({
          field: 'vehicle',
          expected: primaryVehicle.make,
          found: claimData.vehicleMakeOnTicket,
          severity: 'warning',
          message: `Vehicle make on ticket "${claimData.vehicleMakeOnTicket}" differs from registered "${primaryVehicle.make}".`,
        });
      }
    }

    if (claimData.vehicleColorOnTicket) {
      const ticketColor = normalizeString(claimData.vehicleColorOnTicket);
      const profileColor = normalizeString(primaryVehicle.color);

      // Color matching with some flexibility for similar colors
      const colorGroups: Record<string, string[]> = {
        'black': ['black', 'dark', 'charcoal'],
        'white': ['white', 'cream', 'pearl'],
        'silver': ['silver', 'gray', 'grey', 'metallic'],
        'blue': ['blue', 'navy', 'azure'],
        'red': ['red', 'maroon', 'burgundy'],
        'green': ['green', 'olive', 'teal'],
      };

      let colorMatches = ticketColor === profileColor;

      if (!colorMatches) {
        for (const [, variants] of Object.entries(colorGroups)) {
          if (variants.some(v => ticketColor.includes(v)) && variants.some(v => profileColor.includes(v))) {
            colorMatches = true;
            break;
          }
        }
      }

      if (!colorMatches) {
        issues.push({
          field: 'vehicle',
          expected: primaryVehicle.color,
          found: claimData.vehicleColorOnTicket,
          severity: 'warning',
          message: `Vehicle color on ticket "${claimData.vehicleColorOnTicket}" differs from registered "${primaryVehicle.color}".`,
        });
      }
    }
  }

  // Determine if manual review is required
  const hasErrors = issues.some(i => i.severity === 'error');
  const hasMultipleWarnings = issues.filter(i => i.severity === 'warning').length >= 2;
  const requiresManualReview = hasErrors || hasMultipleWarnings;

  return {
    isValid: issues.length === 0,
    issues,
    requiresManualReview,
  };
}

/**
 * Check if user profile is complete enough to submit claims
 */
export function isProfileCompleteForClaims(user: User | null): {
  isComplete: boolean;
  missingFields: string[];
} {
  if (!user) {
    return { isComplete: false, missingFields: ['User not logged in'] };
  }

  const missingFields: string[] = [];

  if (!user.firstName) missingFields.push('First Name');
  if (!user.lastName) missingFields.push('Last Name');
  if (!user.phone) missingFields.push('Phone Number');

  if (!user.address) {
    missingFields.push('Address');
  } else {
    if (!user.address.street) missingFields.push('Street Address');
    if (!user.address.city) missingFields.push('City');
    if (!user.address.state) missingFields.push('State');
    if (!user.address.zipCode) missingFields.push('ZIP Code');
  }

  if (!user.vehicles || user.vehicles.length === 0) {
    missingFields.push('Registered Vehicle');
  } else {
    const primaryVehicle = user.vehicles.find(v => v.isPrimary) || user.vehicles[0];
    if (!primaryVehicle.make) missingFields.push('Vehicle Make');
    if (!primaryVehicle.model) missingFields.push('Vehicle Model');
    if (!primaryVehicle.year) missingFields.push('Vehicle Year');
    if (!primaryVehicle.color) missingFields.push('Vehicle Color');
    if (!primaryVehicle.licensePlate) missingFields.push('License Plate');
  }

  return {
    isComplete: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Get a summary message for verification result
 */
export function getVerificationSummary(result: ClaimVerificationResult): string {
  if (result.isValid) {
    return 'All verification checks passed.';
  }

  const errorCount = result.issues.filter(i => i.severity === 'error').length;
  const warningCount = result.issues.filter(i => i.severity === 'warning').length;

  const parts: string[] = [];
  if (errorCount > 0) parts.push(`${errorCount} error${errorCount > 1 ? 's' : ''}`);
  if (warningCount > 0) parts.push(`${warningCount} warning${warningCount > 1 ? 's' : ''}`);

  return `Verification found ${parts.join(' and ')}. ${result.requiresManualReview ? 'Manual review required.' : ''}`;
}
