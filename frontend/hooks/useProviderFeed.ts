import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Job } from '@/types/database';
import { useAuth } from '@/context/AuthContext';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

const PAGE_SIZE = 20;

export function useProviderFeed(categoryFilter?: string) {
  const { session } = useAuth();

  const query = useInfiniteQuery({
    queryKey: ['provider-feed', categoryFilter ?? 'all', session?.access_token ?? 'no-session'],
    initialPageParam: 0,
    enabled: !!session?.access_token && !!API_BASE_URL,
    queryFn: async ({ pageParam }) => {
      const page = Number(pageParam ?? 0);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (categoryFilter && categoryFilter !== 'all') {
        params.set('category', categoryFilter);
      }

      const response = await fetch(`${API_BASE_URL}/jobs/feed?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${session!.access_token}`,
        },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Provider feed alinamadi.');
      }

      return (await response.json()) as Job[];
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length : undefined,
    refetchOnWindowFocus: false,
  });

  return {
    jobs: query.data?.pages.flat() ?? [],
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    refetch: query.refetch,
    isConfigured: !!API_BASE_URL,
  };
}
