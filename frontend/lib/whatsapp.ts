import { Alert, Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Job } from '@/types/database';

export function buildWhatsAppUrl(seekerPhone: string, jobTitle: string): string {
  const phone = seekerPhone.replace('+', '');
  const message = `Merhaba! Hizlisanayi uzerinden "${jobTitle}" ilaninizi gordum ve teklif vermek istiyorum. Musait misiniz?`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export async function openWhatsApp(seekerPhone: string, jobTitle: string): Promise<void> {
  const url = buildWhatsAppUrl(seekerPhone, jobTitle);
  const canOpen = await Linking.canOpenURL(url);

  if (!canOpen) {
    Alert.alert('WhatsApp bulunamadi', 'Numarayi kopyalayarak iletisime gecebilirsiniz.', [
      {
        text: 'Numarayi Kopyala',
        onPress: async () => {
          await Clipboard.setStringAsync(seekerPhone);
        },
      },
      { text: 'Vazgec', style: 'cancel' },
    ]);
    return;
  }

  await Linking.openURL(url);
}

export async function logAndOpenWhatsApp(
  job: Job,
  providerId: string,
  supabaseClient: any,
): Promise<void> {
  if (!job.seeker_phone) {
    throw new Error('Seeker phone missing');
  }

  supabaseClient
    .from('contact_logs')
    .insert({
      job_id: job.id,
      provider_id: providerId,
      seeker_id: job.seeker_id,
    })
    .then(() => undefined)
    .catch((error: any) => {
      if (error?.code === '23505') return;
    });

  await openWhatsApp(job.seeker_phone, job.title);
}
