import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useProviderProfile } from '@/hooks/useProviderProfile';
import Button from '@/components/ui/Button';
import { showToast } from '@/components/ui/Toast';
import { registerPushToken, deletePushToken } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { getCategoryBySlug } from '@/constants/categories';
import { ActiveRole } from '@/types/database';
import { colors, radius } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function maskPhone(phone: string): string {
  // +905XXXXXXXXX → +90 5XX XXX ** **
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return phone;
  const last10 = digits.slice(-10); // 5XXXXXXXXX
  return `+90 ${last10.slice(0, 3)} ${last10.slice(3, 6)} ** **`;
}

function maskVergiNo(vergiNo: string): string {
  if (vergiNo.length <= 4) return vergiNo;
  return vergiNo.slice(0, 4) + 'X'.repeat(vergiNo.length - 4);
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default function ProfileScreen() {
  const router = useRouter();
  const { session, profile, switchRole, signOut } = useAuth();
  const { providerProfile, isLoading: providerLoading } = useProviderProfile();

  const [editingName, setEditingName] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [savingName, setSavingName] = useState(false);

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);

  const [switchingRole, setSwitchingRole] = useState(false);

  const nameInputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();

  const userId = session?.user.id ?? profile?.id ?? '';

  // ─── Full name save ────────────────────────────────────────────────────────
  async function handleSaveName() {
    setEditingName(false);
    if (!session) return;
    const trimmed = fullName.trim();
    if (trimmed === (profile?.full_name ?? '')) return;

    setSavingName(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: trimmed || null, updated_at: new Date().toISOString() })
        .eq('id', session.user.id);
      if (error) throw error;
      showToast('İsim güncellendi.', 'success');
    } catch {
      showToast('İsim kaydedilemedi.', 'error');
    } finally {
      setSavingName(false);
    }
  }

  // ─── Role switch ───────────────────────────────────────────────────────────
  async function handleRoleSwitch(role: ActiveRole) {
    if (role === profile?.active_role || switchingRole) return;
    setSwitchingRole(true);
    try {
      await switchRole(role);
    } catch {
      showToast('Rol değiştirilemedi.', 'error');
    } finally {
      setSwitchingRole(false);
    }
  }

  // ─── Notification toggle ───────────────────────────────────────────────────
  async function handleNotifToggle(enabled: boolean) {
    setNotifLoading(true);
    try {
      if (enabled) {
        await registerPushToken(userId);
        setNotificationsEnabled(true);
        showToast('Bildirimler açıldı.', 'success');
      } else {
        await deletePushToken(userId);
        setNotificationsEnabled(false);
        showToast('Bildirimler kapatıldı.', 'info');
      }
    } catch {
      showToast('Bildirim ayarı değiştirilemedi.', 'error');
    } finally {
      setNotifLoading(false);
    }
  }

  // ─── Sign out ──────────────────────────────────────────────────────────────
  function handleSignOut() {
    Alert.alert('Çıkış Yap', 'Hesabınızdan çıkış yapmak istediğinizden emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Çıkış Yap',
        style: 'destructive',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  const activeRole = profile?.active_role ?? 'seeker';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitial}>
            {(profile?.full_name ?? profile?.phone ?? '?')[0].toUpperCase()}
          </Text>
        </View>
        <Text style={styles.headerTitle}>Profilim</Text>
      </View>

      {/* ── User Info ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Kişisel Bilgiler</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Telefon</Text>
          <Text style={styles.value}>{maskPhone(profile?.phone ?? '')}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Ad Soyad</Text>
          {editingName ? (
            <View style={styles.nameEditRow}>
              <TextInput
                ref={nameInputRef}
                style={styles.nameInput}
                value={fullName}
                onChangeText={setFullName}
                onBlur={handleSaveName}
                onSubmitEditing={handleSaveName}
                returnKeyType="done"
                autoFocus
                maxLength={60}
              />
              {savingName && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />}
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => {
                setEditingName(true);
                setTimeout(() => nameInputRef.current?.focus(), 50);
              }}
              style={styles.nameValueRow}
            >
              <Text style={styles.value}>
                {profile?.full_name?.trim() || 'Düzenlemek için dokunun'}
              </Text>
              <Text style={styles.editHint}>✏️</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Role Switcher ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Aktif Mod</Text>
        <View style={styles.segmentRow}>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeRole === 'seeker' && styles.segmentBtnActive,
            ]}
            onPress={() => handleRoleSwitch('seeker')}
            disabled={switchingRole}
            accessibilityLabel="Hizmet Arıyorum modu"
          >
            {switchingRole && activeRole !== 'seeker' ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text
                style={[
                  styles.segmentText,
                  activeRole === 'seeker' && styles.segmentTextActive,
                ]}
              >
                🔍 Hizmet Arıyorum
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeRole === 'provider' && styles.segmentBtnActive,
            ]}
            onPress={() => handleRoleSwitch('provider')}
            disabled={switchingRole}
            accessibilityLabel="Hizmet Veriyorum modu"
          >
            {switchingRole && activeRole !== 'provider' ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text
                style={[
                  styles.segmentText,
                  activeRole === 'provider' && styles.segmentTextActive,
                ]}
              >
                🏪 Hizmet Veriyorum
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Provider Status (if providerProfile exists) ── */}
      {providerLoading ? (
        <View style={styles.card}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : providerProfile ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>İşletme Bilgileri</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Firma Adı</Text>
            <Text style={styles.value}>{providerProfile.company_name}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Vergi No</Text>
            <Text style={styles.value}>{maskVergiNo(providerProfile.vergi_no)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Kategoriler</Text>
            <Text style={[styles.value, { flexShrink: 1, textAlign: 'right' }]}>
              {providerProfile.categories
                .map((slug) => getCategoryBySlug(slug)?.label_tr ?? slug)
                .join(', ')}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Hizmet Yarıçapı</Text>
            <Text style={styles.value}>{providerProfile.service_radius_km} km</Text>
          </View>

          {/* Verification status chip */}
          <View style={styles.statusRow}>
            {providerProfile.verification_status === 'pending' && (
              <View style={[styles.statusChip, styles.statusPending]}>
                <Text style={styles.statusChipText}>⏳ İnceleniyor</Text>
              </View>
            )}
            {providerProfile.verification_status === 'approved' && (
              <View style={[styles.statusChip, styles.statusApproved]}>
                <Text style={styles.statusChipText}>
                  ✓ Onaylı İşletme · {formatDate(providerProfile.verified_at)}
                </Text>
              </View>
            )}
            {providerProfile.verification_status === 'rejected' && (
              <View style={styles.rejectedContainer}>
                <View style={[styles.statusChip, styles.statusRejected]}>
                  <Text style={styles.statusChipText}>✗ Reddedildi</Text>
                </View>
                {providerProfile.rejection_reason ? (
                  <Text style={styles.rejectionReason}>{providerProfile.rejection_reason}</Text>
                ) : null}
                <View style={{ marginTop: 12 }}>
                  <Button
                    label="Tekrar Başvur"
                    variant="secondary"
                    onPress={() => router.push('/(app)/profile/provider-setup')}
                  />
                </View>
              </View>
            )}
          </View>
        </View>
      ) : (
        /* ── No provider profile: CTA to become provider ── */
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Hizmet Sağlayıcı Ol</Text>
          <Text style={styles.ctaDescription}>
            Kendi bölgenizdeki ilan fırsatlarını görün ve WhatsApp üzerinden teklif verin.
          </Text>
          <View style={{ marginTop: 16 }}>
            <Button
              label="Hizmet Sağlayıcı Ol"
              variant="secondary"
              onPress={() => router.push('/(app)/profile/provider-setup')}
            />
          </View>
        </View>
      )}

      {/* ── Notification Settings ── */}
      <View style={styles.card}>
        <View style={styles.notifRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.notifTitle}>Yeni ilan bildirimleri</Text>
            <Text style={styles.notifSubtitle}>
              Bölgenizde yeni ilan geldiğinde bildirim alın
            </Text>
          </View>
          {notifLoading ? (
            <ActivityIndicator size="small" color="#F97316" />
          ) : (
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotifToggle}
              trackColor={{ true: colors.primary, false: '#E5E7EB' }}
              thumbColor={notificationsEnabled ? '#fff' : '#9CA3AF'}
              accessibilityLabel="Bildirim ayarı"
            />
          )}
        </View>
      </View>

      {/* ── Sign Out ── */}
      <View style={styles.signOutContainer}>
        <Button
          label="Çıkış Yap"
          variant="destructive"
          onPress={handleSignOut}
          fullWidth
        />
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background, // #F1F5F9
  },
  content: {
    padding: 16,
  },

  // ── Header ──
  header: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary, // #1D4ED8
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarInitial: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },

  // ── Card ──
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card, // 16px
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  // ── Rows ──
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },

  // ── Name editing ──
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
    justifyContent: 'flex-end',
  },
  nameInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.primary, // #1D4ED8
    paddingBottom: 2,
    textAlign: 'right',
  },
  nameValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
    justifyContent: 'flex-end',
    gap: 6,
  },
  editHint: {
    fontSize: 13,
  },

  // ── Role Segment ──
  segmentRow: {
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.primary, // #1D4ED8
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  segmentBtnActive: {
    backgroundColor: colors.primary, // #1D4ED8
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary, // #1D4ED8
  },
  segmentTextActive: {
    color: colors.surface,
  },

  // ── Provider status ──
  statusRow: {
    marginTop: 12,
  },
  statusChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusPending: {
    backgroundColor: colors.neutralBg, // #F8FAFC
  },
  statusApproved: {
    backgroundColor: colors.successBg, // #F0FDF4
  },
  statusRejected: {
    backgroundColor: colors.errorBg, // #FEF2F2
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  rejectedContainer: {},
  rejectionReason: {
    marginTop: 8,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },

  // ── Provider CTA ──
  ctaDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },

  // ── Notifications ──
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  notifSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },

  // ── Sign out ──
  signOutContainer: {
    marginTop: 8,
  },
});
