# Hızlısanayi UI Choices

Use this file as the source of truth for design decisions.
Goal: screens that feel like a trusted local tool — bold, legible, and immediately obvious to users with no tech background.

---

## Core Principles

1. One main action per screen. Everything else supports it.
2. Big text, big touch targets. Users may be in a workshop, glancing quickly.
3. Show only what's needed to complete the task — no decorative elements.
4. Consistency over cleverness: same patterns, same labels, same feel everywhere.
5. Status must always be visible: pending, active, expired, approved — never ambiguous.

---

## Design Direction

- **Style:** Bold industrial — confident, warm, physical. Not cold SaaS.
- **Tone:** Short, direct Turkish. Like talking to the person at the counter.
- **Density:** Comfortable. Generous touch targets, clear breathing room.
- **Feel:** A tool that serious people use — not a consumer lifestyle app.
- **Reference mood:** A heavy-duty hardware store receipt crossed with a modern logistics app.

---

## Color System

### Primary Palette

| Role | Token | Hex |
|:---|:---|:---|
| Primary | `--color-primary` | `#1D4ED8` |
| Primary pressed | `--color-primary-dark` | `#1E40AF` |
| Primary light (background tint) | `--color-primary-light` | `#EFF6FF` |
| Background | `--color-bg` | `#F1F5F9` |
| Surface / Card | `--color-surface` | `#FFFFFF` |
| Border | `--color-border` | `#CBD5E1` |

> **Change from v1:** Background shifted from `#F8FAFC` to `#F1F5F9`. The slightly warmer slate gives cards more contrast and feels less clinical.

### Text

| Role | Token | Hex |
|:---|:---|:---|
| Text primary | `--color-text` | `#0F172A` |
| Text secondary | `--color-text-secondary` | `#334155` |
| Text muted | `--color-text-muted` | `#64748B` |
| Text on primary | `--color-text-on-primary` | `#FFFFFF` |

> **Change from v1:** Secondary text darkened from `#475569` to `#334155` for better legibility at a glance, especially for users outdoors or in poor light.

### Status Colors

| Role | Token | Hex | Usage |
|:---|:---|:---|:---|
| Success | `--color-success` | `#15803D` | Approved, active job |
| Success bg | `--color-success-bg` | `#F0FDF4` | Status pill background |
| Urgent / Warning | `--color-urgent` | `#C2410C` | Urgent category badge, expiring soon |
| Urgent bg | `--color-urgent-bg` | `#FFF7ED` | Urgent pill background |
| Error | `--color-error` | `#DC2626` | Validation errors, rejection |
| Error bg | `--color-error-bg` | `#FEF2F2` | Error field background |
| Neutral / Pending | `--color-neutral` | `#475569` | Pending verification |
| Neutral bg | `--color-neutral-bg` | `#F8FAFC` | Pending pill background |

> **Change from v1:** Status colors now come with paired background tokens so pill/badge components are defined once and reused, never improvised per screen.

### Color Usage Rule

Max 1 primary + 1 status color visible at once per screen. Never mix two status colors (e.g. success + urgent) in the same card.

---

## Typography

### Scale

| Role | Size / Weight | Usage |
|:---|:---|:---|
| Screen title | `28 / bold` | Top of each main screen |
| Section title | `20 / semibold` | Section headers within a screen |
| Card title | `17 / semibold` | Job title in card, company name |
| Body | `16 / regular` | Descriptions, form labels |
| Secondary | `14 / regular` | Meta info: city, time, category |
| Caption | `13 / regular` | Timestamps, helper text |
| Badge / Pill | `12 / semibold` | Status labels, category tags |

> **Change from v1:** Screen title bumped from 24 to 28. Card title added as a dedicated size (17) so job titles always feel prominent without using the section size.

### Rules

- Max 3 text sizes in a single section — still applies.
- Bold weight is reserved for titles and badge text only. Never bold body copy.
- Don't truncate job titles at under 40 characters. Let them wrap to 2 lines.
- Category labels: always `12 / semibold`, uppercase, letter-spacing `0.5`.

---

## Spacing & Layout

### Scale (base unit: 8px)

| Token | Value | Usage |
|:---|:---|:---|
| `space-1` | `8px` | Inner icon padding, tight gaps |
| `space-2` | `12px` | Between label and input |
| `space-3` | `16px` | Screen horizontal padding, card padding |
| `space-4` | `24px` | Between card sections |
| `space-5` | `32px` | Between major screen sections |

### Touch Targets

- Minimum tap area: `56px` height — applies to all list rows, all buttons.
- Primary CTA buttons: `56px` height (increased from 48). Users with rough hands / gloves deserve larger targets.
- Secondary buttons: `48px` height.
- Input height: `52px` (increased from 48 for the same reason).

> **Change from v1:** CTA and input heights increased. This is the single most impactful change for the non-tech audience.

### Border Radius

| Element | Radius |
|:---|:---|
| Cards | `16px` |
| Inputs / Buttons | `14px` |
| Pills / Chips | `999px` |
| Photo thumbnails | `10px` |
| Bottom sheets | `24px` top corners |

> **Change from v1:** Slightly more rounded. Softer radius on cards feels less corporate, more approachable for non-tech users while staying within the industrial tone.

---

## Component Rules

### Buttons

| Variant | Background | Text | Border | Height |
|:---|:---|:---|:---|:---|
| Primary | `#1D4ED8` | White | None | `56px` |
| Secondary | White | `#0F172A` | `#CBD5E1` | `48px` |
| Destructive | `#DC2626` | White | None | `48px` |
| Ghost | Transparent | `#1D4ED8` | None | `48px` |
| WhatsApp CTA | `#25D366` | White | None | `56px` |

- Button labels: action-first, verb + object. "İlan Ver", "Teklif Gönder", "Fotoğraf Ekle".
- Primary CTA is always full-width at the bottom of a screen. Never floated or hidden behind scroll.
- WhatsApp button: always show the WhatsApp logo icon left of the text. Never just text.
- Disabled state: `opacity: 0.4`. Never hide a disabled button — show why it's disabled with a helper text below.

### Inputs

- Label always above the field — never floating placeholder labels.
- Placeholder explains format: `"+90 532 000 00 00"`, `"Örn: 40 adet flanş"`.
- On focus: border becomes `#1D4ED8`, 2px.
- On error: border `#DC2626`, background `#FEF2F2`, short message below in `#DC2626`.
- Character counters: show for title (5–100 chars) and description (0–500 chars). Position: right-aligned below the field.

### Cards (Job Cards)

One card style across the entire app. No variations.

```
┌─────────────────────────────────────────┐
│  [CATEGORY BADGE]          [TIME AGO]   │
│                                         │
│  Job Title — 17/semibold                │
│                                         │
│  City · District — 14/regular muted     │
│                                         │
│  [Photo strip if photos exist]          │
│                                         │
│  [Primary CTA or Status label]          │
└─────────────────────────────────────────┘
```

- Card padding: `16px` all sides.
- Shadow: `0 1px 3px rgba(0,0,0,0.08)` — subtle. Prefer the border `#CBD5E1` over heavy shadow.
- Max 1 action in a card footer (for MVP). Never 2 competing buttons.
- Expired/closed jobs: reduce card `opacity: 0.5`, show "Süresi Doldu" badge. No CTA.

### Category Badges

- Background: `--color-primary-light` (`#EFF6FF`), text: `--color-primary` (`#1D4ED8`).
- Urgent categories (tow, autorepair): background `--color-urgent-bg`, text `--color-urgent`.
- Always `12 / semibold`, uppercase, `letter-spacing: 0.5`.
- Never show more than 1 category badge per card.

### Status Pills (Verification, Job Status)

| Status | Background | Text |
|:---|:---|:---|
| Aktif | `#F0FDF4` | `#15803D` |
| Beklemede | `#F8FAFC` | `#475569` |
| Onaylandı | `#F0FDF4` | `#15803D` |
| Reddedildi | `#FEF2F2` | `#DC2626` |
| Süresi Doldu | `#F8FAFC` | `#475569` |

### Photo Upload Strip

- Show 3 slots always — empty slots display a `+` icon with `"Fotoğraf Ekle"` label.
- Filled slot: shows thumbnail with a small `×` remove button (top-right corner).
- Upload in progress: show a loading spinner overlay on the slot, not a toast.
- Error on one slot: red border on that slot only. Don't block the rest.

### Empty States

One sentence + one CTA. No illustrations for MVP.

| Screen | Message | CTA |
|:---|:---|:---|
| Provider feed (no jobs) | "Bu an bölgende aktif ilan yok." | — |
| Provider feed (no location) | "Konum bilgin eksik." | "Profili Tamamla" |
| My Jobs (no jobs) | "Henüz ilan vermedin." | "İlan Ver" |
| Verification pending | "Başvurun inceleniyor. Onaylandığında bildirim alacaksın." | — |

---

## Navigation

- Bottom tab bar: 2 tabs — **"İlanlar"** (Seeker view) and **"Fırsatlar"** (Provider view). Role switching happens here, not in Settings.

> **Change from v1:** Role switching surfaced to the tab bar. For non-tech users, navigating to Settings to switch roles is a critical failure point.

- Active tab: `#1D4ED8` icon + label. Inactive: `#94A3B8`.
- Tab bar background: `#FFFFFF` with `border-top: 1px solid #E2E8F0`.

---

## Copy Guidelines

- Short and task-based — no marketing language.
- Use "sen/siz" consistently. MVP: informal **"sen"** — feels closer.
- Concrete labels always:
  - ✅ "İş Tanımı"
  - ❌ "Bize İhtiyacınızı Anlatın"
- Error messages explain the fix in one sentence:
  - ✅ "Telefon numarası +90 ile başlamalı."
  - ❌ "Geçersiz format."
- Confirmation messages confirm what happened, not what will happen:
  - ✅ "İlanın yayınlandı."
  - ❌ "İlanınız yayınlanacaktır."

---

## Accessibility & Legibility Rules

These exist specifically for the non-tech, often-outdoor user base.

- All text on white backgrounds must meet WCAG AA contrast (4.5:1 minimum).
- Never rely on color alone to communicate state — always pair with a label or icon.
- Touch targets: minimum `56 × 56px` effective area.
- Never autoplay anything. No loaders that spin forever — show a timeout error at 10s.
- Keep form screens to **one field of focus at a time** where possible (wizard-style for long forms).

---

## Anti-AI Look Checklist

Before merging a new screen, check:

- [ ] One card style only?
- [ ] Max 2 colors per screen (primary + 1 status)?
- [ ] One clear primary CTA, full-width, bottom of screen?
- [ ] All text short and practical?
- [ ] All spacing on 8px grid?
- [ ] Screen title is 28/bold?
- [ ] Touch targets ≥ 56px?
- [ ] No floating labels or hidden buttons?
- [ ] Empty state has a message + optional CTA?
- [ ] Does this screen look consistent with existing ones?

---

## Decision Log

`YYYY-MM-DD - Decision - Reason`

- `2026-04-22 - Primary color set to #1D4ED8 - Better contrast and trust tone`
- `2026-04-22 - Single card style only - Reduce visual noise across flows`
- `2026-05-03 - Screen title bumped to 28/bold - Outdoor legibility, non-tech user clarity`
- `2026-05-03 - CTA height increased to 56px - Large touch targets for workshop environment`
- `2026-05-03 - Input height increased to 52px - Same reason as CTA`
- `2026-05-03 - Background shifted to #F1F5F9 - Better card contrast, less clinical feel`
- `2026-05-03 - Text secondary darkened to #334155 - Better legibility in varying light`
- `2026-05-03 - Status colors paired with bg tokens - Consistent pill/badge usage app-wide`
- `2026-05-03 - Role switch moved to tab bar - Settings-based switching caused drop-off for non-tech users`
- `2026-05-03 - Added WhatsApp button as its own variant - Primary KPI action needs distinct, recognizable style`
- `2026-05-03 - Border radius on cards to 16px - More approachable feel without breaking industrial tone`
- `2026-05-03 - Informal "sen" copy throughout - Feels closer and more natural for the target demographic`