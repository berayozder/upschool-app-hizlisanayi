import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CATEGORIES, getCategoryBySlug } from '@/constants/categories';
import { colors, radius, spacing, typography } from '@/constants/theme';

interface CategoryPickerProps {
  value: string | null;
  onChange: (slug: string) => void;
  label?: string;
}

export default function CategoryPicker({
  value,
  onChange,
  label = 'Kategori',
}: CategoryPickerProps) {
  const [open, setOpen] = useState(false);

  const selectedCategory = useMemo(
    () => (value ? getCategoryBySlug(value) : undefined),
    [value],
  );

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.field} onPress={() => setOpen(true)}>
        <Text style={[styles.fieldText, !selectedCategory && styles.placeholder]}>
          {selectedCategory?.label_tr ?? 'Kategori Seçin'}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textSecondary} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.modal}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Kategori Seçin</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.rows}>
              {CATEGORIES.map((category) => {
                const selected = category.slug === value;
                return (
                  <Pressable
                    key={category.slug}
                    style={styles.row}
                    onPress={() => {
                      onChange(category.slug);
                      setOpen(false);
                    }}
                  >
                    <View style={styles.rowLeft}>
                      <MaterialCommunityIcons
                        name={category.icon_name as keyof typeof MaterialCommunityIcons.glyphMap}
                        size={20}
                        color={colors.primary}
                      />
                      <Text style={styles.rowLabel}>{category.label_tr}</Text>
                      {category.urgency_level === 'urgent' && (
                        <View style={styles.urgentBadge}>
                          <Text style={styles.urgentBadgeText}>ACİL</Text>
                        </View>
                      )}
                    </View>
                    {selected && (
                      <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.secondary,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  field: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  placeholder: {
    color: colors.placeholder,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  modal: {
    maxHeight: '75%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  rows: {
    gap: spacing.xs,
    paddingBottom: spacing.md,
  },
  row: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  rowLabel: {
    ...typography.body,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  urgentBadge: {
    backgroundColor: colors.error,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  urgentBadgeText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: '700',
  },
});
