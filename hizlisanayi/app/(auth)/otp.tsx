import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import OTPTextInput from 'react-native-otp-textinput';
import { supabase } from '@/lib/supabase';
import { colors, radius, size, spacing, typography } from '@/constants/theme';

function maskPhone(phone: string): string {
  // +905xxxxxxxxx → +90 5XX XXX ** **
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return phone;
  const local = digits.slice(2); // remove 90
  return `+90 ${local.slice(0, 3)} ${local.slice(3, 6)} ** **`;
}

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  function shake() {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }

  async function handleVerify(token: string) {
    if (token.length < 6) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phone!,
        token,
        type: 'sms',
      });
      if (error) throw error;

      // Check if profile exists (first-time user)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user!.id)
        .maybeSingle();

      if (!profile) {
        router.replace('/(auth)/role-select');
      } else {
        router.replace('/(app)/feed');
      }
    } catch {
      shake();
      Alert.alert('Hata', 'Yanlış kod. Tekrar dene.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    try {
      await supabase.auth.signInWithOtp({ phone: phone! });
      setCountdown(60);
    } catch {
      Alert.alert('Hata', 'SMS gönderilemedi. Tekrar dene.');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>
        Kodu {maskPhone(phone ?? '')} numarasına gönderdik.
      </Text>

      <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
        <OTPTextInput
          handleTextChange={handleVerify}
          inputCount={6}
          tintColor={colors.primary}
          offTintColor={colors.border}
          textInputStyle={styles.otpBox}
          editable={!loading}
        />
      </Animated.View>

      {loading && (
        <Text style={styles.loadingText}>Doğrulanıyor...</Text>
      )}

      <View style={styles.resendContainer}>
        {countdown > 0 ? (
          <Text style={styles.countdownText}>Tekrar gönder ({countdown}s)</Text>
        ) : (
          <TouchableOpacity onPress={handleResend}>
            <Text style={styles.resendButton}>Tekrar Gönder</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, paddingTop: spacing.xxl },
  subtitle: { ...typography.secondary, color: colors.textSecondary, marginBottom: spacing.xl, textAlign: 'center' },
  otpBox: {
    borderWidth: 1,
    borderRadius: radius.md,
    width: 44,
    height: size.inputHeight,
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  } as any,
  loadingText: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.md },
  resendContainer: { marginTop: spacing.xl, alignItems: 'center' },
  countdownText: { ...typography.secondary, color: colors.textSecondary },
  resendButton: { ...typography.secondary, color: colors.primary, fontWeight: '600' },
});
