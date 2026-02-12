import React, { useState, useRef } from 'react';
import {
  View,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';
import {
  X,
  Shield,
  Camera,
  Clock,
  Wallet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Info,
  Calendar,
  FileText,
  CreditCard,
  Ban,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Button, Card, Text } from '@/components/ui';
import { useStore } from '@/lib/store';
import { PLANS, VIOLATION_LABELS, ViolationType } from '@/lib/types';
import { COVERAGE_RULES, BILLING_POLICIES } from '@/lib/policy';

type Section = 'overview' | 'claims' | 'coverage' | 'subscription';

// Helper to get violation label from rule
const getViolationLabel = (violationType: ViolationType): string => {
  return VIOLATION_LABELS[violationType] || violationType;
};

// Filter for covered violations
const COVERED_VIOLATIONS = COVERAGE_RULES.filter(rule => rule.covered);

// Exclusions for clear display
const EXPLICIT_EXCLUSIONS = [
  { label: 'Fire Lanes', description: 'Parking in designated fire lanes' },
  { label: 'Handicapped/Disabled Parking', description: 'Unauthorized use of accessible spaces' },
  { label: 'School Zones', description: 'Violations in school zones' },
  { label: 'Moving Violations', description: 'Speeding, running red lights, etc.' },
  { label: 'Personal Use', description: 'Tickets incurred outside active gig work' },
  { label: 'Expired Registration', description: 'Vehicle registration violations' },
];

export default function HowItWorksScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string; requireAck?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const [acknowledged, setAcknowledged] = useState(false);

  const setExplainerAcknowledged = useStore((s) => s.setExplainerAcknowledged);
  const requireAck = params.requireAck === 'true';

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (requireAck) {
      setExplainerAcknowledged(true);
    }
    if (params.returnTo) {
      router.replace(params.returnTo as any);
    } else {
      router.back();
    }
  };

  const scrollToSection = (section: Section) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveSection(section);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <View className="flex-1 bg-shield-surface">
        {/* Header */}
        <SafeAreaView edges={['top']} className="bg-shield-black">
          <View className="px-5 py-4 flex-row items-center">
            <Image
              source={require('../../public/shieldlogobest2.png')}
              style={{ width: 24, height: 24 }}
              contentFit="contain"
            />
            <Text className="text-white text-lg font-bold ml-2">
              How Courial Shield Works
            </Text>
          </View>

          {/* Section Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}
            style={{ flexGrow: 0 }}
          >
            <SectionTab
              label="Overview"
              active={activeSection === 'overview'}
              onPress={() => scrollToSection('overview')}
            />
            <SectionTab
              label="Claims & Payment"
              active={activeSection === 'claims'}
              onPress={() => scrollToSection('claims')}
            />
            <SectionTab
              label="Coverage"
              active={activeSection === 'coverage'}
              onPress={() => scrollToSection('coverage')}
            />
            <SectionTab
              label="Subscription"
              active={activeSection === 'subscription'}
              onPress={() => scrollToSection('subscription')}
            />
          </ScrollView>
        </SafeAreaView>

        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 140 }}
        >
          {/* Overview Section */}
          {activeSection === 'overview' && (
            <Animated.View entering={FadeIn.duration(300)}>
              <OverviewSection />
            </Animated.View>
          )}

          {/* Claims & Payment Section */}
          {activeSection === 'claims' && (
            <Animated.View entering={FadeIn.duration(300)}>
              <ClaimsPaymentSection />
            </Animated.View>
          )}

          {/* Coverage Section */}
          {activeSection === 'coverage' && (
            <Animated.View entering={FadeIn.duration(300)}>
              <CoverageSection />
            </Animated.View>
          )}

          {/* Subscription Section */}
          {activeSection === 'subscription' && (
            <Animated.View entering={FadeIn.duration(300)}>
              <SubscriptionSection />
            </Animated.View>
          )}
        </ScrollView>

        {/* Bottom Action */}
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100">
          <SafeAreaView edges={['bottom']}>
            <View className="px-5 py-4">
              {requireAck ? (
                <>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setAcknowledged(!acknowledged);
                    }}
                    className="flex-row items-start mb-4"
                  >
                    <View className={`w-6 h-6 rounded-md border-2 items-center justify-center mr-3 ${
                      acknowledged ? 'bg-shield-accent border-shield-accent' : 'border-gray-300'
                    }`}>
                      {acknowledged && <CheckCircle2 size={16} color="#FFFFFF" />}
                    </View>
                    <Text className="flex-1 text-gray-600 text-sm leading-5">
                      I understand that Courial Shield is a reimbursement service, that payouts are subject to eligibility and approval, and that I cannot cancel my subscription for 90 days after receiving a claim payout.
                    </Text>
                  </Pressable>
                  <Button
                    onPress={handleContinue}
                    fullWidth
                    size="lg"
                    pill
                    disabled={!acknowledged}
                  >
                    Continue
                  </Button>
                </>
              ) : (
                <Button onPress={handleClose} fullWidth size="lg" pill>
                  Got It
                </Button>
              )}
            </View>
          </SafeAreaView>
        </View>
      </View>
    </>
  );
}

function SectionTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-4 py-2 rounded-full mr-2 ${
        active ? 'bg-shield-accent' : 'bg-white/10'
      }`}
    >
      <Text className={`font-medium ${active ? 'text-white' : 'text-white/70'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function OverviewSection() {
  return (
    <View className="px-5 py-6">
      {/* Hero */}
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <Card className="bg-shield-black mb-6">
          <View className="items-center py-4">
            <Image
              source={require('../../public/shieldlogobest2.png')}
              style={{ width: 56, height: 56 }}
              contentFit="contain"
            />
            <Text className="text-white text-xl font-bold mt-4 text-center">
              Parking Ticket Protection
            </Text>
            <Text className="text-white/70 text-center mt-2 leading-6">
              A subscription-based reimbursement and protection service for parking violations incurred during active gig work.
            </Text>
          </View>
        </Card>
      </Animated.View>

      {/* What We Are */}
      <Animated.View entering={FadeInDown.delay(200).springify()}>
        <Text className="text-shield-black text-lg font-bold mb-3">
          What is Courial Shield?
        </Text>
        <Card className="mb-6">
          <Text className="text-gray-600 leading-6">
            {'Courial Shield is a '}<Text className="font-semibold text-shield-black">{'reimbursement protection service'}</Text>{' designed for gig economy drivers. We help cover the cost of eligible parking tickets you receive while working.'}
          </Text>
          <View className="mt-4 p-3 bg-orange-50 rounded-xl">
            <View className="flex-row items-center">
              <Info size={18} color="#F97316" />
              <Text className="text-shield-accent font-semibold ml-2">Important</Text>
            </View>
            <Text className="text-gray-700 text-sm mt-2 leading-5">
              Courial Shield is NOT insurance. All claims are subject to eligibility review and approval. Reimbursement is not guaranteed.
            </Text>
          </View>
        </Card>
      </Animated.View>

      {/* Key Benefits */}
      <Animated.View entering={FadeInDown.delay(300).springify()}>
        <Text className="text-shield-black text-lg font-bold mb-3">
          Key Benefits
        </Text>
        <Card>
          <View className="space-y-4">
            <View className="flex-row items-start">
              <View className="w-8 h-8 rounded-full bg-green-100 items-center justify-center">
                <CheckCircle2 size={18} color="#22C55E" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-shield-black font-semibold">Coverage for Eligible Tickets</Text>
                <Text className="text-gray-500 text-sm mt-1">
                  Get reimbursed for non-moving parking violations received while on active gig work.
                </Text>
              </View>
            </View>

            <View className="flex-row items-start">
              <View className="w-8 h-8 rounded-full bg-green-100 items-center justify-center">
                <CheckCircle2 size={18} color="#22C55E" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-shield-black font-semibold">Fast Claim Processing</Text>
                <Text className="text-gray-500 text-sm mt-1">
                  Most claims are reviewed within 24-48 hours, subject to eligibility.
                </Text>
              </View>
            </View>

            <View className="flex-row items-start">
              <View className="w-8 h-8 rounded-full bg-green-100 items-center justify-center">
                <CheckCircle2 size={18} color="#22C55E" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-shield-black font-semibold">Predictable Monthly Cost</Text>
                <Text className="text-gray-500 text-sm mt-1">
                  Turn unexpected parking fines into a manageable subscription fee.
                </Text>
              </View>
            </View>
          </View>
        </Card>
      </Animated.View>
    </View>
  );
}

function ClaimsPaymentSection() {
  return (
    <View className="px-5 py-6">
      {/* How Claims Work */}
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <Text className="text-shield-black text-lg font-bold mb-3">
          How Claims & Payment Work
        </Text>
        <Card className="mb-6">
          <View className="space-y-4">
            <View className="flex-row items-start">
              <View className="w-8 h-8 rounded-full bg-orange-100 items-center justify-center">
                <Camera size={18} color="#F97316" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-shield-black font-semibold">1. Upload Your Ticket</Text>
                <Text className="text-gray-500 text-sm mt-1">
                  Take a photo of your parking ticket within 5 days of the issue date.
                </Text>
              </View>
            </View>

            <View className="flex-row items-start">
              <View className="w-8 h-8 rounded-full bg-orange-100 items-center justify-center">
                <Clock size={18} color="#F97316" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-shield-black font-semibold">2. Eligibility Review</Text>
                <Text className="text-gray-500 text-sm mt-1">
                  Claims are reviewed for eligibility based on violation type, plan limits, and gig work activity.
                </Text>
              </View>
            </View>

            <View className="flex-row items-start">
              <View className="w-8 h-8 rounded-full bg-green-100 items-center justify-center">
                <Wallet size={18} color="#22C55E" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-shield-black font-semibold">3. Approved Claims Get Paid</Text>
                <Text className="text-gray-500 text-sm mt-1">
                  Once approved, payment is released to your wallet. You can transfer funds to your bank account.
                </Text>
              </View>
            </View>
          </View>
        </Card>
      </Animated.View>

      {/* Important Payment Disclosure */}
      <Animated.View entering={FadeInDown.delay(200).springify()}>
        <Card className="mb-6 bg-orange-50 border border-orange-200">
          <View className="flex-row items-center mb-3">
            <AlertTriangle size={22} color="#F97316" />
            <Text className="text-shield-black font-bold ml-2">
              Important Payment Disclosure
            </Text>
          </View>
          <View className="space-y-3">
            <View className="flex-row items-start">
              <View className="w-2 h-2 rounded-full bg-shield-accent mt-2 mr-2" />
              <Text className="flex-1 text-gray-700 text-sm leading-5">
                <Text className="font-semibold">{'Courial does NOT pay municipalities or ticketing authorities directly.'}</Text>{' All payments are made to users only.'}
              </Text>
            </View>
            <View className="flex-row items-start">
              <View className="w-2 h-2 rounded-full bg-shield-accent mt-2 mr-2" />
              <Text className="flex-1 text-gray-700 text-sm leading-5">
                <Text className="font-semibold">{'Proof of payment is NOT required before payout.'}</Text>{' Approved claims are paid upon approval.'}
              </Text>
            </View>
            <View className="flex-row items-start">
              <View className="w-2 h-2 rounded-full bg-shield-accent mt-2 mr-2" />
              <Text className="flex-1 text-gray-700 text-sm leading-5">
                {'Courial '}<Text className="font-semibold">{'may request proof of payment after payout'}</Text>{' for audit or fraud review purposes.'}
              </Text>
            </View>
          </View>
        </Card>
      </Animated.View>

      {/* Claim Submission Disclaimer */}
      <Animated.View entering={FadeInDown.delay(300).springify()}>
        <Text className="text-shield-black text-lg font-bold mb-3">
          Before You Submit
        </Text>
        <Card className="mb-6 bg-blue-50 border border-blue-200">
          <View className="flex-row items-center mb-3">
            <Info size={20} color="#3B82F6" />
            <Text className="text-blue-800 font-semibold ml-2">
              Please Understand
            </Text>
          </View>
          <View className="space-y-2">
            <View className="flex-row items-start">
              <Text className="text-blue-700 mr-2">•</Text>
              <Text className="flex-1 text-blue-700 text-sm">
                Claim submission does not guarantee approval
              </Text>
            </View>
            <View className="flex-row items-start">
              <Text className="text-blue-700 mr-2">•</Text>
              <Text className="flex-1 text-blue-700 text-sm">
                All claims are reviewed for eligibility
              </Text>
            </View>
            <View className="flex-row items-start">
              <Text className="text-blue-700 mr-2">•</Text>
              <Text className="flex-1 text-blue-700 text-sm">
                Payouts are subject to plan limits and exclusions
              </Text>
            </View>
          </View>
        </Card>
      </Animated.View>

      {/* Timeline */}
      <Animated.View entering={FadeInDown.delay(400).springify()}>
        <Text className="text-shield-black text-lg font-bold mb-3">
          Timeline
        </Text>
        <Card>
          <View className="space-y-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Calendar size={18} color="#6B7280" />
                <Text className="text-gray-600 ml-2">Submit Within</Text>
              </View>
              <Text className="text-shield-black font-semibold">5 days of ticket date</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Clock size={18} color="#6B7280" />
                <Text className="text-gray-600 ml-2">Review Time</Text>
              </View>
              <Text className="text-shield-black font-semibold">24-48 hours typical</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Wallet size={18} color="#6B7280" />
                <Text className="text-gray-600 ml-2">Payout (if approved)</Text>
              </View>
              <Text className="text-shield-black font-semibold">Upon approval</Text>
            </View>
          </View>
        </Card>
      </Animated.View>
    </View>
  );
}

function CoverageSection() {
  return (
    <View className="px-5 py-6">
      {/* Coverage Basics */}
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <Text className="text-shield-black text-lg font-bold mb-3">
          Coverage Basics
        </Text>
        <Card className="mb-6">
          <Text className="text-gray-600 leading-6 mb-3">
            {'Courial Shield covers eligible '}<Text className="font-semibold">{'non-moving parking violations'}</Text>{' received while you are actively working for a gig platform (DoorDash, Uber Eats, Instacart, Courial, etc.).'}
          </Text>
          <Text className="text-gray-600 leading-6">
            Coverage is subject to your plan's annual limits and ticket caps.
          </Text>
        </Card>
      </Animated.View>

      {/* What's Covered */}
      <Animated.View entering={FadeInDown.delay(200).springify()}>
        <Text className="text-shield-black text-lg font-bold mb-3">
          Eligible Violations
        </Text>
        <Card className="mb-6">
          {COVERED_VIOLATIONS.map((rule, index) => (
            <View
              key={rule.id}
              className={`flex-row items-center py-3 ${
                index !== COVERED_VIOLATIONS.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <CheckCircle2 size={18} color="#22C55E" />
              <View className="flex-1 ml-3">
                <Text className="text-shield-black font-medium">
                  {getViolationLabel(rule.violationType)}
                </Text>
                <Text className="text-gray-500 text-sm">
                  Up to ${rule.maxAmount ?? 'plan limit'}
                </Text>
              </View>
            </View>
          ))}
          <View className="mt-3 pt-3 border-t border-gray-100">
            <Text className="text-gray-500 text-xs italic">
              Subject to eligibility and approval
            </Text>
          </View>
        </Card>
      </Animated.View>

      {/* Exclusions */}
      <Animated.View entering={FadeInDown.delay(300).springify()}>
        <Text className="text-shield-black text-lg font-bold mb-3">
          What's NOT Covered
        </Text>
        <Card className="mb-6 bg-red-50 border border-red-100">
          {EXPLICIT_EXCLUSIONS.map((exclusion, index) => (
            <View
              key={index}
              className={`flex-row items-start py-3 ${
                index !== EXPLICIT_EXCLUSIONS.length - 1 ? 'border-b border-red-100' : ''
              }`}
            >
              <Ban size={18} color="#EF4444" />
              <View className="flex-1 ml-3">
                <Text className="text-red-700 font-medium">{exclusion.label}</Text>
                <Text className="text-red-600 text-sm">{exclusion.description}</Text>
              </View>
            </View>
          ))}
        </Card>
      </Animated.View>

      {/* Plan Limits */}
      <Animated.View entering={FadeInDown.delay(400).springify()}>
        <Text className="text-shield-black text-lg font-bold mb-3">
          Plan Limits
        </Text>
        <Card>
          {PLANS.map((plan, index) => (
            <View
              key={plan.id}
              className={`py-3 ${
                index !== PLANS.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-shield-black font-bold">{plan.name}</Text>
                <Text className="text-shield-accent font-semibold">
                  ${plan.price}/mo
                </Text>
              </View>
              <View className="flex-row justify-between">
                <View>
                  <Text className="text-gray-500 text-xs">Annual Cap</Text>
                  <Text className="text-shield-black font-medium">
                    ${plan.annualCap.toLocaleString()}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-gray-500 text-xs">Max Tickets/Year</Text>
                  <Text className="text-shield-black font-medium">
                    {plan.maxTicketsPerYear}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </Card>
      </Animated.View>
    </View>
  );
}

function SubscriptionSection() {
  return (
    <View className="px-5 py-6">
      {/* Subscription Basics */}
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <Text className="text-shield-black text-lg font-bold mb-3">
          Subscription & Billing
        </Text>
        <Card className="mb-6">
          <View className="space-y-4">
            <View className="flex-row items-start">
              <CreditCard size={20} color="#F97316" />
              <View className="flex-1 ml-3">
                <Text className="text-shield-black font-semibold">Billed in Advance</Text>
                <Text className="text-gray-500 text-sm mt-1">
                  Subscription plans are billed at the beginning of each billing period.
                </Text>
              </View>
            </View>

            <View className="flex-row items-start">
              <ArrowRight size={20} color="#F97316" />
              <View className="flex-1 ml-3">
                <Text className="text-shield-black font-semibold">Auto-Renewal</Text>
                <Text className="text-gray-500 text-sm mt-1">
                  Your subscription automatically renews unless you cancel. Coverage continues until the end of your billing cycle.
                </Text>
              </View>
            </View>
          </View>
        </Card>
      </Animated.View>

      {/* Cancellation Policy - Critical Disclosure */}
      <Animated.View entering={FadeInDown.delay(200).springify()}>
        <Card className="mb-6 bg-orange-50 border border-orange-200">
          <View className="flex-row items-center mb-3">
            <AlertTriangle size={22} color="#F97316" />
            <Text className="text-shield-black font-bold ml-2">
              Cancellation Policy
            </Text>
          </View>
          <View className="space-y-3">
            <View className="flex-row items-start">
              <View className="w-2 h-2 rounded-full bg-shield-accent mt-2 mr-2" />
              <Text className="flex-1 text-gray-700 text-sm leading-5">
                <Text className="font-semibold">{'90-Day Restriction:'}</Text>{' You cannot cancel your subscription within 90 days after receiving a claim payout.'}
              </Text>
            </View>
            <View className="flex-row items-start">
              <View className="w-2 h-2 rounded-full bg-shield-accent mt-2 mr-2" />
              <Text className="flex-1 text-gray-700 text-sm leading-5">
                Outside of this restriction period, you may cancel anytime.
              </Text>
            </View>
            <View className="flex-row items-start">
              <View className="w-2 h-2 rounded-full bg-shield-accent mt-2 mr-2" />
              <Text className="flex-1 text-gray-700 text-sm leading-5">
                Cancellation takes effect at the end of your current billing cycle. No partial refunds.
              </Text>
            </View>
          </View>
        </Card>
      </Animated.View>

      {/* Why This Policy */}
      <Animated.View entering={FadeInDown.delay(300).springify()}>
        <Text className="text-shield-black text-lg font-bold mb-3">
          Why This Policy?
        </Text>
        <Card className="mb-6">
          <Text className="text-gray-600 leading-6">
            The 90-day cancellation restriction helps us keep subscription costs low for all members by preventing abuse of the reimbursement system. This policy ensures the long-term sustainability of Courial Shield for all gig workers.
          </Text>
        </Card>
      </Animated.View>

      {/* Coverage Reset */}
      <Animated.View entering={FadeInDown.delay(400).springify()}>
        <Text className="text-shield-black text-lg font-bold mb-3">
          Coverage Period
        </Text>
        <Card>
          <View className="flex-row items-center">
            <Calendar size={20} color="#6B7280" />
            <View className="flex-1 ml-3">
              <Text className="text-shield-black font-semibold">Annual Reset</Text>
              <Text className="text-gray-500 text-sm mt-1">
                Your coverage limits (annual cap and ticket count) reset on your subscription anniversary date.
              </Text>
            </View>
          </View>
        </Card>
      </Animated.View>
    </View>
  );
}
