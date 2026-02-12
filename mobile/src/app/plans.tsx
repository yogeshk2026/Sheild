import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, Dimensions, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Check, Shield, Zap, Building2, Star, CreditCard, Apple, FileText, Home, Wallet, Settings, Truck } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Button, Text, SystemMessage } from '@/components/ui';
import { useStore } from '@/lib/store';
import {
  PLANS,
  type Plan,
  type PlanTier,
  type BillingPeriod,
  BILLING_LABELS,
  BILLING_DISCOUNTS,
  getPriceForBillingPeriod,
  getMonthlyEquivalent,
  getPriceWithDriverDiscount,
  getMonthlyEquivalentWithDriverDiscount,
  COURIAL_DRIVER_DISCOUNT_LABEL,
} from '@/lib/types';
import {
  initRevenueCat,
  getRevenueCatInitStatus,
  getPackages,
  purchasePackage,
  restorePurchases,
  getActivePlanFromCustomerInfo,
} from '@/lib/revenuecat';
import { PurchasesPackage } from 'react-native-purchases';
import { isValidCourialId } from '@/lib/courial-api';
import { upsertUser } from '@/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function PlansScreen() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>('pro');
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('annual'); // Default to annual
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [initLoading, setInitLoading] = useState(true);
  const [paymentsReady, setPaymentsReady] = useState(false);
  const [paymentsStatusMessage, setPaymentsStatusMessage] = useState<string>('');

  // System message state
  const [messageVisible, setMessageVisible] = useState(false);
  const [messageConfig, setMessageConfig] = useState<{
    type: 'error' | 'success' | 'warning' | 'info' | 'confirm';
    title: string;
    message: string;
    onClose?: () => void;
  }>({ type: 'info', title: '', message: '' });

  const showMessage = (type: 'error' | 'success' | 'warning' | 'info' | 'confirm', title: string, message: string, onClose?: () => void) => {
    setMessageConfig({ type, title, message, onClose });
    setMessageVisible(true);
  };

  const hideMessage = () => {
    setMessageVisible(false);
    if (messageConfig.onClose) {
      messageConfig.onClose();
    }
  };

  const selectPlan = useStore((s) => s.selectPlan);
  const setCurrentPlan = useStore((s) => s.setCurrentPlan);
  const user = useStore((s) => s.user);
  const checkDiscountEligibility = useStore((s) => s.checkDiscountEligibility);
  const resolveCourialId = useStore((s) => s.resolveCourialId);

  // Get discount eligibility from user state
  const isDiscountEligible = user?.discountEligible ?? false;
  const driverDiscountPercentage = isDiscountEligible ? (user?.discountPercentage ?? 0) : 0;

  // Initialize RevenueCat and fetch packages, also check discount eligibility
  useEffect(() => {
    async function init() {
      try {
        const currentStatus = getRevenueCatInitStatus();
        const initResult =
          currentStatus.reason === 'not_initialized'
            ? await initRevenueCat()
            : currentStatus;
        setPaymentsReady(initResult.ok);

        if (!initResult.ok) {
          const fallbackMessage =
            initResult.reason === 'web_unsupported'
              ? 'Purchases available on mobile only.'
              : 'Payments are unavailable on this build. Add RevenueCat platform keys to .env and rebuild a native app.';
          setPaymentsStatusMessage(initResult.message || fallbackMessage);
          setPackages([]);
        } else {
          setPaymentsStatusMessage('');
          const availablePackages = await getPackages();
          setPackages(availablePackages);
          console.log('Available packages:', availablePackages.map(p => p.identifier));

          if (availablePackages.length === 0) {
            showMessage(
              'warning',
              'No Plans Available',
              'No purchasable packages were returned by RevenueCat. Verify offerings and product identifiers in the RevenueCat dashboard.'
            );
          }
        }

        // Check discount eligibility if we have a courialId but haven't checked yet
        if (user && isValidCourialId(user.courialId) && !user.discountCheckedAt) {
          console.log('[PlansScreen] Checking discount eligibility...');
          const result = await checkDiscountEligibility();
          if (result.success) {
            console.log('[PlansScreen] Discount eligibility:', result.data);
          }
        } else if (user && !isValidCourialId(user.courialId)) {
          // Try to resolve Courial ID first, then check discount
          console.log('[PlansScreen] Resolving Courial ID...');
          const idResult = await resolveCourialId();
          if (idResult.success) {
            const discountResult = await checkDiscountEligibility();
            console.log('[PlansScreen] Discount eligibility after ID resolution:', discountResult.data);
          }
        }
      } catch (error) {
        console.error('Failed to initialize payments:', error);
        setPaymentsReady(false);
        setPaymentsStatusMessage('Payments could not be initialized. Please try again later.');
      } finally {
        setInitLoading(false);
      }
    }
    init();
  }, []);

  const handleSelectPlan = (planId: PlanTier) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlan(planId);
  };

  const handleBillingPeriodChange = (period: BillingPeriod) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBillingPeriod(period);
  };

  const packageMatchesPlan = (pkg: PurchasesPackage, planId: PlanTier): boolean => {
    const value = `${pkg.identifier} ${pkg.product.identifier}`.toLowerCase();
    if (planId === 'professional') return value.includes('professional');
    if (planId === 'pro') return /(^|[\s_.-])pro($|[\s_.-])/.test(value) || value.includes('courial_pro');
    return value.includes('basic');
  };

  const packageMatchesPeriod = (pkg: PurchasesPackage, period: BillingPeriod): boolean => {
    const value = `${pkg.identifier} ${pkg.product.identifier} ${String(pkg.packageType)}`.toLowerCase();
    return period === 'annual'
      ? value.includes('annual') || value.includes('year')
      : value.includes('monthly') || value.includes('month');
  };

  // Find exact plan+period package first. Then return a plan-level fallback so we can show actionable errors.
  const getPackageForPlan = (planId: PlanTier, period: BillingPeriod): {
    exact?: PurchasesPackage;
    planOnly?: PurchasesPackage;
  } => {
    const planMatches = packages.filter((pkg) => packageMatchesPlan(pkg, planId));
    const exact = planMatches.find((pkg) => packageMatchesPeriod(pkg, period));
    return {
      exact,
      planOnly: planMatches[0],
    };
  };

  const handlePurchase = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    const plan = PLANS.find((p) => p.id === selectedPlan);
    if (!plan) {
      setLoading(false);
      return;
    }

    if (!paymentsReady) {
      setLoading(false);
      return;
    }

    const { exact: pkg, planOnly } = getPackageForPlan(selectedPlan, billingPeriod);
    if (!pkg) {
      setLoading(false);
      if (planOnly) {
        showMessage(
          'warning',
          'Billing Option Unavailable',
          `No ${billingPeriod} package was found for the ${plan.name} plan. Please switch billing period or verify RevenueCat package identifiers.`
        );
      } else {
        showMessage(
          'error',
          'Plan Unavailable',
          `No RevenueCat package matched the ${plan.name} plan. Check product identifiers and offering configuration.`
        );
      }
      return;
    }

    // Real purchase flow with RevenueCat
    const result = await purchasePackage(pkg);
    if (result.success && result.customerInfo) {
      const activePlan = getActivePlanFromCustomerInfo(result.customerInfo);
      if (activePlan) {
        const matchedPlan = PLANS.find(p => p.id === activePlan);
        if (matchedPlan) {
          selectPlan(activePlan);
          if (user?.id && user?.email) {
            upsertUser({
              id: user.id,
              email: user.email,
              name: user.name,
              phone: user.phone,
              plan: activePlan,
            }).catch((syncError) => {
              console.warn('[PlansScreen] Failed to sync purchased plan to Supabase:', syncError);
            });
          }
          setLoading(false);
          showMessage(
            'success',
            'Purchase Successful',
            `Your ${matchedPlan.name} plan is now active.`,
            () => router.replace('/(tabs)')
          );
          return;
        }
      }

      setLoading(false);
      setCurrentPlan('free', false);
      showMessage(
        'error',
        'Entitlement Missing',
        'Purchase completed but no active subscription entitlement was detected. Verify your RevenueCat entitlement mapping and restore purchases.'
      );
      return;
    }

    setLoading(false);
    if (result.error && result.error !== 'Purchase cancelled') {
      showMessage('error', 'Purchase Failed', result.error);
    }
  };

  const handleRestorePurchases = async () => {
    if (!paymentsReady) {
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRestoring(true);

    const result = await restorePurchases();

    if (result.success && result.customerInfo) {
      const activePlan = getActivePlanFromCustomerInfo(result.customerInfo);
      if (activePlan) {
        const matchedPlan = PLANS.find(p => p.id === activePlan);
        if (matchedPlan) {
          selectPlan(activePlan);
          if (user?.id && user?.email) {
            upsertUser({
              id: user.id,
              email: user.email,
              name: user.name,
              phone: user.phone,
              plan: activePlan,
            }).catch((syncError) => {
              console.warn('[PlansScreen] Failed to sync restored plan to Supabase:', syncError);
            });
          }
          showMessage('success', 'Purchases Restored', 'Your purchases have been restored successfully!', () => router.replace('/(tabs)'));
        }
      } else {
        setCurrentPlan('free', false);
        showMessage('info', 'No Purchases Found', 'We couldn\'t find any previous purchases to restore.');
      }
    } else {
      showMessage('error', 'Restore Failed', result.error || 'Unable to restore purchases. Please try again.');
    }

    setRestoring(false);
  };

  const handleContinueWithFreePlan = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentPlan('free', false);

    if (user?.id && user?.email) {
      upsertUser({
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        plan: null,
      }).catch((syncError) => {
        console.warn('[PlansScreen] Failed to sync free plan to Supabase:', syncError);
      });
    }

    router.replace('/(tabs)');
  };

  const selectedPlanData = PLANS.find((p) => p.id === selectedPlan);
  const selectedPackage = selectedPlanData ? getPackageForPlan(selectedPlan, billingPeriod).exact : undefined;
  const billingDiscount = BILLING_DISCOUNTS[billingPeriod];

  // Calculate display price with driver discount
  const getDisplayPrice = () => {
    if (!selectedPlanData) return '$0';
    if (selectedPackage?.product.priceString && !isDiscountEligible) {
      // Use RevenueCat price only if no driver discount (they handle billing period discounts)
      return selectedPackage.product.priceString;
    }
    // Calculate price with both billing period and driver discounts
    const price = getPriceWithDriverDiscount(selectedPlanData.price, billingPeriod, driverDiscountPercentage);
    return `$${price.toFixed(2)}`;
  };

  // Get original price before driver discount (for strikethrough)
  const getOriginalPrice = () => {
    if (!selectedPlanData) return '$0';
    const price = getPriceForBillingPeriod(selectedPlanData.price, billingPeriod);
    return `$${price.toFixed(2)}`;
  };

  const getPeriodLabel = () => {
    switch (billingPeriod) {
      case 'monthly': return '/month';
      case 'annual': return '/year';
    }
  };

  return (
    <View className="flex-1 bg-shield-surface">
      <LinearGradient
        colors={['#000000', '#1A1A1A', '#2D2D2D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 320 }}
      />

      <SafeAreaView className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 200 }}
        >
          {/* Header */}
          <Animated.View
            entering={FadeInDown.delay(100).springify()}
            className="px-6 pt-4 pb-4"
          >
            <Text className="text-white text-3xl font-bold">Upgrade Your Coverage (Optional)</Text>
            <Text className="text-white/60 text-base mt-2">
              Use Free by default, or upgrade for higher benefits
            </Text>
          </Animated.View>

          {/* Billing Period Selector */}
          <Animated.View
            entering={FadeInDown.delay(150).springify()}
            className="mx-5 mb-6"
          >
            <View className="bg-white/10 rounded-2xl p-1 flex-row">
              {(['monthly', 'annual'] as BillingPeriod[]).map((period) => (
                <Pressable
                  key={period}
                  onPress={() => handleBillingPeriodChange(period)}
                  className={`flex-1 py-3 rounded-xl items-center ${
                    billingPeriod === period ? 'bg-white' : ''
                  }`}
                >
                  <Text
                    className={`font-semibold ${
                      billingPeriod === period ? 'text-shield-black' : 'text-white/70'
                    }`}
                  >
                    {BILLING_LABELS[period]}
                  </Text>
                  {BILLING_DISCOUNTS[period] > 0 && (
                    <Text
                      className={`text-xs mt-0.5 font-medium ${
                        billingPeriod === period ? 'text-green-600' : 'text-green-400'
                      }`}
                    >
                      Save {Math.round(BILLING_DISCOUNTS[period] * 100)}%
                    </Text>
                  )}
                </Pressable>
              ))}
            </View>
          </Animated.View>

          {/* Plan Cards */}
          <View className="px-5">
            {PLANS.map((plan, index) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                index={index}
                isSelected={selectedPlan === plan.id}
                onSelect={() => handleSelectPlan(plan.id)}
                billingPeriod={billingPeriod}
                driverDiscountPercentage={driverDiscountPercentage}
              />
            ))}
          </View>

          {/* Payment Methods Info */}
          <Animated.View
            entering={FadeInUp.delay(500).springify()}
            className="mt-6 mx-5"
          >
            <View className="bg-white rounded-2xl p-4">
              <Text className="text-shield-black font-semibold mb-3">Payment Methods</Text>
              <View className="flex-row items-center justify-around">
                {Platform.OS === 'ios' && (
                  <View className="items-center">
                    <View className="w-12 h-12 rounded-xl bg-black items-center justify-center">
                      <Apple size={24} color="#FFFFFF" />
                    </View>
                    <Text className="text-gray-500 text-xs mt-1">Apple Pay</Text>
                  </View>
                )}
                <View className="items-center">
                  <View className="w-12 h-12 rounded-xl bg-blue-500 items-center justify-center">
                    <CreditCard size={24} color="#FFFFFF" />
                  </View>
                  <Text className="text-gray-500 text-xs mt-1">Credit Card</Text>
                </View>
                <View className="items-center">
                  <View className="w-12 h-12 rounded-xl bg-[#003087] items-center justify-center">
                    <Text className="text-white font-bold text-sm">Pay</Text>
                  </View>
                  <Text className="text-gray-500 text-xs mt-1">PayPal</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Trust Badges */}
          <Animated.View
            entering={FadeInUp.delay(600).springify()}
            className="mt-6 px-6"
          >
            <View className="flex-row items-center justify-center space-x-6">
              <View className="flex-row items-center">
                <Shield size={16} color="#22C55E" />
                <Text className="text-gray-500 text-sm ml-1.5">Secure Payments</Text>
              </View>
              <View className="flex-row items-center">
                <Star size={16} color="#F97316" />
                <Text className="text-gray-500 text-sm ml-1.5">4.9 Rating</Text>
              </View>
            </View>
            <Text className="text-gray-400 text-xs text-center mt-4">
              Cancel anytime. No long-term contracts.
            </Text>
          </Animated.View>

          {/* Restore Purchases */}
          <Animated.View
            entering={FadeInUp.delay(700).springify()}
            className="mt-4 px-6"
          >
            <Pressable onPress={handleRestorePurchases} disabled={restoring || !paymentsReady}>
              <Text className={`text-sm font-medium text-center ${paymentsReady ? 'text-shield-accent' : 'text-gray-400'}`}>
                {restoring ? 'Restoring...' : 'Restore Purchases'}
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>

        {/* Bottom CTA */}
        <View className="absolute bottom-0 left-0 right-0 bg-white">
          <View className="px-6 py-4 border-t border-gray-100">
            {initLoading ? (
              <View className="py-4 items-center">
                <ActivityIndicator color="#F97316" />
                <Text className="text-gray-500 text-sm mt-2">Loading plans...</Text>
              </View>
            ) : (
              <>
                {/* Price Summary */}
                <View className="flex-row items-center justify-between mb-3">
                  <View>
                    <Text className="text-gray-500 text-sm">{selectedPlanData?.name} Plan</Text>
                    <View className="flex-row items-baseline">
                      <Text className="text-shield-black text-2xl font-bold">
                        {getDisplayPrice()}
                      </Text>
                      <Text className="text-gray-400 text-sm ml-1">{getPeriodLabel()}</Text>
                    </View>
                    {/* Show original price struck through if driver discount applies */}
                    {isDiscountEligible && driverDiscountPercentage > 0 && (
                      <Text className="text-gray-400 text-xs line-through">
                        {getOriginalPrice()}
                      </Text>
                    )}
                  </View>
                  {/* Show discount badges */}
                  <View className="items-end">
                    {isDiscountEligible && driverDiscountPercentage > 0 && (
                      <View className="bg-orange-100 px-3 py-1.5 rounded-full mb-1">
                        <Text className="text-orange-700 font-semibold text-xs">
                          {driverDiscountPercentage}% Driver Discount
                        </Text>
                      </View>
                    )}
                    {billingDiscount > 0 && (
                      <View className="bg-green-100 px-3 py-1.5 rounded-full">
                        <Text className="text-green-700 font-semibold text-sm">
                          {Math.round(billingDiscount * 100)}% OFF
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Courial Driver Benefit Banner */}
                {isDiscountEligible && (
                  <View className="flex-row items-center bg-orange-50 p-3 rounded-xl mb-3">
                    <Truck size={20} color="#F97316" />
                    <Text className="text-orange-700 text-sm font-medium ml-2 flex-1">
                      {COURIAL_DRIVER_DISCOUNT_LABEL}
                    </Text>
                  </View>
                )}

                {!paymentsReady && (
                  <View className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
                    <Text className="text-amber-800 text-sm">
                      {paymentsStatusMessage || 'Purchases are currently unavailable on this build.'}
                    </Text>
                  </View>
                )}

                <Button
                  onPress={handlePurchase}
                  loading={loading}
                  fullWidth
                  size="lg"
                  pill
                  disabled={initLoading || !paymentsReady}
                >
                  Upgrade to {selectedPlanData?.name}
                </Button>
                <Button
                  onPress={handleContinueWithFreePlan}
                  fullWidth
                  size="lg"
                  pill
                  variant="secondary"
                  className="mt-3 bg-black"
                >
                  Continue with Free Plan
                </Button>
              </>
            )}
          </View>

          {/* Tab Bar - matches height and style of main tab bar */}
          <View
            className="flex-row justify-around items-start bg-white"
            style={{ height: Platform.OS === 'ios' ? 88 : 68, paddingTop: 8 }}
          >
            <Pressable
              onPress={() => router.replace('/(tabs)')}
              className="items-center flex-1"
            >
              <View className="p-1 rounded-lg">
                <Home size={22} color="#9CA3AF" strokeWidth={2} />
              </View>
              <Text style={{ fontSize: 11, fontWeight: '600', marginTop: 4, color: '#9CA3AF' }}>{'Home'}</Text>
            </Pressable>
            <Pressable
              onPress={() => router.replace('/(tabs)/claims')}
              className="items-center flex-1"
            >
              <View className="p-1 rounded-lg">
                <FileText size={22} color="#9CA3AF" strokeWidth={2} />
              </View>
              <Text style={{ fontSize: 11, fontWeight: '600', marginTop: 4, color: '#9CA3AF' }}>{'Claims'}</Text>
            </Pressable>
            <Pressable
              onPress={() => router.replace('/(tabs)/wallet')}
              className="items-center flex-1"
            >
              <View className="p-1 rounded-lg">
                <Wallet size={22} color="#9CA3AF" strokeWidth={2} />
              </View>
              <Text style={{ fontSize: 11, fontWeight: '600', marginTop: 4, color: '#9CA3AF' }}>{'Wallet'}</Text>
            </Pressable>
            <Pressable
              onPress={() => router.replace('/(tabs)/settings')}
              className="items-center flex-1"
            >
              <View className="p-1 rounded-lg bg-orange-100">
                <Settings size={22} color="#F97316" strokeWidth={2.5} />
              </View>
              <Text style={{ fontSize: 11, fontWeight: '600', marginTop: 4, color: '#F97316' }}>{'Settings'}</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      {/* System Message Modal */}
      <SystemMessage
        visible={messageVisible}
        onClose={hideMessage}
        type={messageConfig.type}
        title={messageConfig.title}
        message={messageConfig.message}
      />
    </View>
  );
}

function PlanCard({
  plan,
  index,
  isSelected,
  onSelect,
  billingPeriod,
  driverDiscountPercentage,
}: {
  plan: Plan;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  billingPeriod: BillingPeriod;
  driverDiscountPercentage: number;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const Icon = plan.id === 'basic' ? Shield : plan.id === 'pro' ? Zap : Building2;

  // Plan-specific colors
  const planColors = {
    basic: { bg: 'bg-emerald-100', icon: '#059669', border: '#059669', selectedText: '#059669' },
    pro: { bg: 'bg-orange-500', icon: '#FFFFFF', border: '#F97316', selectedText: '#F97316' },
    professional: { bg: 'bg-sky-100', icon: '#0EA5E9', border: '#0EA5E9', selectedText: '#0EA5E9' },
  };
  const colors = planColors[plan.id as keyof typeof planColors];

  // Calculate prices with driver discount
  const monthlyEquivalent = getMonthlyEquivalentWithDriverDiscount(plan.price, billingPeriod, driverDiscountPercentage);
  const originalMonthlyEquivalent = getMonthlyEquivalent(plan.price, billingPeriod);
  const billingDiscount = BILLING_DISCOUNTS[billingPeriod];
  const hasDriverDiscount = driverDiscountPercentage > 0;

  return (
    <Animated.View entering={FadeInUp.delay(200 + index * 100).springify()}>
      <AnimatedPressable
        onPress={onSelect}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={animatedStyle}
        className={`mb-4 rounded-2xl overflow-hidden border-2 ${
          isSelected ? '' : 'border-transparent'
        }`}
        {...(isSelected && { style: [animatedStyle, { borderColor: colors.border, borderWidth: 2 }] })}
      >
        <View className="bg-white p-5">
          {/* Popular Badge */}
          {plan.popular && (
            <View className="absolute top-0 right-0 bg-amber-500 px-3 py-1 rounded-bl-xl">
              <Text className="text-white text-xs font-bold">MOST POPULAR</Text>
            </View>
          )}

          {/* Plan Header */}
          <View className="flex-row items-center mb-4">
            <View
              className={`w-12 h-12 rounded-xl items-center justify-center ${colors.bg}`}
            >
              <Icon size={24} color={colors.icon} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-shield-black text-xl font-bold">{plan.name}</Text>
              <Text className="text-gray-500 text-sm">
                Up to ${plan.annualCap.toLocaleString()} coverage
              </Text>
            </View>
            <View className="items-end">
              <View className="flex-row items-baseline">
                <Text className="text-shield-black text-2xl font-bold">
                  ${monthlyEquivalent.toFixed(2)}
                </Text>
              </View>
              <Text className="text-gray-400 text-xs">/mo</Text>
              {/* Show original price if any discount applies */}
              {(billingDiscount > 0 || hasDriverDiscount) && (
                <Text className="text-gray-400 text-xs line-through">
                  ${hasDriverDiscount ? originalMonthlyEquivalent.toFixed(2) : plan.price.toFixed(2)}/mo
                </Text>
              )}
              {/* Show driver discount badge on card */}
              {hasDriverDiscount && (
                <View className="bg-orange-100 px-2 py-0.5 rounded-full mt-1">
                  <Text className="text-orange-700 font-semibold text-xs">
                    -{driverDiscountPercentage}%
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Features */}
          <View className="space-y-2.5">
            {plan.features.map((feature, idx) => (
              <View key={idx} className="flex-row items-start">
                <View className={`w-5 h-5 rounded-full items-center justify-center mt-0.5 ${colors.bg}`}>
                  <Check size={12} color={colors.icon} strokeWidth={3} />
                </View>
                <Text className="text-gray-600 text-sm ml-2.5 flex-1">
                  {feature}
                </Text>
              </View>
            ))}
          </View>

          {/* Selection Indicator */}
          {isSelected && (
            <View className="mt-4 pt-4 border-t border-gray-100">
              <View className="flex-row items-center justify-center">
                <View className={`w-5 h-5 rounded-full items-center justify-center ${colors.bg}`}>
                  <Check size={12} color={colors.icon} strokeWidth={3} />
                </View>
                <Text style={{ color: colors.selectedText }} className="font-semibold ml-2">Selected</Text>
              </View>
            </View>
          )}
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}
