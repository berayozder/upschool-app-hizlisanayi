import NetInfo from '@react-native-community/netinfo';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Job } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import * as FileSystem from 'expo-file-system/legacy';

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

async function uploadPhotoWithRetry(path: string, uri: string) {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const arrayBuffer = base64ToArrayBuffer(base64);

  const first = await supabase.storage.from('job-photos').upload(path, arrayBuffer, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (!first.error) return;

  const second = await supabase.storage.from('job-photos').upload(path, arrayBuffer, {
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
