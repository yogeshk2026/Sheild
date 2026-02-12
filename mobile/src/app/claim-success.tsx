import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import { CheckCircle2, Clock, Bell } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Button, Text } from '@/components/ui';

export default function ClaimSuccessScreen() {
  console.log('[ClaimSuccess] Component rendering');
  const router = useRouter();
  const { claimId } = useLocalSearchParams<{ claimId: string }>();
  console.log('[ClaimSuccess] claimId:', claimId);

  const scale = useSharedValue(0);
  const checkScale = useSharedValue(0);

  useEffect(() => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.log('[ClaimSuccess] Haptics error:', e);
    }

    scale.value = withSequence(
      withSpring(1.2, { damping: 8 }),
      withSpring(1, { damping: 12 })
    );

    checkScale.value = withDelay(
      300,
      withSpring(1, { damping: 10 })
    );
  }, []);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const handleViewClaims = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      console.log('[ClaimSuccess] Haptics error:', e);
    }
    router.replace('/(tabs)/claims');
  };

  const handleGoHome = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      console.log('[ClaimSuccess] Haptics error:', e);
    }
    router.replace('/(tabs)');
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-1">
        <LinearGradient
          colors={['#F97316', '#EA580C', '#C2410C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1 }}
        >
          <SafeAreaView className="flex-1 px-6">
            <View className="flex-1 items-center justify-center">
              {/* Success Animation */}
              <Animated.View style={circleStyle}>
                <View className="w-32 h-32 rounded-full bg-white/20 items-center justify-center">
                  <Animated.View style={checkStyle}>
                    <CheckCircle2 size={80} color="#FFFFFF" strokeWidth={1.5} />
                  </Animated.View>
                </View>
              </Animated.View>

              <Animated.View
                entering={FadeInDown.delay(400).springify()}
                className="mt-8 items-center"
              >
                <Text className="text-white text-3xl font-bold text-center">
                  Claim Submitted!
                </Text>
                <Text className="text-white/80 text-lg text-center mt-3 px-4">
                  Your parking ticket claim has been submitted successfully.
                </Text>
              </Animated.View>

              {/* Timeline */}
              <Animated.View
                entering={FadeInDown.delay(600).springify()}
                className="mt-10 bg-white/10 rounded-2xl p-5 w-full"
              >
                <Text className="text-white font-semibold text-lg mb-4">
                  What happens next?
                </Text>

                <TimelineItem
                  icon={<Clock size={18} color="#FFFFFF" />}
                  title="Under Review"
                  description="We'll review your claim within 24-48 hours"
                  isFirst
                />
                <TimelineItem
                  icon={<CheckCircle2 size={18} color="#FFFFFF" />}
                  title="Approval"
                  description="You'll be notified once approved"
                />
                <TimelineItem
                  icon={<Bell size={18} color="#FFFFFF" />}
                  title="Payout"
                  description="Funds added to your wallet upon approval"
                  isLast
                />
              </Animated.View>
            </View>

            {/* Bottom Buttons */}
            <Animated.View
              entering={FadeIn.delay(800)}
              className="pb-4"
            >
              <Button
                onPress={handleViewClaims}
                variant="secondary"
                fullWidth
                size="lg"
                className="mb-3 bg-white"
              >
                <Text className="text-shield-accent font-semibold">View My Claims</Text>
              </Button>
              <Button
                onPress={handleGoHome}
                variant="ghost"
                fullWidth
                size="lg"
              >
                <Text className="text-white font-semibold">Back to Home</Text>
              </Button>
            </Animated.View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    </>
  );
}

function TimelineItem({
  icon,
  title,
  description,
  isFirst = false,
  isLast = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  return (
    <View className="flex-row">
      <View className="items-center mr-3">
        <View className="w-8 h-8 rounded-full bg-white/20 items-center justify-center">
          {icon}
        </View>
        {!isLast && <View className="w-0.5 h-8 bg-white/20 my-1" />}
      </View>
      <View className={`flex-1 ${isLast ? '' : 'pb-4'}`}>
        <Text className="text-white font-semibold">{title}</Text>
        <Text className="text-white/70 text-sm">{description}</Text>
      </View>
    </View>
  );
}
