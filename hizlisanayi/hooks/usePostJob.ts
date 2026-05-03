import NetInfo from '@react-native-community/netinfo';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Job } from '@/types/database';
import { useAuth } from '@/context/AuthContext';

export interface PostJobInput {
  category_slug: string;
  title: string;
  description: string;
  city: string;
  district: string | null;
  localPhotoUris: string[];
}

function generateJobId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `job-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function uploadPhotoWithRetry(path: string, uri: string) {
  const response = await fetch(uri);
  const blob = await response.blob();

  const first = await supabase.storage.from('job-photos').upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (!first.error) return;

  const second = await supabase.storage.from('job-photos').upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (second.error) {
    throw second.error;
  }
}

export function usePostJob() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  const mutation = useMutation({
    mutationFn: async (data: PostJobInput): Promise<Job> => {
      const net = await NetInfo.fetch();
      if (!net.isConnected) {
        throw new Error('OFFLINE');
      }

      if (!session?.user?.id) {
        throw new Error('AUTH_REQUIRED');
      }

      const newJobId = generateJobId();
      const uploadedUrls: string[] = [];

      for (let i = 0; i < data.localPhotoUris.length; i += 1) {
        const uri = data.localPhotoUris[i];
        const path = `${newJobId}/${i}.jpg`;
        try {
          await uploadPhotoWithRetry(path, uri);
        } catch (error) {
          throw new Error(`PHOTO_UPLOAD_FAILED_${i + 1}`);
        }

        const { data: publicData } = supabase.storage.from('job-photos').getPublicUrl(path);
        uploadedUrls.push(publicData.publicUrl);
      }

      const { data: inserted, error: insertError } = await supabase
        .from('jobs')
        .insert({
          id: newJobId,
          seeker_id: session.user.id,
          category_slug: data.category_slug,
          title: data.title,
          description: data.description || null,
          city: data.city,
          district: data.district,
          photo_urls: uploadedUrls,
        })
        .select('*')
        .single();

      if (insertError) throw insertError;
      return inserted as Job;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-jobs'] });
    },
  });

  return {
    postJob: mutation.mutateAsync,
    isPosting: mutation.isPending,
    error: mutation.error,
  };
}
