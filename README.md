# OtoMenzil Mobile

[otomenzil.com](https://www.otomenzil.com) elektrikli araç platformunun React Native (Expo) istemcisi. Mevcut SwiftUI iOS uygulamasının (~22.000 satır, ~20 ekran) birebir yeniden yazımıdır; aynı WordPress REST API'sini (`otomenzil.com/wp-json/otomenzil/v1/`) tüketir.

## Kurulum ve çalıştırma

```bash
npm install
npm run ios       # iOS simülatöründe aç
npm run android   # Android emülatöründe aç
npm start         # Expo dev server (QR ile cihazda)
```

## Doğrulama

```bash
npm run typecheck   # tsc --noEmit
npm test            # jest — 303 birim testi
npm run lint        # eslint (react-hooks kuralları strict)
npx expo export --platform ios   # üretim bundle doğrulaması
```

## Mimari

iOS'taki **store-driven shell** mimarisi korunmuştur: navigasyon bir stack değil, global store'daki `currentView: AppViewID` alanıdır; araç/blog detayları `overlay` alanıyla açılan tam ekran katmanlardır. Android donanım geri tuşu önce en üstteki overlay/panel'i kapatır, sonra navigasyon geçmişini yürür (`reduceBack`).

```
src/
├── config.ts          # API taban URL'leri, User-Agent/Referer sabitleri
├── models/            # API modelleri (exact JSON keys) + esnek decode yardımcıları
├── api/               # APIClient: 38 endpoint, nonce yönetimi (900 sn TTL),
│                      # homepage warm-up, REST→admin-ajax fallback kuralları
├── theme/             # Renk token'ları (light/dark), Outfit tipografi, useTheme()
├── utils/             # Saf iş mantığı: MTV/ÖTV/kredi/şarj hesaplayıcıları,
│                      # arama-karşılaştırma motorları, EPDK istasyon verisi (lazy 8MB seed),
│                      # Türkçe aksana duyarsız arama, site bootstrap
├── stores/            # zustand: navigationStore, authStore (optimistic favoriler/garaj
│                      # + rollback), preferencesStore, campaignStore, bootstrapCache
├── shell/             # AppShell, SiteNavbar, MobileDrawer, BottomTabBar, AuthModal,
│                      # paneller, kampanya popup'ı, AppBootstrap/AuraLoading
├── components/        # ~25 paylaşılan bileşen: CachedImage, HTMLContentView
│                      # (webview + yükseklik köprüsü), araç kartları, engagement bölümleri
└── screens/
    ├── registry.tsx   # AppViewID → ekran haritası
    ├── catalog/       # WebHome, CarSearch, Brands, RankedCars, AdvancedSearchModal
    ├── detail/        # CarDetail (overlay), Compare, Stations, GarageHomeSection
    ├── content/       # BlogArchive, BlogDetail (overlay)
    ├── tools/         # MTV, ÖTV, Taşıt Kredisi, Tüketim hesaplayıcıları
    └── account/       # Profile, Garage, Ayarlar, İletişim, Legal, Google Sign-In,
                       # username/garaj onboarding overlay'leri
```

Ekran bileşenleri **prop almaz** — tüm durumu store hook'larından okur. Yeni ekran eklemek: bileşeni yaz, `screens/registry.tsx` haritasına AppViewID ile ekle.

Detaylı spesifikasyonlar `docs/analysis/01-04` altındadır (veri katmanı, ekranlar, shell/hesap, bileşen/tema); yeniden yazım planı `docs/ROADMAP.md` ve `docs/EXECUTION-PLAN.md`.

## Test kuralları

- Fixture'lar `__tests__/` DIŞINDA, `__fixtures__/` altında tutulur.
- Jest global'leri `@jest/globals`'tan import edilir.
- Hesaplayıcı sabitleri Swift kaynağından birebir taşınmıştır; testler bu pariteyi kilitler.

## Bilinen parite notları

- **`trunk` rotası** RankedCarsScreen'e gider (iOS `AppShellView` paritesi). `screens/content`'teki `TrunkScreen` iOS'taki kullanılmayan `TrunkVolumeView`'un karşılığıdır ve bilinçli olarak bağlanmamıştır.
- **LegalPage** (hakkında/gizlilik/çerez/koşullar): API katmanında WP `wp/v2/pages` metodu olmadığından gömülü fallback içerik gösterir.
- **AdSlot** adsense modu iOS ile aynı şekilde boş render eder (adsbygoogle script'i enjekte edilmez).
- **Google ile giriş** WebView + Google Identity Services akışıyla çalışır (native SDK yok); `googleClientId` site ayarlarından gelmezse buton gösterilmez. GSI'nin üçüncü taraf çerez davranışına bağlı olduğundan kırılgandır — ileride `@react-native-google-signin`'e geçiş düşünülebilir.
- **Push token** iOS'taki gibi ham cihaz token'ı olarak `campaigns/device` endpoint'ine yüklenir.
- `normalizeSlug` iki kopyadır (`shell/urls.ts` + `account/accountSlug.ts`) — `utils/`'a terfi adayı.
