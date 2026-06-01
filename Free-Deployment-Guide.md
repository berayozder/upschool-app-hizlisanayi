# Hızlısanayi: Ücretsiz Canlıya Alma Kılavuzu (Free Deployment Guide)

Bu kılavuz, Hızlısanayi projesini **hiçbir ücret ödemeden (0 TL)**, tamamen ücretsiz servislerin limitleri dahilinde canlıya nasıl alacağınızı adım adım açıklamaktadır.

---

## Adım 1: Ücretsiz Gemini API Anahtarı Almak

Yapay zeka (AI) destekli ilan düzenleme özelliğinin çalışabilmesi için ücretsiz bir Gemini API anahtarı almanız gerekir:

1.  [Google AI Studio](https://aistudio.google.com/) web sitesine gidin.
2.  Google hesabınızla giriş yapın.
3.  Sol üst menüdeki **"Get API Key"** butonuna tıklayın.
4.  **"Create API Key"** butonuna tıklayarak yeni bir anahtar oluşturun ve bunu güvenli bir yere kopyalayın.

---

## Adım 2: Render.com Üzerinde Ücretsiz Backend Kurulumu

FastAPI backend sunucumuzu internete açmak için AWS yerine tamamen ücretsiz olan **Render.com** platformunu kullanacağız:

1.  [Render.com](https://render.com/) adresine gidin ve ücretsiz üye olun.
2.  Sağ üstteki **"New +"** butonuna tıklayın ve **"Web Service"** seçeneğini seçin.
3.  GitHub hesabınızı bağlayın ve `upschool-app-hizlisanayi` reposunu seçin.
4.  Aşağıdaki ayarları yapın:
    *   **Name:** `hizlisanayi-backend`
    *   **Language:** `Python`
    *   **Region:** En yakın bölgeyi seçin (Örn: Frankfurt - `eu-central`)
    *   **Branch:** `main`
    *   **Root Directory:** `backend` *(Çok önemli: projenin sadece backend alt klasörünü build etmesini sağlar)*
    *   **Build Command:** `pip install -r requirements.txt`
    *   **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
    *   **Instance Type:** **Free** ($0/month) seçeneğini işaretleyin.
5.  Aynı ekranda **"Environment"** veya **"Advanced"** sekmesindeki **"Add Environment Variable"** kısmına tıklayarak yerel `backend/.env` dosyanızdaki şu anahtarları ekleyin:
    *   `SUPABASE_URL` = *(Supabase URL adresiniz)*
    *   `SUPABASE_SERVICE_ROLE_KEY` = *(Supabase service_role anahtarınız)*
    *   `SUPABASE_JWT_SECRET` = *(Supabase JWT gizli anahtarınız)*
    *   `SUPABASE_WEBHOOK_SECRET` = *(Supabase Webhook doğrulama şifreniz)*
    *   `GEMINI_API_KEY` = *(Adım 1'de aldığınız ücretsiz Gemini API anahtarı)*
6.  **"Deploy Web Service"** butonuna tıklayın. 
7.  Build işlemi 2-3 dakika sürecektir. İşlem bittiğinde en üstte size verilen canlı URL'i kopyalayın (Örn: `https://hizlisanayi-backend.onrender.com`).

---

## Adım 3: Frontend Bağlantısını Güncellemek

Telefonunuzdaki mobil uygulamanın local makineniz yerine canlıdaki sunucu ile konuşmasını sağlamamız gerekiyor:

1.  [frontend/.env](file:///Users/berayozder/Desktop/upschool-app/frontend/.env) dosyasını açın.
2.  `EXPO_PUBLIC_API_URL` değişkenini Render'ın size verdiği canlı URL ile güncelleyin:
    ```env
    EXPO_PUBLIC_API_URL=https://your-app-name.onrender.com
    ```
3.  Terminalinizde bu değişikliği commit edip GitHub'a gönderin:
    ```bash
    git add frontend/.env
    git commit -m "Update frontend API URL to live Render URL"
    git push origin main
    ```

---

## Adım 4: Supabase Webhook Bağlantılarını Güncellemek

Yeni bir ilan verildiğinde veya onay durumu değiştiğinde push bildirimlerin tetiklenmesi için Supabase webhooks ayarlarını güncellemelisiniz:

1.  [Supabase Dashboard](https://supabase.com/dashboard) ➔ Projeniz ➔ **Database** ➔ **Webhooks** sayfasına gidin.
2.  Daha önce oluşturulmuş olan webhoook'ları düzenleyin (veya yoksa yeniden oluşturun):
    *   **Webhook 1 (İlan Bildirimleri):**
        *   **Table:** `jobs`
        *   **Events:** `INSERT`
        *   **URL:** `https://your-app-name.onrender.com/webhooks/new-job`
        *   **HTTP Method:** `POST`
        *   **HTTP Headers:** `Authorization: Bearer [SUPABASE_WEBHOOK_SECRET]`
    *   **Webhook 2 (Onay Durumu Değişikliği):**
        *   **Table:** `provider_profiles`
        *   **Events:** `UPDATE`
        *   **URL:** `https://your-app-name.onrender.com/webhooks/verification-changed`
        *   **HTTP Method:** `POST`
        *   **HTTP Headers:** `Authorization: Bearer [SUPABASE_WEBHOOK_SECRET]`

---

## Önemli Not (Free Tier Sınırlaması)
Render.com'un ücretsiz planında sunucular **15 dakika boyunca istek almazsa uyku moduna geçer.** Uygulamayı açtığınızda ilk istek 30-40 saniye kadar gecikebilir (sunucunun uyanma süresi). Bu durum tamamen normaldir ve jüri değerlendirirken sunucunun uyanmasını beklemelidir.
