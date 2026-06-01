import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/components/ui/Toast';
import { setupNotificationListeners } from '@/lib/notifications';

const queryClient = new QueryClient();

function RootNavigator() {
  const { session, profile, loading, devBypassActive } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  // ── Auth routing guard ──
  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    if (devBypassActive) {
      if (!inAuthGroup) return;
      router.replace('/(app)/feed');
      return;
    }

    if (!session) {
      // Not logged in → go to phone screen
      if (!inAuthGroup) {
        router.replace('/(auth)/phone');
      }
    } else if (!profile) {
      // Logged in but no profile → pick role
      router.replace('/(auth)/role-select');
    } else {
      // Logged in with profile → go to app
      if (inAuthGroup) {
        router.replace('/(app)/feed');
      }
    }
  }, [session, profile, loading, segments, devBypassActive]);

  // ── Notification deep-link listeners ──
  useEffect(() => {
    const cleanup = setupNotificationListeners(router);
    return cleanup;
  }, [router]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootNavigator />
          <ToastProvider />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
