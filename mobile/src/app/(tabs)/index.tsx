import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, Pressable, RefreshControl, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import {
  Plus,
  Bell,
  ChevronRight,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Settings,
  LogOut,
  User,
  X,
  Shield,
  Ban,
  Timer,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Card, ProgressBar, StatusBadge, PlanBadge, Button, Text, Disclaimer } from '@/components/ui';
import { useStore, generateMockClaims, generateMockWallet, generateMockNotifications } from '@/lib/store';
import { type Claim } from '@/lib/types';
import { checkWaitingPeriod } from '@/lib/claims-service';
import { getPlanConfig, isPaidPlan } from '@/lib/plan-config';
import { format } from 'date-fns';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function DashboardScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const mockDataInitialized = useRef(false);

  const user = useStore((s) => s.user);
  const coverage = useStore((s) => s.coverage);
  const claims = useStore((s) => s.claims);
  const unreadCount = useStore((s) => s.unreadCount);
  const addClaim = useStore((s) => s.addClaim);
  const logout = useStore((s) => s.logout);

  // Deduplicate claims by ID to prevent key errors
  const uniqueClaims = React.useMemo(() => {
    const seen = new Set<string>();
    return claims.filter((claim) => {
      if (seen.has(claim.id)) return false;
      seen.add(claim.id);
      return true;
    });
  }, [claims]);

  // Initialize demo data only once
  useEffect(() => {
    if (uniqueClaims.length === 0 && !mockDataInitialized.current) {
      mockDataInitialized.current = true;
      const mockClaims = generateMockClaims();
      mockClaims.forEach((claim) => {
        addClaim(claim);
      });
    }
  }, [uniqueClaims.length]);

  // Check waiting period status
  const waitingPeriodCheck = checkWaitingPeriod(coverage);
  const inWaitingPeriod = waitingPeriodCheck.inWaitingPeriod;
  const daysRemaining = waitingPeriodCheck.daysRemaining || 0;

  const currentPlan = user?.currentPlan ?? coverage?.planId ?? 'free';
  const planConfig = getPlanConfig(currentPlan);
  const isPaidPlanActive = isPaidPlan(currentPlan) && !!user?.hasActiveSubscription;

  // Plan-specific colors for the shield icon
  const planShieldColors: Record<string, string> = {
    free: '#9CA3AF',
    basic: '#059669',      // emerald-600 (light green)
    pro: '#F97316',        // orange-500
    professional: '#0EA5E9', // sky-500 (light blue)
  };
  const shieldColor = planShieldColors[currentPlan] || '#9CA3AF';

  const coveragePercent = coverage
    ? ((coverage.usedAmount / coverage.annualCap) * 100)
    : 0;
  const ticketsPercent = coverage
    ? ((coverage.ticketsUsed / coverage.maxTickets) * 100)
    : 0;

  const recentClaims = uniqueClaims.slice(0, 3);

  // Check if there are any pending claims (submitted or under_review)
  const hasPendingClaims = uniqueClaims.some(
    (c) => c.status === 'submitted' || c.status === 'under_review'
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleNewClaim = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/submit-claim');
  };

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowSettings(false);
    logout();
    router.replace('/auth');
  };

  const handleOpenSettings = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowSettings(true);
  };

  return (
    <View className="flex-1 bg-shield-surface">
      {/* Header Background */}
      <LinearGradient
        colors={['#000000', '#1A1A1A', '#2D2D2D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 320 }}
      />

      <SafeAreaView className="flex-1" edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#FFFFFF"
            />
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Logo */}
          <Animated.View
            entering={FadeInDown.delay(50).springify()}
            className="items-center pt-3 pb-2"
          >
            <Image
              source={require('../../../public/shieldlogobest2.png')}
              style={{ width: 48, height: 48 }}
              contentFit="contain"
            />
          </Animated.View>

          {/* Header */}
          <Animated.View
            entering={FadeInDown.delay(100).springify()}
            className="px-5 pt-2 pb-4"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-white/60 text-sm">{'Good morning,'}</Text>
                <Text className="text-white text-2xl font-bold">
                  {user?.name?.split(' ')[0] || 'Driver'}
                </Text>
              </View>
              <View className="flex-row items-center">
                <Pressable
                  onPress={() => router.push('/notifications')}
                  className="relative mr-3"
                >
                  <View className="w-11 h-11 rounded-full bg-white/10 items-center justify-center">
                    <Bell size={22} color="#FFFFFF" />
                  </View>
                  {unreadCount > 0 && (
                    <View className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 items-center justify-center">
                      <Text className="text-white text-xs font-bold">{unreadCount}</Text>
                    </View>
                  )}
                </Pressable>
                <Pressable onPress={handleOpenSettings}>
                  <View className="w-11 h-11 rounded-full bg-white/10 items-center justify-center">
                    <Settings size={22} color="#FFFFFF" />
                  </View>
                </Pressable>
              </View>
            </View>
            {/* Hero Tagline */}
            <Text className="text-white/70 text-sm mt-2">
              {'Parking Protection for Gig Drivers. We fight your tickets so you keep your earnings.'}
            </Text>
          </Animated.View>

          {/* Waiting Period Banner */}
          {inWaitingPeriod && (
            <Animated.View
              entering={FadeInDown.delay(150).springify()}
              className="mx-5 mb-4"
            >
              <View className="bg-amber-500/20 border border-amber-400/50 rounded-xl p-4">
                <View className="flex-row items-center">
                  <Timer size={20} color="#F59E0B" />
                  <View className="ml-3 flex-1">
                    <Text className="text-amber-100 font-semibold">30-Day Waiting Period</Text>
                    <Text className="text-amber-200/80 text-sm">
                      Claims available in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          )}

          {/* Coverage Card */}
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            className="mx-5 mb-5"
          >
            <Pressable
              onPress={() => {
                if (!isPaidPlanActive) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/plans');
                }
              }}
              disabled={isPaidPlanActive}
            >
              <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#2A2A2A' }}>
                <View style={{ padding: 20 }}>
                    <View className="flex-row items-center justify-between mb-4">
                    <View className="flex-row items-center">
                      <Shield size={28} color={shieldColor} strokeWidth={1.5} />
                      <Text className="text-white font-bold text-lg ml-2">
                        {'Protection Active'}
                      </Text>
                    </View>
                    {isPaidPlanActive ? (
                      <PlanBadge plan={currentPlan as 'basic' | 'pro' | 'professional'} />
                    ) : (
                      <View className="rounded-full px-3 py-1 flex-row items-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.25)' }}>
                        <Ban size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text className="text-white font-semibold text-sm">{planConfig.name}</Text>
                      </View>
                    )}
                  </View>

                  {/* Helper line for pending claims */}
                  {hasPendingClaims && (
                    <Text className="text-white/50 text-xs mb-3">
                      {'Claims are typically reviewed within 24–48 hours.'}
                    </Text>
                  )}

                <View className="mb-1">
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-white/80 text-sm">{'Reimbursement Used'}</Text>
                    <Text className="text-white font-semibold">
                      {`$${coverage?.usedAmount.toLocaleString() || 0} / $${coverage?.annualCap.toLocaleString() || 0}`}
                    </Text>
                  </View>
                  <View className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <View
                      className="h-full bg-white rounded-full"
                      style={{ width: `${coveragePercent}%` }}
                    />
                  </View>
                </View>

                  <View className="flex-row mt-4 pt-4 border-t border-white/20">
                  <View className="flex-1">
                    <Text className="text-white/60 text-xs">{'Remaining'}</Text>
                    <Text className="text-white text-xl font-bold">
                      {`$${coverage?.remainingAmount?.toLocaleString() ?? 0}`}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-white/60 text-xs">{'Tickets Used'}</Text>
                    <Text className="text-white text-xl font-bold">
                      {`${coverage?.ticketsUsed ?? 0}/${coverage?.maxTickets ?? 0}`}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-white/60 text-xs">{'Plan Renews'}</Text>
                    <Text className="text-white text-xl font-bold">
                      {coverage?.periodEnd
                        ? (() => {
                            try {
                              return format(new Date(coverage.periodEnd), 'MMM d');
                            } catch {
                              return '--';
                            }
                          })()
                        : '--'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            </Pressable>
          </Animated.View>

          {/* Quick Actions */}
          <Animated.View
            entering={FadeInDown.delay(300).springify()}
            className="mx-5 mb-6"
          >
            <QuickActionButton onPress={handleNewClaim} />
          </Animated.View>

          {/* Recent Claims */}
          <Animated.View
            entering={FadeInDown.delay(400).springify()}
            className="mx-5"
          >
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-shield-black text-lg font-bold">{'Recent Claims'}</Text>
              <Pressable
                onPress={() => router.push('/(tabs)/claims')}
                className="flex-row items-center"
              >
                <Text className="text-shield-accent text-sm font-medium">{'View All'}</Text>
                <ChevronRight size={16} color="#F97316" />
              </Pressable>
            </View>

            {recentClaims.length > 0 ? (
              recentClaims.map((claim, index) => (
                <ClaimCard key={claim.id} claim={claim} index={index} />
              ))
            ) : (
              <Card className="items-center py-8">
                <FileText size={48} color="#9CA3AF" strokeWidth={1} />
                <Text className="text-gray-500 mt-3 text-center">
                  {"No claims yet.\nSubmit your first ticket!"}
                </Text>
              </Card>
            )}
          </Animated.View>

          {/* Stats Summary */}
          <Animated.View
            entering={FadeInDown.delay(500).springify()}
            className="mx-5 mt-6"
          >
            <Text className="text-shield-black text-lg font-bold mb-4">
              {'Your Stats'}
            </Text>
            <View className="flex-row space-x-3">
              <StatCard
                icon={<CheckCircle2 size={24} color="#22C55E" />}
                label="Approved"
                value={uniqueClaims.filter((c) => c.status === 'approved' || c.status === 'paid').length.toString()}
                color="bg-green-50"
              />
              <StatCard
                icon={<Clock size={24} color="#F97316" />}
                label="Pending"
                value={uniqueClaims.filter((c) => c.status === 'submitted' || c.status === 'under_review').length.toString()}
                color="bg-orange-50"
              />
              <StatCard
                icon={<AlertCircle size={24} color="#EF4444" />}
                label="Denied"
                value={uniqueClaims.filter((c) => c.status === 'denied').length.toString()}
                color="bg-red-50"
              />
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSettings(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setShowSettings(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View className="bg-white rounded-t-3xl">
              <SafeAreaView edges={['bottom']}>
                <View className="p-6">
                  {/* Header */}
                  <View className="flex-row items-center justify-between mb-6">
                    <Text className="text-shield-black text-xl font-bold">{'Settings'}</Text>
                    <Pressable
                      onPress={() => setShowSettings(false)}
                      className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
                    >
                      <X size={18} color="#6B7280" />
                    </Pressable>
                  </View>

                  {/* User Info */}
                  <View className="flex-row items-center mb-6 pb-6 border-b border-gray-100">
                    <View className="w-14 h-14 rounded-full bg-orange-100 items-center justify-center">
                      <User size={28} color="#F97316" />
                    </View>
                    <View className="ml-4 flex-1">
                      <Text className="text-shield-black font-semibold text-lg">
                        {user?.name || 'Driver'}
                      </Text>
                      <Text className="text-gray-500 text-sm">
                        {user?.email || 'No email'}
                      </Text>
                    </View>
                  </View>

                  {/* Menu Items */}
                  <Pressable
                    onPress={() => {
                      setShowSettings(false);
                      router.push('/complete-profile');
                    }}
                    className="flex-row items-center py-4 border-b border-gray-100"
                  >
                    <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center">
                      <User size={20} color="#6B7280" />
                    </View>
                    <Text className="flex-1 ml-4 text-shield-black font-medium">{'Edit Profile'}</Text>
                    <ChevronRight size={20} color="#9CA3AF" />
                  </Pressable>

                  {/* Logout Button */}
                  <Pressable
                    onPress={handleLogout}
                    className="flex-row items-center py-4 mt-2"
                  >
                    <View className="w-10 h-10 rounded-full bg-red-50 items-center justify-center">
                      <LogOut size={20} color="#EF4444" />
                    </View>
                    <Text className="flex-1 ml-4 text-red-500 font-medium">{'Log Out'}</Text>
                  </Pressable>
                </View>
              </SafeAreaView>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function QuickActionButton({ onPress }: { onPress: () => void }) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withSpring(1.02, { damping: 10 }),
        withSpring(1, { damping: 10 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <AnimatedPressable onPress={onPress} style={animatedStyle}>
      <LinearGradient
        colors={['#F97316', '#EA580C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 16 }}
      >
        <View className="flex-row items-center justify-center py-4 px-6">
          <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center mr-3">
            <Plus size={24} color="#FFFFFF" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-bold text-lg">{'Submit New Claim'}</Text>
            <Text className="text-white/70 text-sm">{"Got a ticket? We've got you covered."}</Text>
          </View>
          <ChevronRight size={24} color="#FFFFFF" />
        </View>
      </LinearGradient>
    </AnimatedPressable>
  );
}

function ClaimCard({ claim, index }: { claim: Claim; index: number }) {
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
    <Animated.View entering={FadeInRight.delay(100 * index).springify()}>
      <Card
        className="mb-3"
        onPress={() => router.push(`/claim/${claim.id}`)}
      >
        <View className="flex-row items-center">
          <View className="w-12 h-12 rounded-xl bg-gray-100 items-center justify-center">
            <FileText size={24} color="#6B7280" />
          </View>
          <View className="flex-1 ml-3">
            <Text className="text-shield-black font-semibold">
              {claim.ticketNumber || 'Unknown'}
            </Text>
            <Text className="text-gray-500 text-sm">
              {`${claim.city || 'Unknown'}, ${claim.state || 'Unknown'} • ${formattedDate}`}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-shield-black font-bold">{`$${claim.amount ?? 0}`}</Text>
            <StatusBadge status={claim.status || 'submitted'} size="sm" />
          </View>
        </View>
      </Card>
    </Animated.View>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View className={`flex-1 ${color} rounded-2xl p-4 items-center`}>
      {icon}
      <Text className="text-shield-black text-2xl font-bold mt-2">{value}</Text>
      <Text className="text-gray-500 text-xs">{label}</Text>
    </View>
  );
}
 
