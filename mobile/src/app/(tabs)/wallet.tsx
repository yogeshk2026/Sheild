import React, { useEffect } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  ArrowDownLeft,
  Building2,
  CreditCard,
  ChevronRight,
  Plus,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Card, Button, Text } from '@/components/ui';
import { useStore, generateMockWallet } from '@/lib/store';
import type { WalletTransaction } from '@/lib/types';
import { format } from 'date-fns';

export default function WalletScreen() {
  const router = useRouter();

  const wallet = useStore((s) => s.wallet);
  const setWallet = useStore((s) => s.setWallet);
  const bankAccounts = useStore((s) => s.bankAccounts);

  // Initialize demo wallet data
  useEffect(() => {
    if (wallet.transactions.length === 0 && wallet.balance === 0) {
      const mockWallet = generateMockWallet();
      setWallet(mockWallet);
    }
  }, [wallet.transactions.length, wallet.balance, setWallet]);

  const handleWithdraw = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/withdraw');
  };

  const handleAddBank = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/add-bank');
  };

  const defaultBankAccount = bankAccounts.find((account) => account.isDefault) || bankAccounts[0];

  return (
    <View className="flex-1 bg-shield-surface">
      <LinearGradient
        colors={['#000000', '#1A1A1A', '#2D2D2D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 280 }}
      />

      <SafeAreaView className="flex-1" edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Header */}
          <Animated.View
            entering={FadeInDown.delay(100).springify()}
            className="px-5 pt-4 pb-6"
          >
            <Text className="text-white text-2xl font-bold">{'Wallet'}</Text>
            <Text className="text-white/60 text-sm mt-1">
              {'Manage your payouts and withdrawals'}
            </Text>
          </Animated.View>

          {/* Balance Card */}
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            className="mx-5 mb-6"
          >
            <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#2A2A2A' }}>
              <View style={{ padding: 24 }}>
                <View className="flex-row items-center mb-4">
                  <WalletIcon size={24} color="#FFFFFF" />
                  <Text className="text-white/80 text-base ml-2">
                    {'Available Balance'}
                  </Text>
                </View>
                <Text className="text-white text-4xl font-bold mb-6">
                  {`$${wallet.balance.toFixed(2)}`}
                </Text>

                {wallet.pendingPayouts > 0 && (
                  <View className="bg-white/20 rounded-xl px-4 py-3 mb-4">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-white/80 text-sm">{'Pending Payouts'}</Text>
                      <Text className="text-white font-semibold">
                        {`+$${wallet.pendingPayouts.toFixed(2)}`}
                      </Text>
                    </View>
                  </View>
                )}

                <View className="flex-row space-x-3">
                  <View className="flex-1">
                    <Button
                      onPress={handleWithdraw}
                      fullWidth
                      className="bg-green-600"
                      icon={<ArrowUpRight size={18} color="#FFFFFF" />}
                    >
                      Withdraw
                    </Button>
                  </View>
                  <View className="flex-1">
                    <Button
                      onPress={handleAddBank}
                      fullWidth
                      variant="secondary"
                      icon={<Plus size={18} color="#FFFFFF" />}
                    >
                      Add Bank
                    </Button>
                  </View>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Payment Methods */}
          <Animated.View
            entering={FadeInDown.delay(300).springify()}
            className="mx-5 mb-6"
          >
            <Text className="text-shield-black text-lg font-bold mb-4">
              Payment Methods
            </Text>
            <Card onPress={handleAddBank}>
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-xl bg-gray-100 items-center justify-center">
                  <Building2 size={24} color="#1A1A1A" />
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-shield-black font-semibold">
                    {defaultBankAccount
                      ? `Bank Account ${defaultBankAccount.accountNumberMasked}`
                      : 'Add a Bank Account'}
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    {defaultBankAccount ? 'Default account' : 'Required for withdrawals'}
                  </Text>
                </View>
                <ChevronRight size={20} color="#9CA3AF" />
              </View>
            </Card>
          </Animated.View>

          {/* Transaction History */}
          <Animated.View
            entering={FadeInDown.delay(400).springify()}
            className="mx-5"
          >
            <Text className="text-shield-black text-lg font-bold mb-4">
              Recent Transactions
            </Text>

            {wallet.transactions.length > 0 ? (
              wallet.transactions.map((transaction, index) => (
                <TransactionItem
                  key={transaction.id}
                  transaction={transaction}
                  index={index}
                />
              ))
            ) : (
              <Card className="items-center py-8">
                <WalletIcon size={48} color="#D1D5DB" strokeWidth={1} />
                <Text className="text-gray-400 text-lg mt-4">
                  No transactions yet
                </Text>
                <Text className="text-gray-400 text-sm mt-1">
                  Your payouts will appear here
                </Text>
              </Card>
            )}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function TransactionItem({
  transaction,
  index,
}: {
  transaction: WalletTransaction;
  index: number;
}) {
  const isPayout = transaction.type === 'payout';
  const isPositive = transaction.amount > 0;

  // Safe date formatting
  const formattedDate = React.useMemo(() => {
    try {
      if (!transaction?.date) return 'Unknown date';
      return format(new Date(transaction.date), 'MMM d, yyyy');
    } catch {
      return 'Unknown date';
    }
  }, [transaction?.date]);

  // Guard against invalid transaction data
  if (!transaction?.id) {
    return null;
  }

  return (
    <Animated.View entering={FadeInRight.delay(50 * index).springify()}>
      <Card className="mb-3">
        <View className="flex-row items-center">
          <View
            className={`w-10 h-10 rounded-full items-center justify-center ${
              isPayout ? 'bg-green-100' : 'bg-gray-100'
            }`}
          >
            {isPayout ? (
              <ArrowDownLeft size={20} color="#22C55E" />
            ) : (
              <ArrowUpRight size={20} color="#1A1A1A" />
            )}
          </View>
          <View className="flex-1 ml-3">
            <Text className="text-shield-black font-medium">
              {transaction.description || 'Transaction'}
            </Text>
            <Text className="text-gray-400 text-sm">
              {formattedDate}
            </Text>
          </View>
          <Text
            className={`font-bold text-lg ${
              isPositive ? 'text-green-600' : 'text-shield-black'
            }`}
          >
            {`${isPositive ? '+' : ''}$${Math.abs(transaction.amount ?? 0).toFixed(2)}`}
          </Text>
        </View>
      </Card>
    </Animated.View>
  );
}
