// Courial Shield - React Query Hooks for Courial Driver API Integration
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStore } from './store';
import {
  fetchCourialProfile,
  updateCourialProfile,
  fetchDiscountEligibility,
  isValidCourialId,
  type CourialProfile,
  type CourialProfileUpdatePayload,
  type DiscountEligibilityData,
} from './courial-api';

// Query keys for cache management
export const courialQueryKeys = {
  all: ['courial'] as const,
  profile: (courialId: number) => ['courial', 'profile', courialId] as const,
  discountEligibility: (courialId: number) => ['courial', 'discount', courialId] as const,
};

/**
 * Hook to resolve and persist the Courial ID after user login.
 * Should be called once after authentication if courialId doesn't exist.
 */
export function useCourialIdResolution() {
  const resolveCourialId = useStore((s) => s.resolveCourialId);
  const user = useStore((s) => s.user);
  const hasCourialId = useStore((s) => s.hasCourialId);

  return useMutation({
    mutationFn: resolveCourialId,
    onSuccess: (result) => {
      if (result.success) {
        console.log('[useCourialIdResolution] Successfully resolved courialId:', result.courialId);
      } else {
        console.error('[useCourialIdResolution] Failed:', result.error);
      }
    },
    onError: (error) => {
      console.error('[useCourialIdResolution] Mutation error:', error);
    },
  });
}

/**
 * Hook to fetch the Courial profile using the stored courialId.
 * Automatically caches the profile data.
 */
export function useCourialProfile() {
  const user = useStore((s) => s.user);
  const courialId = user?.courialId;

  return useQuery({
    queryKey: courialQueryKeys.profile(courialId ?? 0),
    queryFn: async () => {
      if (!isValidCourialId(courialId)) {
        throw new Error('No valid Courial ID available');
      }

      const result = await fetchCourialProfile(courialId);

      if (!result.success || !result.profile) {
        throw new Error(result.error || 'Failed to fetch Courial profile');
      }

      return result.profile;
    },
    enabled: isValidCourialId(courialId),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on 404 or auth errors
      const errorMsg = error instanceof Error ? error.message : '';
      if (errorMsg.includes('not found') || errorMsg.includes('401') || errorMsg.includes('403')) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

/**
 * Hook to update the Courial profile.
 * IMPORTANT: Only for admin/support use - not for end users.
 */
export function useCourialProfileUpdate() {
  const queryClient = useQueryClient();
  const user = useStore((s) => s.user);
  const courialId = user?.courialId;

  return useMutation({
    mutationFn: async ({
      updates,
      actingUser,
    }: {
      updates: CourialProfileUpdatePayload;
      actingUser: { id: string; type: 'admin' | 'support' };
    }) => {
      if (!isValidCourialId(courialId)) {
        throw new Error('No valid Courial ID available');
      }

      const result = await updateCourialProfile(courialId, updates, actingUser);

      if (!result.success) {
        throw new Error(result.error || 'Failed to update Courial profile');
      }

      return result.profile;
    },
    onSuccess: (profile) => {
      if (profile && isValidCourialId(courialId)) {
        // Update the cache with the new profile data
        queryClient.setQueryData(courialQueryKeys.profile(courialId), profile);
      }
    },
    onError: (error) => {
      console.error('[useCourialProfileUpdate] Error:', error);
    },
  });
}

/**
 * Hook to load Courial profile into Zustand store.
 * Use this for simpler state management without React Query caching.
 */
export function useCourialProfileLoader() {
  const loadCourialProfile = useStore((s) => s.loadCourialProfile);

  return useMutation({
    mutationFn: loadCourialProfile,
    onSuccess: (result) => {
      if (result.success) {
        console.log('[useCourialProfileLoader] Profile loaded successfully');
      } else {
        console.error('[useCourialProfileLoader] Failed:', result.error);
      }
    },
  });
}

/**
 * Hook to check if the user has a valid Courial ID.
 * Returns a simple boolean for conditional rendering.
 */
export function useHasCourialId(): boolean {
  const courialId = useStore((s) => s.user?.courialId);
  return isValidCourialId(courialId);
}

/**
 * Hook to get the current Courial ID (or null if not set).
 */
export function useCourialId(): number | null {
  const courialId = useStore((s) => s.user?.courialId);
  return isValidCourialId(courialId) ? courialId : null;
}

/**
 * Hook that combines Courial ID resolution and profile loading.
 * Automatically resolves ID if missing, then loads profile.
 */
export function useCourialSync() {
  const user = useStore((s) => s.user);
  const hasCourialId = useStore((s) => s.hasCourialId);
  const resolveCourialId = useStore((s) => s.resolveCourialId);
  const loadCourialProfile = useStore((s) => s.loadCourialProfile);
  const courialProfileLoading = useStore((s) => s.courialProfileLoading);
  const courialProfileError = useStore((s) => s.courialProfileError);
  const courialProfile = useStore((s) => s.courialProfile);

  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error('No user logged in');
      }

      // Step 1: Resolve Courial ID if not present
      if (!hasCourialId()) {
        console.log('[useCourialSync] Resolving Courial ID...');
        const idResult = await resolveCourialId();

        if (!idResult.success) {
          throw new Error(idResult.error || 'Failed to resolve Courial ID');
        }
      }

      // Step 2: Load profile
      console.log('[useCourialSync] Loading Courial profile...');
      const profileResult = await loadCourialProfile();

      if (!profileResult.success) {
        // Profile load failure is non-blocking - log but don't throw
        console.warn('[useCourialSync] Profile load failed:', profileResult.error);
      }

      return {
        courialId: user.courialId,
        profile: profileResult.profile,
      };
    },
  });

  return {
    sync: syncMutation.mutate,
    syncAsync: syncMutation.mutateAsync,
    isSyncing: syncMutation.isPending || courialProfileLoading,
    error: syncMutation.error?.message || courialProfileError,
    isSuccess: syncMutation.isSuccess,
    courialProfile,
  };
}

// ============================================================================
// Courial Driver Discount Hooks
// ============================================================================

/**
 * Hook to check discount eligibility via the Courial API.
 * Should be called after courialId is resolved.
 */
export function useDiscountEligibilityCheck() {
  const checkDiscountEligibility = useStore((s) => s.checkDiscountEligibility);

  return useMutation({
    mutationFn: checkDiscountEligibility,
    onSuccess: (result) => {
      if (result.success && result.data) {
        console.log('[useDiscountEligibilityCheck] Eligibility checked:', result.data);
      } else {
        console.warn('[useDiscountEligibilityCheck] Check failed:', result.error);
      }
    },
    onError: (error) => {
      console.error('[useDiscountEligibilityCheck] Mutation error:', error);
    },
  });
}

/**
 * Hook to get the current discount eligibility status.
 * Returns the eligibility data from the user store.
 */
export function useDiscountEligibility(): {
  isEligible: boolean;
  discountPercentage: number;
  completedRides: number;
  checkedAt: string | undefined;
} {
  const isEligible = useStore((s) => s.user?.discountEligible ?? false);
  const discountPercentage = useStore((s) => s.user?.discountPercentage ?? 0);
  const completedRides = useStore((s) => s.user?.completedRides ?? 0);
  const checkedAt = useStore((s) => s.user?.discountCheckedAt);

  return {
    isEligible,
    discountPercentage: isEligible ? discountPercentage : 0,
    completedRides,
    checkedAt,
  };
}

/**
 * Hook to check if user is eligible for the Courial Driver discount.
 * Simple boolean for conditional rendering.
 */
export function useIsDiscountEligible(): boolean {
  return useStore((s) => s.isDiscountEligible)();
}

/**
 * Hook to get the active discount percentage.
 * Returns 0 if not eligible.
 */
export function useDriverDiscountPercentage(): number {
  return useStore((s) => s.getDiscountPercentage)();
}

/**
 * Hook that combines Courial ID resolution, profile loading, and discount eligibility check.
 * Automatically resolves ID if missing, then loads profile and checks discount eligibility.
 */
export function useCourialFullSync() {
  const user = useStore((s) => s.user);
  const hasCourialId = useStore((s) => s.hasCourialId);
  const resolveCourialId = useStore((s) => s.resolveCourialId);
  const loadCourialProfile = useStore((s) => s.loadCourialProfile);
  const checkDiscountEligibility = useStore((s) => s.checkDiscountEligibility);
  const courialProfileLoading = useStore((s) => s.courialProfileLoading);
  const courialProfileError = useStore((s) => s.courialProfileError);
  const courialProfile = useStore((s) => s.courialProfile);
  const discountEligible = useStore((s) => s.user?.discountEligible);
  const discountPercentage = useStore((s) => s.user?.discountPercentage);

  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error('No user logged in');
      }

      // Step 1: Resolve Courial ID if not present
      if (!hasCourialId()) {
        console.log('[useCourialFullSync] Resolving Courial ID...');
        const idResult = await resolveCourialId();

        if (!idResult.success) {
          throw new Error(idResult.error || 'Failed to resolve Courial ID');
        }
      }

      // Step 2: Load profile (non-blocking)
      console.log('[useCourialFullSync] Loading Courial profile...');
      const profileResult = await loadCourialProfile();

      if (!profileResult.success) {
        console.warn('[useCourialFullSync] Profile load failed:', profileResult.error);
      }

      // Step 3: Check discount eligibility
      console.log('[useCourialFullSync] Checking discount eligibility...');
      const discountResult = await checkDiscountEligibility();

      if (!discountResult.success) {
        console.warn('[useCourialFullSync] Discount check failed:', discountResult.error);
      }

      return {
        courialId: user.courialId,
        profile: profileResult.profile,
        discount: discountResult.data,
      };
    },
  });

  return {
    sync: syncMutation.mutate,
    syncAsync: syncMutation.mutateAsync,
    isSyncing: syncMutation.isPending || courialProfileLoading,
    error: syncMutation.error?.message || courialProfileError,
    isSuccess: syncMutation.isSuccess,
    courialProfile,
    discountEligible: discountEligible ?? false,
    discountPercentage: discountEligible ? (discountPercentage ?? 0) : 0,
  };
}
