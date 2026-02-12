import React from 'react';
import { Modal, View, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
  AlertTriangle,
  type LucideIcon
} from 'lucide-react-native';
import { Text } from './Text';
import { cn } from '@/lib/cn';

export type MessageType = 'error' | 'success' | 'warning' | 'info' | 'confirm';

interface MessageButton {
  text: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'cancel';
}

interface SystemMessageProps {
  visible: boolean;
  onClose: () => void;
  type?: MessageType;
  title: string;
  message: string;
  buttons?: MessageButton[];
  icon?: LucideIcon;
  dismissable?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const typeConfig: Record<MessageType, {
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
}> = {
  error: {
    icon: XCircle,
    iconColor: '#EF4444',
    iconBgColor: 'bg-red-100',
  },
  success: {
    icon: CheckCircle2,
    iconColor: '#22C55E',
    iconBgColor: 'bg-green-100',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: '#F59E0B',
    iconBgColor: 'bg-amber-100',
  },
  info: {
    icon: Info,
    iconColor: '#3B82F6',
    iconBgColor: 'bg-blue-100',
  },
  confirm: {
    icon: AlertCircle,
    iconColor: '#F97316',
    iconBgColor: 'bg-orange-100',
  },
};

function MessageButton({
  text,
  onPress,
  variant = 'primary'
}: MessageButton) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const buttonStyles = {
    primary: 'bg-shield-accent',
    secondary: 'bg-shield-dark',
    cancel: 'bg-gray-100',
  };

  const textStyles = {
    primary: 'text-white',
    secondary: 'text-white',
    cancel: 'text-shield-dark',
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={animatedStyle}
      className={cn(
        'px-5 py-3 rounded-xl',
        buttonStyles[variant]
      )}
    >
      <Text className={cn('font-semibold text-base', textStyles[variant])}>
        {text}
      </Text>
    </AnimatedPressable>
  );
}

export function SystemMessage({
  visible,
  onClose,
  type = 'info',
  title,
  message,
  buttons,
  icon,
  dismissable = true,
}: SystemMessageProps) {
  const config = typeConfig[type];
  const IconComponent = icon || config.icon;
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  React.useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSpring(1, { damping: 20, stiffness: 300 });
    } else {
      opacity.value = withTiming(0, { duration: 150 });
      scale.value = withTiming(0.9, { duration: 150 });
    }
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handleBackdropPress = () => {
    if (dismissable && !buttons?.length) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onClose();
    }
  };

  const defaultButtons: MessageButton[] = buttons || [
    { text: 'OK', onPress: onClose, variant: 'primary' },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View
        style={overlayStyle}
        className="flex-1 bg-black/50 justify-center items-center px-6"
      >
        <Pressable
          className="absolute inset-0"
          onPress={handleBackdropPress}
        />
        <Animated.View
          style={contentStyle}
          className="bg-white rounded-3xl p-6 w-full max-w-sm"
        >
          {/* Icon */}
          <View className="items-center mb-4">
            <View className={cn(
              'w-16 h-16 rounded-full items-center justify-center',
              config.iconBgColor
            )}>
              <IconComponent size={32} color={config.iconColor} />
            </View>
          </View>

          {/* Title */}
          <Text className="text-xl font-bold text-shield-dark text-center mb-2">
            {title}
          </Text>

          {/* Message */}
          <Text className="text-base text-shield-grey text-center mb-6 leading-6">
            {message}
          </Text>

          {/* Buttons */}
          <View className={cn(
            'flex-row justify-center',
            defaultButtons.length > 1 ? 'space-x-3' : ''
          )}>
            {defaultButtons.map((button, index) => (
              <MessageButton
                key={index}
                text={button.text}
                onPress={button.onPress}
                variant={button.variant}
              />
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// Hook for easier usage
interface UseSystemMessageReturn {
  show: (config: {
    type?: MessageType;
    title: string;
    message: string;
    buttons?: MessageButton[];
  }) => void;
  hide: () => void;
  props: SystemMessageProps;
}

export function useSystemMessage(): UseSystemMessageReturn {
  const [visible, setVisible] = React.useState(false);
  const [config, setConfig] = React.useState<{
    type: MessageType;
    title: string;
    message: string;
    buttons?: MessageButton[];
  }>({
    type: 'info',
    title: '',
    message: '',
  });

  const show = React.useCallback((newConfig: {
    type?: MessageType;
    title: string;
    message: string;
    buttons?: MessageButton[];
  }) => {
    setConfig({
      type: newConfig.type || 'info',
      title: newConfig.title,
      message: newConfig.message,
      buttons: newConfig.buttons,
    });
    setVisible(true);
  }, []);

  const hide = React.useCallback(() => {
    setVisible(false);
  }, []);

  return {
    show,
    hide,
    props: {
      visible,
      onClose: hide,
      type: config.type,
      title: config.title,
      message: config.message,
      buttons: config.buttons,
    },
  };
}
