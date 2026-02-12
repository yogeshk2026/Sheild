import React from 'react';
import { View, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { cn } from '@/lib/cn';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onPress?: () => void;
  blurred?: boolean;
  intensity?: number;
}

export function Card({
  children,
  className,
  onPress,
  blurred = false,
  intensity = 80,
}: CardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const content = blurred ? (
    <BlurView intensity={intensity} tint="light" style={{ flex: 1, borderRadius: 16 }}>
      <View className={cn('p-4', className)}>{children}</View>
    </BlurView>
  ) : (
    <View className={cn('p-4', className)}>{children}</View>
  );

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[animatedStyle, { borderRadius: 16 }]}
        className={cn(
          'rounded-2xl overflow-hidden',
          !blurred && 'bg-white'
        )}
      >
        {content}
      </AnimatedPressable>
    );
  }

  return (
    <View
      className={cn(
        'rounded-2xl overflow-hidden',
        !blurred && 'bg-white'
      )}
      style={{ borderRadius: 16 }}
    >
      {content}
    </View>
  );
}

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onPress?: () => void;
}

export function GlassCard({ children, className, onPress }: GlassCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const Wrapper = onPress ? AnimatedPressable : View;
  const wrapperProps = onPress
    ? {
        onPress: handlePress,
        onPressIn: handlePressIn,
        onPressOut: handlePressOut,
        style: animatedStyle,
      }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      className="rounded-2xl overflow-hidden border border-white/20"
    >
      <BlurView intensity={40} tint="light" style={{ borderRadius: 16 }}>
        <View
          className={cn('p-4', className)}
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
        >
          {children}
        </View>
      </BlurView>
    </Wrapper>
  );
}
