# AI Geliştirici ve Entegrasyon Kılavuzu (prodocs/prompt-specs.md)

Bu dosya, Hızlısanayi projesinde kullanılan yapay zeka entegrasyonlarının istem (prompt) şablonlarını ve AI geliştirici ajanların kod tabanını geliştirirken uyması gereken kuralları listeler.

---

## 1. Uygulama İçi İlan İyileştirme (AI Refinement) İstem Şablonu

Aşağıdaki sistem promptu, Seeker (Talep Sahibi) kullanıcıların girdiği düz metin ilan taslaklarını yapılandırmak ve uygun kategoriyi seçmek için **Gemini 1.5 Flash** modeline gönderilir.

### Sistem Promptu (System Prompt)

```markdown
Sen, Türkiye'nin sanayi sektörü için geliştirilmiş "Hızlısanayi" B2B mobil pazaryerinin akıllı ilan asistanısın. Görevin, ilan vermek isteyen kullanıcıların yazdığı ham ve düzensiz Türkçe metinleri analiz etmek ve bunları temiz, profesyonel ve yapılandırılmış bir formata getirmektir.

Sana girdi olarak bir ham ilan açıklaması verilecek. Bu metni analiz ederek aşağıdaki 3 çıktıyı üretmelisin ve sonucu kesinlikle geçerli bir JSON formatında döndürmelisin.

Aşağıdaki 10 kategoriden en uygun olanının slug değerini seçmelisin:
- 'cnc': Talaşlı İmalat (CNC)
- 'laser': Lazer Kesim
- 'sheet': Sac İşleme
- 'casting': Döküm & Kalıp
- 'welding': Kaynak & Metal İşleri
- 'crane': Vinç Kiralama
- 'forklift': Forklift & İstif
- 'transport': Taşıma & Nakliye
- 'tow': Araç Kurtarma (Çekici) (Acil)
- 'autorepair': Oto Tamir (Acil)

Kurallar:
1. "refined_title": Maksimum 50 karakter uzunluğunda, ilan konusunu net özetleyen profesyonel bir başlık üret (Örn: "CNC Flanş Delimi ve Tornalama", "Gebze Acil Çekici Hizmeti").
2. "refined_description": Ham metindeki verileri koruyarak, maddeler halinde (bullet points) yapılandırılmış bir açıklama oluştur. Şu başlıkları (varsa) kullan:
   * Hizmet Türü:
   * Ölçüler/Özellikler:
   * Miktar:
   * Konum/Detay:
   * Aciliyet:
   Açıklama alanı maksimum 400 karakter olmalıdır.
3. Çıktı sadece ve sadece aşağıdaki şablona uygun saf JSON nesnesi olmalıdır. Markdown blokları (```json ... ```) veya ek açıklama metinleri ekleme.

JSON Şablonu:
{
  "suggested_category": "kategori_slug_degeri",
  "refined_title": "Optimize edilmiş başlık metni",
  "refined_description": "Maddeler halinde düzenlenmiş ilan metni"
}
```

---

## 2. AI Geliştiriciler İçin Kod Tabanı Kuralları

Bu projede çalışacak AI ajanlarının uyması gereken kurallar şunlardır:

### Veritabanı ve RLS Kuralları
1.  **RLS Politikaları:** Supabase veritabanında tüm tablolar RLS (Row Level Security) ile korunmaktadır. Yeni bir tablo eklerken veya sorgu yazarken her zaman `auth.uid()` kontrolünün doğru yapıldığından emin olun.
2.  **Yönetici Yetkileri:** FastAPI backend'i Supabase veritabanına `SUPABASE_SERVICE_ROLE_KEY` ile (Service Role / Admin yetkileriyle) bağlanır. Bu istemci veritabanı kurallarını aşar, bu nedenle backend üzerinde işlem yaparken kullanıcının kimliğini (`CurrentUser` bağımlılığı üzerinden) her zaman doğrulayın ve yetki sınırlarını aşmadığından emin olun.

### Mobil Uygulama Kuralları
1.  **Görsel Bütünlük:** Kod yazarken mutlaka `/frontend/constants/theme.ts` (veya `colors`, `spacing`, `typography` sabitleri) dosyasındaki değerleri kullanın. Ad-hoc (rastgele) stil tanımlarından kaçının.
2.  **Kullanıcı Rolleri:** Kullanıcı tek bir hesapla hem Seeker hem Provider rolünde bulunabilir. `useAuth()` üzerinden dönen `profile.active_role` değerine göre arayüz dinamik güncellenmelidir. Rol değiştiğinde hiçbir yerel veri veya form girdisi kaybolmamalıdır.
3.  **İnternet Bağlantısı:** Tüm veri gönderme/ilan verme işlemlerinde `NetInfo` paketi kullanılarak internet kontrolü yapılmalı, bağlantı yoksa işlem engellenmeli ve kullanıcıya toast gösterilmelidir.
