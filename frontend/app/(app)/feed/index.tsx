import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import JobCard from '@/components/JobCard';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useProviderProfile } from '@/hooks/useProviderProfile';
import { useProviderFeed } from '@/hooks/useProviderFeed';
import { useMyJobs } from '@/hooks/useMyJobs';
import { CATEGORIES } from '@/constants/categories';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function FeedScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const isProvider = profile?.active_role === 'provider';

  const { providerProfile, isLoading: providerLoading } = useProviderProfile();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const insets = useSafeAreaInsets();

  const providerFeed = useProviderFeed(selectedCategory);
  const seekerFeed = useMyJobs();

  const providerCategoryOptions = useMemo(() => {
    const cats = providerProfile?.categories ?? [];
    return [
      { slug: 'all', label: 'Tumu' },
      ...cats
        .map((slug) => CATEGORIES.find((item) => item.slug === slug))
        .filter(Boolean)
        .map((item) => ({ slug: item!.slug, label: item!.label_tr })),
    ];
  }, [providerProfile?.categories]);

  if (!profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (isProvider) {
    if (providerLoading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      );
    }

    if (!providerProfile) {
      return (
        <View style={styles.centerCardWrap}>
          <View style={styles.centerCard}>
            <MaterialCommunityIcons name="store-plus-outline" size={28} color={colors.warning} />
            <Text style={styles.centerTitle}>Saglayici profili bulunamadi</Text>
            <Text style={styles.centerSubtitle}>Devam etmek icin basvurunuzu tamamlayin.</Text>
            <Button
              label="Profili Tamamla"
              onPress={() => router.push('/(app)/profile/provider-setup')}
              fullWidth
            />
          </View>
        </View>
      );
    }

    if (providerProfile.verification_status === 'pending') {
      return (
        <View style={styles.centerCardWrap}>
          <View style={styles.centerCard}>
            <MaterialCommunityIcons name="clock-outline" size={28} color={colors.warning} />
            <Text style={styles.centerTitle}>Profiliniz inceleniyor</Text>
            <Text style={styles.centerSubtitle}>
              Onaylandiginda ilanlari gorebileceksiniz.
            </Text>
          </View>
        </View>
      );
    }

    if (providerProfile.verification_status === 'rejected') {
      return (
        <View style={styles.centerCardWrap}>
          <View style={styles.centerCard}>
            <MaterialCommunityIcons name="close-circle-outline" size={28} color={colors.error} />
            <Text style={styles.centerTitle}>Basvurunuz reddedildi</Text>
            <Text style={styles.centerSubtitle}>
              {providerProfile.rejection_reason || 'Detaylar icin profilinizi guncelleyin.'}
            </Text>
            <Button
              label="Profili Guncelle"
              onPress={() => router.push('/(app)/profile/provider-setup')}
              fullWidth
            />
          </View>
        </View>
      );
    }

    const providerJobs = providerFeed.jobs;
    return (
      <View style={styles.container}>
        <FlatList
          data={providerJobs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingTop: insets.top + spacing.md }]}
          ListHeaderComponent={
            <View style={styles.filtersRow}>
              {providerCategoryOptions.map((option) => {
                const active = option.slug === selectedCategory;
                return (
                  <Pressable
                    key={option.slug}
                    onPress={() => setSelectedCategory(option.slug)}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                  >
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          }
          renderItem={({ item }) => (
            <JobCard
              job={item}
              mode="provider"
              onPress={() => router.push(`/(app)/job/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="briefcase-search-outline" size={40} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>Bu an bölgende aktif ilan yok.</Text>
              <Text style={styles.emptySubtitle}>
                Bildirimler açıksa sizi haberdar edeceğiz.
              </Text>
              {!providerFeed.isConfigured && (
                <Text style={styles.apiNote}>API bağlantısı Phase 11 sonrası aktif olacak.</Text>
              )}
            </View>
          }
          onEndReached={() => {
            if (providerFeed.hasNextPage) {
              providerFeed.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.35}
          ListFooterComponent={
            providerFeed.isFetchingNextPage ? (
              <ActivityIndicator style={{ marginTop: spacing.sm }} color={colors.primary} />
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={providerFeed.isLoading}
              onRefresh={() => providerFeed.refetch()}
            />
          }
        />
      </View>
    );
  }

  const seekerJobs = seekerFeed.jobs;
  return (
    <View style={styles.container}>
      <FlatList
        data={seekerJobs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingTop: insets.top + spacing.md }]}
        renderItem={({ item }) => (
          <JobCard
            job={item}
            mode="seeker"
            onPress={() => router.push(`/(app)/job/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="post-outline" size={40} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>Henüz ilan vermedin.</Text>
            <View style={{ width: 220, marginTop: spacing.xs }}>
              <Button label="İlan Ver" onPress={() => router.push('/(app)/post')} fullWidth />
            </View>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={seekerFeed.isLoading}
            onRefresh={() => seekerFeed.refetch()}
          />
        }
      />

      <Pressable style={styles.fab} onPress={() => router.push('/(app)/post')}>
        <MaterialCommunityIcons name="plus" size={24} color={colors.surface} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerCardWrap: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: spacing.md },
  centerCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card, // 16px
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  centerTitle: { ...typography.sectionTitle, color: colors.textPrimary, textAlign: 'center' },
  centerSubtitle: { ...typography.secondary, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.sm },
  listContent: { padding: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  filtersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    backgroundColor: colors.surface,
    minHeight: 32,
    justifyContent: 'center',
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { ...typography.badge, color: colors.textSecondary },
  filterChipTextActive: { color: colors.surface },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl, gap: spacing.xs },
  emptyTitle: { ...typography.sectionTitle, color: colors.textPrimary, textAlign: 'center' },
  emptySubtitle: { ...typography.secondary, color: colors.textSecondary, textAlign: 'center' },
  apiNote: { ...typography.caption, color: colors.urgent, marginTop: 4 },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
});
