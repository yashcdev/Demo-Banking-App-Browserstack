import { ErrorBoundary } from '@/components/ErrorBoundary';
import { BSColors } from '@/constants/theme';
import {
  Urbanist_400Regular,
  Urbanist_500Medium,
  Urbanist_600SemiBold,
  Urbanist_700Bold,
  Urbanist_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/urbanist';
import { StripeProvider } from '@stripe/stripe-react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { LogBox, Platform } from 'react-native';
import 'react-native-reanimated';

// Suppress known third-party library warnings that are not actionable
LogBox.ignoreLogs([
  'animations-in-inline-styling',
  "It looks like you might be using shared value's .value inside reanimated inline style",
]);

const STRIPE_PK = process.env.EXPO_PUBLIC_STRIPE_PK ?? 'pk_test_YOUR_PUBLISHABLE_KEY_HERE';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Urbanist-Regular':   Urbanist_400Regular,
    'Urbanist-Medium':    Urbanist_500Medium,
    'Urbanist-SemiBold':  Urbanist_600SemiBold,
    'Urbanist-Bold':      Urbanist_700Bold,
    'Urbanist-ExtraBold': Urbanist_800ExtraBold,
  });
  const router = useRouter();
  const notifListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  // Persistent login — restore token from AsyncStorage on cold start
  useEffect(() => {
    (async () => {
      try {
        const { AuthStore } = await import('@/store/auth');
        // Don't auto-login if user is mid-signup flow
        if (AuthStore.getFlow() === 'signup') return;
        const token = await AuthStore.loadToken();
        if (token) {
          // Validate token is not expired by decoding it (no verify — just check exp)
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            const isExpired = payload.exp && payload.exp * 1000 < Date.now();
            if (!isExpired) {
              // Restore user info from API
              const { api } = await import('@/store/api');
              api.setMemToken(token);
              try {
                const profile = await api.getProfile();
                if (profile) {
                  AuthStore.setUser({ id: profile.id, fullName: profile.fullName, email: profile.email, role: profile.role ?? 'user', kycStatus: profile.kycStatus ?? 'pending' });
                  AuthStore.setRole(profile.role === 'admin' ? 'admin' : 'user');
                }
              } catch { /* use token without profile */ }
              // Only auto-route on a clean login flow.
              // If the user backed out of biometric mid-login, the token was
              // already cleared in biometric.tsx handleBack(), so this branch
              // won't be reached. This guard is an extra safety net.
              if (AuthStore.getFlow() !== 'signup') {
                // Load persisted biometric preference before deciding where to go.
                await AuthStore.loadBiometricEnabled();
                const biometricEnabled = AuthStore.getBiometricEnabled();
                if (biometricEnabled) {
                  router.replace('/biometric' as any);
                } else {
                  const role = AuthStore.getRole();
                  router.replace(role === 'admin' ? '/(admin)/users' as any : '/(banking)/home' as any);
                }
              }
              return;
            }
          }
          // Token expired — clear it
          await AuthStore.clearToken();
        }
      } catch { /* ignore restore errors */ }
    })();
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const Notifications = await import('expo-notifications');
        const Constants = (await import('expo-constants')).default;

        // Show banners when app is foregrounded
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });

        // Android notification channel
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: BSColors.primary,
          });
        }

        // Request permission
        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;
        if (existing !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        // Token registration is handled in (banking)/_layout.tsx after login
        // so the auth token is available when calling the server

        // Listeners
        notifListener.current = Notifications.addNotificationReceivedListener(() => {});
        responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
          const data = response?.notification?.request?.content?.data;
          if (data?.type === 'chat' && mounted) {
            router.push('/(banking)/chat' as any);
          }
        });
      } catch { /* expo-notifications not available (Expo Go / web) */ }
    })();

    // Deep-link handler: demobankingapp://verified → profile verified state
    const { Linking } = require('react-native') as typeof import('react-native');
    const handleDeepLink = ({ url }: { url: string }) => {
      if (!mounted) return;
      if (url.startsWith('demobankingapp://verified')) {
        router.push({ pathname: '/(banking)/profile' as any, params: { deeplink_verified: '1' } });
      }
    };
    const linkingSub = Linking.addEventListener('url', handleDeepLink);
    // Handle cold-start deep link
    Linking.getInitialURL().then((url: string | null) => {
      if (url && url.startsWith('demobankingapp://verified') && mounted) {
        router.push({ pathname: '/(banking)/profile' as any, params: { deeplink_verified: '1' } });
      }
    }).catch(() => {});

    return () => {
      mounted = false;
      notifListener.current?.remove?.();
      responseListener.current?.remove?.();
      linkingSub.remove();
    };
  }, []);

  return (
    <ErrorBoundary>
      <StripeProvider publishableKey={STRIPE_PK} merchantIdentifier="merchant.com.browserstackbank" urlScheme="demobankingapp">
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="signup" options={{ headerShown: false }} />
          <Stack.Screen name="otp" options={{ headerShown: false }} />
          <Stack.Screen name="biometric" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="liveness" options={{ headerShown: false }} />
          <Stack.Screen name="kyc" options={{ headerShown: false }} />
          <Stack.Screen name="dashboard" options={{ headerShown: false }} />
          <Stack.Screen name="(admin)" options={{ headerShown: false }} />
          <Stack.Screen name="(banking)" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="light" />
      </StripeProvider>
    </ErrorBoundary>
  );
}