import React, { useState } from 'react';
import { View, Pressable, KeyboardAvoidingView, Platform, ScrollView, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { Mail, Lock, User, Phone, X, FileText, Check, AlertTriangle } from 'lucide-react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import { Button, Input, Text, Card } from '@/components/ui';
import { useStore } from '@/lib/store';
import { OTPVerificationModal } from '@/components/OTPVerificationModal';
import { generateOTP as generateOTPCode, sendOTP as sendOTPSMS, validateOTP } from '@/lib/otp-config';
import { generateUUID } from '@/lib/cn';
import { upsertUser } from '@/lib/supabase';
import { identifyUser, initRevenueCat } from '@/lib/revenuecat';

type AuthMode = 'login' | 'signup';
type OTPPurpose = 'signup' | 'signin';
type LegalModalType = 'terms' | 'privacy' | null;

// Apple Logo SVG Component
function AppleLogo({ size = 20, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </Svg>
  );
}

// Google Logo SVG Component
function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  );
}

export default function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loginAttempts, setLoginAttempts] = useState(0);

  // Legal modal state
  const [legalModal, setLegalModal] = useState<LegalModalType>(null);

  // Forgot password modal state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);

  // OTP verification state
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [generatedOTP, setGeneratedOTP] = useState<string>('');
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [otpPurpose, setOtpPurpose] = useState<OTPPurpose>('signup');
  const [pendingLoginUser, setPendingLoginUser] = useState<{
    id: string;
    email: string;
    name: string;
    phone: string;
    phoneVerified?: boolean;
    phoneVerifiedAt?: string;
  } | null>(null);

  const setAuthenticated = useStore((s) => s.setAuthenticated);
  const setUser = useStore((s) => s.setUser);
  const hasSignedInBefore = useStore((s) => s.hasSignedInBefore);

  const syncRevenueCatIdentity = async (userId: string) => {
    try {
      await initRevenueCat();
      await identifyUser(userId);
    } catch (error) {
      console.warn('[AuthScreen] Failed to identify RevenueCat user:', error);
    }
  };

  // Format phone number as (XXX) XXX-XXXX
  const formatPhoneNumber = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    const limited = digits.slice(0, 10);

    if (limited.length === 0) return '';
    if (limited.length <= 3) return `(${limited}`;
    if (limited.length <= 6) return `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
    return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`;
  };

  const handlePhoneChange = (text: string) => {
    setPhone(formatPhoneNumber(text));
    // Reset verification status if phone changes
    if (isPhoneVerified) {
      setIsPhoneVerified(false);
    }
  };

  // Generate a random 6-digit OTP
  const generateOTP = (): string => {
    return generateOTPCode();
  };

  // Parse full name into first and last name
  const parseFullName = (fullName: string): { firstName: string; lastName: string } => {
    const trimmed = fullName.trim();
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: '' };
    }
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ');
    return { firstName, lastName };
  };

  // Send OTP (uses sandbox/production mode from otp-config)
  const sendOTP = (phoneNumber?: string) => {
    const otp = generateOTP();
    setGeneratedOTP(otp);
    const targetPhone = phoneNumber || phone;
    // Send via otp-config (handles sandbox vs production mode)
    sendOTPSMS(targetPhone, otp);
  };

  // Handle forgot password
  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail.trim()) return;

    // Validate email format
    if (!/\S+@\S+\.\S+/.test(forgotPasswordEmail)) return;

    setForgotPasswordLoading(true);

    // Simulate sending reset email
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setForgotPasswordLoading(false);
    setForgotPasswordSent(true);
  };

  const closeForgotPassword = () => {
    setShowForgotPassword(false);
    setForgotPasswordEmail('');
    setForgotPasswordSent(false);
    setForgotPasswordLoading(false);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (mode === 'signup') {
      if (!name.trim()) {
        newErrors.name = 'Name is required';
      }
      if (!phone.trim()) {
        newErrors.phone = 'Phone number is required';
      } else if (phone.replace(/\D/g, '').length !== 10) {
        newErrors.phone = 'Please enter a valid 10-digit phone number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      if (mode === 'login') {
        setLoginAttempts((prev) => prev + 1);
      }
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // For signup, require phone verification first
    if (mode === 'signup' && !isPhoneVerified) {
      setOtpPurpose('signup');
      sendOTP();
      setShowOTPModal(true);
      return;
    }

    // For login, check if this is a returning user with a verified phone
    if (mode === 'login') {
      // Simulate checking if user exists and has verified phone
      // In production, this would be an API call to check user status
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Simulate finding a returning user with verified phone
      // In real implementation, this would come from your backend
      const mockReturningUser = {
        id: generateUUID(),
        email,
        name: email.split('@')[0],
        phone: '(555) 123-4567', // Mock phone from database
        phoneVerified: true,
        phoneVerifiedAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      };

      // If user has verified phone, require OTP on sign-in
      if (mockReturningUser.phoneVerified && mockReturningUser.phone) {
        setLoading(false);
        setPendingLoginUser(mockReturningUser);
        setOtpPurpose('signin');
        sendOTP(mockReturningUser.phone);
        setShowOTPModal(true);
        return;
      }

      // User doesn't have verified phone, proceed without OTP
      setUser({
        id: mockReturningUser.id,
        email,
        name: mockReturningUser.name,
        phone: mockReturningUser.phone || '',
        phoneVerified: mockReturningUser.phoneVerified,
        phoneVerifiedAt: mockReturningUser.phoneVerifiedAt,
        plan: null,
        subscriptionStatus: 'inactive',
          hasActiveSubscription: false,
          currentPlan: 'free',
        createdAt: new Date().toISOString(),
      });
      await syncRevenueCatIdentity(mockReturningUser.id);
      setAuthenticated(true);
      setLoading(false);
      router.replace('/(tabs)');
      return;
    }

    // Signup flow continues (after phone verification)
    setLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const { firstName, lastName } = parseFullName(name);

    // Create user
    const signupUserId = generateUUID();
    setUser({
      id: signupUserId,
      email,
      name: name || email.split('@')[0],
      firstName,
      lastName,
      phone: phone || '',
      phoneVerified: mode === 'signup' ? true : undefined,
      phoneVerifiedAt: mode === 'signup' ? new Date().toISOString() : undefined,
      authProvider: 'email',
      plan: null,
      subscriptionStatus: 'inactive',
      hasActiveSubscription: false,
      currentPlan: 'free',
      createdAt: new Date().toISOString(),
    });
    await syncRevenueCatIdentity(signupUserId);
    setAuthenticated(true);
    setLoading(false);

    router.replace('/(tabs)');
  };

  const handleVerifyOTP = async (otp: string) => {
    setIsVerifyingOTP(true);
    setOtpError(null);

    // Simulate API verification delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Use validateOTP from otp-config (handles sandbox vs production mode)
    if (validateOTP(otp, generatedOTP)) {
      // OTP verified successfully
      setIsVerifyingOTP(false);
      setShowOTPModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (otpPurpose === 'signin' && pendingLoginUser) {
        // Sign-in OTP verified - proceed with login
        setLoading(true);
        await new Promise((resolve) => setTimeout(resolve, 500));

        const newUser = {
          id: pendingLoginUser.id,
          email: pendingLoginUser.email,
          name: pendingLoginUser.name,
          phone: pendingLoginUser.phone,
          phoneVerified: pendingLoginUser.phoneVerified,
          phoneVerifiedAt: pendingLoginUser.phoneVerifiedAt,
          plan: null,
          subscriptionStatus: 'inactive' as const,
          hasActiveSubscription: false,
          currentPlan: 'free' as const,
          createdAt: new Date().toISOString(),
        };

        setUser(newUser);
        await syncRevenueCatIdentity(newUser.id);

        // Sync user to Supabase to ensure they exist before submitting claims
        await upsertUser({
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          phone: newUser.phone,
          plan: newUser.plan,
        });

        setAuthenticated(true);
        setLoading(false);
        setPendingLoginUser(null);
        router.replace('/(tabs)');
      } else {
        // Sign-up OTP verified - proceed with account creation
        setIsPhoneVerified(true);

        setLoading(true);
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const { firstName, lastName } = parseFullName(name);

        const newUser = {
          id: generateUUID(),
          email,
          name: name || email.split('@')[0],
          firstName,
          lastName,
          phone: phone || '',
          phoneVerified: true,
          phoneVerifiedAt: new Date().toISOString(),
          authProvider: 'email' as const,
          plan: null,
          subscriptionStatus: 'inactive' as const,
          hasActiveSubscription: false,
          currentPlan: 'free' as const,
          createdAt: new Date().toISOString(),
        };

        setUser(newUser);
        await syncRevenueCatIdentity(newUser.id);

        // Sync user to Supabase to ensure they exist before submitting claims
        await upsertUser({
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          phone: newUser.phone,
          plan: newUser.plan,
        });

        setAuthenticated(true);
        setLoading(false);
        router.replace('/(tabs)');
      }
    } else {
      // Invalid OTP
      setIsVerifyingOTP(false);
      setOtpError('Invalid code. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleResendOTP = () => {
    setOtpError(null);
    sendOTP();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleMode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode(mode === 'login' ? 'signup' : 'login');
    setErrors({});
    setLoginAttempts(0);
  };

  const handleAppleSignIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    // Simulate Apple Sign In
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Social sign-up: No phone required initially
    // Phone + OTP will be required during profile completion
    const newUser = {
      id: generateUUID(),
      email: 'user@icloud.com',
      name: 'Apple User',
      phone: '', // No phone initially for social sign-up
      phoneVerified: false, // Mark as not verified
      authProvider: 'apple' as const, // Track auth provider for profile completion flow
      plan: null,
      subscriptionStatus: 'inactive' as const,
      hasActiveSubscription: false,
      currentPlan: 'free' as const,
      createdAt: new Date().toISOString(),
    };

    setUser(newUser);
    await syncRevenueCatIdentity(newUser.id);

    // Sync user to Supabase to ensure they exist before submitting claims
    await upsertUser({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      phone: newUser.phone,
      plan: newUser.plan,
    });

    setAuthenticated(true);
    setLoading(false);
    router.replace('/(tabs)');
  };

  const handleGoogleSignIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    // Simulate Google Sign In
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Social sign-up: No phone required initially
    // Phone + OTP will be required during profile completion
    const newUser = {
      id: generateUUID(),
      email: 'user@gmail.com',
      name: 'Google User',
      phone: '', // No phone initially for social sign-up
      phoneVerified: false, // Mark as not verified
      authProvider: 'google' as const, // Track auth provider for profile completion flow
      plan: null,
      subscriptionStatus: 'inactive' as const,
      hasActiveSubscription: false,
      currentPlan: 'free' as const,
      createdAt: new Date().toISOString(),
    };

    setUser(newUser);
    await syncRevenueCatIdentity(newUser.id);

    // Sync user to Supabase to ensure they exist before submitting claims
    await upsertUser({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      phone: newUser.phone,
      plan: newUser.plan,
    });

    setAuthenticated(true);
    setLoading(false);
    router.replace('/(tabs)');
  };

  return (
    <View className="flex-1">
      {/* Background Image */}
      <View style={{ position: 'absolute', width: '100%', height: '100%' }}>
        <Image
          source={require('../../public/4.png')}
          style={{
            width: '100%',
            height: '100%',
          }}
          contentFit="cover"
        />
        {/* Gradient overlay 85% to 95% black */}
        <LinearGradient
          colors={['rgba(0, 0, 0, 0.85)', 'rgba(0, 0, 0, 0.95)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />
      </View>
      <LinearGradient
        colors={['transparent', 'transparent', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <SafeAreaView className="flex-1">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
          >
            <ScrollView
              contentContainerStyle={{ flexGrow: 1 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Header */}
              <Animated.View
                entering={FadeInDown.delay(100).springify()}
                className="items-center pt-12 pb-8"
              >
                <View
                  className="w-24 h-24 items-center justify-center mb-4"
                >
                  <Image
                    source={require('../../public/shieldlogobest2.png')}
                    style={{ width: 80, height: 80, backgroundColor: 'transparent' }}
                    contentFit="contain"
                  />
                </View>
                <Animated.View entering={FadeInDown.delay(200).springify()}>
                  <Image
                    source={require('../../public/courialshield-wht.png')}
                    style={{ width: 250, height: 50 }}
                    contentFit="contain"
                  />
                </Animated.View>
                <Animated.Text
                  entering={FadeInDown.delay(300).springify()}
                  className="text-white/60 text-base mt-2"
                  style={{ fontFamily: 'System' }}
                >
                  Parking protection for gig drivers
                </Animated.Text>
              </Animated.View>

              {/* Form Card */}
              <Animated.View
                entering={FadeInUp.delay(400).springify()}
                className="mx-5 p-6"
              >
                <Animated.View entering={FadeInUp.delay(450).springify()}>
                  <Text className="text-white text-2xl font-bold mb-1 text-center">
                    {mode === 'login'
                      ? (hasSignedInBefore ? 'Welcome Back' : 'Welcome')
                      : 'Create Account'}
                  </Text>
                </Animated.View>
                <Animated.View entering={FadeInUp.delay(500).springify()}>
                  <Text className="text-white/60 mb-6 text-center">
                    {mode === 'login'
                      ? 'Sign in to manage your coverage'
                      : 'Start protecting yourself today'}
                  </Text>
                </Animated.View>

                {/* Form Fields */}
                <View className="space-y-4">
                  {mode === 'signup' && (
                    <Animated.View entering={FadeInUp.delay(550).springify()}>
                      <Input
                        placeholder="Full Name"
                        value={name}
                        onChangeText={setName}
                        error={errors.name}
                        autoCapitalize="words"
                        icon={<User size={20} color="rgba(255,255,255,0.5)" />}
                        variant="dark"
                      />
                    </Animated.View>
                  )}

                  <Animated.View entering={FadeInUp.delay(mode === 'signup' ? 600 : 550).springify()}>
                    <Input
                      placeholder="you@example.com"
                      value={email}
                      onChangeText={setEmail}
                      error={errors.email}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      icon={<Mail size={20} color="rgba(255,255,255,0.5)" />}
                      variant="dark"
                    />
                  </Animated.View>

                  {mode === 'signup' && (
                    <Animated.View entering={FadeInUp.delay(650).springify()}>
                      <Input
                        placeholder="(555) 123-4567"
                        value={phone}
                        onChangeText={handlePhoneChange}
                        error={errors.phone}
                        keyboardType="phone-pad"
                        icon={<Phone size={20} color="rgba(255,255,255,0.5)" />}
                        variant="dark"
                      />
                    </Animated.View>
                  )}

                  <Animated.View entering={FadeInUp.delay(mode === 'signup' ? 700 : 600).springify()}>
                    <Input
                      placeholder="Password"
                      value={password}
                      onChangeText={setPassword}
                      error={errors.password}
                      secureTextEntry
                      icon={<Lock size={20} color="rgba(255,255,255,0.5)" />}
                      variant="dark"
                    />
                  </Animated.View>
                </View>

                {mode === 'login' && loginAttempts >= 2 && (
                  <Pressable className="mt-3" onPress={() => setShowForgotPassword(true)}>
                    <Text className="text-shield-accent text-sm font-medium text-right">
                      Forgot Password?
                    </Text>
                  </Pressable>
                )}

                {/* Submit Button */}
                <Animated.View entering={FadeInUp.delay(mode === 'signup' ? 750 : 650).springify()} className="mt-6 items-center">
                  <Button onPress={handleSubmit} loading={loading} size="sm" pill variant="outline" textClassName="text-2xl font-bold text-white" className="py-2.5 px-10 border-white/30 border">
                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                  </Button>
                </Animated.View>

                {/* Divider */}
                <Animated.View entering={FadeInUp.delay(mode === 'signup' ? 800 : 700).springify()} className="flex-row items-center mt-6">
                  <View className="flex-1 h-px bg-white/20" />
                  <Text className="text-white/40 px-4 text-sm">{'or continue with'}</Text>
                  <View className="flex-1 h-px bg-white/20" />
                </Animated.View>

                {/* Social Login Buttons */}
                <Animated.View entering={FadeInUp.delay(mode === 'signup' ? 850 : 750).springify()} className="flex-row justify-center gap-4 mt-6">
                  <Pressable
                    onPress={handleAppleSignIn}
                    disabled={loading}
                    className="flex-row items-center justify-center py-2.5 px-6 rounded-full border border-white/30"
                    style={{ opacity: loading ? 0.5 : 1 }}
                  >
                    <AppleLogo size={20} color="#FFFFFF" />
                    <Text className="text-white font-semibold ml-2">{'Apple'}</Text>
                  </Pressable>

                  <Pressable
                    onPress={handleGoogleSignIn}
                    disabled={loading}
                    className="flex-row items-center justify-center py-2.5 px-6 rounded-full border border-white/30"
                    style={{ opacity: loading ? 0.5 : 1 }}
                  >
                    <GoogleLogo size={20} />
                    <Text className="text-white font-semibold ml-2">{'Google'}</Text>
                  </Pressable>
                </Animated.View>

                {/* Toggle Mode */}
                <Animated.View entering={FadeInUp.delay(mode === 'signup' ? 900 : 800).springify()} className="flex-row justify-center mt-6">
                  <Text className="text-white/60">
                    {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
                  </Text>
                  <Pressable onPress={toggleMode} className="ml-2">
                    <Text className="text-shield-accent font-semibold">
                      {mode === 'login' ? 'Sign Up' : 'Sign In'}
                    </Text>
                  </Pressable>
                </Animated.View>
              </Animated.View>

              {/* Footer */}
              <View className="py-8 px-6">
                <Text className="text-white/40 text-xs text-center">
                  {'By continuing, you agree to our '}
                  <Text
                    className="text-shield-accent"
                    onPress={() => setLegalModal('terms')}
                  >
                    {'Terms and Conditions'}
                  </Text>
                  {' and '}
                  <Text
                    className="text-shield-accent"
                    onPress={() => setLegalModal('privacy')}
                  >
                    {'Privacy Policy'}
                  </Text>
                  {'.'}
                </Text>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>

      {/* OTP Verification Modal */}
      <OTPVerificationModal
        visible={showOTPModal}
        phoneNumber={otpPurpose === 'signin' && pendingLoginUser ? pendingLoginUser.phone : phone}
        onVerify={handleVerifyOTP}
        onClose={() => {
          setShowOTPModal(false);
          setOtpError(null);
          setPendingLoginUser(null);
        }}
        onResend={handleResendOTP}
        isVerifying={isVerifyingOTP}
        error={otpError}
      />

      {/* Legal Modal */}
      <LegalModal
        visible={legalModal !== null}
        type={legalModal}
        onClose={() => setLegalModal(null)}
      />

      {/* Forgot Password Modal */}
      <Modal
        visible={showForgotPassword}
        transparent
        animationType="fade"
        onRequestClose={closeForgotPassword}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}
          onPress={closeForgotPassword}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, width: '100%', maxWidth: 340 }}>
              {!forgotPasswordSent ? (
                <>
                  {/* Header */}
                  <View style={{ alignItems: 'center', marginBottom: 20 }}>
                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                      <Mail size={28} color="#F97316" />
                    </View>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: '#1F2937', marginBottom: 8 }}>{'Reset Password'}</Text>
                    <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center' }}>
                      {"Enter your email address and we'll send you a link to reset your password."}
                    </Text>
                  </View>

                  {/* Email Input */}
                  <View style={{ marginBottom: 20 }}>
                    <Input
                      placeholder="Email address"
                      value={forgotPasswordEmail}
                      onChangeText={setForgotPasswordEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      icon={<Mail size={20} color="#9CA3AF" />}
                    />
                  </View>

                  {/* Send Button */}
                  <Button
                    onPress={handleForgotPassword}
                    loading={forgotPasswordLoading}
                    disabled={!forgotPasswordEmail.trim() || !/\S+@\S+\.\S+/.test(forgotPasswordEmail)}
                    fullWidth
                    pill
                    size="lg"
                  >
                    {'Send Reset Link'}
                  </Button>

                  {/* Cancel */}
                  <Pressable onPress={closeForgotPassword} style={{ marginTop: 16, alignItems: 'center' }}>
                    <Text style={{ color: '#6B7280', fontSize: 14 }}>{'Cancel'}</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  {/* Success State */}
                  <View style={{ alignItems: 'center' }}>
                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                      <Check size={28} color="#22C55E" />
                    </View>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: '#1F2937', marginBottom: 8 }}>{'Check Your Email'}</Text>
                    <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 8 }}>
                      {"We've sent a password reset link to:"}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 24 }}>
                      {forgotPasswordEmail}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginBottom: 24 }}>
                      {"Didn't receive the email? Check your spam folder or try again."}
                    </Text>

                    <Button
                      onPress={closeForgotPassword}
                      fullWidth
                      pill
                      size="lg"
                    >
                      {'Done'}
                    </Button>
                  </View>
                </>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// Legal Modal Component
function LegalModal({
  visible,
  type,
  onClose,
}: {
  visible: boolean;
  type: LegalModalType;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top', 'bottom']}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#E5E7EB',
            backgroundColor: '#FFFFFF',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {type === 'terms' ? (
              <FileText size={24} color="#F97316" />
            ) : (
              <Lock size={24} color="#F97316" />
            )}
            <Text className="text-xl font-bold text-shield-black ml-3">
              {type === 'terms' ? 'Terms & Conditions' : 'Privacy Policy'}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: '#F3F4F6',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} color="#6B7280" />
          </Pressable>
        </View>

        {/* Content */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        >
          {type === 'terms' ? <TermsContent /> : <PrivacyContent />}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// Terms Content
function TermsContent() {
  return (
    <View>
      <Text className="text-gray-500 text-sm mb-6">
        Version 2.0.0 - Effective 2026-01-25
      </Text>

      <View style={{ backgroundColor: '#FEF9C3', borderRadius: 25, borderWidth: 1, borderColor: '#FDE047', padding: 16, marginBottom: 24 }}>
        <View className="flex-row items-start">
          <AlertTriangle size={20} color="#CA8A04" />
          <View className="flex-1 ml-3">
            <Text className="text-yellow-800 font-bold mb-2">
              IMPORTANT: NOT AN INSURANCE PRODUCT
            </Text>
            <Text className="text-yellow-700 text-sm leading-5">
              This is NOT an insurance contract. Courial Shield is a Legal
              Defense and Service Warranty Membership. We do not indemnify the
              user against criminal or civil liability.
            </Text>
          </View>
        </View>
      </View>

      <Section title="1. Nature of Service">
        <Text className="text-gray-600 leading-relaxed mb-3">
          Courial Shield is a Legal Defense and Service Warranty Membership
          designed for gig economy drivers. By subscribing, you gain access to:
        </Text>
        <View className="space-y-2 mb-3">
          {[
            'Administrative assistance to contest parking citations',
            'Discretionary reimbursement credits for eligible tickets',
            'Priority support for ticket-related issues',
          ].map((item, index) => (
            <View key={index} className="flex-row items-start">
              <Check size={16} color="#22C55E" style={{ marginTop: 2 }} />
              <Text className="text-gray-600 flex-1 ml-2">{item}</Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="2. Membership Tiers">
        <Text className="text-gray-600 mb-3">
          {'Your membership tier determines your annual reimbursement cap:'}
        </Text>
        <Card>
          <View className="space-y-3">
            <View className="pb-3 border-b border-gray-100">
              <Text className="text-shield-black font-bold">{'Basic'}</Text>
              <Text className="text-gray-500 text-sm">{'$100/year cap - 20% co-pay'}</Text>
            </View>
            <View className="pb-3 border-b border-gray-100">
              <Text className="text-shield-black font-bold">{'Pro'}</Text>
              <Text className="text-gray-500 text-sm">{'$350/year cap - 15% co-pay'}</Text>
            </View>
            <View>
              <Text className="text-shield-black font-bold">{'Professional'}</Text>
              <Text className="text-gray-500 text-sm">
                {'$600/year cap - 15% co-pay + $100 towing credit'}
              </Text>
            </View>
          </View>
        </Card>
      </Section>

      <Section title="3. Waiting Period">
        <View style={{ backgroundColor: '#FEF9C3', borderRadius: 25, borderWidth: 1, borderColor: '#FDE047', padding: 16 }}>
          <Text className="text-yellow-800 font-bold mb-2">30-Day Cooling-Off Period</Text>
          <Text className="text-yellow-700 text-sm leading-5">
            No claims may be filed for citations issued within the first 30 days of
            active membership.
          </Text>
        </View>
      </Section>

      <Section title="4. Claims Process">
        <Text className="text-gray-600 mb-2">
          - Citations must be uploaded within 5 days of issuance
        </Text>
        <Text className="text-gray-600 mb-2">
          - We will attempt to contest the citation first
        </Text>
        <Text className="text-gray-600 mb-2">
          - Reimbursements are sent directly to you, the Member
        </Text>
      </Section>

      <Section title="5. Subscription & Billing">
        <Text className="text-gray-600 mb-2">- Memberships are billed in advance</Text>
        <Text className="text-gray-600 mb-2">- Auto-renewal unless cancelled</Text>
        <Text className="text-gray-600 mb-2">
          - 90-day cancellation restriction after receiving reimbursement
        </Text>
        <Text className="text-gray-600">- Membership fees are non-refundable</Text>
      </Section>

      <Section title="6. Contact Us">
        <Text className="text-gray-600">
          If you have questions about these terms, please contact us at
          support@courial.com
        </Text>
      </Section>
    </View>
  );
}

// Privacy Content
function PrivacyContent() {
  return (
    <View>
      <Text className="text-gray-500 text-sm mb-6">
        {'Version 1.0.0 - Effective 2026-01-01'}
      </Text>

      <Section title="Information We Collect">
        <Text className="text-gray-600 mb-3">{'We collect the following information:'}</Text>
        {[
          'Account information (name, email, phone)',
          'Payment information (processed securely via Stripe)',
          'Ticket photos and claim details',
          'Device information for fraud prevention',
          'Location data (only when submitting claims)',
          'Proof of gig work (for Professional tier verification)',
        ].map((item, index) => (
          <View key={index} className="flex-row items-start mb-2">
            <View className="w-2 h-2 rounded-full bg-shield-accent mt-2 mr-3" />
            <Text className="text-gray-600 flex-1">{item}</Text>
          </View>
        ))}
      </Section>

      <Section title="How We Use Your Information">
        <Text className="text-gray-600 mb-3">{'Your information is used to:'}</Text>
        {[
          'Process your membership and payments',
          'Review and process your claims',
          'Contest citations on your behalf',
          'Prevent fraud and abuse',
          'Improve our services',
          'Communicate important updates',
        ].map((item, index) => (
          <View key={index} className="flex-row items-start mb-2">
            <View style={{ marginTop: 2, marginRight: 8 }}>
              <Check size={16} color="#22C55E" />
            </View>
            <Text className="text-gray-600 flex-1">{item}</Text>
          </View>
        ))}
      </Section>

      <Section title="Data Security">
        <Card className="bg-blue-50 border border-blue-100">
          <View className="flex-row items-start">
            <Lock size={20} color="#3B82F6" />
            <View className="flex-1 ml-3">
              <Text className="text-blue-800 font-semibold mb-1">{'Your Data is Protected'}</Text>
              <Text className="text-blue-700 text-sm">
                {'We use industry-standard encryption and security measures to protect your personal information.'}
              </Text>
            </View>
          </View>
        </Card>
      </Section>

      <Section title="Your Rights">
        <Text className="text-gray-600 mb-3">{'You have the right to:'}</Text>
        {[
          'Access your personal data',
          'Request data deletion',
          'Opt out of marketing communications',
          'Export your data',
        ].map((item, index) => (
          <View key={index} className="flex-row items-start mb-2">
            <View className="w-2 h-2 rounded-full bg-shield-accent mt-2 mr-3" />
            <Text className="text-gray-600 flex-1">{item}</Text>
          </View>
        ))}
      </Section>

      <Section title="Contact Us">
        <Text className="text-gray-600">
          For privacy-related inquiries, please contact us at privacy@courial.com
        </Text>
      </Section>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-6">
      <Text className="text-shield-black text-lg font-bold mb-3">{title}</Text>
      {children}
    </View>
  );
}
