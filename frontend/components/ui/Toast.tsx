import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import { colors, radius, spacing, typography } from '@/constants/theme';

type ToastType = 'success' | 'error' | 'info';

interface ToastPayload {
  message: string;
  type: ToastType;
}

let notifyToast: ((payload: ToastPayload) => void) | null = null;

export function showToast(message: string, type: ToastType = 'info') {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
    return;
  }

  notifyToast?.({ message, type });
}

export function ToastProvider() {
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    notifyToast = (payload) => setToast(payload);
    return () => {
      notifyToast = null;
    };
  }, []);

  useEffect(() => {
    if (!toast || Platform.OS === 'android') return;

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();

    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 100,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setToast(null);
      });
    }, 2500);

    return () => clearTimeout(timeout);
  }, [toast, opacity, translateY]);

  if (!toast || Platform.OS === 'android') return null;

  return (
    <View pointerEvents="none" style={styles.container}>
      <Animated.View
        style={[
          styles.toast,
          { backgroundColor: iosToastColor[toast.type] },
          { opacity, transform: [{ translateY }] },
        ]}
      >
        <Text style={styles.text}>{toast.message}</Text>
      </Animated.View>
    </View>
  );
}

const iosToastColor: Record<ToastType, string> = {
  success: colors.success,
  error: colors.error,
  info: colors.primary,
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.xl,
    alignItems: 'center',
    zIndex: 999,
  },
  toast: {
    maxWidth: '90%',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  text: {
    ...typography.secondary,
    color: colors.surface,
    fontWeight: '600',
  },
});
