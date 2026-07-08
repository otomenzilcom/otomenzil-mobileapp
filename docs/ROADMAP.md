# OtoMenzil Mobile — React Native Rewrite Roadmap

Kaynak: `otomenzil-ios` (SwiftUI, ~22.000 satır, WebView'sız native WordPress istemcisi).
Hedef: `otomenzil-mobileapp` — Expo (React Native) + TypeScript ile birebir yeniden yazım; iOS **ve** Android desteği.

## 1. Uygulama özeti

OtoMenzil, `https://www.otomenzil.com` WordPress sitesinin (`/wp-json/otomenzil/v1/` REST API + `admin-ajax.php` fallback) native istemcisidir:

- **Katalog**: elektrikli araç listesi, gelişmiş arama/filtreleme, marka sayfaları, sıralı listeler (en iyiler, en uzun menzil, en düşük tüketim, bagaj hacmi), araç detayı (fiyat paneli, teknik özellikler, mühendislik laboratuvarı simülasyonu, benzer araçlar, ilgili bloglar).
- **Karşılaştırma**: 3 araca kadar karşılaştırma sepeti + karşılaştırma tablosu + karşılaştırma yorumları.
- **Robotlar (hesaplayıcılar)**: MTV (2026 EV tarifeleri), ÖTV muafiyeti, taşıt kredisi (BDDK limitleri), tüketim/şarj maliyeti, bagaj hacmi.
- **Şarj istasyonları**: 12.667 istasyonluk EPDK seed verisi (8 MB, bundle içi) + sunucu tazelemesi, konuma göre en yakın istasyonlar, il/ilçe filtreleme.
- **Blog**: arşiv (kategori/arama/gündem şeridi/manşet karuseli), detay (HTML render, içindekiler, beğeni, yorumlar).
- **Hesap**: WordPress auth (e-posta + Google), kullanıcı adı/garaj onboarding'i, favoriler, garaj (birincil araç, şarj hesaplayıcı, yakın istasyonlar), profil, ayarlar (koyu mod dahil), iletişim, yasal sayfalar.
- **Etkileşim**: araç puanlama/yorumları, blog beğeni/yorumları, kampanya popup'ları, push bildirimleri.

Detaylı analiz: `docs/analysis/01-data-layer.md`, `02-main-screens.md`, `03-tools-account-shell.md`, `04-components-utils-theme.md`.

## 2. Teknoloji seçimleri (araçlar)

| Alan | iOS (mevcut) | React Native (seçim) | Gerekçe |
|---|---|---|---|
| Çatı | SwiftUI / Xcode | **Expo SDK 57** (RN 0.86, React 19, TypeScript strict) | CNG/prebuild ile native yapılandırma; EAS ile build/dağıtım; en güncel RN sürümü |
| Durum yönetimi | `@Observable` store'lar | **zustand 5** | iOS store mimarisinin (AppNavigationStore/AuthStore/...) birebir karşılığı; minimal boilerplate |
| Navigasyon | Store-driven shell (enum `currentView` + overlay) | **Store-driven shell (birebir port)** + Android `BackHandler` | Kaynak uygulama push-navigation kullanmıyor; aynı mimari korunarak birebir davranış ve minimum risk |
| Kalıcılık | UserDefaults | **AsyncStorage** (aynı anahtar adları) | iOS Keychain kullanmıyor; anahtar isimleri korunarak port kolaylığı |
| Görseller | Custom `CachedAsyncImage` | **expo-image** (memory+disk cache) | Yerleşik cache politikası aynı işi görür |
| HTML içerik | WKWebView + CSS şablonu + yükseklik köprüsü | **react-native-webview** (aynı CSS şablonu + `postMessage` yükseklik köprüsü) | Birebir görsel sadakat; WP içeriği keyfi HTML içerebilir |
| Google Sign-In | WKWebView + GSI web script (`accounts.google.com/gsi/client`) | **WebView + GSI web akışı (birebir port)** | Backend `POST auth/google {credential}` JWT doğruluyor; native SDK/konfig gerektirmez |
| Push | APNs (ham hex token → `campaigns/device`) | **expo-notifications** `getDevicePushTokenAsync()` | Backend ham cihaz token'ı bekliyor; Expo push token DEĞİL |
| Konum | CoreLocation (tek atım, 15 sn timeout) | **expo-location** | Aynı akış: whenInUse izin + tek konum + Türkiye bbox kontrolü |
| Font | Outfit (tek TTF, sentetik ağırlık) | **@expo-google-fonts/outfit** (400/500/600/700) | RN sentetik ağırlık desteklemez; gerçek ağırlıklar gerekir |
| İkonlar | SF Symbols | **@expo/vector-icons (Ionicons)** | SF Symbols Android'de yok; en yakın eşleme |
| Gradyanlar | SwiftUI LinearGradient | **expo-linear-gradient** | Birebir karşılık |
| Test | — | **jest-expo** (hesaplayıcı/motor birim testleri) | İş mantığı formülleri (MTV/ÖTV/kredi/şarj) regresyona karşı korunur |
| Lint/tip | — | **eslint-config-expo + tsc strict** | CI kalite kapısı |

## 3. Mimari

```
src/
  config.ts              # AppConfig (siteBaseURL, apiBaseURL)
  theme/                 # renk token'ları (light/dark), tipografi, ThemeContext
  models/                # tüm API modelleri (exact JSON keys), decode yardımcıları
  api/                   # APIClient (REST + admin-ajax fallback), EngagementAPI, push servisi
  stores/                # zustand: navigation, auth, preferences, campaigns + bootstrapCache
  utils/                 # hesaplayıcılar ve motorlar (1:1 port) + testler
  components/            # paylaşılan UI bileşenleri (~25)
  screens/               # ekranlar (home, search, detail, compare, blog, tools, account, auth)
  shell/                 # AppShell, navbar, drawer, bottom tabs, overlay'ler
assets/
  data/                  # epdk-stations-seed.json (lazy), turkiye-districts.json
  fonts/                 # Outfit-Regular.ttf (yedek)
```

Navigasyon iOS'taki gibi: `navigationStore.currentView` (20 ekran kimliği) + `overlay` (araç/blog detayı) + modal bayrakları (arama, karşılaştırma paneli, auth, onboarding, drawer). Android geri tuşu: overlay → modal → drawer → home sırasıyla kapatır.

## 4. Fazlar

| Faz | İçerik | Çıktı |
|---|---|---|
| 0 | Analiz (4 paralel agent) + iskelet | `docs/analysis/*`, Expo projesi, bağımlılıklar |
| 1 | Temel katman | config, tema, tipografi, tüm modeller, App.tsx font/splash |
| 2a | İş mantığı | 16 util/hesaplayıcı 1:1 port + jest testleri |
| 2b | Veri katmanı | APIClient (nonce, REST→ajax fallback'leri), EngagementAPI, push servisi |
| 3 | Store'lar + Shell | 4 zustand store, bootstrap cache, navbar/drawer/tab bar/overlay kabuğu |
| 4 | Paylaşılan bileşenler | kartlar, fiyat panelleri, HTML görüntüleyici, engagement, reklam alanları, toast... |
| 5 | Ekranlar (4 paralel agent) | katalog, detay/karşılaştırma/istasyonlar, blog+robotlar, hesap+auth |
| 6 | Entegrasyon + doğrulama | tsc + eslint + jest + `expo export` temiz |
| 7 | Teslim | README, commit, push (`main`) |

## 5. Bilinen sadakat kararları

- iOS'taki **ölü kod** (`Models.swift` — Xcode target dışı) port edilmedi.
- iOS'taki tuhaflıklar korunur ("newest" sıralaması popular ile aynı, `batteryUsable ×0.93` ölü dalı vb.) — davranış birebir.
- Oturum: bearer token + WordPress cookie'leri. RN'de cookie'ler native HTTP yığını tarafından yönetilir (`fetch` varsayılan cookie jar); token AsyncStorage'da.
- Tüm kullanıcı metinleri Türkçe ve kaynaktaki ile birebir aynı.
