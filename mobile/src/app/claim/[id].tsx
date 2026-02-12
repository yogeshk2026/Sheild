import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Image } from 'expo-image';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  FileText,
  MapPin,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  MessageCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Card, StatusBadge, Text, Button, SystemMessage } from '@/components/ui';
import { useStore } from '@/lib/store';
import { VIOLATION_LABELS } from '@/lib/types';
import { DENIAL_CODES, getDenialExplanation } from '@/lib/policy';
import { format } from 'date-fns';

// Format amount as currency with dollar sign, commas, and 2 decimal places
const formatCurrency = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null) return '$0.00';
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function ClaimDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const claims = useStore((s) => s.claims);

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

  const claim = claims.find((c) => c.id === id);

  // Handle case where claim is not found (may happen if navigating before store updates)
  if (!claim) {
    return (
      <View className="flex-1 bg-shield-surface">
        <Stack.Screen
          options={{
            title: 'Claim Details',
            headerShown: true,
          }}
        />
        <View className="flex-1 items-center justify-center px-6">
          <AlertCircle size={48} color="#6B7280" />
          <Text className="text-gray-500 text-lg mt-4 text-center">Claim not found</Text>
          <Text className="text-gray-400 text-sm mt-2 text-center">
            This claim may still be processing. Please try again in a moment.
          </Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.replace('/(tabs)');
            }}
            className="mt-6 px-6 py-3 bg-shield-accent rounded-xl"
          >
            <Text className="text-white font-semibold">Go to Home</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const getStatusIcon = () => {
    switch (claim.status) {
      case 'paid':
      case 'approved':
        return <CheckCircle2 size={24} color="#22C55E" />;
      case 'denied':
        return <XCircle size={24} color="#EF4444" />;
      case 'under_review':
        return <Clock size={24} color="#F97316" />;
      default:
        return <AlertCircle size={24} color="#6B7280" />;
    }
  };

  const getStatusMessage = () => {
    switch (claim.status) {
      case 'submitted':
        return 'Your claim has been received and is being processed.';
      case 'under_review':
        return 'Our team is reviewing your claim. This usually takes 24-48 hours.';
      case 'approved':
        return 'Great news! Your claim has been approved. Payout is being processed.';
      case 'paid':
        try {
          if (claim.payoutDate) {
            return `Payment of ${formatCurrency(claim.payoutAmount)} was sent on ${format(
              new Date(claim.payoutDate),
              'MMM d, yyyy'
            )}.`;
          }
          return `Payment of ${formatCurrency(claim.payoutAmount)} has been processed.`;
        } catch {
          return `Payment of ${formatCurrency(claim.payoutAmount)} has been processed.`;
        }
      case 'denied':
        return claim.denialReason || 'Unfortunately, this claim was not approved.';
      default:
        return '';
    }
  };

  const handleAppeal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showMessage(
      'info',
      'Submit Appeal',
      'To appeal this decision, please email support@courial.com with your claim number, additional documentation, and an explanation of why you believe this decision should be reconsidered. Appeals are reviewed within 5-7 business days.'
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: `Claim #${claim.ticketNumber.slice(-6)}`,
        }}
      />

      <View className="flex-1 bg-shield-surface">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        >
          {/* Status Card */}
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <Card className="mb-4">
              <View className="flex-row items-center mb-4">
                {getStatusIcon()}
                <View className="flex-1 ml-3">
                  <StatusBadge status={claim.status} />
                </View>
                <Text className="text-shield-black text-2xl font-bold">
                  {formatCurrency(claim.amount)}
                </Text>
              </View>
              <Text className="text-gray-500">{getStatusMessage()}</Text>
            </Card>
          </Animated.View>

          {/* What Happens Next - for pending claims */}
          {(claim.status === 'submitted' || claim.status === 'under_review') && (
            <Animated.View entering={FadeInDown.delay(150).springify()}>
              <Text className="text-shield-black font-semibold mb-3">
                What Happens Next
              </Text>
              <Card className="mb-4 bg-blue-50 border border-blue-100">
                <View style={{ gap: 12 }}>
                  <View className="flex-row items-center">
                    <View className="w-6 h-6 rounded-full bg-blue-500 items-center justify-center mr-3">
                      <Text className="text-white text-xs font-bold">1</Text>
                    </View>
                    <Text className="text-blue-800 flex-1">We review your claim details</Text>
                  </View>
                  <View className="flex-row items-center">
                    <View className="w-6 h-6 rounded-full bg-blue-500 items-center justify-center mr-3">
                      <Text className="text-white text-xs font-bold">2</Text>
                    </View>
                    <Text className="text-blue-800 flex-1">We verify eligibility</Text>
                  </View>
                  <View className="flex-row items-center">
                    <View className="w-6 h-6 rounded-full bg-blue-500 items-center justify-center mr-3">
                      <Text className="text-white text-xs font-bold">3</Text>
                    </View>
                    <Text className="text-blue-800 flex-1">Approved claims are paid out automatically</Text>
                  </View>
                </View>
              </Card>
            </Animated.View>
          )}

          {/* Ticket Image */}
          {claim.imageUri && (
            <Animated.View entering={FadeInDown.delay(200).springify()}>
              <Text className="text-shield-black font-semibold mb-3">
                Ticket Photo
              </Text>
              <View className="rounded-2xl overflow-hidden mb-4">
                <Image
                  source={{ uri: claim.imageUri }}
                  style={{ width: '100%', height: 200 }}
                  contentFit="cover"
                />
              </View>
            </Animated.View>
          )}

          {/* Details */}
          <Animated.View entering={FadeInDown.delay(300).springify()}>
            <Text className="text-shield-black font-semibold mb-3">
              Ticket Details
            </Text>
            <Card className="mb-4">
              <DetailRow
                icon={<FileText size={18} color="#6B7280" />}
                label="Ticket Number"
                value={claim.ticketNumber}
              />
              <DetailRow
                icon={<Calendar size={18} color="#6B7280" />}
                label="Ticket Date"
                value={(() => {
                  try {
                    if (!claim.ticketDate) return 'Unknown';
                    return format(new Date(claim.ticketDate), 'MMMM d, yyyy');
                  } catch {
                    return 'Unknown';
                  }
                })()}
              />
              {claim.issueTime && (
                <DetailRow
                  icon={<Clock size={18} color="#6B7280" />}
                  label="Issue Time"
                  value={claim.issueTime}
                />
              )}
              {claim.paymentDueByDate && (
                <DetailRow
                  icon={<Calendar size={18} color="#6B7280" />}
                  label="Payment Due By"
                  value={claim.paymentDueByDate}
                />
              )}
              <DetailRow
                icon={<MapPin size={18} color="#6B7280" />}
                label="Location"
                value={[claim.city, claim.state].filter(Boolean).join(', ') || 'Location unavailable'}
              />
              <DetailRow
                icon={<AlertCircle size={18} color="#6B7280" />}
                label="Violation Type"
                value={VIOLATION_LABELS[claim.violationType as keyof typeof VIOLATION_LABELS] || claim.violationType}
              />
              <DetailRow
                icon={<DollarSign size={18} color="#6B7280" />}
                label="Ticket Amount"
                value={formatCurrency(claim.amount)}
                isLast
              />
            </Card>
          </Animated.View>

          {/* Timeline */}
          <Animated.View entering={FadeInDown.delay(400).springify()}>
            <Text className="text-shield-black font-semibold mb-3">
              Claim Timeline
            </Text>
            <Card>
              <TimelineItem
                title="Claim Submitted"
                date={claim.submittedAt}
                isCompleted
                isFirst
              />
              <TimelineItem
                title="Under Review"
                date={
                  claim.status !== 'submitted' ? claim.updatedAt : undefined
                }
                isCompleted={claim.status !== 'submitted'}
              />
              <TimelineItem
                title={claim.status === 'denied' ? 'Claim Denied' : 'Approved'}
                date={
                  claim.status === 'approved' ||
                  claim.status === 'paid' ||
                  claim.status === 'denied'
                    ? claim.updatedAt
                    : undefined
                }
                isCompleted={
                  claim.status === 'approved' ||
                  claim.status === 'paid' ||
                  claim.status === 'denied'
                }
                isError={claim.status === 'denied'}
              />
              <TimelineItem
                title="Payout Completed"
                date={claim.payoutDate}
                isCompleted={claim.status === 'paid'}
                isLast
              />
            </Card>
          </Animated.View>

          {/* Payout Info */}
          {claim.status === 'paid' && (
            <Animated.View entering={FadeInDown.delay(500).springify()}>
              <Card className="mt-4 bg-green-50">
                <View className="flex-row items-center">
                  <CheckCircle2 size={24} color="#22C55E" />
                  <View className="flex-1 ml-3">
                    <Text className="text-green-700 font-semibold">
                      Payout Completed
                    </Text>
                    <Text className="text-green-600 text-sm">
                      {formatCurrency(claim.payoutAmount)} added to your wallet
                    </Text>
                  </View>
                </View>
              </Card>
            </Animated.View>
          )}

          {/* Denial Explanation */}
          {claim.status === 'denied' && (
            <Animated.View entering={FadeInDown.delay(500).springify()}>
              <Text className="text-shield-black font-semibold mb-3 mt-4">
                Denial Details
              </Text>
              <Card className="bg-red-50 border border-red-100">
                <View className="flex-row items-start mb-3">
                  <XCircle size={24} color="#EF4444" />
                  <View className="flex-1 ml-3">
                    <Text className="text-red-700 font-semibold">
                      Claim Denied
                    </Text>
                    <Text className="text-red-600 text-sm mt-1">
                      {claim.denialReason
                        ? getDenialExplanation(claim.denialReason)
                        : 'Your claim was not approved. Please contact support for more information.'}
                    </Text>
                  </View>
                </View>

                {/* Denial Code */}
                {claim.denialReason && DENIAL_CODES[claim.denialReason] && (
                  <View className="bg-red-100/50 rounded-lg p-3 mb-3">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-red-800 text-sm">Denial Code</Text>
                      <Text className="text-red-800 font-mono font-bold">{claim.denialReason}</Text>
                    </View>
                    <Text className="text-red-700 text-sm mt-1">
                      {DENIAL_CODES[claim.denialReason]?.reason}
                    </Text>
                  </View>
                )}

                {/* Appeal Option */}
                {claim.denialReason && DENIAL_CODES[claim.denialReason]?.appealable && (
                  <View className="border-t border-red-200 pt-3">
                    <Text className="text-red-700 text-sm mb-2">
                      You may appeal this decision within 7 days by providing additional documentation.
                    </Text>
                    <Button
                      variant="outline"
                      size="sm"
                      pill
                      onPress={handleAppeal}
                    >
                      <Text className="text-red-600 font-semibold">Submit Appeal</Text>
                    </Button>
                  </View>
                )}
              </Card>

              {/* Help Link */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/terms?tab=coverage');
                }}
                className="flex-row items-center justify-center mt-4 py-2"
              >
                <HelpCircle size={16} color="#F97316" />
                <Text className="text-shield-accent text-sm font-medium ml-1.5">
                  View Coverage Policy
                </Text>
                <ChevronRight size={16} color="#F97316" />
              </Pressable>
            </Animated.View>
          )}

          {/* Support Link - Always visible at bottom */}
          <Animated.View entering={FadeInDown.delay(600).springify()}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/help-center');
              }}
              className="flex-row items-center justify-center mt-6 py-3"
            >
              <MessageCircle size={16} color="#6B7280" />
              <Text className="text-gray-500 text-sm font-medium ml-1.5">
                Questions about this claim?
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
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

function DetailRow({
  icon,
  label,
  value,
  isLast = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center py-3 ${
        !isLast ? 'border-b border-gray-100' : ''
      }`}
    >
      {icon}
      <Text className="text-gray-500 ml-3 flex-1">{label}</Text>
      <Text className="text-shield-black font-medium">{value}</Text>
    </View>
  );
}

function TimelineItem({
  title,
  date,
  isCompleted = false,
  isFirst = false,
  isLast = false,
  isError = false,
}: {
  title: string;
  date?: string;
  isCompleted?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  isError?: boolean;
}) {
  return (
    <View className="flex-row">
      <View className="items-center mr-3">
        <View
          className={`w-6 h-6 rounded-full items-center justify-center ${
            isCompleted
              ? isError
                ? 'bg-red-500'
                : 'bg-green-500'
              : 'bg-gray-200'
          }`}
        >
          {isCompleted && (
            isError ? (
              <XCircle size={14} color="#FFFFFF" />
            ) : (
              <CheckCircle2 size={14} color="#FFFFFF" />
            )
          )}
        </View>
        {!isLast && (
          <View
            className={`w-0.5 h-10 ${
              isCompleted ? (isError ? 'bg-red-200' : 'bg-green-200') : 'bg-gray-200'
            }`}
          />
        )}
      </View>
      <View className={`flex-1 ${isLast ? '' : 'pb-4'}`}>
        <Text
          className={`font-medium ${
            isCompleted
              ? isError
                ? 'text-red-600'
                : 'text-shield-black'
              : 'text-gray-400'
          }`}
        >
          {title}
        </Text>
        {date && (
          <Text className="text-gray-400 text-sm">
            {(() => {
              try {
                return format(new Date(date), 'MMM d, yyyy h:mm a');
              } catch {
                return 'Unknown date';
              }
            })()}
          </Text>
        )}
      </View>
    </View>
  );
}
