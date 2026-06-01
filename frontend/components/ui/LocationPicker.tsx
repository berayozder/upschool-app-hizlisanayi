import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CITIES, getDistricts } from '@/constants/locations';
import { colors, radius, spacing, typography } from '@/constants/theme';

interface LocationPickerProps {
  city: string | null;
  district: string | null;
  onCityChange: (city: string) => void;
  onDistrictChange: (district: string | null) => void;
}

type PickerMode = 'city' | 'district' | null;

export default function LocationPicker({
  city,
  district,
  onCityChange,
  onDistrictChange,
}: LocationPickerProps) {
  const [openPicker, setOpenPicker] = useState<PickerMode>(null);
  const [query, setQuery] = useState('');

  const normalizedQuery = query.trim().toLocaleLowerCase('tr-TR');

  const filteredCities = useMemo(
    () =>
      CITIES.filter((item) =>
        item.toLocaleLowerCase('tr-TR').includes(normalizedQuery),
      ),
    [normalizedQuery],
  );

  const districts = useMemo(() => (city ? getDistricts(city) : []), [city]);

  const filteredDistricts = useMemo(
    () =>
      districts.filter((item) =>
        item.toLocaleLowerCase('tr-TR').includes(normalizedQuery),
      ),
    [districts, normalizedQuery],
  );

  const inCityMode = openPicker === 'city';
  const inDistrictMode = openPicker === 'district';

  function closeModal() {
    setOpenPicker(null);
    setQuery('');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>İl</Text>
      <Pressable style={styles.field} onPress={() => setOpenPicker('city')}>
        <Text style={[styles.fieldText, !city && styles.placeholder]}>
          {city ?? 'İl Seçin'}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textSecondary} />
      </Pressable>

      <Text style={[styles.label, styles.districtLabel]}>İlçe</Text>
      <Pressable
        style={[styles.field, !city && styles.fieldDisabled]}
        onPress={() => city && setOpenPicker('district')}
        disabled={!city}
      >
        <Text style={[styles.fieldText, !district && styles.placeholder]}>
          {district ?? 'İlçe Seçin'}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textSecondary} />
      </Pressable>

      <Modal
        visible={openPicker !== null}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.backdrop}>
          <View style={styles.modal}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>
                {inCityMode ? 'İl Seçin' : 'İlçe Seçin'}
              </Text>
              <Pressable onPress={closeModal} hitSlop={8}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>

            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder={inCityMode ? 'İl ara...' : 'İlçe ara...'}
              placeholderTextColor={colors.placeholder}
            />

            {inDistrictMode && city && districts.length === 0 ? (
              <View style={styles.emptyWrapper}>
                <Text style={styles.emptyText}>Bu il için ilçe verisi yakında eklenecek.</Text>
              </View>
            ) : (
              <FlatList
                data={inCityMode ? filteredCities : filteredDistricts}
                keyExtractor={(item) => item}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.row}
                    onPress={() => {
                      if (inCityMode) {
                        onCityChange(item);
                        onDistrictChange(null);
                      } else {
                        onDistrictChange(item);
                      }
                      closeModal();
                    }}
                  >
                    <Text style={styles.rowText}>{item}</Text>
                  </Pressable>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyWrapper}>
                    <Text style={styles.emptyText}>Sonuc bulunamadi.</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    ...typography.secondary,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  districtLabel: {
    marginTop: spacing.xs,
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
  fieldDisabled: {
    opacity: 0.55,
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
    maxHeight: '80%',
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
  searchInput: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  listContent: {
    gap: spacing.xs,
    paddingBottom: spacing.md,
  },
  row: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  rowText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  emptyWrapper: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.secondary,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
