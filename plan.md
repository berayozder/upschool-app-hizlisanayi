# Hızlısanayi: Development Plan
**Version:** 1.0
**Stack:** Expo (Managed Workflow) + FastAPI + Supabase
**Execution tool:** Claude Code (terminal)
**Task granularity:** File-level

---

## How to Use This Plan

Each task is atomic: one task = one file created or one manual step completed.
Before running Claude Code on a task, ensure all listed dependencies are done.
Claude Code should read the dependency files before generating the target file.
Tasks marked `MANUAL` require human action in a browser/terminal — not LLM generation.

**Task types:**
- `MANUAL` — human action required (Supabase dashboard, terminal command)
- `CODE` — Claude Code generates this file

---

## Full Project Structure

```
hizlisanayi/                          # Expo app root
├── app.config.ts
├── .env
├── package.json
├── tsconfig.json
│
├── app/
│   ├── _layout.tsx                   # Root layout + auth guard
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── phone.tsx
│   │   ├── otp.tsx
│   │   └── role-select.tsx
│   └── (app)/
│       ├── _layout.tsx               # Role-aware tab bar
│       ├── feed/
│       │   └── index.tsx             # Seeker: My Jobs / Provider: Lead Feed
│       ├── post/
│       │   └── index.tsx             # Post a job (Seeker only)
│       ├── job/
│       │   └── [id].tsx              # Job detail (role-aware)
│       └── profile/
│           ├── index.tsx             # Profile + role switcher
│           └── provider-setup.tsx    # Provider registration form
│
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Toast.tsx
│   │   ├── CategoryPicker.tsx
│   │   └── LocationPicker.tsx
│   └── JobCard.tsx
│
├── context/
│   └── AuthContext.tsx
│
├── hooks/
│   ├── useProviderProfile.ts
│   ├── usePostJob.ts
│   ├── useProviderFeed.ts
│   ├── useMyJobs.ts
│   ├── useJobDetail.ts
│   └── useContactLog.ts
│
├── lib/
│   ├── supabase.ts
│   ├── imageCompressor.ts
│   ├── whatsapp.ts
│   └── notifications.ts
│
├── constants/
│   ├── categories.ts
│   └── locations.ts
│
└── types/
    └── database.ts

backend/                              # FastAPI root
├── requirements.txt
├── main.py
├── .env
├── core/
│   ├── config.py
│   ├── supabase_client.py
│   └── auth.py
├── routers/
│   ├── jobs.py
│   ├── providers.py
│   ├── contact.py
│   └── push_tokens.py
└── services/
    └── push_service.py
```

---

## Phase 0 — Infrastructure Setup
**Goal:** Supabase project live, schema deployed, buckets created, env vars ready.

---

### M-001 · Create Supabase Project
- **Type:** MANUAL
- **Depends on:** —
- **Steps:**
  1. Go to [supabase.com](https://supabase.com) → New Project
  2. Name: `hizlisanayi`, Region: `eu-central-1` (Frankfurt — closest to Turkey)
  3. Copy and save: `Project URL`, `anon public key`, `service_role key`

---

### M-002 · Deploy Database Schema
- **Type:** MANUAL
- **Depends on:** M-001
- **Steps:**
  1. Open Supabase Dashboard → SQL Editor
  2. Run the full SQL from `MVP.md §3` in this exact order:
     - `CREATE EXTENSION IF NOT EXISTS postgis;`
     - `profiles` table + trigger
     - `provider_profiles` table
     - `categories` table + seed INSERT
     - `jobs` table + indexes
     - `contact_logs` table
     - `push_tokens` table
     - All RLS policies
  3. Verify in Table Editor: all 6 tables visible, categories table has 10 rows.

---

### M-003 · Create Storage Buckets
- **Type:** MANUAL
- **Depends on:** M-001
- **Steps:**
  1. Supabase Dashboard → Storage → New Bucket
  2. Create `job-photos`: Public = **ON**, max file size = 2MB
  3. Create `vergi-levhasi`: Public = **OFF**, max file size = 5MB
  4. For `vergi-levhasi` bucket → Policies → Add policy:
     - SELECT: `auth.uid() = (storage.foldername(name))[1]::uuid`
     - INSERT: `auth.uid() = (storage.foldername(name))[1]::uuid`

---

### T-001 · Initialize Expo Project
- **Type:** CODE
- **Creates:** Project root, `package.json`, `tsconfig.json`, folder structure
- **Depends on:** —
- **Description:** Scaffold the Expo Managed Workflow project with TypeScript and install all required dependencies.
- **Specs:**
  - Init command: `npx create-expo-app@latest hizlisanayi --template expo-template-blank-typescript`
  - Install these exact packages:
    ```
    expo-router@~3.5
    @supabase/supabase-js@^2
    @react-native-async-storage/async-storage@^2
    expo-image-picker@~15
    expo-image-manipulator@~12
    expo-file-system@~17
    expo-notifications@~0.28
    expo-document-picker@~12
    expo-clipboard@~6
    expo-image@~1
    expo-device@~6
    @react-native-community/netinfo@^11
    @react-native-picker/picker@^2
    react-native-otp-textinput@^1
    @tanstack/react-query@^5
    zustand@^4
    ```
  - Create all empty directories from the project structure tree above.
  - `tsconfig.json`: set `"strict": true`, `"baseUrl": "."`, `"paths": { "@/*": ["./*"] }`

---

### T-002 · app.config.ts
- **Type:** CODE
- **Creates:** `app.config.ts`
- **Depends on:** T-001
- **Description:** Typed Expo config that reads env vars and exposes them via `extra`. Configures bundle ID, permissions, and notification settings.
- **Specs:**
  - `name`: `"Hızlısanayi"`, `slug`: `"hizlisanayi"`
  - `ios.bundleIdentifier`: `"com.hizlisanayi.app"`
  - `android.package`: `"com.hizlisanayi.app"`
  - Read from `process.env`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - `plugins`: include `expo-router`, `expo-notifications`
  - `android.permissions`: `["NOTIFICATIONS", "CAMERA", "READ_EXTERNAL_STORAGE"]`
  - `ios.infoPlist`: add `NSCameraUsageDescription: "İlan fotoğrafı çekmek için"`, `NSPhotoLibraryUsageDescription: "İlan için fotoğraf seçmek için"`
  - `scheme`: `"hizlisanayi"` (for deep linking)

---

### T-003 · .env.example
- **Type:** CODE
- **Creates:** `.env.example`
- **Depends on:** T-001
- **Description:** Template env file documenting all required environment variables for both Expo and FastAPI. Never contains real values.
- **Specs (Expo app vars):**
  - `EXPO_PUBLIC_SUPABASE_URL=`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY=`
- **Specs (FastAPI backend vars in `backend/.env.example`):**
  - `SUPABASE_URL=`
  - `SUPABASE_SERVICE_ROLE_KEY=`
  - `EXPO_PUSH_API_URL=https://exp.host/--/api/v2/push/send`
  - `JWT_SECRET=` (Supabase JWT secret, found in Project Settings → API)

---

### T-004 · lib/supabase.ts
- **Type:** CODE
- **Creates:** `lib/supabase.ts`
- **Depends on:** T-001, T-002, T-003
- **Description:** Supabase JS client singleton configured with AsyncStorage for session persistence. Exported as `supabase`.
- **Specs:**
  - Import `createClient` from `@supabase/supabase-js`
  - Import `AsyncStorage` from `@react-native-async-storage/async-storage`
  - Use `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` from `process.env`
  - Auth config: `storage: AsyncStorage`, `autoRefreshToken: true`, `persistSession: true`, `detectSessionInUrl: false`
  - Export single instance: `export const supabase = createClient(...)`

---

### ✅ Phase 0 Checkpoint

Before moving to Phase 1, verify:
- [ ] `npx expo start` launches without errors
- [ ] Supabase dashboard shows all 6 tables with correct columns
- [ ] Both storage buckets exist with correct public/private settings
- [ ] `supabase.auth.getSession()` called in a test file returns `{ data: { session: null } }` without throwing
- [ ] Categories table has exactly 10 rows

---

## Phase 1 — Types & Constants
**Goal:** All shared TypeScript types and static data ready before any screen is written.

---

### T-005 · types/database.ts
- **Type:** CODE
- **Creates:** `types/database.ts`
- **Depends on:** M-002
- **Description:** TypeScript interfaces mirroring every Supabase table. Used by hooks and components for type safety throughout the app.
- **Specs — export these exact interfaces:**
  ```typescript
  Profile {
    id: string               // UUID
    phone: string            // E.164 e.g. +905xxxxxxxxx
    full_name: string | null
    active_role: 'seeker' | 'provider'
    created_at: string
    updated_at: string
  }

  ProviderProfile {
    id: string
    company_name: string
    vergi_no: string
    vergi_levhasi_url: string | null
    verification_status: 'pending' | 'approved' | 'rejected'
    rejection_reason: string | null
    categories: string[]          // array of category slugs
    city: string
    district: string | null
    service_radius_km: number
    verified_at: string | null
    created_at: string
    updated_at: string
  }

  Category {
    slug: string
    label_tr: string
    icon_name: string
    urgency_level: 'standard' | 'urgent'
    sort_order: number
  }

  Job {
    id: string
    seeker_id: string
    category_slug: string
    title: string
    description: string | null
    city: string
    district: string | null
    photo_urls: string[]
    status: 'active' | 'closed' | 'expired'
    expires_at: string
    created_at: string
    // joined fields (present when queried with seeker phone join)
    seeker_phone?: string
    seeker_name?: string | null
    distance_km?: number          // computed by PostGIS, injected by FastAPI
  }

  ContactLog {
    id: string
    job_id: string
    provider_id: string
    seeker_id: string
    created_at: string
  }

  PushToken {
    id: string
    user_id: string
    token: string
    platform: 'ios' | 'android'
    created_at: string
  }
  ```
  - Also export: `type JobStatus = Job['status']`
  - Also export: `type VerificationStatus = ProviderProfile['verification_status']`
  - Also export: `type ActiveRole = Profile['active_role']`

---

### T-006 · constants/categories.ts
- **Type:** CODE
- **Creates:** `constants/categories.ts`
- **Depends on:** T-005
- **Description:** Static array of all 10 MVP categories matching the database seed data exactly. Used by pickers, feed filters, and job cards.
- **Specs:**
  - Export `CATEGORIES: Category[]` with all 10 items matching the DB seed from `MVP.md §3`
  - Export `getCategoryBySlug(slug: string): Category | undefined`
  - Export `URGENT_SLUGS: string[]` = `['tow', 'autorepair']`
  - Icon names must map to `@expo/vector-icons` `MaterialCommunityIcons` — use exactly these: `cog`, `flash`, `layers`, `cube-outline`, `tools`, `crane`, `forklift`, `truck`, `tow-truck`, `car-wrench`

---

### T-007 · constants/locations.ts
- **Type:** CODE
- **Creates:** `constants/locations.ts`
- **Depends on:** T-001
- **Description:** Complete static list of all 81 Turkish iller and their ilçeler. Used by LocationPicker component throughout the app.
- **Specs:**
  - Export `CITIES: string[]` — alphabetically sorted list of all 81 il names in Turkish (Adana, Adıyaman, Afyonkarahisar ... Zonguldak)
  - Export `DISTRICTS: Record<string, string[]>` — keys are city names, values are sorted arrays of ilçe names for that city
  - Must include at minimum these cities with full ilçe lists (highest-priority for MVP launch): Bursa, Kocaeli, İzmir, İstanbul, Ankara, Gaziantep, Konya, Manisa, Denizli, Balıkesir
  - All other cities: include city key with empty array `[]` — to be populated in V1.1
  - Export `getDistricts(city: string): string[]` — returns districts for city or `[]`

---

### ✅ Phase 1 Checkpoint

Before moving to Phase 2, verify:
- [ ] `tsc --noEmit` passes with zero errors across `types/`, `constants/`
- [ ] `CATEGORIES.length === 10`
- [ ] `CITIES.length === 81`
- [ ] `getCategoryBySlug('cnc')` returns the correct object
- [ ] `getDistricts('Kocaeli')` returns a non-empty array including `'Gebze'`

---

## Phase 2 — Authentication Layer
**Goal:** Full OTP login/logout flow working end-to-end with Supabase.

---

### T-008 · context/AuthContext.tsx
- **Type:** CODE
- **Creates:** `context/AuthContext.tsx`
- **Depends on:** T-004, T-005 (types), T-004 (lib/supabase.ts)
- **Description:** React context that holds session, profile, active role, and loading state. Provides `signOut` and `switchRole` actions used throughout the app.
- **Specs:**
  - State held: `session`, `profile: Profile | null`, `loading: boolean`
  - On mount: call `supabase.auth.getSession()`. Subscribe to `onAuthStateChange`.
  - When session exists: fetch `profiles` row by `session.user.id`. Set `profile`.
  - `switchRole(role: ActiveRole)`: UPDATE `profiles.active_role`, update local state
  - `signOut()`: call `supabase.auth.signOut()`, clear local state
  - Export `useAuth()` hook — throws if used outside provider
  - `loading = true` until both session check AND profile fetch complete

---

### T-009 · app/_layout.tsx
- **Type:** CODE
- **Creates:** `app/_layout.tsx`
- **Depends on:** T-008
- **Description:** Root layout. Wraps app in `AuthProvider` and `QueryClientProvider`. Controls routing: unauthenticated users go to `(auth)`, authenticated users go to `(app)`.
- **Specs:**
  - Wrap children in `AuthContext.Provider` and `QueryClientProvider` (React Query)
  - Show `SplashScreen` while `loading === true` (use `expo-splash-screen`)
  - Hide splash once loading is false
  - If `session === null` → redirect to `/(auth)/phone`
  - If `session` exists AND `profile.active_role` is set → redirect to `/(app)/feed`
  - If `session` exists AND no `profile` row yet → redirect to `/(auth)/role-select`
  - Use Expo Router's `<Slot />` as the render outlet

---

### T-010 · app/(auth)/_layout.tsx
- **Type:** CODE
- **Creates:** `app/(auth)/_layout.tsx`
- **Depends on:** T-009
- **Description:** Stack navigator for the auth flow. No tab bar, no header on most screens.
- **Specs:**
  - Use Expo Router `<Stack>`
  - `phone` screen: `headerShown: false`
  - `otp` screen: `title: "Doğrulama Kodu"`, back button visible
  - `role-select` screen: `headerShown: false`

---

### T-011 · app/(auth)/phone.tsx
- **Type:** CODE
- **Creates:** `app/(auth)/phone.tsx`
- **Depends on:** T-008, T-010
- **Description:** Phone number entry screen. Validates Turkish mobile number format, calls Supabase OTP.
- **Specs:**
  - `TextInput`: `keyboardType="phone-pad"`, placeholder `"+90 5XX XXX XX XX"`
  - Auto-format input as user types: insert spaces at positions 3, 6, 9, 12
  - Validation regex before submit: `/^\+90[5][0-9]{9}$/` (strip spaces first)
  - CTA `Button`: label "Kod Gönder", disabled if invalid, shows `ActivityIndicator` while loading
  - On submit: `supabase.auth.signInWithOtp({ phone })` — phone stored in component state for passing to otp.tsx via router params
  - On success: `router.push({ pathname: '/(auth)/otp', params: { phone } })`
  - Error states:
    - Generic Supabase error → toast "SMS gönderilemedi. Tekrar dene."
    - Network error → toast "İnternet bağlantısı yok."
  - Logo/brand at top center; legal text at bottom: "Devam ederek Gizlilik Politikamızı kabul etmiş olursunuz."

---

### T-012 · app/(auth)/otp.tsx
- **Type:** CODE
- **Creates:** `app/(auth)/otp.tsx`
- **Depends on:** T-008, T-011
- **Description:** 6-digit OTP verification screen. Auto-submits on 6th digit entry.
- **Specs:**
  - Receive `phone` from router params
  - Use `react-native-otp-textinput` for 6-box input
  - Auto-verify on 6th digit — no manual confirm button
  - On verify: `supabase.auth.verifyOtp({ phone, token, type: 'sms' })`
  - On success:
    - If first-time user (no `profiles` row): `router.replace('/(auth)/role-select')`
    - If returning user: `router.replace('/(app)/feed')`
  - Resend button: hidden for first 60 seconds, shows countdown "Tekrar gönder (45s)"
  - After 60s: button becomes tappable, calls `supabase.auth.signInWithOtp({ phone })` again
  - Error: wrong code → shake animation on input boxes + toast "Yanlış kod. Tekrar dene."
  - Subtext: "Kodu +90 5XX XXX XX XX numarasına gönderdik." (masked from params)

---

### T-013 · app/(auth)/role-select.tsx
- **Type:** CODE
- **Creates:** `app/(auth)/role-select.tsx`
- **Depends on:** T-008, T-005 (types)
- **Description:** One-time screen shown after first OTP success. User picks their initial role. Provider path leads to setup form.
- **Specs:**
  - Two large tappable cards (full-width, ~180dp height each):
    - Card 1: icon `search`, title "Hizmet Arıyorum", subtitle "İhtiyacım olan işleri ilanla bul"
    - Card 2: icon `store`, title "Hizmet Veriyorum", subtitle "Kendi bölgemdeki işleri gör, teklif ver"
  - On select "Hizmet Arıyorum":
    1. INSERT `profiles` row via `supabase.auth.getUser()` + upsert with `active_role: 'seeker'`
    2. `router.replace('/(app)/feed')`
  - On select "Hizmet Veriyorum":
    1. INSERT `profiles` row with `active_role: 'provider'`
    2. `router.replace('/(app)/profile/provider-setup')`
  - Show `ActivityIndicator` on selected card while DB write is in progress
  - Note: `profiles` row is normally created by DB trigger on `auth.users` insert. This screen handles the edge case where trigger fails and also sets the initial role.

---

### ✅ Phase 2 Checkpoint

Before moving to Phase 3, verify:
- [ ] Full OTP flow works: enter phone → receive SMS → enter code → land on role-select
- [ ] Returning user skips role-select and lands on feed
- [ ] `supabase.auth.getSession()` returns valid session after login
- [ ] `profiles` row exists in Supabase after completing flow
- [ ] `signOut()` clears session and redirects to phone screen
- [ ] Resend countdown timer works correctly

---

## Phase 3 — Navigation Shell
**Goal:** Tab bar renders correctly for both roles. Empty screens are fine at this stage.

---

### T-014 · app/(app)/_layout.tsx
- **Type:** CODE
- **Creates:** `app/(app)/_layout.tsx`
- **Depends on:** T-008, T-005 (types)
- **Description:** Authenticated shell with a role-aware bottom tab bar. Tabs differ based on `profile.active_role`.
- **Specs:**
  - Use Expo Router `<Tabs>`
  - Read `profile.active_role` from `useAuth()`
  - **Seeker tabs:**
    - Tab 1: `feed` — icon `home`, label "İlanlarım"
    - Tab 2: `post` — icon `plus-circle`, label "İlan Ver"
    - Tab 3: `profile` — icon `account`, label "Profil"
  - **Provider tabs:**
    - Tab 1: `feed` — icon `briefcase-search`, label "Fırsatlar"
    - Tab 2: `post` — `href: null` (hidden, not accessible)
    - Tab 3: `profile` — icon `account`, label "Profil"
  - Tab bar style: white background, active tint `#F97316` (orange), inactive `#9CA3AF`
  - Icons from `@expo/vector-icons` `MaterialCommunityIcons`
  - If `profile === null` (still loading): render nothing (splash still showing)

---

### ✅ Phase 3 Checkpoint

Before moving to Phase 4, verify:
- [ ] Login as new Seeker → see 3 tabs: İlanlarım, İlan Ver, Profil
- [ ] Login as new Provider → see 2 tabs: Fırsatlar, Profil (no İlan Ver tab)
- [ ] Switching role (manually in DB for now) and reloading app reflects new tabs
- [ ] All tab screens render without crash (empty screens OK)

---

## Phase 4 — Shared UI Components
**Goal:** Reusable components used across multiple screens are built once here.

---

### T-015 · components/ui/Button.tsx
- **Type:** CODE
- **Creates:** `components/ui/Button.tsx`
- **Depends on:** T-001
- **Description:** App-wide button component with 3 variants and loading state. Used on every screen.
- **Specs:**
  - Props: `label: string`, `onPress: () => void`, `variant: 'primary' | 'secondary' | 'danger'`, `loading?: boolean`, `disabled?: boolean`, `fullWidth?: boolean`
  - Primary: bg `#F97316`, text white, height 52dp, border-radius 10
  - Secondary: bg transparent, border `#F97316`, text `#F97316`
  - Danger: bg `#EF4444`, text white
  - When `loading`: replace label with `ActivityIndicator` (white)
  - When `disabled || loading`: opacity 0.5, `pointerEvents: 'none'`
  - `fullWidth`: width 100%

---

### T-016 · components/ui/Toast.tsx
- **Type:** CODE
- **Creates:** `components/ui/Toast.tsx`
- **Depends on:** T-001
- **Description:** Cross-platform toast notification. Uses `ToastAndroid` on Android and a custom animated overlay on iOS.
- **Specs:**
  - Export `showToast(message: string, type?: 'success' | 'error' | 'info')` function — callable from anywhere, no React context needed
  - Android: use `ToastAndroid.show(message, ToastAndroid.SHORT)`
  - iOS: animated `View` sliding up from bottom, auto-dismiss after 2.5s
  - iOS colors: success `#22C55E`, error `#EF4444`, info `#3B82F6`
  - Export `<ToastProvider />` component — mount once in `app/_layout.tsx`

---

### T-017 · components/ui/CategoryPicker.tsx
- **Type:** CODE
- **Creates:** `components/ui/CategoryPicker.tsx`
- **Depends on:** T-006, T-015
- **Description:** Reusable single-select category picker rendered as a modal with category cards. Used on Post screen and Provider Setup.
- **Specs:**
  - Props: `value: string | null`, `onChange: (slug: string) => void`, `label?: string`
  - Renders a pressable field showing selected category name (or placeholder "Kategori Seçin")
  - On press: opens `Modal` with full list of 10 categories as tappable rows
  - Each row: category icon (MaterialCommunityIcons) + `label_tr` + urgency badge if `urgency_level === 'urgent'`
  - Selected row: orange checkmark on right
  - Modal header: "Kategori Seçin" + close (X) button
  - On row tap: call `onChange(slug)`, close modal

---

### T-018 · components/ui/LocationPicker.tsx
- **Type:** CODE
- **Creates:** `components/ui/LocationPicker.tsx`
- **Depends on:** T-007, T-015
- **Description:** Two-step city + district picker with search. Used on Post screen and Provider Setup screen.
- **Specs:**
  - Props: `city: string | null`, `district: string | null`, `onCityChange: (city: string) => void`, `onDistrictChange: (district: string) => void`
  - Renders two pressable fields: one for city, one for district (district disabled until city selected)
  - City picker: opens modal with `TextInput` search field + `FlatList` of matching cities from `CITIES`
  - District picker: opens modal with `FlatList` of `getDistricts(selectedCity)`. If empty array → show "Bu il için ilçe verisi yakında eklenecek."
  - On city change: reset district to null, call `onCityChange`
  - Search filters in real-time (case-insensitive, Turkish locale)

---

### ✅ Phase 4 Checkpoint

Before moving to Phase 5, verify:
- [ ] `Button` all three variants render correctly with correct colors
- [ ] `Button` loading state replaces text with spinner
- [ ] `showToast('test', 'success')` shows toast on both iOS and Android
- [ ] `CategoryPicker` opens modal, shows all 10 categories, urgent ones have badge
- [ ] `LocationPicker` selecting Kocaeli then showing districts includes Gebze
- [ ] Selecting a new city resets the district field

---

## Phase 5 — Provider Registration
**Goal:** A user can submit their provider profile and see pending status.

---

### T-019 · lib/imageCompressor.ts
- **Type:** CODE
- **Creates:** `lib/imageCompressor.ts`
- **Depends on:** T-001
- **Description:** Utility that compresses a local image URI to ≤500KB using expo-image-manipulator. Used by both Post Job and Provider Setup screens.
- **Specs:**
  - Export `compressImage(uri: string): Promise<string>` — returns compressed local URI
  - Step 1: Resize to max width 1200px (maintain aspect ratio) using `ImageManipulator.manipulateAsync`
  - Step 2: Save as JPEG at quality 0.7
  - Step 3: Check file size with `FileSystem.getInfoAsync(..., { size: true })`
  - Step 4: If size > 512000 bytes → re-run at quality 0.5
  - Step 5: If still > 512000 bytes → re-run at quality 0.3
  - Return final URI
  - Export `pickAndCompress(): Promise<string | null>` — launches `ImagePicker.launchImageLibraryAsync` then compresses. Returns null if user cancels.
  - `ImagePicker` options: `mediaTypes: 'Images'`, `allowsEditing: false`, `quality: 1` (raw, we compress ourselves)

---

### T-020 · hooks/useProviderProfile.ts
- **Type:** CODE
- **Creates:** `hooks/useProviderProfile.ts`
- **Depends on:** T-004, T-005 (lib/supabase.ts), T-008
- **Description:** Hook encapsulating all provider profile data fetching and mutation logic. Used by provider-setup and profile screens.
- **Specs:**
  - `useProviderProfile()` returns: `{ providerProfile, isLoading, submitProfile, uploadLevha, isSubmitting }`
  - `providerProfile`: fetched from `provider_profiles` where `id = auth.uid()`. Returns `null` if not exists.
  - `submitProfile(data: ProviderProfileInput)`: INSERT into `provider_profiles`. `ProviderProfileInput` type: `{ company_name, vergi_no, categories, city, district, service_radius_km }`.
  - On duplicate `vergi_no` (Postgres unique violation code `23505`): throw error with message `"Bu vergi numarası zaten kayıtlı."`
  - `uploadLevha(uri: string)`: upload file to `vergi-levhasi/{userId}/levha.jpg` bucket via `supabase.storage.from('vergi-levhasi').upload(...)`. Returns public URL (storage path). Does NOT compress — caller should pass already-processed URI.
  - After `submitProfile` success: update `profiles.active_role = 'provider'` if not already set
  - Use React Query `useQuery` for fetch, `useMutation` for submit/upload

---

### T-021 · app/(app)/profile/provider-setup.tsx
- **Type:** CODE
- **Creates:** `app/(app)/profile/provider-setup.tsx`
- **Depends on:** T-015, T-016, T-017, T-018, T-019, T-020
- **Description:** Multi-field provider registration form. Validates all fields client-side, uploads document, submits profile.
- **Specs:**
  - Fields (in order):
    1. Company Name: `TextInput`, required
    2. Vergi No: `TextInput`, `keyboardType="numeric"`, exactly 10 digits, validate on blur
    3. Category multi-select: Grid of all 10 categories (2-column), tap to toggle. Selected = orange border + checkmark. Minimum 1 required.
    4. City + District: use `<LocationPicker />` component
    5. Service radius: `Slider` from `@react-native-community/slider` (if available) or segmented control: 10 / 25 / 50 / 100 / 200 / 500 km. Default 50. Show dynamic text: "50 km yarıçapındaki ilanları göreceksiniz."
    6. Vergi Levhası: Tappable box showing "Belge Yükle" or thumbnail/filename after pick. Use `pickAndCompress()` for images; `expo-document-picker` for PDFs.
  - Submit button: "Başvuruyu Gönder" — disabled until: company_name filled + vergi_no valid 10 digits + ≥1 category + city selected + levha uploaded
  - On submit:
    1. `uploadLevha(uri)` — get storage path
    2. `submitProfile({ ...fields, vergi_levhasi_url: storagePath })`
    3. On success: `router.replace('/(app)/profile')` + `showToast('Başvurunuz alındı. 24 saat içinde onaylanacak.', 'success')`
    4. On `vergi_no` duplicate error: show inline error under Vergi No field
  - Show `ActivityIndicator` with "Yükleniyor..." overlay during submission

---

### ✅ Phase 5 Checkpoint

Before moving to Phase 6, verify:
- [ ] Image compressor: a 5MB photo compresses to ≤500KB
- [ ] Provider setup form: submit button stays disabled until all required fields filled
- [ ] Vergi No rejects 9-digit and 11-digit inputs
- [ ] Levha upload appears in Supabase Storage `vergi-levhasi` bucket after submit
- [ ] `provider_profiles` row created in DB after submit with `verification_status = 'pending'`
- [ ] Duplicate vergi_no shows correct inline error (not a crash)

---

## Phase 6 — Job Posting (Seeker Flow)
**Goal:** A Seeker can post a job with photos and it appears in the database.

---

### T-022 · hooks/usePostJob.ts
- **Type:** CODE
- **Creates:** `hooks/usePostJob.ts`
- **Depends on:** T-004, T-005 (lib/supabase.ts), T-008
- **Description:** Hook that handles photo upload to Supabase Storage and job row insertion. Returns mutation state used by the Post screen.
- **Specs:**
  - Export `usePostJob()` returning `{ postJob, isPosting, error }`
  - `postJob(data: PostJobInput): Promise<Job>` where `PostJobInput = { category_slug, title, description, city, district, localPhotoUris: string[] }`
  - Steps inside `postJob`:
    1. Check `NetInfo.isConnected()` — throw `'OFFLINE'` error if false
    2. For each `localPhotoUri`: upload to `job-photos/{newJobId}/{index}.jpg` via Supabase Storage. Collect public URLs.
    3. INSERT into `jobs` table: all fields + `photo_urls` array + `seeker_id: auth.uid()`
    4. Return the created `Job` row
  - Generate `newJobId` via `crypto.randomUUID()` before upload (needed for storage path)
  - On upload failure for a single photo: retry once, then throw with photo index info
  - Use React Query `useMutation`

---

### T-023 · app/(app)/post/index.tsx
- **Type:** CODE
- **Creates:** `app/(app)/post/index.tsx`
- **Depends on:** T-015, T-016, T-017, T-018, T-019, T-022
- **Description:** The job posting screen. Optimized for factory-floor use (large touch targets, minimal typing).
- **Specs:**
  - **Photo section:** Row of 3 dashed-border boxes (equal width, ~120dp height). Each box:
    - Empty state: camera icon + "Fotoğraf Ekle"
    - Filled state: image thumbnail + small X button to remove
    - Tap empty box → `pickAndCompress()` → fill that box slot
    - At least 1 photo required before submit
  - **Category:** `<CategoryPicker />` component, required
  - **Location:** `<LocationPicker />` component, city required
  - **Description:** `TextInput` multiline, placeholder "Teknik detaylar, ölçüler, aciliyet...", max 500 chars. Character counter bottom-right: "XXX/500"
  - **KVKK notice:** Gray small text above submit: "Onaylı firmalar ilanınızı ve telefon numaranızı görebilir."
  - **Submit button:** Full-width `<Button variant="primary" label="Teklif Al" />`
  - Submit disabled if: 0 photos OR no category OR no city
  - On submit:
    1. `postJob({ category_slug, title: categoryLabel + ' - ' + city, description, city, district, localPhotoUris })`
       - Auto-generate title from category + location if user hasn't typed one (no title field in MVP)
    2. On success: `router.replace('/job/' + newJob.id)` + `showToast('İlanınız yayınlandı!', 'success')`
    3. On `OFFLINE` error: `showToast('İnternet bağlantısı yok. Lütfen tekrar deneyin.', 'error')`
  - Show full-screen loading overlay during submission with "İlan yayınlanıyor..."
  - After first successful post: call `registerPushToken()` from `lib/notifications.ts` (imported but implemented in Phase 10)

---

### ✅ Phase 6 Checkpoint

Before moving to Phase 7, verify:
- [ ] Can select 1–3 photos, each compresses to ≤500KB before upload
- [ ] Removing a photo (X button) works; slot becomes empty again
- [ ] Submit disabled until photo + category + city all filled
- [ ] After submit: `jobs` row in Supabase with correct `seeker_id`, `category_slug`, `photo_urls`
- [ ] Photos appear in `job-photos` bucket with correct path structure
- [ ] Offline guard: disable WiFi, tap submit → toast appears, no crash
- [ ] `expires_at` is exactly 72 hours from `created_at` in DB

---

## Phase 7 — Feed Screens
**Goal:** Both Seeker (My Jobs) and Provider (Lead Feed) feeds display correctly with correct data.

---

### T-024 · components/JobCard.tsx
- **Type:** CODE
- **Creates:** `components/JobCard.tsx`
- **Depends on:** T-004, T-006, T-005 (lib/supabase.ts)
- **Description:** Shared job card component rendered in both Seeker and Provider feeds. Renders differently based on `mode` prop.
- **Specs:**
  - Props: `job: Job`, `mode: 'seeker' | 'provider'`, `onPress: () => void`
  - Common elements:
    - Photo thumbnail (first `photo_urls` item) — use `expo-image`, 80×80dp, rounded corners. Fallback: category icon if no photo.
    - Category chip: small pill with category `label_tr`
    - City + district text
    - Time ago: "23 dk önce", "2 saat önce", "1 gün önce" (computed from `created_at`)
    - Urgent badge: red "ACİL" chip if category slug in `URGENT_SLUGS`
  - **Provider mode** additional elements:
    - Distance badge: `"{distance_km} km uzakta"` — orange pill, top-right of card
  - **Seeker mode** additional elements:
    - Status chip: "Aktif" (green) / "Süresi Doldu" (gray) / "Kapalı" (red)
    - Contact count: `"{n} firma ilgilendi"` (small gray text) — shown only if n > 0
  - Card: white background, 12dp border-radius, subtle shadow, 12dp margin-bottom

---

### T-025 · hooks/useProviderFeed.ts
- **Type:** CODE
- **Creates:** `hooks/useProviderFeed.ts`
- **Depends on:** T-004, T-005 (lib/supabase.ts), T-008
- **Description:** Paginated, radius-filtered job feed hook for providers. Calls FastAPI `/jobs/feed` endpoint, not Supabase directly (because PostGIS radius filter runs server-side).
- **Specs:**
  - Export `useProviderFeed(categoryFilter?: string)` returning `{ jobs, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage, refetch }`
  - Calls `GET {API_BASE_URL}/jobs/feed?page={page}&limit=20&category={categoryFilter}`
  - `Authorization: Bearer {supabaseSession.access_token}` header
  - Uses React Query `useInfiniteQuery` with `pageParam` starting at 0
  - `getNextPageParam`: if returned array length === 20, return `currentPage + 1`, else `undefined`
  - Flattens pages into single `jobs: Job[]` array
  - `categoryFilter`: if provided, appends `&category=slug` to query. If `'all'` or undefined, omits param.
  - Refetch on window focus: false (avoid jarring re-renders while provider is in WhatsApp)
  - Export `API_BASE_URL` constant read from `process.env.EXPO_PUBLIC_API_URL`

---

### T-026 · hooks/useMyJobs.ts
- **Type:** CODE
- **Creates:** `hooks/useMyJobs.ts`
- **Depends on:** T-004, T-005 (lib/supabase.ts), T-008
- **Description:** Hook fetching the current seeker's own jobs, with contact count per job.
- **Specs:**
  - Export `useMyJobs()` returning `{ jobs, isLoading, refetch }`
  - Query: `supabase.from('jobs').select('*, contact_count:contact_logs(count)').eq('seeker_id', userId).order('created_at', { ascending: false })`
  - Map result: attach `contactCount: number` to each job from the aggregated count
  - Use React Query `useQuery` with key `['my-jobs', userId]`
  - Invalidate this query after `postJob` mutation succeeds (wire up in T-022)

---

### T-027 · app/(app)/feed/index.tsx
- **Type:** CODE
- **Creates:** `app/(app)/feed/index.tsx`
- **Depends on:** T-008, T-024, T-025, T-026, T-006
- **Description:** Role-aware feed screen. Renders Seeker's own jobs or Provider's lead feed based on `active_role`.
- **Specs:**
  **Provider mode:**
  - Verification gate: if `providerProfile.verification_status === 'pending'` → show centered message: amber icon + "Profiliniz inceleniyor" + "Onaylandığında ilanları görebileceksiniz." No feed shown.
  - If `verification_status === 'rejected'` → show rejection message + "Profili Güncelle" button navigating to provider-setup
  - If `approved`:
    - Horizontal filter chips: "Tümü" + one chip per provider's registered categories. Active chip: orange background.
    - `FlatList` using `useProviderFeed(selectedCategory)`
    - Infinite scroll: `onEndReached` calls `fetchNextPage`
    - Pull-to-refresh: `refetch()`
    - Empty state: briefcase icon + "Bölgenizde yeni ilan yok." + "Bildirimler açıksa sizi haberdar edeceğiz."

  **Seeker mode:**
  - `FlatList` using `useMyJobs()`
  - Pull-to-refresh
  - FAB (+) button bottom-right: `router.push('/(app)/post')`
  - Empty state: post-box icon + "Henüz ilan vermediniz." + `<Button label="İlk İlanını Ver" onPress={() => router.push('/(app)/post')} />`

  **Common:**
  - Tap any job card → `router.push('/job/' + job.id)`
  - `KeyboardAvoidingView` not needed (no input here)

---

### ✅ Phase 7 Checkpoint

Before moving to Phase 8, verify:
- [ ] Seeker feed: posted jobs appear with correct status chips
- [ ] Provider feed: only shows jobs within registered radius (test with jobs outside radius)
- [ ] Category filter chips filter the feed correctly
- [ ] Infinite scroll loads next 20 items on scroll to bottom
- [ ] Pull-to-refresh fetches fresh data
- [ ] Pending provider sees gate screen, not job list
- [ ] Empty state renders for seeker with no jobs
- [ ] Tapping a job card navigates to `/job/[id]` (screen can be placeholder for now)

---

## Phase 8 — Job Detail & WhatsApp Bridge
**Goal:** The core value-delivery mechanism — provider opens WhatsApp to contact seeker.

---

### T-028 · lib/whatsapp.ts
- **Type:** CODE
- **Creates:** `lib/whatsapp.ts`
- **Depends on:** T-004, T-005 (lib/supabase.ts)
- **Description:** All WhatsApp bridge logic isolated in one file. Builds deep-link URL, logs the contact, handles fallback.
- **Specs:**
  - Export `buildWhatsAppUrl(seekerPhone: string, jobTitle: string): string`
    - Strip `+` from phone: `phone.replace('+', '')`
    - Message template (exact Turkish text): `"Merhaba! Hızlısanayi üzerinden "${jobTitle}" ilanınızı gördüm ve teklif vermek istiyorum. Müsait misiniz?"`
    - Return: `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
  - Export `openWhatsApp(seekerPhone: string, jobTitle: string): Promise<void>`
    - Call `Linking.canOpenURL(url)` — if false, show `Alert` with options: "Numarayı Kopyala" (`Clipboard.setStringAsync`) and "Vazgeç"
    - If true: `Linking.openURL(url)`
  - Export `logAndOpenWhatsApp(job: Job, providerId: string, supabaseClient): Promise<void>`
    - Fire-and-forget insert: `supabaseClient.from('contact_logs').insert({ job_id, provider_id, seeker_id })`
    - Immediately (without awaiting): call `openWhatsApp(job.seeker_phone!, job.title)`
    - Catch duplicate insert silently (unique constraint violation is expected on re-tap)

---

### T-029 · hooks/useJobDetail.ts
- **Type:** CODE
- **Creates:** `hooks/useJobDetail.ts`
- **Depends on:** T-004, T-005 (lib/supabase.ts), T-008
- **Description:** Hook that fetches full job detail including seeker phone (needed for WhatsApp bridge) and contact count.
- **Specs:**
  - Export `useJobDetail(jobId: string)` returning `{ job, isLoading, closeJob, isClosing }`
  - Query: `supabase.from('jobs').select('*, profiles!seeker_id(phone, full_name), contact_count:contact_logs(count)').eq('id', jobId).single()`
  - Map result: attach `seeker_phone` and `seeker_name` from joined `profiles`, `contact_count` from aggregate
  - `closeJob()`: UPDATE `jobs SET status = 'closed' WHERE id = jobId AND seeker_id = auth.uid()`
  - After `closeJob` success: invalidate `['my-jobs']` query
  - Use React Query `useQuery` with key `['job', jobId]`

---

### T-030 · app/(app)/job/[id].tsx
- **Type:** CODE
- **Creates:** `app/(app)/job/[id].tsx`
- **Depends on:** T-008, T-028, T-029, T-015, T-016
- **Description:** Job detail screen. Fully role-aware — provider sees the WhatsApp bridge, seeker sees their own job stats.
- **Specs:**
  - Get `id` from `useLocalSearchParams()`
  - Use `useJobDetail(id)` and `useAuth()`
  - Show `ActivityIndicator` while loading
  - **Common elements:**
    - If `job.photo_urls.length > 0`: full-width image carousel (paged `ScrollView` horizontal, 250dp height). Show page indicator dots.
    - Category chip + city/district text
    - "Yayınlandı: X saat önce" + "Süresi: XX saat kaldı" (computed from `expires_at`)
    - Description text (gray, 14sp)

  - **Provider elements (active_role === 'provider'):**
    - Distance: `"{distance_km} km uzakta"` — orange bold text
    - **The Golden Button:** `<Button>` override: bg `#25D366`, height 56dp, full-width, label "WhatsApp'tan Teklif Ver 💬"
      - On first press: call `logAndOpenWhatsApp(job, userId, supabase)`, set local state `hasContacted = true`
      - If `hasContacted`: button label changes to "WhatsApp Açıldı ✓", bg `#9CA3AF`, disabled
    - "İlgilenmiyor" text button below: sets local state to hide job in parent feed (via React Query cache update)

  - **Seeker elements (active_role === 'seeker' AND job.seeker_id === userId):**
    - Contact count: large number + "firma ilanınıza WhatsApp'tan ulaştı" (or "Henüz teklif gelmedi")
    - "İlanı Kapat" danger button → calls `closeJob()` with confirm Alert first
    - After close: `showToast('İlanınız kapatıldı.', 'info')` + `router.back()`

  - If job status is `'expired'` or `'closed'`: show banner "Bu ilan artık aktif değil." and disable Golden Button

---

### ✅ Phase 8 Checkpoint

Before Moving to Phase 9, verify:
- [ ] Provider: tapping Golden Button opens WhatsApp with correct pre-filled message
- [ ] Provider: button turns gray and disabled after first tap
- [ ] `contact_logs` row created in Supabase after tap
- [ ] Duplicate tap (re-entering screen, tapping again): no duplicate DB row, no crash
- [ ] WhatsApp not installed: Alert shows "Numarayı Kopyala" option
- [ ] Seeker: sees correct contact count on their job
- [ ] Seeker: "İlanı Kapat" with confirm dialog sets status to `'closed'`
- [ ] Expired job: Golden Button is disabled with "artık aktif değil" banner
- [ ] Photo carousel swipes correctly between multiple photos

---

## Phase 9 — Profile Screen
**Goal:** Users can view their profile, switch roles, and see provider verification status.

---

### T-031 · app/(app)/profile/index.tsx
- **Type:** CODE
- **Creates:** `app/(app)/profile/index.tsx`
- **Depends on:** T-008, T-015, T-016, T-020
- **Description:** Profile screen showing user info, role toggle, provider status, and sign-out.
- **Specs:**
  - **User info section:**
    - Phone number (from `profile.phone`) — read-only, masked: `+90 5XX XXX ** **`
    - Full name: tappable → inline edit `TextInput` → UPDATE `profiles.full_name` on blur
  - **Role switcher row:**
    - Label: "Aktif Mod"
    - Toggle/segmented control: "Hizmet Arıyorum" | "Hizmet Veriyorum"
    - Active selection = orange background
    - On switch: call `switchRole(newRole)` from `useAuth()`
    - After switch: tab bar re-renders automatically (context update)
  - **Provider section (shown if `providerProfile` exists):**
    - Company name (read-only)
    - Vergi No (read-only, last 4 digits masked: `1234XXXXXX`)
    - Categories list (comma-separated `label_tr` values)
    - Status chip:
      - `pending`: amber "İnceleniyor ⏳"
      - `approved`: green "Onaylı İşletme ✓" + `verified_at` date
      - `rejected`: red "Reddedildi" + `rejection_reason` in small gray text + `<Button label="Tekrar Başvur" />` → navigates to provider-setup with pre-filled data
  - **Provider CTA (shown if no `providerProfile`):**
    - `<Button variant="secondary" label="Hizmet Sağlayıcı Ol" />` → `router.push('/(app)/profile/provider-setup')`
  - **Notification settings row:**
    - "Yeni ilan bildirimleri" + `Switch` component
    - On enable: call `registerPushToken()` from `lib/notifications.ts`
    - On disable: DELETE push token from DB
  - **Sign out:**
    - `<Button variant="danger" label="Çıkış Yap" />` at very bottom
    - Confirm `Alert` before signing out

---

### ✅ Phase 9 Checkpoint

Before moving to Phase 10, verify:
- [ ] Role switcher switches `active_role` in DB + immediately changes tab bar
- [ ] Provider with `pending` status sees amber chip
- [ ] Provider with `rejected` status sees reason and "Tekrar Başvur" button
- [ ] Full name is editable and saved to DB
- [ ] Sign out clears session and redirects to phone screen
- [ ] "Hizmet Sağlayıcı Ol" navigates to provider-setup for seeker-only users

---

## Phase 10 — Push Notifications
**Goal:** Providers receive push alerts for new jobs. Verification status changes trigger notifications.

---

### T-032 · lib/notifications.ts
- **Type:** CODE
- **Creates:** `lib/notifications.ts`
- **Depends on:** T-004, T-005 (lib/supabase.ts)
- **Description:** All Expo push notification logic. Token registration, permission handling, and deep-link routing on notification tap.
- **Specs:**
  - Export `registerPushToken(userId: string): Promise<void>`
    - Bail early if `!Device.isDevice` (simulator)
    - Call `Notifications.requestPermissionsAsync()`
    - If `status !== 'granted'`: return silently (don't throw — user said no, that's OK)
    - Get token: `Notifications.getExpoPushTokenAsync({ projectId: Constants.expoConfig.extra.eas.projectId })`
    - Upsert into `push_tokens`: `{ user_id, token, platform: Platform.OS }`
  - Export `setupNotificationListeners(router): () => void`
    - Configure `Notifications.setNotificationHandler` with `shouldShowAlert: true`, `shouldPlaySound: true`
    - `addNotificationResponseReceivedListener`: on tap, read `data.jobId` from notification payload → `router.push('/job/' + jobId)`
    - Returns cleanup function (removes listeners) — call in `useEffect` cleanup in `_layout.tsx`
  - Export `deletePushToken(userId: string): Promise<void>` — deletes all tokens for user from DB

---

### M-004 · Configure Supabase Webhook for Push Triggers
- **Type:** MANUAL
- **Depends on:** T-032, Phase 11 FastAPI deployment
- **Steps:**
  1. Supabase Dashboard → Database → Webhooks → Create Webhook
  2. Name: `provider_verification_changed`
  3. Table: `provider_profiles`, Events: `UPDATE`
  4. URL: `{FASTAPI_BASE_URL}/webhooks/verification-changed`
  5. HTTP method: POST, include `Authorization: Bearer {SUPABASE_WEBHOOK_SECRET}` header
  6. Create second webhook: Name `new_job_posted`, Table: `jobs`, Events: `INSERT`, URL: `{FASTAPI_BASE_URL}/webhooks/new-job`

---

### ✅ Phase 10 Checkpoint

Before moving to Phase 11, verify:
- [ ] On physical iOS/Android device: `registerPushToken` saves token to `push_tokens` table
- [ ] Permission denied → no crash, notification toggle in Profile shows as off
- [ ] Tapping a push notification (when app is backgrounded) navigates to correct job detail
- [ ] `deletePushToken` removes row from DB

---

## Phase 11 — FastAPI Backend: Foundation
**Goal:** Authenticated FastAPI server running, connected to Supabase, with middleware ready.

---

### T-033 · backend/requirements.txt
- **Type:** CODE
- **Creates:** `backend/requirements.txt`
- **Depends on:** —
- **Description:** All Python dependencies for the FastAPI backend.
- **Specs (exact versions):**
  ```
  fastapi==0.115.0
  uvicorn[standard]==0.30.6
  supabase==2.7.4
  python-jose[cryptography]==3.3.0
  python-multipart==0.0.12
  httpx==0.27.2
  pydantic-settings==2.5.2
  pydantic==2.9.2
  python-dotenv==1.0.1
  ```

---

### T-034 · backend/core/config.py
- **Type:** CODE
- **Creates:** `backend/core/config.py`
- **Depends on:** T-033
- **Description:** Pydantic Settings class reading all env vars. Single source of truth for config throughout the backend.
- **Specs:**
  - Use `pydantic_settings.BaseSettings`
  - Fields: `SUPABASE_URL: str`, `SUPABASE_SERVICE_ROLE_KEY: str`, `SUPABASE_JWT_SECRET: str`, `EXPO_PUSH_API_URL: str = "https://exp.host/--/api/v2/push/send"`, `SUPABASE_WEBHOOK_SECRET: str`
  - Load from `backend/.env`
  - Export singleton: `settings = Settings()`

---

### T-035 · backend/core/supabase_client.py
- **Type:** CODE
- **Creates:** `backend/core/supabase_client.py`
- **Depends on:** T-034
- **Description:** Supabase Python client using the service role key (bypasses RLS for server-side operations).
- **Specs:**
  - `from supabase import create_client`
  - Create client with `settings.SUPABASE_URL` and `settings.SUPABASE_SERVICE_ROLE_KEY`
  - Export: `supabase_admin = create_client(...)`
  - This client has full DB access — only use in server-side route handlers, never expose to client

---

### T-036 · backend/core/auth.py
- **Type:** CODE
- **Creates:** `backend/core/auth.py`
- **Depends on:** T-034
- **Description:** FastAPI dependency that validates the Supabase JWT from the `Authorization` header. Injects `user_id` into route handlers.
- **Specs:**
  - `get_current_user(authorization: str = Header(...)) -> str`
  - Extract bearer token from header
  - Decode JWT using `python-jose` with `settings.SUPABASE_JWT_SECRET`, algorithm `HS256`
  - Return `payload['sub']` (the user UUID)
  - Raise `HTTPException(status_code=401)` if token missing, expired, or invalid
  - Export as FastAPI `Depends`: `CurrentUser = Depends(get_current_user)`

---

### T-037 · backend/main.py
- **Type:** CODE
- **Creates:** `backend/main.py`
- **Depends on:** T-034, T-035, T-036
- **Description:** FastAPI app entry point. Registers all routers and configures CORS.
- **Specs:**
  - Create `FastAPI(title="Hızlısanayi API", version="1.0.0")`
  - CORS middleware: allow origins `["*"]` for MVP (restrict to app domain in production)
  - Include routers (to be created in Phase 12): `jobs`, `providers`, `contact`, `push_tokens`, `webhooks`
  - `GET /health` endpoint returning `{"status": "ok"}`
  - Run with `uvicorn main:app --host 0.0.0.0 --port 8000`

---

### ✅ Phase 11 Checkpoint

Before moving to Phase 12, verify:
- [ ] `uvicorn main:app --reload` starts without errors
- [ ] `GET /health` returns `{"status": "ok"}`
- [ ] `GET /` returns 404 (not 500)
- [ ] `core/auth.py`: test with invalid token → 401. Test with valid Supabase token → returns user UUID.
- [ ] `supabase_admin` can query `categories` table and return 10 rows

---

## Phase 12 — FastAPI Routers
**Goal:** All API endpoints implemented, tested via curl/Postman.

---

### T-038 · backend/routers/providers.py
- **Type:** CODE
- **Creates:** `backend/routers/providers.py`
- **Depends on:** T-035, T-036
- **Description:** Provider registration and profile management endpoints.
- **Specs:**
  - `POST /providers/register` — body: `{ company_name, vergi_no, categories, city, district, service_radius_km }`. Insert into `provider_profiles`. If `vergi_no` unique violation → 409 with `{"detail": "Bu vergi numarası zaten kayıtlı."}`. Requires `CurrentUser`.
  - `POST /providers/upload-levha` — `multipart/form-data` with `file` field. Upload to Supabase Storage `vergi-levhasi/{user_id}/levha.jpg`. Update `provider_profiles.vergi_levhasi_url`. Max 5MB check server-side too.
  - `GET /providers/me` — returns `provider_profiles` row for current user. 404 if no row.
  - All routes require `CurrentUser` dependency.

---

### T-039 · backend/routers/jobs.py
- **Type:** CODE
- **Creates:** `backend/routers/jobs.py`
- **Depends on:** T-035, T-036
- **Description:** Job CRUD endpoints including the radius-filtered provider feed using PostGIS.
- **Specs:**
  - `POST /jobs` — body: `{ category_slug, title, description, city, district, photo_urls: list[str] }`. Insert into `jobs` with `seeker_id = current_user`. Return created job.
  - `GET /jobs/feed` — provider feed. Params: `page=0`, `limit=20`, `category` (optional).
    - Fetch `provider_profiles` for `current_user` — 403 if not found or not approved.
    - Run PostGIS query via Supabase RPC or raw SQL: filter by category + `ST_DWithin(jobs.location, provider.location, radius_meters)`.
    - Join with `profiles` to get `seeker_phone`, `seeker_name`.
    - Compute `distance_km` per job: `ST_Distance(job.location, provider.location) / 1000`.
    - Filter: `status = 'active'` AND `expires_at > NOW()`.
    - Sort: `urgency_level DESC` (urgent first), then `created_at DESC`.
    - Return paginated list.
  - `GET /jobs/{job_id}` — single job. If `active_role = provider`: join seeker phone. If `active_role = seeker`: join contact count.
  - `PATCH /jobs/{job_id}` — body: `{ status: 'closed' }`. Only allowed if `seeker_id = current_user`. 403 otherwise.
  - `GET /jobs/mine` — all jobs where `seeker_id = current_user`, newest first, with contact count.

---

### T-040 · backend/routers/contact.py
- **Type:** CODE
- **Creates:** `backend/routers/contact.py`
- **Depends on:** T-035, T-036
- **Description:** WhatsApp bridge click logging endpoint. Also validates job is still active before logging.
- **Specs:**
  - `POST /jobs/{job_id}/contact`
    - Fetch job — 404 if not found.
    - If `job.status != 'active'` OR `job.expires_at < now()` → 410 Gone with `{"detail": "Bu ilan artık aktif değil."}`.
    - Insert into `contact_logs`: `{ job_id, provider_id: current_user, seeker_id: job.seeker_id }`.
    - On unique violation (already contacted): return 200 silently (idempotent).
    - Return `{"success": true}`.
  - Note: Push notification to seeker (P1) will be added here in V1.1.

---

### T-041 · backend/routers/push_tokens.py
- **Type:** CODE
- **Creates:** `backend/routers/push_tokens.py`
- **Depends on:** T-035, T-036
- **Description:** Push token registration endpoint.
- **Specs:**
  - `POST /push-tokens` — body: `{ token: str, platform: 'ios' | 'android' }`. Upsert into `push_tokens`. On conflict on `token`: update `user_id` (handles reinstalls). Return `{"success": true}`.
  - `DELETE /push-tokens` — delete all tokens for `current_user`. Used when user disables notifications.

---

### T-042 · backend/services/push_service.py
- **Type:** CODE
- **Creates:** `backend/services/push_service.py`
- **Depends on:** T-034
- **Description:** Service that calls the Expo Push Notifications HTTP API to deliver push messages.
- **Specs:**
  - `send_push_notifications(tokens: list[str], title: str, body: str, data: dict) -> None`
  - Batch tokens into groups of 100 (Expo API limit)
  - POST to `settings.EXPO_PUSH_API_URL` with JSON body: `[{ to, title, body, data, sound: 'default' }]`
  - Use `httpx.AsyncClient` (async)
  - Log delivery errors per token (don't crash if one token is invalid)
  - Export `notify_provider(provider_id: str, title: str, body: str, data: dict)` — fetches all tokens for provider from DB, then calls `send_push_notifications`
  - Export `notify_verification_result(provider_id: str, approved: bool, reason: str = None)` — calls `notify_provider` with appropriate title/body based on approval result

---

### T-043 · backend/routers/webhooks.py
- **Type:** CODE
- **Creates:** `backend/routers/webhooks.py`
- **Depends on:** T-035, T-042
- **Description:** Supabase webhook receivers for verification changes and new job posts.
- **Specs:**
  - Verify `Authorization` header matches `settings.SUPABASE_WEBHOOK_SECRET` — return 401 if mismatch
  - `POST /webhooks/verification-changed` — payload has `record` (new row) and `old_record`.
    - If `record.verification_status != old_record.verification_status`:
      - If `'approved'`: call `notify_verification_result(record.id, approved=True)`
      - If `'rejected'`: call `notify_verification_result(record.id, approved=False, reason=record.rejection_reason)`
  - `POST /webhooks/new-job` — payload has `record` (new job row).
    - Query `provider_profiles` where: category overlap with `record.category_slug` AND `ST_DWithin(location, record.location, service_radius_km * 1000)` AND `verification_status = 'approved'`
    - For each matching provider: call `notify_provider(provider_id, title="Yeni İlan: {category}", body="{city}/{district} bölgesinde yeni bir {category} işi var.", data={"jobId": record.id})`
    - Urgent categories: process synchronously. Standard: can be fire-and-forget (background task via `BackgroundTasks`)

---

### ✅ Phase 12 Checkpoint

Test all endpoints with curl or Postman using a real Supabase token:
- [ ] `POST /providers/register` → row in DB
- [ ] `POST /providers/register` with duplicate vergi_no → 409
- [ ] `GET /jobs/feed` → returns jobs within provider's radius, not outside
- [ ] `GET /jobs/feed` with `?category=cnc` → only CNC jobs
- [ ] `POST /jobs/{id}/contact` → row in `contact_logs`
- [ ] `POST /jobs/{id}/contact` second time → 200 (no duplicate)
- [ ] `PATCH /jobs/{id}` with other user's token → 403
- [ ] `POST /push-tokens` → row in DB
- [ ] Push service: `notify_provider` sends notification to physical device

---

## Phase 13 — Automated Job Expiry
**Goal:** Jobs older than 72 hours auto-close without manual intervention.

---

### T-044 · Supabase Job Expiry Function
- **Type:** MANUAL (SQL)
- **Depends on:** M-002
- **Steps:**
  1. Supabase Dashboard → Database → Functions → Create Function
  2. Name: `expire_old_jobs`
  3. SQL body:
     ```sql
     UPDATE public.jobs
     SET status = 'expired', updated_at = NOW()
     WHERE status = 'active'
       AND expires_at < NOW();
     ```
  4. Save function.
  5. Go to Database → Extensions → Enable `pg_cron` (if available on your plan)
  6. Schedule: `SELECT cron.schedule('expire-jobs', '*/15 * * * *', 'SELECT expire_old_jobs()');`
  7. If `pg_cron` not available on free plan: create a Supabase Edge Function (`expire-jobs`) that runs the SQL and schedule via Supabase Edge Function cron trigger.

---

### ✅ Phase 13 Checkpoint

- [ ] Manually set a job's `expires_at` to 1 minute in the past
- [ ] Wait for cron to run (max 15 minutes) or manually invoke function
- [ ] Verify `status` changed to `'expired'` in DB
- [ ] Verify the expired job no longer appears in provider feed

---

## Phase 14 — Deployment
**Goal:** App buildable via EAS, backend live on AWS.

---

### M-005 · EAS Build Configuration
- **Type:** MANUAL
- **Depends on:** T-002, all Expo tasks
- **Steps:**
  1. `npm install -g eas-cli && eas login`
  2. `eas build:configure` in project root → generates `eas.json`
  3. Configure profiles in `eas.json`:
     - `preview`: `distribution: internal`, `android.buildType: apk` (for TestFlight/APK sharing)
     - `production`: `distribution: store`
  4. Set EAS secrets: `eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value ...`
  5. Build preview APK: `eas build --platform android --profile preview`
  6. Share APK link with beta testers

---

### M-006 · FastAPI Deployment (AWS Elastic Beanstalk)
- **Type:** MANUAL
- **Depends on:** Phase 12 complete
- **Steps:**
  1. Create `backend/Procfile`: `web: uvicorn main:app --host 0.0.0.0 --port 8000`
  2. Create `backend/.ebextensions/python.config` with Python 3.11 platform config
  3. `eb init hizlisanayi-backend --platform python-3.11 --region eu-central-1`
  4. `eb create hizlisanayi-prod --single` (single instance for MVP)
  5. Set env vars: `eb setenv SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... ...`
  6. `eb deploy`
  7. Note the EB URL → set as `EXPO_PUBLIC_API_URL` in Expo env
  8. Update `M-004` Supabase webhooks with the real EB URL

---

### ✅ Phase 14 Checkpoint

- [ ] `eas build` completes without error, APK installable on physical Android device
- [ ] Full E2E flow on device: register → post job → switch to provider role → see job in feed → tap WhatsApp → WhatsApp opens with correct message
- [ ] FastAPI EB health check: `GET https://{eb-url}/health` returns `{"status": "ok"}`
- [ ] Supabase webhooks fire correctly: new job → push notification delivered within 30 seconds

---

## Task Summary

| Phase | Tasks | Type |
|:---|:---|:---|
| 0 — Infrastructure | M-001, M-002, M-003, T-001, T-002, T-003, T-004 | 3 manual + 4 code |
| 1 — Types & Constants | T-005, T-006, T-007 | 3 code |
| 2 — Auth | T-008, T-009, T-010, T-011, T-012, T-013 | 6 code |
| 3 — Navigation | T-014 | 1 code |
| 4 — UI Components | T-015, T-016, T-017, T-018 | 4 code |
| 5 — Provider Setup | T-019, T-020, T-021 | 3 code |
| 6 — Job Posting | T-022, T-023 | 2 code |
| 7 — Feed | T-024, T-025, T-026, T-027 | 4 code |
| 8 — Job Detail + Bridge | T-028, T-029, T-030 | 3 code |
| 9 — Profile | T-031 | 1 code |
| 10 — Push Notifications | T-032, M-004 | 1 code + 1 manual |
| 11 — FastAPI Foundation | T-033, T-034, T-035, T-036, T-037 | 5 code |
| 12 — FastAPI Routers | T-038, T-039, T-040, T-041, T-042, T-043 | 6 code |
| 13 — Job Expiry | T-044 | 1 manual (SQL) |
| 14 — Deployment | M-005, M-006 | 2 manual |
| **Total** | **44 tasks** | **34 code + 10 manual** |

---

## Dependency Graph (Critical Path)

```
M-001 → M-002 → M-003
     ↓
T-001 → T-002 → T-003 → T-004
                           ↓
                    T-005 → T-006 → T-007
                           ↓
                    T-008 → T-009 → T-010 → T-011 → T-012 → T-013
                                    ↓
                              T-014 (tab bar)
                                    ↓
                    T-015, T-016, T-017, T-018 (UI components — can parallelize)
                                    ↓
                    T-019 → T-020 → T-021 (provider setup)
                    T-022 → T-023 (post job)
                    T-024 → T-025 → T-026 → T-027 (feed)
                    T-028 → T-029 → T-030 (job detail)
                                    ↓
                              T-031 (profile)
                              T-032 (notifications)
                                    ↓
                    T-033 → T-034 → T-035 → T-036 → T-037 (FastAPI base)
                                    ↓
                    T-038, T-039, T-040, T-041 (routers — can parallelize)
                    T-042 → T-043 (push service + webhooks)
```

**Tasks that can be parallelized (if two Claude Code sessions are running):**
- T-015, T-016, T-017, T-018 (all independent UI components)
- T-038, T-039, T-040, T-041 (FastAPI routers, all depend only on T-036/T-037)
- Frontend (T-019 onward) and Backend (T-033 onward) can run in parallel after Phase 1

---

*Do not skip checkpoints. Each checkpoint catches integration issues before they compound into hard-to-debug problems.*