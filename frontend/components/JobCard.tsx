import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Job } from '@/types/database';
import { getCategoryBySlug, URGENT_SLUGS } from '@/constants/categories';
import { colors, radius, spacing, typography } from '@/constants/theme';

type JobCardMode = 'seeker' | 'provider';

interface JobCardProps {
  job: Job & { contactCount?: number };
  mode: JobCardMode;
  onPress: () => void;
}

function formatTimeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}

/** Status pill data using paired bg tokens from ui-choices.md */
function statusPill(status: Job['status']): { text: string; bg: string; color: string } {
  switch (status) {
    case 'active':
      return { text: 'Aktif', bg: colors.successBg, color: colors.success };
    case 'expired':
      return { text: 'Süresi Doldu', bg: colors.neutralBg, color: colors.neutral };
    default:
      return { text: 'Kapalı', bg: colors.errorBg, color: colors.error };
  }
}

export default function JobCard({ job, mode, onPress }: JobCardProps) {
  const category = getCategoryBySlug(job.category_slug);
  const urgent = URGENT_SLUGS.includes(job.category_slug);
  const status = statusPill(job.status);
  const isInactive = job.status !== 'active';

  return (
    <Pressable
      style={[styles.card, isInactive && styles.cardInactive]}
      onPress={onPress}
    >
      {/* ── Top row: category chip + time ── */}
      <View style={styles.topRow}>
        <View style={[styles.categoryChip, urgent && styles.categoryChipUrgent]}>
          <Text style={[styles.categoryChipText, urgent && styles.categoryChipTextUrgent]}>
            {(category?.label_tr ?? job.category_slug).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.time}>{formatTimeAgo(job.created_at)}</Text>
      </View>

      {/* ── Photo + content row ── */}
      <View style={styles.body}>
        <View style={styles.left}>
          {job.photo_urls?.[0] ? (
            <Image source={{ uri: job.photo_urls[0] }} style={styles.thumb} contentFit="cover" />
          ) : (
            <View style={styles.thumbFallback}>
              <MaterialCommunityIcons
                name={(category?.icon_name as keyof typeof MaterialCommunityIcons.glyphMap) || 'briefcase'}
                size={26}
                color={colors.primary}
              />
            </View>
          )}
        </View>

        <View style={styles.right}>
          {/* Job title — 17/semibold, wrap to 2 lines */}
          <Text style={styles.title} numberOfLines={2}>
            {job.title}
          </Text>

          {/* Location — 14/regular muted */}
          <Text style={styles.location}>
            {job.city}{job.district ? ` · ${job.district}` : ''}
          </Text>

          {/* Bottom chips */}
          <View style={styles.bottomRow}>
            {mode === 'provider' && typeof job.distance_km === 'number' && (
              <View style={styles.distanceChip}>
                <Text style={styles.distanceText}>{Math.round(job.distance_km)} km</Text>
              </View>
            )}

            {mode === 'seeker' && (
              <>
                <View style={[styles.statusChip, { backgroundColor: status.bg }]}>
                  <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
                </View>
                {(job.contactCount ?? 0) > 0 && (
                  <Text style={styles.contactCount}>{job.contactCount} firma ilgilendi</Text>
                )}
              </>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card, // 16px
    borderWidth: 1,
    borderColor: colors.border, // #CBD5E1
    padding: spacing.md,       // 16px
    marginBottom: spacing.sm,
    // Subtle shadow — prefer border over heavy shadow
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  /** Expired / closed: reduce opacity, no CTA shown */
  cardInactive: {
    opacity: 0.5,
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },

  // Category badge
  categoryChip: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
  },
  categoryChipUrgent: {
    backgroundColor: colors.urgentBg,
  },
  categoryChipText: {
    ...typography.badge,         // 12/semibold
    color: colors.primary,
    letterSpacing: 0.5,
  },
  categoryChipTextUrgent: {
    color: colors.urgent,
  },

  time: { ...typography.caption, color: colors.textMuted },

  body: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  left: { width: 80 },
  thumb: { width: 80, height: 80, borderRadius: radius.photo }, // 10px
  thumbFallback: {
    width: 80,
    height: 80,
    borderRadius: radius.photo,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  right: { flex: 1, gap: 6 },

  /** Card title — 17/semibold, up to 2 lines */
  title: { ...typography.cardTitle, color: colors.textPrimary },

  location: { ...typography.secondary, color: colors.textSecondary },

  bottomRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },

  distanceChip: {
    backgroundColor: '#FEF3C7',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
  },
  distanceText: { ...typography.badge, color: '#92400E' },

  statusChip: { borderRadius: radius.pill, paddingHorizontal: spacing.xs, paddingVertical: 3 },
  statusText: { ...typography.badge },

  contactCount: { ...typography.caption, color: colors.textSecondary },
});
