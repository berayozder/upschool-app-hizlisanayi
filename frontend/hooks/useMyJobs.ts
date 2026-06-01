import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Job } from '@/types/database';
import { useAuth } from '@/context/AuthContext';

type JobWithContactAgg = Job & { contact_count?: Array<{ count?: number }> };
export type SeekerJob = Job & { contactCount: number };

export function useMyJobs() {
  const { session, profile } = useAuth();
  const userId = session?.user.id ?? (profile?.id && profile.id !== 'dev-user' ? profile.id : undefined);

  const query = useQuery({
    queryKey: ['my-jobs', userId ?? 'no-user'],
    enabled: !!userId,
    queryFn: async (): Promise<SeekerJob[]> => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*, contact_count:contact_logs(count)')
        .eq('seeker_id', userId!)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return ((data ?? []) as JobWithContactAgg[]).map((job) => ({
        ...job,
        contactCount: job.contact_count?.[0]?.count ?? 0,
      }));
    },
  });

  return {
    jobs: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
