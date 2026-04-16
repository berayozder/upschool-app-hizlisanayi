# PRD: Hızlısanayi — Turkey's National Industrial Marketplace

**Version:** 2.0  
**Status:** Living Document  
**Last Updated:** April 2026  
**Owner:** Beray Özder  

---

## 1. Executive Summary

Hızlısanayi is a mobile-first B2B marketplace that connects industrial job seekers (factories, maintenance chiefs, purchasing managers) with verified service providers (CNC workshops, crane operators, logistics firms) across Turkey's 81 provinces. The platform's core value proposition is **speed + trust**: a verified provider can be found and contacted via WhatsApp within 60 seconds of a job being posted.

---

## 2. Problem Statement

### The Pain We're Solving

Turkey has over **450,000 registered industrial SMEs** and an estimated **3.5 million industrial workers**, yet the discovery layer between factories and service providers remains broken:

| Pain Point | Impact |
| :--- | :--- |
| **Unstructured Discovery** | Finding a qualified CNC shop in Bursa OSB requires phone calls driven by personal networks. There is no trusted digital directory. |
| **Zero Trust by Default** | Unverified vendors on generic classifieds (Sahibinden, LinkedIn) lead to fraud, quality mismatch, and delayed projects. |
| **Speed Gap** | Emergency needs (broken crane, urgent çekici) have no real-time matching solution. WhatsApp groups are the de facto tool — completely unscalable. |
| **No Structured Quoting** | There is no standard format for collecting quotes. Each negotiation starts from scratch via phone, wasting both parties' time. |

### Why Now?

- Turkey's industrial output grew **8.2% YoY (2024)** — more factories, more outsourcing demand.
- WhatsApp penetration in Turkey: **~90%** of smartphone users. Our WhatsApp bridge is culturally native, not a feature bolt-on.
- Supabase + Expo dramatically reduce MVP build time vs. 3 years ago. We can ship in weeks, not quarters.

---

## 3. Target Users

### 3.1 Seeker (Talep Sahibi)
| Attribute | Description |
| :--- | :--- |
| **Who** | Maintenance & procurement managers at factories; individual tradespeople |
| **Job-to-be-done** | Find a *verified, nearby* CNC/crane/welding shop *fast*, get a quote, and get work done |
| **Key frustration** | Calling 10 shops to find one with capacity; no visibility into quality/reliability |
| **Device behavior** | Mobile-first; often on the factory floor with loud environments |
| **Success signal** | Posted a job and received a WhatsApp quote within 15 minutes |

### 3.2 Provider (Hizmet Sağlayıcı / Dükkan)
| Attribute | Description |
| :--- | :--- |
| **Who** | Owner-operated workshops and SME service businesses in industrial zones |
| **Job-to-be-done** | Fill idle capacity; find new customers beyond personal network |
| **Key frustration** | Marketing spend on unqualified leads; no digital presence |
| **Device behavior** | Mobile; often receives WhatsApp messages during work |
| **Success signal** | Received a qualified lead notification and closed a job within 24 hours |

### Non-Target (MVP)
- Large enterprise procurement (SAP-integrated ERP workflows)
- B2C consumers needing home repair
- International customers outside Turkey

---

## 4. Product Vision & Strategy

### Vision
> *"Hızlısanayi becomes the trusted industrial operating system for Turkey's SME sector — the way a factory finds capacity, quotes a job, and manages work, all in one place."*

### Strategic Bets
1. **Trust as a Moat:** Vergi Numarası verification is a barrier competitors won't copy easily because it adds friction. We lean into it as a differentiator.
2. **WhatsApp as the Closing Layer (MVP):** We don't compete with WhatsApp — we use it as the closing mechanism, dramatically reducing engineering scope for v1.
3. **Supply-First Launch:** Onboard verified providers in 3 target OSBs *before* opening to seekers. A marketplace with supply never feels empty.
4. **OSB Focus → National Expansion:** Bursa, Kocaeli, and İzmir OSBs as beachheads (highest industrial density). Expand to all 81 provinces in Phase 2.

---

## 5. Service Categories (MVP Scope)

| Category | Sub-Services | Urgency Level |
| :--- | :--- | :--- |
| **Üretim** | Talaşlı İmalat (CNC), Lazer Kesim, Sac İşleme, Döküm & Kalıp | Standard |
| **İşçilik** | Kaynak & Metal İşleri | Standard |
| **Ekipman & Lojistik** | Vinç Kiralama, Forklift & İstif, Taşıma & Nakliye | Standard / Urgent |
| **Acil Servis** | Araç Kurtarma (Çekici), Oto Tamir | Always Urgent |

**Why these 10?** They represent the highest-volume, lowest-digitization industrial services in Turkey based on Sahibinden and Google Trends data. Emergency categories (Çekici) provide high-frequency, word-of-mouth acquisition.

---

## 6. Functional Requirements

### 6.1 Authentication & Trust Layer

| Requirement | Detail | Priority |
| :--- | :--- | :--- |
| Phone OTP login | Supabase Auth, SMS-based | **P0** |
| Seeker profile | Name, company (optional), phone | **P0** |
| Provider registration | Tax ID, business name, category selection, service radius | **P0** |
| Document upload | Vergi Levhası photo → Supabase Storage | **P0** |
| Manual verification queue | Admin dashboard to approve/reject providers within 24h | **P0** |
| "Verified Business" badge | Shown on provider profile after approval | **P0** |

### 6.2 Job Posting (Seeker Flow)

| Requirement | Detail | Priority |
| :--- | :--- | :--- |
| Category selection | 10 MVP categories with icons | **P0** |
| Job description | Free text, 500 char max | **P0** |
| File attachments | Up to 5 files (photos, PDFs of technical drawings) | **P0** |
| Location input | GPS auto-detect OR city/district picker (81 il) | **P0** |
| Reach setting | "Yakınımdaki Dükkanlar (X km)" vs. "Tüm Türkiye" | **P0** |
| Job expiry | Auto-close after 72 hours if no action | **P1** |
| Draft saving | Auto-save in-progress posts | **P1** |

### 6.3 Lead Feed & Bidding (Provider Flow)

| Requirement | Detail | Priority |
| :--- | :--- | :--- |
| Personalized lead feed | Filtered by: provider's categories + service radius + location | **P0** |
| Job detail view | Full description, attachments, seeker location on map | **P0** |
| WhatsApp Bridge | Deep link opens WA with pre-filled templated message | **P0** |
| Distance display | "X km uzakta" for each job in feed | **P0** |
| "Not Interested" action | Hides job from feed; improves feed quality | **P1** |

### 6.4 Notifications

| Trigger | Recipient | Channel | Priority |
| :--- | :--- | :--- | :--- |
| New job in provider's category + radius | Provider | Push (Expo) | **P0** |
| Provider verification approved/rejected | Provider | Push + SMS | **P0** |
| Provider clicked WA on seeker's job | Seeker | Push | **P1** |

### 6.5 Admin Panel (Internal Tool)

| Requirement | Priority |
| :--- | :--- |
| View pending provider verifications | **P0** |
| Approve/reject with reason | **P0** |
| View all jobs and basic platform stats | **P1** |

---

## 7. Technical Architecture

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Mobile Frontend** | React Native (Expo) + TypeScript | Single codebase for iOS + Android; Expo Go for fast QA |
| **Backend API** | FastAPI (Python 3.11) | Existing foundation; async-ready; fast iteration |
| **Database** | Supabase (PostgreSQL + PostGIS) | RLS for multi-tenant security; PostGIS for geo queries |
| **Auth** | Supabase Auth (Phone OTP) | Built-in SMS delivery; no custom auth server |
| **File Storage** | Supabase Storage | Vergi levhası, technical drawings; bucket-level policies |
| **Messaging** | Meta WhatsApp Cloud API | Pre-filled template messages; no custom chat UI in MVP |
| **Push Notifications** | Expo Notifications + FCM/APNs | Native delivery via Expo's managed service |
| **Maps** | Google Maps SDK | Provider locations, distance display |

### Key Architecture Decisions

- **PostGIS radius query**: `SELECT * FROM providers WHERE ST_DWithin(location, ST_Point(lng, lat), radius_meters)`
- **Supabase RLS:** Providers see only their own documents; seekers see only their own jobs
- **WhatsApp Bridge:** `wa.me/{phone}?text={encoded_template}` deep links for MVP — no webhook complexity until Phase 2
- **No in-app chat v1:** Keeps scope tight; all negotiation on WhatsApp

---

## 8. User Stories

### Seeker
> As a maintenance chief at a factory in Kocaeli, I want to post a CNC machining job with a technical drawing so that I can get quotes from nearby verified shops within minutes.

> As a truck driver with a breakdown on the highway, I want to find the nearest çekici in my area so that I can get help within 30 minutes.

### Provider
> As a CNC workshop owner in Bursa OSB, I want to receive instant alerts for CNC jobs posted within 50km so that I can grow my customer base without spending on ads.

> As a new verified provider, I want to know when my verification is approved so I can start receiving leads immediately.

---

## 9. Success Metrics (KPIs)

### North Star Metric
**"Qualified Connections"** — number of WhatsApp conversations initiated through the platform per week.

### 90-Day Launch Targets
| Metric | Target |
| :--- | :--- |
| Verified providers onboarded | 100+ |
| Jobs posted | 200+ |
| WhatsApp connections made | 300+ |
| Provider → WA conversion rate | > 30% |
| Time from post to first WA contact | < 15 min (median) |
| Provider verification turnaround | < 24 hours |

### Health Metrics
| Metric | Target |
| :--- | :--- |
| Push notification opt-in rate | > 70% |
| Provider 7-day retention | > 40% |
| App store rating | > 4.2 ★ |
| Crash-free session rate | > 99.5% |

---

## 10. Monetization Strategy

### MVP Phase (Free)
All features free for both sides. Goal: validate supply-demand matching and build network density.

### Phase 2 — Freemium
| Tier | Price | Features |
| :--- | :--- | :--- |
| **Free** | ₺0/mo | 5 lead views/day; standard listing |
| **Pro** | ₺299/mo | Unlimited leads; "Featured" badge; early alerts |
| **Gold** | ₺699/mo | All Pro + promoted top-category listing; analytics |

### Phase 3 — Commission
2-3% on jobs processed in-app (requires in-app payment integration, Phase 3).

---

## 11. Go-to-Market Strategy

### Phase 1: OSB Boots-on-the-Ground (Months 1–2)
- Door-to-door provider onboarding in Bursa Nilüfer, Kocaeli Gebze, İzmir Kemalpaşa OSBs
- Target: 30–40 providers per OSB
- Offer 6-month free Pro to first 100 providers
- Seed OSB community WhatsApp groups with launch announcement

### Phase 2: Digital Acquisition (Months 3–6)
- **Google Ads:** "CNC atölyesi Bursa", "vinç kiralama İzmir" (high-intent, low-competition)
- **Content:** "Sanayi Bülteni" weekly newsletter for industrial community
- **Referral:** Verified providers invite shops → earn 1 month free Pro

### Phase 3: Scale (Month 6+)
- Expand to all 81 provinces digitally
- Partnership with OSB yönetimleri for official co-marketing

---

## 12. Competitive Landscape

| Competitor | Strength | Weakness | Our Edge |
| :--- | :--- | :--- | :--- |
| **Sahibinden.com** | Brand, traffic | Not B2B; no verification | Trust layer + verified ecosystem |
| **LinkedIn** | Professional network | No job flow for SMEs; expensive | Mobile-first, WhatsApp-native |
| **WhatsApp Groups** | Culturally embedded | No structure; no search | We structure the chaos; keep WA familiarity |
| **Endüstri.net** | Industrial directory | Static; no real-time matching | Real-time lead feed + notifications |
| **Imported platforms** | Feature-rich | Not localized; no Vergi No. | 100% built for Turkey |

---

## 13. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
| :--- | :--- | :--- | :--- |
| **Cold Start (no providers)** | High | Critical | Supply-first strategy; OSB outreach; free Pro offer |
| **WhatsApp Template Rejection** | Medium | High | Pre-approve templates; fallback to plain deep link |
| **Slow provider verification** | Medium | High | < 24h SLA; hire part-time verifier |
| **Fraudulent listings** | Low | High | Vergi No. = real KYC; manual document review |
| **iOS App Store delay** | Medium | Medium | Use Expo Go/TestFlight for beta; submit early |
| **Low push opt-in rate** | Medium | Medium | Request permission post-value moment |

---

## 14. Out of Scope (MVP)

- In-app payment processing
- In-app chat / messaging
- Provider rating & review system
- Subscription billing
- Automated Vergi No. API verification
- Web app (mobile-only MVP)
- International markets

---

## 15. Open Questions

1. **Verification SLA:** Who verifies providers in the first 30 days — founder-only or a VA?
2. **WhatsApp Business Account:** Is the Meta Business Account approved and the number registered?
3. **OSB Partnership:** Any formal agreements with OSB yönetimleri for co-marketing?
4. **KVKK Compliance:** Has a privacy review been done for storing Vergi Levhası photos?
5. **Pricing Validation:** Have any providers been asked if they'd pay ₺299/mo for Pro tier?

---

*This is a living document. Update after each user research session, sprint review, or pivot decision.*
