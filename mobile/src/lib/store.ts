// Courial Shield - Zustand Store
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  User,
  Coverage,
  Claim,
  Wallet,
  WalletTransaction,
  BankAccount,
  PaymentMethod,
  AddOn,
  Notification,
  PlanTier,
  ClaimStatus,
  NotificationPreferences,
} from './types';
import { ADD_ONS, DEFAULT_NOTIFICATION_PREFERENCES } from './types';
import {
  DEFAULT_PLAN,
  getPlanConfig,
  isPaidPlan,
  normalizePlan,
  type AppPlanTier,
} from './plan-config';
import {
  runEligibilityChecks,
  approveClaim,
  denyClaim,
  checkCancellationEligibility,
  attemptCancelSubscription,
  calculatePayoutAmount,
  logAuditEvent,
  type EligibilityCheckResult,
  type CancellationCheckResult,
} from './claims-service';
import { generateUUID, isValidUUID } from './cn';
import {
  fetchCourialId,
  fetchCourialProfile,
  fetchDiscountEligibility,
  isValidCourialId,
  type CourialProfile,
  type DiscountEligibilityData,
} from './courial-api';
import {
  sendClaimNotifications,
  statusToEvent,
} from './notification-service';
import {
  syncNotificationPreferences,
} from './notification-api';
import {
  registerForPushNotifications,
  unregisterPushNotifications,
} from './push-notifications';
import { logoutUser } from './revenuecat';

interface AppState {
  // Auth & User
  isOnboarded: boolean;
  isAuthenticated: boolean;
  hasSignedInBefore: boolean;
  user: User | null;

  // Explainer acknowledgment
  hasAcknowledgedExplainer: boolean;

  // Coverage
  coverage: Coverage | null;

  // Claims
  claims: Claim[];

  // Wallet
  wallet: Wallet;
  bankAccounts: BankAccount[];
  paymentMethods: PaymentMethod[];

  // Add-ons
  addOns: AddOn[];

  // Notifications
  notifications: Notification[];
  unreadCount: number;

  // Courial API Integration
  courialProfile: CourialProfile | null;
  courialProfileLoading: boolean;
  courialProfileError: string | null;

  // Actions
  setOnboarded: (value: boolean) => void;
  setAuthenticated: (value: boolean) => void;
  setUser: (user: User | null) => void;
  updateUser: (updates: Partial<User>) => void;
  setExplainerAcknowledged: (value: boolean) => void;

  selectPlan: (planId: PlanTier) => void;
  setCurrentPlan: (planId: AppPlanTier, hasActiveSubscription?: boolean) => void;
  setCoverage: (coverage: Coverage | null) => void;

  addClaim: (claim: Claim) => void;
  updateClaim: (claimId: string, updates: Partial<Claim>) => void;

  // New claims service actions
  submitClaim: (claim: Omit<Claim, 'id' | 'status' | 'submittedAt' | 'updatedAt'>) => EligibilityCheckResult & { claimId?: string };
  approveAndPayClaim: (claimId: string, decisionNotes?: string) => { success: boolean; message: string };
  denyClaimById: (claimId: string, denialCode: string, decisionNotes?: string) => { success: boolean; message: string };

  // Cancellation actions
  checkCanCancelSubscription: () => CancellationCheckResult;
  cancelSubscription: () => { success: boolean; message: string };

  addTransaction: (transaction: WalletTransaction) => void;
  updateWalletBalance: (amount: number) => void;
  setWallet: (wallet: Wallet) => void;
  addBankAccount: (account: Omit<BankAccount, 'id' | 'createdAt' | 'verified'>) => BankAccount;
  removeBankAccount: (accountId: string) => void;
  setDefaultBankAccount: (accountId: string) => void;
  setPaymentMethods: (methods: PaymentMethod[]) => void;

  toggleAddOn: (addOnId: string) => void;

  addNotification: (notification: Notification) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;

  // Courial API Actions
  resolveCourialId: () => Promise<{ success: boolean; courialId?: number; error?: string }>;
  loadCourialProfile: () => Promise<{ success: boolean; profile?: CourialProfile; error?: string }>;
  setCourialProfile: (profile: CourialProfile | null) => void;
  setCourialProfileLoading: (loading: boolean) => void;
  setCourialProfileError: (error: string | null) => void;
  hasCourialId: () => boolean;
  getCourialId: () => number | null;

  // Courial Driver Discount Actions
  checkDiscountEligibility: () => Promise<{ success: boolean; data?: DiscountEligibilityData; error?: string }>;
  isDiscountEligible: () => boolean;
  getDiscountPercentage: () => number;

  // Notification Preferences Actions
  updateNotificationPreferences: (updates: Partial<NotificationPreferences>) => void;
  getNotificationPreferences: () => NotificationPreferences;

  // Push Token Registration
  registerPushToken: () => Promise<{ success: boolean; token?: string; error?: string }>;

  logout: () => void;
}

const initialWallet: Wallet = {
  balance: 0,
  pendingPayouts: 0,
  transactions: [],
};

const ONE_YEAR_IN_MS = 365 * 24 * 60 * 60 * 1000;

const createCoverageForPlan = (planId: AppPlanTier, previousCoverage?: Coverage | null): Coverage => {
  const planConfig = getPlanConfig(planId);
  const nowIso = new Date().toISOString();
  const defaultPeriodEndIso = new Date(Date.now() + ONE_YEAR_IN_MS).toISOString();
  const usedAmount = previousCoverage?.usedAmount ?? 0;
  const remainingAmount = Math.max(planConfig.annualCap - usedAmount, 0);

  return {
    planId,
    annualCap: planConfig.annualCap,
    usedAmount,
    remainingAmount,
    ticketsUsed: previousCoverage?.ticketsUsed ?? 0,
    maxTickets: planConfig.maxTicketsPerYear,
    periodStart: previousCoverage?.periodStart ?? nowIso,
    periodEnd: previousCoverage?.periodEnd ?? defaultPeriodEndIso,
  };
};

const normalizeUserSubscriptionState = (user: User): User => {
  const normalizedCurrentPlan = normalizePlan(user.currentPlan || user.plan || DEFAULT_PLAN);
  const hasActiveSubscription =
    typeof user.hasActiveSubscription === 'boolean'
      ? user.hasActiveSubscription
      : isPaidPlan(normalizedCurrentPlan) && user.subscriptionStatus === 'active';
  const effectivePlan =
    !hasActiveSubscription && isPaidPlan(normalizedCurrentPlan)
      ? DEFAULT_PLAN
      : normalizedCurrentPlan;

  return {
    ...user,
    currentPlan: effectivePlan,
    hasActiveSubscription,
    plan: hasActiveSubscription && isPaidPlan(effectivePlan) ? effectivePlan : null,
    subscriptionStatus: hasActiveSubscription ? 'active' : (user.subscriptionStatus ?? 'inactive'),
  };
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial State
      isOnboarded: false,
      isAuthenticated: false,
      hasSignedInBefore: false,
      user: null,
      hasAcknowledgedExplainer: false,
      coverage: null,
      claims: [],
      wallet: initialWallet,
      bankAccounts: [],
      paymentMethods: [],
      addOns: ADD_ONS,
      notifications: [],
      unreadCount: 0,

      // Courial API State
      courialProfile: null,
      courialProfileLoading: false,
      courialProfileError: null,

      // Auth Actions
      setOnboarded: (value) => set({ isOnboarded: value }),

      setAuthenticated: (value) => set({
        isAuthenticated: value,
        hasSignedInBefore: value ? true : get().hasSignedInBefore,
      }),

      setUser: (incomingUser) => {
        // Automatically fix invalid user IDs (legacy format migration)
        let user = incomingUser;
        if (user && !isValidUUID(user.id)) {
          console.warn(`[Store] Invalid UUID detected: ${user.id}. Migrating to valid UUID format.`);
          user = { ...user, id: generateUUID() };
        }

        if (!user) {
          set({ user: null, coverage: null });
          return;
        }

        set((state) => {
          const normalizedUser = normalizeUserSubscriptionState(user);
          return {
            user: normalizedUser,
            coverage: createCoverageForPlan(normalizedUser.currentPlan, state.coverage),
          };
        });
      },

      updateUser: (updates) =>
        set((state) => {
          if (!state.user) {
            return { user: null, coverage: state.coverage };
          }

          const normalizedUser = normalizeUserSubscriptionState({
            ...state.user,
            ...updates,
          });

          const shouldRefreshCoverage =
            state.coverage?.planId !== normalizedUser.currentPlan ||
            typeof updates.plan !== 'undefined' ||
            typeof updates.currentPlan !== 'undefined' ||
            typeof updates.hasActiveSubscription !== 'undefined';

          return {
            user: normalizedUser,
            coverage: shouldRefreshCoverage
              ? createCoverageForPlan(normalizedUser.currentPlan, state.coverage)
              : state.coverage,
          };
        }),

      setExplainerAcknowledged: (value) => set({ hasAcknowledgedExplainer: value }),

      // Plan & Coverage Actions
      selectPlan: (planId) =>
        set((state) => {
          const coverage = createCoverageForPlan(planId, state.coverage);
          return {
            user: state.user
              ? {
                  ...state.user,
                  plan: planId,
                  currentPlan: planId,
                  hasActiveSubscription: true,
                  subscriptionStatus: 'active',
                }
              : null,
            coverage,
          };
        }),

      setCurrentPlan: (planId, hasActiveSubscription = false) =>
        set((state) => {
          const normalizedPlan = normalizePlan(planId);
          const isActivePaidPlan = hasActiveSubscription && isPaidPlan(normalizedPlan);
          const effectivePlan = isActivePaidPlan ? normalizedPlan : DEFAULT_PLAN;
          const coverage = createCoverageForPlan(effectivePlan, state.coverage);

          return {
            user: state.user
              ? {
                  ...state.user,
                  currentPlan: effectivePlan,
                  hasActiveSubscription: isActivePaidPlan,
                  plan: isActivePaidPlan && isPaidPlan(effectivePlan) ? effectivePlan : null,
                  subscriptionStatus: isActivePaidPlan ? 'active' : 'inactive',
                }
              : null,
            coverage,
          };
        }),

      setCoverage: (coverage) => set({ coverage }),

      // Claims Actions
      addClaim: (claim) => {
        console.log('[Store] addClaim called with:', claim.id);

        set((prevState) => {
          if (prevState.claims.some((existingClaim) => existingClaim.id === claim.id)) {
            console.warn('[Store] Duplicate claim ignored:', claim.id);
            return {
              claims: prevState.claims,
              coverage: prevState.coverage,
            };
          }

          const shouldConsumeTicket = claim.status === 'submitted' && !!prevState.coverage;
          const nextCoverage = shouldConsumeTicket && prevState.coverage
            ? {
                ...prevState.coverage,
                ticketsUsed: Math.min(
                  prevState.coverage.ticketsUsed + 1,
                  prevState.coverage.maxTickets
                ),
              }
            : prevState.coverage;

          return {
            claims: [claim, ...prevState.claims],
            coverage: nextCoverage,
          };
        });

        console.log('[Store] Claim added to store successfully');

        // DISABLED: Notifications temporarily disabled to debug render crash
        // if (user && claim.status === 'submitted') {
        //   try {
        //     const preferences = user.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFERENCES;
        //     sendClaimNotifications('claim_submitted', claim, user, preferences).catch((err) => {
        //       console.warn('[Store] Notification send failed:', err);
        //     });
        //   } catch (err) {
        //     console.warn('[Store] Notification trigger error:', err);
        //   }
        // }
      },

      updateClaim: (claimId, updates) => {
        const state = get();
        const { user, claims } = state;
        const claim = claims.find((c) => c.id === claimId);

        set((prevState) => ({
          claims: prevState.claims.map((c) =>
            c.id === claimId ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
          ),
        }));

        // Send notifications for status changes (non-blocking, wrapped in try-catch)
        if (user && claim && updates.status && updates.status !== claim.status) {
          try {
            const updatedClaim = { ...claim, ...updates } as Claim;
            const preferences = user.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFERENCES;
            const event = statusToEvent(updates.status);
            if (event) {
              sendClaimNotifications(event, updatedClaim, user, preferences).catch((err) => {
                console.warn('[Store] Notification send failed:', err);
              });
            }
          } catch (err) {
            console.warn('[Store] Notification trigger error:', err);
          }
        }
      },

      // New claims service actions (pay-on-approval model)
      submitClaim: (claimData) => {
        const state = get();
        const { user, coverage, claims } = state;

        if (!user) {
          return { eligible: false, reason: 'User not logged in' };
        }

        // Run eligibility checks
        const eligibilityResult = runEligibilityChecks(user, coverage, claimData, claims);

        if (!eligibilityResult.eligible) {
          logAuditEvent('CLAIM_SUBMITTED', user.id, undefined, {
            rejected: true,
            reason: eligibilityResult.reason,
            denialCode: eligibilityResult.denialCode,
          });
          return eligibilityResult;
        }

        // Create the claim
        const now = new Date().toISOString();
        const claimId = generateUUID();
        const newClaim: Claim = {
          ...claimData,
          id: claimId,
          userId: user.id,
          status: 'submitted',
          submittedAt: now,
          updatedAt: now,
        } as Claim;

        set((state) => ({
          claims: [newClaim, ...state.claims],
        }));

        logAuditEvent('CLAIM_SUBMITTED', user.id, claimId, {
          amount: claimData.amount,
          violationType: claimData.violationType,
        });

        return { eligible: true, claimId };
      },

      approveAndPayClaim: (claimId, decisionNotes) => {
        const state = get();
        const { user, coverage, claims } = state;

        if (!user) {
          return { success: false, message: 'User not found' };
        }
        const effectiveCoverage = coverage ?? createCoverageForPlan(user.currentPlan || DEFAULT_PLAN);

        const claim = claims.find((c) => c.id === claimId);
        if (!claim) {
          return { success: false, message: 'Claim not found' };
        }

        if (claim.status === 'paid') {
          return { success: false, message: 'Claim has already been paid' };
        }

        if (claim.status === 'denied') {
          return { success: false, message: 'Cannot approve a denied claim' };
        }

        // Calculate payout amount
        const payoutAmount = calculatePayoutAmount(claim.amount, claim.violationType, effectiveCoverage);

        // Approve and pay (pay-on-approval model)
        const { updatedClaim, updatedCoverage, updatedUser } = approveClaim(
          claim,
          effectiveCoverage,
          user,
          payoutAmount,
          decisionNotes
        );

        // Create wallet transaction
        const transaction: WalletTransaction = {
          id: `tx-${Date.now()}`,
          type: 'payout',
          amount: payoutAmount,
          date: new Date().toISOString().split('T')[0],
          claimId,
          status: 'completed',
          description: `Claim #${claim.ticketNumber} payout (pay-on-approval)`,
        };

        // Update state
        set((state) => ({
          user: updatedUser,
          coverage: updatedCoverage,
          claims: state.claims.map((c) => (c.id === claimId ? updatedClaim : c)),
          wallet: {
            ...state.wallet,
            balance: state.wallet.balance + payoutAmount,
            transactions: [transaction, ...state.wallet.transactions],
          },
        }));

        // Add notification
        const notification: Notification = {
          id: `notif-${Date.now()}`,
          title: 'Claim Approved & Paid',
          message: `$${payoutAmount.toFixed(2)} has been added to your wallet for claim #${claim.ticketNumber}.`,
          type: 'payout',
          read: false,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          notifications: [notification, ...state.notifications],
          unreadCount: state.unreadCount + 1,
        }));

        // Send external notifications (push, email, SMS) for approved and paid
        const preferences = updatedUser.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFERENCES;
        // Send approved notification first
        sendClaimNotifications('claim_approved', updatedClaim, updatedUser, preferences);
        // Then send paid notification (SMS only goes out for paid)
        sendClaimNotifications('claim_paid', updatedClaim, updatedUser, preferences);

        return { success: true, message: `Claim approved. $${payoutAmount.toFixed(2)} paid to wallet.` };
      },

      denyClaimById: (claimId, denialCode, decisionNotes) => {
        const state = get();
        const { user, claims } = state;

        if (!user) {
          return { success: false, message: 'User not found' };
        }

        const claim = claims.find((c) => c.id === claimId);
        if (!claim) {
          return { success: false, message: 'Claim not found' };
        }

        if (claim.status === 'paid') {
          return { success: false, message: 'Cannot deny a paid claim' };
        }

        const updatedClaim = denyClaim(claim, user.id, denialCode, decisionNotes);

        set((state) => ({
          claims: state.claims.map((c) => (c.id === claimId ? updatedClaim : c)),
        }));

        // Send external notifications for denial
        const preferences = user.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFERENCES;
        sendClaimNotifications('claim_denied', updatedClaim, user, preferences);

        return { success: true, message: 'Claim denied' };
      },

      // Cancellation restriction actions
      checkCanCancelSubscription: () => {
        const { user } = get();
        if (!user) {
          return { canCancel: false, reason: 'User not found' };
        }
        return checkCancellationEligibility(user);
      },

      cancelSubscription: () => {
        const { user } = get();
        if (!user) {
          return { success: false, message: 'User not found' };
        }

        const result = attemptCancelSubscription(user);

        if (result.success && result.updatedUser) {
          set((state) => ({
            user: {
              ...result.updatedUser!,
              plan: null,
              currentPlan: DEFAULT_PLAN,
              hasActiveSubscription: false,
              subscriptionStatus: 'cancelled',
            },
            coverage: createCoverageForPlan(DEFAULT_PLAN, state.coverage),
          }));
        }

        return { success: result.success, message: result.message };
      },

      // Wallet Actions
      addTransaction: (transaction) => set((state) => ({
        wallet: {
          ...state.wallet,
          transactions: [transaction, ...state.wallet.transactions],
        },
      })),

      updateWalletBalance: (amount) => set((state) => ({
        wallet: {
          ...state.wallet,
          balance: state.wallet.balance + amount,
        },
      })),

      setWallet: (wallet) => set({ wallet }),

      addBankAccount: (account) => {
        const newAccount: BankAccount = {
          ...account,
          id: `bank-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          verified: false,
          createdAt: new Date().toISOString(),
        };

        const newPaymentMethod: PaymentMethod = {
          id: `pm-bank-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: 'bank',
          isDefault: account.isDefault,
          bankAccountId: newAccount.id,
          last4: newAccount.accountNumberLast4,
          label: account.bankName
            ? `${account.bankName} •••• ${newAccount.accountNumberLast4}`
            : `Bank Account •••• ${newAccount.accountNumberLast4}`,
          createdAt: new Date().toISOString(),
        };

        set((state) => {
          const nextAccounts = account.isDefault
            ? state.bankAccounts.map((existing) => ({ ...existing, isDefault: false }))
            : state.bankAccounts;

          const nextMethods = account.isDefault
            ? state.paymentMethods.map((existing) => ({ ...existing, isDefault: false }))
            : state.paymentMethods;

          return {
            bankAccounts: [newAccount, ...nextAccounts],
            paymentMethods: [newPaymentMethod, ...nextMethods],
          };
        });

        return newAccount;
      },

      removeBankAccount: (accountId) => {
        set((state) => {
          const removedAccount = state.bankAccounts.find((a) => a.id === accountId);
          const remainingAccounts = state.bankAccounts.filter((a) => a.id !== accountId);

          const reassignedAccounts =
            removedAccount?.isDefault && remainingAccounts.length > 0
              ? remainingAccounts.map((a, idx) => ({ ...a, isDefault: idx === 0 }))
              : remainingAccounts;

          const remainingMethods = state.paymentMethods.filter((pm) => pm.bankAccountId !== accountId);
          const reassignedMethods =
            removedAccount?.isDefault && remainingMethods.length > 0
              ? remainingMethods.map((pm, idx) => ({ ...pm, isDefault: idx === 0 }))
              : remainingMethods;

          return {
            bankAccounts: reassignedAccounts,
            paymentMethods: reassignedMethods,
          };
        });
      },

      setDefaultBankAccount: (accountId) => {
        set((state) => ({
          bankAccounts: state.bankAccounts.map((account) => ({
            ...account,
            isDefault: account.id === accountId,
          })),
          paymentMethods: state.paymentMethods.map((method) => ({
            ...method,
            isDefault: method.bankAccountId === accountId
              ? true
              : method.type === 'bank'
                ? false
                : method.isDefault,
          })),
        }));
      },

      setPaymentMethods: (methods) => set({ paymentMethods: methods }),

      // Add-on Actions
      toggleAddOn: (addOnId) => set((state) => ({
        addOns: state.addOns.map((a) =>
          a.id === addOnId ? { ...a, enabled: !a.enabled } : a
        ),
      })),

      // Notification Actions
      addNotification: (notification) => set((state) => ({
        notifications: [notification, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      })),

      markNotificationRead: (notificationId) => set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      })),

      markAllNotificationsRead: () => set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      })),

      // Courial API Actions
      resolveCourialId: async () => {
        const { user } = get();

        if (!user) {
          console.error('[CourialStore] Cannot resolve courial_id: no user logged in');
          return { success: false, error: 'User not logged in' };
        }

        // Check if courialId already exists (immutable once set)
        if (isValidCourialId(user.courialId)) {
          console.log('[CourialStore] courialId already exists:', user.courialId);
          return { success: true, courialId: user.courialId };
        }

        console.log('[CourialStore] Fetching courialId for email:', user.email);
        const result = await fetchCourialId(user.email);

        if (!result.success || !result.courial_id) {
          const errorMsg = result.error || 'Failed to resolve Courial ID';
          // Log as warning since this is non-blocking
          console.log('[CourialStore] Courial ID resolution skipped (non-blocking):', errorMsg);

          // Store the error but don't block the user
          set((state) => ({
            user: state.user ? {
              ...state.user,
              courialIdError: errorMsg,
            } : null,
          }));

          return { success: false, error: errorMsg };
        }

        // Store the courialId (immutable from now on)
        set((state) => ({
          user: state.user ? {
            ...state.user,
            courialId: result.courial_id,
            courialIdFetchedAt: new Date().toISOString(),
            courialIdError: undefined,
          } : null,
        }));

        console.log('[CourialStore] Successfully stored courialId:', result.courial_id);
        return { success: true, courialId: result.courial_id };
      },

      loadCourialProfile: async () => {
        const { user } = get();

        if (!user) {
          return { success: false, error: 'User not logged in' };
        }

        if (!isValidCourialId(user.courialId)) {
          return { success: false, error: 'No valid Courial ID found' };
        }

        set({ courialProfileLoading: true, courialProfileError: null });

        const result = await fetchCourialProfile(user.courialId);

        if (!result.success || !result.profile) {
          const errorMsg = result.error || 'Failed to load profile';
          set({
            courialProfileLoading: false,
            courialProfileError: errorMsg,
          });
          return { success: false, error: errorMsg };
        }

        set({
          courialProfile: result.profile,
          courialProfileLoading: false,
          courialProfileError: null,
        });

        return { success: true, profile: result.profile };
      },

      setCourialProfile: (profile) => set({ courialProfile: profile }),

      setCourialProfileLoading: (loading) => set({ courialProfileLoading: loading }),

      setCourialProfileError: (error) => set({ courialProfileError: error }),

      hasCourialId: () => {
        const { user } = get();
        return isValidCourialId(user?.courialId);
      },

      getCourialId: () => {
        const { user } = get();
        return isValidCourialId(user?.courialId) ? user!.courialId! : null;
      },

      // Courial Driver Discount Actions
      checkDiscountEligibility: async () => {
        const { user } = get();

        if (!user) {
          console.error('[CourialStore] Cannot check discount: no user logged in');
          return { success: false, error: 'User not logged in' };
        }

        if (!isValidCourialId(user.courialId)) {
          console.warn('[CourialStore] Cannot check discount: no valid courialId');
          return { success: false, error: 'No valid Courial ID' };
        }

        console.log('[CourialStore] Checking discount eligibility for courialId:', user.courialId);
        const result = await fetchDiscountEligibility(user.courialId);

        if (!result.success || !result.data) {
          const errorMsg = result.error || 'Failed to check discount eligibility';
          console.error('[CourialStore] Discount eligibility check failed:', errorMsg);
          // On failure, default to not eligible (don't block user)
          set((state) => ({
            user: state.user ? {
              ...state.user,
              discountEligible: false,
              discountPercentage: 0,
              completedRides: 0,
              discountCheckedAt: new Date().toISOString(),
            } : null,
          }));
          return { success: false, error: errorMsg };
        }

        // Store eligibility data
        set((state) => ({
          user: state.user ? {
            ...state.user,
            discountEligible: result.data!.eligible,
            discountPercentage: result.data!.discountPercentage,
            completedRides: result.data!.completedRides,
            discountCheckedAt: new Date().toISOString(),
          } : null,
        }));

        console.log('[CourialStore] Discount eligibility stored:', result.data);
        return { success: true, data: result.data };
      },

      isDiscountEligible: () => {
        const { user } = get();
        return user?.discountEligible === true;
      },

      getDiscountPercentage: () => {
        const { user } = get();
        return user?.discountEligible ? (user.discountPercentage ?? 0) : 0;
      },

      // Notification Preferences Actions
      updateNotificationPreferences: (updates) => {
        const { user } = get();

        // Update local state first
        set((state) => ({
          user: state.user ? {
            ...state.user,
            notificationPreferences: {
              ...(state.user.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFERENCES),
              ...updates,
            },
          } : null,
        }));

        console.log('[NotificationStore] Preferences updated locally:', updates);

        // Sync to backend (non-blocking)
        if (user) {
          const updatedPreferences = {
            ...(user.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFERENCES),
            ...updates,
          };
          syncNotificationPreferences(user.id, updatedPreferences).then((result) => {
            if (!result.success) {
              console.warn('[NotificationStore] Failed to sync preferences to backend:', result.error);
            }
          });
        }
      },

      getNotificationPreferences: () => {
        const { user } = get();
        return user?.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFERENCES;
      },

      // Push Token Registration
      registerPushToken: async () => {
        const { user } = get();

        if (!user) {
          console.warn('[NotificationStore] Cannot register push token: no user');
          return { success: false, error: 'No user logged in' };
        }

        const result = await registerForPushNotifications(user.id);

        if (result.success) {
          console.log('[NotificationStore] Push token registered:', result.token);
        } else {
          console.warn('[NotificationStore] Push token registration failed:', result.error);
        }

        return result;
      },

      // Logout
      logout: () => {
        const { user } = get();

        // Unregister push token before logout
        if (user) {
          unregisterPushNotifications(user.id);
          // Non-blocking RevenueCat logout to prevent stale identity between sessions
          logoutUser().catch((error) => {
            console.warn('[Store] Failed to logout RevenueCat user:', error);
          });
        }

        set({
          isAuthenticated: false,
          user: null,
          hasAcknowledgedExplainer: false,
          coverage: null,
          claims: [],
          wallet: initialWallet,
          bankAccounts: [],
          paymentMethods: [],
          addOns: ADD_ONS,
          notifications: [],
          unreadCount: 0,
          isOnboarded: false,
          courialProfile: null,
          courialProfileLoading: false,
          courialProfileError: null,
        });
      },
    }),
    {
      name: 'courial-shield-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isOnboarded: state.isOnboarded,
        isAuthenticated: state.isAuthenticated,
        hasSignedInBefore: state.hasSignedInBefore,
        user: state.user,
        hasAcknowledgedExplainer: state.hasAcknowledgedExplainer,
        coverage: state.coverage,
        claims: state.claims,
        wallet: state.wallet,
        bankAccounts: state.bankAccounts,
        paymentMethods: state.paymentMethods,
        addOns: state.addOns,
        notifications: state.notifications,
        unreadCount: state.unreadCount,
      }),
    }
  )
);

// Mock data for demo purposes
export const generateMockClaims = (): Claim[] => {
  const timestamp = Date.now();
  return [
    {
      id: `claim-mock-sf-${timestamp}`,
      userId: 'user-1',
      ticketDate: '2025-01-15',
      city: 'San Francisco',
      state: 'CA',
      violationType: 'parking_meter',
      ticketNumber: 'SF-2025-001234',
      amount: 85,
      imageUri: 'https://images.unsplash.com/photo-1621188988909-fbef0a88dc04?w=400',
      status: 'paid',
      submittedAt: '2025-01-16T10:30:00Z',
      updatedAt: '2025-01-18T14:00:00Z',
      payoutAmount: 85,
      payoutDate: '2025-01-18',
    },
    {
      id: `claim-mock-la-${timestamp}`,
      userId: 'user-1',
      ticketDate: '2025-01-10',
      city: 'Los Angeles',
      state: 'CA',
      violationType: 'street_cleaning',
      ticketNumber: 'LA-2025-005678',
      amount: 73,
      imageUri: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400',
      status: 'approved',
      submittedAt: '2025-01-11T09:15:00Z',
      updatedAt: '2025-01-14T11:00:00Z',
      payoutAmount: 73,
    },
    {
      id: `claim-mock-oak-${timestamp}`,
      userId: 'user-1',
      ticketDate: '2025-01-08',
      city: 'Oakland',
      state: 'CA',
      violationType: 'no_parking',
      ticketNumber: 'OAK-2025-003456',
      amount: 110,
      imageUri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
      status: 'under_review',
      submittedAt: '2025-01-09T16:45:00Z',
      updatedAt: '2025-01-09T16:45:00Z',
    },
  ];
};

export const generateMockWallet = (): Wallet => ({
  balance: 158.00,
  pendingPayouts: 73.00,
  transactions: [
    {
      id: 'tx-1',
      type: 'payout',
      amount: 85,
      date: '2025-01-18',
      claimId: 'claim-1',
      status: 'completed',
      description: 'Claim #SF-2025-001234 payout',
    },
    {
      id: 'tx-2',
      type: 'withdrawal',
      amount: -50,
      date: '2025-01-15',
      status: 'completed',
      description: 'Bank transfer to ****4523',
    },
    {
      id: 'tx-3',
      type: 'payout',
      amount: 123,
      date: '2025-01-10',
      claimId: 'claim-old',
      status: 'completed',
      description: 'Claim #SF-2024-009876 payout',
    },
  ],
});

export const generateMockNotifications = (): Notification[] => [
  {
    id: 'notif-1',
    title: 'Claim Approved',
    message: 'Your claim #LA-2025-005678 has been approved! Payout processing.',
    type: 'claim_update',
    read: false,
    createdAt: '2025-01-14T11:00:00Z',
  },
  {
    id: 'notif-2',
    title: 'Payout Completed',
    message: '$85.00 has been added to your wallet from claim #SF-2025-001234.',
    type: 'payout',
    read: true,
    createdAt: '2025-01-18T14:00:00Z',
  },
  {
    id: 'notif-3',
    title: 'Coverage Reminder',
    message: "You've used 50% of your annual coverage. Consider upgrading to Pro.",
    type: 'coverage_warning',
    read: true,
    createdAt: '2025-01-12T09:00:00Z',
  },
];
