import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Button from '@/components/ui/Button';
import LocationPicker from '@/components/ui/LocationPicker';
import { CATEGORIES } from '@/constants/categories';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { pickAndCompress } from '@/lib/imageCompressor';
import { useProviderProfile } from '@/hooks/useProviderProfile';
import { showToast } from '@/components/ui/Toast';

const RADIUS_OPTIONS = [10, 25, 50, 100, 200, 500];

function isVergiNoValid(value: string): boolean {
  return /^\d{10}$/.test(value);
}

export default function ProviderSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { submitProfile, uploadLevha, isSubmitting } = useProviderProfile();

  const [companyName, setCompanyName] = useState('');
  const [vergiNo, setVergiNo] = useState('');
  const [vergiNoError, setVergiNoError] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [city, setCity] = useState<string | null>(null);
  const [district, setDistrict] = useState<string | null>(null);
  const [serviceRadius, setServiceRadius] = useState(50);
  const [levhaUri, setLevhaUri] = useState<string | null>(null);
  const [levhaLabel, setLevhaLabel] = useState<string | null>(null);

  const submitDisabled = useMemo(
    () =>
      !companyName.trim() ||
      !isVergiNoValid(vergiNo) ||
      selectedCategories.length === 0 ||
      !city ||
      !levhaUri ||
      isSubmitting,
    [companyName, vergiNo, selectedCategories.length, city, levhaUri, isSubmitting, serviceRadius],
  );

  function toggleCategory(slug: string) {
    setSelectedCategories((prev) =>
      prev.includes(slug) ? prev.filter((item) => item !== slug) : [...prev, slug],
    );
  }

  async function pickLevha() {
    Alert.alert('Belge Sec', 'Yukleme turunu secin.', [
      {
        text: 'Fotograf',
        onPress: async () => {
          const compressed = await pickAndCompress();
          if (!compressed) return;
          setLevhaUri(compressed);
          setLevhaLabel('levha.jpg');
        },
      },
      {
        text: 'PDF',
        onPress: async () => {
          const doc = await DocumentPicker.getDocumentAsync({
            type: 'application/pdf',
            copyToCacheDirectory: true,
            multiple: false,
          });
          if (doc.canceled || !doc.assets?.[0]) return;
          setLevhaUri(doc.assets[0].uri);
          setLevhaLabel(doc.assets[0].name ?? 'levha.pdf');
        },
      },
      { text: 'Vazgec', style: 'cancel' },
    ]);
  }

  async function onSubmit() {
    if (!isVergiNoValid(vergiNo)) {
      setVergiNoError('Vergi no 10 haneli olmalidir.');
      return;
    }

    if (!levhaUri || !city) return;

    try {
      const storagePath = await uploadLevha(levhaUri);
      await submitProfile({
        company_name: companyName.trim(),
        vergi_no: vergiNo,
        categories: selectedCategories,
        city,
        district,
        service_radius_km: serviceRadius,
        vergi_levhasi_url: storagePath,
      });
      showToast('Basvurunuz alindi. 24 saat icinde onaylanacak.', 'success');
      router.replace('/(app)/profile');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Basvuru gonderilemedi.';
      if (msg.toLowerCase().includes('vergi numarasi zaten')) {
        setVergiNoError('Bu vergi numarasi zaten kayitli.');
        return;
      }
      Alert.alert('Hata', msg);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>Saglayici Basvurusu</Text>

        <Text style={styles.label}>Sirket Adi</Text>
        <TextInput
          style={styles.input}
          value={companyName}
          onChangeText={setCompanyName}
          placeholder="Ornek Makina Sanayi"
          placeholderTextColor={colors.placeholder}
        />

        <Text style={styles.label}>Vergi No</Text>
        <TextInput
          style={[styles.input, !!vergiNoError && styles.inputError]}
          value={vergiNo}
          onChangeText={(text) => {
            setVergiNoError(null);
            setVergiNo(text.replace(/\D/g, '').slice(0, 10));
          }}
          onBlur={() => {
            if (!isVergiNoValid(vergiNo)) {
              setVergiNoError('Vergi no 10 haneli olmalidir.');
            }
          }}
          keyboardType="numeric"
          placeholder="1234567890"
          placeholderTextColor={colors.placeholder}
        />
        {vergiNoError ? <Text style={styles.errorText}>{vergiNoError}</Text> : null}

        <Text style={styles.label}>Hizmet Kategorileri</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((category) => {
            const selected = selectedCategories.includes(category.slug);
            return (
              <Pressable
                key={category.slug}
                style={[styles.categoryCard, selected && styles.categoryCardSelected]}
                onPress={() => toggleCategory(category.slug)}
              >
                <MaterialCommunityIcons
                  name={category.icon_name as keyof typeof MaterialCommunityIcons.glyphMap}
                  size={18}
                  color={selected ? colors.primary : colors.textSecondary}
                />
                <Text style={styles.categoryText} numberOfLines={2}>
                  {category.label_tr}
                </Text>
                {selected && (
                  <MaterialCommunityIcons name="check-circle" size={18} color={colors.primary} />
                )}
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Konum</Text>
        <LocationPicker
          city={city}
          district={district}
          onCityChange={setCity}
          onDistrictChange={setDistrict}
        />

        <Text style={styles.label}>Servis Yaricapi</Text>
        <View style={styles.radiusWrap}>
          {RADIUS_OPTIONS.map((item) => {
            const active = item === serviceRadius;
            return (
              <Pressable
                key={item}
                onPress={() => setServiceRadius(item)}
                style={[styles.radiusChip, active && styles.radiusChipActive]}
              >
                <Text style={[styles.radiusChipText, active && styles.radiusChipTextActive]}>
                  {item} km
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.radiusInfo}>
          {serviceRadius} km yaricapindaki ilanlari goreceksiniz.
        </Text>

        <Text style={styles.label}>Vergi Levhasi</Text>
        <Pressable style={styles.uploadBox} onPress={pickLevha}>
          <MaterialCommunityIcons name="file-upload-outline" size={20} color={colors.primary} />
          <Text style={styles.uploadText}>{levhaLabel ?? 'Belge Yukle'}</Text>
        </Pressable>

        <Button
          label="Basvuruyu Gonder"
          onPress={onSubmit}
          loading={isSubmitting}
          disabled={submitDisabled}
          fullWidth
        />
      </ScrollView>

      {isSubmitting && (
        <View style={styles.overlay}>
          <ActivityIndicator color={colors.surface} />
          <Text style={styles.overlayText}>Yukleniyor...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  title: {
    ...typography.pageTitle,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.secondary,
    color: colors.textPrimary,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: -4,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  categoryCard: {
    width: '48.5%',
    minHeight: 78,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  categoryCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
  },
  categoryText: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  radiusWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  radiusChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  radiusChipActive: {
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
  },
  radiusChipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  radiusChipTextActive: {
    color: colors.primary,
  },
  radiusInfo: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  uploadBox: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  uploadText: {
    ...typography.secondary,
    color: colors.textPrimary,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  overlayText: {
    ...typography.secondary,
    color: colors.surface,
    fontWeight: '600',
  },
});
