# PRD: Hızlısanayi — Turkey's National Industrial Marketplace

**Version:** 2.1
**Status:** Living Document
**Last Updated:** April 2026
**Owner:** Beray Özder

---

## 1. Executive Summary

Hızlısanayi is a mobile-first B2B marketplace connecting industrial job seekers (factories, maintenance chiefs, procurement managers) with verified service providers (CNC workshops, crane operators, logistics firms) across Turkey's 81 provinces.

**Core value proposition:** A verified provider can be found and contacted via WhatsApp within 60 seconds of a job being posted.

**Locked architecture decisions for MVP:**
- Expo Managed Workflow (EAS Build)
- Single user account supports both Seeker and Provider roles; switched via Settings
- Both roles persist in background when switching — no data loss
- Admin verification done directly in Supabase Studio (no custom panel)
- Provider feed filtered to service radius on first open
- Max 3 photos per job, compressed ≤500KB client-side
- Offline: error toast + block, no draft queue
- WhatsApp bridge opens seeker's OTP-registered phone number

---

## 2. Problem Statement

Turkey has over **450,000 registered industrial SMEs** and an estimated **3.5 million industrial workers**, yet the discovery layer between factories and service providers remains broken:

| Pain Point | Impact |
|:---|:---|
| **Unstructured Discovery** | Finding a qualified CNC shop in Bursa OSB requires personal-network phone calls. No trusted digital directory exists. |
| **Zero Trust by Default** | Unverified vendors on generic classifieds (Sahibinden, LinkedIn) lead to fraud, quality mismatch, and delayed projects. |
| **Speed Gap** | Emergency needs (broken crane, urgent çekici) have no real-time matching. WhatsApp groups are the de facto tool — completely unscalable. |
| **No Structured Quoting** | No standard format for collecting quotes. Each negotiation starts from scratch via phone. |

**Why Now:**
- Turkey's industrial output grew 8.2% YoY (2024) — more factories, more outsourcing demand.
- WhatsApp penetration: ~90% of Turkish smartphone users. Our bridge is culturally native.
- Supabase + Expo reduce MVP build time to weeks, not quarters.

---

## 3. Target Users

### 3.1 Seeker (Talep Sahibi)

| Attribute | Detail |
|:---|:---|
| **Who** | Maintenance & procurement managers at factories; individual tradespeople |
| **Job-to-be-done** | Find a verified, nearby shop fast, get a quote, get work done |
| **Key frustration** | Calling 10 shops to find one with capacity; no visibility into quality |
| **Device behavior** | Mobile-first; on the factory floor; often loud environment; may be wearing gloves |
| **Success signal** | Posted a job and received a WhatsApp quote within 15 minutes |

### 3.2 Provider (Hizmet Sağlayıcı)

| Attribute | Detail |
|:---|:---|
| **Who** | Owner-operated workshops and SME service businesses in industrial zones |
| **Job-to-be-done** | Fill idle capacity; reach customers beyond personal network |
| **Key frustration** | Marketing spend on unqualified leads; no digital presence |
| **Device behavior** | Mobile; receives WhatsApp messages during active work |
| **Success signal** | Received a qualified lead notification and closed a job within 24 hours |

### 3.3 Dual-Role User

A user may register as both Seeker and Provider (e.g., a CNC shop that also outsources crane work). They switch active roles in Settings. Both roles persist in background. The active role determines which tab bar and feed are shown.

### Non-Targets (MVP)
- Large enterprise procurement (SAP/ERP workflows)
- B2C home repair consumers
- International markets outside Turkey

---

## 4. Product Vision & Strategy

**Vision:** *"Hızlısanayi becomes the trusted industrial operating system for Turkey's SME sector — the way a factory finds capacity, quotes a job, and manages work, all in one place."*

### Strategic Bets

1. **Trust as a Moat:** Vergi Numarası verification is a real barrier. Competitors won't copy it because it adds friction. We lean into it.
2. **WhatsApp as the Closing Layer (MVP):** We use WhatsApp as the deal-closing mechanism — no custom chat UI, dramatic scope reduction for V1.
3. **Supply-First Launch:** Onboard verified providers in target OSBs *before* opening to seekers. A marketplace with supply never feels empty.
4. **OSB Beachheads → National:** Bursa Nilüfer, Kocaeli Gebze, İzmir Kemalpaşa as Phase 1. All 81 provinces in Phase 2.

---

## 5. Service Categories (MVP)

| Slug | Turkish Label | Urgency |
|:---|:---|:---|
| `cnc` | Talaşlı İmalat (CNC) | Standard |
| `laser` | Lazer Kesim | Standard |
| `sheet` | Sac İşleme | Standard |
| `casting` | Döküm & Kalıp | Standard |
| `welding` | Kaynak & Metal İşleri | Standard |
| `crane` | Vinç Kiralama | Standard |
| `forklift` | Forklift & İstif | Standard |
| `transport` | Taşıma & Nakliye | Standard |
| `tow` | Araç Kurtarma (Çekici) | **Urgent** |
| `autorepair` | Oto Tamir | **Urgent** |

Urgent categories show a red "ACİL" badge on job cards and trigger push notifications immediately (no batching).

---

## 6. User Flows

### 6.1 New User Onboarding

```
App Launch
    │
    ├─ Has valid Supabase session? ──YES──► (app)/feed (active role determines view)
    │
    NO
    │
    ▼
(auth)/phone.tsx
  Enter phone number (+90 5XX XXX XX XX)
    │
    ▼
(auth)/otp.tsx
  Enter 6-digit OTP (auto-verify on 6th digit)
    │
    ├─ First login? ──YES──► (auth)/role-select.tsx
    │                          │
    │                          ├─ "Hizmet Arıyorum" ──► (app)/feed [Seeker mode]
    │                          │
    │                          └─ "Hizmet Veriyorum" ──► (app)/profile/provider-setup.tsx
    │                                                       └── On submit ──► (app)/feed [Provider mode, pending]
    │
    └─ Returning user ──► (app)/feed (last active_role restored)
```

### 6.2 Seeker: Post a Job

```
(app)/feed [Seeker tab]
    │
    Tap FAB "+"
    │
    ▼
(app)/post/index.tsx
  1. Add photos (1–3, compressed ≤500KB each)
  2. Select category (required)
  3. Select city + district (required)
  4. Write description (optional, ≤500 chars)
    │
    ├─ Check internet connection ──NO──► Toast "İnternet yok" + BLOCK
    │
    YES
    │
    ├─ Upload photos to Supabase Storage → get URLs
    │
    ├─ POST /jobs with all fields
    │
    ▼
(app)/job/[newId].tsx
  Toast: "İlanınız yayınlandı!"
  Push permission prompt shown here (first-time only)
```

### 6.3 Provider: Browse & Contact

```
(app)/feed [Provider tab]
  Default filter: provider's categories + service radius
    │
    Tap a Job Card
    │
    ▼
(app)/job/[id].tsx
  See full details, photos, location
    │
    Tap "WhatsApp'tan Teklif Ver"
    │
    ├─ Write contact_logs row (fire-and-forget)
    │
    ├─ Build wa.me deep-link with seeker's phone + pre-filled message
    │
    ├─ WhatsApp installed? ──YES──► Open WhatsApp
    │
    └─ NO ──► Alert with option to copy seeker's phone number
```

### 6.4 Role Switching

```
(app)/profile/index.tsx
    │
    Toggle "Aktif Mod"
    │
    UPDATE profiles.active_role = new_role (Supabase)
    │
    Re-render tab bar with new role's tabs
    │
    Feed screen refreshes for new role
    │
    All existing data (posted jobs, provider profile, leads) unchanged
```

### 6.5 Provider Verification Lifecycle

```
Provider submits registration form
    │
    verification_status = 'pending'
    │
    Admin opens Supabase Studio → Table Editor → provider_profiles
    │
    ├─ Set status = 'approved', verified_at = NOW()
    │     └─► Push notification sent: "Hesabınız Onaylandı ✓"
    │         Provider now sees full lead feed
    │
    └─ Set status = 'rejected', rejection_reason = 'Belge okunamıyor'
          └─► Push notification sent: "Başvurunuz Reddedildi"
              Provider sees rejection reason + "Tekrar Başvur" CTA in Profile
```

---

## 7. Functional Requirements

### 7.1 Authentication

| Requirement | Detail | Priority |
|:---|:---|:---|
| Phone OTP login | Supabase Auth, SMS. Format: +90 5XX XXX XX XX | P0 |
| Auto-profile creation | Trigger creates `profiles` row on `auth.users` insert | P0 |
| Session persistence | Supabase AsyncStorage adapter; session survives app restart | P0 |
| Token refresh | Supabase handles automatically; surface "Oturumunuz sona erdi" if refresh fails | P0 |
| Sign out | Clear AsyncStorage + Supabase session | P0 |

### 7.2 Role System

| Requirement | Detail | Priority |
|:---|:---|:---|
| Initial role selection | One-time screen after first OTP verification | P0 |
| Role switch in Settings | Updates `profiles.active_role`; both role datasets persist | P0 |
| Tab bar re-render | Tab bar items change immediately on role switch, no app restart | P0 |
| Provider role gating | Provider feed only accessible when `verification_status = 'approved'`; pending providers see waiting screen | P0 |

### 7.3 Job Posting (Seeker)

| Requirement | Detail | Priority |
|:---|:---|:---|
| Photo upload | 1–3 photos required. Client-side compress to ≤500KB. Upload to `job-photos` bucket. | P0 |
| Category selection | Single-select from 10 categories. Required. | P0 |
| Location | City (required) + District (optional). City list: all 81 Turkish iller. | P0 |
| Description | Optional free text, max 500 chars | P0 |
| Offline guard | NetInfo check before submit. Block if offline. Show toast. | P0 |
| Job expiry | Auto-expire after 72h via Supabase scheduled function | P0 |
| KVKK disclosure | Show on Post screen: "Onaylı firmalar ilanınızı ve telefon numaranızı görebilir." | P0 |
| Post limit | Max 5 active jobs per user (prevents spam). Return 429 if exceeded. | P1 |
| Draft saving | Auto-save form state to AsyncStorage. Restore on re-open. | P1 |

### 7.4 Lead Feed (Provider)

| Requirement | Detail | Priority |
|:---|:---|:---|
| Default filter | Provider's categories + PostGIS service radius | P0 |
| Category filter chips | Horizontal scroll. Tap to filter by single category. "Tümü" resets. | P0 |
| Distance display | "X km uzakta" on each card (Haversine from job location to provider location) | P0 |
| Pagination | 20 items per page, infinite scroll | P0 |
| Pull to refresh | Standard RefreshControl | P0 |
| Urgent badge | Red "ACİL" chip on `urgency_level = 'urgent'` jobs | P0 |
| Pending verification state | If `verification_status = 'pending'`: show "Profiliniz inceleniyor, ilanlar yakında gösterilecek." banner, feed is hidden | P0 |
| "Not Interested" | Hides job in current session only (local state, no DB write) | P1 |

### 7.5 Job Detail & WhatsApp Bridge

| Requirement | Detail | Priority |
|:---|:---|:---|
| Photo carousel | Full-width, swipeable, `expo-image` with cache | P0 |
| WhatsApp button | Green (#25D366), full-width, 56dp height. Label: "WhatsApp'tan Teklif Ver 💬" | P0 |
| Bridge click log | Insert into `contact_logs` (fire-and-forget before opening WA) | P0 |
| WhatsApp not installed | Alert with "Numarayı Kopyala" option | P0 |
| Duplicate click prevention | `UNIQUE(job_id, provider_id)` in DB + disable button locally after first tap | P0 |
| Expired job guard | Server-side check on bridge tap. If expired, return 410. Show toast. | P0 |
| Seeker view | Shows bridge click count: "X firma ilgilendi". "İlanı Kapat" button. | P0 |

### 7.6 Provider Registration

| Requirement | Detail | Priority |
|:---|:---|:---|
| Company name | Required text field | P0 |
| Vergi No | Required, exactly 10 digits, client-side format validation | P0 |
| Category multi-select | Minimum 1 required | P0 |
| City + District | Required city, optional district | P0 |
| Service radius | Slider 10–500 km, default 50 km | P0 |
| Vergi Levhası upload | Image or PDF, max 5MB, uploaded to private `vergi-levhasi` bucket | P0 |
| Duplicate Vergi No | Return 409, show "Bu vergi numarası zaten kayıtlı." | P0 |
| Re-application | After rejection, allow editing all fields and re-submitting | P0 |

### 7.7 Push Notifications

| Trigger | Recipient | Timing | Priority |
|:---|:---|:---|:---|
| New job in provider's category+radius | Provider | Immediate for urgent; max 5 min delay for standard | P0 |
| Verification approved | Provider | Immediate | P0 |
| Verification rejected | Provider | Immediate | P0 |
| Provider tapped WA on seeker's job | Seeker | Immediate | P1 |

**Permission request timing:** After user posts first job (Seeker) OR after opening lead feed for first time (Provider). Never on cold app open.

### 7.8 Admin Verification (Supabase Studio)

| Task | How |
|:---|:---|
| View pending providers | Filter `provider_profiles` where `verification_status = 'pending'` |
| View submitted document | Click `vergi_levhasi_url` in row; opens Supabase Storage viewer |
| Approve | Update row: `verification_status = 'approved'`, `verified_at = now()` |
| Reject | Update row: `verification_status = 'rejected'`, `rejection_reason = '<reason>'` |
| Trigger notification | FastAPI endpoint called by Supabase webhook on `provider_profiles` update |

---

## 8. Technical Architecture

| Layer | Technology | Notes |
|:---|:---|:---|
| Mobile App | React Native (Expo Managed Workflow) + TypeScript | Single codebase iOS + Android |
| Navigation | Expo Router v3 | File-based routing |
| State Management | React Query (`@tanstack/react-query`) + Zustand for local UI state | React Query for server state; Zustand for role, session |
| Backend API | FastAPI (Python 3.11) | Handles push dispatch, business logic |
| Database | Supabase (PostgreSQL 15 + PostGIS) | RLS enforced |
| Auth | Supabase Auth (Phone OTP) | SMS via Twilio under the hood |
| File Storage | Supabase Storage | Two buckets: public job photos, private verification docs |
| Push | Expo Push Notification Service → FCM (Android) / APNs (iOS) | Via FastAPI trigger |
| Maps/Geo | PostGIS `ST_DWithin` for radius queries | No Maps SDK in MVP — just distance text |

### Architecture Diagram

```
┌─────────────────────────────────┐
│         Expo Mobile App          │
│  (React Native + Expo Router)    │
└────────────┬────────────────────┘
             │ HTTPS (REST + Supabase JS SDK)
   ┌─────────┴──────────┐
   │                    │
   ▼                    ▼
┌──────────┐     ┌─────────────────────┐
│ FastAPI  │     │  Supabase           │
│ Backend  │     │  ├─ Auth (OTP)      │
│          │     │  ├─ PostgreSQL+GIS  │
│ Push     │     │  ├─ Storage         │
│ dispatch │     │  └─ RLS Policies    │
└──────────┘     └─────────────────────┘
     │
     ▼
Expo Push Service
  ├─ FCM (Android)
  └─ APNs (iOS)
```

### Key Architecture Decisions

**Why Expo Managed Workflow:**
All required capabilities (camera, image picker, notifications, file system) are covered by Expo's managed modules. Avoids days of native configuration for V1.

**Why no Maps SDK in MVP:**
Distance is shown as text ("12 km uzakta") computed via PostGIS. A full map view of provider locations is a P1 feature. Cuts Google Maps SDK setup + billing complexity from MVP.

**Why React Query:**
Caching, background refetch, and pagination are handled by the library. Avoids building custom feed pagination and cache invalidation logic.

**Why fire-and-forget on contact_logs insert:**
The WhatsApp deep-link should open as fast as possible. Writing the log row doesn't need to block the UX. If it fails, it fails silently — the bridge click still happened.

---

## 9. Non-Functional Requirements

| Requirement | Target |
|:---|:---|
| Cold start time | < 2 seconds to interactive |
| Feed load time | < 1 second for first 20 items (Supabase index on category+status+location) |
| Image upload time | < 3 seconds per photo on 4G (≤500KB after compression) |
| Push delivery latency | < 30 seconds from job post to notification delivery |
| Crash-free session rate | > 99.5% |
| Offline handling | All submission flows blocked with clear toast; read-only feed cached by React Query |

---

## 10. KVKK (Data Privacy) Requirements

| Requirement | Implementation |
|:---|:---|
| Disclosure at job post | Show inline: "Onaylı firmalar ilanınızı ve telefon numaranızı görebilir. Kabul etmek için devam edin." |
| Vergi Levhası storage | Private Supabase bucket; RLS policy: only owner + service role can read |
| Seeker phone sharing | Only shared via WhatsApp deep-link to approved providers. Not displayed in app UI. |
| Data deletion | "Hesabımı Sil" option in Profile deletes `auth.users` row → cascades to all tables |
| Privacy policy | Link required in app before OTP submission. Host at `hizlisanayi.com/gizlilik`. |

---

## 11. Success Metrics

### North Star Metric
**Qualified Connections:** Number of `contact_logs` rows created per week (= WhatsApp bridges opened).

### 90-Day Launch Targets

| Metric | Target | How to Measure |
|:---|:---|:---|
| Verified providers onboarded | 100+ | `provider_profiles WHERE verification_status = 'approved'` |
| Jobs posted | 200+ | `jobs` row count |
| WhatsApp connections | 300+ | `contact_logs` row count |
| Provider → WA conversion rate | > 30% | `contact_logs / jobs * 100` |
| Time from post to first WA contact | < 15 min median | `MIN(contact_logs.created_at) - jobs.created_at` GROUP BY job |
| Verification turnaround | < 24h | `verified_at - created_at` in `provider_profiles` |

### Health Metrics

| Metric | Target |
|:---|:---|
| Push opt-in rate | > 70% |
| Provider 7-day retention | > 40% |
| App store rating | > 4.2 ★ |
| Crash-free session rate | > 99.5% |
| Job post completion rate | > 60% (started post → submitted) |

---

## 12. Monetization Strategy

### Phase 1 — MVP (Free)
Everything free. Goal: validate supply-demand matching, build network density.

### Phase 2 — Freemium (Month 4+)

| Tier | Price | Features |
|:---|:---|:---|
| Free | ₺0/mo | 5 lead views/day; standard listing |
| Pro | ₺299/mo | Unlimited leads; "Öne Çıkan" badge; early alert delivery |
| Gold | ₺699/mo | All Pro + top-category promoted listing; monthly analytics report |

**Pricing validation needed before Phase 2:** Survey first 100 providers: "Would you pay ₺299/month for unlimited leads?"

### Phase 3 — Commission (Month 9+)
2–3% on jobs closed in-app (requires in-app payment integration).

---

## 13. Go-to-Market Strategy

### Phase 1: OSB Boots-on-the-Ground (Months 1–2)
- Door-to-door provider onboarding in Bursa Nilüfer, Kocaeli Gebze, İzmir Kemalpaşa
- Target: 30–40 verified providers per OSB before launch
- Offer 6-month free Pro to first 100 providers
- Seed OSB community WhatsApp groups with announcement

### Phase 2: Digital Acquisition (Months 3–6)
- **Google Ads:** "CNC atölyesi Bursa", "vinç kiralama İzmir" (high intent, low competition)
- **SEO/Content:** "Sanayi Bülteni" weekly newsletter
- **Referral:** Verified providers invite shops → earn 1 month free Pro

### Phase 3: Scale (Month 6+)
- Expand digitally to all 81 provinces
- OSB yönetimi partnership for co-marketing

---

## 14. Competitive Landscape

| Competitor | Weakness | Our Edge |
|:---|:---|:---|
| Sahibinden.com | Not B2B; no verification layer | Trust layer + verified ecosystem |
| LinkedIn | No job flow for SMEs; expensive ads | Mobile-first, WhatsApp-native, free |
| WhatsApp Groups | No structure, no search | We structure the chaos; keep WA familiarity |
| Endüstri.net | Static directory; no real-time matching | Real-time feed + push notifications |
| Imported platforms | Not localized; no Vergi No. system | 100% built for Turkey |

---

## 15. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|:---|:---|:---|:---|
| Cold start (no providers) | High | Critical | Supply-first; OSB outreach; free Pro offer |
| WhatsApp deep-link fails (not installed) | Low | Medium | Alert with "Copy number" fallback |
| Slow provider verification (admin bottleneck) | Medium | High | < 24h SLA; founder verifies manually in Month 1 |
| Fraudulent listings (fake Vergi No.) | Low | High | Vergi No. uniqueness + document photo review |
| iOS App Store review delay | Medium | Medium | Submit early; use TestFlight for beta |
| Low push opt-in rate | Medium | Medium | Request permission only post-value moment |
| KVKK non-compliance | Low | High | Disclosure at post; privacy policy before OTP; private storage bucket for docs |
| Seeker phone number abuse by providers | Low | Medium | Only exposed via WA deep-link (not in UI); KVKK disclosure |

---

## 16. Out of Scope (MVP)

- In-app payment processing
- In-app chat or messaging
- Provider rating & review system
- Subscription billing
- Automated Vergi No. API verification
- Web app (mobile-only)
- International markets
- Custom admin panel (using Supabase Studio)
- GPS map view (distance text only)
- Job draft queue / offline sync
- PDF technical drawing uploads (V1.1)

---

## 17. Open Questions

| # | Question | Owner | Due |
|:---|:---|:---|:---|
| 1 | Is the Meta WhatsApp Business Account registered and phone number approved? | Beray | Before dev complete |
| 2 | Have WhatsApp message templates been submitted to Meta for approval? | Beray | Week 1 |
| 3 | Is there a formal KVKK privacy policy drafted and hosted? | Beray | Before TestFlight |
| 4 | Who verifies providers in Month 1 — founder only, or a part-time VA? | Beray | Before launch |
| 5 | Any formal agreements with OSB yönetimleri for co-marketing? | Beray | Month 1 |
| 6 | Have any providers been asked if they'd pay ₺299/mo? | Beray | Before Phase 2 |
| 7 | FastAPI backend: ECS or Elastic Beanstalk? (Single instance sufficient for MVP) | Beray | Before backend deploy |

---

*This is a living document. Update after each user research session, sprint review, or pivot decision.*