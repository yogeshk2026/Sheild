import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, Pressable, Modal, Keyboard } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { X, Phone, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Text, Button } from '@/components/ui';

interface OTPVerificationModalProps {
  visible: boolean;
  phoneNumber: string;
  onVerify: (otp: string) => void;
  onClose: () => void;
  onResend: () => void;
  isVerifying?: boolean;
  error?: string | null;
}

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

export function OTPVerificationModal({
  visible,
  phoneNumber,
  onVerify,
  onClose,
  onResend,
  isVerifying = false,
  error = null,
}: OTPVerificationModalProps) {
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Focus first input when modal opens
  useEffect(() => {
    if (visible) {
      setOtp(Array(OTP_LENGTH).fill(''));
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 300);
    }
  }, [visible]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleChange = (text: string, index: number) => {
    // Only allow digits
    const digit = text.replace(/[^0-9]/g, '').slice(-1);

    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Move to next input if digit entered
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits are entered
    if (digit && index === OTP_LENGTH - 1) {
      const fullOtp = newOtp.join('');
      if (fullOtp.length === OTP_LENGTH) {
        Keyboard.dismiss();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onVerify(fullOtp);
      }
    }
  };

  const handleKeyPress = (e: { nativeEvent: { key: string } }, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = () => {
    if (resendCooldown > 0) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOtp(Array(OTP_LENGTH).fill(''));
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    onResend();
    inputRefs.current[0]?.focus();
  };

  const handleManualSubmit = () => {
    const fullOtp = otp.join('');
    if (fullOtp.length === OTP_LENGTH) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onVerify(fullOtp);
    }
  };

  const isOtpComplete = otp.join('').length === OTP_LENGTH;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 bg-black/60 justify-center items-center px-6"
        onPress={onClose}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Animated.View
            entering={FadeInUp.springify()}
            className="bg-white rounded-3xl p-6 w-full max-w-sm"
          >
            {/* Close button */}
            <Pressable
              onPress={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
            >
              <X size={18} color="#6B7280" />
            </Pressable>

            {/* Header */}
            <View className="items-center mb-6">
              <View className="w-16 h-16 rounded-full bg-orange-100 items-center justify-center mb-4">
                <Phone size={32} color="#F97316" />
              </View>
              <Text className="text-shield-black text-xl font-bold text-center">
                Verify Your Phone
              </Text>
              <Text className="text-gray-600 text-center mt-2">
                We sent a 6-digit code to
              </Text>
              <Text className="text-shield-black font-semibold text-center">
                {phoneNumber}
              </Text>
            </View>

            {/* OTP Input Fields */}
            <View className="flex-row justify-between mb-4 px-2">
              {Array(OTP_LENGTH)
                .fill(0)
                .map((_, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => {
                      inputRefs.current[index] = ref;
                    }}
                    value={otp[index]}
                    onChangeText={(text) => handleChange(text, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    className={`w-11 h-14 rounded-xl text-center text-2xl font-bold ${
                      otp[index]
                        ? 'bg-orange-50 border-2 border-orange-500'
                        : 'bg-gray-100 border-2 border-gray-200'
                    } ${error ? 'border-red-500 bg-red-50' : ''}`}
                    style={{ color: error ? '#EF4444' : '#000000' }}
                    selectTextOnFocus
                    editable={!isVerifying}
                  />
                ))}
            </View>

            {/* Error Message */}
            {error && (
              <Animated.View
                entering={FadeIn}
                className="flex-row items-center justify-center mb-4 px-4 py-2 bg-red-50 rounded-lg"
              >
                <AlertCircle size={16} color="#EF4444" />
                <Text className="text-red-600 text-sm ml-2">{error}</Text>
              </Animated.View>
            )}

            {/* Verify Button */}
            <View className="mb-4">
              <Button
                onPress={handleManualSubmit}
                disabled={!isOtpComplete || isVerifying}
                loading={isVerifying}
                fullWidth
                pill
              >
                {isVerifying ? 'Verifying...' : 'Verify Code'}
              </Button>
            </View>

            {/* Resend Section */}
            <View className="items-center">
              <Text className="text-gray-500 text-sm mb-2">
                Didn't receive the code?
              </Text>
              <Pressable
                onPress={handleResend}
                disabled={resendCooldown > 0}
                className="flex-row items-center"
              >
                <RefreshCw
                  size={16}
                  color={resendCooldown > 0 ? '#9CA3AF' : '#F97316'}
                />
                <Text
                  className={`ml-2 font-semibold ${
                    resendCooldown > 0 ? 'text-gray-400' : 'text-shield-accent'
                  }`}
                >
                  {resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : 'Resend Code'}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
