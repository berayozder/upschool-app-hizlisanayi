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
import { colors, radius, size, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

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

function mapOtpError(err: unknown): string {
  const rawMessage =
    typeof err === 'object' && err !== null && 'message' in err
      ? String((err as { message?: string }).message ?? '')
      : '';

  const message = rawMessage.toLowerCase();

  if (message.includes('network') || message.includes('fetch')) {
    return 'Internet baglantisi yok.';
  }
  if (message.includes('rate limit') || message.includes('too many')) {
    return 'Cok fazla deneme yapildi. Biraz sonra tekrar deneyin.';
  }
  if (
    message.includes('phone provider') ||
    message.includes('sms provider') ||
    message.includes('otp is disabled') ||
    message.includes('unsupported phone provider')
  ) {
    return 'SMS servisi su an aktif degil. Supabase Phone Auth ayarlarini kontrol edin.';
  }

  if (rawMessage) {
    return `SMS gonderilemedi: ${rawMessage}`;
  }

  return 'SMS gonderilemedi. Tekrar dene.';
}

export default function PhoneScreen() {
  const router = useRouter();
  const { enableDevBypass } = useAuth();
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
    } catch (err: unknown) {
      Alert.alert('Hata', mapOtpError(err));
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
            placeholderTextColor={colors.placeholder}
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
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.buttonText}>Kod Gönder</Text>
          )}
        </TouchableOpacity>

        {/* Legal */}
        <Text style={styles.legal}>
          Devam ederek Gizlilik Politikamızı kabul etmiş olursunuz.
        </Text>

        {__DEV__ && (
          <View style={styles.devSection}>
            <Text style={styles.devLabel}>Gelistirme Modu (OTP olmadan giris)</Text>
            <TouchableOpacity
              style={[styles.devButton, styles.devButtonSeeker]}
              onPress={() => enableDevBypass('seeker')}
              activeOpacity={0.8}
            >
              <Text style={styles.devButtonText}>Dev ile Seeker Girisi</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.devButton, styles.devButtonProvider]}
              onPress={() => enableDevBypass('provider')}
              activeOpacity={0.8}
            >
              <Text style={styles.devButtonText}>Dev ile Provider Girisi</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: { flex: 1, paddingHorizontal: spacing.md, justifyContent: 'center' },
  brandContainer: { alignItems: 'center', marginBottom: spacing.xxxl },
  brandTitle: { ...typography.pageTitle, color: colors.textPrimary },
  brandSubtitle: { ...typography.secondary, color: colors.textSecondary, marginTop: 4 },
  label: { ...typography.secondary, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.xs },
  inputContainer: { marginBottom: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    height: size.inputHeight,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    fontSize: 18,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  button: {
    backgroundColor: colors.primary,
    height: size.buttonHeight,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { ...typography.button, color: colors.surface },
  legal: { textAlign: 'center', ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
  devSection: { marginTop: spacing.lg, gap: spacing.xs },
  devLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  devButton: {
    height: size.buttonHeightSmall,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devButtonSeeker: {
    backgroundColor: colors.textPrimary,
  },
  devButtonProvider: {
    backgroundColor: colors.warning,
  },
  devButtonText: {
    ...typography.secondary,
    color: colors.surface,
    fontWeight: '600',
  },
});
