# MVP: Hızlısanayi — Shippable v1 Scope

**Target Ship Date:** 6 weeks from kickoff  
**Platforms:** iOS + Android (React Native / Expo)  
**Team:** 1-2 developers + 1 founder (product/verification)

---

## The Single Constraint

> **Ship only what tests this hypothesis:**
> *"Industrial SMEs in Turkey will use a mobile app to post jobs and contact verified providers via WhatsApp — if we remove the friction of finding them."*

Every feature that doesn't test this hypothesis is **out of scope for MVP**.

---

## Core Hypothesis

| Assumption | How We Validate in MVP |
| :--- | :--- |
| Seekers will post jobs digitally | Count: jobs posted per week |
| Providers want more leads | Count: providers who opt in and check app daily |
| WhatsApp is enough for closing | Count: WA conversations initiated |
| Verification builds trust | Survey: would seekers use an unverified provider? |

---

## MVP Feature Set

### ✅ IN — Must Ship

#### Screen 1: Auth (Shared)
- Phone number input + SMS OTP (Supabase Auth)
- Role selection: "İş Arıyorum (Seeker)" vs. "İşletmeyim (Provider)"
- Seeker: name + optional company → done
- Provider: name + Vergi No. + category(ies) + service radius + Vergi Levhası photo upload → pending review state

#### Screen 2: Home / Dashboard
- **Seeker:** "Yeni İş İlanı Ver" CTA + list of their own active jobs
- **Provider:** Lead feed (filtered by their categories + radius) + "Pending Verification" banner if not yet approved

#### Screen 3: Post a Job (Seeker)
- Step 1: Pick category (grid of 10 icons)
- Step 2: Describe the job (text field, 500 chars)
- Step 3: Upload files (up to 5; camera or gallery)
- Step 4: Set location (GPS detect or city/district picker)
- Step 5: Set reach ("50km" / "100km" / "Tüm Türkiye")
- Confirmation screen → job live

#### Screen 4: Lead Feed (Provider)
- Card list: job title, category badge, distance ("23 km uzakta"), time posted
- Tap card → Job Detail: full description, attachments, map pin, seeker's city
- **"WhatsApp'tan Teklif Ver"** button → deep link: `wa.me/{seeker_phone}?text=Hızlısanayi'de%20gördüğünüz%20...`

#### Screen 5: Provider Profile (Read-only for MVP)
- Business name, categories, "Verified Business" badge (post-approval)
- Edit profile: basic settings only (radius, categories)

#### Admin (Internal Web Page — Not in App)
- Supabase Table Editor or simple internal tool
- View pending providers → approve/reject with reason → triggers push + SMS to provider

#### Notifications
- Push: new job in provider's category + radius (Expo Notifications)
- Push + SMS: verification status update

---

### ❌ OUT — Explicitly Deferred

| Feature | Why Deferred |
| :--- | :--- |
| In-app chat/messaging | WA bridge eliminates need; keeps scope tight |
| Provider rating & reviews | Need transaction volume first to have meaningful ratings |
| Job status tracking | WA handles this; adds complexity for zero gain in v1 |
| In-app payment | Requires licensing + legal; Phase 3 |
| Subscription billing | Validate value first; monetize after product-market fit |
| Map view for jobs | Nice-to-have; list + distance is sufficient for MVP |
| Seeker review of providers | Post-MVP; need data on completed jobs |
| Automated Vergi No. API check | Manual review is faster to ship; API needed in Phase 2 |
| Web app | Mobile-only; reduces dev scope by ~40% |
| OSB filtering | Phase 2 after national data is gathered |

---

## 6-Week Sprint Plan

### Week 1–2: Foundation
- [ ] Supabase project setup: `users`, `jobs`, `providers`, `categories` tables
- [ ] PostGIS enabled; provider `location` column as `geography` type
- [ ] Supabase Auth: phone OTP flow
- [ ] Supabase Storage: `vergi-levhasi` and `job-files` buckets with RLS policies
- [ ] FastAPI: `/auth`, `/jobs`, `/providers`, `/leads` endpoints (JWT-protected)
- [ ] Expo project scaffold with TypeScript + React Navigation

### Week 3: Core Seeker Flow
- [ ] Auth screens (phone input, OTP, role selection)
- [ ] Seeker home: active jobs list
- [ ] Post Job: 5-step wizard (category → description → files → location → reach)
- [ ] Job stored in Supabase; push notification triggered to matching providers

### Week 4: Core Provider Flow
- [ ] Provider registration + file upload (Vergi Levhası)
- [ ] Lead feed: filtered by categories + `ST_DWithin` radius query
- [ ] Job detail screen with file previews and map pin
- [ ] WhatsApp Bridge: "Teklif Ver" deep link
- [ ] "Pending verification" state banner

### Week 5: Notifications + Admin
- [ ] Expo Push Notification setup (FCM + APNs tokens stored)
- [ ] Push on new job → matching providers
- [ ] Admin verification flow (Supabase Table Editor or simple Retool/Notion DB)
- [ ] Push + SMS on verification approval/rejection
- [ ] Provider receives "Verified" badge on approval

### Week 6: Polish + Launch Prep
- [ ] QA on real devices (iOS + Android)
- [ ] Expo Go TestFlight + Play Store internal track
- [ ] App Store Connect submission (iOS) — start early due to review time
- [ ] Onboard first 10 providers manually in one OSB
- [ ] Soft launch to 3 selected seekers for feedback

---

## Acceptance Criteria (Definition of Done)

| Feature | Acceptance Criteria |
| :--- | :--- |
| Auth | User can log in with Turkish phone number via OTP in < 30 seconds |
| Job Posting | Seeker can post a job with photo and city-level location in < 2 minutes |
| Lead Feed | Provider sees only jobs in their category within their radius |
| WA Bridge | Tapping "Teklif Ver" opens WhatsApp with pre-filled Turkish message |
| Verification | Admin can approve provider; provider gets push notification; badge appears |
| Push Notifications | Provider receives push within 60 seconds of a matching job being posted |
| Performance | App launches in < 3 seconds on mid-range Android; lead feed loads in < 2 seconds |

---

## Launch Checklist

- [ ] Meta WhatsApp Business API: Templates approved by Meta
- [ ] Supabase: Production project (not free tier) with PostGIS enabled
- [ ] FCM project set up; APNs certificate uploaded to Expo
- [ ] App Store Connect: App listing, screenshots, privacy policy URL ready
- [ ] Google Play Console: Internal → Closed testing track ready
- [ ] KVKK Privacy Policy: Published at a URL; linked in app stores
- [ ] Crash monitoring: Sentry or Expo's built-in error reporting enabled
- [ ] First 10 providers: Manually onboarded and verified before public launch

---

## Key Trade-offs Made

| Decision | Rationale |
| :--- | :--- |
| WA bridge instead of in-app chat | Reduces scope by ~3 weeks; leverages existing user behavior |
| Manual verification instead of API | Faster to ship; API adds cost and integration complexity |
| Expo managed workflow | Over-the-air updates; faster QA cycle; acceptable for MVP |
| No rating system | Can't rate what hasn't been transacted yet; adds false trust signals |
| No web app | 40% scope reduction; our users are mobile-first B2B workers |

---

*Ship fast. Learn fast. Iterate.*
