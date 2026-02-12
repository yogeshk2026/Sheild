// Courial Shield - Supabase Client Configuration
import { createClient, type User as SupabaseAuthUser } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Supabase configuration from environment variables
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || Constants.expoConfig?.extra?.supabaseUrl || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || Constants.expoConfig?.extra?.supabaseAnonKey || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[Supabase] Missing environment variables. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your ENV tab.');
}

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// ============================================================================
// Types matching the Supabase claims table schema
// ============================================================================

export interface SupabaseClaimPayload {
  // Core Ticket Info
  ticket_number: string;
  violation_type: string;
  amount: number;
  ticket_date: string | null; // ISO timestamp
  issue_date?: string | null; // ISO timestamp
  issue_time?: string | null;
  payment_due_by?: string | null; // ISO timestamp
  due_date?: string | null; // ISO timestamp
  due_after_date?: string | null; // ISO timestamp
  location: string | null;

  // Vehicle Info
  plate_number: string | null;
  vehicle_make: string | null;
  vehicle_color: string | null;

  // Workflow Status
  status: 'submitted' | 'under_review' | 'approved' | 'denied' | 'paid';
  risk_score?: number;
  ticket_image_url: string | null;

  // User Data (denormalized for Admin viewing)
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  user_plan: string | null;
}

export interface SupabaseClaimRecord extends SupabaseClaimPayload {
  id: string; // UUID

  // Resolution Data (filled by Admin later)
  denial_code: string | null;
  denial_reason: string | null;
  approved_amount: number | null;
  processed_by: string | null;
  processed_at: string | null;

  // Timestamps
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

export const SCHEMA_MISMATCH_USER_MESSAGE =
  'Database schema mismatch. Please run migration or remove field.';

const isSchemaMismatchError = (error: { message?: string } | null | undefined): boolean => {
  const message = error?.message?.toLowerCase() || '';
  return (
    message.includes('schema cache') ||
    (message.includes('column') && (message.includes('does not exist') || message.includes('could not find')))
  );
};

const extractMissingColumnName = (message?: string): string | null => {
  if (!message) return null;

  const schemaCacheMatch = message.match(/could not find the ['"]?([a-zA-Z0-9_]+)['"]? column/i);
  if (schemaCacheMatch?.[1]) return schemaCacheMatch[1];

  const columnMatch = message.match(/column ['"]?([a-zA-Z0-9_]+)['"]? (?:of relation .* )?does not exist/i);
  if (columnMatch?.[1]) return columnMatch[1];

  const qualifiedMatch = message.match(/column\s+claims\.([a-zA-Z0-9_]+)\s+does not exist/i);
  if (qualifiedMatch?.[1]) return qualifiedMatch[1];

  return null;
};

const buildClaimInsertPayload = (
  claim: SupabaseClaimPayload,
  excludedColumns: Set<string>
): Partial<SupabaseClaimPayload> => {
  const filteredEntries = Object.entries(claim).filter(([key, value]) => (
    value !== undefined && !excludedColumns.has(key)
  ));
  return Object.fromEntries(filteredEntries) as Partial<SupabaseClaimPayload>;
};

const toBaseClaimPayload = (claim: SupabaseClaimPayload): SupabaseClaimPayload => ({
  ticket_number: claim.ticket_number,
  violation_type: claim.violation_type,
  amount: claim.amount,
  ticket_date: claim.ticket_date,
  location: claim.location,
  plate_number: claim.plate_number,
  vehicle_make: claim.vehicle_make,
  vehicle_color: claim.vehicle_color,
  status: claim.status,
  risk_score: claim.risk_score,
  ticket_image_url: claim.ticket_image_url,
  user_id: claim.user_id,
  user_name: claim.user_name,
  user_email: claim.user_email,
  user_plan: claim.user_plan,
});

/**
 * Developer note:
 * If you recently added/removed columns in `public.claims`, refresh schema metadata:
 * - Supabase Dashboard -> Database -> Tables -> claims -> refresh
 * - Restart local type generation tooling (if applicable)
 */
const insertClaimWithSchemaFallback = async (
  claim: SupabaseClaimPayload
): Promise<{ data: Record<string, unknown> | null; error: { code?: string; message?: string } | null }> => {
  const excludedColumns = new Set<string>();
  let payload = buildClaimInsertPayload(claim, excludedColumns);
  let basePayloadTried = false;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    console.log('Supabase insert payload keys:', Object.keys(payload));

    const result = await supabase
      .from('claims')
      .insert([payload as SupabaseClaimPayload])
      .select()
      .single();

    if (!result.error) {
      return { data: (result.data as Record<string, unknown> | null) ?? null, error: null };
    }

    if (!isSchemaMismatchError(result.error)) {
      return { data: (result.data as Record<string, unknown> | null) ?? null, error: result.error };
    }

    const missingColumn = extractMissingColumnName(result.error.message);
    if (
      missingColumn &&
      Object.prototype.hasOwnProperty.call(claim, missingColumn) &&
      !excludedColumns.has(missingColumn)
    ) {
      excludedColumns.add(missingColumn);
      payload = buildClaimInsertPayload(claim, excludedColumns);
      continue;
    }

    if (!basePayloadTried) {
      basePayloadTried = true;
      payload = buildClaimInsertPayload(toBaseClaimPayload(claim), new Set<string>());
      continue;
    }

    return { data: (result.data as Record<string, unknown> | null) ?? null, error: result.error };
  }

  return {
    data: null,
    error: { message: SCHEMA_MISMATCH_USER_MESSAGE },
  };
};

export async function getOptionalUser(): Promise<SupabaseAuthUser | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null;
  }

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.warn('[Supabase] Unable to fetch auth user. Continuing in guest mode.', error.message);
      return null;
    }
    return data.user ?? null;
  } catch (error) {
    console.warn('[Supabase] Failed to resolve auth user. Continuing in guest mode.', error);
    return null;
  }
}

// ============================================================================
// Claims API Functions
// ============================================================================

/**
 * Submit a new claim to Supabase
 * @param claim The claim payload to insert
 * @returns The inserted claim record or error
 */
export async function submitClaimToSupabase(
  claim: SupabaseClaimPayload
): Promise<{ success: boolean; syncedToCloud: boolean; data?: SupabaseClaimRecord; error?: string }> {
  // Check if Supabase is properly configured
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[Supabase] Not configured. Saving locally only.');
    return {
      success: true,
      syncedToCloud: false,
    };
  }

  try {
    const authUser = await getOptionalUser();
    if (!authUser?.id) {
      console.log('User not authenticated — saving locally only.');
      return {
        success: true,
        syncedToCloud: false,
      };
    }

    const claimWithAuthUser: SupabaseClaimPayload = {
      ...claim,
      user_id: authUser.id,
    };

    console.log('[Supabase] Submitting claim:', {
      ticket_number: claimWithAuthUser.ticket_number,
      user_email: claimWithAuthUser.user_email,
      auth_user_id: authUser.id,
      amount: claimWithAuthUser.amount,
    });

    // Ensure required fields are present
    if (!claimWithAuthUser.ticket_number || !claimWithAuthUser.violation_type) {
      console.error('[Supabase] Missing required fields');
      return {
        success: false,
        syncedToCloud: true,
        error: 'Missing required fields: ticket_number and violation_type are required',
      };
    }

    const { data, error } = await insertClaimWithSchemaFallback(claimWithAuthUser);

    if (error) {
      console.error('[Supabase] Error inserting claim:', JSON.stringify(error, null, 2));
      // Check for specific error types
      if (error.code === '42501') {
        return {
          success: false,
          syncedToCloud: true,
          error: 'Permission denied. Check RLS policies.',
        };
      }
      if (error.code === '23505') {
        return {
          success: false,
          syncedToCloud: true,
          error: 'A claim with this ticket number already exists.',
        };
      }
      if (error.code === '23503') {
        return {
          success: false,
          syncedToCloud: true,
          error: 'Claim user does not match an authenticated Supabase account.',
        };
      }
      if (isSchemaMismatchError(error)) {
        return {
          success: false,
          syncedToCloud: true,
          error: SCHEMA_MISMATCH_USER_MESSAGE,
        };
      }
      return {
        success: false,
        syncedToCloud: true,
        error: error.message || 'Failed to submit claim',
      };
    }

    const insertedClaim = data as SupabaseClaimRecord | null;
    if (!insertedClaim) {
      return {
        success: false,
        syncedToCloud: true,
        error: 'Failed to submit claim',
      };
    }
    console.log('[Supabase] Claim submitted successfully:', insertedClaim?.id);
    return {
      success: true,
      syncedToCloud: true,
      data: insertedClaim,
    };
  } catch (err) {
    console.error('[Supabase] Network error submitting claim:', err);
    return {
      success: false,
      syncedToCloud: true,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

/**
 * Fetch claims for the current user
 * Uses the current authenticated Supabase user from auth session.
 * @returns Array of claim records or error
 */
export async function fetchUserClaims(
  _userId?: string
): Promise<{ success: boolean; data?: SupabaseClaimRecord[]; error?: string }> {
  try {
    const authUser = await getOptionalUser();
    if (!authUser?.id) {
      console.log('[Supabase] Guest user detected. Skipping cloud claims fetch.');
      return {
        success: true,
        data: [],
      };
    }

    const { data, error } = await supabase
      .from('claims')
      .select('*')
      .eq('user_id', authUser.id)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('[Supabase] Error fetching claims:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch claims',
      };
    }

    return {
      success: true,
      data: data as SupabaseClaimRecord[],
    };
  } catch (err) {
    console.error('[Supabase] Network error fetching claims:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

/**
 * Fetch a single claim by ID
 * @param claimId The claim UUID
 * @returns The claim record or error
 */
export async function fetchClaimById(
  claimId: string
): Promise<{ success: boolean; data?: SupabaseClaimRecord; error?: string }> {
  try {
    const authUser = await getOptionalUser();
    if (!authUser?.id) {
      console.log('[Supabase] Guest user detected. Skipping cloud claim lookup.');
      return {
        success: true,
      };
    }

    const { data, error } = await supabase
      .from('claims')
      .select('*')
      .eq('id', claimId)
      .eq('user_id', authUser.id)
      .single();

    if (error) {
      console.error('[Supabase] Error fetching claim:', error);
      return {
        success: false,
        error: error.message || 'Claim not found',
      };
    }

    return {
      success: true,
      data: data as SupabaseClaimRecord,
    };
  } catch (err) {
    console.error('[Supabase] Network error fetching claim:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

/**
 * Upload ticket image to Supabase Storage
 * @param imageUri Local image URI
 * @param userId User ID for organizing uploads
 * @returns Public URL of uploaded image or error
 */
export async function uploadTicketImage(
  imageUri: string,
  userId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `${userId}/${timestamp}.jpg`;

    // Fetch the image as blob
    const response = await fetch(imageUri);
    const blob = await response.blob();

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('ticket-images')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.error('[Supabase] Error uploading image:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload image',
      };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('ticket-images')
      .getPublicUrl(data.path);

    console.log('[Supabase] Image uploaded successfully:', urlData.publicUrl);
    return {
      success: true,
      url: urlData.publicUrl,
    };
  } catch (err) {
    console.error('[Supabase] Network error uploading image:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

/**
 * Upsert user to Supabase users table
 * This syncs denormalized profile info used by app/admin views.
 * Claims FK integrity is enforced separately via claims.user_id -> auth.users(id).
 * @param user User object with id, email, name, phone
 * @returns Success status
 */
export async function upsertUser(user: {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  plan?: string | null;
}): Promise<{ success: boolean; userId?: string; error?: string }> {
  // Check if Supabase is properly configured
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[Supabase] Not configured - skipping user sync');
    return {
      success: false,
      error: 'Supabase not configured',
    };
  }

  try {
    console.log('[Supabase] Upserting user:', user.email, 'with ID:', user.id);

    // First, try to insert the user
    const { data: insertData, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          id: user.id,
          email: user.email,
          name: user.name || null,
          phone: user.phone || null,
          plan: user.plan || null,
          updated_at: new Date().toISOString(),
        },
      ])
      .select('id')
      .single();

    // If insert succeeds, return the user ID
    if (!insertError) {
      console.log('[Supabase] User inserted successfully with ID:', insertData.id);
      return {
        success: true,
        userId: insertData.id,
      };
    }

    // If duplicate email error (23505), fetch the existing user and update
    if (insertError.code === '23505') {
      console.log('[Supabase] User already exists, fetching existing user...');

      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.email)
        .single();

      if (fetchError || !existingUser) {
        console.error('[Supabase] Error fetching existing user:', fetchError);
        return {
          success: false,
          error: 'User exists but could not be fetched',
        };
      }

      console.log('[Supabase] Found existing user with ID:', existingUser.id);

      // Update the existing user
      const { error: updateError } = await supabase
        .from('users')
        .update({
          name: user.name || null,
          phone: user.phone || null,
          plan: user.plan || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingUser.id);

      if (updateError) {
        console.error('[Supabase] Error updating user:', JSON.stringify(updateError, null, 2));
        return {
          success: false,
          error: updateError.message || 'Failed to update user',
        };
      }

      console.log('[Supabase] User updated successfully');
      return {
        success: true,
        userId: existingUser.id,
      };
    }

    // Handle other errors
    console.error('[Supabase] Error inserting user:', JSON.stringify(insertError, null, 2));

    // Check if table doesn't exist
    if (insertError.code === 'PGRST204' || insertError.code === 'PGRST205' || insertError.message?.includes('table')) {
      console.error('[Supabase] CRITICAL: The users table does not exist! Please create it in your Supabase dashboard.');
      return {
        success: false,
        error: 'Users table not found. Please create it in Supabase dashboard.',
      };
    }

    return {
      success: false,
      error: insertError.message || 'Failed to upsert user',
    };
  } catch (err) {
    console.error('[Supabase] Network error upserting user:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}
