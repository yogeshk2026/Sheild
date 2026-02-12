import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import {
  CreditCard,
  Calendar,
  RefreshCw,
  AlertTriangle,
  Check,
  ChevronRight,
  Download,
  Zap,
  Shield,
  Building2,
  Ban,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { format, addMonths, addYears } from 'date-fns';
import { Button, Text, Card, SystemMessage } from '@/components/ui';
import { useStore } from '@/lib/store';
import {
  PLANS,
  BILLING_LABELS,
  type BillingPeriod,
  getMonthlyEquivalent,
} from '@/lib/types';
import {
  SUBSCRIPTION_POLICIES,
  type BillingRecord,
} from '@/lib/policy';

// Mock billing history data
const MOCK_BILLING_HISTORY: BillingRecord[] = [
  {
    id: 'bill-1',
    userId: 'user-1',
    date: '2025-01-15',
    amount: 269.91,
    type: 'subscription',
    description: 'Pro Plan - Annual Subscription',
    status: 'completed',
    paymentMethod: '•••• 4242',
  },
  {
    id: 'bill-2',
    userId: 'user-1',
    date: '2024-12-15',
    amount: 4.99,
    type: 'addon',
    description: 'Towing Coverage Add-on',
    status: 'completed',
    paymentMethod: '•••• 4242',
  },
];

export default function SubscriptionScreen() {
  const router = useRouter();
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // System message state
  const [messageVisible, setMessageVisible] = useState(false);
  const [messageConfig, setMessageConfig] = useState<{
    type: 'error' | 'success' | 'warning' | 'info' | 'confirm';
    title: string;
    message: string;
  }>({ type: 'info', title: '', message: '' });

  const showMessage = (type: 'error' | 'success' | 'warning' | 'info' | 'confirm', title: string, message: string) => {
    setMessageConfig({ type, title, message });
    setMessageVisible(true);
  };

  const user = useStore((s) => s.user);
  const coverage = useStore((s) => s.coverage);
  const checkCanCancelSubscription = useStore((s) => s.checkCanCancelSubscription);
  const cancelSubscription = useStore((s) => s.cancelSubscription);

  const currentPlan = PLANS.find((p) => p.id === user?.plan);
  const [billingPeriod] = useState<BillingPeriod>('annual'); // This would come from subscription data
  const policy = SUBSCRIPTION_POLICIES[billingPeriod];

  // Check cancellation eligibility
  const cancellationCheck = checkCanCancelSubscription();

  // Calculate next billing date
  const getNextBillingDate = () => {
    if (!coverage?.periodStart) return null;
    const startDate = new Date(coverage.periodStart);
    if (billingPeriod === 'monthly') {
      return addMonths(startDate, 1);
    } else {
      return addYears(startDate, 1);
    }
  };

  const handleCancelSubscription = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Re-check cancellation eligibility
    const check = checkCanCancelSubscription();
    if (!check.canCancel) {
      showMessage('warning', 'Cannot Cancel', check.reason || 'You are not eligible to cancel at this time.');
      setCancelModalVisible(false);
      return;
    }

    setCancelling(true);

    // Process cancellation
    const result = cancelSubscription();

    setCancelling(false);
    setCancelModalVisible(false);

    if (result.success) {
      showMessage('success', 'Subscription Cancelled', result.message);
    } else {
      showMessage('error', 'Cannot Cancel', result.message);
    }
  };

  const handleAttemptCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Check if user can cancel
    if (!cancellationCheck.canCancel) {
      showMessage('warning', 'Cancellation Restricted', cancellationCheck.reason || 'You are not eligible to cancel at this time.');
      return;
    }

    setCancelModalVisible(true);
  };

  const handleChangePlan = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/plans');
  };

  const handleDownloadReceipt = (billingId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showMessage('success', 'Receipt Sent', 'The receipt has been sent to your email address.');
  };

  const PlanIcon = currentPlan?.id === 'basic' ? Shield : currentPlan?.id === 'pro' ? Zap : currentPlan?.id === 'professional' ? Building2 : Ban;

  // Plan-specific colors
  const planColors = {
    basic: { bg: 'bg-emerald-100', icon: '#059669' },
    pro: { bg: 'bg-orange-500', icon: '#FFFFFF' },
    professional: { bg: 'bg-sky-100', icon: '#0EA5E9' },
    none: { bg: 'bg-gray-100', icon: '#9CA3AF' },
  };
  const colors = planColors[(currentPlan?.id || 'none') as keyof typeof planColors];

  const nextBillingDate = getNextBillingDate();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Subscription',
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: '#F8FAFC' },
        }}
      />

      <View className="flex-1 bg-shield-surface">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        >
          {/* Current Plan Card */}
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <Card className="mb-4">
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                  <View className={`w-12 h-12 rounded-xl items-center justify-center ${colors.bg}`}>
                    <PlanIcon size={24} color={colors.icon} />
                  </View>
                  <View className="ml-3">
                    <Text className="text-shield-black text-xl font-bold">
                      {currentPlan?.name || 'No'} Plan
                    </Text>
                    <View className="flex-row items-center">
                      <View className="bg-green-100 px-2 py-0.5 rounded-full">
                        <Text className="text-green-700 text-xs font-medium">Active</Text>
                      </View>
                      <Text className="text-gray-500 text-sm ml-2">
                        {BILLING_LABELS[billingPeriod]}
                      </Text>
                    </View>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="text-shield-black text-xl font-bold">
                    ${currentPlan ? getMonthlyEquivalent(currentPlan.price, billingPeriod).toFixed(2) : '0'}
                  </Text>
                  <Text className="text-gray-400 text-xs">/month</Text>
                </View>
              </View>

              {/* Plan Features Summary */}
              <View className="bg-gray-50 rounded-xl p-3 mb-4">
                <View className="flex-row justify-between">
                  <View className="items-center flex-1">
                    <Text className="text-gray-500 text-xs">Coverage</Text>
                    <Text className="text-shield-black font-bold">
                      ${currentPlan?.annualCap?.toLocaleString() ?? 0}
                    </Text>
                  </View>
                  <View className="w-px bg-gray-200" />
                  <View className="items-center flex-1">
                    <Text className="text-gray-500 text-xs">Tickets</Text>
                    <Text className="text-shield-black font-bold">
                      {currentPlan?.maxTicketsPerYear ?? 0}/year
                    </Text>
                  </View>
                  <View className="w-px bg-gray-200" />
                  <View className="items-center flex-1">
                    <Text className="text-gray-500 text-xs">Used</Text>
                    <Text className="text-shield-black font-bold">
                      ${coverage?.usedAmount?.toLocaleString() ?? 0}
                    </Text>
                  </View>
                </View>
              </View>

              <Pressable
                onPress={handleChangePlan}
                className="flex-row items-center justify-center py-2"
              >
                <Text className="text-shield-accent font-semibold">Change Plan</Text>
                <ChevronRight size={18} color="#F97316" />
              </Pressable>
            </Card>
          </Animated.View>

          {/* Billing Info */}
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <Text className="text-shield-black text-lg font-bold mb-3">Billing</Text>

            <Card className="mb-4">
              {/* Next Billing */}
              <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
                <View className="flex-row items-center">
                  <Calendar size={20} color="#6B7280" />
                  <Text className="text-gray-600 ml-3">Next Billing Date</Text>
                </View>
                <Text className="text-shield-black font-medium">
                  {nextBillingDate ? format(nextBillingDate, 'MMM d, yyyy') : '--'}
                </Text>
              </View>

              {/* Auto-Renewal */}
              <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
                <View className="flex-row items-center">
                  <RefreshCw size={20} color="#6B7280" />
                  <Text className="text-gray-600 ml-3">Auto-Renewal</Text>
                </View>
                <View className="flex-row items-center">
                  <View className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                  <Text className="text-green-600 font-medium">On</Text>
                </View>
              </View>

              {/* Payment Method */}
              <View className="flex-row items-center justify-between py-3">
                <View className="flex-row items-center">
                  <CreditCard size={20} color="#6B7280" />
                  <Text className="text-gray-600 ml-3">Payment Method</Text>
                </View>
                <Text className="text-shield-black font-medium">•••• 4242</Text>
              </View>
            </Card>
          </Animated.View>

          {/* Billing Policies */}
          <Animated.View entering={FadeInDown.delay(300).springify()}>
            <Text className="text-shield-black text-lg font-bold mb-3">Subscription Policies</Text>

            <Card className="mb-4">
              <View className="space-y-3">
                <View className="flex-row items-start">
                  <Check size={16} color="#22C55E" className="mt-0.5" />
                  <Text className="text-gray-600 text-sm ml-2 flex-1">
                    Subscription plans are billed in advance at the start of each billing period
                  </Text>
                </View>
                <View className="flex-row items-start">
                  <Check size={16} color="#22C55E" className="mt-0.5" />
                  <Text className="text-gray-600 text-sm ml-2 flex-1">
                    Auto-renewal applies unless cancelled
                  </Text>
                </View>
                <View className="flex-row items-start">
                  <Check size={16} color="#22C55E" className="mt-0.5" />
                  <Text className="text-gray-600 text-sm ml-2 flex-1">
                    {policy.gracePeriodDays}-day grace period for failed payments
                  </Text>
                </View>
                <View className="flex-row items-start">
                  <Check size={16} color="#22C55E" className="mt-0.5" />
                  <Text className="text-gray-600 text-sm ml-2 flex-1">
                    Coverage limits reset annually on your subscription anniversary
                  </Text>
                </View>
              </View>
            </Card>

            {/* 90-Day Cancellation Restriction Disclosure */}
            <Card className="mb-4 bg-orange-50 border border-orange-200">
              <View className="flex-row items-center mb-2">
                <AlertTriangle size={18} color="#F97316" />
                <Text className="text-shield-black font-semibold ml-2">Cancellation Policy</Text>
              </View>
              <Text className="text-gray-700 text-sm leading-5 mb-2">
                {'You cannot cancel your subscription within '}<Text className="font-bold">{'90 days'}</Text>{' after receiving a claim payout.'}
              </Text>
              <Text className="text-gray-600 text-sm leading-5">
                Outside of this restriction period, cancellation takes effect at the end of your current billing cycle. No partial refunds.
              </Text>
              {!cancellationCheck.canCancel && cancellationCheck.daysRemaining && (
                <View className="mt-3 pt-3 border-t border-orange-200">
                  <View className="flex-row items-center">
                    <Ban size={16} color="#EF4444" />
                    <Text className="text-red-600 text-sm font-medium ml-2">
                      Cancellation restricted for {cancellationCheck.daysRemaining} more days
                    </Text>
                  </View>
                </View>
              )}
            </Card>
          </Animated.View>

          {/* Billing History */}
          <Animated.View entering={FadeInDown.delay(400).springify()}>
            <Text className="text-shield-black text-lg font-bold mb-3">Billing History</Text>

            {MOCK_BILLING_HISTORY.map((record, index) => (
              <Card key={record.id} className="mb-3">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-shield-black font-medium">{record.description}</Text>
                    <Text className="text-gray-500 text-sm">
                      {(() => {
                        try {
                          return format(new Date(record.date), 'MMM d, yyyy');
                        } catch {
                          return 'Unknown date';
                        }
                      })()} • {record.paymentMethod}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-shield-black font-bold">{`$${record.amount.toFixed(2)}`}</Text>
                    <View
                      className={`px-2 py-0.5 rounded-full ${
                        record.status === 'completed' ? 'bg-green-100' : 'bg-yellow-100'
                      }`}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          record.status === 'completed' ? 'text-green-700' : 'text-yellow-700'
                        }`}
                      >
                        {record.status === 'completed' ? 'Paid' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                </View>
                <Pressable
                  onPress={() => handleDownloadReceipt(record.id)}
                  className="flex-row items-center justify-center mt-3 pt-3 border-t border-gray-100"
                >
                  <Download size={16} color="#F97316" />
                  <Text className="text-shield-accent text-sm font-medium ml-1.5">
                    Download Receipt
                  </Text>
                </Pressable>
              </Card>
            ))}
          </Animated.View>

          {/* Cancel Subscription */}
          <Animated.View entering={FadeInUp.delay(500).springify()} className="mt-4">
            <Pressable
              onPress={handleAttemptCancel}
              className="py-3"
              disabled={!cancellationCheck.canCancel}
              style={{ opacity: cancellationCheck.canCancel ? 1 : 0.5 }}
            >
              <Text className={`text-center font-medium ${cancellationCheck.canCancel ? 'text-red-500' : 'text-gray-400'}`}>
                {cancellationCheck.canCancel ? 'Cancel Subscription' : 'Cancellation Restricted'}
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>

        {/* Cancel Modal */}
        {cancelModalVisible && (
          <View className="absolute inset-0 bg-black/50 items-center justify-center px-5">
            <Animated.View
              entering={FadeInUp.springify()}
              className="bg-white rounded-2xl p-5 w-full max-w-sm"
            >
              <View className="items-center mb-4">
                <View className="w-16 h-16 rounded-full bg-red-100 items-center justify-center mb-3">
                  <AlertTriangle size={32} color="#EF4444" />
                </View>
                <Text className="text-shield-black text-xl font-bold text-center">
                  {'Cancel Subscription?'}
                </Text>
              </View>

              <Text className="text-gray-600 text-center mb-4">
                {'Your coverage will continue until '}
                <Text className="font-semibold">
                  {(() => {
                    try {
                      if (coverage?.periodEnd) {
                        return format(new Date(coverage.periodEnd), 'MMMM d, yyyy');
                      }
                      return 'the end of your billing period';
                    } catch {
                      return 'the end of your billing period';
                    }
                  })()}
                </Text>
                {'. After that, you will lose access to claim submissions and all coverage benefits.'}
              </Text>

              <View className="bg-yellow-50 rounded-xl p-3 mb-4">
                <Text className="text-yellow-800 text-sm text-center">
                  {'No refunds will be issued for the remaining period.'}
                </Text>
              </View>

              <View className="space-y-3">
                <Button
                  onPress={handleCancelSubscription}
                  loading={cancelling}
                  fullWidth
                  pill
                  variant="danger"
                >
                  {'Yes, Cancel Subscription'}
                </Button>
                <Button
                  onPress={() => setCancelModalVisible(false)}
                  fullWidth
                  pill
                  variant="outline"
                >
                  {'Keep My Subscription'}
                </Button>
              </View>
            </Animated.View>
          </View>
        )}
      </View>

      {/* System Message Modal */}
      <SystemMessage
        visible={messageVisible}
        onClose={() => setMessageVisible(false)}
        type={messageConfig.type}
        title={messageConfig.title}
        message={messageConfig.message}
      />
    </>
  );
}
