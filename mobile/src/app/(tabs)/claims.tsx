import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { FileText, Filter, ChevronRight, Search } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Card, StatusBadge, Input, Text } from '@/components/ui';
import { useStore } from '@/lib/store';
import type { Claim, ClaimStatus } from '@/lib/types';
import { format } from 'date-fns';

type FilterOption = 'all' | ClaimStatus;

const FILTER_OPTIONS: { id: FilterOption; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'under_review', label: 'Under Review' },
  { id: 'approved', label: 'Approved' },
  { id: 'paid', label: 'Paid' },
  { id: 'denied', label: 'Denied' },
];

export default function ClaimsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterOption>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const claims = useStore((s) => s.claims);

  // Deduplicate claims by ID to prevent key errors
  const uniqueClaims = React.useMemo(() => {
    const seen = new Set<string>();
    return claims.filter((claim) => {
      if (seen.has(claim.id)) return false;
      seen.add(claim.id);
      return true;
    });
  }, [claims]);

  const filteredClaims = uniqueClaims
    .filter((c) => filter === 'all' || c.status === filter)
    .filter(
      (c) =>
        searchQuery === '' ||
        c.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.city.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const handleFilterChange = (newFilter: FilterOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilter(newFilter);
  };

  return (
    <View className="flex-1 bg-shield-surface">
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <View className="px-5 pt-4 pb-2">
          <Text className="text-shield-black text-2xl font-bold">{'Claims History'}</Text>
          <Text className="text-gray-500 text-sm mt-1">
            {'Track all your submitted parking tickets'}
          </Text>
        </View>

        {/* Search */}
        <View className="px-5 py-3">
          <Input
            placeholder="Search by ticket # or city"
            value={searchQuery}
            onChangeText={setSearchQuery}
            icon={<Search size={20} color="#9CA3AF" />}
          />
        </View>

        {/* Filter Tabs */}
        <View className="mb-4">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          >
            {FILTER_OPTIONS.map((option) => (
              <Pressable
                key={option.id}
                onPress={() => handleFilterChange(option.id)}
                className={`mr-2 px-4 py-2 rounded-full ${
                  filter === option.id
                    ? 'bg-shield-accent'
                    : 'bg-white border border-gray-200'
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    filter === option.id ? 'text-white' : 'text-gray-600'
                  }`}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Claims List */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        >
          {filteredClaims.length > 0 ? (
            filteredClaims.map((claim, index) => (
              <ClaimListItem key={claim.id} claim={claim} index={index} />
            ))
          ) : (
            <Animated.View
              entering={FadeInDown.springify()}
              className="items-center py-12"
            >
              <FileText size={64} color="#D1D5DB" strokeWidth={1} />
              <Text className="text-gray-400 text-lg mt-4">{'No claims found'}</Text>
              <Text className="text-gray-400 text-sm mt-1">
                {filter !== 'all'
                  ? 'Try changing the filter'
                  : 'Submit your first claim'}
              </Text>
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function ClaimListItem({ claim, index }: { claim: Claim; index: number }) {
  const router = useRouter();

  // Safe date formatting
  const formattedDate = React.useMemo(() => {
    try {
      if (!claim?.ticketDate) return 'Unknown date';
      return format(new Date(claim.ticketDate), 'MMM d, yyyy');
    } catch {
      return 'Unknown date';
    }
  }, [claim?.ticketDate]);

  // Guard against invalid claim data
  if (!claim?.id) {
    return null;
  }

  return (
    <Animated.View entering={FadeInRight.delay(50 * index).springify()}>
      <Card
        className="mb-3"
        onPress={() => router.push(`/claim/${claim.id}`)}
      >
        <View className="flex-row items-start">
          {/* Ticket Icon */}
          <View
            className={`w-12 h-12 rounded-xl items-center justify-center ${
              claim.status === 'paid'
                ? 'bg-green-100'
                : claim.status === 'denied'
                ? 'bg-red-100'
                : 'bg-gray-100'
            }`}
          >
            <FileText
              size={24}
              color={
                claim.status === 'paid'
                  ? '#22C55E'
                  : claim.status === 'denied'
                  ? '#EF4444'
                  : '#6B7280'
              }
            />
          </View>

          {/* Details */}
          <View className="flex-1 ml-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-shield-black font-semibold text-base">
                {claim.ticketNumber || 'Unknown'}
              </Text>
              <StatusBadge status={claim.status || 'submitted'} size="sm" />
            </View>
            <Text className="text-gray-500 text-sm mt-0.5">
              {`${claim.city || 'Unknown'}, ${claim.state || 'Unknown'}`}
            </Text>
            <View className="flex-row items-center mt-2">
              <Text className="text-shield-black font-bold text-lg">
                {`$${claim.amount ?? 0}`}
              </Text>
              <Text className="text-gray-400 text-sm ml-3">
                {formattedDate}
              </Text>
            </View>
          </View>

          {/* Chevron */}
          <View className="ml-2 self-center">
            <ChevronRight size={20} color="#9CA3AF" />
          </View>
        </View>

        {/* Payout info for paid claims */}
        {claim.status === 'paid' && claim.payoutDate && (
          <View className="mt-3 pt-3 border-t border-gray-100">
            <View className="flex-row items-center justify-between">
              <Text className="text-gray-500 text-sm">{'Payout completed'}</Text>
              <Text className="text-green-600 font-semibold">
                {`+$${claim.payoutAmount}`}
              </Text>
            </View>
          </View>
        )}
      </Card>
    </Animated.View>
  );
}
