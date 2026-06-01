import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { ProviderProfile } from '@/types/database';
import { useAuth } from '@/context/AuthContext';

export interface ProviderProfileInput {
  company_name: string;
  vergi_no: string;
  categories: string[];
  city: string;
  district: string | null;
  service_radius_km: number;
  vergi_levhasi_url?: string | null;
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
      const response = await fetch(uri);
      const fileBlob = await response.blob();

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
