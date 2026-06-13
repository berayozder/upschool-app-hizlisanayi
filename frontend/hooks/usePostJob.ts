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
  // Fallback: Generate a standard UUID v4 compliant string
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function uriToBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = function () {
      resolve(xhr.response);
    };
    xhr.onerror = function () {
      reject(new TypeError('Network request failed'));
    };
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}

async function uploadPhotoWithRetry(path: string, uri: string) {
  const blob = await uriToBlob(uri);

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
