import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  // Remove leading 0 or 90 if user types it
  const clean = digits.startsWith('90')
    ? digits.slice(2)
    : digits.startsWith('0')
    ? digits.slice(1)
    : digits;

  let result = '+90 ';
  if (clean.length > 0) result += clean.slice(0, 3);
  if (clean.length > 3) result += ' ' + clean.slice(3, 6);
  if (clean.length > 6) result += ' ' + clean.slice(6, 8);
  if (clean.length > 8) result += ' ' + clean.slice(8, 10);
  return result.trimEnd();
}

function toE164(formatted: string): string {
  const digits = formatted.replace(/\D/g, '');
  return '+' + digits;
}

function isValidPhone(formatted: string): boolean {
  const e164 = toE164(formatted);
  return /^\+90[5][0-9]{9}$/.test(e164);
}

export default function PhoneScreen() {
  const router = useRouter();
  const [display, setDisplay] = useState('+90 ');
  const [loading, setLoading] = useState(false);

  function handleChange(text: string) {
    if (!text.startsWith('+90')) {
      setDisplay('+90 ');
      return;
    }
    setDisplay(formatPhone(text));
  }

  async function handleSubmit() {
    const phone = toE164(display);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
      router.push({ pathname: '/(auth)/otp', params: { phone } });
    } catch (err: any) {
      const msg =
        err?.message?.toLowerCase().includes('network') || err?.message?.toLowerCase().includes('fetch')
          ? 'İnternet bağlantısı yok.'
          : 'SMS gönderilemedi. Tekrar dene.';
      Alert.alert('Hata', msg);
    } finally {
      setLoading(false);
    }
  }

  const valid = isValidPhone(display);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        {/* Brand */}
        <View style={styles.brandContainer}>
          <Text style={styles.brandTitle}>Hızlısanayi</Text>
          <Text style={styles.brandSubtitle}>Sanayi hizmetleri, hızlıca.</Text>
        </View>

        {/* Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Telefon Numarası</Text>
          <TextInput
            style={styles.input}
            value={display}
            onChangeText={handleChange}
            keyboardType="phone-pad"
            placeholder="+90 5XX XXX XX XX"
            placeholderTextColor="#9CA3AF"
            autoFocus
          />
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.button, (!valid || loading) && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={!valid || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Kod Gönder</Text>
          )}
        </TouchableOpacity>

        {/* Legal */}
        <Text style={styles.legal}>
          Devam ederek Gizlilik Politikamızı kabul etmiş olursunuz.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  brandContainer: { alignItems: 'center', marginBottom: 48 },
  brandTitle: { fontSize: 32, fontWeight: '700', color: '#F97316' },
  brandSubtitle: { fontSize: 15, color: '#6B7280', marginTop: 4 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  inputContainer: { marginBottom: 24 },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 18,
    color: '#111827',
    letterSpacing: 1,
  },
  button: {
    backgroundColor: '#F97316',
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  legal: { textAlign: 'center', fontSize: 12, color: '#9CA3AF', lineHeight: 18 },
});
