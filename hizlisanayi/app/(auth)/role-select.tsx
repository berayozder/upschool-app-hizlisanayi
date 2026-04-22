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
                <ActivityIndicator size="large" color="#F97316" />
              ) : (
                <MaterialCommunityIcons name={icon} size={40} color="#F97316" />
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
    backgroundColor: '#fff',
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 40,
  },
  cards: { gap: 16 },
  card: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    height: 180,
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FAFAFA',
  },
  cardDisabled: { opacity: 0.6 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  cardSubtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center' },
});
