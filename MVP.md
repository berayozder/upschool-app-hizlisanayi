# Hızlısanayi: MVP Specification (V2.0)
**Core Objective:** Prove that users will post industrial service requests and local, verified shops will contact them via WhatsApp.

**Decisions Locked In:**
- Expo **Managed Workflow** (EAS Build)
- Dual role per user, switched via Settings — both roles **persist in background**
- Admin verification: **Supabase Studio** (no custom panel for MVP)
- Provider feed: **only jobs within their registered service radius** on first open
- Images: **max 3 photos**, client-side compressed to **≤500KB each** before upload
- Offline: **show error toast, block submission** — no offline queue
- WhatsApp bridge: opens with **Seeker's OTP-registered phone number**

---

## 1. The Core Loop

1. **Seeker** creates a job (1–3 photos + category + city/district + optional description).
2. **Provider** (same or different user in Provider mode) receives a push notification for jobs matching their category + service radius.
3. **Provider** taps "WhatsApp'tan Teklif Ver" → `contact_logs` row written → WhatsApp deep-link opens with pre-filled message.

---

## 2. Scope Matrix

| Feature | IN (MVP) | OUT (V2+) |
|:---|:---|:---|
| Auth | Phone OTP via Supabase | Email/password, social |
| Roles | Seeker + Provider, switch in settings | Org accounts |
| Verification | Manual upload Vergi Levhası → admin approves in Supabase Studio | Automated Tax ID API |
| Matching | Registered service radius (PostGIS `ST_DWithin`) | Dynamic radius slider |
| Messaging | WhatsApp deep-link | In-app chat |
| Payments | Free | Subscriptions, credits |
| Categories | 10 predefined | Custom, sub-categories |
| Admin Panel | Supabase Studio row editing | Dedicated web app |
| Offline | Error toast + block | Draft queue / sync |
| Images | Max 3 per job, compressed ≤500KB | Videos, PDFs (V1.1) |

---

## 3. Database Schema (Supabase / PostgreSQL + PostGIS)

Run these in order in Supabase SQL editor.

```sql
-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis; //

-- ─── PROFILES ───────────────────────────────────────────────────────────────
-- Extends Supabase auth.users. Created automatically via trigger on sign-up.
CREATE TABLE public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone           TEXT NOT NULL UNIQUE,          -- E.164 format: +905xxxxxxxxx
  full_name       TEXT,
  active_role     TEXT NOT NULL DEFAULT 'seeker'
                  CHECK (active_role IN ('seeker', 'provider')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, phone)
  VALUES (NEW.id, NEW.phone);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── PROVIDER PROFILES ──────────────────────────────────────────────────────
CREATE TABLE public.provider_profiles (
  id                    UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name          TEXT NOT NULL,
  vergi_no              TEXT NOT NULL UNIQUE,       -- 10-digit Turkish Tax ID
  vergi_levhasi_url     TEXT,                       -- Supabase Storage path
  verification_status   TEXT NOT NULL DEFAULT 'pending'
                        CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  rejection_reason      TEXT,                       -- populated on rejection
  categories            TEXT[] NOT NULL DEFAULT '{}',  -- e.g. ['cnc','laser','welding']
  city                  TEXT NOT NULL,
  district              TEXT,
  location              GEOGRAPHY(POINT, 4326),     -- provider's shop coordinates
  service_radius_km     INTEGER NOT NULL DEFAULT 50
                        CHECK (service_radius_km BETWEEN 10 AND 500),
  verified_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CATEGORIES ─────────────────────────────────────────────────────────────
CREATE TABLE public.categories (
  slug          TEXT PRIMARY KEY,   -- e.g. 'cnc', 'laser', 'crane'
  label_tr      TEXT NOT NULL,      -- display name in Turkish
  icon_name     TEXT NOT NULL,      -- maps to @expo/vector-icons MaterialCommunityIcons
  urgency_level TEXT NOT NULL DEFAULT 'standard'
                CHECK (urgency_level IN ('standard', 'urgent')),
  sort_order    INTEGER NOT NULL DEFAULT 0
);

-- Seed data
INSERT INTO public.categories (slug, label_tr, icon_name, urgency_level, sort_order) VALUES
  ('cnc',        'Talaşlı İmalat (CNC)',     'cog',               'standard', 1),
  ('laser',      'Lazer Kesim',              'flash',             'standard', 2),
  ('sheet',      'Sac İşleme',               'layers',            'standard', 3),
  ('casting',    'Döküm & Kalıp',            'cube-outline',      'standard', 4),
  ('welding',    'Kaynak & Metal İşleri',    'tools',             'standard', 5),
  ('crane',      'Vinç Kiralama',            'crane',             'standard', 6),
  ('forklift',   'Forklift & İstif',         'forklift',          'standard', 7),
  ('transport',  'Taşıma & Nakliye',         'truck',             'standard', 8),
  ('tow',        'Araç Kurtarma (Çekici)',   'tow-truck',         'urgent',   9),
  ('autorepair', 'Oto Tamir',                'car-wrench',        'urgent',   10);

-- ─── JOBS ───────────────────────────────────────────────────────────────────
CREATE TABLE public.jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seeker_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_slug   TEXT NOT NULL REFERENCES public.categories(slug),
  title           TEXT NOT NULL CHECK (char_length(title) BETWEEN 5 AND 100),
  description     TEXT CHECK (char_length(description) <= 500),
  city            TEXT NOT NULL,
  district        TEXT,
  location        GEOGRAPHY(POINT, 4326),
  photo_urls      TEXT[] DEFAULT '{}'
                  CHECK (array_length(photo_urls, 1) <= 3),  -- max 3 photos
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'closed', 'expired')),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '72 hours',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index for feed query performance
CREATE INDEX idx_jobs_category_status ON public.jobs (category_slug, status);
CREATE INDEX idx_jobs_location ON public.jobs USING GIST (location);
CREATE INDEX idx_jobs_expires_at ON public.jobs (expires_at);

-- ─── CONTACT LOGS ───────────────────────────────────────────────────────────
-- Written when a Provider taps the WhatsApp button. This is the primary KPI table.
CREATE TABLE public.contact_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  provider_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seeker_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (job_id, provider_id)  -- one bridge click per provider per job
);

-- ─── PUSH TOKENS ────────────────────────────────────────────────────────────
CREATE TABLE public.push_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,  -- Expo push token: ExponentPushToken[xxx]
  platform    TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, token)
);

-- ─── EXPIRED JOBS CLEANUP (pg_cron or Supabase Edge Function) ───────────────
-- Run this daily via Supabase Database Functions + pg_cron:
-- UPDATE public.jobs SET status = 'expired' WHERE expires_at < NOW() AND status = 'active';
```

### Row Level Security (RLS)

```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Profiles: users read/update only their own
CREATE POLICY "profiles_self" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- Provider profiles: owner full access; others read-only approved ones
CREATE POLICY "provider_profiles_owner" ON public.provider_profiles
  FOR ALL USING (auth.uid() = id);
CREATE POLICY "provider_profiles_read_approved" ON public.provider_profiles
  FOR SELECT USING (verification_status = 'approved');

-- Jobs: anyone reads active jobs; only owner can insert/update/delete
CREATE POLICY "jobs_read_active" ON public.jobs
  FOR SELECT USING (status = 'active');
CREATE POLICY "jobs_owner_write" ON public.jobs
  FOR ALL USING (auth.uid() = seeker_id);

-- Contact logs: provider inserts their own; seeker reads logs on their jobs
CREATE POLICY "contact_logs_provider_insert" ON public.contact_logs
  FOR INSERT WITH CHECK (auth.uid() = provider_id);
CREATE POLICY "contact_logs_seeker_read" ON public.contact_logs
  FOR SELECT USING (auth.uid() = seeker_id OR auth.uid() = provider_id);

-- Push tokens: users manage only their own
CREATE POLICY "push_tokens_self" ON public.push_tokens
  FOR ALL USING (auth.uid() = user_id);
```

---

## 4. Supabase Storage Buckets

| Bucket Name | Access | Max File Size | Allowed Types |
|:---|:---|:---|:---|
| `job-photos` | Public read | 2MB (compressed before upload) | `image/jpeg`, `image/png` |
| `vergi-levhasi` | Private (owner only) | 5MB | `image/jpeg`, `image/png`, `application/pdf` |

**Path conventions:**
- Job photos: `job-photos/{job_id}/{index}.jpg` (index: 0, 1, 2)
- Vergi Levhası: `vergi-levhasi/{user_id}/levha.jpg`

---

## 5. Expo Router — File Structure

```
app/
├── _layout.tsx                  # Root layout: SplashScreen, AuthProvider
│
├── (auth)/                      # Unauthenticated stack
│   ├── _layout.tsx              # Stack navigator, no tabs
│   ├── phone.tsx                # Enter phone number screen
│   ├── otp.tsx                  # Verify OTP code screen
│   └── role-select.tsx          # Choose initial role (Seeker / Provider)
│
└── (app)/                       # Authenticated shell
    ├── _layout.tsx              # Bottom tab navigator (role-aware tabs)
    │
    ├── feed/
    │   └── index.tsx            # SEEKER: My Jobs list
    │                            # PROVIDER: Lead feed (radius-filtered)
    │
    ├── post/
    │   └── index.tsx            # SEEKER only: Post a new job
    │
    ├── job/
    │   └── [id].tsx             # Job detail — renders differently by active_role
    │
    └── profile/
        ├── index.tsx            # Profile screen + role switcher
        └── provider-setup.tsx   # Provider registration form
```

**Tab bar by active role:**

| Role | Tab 1 | Tab 2 | Tab 3 |
|:---|:---|:---|:---|
| **Seeker** | İlanlarım (My Jobs) | + Yeni İlan (Post) | Profil |
| **Provider** | Fırsatlar (Lead Feed) | — | Profil |

The `+` tab is hidden in Provider mode. Implement via `href: null` on the tab if `active_role === 'provider'`.

---

## 6. Screen Specifications

### Screen 1: Phone Entry (`(auth)/phone.tsx`)
**Purpose:** Collect phone number for OTP.

| Element | Spec |
|:---|:---|
| Input | `TextInput`, keyboard type `phone-pad`, auto-format `+90 5XX XXX XX XX` |
| Validation | Must match `/^\+90[5][0-9]{9}$/` before enabling submit |
| CTA | "Kod Gönder" — disabled until valid, shows `ActivityIndicator` on press |
| Error state | "Bu numara zaten kayıtlı" (if exists) / "SMS gönderilemedi, tekrar dene" |

### Screen 2: OTP Verify (`(auth)/otp.tsx`)
| Element | Spec |
|:---|:---|
| Input | 6-box OTP input (use `react-native-otp-textinput`) |
| Auto-verify | Trigger verify on 6th digit — no manual "Confirm" button needed |
| Resend | "Kodu tekrar gönder" — shown after 60s countdown |
| Error state | "Yanlış kod, tekrar dene" — shake animation on input |
| Timeout | Code expires in 10 min (Supabase default) |

### Screen 3: Role Select (`(auth)/role-select.tsx`)
**Shown once, on first login only.** Sets `active_role` in `profiles`.

| Element | Spec |
|:---|:---|
| Two large cards | "Hizmet Arıyorum" (Seeker) / "Hizmet Veriyorum" (Provider) |
| Provider path | After selecting Provider → navigate to `provider-setup.tsx` before entering app |
| Seeker path | Direct to `(app)/feed` |
| Note | If user skips provider setup, set `verification_status = 'pending'` and show banner in Profile |

### Screen 4: Lead Feed — Provider (`(app)/feed/index.tsx` when role=provider)
**Default state:** Jobs filtered by `category IN provider.categories AND ST_DWithin(job.location, provider.location, radius_m)`, sorted `created_at DESC`.

| Element | Spec |
|:---|:---|
| Filter bar | Category chips (horizontal scroll) + "Tümü" chip. Active chip = orange border. |
| Job Card | Category icon + category name, city/district, time ago (e.g. "23 dk önce"), photo thumbnail (first photo), title, distance badge ("12 km uzakta") |
| Empty state | "Bölgenizde yeni ilan yok. Bildirim açıksa sizi haberdar edeceğiz." with notification bell icon |
| Pull to refresh | Standard `RefreshControl` |
| Pagination | Infinite scroll, 20 items per page (`range(0, 19)` → `range(20, 39)`) |
| Urgent badge | Red "ACİL" chip on cards with `urgency_level = 'urgent'` |

### Screen 5: Job Feed — Seeker (`(app)/feed/index.tsx` when role=seeker)
**Shows only the current user's own jobs.**

| Element | Spec |
|:---|:---|
| Job Card | Title, category, time posted, status chip (Aktif / Süresi Doldu / Kapalı), bridge click count ("3 firma ilgilendi") |
| FAB | Floating "+" button bottom-right → navigates to Post screen |
| Empty state | "Henüz ilan vermediniz." with CTA button "İlk İlanını Ver" |

### Screen 6: Post a Job (`(app)/post/index.tsx`)
**The most performance-critical screen — must work with dirty/gloved hands.**

| Element | Spec |
|:---|:---|
| Photo section | Row of 3 dashed boxes. Tap any → `expo-image-picker`. Compress with `expo-image-manipulator` to ≤500KB (resize to max 1200px width, quality 0.7). Show `ActivityIndicator` during compression. |
| Category | `Picker` component (scrollable wheel on iOS, dropdown on Android). Required field. |
| City | Searchable `FlatList` modal from hardcoded `il` list (81 cities). |
| District | Populated after city selected. Hardcoded `ilçe` data keyed by city. |
| Description | `TextInput` multiline, max 500 chars, char counter shown bottom-right. |
| Submit button | Full-width "Teklif Al" button. Disabled if: no photo OR no category OR no city. |
| Offline guard | Before submit, check `NetInfo.isConnected`. If false → show toast "İnternet bağlantısı yok. Lütfen tekrar deneyin." and block. |
| Success | Navigate to the new job's detail screen + show toast "İlanınız yayınlandı!" |

**Image compression implementation:**
```typescript
import * as ImageManipulator from 'expo-image-manipulator';

async function compressImage(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1200 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  );
  // Verify ≤ 500KB; if still over, re-compress at 0.5
  const info = await FileSystem.getInfoAsync(result.uri, { size: true });
  if ((info as any).size > 512000) {
    return (await ImageManipulator.manipulateAsync(
      result.uri, [], { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
    )).uri;
  }
  return result.uri;
}
```

### Screen 7: Job Detail (`(app)/job/[id].tsx`)
**Renders conditionally based on `active_role`.**

**Common elements (both roles):**
- Full-width image carousel (if >1 photo), `expo-image` for caching.
- Category chip, city/district, time posted.
- Full description text.

**Provider-only elements:**
- Distance: "Bu işe X km uzaktasınız"
- **The Golden Button:** Full-width, green (#25D366), height 56dp, text "WhatsApp'tan Teklif Ver 💬"
  - On press: (1) Write `contact_logs` row via Supabase insert. (2) Build deep-link (see §7). (3) `Linking.openURL(whatsappUrl)`.
  - If WhatsApp not installed: catch error → show alert "WhatsApp kurulu değil. Numarayı kopyalamak ister misiniz?" → copy seeker phone to clipboard.
- "İlgilenmiyor" (Not Interested): text button below golden button. Hides job from current session list (local state only, no DB write for MVP).

**Seeker-only elements:**
- "İlanı Kapat" button (sets `status = 'closed'`).
- Bridge click count: "X firma ilgilenip WhatsApp'tan yazdı".

### Screen 8: Profile (`(app)/profile/index.tsx`)

| Section | Elements |
|:---|:---|
| User info | Phone number (read-only), Full name (editable) |
| **Role switcher** | Toggle row "Aktif Mod: Hizmet Arıyorum / Hizmet Veriyorum". On switch: update `profiles.active_role`, re-render tab bar. No data is lost. |
| Provider section | Shown only if `provider_profiles` row exists. Company name, Vergi No, verification status badge. If pending: "Başvurunuz inceleniyor" amber chip. If approved: green "Onaylı İşletme ✓". If rejected: red chip + rejection reason + "Tekrar Başvur" button. |
| Provider CTA | If no provider profile: "Hizmet Sağlayıcı Ol" button → navigates to `provider-setup.tsx`. |
| Notification settings | "Yeni ilan bildirimleri" toggle (saves to `push_tokens` table). |
| Sign out | Red text button at bottom. |

### Screen 9: Provider Setup (`(app)/profile/provider-setup.tsx`)

| Element | Spec |
|:---|:---|
| Company Name | `TextInput`, required |
| Vergi No | `TextInput`, numeric keyboard, exactly 10 digits, validated client-side with Luhn-like check |
| Category multi-select | Grid of 10 category cards with icons. Tap to toggle. At least 1 required. |
| City + District | Same searchable pickers as Post screen |
| Service Radius | Slider: 10 km → 500 km, default 50 km. Show "X km yarıçapındaki ilanları göreceksiniz." |
| Vergi Levhası upload | `expo-image-picker` OR `expo-document-picker` (allows PDF). Shows thumbnail/filename after pick. |
| Submit | "Başvuruyu Gönder" — disabled until all required fields filled. On success: navigate to Profile with "Başvurunuz alındı, 24 saat içinde onaylanacak." toast. |

---

## 7. WhatsApp Bridge — Exact Implementation

**Deep-link format:**
```
https://wa.me/{seekerPhone}?text={encodedMessage}
```

**Pre-filled message template (Turkish):**
```
Merhaba! Hızlısanayi üzerinden "{jobTitle}" ilanınızı gördüm ve teklif vermek istiyorum. Müsait misiniz?
```

**Implementation:**
```typescript
function buildWhatsAppUrl(seekerPhone: string, jobTitle: string): string {
  // seekerPhone is already E.164 from Supabase Auth: +905xxxxxxxxx
  // Strip the '+' for wa.me
  const phone = seekerPhone.replace('+', '');
  const message = `Merhaba! Hızlısanayi üzerinden "${jobTitle}" ilanınızı gördüm ve teklif vermek istiyorum. Müsait misiniz?`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

async function handleWhatsAppPress(job: Job, providerId: string) {
  // 1. Write contact log (fire-and-forget, don't await to keep UX fast)
  supabase.from('contact_logs').insert({
    job_id: job.id,
    provider_id: providerId,
    seeker_id: job.seeker_id,
  });

  // 2. Build and open URL
  const url = buildWhatsAppUrl(job.seekerPhone, job.title);
  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  } else {
    Alert.alert(
      'WhatsApp Bulunamadı',
      `WhatsApp kurulu değil. İlan sahibinin numarasını kopyalamak ister misiniz?\n${job.seekerPhone}`,
      [
        { text: 'Kopyala', onPress: () => Clipboard.setStringAsync(job.seekerPhone) },
        { text: 'Vazgeç', style: 'cancel' },
      ]
    );
  }
}
```

> ⚠️ **KVKK Note:** Seeker's phone number is shared with any approved Provider who taps the bridge. Add an explicit disclosure at job post time: "İlanınızı gören onaylı firmalar sizinle WhatsApp üzerinden iletişime geçebilir."

---

## 8. Push Notifications

**When to request permission:** After the user successfully posts their first job (Seeker) OR after their provider verification is approved (Provider). **Never on first app open.**

**Expo Push implementation:**
```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

async function registerPushToken(userId: string) {
  if (!Device.isDevice) return; // Skip in simulator
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  const platform = Platform.OS as 'ios' | 'android';

  await supabase.from('push_tokens').upsert(
    { user_id: userId, token, platform },
    { onConflict: 'token' }
  );
}
```

**Notification triggers (via Supabase Edge Function or FastAPI):**

| Event | Recipient | Title | Body |
|:---|:---|:---|:---|
| New job in provider's category+radius | Provider | "Yeni İlan: {category}" | "{city}/{district} bölgesinde yeni bir {category} işi var." |
| Provider verification approved | Provider | "Hesabınız Onaylandı ✓" | "Artık fırsatları görebilir ve teklif verebilirsiniz." |
| Provider verification rejected | Provider | "Başvurunuz Reddedildi" | "Sebep: {rejection_reason}. Profil sayfanızdan tekrar başvurabilirsiniz." |

**Notification → deep-link routing:**
```typescript
// In _layout.tsx
Notifications.addNotificationResponseReceivedListener(response => {
  const { jobId } = response.notification.request.content.data;
  if (jobId) router.push(`/job/${jobId}`);
});
```

---

## 9. API Endpoints (FastAPI)

Base URL: `https://api.hizlisanayi.com/v1`

All endpoints require `Authorization: Bearer {supabase_access_token}` header.

| Method | Path | Description | Body / Params |
|:---|:---|:---|:---|
| `POST` | `/jobs` | Create a new job | `{category_slug, title, description?, city, district?, photo_urls[], location?}` |
| `GET` | `/jobs/feed` | Provider feed (radius-filtered) | Query: `?page=0&limit=20` |
| `GET` | `/jobs/{id}` | Single job detail | — |
| `PATCH` | `/jobs/{id}` | Update job status | `{status: 'closed'}` |
| `POST` | `/jobs/{id}/contact` | Log WhatsApp bridge tap | — |
| `POST` | `/providers/register` | Submit provider profile | `{company_name, vergi_no, categories[], city, district, service_radius_km}` |
| `POST` | `/providers/upload-levha` | Upload Vergi Levhası | `multipart/form-data` |
| `GET` | `/providers/me` | Get current provider profile | — |
| `POST` | `/push-tokens` | Register push token | `{token, platform}` |

**`GET /jobs/feed` query logic:**
```python
# Fetch provider's profile for location + radius + categories
provider = get_provider_profile(user_id)

query = supabase.table('jobs') \
  .select('*, profiles!seeker_id(phone, full_name)') \
  .eq('status', 'active') \
  .gt('expires_at', datetime.utcnow().isoformat()) \
  .in_('category_slug', provider.categories) \
  .order('created_at', desc=True) \
  .range(page * limit, (page + 1) * limit - 1)

# PostGIS filtering (run as raw SQL via rpc):
# ST_DWithin(jobs.location, provider.location, provider.service_radius_km * 1000)
```

---

## 10. Key Package List

```json
{
  "dependencies": {
    "expo": "~51.x",
    "expo-router": "~3.x",
    "expo-image-picker": "~15.x",
    "expo-image-manipulator": "~12.x",
    "expo-file-system": "~17.x",
    "expo-notifications": "~0.28.x",
    "expo-document-picker": "~12.x",
    "expo-clipboard": "~6.x",
    "@react-native-community/netinfo": "^11.x",
    "@supabase/supabase-js": "^2.x",
    "expo-image": "~1.x",
    "@react-native-picker/picker": "^2.x",
    "react-native-otp-textinput": "^1.x"
  }
}
```

---

## 11. Analytics: The One Metric That Matters

**North Star:** `contact_logs` row count per day.

Query to run in Supabase Studio:
```sql
SELECT DATE(created_at) as day, COUNT(*) as bridge_clicks
FROM public.contact_logs
GROUP BY day
ORDER BY day DESC;
```

**Decision rule:**
- 0 bridge clicks on 10+ jobs → matching logic or trust is broken
- <10% conversion (clicks/jobs) → providers aren't seeing the right jobs
- >30% conversion → product-market fit signal

---

## 12. Known Edge Cases & Handling

| Scenario | Handling |
|:---|:---|
| Provider taps WA twice on same job | `UNIQUE(job_id, provider_id)` constraint on `contact_logs` prevents duplicate rows. UI: disable WA button after first tap in session (local state). |
| User switches role mid-session | Update `profiles.active_role` → re-render tab bar. All background data (jobs + leads) persist. |
| Job expires while Provider is viewing it | On WA button tap, check `expires_at > NOW()` server-side. If expired, return 410 and show "Bu ilan süresi doldu." |
| Seeker posts job without GPS | Location is optional. Feed query falls back to city-only string match if `location IS NULL`. |
| Provider has no location set | Block feed access, show "Konum bilgisi eksik. Profili tamamla." with CTA to provider-setup. |
| Image upload fails mid-post | Show "Fotoğraf yüklenemedi. Tekrar dene." on that specific photo box. Don't block other photos or submission. |
| Vergi No already registered | Return 409 from `/providers/register`. Show "Bu vergi numarası zaten kayıtlı." |