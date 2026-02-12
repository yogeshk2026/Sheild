import React, { useEffect } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { Bell, FileText, Wallet, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Card, Text } from '@/components/ui';
import { useStore, generateMockNotifications } from '@/lib/store';
import type { Notification } from '@/lib/types';
import { format, formatDistanceToNow } from 'date-fns';

export default function NotificationsScreen() {
  const notifications = useStore((s) => s.notifications);
  const addNotification = useStore((s) => s.addNotification);
  const markNotificationRead = useStore((s) => s.markNotificationRead);
  const markAllNotificationsRead = useStore((s) => s.markAllNotificationsRead);

  // Initialize demo notifications
  useEffect(() => {
    if (notifications.length === 0) {
      const mockNotifications = generateMockNotifications();
      mockNotifications.forEach((n) => addNotification(n));
    }
  }, []);

  const handleMarkAllRead = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    markAllNotificationsRead();
  };

  const handleNotificationPress = (notification: Notification) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!notification.read) {
      markNotificationRead(notification.id);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerRight: () => (
            <Pressable onPress={handleMarkAllRead} className="mr-2">
              <Text className="text-shield-accent font-medium">Mark all read</Text>
            </Pressable>
          ),
        }}
      />

      <View className="flex-1 bg-shield-surface">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20 }}
        >
          {notifications.length > 0 ? (
            notifications.map((notification, index) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                index={index}
                onPress={() => handleNotificationPress(notification)}
              />
            ))
          ) : (
            <View className="items-center py-20">
              <Bell size={64} color="#D1D5DB" strokeWidth={1} />
              <Text className="text-gray-400 text-lg mt-4">No notifications</Text>
              <Text className="text-gray-400 text-sm mt-1">
                You're all caught up!
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </>
  );
}

function NotificationItem({
  notification,
  index,
  onPress,
}: {
  notification: Notification;
  index: number;
  onPress: () => void;
}) {
  // Safe date formatting
  const timeAgo = React.useMemo(() => {
    try {
      if (!notification?.createdAt) return '';
      return formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true });
    } catch {
      return '';
    }
  }, [notification?.createdAt]);

  // Guard against invalid notification data
  if (!notification?.id) {
    return null;
  }

  const getIcon = () => {
    switch (notification.type) {
      case 'claim_update':
        return <FileText size={20} color="#6B7280" />;
      case 'payout':
        return <Wallet size={20} color="#22C55E" />;
      case 'coverage_warning':
        return <AlertCircle size={20} color="#F97316" />;
      default:
        return <Bell size={20} color="#6B7280" />;
    }
  };

  const getIconBg = () => {
    switch (notification.type) {
      case 'claim_update':
        return 'bg-gray-100';
      case 'payout':
        return 'bg-green-100';
      case 'coverage_warning':
        return 'bg-orange-100';
      default:
        return 'bg-gray-100';
    }
  };

  return (
    <Animated.View entering={FadeInRight.delay(50 * index).springify()}>
      <Card className={`mb-3 ${!notification.read ? 'border-l-4 border-l-shield-accent' : ''}`} onPress={onPress}>
        <View className="flex-row">
          <View
            className={`w-10 h-10 rounded-full items-center justify-center ${getIconBg()}`}
          >
            {getIcon()}
          </View>
          <View className="flex-1 ml-3">
            <View className="flex-row items-center justify-between">
              <Text
                className={`font-semibold ${
                  notification.read ? 'text-gray-600' : 'text-shield-black'
                }`}
              >
                {notification.title || 'Notification'}
              </Text>
              {!notification.read && (
                <View className="w-2 h-2 rounded-full bg-shield-accent" />
              )}
            </View>
            <Text className="text-gray-500 text-sm mt-1">
              {notification.message || ''}
            </Text>
            {timeAgo && (
              <Text className="text-gray-400 text-xs mt-2">
                {timeAgo}
              </Text>
            )}
          </View>
        </View>
      </Card>
    </Animated.View>
  );
}
