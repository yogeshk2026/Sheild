import React, { useState } from 'react';
import { View, ScrollView, Pressable, Switch, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn, FadeOut } from 'react-native-reanimated';
import { Image } from 'expo-image';
import {
  User,
  CreditCard,
  Bell,
  HelpCircle,
  FileText,
  LogOut,
  ChevronRight,
  Mail,
  Phone,
  Sparkles,
  MessageCircle,
  Lock,
  Shield,
  Zap,
  Building2,
  AlertTriangle,
  Ban,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { Card, PlanBadge, Button, Text } from '@/components/ui';
import { useStore } from '@/lib/store';
import { ADD_ONS } from '@/lib/types';
import { getPlanConfig, isPaidPlan } from '@/lib/plan-config';

export default function SettingsScreen() {
  const router = useRouter();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const user = useStore((s) => s.user);
  const addOns = useStore((s) => s.addOns);
  const toggleAddOn = useStore((s) => s.toggleAddOn);
  const logout = useStore((s) => s.logout);

  const currentPlan = user?.currentPlan ?? 'free';
  const currentPlanConfig = getPlanConfig(currentPlan);
  const isPaidCurrentPlan = isPaidPlan(currentPlan) && !!user?.hasActiveSubscription;

  const handleLogout = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    logout();
    router.replace('/auth');
  };

  const handleToggleAddOn = (addOnId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    toggleAddOn(addOnId);
  };

  return (
    <View className="flex-1 bg-shield-surface">
      <SafeAreaView className="flex-1" edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Header */}
          <View className="px-5 pt-4 pb-6">
            <Text className="text-shield-black text-2xl font-bold">{'Settings'}</Text>
          </View>

          {/* Profile Section */}
          <Animated.View
            entering={FadeInDown.delay(100).springify()}
            className="mx-5 mb-6"
          >
            <Card>
              <View className="flex-row items-center">
                {user?.profileImage ? (
                  <Image
                    source={{ uri: user.profileImage }}
                    className="w-16 h-16 rounded-full"
                  />
                ) : (
                  <View className="w-16 h-16 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }}>
                    <User size={32} color="#FFFFFF" strokeWidth={1.5} />
                  </View>
                )}
                <View className="flex-1 ml-4">
                  <Text className="text-shield-black text-xl font-bold">
                    {user?.name || 'Driver'}
                  </Text>
                  <Text className="text-gray-500 text-sm">{user?.email}</Text>
                </View>
                <Pressable
                  onPress={() => router.push('/edit-profile')}
                  className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
                >
                  <ChevronRight size={20} color="#6B7280" />
                </Pressable>
              </View>

              <View className="mt-4 pt-4 border-t border-gray-100 flex-row">
                <View className="flex-row items-center flex-1">
                  <Mail size={16} color="#9CA3AF" />
                  <Text className="text-gray-500 text-sm ml-2" numberOfLines={1}>
                    {user?.email || '-'}
                  </Text>
                </View>
                <View className="flex-row items-center flex-1">
                  <Phone size={16} color="#9CA3AF" />
                  <Text className="text-gray-500 text-sm ml-2">
                    {user?.phone || '-'}
                  </Text>
                </View>
              </View>
            </Card>
          </Animated.View>

          {/* Current Plan */}
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            className="mx-5 mb-6"
          >
            <Text className="text-shield-black font-semibold mb-3">
              Current Plan
            </Text>
            <Card onPress={() => router.push(isPaidCurrentPlan ? '/subscription' : '/plans')}>
              <View className="flex-row items-center">
                {(() => {
                  const planId = currentPlan;
                  if (!isPaidCurrentPlan || planId === 'free') {
                    // No plan - show Ban icon with light grey background
                    return (
                      <View className="w-12 h-12 rounded-xl items-center justify-center bg-gray-100">
                        <Ban size={24} color="#9CA3AF" />
                      </View>
                    );
                  }
                  const PlanIcon = planId === 'basic' ? Shield : planId === 'pro' ? Zap : Building2;
                  const planColors = {
                    basic: { bg: 'bg-emerald-100', icon: '#059669' },
                    pro: { bg: 'bg-orange-500', icon: '#FFFFFF' },
                    professional: { bg: 'bg-sky-100', icon: '#0EA5E9' },
                  };
                  const colors = planColors[planId as keyof typeof planColors];
                  return (
                    <View className={`w-12 h-12 rounded-xl items-center justify-center ${colors.bg}`}>
                      <PlanIcon size={24} color={colors.icon} />
                    </View>
                  );
                })()}
                <View className="flex-1 ml-3">
                  <View className="flex-row items-center">
                    <Text className="text-shield-black font-bold text-lg">
                      {currentPlanConfig.name}
                    </Text>
                    {isPaidCurrentPlan && (
                      <View className="ml-2">
                        <PlanBadge plan={currentPlan as 'basic' | 'pro' | 'professional'} size="sm" />
                      </View>
                    )}
                  </View>
                  <Text className="text-gray-500 text-sm">
                    {isPaidCurrentPlan
                      ? `$${currentPlanConfig.monthlyPrice}/month • Up to $${currentPlanConfig.annualCap.toLocaleString()} coverage`
                      : 'Free plan active - upgrade for higher limits and benefits'}
                  </Text>
                </View>
                <ChevronRight size={20} color="#9CA3AF" />
              </View>
            </Card>
            <Button
              onPress={() => router.push(isPaidCurrentPlan ? '/subscription' : '/plans')}
              variant="secondary"
              fullWidth
              pill
              className="mt-3 bg-black"
            >
              {isPaidCurrentPlan ? 'Manage Subscription' : 'Upgrade Plan'}
            </Button>
          </Animated.View>

          {/* Add-ons */}
          <Animated.View
            entering={FadeInDown.delay(300).springify()}
            className="mx-5 mb-6"
          >
            <View className="flex-row items-center mb-3">
              <Sparkles size={18} color="#F97316" />
              <Text className="text-shield-black font-semibold ml-2">
                Add-ons
              </Text>
            </View>

            {ADD_ONS.map((addOn) => {
              const isEnabled = addOns.find((a) => a.id === addOn.id)?.enabled || false;
              return (
                <Card key={addOn.id} className="mb-3">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 mr-4">
                      <Text className="text-shield-black font-semibold">
                        {addOn.name}
                      </Text>
                      <Text className="text-gray-500 text-sm mt-0.5">
                        {addOn.description}
                      </Text>
                      <Text className="text-shield-accent font-semibold mt-1">
                        +${addOn.price}/month
                      </Text>
                    </View>
                    <Switch
                      value={isEnabled}
                      onValueChange={() => handleToggleAddOn(addOn.id)}
                      trackColor={{ false: '#E5E7EB', true: '#F97316' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                </Card>
              );
            })}
          </Animated.View>

          {/* Menu Items */}
          <Animated.View
            entering={FadeInDown.delay(400).springify()}
            className="mx-5 mb-6"
          >
            <Text className="text-shield-black font-semibold mb-3">
              Account
            </Text>

            <Card>
              <MenuItem
                icon={<CreditCard size={20} color="#6B7280" />}
                label="Payment Methods"
                onPress={() => router.push('/payment-methods')}
              />
              <MenuItem
                icon={<Bell size={20} color="#6B7280" />}
                label="Notifications"
                onPress={() => router.push('/notification-settings')}
              />
              <MenuItem
                icon={<FileText size={20} color="#6B7280" />}
                label="Documents"
                onPress={() => router.push('/documents')}
                isLast
              />
            </Card>
          </Animated.View>

          {/* Support */}
          <Animated.View
            entering={FadeInDown.delay(500).springify()}
            className="mx-5 mb-6"
          >
            <Text className="text-shield-black font-semibold mb-3">
              Support & Legal
            </Text>

            <Card>
              <MenuItem
                icon={<HelpCircle size={20} color="#6B7280" />}
                label="How It Works"
                onPress={() => router.push('/how-it-works')}
              />
              <MenuItem
                icon={<MessageCircle size={20} color="#6B7280" />}
                label="Contact Support"
                onPress={() => Linking.openURL('mailto:support@courial.com')}
              />
              <MenuItem
                icon={<HelpCircle size={20} color="#6B7280" />}
                label="Help Center"
                onPress={() => router.push('/help-center')}
              />
              <MenuItem
                icon={<FileText size={20} color="#6B7280" />}
                label="Terms of Service"
                onPress={() => router.push('/terms?tab=terms')}
              />
              <MenuItem
                icon={<Shield size={20} color="#6B7280" />}
                label="Coverage Policy"
                onPress={() => router.push('/terms?tab=coverage')}
              />
              <MenuItem
                icon={<Lock size={20} color="#6B7280" />}
                label="Privacy Policy"
                onPress={() => router.push('/terms?tab=privacy')}
                isLast
              />
            </Card>
          </Animated.View>

          {/* Logout */}
          <Animated.View
            entering={FadeInDown.delay(600).springify()}
            className="mx-5"
          >
            <Button
              onPress={handleLogout}
              variant="secondary"
              fullWidth
              pill
              icon={<LogOut size={18} color="#FFFFFF" />}
            >
              Log Out
            </Button>

            <Text className="text-gray-400 text-xs text-center mt-6">
              Courial Shield v1.0.0
            </Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 items-center justify-center px-6"
          onPress={() => setShowLogoutModal(false)}
        >
          <Pressable
            className="bg-white rounded-3xl w-full max-w-sm overflow-hidden"
            onPress={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <View className="items-center pt-6 pb-4">
              <View className="w-16 h-16 rounded-full bg-black items-center justify-center">
                <LogOut size={28} color="#FFFFFF" />
              </View>
            </View>

            {/* Content */}
            <View className="px-6 pb-6">
              <Text className="text-shield-black text-xl font-bold text-center mb-2">
                Log Out?
              </Text>
              <Text className="text-gray-500 text-center mb-6">
                Are you sure you want to log out of your account? You'll need to sign in again to access your coverage.
              </Text>

              {/* Buttons - CTA is black with white text, sized to fit content */}
              <View className="flex-row justify-center" style={{ gap: 12 }}>
                <Pressable
                  onPress={() => setShowLogoutModal(false)}
                  className="px-5 py-3 rounded-xl bg-gray-100"
                >
                  <Text className="text-shield-dark font-semibold">{'Cancel'}</Text>
                </Pressable>
                <Pressable
                  onPress={confirmLogout}
                  className="px-5 py-3 rounded-xl bg-black"
                >
                  <Text className="text-white font-semibold">{'Log Out'}</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  isLast = false,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (e) {}
        onPress();
      }}
      className={`flex-row items-center py-3 ${
        !isLast ? 'border-b border-gray-100' : ''
      }`}
    >
      <View className="w-8">{icon}</View>
      <Text className="flex-1 text-shield-black">{label}</Text>
      <ChevronRight size={18} color="#9CA3AF" />
    </Pressable>
  );
}
