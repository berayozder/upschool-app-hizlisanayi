# Teknolojik Altyapı ve AI Kullanımı (tech-stack.md)

Hızlısanayi projesi, Türkiye'deki sanayi KOBİ'lerinin ihtiyaç duyduğu hız, güven ve basitlik kriterlerini karşılamak amacıyla modern, performanslı ve ölçeklenebilir bir mimari ile tasarlanmıştır.

---

## 1. Kullanılan Teknolojiler ve Tercih Gerekçeleri

### Mobil Arayüz (Frontend)
*   **Teknoloji:** **React Native (Expo Managed Workflow) + TypeScript**
*   **Gerekçe:** 
    *   **Çift Platform Desteği:** Tek bir kod tabanından hem iOS hem Android uygulamaları üreterek geliştirme maliyetini ve süresini yarıya indirdik.
    *   **Hızlı Geliştirme (Expo):** Kamera, fotoğraf kütüphanesi, bildirimler ve yerel depolama entegrasyonu gibi kritik mobil özellikleri yerel konfigürasyonlarla uğraşmadan Expo modülleriyle çözdük.
    *   **Type Safety:** TypeScript kullanarak uygulama genelinde veri modellerini (ilanlar, kullanıcı profilleri) garanti altına aldık ve hata olasılığını minimize ettik.

### Veri ve Durum Yönetimi
*   **Teknoloji:** **React Query (@tanstack/react-query) + Zustand**
*   **Gerekçe:** 
    *   **React Query:** Sunucu durumunu (server state) yönetmek, otomatik arka plan yenilemeleri (refetching), sayfalama (pagination/infinite scroll) ve önbellek (caching) yönetimi için kullanıldı. Custom fetch yazma ihtiyacını ortadan kaldırarak kod temizliğini artırdı.
    *   **Zustand:** Kullanıcı oturumu, aktif rol durumu (Arayan/Sağlayıcı) gibi hafif ve küresel UI durumlarını yönetmek için tercih edildi. Redux gibi ağır alternatiflere kıyasla daha hızlı ve temiz bir yapı sundu.

### Backend API (Arkayüz)
*   **Teknoloji:** **FastAPI (Python 3.11) + HTTPX**
*   **Gerekçe:**
    *   **Yüksek Performans:** Asenkron mimarisi (async/await) sayesinde yüksek istek hacimlerini çok düşük gecikmeyle (low latency) karşılayabilir.
    *   **Otomatik Dokümantasyon:** OpenAPI (Swagger) dokümantasyonunu otomatik üretmesi entegrasyon sürecini hızlandırdı.
    *   **Hızlı Entegrasyon:** Python ekosistemindeki AI kütüphaneleri ve HTTP istemcileriyle (HTTPX) yapay zeka entegrasyonu son derece pratiktir.

### Veritabanı ve Sunucu Hizmetleri
*   **Teknoloji:** **Supabase (PostgreSQL 15 + PostGIS)**
*   **Gerekçe:**
    *   **PostGIS Coğrafi Filtreleme:** Sağlayıcıların sadece kendi hizmet yarıçaplarındaki ilanları görmesi gerekiyordu. PostGIS'in `ST_DWithin` fonksiyonunu kullanarak coğrafi konum bazlı sorguları milisaniyeler içinde gerçekleştirebildik.
    *   **Row Level Security (RLS):** Veri güvenliğini doğrudan veritabanı seviyesinde çözdük. Örneğin, bir vergi levhasını yalnızca o belgeyi yükleyen firmanın kendisi görebilir.
    *   **Auth (OTP):** Supabase'in sunduğu SMS OTP entegrasyonu sayesinde ekstra bir kimlik doğrulama sunucusu kurmadan güvenli telefon doğrulaması sağladık.

---

## 2. Yapay Zeka (AI / LLM) Kullanımı

Hızlısanayi projesinde yapay zeka hem **geliştirme sürecinde** hem de **ürünün çekirdek mantığında** aktif bir rol oynamaktadır.

### A. Ürün İçi Yapay Zeka Entegrasyonu (Gemini 1.5 Flash)
Uygulamanın ilan verme aşamasında, kullanıcıların (özellikle fabrikada veya atölyede aktif çalışan, elleri kirli/eldivenli ustaların) uzun ve detaylı ilanlar yazmasını kolaylaştırmak için **AI İlan İyileştirme (AI Refinement)** özelliği eklenmiştir.

*   **Çalışma Mantığı:** Kullanıcı ilan detayına düz bir metin (örneğin: *"bursa nilüferde acil cncde 10 tane delik delinecek flanş işi var"* veya *"lazer sac kesilecek gebze organize sanayide acil"*) yazdığında **"Yapay Zeka ile Düzenle" (Refine with AI)** butonuna tıklar.
*   **İşlem Akışı:**
    1.  İstek FastAPI'ye iletilir.
    2.  FastAPI, `httpx` üzerinden **Gemini 1.5 Flash** API'sine bağlanarak metni analiz eder.
    3.  Yapay zeka, metinden ilan başlığını optimize eder, uygun kategoriyi (örneğin: `cnc`, `laser`) otomatik olarak tespit eder ve ilan açıklamasını teknik olarak yapılandırır (Malzeme, Miktar, Aciliyet vb. başlıklarla liste haline getirir).
    4.  Arayüz, kullanıcının yerine kategoriyi seçer ve açıklamayı profesyonelce düzenlenmiş yeni metinle günceller.
*   **Güvenilirlik ve Fallback:** API anahtarı girilmediği veya kota aşımı yaşandığı durumlarda sistemin durmaması için **kural tabanlı bir fallback (yedek mekanizma)** kurulmuştur. Belirli kelimeleri (lazer, cnc, vinç vb.) tarayarak otomatik kategori atar ve basit şablonla açıklamayı yapılandırır.

### B. Geliştirme Sürecinde AI Kullanımı
Uygulama baştan sona geliştirilirken yapay zeka ajanları (Claude, Gemini vb.) ile çift programlama (pair-programming) yöntemi izlenmiştir.
*   **Mimari Kararlar:** Supabase RLS politikalarının ve PostGIS coğrafi sorgularının verimli tasarlanmasında yapay zekadan danışmanlık alınmıştır.
*   **Kod Üretimi:** Tekrarlı ve şablon niteliğindeki Expo Router navigasyon yapıları, form validasyonları ve veri çekme kancaları (hooks) yapay zeka desteğiyle hızlıca üretilmiş, geliştirici tarafından optimize edilmiştir.
