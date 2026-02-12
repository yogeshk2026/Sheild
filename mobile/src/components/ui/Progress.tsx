import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { cn } from '@/lib/cn';
import { Text } from './Text';

interface ProgressBarProps {
  progress: number; // 0 to 100
  height?: number;
  showLabel?: boolean;
  label?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  animated?: boolean;
  className?: string;
}

const variantColors: Record<string, [string, string]> = {
  default: ['#F97316', '#EA580C'],
  success: ['#22C55E', '#16A34A'],
  warning: ['#F97316', '#EA580C'],
  danger: ['#EF4444', '#DC2626'],
};

export function ProgressBar({
  progress,
  height = 8,
  showLabel = false,
  label,
  variant = 'default',
  animated = true,
  className,
}: ProgressBarProps) {
  const animatedProgress = useSharedValue(0);
  const clampedProgress = Math.min(100, Math.max(0, progress));

  useEffect(() => {
    if (animated) {
      animatedProgress.value = withSpring(clampedProgress, {
        damping: 20,
        stiffness: 100,
      });
    } else {
      animatedProgress.value = clampedProgress;
    }
  }, [clampedProgress, animated]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value}%`,
  }));

  const colors = variantColors[variant];

  return (
    <View className={cn('w-full', className)}>
      {showLabel && (
        <View className="flex-row justify-between mb-2">
          <Text className="text-sm text-gray-600">{label}</Text>
          <Text className="text-sm font-semibold text-shield-black">
            {Math.round(clampedProgress)}%
          </Text>
        </View>
      )}
      <View
        className="w-full bg-gray-200 rounded-full overflow-hidden"
        style={{ height }}
      >
        <Animated.View
          style={[
            { height, borderRadius: height / 2 },
            animatedStyle,
          ]}
        >
          <LinearGradient
            colors={colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1, borderRadius: height / 2 }}
          />
        </Animated.View>
      </View>
    </View>
  );
}

interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function CircularProgress({
  progress,
  size = 120,
  strokeWidth = 10,
  children,
  variant = 'default',
}: CircularProgressProps) {
  const animatedProgress = useSharedValue(0);
  const clampedProgress = Math.min(100, Math.max(0, progress));

  const radius = (size - strokeWidth) / 2;

  useEffect(() => {
    animatedProgress.value = withTiming(clampedProgress, {
      duration: 1000,
      easing: Easing.out(Easing.cubic),
    });
  }, [clampedProgress]);

  const animatedStyle = useAnimatedStyle(() => {
    const rotation = (animatedProgress.value / 100) * 360;
    return {
      transform: [{ rotate: `${rotation - 90}deg` }],
    };
  });

  const colors = variantColors[variant];

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      {/* Background circle */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: '#E5E7EB',
        }}
      />
      {/* Progress indicator */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: size,
            height: size,
            alignItems: 'center',
          },
          animatedStyle,
        ]}
      >
        <View
          style={{
            width: strokeWidth,
            height: strokeWidth,
            borderRadius: strokeWidth / 2,
            backgroundColor: colors[0],
            marginTop: 0,
          }}
        />
      </Animated.View>
      {/* Filled arc simulation with conic gradient effect */}
      <View
        style={{
          position: 'absolute',
          width: size - strokeWidth * 2,
          height: size - strokeWidth * 2,
          borderRadius: (size - strokeWidth * 2) / 2,
          borderWidth: strokeWidth,
          borderColor: colors[0],
          borderTopColor: clampedProgress >= 12.5 ? colors[0] : 'transparent',
          borderRightColor: clampedProgress >= 37.5 ? colors[0] : 'transparent',
          borderBottomColor: clampedProgress >= 62.5 ? colors[0] : 'transparent',
          borderLeftColor: clampedProgress >= 87.5 ? colors[0] : 'transparent',
          transform: [{ rotate: '-45deg' }],
          opacity: clampedProgress > 0 ? 1 : 0,
        }}
      />
      {/* Center content */}
      <View className="absolute items-center justify-center">
        {children}
      </View>
    </View>
  );
}
