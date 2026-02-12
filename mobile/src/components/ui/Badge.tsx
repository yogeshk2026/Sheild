import React from 'react';
import { View } from 'react-native';
import { Shield, Zap, Building2 } from 'lucide-react-native';
import { cn } from '@/lib/cn';
import { Text } from './Text';
import type { ClaimStatus } from '@/lib/types';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  size?: 'sm' | 'md';
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-gray-100',
  success: 'bg-green-100',
  warning: 'bg-orange-100',
  error: 'bg-red-100',
  info: 'bg-gray-200',
};

const variantTextStyles: Record<BadgeVariant, string> = {
  default: 'text-gray-700',
  success: 'text-green-700',
  warning: 'text-orange-700',
  error: 'text-red-700',
  info: 'text-gray-700',
};

export function Badge({
  children,
  variant = 'default',
  className,
  size = 'md',
}: BadgeProps) {
  return (
    <View
      className={cn(
        'rounded-full self-start',
        size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1',
        variantStyles[variant],
        className
      )}
    >
      <Text
        className={cn(
          'font-medium',
          size === 'sm' ? 'text-xs' : 'text-sm',
          variantTextStyles[variant]
        )}
      >
        {children}
      </Text>
    </View>
  );
}

// Specialized badge for claim status
interface StatusBadgeProps {
  status: ClaimStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<ClaimStatus, { label: string; variant: BadgeVariant }> = {
  submitted: { label: 'Submitted', variant: 'info' },
  under_review: { label: 'Under Review', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  paid: { label: 'Paid', variant: 'success' },
  denied: { label: 'Denied', variant: 'error' },
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  // Guard against undefined or invalid status
  const config = statusConfig[status] ?? statusConfig.submitted;
  return (
    <Badge variant={config.variant} size={size}>
      {config.label}
    </Badge>
  );
}

// Plan tier badge with unique colors and icons
interface PlanBadgeProps {
  plan: 'basic' | 'pro' | 'professional';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const planStyles: Record<string, {
  label: string;
  bgColor: string;
  textColor: string;
  iconColor: string;
}> = {
  basic: {
    label: 'Basic',
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-700',
    iconColor: '#059669', // emerald-600
  },
  pro: {
    label: 'Pro',
    bgColor: 'bg-orange-500',
    textColor: 'text-white',
    iconColor: '#FFFFFF', // white
  },
  professional: {
    label: 'Professional',
    bgColor: 'bg-sky-100',
    textColor: 'text-sky-600',
    iconColor: '#0EA5E9', // sky-500
  },
};

export function PlanBadge({ plan, size = 'md', showIcon = true }: PlanBadgeProps) {
  // Guard against undefined or invalid plan - default to 'basic'
  const validPlan = planStyles[plan] ? plan : 'basic';
  const config = planStyles[validPlan];
  const iconSize = size === 'sm' ? 12 : size === 'lg' ? 18 : 14;

  const PlanIcon = validPlan === 'basic' ? Shield : validPlan === 'pro' ? Zap : Building2;

  return (
    <View
      className={cn(
        'rounded-full flex-row items-center self-start',
        size === 'sm' ? 'px-2 py-0.5' : size === 'lg' ? 'px-4 py-1.5' : 'px-3 py-1',
        config.bgColor
      )}
    >
      {showIcon && (
        <PlanIcon size={iconSize} color={config.iconColor} style={{ marginRight: 4 }} />
      )}
      <Text
        className={cn(
          'font-semibold',
          size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm',
          config.textColor
        )}
      >
        {config.label}
      </Text>
    </View>
  );
}

// Export plan colors for use in other components
export const PLAN_COLORS = {
  basic: {
    primary: '#059669', // emerald-600
    light: '#D1FAE5', // emerald-100
    text: '#047857', // emerald-700
  },
  pro: {
    primary: '#F97316', // orange-500
    light: '#F97316', // orange-500 (solid background)
    text: '#FFFFFF', // white
  },
  professional: {
    primary: '#0EA5E9', // sky-500
    light: '#E0F2FE', // sky-100
    text: '#0284C7', // sky-600
  },
} as const;
