export type PaidPlanTier = 'basic' | 'pro' | 'professional';
export type AppPlanTier = 'free' | PaidPlanTier;

export interface AppPlanConfig {
  id: AppPlanTier;
  name: string;
  monthlyPrice: number;
  annualCap: number;
  maxTicketsPerYear: number;
  deductibleRate: number;
  waitingPeriodDays: number;
  maxCoveragePerClaim: number | null;
  features: string[];
  addOns: string[];
  popular?: boolean;
}

export interface PaidPlanConfig extends AppPlanConfig {
  id: PaidPlanTier;
}

export const DEFAULT_PLAN: AppPlanTier = 'free';
export const PAID_PLAN_IDS: PaidPlanTier[] = ['basic', 'pro', 'professional'];

export const PLAN_CONFIGS: Record<AppPlanTier, AppPlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    annualCap: 300,
    maxTicketsPerYear: 12,
    deductibleRate: 0.25,
    waitingPeriodDays: 0,
    maxCoveragePerClaim: 100,
    features: [
      'Up to $100 per claim',
      'Up to $300 annual reimbursement cap',
      '25% member co-pay per ticket',
      'No waiting period',
    ],
    addOns: [],
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    monthlyPrice: 9.99,
    annualCap: 100,
    maxTicketsPerYear: 12,
    deductibleRate: 0.2,
    waitingPeriodDays: 30,
    maxCoveragePerClaim: null,
    features: [
      'Up to $100 annual reimbursement cap',
      '20% member co-pay per ticket',
      'Standard Ticket Defense',
      'Email support',
    ],
    addOns: [],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 24.99,
    annualCap: 350,
    maxTicketsPerYear: 24,
    deductibleRate: 0.15,
    waitingPeriodDays: 30,
    maxCoveragePerClaim: null,
    features: [
      'Up to $350 annual reimbursement cap',
      '15% member co-pay per ticket',
      'Priority Defense',
      'Phone & email support',
    ],
    addOns: [],
    popular: true,
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    monthlyPrice: 39.99,
    annualCap: 600,
    maxTicketsPerYear: 50,
    deductibleRate: 0.15,
    waitingPeriodDays: 30,
    maxCoveragePerClaim: null,
    features: [
      'Up to $600 annual reimbursement cap',
      '15% member co-pay per ticket',
      'Concierge Defense',
      '$100 one-time towing credit',
      'Dedicated account manager',
    ],
    addOns: ['towing_credit'],
  },
};

export function isPaidPlan(plan: string | null | undefined): plan is PaidPlanTier {
  return plan === 'basic' || plan === 'pro' || plan === 'professional';
}

export function normalizePlan(plan: string | null | undefined): AppPlanTier {
  if (!plan) return DEFAULT_PLAN;
  if (plan === 'free' || isPaidPlan(plan)) return plan;
  return DEFAULT_PLAN;
}

export function getPlanConfig(plan: string | null | undefined): AppPlanConfig {
  return PLAN_CONFIGS[normalizePlan(plan)];
}

export function getPaidPlanConfigs(): PaidPlanConfig[] {
  return PAID_PLAN_IDS.map((id) => PLAN_CONFIGS[id] as PaidPlanConfig);
}
