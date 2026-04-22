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

## Next: Phase 3 — Navigation Shell
