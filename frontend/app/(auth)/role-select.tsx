import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { ActiveRole } from '@/types/database';
import { colors, radius, spacing, typography } from '@/constants/theme';

interface RoleCard {
  role: ActiveRole;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  subtitle: string;
}

const ROLES: RoleCard[] = [
  {
    role: 'seeker',
    icon: 'magnify',
    title: 'Hizmet Arıyorum',
    subtitle: 'İhtiyacım olan işleri ilanla bul',
  },
  {
    role: 'provider',
    icon: 'store',
    title: 'Hizmet Veriyorum',
    subtitle: 'Kendi bölgemdeki işleri gör, teklif ver',
  },
];

export default function RoleSelectScreen() {
  const router = useRouter();
  const [selecting, setSelecting] = useState<ActiveRole | null>(null);

  async function handleSelect(role: ActiveRole) {
    setSelecting(role);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      await supabase.from('profiles').upsert({
        id: user.id,
        phone: user.phone ?? '',
        active_role: role,
        updated_at: new Date().toISOString(),
      });

      if (role === 'seeker') {
        router.replace('/(app)/feed');
      } else {
        router.replace('/(app)/profile/provider-setup');
      }
    } catch {
      setSelecting(null);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nasıl kullanmak istersiniz?</Text>
      <Text style={styles.subtitle}>Daha sonra profilden değiştirebilirsiniz.</Text>

      <View style={styles.cards}>
        {ROLES.map(({ role, icon, title, subtitle }) => {
          const isLoading = selecting === role;
          return (
            <TouchableOpacity
              key={role}
              style={[styles.card, selecting !== null && styles.cardDisabled]}
              onPress={() => handleSelect(role)}
              disabled={selecting !== null}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator size="large" color={colors.primary} />
              ) : (
                <MaterialCommunityIcons name={icon} size={40} color={colors.primary} />
              )}
              <Text style={styles.cardTitle}>{title}</Text>
              <Text style={styles.cardSubtitle}>{subtitle}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  title: {
    ...typography.pageTitle,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.secondary,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  cards: { gap: spacing.md },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    height: 180,
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
  },
  cardDisabled: { opacity: 0.6 },
  cardTitle: { ...typography.sectionTitle, color: colors.textPrimary },
  cardSubtitle: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
});
