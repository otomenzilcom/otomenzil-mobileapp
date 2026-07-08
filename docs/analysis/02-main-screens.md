# 02 — Main Catalog Screens (SwiftUI → React Native Spec)

Source: `/Users/kadirdeniz/code/otomenzil-ios/OtoMenzil/Views/` (+ supporting Components/Utils/Store/Theme referenced by these screens).
All user-visible strings are Turkish and must be copied **exactly** as written below.

---

## 0. Shared building blocks (used by every screen)

### 0.1 Store: `AppNavigationStore` (Observation-based global store)
Fields consumed by the catalog screens:
- `currentView: AppViewID` — enum route ids: `home, search, compare, blog, stations, brands, consumption, trunk, otv, mtv, vehicle-loan, best-cars, longest-range, lowest-consumption, profile, garage, settings, contact, about, privacy, cookies, terms`.
- `overlay: ShellOverlay?` — `.car(slug:)` / `.blog(slug:)`. Car detail is an **overlay pushed above the current tab**, not a nav stack push.
- `homeData: HomeResponse?` — from `GET home` (`api.fetchHome()`): `settings, spotlightCards, featuredCars, featuredCarsTitle, latestBlogs, blogCategories, brandLogos, bodyTypeCounts, popularDuels, filterOptions, brandPriceListUrls`.
- `appSettings: MobileAppSettings?` — from `api.fetchSettings()`; `settings` computed = `appSettings ?? homeData?.settings`.
- `catalogCars: [CarSummary]` — full catalog from `api.fetchCars()`; bootstrapped from `homeData.featuredCars` until the background enrich replaces it. **All client-side filtering/sorting is done against this in-memory array.**
- `brandLogos: [String: String]` — brand → logo URL.
- `compareList: [CarSummary]` — max 3. `isComparing(id)`, `addToCompare` (no-op at 3), `toggleCompare`, `removeFromCompare(id)`, `clearCompare()`.
- `carDetailCache: [String: CarDetail]` — `cachedCarDetail(for:)` / `cacheCarDetail(_:)`.
- `mobileFiltersOpen`, `pendingSearchQuery`, `selectedBrandName`, `blogSearchQuery`, `galleryExpanded`.
- Derived: `spotlightCards` (server or `SiteDataEnricher.buildSpotlightCards`), `bodyTypeCounts` (server or counted from catalog, sorted desc by count), `popularDuels` (server or `PopularDuelsBuilder.build`), `filterOptions` (`homeData?.filterOptions ?? settings?.filterOptions`), `brandPriceListUrls`, `adSlotConfig(for:)`.
- `generalTagline` fallback chain → default **"Türkiye'nin elektrikli araç karşılaştırma platformu"**.
- Navigation actions: `navigate(view)` (sets currentView, clears overlay/drawer), `openBrand(brand)` (sets `selectedBrandName`, navigates `.brands`), `openCarDetail(car/slug)` (sets overlay), `openBlogDetail`, `closeOverlay()`.
- `refreshHome()` — refetch settings + home + cars (pull-to-refresh on home). `refreshCatalog(forceFresh:)` — throttled 300 s.
- `relatedBlogs(for car)` — blogs whose `relatedCarIds` contains car.id, or title/excerpt/tags contains brand or model (lowercased); if <2 matches, first 6 blogs.
- `carSummary(for slug)` — lookup in catalogCars then featuredCars.

### 0.2 `CarSummary` model (all fields optional unless noted)
`id (slug), brand, model, year, priceTL, priceForeign, trAvailable, rangeKm, batteryKwh, powerHp, accelerationSec, chargingMin, maxSpeedKmh, driveType, bodyType, segment, trunkLiters, popularity, rating, ratingVoteCount, dataVerified, images`.
Display helpers: `displayTitle` (= model if it already starts with brand, else "brand model"), `heroImageURL` (first image), `priceDisplay` (TL formatted), `rangeDisplay` "{n} km", `batteryDisplay` "{n} kWh" (1 decimal if fractional), `powerDisplay` "{n} HP", `accelerationDisplay` "%.1f sn", `consumptionDisplay` "%.1f kWh/100km" (= battery/range*100), `chargingDisplay` "{n} dk".

### 0.3 `CarCatalogCardView` — the universal car card (grid + list layouts)
Used on Home featured, Search results, Brands, Similar cars, Compare slots.
- **Grid layout**: image block on top with 4:3 aspect ratio; content below with 16 padding. **List layout**: image left `width: 132, minHeight: 156`, content right with 12 padding.
- Card chrome: `AppTheme.cardBackground`, 1 px `AppTheme.border` stroke, corner radius `AppTheme.cardRadius` (24), shadow black 3% radius 4 y1.
- Image overlays: rating badge top-left **"★ {x.x} Puan"** (white text on `stone900` light / `emerald700 @0.92` dark, radius 8) shown when rating > 0; body-type chip bottom-left (white on `stone900 @0.8`, radius 8); favorite **star** overlay button top-right (`WebFavoriteOverlayButton`, 32×32 circle, amber `#F59E0B` when active, star/star.fill, hidden when `showsFavoriteButton=false`).
- Identity row (`CarCardIdentityView`): brand logo + brand + model (brand tap → `onBrandTap`, model/image tap → `onDetail`); right side **"{year} Model"**.
- Spec deck (`CarSpecDeckView`): 2-column grid on stone50, radius 16, rows `"Menzil:"`, `"Batarya:"`, `"Güç:"`, `"0-100:"` with values or "—".
- Action strip (top hairline separator `borderLight`):
  - Price row: label **"FİYAT"** + `CarPriceView` compact (emerald price; if `trAvailable == false`: chip **"TR'de satışta değil"** + foreign price in stone900).
  - Buttons: **"DETAYLAR"** (stone100 bg, stone800 text, radius 12 = `AppTheme.buttonRadius`) and **"KARŞILAŞTIR"** / **"ÇIKAR"** when comparing (emerald600 bg, white; emerald250 stroke when comparing).
  - Garage button (`WebGarageButton .compact`): heart icon + **"Garaja Ekle"** / **"Garajda"** / guest **"Giriş Yapın"**; active state rose text `#E11D48` on `garageTintBackground`; guest hint line below: **"Garaj özelliği üyelere özel — giriş yapın."** (auto-hides after 2.6 s).
- Busy states: garage/favorite buttons show small spinner and scale 0.94 while `garageBusy`.

### 0.4 `WebFilterField<T>` — labeled dropdown
Uppercased small label (10 heavy, stone450) above a Menu button showing selected label + `chevron.up.chevron.down`; field bg `inputBackground`, radius 16, border stroke. RN: label + custom select (action sheet / bottom-sheet picker).

### 0.5 AppTheme tokens referenced in this doc
- `emerald600 #15803D` (= `emerald`), `emerald500 #16A34A`, `emerald700 #166534`, `emerald400 #34D399`, `emerald950 #022C22`, `emerald250 #A7F3D0`; `emerald50` (light `#ECFDF5`), `emerald100` (light `#D1FAE5`).
- `stone950 #0C0A09` (fixed); stone50…stone900 flip in dark mode (see AppTheme.swift).
- `pageBackground` light `#F4F5F7`, `detailBackground` light `#F8F9FC`, `cardBackground` white, `inputBackground #F8F9FA`, `border #E5E7EB`, `borderLight #F3F4F6`, `elevatedSurface #F1F5F9`.
- `red600 #DC2626`, `sky500 #0EA5E9`, `amber50/#FFFBEB`, `amber200 #FDE68A`, `amber800 #92400E`, `rose500 #F43F5E`.
- Radii: `cardRadius = 24`, `innerRadius = 16`, `buttonRadius = 12`.
- `heroGradient` = linear emerald600 → `#14B8A6` (left→right).
- Typography: **Outfit** custom font everywhere (`.web(size:weight:)`); weights up to `black`. RN: bundle Outfit (Google Fonts), map weight names.

### 0.6 Ad slots
`AdSlotView(slot:config:)` with keys `home_top`, `home_mid`, `search_top`, `detail_top`, `detail_sidebar`; config from `settings.adSlots`. Placed inline in scroll content.

---

## 1. WebHomeView (route `home`)

### Purpose & data
Landing page mirroring the website home. Data: `store.homeData` (hero settings, featuredCars, latestBlogs, popularDuels, spotlightCards, bodyTypeCounts), `store.catalogCars` (brand pool + local filter counts), `store.brandLogos`, `auth` (garage/favorites). Pull-to-refresh → `store.refreshHome()`. No local loading/error UI (shell handles bootstrap); sections simply hide when data empty (`popularDuels`, blogs).

Local state: `selectedBrand="all"`, `selectedBodyType="all"`, `selectedRange=0`, `selectedMaxPrice=6_000_000`.

`matchingCount` = catalogCars filtered by: brand equal (unless "all"), bodyType equal, `rangeKm >= selectedRange` (if >0), and price: applied only when `selectedMaxPrice` in (0, 6M) → exclude cars with `trAvailable != false` and `priceTL > selectedMaxPrice`. `hasActiveFilters` = any of the four changed.

### UI structure (single ScrollView, `pageBackground`)
1. **AdSlot homeTop** (16 h-padding, 8 top).
2. **GarageHomeSection** (see §10). `onOpenGarage` → `store.navigate(.garage)`; `onLogin` → `auth.openAuth(message: "Aracını garajına eklemek için giriş yapın.")`.
3. **Hero section** (bg `heroBackground` = white, bottom 1 px border):
   - Tagline capsule: `store.generalTagline.uppercased()` — 10 black, tracking 1.2, emerald700 on emerald50, capsule with emerald100 stroke.
   - Title line 1: **"Elektrikli Araç"** (28 black, stone900); line 2: `heroTitleSuffix` (28 black with `heroGradient` fill) — `settings.homeHeroTitle`, but if it contains "Karşılaştırma" it renders exactly **"Karşılaştırma"**; default fallback "Karşılaştırma".
   - Subtitle: `settings.homeHeroSubtitle ?? ""` (14 medium stone600).
   - Two 2-column quick-link grids: `navigation.heroQuickLinks` then `navigation.rankedGuides`. Each tile: 32×32 emerald50 rounded icon + uppercase small label (8 black, emerald) + title (10 bold stone900, 2 lines); tap → `store.navigate(AppViewID(item.id))`. Defaults (NavigationDefaults): heroQuickLinks = Vergi/"Elektrikli Araç MTV Hesaplama"(mtv), Mevzuat/"Elektrikli Araçlar ÖTV Muafiyeti"(otv), Finans/"Elektrikli Araç Taşıt Kredisi"(vehicle-loan), Analiz/"Elektrikli Araç Karşılaştırma"(compare), Şarj/"Harita & Tarifeler"(stations); rankedGuides = Rehber/"En İyi Elektrikli Araçlar"(best-cars), Menzil/"En Uzun Menzilli Elektrikli Araçlar"(longest-range), Verim/"En Az Yakan Elektrikli Araçlar"(lowest-consumption), Bagaj/"Bagaj Hacmi En Geniş Elektrikli Araçlar"(trunk).
   - **Spotlight panel** (card, radius 16): header `Label(store.homeData?.featuredCarsTitle ?? "Oto Menzil Şampiyonları", systemImage: trophy.fill)` uppercase + right **"Editör seçkisi"** uppercase. Rows for each `store.spotlightCards`: 52×38 car thumb (radius 8), uppercase `card.label` (9 semibold stone400), `car.displayTitle` (13 bold), right badge `card.badge` tinted by `card.tone` (emerald default; "stone"→stone550, "rose"→#F43F5E, "blue"→#3B82F6, "amber"→#F59E0B; 12% bg), **"İncele →"**; 3 px leading accent bar in tone color; tap → `store.openCarDetail(card.car)`. Client-side defaults if server empty: ("Menzil Şampiyonu", "720 km", emerald, porsche-taycan), ("Milli Gurur — En Popüler", "88.5 kWh", stone, togg-t10x-4more), ("%10 ÖTV Güvenceli", "%10 ÖTV", rose, byd-seal) — badge recomputed from car range/battery when possible.
4. **Search form card** ("akıllı filtreleme"): white card, radius 24, border stroke, **3 px emerald top accent bar**, 16 h-margin / 20 v-margin:
   - Header: slider icon (emerald) + **"AKILLI FİLTRELEME VE ARAMA ROBOTU"** (12 black), hairline below.
   - Four `WebFilterField`s: **"Üretici Marka"** (options: `("all", "Tüm Markalar (Hepsi)")` + sorted brands (union of `filterOptions.brands` + catalog brands, tr-aware sort)), **"Kasa Türü"** (`("all", "Tüm Kasalar (Hepsi)")` + body types), **"Asgari Menzil (WLTP)"** (0 → "Fark Etmez (Tümü)", 400 → "400 km ve üzeri", 500 → "500 km ve üzeri", 600 → "600 km ve üzeri"), **"Maksimum Bütçe"** (6_000_000 → "Sınırsız bütçe", 1_500_000 → "1.500.000 TL'ye kadar", 2_500_000 → "2.500.000 TL'ye kadar", 4_000_000 → "4.000.000 TL'ye kadar").
   - Helper line: with active filters → **"Seçili filtreye uyan {matchingCount} model."** (count in `#DC2626` black weight); otherwise **"Marka, kasa, menzil veya bütçe seçerek katalogda aradığınız aracı daraltın."**
   - CTA button (magnifier icon emerald, white uppercase 12 black text, stone950 bg radius 16): label = active filters ? (matchingCount > 0 ? **"{n} Modeli Listele"** : **"Eşleşen Araç Bulunamadı"**) : **"Araç Kataloğuna Git"**; disabled (stone100 bg) when active filters and 0 matches; tap → `store.navigate(.search)`. **Note: the selected filter values are NOT forwarded to the search screen** — it just navigates.
5. **Brand carousel** (bg stone50, bottom border): heading **"ÜRETİCİ MARKA HAVUZU HIZLI SEÇİM"** (10 black stone400, tracking 1.2, centered); horizontal ScrollView of brand tiles (88 wide, radius 16 card): 44×44 logo (AsyncImage, fallback = 2-letter initials on stone100), brand name (10 black, 2 lines), **"{count} Model"**. Tap → `store.navigate(.brands)` (does not preselect brand).
6. **Vehicle loan banner** (button → `store.navigate(.vehicleLoan)`): gradient stone950 → `#064E3B` → `#115E59` (topLeading→bottomTrailing), radius 32, emerald100 stroke. Capsule label **"BDDK 2026 · Yerli EV"** (icon `function`, text `#A7F3D0`), title **"Elektrikli Araç Taşıt Kredisi"** (24 black white), body **"7,5 milyon TL'ye kadar yerli üretim tam elektrikli araçlarda %70'e varan kredilendirme, 48 aya kadar vade ve nihai faturaya göre anlık taksit hesabı."**, white pill **"Hesapla ve Rehberi Oku →"** (11 black, stone950 text).
7. **Popular duels section** (only if `store.popularDuels` non-empty): dark gradient panel (stone950 → `#1C1917` → `#064E3B`, radius 32). Header: `Label("Sık Karşılaştırılanlar", arrow.left.arrow.right)` (10 black, `#6EE7B7`), title **"En Çok Karşılaştırılan Elektrikli Araç Modelleri"** (22 black white), subtitle **"Menzil, fiyat ve segment verilerine göre öne çıkan elektrikli araç karşılaştırmalarını tek tıkla başlatın."** (12 medium `#D6D3D1`). Each duel card (bg `heroOverlayFill`, radius 24, `heroOverlayStroke`): uppercase `matchReason` capsule (`#6EE7B7`), right **"Karşılaştır →"**; two 72 h car images with a central 36×36 **"VS"** circle (`#F87171` text on stone950, red stroke); `duel.title` (14 black white); two stat boxes labeled **"Menzil"** with **"{n} km"**. Tap anywhere → `store.navigate(.compare)` (duel cars are NOT loaded into compareList). Fallback builder (`PopularDuelsBuilder`): pairs adjacent popularity-sorted cars sharing bodyType, reason **"Aynı kasa tipi"** (or **"Popüler modeller"** fallback), title "{brand1} vs {brand2}", tags cycle: "En Sık Karşılaştırılanlar", "Segment Liderleri", "Popüler Seçim", "Rakip Modeller".
8. **Featured section**: eyebrow **"Popüler Seçimler"** (10 black `#EF4444`, uppercase), title **"Öne Çıkan Elektrikli Araçlar"** (22 black), link **"Tüm Kataloğu İncele →"** (12 bold emerald → `.search`). Then LazyVStack of `CarCatalogCardView` (grid layout) for `homeData.featuredCars`, wired to detail/compare/favorite/garage/brand actions.
9. **AdSlot homeMid**.
10. **Body type section**: centered title **"Gövde Tipine Göre Elektrikli Araç Bul"** (20 black), subtitle **"Kasa tipini seçin, filtrelenmiş arşive geçin"** (13 medium stone500). Adaptive grid (min 108) of `store.bodyTypeCounts`: 40×40 emerald50 icon tile (SUV→car.fill, Sedan→car.side.fill, Hatchback→shippingbox.fill, Crossover→square.stack.3d.up.fill, Tır→truck.box.fill, default car.fill), type name (11 black), count (10 semibold stone400). Tap → `store.navigate(.search)` (again: no filter forwarded); disabled when count == 0.
11. **Blog section** (only if `homeData.latestBlogs` non-empty; top hairline): eyebrow **"Blog & Haber"** (12 black emerald uppercase), title **"Oto Menzil Blog"** (24 black), subtitle **"Elektrikli araç dünyasından güncel haberler, rehberler ve analiz yazıları."**; first 3 blogs via `BlogPostCardView(.list)` → `store.openBlogDetail(blog)`; link **"Tüm Yazıları Gör →"** → `.blog`.

### RN mapping
- ScrollView + RefreshControl; horizontal FlatLists for brand carousel/duels; `LazyVGrid` → simple flex-wrap rows (2 columns) or FlatList numColumns; adaptive body-type grid → flexWrap with minWidth 108.
- Gradients → `expo-linear-gradient`. Capsules → borderRadius 999.

---

## 2. CarSearchView (route `search`) — the catalog

### Purpose & data
Full client-side searchable/filterable/sortable/paginated catalog over `store.catalogCars`. No network of its own (catalog already in store). On appear consumes `store.pendingSearchQuery` (set by AdvancedSearchModal) into the search box and clears it.

Local state: `searchQuery` + `debouncedSearchQuery` (250 ms debounce), `selectedBrand="all"`, `selectedBodyType="all"`, `minPrice=1_000_000` (`CarSearchFilters.defaultPriceFloor`), `maxPrice=6_000_000` (`defaultPriceCeiling`), `minRange=0`, `minBattery=0`, `selectedDrive="all"` (**state exists but has no UI control — always "all"**), `sortBy=.newest`, `layout=.grid`, `currentPage=1`.

### Filtering — `CarSearchFilters.filter` (exact logic)
A car passes iff:
- `brand == "all"` or `car.brand == brand`;
- `bodyType == "all"` or `car.bodyType == bodyType`;
- `minRange == 0` or `car.rangeKm ?? 0 >= minRange`;
- `minBattery == 0` or `car.batteryKwh ?? 0 >= minBattery`;
- `drive == "all"` or `car.driveType` case-insensitively contains drive;
- price: only when `minPrice > 1_000_000 || maxPrice < 6_000_000` AND `car.trAvailable != false` AND `car.priceTL > 0` → require `minPrice <= priceTL <= maxPrice` (cars without TL price / not sold in TR are never excluded by price);
- query: lowercase-trimmed query must be contained in `"{brand} {model} {bodyType} {segment} {displayTitle}"` lowercased.

### Sorting — `CarSortOption` (labels + comparison)
- `newest` → **"Son Eklenen"** — sorted by `popularity` desc (identical to popular).
- `popular` → **"Tavsiye Edilen (Popülarite)"** — `popularity` desc.
- `price_asc` → **"Fiyat: Artan (Ekonomik)"** — `comparablePrice` asc, where `comparablePrice` = `priceTL` if `trAvailable != false && priceTL > 0`, else `Double(rangeKm ?? 0)` (fallback keeps unpriced cars ordered by range).
- `price_desc` → **"Fiyat: Azalan (Premium)"** — comparablePrice desc.
- `range_desc` → **"Menzil (En Yüksek)"** — rangeKm desc.
- `acceleration_asc` → **"Sıfırdan En Hızlı"** — accelerationSec asc (nil → 999).

### Pagination
`pageSize = 15`; `totalPages = ceil(count/15)` min 1; page clamped; prev/next buttons.

### UI structure (ScrollView, pageBackground, spacing 16)
1. **AdSlot searchTop**.
2. **Header**: eyebrow **"ELEKTRİKLİ ARABA KARŞILAŞTIRMA KATALOĞU"** (10 black emerald uppercase); title `settings.carArchiveTitle ?? "Elektrikli Araçlar"` (28 black); subtitle `settings.carArchiveSubtitle ?? "Filtreleyin, karşılaştırın ve teknik detayları inceleyin."`; hairline below.
3. **Search bar** (white card radius 24): magnifier icon, TextField placeholder **"Kelimeye göre hızlı filtreleyin... (örn: Togg, Tesla, Sedan)"** (autocapitalization off), clear ✕ button when non-empty. Any change resets `currentPage = 1`.
4. **Mobile filter bar**: big button [`line.3.horizontal.decrease.circle.fill` emerald + **"FİLTRELERİ GÖSTER"**, white on stone950, radius 16] → `store.mobileFiltersOpen = true`; square 52×52 reset button (`arrow.clockwise`) → `resetFilters()`.
5. **Ranked guides card** (radius 24): **"SIRALAMA REHBERLERİ"** (9 black emerald), **"Elektrikli Araç Karşılaştırma Listeleri"** (16 black), **"En iyi modeller, menzil liderleri ve en verimli araçlar — katalogdan bağımsız güncel sıralama sayfaları."** (11 medium). Chips: **"En İyi"** → `.bestCars`, **"Menzil"** → `.longestRange`, **"Verim"** → `.lowestConsumption`, **"Bagaj"** → `.trunk` (stone50 bg, radius 10, border).
6. **Results toolbar card** (radius 24): summary text — active filters ? **"{n} araç listeleniyor"** : **"Elektrikli araç kataloğu"** (12 bold stone550). Layout toggles: `Label("Grid", square.grid.2x2)` and `Label("Liste", list.bullet)` — active: white on stone950; inactive: stone500 on stone50; radius 10. Sort: Menu button (`arrow.up.arrow.down` icon emerald + current `sortBy.label`, inputBackground, radius 12) listing all six options.
7. **Results**: empty → empty state card; else LazyVStack (spacing 16 grid / 14 list) of `CarCatalogCardView` for `paginatedCars`, layout per toggle. Card wiring: `onDetail → store.openCarDetail(car)`, `onCompare → store.toggleCompare(car)`, `onToggleFavorite → auth.toggleFavorite(id)`, `onToggleGarage → auth.toggleGarageCar(id, store:)`, `onBrandTap → store.navigate(.brands)`.
8. **Pagination card** (only if totalPages > 1, radius 16): `Label("Önceki", chevron.left)` disabled at 1 — **"Sayfa {cur} / {total}"** (12 black) — `Label("Sonraki", chevron.right)` disabled at end.
9. **Empty state** (card radius 24, centered): `xmark.circle.fill` 32 pt `#F43F5E`; **"Aradığınız Araç Bulunamadı"** (14 black uppercase); **"Belirttiğiniz filtre kurallarına uyan model bulunamadı. Filtrelerinizi gevşeterek yeniden deneyin."**; button **"ARAMAYI SIFIRLA"** (white on stone950, radius 16) → `resetFilters()`.

### Filter drawer (overlay when `store.mobileFiltersOpen`)
Full-screen ZStack: black 60% scrim (tap closes) + **left-anchored 310-wide panel** (cardBackground) containing ScrollView:
- Header `Label("Arama Filtreleri", slider.horizontal.3)` (12 black) + button **"✕ Kapat"** (11 black); hairline.
- `WebFilterField` **"Üretici Marka"** (`"all"` → "Tüm Markalar (Hepsi)" + brands from catalog), **"Gövde Tipi"** (`"all"` → "Tüm Kasalar (Hepsi)" + body types).
- Slider row **"ASGARİ MENZİL (WLTP)"** with value **"{minRange} km +"** (emerald), range 0…600 step 25, emerald tint.
- Slider row **"MİNİMUM BATARYA"** with value **"{n} kWh"**, range 0…100 step 5.
- `WebFilterField` **"Maksimum Bütçe"** — same 4 options as home (6M "Sınırsız bütçe", 1.5M/2.5M/4M "…TL'ye kadar"). (Note: `minPrice` has no UI; only maxPrice select.)
- Apply button (white on stone950, radius 16): active filters ? **"{filteredCount} MODELİ GÖSTER"** : **"KATALOĞU GÖSTER"** — closes drawer, resets page to 1. Filters apply live (no separate apply step needed).

`resetFilters()` restores every field incl. `sortBy=.newest`, page 1.

### RN mapping
- Debounce with `useEffect` + setTimeout 250 ms.
- Drawer → `react-native-reanimated` slide-in panel or `Modal` with left sheet; scrim Pressable.
- `Menu` sort → ActionSheet / dropdown; `Slider` → `@react-native-community/slider`.
- Since filtering is synchronous over an in-memory array, memoize with `useMemo` keyed on filter state.

---

## 3. CarListView (legacy/standalone list — NOT wired into the web-shell tabs)

Simple self-fetching list used with a NavigationStack (`NavigationLink(value: car)`), likely a leftover/dev screen; port only if a plain list is needed.
- **Data**: local `APIClient().fetchCars()` on `.task` and `.refreshable`; states: `isLoading` (only when cars empty), `errorMessage`, `loadingMessage`.
- **Loading**: `PageLoadingOverlay(message: "Araçlar yükleniyor…")` overlay while first load.
- **Error** (only when cars empty and not loading): `ErrorStateView` — message + button **"Tekrar dene"** (borderedProminent, emerald tint).
- **List**: LazyVStack (spacing 14, padding 16) of `CarCatalogCardView(car:, layout: .list)` inside NavigationLink.
- **Search**: native `.searchable` prompt **"Marka veya model ara"**; filter = displayTitle or brand lowercased contains query.
- RN: FlatList + header search; native stack navigation to detail.

---

## 4. CarDetailView (overlay `.car(slug:)`)

### Purpose & data
Full car detail. Load strategy (`load()`), in order: (1) seed `car` from `store.carSummary(for: slug)` converted via `CarDetail(summary:)` (instant paint), (2) overwrite from `store.cachedCarDetail(for: slug)` if present, (3) `api.fetchCar(slug:)` → replace + `store.cacheCarDetail`. Errors only shown if nothing to display (`ErrorStateView` with retry). Also fires `api.trackCarView(carId:nonce:)` when an auth nonce exists. `task(id: slug)` re-runs on slug change (overlay can swap car in place — resets image index, color index, gallery state).

Local state: `activeImageIndex`, `selectedColorIndex`, `expandedSpecGroups` (defaults: `"Menzil Tahminleri (İklimsel & Parkur)"`, `"Performans Verileri"`), `galleryExpanded`, `showShareSheet`, `showReportSheet`, `showPDFSheet`, `toastMessage`.

### UI structure (ScrollView, `detailBackground`)
1. **ShellBackBar(title: "Geri")** → `store.closeOverlay()`.
2. **Header card** (radius `innerRadius` 16): brand logo 44 (tap → `store.openBrand`), uppercase brand (10 black emerald), `displayTitle` (22 black), **"{year} · {bodyType}"** (dashes "—" when nil) — whole identity block also taps to brand. Badge row: bodyType uppercased + **"{rating}/5 ({n} oylama)"** (format `%.1f/5 (%d oylama)`; stone50 chip radius 8). Buttons column: `ShareMetaPillButton("PAYLAŞ", square.and.arrow.up)` → share sheet; **"BİLDİR"** (flag.fill, `#92400E` text on amber50, amber200 stroke, radius 10) → report sheet; `DataVerificationBadgeView(verified: car.dataVerified == true, compact: true)`.
3. **AdSlot detailTop**.
4. **Gallery**: paged `TabView` of `car.galleryURLs`, height 280, radius `cardRadius` 24, tap → fullscreen. Overlay chevron circles (36, black 55%) prev/next when >1 image; top-left counter chip **"Görsel {i} / {n}"** (black 70% bg, radius 10); top-right `Label("Büyüt", arrow.up.left.and.arrow.down.right)` chip (galleryControlBackground). Thumbnail strip (72×56, radius 10) with emerald 2 px stroke on active, tap selects.
5. **CarDetailPricePanel** (radius 24 card, 2 px stroke — emerald500 @35% when sold in TR, else border; 5 px leading accent bar emerald500/stone300):
   - Header: **"TAVSİYE EDİLEN ANAHTAR TESLİM FİYATI"**; optional link chip **"YETKİLİ SATICI FİYAT LİSTESİ"** + arrow (opens `store.brandPriceListUrls[brand]` externally).
   - Price: `CarPriceView(.detail)` (28 black emerald); if sold in TR and priceTL>0, chip **"KDV & ÖTV Dahil"**; if not sold in TR: chip **"TR'de satışta değil"**, foreign price, caption **"Yurt dışı liste fiyatı"**.
   - Compare: not comparing → button `arrow.left.arrow.right` + **"ARACI KARŞILAŞTIRMAYA EKLE"** (emerald600). Comparing → static bar **"✓ KARŞILAŞTIRMA LİSTESİNDE"** (inverse button colors, green dot) + button **"KARŞILAŞTIRMA EKRANINI AÇ →"** (emerald600) → `store.navigate(.compare)`.
   - Garage: heart + **"GARAJA EKLE"** / heart.fill + **"GARAJIMDAN ÇIKAR"** (rose tint states).
   - PDF: printer.fill + **"KATALOGU PDF İNDİR / SAKLA"** (emerald50 bg, emerald250 stroke) → share sheet with text `"{displayTitle} — Oto Menzil Kataloğu"` + web URL `{site}/arac/{id}/`.
   - Footnote: **"* Bu aracı listenize ekleyerek diğer 2 elektrikli araçla teknik, batarya ömrü, kış menzili ve motor verilerini yan yana karşılaştırabilirsiniz (Maks 3 Araç)."**
6. **CarDetailMetricsGrid** — 2×2 metric cards: **"RESMİ MENZİL"** ({n} km, flame.fill, emerald), **"NET BATARYA"** (kWh, battery.100.bolt, sky), **"MOTOR GÜCÜ"** ({n} HP, bolt.fill, amber), **"HIZLI ŞARJ HIZI"** ({n} dk, slider.horizontal.3, purple `#A855F7` on `#FAF5FF`); values "—" when nil.
7. **CarRatingVoteBar** — star vote widget (avg `car.rating`, count `ratingVoteCount`, strings incl. "/5", "{n} Oylama"), posts with auth nonce.
8. **CarSummaryCardView(description:)** — editorial description card (header "Model açıklaması ve editoryal özet").
9. **EngineeringLabSection** — range estimator: **"MENZİL TAHMİNİ"**, **"Gerçek Sürüş Menzili"**, disclaimer **"WLTP menzil ve tüketim verilerine dayalı tahmindir; sıcaklık ve güzergah seçimine göre sonuç değişir. Resmi test değeri değildir."**, controls **"YILLIK SEZONEL SICAKLIK DEĞERİ"**, **"YOL GÜZERGAH PROFİLİ"** (uses `CarTechSpecBuilder.labNumericValue` multipliers).
10. **CarSpecDeckView** (same 4-line deck as cards).
11. **ChargingSimulatorSection** — **"BATARYA & DOLUM LABORATUVARI"**, **"Şarj Dolum ve Süre Tahmin Simülatörü"**, "{battery kWh} batarya için tahmini dolum süresi.", connector buttons "{type} {kW} kW", result **"Tahmini süre"**, "Etkin güç: {kW} kW · %{start} → %{target}".
12. **Tech specs accordion** (`techSpecsSection`, card radius 16): header **"TEKNİK PARAMETRE TABLOSU"**, **"Tüm Karşılaştırma Parametreleri"**, **"Karşılaştırma sayfası ve WordPress panelindeki teknik parametrelerle aynı {totalFields} alan."** Groups from `CarTechSpecBuilder.groups(for:settings:)` (server `comparisonSpecSchema` or default 6 groups): "Menzil Tahminleri (İklimsel & Parkur)" (Şehir İçi - Soğuk Hava / Şehir İçi - Ilıman Hava / Otoyol - Soğuk Hava / Otoyol - Ilıman Hava / Karma - Soğuk Hava / Karma - Ilıman Hava, km), "Performans Verileri" (Hızlanma 0-100 km/s sn, Maksimum Hız km/s, Maksimum Güç, Maksimum Tork Nm), "Batarya Detayları" (Tam Dolu Kapasite kWh, Kullanılabilir Kapasite kWh, Batarya Tipi, Garanti Süresi (Batarya) Yıl), "Şarj - Şebeke (AC)" (AC Şarj Gücü kW, AC Şarj Süresi (%0-%100)), "Şarj - Hızlı Şarj (DC)" (Maksimum DC Şarj Gücü kW, DC Şarj Süresi (%10-%80) dk), "Enerji Tüketimi / Gerçek Tüketim" (Gerçek Ortalama Menzil km, Ortalama Araç Tüketimi Wh/km). Each group row: **"{name} ({count})"** with rotating chevron; expanded rows label/value with "—" fallback. Auto-derived values: city mild = range×1.08, hwy mild ×0.82, cold ×0.78, hwy cold ×0.68, avgCons = battery/range×100, acPower 11 kW, acTime = battery/11 "saat", dcMaxPower 150, dcAvgPower 93, batteryType "Li-ion", seats "5"; booleans → "Evet"/"Hayır".
13. **Colors card** (if `car.colors`): **"LANSMAN BOYA SEÇENEKLERİ"**; 32 px swatch circles (emerald 2 px stroke on selected); **"Seçilen: {colors[i].name}"**.
14. **CarReviewsSection** — user reviews/comments (auth-gated posting via nonce).
15. **Similar cars** (`SimilarCarsEngine.similar(limit: 6)`): section header with 3 px emerald500 accent bar — **"Benzer Elektrikli Seçenekleri"**, **"Alternatif segment veya bütçe dostu elektrikli modeller"**; horizontal ScrollView of `CarCatalogCardView(identityCompact: true)` 280-wide; favorite add shows toast **"Favorilerinize eklendi."** (2.5 s). Scoring: +4 same bodyType, +3 same segment, +1 same driveType, price closeness (≤15%→+3, ≤30%→+2, ≤45%→+1), range closeness (≤12%→+3, ≤25%→+2, ≤40%→+1), −1 same brand, +1 same trAvailable; ties by popularity desc.
16. **Related blogs** (if any): header with 3 px sky500 bar — **"İlgili Haberler"**, **"Bu model ve markayla ilişkili rehber / haber içerikleri"**; horizontal 280-wide `BlogPostCardView(.sidebar)`.
17. **Disclaimer card** (stone50, radius 12): **"Fiyat, menzil ve teknik veriler üretici duyuruları ve bağımsız testlerden derlenmiştir. Nihai değerler donanım paketine göre değişebilir."**

### Sheets / overlays
- `fullScreenCover` gallery: black bg, paged TabView `scaledToFit`, page dots automatic, chevrons, counter chip **"Görsel {i} / {n}"**, ✕ close (white 15% circle). Sets `store.galleryExpanded` for shell chrome hiding.
- Share sheet (`ShareSheet` = UIActivityViewController): text `"{displayTitle} — Oto Menzil"` + `{site}/arac/{id}/`.
- Report sheet (`ReportErrorSheet`): title "Hata Bildir", copy "Veri hatası veya eksik bilgi mi fark ettiniz? Kısa bir açıklama bırakın.", submit "Bildirimi Gönder"; on success toast **"Bildiriminiz gönderildi — teşekkürler!"** (3 s).
- Toast: `ToastBannerView` pinned top, `.move(.top) + opacity` transition, easeInOut 0.25.

### RN mapping
- Gallery paged TabView → `FlatList` horizontal pagingEnabled or `react-native-reanimated-carousel`; fullscreen → Modal with zoomable image viewer.
- fullScreenCover / sheets → `Modal` / `@gorhom/bottom-sheet`; ShareSheet → `Share.share` / `react-native-share`.
- Accordion: LayoutAnimation or Reanimated height.
- Optimistic seed-from-summary then hydrate pattern maps to React Query `initialData` + cache.

---

## 5. CompareView (route `compare`)

### Purpose & data
Compare up to 3 cars side by side. Data: `store.compareList` (global — badges elsewhere update live), `store.catalogCars` (pickers), local `blogPosts` fetched once via `api.fetchBlogs()` (wizard "Bilgi Akademisi"). No loading/error UI; page has two modes: **wizard** (`compareList.isEmpty`) and **compare** (1+ cars; full analysis at ≥2).

Local state: `onlyDifferences=false`, `emptySearchTerm`, `faqOpenIndex`, `showCompareShare`, `showAddCarPicker`, `scrollTarget`, `toastMessage`.

Computed titles: <2 cars → title **"Elektrikli Araç Karşılaştırma"** subtitle **"En fazla 3 modeli yan yana teknik verilerle inceleyin."**; 2 cars → **"{A} vs {B} Karşılaştırması"**; 3 → joined " vs " + " Karşılaştırması"; subtitle (≥2) = names joined ", " + **" modellerinin menzil, şarj hızı ve teknik özelliklerini yan yana karşılaştırın."**

### Wizard mode (empty list)
1. `WebSectionHeader(badge: "Karşılaştırma", title: "Elektrikli Araç Karşılaştırma", subtitle: "En fazla 3 modeli yan yana teknik verilerle inceleyin.")`.
2. Wizard card 1 — icon `plus`, title **"İlk Aracı Seçin"** (rendered uppercase), subtitle **"Marka, kasa tipi ve model adımlarıyla karşılaştırmaya başlayın"**; contains `CompareCarModelPicker` (3 numbered steps, emerald numbered circles 20px): **"1 MARKA SEÇİN"** placeholder **"Marka seçin..."**; **"2 KASA TİPİ SEÇİN"** placeholder **"Kasa tipi seçin..."** (disabled until brand); **"3 MODEL SEÇİN"** menu **"Model seçin..."** listing `"{model} ({year})"` — selecting calls `store.addToCompare(car)` and resets picker.
3. Wizard card 2 — icon `arrow.left.arrow.right`, title **"Modelleri Süzüp Karşılaştırın"**, subtitle **"Katalogdan araç ismi yazarak hızlıca karşılaştırma tablosuna yansıtın"**; TextField **"Marka veya model ismi yazın..."**; list of first 6 matches (filter: brand OR model lowercased contains term): 32×32 thumb, uppercase brand (emerald600), model, right chip button **"KARŞILAŞTIR"** → `addToCompare`.
4. **Preset packages** — centered **"Hızlı Karşılaştırma Paketleri"** + **"Editörlerimizin derlediği popüler karşılaştırma grupları"**. Cards (radius 24) per `ComparisonBuilder.presets`: emoji icon, uppercase badge chip (emerald50), name, desc, footer **"KARŞILAŞTIRMAYI YÜKLE"** + arrow. Presets: 🇹🇷 "Milli Mücadele: Togg vs Tesla vs BYD" / "Togg T10X, Tesla Model Y ve BYD Seal yan yana." / ids [togg-t10x, tesla-model-y, byd-seal] / badge "Popüler Paket"; ⚡ "800-Volt Premium Süper Şarj Devleri" / "Taycan, Kia EV6 ve Ioniq 5 karşılaştırması." / [porsche-taycan, kia-ev6, hyundai-ioniq-5] / "Mühendislik Lideri"; 💰 "Fiyat-Performans Elektrikliler" / "Ulaşılabilir fiyatlı modeller." / [mg-mg4, togg-t10x, byd-seal] / "Bütçe Dostu". `applyPreset` = clearCompare + add each id found in catalog.
5. **Bilgi Akademisi** (if blogs loaded): icon `book.fill`, **"BİLGİ AKADEMİSİ"** (10 black emerald600), **"Karşılaştırmadan Önce Okumanız Gerekenler"**, right link **"TÜM REHBERLER"** → `.blog`; first 3 blogs as sidebar cards → `openBlogDetail`.
6. **FAQ wizard card** — icon `questionmark.circle`, title **"Sıkça Sorulan Sorular"**, subtitle **"S.S.S."**; accordion (single-open, chevron up/down) over `ComparisonBuilder.faqItems`:
   - "En fazla kaç aracı karşılaştırabilirim?" → "Karşılaştırma robotu aynı anda en fazla 3 modeli yan yana analiz eder."
   - "WLTP menzil değerleri gerçek hayatta geçerli mi?" → "WLTP laboratuvar referansıdır; sıcaklık ve sürüş profili gerçek menzili değiştirir."
   - "LFP ve NMC batarya farkı nedir?" → "LFP uzun ömür sunar; NMC enerji yoğunluğu ve soğuk hava performansı avantajlıdır."
   - "👑 LİDER rozeti nasıl belirlenir?" → "Her parametrede en iyi sayısal değer otomatik işaretlenir."

### Compare mode (≥1 car)
1. Header (`id: "compare-top"`, ≥2 cars): **"MÜHENDİSLİK ANALİZ MERKEZİ"** (10 black red600), dynamic title (22 black), subtitle (12 medium stone500).
2. **Slot pickers** — horizontal ScrollView of 3 slots (280 wide): filled → `CarCatalogCardView(identityCompact: true, showsFavoriteButton: false, isComparing: true)` with red trash circle button (28, `red600`) top-right → `removeFromCompare`; card's compare button acts as remove. Empty slot → dashed-border (dash [6]) stone50 tile minHeight 420: `plus` 24, **"Araç Ekle"**, **"Marka · kasa · model"** → opens Add sheet.
3. **Action bar** (≥2, horizontal chip scroll; each chip = icon+label, radius 12, card bg):
   - **"Karşılaştırma Yorumu Yap"** (`bubble.left.and.bubble.right.fill`, emerald600) → scrolls to comments (`scrollTarget = "compare-comments-section"`).
   - **"Linki Paylaş"** (ShareMetaPillButton) → iOS share sheet with compare URL.
   - **"Linki Kopyala"** (`doc.on.doc`) → clipboard + toast **"Karşılaştırma linki panoya kopyalandı."** (2.5 s).
   - **"PDF Özet (Web)"** (`doc.fill`) → opens compare URL in external browser.
   - **"Listeyi Boşalt"** (`trash.fill`, red600) → `clearCompare()`.
   - Share URL: `{site}/karsilastirma/{sorted-ids joined "-vs-"}/` (ids deduped+sorted via `canonicalCompareIds`); nil unless ≥2 ids.
4. **Leader widgets** (≥2; card radius 24): `Label("Analiz Raporu & Lider Ödülleri", sparkles)`; horizontal cards 150 wide (radius 14): **"Maliyet Lideri"** (`turkishlirasign.circle.fill`, emerald50 bg) = min priceTL (nil → ∞) + priceDisplay; **"Menzil Lideri"** (`road.lanes`, `#EFF6FF`) = max rangeKm + "{n} km"; **"Performans Lideri"** (`bolt.fill`, `#FFF7ED`) = max powerHp + "{n} HP".
5. **Toggle**: `Toggle("Yalnızca Farkları Göster")` emerald600 tint — filters both tables to rows where the cars' values differ.
6. **"KRİTİK KARŞILAŞTIRMA ÖZETİ"** table — rows `ComparisonBuilder.criticalRows` (label / keyPath / lowerIsBetter): Fiyat (priceDisplay, lower), Menzil (rangeDisplay), Tüketim (consumptionDisplay, lower), Batarya (batteryDisplay), Güç (powerDisplay), DC Süre (chargingDisplay, lower), 0-100 (accelerationDisplay, lower).
7. **"TEKNİK MATRİS"** table — criticalRows + Kasa (bodyType), Çekiş (driveType), Segment (segment).
   - Table body (radius 20 stroke): each row = uppercase label (84 wide) + one centered value column per car; missing → "—". Leader cell rendered **"👑 {value}"** in emerald700. Leader logic (`ComparisonBuilder.leader`): parse numeric from display strings (strip "." thousands, "," → "."), need ≥2 parseable values, best by min/max per `lowerIsBetter`, no ties. When onlyDifferences filters out all rows → **"Tüm değerler aynı."**
8. **FAQ section** (card): **"SIK SORULAN"** (10 black emerald600) + the same 4 Q/A pairs rendered statically.
9. **CompareCommentsSection** (≥2 cars; `id: "compare-comments-section"`): comment thread keyed by canonical car ids, auth nonce required to post.

### Interactions & effects
- `onChange(compareList.count)`: when count reaches ≥2 → animated `scrollTo("compare-top")` (ScrollViewReader).
- Add sheet: NavigationStack + `CompareCarModelPicker` (excludeIds = current list), nav title **"Araç Ekle"**, toolbar **"Kapat"**, detents `[.medium, .large]`.
- Toast overlay top, easeInOut 0.25.

### RN mapping
- ScrollViewReader/scrollTo → `ScrollView` ref + `scrollTo`/`measureLayout` (store y-offsets of anchors).
- Detented sheet → `@gorhom/bottom-sheet` snap points 50%/90%.
- Clipboard → `expo-clipboard`; open external → `Linking.openURL`.
- KeyPath-driven rows → array of `{label, selector: (car) => string|null, lowerIsBetter}`.

---

## 6. RankedCarsView (routes `best-cars`, `longest-range`, `lowest-consumption`, `trunk`)

### Purpose & data
One component, 4 modes; fully client-side over `store.catalogCars`. Local state: `visibleCount=10`, `trFilter="all"`, `priceFilter="all"`.

### Mode configs (badge / title / description / gradient / metricLabel / secondaryLabel / icon)
- **bestCars**: "Editör & Kullanıcı Puanı" / **"En İyi Elektrikli Araçlar"** / "Kullanıcı puanı, editör değerlendirmesi ve platform popülerliğine göre sıralanan en iyi elektrikli modeller." / [#D97706, #EA580C, stone950] / "Genel Puan" / "Menzil" / trophy.fill.
- **longestRange**: "WLTP Menzil Sıralaması" / **"En Uzun Menzilli Elektrikli Araçlar"** / "WLTP menzil değerine göre en uzun yol kat edebilen elektrikli araçlar." / [emerald600, #0D9488, stone950] / "WLTP Menzil" / "Batarya" / battery.100.bolt.
- **lowestConsumption**: "Enerji Verimliliği" / **"En Az Yakan Elektrikli Araçlar"** / "Batarya kapasitesi ve menzile göre hesaplanan ortalama tüketim (kWh/100 km) en düşük modeller." / [#0284C7, #2563EB, stone950] / "Ort. Tüketim" / "Menzil" / gauge.with.dots.needle.67percent.
- **trunk**: "Bagaj Hacmi Sıralaması" / **"Bagaj Hacmi En Geniş Elektrikli Araçlar"** / "Katalog verilerine göre bagaj hacmi (litre) en yüksek elektrikli modeller. Aile kullanımı, yük taşıma ve frunk avantajı için güncel sıralama." / [#7C3AED, #9333EA, stone950] / "Bagaj Hacmi" / "Gövde" / square.stack.3d.up.fill.

### Ranking logic
- Pre-filters: `trFilter` — "tr" excludes `trAvailable == false`; "foreign" keeps only `trAvailable == false`. `priceFilter` — "known" requires `priceTL > 0`; "unknown" requires no price. lowestConsumption additionally drops cars where consumption is unknown (sentinel 999); trunk drops `trunkLiters <= 0`.
- `consumption(car)` = `(batteryKwh / rangeKm) * 100` (999 if missing/zero range).
- `metricValue`: bestCars → `(rating ?? 0) * 2 + popularity ?? 0`; longestRange → rangeKm; lowestConsumption → consumption; trunk → trunkLiters.
- Sort: ascending for lowestConsumption, descending otherwise.
- `primaryMetric` display: bestCars "%.1f ★" (rating), longestRange "{n} km", lowestConsumption "%.1f kWh/100km", trunk "{n} L". `secondaryMetric`: bestCars "{range} km"; longestRange battery kWh (int or 1-dec, "—"); lowestConsumption "{range} km"; trunk bodyType/"—".
- Progress bar percent (`barPercent`): metric / maxMetric (first item); **lowestConsumption uses `max(0.08, maxMetric / value)`** (bug-compatible inverse ratio; min 8%); min bar width 8.

### UI structure (ScrollView, padding 16)
1. **Hero**: rounded 24 gradient (per mode, topLeading→bottomTrailing): `Label(badge.uppercased(), icon)` white 90%, title 24 black white, description 13 medium white 90%, footer **"{n} model · Güncel katalog verisi"** white 70%.
2. **Filter bar** (card radius 16): two chip rows — **"SATIŞ"**: ("all","Hepsi"), ("tr","TR'de Satışta"), ("foreign","TR'de Satışta Değil"); **"FİYAT"**: ("all","Hepsi"), ("known","Fiyatlı"), ("unknown","Fiyatsız"). Chips uppercase, active = white on stone950, capsule.
3. **Podium** (if ≥3 results): `Label("İLK 3", star.fill)` amber `#F59E0B`; horizontal cards 244 wide (radius 20): image 220×130 radius 16 with **"#{rank}"** badge (rank 1: `#92400E` on `#FBBF24`; else stone800 on stone300), title 13 black 2-line, two `metricBox`es (metricLabel emerald style: emerald50 bg/emerald100 stroke/emerald700 value; secondary stone), buttons **"DETAY"** (stone100) → `openCarDetail` and **"KARŞILAŞTIR"** (white on stone950) → `toggleCompare`.
4. **"TAM SIRALAMA"** card: header `Label("TAM SIRALAMA", sparkles)` + right "{n} model" on stone50 80% with bottom border; rows (tap → detail): **"#{index}"** (13 black emerald600, width 32), 72×52 image radius 12, title 1-line, `primaryMetric` (emerald700) + `secondaryMetric` (stone500), 6-px progress capsule (emerald500 on stone100); `borderLight` separators.
5. **Load more**: if more remain — button **"DAHA FAZLA GÖSTER ({remaining})"** (white on stone950, radius 14) → `visibleCount += 10`.

### RN mapping
GeometryReader progress bar → parent width via `onLayout` or flex-based two-layer bar. Horizontal podium → FlatList horizontal.

---

## 7. BrandsView (route `brands`)

### Purpose & data
A–Z brand browser + per-brand model list, all from `store.catalogCars` / `store.brandLogos`. Local: `selectedBrand`, `activeLetter`.
- `brands` = unique catalog brands, tr-aware sort. `brandLetters` = unique first letters uppercased with `tr_TR` locale (i→İ handling); missing → "#".
- `filteredBrands` = brands filtered by activeLetter. `activeBrand` = selectedBrand if still in filtered list else first filtered/first brand. `brandCars` = catalog where brand == activeBrand.
- On appear: consumes `store.selectedBrandName` preset (set by `openBrand`) then clears it; else defaults to first brand. `onChange(filteredBrands)` re-picks first if selection dropped out.

### UI structure (single ScrollView, padding 16)
1. **Header**: `WebEmeraldBadge("Elektrikli Araç Markaları")` (uppercase emerald capsule) + counter capsule **"{n} MARKA"** (white on stone950); title **"Elektrikli Araç Markaları"** (28 black); subtitle **"Türkiye pazarındaki markaları seçerek modelleri, menzil ortalamalarını ve teknik profilleri karşılaştırın."** (12 semibold stone500).
2. **Letter filter**: row **"MARKALAR ({filtered count})"** + right **"Seçili harf: {X}"** (when active). Horizontal chips: **"Tümü"** (nil letter; active = white on stone950) then letters (active = white on emerald600); radius 10.
3. **Brand list** (vertical, all filtered brands): row = 36 logo + brand name (14 black) + **"{n} model"** + chevron.right; active row inverted (white text on stone950); radius 16. Tap → `selectedBrand = brand`.
4. **Brand detail header** (emerald50 @50% bg, emerald100 stroke, radius 24): 48 logo, brand (20 black), chips (uppercase mini capsules, emerald700 on emerald50): **"{n} Model"**, and if any ranges known **"Ort. {avg} km"** (integer mean of rangeKm).
5. **Model list**: LazyVStack (spacing 14) of `CarCatalogCardView(layout: .list)` for `brandCars`, wired to detail/compare/favorite/garage with per-car busy flags (`auth.busyGarageCarIds/Actions`).

### RN mapping
This is a master-detail on one scroll page (list of brands then cars of the active brand below) — keep as single FlatList with sections, or ScrollView; letter chips horizontal FlatList. Turkish-locale uppercase: `toLocaleUpperCase('tr-TR')`.

---

## 8. AdvancedSearchModalView (global overlay opened from shell header)

### Purpose & data
Quick omnisearch over cars (`store.catalogCars`) and blogs (`store.homeData?.latestBlogs`). Fully local; live results, max 6 each. Props: `onClose`.
State: `query`, `scope: SearchScope (.all/.cars/.blogs)`, autofocus on appear (also resets query + scope).
- Car match: `"{brand} {model} {bodyType} {segment}"` lowercased contains trimmed query; skipped when scope == .blogs.
- Blog match: `"{title} {excerpt} {category} {tags joined}"` lowercased contains query; skipped when scope == .cars.

### UI structure
- Backdrop: stone950 @50% + ultraThinMaterial blur; tap closes. Panel (maxWidth 640, radius 24) top-aligned (48 top padding).
- **Header** (stone50 @80% strip, bottom border): 36×36 emerald50 icon tile (`sparkles`), **"Gelişmiş Arama"** (14 black), **"Araç kataloğu ve haber arşivinde arayın"** (10 medium); ✕ button (36×36 stone50, radius 12).
- **Search field** (stone50, radius 16): magnifier + TextField **"Marka, model, haber başlığı veya konu yazın..."**, submit label `search`, Enter → `submitSearch`.
- **Scope chips**: **"TÜMÜ"**, **"ELEKTRİKLİ ARAÇLAR"**, **"MAKALELER"** (labels uppercased from "Tümü"/"Elektrikli Araçlar"/"Makaleler"); active white on stone950, radius 12.
- **Live results** (only when query non-empty; ScrollView maxHeight 280):
  - Header **"ELEKTRİKLİ ARAÇLAR ({n})"** with `car.fill` → rows: 40×40 thumb radius 10, uppercase brand (9 black stone450), displayTitle (12 bold, 2-line); tap → `onClose()` + `openCarDetail`.
  - Header **"MAKALELER ({n})"** with `book.fill` → rows: blog image, uppercase category (fallback "Blog"), title; tap → `onClose()` + `openBlogDetail`.
  - Both empty → **"Sonuç bulunamadı. Farklı bir anahtar kelime deneyin."** (centered, 24 v-padding).
- **Submit button** (radius 16; disabled/stone100+stone400 when query empty, else stone950+white): label uppercased per scope — all: **"Tüm Sonuçları Gör"**, cars: **"Araç Arşivinde Ara"**, blogs: **"Makale Arşivinde Ara"**.
- `submitSearch`: blogs scope → `store.blogSearchQuery = query; navigate(.blog)`; else → `store.pendingSearchQuery = query; navigate(.search)` (CarSearchView picks it up onAppear).

### RN mapping
Modal + KeyboardAvoidingView; autofocus via ref. Blur → `expo-blur`.

---

## 9. StationsView (route `stations`) — EPDK charging stations

### ❗ Architecture answer: **NO MapKit / no map view.** It is a fully list-based screen; navigation to a station is delegated to external map apps via deep links (Google/Yandex/Apple URLs). Location is used only for sorting/selecting.

### Purpose & data
- **Data source**: `EpdkStationsData` — bundled seed `Resources/epdk-stations-seed.json` (EPDK licensed stations) decoded at launch (`licensedSeed`), optionally replaced by server refresh: `refreshFromServerIfNeeded()` → `GET charging-stations` → cache in-memory (`remoteSeedCache`), filtered to Turkey bounds (lat 35.5–42.5, lng 25.0–45.0) and non-empty city; remote used only if its city count ≤ 81. Official district lists from bundled `turkiye-districts.json` (city → districts). Called from `onAppear` (`reloadStations`) and during shell bootstrap.
- **Station model** (`EPDKStation`): id, epdkId, operatorName/operatorKey, stationName, city, district, lat/lng, address, sockets [{type, powerKw, count, socketNumbers}], hasAc/hasDc/hasHpc, maxPowerKw, serviceType, phone.
- **Operators** (hardcoded fallback list): zes "ZES (Zorlu Energy)", esarj "Eşarj (Enerjisa)", trugo "Trugo (Togg)", astor "Astor Enerji Şarj", voltrun "Voltrun", sharz "Sharz.net" (with hotlines/websites).
- **Location**: `UserLocationService` (CoreLocation) — `coordinate`, `outsideTurkey`, `authorizationDenied`, `request(withFeedback:completion:)` with results success/denied/timeout/outsideTurkey/unavailable.
- **Distance calc**: `CLLocation.distance` (haversine) → km; `formattedDistance` = "<1 km → "%.0f m"", else "%.1f km". RN: implement haversine manually.
- Geo → city/district resolution: nearest of 81 hardcoded province centroids → city; district by weighted vote of 12 nearest stations within 40 km (≤8 km weight 3, ≤20 km 2, else 1), falling back to **Nominatim reverse geocode** (`nominatim.openstreetmap.org/reverse`, `accept-language=tr`, zoom 12, User-Agent "OtoMenzil-iOS/1.0"; reads city_district/town/suburb/county/municipality).

### Local state
`browseMode` (.city **"İl / İlçe"** / .nearby **"Konumum"** — segmented control), `selectedCity`, `selectedDistrict="Tümü"`, `powerFilter="all"`, `operatorFilter="all"`, `search`, `selectedStation`, `page=1` (pageSize 8), calculator: `vehicleId`, `startPercent=20`, `targetPercent=80`, `chargeMode="dc"`; plus loading/toast flags.

### Filtering pipeline
`baseStations` = city mode → `stations(for: selectedCity)`; nearby mode → `stationsNear(lat, lng, limit: 120)` (Turkey-bound, ≤120 km, sorted by distance; empty if no coordinate). Then `filtered` requires ALL:
- search empty OR stationName/address lowercased contains query;
- district: nearby mode always OK; else "Tümü" OR `stationMatchesDistrict` (same city AND (district equal OR diacritic-insensitive tr-lowercased "{district} {stationName} {address}" contains needle));
- operator: "all" or `operatorKey == operatorFilter`;
- power: "ac" → hasAc && !hasDc; "dc" → hasDc && !hasHpc; "hpc" → hasHpc; "all" → any.
`paged` slices by page (8/page).

### UI structure (ScrollViewReader + ScrollView, padding 16)
1. **Hero** (radius 24 gradient emerald700 → `#0F766E` → stone950, height 160): **"EPDK LİSANSLI · {cityCount} İL"** ("…" while loading), **"Şarj İstasyonları Haritası"** (22 black white), subtitle `settings.stationsSyncMessage ?? "Lisanslı soket sayısı ve güç bilgisi EPDK kayıtlarından gelir."`
2. **Stats row** — 3 chips (value 18 black + uppercase label): total station count / **"EPDK"**, `filtered.count` / **"FİLTRELİ"**, operator count / **"OPERATÖR"**.
3. **Location selector card**: label **"İSTASYON ARAMA"**; segmented Picker ["İl / İlçe", "Konumum"].
   - City mode: status label — outsideTurkey → ⚠ **"Konumunuz Türkiye dışında görünüyor. Oto Menzil yalnızca Türkiye sınırları içindeki EPDK istasyonlarını listeler."** (amber800); has coordinate → 📍 **"Konumunuza göre {city|"il"} seçildi."** (emerald700). Two Menu selectors: **"🇹🇷 {city|İl seçin}"** ▼ (all cities) and district ▼ (**"📍 Tüm İlçeler"** + districts; label shows "📍 Tüm İlçeler" when "Tümü"); selector style: elevatedSurface, radius 16.
   - Nearby mode box (stone50, radius 14): status — outsideTurkey → **"Konumunuz Türkiye dışında görünüyor."**; coordinate → **"Konumunuza göre en yakın istasyonlar listeleniyor"** (location.fill, emerald700); denied → **"Konum izni kapalı. Ayarlar → Oto Menzil → Konum iznini açın."** (location.slash, amber800); else **"Konum alınıyor…"**. Link button **"Konumu güncelle"** (10 black emerald700) → `handleGeoUpdate()`.
   - Status strip (stone50, radius 14): emerald dot + (nearby → **"Konuma göre sıralı"**; district "Tümü" → **"Şehir genelinde"**; else **"{district} ilçesinde"**) + **"{n} istasyon"** (emerald700).
   - Footnote: **"Veriler EPDK Şarj@TR kaynağından alınır. Canlı müsaitlik için EPDK veya operatör uygulamasına bakın."**
4. **Filters card**: **"GELİŞMİŞ İSTASYON FİLTRELERİ"**; two dropdown menus side by side — **"GÜÇ SOKET TİPİ"**: ("all","Tümü (AC & DC & HPC)"), ("ac","AC (22kW)"), ("dc","DC (60-120kW)"), ("hpc","HPC (150kW+)"); **"OPERATÖR"**: ("all","Tümü") + operators (first word of name). Search field (stone50, radius 12): **"İlçe, cadde, otel/AVM veya istasyon ara…"**.
5. **Station list** — rows (radius 16; selected: emerald50 bg + emerald250 stroke): operatorName (10 black emerald600), stationName (14 black), **"{district}, {city}"** (11 medium stone500), nearby mode adds distance (10 black emerald700), badges: power label (**"{kw} kW"** from `officialMaxPowerKw` = maxPowerKw or max socket kW, else **"Belirtilmemiş"**) and **"{socketCount} lisanslı soket"** (sum of socket counts); chevron.right. Tap → `selectedStation = station` (+animated scroll to detail anchor). Pager: chevrons + **"Sayfa {page}"**; next disabled when `page*8 >= filtered.count`.
6. **Station detail card** (`id: "station-detail"`, emerald100 stroke): **"İSTASYON DETAYI"**, stationName (18 black), address, **"EPDK Kayıt: {epdkId}"**; socket rows **"{type} · {powerKw} kW"** — **"{count} adet (lisanslı)"** (emerald700). Directions box (stone50, radius 16): **"Yol Tarifi Al"**, **"Harita uygulamanızda doğru adresle navigasyonu açın."**, then external `Link` buttons (badge square + label + arrow.up.right, 2 px border, radius 12): **"Google Maps"** (badge "G", `#4285F4`; `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}`), **"Yandex Navigasyon"** (badge "Y", `#FC3F1D`; `https://yandex.com.tr/maps/?rtext=~{lat},{lng}&rtt=auto`), **"Apple Haritalar"** (badge "", stone800; `https://maps.apple.com/?daddr={lat},{lng}&dirflg=d`).
7. **Charge time calculator card**: **"ŞARJ SÜRESİ TAHMİNİ"** (emerald600); segmented **"AC" / "DC" / "HPC"**; vehicle Menu **"ARAÇ SEÇİN"** — options = user's primary garage car first (battery, `GarageChargeCalculator.estimateDcMaxKw`) + `StationCalculator.vehicles`: "Togg T10X Long Range" (88.5 kWh/180 kW), "Tesla Model Y LR" (75/250), "Hyundai Ioniq 5" (77.4/233), "BYD Atto 3" (60.5/115), "Özel Araç" (65/150). Sliders **"BAŞLANGIÇ"** (0–95, step 5) and **"HEDEF"** (0–100), values "%{n}". Power: ac → 22; hpc → selected station's `effectiveMaxPowerKw` (fallback 180); dc → min(station effective kW (fallback 120), vehicle dcMaxKw). `effectiveMaxPowerKw` infers per-socket kW when 0 (Type 2→22, CHAdeMO→50, CCS→hpc?180:120, else by flags). Result: **"{kwh} kWh"** (energy = battery × Δ%/100, 20 black emerald700) + **"Tahmini süre: {min} dk · Güncel tarife için EPDK/operatör uygulaması"** — minutes = max(10, kWh/power×60).
8. **Alert** (native): title **"Konum güncellendi"** / **"Konum güncellenemedi"**, button **"Tamam"**, messages: **"Konum güncellendi: {city}[ / {district}]"**, **"Konum güncellendi."**, **"Konum izni reddedildi. Ayarlar → Oto Menzil → Konum iznini açın."**, **"Konum isteği zaman aşımına uğradı. Tekrar deneyin."**, **"Konumunuz Türkiye dışında görünüyor. Simülatörde Features → Location ile Türkiye koordinatı seçin."**, fallback **"Konum alınamadı."**.

### Side effects
- onAppear: `applyDefaultVehicle()` (primary garage car), `locationService.request()`, `reloadStations()` (server refresh → `resolveGeoSelection()` auto-picks city+district from coords).
- onChange coordinate → resolveGeoSelection; browseMode → reset page/selection (+re-request location for nearby); city change → district "Tümü", page 1, clear selection; selecting station → animated scroll (0.35 s easeInOut).

### RN mapping
- Location → `expo-location` (permission flows + `Location.getCurrentPositionAsync`); Turkey-bounds + haversine in TS.
- Bundle both JSON seeds as assets; hydrate on start; server refresh mirrors `charging-stations` endpoint.
- Segmented control → `@react-native-segmented-control/segmented-control` or custom chips; Menus → bottom-sheet pickers; alert → `Alert.alert`; external maps → `Linking.openURL`.
- ScrollViewReader anchor scroll → ref + onLayout y capture.

---

## 10. GarageHomeSection (embedded at top of WebHomeView)

### Purpose & data
Home dashboard for the user's garage; mirrors web `GarageHomeDashboard.tsx`. Inputs: `store`, `auth`, `onOpenGarage`, `onLogin`. Branches:
1. Not logged in → **guest**; 2. logged in + empty `auth.garageCarIds` → **empty**; 3. has `auth.primaryGarageCar(from: store)` → **primary widget**; 4. ids exist but summaries not yet resolved → **loading**.
All variants share a dark shell: linear gradient stone950 → stone900 → emerald950 + radial emerald glow top-right (emerald500 @35%, radius 220, opacity 0.3); 1 px bottom border under the section.

### Guest (minHeight 320)
- Badge capsule (sparkles icon, `#A7F3D0` text on emerald500 @10%): **"OTO MENZİL GARAJ"** (uppercased from "Oto Menzil Garaj").
- Title: **"Elektrikli aracınız için menzil, şarj ve garaj merkezi"** (24 black white).
- Body: **"Ücretsiz üyelikle aracınızı garajınıza ekleyin; WLTP menzili, yakın şarj istasyonları ve port bazlı dolum süresini tek panelden takip edin. Katalog, karşılaştırma ve haberler herkese açık."** (12 medium stone300).
- CTA (emerald500 bg, stone950 text, radius 16, icon rectangle.portrait.and.arrow.right): **"Giriş Yap · Aracını Garajına Ekle"** → `onLogin` (auth modal message: "Aracını garajına eklemek için giriş yapın.").
- 2×2 feature cards (white 5% bg + thin material, radius 16; 40×40 emerald icon tile): "Garajına aracını ekle" / "Kullandığınız EV modelini kaydedin; menzil, batarya ve şarj verileri size özel hesaplansın." (car.fill); "Ana aracını belirle" / "Birden fazla aracınız varsa birini ana araç seçin — ana sayfa ve hesaplamalar buna göre açılır." (crown.fill); "Yakın istasyonları gör" / "Konumunuza göre EPDK lisanslı şarj noktaları ve Google · Apple · Yandex yol tarifi." (mappin.and.ellipse); "Katalog ve karşılaştırma" / "Üye olmadan da araçları inceleyebilirsiniz; garaj ise sahip olduğunuz aracı takip etmek içindir." (arrow.left.arrow.right).

### Logged-in empty
- Badge **"GARAJIN BOŞ"**; title **"Aracını garajına ekle, kişisel menzil merkezini aç"**; body **"Katalogdan kullandığın EV modelini seç; WLTP menzili, yakın istasyonlar ve port bazlı şarj süresi hesapları profiline özel çalışsın."**; CTA (car.fill + chevron.right) **"Aracını Garajına Ekle"** → `onOpenGarage`.
- 3-column vertical feature cards: "Araç seç"/"Katalogdan sahip olduğun modeli bul ve garajına ekle." (car.fill); "Ana aracı belirle"/"Birden fazla aracın varsa birini ana araç yap." (crown.fill); "İstasyonları gör"/"Konumuna göre yakın şarj noktalarını aç." (mappin.and.ellipse).

### Loading
Spinner (emerald400) + **"{n} araç garajınızda yükleniyor…"** (12 bold stone300), minHeight 200.

### Primary car widget (whole block is a button → `onOpenGarage`; stone950 bg with 4 px top gradient strip)
- Top row: 112×80 car image (radius 12, white 10% stroke); labels: **"GARAJIM"** (9 black emerald400), if >1 car **"{n} araç"** capsule (white 5%), crown.fill + **"Ana araç"** capsule (`#A7F3D0` on emerald 10%). Brand logo 18 + displayTitle (16 black white). If year/body/drive all present: **"{year} · {body} · {drive}"** (10 medium stone400). Consumption line (9 medium stone500): "{Wh} Wh/km · {eff} km/kWh verim · DC üst sınır {kW} kW" (Wh = battery/range×1000 rounded; eff = range/battery 1-dec; dc from `GarageChargeCalculator.estimateDcMaxKw`).
- 3×2 stat pills (stone950 @60%, white 10% stroke, radius 10; icon emerald400 + uppercase 7 black label + 10 black white value): **"WLTP MENZİL"** "{n} km" / **"BATARYA"** batteryDisplay / **"10-80 DC"** chargingDisplay / **"0-100"** accelerationDisplay / **"BAGAJ"** "{n} L" / **"GÜÇ"** powerDisplay (all "—" fallback).
- Footer bar (emerald 10% bg, radius 12): **"Garaj sayfası"** (`#A7F3D0`) + **"Port bazlı menzil, yakın istasyonlar ve araç yönetimi"** (stone300); right **"Aç"** + chevron (emerald400).

### RN mapping
Radial gradient → `react-native-svg` RadialGradient or an overlay image; ultraThinMaterial → `expo-blur` (or just translucent fill).

---

## 11. SharedViews.swift

- **BlogListView** (standalone legacy list): loading `ProgressView("Haberler yükleniyor…")`; error → ErrorStateView; content LazyVStack of BlogRowView; `.task`/`.refreshable` → `api.fetchBlogs()`.
- **BlogRowView**: 88×88 image (radius 16) + uppercase category (9 black emerald), title (15 black, 3 lines), excerpt (12 medium stone600, 2 lines); card radius `innerRadius` 16.
- **ErrorStateView** (used by CarList/CarDetail/BlogList): centered multiline message (stone600) + button **"Tekrar dene"** (borderedProminent, emerald tint).

---

## 12. Cross-cutting RN port notes

1. **Overlay-based navigation**: car/blog detail are overlays over the current tab (`store.overlay`), not stack pushes; back = `closeOverlay()` with custom "Geri" bar. In RN either mirror with a full-screen Modal layer driven by a zustand/redux store, or map to react-navigation stack screens (recommended) while keeping the single `AppNavigationStore`-equivalent for compare list / pending queries / brand preselect.
2. **In-memory catalog**: every list screen filters `catalogCars` synchronously. Keep one query (React Query) for `fetchCars` and derive with `useMemo`; replicate the 300 s refresh throttle and bootstrap fallback (featuredCars until full catalog arrives).
3. **ScrollViewReader anchors** (CompareView compare-top/comments, StationsView station-detail): capture y via `onLayout` and `scrollTo({y, animated:true})`.
4. **SwiftUI Menu dropdowns** everywhere (sort, WebFilterField, city/district, operator, vehicle) → a shared bottom-sheet/ActionSheet select component.
5. **Sheets & detents**: Compare "Araç Ekle" uses `[.medium,.large]` detents → `@gorhom/bottom-sheet`; detail share/report/PDF → RN `Share` API + Modal form.
6. **fullScreenCover gallery** with paged TabView → Modal + horizontal paging FlatList/carousel + pinch-zoom viewer; sync `galleryExpanded` to hide shell chrome.
7. **LazyVGrid** (quick links 2-col, body types adaptive min 108, guest features 2/3-col, spec deck 2-col, metrics 2-col) → flexWrap views or FlatList numColumns; adaptive min-width needs onLayout math.
8. **Turkish locale**: sorting uses `localizedCompare` (tr) — use `Intl.Collator('tr')`; uppercasing uses `tr_TR` (İ/ı) — `toLocaleUpperCase('tr-TR')`; diacritic-insensitive district matching — normalize('NFD') + strip combining marks with tr lowercasing.
9. **Location**: expo-location; replicate Turkey bounding box (lat 35.5–42.5, lng 25–45), haversine distance, province-centroid city resolution and Nominatim fallback (keep the custom User-Agent).
10. **AsyncImage/CachedAsyncImage** → `expo-image` (built-in caching, placeholder = stone tones).
11. **Toasts**: shared top banner with slide+fade (Reanimated), auto-dismiss timers (2.5–3 s).
12. **Dark mode**: AppTheme tokens are dynamic getters keyed on a manual `isDark` flag persisted under `otomenzil.pref.darkMode` — implement as themed token object via context, not OS-only color scheme.
13. **Fonts**: Outfit family, weights medium→black; sizes are small (7–28) — load via expo-font, map `.black` → Outfit-Black etc.
14. **Native pieces**: UIPasteboard → expo-clipboard; UIApplication.open → Linking; `.searchable` (CarListView) → custom header search; segmented Picker → segmented control lib; Slider → community slider; `.refreshable` → RefreshControl.
15. **Known quirks to preserve or consciously fix**: home search form does NOT pass its filter selections to the catalog screen; `selectedDrive` filter has no UI; `newest` sort duplicates `popular`; RankedCars consumption bar uses inverse ratio (can exceed 100%, clamped by layout); duel cards ignore their specific cars when navigating to compare.
