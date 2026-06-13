import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { ProviderProfile } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import * as FileSystem from 'expo-file-system/legacy';

export interface ProviderProfileInput {
  company_name: string;
  vergi_no: string;
  categories: string[];
  city: string;
  district: string | null;
  service_radius_km: number;
  vergi_levhasi_url?: string | null;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  if (typeof atob === 'function') {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
  
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }
  
  let bufferLength = base64.length * 0.75;
  if (base64[base64.length - 1] === '=') {
    bufferLength--;
    if (base64[base64.length - 2] === '=') {
      bufferLength--;
    }
  }
  
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const bytes = new Uint8Array(arrayBuffer);
  
  let p = 0;
  for (let i = 0; i < base64.length; i += 4) {
    const encoded1 = lookup[base64.charCodeAt(i)];
    const encoded2 = lookup[base64.charCodeAt(i + 1)];
    const encoded3 = lookup[base64.charCodeAt(i + 2)];
    const encoded4 = lookup[base64.charCodeAt(i + 3)];
    
    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    if (p < bufferLength) {
      bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    }
    if (p < bufferLength) {
      bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }
  }
  
  return arrayBuffer;
}

export function useProviderProfile() {
  const { session, switchRole } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  const providerQuery = useQuery({
    queryKey: ['provider-profile', userId],
    enabled: !!userId,
    queryFn: async (): Promise<ProviderProfile | null> => {
      const { data, error } = await supabase
        .from('provider_profiles')
        .select('*')
        .eq('id', userId!)
        .maybeSingle();

      if (error) throw error;
      return data ?? null;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (uri: string): Promise<string> => {
      if (!userId) throw new Error('Oturum bulunamadi.');

      const extension = uri.toLowerCase().includes('.pdf') ? 'pdf' : 'jpg';
      const path = `${userId}/levha.${extension}`;
      
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const fileBlob = base64ToArrayBuffer(base64);

      const { error } = await supabase.storage
        .from('vergi-levhasi')
        .upload(path, fileBlob, {
          contentType: extension === 'pdf' ? 'application/pdf' : 'image/jpeg',
          upsert: true,
        });

      if (error) throw error;
      return path;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (payload: ProviderProfileInput) => {
      if (!userId) throw new Error('Oturum bulunamadi.');

      const { error } = await supabase.from('provider_profiles').upsert(
        {
          id: userId,
          ...payload,
          verification_status: 'pending',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      );

      if (error) {
        if ((error as { code?: string }).code === '23505') {
          throw new Error('Bu vergi numarasi zaten kayitli.');
        }
        throw error;
      }

      await switchRole('provider');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['provider-profile', userId] });
    },
  });

  return {
    providerProfile: providerQuery.data ?? null,
    isLoading: providerQuery.isLoading,
    submitProfile: submitMutation.mutateAsync,
    uploadLevha: uploadMutation.mutateAsync,
    isSubmitting: submitMutation.isPending || uploadMutation.isPending,
  };
}
