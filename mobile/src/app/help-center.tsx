import React from 'react';
import { View, ScrollView, Pressable, Linking } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  HelpCircle,
  FileText,
  MessageCircle,
  Mail,
  ChevronRight,
  CreditCard,
  Clock,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Card, Text } from '@/components/ui';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  icon: React.ReactNode;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: '1',
    question: 'How do I submit a claim?',
    answer:
      'Tap "Submit New Claim" on your dashboard, take a photo of your parking ticket, and our AI will extract the details. Review the information and submit.',
    icon: <FileText size={20} color="#F97316" />,
  },
  {
    id: '2',
    question: 'How long does claim review take?',
    answer:
      'Most claims are reviewed within 24-48 hours. You\'ll receive a notification once your claim is processed.',
    icon: <Clock size={20} color="#F97316" />,
  },
  {
    id: '3',
    question: 'When will I receive my payout?',
    answer:
      'Once your claim is approved, the payout is immediately added to your wallet. You can then withdraw to your linked bank account (1-3 business days).',
    icon: <CreditCard size={20} color="#F97316" />,
  },
  {
    id: '4',
    question: 'What tickets are covered?',
    answer:
      'We cover parking violations received while actively performing gig work, including expired meter, street cleaning, loading zone, and more. Moving violations are not covered.',
    icon: <CheckCircle size={20} color="#F97316" />,
  },
  {
    id: '5',
    question: 'Why was my claim denied?',
    answer:
      'Claims may be denied for various reasons including: ticket outside coverage window, violation type not covered, or unable to verify gig work. Check your claim details for the specific reason.',
    icon: <AlertTriangle size={20} color="#F97316" />,
  },
];

export default function HelpCenterScreen() {
  const router = useRouter();
  // Track which FAQ item is expanded by ID instead of inside each FAQRow
  const [expandedFaqId, setExpandedFaqId] = React.useState<string | null>(null);

  const handleContactSupport = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL('mailto:support@courial.com');
  };

  const toggleFaq = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedFaqId(expandedFaqId === id ? null : id);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Help Center',
          headerBackTitle: 'Back',
        }}
      />

      <View className="flex-1 bg-shield-surface">
        <SafeAreaView className="flex-1" edges={['bottom']}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          >
            {/* Quick Actions */}
            <Animated.View entering={FadeInDown.delay(100).springify()}>
              <Text className="text-shield-black font-semibold mb-3">
                Quick Actions
              </Text>
              <View className="flex-row gap-3 mb-6">
                <Card
                  className="flex-1 items-center py-4"
                  onPress={handleContactSupport}
                >
                  <View className="w-12 h-12 rounded-full bg-orange-50 items-center justify-center mb-2">
                    <Mail size={24} color="#F97316" />
                  </View>
                  <Text className="text-shield-black font-medium text-center">
                    Email Support
                  </Text>
                </Card>
                <Card
                  className="flex-1 items-center py-4"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push('/how-it-works');
                  }}
                >
                  <View className="w-12 h-12 rounded-full bg-orange-50 items-center justify-center mb-2">
                    <HelpCircle size={24} color="#F97316" />
                  </View>
                  <Text className="text-shield-black font-medium text-center">
                    How It Works
                  </Text>
                </Card>
              </View>
            </Animated.View>

            {/* FAQ */}
            <Animated.View entering={FadeInDown.delay(200).springify()}>
              <Text className="text-shield-black font-semibold mb-3">
                Frequently Asked Questions
              </Text>
              <Card>
                {FAQ_ITEMS.map((item, index) => (
                  <FAQRow
                    key={item.id}
                    item={item}
                    isLast={index === FAQ_ITEMS.length - 1}
                    isExpanded={expandedFaqId === item.id}
                    onToggle={() => toggleFaq(item.id)}
                  />
                ))}
              </Card>
            </Animated.View>

            {/* Resources */}
            <Animated.View entering={FadeInDown.delay(300).springify()}>
              <Text className="text-shield-black font-semibold mb-3 mt-6">
                Resources
              </Text>
              <Card>
                <MenuItem
                  icon={<FileText size={20} color="#6B7280" />}
                  label="Terms of Service"
                  onPress={() => router.push('/terms?tab=terms')}
                />
                <MenuItem
                  icon={<FileText size={20} color="#6B7280" />}
                  label="Coverage Policy"
                  onPress={() => router.push('/terms?tab=coverage')}
                />
                <MenuItem
                  icon={<FileText size={20} color="#6B7280" />}
                  label="Privacy Policy"
                  onPress={() => router.push('/terms?tab=privacy')}
                  isLast
                />
              </Card>
            </Animated.View>

            {/* Contact Info */}
            <Animated.View entering={FadeInDown.delay(400).springify()}>
              <View className="mt-6 p-4 bg-gray-100 rounded-xl items-center">
                <MessageCircle size={32} color="#9CA3AF" strokeWidth={1.5} />
                <Text className="text-gray-600 font-medium mt-3">
                  Need more help?
                </Text>
                <Text className="text-gray-500 text-sm text-center mt-1">
                  Contact us at support@courial.com
                </Text>
                <Text className="text-gray-400 text-xs text-center mt-2">
                  We typically respond within 24 hours
                </Text>
              </View>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </>
  );
}

function FAQRow({ item, isLast, isExpanded, onToggle }: { item: FAQItem; isLast: boolean; isExpanded: boolean; onToggle: () => void }) {
  return (
    <Pressable
      onPress={onToggle}
      className={`py-4 ${!isLast ? 'border-b border-gray-100' : ''}`}
    >
      <View className="flex-row items-center">
        <View className="w-8">{item.icon}</View>
        <Text className="flex-1 text-shield-black font-medium">
          {item.question}
        </Text>
        <ChevronRight
          size={18}
          color="#9CA3AF"
          style={{
            transform: [{ rotate: isExpanded ? '90deg' : '0deg' }],
          }}
        />
      </View>
      {isExpanded && (
        <Text className="text-gray-600 text-sm mt-3 ml-8">{item.answer}</Text>
      )}
    </Pressable>
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
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
