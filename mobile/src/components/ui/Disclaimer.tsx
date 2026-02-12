import React from 'react';
import { View } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { Text } from './Text';

interface DisclaimerProps {
  variant?: 'full' | 'compact';
  showIcon?: boolean;
}

/**
 * Legal disclaimer component for footer and checkout pages
 * This is NOT insurance - it's a legal defense membership
 */
export function Disclaimer({ variant = 'full', showIcon = true }: DisclaimerProps) {
  if (variant === 'compact') {
    return (
      <View className="bg-gray-100 rounded-lg p-3">
        <Text className="text-gray-500 text-xs text-center leading-relaxed">
          {'This is a legal defense membership and service warranty, not an insurance product.'}
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <View className="flex-row items-start">
        {showIcon && (
          <AlertTriangle size={18} color="#F59E0B" style={{ marginTop: 2 }} />
        )}
        <View className={showIcon ? 'flex-1 ml-3' : 'flex-1'}>
          <Text className="text-amber-800 font-semibold text-sm mb-1">{'Important Notice'}</Text>
          <Text className="text-amber-700 text-xs leading-relaxed">
            {'This is a legal defense membership and service warranty, not an insurance product. We provide administrative assistance to contest citations and discretionary reimbursement credits. We do not cover criminal fines or egregious violations affecting public safety.'}
          </Text>
        </View>
      </View>
    </View>
  );
}
