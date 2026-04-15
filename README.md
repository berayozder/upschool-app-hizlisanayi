# Hızlısanayi 🛠️

**Turkey's National B2B Marketplace for Industrial Services.** Connecting industrial customers with verified service providers across 81 provinces through a mobile-first, location-aware platform.

-----

## 📌 Overview

**Hızlısanayi** solves the discovery and trust problem in the Turkish industrial sector. Whether it is a CNC machining request in Kocaeli or an emergency crane rental in Ankara, the app allows "Seekers" to post jobs and "Verified Providers" to bid in real-time.

By integrating mandatory **Tax ID (Vergi Numarası)** verification and a **WhatsApp Cloud API** bridge, we ensure professional-grade reliability with the speed of modern messaging.

## 🚀 Key Features

  * **Verified Ecosystem:** Mandatory Tax ID and business document upload for all service providers to ensure B2B legitimacy.
  * **Hyper-Local Discovery:** Uses PostGIS-powered geospatial queries to find shops within a specific radius or within major **OSBs (Organize Sanayi Bölgeleri)**.
  * **Multi-Category Support:** specialized flows for 10+ industrial sectors including CNC, Laser Cutting, and Logistics.
  * **WhatsApp Bridge:** One-click transition from the app to a pre-filled WhatsApp conversation for final negotiations.
  * **National Reach:** Support for all 81 cities in Turkey with city/district-level filtering.

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Mobile Frontend** | **React Native (Expo)** with TypeScript |
| **Backend API** | **FastAPI (Python 3.11)** |
| **Database** | **Supabase (PostgreSQL + PostGIS)** |
| **Authentication** | **Supabase Auth (Phone OTP)** |
| **Storage** | **Supabase Storage** (for technical drawings & Vergi Levhası) |
| **Messaging** | **Meta WhatsApp Cloud API** |

## 📦 Industrial Categories

The platform currently supports high-demand industrial sectors:

  - **Manufacturing:** Talaşlı İmalat (CNC), Lazer Kesim, Sac İşleme, Döküm & Kalıp.
  - **Fabrication:** Kaynak & Metal İşleri.
  - **Logistics:** Vinç Kiralama, Forklift & İstif, Taşıma & Nakliye.
  - **Emergency:** Araç Kurtarma (Çekici), Oto Tamir.

## 📱 User Flow

1.  **Seeker:** Selects category ➔ Uploads photo/drawing ➔ Sets location ➔ Posts Job.
2.  **Provider:** Receives push notification ➔ Reviews technical specs ➔ Clicks "Bid via WhatsApp".
3.  **Negotiation:** The app opens a deep link to WhatsApp with a templated message to close the deal.

## 🛠️ Installation & Setup (Dev)

### Prerequisites

  - Node.js & Expo Go
  - Python 3.11+
  - Supabase Account

### 1\. Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# Configure .env with your Supabase & WhatsApp API credentials
uvicorn app.main:app --reload
```

### 2\. Mobile Setup

```bash
cd mobile
npm install
npx expo start
```

-----

## 📈 Roadmap

  - [ ] **Phase 1:** MVP launch with 10 core categories and manual verification.
  - [ ] **Phase 2:** Advanced OSB-based filtering and map view for providers.
  - [ ] **Phase 3:** Subscription model for "Verified Gold" shops and instant lead alerts.

-----

**Developed for the Turkish Industrial Ecosystem.** *Bridging the gap between the factory floor and digital convenience.*
