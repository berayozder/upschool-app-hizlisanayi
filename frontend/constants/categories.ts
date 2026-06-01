import { Category } from '@/types/database';

export const CATEGORIES: Category[] = [
  { slug: 'cnc',        label_tr: 'Talaşlı İmalat (CNC)',   icon_name: 'cog',          urgency_level: 'standard', sort_order: 1 },
  { slug: 'laser',      label_tr: 'Lazer Kesim',             icon_name: 'flash',        urgency_level: 'standard', sort_order: 2 },
  { slug: 'sheet',      label_tr: 'Sac İşleme',              icon_name: 'layers',       urgency_level: 'standard', sort_order: 3 },
  { slug: 'casting',    label_tr: 'Döküm & Kalıp',           icon_name: 'cube-outline', urgency_level: 'standard', sort_order: 4 },
  { slug: 'welding',    label_tr: 'Kaynak & Metal İşleri',   icon_name: 'tools',        urgency_level: 'standard', sort_order: 5 },
  { slug: 'crane',      label_tr: 'Vinç Kiralama',           icon_name: 'crane',        urgency_level: 'standard', sort_order: 6 },
  { slug: 'forklift',   label_tr: 'Forklift & İstif',        icon_name: 'forklift',     urgency_level: 'standard', sort_order: 7 },
  { slug: 'transport',  label_tr: 'Taşıma & Nakliye',        icon_name: 'truck',        urgency_level: 'standard', sort_order: 8 },
  { slug: 'tow',        label_tr: 'Araç Kurtarma (Çekici)',  icon_name: 'tow-truck',    urgency_level: 'urgent',   sort_order: 9 },
  { slug: 'autorepair', label_tr: 'Oto Tamir',               icon_name: 'car-wrench',   urgency_level: 'urgent',   sort_order: 10 },
];

export const URGENT_SLUGS: string[] = ['tow', 'autorepair'];

export function getCategoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}
