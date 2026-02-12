import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { FileText, Download, ExternalLink, Receipt, Car, Lock, Shield } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Card, Text } from '@/components/ui';
import { useStore } from '@/lib/store';

interface Document {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  type: 'internal' | 'download';
  route?: string;
}

export default function DocumentsScreen() {
  const router = useRouter();
  const user = useStore((s) => s.user);
  const coverage = useStore((s) => s.coverage);

  const legalDocuments: Document[] = [
    {
      id: 'terms',
      title: 'Terms of Service',
      description: 'Service agreement and conditions',
      icon: <FileText size={20} color="#6B7280" />,
      type: 'internal',
      route: '/terms?tab=terms',
    },
    {
      id: 'coverage',
      title: 'Coverage Policy',
      description: 'What\'s covered and exclusions',
      icon: <Shield size={20} color="#6B7280" />,
      type: 'internal',
      route: '/terms?tab=coverage',
    },
    {
      id: 'privacy',
      title: 'Privacy Policy',
      description: 'How we handle your data',
      icon: <Lock size={20} color="#6B7280" />,
      type: 'internal',
      route: '/terms?tab=privacy',
    },
  ];

  const accountDocuments: Document[] = [
    {
      id: 'subscription',
      title: 'Subscription Details',
      description: `${coverage?.planId ? coverage.planId.charAt(0).toUpperCase() + coverage.planId.slice(1) : 'No'} Plan`,
      icon: <Receipt size={20} color="#F97316" />,
      type: 'internal',
      route: '/subscription',
    },
    {
      id: 'vehicles',
      title: 'Registered Vehicles',
      description: 'View your covered vehicles',
      icon: <Car size={20} color="#F97316" />,
      type: 'internal',
      route: '/vehicles',
    },
  ];

  const handlePress = (doc: Document) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (doc.route) {
      router.push(doc.route as any);
    }
  };

  return (
    <View className="flex-1 bg-shield-surface">
      <SafeAreaView className="flex-1" edges={['bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Account Documents */}
          <Animated.View
            entering={FadeInDown.delay(100).springify()}
            className="px-5 pt-4"
          >
            <Text className="text-shield-black font-semibold mb-3">
              My Account
            </Text>
            <Card>
              {accountDocuments.map((doc, index) => (
                <Pressable
                  key={doc.id}
                  onPress={() => handlePress(doc)}
                  className={`flex-row items-center py-4 ${
                    index < accountDocuments.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <View className="w-10 h-10 rounded-xl bg-orange-50 items-center justify-center">
                    {doc.icon}
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="text-shield-black font-medium">
                      {doc.title}
                    </Text>
                    <Text className="text-gray-500 text-sm">
                      {doc.description}
                    </Text>
                  </View>
                  <ExternalLink size={18} color="#9CA3AF" />
                </Pressable>
              ))}
            </Card>
          </Animated.View>

          {/* Legal Documents */}
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            className="px-5 pt-6"
          >
            <Text className="text-shield-black font-semibold mb-3">
              Legal Documents
            </Text>
            <Card>
              {legalDocuments.map((doc, index) => (
                <Pressable
                  key={doc.id}
                  onPress={() => handlePress(doc)}
                  className={`flex-row items-center py-4 ${
                    index < legalDocuments.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <View className="w-10 h-10 rounded-xl bg-gray-100 items-center justify-center">
                    {doc.icon}
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="text-shield-black font-medium">
                      {doc.title}
                    </Text>
                    <Text className="text-gray-500 text-sm">
                      {doc.description}
                    </Text>
                  </View>
                  <ExternalLink size={18} color="#9CA3AF" />
                </Pressable>
              ))}
            </Card>
          </Animated.View>

          {/* Info */}
          <Animated.View
            entering={FadeInDown.delay(300).springify()}
            className="px-5 pt-6"
          >
            <View className="p-4 bg-blue-50 rounded-xl">
              <Text className="text-blue-800 text-sm">
                All documents are available for viewing within the app. For printable copies or additional documentation, contact support@courial.com
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
