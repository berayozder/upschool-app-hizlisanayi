import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Job } from '@/types/database';
import { useAuth } from '@/context/AuthContext';

type RawJob = Job & {
  profiles?: { phone?: string; full_name?: string | null } | null;
  contact_count?: Array<{ count?: number }>;
};

export type JobDetail = Job & { contact_count?: number };

export function useJobDetail(jobId: string) {
  const { session, profile } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id ?? (profile?.id !== 'dev-user' ? profile?.id : undefined);

  const query = useQuery({
    queryKey: ['job', jobId],
    enabled: !!jobId,
    queryFn: async (): Promise<JobDetail> => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*, profiles:profiles!seeker_id(phone, full_name), contact_count:contact_logs(count)')
        .eq('id', jobId)
        .single();

      if (error) throw error;
      const raw = data as RawJob;
      return {
        ...raw,
        seeker_phone: raw.profiles?.phone,
        seeker_name: raw.profiles?.full_name ?? null,
        contact_count: raw.contact_count?.[0]?.count ?? 0,
      };
    },
  });

  const closeMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('AUTH_REQUIRED');

      const { error } = await supabase
        .from('jobs')
        .update({ status: 'closed', updated_at: new Date().toISOString() })
        .eq('id', jobId)
        .eq('seeker_id', userId);

      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-jobs'] });
      await queryClient.invalidateQueries({ queryKey: ['job', jobId] });
    },
  });

  return {
    job: query.data ?? null,
    isLoading: query.isLoading,
    closeJob: closeMutation.mutateAsync,
    isClosing: closeMutation.isPending,
  };
}
