# ChessLab Kurulum Rehberi

## Adım 1: Supabase Projesi Oluştur

1. https://supabase.com adresine git ve ücretsiz hesap aç
2. "New Project" ile yeni proje oluştur (isim: `chesslab`)
3. Güçlü bir veritabanı şifresi belirle ve kaydet
4. Bölge olarak "West EU" seç (Türkiye'ye en yakın)

## Adım 2: Veritabanı Şemasını Yükle

1. Supabase panelinde sol menüden **SQL Editor** aç
2. `supabase/migrations/001_initial_schema.sql` dosyasının tüm içeriğini kopyala
3. SQL Editor'e yapıştır ve **Run** düğmesine bas
4. Hata yoksa tüm tablolar oluşturulur

## Adım 3: Auth Ayarları

1. Sol menüden **Authentication → Users** aç
2. "Add User" → **Create new user** ile kendi hesabını oluştur
   - E-posta: senin e-posta adresin
   - Şifre: güçlü bir şifre
3. **Authentication → URL Configuration**'da:
   - Site URL: `http://localhost:3000`

## Adım 4: API Anahtarlarını Al

1. Sol menüden **Project Settings → API** aç
2. Şu iki değeri kopyala:
   - `Project URL` → `.env.local` dosyasında `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Adım 5: .env.local Dosyasını Doldur

Proje klasöründe `.env.local` dosyasını aç ve değerleri gir:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-... (Claude API için - ileride lazım olacak)
```

## Adım 6: Uygulamayı Başlat

Terminal'de proje klasöründe:

```bash
npm run dev
```

Tarayıcıda http://localhost:3000 adresine git.

## Adım 7: Giriş Yap

Adım 3'te oluşturduğun kullanıcı bilgileriyle giriş yap.

---

## Sprint Planı — Sıradaki Adımlar

- [x] Sprint 1: Temel altyapı, auth, veritabanı, dashboard, PGN yükleme
- [ ] Sprint 2: Stockfish WASM entegrasyonu, otomatik analiz
- [ ] Sprint 3: Hata sınıflandırma ve etiketleme UI
- [ ] Sprint 4: Açılış repertuarı modülü
- [ ] Sprint 5: Oyun sonu laboratuvarı + Taktik defteri
- [ ] Sprint 6: Study Queue + Spaced Repetition
- [ ] Sprint 7: Dashboard grafikleri + Haftalık rapor
- [ ] Sprint 8: Claude AI entegrasyonu
- [ ] Sprint 9: Vercel deploy
