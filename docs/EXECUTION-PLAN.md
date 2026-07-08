# Execution Plan — RN Rewrite

Bağımlılık grafiği ve iş dağılımı. Her madde bir agent'ın sahip olduğu dosya kümesidir; paralel agent'lar asla aynı dosyaya yazmaz.

## Wave 1 — Foundation (tek agent)

**Girdi**: `docs/analysis/01-data-layer.md`, `04-components-utils-theme.md`
**Dosyalar**:
- `src/config.ts` — siteBaseURL, apiBaseURL, User-Agent/Referer sabitleri
- `src/theme/tokens.ts` — tüm renk token'ları light+dark (stone skalası dark'ta ters döner), radius/shadow sabitleri
- `src/theme/typography.ts` — Outfit type scale, `webFont(size, weight)` karşılığı
- `src/theme/index.ts` — `useTheme()` hook'u (preferences store'daki darkMode'a bağlanır — geçici local state ile başlar)
- `src/models/*.ts` — car.ts, home.ts, blog.ts, auth.ts, engagement.ts, adSlots.ts, campaigns.ts, stations.ts, navigation.ts (AppViewID enum + ShellOverlay) — exact JSON keys, esnek bool/sayı decode yardımcıları (`src/models/decode.ts`)
- `App.tsx` — font yükleme (@expo-google-fonts/outfit 400/500/600/700), splash, geçici placeholder shell

**Kapı**: `npm run typecheck` temiz.

## Wave 2 — paralel iki agent

### 2a. Business logic (utils) + testler
**Girdi**: `04-components-utils-theme.md` + Swift kaynakları (sabitler birebir)
**Dosyalar**: `src/utils/` altında: mtvCalculator, otvCalculator, vehicleLoanCalculator, chargingSimulator, garageChargeCalculator, engineeringLabSimulator, carTechSpecBuilder, carSearchEngine, similarCarsEngine, comparisonBuilder, carSummaryBuilder, carPriceFormatter, blogTocExtractor, siteBootstrap (SiteDataEnricher + PopularDuelsBuilder + NavigationDefaults), epdkStationsData (lazy seed yükleme), turkishText (aksana duyarsız fold), userLocationService. Her hesaplayıcı için `__tests__/` altında jest testi.

### 2b. API katmanı
**Girdi**: `01-data-layer.md`
**Dosyalar**: `src/api/client.ts` (nonce yönetimi 900 sn TTL, homepage warm-up, REST→ajax fallback kuralları endpoint-bazında, User-Agent/Referer, http→https normalize), `src/api/engagement.ts`, `src/api/push.ts` (expo-notifications, ham device token → `campaigns/device`), `src/api/ajax.ts` (form-encoded envelope, `"0"` body = invalid nonce).

**Kapı**: typecheck + jest temiz.

## Wave 3 — Store'lar + Shell (tek agent)

**Girdi**: Wave 1-2 çıktıları + `03-tools-account-shell.md`
**Dosyalar**: `src/stores/` (navigationStore, authStore — favoriler/garaj optimistic+rollback, preferencesStore, campaignStore, bootstrapCache), `src/shell/` (AppShell, SiteNavbar, MobileDrawer, BottomTabBar, ProfileMenuPopover, ToolsSubnav, CompareMenuPanel, PageLoadingOverlay, AppBootstrap/AuraLoading, MobileCampaignPopup), Android BackHandler. Ekranlar için `src/screens/registry.tsx` placeholder switch.

**Kapı**: typecheck temiz; uygulama placeholder ekranlarla açılır.

## Wave 4 — Paylaşılan bileşenler (tek agent)

**Girdi**: `04-components-utils-theme.md`
**Dosyalar**: `src/components/`: CachedImage (expo-image sarmalayıcı), HTMLContentView (webview + CSS şablonu + yükseklik köprüsü), ArticleToc, CarCatalogCard, CarSummaryCard, CarCardIdentity, CarPrice, CarDetailPricePanel, CarSpecDeck, BrandLogo, BlogPostCard, DataVerificationBadge, ToastBanner, AdSlot, EngagementViews (puanlama/yorum), WebCommentsSection, WebFilterField, WebArticleTable, EngineeringLabSection, LegalPageLayout, GuestGarageGate, CompareCarModelPicker, ShareSheet (RN Share), WebShellComponents (ortak başlık/etiket parçaları).

**Kapı**: typecheck temiz.

## Wave 5 — Ekranlar (4 paralel agent)

| Agent | Ekranlar | Spec |
|---|---|---|
| 5a Katalog | WebHome, CarSearch (+CarList), Brands, RankedCars, AdvancedSearchModal | 02 |
| 5b Detay | CarDetail, Compare, Stations, GarageHomeSection, SharedViews kalanları | 02 |
| 5c İçerik+Robotlar | BlogArchive, BlogDetail, Mtv, VehicleLoan (+Guide), OtvExemption, Consumption, Trunk, ToolViews | 02+03 |
| 5d Hesap+Auth | Profile, Garage, AccountSettings, Contact, LegalPage, AuthLaunch, AuthModal, GoogleSignIn (webview GSI), UsernameOnboarding, GarageOnboarding | 03 |

Her agent kendi ekran dosyalarının sahibi; `registry.tsx`'e dokunmaz (entegrasyonu Wave 6'da lider yapar).

## Wave 6 — Entegrasyon + doğrulama (lider)

- `registry.tsx` gerçek ekranlara bağlanır, App.tsx finalize edilir.
- `npm run typecheck` + `npm run lint` + `npm test` + `npx expo export --platform ios` temiz olana kadar düzeltme (gerekirse fix agent'ları).

## Wave 7 — Teslim

README.md (kurulum/çalıştırma/mimari), `git add -A && commit && push origin main`.
