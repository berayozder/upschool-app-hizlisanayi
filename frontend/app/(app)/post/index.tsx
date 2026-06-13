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
import { colors, radius, size, spacing, typography } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pickAndCompress } from '@/lib/imageCompressor';
import { getCategoryBySlug } from '@/constants/categories';
import { usePostJob } from '@/hooks/usePostJob';
import { showToast } from '@/components/ui/Toast';
import { registerPushToken } from '@/lib/notifications';
import { useAuth } from '@/context/AuthContext';

const MAX_PHOTOS = 3;
const MAX_DESCRIPTION = 500;
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

export default function PostScreen() {
  const router = useRouter();
  const { profile, session } = useAuth();
  const { postJob, isPosting } = usePostJob();
  const insets = useSafeAreaInsets();

  const [photos, setPhotos] = useState<Array<string | null>>([null, null, null]);
  const [categorySlug, setCategorySlug] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [district, setDistrict] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  const selectedPhotoUris = useMemo(
    () => photos.filter((uri): uri is string => !!uri),
    [photos],
  );

  const isSubmitDisabled =
    selectedPhotoUris.length === 0 ||
    !categorySlug ||
    !city ||
    isPosting ||
    isRefining;

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

  async function onRefineWithAI() {
    const trimmedDesc = description.trim();
    if (!trimmedDesc) {
      showToast('Yapay zekanın düzenlemesi için önce bir açıklama yazmalısın.', 'info');
      return;
    }

    if (!API_BASE_URL || !session?.access_token) {
      showToast('Bağlantı kurulamadı. Lütfen oturumunuzu kontrol edin.', 'error');
      return;
    }

    setIsRefining(true);
    try {
      const response = await fetch(`${API_BASE_URL}/jobs/refine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ description: trimmedDesc }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Yapay zeka yanıt vermedi.');
      }

      const result = await response.json();

      if (result.refined_description) {
        setDescription(result.refined_description);
      }
      if (result.suggested_category) {
        setCategorySlug(result.suggested_category);
      }

      showToast('Yapay zeka ilanınızı düzenledi!', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Yapay zeka işlemi başarısız.';
      showToast(msg, 'error');
    } finally {
      setIsRefining(false);
    }
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
      setPhotos([null, null, null]);
      setCategorySlug(null);
      setCity(null);
      setDistrict(null);
      setDescription('');
      router.replace(`/(app)/job/${newJob.id}`);
    } catch (error: unknown) {
      console.error('[PostJobError] Failed to post job:', error);
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

        <Pressable
          style={[
            styles.aiButton,
            (!description.trim() || isRefining || isPosting) && styles.aiButtonDisabled,
          ]}
          onPress={onRefineWithAI}
          disabled={!description.trim() || isRefining || isPosting}
        >
          {isRefining ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 6 }} />
          ) : (
            <MaterialCommunityIcons name="auto-fix" size={18} color={colors.primary} style={{ marginRight: 6 }} />
          )}
          <Text style={styles.aiButtonText}>
            {isRefining ? 'Yapay Zeka Düzenliyor...' : 'Yapay Zeka ile İlanı Düzenle 🪄'}
          </Text>
        </Pressable>

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
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: 'rgba(29, 78, 216, 0.15)',
    borderRadius: radius.md,
    height: size.inputHeight,
    marginTop: spacing.xs,
  },
  aiButtonDisabled: {
    opacity: 0.5,
    backgroundColor: colors.background,
    borderColor: colors.border,
  },
  aiButtonText: {
    ...typography.button,
    color: colors.primary,
  },
});
