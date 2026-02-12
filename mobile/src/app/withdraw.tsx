import React, { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, TextInput } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Building2, DollarSign, AlertCircle, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Card, Button, Text, SystemMessage } from '@/components/ui';
import { useStore } from '@/lib/store';

export default function WithdrawScreen() {
  const router = useRouter();
  const wallet = useStore((s) => s.wallet);
  const bankAccounts = useStore((s) => s.bankAccounts);
  const updateWalletBalance = useStore((s) => s.updateWalletBalance);
  const addTransaction = useStore((s) => s.addTransaction);

  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);

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

  const availableBalance = wallet.balance;
  const minWithdrawal = 10;
  const selectedBank =
    bankAccounts.find((account) => account.id === selectedBankId) ||
    bankAccounts.find((account) => account.isDefault) ||
    bankAccounts[0] ||
    null;

  useEffect(() => {
    if (!selectedBankId && selectedBank) {
      setSelectedBankId(selectedBank.id);
    }
  }, [selectedBankId, selectedBank]);

  const handleAmountChange = (value: string) => {
    // Only allow numbers and one decimal point
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    setAmount(cleaned);
  };

  const handleWithdraw = async () => {
    const withdrawAmount = parseFloat(amount);

    if (!amount || isNaN(withdrawAmount)) {
      showMessage('warning', 'Invalid Amount', 'Please enter a valid withdrawal amount.');
      return;
    }

    if (withdrawAmount < minWithdrawal) {
      showMessage('warning', 'Minimum Amount', `The minimum withdrawal amount is $${minWithdrawal}.`);
      return;
    }

    if (withdrawAmount > availableBalance) {
      showMessage('error', 'Insufficient Balance', 'You cannot withdraw more than your available balance.');
      return;
    }

    if (!selectedBank) {
      showMessage('warning', 'Bank Account Required', 'Please add a bank account before withdrawing funds.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Update wallet (debit withdrawal amount)
    updateWalletBalance(-withdrawAmount);
    addTransaction({
      id: `tx-${Date.now()}`,
      type: 'withdrawal',
      amount: -withdrawAmount,
      description: `Withdrawal to ${selectedBank.accountNumberMasked}`,
      date: new Date().toISOString(),
      status: 'completed',
    });

    setLoading(false);

    showMessage(
      'success',
      'Withdrawal Initiated',
      `$${withdrawAmount.toFixed(2)} is being transferred to your bank account. This typically takes 1-3 business days.`,
      () => router.back()
    );
  };

  const quickAmounts = [25, 50, 100, availableBalance > 0 ? Math.floor(availableBalance) : 0].filter(
    (a) => a > 0 && a <= availableBalance
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Withdraw Funds',
          headerBackTitle: 'Back',
        }}
      />

      <View className="flex-1 bg-shield-surface">
        <SafeAreaView className="flex-1" edges={['bottom']}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          >
            {/* Available Balance */}
            <Animated.View entering={FadeInDown.delay(100).springify()}>
              <Card className="mb-6 bg-shield-dark">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-white/60 text-sm">Available Balance</Text>
                    <Text className="text-white text-3xl font-bold">
                      ${availableBalance.toFixed(2)}
                    </Text>
                  </View>
                  <View className="w-12 h-12 rounded-full bg-white/10 items-center justify-center">
                    <DollarSign size={24} color="#FFFFFF" />
                  </View>
                </View>
              </Card>
            </Animated.View>

            {/* Amount Input */}
            <Animated.View entering={FadeInDown.delay(200).springify()}>
              <Text className="text-shield-black font-semibold mb-3">
                Withdrawal Amount
              </Text>
              <Card className="mb-4">
                <View className="flex-row items-center">
                  <Text className="text-shield-black text-3xl font-bold mr-2">$</Text>
                  <TextInput
                    value={amount}
                    onChangeText={handleAmountChange}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    placeholderTextColor="#9CA3AF"
                    className="flex-1 text-shield-black text-3xl font-bold"
                  />
                </View>
                <Text className="text-gray-500 text-sm mt-2">
                  Minimum withdrawal: ${minWithdrawal}
                </Text>
              </Card>
            </Animated.View>

            {/* Quick Amounts */}
            {quickAmounts.length > 0 && (
              <Animated.View entering={FadeInDown.delay(300).springify()}>
                <View className="flex-row flex-wrap gap-2 mb-6">
                  {quickAmounts.map((quickAmount) => (
                    <Pressable
                      key={quickAmount}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setAmount(quickAmount.toString());
                      }}
                      className={`px-4 py-2 rounded-full ${
                        amount === quickAmount.toString()
                          ? 'bg-shield-accent'
                          : 'bg-gray-100'
                      }`}
                    >
                      <Text
                        className={`font-medium ${
                          amount === quickAmount.toString()
                            ? 'text-white'
                            : 'text-shield-black'
                        }`}
                      >
                        {`$${quickAmount}`}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </Animated.View>
            )}

            {/* Bank Account */}
            <Animated.View entering={FadeInDown.delay(400).springify()}>
              <Text className="text-shield-black font-semibold mb-3">
                Withdraw To
              </Text>
              {bankAccounts.length > 0 ? (
                <Card className="mb-6">
                  {bankAccounts.map((account) => {
                    const isSelected = selectedBank?.id === account.id;
                    return (
                      <Pressable
                        key={account.id}
                        onPress={() => setSelectedBankId(account.id)}
                        className="flex-row items-center py-2"
                      >
                        <View className="w-12 h-12 rounded-xl bg-gray-100 items-center justify-center">
                          <Building2 size={24} color="#1A1A1A" />
                        </View>
                        <View className="flex-1 ml-3">
                          <Text className="text-shield-black font-semibold">
                            {`Bank Account ${account.accountNumberMasked}`}
                          </Text>
                          <Text className="text-gray-500 text-sm">
                            {account.isDefault ? 'Default account' : 'Secondary account'}
                          </Text>
                        </View>
                        {isSelected ? (
                          <View className="w-6 h-6 rounded-full bg-shield-accent items-center justify-center">
                            <Check size={14} color="#FFFFFF" strokeWidth={3} />
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </Card>
              ) : (
                <Card className="mb-6">
                  <View className="items-start">
                    <Text className="text-gray-600 mb-3">
                      No bank account linked yet.
                    </Text>
                    <Button onPress={() => router.push('/add-bank')} size="sm" pill>
                      Add Bank Account
                    </Button>
                  </View>
                </Card>
              )}
            </Animated.View>

            {/* Info */}
            <Animated.View entering={FadeInDown.delay(500).springify()}>
              <View className="bg-blue-50 rounded-xl p-4">
                <View className="flex-row items-start">
                  <AlertCircle size={20} color="#3B82F6" />
                  <View className="flex-1 ml-3">
                    <Text className="text-blue-800 font-semibold mb-1">
                      Processing Time
                    </Text>
                    <Text className="text-blue-700 text-sm">
                      Withdrawals typically take 1-3 business days to arrive in your bank account.
                    </Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          </ScrollView>

          {/* Bottom CTA */}
          <View className="px-5 pb-4">
            <Button
              onPress={handleWithdraw}
              loading={loading}
              fullWidth
              size="lg"
              pill
              disabled={!selectedBank || !amount || parseFloat(amount) < minWithdrawal || parseFloat(amount) > availableBalance}
            >
              Withdraw ${amount || '0.00'}
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
