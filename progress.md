# Hızlısanayi — Build Progress

## Phase 0 — Infrastructure Setup ✅ (2026-04-22)

**Code tasks done:**
- T-001: Expo project scaffolded (`hizlisanayi/`), all deps installed, dirs created, tsconfig updated
- T-002: `app.config.ts` — typed Expo config with bundle IDs, permissions, plugins, env vars
- T-003: `.env.example` (Expo) + `backend/.env.example` — all required env vars documented
- T-004: `lib/supabase.ts` — singleton client with AsyncStorage session persistence

**Manual tasks (user must complete before Phase 1):**
- M-001: Create Supabase project (`hizlisanayi`, region `eu-central-1`), save URL + keys
- M-002: Run full SQL schema from `MVP.md §3` in Supabase SQL Editor
- M-003: Create `job-photos` (public) and `vergi-levhasi` (private) storage buckets

**Phase 0 Checkpoint:** ✅ All passed
- 6 tables deployed + 10 category rows confirmed
- Both storage buckets created
- `.env` filled with Supabase keys
- TypeScript passes clean
- Cron job scheduled (expire jobs every 15 min)

---

## Phase 1 — Types & Constants ✅ (2026-04-22)

- T-005: `types/database.ts` — all 6 interfaces + 3 type aliases
- T-006: `constants/categories.ts` — 10 categories, `getCategoryBySlug`, `URGENT_SLUGS`
- T-007: `constants/locations.ts` — 81 cities, full districts for 10 priority cities, `getDistricts`

**Checkpoint passed:** tsc clean, 10 categories, Gebze in Kocaeli districts

---

## Phase 2 — Authentication Layer ✅ (2026-04-22)

- T-008: `context/AuthContext.tsx` — session, profile state, signOut, switchRole
- T-009: `app/_layout.tsx` — root layout with QueryClientProvider + auth guard routing
- T-010: `app/(auth)/_layout.tsx` — Stack navigator for auth flow
- T-011: `app/(auth)/phone.tsx` — phone entry with E.164 formatting + OTP trigger
- T-012: `app/(auth)/otp.tsx` — 6-digit OTP, auto-verify, shake on error, resend countdown
- T-013: `app/(auth)/role-select.tsx` — seeker/provider role picker with DB upsert

**Checkpoint:** tsc clean, placeholder screens for feed + provider-setup added

---

## Phase 3 — Navigation Shell ✅ (2026-04-22)

- T-014: `app/(app)/_layout.tsx` — role-aware Tabs navigator
  - Seeker: İlanlarım + İlan Ver + Profil
  - Provider: Fırsatlar + Profil (İlan Ver hidden)
  - Hidden screens (provider-setup, job/[id]) registered with `href: null`
- Placeholder stubs: `post/index.tsx`, `job/[id].tsx`, `profile/index.tsx`

**tsc clean · pushed to main**

---

## Phase 4 — Shared UI Components ✅ (2026-04-22)

- T-015: `components/ui/Button.tsx` — reusable button with variants, loading, disabled, full-width support
- T-016: `components/ui/Toast.tsx` — cross-platform toast (`ToastAndroid` + iOS animated overlay) + `ToastProvider`
- T-017: `components/ui/CategoryPicker.tsx` — modal single-select category picker with icons, urgent badge, selected checkmark
- T-018: `components/ui/LocationPicker.tsx` — city/district modal picker with Turkish locale search and district reset on city change
- Integration: `app/_layout.tsx` updated to mount `<ToastProvider />` globally

**Checkpoint:** components compiled and available for Phase 5/6 screens

---

## Phase 5 — Provider Registration ✅ (2026-04-22)

- T-019: `lib/imageCompressor.ts` — image picker + multi-step JPEG compression utility (`compressImage`, `pickAndCompress`)
- T-020: `hooks/useProviderProfile.ts` — provider profile query + submit mutation + levha upload mutation
- T-021: `app/(app)/profile/provider-setup.tsx` — full registration form with:
  - Company name / vergi no validation
  - 2-column category multi-select grid
  - `<LocationPicker />` city/district selection
  - Radius selector chips (10/25/50/100/200/500 km)
  - Vergi levhasi upload (photo or PDF)
  - Submit flow: upload -> profile upsert -> toast -> redirect

**Checkpoint:** tsc clean, provider setup no longer placeholder

---

## Phase 6 — Job Posting (Seeker Flow) ✅ (2026-04-22)

- T-022: `hooks/usePostJob.ts` — post job mutation with:
  - offline guard via NetInfo (`OFFLINE` error)
  - photo upload to `job-photos/{jobId}/{index}.jpg` with single retry
  - jobs table insert and `my-jobs` query invalidation
- T-023: `app/(app)/post/index.tsx` — full job posting screen with:
  - 3 photo slots (add/remove, compressed picker)
  - `CategoryPicker` + `LocationPicker`
  - description input + `500` char counter
  - KVKK notice + submit button (`Teklif Al`)
  - loading overlay + success/error toast handling + job detail redirect
- Support stub: `lib/notifications.ts` added with temporary `registerPushToken` no-op (to be fully implemented in Phase 10)

**Checkpoint:** tsc clean, post screen no longer placeholder

---

## Phase 7 — Feed Screens ✅ (2026-04-22)

- T-024: `components/JobCard.tsx` — shared seeker/provider job card with:
  - photo thumbnail fallback icon
  - category chip, location, "time ago"
  - urgent badge
  - provider distance badge
  - seeker status chip + contact count
- T-025: `hooks/useProviderFeed.ts` — infinite query hook for provider feed via backend API (`API_BASE_URL/jobs/feed`) with category filter + pagination
- T-026: `hooks/useMyJobs.ts` — seeker jobs query from Supabase with contact count mapping
- T-027: `app/(app)/feed/index.tsx` — role-aware feed screen with:
  - provider verification gates (`pending`, `rejected`, missing profile)
  - provider category chips + infinite scroll + pull-to-refresh
  - seeker list + empty state + FAB to post screen
  - tap any card -> job detail route

**Checkpoint:** tsc clean, feed screen no longer placeholder

---

## Phase 8 — Job Detail & WhatsApp Bridge ✅ (2026-04-22)

- T-028: `lib/whatsapp.ts` — WhatsApp bridge helpers:
  - URL builder with templated message
  - open/fallback flow (`Linking` + copy phone option)
  - contact log insert + open sequence (`logAndOpenWhatsApp`)
- T-029: `hooks/useJobDetail.ts` — job detail query + close mutation with query invalidations
- T-030: `app/(app)/job/[id].tsx` — role-aware job detail screen with:
  - photo carousel + page dots
  - category/location/time metadata + description
  - provider flow: WhatsApp offer button + distance + inactive banner handling
  - seeker flow: contact count + close job action with confirmation

**Checkpoint:** tsc clean, job detail no longer placeholder

---

## Phase 9 — Profile Screen ✅ (2026-04-28)

- T-031: `app/(app)/profile/index.tsx` — full profile screen with:
  - Avatar + masked phone display
  - Inline full name editing (tap to edit, saves on blur)
  - Role switcher segmented control (Seeker / Provider) → calls `switchRole`
  - Provider status card: company, masked vergi no, categories, radius, status chip
    - `pending` → amber "İnceleniyor" chip
    - `approved` → green "Onaylı İşletme ✓" + verified date
    - `rejected` → red chip + rejection reason + "Tekrar Başvur" button
  - Provider CTA for users without a provider profile
  - Notification toggle (Switch) wired to `registerPushToken` / `deletePushToken`
  - "Çıkış Yap" danger button with confirm Alert

**Checkpoint:** tsc clean

---

## Phase 10 — Push Notifications ✅ (2026-04-28)

- T-032: `lib/notifications.ts` — full implementation replacing stub:
  - `registerPushToken(userId)` — permission request, Expo push token, upsert to `push_tokens`
  - `deletePushToken(userId)` — removes all tokens for user from DB
  - `setupNotificationListeners(router)` — configures `setNotificationHandler` (foreground alerts) + `addNotificationResponseReceivedListener` for deep-link on tap → `/job/:id`
  - Returns cleanup function for `useEffect`
- `app/_layout.tsx` updated: `setupNotificationListeners(router)` wired in `RootNavigator` via `useEffect`

**Checkpoint:** tsc clean

---

## Phase 11 — FastAPI Backend Foundation ✅ (2026-04-28)

- T-033: `backend/requirements.txt` — pinned dependencies
- T-034: `backend/core/config.py` — Pydantic Settings reading `.env`
- T-035: `backend/core/supabase_client.py` — service-role admin client
- T-036: `backend/core/auth.py` — JWT Bearer token dependency → returns user UUID
- T-037: `backend/main.py` — FastAPI app with CORS, router registration, `/health` endpoint
- `backend/.env.example` + `backend/Procfile` added

**Checkpoint:** all .py files syntax OK, deps installed in `.venv`

---

## Phase 12 — FastAPI Routers ✅ (2026-04-28)

- T-038: `backend/routers/providers.py` — POST /providers/register, GET /providers/me
- T-039: `backend/routers/jobs.py` — POST /jobs, GET /jobs/feed (city-match, PostGIS-ready), GET /jobs/mine, GET /jobs/{id}, PATCH /jobs/{id}
- T-040: `backend/routers/contact.py` — POST /jobs/{id}/contact (idempotent, 410 on expired job)
- T-041: `backend/routers/push_tokens.py` — POST + DELETE /push-tokens
- T-042: `backend/services/push_service.py` — batched Expo Push API, `notify_provider`, `notify_verification_result`
- T-043: `backend/routers/webhooks.py` — POST /webhooks/verification-changed + /webhooks/new-job (with BackgroundTasks for non-urgent)

**Checkpoint:** all .py syntax OK · tsc clean (frontend)

**Remaining manual steps before Phase 11 checkpoint can pass:**
- Fill `backend/.env` with real Supabase credentials
- `uvicorn main:app --reload` in `backend/` directory
- M-004: Configure Supabase webhooks (requires deployed backend URL)

---

## Phase 13 — Automated Job Expiry ✅ (2026-04-29)

- T-044: SQL function `expire_old_jobs()` created in Supabase
- pg_cron schedule created (ID: 2) — runs `*/15 * * * *` (every 15 minutes)
- Jobs with `status = 'active'` and `expires_at < NOW()` are automatically set to `'expired'`

**Checkpoint:** `cron.schedule()` returned schedule ID 2 ✅

---

## Phase 14 — Deployment ✅ (2026-04-30)

- M-005: EAS Build Configuration (`eas.json`, secrets pushed, Android build generated)
- M-006: AWS Elastic Beanstalk Deployment (`hizlisanayi-prod` environment created, `.ebignore` configured, backend live)
- Backend URL pushed to EAS secrets as `EXPO_PUBLIC_API_URL`

**Checkpoint:** Backend `GET /health` returns `{"status": "ok"}`, EAS build queued/succeeded ✅
