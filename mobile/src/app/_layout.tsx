import { useEffect, useState, useRef } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/lib/useColorScheme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import {
  useFonts,
  NunitoSans_400Regular,
  NunitoSans_500Medium,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
  NunitoSans_800ExtraBold,
} from '@expo-google-fonts/nunito-sans';
import { useStore } from '@/lib/store';
import {
  initRevenueCat,
  identifyUser,
  getCustomerInfo,
  getSubscriptionStateFromCustomerInfo,
  isRevenueCatConfigured,
} from '@/lib/revenuecat';
import { isValidCourialId } from '@/lib/courial-api';
import { isValidUUID, generateUUID } from '@/lib/cn';
import {
  setupNotificationListeners,
  removeNotificationListeners,
  handleInitialNotification,
} from '@/lib/push-notifications';
import { ErrorBoundary } from '@/components/ui';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Custom light theme with Courial Shield branding
const CourialLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#F97316',
    background: '#F5F5F5',
    card: '#FFFFFF',
    text: '#000000',
    border: '#E5E7EB',
  },
};

function RootLayoutNav({ colorScheme }: { colorScheme: 'light' | 'dark' | null | undefined }) {
  return (
    <ThemeProvider value={CourialLightTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="plans" options={{ headerShown: false }} />
        <Stack.Screen
          name="submit-claim"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="claim-success"
          options={{
            presentation: 'fullScreenModal',
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="claim-submitted"
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="claim/[id]"
          options={{
            title: 'Claim Details',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="notifications"
          options={{
            title: 'Notifications',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen
          name="terms"
          options={{
            title: 'Terms & Policies',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="subscription"
          options={{
            title: 'Subscription',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="how-it-works"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="edit-profile"
          options={{
            title: 'Edit Profile',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="payment-methods"
          options={{
            title: 'Payment Methods',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="notification-settings"
          options={{
            title: 'Notifications',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="documents"
          options={{
            title: 'Documents',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="withdraw"
          options={{
            title: 'Withdraw Funds',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="add-bank"
          options={{
            title: 'Add Bank Account',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="vehicles"
          options={{
            title: 'Registered Vehicles',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="help-center"
          options={{
            title: 'Help Center',
            headerBackTitle: 'Back',
          }}
        />
      </Stack>
      <AuthGate />
    </ThemeProvider>
  );
}

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();

  const isOnboarded = useStore((s) => s.isOnboarded);
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const user = useStore((s) => s.user);
  const setUser = useStore((s) => s.setUser);
  const setCurrentPlan = useStore((s) => s.setCurrentPlan);
  const resolveCourialId = useStore((s) => s.resolveCourialId);
  const checkDiscountEligibility = useStore((s) => s.checkDiscountEligibility);
  const registerPushToken = useStore((s) => s.registerPushToken);
  const coverage = useStore((s) => s.coverage);

  const [isReady, setIsReady] = useState(false);
  const courialIdResolvedRef = useRef(false);
  const discountCheckedRef = useRef(false);
  const pushTokenRegisteredRef = useRef(false);
  const lastRevenueCatSyncUserIdRef = useRef<string | null>(null);

  // Migrate legacy user IDs to valid UUIDs
  useEffect(() => {
    if (user && !isValidUUID(user.id)) {
      console.warn(`[AuthGate] Migrating legacy user ID: ${user.id} -> new UUID`);
      const migratedUser = { ...user, id: generateUUID() };
      setUser(migratedUser);
    }
  }, [user, setUser]);

  useEffect(() => {
    // Small delay to allow store hydration
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Set up notification listeners on mount
  useEffect(() => {
    try {
      setupNotificationListeners();

      // Handle app opened from notification
      handleInitialNotification();
    } catch (error) {
      console.warn('[AuthGate] Failed to setup notification listeners:', error);
    }

    return () => {
      try {
        removeNotificationListeners();
      } catch (error) {
        console.warn('[AuthGate] Failed to remove notification listeners:', error);
      }
    };
  }, []);

  // Register push token when user is authenticated
  useEffect(() => {
    if (!isReady || !isAuthenticated || !user) {
      return;
    }

    // Prevent duplicate registration during this session
    if (pushTokenRegisteredRef.current) {
      return;
    }

    pushTokenRegisteredRef.current = true;

    // Register push token (non-blocking)
    console.log('[AuthGate] Registering push token for user:', user.email);
    registerPushToken().then((result) => {
      if (result.success) {
        console.log('[AuthGate] Push token registered successfully');
      } else {
        console.warn('[AuthGate] Push token registration failed:', result.error);
        // Reset flag to allow retry
        pushTokenRegisteredRef.current = false;
      }
    }).catch((error) => {
      console.warn('[AuthGate] Push token registration error:', error);
      pushTokenRegisteredRef.current = false;
    });
  }, [isReady, isAuthenticated, user, registerPushToken]);

  // Sync subscription status from RevenueCat on app launch/login
  useEffect(() => {
    if (!isReady || !isAuthenticated || !user?.id) {
      return;
    }

    if (lastRevenueCatSyncUserIdRef.current === user.id) {
      return;
    }
    lastRevenueCatSyncUserIdRef.current = user.id;

    (async () => {
      try {
        await initRevenueCat();
        if (!isRevenueCatConfigured()) {
          console.warn('[AuthGate] RevenueCat not configured, skipping subscription sync');
          setCurrentPlan('free', false);
          return;
        }

        await identifyUser(user.id);
        const customerInfo = await getCustomerInfo();
        if (!customerInfo) {
          console.warn('[AuthGate] No customer info returned from RevenueCat');
          setCurrentPlan('free', false);
          return;
        }

        const subscriptionState = getSubscriptionStateFromCustomerInfo(customerInfo);

        if (
          user.currentPlan === subscriptionState.currentPlan &&
          user.hasActiveSubscription === subscriptionState.hasActiveSubscription &&
          coverage?.planId === subscriptionState.currentPlan
        ) {
          return;
        }

        console.log('[AuthGate] Syncing plan state from RevenueCat:', subscriptionState.currentPlan);
        setCurrentPlan(subscriptionState.currentPlan, subscriptionState.hasActiveSubscription);
      } catch (error) {
        console.warn('[AuthGate] Failed to sync subscription from RevenueCat:', error);
        setCurrentPlan('free', false);
        lastRevenueCatSyncUserIdRef.current = null;
      }
    })();
  }, [isReady, isAuthenticated, user?.id, user?.currentPlan, user?.hasActiveSubscription, coverage?.planId, setCurrentPlan]);

  // Courial ID Resolution - runs once after user is authenticated with a plan
  useEffect(() => {
    if (!isReady || !isAuthenticated || !user) {
      return;
    }

    // Check if courialId already exists (immutable once set)
    if (isValidCourialId(user.courialId)) {
      console.log('[AuthGate] Courial ID already exists:', user.courialId);
      return;
    }

    // Prevent duplicate resolution attempts during this session
    if (courialIdResolvedRef.current) {
      return;
    }

    courialIdResolvedRef.current = true;

    // Resolve Courial ID in the background (non-blocking)
    console.log('[AuthGate] Resolving Courial ID for user:', user.email);
    resolveCourialId().then((result) => {
      if (result.success) {
        console.log('[AuthGate] Courial ID resolved successfully:', result.courialId);
        // After ID is resolved, check discount eligibility
        checkDiscountEligibility().then((discountResult) => {
          if (discountResult.success) {
            console.log('[AuthGate] Discount eligibility checked:', discountResult.data);
          }
        });
      } else {
        console.warn('[AuthGate] Courial ID resolution failed:', result.error);
        // Reset flag to allow retry on next mount
        courialIdResolvedRef.current = false;
      }
    });
  }, [isReady, isAuthenticated, user, resolveCourialId, checkDiscountEligibility]);

  // Check discount eligibility on login if courialId exists but discount wasn't checked
  useEffect(() => {
    if (!isReady || !isAuthenticated || !user) {
      return;
    }

    // Need valid courialId to check discount
    if (!isValidCourialId(user.courialId)) {
      return;
    }

    // Skip if already checked recently (within this session)
    if (discountCheckedRef.current) {
      return;
    }

    // Skip if already checked (has a timestamp)
    if (user.discountCheckedAt) {
      console.log('[AuthGate] Discount already checked at:', user.discountCheckedAt);
      return;
    }

    discountCheckedRef.current = true;

    // Check discount eligibility in background
    console.log('[AuthGate] Checking discount eligibility...');
    checkDiscountEligibility().then((result) => {
      if (result.success) {
        console.log('[AuthGate] Discount eligibility result:', result.data);
      } else {
        console.warn('[AuthGate] Discount check failed:', result.error);
        discountCheckedRef.current = false;
      }
    });
  }, [isReady, isAuthenticated, user, checkDiscountEligibility]);

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === 'auth' || segments[0] === 'onboarding';

    if (!isOnboarded) {
      router.replace('/onboarding');
    } else if (!isAuthenticated) {
      router.replace('/auth');
    } else if (isAuthenticated && inAuthGroup) {
      // After successful login, redirect to home tab (not settings)
      router.replace('/(tabs)');
    }
    // Plans are optional - users can navigate and submit claims on Free tier.
  }, [isOnboarded, isAuthenticated, user, segments, isReady, router]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [fontsLoaded] = useFonts({
    NunitoSans_400Regular,
    NunitoSans_500Medium,
    NunitoSans_600SemiBold,
    NunitoSans_700Bold,
    NunitoSans_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
      // Initialize RevenueCat for payments
      initRevenueCat();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <ErrorBoundary>
            <StatusBar style="auto" />
            <RootLayoutNav colorScheme={colorScheme} />
          </ErrorBoundary>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
