import React, { useEffect } from 'react';
import { View, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { CheckCircle2, Home, FileText } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui';
import { useStore } from '@/lib/store';

/**
 * Claim Submitted Confirmation Screen
 *
 * This screen is intentionally simple and does NOT depend on claim data.
 * It renders successfully even if the claim hasn't been persisted yet.
 * This prevents render crashes after submission.
 */
export default function ClaimSubmittedScreen() {
  const router = useRouter();
  const { claimId } = useLocalSearchParams<{ claimId?: string }>();

  // Get claims from store to check if claim exists
  const claims = useStore((s) => s.claims);
  const claim = claimId ? claims.find((c) => c.id === claimId) : null;

  // Log for debugging
  useEffect(() => {
    console.log('[ClaimSubmitted] Screen mounted with claimId:', claimId);
    console.log('[ClaimSubmitted] Claim found in store:', !!claim);
  }, [claimId, claim]);

  const handleViewClaim = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (claimId && claim) {
      // Only navigate to claim detail if we have valid data
      console.log('[ClaimSubmitted] Navigating to claim detail:', claimId);
      router.replace(`/claim/${claimId}`);
    } else {
      // Fallback to home if claim not found
      console.warn('[ClaimSubmitted] Claim not found, navigating to home');
      router.replace('/(tabs)');
    }
  };

  const handleGoHome = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('[ClaimSubmitted] Navigating to home');
    router.replace('/(tabs)');
  };

  return (
    <View className="flex-1 bg-shield-surface">
      <Stack.Screen
        options={{
          headerShown: false,
          gestureEnabled: false, // Prevent swipe back
        }}
      />
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <View className="flex-1 items-center justify-center px-6">
          {/* Success Icon */}
          <Animated.View
            entering={FadeIn.delay(100).duration(400)}
            className="mb-6"
          >
            <View className="w-24 h-24 rounded-full bg-green-100 items-center justify-center">
              <CheckCircle2 size={56} color="#22C55E" />
            </View>
          </Animated.View>

          {/* Title */}
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <Text className="text-2xl font-bold text-shield-black text-center mb-3">
              {'Claim Submitted'}
            </Text>
          </Animated.View>

          {/* Message */}
          <Animated.View entering={FadeInDown.delay(300).springify()}>
            <Text className="text-base text-gray-500 text-center mb-2 leading-6">
              {'Your claim has been submitted successfully.'}
            </Text>
            <Text className="text-base text-gray-500 text-center mb-8 leading-6">
              {'We typically review claims within 24-48 hours.'}
            </Text>
          </Animated.View>

          {/* What Happens Next */}
          <Animated.View
            entering={FadeInDown.delay(400).springify()}
            className="w-full bg-blue-50 rounded-2xl p-5 mb-8"
          >
            <Text className="text-blue-800 font-semibold mb-3">
              {'What Happens Next'}
            </Text>
            <View style={{ gap: 10 }}>
              <View className="flex-row items-center">
                <View className="w-5 h-5 rounded-full bg-blue-500 items-center justify-center mr-3">
                  <Text className="text-white text-xs font-bold">{'1'}</Text>
                </View>
                <Text className="text-blue-700 text-sm flex-1">{'We review your claim details'}</Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-5 h-5 rounded-full bg-blue-500 items-center justify-center mr-3">
                  <Text className="text-white text-xs font-bold">{'2'}</Text>
                </View>
                <Text className="text-blue-700 text-sm flex-1">{'We verify eligibility'}</Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-5 h-5 rounded-full bg-blue-500 items-center justify-center mr-3">
                  <Text className="text-white text-xs font-bold">{'3'}</Text>
                </View>
                <Text className="text-blue-700 text-sm flex-1">{'Approved claims are paid automatically'}</Text>
              </View>
            </View>
          </Animated.View>

          {/* Action Buttons */}
          <Animated.View
            entering={FadeInDown.delay(500).springify()}
            className="w-full"
            style={{ gap: 12 }}
          >
            {/* View Claim Button - only show if claim exists */}
            {claim ? (
              <Pressable
                onPress={handleViewClaim}
                className="w-full bg-shield-accent py-4 rounded-xl flex-row items-center justify-center"
              >
                <FileText size={20} color="white" />
                <Text className="text-white font-semibold text-base ml-2">
                  {'View Claim Details'}
                </Text>
              </Pressable>
            ) : null}

            {/* Go Home Button */}
            <Pressable
              onPress={handleGoHome}
              className={`w-full py-4 rounded-xl flex-row items-center justify-center ${claim ? 'bg-gray-100' : 'bg-shield-accent'}`}
            >
              <Home size={20} color={claim ? '#1F2937' : 'white'} />
              <Text className={`font-semibold text-base ml-2 ${claim ? 'text-shield-dark' : 'text-white'}`}>
                {'Go to Home'}
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}
