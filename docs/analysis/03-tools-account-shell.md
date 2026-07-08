# 03 — Tools, Blog, Account, Auth & Shell Screens (iOS → React Native Spec)

Source: `/Users/kadirdeniz/code/otomenzil-ios/OtoMenzil/Views/` (+ referenced Components/Store/Utils/Services).
All user-visible strings below are **verbatim Turkish** from the Swift source. Every view routes through the single-store navigation model (`AppNavigationStore.navigate(AppViewID)`, `store.overlay = .car(slug)/.blog(slug)`), not a native navigation stack.

Shared infrastructure used by every screen in this area:

- **API base**: `AppConfig.siteBaseURL = "https://www.otomenzil.com"`, REST base `"{site}/wp-json/otomenzil/v1/"` (`Config.swift`). Fallback transport: WordPress `POST {site}/wp-admin/admin-ajax.php` with `action=otomenzil_*` form fields. Auth via `APIClient.authToken` bearer/session token + WP cookies + a `nonce` (TTL 900s, refreshed via `GET auth/nonce` or ajax `otomenzil_refresh_nonce`).
- **Theme**: `AppTheme` token set (stone/emerald palette, `cardBackground`, `pageBackground`, `border`, `cardRadius`), custom font helper `.web(size:weight:)` (Outfit-like web typography). Dark mode is a manual boolean (`preferences.useDarkMode`) persisted in UserDefaults, not the system scheme.
- **Money format**: `CarPriceFormatter.formatTL(value)` (₺ TL grouping).
- **Loading**: setting `store.pageLoadingMessage = "…"` shows the global `PageLoadingOverlay` (z-200).

---

## 1. TOOLS

### 1.1 `ConsumptionCalculationView` (ToolViews.swift) — route `consumption`

**Purpose / data flow.** Pure client-side EV consumption & charge-cost calculator. Input: `store.catalogCars` (already loaded catalog). No API calls, no mutations. Navigation out: none (results inline).

**UI structure** (ScrollView, 16pt padding):
1. `toolHeader` — badge `"MENZİL HESAPLAMA"`, title `"Elektrikli Araç Tüketim ve Şarj Maliyeti"`, subtitle `"Gerçek yol senaryolarında kWh tüketimi ve TL maliyetini hesaplayın."`
2. Segmented picker (2 modes): `"Katalogdan Seç"` / `"Manuel Giriş"`.
3. Catalog mode: text field placeholder `"Araç ara…"` (filters catalog by `displayTitle`/`segment`, case-insensitive) + menu picker of matched cars (`car.displayTitle`); default selection = first catalog car.
4. Manual mode:
   - Text field `"Marka / Model"` (label rendered uppercased) — default `"Özel Elektrikli Model"`.
   - Slider `"Batarya (kWh)"` range 30…120, default 75 (step 1).
   - Slider `"Menzil (km)"` range 200…800, default 450 (step 10 — step is 10 when `range.lowerBound >= 100`, else 1).
5. Slider `"Mesafe (km)"` range 10…500, default 100 (step 1). Each slider shows current value as `%.0f` on the right.
6. Tariff selector — label `"Tarife Seçimi"`; 4 tappable rows (selected row: emerald50 bg, emerald border, `checkmark.circle.fill` icon). Options with hardcoded prices (shown as `"%.2f TL/kWh"`):
   - `"Ev Tipi (Düşük Kademe)"` — 2.30
   - `"Ev Tipi (Yüksek Kademe)"` — 3.40
   - `"Halka Açık AC Şarj"` — 7.50
   - `"Hızlı DC Şarj"` — 9.80
7. Result card (always visible, live-updating): header `"SONUÇ"`, then
   - `"%.1f kWh tüketim"` (consumedKwh)
   - total cost in TL (`CarPriceFormatter.formatTL`)
   - `"%.2f TL/km · %.1f kWh/100km"`

**Formulas.** `consumptionPer100 = battery / range * 100` (catalog: from selected car's `batteryKwh`/`rangeKm`; 0 if missing). `consumedKwh = consumptionPer100 * distanceKm / 100`. `totalCost = consumedKwh * tariff.price`.

### 1.2 `TrunkVolumeView` (ToolViews.swift) — route `trunk`

**Purpose / data flow.** Ranked list of catalog cars by trunk volume. Inputs: `store.catalogCars`. Outputs: `store.addToCompare(car)`, `store.navigate(.compare)`, `store.openCarDetail(car)`.

**UI structure:**
1. `toolHeader` — badge `"BAGAJ HACMİ LİSTESİ"`, title `"Bagaj Hacmi En Geniş Elektrikli Araçlar"`, subtitle `"Aile ve yük ihtiyaçlarına göre en geniş bagaj hacmine sahip modelleri karşılaştırın."`
2. Filter chips with counts: `"Tümü (N)"`, `"SUV (N)"`, `"Sedan (N)"` (filter on `bodyType` lowercased; ids `all`/`suv`/`sedan`; active chip = stone900 bg, white text).
3. If ≥2 results: full-width emerald button `"Liderleri Karşılaştır"` (icon `arrow.left.arrow.right`) — adds top 3 to compare list and navigates to compare.
4. Ranked rows sorted by `trunkLiters` desc: `#<rank>` (emerald for top 3), car title, `"<liters> L"`, plus a horizontal bar chart (width proportional to max trunk, emerald 15% fill, 8pt height). Row tap → car detail.

### 1.3 Shared `toolHeader(badge:title:subtitle:)`
Simple VStack: badge (10pt black, emerald, tracking 0.8), title (24pt black), subtitle (13pt medium, stone500). Reuse as an RN component.

### 1.4 `MtvCalculationView` — route `mtv`

**Purpose / data flow.** 2026 Motor Vehicle Tax (MTV) calculator for EVs. Inputs: `store.catalogCars` (filtered: `trAvailable != false && priceTL > 0`, sorted by brand). Calculation is fully client-side via `MtvCalculator` (Utils/MtvCalculator.swift). Outputs: `store.navigate(.otv)`, `store.navigate(.search)`.

**UI structure:**
1. **Header card** — left emerald accent bar; capsule badge `"<2026> Resmi Tarife"` (icon `building.columns.fill`); title `"Elektrikli Araç MTV Hesaplama"`; subtitle `"Motor gücü (kW), model yılı ve matrah bilgisiyle yıllık Motorlu Taşıtlar Vergisi tutarını hesaplayın. Elektrikli otomobiller benzer segment benzinli araca göre yaklaşık %25 oranında vergilendirilir."`; inner tile with `turkishlirasign.circle.fill` icon: label `"ÖDEME"`, value `"Ocak + Temmuz (2 taksit)"`.
2. **Form card** — heading `"Hesaplama Formu"` (icon `function`). Mode toggle buttons (uppercased): `"Listeden Seç"` (icon `list.bullet.rectangle`) / `"Manuel Gir"` (icon `pencil.line`). Switching modes resets `calculated=false`.
   - Catalog mode: `WebFilterField` labeled `"Araç modeli"` with options `"{brand} {model} ({year|—})"`. On select, `applyCar`: modelYear/registrationYear ← car.year, kW ← `hpToKw(powerHp)` (hp × 0.7457, 1 decimal), taxBase ← `estimateTaxBase(price)` = `price / 1.32` rounded. Info line under picker: `"<kw> kW · Tahmini matrah <TL>"`.
   - Manual mode: numeric fields (labels uppercased):
     - `"Model yılı"` (numberPad, logical range 2008…referenceYear+1; default 2026)
     - `"Tescil yılı"` (numberPad, same range; default 2026)
     - `"Motor gücü (kW)"` (decimalPad; default 160.0)
     - `"Vergisiz satış bedeli / matrah (TL)"` (decimalPad; default 1,500,000)
     - Hint: `"2018 sonrası tescilde matrah dilimi uygulanır."`
     - Any edit resets `calculated=false`.
   - Submit button: `"MTV HESAPLA"` (white on emerald600). Result renders only after tap (`calculated=true`).
3. **Result card** — header row `"SONUÇ"` + pill `"<2026> tarifesi"` when result exists.
   - Empty state (before calculation): icon `function`, `"Formu doldurup hesaplayın"`, `"Yıllık MTV ve taksit tutarı burada görünecek."`
   - Result: `"YILLIK MTV"` + big TL amount (34pt); `"Taksit (Ocak / Temmuz): <TL>"`; 2-col grid of tiles (titles uppercased):
     - `"Güç dilimi"` → tier label; `"Matrah"` → bracket label; `"Araç yaşı"` → `"<n> yıl · <ageGroup.label>"`; `"Baz tutar (1–3 yaş)"` → TL; `"Yaş katsayısı"` → `"%<int>"`; `"Benzinli eşdeğer (tah.)"` → TL (annual × 4).
   - Disclaimer: `"Bilgilendirme amaçlıdır. Kesin tutar için GİB / e-Devlet MTV sorgulamasını kullanın."` (icon `info.circle`).
4. **Guide section** — title `"Elektrikli araçta MTV nasıl hesaplanır?"`, subtitle `"cc yerine kW esas alınır; 2018 sonrası tescilde matrah da devreye girer."`; horizontally scrollable table with gradient header row `"Motor gücü" | "Matrah dilimi" | "Yıllık MTV (1–3 yaş)"`, rows generated from `MtvCalculator.powerTiers` (matrah label `"<N> TL'ye kadar"` or `"Üst dilim"`, amount `"<N> TL"`; tier label shown only on first bracket row; alternating shading per tier). Footer note: `"Tutarlar 2026 tarifesine göre 1–3 yaşlı araçlar için baz yıllık MTV'dir; araç yaşı arttıkça indirim katsayısı uygulanır."`
5. **Footer links**: `"ÖTV Muafiyeti"` (→ `.otv`, arrow.right) and `"Araç Kataloğu"` (icon `car.fill`, → `.search`).

**MtvCalculator data (must be ported verbatim):** `referenceYear = 2026`. Age groups & multipliers: 1–3→1.0 (`"1–3 yaş"`), 4–6→0.75, 7–11→0.5, 12–15→0.35, 16+→0.2 (`"16 yaş ve üzeri"`). Power tiers (label / brackets `maxMatrah: amountTRY`):
- `"70 kW ve altı"`: 309,100→1,437; 541,500→1,579; ∞→1,725
- `"71 – 85 kW"`: 309,100→2,504; 541,500→2,755; ∞→3,007
- `"86 – 105 kW"`: 775,100→4,868; ∞→5,312
- `"106 – 120 kW"`: 775,100→7,669; ∞→8,368
- `"121 – 150 kW"`: 775,100→11,963; ∞→13,053
- `"151 – 180 kW"`: 968,100→11,506; ∞→12,554
- `"181 – 210 kW"`: 1,937,500→16,043; ∞→17,504
- `"211 – 240 kW"`: 1,937,500→24,436; ∞→26,660
- `"241 kW ve üzeri"`: 3,101,800→38,421; ∞→41,917

Logic: matrah brackets apply only when `registrationYear >= 2018` (otherwise label `"2018 öncesi tescil (matrah uygulanmaz)"`; missing matrah → `"Matrah bilgisi yok — alt dilim"`). Bracket labels: `"<N> TL'ye kadar matrah"` / `"<N+1> TL üzeri matrah"` / `"En üst matrah dilimi"`. `annual = bracketAmount × ageMultiplier` (rounded); installment = annual/2; ICE-equivalent estimate = annual × 4.

### 1.5 `VehicleLoanView` — route `vehicle-loan`

**Purpose / data flow.** BDDK vehicle-loan calculator, live (no submit button). Client-side via `VehicleLoanCalculator`. Output nav: `store.navigate(.search)`. Embeds `VehicleLoanGuideView` inline. Page background is `Color(hex: 0xEEF1F4)`.

**UI structure:**
1. **Hero header** (emerald→teal→stone gradient rounded 24): capsule `"BDDK 2026 · Yerli EV"` (icon `building.columns.fill`); title `"Elektrikli Araç Taşıt Kredisi"`; body `"Yerli üretim tam elektrikli araçlar için %70'e varan kredilendirme ve 48 aya kadar vade. Nihai fatura değerine göre aylık taksit ve toplam maliyeti anında hesaplayın."`; chips `"%70 kredilendirme"`, `"48 ay vade"`, `"Anlık taksit"`.
2. **Calculator section** card:
   - Title `"Taşıt Kredisi Hesaplama Aracı"`; subtitle `"Araç tipini seçin, fiyat ve peşinat bilgilerini girin; BDDK dilimine göre maksimum kredi ve taksiti görün."`
   - Category buttons (selected = emerald600 bg/white): `"Yerli Üretim EV"` sub `"BDDK geniş limit (2026)"`; `"Standart / İthal"` sub `"Klasik taşıt kredisi baremleri"`. Default: domestic EV.
   - Section label `"KREDİ PARAMETRELERİ"`.
   - `LoanMoneyField` `"Nihai fatura / araç fiyatı"` desc `"ÖTV ve KDV dahil anahtar teslim tutar"` (numberPad; digits-only; displayed with thousands grouping; default 2,500,000; icon `wallet.pass.fill`).
   - `LoanMoneyField` `"Peşinat"` desc `"Minimum peşinat BDDK dilimine göre değişir"` hint `"Min. peşinat: <TL>"` (live from limits; default 750,000).
   - Row: `LoanRateField` `"Yıllık faiz (%)"` (decimalPad, comma→dot accepted; default 3.35, formatted `%.2f`) and `LoanTermField` `"Vade (ay)"` (numberPad, default 48, hint `"Maks. vade: <n> ay"`).
   - **BDDK info card** (sky-blue tinted): `"BDDK kredi dilimi"` (icon `info.circle.fill`) + `limits.tierLabel` + optional note + `"Maks. kredi: <TL> · Oran: %<ltv>"`.
   - **Result summary card** (emerald gradient, white text): `"Sonuç özeti"` (icon `function`); `"AYLIK TAKSİT"` + amount (32pt); mini tiles `"Kredi tutarı"`, `"Toplam faiz"`, wide `"Toplam geri ödeme"`; footer `"Peşinat + kredi geri ödemesi toplamı: <TL>"`.
   - **Warnings** (amber panel, icon `exclamationmark.triangle.fill`) — from calculator:
     - `"Kredi tutarı BDDK limiti olan <TL> ile sınırlandı."`
     - `"Vade, bu fiyat dilimi için izin verilen <n> ay ile sınırlandı."`
     - `"Minimum peşinat en az <TL> olmalı."`
     - Over-limit note: `"7.500.000 TL üzeri yerli EV araçlarda taşıt kredisi kullanılamaz (BDDK)."` / `"2.000.000 TL üzeri araçlarda taşıt kredisi kullanılamaz (BDDK)."`; zero price → `"Araç fiyatı girin."`; tier label then `"Kredi limiti dışı"`.
3. `VehicleLoanGuideView` (below).
4. Link button `"Elektrikli Araçları İncele"` (arrow.right) → `.search`.

**VehicleLoanCalculator tiers (port verbatim):**
- Domestic EV: ≤2.5M→%70/48ay (`"0 – 2.500.000 TL (Yerli EV)"`), ≤5M→%50/36, ≤6.5M→%30/24, ≤7.5M→%20/12; above → no credit.
- Standard: ≤400K→%70/48 (`"0 – 400.000 TL"`), ≤800K→%50/36, ≤1.2M→%30/24, ≤2M→%20/12; above → no credit.
- Tier note: `"Bu dilimde en fazla %<ltv> kredilendirme ve <term> ay vade uygulanır."`
- Annuity: `monthly = L·r·(1+r)^n / ((1+r)^n − 1)`, r = annualRate/100/12; 0-rate → linear. Loan clamped to `floor(price·ltv/100)`; term clamped to tier max.

### 1.6 `VehicleLoanGuideView` (standalone component, embedded in loan page)

Static content guide, collapsible TOC (`tocOpen` default true). Header: badge `"Rehber · BDDK 2026"` (icon `book.fill`), title `"Elektrikli Araç Taşıt Kredisi Şartları ve Limitleri (2026)"`, intro `"Yerli üretim tam elektrikli araçlarda geçerli BDDK kredi oranları, vade tavanları, nihai fatura baremleri, ÖTV avantajları ve taşıt kredisi genel şartlarını kapsayan güncel bilgilendirme rehberi."`, meta `"Son güncelleme: 6 Mart 2026 · BDDK 11158"`.

TOC (`"İçindekiler"`, chevron toggle) items: `"Kredi oranı ve vade"`, `"Hangi modeller?"`, `"Nihai fatura değeri"`, `"Bireysel / ticari fark"`, `"ÖTV avantajı"`, `"ÖTV oranları 2026"`, `"Rehin ve fek"`, `"Genel şartlar"` (display-only in iOS; ids exist for anchors).

Sections (titles verbatim):
1. `"Elektrikli Araç Kredisi Kredi Oranı ve Vade Sınırları"` — paragraph `"Bankacılık Düzenleme ve Denetleme Kurulu (BDDK), yerli elektrikli araç üretimini teşvik etmek amacıyla kredi limitlerinde önemli bir güncellemeye gitti. 6 Mart 2025 tarihli ve 11158 sayılı Kurul Kararı uyarınca, Türkiye'de üretilen elektrik motorlu taşıtlar için uygulanan 2026 yılı güncel kredi oranları ve vade sınırları aşağıda yer almaktadır:"` + table (headers `"Araç Fiyatı (TL)" | "Kredi Oranı" | "Vade Sayısı"`; rows: `0 – 2.500.000 / %70 / 48 ay`, `2.500.001 – 5.000.000 / %50 / 36 ay`, `5.000.001 – 6.500.000 / %30 / 24 ay`, `6.500.001 – 7.500.000 / %20 / 12 ay`, `7.500.001 ve üzeri / Kredi kullanılamaz / —`) + bullet list repeating each tier in prose (e.g. `"2.500.000 TL ve altındaki taşıtlar için: Araç değerinin %70'ine kadar kredi ve 48 ay vade,"` … `"7.500.001 TL üzerindeki taşıtlar için: Kredi imkânı bulunmamaktadır (%0)."`).
2. `"Avantajlı Elektrikli Araç Kredisinden Hangi Modeller Yararlanır?"` — intro + info boxes:
   - `"Mevcut modeller (Togg ve ticari araçlar)"` (neutral): Togg T10X/T10F, Ford E-Transit, E-Tourneo Custom, VW ID. Buzz text.
   - `"Üretimi planlanan markalar (2026)"` (emerald): Hyundai, BYD, Renault, Tofaş text.
   - `"İthal modellerin durumu"` (amber): Tesla/BMW/Mercedes EQ text.
   - `"Hibrit araçlar"` (neutral): `"PHEV ve hibrit araçlar bu kapsamın dışındadır ve standart taşıt kredisi şartlarına tabidir."`
3. `"Nihai Fatura Değeri Nedir, Kredi Limitini Nasıl Etkiler?"` (emerald tint) — 3 paragraphs incl. `"Kredi başvurusu yapmadan önce bayiden alacağınız teklif formundaki \"Genel Toplam\" hanesini kontrol etmeniz oldukça önemlidir."`
4. `"Elektrikli Araçlarda Bireysel ve Ticari Alım Farkı Var mı?"` — two boxes `"Bireysel alımlar"` / `"Ticari (kurumsal) alımlar"`.
5. `"Elektrikli Araçlarda ÖTV Avantajı"` — 2 paragraphs.
6. `"Elektrikli Araç ÖTV Oranları 2026"` (stone tint) — table headers `"Motor gücü" | "Vergisiz satış tutarı" | "ÖTV" | "KDV"`, rows: `160 kW'ı geçmeyen / 1.650.000 TL'ye kadar / %25 / %20`; `160 kW'ı geçmeyen / 1.650.000 TL üzeri / %55 / %20`; `160 kW üzeri / 1.650.000 TL'ye kadar / %65 / %20`; `160 kW üzeri / 1.650.000 TL üzeri / %75 / %20`.
7. `"Taşıt Kredilerinde Rehin İşlemi ve Borç Bitiminde Fek Süreci"` — 2 paragraphs.
8. `"Taşıt Kredisi Genel Şartları Nelerdir?"` — bullets: `"Belgeli gelire sahip olmak (SGK kaydı ve vergi levhası)"`, `"Taşıtın yaşının sıfır olması ya da çok yüksek olmaması"`, `"Taşıt üzerinde herhangi bir kurum veya kişinin rehin kaydı olmaması"`, `"Kişinin kredi notunun riskli seviyede olmaması"`, `"Gelirin kredi taksit ödemelerini karşılayabilmesi"`.
9. `"Kaynak"` — bullets `"21.03.2024 Tarihli 10880 Sayılı Bankacılık Düzenleme ve Denetleme Kurulu Kararı"`, `"06.03.2025 Tarihli 11158 Sayılı Bankacılık Düzenleme ve Denetleme Kurulu Kararı"`.
10. Disclaimer (amber): `"Yasal uyarı: Bu içerik yalnızca genel bilgilendirme amacı taşır; yatırım veya kredi tavsiyesi niteliğinde değildir. Nihai kredi teklifi, faiz oranı ve onay süreci bankanızın güncel politikasına bağlıdır."`

### 1.7 `OtvExemptionView` — route `otv`

**Purpose / data flow.** ÖTV (special consumption tax) guide with two modes; ranks catalog cars by exemption eligibility. Inputs: `store.catalogCars` (filter `trAvailable != false`, `priceTL > 0`). Client-side via `OtvCalculator`. Output: `store.openCarDetail(car)`.

**UI:**
1. **Header card** (left emerald accent stripe): capsule `"Mart 2026 · Güncel Mevzuat"` (icon `building.columns.fill`); title `"Elektrikli Araçlar ÖTV Rehberi"` (28pt); body `"2026 ÖTV düzenlemesi kapsamında engelli muafiyeti ve indirimli dilim senaryolarını Türkiye satıştaki modeller üzerinden inceleyin."`; line `"Engelli muafiyeti limiti (vergiler dahil): <TL of 2,873,972>"`.
2. **Mode picker card** — label `"GÖRÜNÜM"`; buttons (uppercased when rendered): `"Engelli Muafiyeti"` (index 0, default) / `"ÖTV İndirim Dilimi"` (index 1).
   - Mode 0 condition list (checkmark bullets): `"Fiyat limiti: <TL> ve altı"`, `"Yerli üretim kriteri (%40 yerli katkı)"`, `"10 yıl satış kısıtı ve kullanım şartları geçerlidir"`.
   - Mode 1 text: `"Matrah eşiği <1.650.000 TL>. Motor gücü ve matraha göre %25–%75 arası ÖTV dilimleri uygulanır."`
3. **Summary bar**: `"<n> model muafiyet limitine uygun."` (mode 0) / `"<n> model %25 diliminde."` (mode 1); right pill `"<total> kayıt"`.
4. **Car cards** (image 120×120 left):
   - Badge `"ÖTV %<rate>"` (black pill), status badge `"UYGUN"` (mode 0 eligible) / `"%25 DİLİM"` (mode 1 eligible) / `"ŞARTLI"` (not eligible; stone pill).
   - Title, price (emerald), and in mode 0: `"Tahmini muaf fiyat: <TL>"` (= price ÷ (1 + rate/100)).
   - Eligible cards get emerald border. Tap → car detail.

**OtvCalculator (port verbatim):** `matrahThreshold2026 = 1_650_000`, `disabledExemptionLimit2026 = 2_873_972`. Rate band: kW ≤160 → 25% (matrah ≤ threshold) else 55%; kW >160 → 65% else 75%. Matrah estimated iteratively: `matrah = price / ((1+rate/100) × 1.2)` (4 iterations). Local-production whitelist (mode 0 filter): Togg "T10*", Citroën C3 (not "aircross"), Dacia/Renault Spring, MG "MG4", Fiat "500". Sorting: eligible first; mode 1 secondarily by rate asc; then by price asc.

---

## 2. BLOG

### 2.1 `BlogArchiveView` — route `blog`

**Data flow.** `GET blogs` (`api.fetchBlogs()`) into local `@State blogs`; category metadata from `store.homeData?.blogCategories[filter]`. Store fields used: `store.blogCategoryFilter` (string, `"all"` default), `store.blogSearchQuery` (two-way bound). Loading sets `store.pageLoadingMessage = "Haberler yükleniyor…"`. Pull-to-refresh re-loads. Error → shared `ErrorStateView(message:retry:)`. Nav out: `store.openBlogDetail(blog)`, `store.openBlogCategory(category)`.

Hardcoded category chips list: `["all", "Rehber", "Teknoloji", "İnceleme", "Şarj İstasyonları", "Sektör"]` (chip label for `all` = `"Tümü"`; active chip emerald600 bg/white).

**UI (top→bottom):**
1. Header — two variants:
   - Category archive (when filter ≠ all and meta exists): back link `"Tüm Haberler"` (chevron.left, sets filter to all); card with label `"KATEGORİ ARŞİVİ"`, category `emoji` (32pt), `meta.name` (24pt black), `meta.description`, `"<count> makale"`.
   - Default: eyebrow `"Elektrikli Mobilite Haber Merkezi"`, title `"Elektrikli Araç Rehberleri ve Haberler"`, subtitle `"Teknoloji, sektör ve karşılaştırma rehberleri — güncel elektrikli araç haberleri ve analizler."`
2. Search bar: magnifier + field `"Haber ara…"` (filters title/excerpt contains, case-insensitive).
3. **Gündem ticker** (if ≥1 blog): black pill with pulsing dot + `"Gündem"`, next to a one-line rotating headline of the top-5 posts (advances every 4s via Timer; tap opens that post).
4. Category chips (horizontal scroll).
5. **Headline carousel**: paged `TabView`, first 3 posts; 200pt hero image, bottom gradient, category tag uppercased (fallback `"HABER"`), title (18pt black, ≤3 lines). Tap → detail.
6. List of `BlogPostCardView(layout: .list)` for filtered posts; card exposes `onCategoryTap` → `store.openBlogCategory`.

### 2.2 `BlogDetailView` — overlay `.blog(slug)`

**Data flow.** `GET blogs/{slug}` (404 fallback: fetch list and match by id). Loading message `"Makale yükleniyor…"`. On appear also fires fire-and-forget view tracking `trackBlogView` (ajax `otomenzil_blog_view` with nonce). Like: optimistic toggle then `POST blogs/{id}/like` (REST) or ajax `otomenzil_blog_like`; rollback on error. Requires login — guests get `auth.openAuth(message: "Yazıları beğenebilmek için giriş yapmalısınız.")`. Share: native share sheet with `[title, URL "{site}/haber/{id}/"]`.

**UI:**
1. `ShellBackBar` title `"Haber Merkezine Dön"` → `store.closeOverlay()`.
2. Hero image (220pt, rounded 20) with tappable category chip overlay (uppercased, black pill) → category archive.
3. Title (24pt black).
4. Meta chips: category (icon `book.fill`; fallback text `"Haber"`), `"<n> dk okuma"` (icon `clock.fill`), date (icon `calendar`).
5. Engagement row:
   - Like pill: `"<count> · Beğen"` / liked: `"<count> · Beğenildi"`; heart/heart.fill; rose500 outline → filled rose bg when liked; disabled while submitting.
   - `"Paylaş"` pill (icon `square.and.arrow.up`) → share sheet.
6. **Report stats grid** (2×2, elevated surface): `"Güvenilirlik"` → `blog.reportReliability ?? "Yüksek Sınıf"` (with green status dot); `"Rapor Kaynağı"` → `reportSource ?? "otomenzil Lab"`; `"Güncelleme"` → `reportUpdated ?? date ?? "—"`; `"Yayın Modeli"` → `reportModel ?? "Bağımsız Basın"` (emerald accent).
7. **Table of contents** (`ArticleTocView`, collapsible, default open): header `"İÇİNDEKİLER"` + `"(<n>)"` count, icon `list.bullet.indent`, chevron rotate. Items show `"H<level>"` prefix + text, indented 0/8/16/24pt by level. Tap → collapses TOC, sets `scrollToHeadingId`; the WKWebView computes the heading's y-offset via JS, which drives a SwiftUI `scrollTo` on an invisible marker positioned at that offset (animated, anchor ~8% from top).
8. **HTML body** — `HTMLContentView` (see 2.3). Height driven by webview-reported content height. If no HTML: plain excerpt text. TOC ids are injected into HTML beforehand by `BlogTocExtractor.injectHeadingIds` (h1–h4; slugified Turkish-folded ids, de-duplicated with `-2`, `-3`… and fallback base `"baslik"`).
9. **Related cars** (if `blog.relatedCarIds` resolve in catalog): header `"BU YAZIYLA İLİŞKİLİ"` / `"İlgili Araçlar"` (icon `car.side.fill`); rows with 112×96 image, brand uppercased, title, `"<range> km · <battery> kWh"`, `CarPriceView(.compact)`. Tap → car detail. Gradient emerald container.
10. **Comments** — `BlogCommentsSection` (see 2.4).

### 2.3 HTML rendering — `HTMLContentView` (Components/HTMLContentView.swift)

WKWebView-based, non-scrollable, transparent. Wraps raw WordPress HTML in a template with:
- Full light/dark CSS palettes (text `#44403C`/`#E7E5E4`, headings, emerald link colors `#059669`/`#34D399`, striped tables with rounded borders and uppercase emerald header cells, styled blockquotes, `scroll-margin-top: 96px` on h1–h4, responsive img/iframe constraints).
- Two prose styles: `.article` (h2 has left emerald bar + background) and `.legal` (h2 underlined, smaller; used by legal pages).
- JS `reportHeight()` posts `document.body.scrollHeight` to message handler `heightChanged` (on load, img load/error, at 400ms/1200ms); Swift debounces 80ms and sets `contentHeight` binding (+12pt).
- `scrollToHeading(id)`: JS walks `offsetTop` chain, returns y; Swift calls `onHeadingOffset`.
- Re-renders only when `"{isDark}-{proseStyle}-{html.hashValue}"` signature changes. Base URL = site base.

### 2.4 Comments — `BlogCommentsSection` + generic `WebCommentsSection`

Data: `GET blogs/{slug}/comments`; submit `POST blogs/{id}/comments` (body `{text, parentId}`) with ajax fallback `otomenzil_add_blog_comment`. One-level replies (`parentId`).

UI (generic component): header badge `"Topluluk"` uppercased + title `"Makale Yorumları (<n>)"` uppercased + right pill `"Üye Tartışması"`. Notice banner (green success / red error): success `"Yorumunuz gönderildi."`. Composer (logged-in): reply banner `"Yanıt: <name>"` with `"İptal"`; label `"Yorumunuz"`; multiline field placeholder `"Bu makale hakkındaki görüşünüzü paylaşın..."` (3–6 lines); submit button `"Gönder"` / `"Gönderiliyor…"` (icon `paperplane.fill`, disabled while empty/submitting). Logged-out (amber panel): `"Yorum yazmak ve yanıtlamak için üye girişi gereklidir."` + link `"Üye Girişi Yap veya Kaydol →"` → `auth.openAuth(message: "Yorum paylaşabilmek için oturum açmalısınız.")`. Empty list: `"Henüz yorum yok — ilk yorumu siz yazın."` Comment cards: initial avatar, author uppercased, `checkmark.seal.fill` if member has slug, date, text, `"Yanıtla"` action (top-level only, logged-in). Replies indented 16pt.

---

## 3. ACCOUNT (AccountViews.swift — contains 6 top-level views + subcomponents)

### 3.1 `CopyableProfileUrlView` (shared widget)

Props: `memberSlug`, `showOpenLink` (default true). Shows label `"PROFİL ADRESİ"`, path `"/uye/<slug>/"`; buttons: copy (`doc.on.doc` → `checkmark`, label `"Kopyala"` → `"Kopyalandı"` for 2s; copies full URL `{site}/uye/<slug>/` to clipboard) and optional open-in-browser (`arrow.up.right`, label `"Aç"`, `Link` to URL). Full URL echoed underneath in small text.

### 3.2 `GarageView` — route `garage`

**Gate.** If logged out → `GuestGarageGateView` (see 3.3) whose CTA calls `auth.openAuth(message: "Aracını garajına eklemek için giriş yapın.")`.

**Data flow (logged in).** Garage state lives in `AuthStore`: `garageCarIds`, `primaryGarageCarId`, `garageCarSummaries`, `busyGarageCarIds`. Mutations: `auth.toggleGarageCar(id, store:)` and `auth.setPrimaryGarageCar(id)` → `POST/PUT user/garage {carId, action}` (`action`: add/remove/`setPrimary`), optimistic for setPrimary with rollback + `GET user/garage` refresh on error. Location via `UserLocationService` (CoreLocation) requested on appear; stations from bundled `EpdkStationsData` (EPDK station dataset with city/district filtering, distance sort, 8-item limit, 120 km radius).

**UI sections:**

1. **Hero** (card, bottom border):
   - Capsule `"Kişisel garaj"` (icon `sparkles`), title `"Garajım"` (28pt), subtitle `"Araçlarınızı yönetin, port bazlı menzil hesaplayın ve konumunuza göre yakın şarj noktalarını görün."`
   - Primary car → `GarageCarShowcaseCard`: 200pt hero image with gradient; brand logo; badge `"Ana araç"` (crown.fill, mint capsule); title (22pt); meta `"<year> · <body> · <segment> segment · <drive>"`; 3×2 stat grid: `"WLTP Menzil"` `"<n> km"`, `"Batarya"`, `"10-80 DC"`, `"Güç"`, `"0-100"`, `"Bagaj"` `"<n> L"` (icons: gauge, battery.100.bolt, bolt.fill, sparkles, gauge, shippingbox.fill). Tap image → car detail.
   - Other cars → `GarageOtherCarsStrip`: label `"Diğer araçlarınız"`; horizontal 180pt cards (160×90 thumb, title, `"<range> km · <battery>"`), active card emerald-highlighted; tap selects `activeCarId`.
   - Empty garage: dashed panel, `car.fill` icon, `"Henüz garajınızda araç yok"`, `"Aşağıdan katalogda arayıp ilk aracınızı ekleyin."`
   - Ids known but summaries still loading: spinner + `"<n> araç garajınızda yükleniyor…"`.
2. **Nearby stations card** (only when a display car exists):
   - Emerald gradient header (92pt): bolt icon; `"{brand} {model}"`; `"Yakın şarj istasyonları"`; status line, one of: `"Konumunuza göre sıralandı"` / `"Konum izni kapalı — Ayarlar'dan açın"` / `"Konum alınıyor…"` / `"<city> bölgesindeki istasyonlar"` / `"Konum veya il seçerek istasyonları görün"`.
   - Selectors (Menu-based dropdowns): city `"🇹🇷 <city|İl seçin>"` with reset option `"İl seçin (isteğe bağlı)"`; district `"📍 Tüm ilçeler"`/name with option `"Tüm ilçeler"` (disabled until city chosen).
   - Button `"Konumu güncelle"` / `"Konum alınıyor…"` (location.fill / location.circle). Result alert titles: `"Konum güncellendi"` / `"Konum güncellenemedi"`, button `"Tamam"`; messages:
     - success `"Konum güncellendi: <city> / <district>"` or `"Konum güncellendi."`
     - denied `"Konum izni reddedildi. Ayarlar → Oto Menzil → Konum → «Uygulama Kullanılırken» seçeneğini açın."`
     - timeout `"Konum isteği zaman aşımına uğradı. GPS sinyalinizi kontrol edip tekrar deneyin."`
     - outside TR `"Konumunuz Türkiye dışında görünüyor. Simülatör kullanıyorsanız Features → Location → Custom Location ile Türkiye koordinatı seçin."`
     - unavailable → server message or `"Konum alınamadı."`
   - Inline loader: `"Konumunuz alınıyor…"`.
   - Empty states (icon `location.slash`): permission denied → `"Yakın istasyonları görmek için konum izni gerekli."` + settings hint (same «Uygulama Kullanılırken» text); no location & no city → `"Konum izni verin veya yukarıdan il seçerek istasyonları listeleyin."`; city chosen but none → `"Seçilen bölgede istasyon bulunamadı. İlçe filtresini genişletin."`; located but none in radius → `"120 km çevrenizde şarj istasyonu bulunamadı. Daha geniş arama için tüm istasyonlar sayfasına gidebilirsiniz."`
   - Station preview cards (196pt wide, horizontal scroll): operator initial avatar, operator name, district, station name (2 lines), distance label (if located) + power label (bolt), pill `"<n> lisanslı soket"`. Selected card emerald-bordered → shows **detail panel**: station name, `"<operator> · <address>"`, port chips (`DC`/`AC`/`HPC` + `"<kW> kW"`), and `"Yol Tarifi Al"` block with deep links: `"Google Maps"` (badge G, #4285F4), `"Yandex Navigasyon"` (badge Y, #FC3F1D), `"Apple Haritalar"` (RN: replace with geo:/maps URL schemes).
   - Footer link `"Tüm şarj istasyonlarını gör"` → `.stations`.
3. **`GaragePortChargeCalculator`** (per selected car):
   - Dark gradient header: `"Menzil hesaplayıcı"` (mint), car title, subtitle `"<station name> · seçili port gücüne göre süre ve menzil kazancı"` or `"Genel port güçleriyle tahmini şarj süresi ve menzil kazancı"`.
   - Port chips (label `"Şarj portu"`, icon `powerplug.fill`); options from `GarageChargeCalculator.defaultPorts`: `"Type 2 · 22 kW"`, `"CCS2 · 50 kW"`, `"CCS2 · 120 kW"` (default), `"CCS2 · 180 kW"`, `"CCS2 · 300 kW"`.
   - Battery gauge: `"Batarya simülasyonu"` + `"%<target>"`; capsule fill colored by target (≤20 red, ≤55 amber, ≤80 blue, else emerald); start marker line; captions `"Başlangıç %<n>"` / `"Hedef %<n>"`.
   - Sliders (step 5): `"Mevcut şarj"` (0…90, default 20; pushing past target bumps target +10) and `"Hedef şarj"` (start+10…100, default 80, emerald highlighted).
   - Stat grid: `"Aktarılan enerji"` `"<kWh> kWh"`, `"Tahmini süre"` `"~<n> dk"`, `"Kazanılan menzil"` `"+<n> km"` (accented), `"Etkin güç"` `"<n> kW"` (icons battery.100.bolt / timer / gauge / bolt.fill).
   - Footer: `"<battery> kWh batarya · <range> km WLTP · DC üst sınır <n> kW. %80 üzeri dolumda koruma payı eklenir."`
   - Math (`GarageChargeCalculator`): energy = battery×Δ%/100 (1 decimal); effective speed = min(port kW, car DC max, mode cap [AC 22 / DC 120 / HPC 300]); DC max estimated from `chargingMin` (≤22→250, ≤30→180, ≤40→150, ≤50→120, else 100; missing→120); duration = energy/speed×60 min, +1.1 min per % above 80 (non-AC), floor 10 min; range gained = energy × (range/battery).
4. **Management**:
   - `"Garajdaki Araçlar (<n>)"` (icon `car.fill`, emerald). Logged-out text `"Garajınızı görmek için giriş yapın."` (unreachable in practice); empty dashed panel `"Garajınız boş"`.
   - 2-col grid of management cards: 72×54 thumb (tap = set active), title, `"<range> km · <battery>"`; actions row: `"Ana araç"` label (crown.fill) if primary else button `"Ana araç yap"` (crown) → `setPrimaryGarageCar`; `"Kaldır"` (trash, red) → `toggleGarageCar`. Active card emerald-tinted.
   - **Car picker**: `"Araç Ara"` + `"Katalogdan aracınızı bulup garajınıza ekleyin."`; search field `"Marka veya model ara..."`; results = catalog minus garage, ≤12 (first 12 if query empty); rendered with the shared `CarCatalogCardView` grid (compare/favorite/garage actions wired to store/auth); empty: `"Sonuç bulunamadı."`. (Unused legacy `GarageCarPickerCard` has button `"Garaja Ekle"`.)

### 3.3 `GuestGarageGateView` (Components)

Dark gradient hero: capsule `"Üyelik gerekli"` (lock.fill), title `"Garajım"` (32pt white), `"Aracını garajına eklemek ve yönetmek için giriş yapmalısınız."`, `"Üye olduğunuzda aracınızı kaydedebilir, yakın şarj istasyonlarını bulabilir ve menzil hesaplarını kişiselleştirebilirsiniz."`; 3 feature cards (same as launch screen, see 4.1); CTA `"Giriş Yap · Garajını Aç"` (icon `rectangle.portrait.and.arrow.right`, emerald bg, dark text).

### 3.4 `ProfileView` — route `profile` (read-only)

**Data:** `auth.currentUser: UserProfile` (username, email, memberSlug, memberSince, isAdmin, avatarColor), `auth.favorites` resolved against catalog. No API calls.

**Logged-out prompt:** icon `exclamationmark.octagon.fill` (amber), `"Oturum Açmanız Gerekiyor"`, `"Üye profilinizi görüntülemek için giriş yapmalısınız."`, button `"GİRİŞ YAP VEYA KAYDOL"` → `auth.openAuth(message: "Profil sayfasını görebilmek için giriş yapmanız gerekir.")`.

**Profile card:**
- Admin-only banner (purple gradient): `"Site Yöneticisi"` (crown.fill) / `"Yönetici Profili"`.
- Top accent bar (purple if admin else emerald). Avatar = first letter of username on `ProfileAvatarTheme` color (80×80 rounded 20). Username uppercased (20pt); admin badge `"Yönetici"` (shield.fill, purple); `"@<memberSlug>"`; role line `"Site Yöneticisi"` / `"Aktif Üye"`.
- Info tiles: `"E-posta"` (envelope icon), `"Üyelik tarihi"` (`memberSince ?? "—"`), `"Durum"` → `"YÖNETİCİ ÜYE"` / `"AKTİF ÜYE"`.
- `CopyableProfileUrlView` (if slug).
- Stat tiles (4-up): `"Yorum"` `0` (hardcoded), `"Favori"` count, `"Rozet"` `0` (hardcoded), `"Garaj"` count.
- **Favorites section**: `"Favori Araçlarım (<n>)"` (heart.fill, rose) + `"İlgilendiğiniz modeller; garajınızdaki sahip olduğunuz araçlardan ayrıdır."`; empty: heart icon, `"Henüz favori aracınız yok."`, button `"Araç Kataloğuna Git"` → `.search`; else 2-col grid (52×52 thumb, title, `"→ İncele"`, corner heart.fill button toggles favorite off; grid max height 320 when >4).
- Footer link `"Hesap bilgilerini düzenle (Ayarlar)"` (gearshape.fill) → `.settings`.

### 3.5 `AccountSettingsView` — route `settings`

**Data:** fields sync from `auth.currentUser` on appear/user change; save via `auth.updateProfile(username,email,currentPassword,newPassword,avatarColor)` → REST `user/profile` (fallback ajax `otomenzil_update_profile`), success message default `"Hesap bilgileriniz kaydedildi."`; app preferences persist to UserDefaults through `AppPreferencesStore`. Logout via `auth.logout(store:)` (server `auth/logout` + ajax `otomenzil_logout`, clears local session, navigates home, toast `"Çıkış yapıldı"`).

**Logged-out:** gearshape icon, `"Ayarlar"`, `"Tercihlerinizi ve hesap ayarlarınızı yönetmek için giriş yapmalısınız."`, button `"Giriş Yap"` → `auth.openAuth(message: "Ayarlarınızı yönetmek için giriş yapın.")`.

**Logged-in sections:**
1. **Hero** (dark gradient): eyebrow `"Hesap"`, title `"Ayarlar"`, `"Ad, e-posta, şifre, profil teması ve favoriler. Üye profilinizi görüntülemek için profil sayfanıza gidin."`, link `"Profil sayfasına git →"` → `.profile`.
2. **Account form card** — `"Hesap bilgileri"` (key.fill). Notice banner (green if contains `"kaydedildi"`, red otherwise). Fields (labels uppercased):
   - `"Ad Soyad"` (text)
   - `"PROFİL KULLANICI ADI"` block: read-only `CopyableProfileUrlView` (no open link) + `"Kullanıcı adı üyelik sırasında seçilir ve değiştirilemez."`; if none: `"Kullanıcı adı tanımlı değil."`
   - `"E-posta"` (email keyboard)
   - Divider; `"Mevcut şifre"` (secure), `"Yeni şifre"` (secure, placeholder `"Değiştirmek istiyorsanız girin"`)
   - Submit `"Hesap bilgilerini kaydet"` (icon `square.and.arrow.down`; spinner while `auth.isSubmitting`). On success clears password fields.
3. **Preferences card** — `"Uygulama tercihleri"` + `"Uygulama tercihleri cihazınızda saklanır."`; toggles (emerald tint):
   - `"Bildirimler"` — `"Kampanya ve güncelleme bildirimleri"` (`pushNotificationsEnabled`)
   - `"Veri doğrulama"` — `"Yalnızca doğrulanmış teknik verileri vurgula"` (`showVerifiedDataOnly`)
   - `"Analitik"` — `"Anonim kullanım istatistiklerini paylaş"` (`analyticsEnabled`)
   - `"Kompakt kartlar"` — `"Katalog listesinde daha sıkı kart düzeni"` (`compactCatalogCards`)
4. **Avatar theme card** — `"Profil teması"` (paintpalette.fill) + `"Menü ve profil avatarınızda kullanılan renk teması."`; live preview avatar + `"Önizleme"`; option chips (key → label → color): emerald `"Ekolojik Yeşil"`, indigo `"Lityum Mavi"` #4F46E5, amber `"Şarj Sarısı"` #F59E0B, purple `"Termal Mor"` #9333EA, stone `"Karbon Gri"`. Selection is saved only via the account-save button (avatarColor included in payload).
5. **Quick links** (2-up): `"Garajım"` / `"Araçlarınızı yönetin"` (car.fill) → `.garage`; `"Profilim"` / `"Üye profilini görüntüle"` (person.fill) → `.profile`.
6. **Logout**: `"Oturumu Kapat"` (icon `rectangle.portrait.and.arrow.right`, red on danger background).

### 3.6 `ContactView` — route `contact`

**Data:** prefills name/email from `auth.currentUser`. Submit → fresh nonce + ajax `otomenzil_contact {name,email,subject,message}` (default success `"Mesajınız iletildi."` from API layer). Submit disabled until trimmed message ≥ 10 chars.

**UI:** title `"İletişim"`, subtitle `"Sponsorluk, veri düzeltmesi, iş birliği veya genel sorularınız için bize yazın."` Form fields (labels uppercased): `"Ad Soyad"`, `"E-posta"` (email keyboard), `"Konu"` (default value `"Genel İletişim"`), `"MESAJ"` (TextEditor 120pt). Error text in red. Button `"MESAJI GÖNDER"` (spinner while submitting). Success card: checkmark.circle.fill, `"Mesajınız alındı!"`, `"Ekibimiz en kısa sürede size dönüş yapacaktır."` (replaces the form).

### 3.7 `LegalPageView` — routes `about` / `privacy` / `cookies` / `terms`

**Data:** fetches WordPress page by slug via `GET {site}/wp-json/wp/v2/pages?slug=<slug>&_fields=title,content`; slugs: about→`hakkimizda`, privacy→`gizlilik-politikasi`, cookies→`cerez-politikasi`, terms→`kullanim-kosullari`. Title stripped of tags. Errors: `"Sayfa adresi oluşturulamadı."`, `"Sayfa bulunamadı."`, or network error text. Fallback titles: `"Hakkımızda • Oto Menzil"`, `"Gizlilik Politikası"`, `"Çerez Politikası"`, `"Kullanım Koşulları"`, `"Sayfa"`.

**Layout (`LegalPageLayoutView`):**
- Hero: gradient top strip; kind icon; badge per kind — about `"BİZ KİMİZ?"`, cookies `"ÇEREZLER"`, privacy `"KVKK & GİZLİLİK"`, terms `"KULLANIM KOŞULLARI"`, contact `"BİZE ULAŞIN"`; secondary pill `"Güncellenmiş metin"`; title (28pt); excerpt per kind — about `"Türkiye'nin bağımsız elektrikli araç karşılaştırma ve bilgi platformu."`, cookies `"Zorunlu, tercih ve analitik çerezler; yönetim seçenekleriniz."`, privacy `"6698 sayılı KVKK kapsamında kişisel verilerinizin işlenmesi ve haklarınız."`, terms `"Platform kullanım kuralları, sorumluluk sınırları ve üyelik şartları."`, contact `"destek@otomenzil.com üzerinden veya form ile bize ulaşın."`; up to 3 related-link chips.
- Body: `HTMLContentView` with `.legal` prose style (only if plain-text length ≥ 200 chars; otherwise fallback content + help banner).
- Help banner (fallback only): `"Yardıma mı ihtiyacınız var?"`, `"Gizlilik, çerez veya kullanım koşulları hakkında bize yazın."`, mailto button `DESTEK@OTOMENZIL.COM`.
- Related section: header `"İLGİLİ YASAL SAYFALAR"`; 2-col cards with `"Oku"` + arrow; defaults (`LegalRelatedDefaults`, current page filtered out): `"Hakkımızda"` (`"Platformumuzun misyonu ve bağımsızlık ilkesi."`), `"Gizlilik Politikası"` (`"KVKK kapsamında veri işleme beyanımız."`), `"Çerez Politikası"` (`"Teknik çerezler ve tercih yönetimi."`), `"Kullanım Koşulları"` (`"Platform kullanım şartları."`), `"İletişim"` (`"Destek ekibine ulaşın."`).

---

## 4. AUTH

### AuthStore flow summary (drives all auth views)

- `openAuth(message:)` → shows `AuthModalView` (modal), optional contextual message. `closeAuth()` hides.
- `login(email,password)` → nonce, `POST auth/login {email,password,nonce}` (ajax fallback); success: apply session (user, favorites, garage payload, session token persisted in `LocalAuthSession`/UserDefaults), `showSuccess` flashes 350ms, close modal.
- `register(fullName,email,password,memberSlug)` → `POST auth/register`; on success also sets `pendingGarageOnboarding = true` (garage onboarding overlay appears).
- `googleLogin(credential)` → `POST auth/google {credential, nonce}`; on success: if `needsUsernameSetup` → `pendingUsernameSetup = true` (username onboarding); else if `isNewUser` → `pendingGarageOnboarding = true`.
- `completeUsernameSetup(user)` → clears username flag, then sets `pendingGarageOnboarding = true` (chained onboarding).
- `forgotPassword(email)` → `POST auth/forgot-password` (ajax fallback `otomenzil_forgot_password`); returns message, default `"Şifre sıfırlama bağlantısı e-posta adresinize gönderildi."`
- Shared error: `"Güvenlik anahtarı alınamadı."` when nonce fetch fails.
- Google client id: passed from `store.googleClientId` (settings payload `googleClientId`); both auth views also self-resolve it via `GET settings` if missing.

### 4.1 `AuthLaunchView` — full-screen cold-start gate

Shown by the shell when `bootstrapDone && !auth.isLoggedIn && !launchAuthDismissed` (z-130). Compact layout switch below 760pt height. **Differences vs AuthModalView:** full-screen (not dismissible backdrop), has hero marketing block + guest button, has **no** forgot-password tab, **no** live slug availability check/suggestions (only local ≥3 char validation), no "VEYA" divider, no footer security note.

**UI:**
1. Hero: `"Türkiye'nin Elektrikli Araç"` (stone900) / `"Karşılaştırma Platformu"` (emerald) / `"Garajına aracını ekle, yakın şarj istasyonlarını keşfet."`; horizontal feature cards (`LaunchFeatureCards`):
   - `car.2.fill` `"Garajım"` — `"Aracını garajına ekle; WLTP menzili, batarya ve port bazlı şarj süresini kişisel panelinden takip et."`
   - `arrow.left.arrow.right` `"Karşılaştırma"` — `"En fazla 3 elektrikli modeli yan yana kıyasla; menzil, fiyat ve teknik verileri tek ekranda gör."`
   - `bolt.fill` `"Şarj İstasyonları"` — `"Konumuna göre yakın EPDK lisanslı istasyonları bul, haritada gör ve yol tarifi al."`
2. Auth card: emerald top strip; shield icon; heading `"Üye Girişi"` / `"Yeni Üyelik"` (uppercased) + `"otoMenzil — Elektrikli Araç Karşılaştırma"` (uppercased). Tabs `"GİRİŞ YAP"` / `"HIZLI ÜYE OL"` (active = stone950 pill). Error banner (red) shows `auth.lastError`. Success state: checkmark + `"Giriş başarılı, yönlendiriliyorsunuz…"` (uppercased).
3. Fields (labels uppercased; no autocapitalize/autocorrect):
   - signup only: `"Ad Soyad"` placeholder `"Adınız ve soyadınız"`; `"Kullanıcı adı"` placeholder `"ornek-kullanici"`.
   - `"E-posta veya kullanıcı adı"` (signin; placeholder `"@kullanici veya ornek@ornek.com"`, default keyboard) / `"E-posta"` (signup; placeholder `"ornek@ornek.com"`, email keyboard).
   - `"ŞİFRE"` secure field, placeholder `"••••••"`, eye/eye.slash visibility toggle.
   - Submit: `"OTURUM AÇ"` / `"KAYIT OL"` (emerald600; disabled while submitting).
   - Signup slug validation (local): trim → lowercase → spaces→`-`; if <3 chars: `auth.lastError = "Kullanıcı adı en az 3 karakter olmalı."`
   - Google row (if client id resolved) — see 4.3.
4. Guest link: `"Ziyaretçi olarak devam et"` (underlined) → dismiss gate (`launchAuthDismissed = true` in shell).

### 4.2 `AuthModalView` — in-app auth modal

Overlay: dim `stone950@60%` + blur; tap outside closes. Card: emerald top strip 6pt, close `xmark` button top-right, shield icon header, header title `"Üye Girişi"` / `"Yeni Üyelik"` / `"Şifre Sıfırlama"` (uppercased). Under title: contextual message `"🔐 <auth.authMessage>"` in emerald pill, else `"otoMenzil — Elektrikli Araç Karşılaştırma"`.

Tabs: `"GİRİŞ YAP"` / `"HIZLI ÜYE OL"`; in forgot mode replaced by back link `"GİRİŞ EKRANINA DÖN"` (arrow.left). Switching tabs clears error + slug state.

Success view: circled checkmark, `"GİRİŞ BAŞARILI! YÖNLENDİRİLİYORSUNUZ..."`, `"Üye yetkileriniz aktif edildi."`

**Forgot tab:** field `"Kayıtlı E-posta Adresi"` (icon envelope.fill, placeholder `"ornek@ornek.com"`); submit `"ŞİFREMİ SIFIRLA"`. Success banner shows returned message + button `"ŞİMDİ GİRİŞ YAP"` (returns to signin).

**Signin/signup tab:**
- Signup: `"Ad Soyad"` (person.fill, placeholder `"Adınız ve soyadınız..."`) — typing debounces 450ms then calls `suggestMemberSlugs(fullName)` (`POST auth/suggest-member-slug`, needs nonce, name ≥2 chars); first suggestion auto-fills empty slug with message `"Önerilen kullanıcı adı seçildi."`
- **Member slug field** `"PROFİL KULLANICI ADI"` (icon `at`, placeholder `"kullanici-adi"`): input live-normalized (`lowercased`, non `[a-z0-9-]`→`-`, collapse `--`, trim `-`). On blur/submit → `checkMemberSlug` (`POST auth/check-member-slug`); states: checking (spinner + `"Kontrol ediliyor…"`), ok (emerald border 1.5pt, `"Kullanıcı adı uygun."`), error (red border, message = server error or `"Kullanıcı adı en az 3 karakter olmalı. Yalnızca harf, rakam ve tire kullanın."`). Horizontal suggestion chips (tap fills + marks ok). Preview line `"Profil adresi: /uye/<slug>/"`. Note: if nonce fetch fails, check is skipped and slug treated as ok.
- `"E-posta veya kullanıcı adı"` (signin, placeholder `"@kullanici veya ornek@ornek.com"`) / `"E-posta Adresi"` (signup, placeholder `"ornek@ornek.com"`), icon envelope.fill.
- `"ŞİFRE"` (lock.fill, placeholder `"••••••"`, show/hide). Signin only: link `"Şifremi Unuttum?"` → forgot tab.
- Submit: `"OTURUMU AÇ"` / `"KAYIT YAP VE BAŞLA"` (emerald, spinner while submitting). Signup submit re-validates slug (≥3 + server check) before `auth.register`.
- Divider `"VEYA"`; then `GoogleSignInRow` (mode `signup`/`signin`); while client id unresolved: `"Google ile giriş yapılandırması yükleniyor…"`.
- Footer: `"Güvenli Oturum Açma"` … `"TLS 1.3 Korumalı"`.

### 4.3 Google Sign-In (`GoogleSignInButton.swift`)

**Not the native GoogleSignIn SDK.** Flow:
1. `GoogleSignInRow` — bordered button: custom-drawn Google "G" mark (`GoogleLogoMark`, 4 colored arcs) + label `"Google ile giriş yap"` / signup: `"Google ile kaydol"`. Tap → presents sheet.
2. `GoogleSignInSheet` — `NavigationStack` sheet (detents medium/large, drag indicator); nav title `"Google ile Giriş"` / `"Google ile Kaydol"`; cancel button `"Kapat"`.
3. `GoogleSignInWebView` — WKWebView loading an **inline HTML page** (baseURL `https://www.otomenzil.com`) that includes the **Google Identity Services (GSI) web script** `https://accounts.google.com/gsi/client`, calls `google.accounts.id.initialize({client_id, callback})` and `renderButton` (`type:'standard', theme:'outline', size:'large', text:'signin_with'|'signup_with', shape:'rectangular', locale:'tr'`); page copy: `"Devam etmek için Google hesabınızı seçin."` The GSI callback posts the **ID-token credential (JWT)** to Swift via `window.webkit.messageHandlers.googleAuth.postMessage(resp.credential)`.
4. Credential string → `auth.googleLogin(credential:)` → backend `POST auth/google {credential, nonce}` verifies the JWT server-side.

**RN note:** replicating this WebView+GSI approach in RN WebView is possible but brittle (Google blocks embedded webviews for OAuth in some configurations; this works because GSI One-Tap button flow issues an ID token in-page under the site origin). Recommended: `@react-native-google-signin/google-signin` native SDK — it also yields an `idToken` JWT the existing `auth/google` endpoint can verify unchanged (ensure the WEB client ID from settings is passed as `webClientId` so the token audience matches).

### 4.4 `UsernameOnboardingView` — post-Google username picker

Full-screen dim overlay (not dismissible — no close button; z-126). Gradient top strip (emerald→teal). Header: capsule `"Profil kullanıcı adı"` (sparkles), title `"Kullanıcı adını belirle"`, body `"Google ile giriş yaptınız. Profil adresiniz için bir kullanıcı adı seçin — yalnızca harf, rakam ve tire."`

- Field `"KULLANICI ADI"` (icon `at`, placeholder `"ornek-kullanici"`), same normalization as modal. Status line: `"Kontrol ediliyor…"` / `"Kullanıcı adı uygun."` / `"Geçerli bir kullanıcı adı seçin."` / idle `"Profil adresi: /uye/kullanici-adin/"`; error `"Kullanıcı adı en az 3 karakter olmalı. Yalnızca harf, rakam ve tire."`; unavailable `"Bu kullanıcı adı kullanılamaz."` Preview `"/uye/<slug>/"`.
- Suggestions loaded on mount from `suggestMemberSlugs(fullName = current username)`; chips rendered as `"@<suggestion>"`; first suggestion auto-selected (`"Önerilen kullanıcı adı seçildi."`).
- Submit `"Kullanıcı adını kaydet ve devam et"` (checkmark icon; spinner; disabled while saving/checking) → validate then ajax `otomenzil_setup_username {memberSlug, nonce}` → `auth.completeUsernameSetup(user)` → chains into garage onboarding.

### 4.5 `GarageOnboardingView` — post-signup garage setup

Full-screen dim overlay (z-125), dismissible via `xmark`. Gradient strip. Header: capsule `"Garaj kurulumu"` (sparkles), title `"Elektrikli aracın var mı?"`, body `"Kullandığın aracı seç ve garajına ekle; menzil, şarj ve istasyon önerileri sana özel açılsın."`

- Search `"Marka veya model ara…"`; results: query <2 chars → first 6 catalog cars, else title-contains matches; max 8; scrollable list (max height 220): 64×44 thumb, brand logo + title, `"<range> km · <battery>"`, trailing `"EKLE"` (emerald).
- Tapping a row → `auth.toggleGarageCar(id)`; on success dismisses onboarding; error banner shows `auth.lastError`.
- Skip buttons: `"Henüz aracım yok"` (bolt.fill, stone style) and `"Almayı düşünüyorum"` (emerald style) — both just dismiss.

---

## 5. SHELL

### 5.1 `AppShellView` — root composition (ContentView → AppBootstrapView? No: root is AppShellView)

Single-screen shell; ZStack layering (z-index):
- Base column: `SiteNavbarView` (top) + `shellContent` + bottom-inset `BottomTabBarView`.
- `MobileDrawerView` z-140 (when open) · `AuthLaunchView` z-130 · `AuthModalView` z-120 · `UsernameOnboardingView` z-126 · `GarageOnboardingView` z-125 · `AdvancedSearchModalView` z-110 · compare panel overlay z-105 · `ProfileMenuPopover` z-151 (+ invisible tap-catcher z-150; popover pinned top-trailing, padding top 58 / trailing 56) · `MobileCampaignPopupView` z-100 · `PageLoadingOverlay` z-200 · `ToastBannerView` z-210 (auto-hides after 2.5s; sources: logout toast `"Çıkış yapıldı"`, favorite toasts).

Bottom tab bar hidden when: auth modal / username setup / garage onboarding visible, user not logged-in and launch gate not dismissed, drawer open, mobile filters open, or gallery expanded.

`shellContent` switch: bootstrap loader → error state (`store.shellError ?? "Ana sayfa verileri yüklenemedi."` with retry) → overlay (`CarDetailView` / `BlogDetailView`) → `mainContent` (per `store.currentView`, see route table in AppShellView lines 228–263: home/search/blog/compare/brands/ranked/otv/mtv/stations/consumption/vehicleLoan/profile/garage/settings/contact/legal).

Bootstrap: applies `ShellBootstrapCache`, runs `store.bootstrap()`, `auth.bootstrap(nonceFromSettings:)`, `campaigns.bootstrap()`. On scene re-activation: refresh catalog + campaign popup (skipped once on first activation). Campaign popup action URL: extracts last path component ≠ `"arac"` and opens car detail by slug.

`AppViewID` route ids (raw strings; drawer/subnav items map by these): `home, search, compare, blog, stations, brands, consumption, trunk, otv, mtv, vehicle-loan, best-cars, longest-range, lowest-consumption, profile, garage, settings, contact, about, privacy, cookies, terms`.

### 5.2 `AppBootstrapView` + `PageLoadingOverlay` (AuraLoadingView)

- `AppBootstrapView`: `AuraLoadingView(message: "Katalog ve garaj verileri hazırlanıyor…", showBrand: true)`.
- `AuraLoadingView`: page-colored backdrop; 3 blurred drifting emerald circles (4.5s ease loop); glass card containing a 7-bar audio-wave animation (bars 4pt wide, emerald gradient, randomized heights, staggered ease loops); optional brand block `"OTO MENZİL"` (tracking 4) + `"Elektrikli araç karşılaştırma platformu"`; optional message text (emerald700).
- `PageLoadingOverlay(message)`: ultraThin blur over page + `AuraLoadingView(message)`. Shown whenever `store.pageLoadingMessage != nil` (e.g. `"Haberler yükleniyor…"`, `"Makale yükleniyor…"`).

### 5.3 `SiteNavbarView` (64pt top bar + tools subnav)

Left: `SiteLogoView` → home. Right cluster (spacing 6):
1. Dark-mode toggle (`WebColorModeToggle`, 36×36, moon/sun Lucide icon) — **only when logged out** (logged-in users toggle from profile popover). Accessibility: `"Açık moda geç"` / `"Koyu moda geç"`.
2. Search icon button (Lucide magnifier) → `store.openSearchModal()`; a11y `"Gelişmiş arama"`.
3. Profile button:
   - logged-in: circular avatar (36pt, first letter of username, emerald50 bg) + chevron.down (rotates 180° when popover open; emerald tint when open) → toggles `ProfileMenuPopover`.
   - logged-out: `WebNavLoginButton` (Lucide user icon, emerald); a11y `"Giriş yap"` → `auth.openAuth()`.
4. Hamburger (Lucide menu) → `store.openDrawer()`; a11y `"Menü"`.

Below the bar: `ToolsSubnavView` ("Robotlar" strip). Bottom hairline + subtle shadow.

**`SiteLogoView`**: remote `logoURL` (theme setting, dark-mode variant via `store.logoURL(isDarkMode:)`, height 36) else fallback: emerald rounded square with gauge icon + wordmark `"oto"`(stone900)+`"menzil"`(emerald)+`".com"`(stone400) and tagline `"ELEKTRİKLİ MOBİLİTE"` (tracking 1.6).

**`ToolsSubnavView`**: `‹` scroll button — pulsing dot + label `"Robotlar:"` (uppercased) — horizontally scrollable `ToolChip`s — `›` button. Chips built from `store.navigation.secondary` (server-driven; defaults in `SiteBootstrap.NavigationDefaults`):

| id | label | icon key | badge |
|---|---|---|---|
| stations | `"Şarj İstasyonları"` | zap | `"Harita & Tarifeler"` |
| brands | `"Elektrikli Araç Markaları"` | globe | `"Tüm Liste"` |
| consumption | `"Menzil Hesaplama"` | zap | `"Hesaplama"` |
| trunk | `"Bagaj Hacmi En Geniş Elektrikli Araçlar"` | layers | `"Sıralama"` |
| otv | `"Elektrikli Araçlar ÖTV Muafiyeti"` | landmark | `"2026 Limit"` |
| mtv | `"Elektrikli Araç MTV Hesaplama"` | lira | `"2026 MTV"` |
| vehicle-loan | `"Elektrikli Araç Taşıt Kredisi"` | landmark | `"BDDK"` |

Chip: icon + label uppercased + small badge tag; active chip = stone950 bg/white; arrows step selection index and center-scroll. Icon mapping (`NavIconHelper`): home→house.fill, car→car.fill, compare→arrow.left.arrow.right, blog→book.fill, zap→bolt.fill, globe→globe, layers→square.stack.3d.up.fill, landmark→building.columns.fill, lira→turkishlirasign.circle.fill, calculator→function, trophy→trophy.fill, battery→battery.100, gauge→gauge.with.dots.needle.67percent, default→chevron.right.

### 5.4 `MobileDrawerView` (right-side drawer, width 290, slide-in 0.25s, blurred scrim)

**Header**: `SiteLogoView` (→ home + close) + `xmark` close.

**Body (scroll):**
1. Prominent button `"GELİŞMİŞ ARAMA"` (magnifier icon, emerald50 bg) → opens search modal + closes drawer.
2. Section `"Ana Gezinti"` (uppercased). Items from `store.navigation.primary` (defaults): `"Ana Sayfa"`→home, `"Elektrikli Araçlar"`→search, `"Karşılaştırma"`→compare, `"Haber"`→blog. Row: icon + label uppercased; active = inverse pill (stone950 bg, white); compare row shows red count badge when `compareCount > 0`.
3. Section `"Robotlar & Rehberler"` (uppercased): items from `navigation.secondary` (same 7 as subnav) with icon, label (not uppercased), and badge tag right-aligned (uppercased); active row stone100 bg.

**Footer:**
- Logged out: button `"ÜYE GİRİŞİ YAP"` (person.fill, emerald600) → `auth.openAuth(message: "Üye girişi yaparak favorilerinizi ve yorumlarınızı senkronize edin.")` + full-width dark-mode toggle.
- Collapsible compare block: header `"KARŞILAŞTIR (<n>)"` (arrow.left.arrow.right, chevron up/down) → expands inline `CompareMenuPanelView`:
  - header `"KARŞILAŞTIRMA LİSTESİ"` + `"<n>/3 araç seçildi"` or `"En fazla 3 model"`; close X.
  - empty: `"Henüz araç eklemediniz."` + `"Araç kartlarındaki karşılaştır butonuyla listeye ekleyin."`
  - rows: thumb 44×32, brand uppercased (emerald), model, trash remove.
  - CTA `"KARŞILAŞTIRMAYA GİT"` (≥2 cars) / `"KARŞILAŞTIRMA SAYFASINA GİT"`; `"LİSTEYİ BOŞALT"` (red) when non-empty.
- Button `"HEMEN ARAÇ BUL"` (arrow.right, inverse) → `.search`.
- Legal links 2×2 grid (uppercased): `"Hakkımızda"`→about, `"İletişim"`→contact, `"Çerez Politikası"`→cookies, `"Gizlilik Politikası"`→privacy.
- Footer `"© Oto Menzil • Mobil menü"` (uppercased).

Every action also calls `store.closeDrawer()`. Note: the same `CompareMenuPanelView` also appears as a standalone top-right overlay (z-105) when `store.comparePanelOpen`.

### 5.5 `BottomTabBarView` (floating capsule pill, ultraThinMaterial + surface tint, 6 tabs)

| id | label | SF icon | action | active when | badge |
|---|---|---|---|---|---|
| home | `"Ana Sayfa"` | house.fill | navigate(.home) | currentView==home && no overlay | — |
| search | `"Ara"` | magnifyingglass | openSearchModal() | searchModalOpen | — |
| cars | `"Araçlar"` | car.fill | navigate(.search) | currentView==search && !searchModal && no overlay | — |
| compare | `"Karşılaştır"` | arrow.left.arrow.right | navigate(.compare) | currentView==compare && no overlay | count capsule `min(count, 9)`, emerald600 bg, white text, offset (8,−6), when compareCount>0 |
| blog | `"Blog"` | newspaper.fill | navigate(.blog) | currentView==blog && no overlay | — |
| garage | `"Garajım"` | car.front.waves.up.fill | navigate(.garage) | currentView==garage && no overlay | 7pt emerald dot with 2pt white/card ring, offset (6,−4), when garage non-empty |

Active tab: bold icon + capsule background (`tabBarActiveBackground`); labels 8pt black, min scale 0.65.

### 5.6 `ProfileMenuPopover` (272pt wide card, top-right)

Header (gradient stone50→emerald50): avatar (44pt rounded 14, first letter on avatar-theme color), username (fallback `"Üye"`), subtitle `"@<memberSlug>"` else email.

Menu rows (icon tile + title + subtitle):
- `"Profilim"` — `"Rozetler ve istatistikler"` (person.fill) → `.profile`
- `"Garajım"` — `"Araçlar, menzil, istasyonlar"` (car.fill) → `.garage`
- `"Ayarlar"` — `"Hesap, tema, favoriler"` (gearshape.fill) → `.settings`

Divider → **theme toggle card**: title `"Gece modu"` / dark: `"Gündüz modu"`; subtitle `"Koyu temaya geç"` / `"Açık temaya geç"`; custom animated capsule switch (sun/moon knob, indigo gradient in dark); a11y `"Gündüz moduna geç"`/`"Gece moduna geç"`.

Danger row: `"Çıkış yap"` (rectangle.portrait.and.arrow.right, red) → `auth.logout(store:)`. All rows close the popover; popover auto-closes on route change.

### 5.7 `MobileCampaignPopupView` + `MobileCampaignManager`

Payload (`GET campaigns/popup` → `{popup: {id,title,body,imageUrl,buttonLabel,buttonUrl,dismissLabel}}`). Dismissal stored per popup **per day** in UserDefaults key `otomenzil.popup.dismissed.<id>.<yyyy-MM-dd>`. Manager also registers device (`POST campaigns/device {deviceId, pushToken}`; deviceId = identifierForVendor persisted) and fetches `campaigns/notifications`. Popup refreshes on bootstrap and app foreground.

UI: dim scrim (tap = dismiss); card rounded 24: optional hero image (180pt, clipped); title (20pt black); body (13pt); CTA = `buttonLabel` uppercased (white on emerald600) → `onAction(url)` then dismiss (shell parses car slug and opens car detail); text dismiss button = (`dismissLabel ?? "Kapat"`) uppercased, stone500.

---

## 6. RN MAPPING NOTES (iOS-specific mechanisms → suggested equivalents)

| iOS mechanism | Where used | RN equivalent |
|---|---|---|
| WKWebView HTML renderer with height-reporting JS bridge (`HTMLContentView`) | Blog detail body, legal pages | `react-native-webview` with injected JS posting `document.body.scrollHeight` via `window.ReactNativeWebView.postMessage`; drive container height from message; keep the CSS template (light/dark palettes, `.article` vs `.legal` h2 styles, `scroll-margin-top`). Alternative: `react-native-render-html` (loses table styling fidelity; WP content has complex tables/figures — WebView recommended). |
| TOC scroll: JS `offsetTop` query → SwiftUI `scrollTo` on invisible marker | Blog detail | Same WebView JS to get heading offset; then `ScrollView.scrollTo({y: articleTop + offset})` from the outer RN ScrollView. Inject heading ids with a JS/TS port of `BlogTocExtractor` (regex on `<h1-4>`, Turkish diacritic folding, `-2/-3` dedupe, fallback `baslik`). |
| Google Sign-In via WKWebView + GSI web script + `postMessage` credential | GoogleSignInRow/Sheet | Prefer `@react-native-google-signin/google-signin` (native): pass settings `googleClientId` as `webClientId`, send resulting `idToken` to existing `POST auth/google`. WebView replication possible (load HTML at `baseUrl: https://www.otomenzil.com`, `onMessage` for credential) but fragile. |
| `UIPasteboard.general.string` | CopyableProfileUrlView | `@react-native-clipboard/clipboard`. |
| `ShareSheet` (UIActivityViewController) | Blog share | `Share.share({message, url})`. |
| CoreLocation `UserLocationService` (denied/timeout/outside-TR states) | GarageView stations | `react-native-geolocation-service` / expo-location; reproduce the 4 error branches and Turkey-bounds check; Settings deep link via `Linking.openSettings()`. |
| Apple/Google/Yandex Maps `Link` deep links | Station directions | `Linking.openURL` with `comgooglemaps://`/https Google Maps universal link, `yandexnavi://`, and `maps.apple.com` (iOS) / `geo:` (Android). |
| `Menu` pickers (city/district), `.menu` Picker (car select) | Garage, consumption, MTV | Action-sheet or bottom-sheet select component (`WebFilterField` equivalent: searchable select modal). |
| SwiftUI `Slider` step 5/1/10 | Consumption, garage calculator | `@react-native-community/slider` with matching min/max/step/tint. |
| Segmented `Picker(.segmented)` | Consumption mode | `SegmentedControl` or custom 2-button pill (MTV screen already uses custom buttons — reuse that pattern for both). |
| `TabView(.page)` carousel | Blog headline carousel | `react-native-pager-view` or FlatList paging with dots. |
| `Timer.scheduledTimer` 4s ticker | Blog gündem ticker | `setInterval` in `useEffect` (clear on unmount — note iOS code leaks this timer; fix in RN). |
| `AsyncImage` | everywhere | `expo-image`/`FastImage` with placeholder color `stone100`. |
| `@Observable` stores + bindings | all | Zustand/Redux slices: `navigation` (currentView, overlay, drawer, searchModal, comparePanel, pageLoadingMessage, compareList), `auth` (user, favorites, garage, pending onboarding flags, toasts), `preferences` (5 booleans in AsyncStorage), `campaigns`. |
| UserDefaults persistence (`LocalAuthSession`, prefs, popup dismissal keys) | auth/prefs/campaigns | AsyncStorage (or MMKV); keep key semantics: session restore on cold start, per-day popup dismiss key `otomenzil.popup.dismissed.<id>.<date>`. |
| `.ultraThinMaterial` blur scrims | drawer, modals, tab bar | `expo-blur`/`@react-native-community/blur` or 40–60% black overlay fallback. |
| `safeAreaInset(edge: .bottom)` floating tab bar | shell | Absolute-positioned capsule bar with `useSafeAreaInsets().bottom + 6` padding; hide per the visibility rule list in 5.1. |
| `presentationDetents([.medium, .large])` | Google sheet | `@gorhom/bottom-sheet` snap points 50%/90%. |
| WP nonce + cookie session + bearer token triple auth | APIClient | Axios instance with cookie jar behavior isn't automatic in RN; rely on the REST token (`Authorization`) + nonce body field; port `fetchAuthNonce` (REST `auth/nonce`, ajax fallback) and the 900s TTL cache. |
| `redacted`-style optimistic UI (like button, setPrimary) | blog like, garage | Same optimistic update + rollback on rejected promise. |
| SF Symbols | all icons | Map to Lucide (`lucide-react-native`) — the web app already uses Lucide; navbar/drawer icons already have Lucide equivalents (search, user, menu, sun, moon drawn by hand in iOS). |
| `AuraLoadingView` animated bars/aurora | boot + page loading | `react-native-reanimated` loop animations (7 bars, staggered 0.55–0.9s ease, random peaks; 3 blurred drifting circles). |

**Porting priorities / gotchas**
1. All calculator constants (MTV tiers, BDDK tiers, ÖTV thresholds, charge-port caps) are business data embedded in the client — extract into a shared `constants/` TS module, values verbatim from this doc.
2. Auth onboarding chain must be preserved: register → garage onboarding; Google → (username setup →) garage onboarding; flags gate the bottom tab bar.
3. `AuthLaunchView` is a cold-start gate, not a route: show over the shell until login or "Ziyaretçi olarak devam et".
4. Slug normalization regexes must match server expectations exactly: `lowercase`, `[^a-z0-9-]+ → -`, collapse `-{2,}`, trim `-`, min length 3.
5. Legal pages fetch from the generic WP REST (`wp/v2/pages`) — different base path than everything else (`otomenzil/v1`).
6. Dark mode is app-managed (not system): persist boolean, feed it to WebView CSS template and `color-scheme` meta.
