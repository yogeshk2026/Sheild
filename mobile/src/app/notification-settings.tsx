import React from 'react';
import { View, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Bell, Mail, MessageSquare, AlertTriangle, FileText, Info } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Card, Text } from '@/components/ui';
import { useStore } from '@/lib/store';

export default function NotificationSettingsScreen() {
  const getNotificationPreferences = useStore((s) => s.getNotificationPreferences);
  const updateNotificationPreferences = useStore((s) => s.updateNotificationPreferences);

  const preferences = getNotificationPreferences();

  const handleToggleChannel = (channel: 'pushEnabled' | 'emailEnabled' | 'smsEnabled') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateNotificationPreferences({ [channel]: !preferences[channel] });
  };

  const handleToggleEvent = (event: 'claimSubmitted' | 'claimApproved' | 'claimDenied' | 'claimPaid') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateNotificationPreferences({ [event]: !preferences[event] });
  };

  return (
    <View className="flex-1 bg-shield-surface">
      <SafeAreaView className="flex-1" edges={['bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Notification Channels */}
          <Animated.View
            entering={FadeInDown.delay(100).springify()}
            className="px-5 pt-4"
          >
            <Text className="text-shield-black font-semibold mb-3">
              Notification Channels
            </Text>
            <Card>
              {/* Push Notifications */}
              <View className="flex-row items-center py-4 border-b border-gray-100">
                <View className="w-10">
                  <Bell size={20} color="#6B7280" />
                </View>
                <View className="flex-1">
                  <Text className="text-shield-black font-medium">
                    Push Notifications
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    Receive alerts on your device
                  </Text>
                </View>
                <Switch
                  value={preferences.pushEnabled}
                  onValueChange={() => handleToggleChannel('pushEnabled')}
                  trackColor={{ false: '#E5E7EB', true: '#F97316' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Email Notifications */}
              <View className="flex-row items-center py-4 border-b border-gray-100">
                <View className="w-10">
                  <Mail size={20} color="#6B7280" />
                </View>
                <View className="flex-1">
                  <Text className="text-shield-black font-medium">
                    Email Notifications
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    Get claim updates via email
                  </Text>
                </View>
                <Switch
                  value={preferences.emailEnabled}
                  onValueChange={() => handleToggleChannel('emailEnabled')}
                  trackColor={{ false: '#E5E7EB', true: '#F97316' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* SMS Notifications */}
              <View className="flex-row items-center py-4">
                <View className="w-10">
                  <MessageSquare size={20} color="#6B7280" />
                </View>
                <View className="flex-1">
                  <Text className="text-shield-black font-medium">
                    SMS Notifications
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    Payment alerts only (opt-in)
                  </Text>
                </View>
                <Switch
                  value={preferences.smsEnabled}
                  onValueChange={() => handleToggleChannel('smsEnabled')}
                  trackColor={{ false: '#E5E7EB', true: '#F97316' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </Card>

            {/* SMS Info Note */}
            {preferences.smsEnabled && (
              <View className="flex-row items-start p-3 bg-blue-50 rounded-xl mt-3">
                <Info size={16} color="#3B82F6" />
                <Text className="text-blue-800 text-xs ml-2 flex-1">
                  SMS notifications are only sent when a payment is added to your wallet.
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Claim Notifications */}
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            className="px-5 pt-6"
          >
            <View className="flex-row items-center mb-3">
              <FileText size={18} color="#F97316" />
              <Text className="text-shield-black font-semibold ml-2">
                Claim Events
              </Text>
            </View>
            <Card>
              {/* Claim Submitted */}
              <View className="flex-row items-center py-4 border-b border-gray-100">
                <View className="flex-1">
                  <Text className="text-shield-black font-medium">
                    Claim Submitted
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    When your claim is received
                  </Text>
                </View>
                <Switch
                  value={preferences.claimSubmitted}
                  onValueChange={() => handleToggleEvent('claimSubmitted')}
                  trackColor={{ false: '#E5E7EB', true: '#F97316' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Claim Approved */}
              <View className="flex-row items-center py-4 border-b border-gray-100">
                <View className="flex-1">
                  <Text className="text-shield-black font-medium">
                    Claim Approved
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    When your claim is approved
                  </Text>
                </View>
                <Switch
                  value={preferences.claimApproved}
                  onValueChange={() => handleToggleEvent('claimApproved')}
                  trackColor={{ false: '#E5E7EB', true: '#F97316' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Claim Denied */}
              <View className="flex-row items-center py-4 border-b border-gray-100">
                <View className="flex-1">
                  <Text className="text-shield-black font-medium">
                    Claim Denied
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    If your claim is not approved
                  </Text>
                </View>
                <Switch
                  value={preferences.claimDenied}
                  onValueChange={() => handleToggleEvent('claimDenied')}
                  trackColor={{ false: '#E5E7EB', true: '#F97316' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Payment Sent */}
              <View className="flex-row items-center py-4">
                <View className="flex-1">
                  <Text className="text-shield-black font-medium">
                    Payment Sent
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    When payout is added to your wallet
                  </Text>
                </View>
                <Switch
                  value={preferences.claimPaid}
                  onValueChange={() => handleToggleEvent('claimPaid')}
                  trackColor={{ false: '#E5E7EB', true: '#F97316' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </Card>
          </Animated.View>

          {/* Channel Info */}
          <Animated.View
            entering={FadeInDown.delay(300).springify()}
            className="px-5 pt-6"
          >
            <Text className="text-shield-black font-semibold mb-3">
              How Notifications Work
            </Text>
            <Card className="bg-gray-50">
              <View style={{ gap: 12 }}>
                <View className="flex-row items-start">
                  <Bell size={16} color="#F97316" />
                  <Text className="text-gray-600 text-sm ml-2 flex-1">
                    <Text className="font-medium">{'Push:'}</Text>{' All claim events'}
                  </Text>
                </View>
                <View className="flex-row items-start">
                  <Mail size={16} color="#F97316" />
                  <Text className="text-gray-600 text-sm ml-2 flex-1">
                    <Text className="font-medium">{'Email:'}</Text>{' Submitted, approved, denied, paid'}
                  </Text>
                </View>
                <View className="flex-row items-start">
                  <MessageSquare size={16} color="#F97316" />
                  <Text className="text-gray-600 text-sm ml-2 flex-1">
                    <Text className="font-medium">{'SMS:'}</Text>{' Payment sent only'}
                  </Text>
                </View>
              </View>
            </Card>
          </Animated.View>

          {/* Info Note */}
          <Animated.View
            entering={FadeInDown.delay(400).springify()}
            className="px-5 pt-6"
          >
            <View className="flex-row items-start p-4 bg-amber-50 rounded-xl">
              <AlertTriangle size={18} color="#D97706" />
              <Text className="text-amber-800 text-sm ml-3 flex-1">
                Important notifications about your claims and account security cannot be disabled.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
