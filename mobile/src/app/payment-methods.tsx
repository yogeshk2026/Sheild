import React, { useState } from 'react';
import { View, ScrollView, Pressable, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { CreditCard, Plus, Trash2, Check, Apple, Building2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Card, Button, Text, SystemMessage } from '@/components/ui';
import { useStore } from '@/lib/store';

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const paymentMethods = useStore((s) => s.paymentMethods);
  const removeBankAccount = useStore((s) => s.removeBankAccount);
  const setDefaultBankAccount = useStore((s) => s.setDefaultBankAccount);

  // System message state
  const [messageVisible, setMessageVisible] = useState(false);
  const [messageConfig, setMessageConfig] = useState<{
    type: 'error' | 'success' | 'warning' | 'info' | 'confirm';
    title: string;
    message: string;
  }>({ type: 'info', title: '', message: '' });

  // Delete confirmation modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const showMessage = (type: 'error' | 'success' | 'warning' | 'info' | 'confirm', title: string, message: string) => {
    setMessageConfig({ type, title, message });
    setMessageVisible(true);
  };

  const handleSetDefault = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const method = paymentMethods.find((pm) => pm.id === id);
    if (method?.type === 'bank' && method.bankAccountId) {
      setDefaultBankAccount(method.bankAccountId);
    }
  };

  const handleDelete = (id: string) => {
    const method = paymentMethods.find((pm) => pm.id === id);
    if (method?.isDefault) {
      showMessage('warning', 'Cannot Delete', 'This is your default payment method. Please set another payment method as default first.');
      return;
    }

    setDeleteTargetId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (deleteTargetId) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const method = paymentMethods.find((pm) => pm.id === deleteTargetId);
      if (method?.type === 'bank' && method.bankAccountId) {
        removeBankAccount(method.bankAccountId);
      }
    }
    setShowDeleteConfirm(false);
    setDeleteTargetId(null);
  };

  const handleAddPaymentMethod = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/add-bank');
  };

  const getPaymentIcon = (type: string) => {
    switch (type) {
      case 'bank':
        return <Building2 size={24} color="#1A1A1A" />;
      case 'apple_pay':
        return <Apple size={24} color="#000000" />;
      case 'paypal':
        return <Text className="text-[#003087] font-bold">Pay</Text>;
      default:
        return <CreditCard size={24} color="#6B7280" />;
    }
  };

  const getPaymentLabel = (method: { type: string; label: string; brand?: string; last4?: string }) => {
    switch (method.type) {
      case 'apple_pay':
        return 'Apple Pay';
      case 'paypal':
        return 'PayPal';
      case 'bank':
        return method.label;
      default:
        return method.label || `${method.brand || 'Card'} •••• ${method.last4 || '0000'}`;
    }
  };

  return (
    <View className="flex-1 bg-shield-surface">
      <SafeAreaView className="flex-1" edges={['bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <View className="px-5 pt-4">
            <Animated.View entering={FadeInDown.delay(100).springify()}>
              <Text className="text-gray-500 text-sm mb-4">
                Manage your payment methods for subscription billing.
              </Text>
            </Animated.View>

            {/* Payment Methods List */}
            {paymentMethods.length > 0 ? paymentMethods.map((method, index) => (
              <Animated.View
                key={method.id}
                entering={FadeInDown.delay(150 + index * 50).springify()}
              >
                <Card className="mb-3">
                  <View className="flex-row items-center">
                    <View className="w-12 h-12 rounded-xl bg-gray-100 items-center justify-center">
                      {getPaymentIcon(method.type)}
                    </View>
                    <View className="flex-1 ml-3">
                      <Text className="text-shield-black font-semibold">
                        {getPaymentLabel(method)}
                      </Text>
                      {method.isDefault && (
                        <View className="flex-row items-center mt-1">
                          <Check size={12} color="#22C55E" />
                          <Text className="text-green-600 text-xs ml-1">Default</Text>
                        </View>
                      )}
                    </View>
                    <View className="flex-row items-center">
                      {!method.isDefault && (
                        <Pressable
                          onPress={() => handleSetDefault(method.id)}
                          className="px-3 py-2 mr-2"
                        >
                          <Text className="text-shield-accent text-sm font-medium">Set Default</Text>
                        </Pressable>
                      )}
                      <Pressable
                        onPress={() => handleDelete(method.id)}
                        className="w-10 h-10 rounded-full bg-red-50 items-center justify-center"
                      >
                        <Trash2 size={18} color="#EF4444" />
                      </Pressable>
                    </View>
                  </View>
                </Card>
              </Animated.View>
            )) : (
              <Card className="py-8 items-center">
                <Building2 size={36} color="#9CA3AF" />
                <Text className="text-gray-500 mt-3">No payment methods saved yet.</Text>
                <Text className="text-gray-400 text-sm mt-1">Add a bank account to enable withdrawals.</Text>
              </Card>
            )}

            {/* Add Payment Method */}
            <Animated.View entering={FadeInDown.delay(300).springify()}>
              <Pressable
                onPress={handleAddPaymentMethod}
                className="border-2 border-dashed border-gray-300 rounded-2xl py-6 items-center mt-4"
              >
                <View className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center mb-2">
                  <Plus size={24} color="#6B7280" />
                </View>
                <Text className="text-gray-500 font-medium">Add Payment Method</Text>
              </Pressable>
            </Animated.View>

            {/* Info */}
            <Animated.View entering={FadeInDown.delay(400).springify()}>
              <View className="mt-6 p-4 bg-blue-50 rounded-xl">
                <Text className="text-blue-800 text-sm">
                  Your payment information is securely stored and masked. We never store full account numbers.
                </Text>
              </View>
            </Animated.View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* System Message Modal */}
      <SystemMessage
        visible={messageVisible}
        onClose={() => setMessageVisible(false)}
        type={messageConfig.type}
        title={messageConfig.title}
        message={messageConfig.message}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center px-6"
          onPress={() => setShowDeleteConfirm(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View className="bg-white rounded-3xl p-6 w-full max-w-sm">
              <View className="items-center mb-4">
                <View className="w-16 h-16 rounded-full bg-red-100 items-center justify-center">
                  <Trash2 size={32} color="#EF4444" />
                </View>
              </View>

              <Text className="text-shield-black text-xl font-bold text-center mb-2">
                Delete Payment Method
              </Text>
              <Text className="text-gray-600 text-center mb-6">
                Are you sure you want to remove this payment method? This action cannot be undone.
              </Text>

              <View className="flex-row justify-center" style={{ gap: 12 }}>
                <Pressable
                  onPress={() => setShowDeleteConfirm(false)}
                  className="px-5 py-3 rounded-xl bg-gray-100"
                >
                  <Text className="text-shield-dark font-semibold">Cancel</Text>
                </Pressable>
                <Button
                  onPress={confirmDelete}
                  variant="danger"
                  size="md"
                  pill
                  className="px-5"
                >
                  Delete
                </Button>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
