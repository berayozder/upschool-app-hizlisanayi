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
        .single();

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
          tintColor="#F97316"
          offTintColor="#E5E7EB"
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
  container: { flex: 1, backgroundColor: '#fff', padding: 24, paddingTop: 40 },
  subtitle: { fontSize: 15, color: '#6B7280', marginBottom: 32, textAlign: 'center' },
  otpBox: {
    borderWidth: 1.5,
    borderRadius: 8,
    width: 44,
    height: 52,
    fontSize: 22,
    fontWeight: '700',
  } as any,
  loadingText: { textAlign: 'center', color: '#9CA3AF', marginTop: 16 },
  resendContainer: { marginTop: 32, alignItems: 'center' },
  countdownText: { fontSize: 14, color: '#9CA3AF' },
  resendButton: { fontSize: 14, color: '#F97316', fontWeight: '600' },
});
