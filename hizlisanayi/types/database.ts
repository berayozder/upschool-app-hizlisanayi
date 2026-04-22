export interface Profile {
  id: string;
  phone: string;
  full_name: string | null;
  active_role: 'seeker' | 'provider';
  created_at: string;
  updated_at: string;
}

export interface ProviderProfile {
  id: string;
  company_name: string;
  vergi_no: string;
  vergi_levhasi_url: string | null;
  verification_status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  categories: string[];
  city: string;
  district: string | null;
  service_radius_km: number;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  slug: string;
  label_tr: string;
  icon_name: string;
  urgency_level: 'standard' | 'urgent';
  sort_order: number;
}

export interface Job {
  id: string;
  seeker_id: string;
  category_slug: string;
  title: string;
  description: string | null;
  city: string;
  district: string | null;
  photo_urls: string[];
  status: 'active' | 'closed' | 'expired';
  expires_at: string;
  created_at: string;
  // joined fields
  seeker_phone?: string;
  seeker_name?: string | null;
  distance_km?: number;
}

export interface ContactLog {
  id: string;
  job_id: string;
  provider_id: string;
  seeker_id: string;
  created_at: string;
}

export interface PushToken {
  id: string;
  user_id: string;
  token: string;
  platform: 'ios' | 'android';
  created_at: string;
}

export type JobStatus = Job['status'];
export type VerificationStatus = ProviderProfile['verification_status'];
export type ActiveRole = Profile['active_role'];
