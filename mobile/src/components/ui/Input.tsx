import React from 'react';
import { TextInput, View, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Eye, EyeOff } from 'lucide-react-native';
import { cn } from '@/lib/cn';
import { Text } from './Text';

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  numberOfLines?: number;
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  variant?: 'default' | 'dark';
}

export function Input({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  multiline = false,
  numberOfLines = 1,
  icon,
  disabled = false,
  className,
  variant = 'default',
}: InputProps) {
  const [isFocused, setIsFocused] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const isDark = variant === 'dark';
  const borderColor = useSharedValue(isDark ? 'rgba(255,255,255,0.3)' : '#E5E7EB');

  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderColor: borderColor.value,
  }));

  const handleFocus = () => {
    setIsFocused(true);
    borderColor.value = withTiming('#F97316', { duration: 200 });
  };

  const handleBlur = () => {
    setIsFocused(false);
    borderColor.value = withTiming(error ? '#EF4444' : (isDark ? 'rgba(255,255,255,0.3)' : '#E5E7EB'), { duration: 200 });
  };

  React.useEffect(() => {
    if (error) {
      borderColor.value = withTiming('#EF4444', { duration: 200 });
    }
  }, [error]);

  return (
    <View className={cn('w-full', className)}>
      {label && (
        <Text className={cn('text-sm font-medium mb-2', isDark ? 'text-white' : 'text-shield-black')}>
          {label}
        </Text>
      )}
      <Animated.View
        style={[
          {
            borderWidth: 1,
            borderRadius: 12,
            backgroundColor: isDark ? 'transparent' : (disabled ? '#F3F4F6' : '#FFFFFF'),
          },
          animatedBorderStyle,
        ]}
        className="flex-row items-center"
      >
        {icon && <View className="pl-4">{icon}</View>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={isDark ? 'rgba(255,255,255,0.5)' : '#9CA3AF'}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={!disabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn(
            'flex-1 px-4 text-base',
            isDark ? 'text-white py-2.5' : 'text-shield-black py-3.5',
            multiline && 'min-h-24 text-left'
          )}
          style={{ textAlignVertical: multiline ? 'top' : 'center' }}
        />
        {secureTextEntry && (
          <Pressable
            onPress={() => setShowPassword(!showPassword)}
            className="pr-4"
          >
            {showPassword ? (
              <EyeOff size={20} color={isDark ? 'rgba(255,255,255,0.5)' : '#9CA3AF'} />
            ) : (
              <Eye size={20} color={isDark ? 'rgba(255,255,255,0.5)' : '#9CA3AF'} />
            )}
          </Pressable>
        )}
      </Animated.View>
      {error && (
        <Text className="text-xs text-red-500 mt-1.5">{error}</Text>
      )}
    </View>
  );
}
