import React, { useState } from 'react';
import { View, ScrollView, TextInput } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Building2, AlertCircle, Lock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Card, Button, Text, SystemMessage } from '@/components/ui';
import { useStore } from '@/lib/store';

export default function AddBankScreen() {
  const router = useRouter();
  const user = useStore((s) => s.user);
  const bankAccounts = useStore((s) => s.bankAccounts);
  const addBankAccount = useStore((s) => s.addBankAccount);

  const [routingNumber, setRoutingNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // System message state
  const [messageVisible, setMessageVisible] = useState(false);
  const [messageConfig, setMessageConfig] = useState<{
    type: 'error' | 'success' | 'warning' | 'info' | 'confirm';
    title: string;
    message: string;
    onClose?: () => void;
  }>({ type: 'info', title: '', message: '' });

  const showMessage = (type: 'error' | 'success' | 'warning' | 'info' | 'confirm', title: string, message: string, onClose?: () => void) => {
    setMessageConfig({ type, title, message, onClose });
    setMessageVisible(true);
  };

  const hideMessage = () => {
    setMessageVisible(false);
    if (messageConfig.onClose) {
      messageConfig.onClose();
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!accountHolderName.trim()) {
      newErrors.accountHolderName = 'Account holder name is required';
    }

    if (!routingNumber.trim()) {
      newErrors.routingNumber = 'Routing number is required';
    } else if (routingNumber.length !== 9) {
      newErrors.routingNumber = 'Routing number must be 9 digits';
    } else {
      const digits = routingNumber.split('').map((digit) => parseInt(digit, 10));
      const checksum =
        3 * (digits[0] + digits[3] + digits[6]) +
        7 * (digits[1] + digits[4] + digits[7]) +
        (digits[2] + digits[5] + digits[8]);
      if (checksum % 10 !== 0) {
        newErrors.routingNumber = 'Routing number is invalid';
      }
    }

    if (!accountNumber.trim()) {
      newErrors.accountNumber = 'Account number is required';
    } else if (!/^\d+$/.test(accountNumber)) {
      newErrors.accountNumber = 'Account number must contain only numbers';
    } else if (accountNumber.length < 4 || accountNumber.length > 17) {
      newErrors.accountNumber = 'Account number must be between 4 and 17 digits';
    }

    if (!confirmAccountNumber.trim()) {
      newErrors.confirmAccountNumber = 'Please confirm account number';
    } else if (!/^\d+$/.test(confirmAccountNumber)) {
      newErrors.confirmAccountNumber = 'Account number must contain only numbers';
    }

    if (accountNumber !== confirmAccountNumber) {
      newErrors.confirmAccountNumber = 'Account numbers do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddBank = async () => {
    if (!validateForm()) {
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const accountLast4 = accountNumber.slice(-4);
    const masked = `••••${accountLast4}`;
    const createdAccount = addBankAccount({
      accountHolderName: accountHolderName.trim(),
      routingNumber,
      accountNumberLast4: accountLast4,
      accountNumberMasked: masked,
      bankName: 'Bank Account',
      isDefault: bankAccounts.length === 0,
    });
    console.log('[AddBank] Bank account saved locally:', createdAccount.id, 'user:', user?.id || 'anonymous');

    setLoading(false);

    showMessage(
      'success',
      'Bank Account Added',
      'Your bank account has been successfully linked. It will be available for withdrawals after verification (typically 1-2 business days).',
      () => router.back()
    );
  };

  const formatRoutingNumber = (value: string) => {
    return value.replace(/[^0-9]/g, '').slice(0, 9);
  };

  const formatAccountNumber = (value: string) => {
    return value.replace(/[^0-9]/g, '').slice(0, 17);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Add Bank Account',
          headerBackTitle: 'Back',
        }}
      />

      <View className="flex-1 bg-shield-surface">
        <SafeAreaView className="flex-1" edges={['bottom']}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header Info */}
            <Animated.View entering={FadeInDown.delay(100).springify()}>
              <Card className="mb-6 bg-shield-dark">
                <View className="flex-row items-center">
                  <View className="w-12 h-12 rounded-full bg-white/10 items-center justify-center">
                    <Building2 size={24} color="#FFFFFF" />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="text-white font-semibold">
                      Link Your Bank Account
                    </Text>
                    <Text className="text-white/60 text-sm">
                      For receiving your payouts
                    </Text>
                  </View>
                </View>
              </Card>
            </Animated.View>

            {/* Form */}
            <Animated.View entering={FadeInDown.delay(200).springify()}>
              <Text className="text-shield-black font-semibold mb-3">
                Account Details
              </Text>
              <Card className="mb-6">
                {/* Account Holder Name */}
                <View className="mb-4">
                  <Text className="text-gray-600 text-sm mb-2">
                    Account Holder Name
                  </Text>
                  <TextInput
                    value={accountHolderName}
                    onChangeText={setAccountHolderName}
                    placeholder="John Smith"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="words"
                    className="bg-gray-50 rounded-xl px-4 py-3 text-shield-black"
                  />
                  {errors.accountHolderName && (
                    <Text className="text-red-500 text-sm mt-1">
                      {errors.accountHolderName}
                    </Text>
                  )}
                </View>

                {/* Routing Number */}
                <View className="mb-4">
                  <Text className="text-gray-600 text-sm mb-2">
                    Routing Number
                  </Text>
                  <TextInput
                    value={routingNumber}
                    onChangeText={(v) => setRoutingNumber(formatRoutingNumber(v))}
                    placeholder="9 digits"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                    maxLength={9}
                    className="bg-gray-50 rounded-xl px-4 py-3 text-shield-black"
                  />
                  {errors.routingNumber && (
                    <Text className="text-red-500 text-sm mt-1">
                      {errors.routingNumber}
                    </Text>
                  )}
                </View>

                {/* Account Number */}
                <View className="mb-4">
                  <Text className="text-gray-600 text-sm mb-2">
                    Account Number
                  </Text>
                  <TextInput
                    value={accountNumber}
                    onChangeText={(v) => setAccountNumber(formatAccountNumber(v))}
                    placeholder="Your account number"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                    secureTextEntry
                    className="bg-gray-50 rounded-xl px-4 py-3 text-shield-black"
                  />
                  {errors.accountNumber && (
                    <Text className="text-red-500 text-sm mt-1">
                      {errors.accountNumber}
                    </Text>
                  )}
                </View>

                {/* Confirm Account Number */}
                <View>
                  <Text className="text-gray-600 text-sm mb-2">
                    Confirm Account Number
                  </Text>
                  <TextInput
                    value={confirmAccountNumber}
                    onChangeText={(v) => setConfirmAccountNumber(formatAccountNumber(v))}
                    placeholder="Re-enter account number"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                    secureTextEntry
                    className="bg-gray-50 rounded-xl px-4 py-3 text-shield-black"
                  />
                  {errors.confirmAccountNumber && (
                    <Text className="text-red-500 text-sm mt-1">
                      {errors.confirmAccountNumber}
                    </Text>
                  )}
                </View>
              </Card>
            </Animated.View>

            {/* Security Info */}
            <Animated.View entering={FadeInDown.delay(300).springify()}>
              <View className="bg-green-50 rounded-xl p-4 mb-4">
                <View className="flex-row items-start">
                  <Lock size={20} color="#22C55E" />
                  <View className="flex-1 ml-3">
                    <Text className="text-green-800 font-semibold mb-1">
                      Bank-Level Security
                    </Text>
                    <Text className="text-green-700 text-sm">
                      Your banking information is encrypted and securely transmitted. We never store your full account details.
                    </Text>
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* Verification Info */}
            <Animated.View entering={FadeInDown.delay(400).springify()}>
              <View className="bg-blue-50 rounded-xl p-4">
                <View className="flex-row items-start">
                  <AlertCircle size={20} color="#3B82F6" />
                  <View className="flex-1 ml-3">
                    <Text className="text-blue-800 font-semibold mb-1">
                      Verification Process
                    </Text>
                    <Text className="text-blue-700 text-sm">
                      We may make two small deposits to verify your account. This typically takes 1-2 business days.
                    </Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          </ScrollView>

          {/* Bottom CTA */}
          <View className="px-5 pb-4">
            <Button
              onPress={handleAddBank}
              loading={loading}
              fullWidth
              size="lg"
              pill
              disabled={!accountHolderName || !routingNumber || !accountNumber || !confirmAccountNumber}
            >
              Add Bank Account
            </Button>
          </View>
        </SafeAreaView>
      </View>

      {/* System Message Modal */}
      <SystemMessage
        visible={messageVisible}
        onClose={hideMessage}
        type={messageConfig.type}
        title={messageConfig.title}
        message={messageConfig.message}
      />
    </>
  );
}
