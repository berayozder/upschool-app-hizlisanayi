import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Button from '@/components/ui/Button';
import CategoryPicker from '@/components/ui/CategoryPicker';
import LocationPicker from '@/components/ui/LocationPicker';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pickAndCompress } from '@/lib/imageCompressor';
import { getCategoryBySlug } from '@/constants/categories';
import { usePostJob } from '@/hooks/usePostJob';
import { showToast } from '@/components/ui/Toast';
import { registerPushToken } from '@/lib/notifications';
import { useAuth } from '@/context/AuthContext';

const MAX_PHOTOS = 3;
const MAX_DESCRIPTION = 500;

export default function PostScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { postJob, isPosting } = usePostJob();
  const insets = useSafeAreaInsets();

  const [photos, setPhotos] = useState<Array<string | null>>([null, null, null]);
  const [categorySlug, setCategorySlug] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [district, setDistrict] = useState<string | null>(null);
  const [description, setDescription] = useState('');

  const selectedPhotoUris = useMemo(
    () => photos.filter((uri): uri is string => !!uri),
    [photos],
  );

  const isSubmitDisabled = selectedPhotoUris.length === 0 || !categorySlug || !city || isPosting;

  async function onPickPhoto(index: number) {
    const uri = await pickAndCompress();
    if (!uri) return;
    setPhotos((prev) => {
      const next = [...prev];
      next[index] = uri;
      return next;
    });
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  }

  async function onSubmit() {
    if (!categorySlug || !city || selectedPhotoUris.length === 0) return;
    const category = getCategoryBySlug(categorySlug);
    const title = `${category?.label_tr ?? 'Is'} - ${city}`;

    try {
      const newJob = await postJob({
        category_slug: categorySlug,
        title,
        description,
        city,
        district,
        localPhotoUris: selectedPhotoUris,
      });
      await registerPushToken(profile?.id ?? '');
      showToast('Ilaniniz yayinlandi!', 'success');
      router.replace(`/(app)/job/${newJob.id}`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Ilan yayinlanamadi.';
      if (msg === 'OFFLINE') {
        showToast('Internet baglantisi yok. Lutfen tekrar deneyin.', 'error');
      } else if (msg.startsWith('PHOTO_UPLOAD_FAILED_')) {
        showToast('Fotograf yuklenemedi. Tekrar deneyin.', 'error');
      } else {
        showToast('Ilan yayinlanamadi. Tekrar deneyin.', 'error');
      }
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>Ilan Ver</Text>

        <Text style={styles.label}>Fotograflar</Text>
        <View style={styles.photoRow}>
          {Array.from({ length: MAX_PHOTOS }).map((_, index) => {
            const uri = photos[index];
            return (
              <Pressable
                key={index}
                style={styles.photoBox}
                onPress={() => (uri ? undefined : onPickPhoto(index))}
              >
                {uri ? (
                  <>
                    <Image source={{ uri }} style={styles.photoThumb} contentFit="cover" />
                    <Pressable style={styles.removeBtn} onPress={() => removePhoto(index)}>
                      <MaterialCommunityIcons name="close" size={14} color={colors.surface} />
                    </Pressable>
                  </>
                ) : (
                  <View style={styles.photoEmpty}>
                    <MaterialCommunityIcons name="camera-outline" size={20} color={colors.primary} />
                    <Text style={styles.photoEmptyText}>Fotograf Ekle</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        <CategoryPicker value={categorySlug} onChange={setCategorySlug} label="Kategori" />

        <LocationPicker
          city={city}
          district={district}
          onCityChange={setCity}
          onDistrictChange={setDistrict}
        />

        <Text style={styles.label}>Aciklama</Text>
        <View style={styles.descriptionWrap}>
          <TextInput
            style={styles.descriptionInput}
            value={description}
            onChangeText={(text) => setDescription(text.slice(0, MAX_DESCRIPTION))}
            multiline
            placeholder="Teknik detaylar, olculer, aciliyet..."
            placeholderTextColor={colors.placeholder}
          />
          <Text style={styles.counter}>{description.length}/{MAX_DESCRIPTION}</Text>
        </View>

        <Text style={styles.kvkk}>
          Onayli firmalar ilaninizi ve telefon numaranizi gorebilir.
        </Text>

        <Button
          label="Teklif Al"
          onPress={onSubmit}
          fullWidth
          disabled={isSubmitDisabled}
          loading={isPosting}
        />
      </ScrollView>

      {isPosting && (
        <View style={styles.overlay}>
          <ActivityIndicator color={colors.surface} />
          <Text style={styles.overlayText}>Ilan yayinlaniyor...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  title: { ...typography.pageTitle, color: colors.textPrimary }, // 28/bold
  label: { ...typography.secondary, color: colors.textPrimary, fontWeight: '600' },
  photoRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  photoBox: {
    width: '31%',
    aspectRatio: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.photo, // 10px thumbnail radius
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  photoEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    gap: 4,
  },
  photoEmptyText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  photoThumb: { width: '100%', height: '100%' },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
  },
  descriptionWrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md, // 14px
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    minHeight: 132,
  },
  descriptionInput: {
    ...typography.body,
    color: colors.textPrimary,
    minHeight: 92,
    textAlignVertical: 'top',
  },
  counter: {
    ...typography.caption,
    color: colors.textSecondary,
    alignSelf: 'flex-end',
  },
  kvkk: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: -4,
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
