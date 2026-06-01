import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Button from '@/components/ui/Button';
import { useJobDetail } from '@/hooks/useJobDetail';
import { useAuth } from '@/context/AuthContext';
import { getCategoryBySlug } from '@/constants/categories';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { logAndOpenWhatsApp } from '@/lib/whatsapp';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/ui/Toast';

const { width } = Dimensions.get('window');

function formatTimeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) return `${mins} dk once`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} saat once`;
  return `${Math.floor(hours / 24)} gun once`;
}

function hoursRemaining(expiresAt: string): number {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60)));
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile, session } = useAuth();
  const { job, isLoading, closeJob, isClosing } = useJobDetail(id || '');
  const [hasContacted, setHasContacted] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const insets = useSafeAreaInsets();

  const isProvider = profile?.active_role === 'provider';
  const userId = session?.user.id ?? (profile?.id !== 'dev-user' ? profile?.id : undefined);
  const inactiveJob = job?.status === 'expired' || job?.status === 'closed';
  const category = useMemo(() => (job ? getCategoryBySlug(job.category_slug) : undefined), [job]);

  async function onWhatsApp() {
    if (!job || !userId || !job.seeker_phone) return;
    try {
      await logAndOpenWhatsApp(job, userId, supabase);
      setHasContacted(true);
    } catch {
      Alert.alert('Hata', 'WhatsApp acilamadi.');
    }
  }

  function onCloseJob() {
    Alert.alert('Ilani Kapat', 'Ilaninizi kapatmak istediginize emin misiniz?', [
      { text: 'Vazgec', style: 'cancel' },
      {
        text: 'Kapat',
        style: 'destructive',
        onPress: async () => {
          try {
            await closeJob();
            showToast('Ilaniniz kapatildi.', 'info');
            router.back();
          } catch {
            Alert.alert('Hata', 'Ilan kapatilamadi.');
          }
        },
      },
    ]);
  }

  if (isLoading || !job) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top }]}>
      {job.photo_urls.length > 0 && (
        <>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / width);
              setActiveImage(index);
            }}
          >
            {job.photo_urls.map((uri, index) => (
              <Image key={`${uri}-${index}`} source={{ uri }} style={styles.heroImage} contentFit="cover" />
            ))}
          </ScrollView>
          <View style={styles.dots}>
            {job.photo_urls.map((_, index) => (
              <View key={index} style={[styles.dot, activeImage === index && styles.dotActive]} />
            ))}
          </View>
        </>
      )}

      {inactiveJob && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Bu ilan artik aktif degil.</Text>
        </View>
      )}

      <View style={styles.metaRow}>
        <View style={styles.categoryChip}>
          <Text style={styles.categoryChipText}>{category?.label_tr ?? job.category_slug}</Text>
        </View>
        <Text style={styles.location}>{job.city}{job.district ? ` / ${job.district}` : ''}</Text>
      </View>

      <Text style={styles.title}>{job.title}</Text>
      <Text style={styles.subMeta}>Yayinlandi: {formatTimeAgo(job.created_at)}</Text>
      <Text style={styles.subMeta}>Suresi: {hoursRemaining(job.expires_at)} saat kaldi</Text>
      {job.description ? <Text style={styles.description}>{job.description}</Text> : null}

      {isProvider ? (
        <View style={styles.providerSection}>
          {typeof job.distance_km === 'number' && (
            <Text style={styles.distanceText}>{Math.round(job.distance_km)} km uzakta</Text>
          )}
          <Pressable
            style={[
              styles.whatsappBtn,
              (hasContacted || inactiveJob) && styles.whatsappBtnDisabled,
            ]}
            onPress={onWhatsApp}
            disabled={hasContacted || inactiveJob}
          >
            <Text style={styles.whatsappBtnText}>
              {hasContacted ? 'WhatsApp Açıldı ✓' : "WhatsApp'tan Teklif Ver 💬"}
            </Text>
          </Pressable>
        </View>
      ) : (
        job.seeker_id === userId && (
          <View style={styles.seekerSection}>
            <Text style={styles.contactCountBig}>{job.contact_count ?? 0}</Text>
            <Text style={styles.contactCountText}>
              {(job.contact_count ?? 0) > 0
                ? 'firma ilaniniza WhatsApp tan ulasti'
                : 'Henuz teklif gelmedi'}
            </Text>
            <Button
              label="Ilani Kapat"
              variant="destructive"
              onPress={onCloseJob}
              fullWidth
              loading={isClosing}
              disabled={inactiveJob}
            />
          </View>
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  heroImage: { width, height: 250, backgroundColor: '#E2E8F0' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: spacing.xs },
  dot: { width: 8, height: 8, borderRadius: 999, backgroundColor: '#CBD5E1' },
  dotActive: { backgroundColor: colors.primary },
  banner: {
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    borderRadius: radius.card, // 16px
    backgroundColor: '#FEF3C7',
    padding: spacing.sm,
  },
  bannerText: { ...typography.secondary, color: '#92400E', textAlign: 'center', fontWeight: '600' },
  metaRow: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryChip: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
  },
  categoryChipText: { ...typography.badge, color: colors.primary, letterSpacing: 0.5 },
  location: { ...typography.secondary, color: colors.textSecondary },
  title: { ...typography.sectionTitle, color: colors.textPrimary, paddingHorizontal: spacing.md, marginTop: spacing.sm },
  subMeta: { ...typography.caption, color: colors.textSecondary, paddingHorizontal: spacing.md, marginTop: 4 },
  description: {
    ...typography.secondary,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    lineHeight: 22,
  },
  providerSection: { paddingHorizontal: spacing.md, marginTop: spacing.lg, gap: spacing.xs },
  distanceText: { ...typography.secondary, color: colors.urgent, fontWeight: '700' },
  whatsappBtn: {
    height: 56,
    borderRadius: radius.md, // 14px
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  whatsappBtnDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.7,
  },
  whatsappBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  seekerSection: { paddingHorizontal: spacing.md, marginTop: spacing.xl, gap: spacing.sm, alignItems: 'center' },
  contactCountBig: { fontSize: 44, fontWeight: '700', color: colors.textPrimary },
  contactCountText: { ...typography.secondary, color: colors.textSecondary, textAlign: 'center' },
});
