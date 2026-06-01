import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { Router } from 'expo-router';
import { supabase } from '@/lib/supabase';

// ── Register push token with Expo + Supabase ──────────────────────────────
export async function registerPushToken(userId: string): Promise<void> {
  // Skip in dev bypass mode — "dev-user" is not a real UUID
  if (!userId || userId === 'dev-user') return;

  // Only works on physical devices
  if (!Device.isDevice) {
    console.log('[Notifications] Skipping — not a physical device');
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Notifications] Permission denied by user');
    return; // silently bail — user said no
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.warn('[Notifications] No projectId found in app config');
    return;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = tokenData.data;

  // Upsert token into Supabase push_tokens table
  const { error } = await supabase.from('push_tokens').upsert(
    {
      user_id: userId,
      token,
      platform: Platform.OS as 'ios' | 'android',
    },
    { onConflict: 'token' },
  );

  if (error) {
    console.warn('[Notifications] Failed to save push token:', error.message);
  } else {
    console.log('[Notifications] Token registered:', token);
  }
}

// ── Delete all push tokens for user ──────────────────────────────────────
export async function deletePushToken(userId: string): Promise<void> {
  // Skip in dev bypass mode — "dev-user" is not a real UUID
  if (!userId || userId === 'dev-user') return;

  const { error } = await supabase
    .from('push_tokens')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.warn('[Notifications] Failed to delete push tokens:', error.message);
  }
}

// ── Configure global notification handler ────────────────────────────────
export function setupNotificationListeners(router: Router): () => void {
  // Show alerts even when app is in foreground
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  // Deep-link on notification tap
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data as {
        jobId?: string;
      };
      if (data?.jobId) {
        router.push(`/job/${data.jobId}` as `/${string}`);
      }
    },
  );

  // Return cleanup
  return () => {
    subscription.remove();
  };
}
