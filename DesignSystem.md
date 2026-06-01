# Tasarım Sistemi (DesignSystem.md)

Hızlısanayi, sanayi ortamında çalışan, dış mekanda veya gürültülü atölyelerde hızlı hareket etmesi gereken kullanıcılar (ustalar, satın alma müdürleri, atölye sahipleri) için tasarlanmıştır. Bu nedenle tasarım sistemimizin ana odağı **maksimum okunabilirlik, devasa dokunma hedefleri ve görsel sadeliktir.**

---

## 1. Renk Paleti (Color System)

Renkler, uygulamanın durumlarını (aktif ilan, onaylı hesap, bekleyen başvuru) karmaşaya yer vermeden net bir şekilde anlatmak üzere seçilmiştir.

### Ana Renkler (Primary & Brand)
*   **Primary (Mavi):** `#1D4ED8` — Güven veren, kurumsal olmayan, endüstriyel mavi. Form odakları ve ana yönlendirmelerde kullanılır.
*   **Primary Pressed (Koyu Mavi):** `#1E40AF` — Buton tıklama durumları için.
*   **Primary Light (Hafif Mavi):** `#EFF6FF` — Kategori etiketleri gibi arka plan dolgularında.
*   **Background (Arka Plan):** `#F1F5F9` — Sıcak gri/arduvaz tonu. Kartların kontrastını artırır, gözü yormaz.
*   **Surface / Card (Yüzey):** `#FFFFFF` — İlan kartları ve form elemanlarının arka planı.
*   **Border (Sınır):** `#CBD5E1` — Kart ve input çerçeveleri.

### Metin Renkleri (Typography Colors)
*   **Text Primary:** `#0F172A` — Başlıklar ve kritik bilgiler için yüksek kontrastlı koyu gri.
*   **Text Secondary:** `#334155` — İkincil metinler ve açıklamalar.
*   **Text Muted:** `#64748B` — Tarih, konum gibi arka planda kalması gereken bilgiler.
*   **Text on Primary:** `#FFFFFF` — Mavi butonlar üzerindeki beyaz yazılar.

### Durum ve Uyarı Renkleri (Status Colors)
*   **Success (Yeşil):** `#15803D` (Arka plan: `#F0FDF4`) — Onaylı işletme rozetleri ve "Aktif" ilan durumları için.
*   **Urgent / Warning (Turuncu):** `#C2410C` (Arka plan: `#FFF7ED`) — Acil ilan etiketleri (Çekici, Oto Tamir vb.) ve süresi dolmak üzere olan ilanlar için.
*   **Error (Kırmızı):** `#DC2626` (Arka plan: `#FEF2F2`) — Reddedilen başvurular ve form doğrulama hataları için.
*   **Pending (Nötr):** `#475569` (Arka plan: `#F8FAFC`) — Onay bekleyen işletme başvuruları ve süresi dolmuş ilanlar için.

---

## 2. Tipografi (Typography)

Sanayi ortamlarında gün ışığı altında veya hareket halinde okunabilirliği sağlamak amacıyla büyük yazı boyutları tercih edilmiştir.

| Rol | Boyut (Size) | Ağırlık (Weight) | Kullanım Alanı |
| :--- | :--- | :--- | :--- |
| **Screen Title** | `28px` | Bold | Ekranların en üstündeki ana başlıklar |
| **Section Title** | `20px` | Semibold | Ekran içindeki grup başlıkları |
| **Card Title** | `17px` | Semibold | İlan kartı başlıkları, firma adları |
| **Body** | `16px` | Regular | Form etiketleri, açıklamalar, uzun metinler |
| **Secondary** | `14px` | Regular | Konum, tarih, kategori gibi ikincil bilgiler |
| **Caption** | `13px` | Regular | Zaman damgaları, form altı yardımcı yazıları |
| **Badge / Pill** | `12px` | Semibold | Durum etiketleri, kategori rozetleri |

*Kurallar:*
*   Metinlerde tek bir bölümde en fazla 3 farklı yazı boyutu kullanılabilir.
*   Kalın (Bold) yazı tipi yalnızca başlıklar ve rozet yazılarında tercih edilir; gövde metinleri kalınlaştırılmaz.

---

## 3. Boşluklar ve Yerleşim (Spacing & Layout)

Tasarım sistemi 8px tabanlı bir grid yapısına dayanır (`base unit: 8px`).

*   **space-1 (8px):** İç ikon boşlukları, çok yakın elemanların arası.
*   **space-2 (12px):** Form etiketi ile form girdisi (input) arasındaki boşluk.
*   **space-3 (16px):** Ekran kenar boşlukları (safe area padding) ve kart içi boşluklar.
*   **space-4 (24px):** Kartlar arası boşluklar.
*   **space-5 (32px):** Sayfadaki ana bölümler (örneğin form grupları) arası boşluklar.

---

## 4. Dokunma Hedefleri (Touch Targets)

Eldivenle veya kirli ellerle kolay kullanım sağlamak için dokunma alanları standartların üzerinde tutulmuştur:

*   **Ana Butonlar (Primary CTA):** Minimum `56px` yükseklik. Ekranın en altında tam genişlikte yer alır ve kaydırma (scroll) arkasına gizlenmez.
*   **İkincil Butonlar:** `48px` yükseklik.
*   **Form Girişleri (TextInput):** `52px` yükseklik.
*   **Listeler / Seçim Alanları:** Minimum dokunma yüksekliği `56px` olarak ayarlanmıştır.

---

## 5. Bileşen Kuralları (Component Rules)

### Butonlar (Buttons)
*   **Primary:** Arka plan `#1D4ED8`, yazı beyaz, köşe yuvarlama `14px`. Yükleme durumunda yazının yerini beyaz `ActivityIndicator` alır.
*   **Secondary:** Sınır çizgisi `#CBD5E1`, arka plan şeffaf, yazı `#0F172A`.
*   **WhatsApp CTA:** Arka plan yeşil (`#25D366`), yazı beyaz. Butonun solunda mutlaka WhatsApp logosu yer alır.
*   **Destructive:** Arka plan `#DC2626`, yazı beyaz.

### Giriş Alanları (Inputs)
*   Form etiketleri her zaman giriş alanının üzerinde yer alır (yüzen/animasyonlu etiketler kullanılmaz).
*   Seçildiğinde (focus) sınır çizgisi mavi olur (`#1D4ED8`, 2px).
*   Hata durumunda sınır çizgisi kırmızı olur (`#DC2626`), arka plan açık kırmızıya döner (`#FEF2F2`) ve altında kırmızı açıklama metni belirir.
*   Karakter sınırlaması olan alanlarda (Başlık: 5-100, Açıklama: 0-500) sağ alt köşede karakter sayacı gösterilir.

### Köşe Yuvarlama (Border Radius)
*   **Kartlar (Cards):** `16px`
*   **Giriş Elemanları / Butonlar:** `14px`
*   **Rozetler / Durum Hapları:** `999px` (Tam yuvarlak)
*   **Fotoğraf Küçük Resimleri (Thumbnails):** `10px`
