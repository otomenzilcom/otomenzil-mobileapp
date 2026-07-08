# 04 — Components, Business-Logic Utils, Theme (iOS → React Native spec)

Source: `/Users/kadirdeniz/code/otomenzil-ios/OtoMenzil/` (`Components/`, `Utils/`, `Theme/`, `Resources/`).
All Turkish strings are exact and must be preserved verbatim. All numeric constants are load-bearing — port 1:1.

---

## 1. THEME

### 1.1 Dark-mode mechanism (`Theme/AppTheme.swift`, `Theme/ThemeObserver.swift`, `Store/AppPreferencesStore.swift`)

- Storage key: `"otomenzil.pref.darkMode"` (`AppTheme.darkModeStorageKey`), persisted in `UserDefaults` (default: `false` = light). `AppPreferencesStore.useDarkMode` writes UserDefaults + calls `AppTheme.syncDarkMode(_:)` on every change.
- `AppTheme` is a **global mutable singleton**: `AppTheme.isDark: Bool` is set via `syncDarkMode`. Every dynamic token is a computed property that reads `isDark` (NOT SwiftUI environment). `ThemeTokenReader` (ThemeObserver.swift) wraps the root view: reads `preferences.useDarkMode`, calls `syncDarkMode`, and forces `\.colorScheme` to `.dark`/`.light` so the whole subtree re-evaluates. `AppShellView` additionally sets `.preferredColorScheme(...)` and re-syncs in `.onChange(of: preferences.useDarkMode)`.
- **RN mapping:** a theme context/hook (`useTheme()`) returning a resolved token object keyed by `isDark`, persisted in AsyncStorage/MMKV under the same key. No system-scheme following — the toggle is fully manual, default light.

### 1.2 Color tokens — exact values

Static (same in both modes):

| Token | Hex |
|---|---|
| `emerald400` | `#34D399` |
| `emerald500` | `#16A34A` |
| `emerald600` | `#15803D` |
| `emerald700` | `#166534` |
| `emerald800` | `#065F46` |
| `emerald950` | `#022C22` |
| `emerald250` | `#A7F3D0` |
| `emerald` (alias) | = `emerald600` = `#15803D` |
| `stone950` | `#0C0A09` |
| `red600` | `#DC2626` |
| `sky500` | `#0EA5E9` |
| `amber200` | `#FDE68A` |
| `amber800` | `#92400E` |
| `rose500` | `#F43F5E` |

Dynamic tokens (dark value / light value):

| Token | Dark | Light |
|---|---|---|
| `emerald50` | `#022C22` @ 40% | `#ECFDF5` |
| `emerald100` | `#065F46` @ 55% | `#D1FAE5` |
| `tabBarActiveBackground` | `#022C22` @ 40% | `emerald50` (`#ECFDF5`) |
| `tabBarActiveForeground` | `#34D399` | `#15803D` |
| `tabBarInactiveForeground` | `#EEF0F3` | `stone900` (light = `#1C1917`) |
| `tabBarSurface` | `cardBackground` @ 90% (`#1A1D22`) | white @ 90% |
| `tabBarBorder` | `border` @ 80% (`#2F3540`) | `#E5E7EB` @ 70% |
| `drawerMutedHeader` | `#22262C` @ 50% | `stone50` @ 50% (`#FAFAF9`) |
| `pageBackground` | `#0F1114` | `#F4F5F7` |
| `detailBackground` | `#0F1114` | `#F8F9FC` |
| `inputBackground` | `#22262C` | `#F8F9FA` |
| `heroBackground` | `#1A1D22` | `#FFFFFF` |
| `cardBackground` | `#1A1D22` | `#FFFFFF` |
| `navBackground` | `#1A1D22` | `#FFFFFF` |
| `elevatedSurface` | `#22262C` | `#F1F5F9` |
| `border` | `#2F3540` | `#E5E7EB` |
| `borderLight` | `#252A32` | `#F3F4F6` |
| `subnavBackground` | `#1A1D22` @ 95% | `#FAFAF9` @ 50% |
| `sky50` | `#0C4A6E` @ 35% | `#F0F9FF` |
| `amber50` | `#78350F` @ 35% | `#FFFBEB` |
| `dangerBackground` | `#450A0A` @ 45% | `#FEF2F2` |
| `dangerBorder` | `#7F1D1D` | `#FECACA` |
| `dangerForeground` | `#FCA5A5` | `#DC2626` |
| `garageTintBackground` | `#4C0519` @ 35% | `#FFF1F2` |
| `garageTintBorder` | `#881337` | `#FECDD3` |
| `inverseButtonBackground` | `#E7E5E4` | `stone950` (`#0C0A09`) |
| `inverseButtonForeground` | `stone950` | white |
| `heroOverlayFill` | white @ 8% | white @ 5% |
| `heroOverlayStroke` | white @ 14% | white @ 10% |
| `galleryControlBackground` | `cardBackground` @ 96% | white @ 95% |
| `imagePlaceholder` | `stone100` (dark = `#2A3038`) | `#E7E5E4` |
| `scrim` | black @ 55% | `#0C0A09` @ 60% |

**Stone scale — INVERTED in dark mode** (dark / light). This is the key trick: `stone900` is a *text* color that flips to near-white in dark mode.

| Token | Dark | Light |
|---|---|---|
| `stone900` | `#F5F5F4` | `#1C1917` |
| `stone850` | `#E7E5E4` | `#292524` |
| `stone800` | `#D6D3D1` | `#292524` |
| `stone750` | `#A8A29E` | `#44403C` |
| `stone700` | `#D6D3D1` | `#44403C` |
| `stone650` | `#A8A29E` | `#57534E` |
| `stone600` | `#A8A29E` | `#57534E` |
| `stone550` | `#78716C` | `#78716C` |
| `stone500` | `#78716C` | `#78716C` |
| `stone450` | `#57534E` | `#A8A29E` |
| `stone400` | `#57534E` | `#A8A29E` |
| `stone300` | `#44403C` | `#D6D3D1` |
| `stone100` | `#2A3038` | `#F5F5F4` |
| `stone50` | `#22262C` | `#FAFAF9` |

### 1.3 Radii, gradients, shadows

- `cardRadius = 24`, `innerRadius = 16`, `buttonRadius = 12`. Other recurring literals: 10 (small badges/back button), 12, 14, 16, 18 (toast), 28 (legal hero card), capsules for pills.
- `heroGradient`: linear `#15803D → #14B8A6`, left → right.
- Legal hero top strip gradient: `emerald500 → emerald400 → #2DD4BF` (leading→trailing, 4pt height).
- Card shadow conventions: `black @ 3–4%`, radius 2–8, y 1–3 (very subtle). Toast: `black @ 35%`, radius 20, y 10.
- Spacing conventions: screen horizontal padding 16; card padding 14–16; VStack spacing 8/10/12/16; pill paddings h:10–12 v:4–6.

### 1.4 Fonts (`Theme/AppFont.swift`, `Resources/Fonts/`)

- Only ONE font file ships: `Outfit-Regular.ttf` (110 KB), registered at runtime via `CTFontManagerRegisterFontsForURL`. `AppFont.outfit(size:weight:)` = `Font.custom("Outfit", size:).weight(w)` — i.e. weights are **synthesized** by the system from the single Regular file. Weights used all over: `.regular, .medium, .semibold, .bold, .heavy, .black`.
- `Font.web(size:weight:)` is an alias for the Outfit font; `View.webFont(_:weight:)` convenience; `View.webTypography()` sets the environment default font to `web(size: 16)` (applied once at the app shell root).
- Many components also use `.system(size:weight:)` (SF Pro) — components mix `.web` and `.system` fonts; when porting, treat `.system(...)` as the platform default font and `.web(...)` as Outfit. In practice on RN, using Outfit (400/500/600/700/800/900 static files) everywhere is the closest match to web parity; letter-spacing (`tracking`) values used: 0.4, 0.5, 0.8, 1, 1.2, 1.4.
- **RN mapping:** bundle Outfit variable font or the 6 static weights via `expo-font`; map `weight: black → 900, heavy → 800, bold → 700, semibold → 600, medium → 500`.

### 1.5 Shared theme-level components (defined in AppTheme.swift)

- **`WebEmeraldBadge(text)`** — uppercased text, Outfit 10/black, tracking 0.8, color `emerald700`, padding h12 v6, bg `emerald50`, capsule stroke `emerald100`.
- **`WebSectionHeader(badge, title, subtitle?)`** — badge uppercased 10/black tracking 1 `emerald600`; title 24/black `stone900`; subtitle 13/medium `stone500`.
- **`WebPrimaryButton(title, action)`** — uppercased 11/black tracking 1.2 white on `emerald600`, full width, v-padding 14, radius `innerRadius`(16).
- **`WebCardAccentBar(width=5, color=emerald500)`** — vertical rounded (r=2) bar.
- **`WebGarageButton`** (alias `WebFavoriteButton`) — heart button, two variants:
  - `.overlay`: 32×32 circle, `cardBackground @ 95%`, stroke `border`, shadow black@6% r2 y1; icon `heart.fill`/`heart`; active color `#F43F5E`, inactive `stone400`; busy → spinner tinted `#E11D48`, scale 0.94. Spring animation (response 0.28, damping 0.72) on `busy`/`isFavorite`.
  - `.compact`: full-width pill (radius 12, v-pad 8) with heart icon 11/bold + label 10/black uppercased. Active: fg `#E11D48`, bg `garageTintBackground`, stroke `garageTintBorder`. Labels: guestHint → **"Giriş Yapın"**; favorite → **"Garajda"**; else **"Garaja Ekle"**. Below, if `guestHint`: 9/bold `#E11D48` centered text **"Garaj özelliği üyelere özel — giriş yapın."**
- **`WebFavoriteOverlayButton`** — same as overlay garage button but star (`star.fill`/`star`), active color `#F59E0B` (amber), busy spinner tinted `#F59E0B`.

---

## 2. BUSINESS-LOGIC UTILS (port formulas 1:1)

### 2.1 `MtvCalculator.swift` — Turkish EV MTV (motor vehicle tax), reference year **2026**

Types: `MtvAgeGroup` (raw: `"1-3" | "4-6" | "7-11" | "12-15" | "16+"`; labels: `"1–3 yaş"`, `"4–6 yaş"`, `"7–11 yaş"`, `"12–15 yaş"`, `"16 yaş ve üzeri"`; multipliers **1 / 0.75 / 0.5 / 0.35 / 0.2**), `MtvPowerTier {id, label, minKw, maxKw?, brackets: [{maxMatrah?, amountTry}]}`.

**Power tiers with full bracket table (TRY amounts):**

| Tier id | label | kW range | brackets (maxMatrah → amountTry) |
|---|---|---|---|
| `0-70` | "70 kW ve altı" | 0–70 | ≤309,100 → 1,437; ≤541,500 → 1,579; else → 1,725 |
| `71-85` | "71 – 85 kW" | 71–85 | ≤309,100 → 2,504; ≤541,500 → 2,755; else → 3,007 |
| `86-105` | "86 – 105 kW" | 86–105 | ≤775,100 → 4,868; else → 5,312 |
| `106-120` | "106 – 120 kW" | 106–120 | ≤775,100 → 7,669; else → 8,368 |
| `121-150` | "121 – 150 kW" | 121–150 | ≤775,100 → 11,963; else → 13,053 |
| `151-180` | "151 – 180 kW" | 151–180 | ≤968,100 → 11,506; else → 12,554 |
| `181-210` | "181 – 210 kW" | 181–210 | ≤1,937,500 → 16,043; else → 17,504 |
| `211-240` | "211 – 240 kW" | 211–240 | ≤1,937,500 → 24,436; else → 26,660 |
| `241+` | "241 kW ve üzeri" | ≥241 | ≤3,101,800 → 38,421; else → 41,917 |

Helpers:
- `hpToKw(hp) = round(hp * 0.7457 * 10) / 10` (1 decimal, half-up).
- `estimateTaxBase(price) = round(price / 1.32)` (price ≤ 0 → 0). (Strips ~18% KDV + ~10% ÖTV back out of retail.)

`calculate(motorPowerKw, modelYear, taxBaseTry, registrationYear)`:
1. `usesMatrahTier = registrationYear >= 2018`.
2. `ageGroup`: `age = max(0, 2026 - modelYear)`; 0–3 → 1-3, 4–6, 7–11, 12–15, else 16+.
3. `powerTier`: first tier where `minKw <= kw <= maxKw` (kw clamped ≥ 0; open-ended last tier); fallback last tier.
4. Bracket: if `!usesMatrahTier || taxBaseTry <= 0` → first bracket, label `"Matrah bilgisi yok — alt dilim"` (or `"2018 öncesi tescil (matrah uygulanmaz)"` when pre-2018). Else scan brackets in order: `taxBase <= maxMatrah` → that bracket with label `"<maxMatrah formatted> TL'ye kadar matrah"`; nil-maxMatrah bracket → label `"<prevMax+1 formatted> TL üzeri matrah"` (or `"En üst matrah dilimi"`). Number formatting = tr_TR grouping (e.g. `309.100`).
5. Outputs: `annualMtvTry = round(baseAmount * ageMultiplier)`; `installmentMtvTry = round(annual / 2)`; `estimatedIceMtvTry = annual * 4` (ICE-equivalent estimate — EVs pay 25% of ICE); plus ageGroup, vehicleAge, powerTier, bracket label, base amount, multiplier.

### 2.2 `OtvCalculator.swift` — ÖTV (special consumption tax) estimator, 2026 constants

- `matrahThreshold2026 = 1_650_000` TL; `disabledExemptionLimit2026 = 2_873_972` TL.
- `powerKw(fromHp) = hp * 0.7457` (no rounding).
- **Rate band** (`rateBand(powerKw, matrah)`): if `powerKw <= 160` → matrah > threshold ? **55** : **25**; else (>160 kW) → matrah > threshold ? **75** : **65**. (Percent integers.)
- `estimateMatrahAndRate(retailPrice, powerHp)` — fixed-point iteration, start `otvRate = 25`, loop **4 times**: `matrah = retailPrice / ((1 + rate/100) * 1.2)` (the 1.2 = 20% KDV), then `rate = rateBand(kw, matrah)`. After loop compute final matrah with the settled rate. Returns `(matrah, otvRate, powerKw rounded to Int)`.
- `meetsLocalProduction(brand, model)` — locally-produced EV whitelist (case-insensitive brand equality after trim/lowercase; model matched by case-insensitive substring; optional exclude substring):
  - `togg` + "T10"; `citroën`/`citroen` + "C3" excluding "aircross"; `dacia` + "Spring"; `renault` + "Spring"; `mg` + "MG4"; `fiat` + "500".

### 2.3 `VehicleLoanCalculator.swift` — BDDK vehicle loan limits + annuity

- `LoanVehicleCategory`: `domestic_ev` ("Yerli Tam Elektrikli") | `standard` ("Standart Taşıt").
- **Standard tiers** (maxPrice / LTV% / max term months / label):
  - 400,000 / 70 / 48 / "0 – 400.000 TL"
  - 800,000 / 50 / 36 / "400.001 – 800.000 TL"
  - 1,200,000 / 30 / 24 / "800.001 – 1.200.000 TL"
  - 2,000,000 / 20 / 12 / "1.200.001 – 2.000.000 TL"
- **Domestic EV tiers**:
  - 2,500,000 / 70 / 48 / "0 – 2.500.000 TL (Yerli EV)"
  - 5,000,000 / 50 / 36 / "2.500.001 – 5.000.000 TL (Yerli EV)"
  - 6,500,000 / 30 / 24 / "5.000.001 – 6.500.000 TL (Yerli EV)"
  - 7,500,000 / 20 / 12 / "6.500.001 – 7.500.000 TL (Yerli EV)"
- `getBddkLimits(price, category)`: price ≤ 0 → not available, tierLabel "—", note "Araç fiyatı girin.". price > last tier max → creditAvailable=false, tierLabel `"Kredi limiti dışı"`, minDownPayment = price, note: EV → `"7.500.000 TL üzeri yerli EV araçlarda taşıt kredisi kullanılamaz (BDDK)."`, standard → `"2.000.000 TL üzeri araçlarda taşıt kredisi kullanılamaz (BDDK)."`. Otherwise first tier with `price <= maxPrice`; `maxLoan = floor(price * ltv / 100)`; `minDown = max(0, price - maxLoan)`; note `"Bu dilimde en fazla %{ltv} kredilendirme ve {term} ay vade uygulanır."`.
- `calculate(principal, downPayment, annualRatePercent, termMonths, category)`:
  - If credit unavailable → zeros + warning = limits.note (fallback "Taşıt kredisi kullanılamaz.").
  - `adjustedLoan = max(0, principal - downPayment)`, clamped to `maxLoanAmount` (warning `"Kredi tutarı BDDK limiti olan {formatTL} ile sınırlandı."`).
  - `adjustedTerm = max(1, termMonths)`, clamped to `maxTermMonths` (warning `"Vade, bu fiyat dilimi için izin verilen {n} ay ile sınırlandı."`).
  - If `downPayment < minDownPayment` → warning `"Minimum peşinat en az {formatTL} olmalı."` (informational; does not block).
  - Annuity: `r = annualRatePercent / 100 / 12`; if `r <= 0` → `monthly = loan / term`; else `f = (1+r)^term`, `monthly = loan * r * f / (f - 1)`. `total = monthly * term`; `interest = total - loan`. No rounding applied to monthly/total (format at display).

### 2.4 `ChargingSimulator.swift` + `ChargerType` — detail-page charge simulator

`ChargerType` (id = rawValue): `house`("Ev Standart Priz", 2.3 kW, AC, "Monofaze ev prizi — acil durumlar için."), `wallbox`("Akıllı Wallbox", 11 kW, AC, "11 kW korumalı ev/işyeri wallbox."), `publicAC`("Halka Açık AC", 22 kW, AC, "AVM ve otopark AC soketleri."), `fastDC`("DC Hızlı Şarj", 50 kW, DC, "50 kW hızlı DC istasyon."), `ultraDC`("DC Ultra Hızlı", 150 kW, DC, "150+ kW otoyol ultra hızlı şarj.").

- `effectivePowerKw(for car)`: AC → `min(power, 11)` (yes: publicAC 22 kW clamps to 11 — onboard charger cap). DC → `min(power, maxDcKw(car))` with **hardcoded per-car DC caps by car.id**: `porsche-taycan` 270, `tesla-model-y` 250, `kia-ev6`/`hyundai-ioniq-5` 233, `bmw-i4` 205, `byd-seal` 150, `mg-mg4` 135, default **150**.
- `estimateMinutes(batteryKwh, startPercent, targetPercent, chargerPowerKw)`: guard all > 0 and target > start else 0. `energy = battery * (target-start)/100`; `taper = target > 80 ? 1.35 : 1.0`; `minutes = energy / power * 60 * taper`.
- `formatDuration(minutes)`: round to Int; < 60 → `"{n} dk"`; else h/m: `"{h} sa"` or `"{h} sa {m} dk"`.

### 2.5 `GarageChargeCalculator.swift` — garage screen port simulator

- `defaultPorts`: `ac-22` "Type 2 · 22 kW" (22, ac); `dc-50` "CCS2 · 50 kW"; `dc-120` "CCS2 · 120 kW"; `dc-180` "CCS2 · 180 kW"; `hpc-300` "CCS2 · 300 kW" (300, hpc).
- `estimateDcMaxKw(car)` from `car.chargingMin` (10–80% DC minutes): nil/≤0 → 120; ≤22 → 250; ≤30 → 180; ≤40 → 150; ≤50 → 120; else 100.
- `calculate(car, port, startPercent, targetPercent)`:
  - `battery = car.batteryKwh ?? 65`; `rangeKm = car.rangeKm ?? 400`; `delta = max(0, target - start)`.
  - `energy = round(battery * delta / 100 * 10) / 10` (1 decimal).
  - Effective speed: ac → `min(22, port.power)`; dc → `min(dcMax, port.power, 120)`; hpc → `min(dcMax, port.power, 300)`.
  - `duration = round(energy / max(speed,1) * 60)` minutes; if mode != ac and target > 80: `duration += Int((target - 80) * 1.1)`; if `duration < 5 && energy > 0` → duration = 10.
  - `rangeGained = round(energy * rangeKm / battery)`.
  - Output `GarageChargeSession {energyKwh, durationMins, rangeGainedKm, effectiveSpeedKw}`.

### 2.6 `EngineeringLabSimulator.swift` — real-range lab (temperature × route)

- Inputs: `Temperature: cold | mild`, `Route: city | hwy | combined`. Key matrix → spec keys: `(cold,city)→rangeCityCold/consCityCold`, `(cold,hwy)→rangeHwyCold/consHwyCold`, `(cold,combined)→rangeCombinedCold/consCombinedCold`, `(mild,*)→rangeCityMild/consCityMild`, `rangeHwyMild/consHwyMild`, `rangeCombinedMild/consCombinedMild`.
- Value resolution order: 1) `car.techSpecs[key]` (int, double→Int, or digits-only from string), 2) `CarTechSpecBuilder.labNumericValue` (manual then auto-derived, see 3.4), 3) defaults `range = car.rangeKm ?? 0`, `consumption = 170` Wh/km.

### 2.7 `CarPriceFormatter.swift`

- TRY formatter: `tr_TR` locale, currency TRY, **0 fraction digits** (output like `₺1.234.567`).
- `isAvailableInTurkey(trAvailable)` = `trAvailable != false` (nil counts as available).
- `primaryPriceText(priceTL, priceForeign, trAvailable)`: available → priceTL>0 formatted else **"Fiyat bilgisi yok"**; not available → trimmed `priceForeign` or **"Yurt dışı fiyat bilgisi yok"**.
- `showsForeignBadge` = `!isAvailableInTurkey`. `formatTL(amount)` = same formatter.
- Protocols `CarPricing` (`priceTL, priceForeign, trAvailable`) and `CarSpecs` (`rangeKm, batteryKwh, powerHp, accelerationSec`) adopted by `CarSummary` & `CarDetail`.

### 2.8 `BlogTocExtractor.swift`

- `extract(content)`: HTML detection regex `<(?:p|h[1-6]|table|figure|div|ul|ol|blockquote)\b` → HTML path, else Markdown path.
- Markdown: line-by-line, `#`–`####` prefixes → level 1–4.
- HTML: regex `<h([1-4])(?:\s[^>]*)?>([\s\S]*?)<\/h\1>` case-insensitive; inner HTML → strip tags (`<[^>]+>` → space), collapse whitespace, trim.
- **Heading id slug** (must match web `addHeadingIdsToHtml`): lowercase → diacritic-fold with `tr_TR` locale → remove `[^a-z0-9\s-]` → whitespace → `-` → trim `-`; empty → `"baslik"`; duplicates → `base-2`, `base-3`, …
- `injectHeadingIds(into:items:)`: regex `<h([1-4])(\s[^>]*)?>` matched over the doc; iterates matches **in reverse**, pairing with items from the end; skips headings that already contain `id=`; inserts ` id="{slug}"` into the opening tag.

### 2.9 `EpdkStationsData.swift` — EPDK charging stations (see also §5)

Model `EPDKStation {id, epdkId, operatorName, operatorKey, stationName, city, district, latitude, longitude, address, sockets[], hasAc, hasDc, hasHpc, maxPowerKw, serviceType?, phone?}`; `EPDKSocket {type, powerKw, count, socketNumbers[]}`.

- **Operators directory** (static): ZES (Zorlu Energy) 0850 339 99 37 zes.net; Eşarj (Enerjisa) 0850 433 72 75 esarj.com; Trugo (Togg) 0850 250 86 44 trugo.com.tr; Astor Enerji Şarj 0850 308 30 06 astorsarj.com.tr; Voltrun 0850 460 63 33 voltrun.com; Sharz.net 0850 840 85 85 sharz.net.
- Power inference `inferSocketPowerKw(socket, station)` when `socket.powerKw == 0`: type contains "TYPE 2"/"TYPE2" → 22; "CHADEMO" → 50; "CCS" → station.hasHpc ? 180 : 120; else hasAc&&!hasDc → 22; hasHpc → 180; hasDc → 120; fallback 22.
- `isStationPowerVerified` = station.maxPowerKw > 0 or any socket.powerKw > 0. `officialMaxPowerKw` = maxPowerKw or max socket power (0 fallback); label `"{kw} kW"` else **"Belirtilmemiş"**. `effectiveMaxPowerKw` uses inference.
- Turkey bounding box everywhere: `lat ∈ [35.5, 42.5]`, `lng ∈ [25.0, 45.0]`.
- `distanceKm` = CoreLocation great-circle distance / 1000 (RN: haversine). `formattedDistance`: <1 km → `"%.0f m"`, else `"%.1f km"`.
- `stationsNear(lat, lng, from, limit=6, maxDistanceKm=120)`: filter in-Turkey → map to (station, km) → filter ≤ max → sort asc → prefix limit.
- `resolveCityFromCoords`: nearest of **81 hardcoded province centroids** (list at `EpdkStationsData.swift:473-501` — port verbatim; e.g. ("Ankara", 39.93, 32.86), ("İstanbul", 41.01, 28.97)); default "İstanbul".
- `resolveDistrictFromNearbyStations`: pool = same-city stations (fallback all); take up to 12 nearest within 40 km; weighted vote per district (≤8 km → 3, ≤20 km → 2, else 1); highest score wins; fallback to nearest station ≤40 km; then normalize against official list (case-insensitive `tr_TR` compare).
- `resolveCityDistrictFromGeoAsync`: if district empty → reverse-geocode via **Nominatim** `https://nominatim.openstreetmap.org/reverse?lat&lon&format=json&accept-language=tr&zoom=12&addressdetails=1` with UA `OtoMenzil-iOS/1.0`; district = first non-empty of `city_district, town, suburb, county, municipality`.
- `stationMatchesDistrict`: exact city match required; district "Tümü" → true; else exact district match OR diacritic-insensitive lowercase (`tr_TR` folding) `contains` over `"{district} {stationName} {address}"`.
- `parseDistrictFromAddress(address, city)` heuristics: address must contain "/", split; last part must equal city (case-insens., ≥3 chars, not numeric); the part before it is district candidate (reject if >40 chars or contains " - "); strip leading numeric tokens; take last token; reject numeric/empty/>24 chars and blacklist `["Merkez","Türkiye","Turkiye","Bölge","Evleri","Kisim","Ac","Vzx"]`.
- Map URLs: Google `https://www.google.com/maps/dir/?api=1&destination=lat,lng[&origin=...]`; Yandex `https://yandex.com.tr/maps/?rtext=[origin~]dest&rtt=auto`; Apple `https://maps.apple.com/?daddr=lat,lng&dirflg=d`.
- **`StationCalculator`** (same file): preset vehicles — togg-t10x "Togg T10X Long Range" 88.5 kWh / 180 kW dc; tesla-my "Tesla Model Y LR" 75 / 250; hyundai-ioniq5 "Hyundai Ioniq 5" 77.4 / 233; byd-atto3 "BYD Atto 3" 60.5 / 115; custom "Özel Araç" 65 / 150. `chargeDurationMinutes = max(10, (battery * max(0, target-start)/100) / max(1, power) * 60)`.

### 2.10 `CarSearchEngine.swift` — catalog filter/sort

- `CarCatalogLayout`: `grid | list`. `CarSortOption` raw values & labels: `newest` "Son Eklenen", `popular` "Tavsiye Edilen (Popülarite)", `price_asc` "Fiyat: Artan (Ekonomik)", `price_desc` "Fiyat: Azalan (Premium)", `range_desc` "Menzil (En Yüksek)", `acceleration_asc` "Sıfırdan En Hızlı".
- Constants: `defaultPriceFloor = 1_000_000`, `defaultPriceCeiling = 6_000_000`, `pageSize = 15`.
- `comparablePrice(car)`: TR-available with price>0 → priceTL; else `Double(rangeKm ?? 0)` (fallback proxy so foreign cars sort by range).
- `filter(cars, brand, bodyType, query, minPrice, maxPrice, minRange, minBattery, drive)`:
  - brand/bodyType: `"all"` = no filter, else exact equality.
  - minRange > 0 → `(rangeKm ?? 0) >= minRange`; minBattery > 0 → `(batteryKwh ?? 0) >= minBattery`.
  - drive != "all" → `driveType ?? ""` localizedCaseInsensitiveContains(drive).
  - Price only "active" when `minPrice > floor || maxPrice < ceiling`; then applied ONLY to TR-available cars with price > 0 (foreign cars always pass).
  - Query: trimmed lowercased; haystack = `brand + " " + model + " " + bodyType + " " + segment + " " + displayTitle` lowercased; simple `contains`. Note: Swift `lowercased()` is not tr-locale; RN should use plain `.toLowerCase()` for parity.
- `sort`: newest & popular both = popularity desc (`?? 0`); priceAsc/Desc via comparablePrice; rangeDesc `?? 0`; accelerationAsc `?? 999` asc.

### 2.11 `SimilarCarsEngine.swift` — additive score, limit 6

Exclude self; per candidate: `bodyType ==` → **+4**; `segment ==` → **+3**; `driveType ==` → **+1**; `trAvailable ==` → **+1**; same brand → **−1**; plus:
- priceScore(a,b) (both > 0 else 0): `diff = |a-b| / max(a,b)`; ≤0.15 → 3; ≤0.30 → 2; ≤0.45 → 1; else 0.
- rangeScore(a,b) (both > 0 else 0): `diff = |a-b| / max(a,b)`; ≤0.12 → 3; ≤0.25 → 2; ≤0.40 → 1; else 0.
Sort by score desc, tiebreak popularity desc; take first `limit` (default 6).

### 2.12 `ComparisonBuilder.swift`

- Presets (name / desc / ids / icon / badge):
  1. "Milli Mücadele: Togg vs Tesla vs BYD" / "Togg T10X, Tesla Model Y ve BYD Seal yan yana." / `[togg-t10x, tesla-model-y, byd-seal]` / 🇹🇷 / "Popüler Paket"
  2. "800-Volt Premium Süper Şarj Devleri" / "Taycan, Kia EV6 ve Ioniq 5 karşılaştırması." / `[porsche-taycan, kia-ev6, hyundai-ioniq-5]` / ⚡ / "Mühendislik Lideri"
  3. "Fiyat-Performans Elektrikliler" / "Ulaşılabilir fiyatlı modeller." / `[mg-mg4, togg-t10x, byd-seal]` / 💰 / "Bütçe Dostu"
- `criticalRows` (label, CarSummary display field, lowerIsBetter): Fiyat/priceDisplay/**true**; Menzil/rangeDisplay/false; Tüketim/consumptionDisplay/**true**; Batarya/batteryDisplay/false; Güç/powerDisplay/false; DC Süre/chargingDisplay/**true**; 0-100/accelerationDisplay/**true**.
  - Display formats (Models/Car.swift): priceDisplay = formatTL; rangeDisplay `"{km} km"`; batteryDisplay int → `"{n} kWh"` else `"%.1f kWh"`; powerDisplay `"{hp} HP"`; accelerationDisplay `"%.1f sn"`; consumptionDisplay = `battery / range * 100` → `"%.1f kWh/100km"`; chargingDisplay `"{min} dk"`.
- `canonicalCompareIds(ids)` = dedupe non-empty via Set, **sorted** (order-insensitive canonical key).
- FAQ items (Q/A pairs, exact):
  1. "En fazla kaç aracı karşılaştırabilirim?" / "Karşılaştırma robotu aynı anda en fazla 3 modeli yan yana analiz eder."
  2. "WLTP menzil değerleri gerçek hayatta geçerli mi?" / "WLTP laboratuvar referansıdır; sıcaklık ve sürüş profili gerçek menzili değiştirir."
  3. "LFP ve NMC batarya farkı nedir?" / "LFP uzun ömür sunar; NMC enerji yoğunluğu ve soğuk hava performansı avantajlıdır."
  4. "👑 LİDER rozeti nasıl belirlenir?" / "Her parametrede en iyi sayısal değer otomatik işaretlenir."
- `leader(for:keyPath:lowerIsBetter:)`: parse each car's display string → numeric (`parseNumeric`: remove `.` thousand separators, `,`→`.`, keep `[0-9.]`, Double). Need ≥2 parsed values; best = min or max; return the single leader's car id, **nil on ties**.

### 2.13 `CarTechSpecBuilder.swift` — comparison/detail spec table builder

- `excludedCategories = {"Güvenlik Puanları (Euro NCAP)", "Boyutlar ve Ağırlık Seviyeleri"}`; `excludedKeys = {platformName, dedicatedPlatform, turningCircle, roofRails}`.
- `schema(from settings)`: server `comparisonSpecSchema` (categories with non-empty specs) or `defaultSchema` fallback; then exclusion filters.
- `formattedValue(car, key, unit)`: 1) manual value from `car.techSpecs[key]` (string trimmed non-empty; int; double `%.0f`/`%.1f`; bool → "Evet"/"Hayır"); 2) auto-derived; 3) `"—"`. Unit appended only if not already contained in the value string.
- **Auto-derivation table** (key → value):
  - `accel_0_100` → accelerationSec `%.1f`; `maxSpeed` → maxSpeedKmh; `maxPower` → powerHp; `maxTorque` → torqueNm; `batteryTotal` → batteryKwh `%.1f`; `dcTime` → chargingMin; `trunkSpaceMin` → trunkLiters; `warrantyYearsSpec` → warrantyYears; `rangeCombinedMild`/`realAvgRange` → rangeKm.
  - Range multipliers off WLTP `rangeKm`: `rangeCityMild` ×**1.08**; `rangeHwyMild` ×**0.82**; `rangeCityCold`/`rangeCombinedCold` ×**0.78**; `rangeHwyCold` ×**0.68** (Int truncation).
  - `avgCons` = `battery / range * 100` → `%.1f` (kWh/100km); `acPower` = "11"; `acTime` = `battery / 11` → `"%.1f saat"`; `dcMaxPower` = "150"; `dcAvgPower` = "93"; `batteryUsable` (unreachable duplicate case — first `batteryTotal, batteryUsable` case wins, returns total `%.1f`; the later `* 0.93` branch is dead code); `batteryType` = "Li-ion"; `seats` = "5".
- `labNumericValue(car, key)` = digits-only Int from manual, else from auto value.
- `defaultSchema` — 6 categories (exact labels/keys/units), see `CarTechSpecBuilder.swift:144-177`:
  1. "Menzil Tahminleri (İklimsel & Parkur)": rangeCityCold/rangeCityMild/rangeHwyCold/rangeHwyMild/rangeCombinedCold/rangeCombinedMild — labels "Şehir İçi - Soğuk Hava", "Şehir İçi - Ilıman Hava", "Otoyol - Soğuk Hava", "Otoyol - Ilıman Hava", "Karma - Soğuk Hava", "Karma - Ilıman Hava", all unit "km".
  2. "Performans Verileri": accel_0_100 "Hızlanma 0-100 km/s" (sn); maxSpeed "Maksimum Hız" (km/s); maxPower "Maksimum Güç" (nil); maxTorque "Maksimum Tork" (Nm).
  3. "Batarya Detayları": batteryTotal "Tam Dolu Kapasite" (kWh); batteryUsable "Kullanılabilir Kapasite" (kWh); batteryType "Batarya Tipi"; warrantyYearsSpec "Garanti Süresi (Batarya)" (Yıl).
  4. "Şarj - Şebeke (AC)": acPower "AC Şarj Gücü" (kW); acTime "AC Şarj Süresi (%0-%100)".
  5. "Şarj - Hızlı Şarj (DC)": dcMaxPower "Maksimum DC Şarj Gücü" (kW); dcTime "DC Şarj Süresi (%10-%80)" (dk).
  6. "Enerji Tüketimi / Gerçek Tüketim": realAvgRange "Gerçek Ortalama Menzil" (km); avgCons "Ortalama Araç Tüketimi" (Wh/km).

### 2.14 `CarSummaryBuilder.swift` — templated "AI summary" text

`insight(for car, catalog)` → `CarSummaryInsight {lead, body, closing, highlights}`.
- Reference peers: same-segment peers if ≥3, else same-bodyType peers if ≥3, else all peers. `avgRange` = mean of rangeKm; `avgPrice` = mean of priceTL among TR-available.
- `consumption = battery / range * 100` (kWh/100km) if both present.
- `lead` = `"{brand} {model}, {year|—} model {bodyType|—} gövdesiyle {segment|—} segmentinde yer alıyor."`
- `body` joins with " ": rangeComparison + "."; battery sentence (`"{battery,1dp} kWh bataryası[ ve yaklaşık {cons,1dp} kWh/100 km tüketim profili] var; {chargeComparison}."` — else just `"{chargeComparison}."`); power sentence (`"{hp} bg güç[ ve {accel,1dp} sn'lik 0–100 hızlanması] ile {driveTone lowercased}."` — else `"{driveTone}."`).
- Range comparison: no range → "menzil verisi henüz net değil"; no avg → "tek şarjla yaklaşık {n} km menzile ulaşabiliyor"; `diff% = (range-avg)/avg*100`: ≥ +12 → "tek şarjla {n} km menzile çıkıyor; segmentteki benzer modellere göre oldukça iddialı"; ≤ −12 → "menzili {n} km civarında; segment ortalamasının biraz altında kalıyor"; else "{n} km menzille segmentteki rakiplerine yakın bir profil çiziyor".
- Charge comparison (chargingMin): none → "hızlı şarj süresi için net bir tablo henüz yok"; ≤25 → "DC istasyonda 10–80 % aralığını yaklaşık {m} dakikada doldurabiliyor; uzun yolda molaları kısa tutar"; ≤35 → "DC şarjda 10–80 % için {m} dakika civarı beklemek gerekiyor; günlük kullanım için yeterli"; else "DC şarj süresi {m} dakika bandında; planlı molalarla yönetmek daha mantıklı".
- Closing (price): not TR / no price → foreign price? "Türkiye'de satışta görünmüyor; yurt dışı referans fiyatı {foreign} civarında" : "Türkiye fiyat bilgisi katalogda henüz yer almıyor"; no avg → "Türkiye'de {price} TL bandında konumlanıyor"; diff ≤ −10% → "fiyatı {price} TL ile segment ortalamasının altında; bütçe dostu bir seçenek"; ≥ +10% → "{price} TL bandında; segment ortalamasının üzerinde premium bir konumda"; else "{price} TL ile segment fiyat ortalamasına oldukça yakın duruyor". Always appended "." by caller.
- driveTone: AWD/4x4 → "Dört çeker aktarma, karlı yol ve hızlı ivmelenme isteyen sürücülere hitap ediyor"; RWD → "Arkadan itişli yapısı dengeli sürüş ve verim odaklı bir karakter sunuyor"; else → "Önden çekişli düzeni günlük şehir kullanımında pratik bir sürüş sağlıyor".
- Highlights: ("Menzil", "{n} km"), ("Batarya", "{n.1} kWh"), ("DC Şarj", "{n} dk"), ("Güç", "{n} bg") — "—" when missing. Numbers formatted with `tr_TR` NumberFormatter (comma decimal, dot thousands).

### 2.15 `SiteBootstrap.swift` — NavigationDefaults / NavIconHelper / PopularDuelsBuilder / SiteDataEnricher

**NavigationDefaults.navigation** (fallback nav payload; NavItem = {id, label, title?, icon, badge?}):
- `primary`: home "Ana Sayfa" (home) · search "Elektrikli Araçlar" (car) · compare "Karşılaştırma" (compare) · blog "Haber" (blog).
- `secondary`: stations "Şarj İstasyonları" (zap, badge "Harita & Tarifeler") · brands "Elektrikli Araç Markaları" (globe, "Tüm Liste") · consumption "Menzil Hesaplama" (zap, "Hesaplama") · trunk "Bagaj Hacmi En Geniş Elektrikli Araçlar" (layers, "Sıralama") · otv "Elektrikli Araçlar ÖTV Muafiyeti" (landmark, "2026 Limit") · mtv "Elektrikli Araç MTV Hesaplama" (lira, "2026 MTV") · vehicle-loan "Elektrikli Araç Taşıt Kredisi" (landmark, "BDDK").
- `heroQuickLinks`: mtv "Vergi"/"Elektrikli Araç MTV Hesaplama" · otv "Mevzuat"/"Elektrikli Araçlar ÖTV Muafiyeti" · vehicle-loan "Finans"/"Elektrikli Araç Taşıt Kredisi" (calculator) · compare "Analiz"/"Elektrikli Araç Karşılaştırma" · stations "Şarj"/"Harita & Tarifeler".
- `rankedGuides`: best-cars "Rehber"/"En İyi Elektrikli Araçlar" (trophy) · longest-range "Menzil"/"En Uzun Menzilli Elektrikli Araçlar" (battery) · lowest-consumption "Verim"/"En Az Yakan Elektrikli Araçlar" (gauge) · trunk "Bagaj"/"Bagaj Hacmi En Geniş Elektrikli Araçlar" (layers).
- `NavIconHelper.systemName` maps web icon tokens → SF Symbols: home→house.fill, car→car.fill, compare→arrow.left.arrow.right, blog→book.fill, zap→bolt.fill, globe→globe, layers→square.stack.3d.up.fill, landmark→building.columns.fill, lira→turkishlirasign.circle.fill, calculator→function, trophy→trophy.fill, battery→battery.100, gauge→gauge.with.dots.needle.67percent, default→chevron.right. (RN: map to lucide-react-native — home, car, arrow-left-right, newspaper, zap, globe, layers, landmark, calculator, trophy, battery, gauge.)

**PopularDuelsBuilder.build(cars, count=4)**:
- Rotating tags: ["En Sık Karşılaştırılanlar", "Segment Liderleri", "Popüler Seçim", "Rakip Modeller"] (`tag = tags[i % 4]`).
- Group by non-empty bodyType; per group ≥2, sort by popularity desc, create adjacent pairs (up to `min(count-1, 3)` pairs → indices 0..min(n-1,3)), score = pop1 + pop2, matchReason "Aynı kasa tipi". If no candidates: global popularity sort, adjacent pairs, matchReason "Popüler modeller".
- Dedupe by sorted `id1|id2` key; sort candidates by score desc; take `count`. Duel: `id = "duel-{id1}-{id2}"`, `title = "{brand1} vs {brand2}"`, cars carry {id, name=displayTitle, brand, rangeKm, priceTL}.

**SiteDataEnricher**:
- `buildSpotlightCards(cars, existing)`: keep server-provided if non-empty. Else 3 defaults: (`porsche-taycan`, "Menzil Şampiyonu", "720 km", tone "emerald"), (`togg-t10x-4more`, "Milli Gurur — En Popüler", "88.5 kWh", "stone"), (`byd-seal`, "%10 ÖTV Güvenceli", "%10 ÖTV", "rose"). Car lookup: exact id → id-contains-first-token fallback → first car. Badge overrides: label contains "Menzil" → `"{rangeKm} km"`; default badge contains "kWh" → `"%.1f kWh"` from battery.
- `buildBodyTypeCounts(cars, existing)`: keep existing; else count non-empty bodyTypes, sort count desc.
- `parseLogoURL(html)` / `parseTagline(html)`: regex `window\.otomenzilData\s*=\s*(\{.*?\});` on site HTML, JSON-parse the `{...}` slice, read `themeSettings.general_logo_url` (http→https forced) / `themeSettings.general_tagline`.

---

## 3. LOCATION & STATION DATA LIFECYCLE

### 3.1 `UserLocationService.swift`

- `@Observable` CoreLocation wrapper; accuracy `kCLLocationAccuracyNearestTenMeters`; single-shot `requestLocation()` after `requestWhenInUseAuthorization()`.
- Feedback enum: `success(lat,lng) | denied | timeout | outsideTurkey | unavailable(String)`.
- Flow: `request(withFeedback:handler:)` resets flags → status notDetermined → prompt; authorized → request location; denied/restricted → `authorizationDenied = true`, feedback `.denied`; unknown → `.unavailable("Konum servisi kullanılamıyor.")`.
- **Timeout: 15 s** (`Task.sleep(15_000_000_000)`); if still loading, no coordinate, not denied → `locationUnavailable = true`, feedback `.timeout`.
- On fix: Turkey check `lat ∈ [35.5, 42.5] && lng ∈ [25.0, 45.0]`; inside → store coordinate + `.success`; outside → `outsideTurkey = true`, coordinate = nil, `.outsideTurkey`. Errors with no prior coordinate → `.unavailable(message)`.
- Auth change callback re-triggers `requestLocation` when granted.
- **RN mapping:** `expo-location` — `requestForegroundPermissionsAsync` + `getCurrentPositionAsync({accuracy: Accuracy.High})` wrapped in a 15 s `Promise.race` timeout; replicate the Turkey bounding-box gate and the feedback states.

### 3.2 EPDK station data lifecycle

- **Seed:** bundled `Resources/epdk-stations-seed.json` decoded once into `licensedSeed` (lazy static).
- **Server refresh:** `refreshFromServerIfNeeded()` → `GET {api}/charging-stations` → `{stations: SeedStationDTO[]}`; on success filter to in-Turkey with valid city and store in in-memory `remoteSeedCache` (NOT persisted). Called from: (a) `AppNavigationStore.bootstrap` (once per launch, after shell data), (b) `StationsView.reloadStations()` (manual/pull refresh). No periodic cadence.
- `allStations()`: prefer normalized remote cache **only if** its distinct-city count ≤ 81 (sanity check against corrupt data); else bundled seed.
- City list: dedupe non-empty normalized cities, `localizedCompare` sort. Invalid city names dropped: `{"Türkiye", "Turkiye", ""}`.
- Districts: prefer official list from bundled `turkiye-districts.json` (`[city: [district]]`, case-insensitive tr_TR city match); fallback: distinct station districts + address-parsed districts, sorted.
- `filteredNearbyStations(city, district, lat?, lng?, limit=8)`: filter by city (+district via `stationMatchesDistrict` unless "Tümü"); with coords → `stationsNear` over pool (fallback to all stations if pool empty); without coords → first `limit`.

### 3.3 Resource files

- **`turkiye-districts.json`** — 16,874 bytes. Structure: flat object, 81 top-level keys = province names (Turkish, e.g. `"Adana"`, `"Adıyaman"`, `"İstanbul"`), values = arrays of district-name strings. Sample: `"Adana": ["Aladağ", "Ceyhan", "Feke", "İ̇mamoğlu", ...]` (15 entries for Adana). NOTE: strings contain combining-dot unicode oddities (`"İ̇mamoğlu"`, `"Sai̇mbeyli̇"`) — the app relies on diacritic-insensitive tr_TR comparisons, so port comparisons, not string cleanup.
- **`epdk-stations-seed.json`** — 8,083,347 bytes (~8 MB), a JSON **array of 12,667 station objects**. Sample entry:
  ```json
  {
    "id": "epdk-14621518", "epdkId": 14621518,
    "operatorName": "Voltrun", "operatorKey": "voltrun",
    "stationName": "01 Burda Avm", "city": "Adana", "district": "",
    "latitude": 36.993575, "longitude": 35.307931,
    "address": "01 Burda Avm", "serviceType": "public", "phone": null,
    "sockets": [{"type": "CCS2", "powerKw": 0, "count": 2, "socketNumbers": ["440910", "440911"]}],
    "hasAc": false, "hasDc": true, "hasHpc": false, "maxPowerKw": 0
  }
  ```
  `epdkId` may be absent → derived from `id` by stripping `"epdk-"`. `socketNumbers` optional → `[]`.
  **RN note:** 8 MB JSON parsed synchronously will jank; load lazily off the JS thread (e.g. `InteractionManager` / chunked require, or preprocess into SQLite/geohash buckets at build time).

---

## 4. COMPONENTS (one entry each)

### 4.1 `CachedAsyncImage.swift` — CachedAsyncImage + ImageCache
Props: `url: URL?`, `content: (Image) -> View`, `placeholder: () -> View`. In-memory `NSCache<NSString, UIImage>`: **countLimit 200, totalCostLimit 80 MB**, cost = w×h×scale². Load keyed by `.task(id: url)`: nil url → clear; cache hit → immediate; else `URLSession.data(from:)` with UUID token guard against races; failures → placeholder stays. No disk cache.
**RN:** `expo-image` with `cachePolicy="memory-disk"` covers this entirely (superset). Used everywhere car images render (catalog cards, detail hero, etc.).

### 4.2 `HTMLContentView.swift` — WKWebView HTML renderer (blog/legal prose)
Props: `html`, `isDarkMode`, `@Binding contentHeight`, `scrollToHeadingId?`, `onHeadingOffset?: (CGFloat) -> Void`, `proseStyle: .article | .legal`.
- Non-scrolling transparent WKWebView; height self-reported via JS `window.webkit.messageHandlers.heightChanged` (max of body/doc scrollHeight; retriggered on window load, each img load/error, and at 400 ms / 1200 ms timeouts); Swift debounces 80 ms, applies `height + 12`, ignores deltas ≤ 1 pt.
- Reload guard signature = `"{isDark}-{proseStyle}-{html.hashValue}"`. `baseURL = AppConfig.siteBaseURL` (`https://www.otomenzil.com`) so relative URLs resolve.
- Heading scroll: `scrollToHeading(id)` runs JS summing `offsetTop` chain, returns y offset → `onHeadingOffset` (the parent scrolls its native ScrollView); retried 120 ms after `didFinish`.
- **CSS theme (exact colors):** body font `'Outfit', -apple-system, ...`, 14px, line-height 1.65. text `#E7E5E4`(dark)/`#44403C`(light); headings `#F5F5F4`/`#1C1917`; muted `#A8A29E`/`#57534E`; link `#34D399`/`#059669` (bold 600, underline offset 3px); table bg `#1A1D22`/`#FFF`, thead bg `#064E3B`/`#ECFDF5`, thead text `#A7F3D0`/`#166534` (11px, 800, uppercase, ls .04em), border `#2F3540`/`#E7E5E4`, stripe (even rows) `#22262C`/`#FAFAF9`, radius 14px, 13px font, horizontally scrollable; blockquote bg `#22262C`/`#FAFAF9`; `li::marker` link-colored; images max-width 100%, radius 12px, centered, 12px margins; `h1` 1.5rem with 2px bottom border in link color; all headings `scroll-margin-top: 96px`.
- **Article vs legal h2:** article → 1.25rem, padded box (0.65rem 1rem) bg `#22262C`/`#FAFAF9`, 4px left border link-color, radius `0 1rem 1rem 0`; legal → 1.05rem, bottom-border only. Legal blockquote: 3px left border, gradient bg `linear-gradient(90deg, #022C22|#ECFDF5, transparent)`, radius `0 .75rem .75rem 0`. Legal h3 0.95rem (article 1.05rem).
- **RN:** `react-native-render-html` with a custom stylesheet replicating the above, or a WebView (`react-native-webview`) with the same wrapper HTML — the WebView route is the faithful port (keeps table scroll, heading anchor measurement via injected JS + `onMessage`).

Same file: **`ShellBackBar(title, action)`** — left-aligned back chip: chevron.left 12/black + title 11/black, fg `stone650`, bg `stone50`, radius 10, stroke `border`, on `pageBackground` strip (used atop detail overlays; title usually "Geri").

### 4.3 `AdSlotView.swift`
Props: `slot: AdSlotKey`, `config: AdSlotConfig?` ({mode, image, code, link, adsenseSlot}), `contactURL?`.
- `mode == "image"`: AsyncImage scaledToFit, radius `cardRadius`, optional wrapping `Link` if `link` valid.
- `mode == "code"`: raw HTML in bare WKWebView (`AdSlotHTMLView` — transparent, non-scrolling, viewport meta, `body{margin:0}` + `img{max-width:100%}`), minHeight **250** for `.detailSidebar` else **90**.
- `mode == "adsense"`: wraps `<ins class="adsbygoogle" style="display:block" data-ad-slot="{slot}" data-ad-format="auto" data-full-width-responsive="true"></ins>` in the same webview (note: no adsbygoogle script injected — effectively renders blank; replicate or fix consciously).
- other non-"disabled" modes → placeholder; `"disabled"`/nil-config → placeholder.
- **Placeholder** links to `contactURL ?? "{site}/iletisim/"`. Two layouts from `AdSlotKey.placeholder` (badge/title/cta/layout):
  - `home_top`: ("SPONSOR ALANI", "OTOMENZİL ANA SAYFA PREMIUM GÖRSEL REKLAM BANNER YERLEŞİMİ (970x90)", "Reklam ve Sponsorluk Alımı İçin İletişime Geçin →", banner)
  - `home_mid`: ("MARKA ORTAKLIĞI", "ELEKTRİKLİ ŞARJ İSTASYONU VE ENERJİ SPONSORLUĞU BANNERI (728x90)", "Sponsorluk Detaylarını İnceleyin →", banner)
  - `search_top`: ("SPONSOR REKLAM", "OTOMENZİL KATALOG ARŞİV ENTEGRE REKLAM ALANI (970x90)", "Burada Yer Alın →", banner)
  - `detail_top`: ("SPONSORLU ALAN", "OTOMENZİL KAMPANYA REKLAM BANNER ALANI (728x90)", "Reklam Vermek İçin Tıklayın →", banner)
  - `detail_sidebar`: ("REKLAM", "300x250 GENİŞ SPONSOR VE GÖRSEL BANNER ALANI", "Tanıtım & Sponsorluk Başvurusu", sidebar)
  - Banner layout: dashed 2px `stone300` border (dash [6,4]), radius 16, bg `stone100`, badge chip 8/bold on `stone300`, title 11/black `stone800`, cta 10/heavy `emerald600`. Sidebar layout: solid card radius 24, bg `stone50`, minHeight 200, "otomenzil sponsor alanı" 10/heavy uppercase `stone400`, cta pill with `emerald50@50%` bg + `emerald100` stroke.

### 4.4 `ToastBannerView.swift`
Props: `message: String`, `isError = false`. Glassy dark banner: HStack (icon `xmark`/`checkmark` 15/bold in accent; text Outfit 13/bold). Colors — success: accent `#6EE7B7`, text `#A7F3D0`, gradient `#062818@92% → #0A1814@88%`, radial glow `#34D399@22%` at (0.18, 0), stroke `#34D399@32%`; error: accent `#FCA5A5`, text `#FEE2E2`, gradient `#3F1010@90% → #1A0A0A@85%`, glow/stroke red. Base layer `.ultraThinMaterial` (RN: `expo-blur` or skip), radius 18 continuous, padding h16 v14, shadow black@35% r20 y10, h-margin 16.
**Timing (owned by hosts, not the component):** AppShellView auto-dismisses after **2.5 s** (logout/favorite toasts); CarDetailView report-sent toast **3 s** ("Bildiriminiz gönderildi — teşekkürler!"); presented top-aligned with `.move(edge: .top) + opacity` transition, `easeInOut 0.25` animation, zIndex 210/20.

### 4.5 `EngagementViews.swift` — 4 components

**`CarRatingVoteBar`** (props: carId, initial average/count, `nonceProvider`):
- Header: score `%.1f` (before voting shows the currently-selected integer, `"0"` if none) 32/black + "/5" 18/bold `stone400`; 5 stars 12/bold — filled `#FBBF24` up to `round(value)` else `stone300`.
- Slider 0…5 step 1 tinted `emerald500`, disabled after vote/while submitting; floating value chip above thumb (`offset x = value/5 * 180`) using inverse button colors.
- Footer: "{count} Oylama" 11/semibold; "Oyla" button (uppercase 11/black; enabled → white on `emerald500`; disabled → `stone400` on `stone100`; submitting shows "…"). Enabled iff `!hasVoted && !isSubmitting && selectedRating >= 1`.
- Hint: voted → "Bu araç için oy kullandınız." else "Sadece bir defa oy verebilirsiniz." Success msg "Oyunuz kaydedildi." (emerald700), errors red.
- Logic: `.task` → `fetchCarRatingStatus(carId, nonce)` sets average/count/voted; vote → `voteCarRating` → apply returned stats else `hasVoted = true`. Card: padding 16, radius 16, stroke border.

**`ChargingSimulatorSection`** (props: `car: CarDetail`): headers "BATARYA & DOLUM LABORATUVARI" (10/black `#0284C7`), "Şarj Dolum ve Süre Tahmin Simülatörü" (17/black), subtitle "{battery %.1f kWh} batarya için tahmini dolum süresi.". Charger list = the 5 `ChargerType` rows (selected: text `#0C4A6E`, bg `#F0F9FF`, stroke `#38BDF8`; right label "{AC|DC} {kW} kW" — DC `#C2410C`, AC `#1D4ED8`). Two sliders 0…95 / 0…100 step 5 tinted `#0284C7` ("Başlangıç", "Hedef", labels "%{n}"); auto-bump: if target ≤ start → target = min(100, start+5). Defaults: wallbox, 20 → 80. Result box (bg `#F0F9FF`, radius 14): "Tahmini süre" caption, `formatDuration(minutes)` 24/black `#0284C7`, "Etkin güç: {%.1f} kW · %{start} → %{target}".

**`ReportErrorSheet`** (car, auth, onSuccess): title "Hata Bildir" + circular close; copy "Veri hatası veya eksik bilgi mi fark ettiniz? Kısa bir açıklama bırakın."; TextEditor h96; submit "Bildirimi Gönder" (white on emerald600) disabled while submitting or trimmed message < **10 chars**; `submitErrorReport(message, carId, carTitle, nonce)`; sheet detent height 280 with drag indicator. Success → dismiss + host toast.

**`CarReviewsSection` / `BlogCommentsSection` / `CompareCommentsSection`** — thin data wrappers around `WebCommentsSection` (below). All: load list on `.task` (`fetchCarReviews(slug)` / `fetchBlogComments(slug)` / `fetchCompareComments(carIds, nonce)`), submit with fresh nonce (`auth.fetchFreshNonce()`), reply state (`replyParentId`/`replyTargetName`), success notice "Yorumunuz gönderildi.". Titles: "Kullanıcı Yorumları ({n})" / "Makale Yorumları ({n})" / "Karşılaştırma Yorumları"; badge always "Topluluk". Login prompts: "Yorum yapabilmek için giriş yapmalısınız." / "Yorum paylaşabilmek için oturum açmalısınız." / "Karşılaştırma yorumu yapmak için giriş yapın.". Car reviews **prepend** new review; blog/compare **append**. Compare extras: requires ≥2 carIds (keyed reload on `carIds.joined("|")`); preference picker "HANGİ MODELİ TERCİH EDERSİNİZ?" — horizontal chip row, "Kararsızım" chip (selected = white on `emerald700`) + one chip per car (selected = white on `emerald600`, tap again to clear); `preferredCarId` sent with comment; **nonce retry**: on error message containing "güvenlik" (case-insens.) refetch nonce and retry once.

### 4.6 `WebCommentsSection.swift` — generic threaded comments UI
Generic over `Item: Identifiable & Hashable, ID == String` with accessor closures (author/text/date/memberSlug/parentId). Props also: title, badge, isLoggedIn, currentUsername, `@Binding draft`, isSubmitting, notice(+isError), replyTargetName, callbacks (onCancelReply, onSubmit, onReply, onLoginRequest).
- Container: gradient bg `[cardBackground, stone50@40%, emerald50@15%]` TL→BR, radius 24, stroke border, padding 16.
- Header: badge uppercased 9/black emerald600; title 14/black uppercase; right pill "Üye Tartışması" (9/bold emerald700 on emerald50/emerald100 capsule); hairline below.
- Notice banner: 12/bold; error → text `#B91C1C`, bg `#FEF2F2`, stroke `#FECACA`; success → emerald palette; radius 16.
- Composer (logged in): optional reply bar "Yanıt: {name}" + "İptal" button; label "Yorumunuz" uppercased 10/black; avatar (first letter uppercased, 36×36 circle — highlight = emerald50 bg/emerald100 stroke/emerald700 text, else stone100/border/stone700); multiline TextField placeholder **"Bu makale hakkındaki görüşünüzü paylaşın..."** (3–6 lines, radius 16); submit button paperplane + "Gönder"/"Gönderiliyor…" (11/black white on `stone950`, radius 12), disabled when submitting or trimmed draft empty.
- Logged out: amber panel (bg `amber50@70%`, stroke `amber200`, radius 16): "Yorum yazmak ve yanıtlamak için üye girişi gereklidir." + link button "Üye Girişi Yap veya Kaydol →" (10/black emerald700).
- Threading: top-level = items with nil/empty parentId; replies = `parentId == comment.id`, rendered flat under parent with 16pt leading inset (single nesting level). Empty state: "Henüz yorum yok — ilk yorumu siz yazın."
- Comment card: radius 16 bordered; author uppercased 11/black + `checkmark.seal.fill` 9pt emerald600 when memberSlug present; date 9/semibold stone400 right; text 14/medium stone650; "Yanıtla" action (arrowshape.turn.up.left.fill icon, 10/black emerald700) only for logged-in users on top-level comments.

### 4.7 `WebShellComponents.swift`
- **Lucide icons hand-drawn as SwiftUI Shapes** (24-unit grid, stroke 2, round caps/joins): `LucideSearchIcon`, `LucideUserIcon`, `LucideMenuIcon`, `LucideMoonIcon`, `LucideSunIcon`. **RN:** use `lucide-react-native` (`Search, User, Menu, Moon, Sun`) — identical geometry.
- `WebNavLucideButton` — icon + 8 padding tap target.
- **`WebColorModeToggle`** (preferences, compact=true, fullWidth=false): toggles `useDarkMode`. Dark state shows Sun (stone300) on bg `#22262C` stroke `#2F3540`; light shows Moon (stone600) on bg `#FAFAF9` stroke `#E5E7EB`. Size 36 (compact) / 40; radius 16 (12 when fullWidth). A11y label: "Açık moda geç" / "Koyu moda geç".
- `WebNavLoginButton` — user icon button, a11y "Giriş yap".
- **`WebFeatureCard`** (icon, title, text, darkSurface=false): 40×40 icon tile (`emerald500@10%` bg, `emerald400@20%` stroke, icon emerald400|600), title 13/black, text 11/medium; card radius 16; darkSurface → bg white@5%, stroke white@10%, no shadow.
- **`LaunchFeatureCards.items`** (= `GuestGarageFeatureCards.items`), exact copy:
  1. car.2.fill / "Garajım" / "Aracını garajına ekle; WLTP menzili, batarya ve port bazlı şarj süresini kişisel panelinden takip et."
  2. arrow.left.arrow.right / "Karşılaştırma" / "En fazla 3 elektrikli modeli yan yana kıyasla; menzil, fiyat ve teknik verileri tek ekranda gör."
  3. bolt.fill / "Şarj İstasyonları" / "Konumuna göre yakın EPDK lisanslı istasyonları bul, haritada gör ve yol tarifi al."
- `ShareMetaPillButton(title, systemImage, action)` — capsule pill 10/semibold stone500 on cardBackground/border (share & meta pills on articles).

### 4.8 `CarCatalogCardView.swift` — main catalog card
Props: `car`, `layout: .grid|.list`, `identityCompact`, `showsFavoriteButton=true`, `brandLogos: [String:String]`, `isComparing`, `isFavorite`, `isInGarage`, `isLoggedIn=true`, `garageBusy`, `garageBusyAction?`, callbacks `onDetail/onCompare/onToggleFavorite/onToggleGarage/onBrandTap`.
- Card: bg cardBackground, radius 24, border stroke, shadow black@3% r4 y1.
- Grid: image block 4:3 on top + content (padding 16). List: image 132 wide (minHeight 156) + content (padding 12).
- Image block: tappable hero (`CachedAsyncImage`, scaledToFill, placeholder stone50). Overlays: rating badge top-left `"★ {%.1f} Puan"` (9/heavy white; bg dark? `emerald700@92%` : `stone900`; radius 8) when rating > 0; bodyType chip bottom-left (9/black white on `stone800@92%`|`stone900@80%`); favorite **star** overlay button top-right (`WebFavoriteOverlayButton`, busy = `garageBusy && !isInGarage`).
- Content: `CarCardIdentityView` (+ "{year} Model" 9/heavy stone400), `CarSpecDeckView`, then action strip: "FİYAT" label + `CarPriceView(.compact)`; two buttons — "DETAYLAR" (10/black stone800 on stone100, radius 12) and "KARŞILAŞTIR"/"ÇIKAR" (10/black white on emerald600; comparing adds `emerald250` stroke); `WebGarageButton(.compact)` below; hairline `borderLight` above the strip.
- Guest hints: tapping favorite/garage while `!isLoggedIn` flips a hint flag that auto-resets after **2.6 s**; callbacks still fire (host opens auth).

### 4.9 `CarCardIdentityView.swift`
Props: car, brandLogos, compact=false, onBrandTap, onModelTap. Standard: `BrandLogoView`(22) + brand uppercased 10/heavy `emerald` + "·" + model 12/bold stone900 (single line). Compact: logo(20) + brand 9/heavy on one row; model 11/bold two-line below. All parts are separate buttons (brand → brand page, model → detail).

### 4.10 `BrandLogoView.swift`
Props: brand, logoURL?, size=24. AsyncImage scaledToFit in size×size, radius 6; fallback/initial state = first-2-letters uppercased (size×0.38 black weight, stone600 on stone100).

### 4.11 `CarPriceView.swift`
Props: priceTL, priceForeign, trAvailable, style `.compact|.detail`. TR-available: single Text via `CarPriceFormatter.primaryPriceText`, `emerald` color, black weight — detail 28pt / compact 14pt, minScale 0.7. Not available: chip **"TR'de satışta değil"** (stone600 on stone100, radius 8) + foreign price line (stone900; detail 28/black, compact 14/bold) + (detail only, when foreign present) caption **"Yurt dışı liste fiyatı"** (11/medium stone400). Alignment: detail → leading, compact → trailing.

### 4.12 `CarSpecDeckView.swift`
Props: rangeKm, batteryKwh, powerHp, accelerationSec. 2-col grid of "Label: value" lines — labels "Menzil", "Batarya", "Güç", "0-100"; values `"{n} km"`, battery int→`"{n} kWh"` else `%.1f kWh`, `"{n} HP"`, `"%.1f sn"`; missing → "—". 10/semibold stone500, values black-weight stone850; container bg stone50, radius 16, stroke `#F3F4F6`.

### 4.13 `CarSummaryCardView.swift` — "AI summary" accordion
Prop: `description: String?`. Collapsed header: emerald circle 28 with `sparkles`, title "Oto menzil ai özeti için tıkla" (expanded: "Oto Menzil AI Özeti") 13/black, sub "Model açıklaması ve editoryal özet" 10/medium (collapsed only), chevron rotates 180°; header bg `stone50@80%`. Expanded: 2pt emerald left rule + body 13/medium stone600 lineSpacing 5. Empty fallback text: "Bu model için henüz açıklama metni eklenmemiş. Katalog güncellendiğinde Oto Menzil AI özeti burada görünecek." Animation easeInOut 0.2. Card radius 16.

### 4.14 `CarDetailPricePanel.swift` (+ `CarDetailMetricsGrid`)
**CarDetailPricePanel** props: car, brandPriceListURL?, isComparing, isInGarage, onCompare/onOpenCompare/onToggleGarage/onDownloadPDF.
- Left accent bar: emerald500 if `soldInTurkey` else stone300. Card stroke 2pt: `emerald500@35%` if sold else border.
- Header: "TAVSİYE EDİLEN ANAHTAR TESLİM FİYATI" (10/heavy stone400, tracking 0.5); optional link chip "YETKİLİ SATICI FİYAT LİSTESİ →" (9/black emerald700 on emerald50/emerald100).
- Price row: `CarPriceView(.detail)`; if sold & priced, chip "KDV & ÖTV Dahil" (10/black emerald700 on emerald50).
- Compare: not comparing → button `arrow.left.arrow.right` + "ARACI KARŞILAŞTIRMAYA EKLE" (white on emerald600, v-pad 14, radius 12); comparing → status bar "✓ KARŞILAŞTIRMA LİSTESİNDE" (inverse colors, emerald dot 8) + button "KARŞILAŞTIRMA EKRANINI AÇ →".
- Garage: heart + "GARAJIMDAN ÇIKAR"/"GARAJA EKLE" — active: heart `#F43F5E`, text `#E11D48`, garage tint bg/border; inactive stone700/border.
- PDF: printer.fill + "KATALOGU PDF İNDİR / SAKLA" (emerald700 on emerald50, stroke emerald250).
- Footnote: "* Bu aracı listenize ekleyerek diğer 2 elektrikli araçla teknik, batarya ömrü, kış menzili ve motor verilerini yan yana karşılaştırabilirsiniz (Maks 3 Araç)." (9.5/medium stone450, divider above).

**CarDetailMetricsGrid**: 2×2 metric cards — ("RESMİ MENZİL", `{n} km`, flame.fill, emerald600/emerald50), ("NET BATARYA", int-aware kWh, battery.100.bolt, sky500/sky50), ("MOTOR GÜCÜ", `{n} HP`, bolt.fill, amber800/amber50), ("HIZLI ŞARJ HIZI", `{n} dk`, slider.horizontal.3, `#A855F7`/`#FAF5FF`). Card: 36×36 icon tile (bg + tint@20% stroke), label 9/bold stone400, value 14/black, radius 12.

### 4.15 `BlogPostCardView.swift` (+ `BlogMetaBadgesView`)
Props: blog, layout `.list|.sidebar`, onCategoryTap?, action. Whole card is a button; radius 16 bordered.
- List: hero AsyncImage h220 fill (placeholder stone100); title 18/bold 2-line; excerpt 13/medium stone600 3-line; footer. Sidebar: 16:9 image; title 13/bold 2-line; excerpt 11/medium 2-line; dense footer.
- Footer: hairline; `BlogMetaBadgesView`; CTA bar "Devamını Oku" + arrow (10/black tracking 0.8, inverse button colors, radius 12).
- **BlogMetaBadgesView** (category, readTimeMin, date?, dense, onCategoryTap?): capsule pills with icon (icon always `emerald500`): category (book.fill, uppercased, emerald palette, tappable when handler given), read time (clock.fill, "{n} dk okuma" or dense "{n} dk", stone palette), date (calendar, stone500 on cardBackground). Defaults from host: category "Genel", readTime 3.

### 4.16 `ArticleTocView.swift`
Props: `items: [BlogTocItem]`, `@Binding isOpen`, onSelect. Hidden when empty. Header button: list.bullet.indent icon (emerald600) + "İÇİNDEKİLER" 11/black + "({count})" 9/bold + chevron rotating 180°; bg cardBackground@95%. Expanded list: each row "H{level}" tag (9/black emerald600@85%, width 22) + text 11/semibold stone700; level indent 0/8/16/24. Container gradient `[cardBackground, emerald50@35%, stone50]`, radius 16, stroke emerald100. Animation easeInOut 0.2.

### 4.17 `CompareCarModelPicker.swift`
Props: cars, excludeIds, onSelect. 3-step cascading menus, each with numbered circle badge (20×20 emerald600, white 9/black) + uppercased 10/black stone500 label:
1. "Marka Seçin" → distinct brands (localized sort), placeholder "Marka seçin..."; changing brand resets bodyType.
2. "Kasa Tipi Seçin" → distinct bodyTypes of chosen brand, placeholder "Kasa tipi seçin...", disabled until brand chosen (opacity 0.55).
3. "Model Seçin" → cars of brand+bodyType sorted by model; menu rows `"{model} ({year|—})"`; selecting calls onSelect and resets brand/bodyType.
Trigger style: 14/bold, padding h16 v12, cardBackground, radius 16 bordered, chevron.down.

### 4.18 `DataVerificationBadgeView.swift`
Props: verified, compact=false. Pill button → sheet (medium detent). Copy:
- verified: label "Doğrulanmış Araç Verileri" / short "Veriler Doğrulandı" / title "Teknik veriler doğrulandı" / body "Menzil, batarya kapasitesi, şarj süresi, fiyat ve teknik parametreler resmi üretici / yetkili satıcı kaynaklarıyla karşılaştırılarak kontrol edilmiştir."
- unverified: "Doğrulanmamış Araç Verileri" / "Veriler Doğrulanmadı" / "Teknik veriler henüz doğrulanmadı" / "Bu model yeni olabilir veya teknik bilgiler güncelleme aşamasındadır. Gösterilen menzil, batarya, şarj ve fiyat değerleri bilgilendirme amaçlıdır; yakında doğrulanmış veri olarak güncellenecektir."
Style: verified → emerald700 on emerald50/emerald100; unverified → `#92400E` on amber50/amber200; icons checkmark.circle.fill / exclamationmark.triangle.fill + trailing info.circle @70%; radius 10; sheet has "Kapat" toolbar button.

### 4.19 `EngineeringLabSection.swift`
Prop: car. State: temperature (default `.mild`), route (default `.combined`); values from `EngineeringLabSimulator` (§2.6).
- Header: "MENZİL TAHMİNİ" 10/black `#EF4444`; signpost.right.fill emerald + "Gerçek Sürüş Menzili" 16/black; disclaimer "WLTP menzil ve tüketim verilerine dayalı tahmindir; sıcaklık ve güzergah seçimine göre sonuç değişir. Resmi test değeri değildir."
- Controls (bg stone50, radius 16): "YILLIK SEZONEL SICAKLIK DEĞERİ" → two buttons "SOĞUK HAVA (0°C)" (snowflake, active `#3B82F6`) and "ILIMAN HAVA (23°C)" (sun.max.fill, active `#F59E0B`); active = tint@12% bg + 2pt tint stroke. "YOL GÜZERGAH PROFİLİ" → three rows (title 11/bold + subtitle 9/medium; active emerald50/emerald500 2pt):
  - "Şehir İçi Sıkışık Trafik (Rejenerasyon Yüksek)" / "Düşük hızlar sayesinde hava direnci en aza iner, motor frenlerinden geri kazanım maksimumdadır."
  - "Kesintisiz Otoyol Sürüşü (Hızlı Parkur)" / "Yüksek otoban süratlerinde aerodinamik sürtünme katlanır, rejeneratif kazanç düşer."
  - "Karma Dinamik Sürüş Değeri (%50 Otoban, %50 Şehir)" / "Standart WLTP laboratuvar çevrimlerine en yakın karma dinamik simülasyon profili."
- Results: two cards — "REAL MENZİL TAHMİNİ" ({range} km, progress = `min(100, range/700*100)`, emerald bar, icon location.north.circle.fill; footnote cold → "* Soğuk havalarda bataryanın iç direnci artar, kabin ısıtma fazladan enerji çeker." mild → "* Ilıman bahar havasında kimya akışkanlığı en yüksek kondüsyona varır, menzil zirve yapar.") and "ORTALAMA GÜÇ TÜKETİMİ" ({cons} Wh/km, progress = `min(100, cons/300*100)`, bar `#F97316`, icon chart.line.uptrend.xyaxis `#EA580C`; footnote "Sürüş tarzı ve klima yükü Wh/km tüketim oranını doğrudan etkiler."). Value 28/black + unit 13/semibold; 4pt capsule progress track stone300; card minHeight 180.

### 4.20 `GuestGarageGateView.swift`
Prop: onLogin. Full-screen dark hero: gradient `[stone950, stone900(light value context — effectively #1C1917 flip-aware), emerald950]` TL→BR + radial emerald glow (emerald500@35%, center top-right, r220, opacity 0.3). Contents: lock pill "Üyelik gerekli" (10/black tracking 1.2, `#A7F3D0` on emerald500@10%, capsule emerald400@20% stroke); "Garajım" 32/black white; "Aracını garajına eklemek ve yönetmek için giriş yapmalısınız." 14/medium stone300; "Üye olduğunuzda aracınızı kaydedebilir, yakın şarj istasyonlarını bulabilir ve menzil hesaplarını kişiselleştirebilirsiniz." 12/medium stone400; the 3 `WebFeatureCard`s (darkSurface); CTA "Giriş Yap · Garajını Aç" (rectangle.portrait.and.arrow.right icon, 11/black tracking 0.8, `stone950` text on emerald500, radius 16).

### 4.21 `LegalPageLayoutView.swift` (+ FlowLayout, LegalRelatedDefaults)
Props: kind (`about|cookies|privacy|terms|contact`), title, excerpt?, htmlContent?, isDarkMode, relatedLinks, onNavigate, optional extraContent view builder.
- Kind meta — badges: "BİZ KİMİZ?" / "ÇEREZLER" / "KVKK & GİZLİLİK" / "KULLANIM KOŞULLARI" / "BİZE ULAŞIN"; icons sparkles / fork.knife / shield.fill / scalemass.fill / envelope.fill; default excerpts: "Türkiye'nin bağımsız elektrikli araç karşılaştırma ve bilgi platformu." / "Zorunlu, tercih ve analitik çerezler; yönetim seçenekleriniz." / "6698 sayılı KVKK kapsamında kişisel verilerinizin işlenmesi ve haklarınız." / "Platform kullanım kuralları, sorumluluk sınırları ve üyelik şartları." / "destek@otomenzil.com üzerinden veya form ile bize ulaşın."
- `showHtml` gate: HTML plain-text (tags stripped) must be ≥ **200 chars**; else render `extraContent()` + help banner.
- Hero card (radius 28): 4pt gradient strip (`emerald500→emerald400→#2DD4BF`); 64×64 icon tile; badge capsule (sparkles + kind.badge, 10/black tracking 1.4, emerald800 on emerald500@15%); "Güncellenmiş metin" chip; title 28/black; excerpt 14/medium; first 3 related links as `FlowLayout` capsules. HTML body → `HTMLContentView(.legal)` in a padded card (initial height 420).
- Help banner: "Yardıma mı ihtiyacınız var?" / "Gizlilik, çerez veya kullanım koşulları hakkında bize yazın." / mailto button `DESTEK@OTOMENZIL.COM` (white on emerald600).
- Related section: "İLGİLİ YASAL SAYFALAR" caption; 2-col grid of link cards (label 13/black, description 11/medium 2-line, "Oku →" emerald600).
- `LegalRelatedDefaults.all`: Hakkımızda→about "Platformumuzun misyonu ve bağımsızlık ilkesi."; Gizlilik Politikası→privacy "KVKK kapsamında veri işleme beyanımız."; Çerez Politikası→cookies "Teknik çerezler ve tercih yönetimi."; Kullanım Koşulları→terms "Platform kullanım şartları."; İletişim→contact "Destek ekibine ulaşın.".
- `FlowLayout(spacing=8)`: simple wrapping row layout (RN: flexWrap row).

### 4.22 `ShareSheet.swift`
`UIActivityViewController` wrapper with `items: [Any]`. **RN:** `Share.share` / `expo-sharing`.

### 4.23 `WebArticleTable.swift`
Props: `headers: [String]`, `rows: [[String]]`, `highlightFirstRate=false`. Static styled table (used on MTV/OTV/loan calculator pages): header row gradient `#F0FDF4→#ECFDF5` with `#BBF7D0` bottom rule, header 10/black; body rows zebra `#FAFAF9`/white with `#F5F5F4` separators (light-mode literals!), cell 11pt padded 12/11. Cell styling rules: contains "Kredi kullanılamaz" → `#DC2626` bold; `highlightFirstRate` && contains "%70" → emerald700 bold; contains "%" → stone800 bold; else stone700 medium. Container radius 16, border stroke, shadow black@4%.

### 4.24 `WebFilterField.swift`
Generic dropdown field: uppercased title 10/heavy stone450 tracking 0.4; Menu trigger with selected label 12/bold stone800 + chevron.up.chevron.down; bg `inputBackground`, radius 16, border stroke, padding h14 v11. Options = `[(value, label)]`. **RN:** pressable opening an action-sheet/bottom-sheet picker.

---

## 5. RN MAPPING NOTES (tricky pieces)

| iOS piece | RN recommendation |
|---|---|
| `CachedAsyncImage` + `ImageCache` | `expo-image` (`cachePolicy: "memory-disk"`, `recyclingKey`); drop the custom NSCache entirely |
| `HTMLContentView` (WKWebView + height bridge + heading scroll) | `react-native-webview` with the same wrapper HTML/CSS + `injectedJavaScript` posting height & heading offsets via `window.ReactNativeWebView.postMessage`; alternatively `react-native-render-html` (loses `<table>` horizontal scroll & anchor precision) |
| `AdSlotHTMLView` (code/adsense) | small `react-native-webview` instances; image mode → `expo-image` + `Linking.openURL` |
| ToastBannerView materials | `expo-blur` BlurView under gradient layers (or approximate with the opaque gradients, which dominate visually); host-level timers 2.5 s / 3 s |
| Lucide shape icons | `lucide-react-native` (Search, User, Menu, Moon, Sun) — same 24-grid, strokeWidth 2 |
| SF Symbols (heart, star, bolt, etc.) | `lucide-react-native` equivalents (heart, star, zap, printer, send, chevron-down, check-circle, alert-triangle, lock, sparkles…); keep fill states for heart/star |
| `Menu` pickers (WebFilterField, CompareCarModelPicker) | `@gorhom/bottom-sheet` or ActionSheetIOS-style list; keep the 3-step cascade state machine |
| Sliders (rating, charge %) | `@react-native-community/slider` (step 1 / step 5, min/max as specced) |
| `FlowLayout` | `flexDirection: 'row', flexWrap: 'wrap', gap: 8` |
| CoreLocation | `expo-location` + manual 15 s timeout + Turkey bbox check (§3.1) |
| CLLocation.distance | haversine (R=6371 km) — matches within rounding for the ≤120 km use cases |
| Nominatim reverse geocode | keep the same HTTP call (set custom UA); or `expo-location` reverseGeocodeAsync then map fields |
| `NSCache`/UserDefaults | MMKV or AsyncStorage; same key `otomenzil.pref.darkMode` if migration matters |
| tr_TR formatting (`NumberFormatter`, currency) | `Intl.NumberFormat('tr-TR', {style:'currency', currency:'TRY', maximumFractionDigits:0})`; enable Intl on Hermes (built-in on RN ≥0.70) |
| Turkish string ops (`folding(.diacriticInsensitive, tr_TR)`, `localizedCompare`, `localizedCaseInsensitiveContains`) | `String.prototype.localeCompare(x, 'tr')` for sorting; for diacritic folding use `s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()` — verify against Turkish dotted/dotless I cases (`İ→i`, `I→ı` under tr locale); the districts JSON contains combining marks so NFD-based folding is REQUIRED for `stationMatchesDistrict` parity |
| `.ultraThinMaterial`, spring animations | `expo-blur`; `react-native-reanimated` spring (damping ≈ 0.72 ratio, response 0.28 → `withSpring` mass/stiffness tuned) |
| SwiftUI `Slider` value chip offset (`value/5 * 180`) | reproduce with measured track width instead of the hardcoded 180 |
| 8 MB station seed | preprocess at build time (split per-city JSON or SQLite via `expo-sqlite`); keep remote refresh endpoint `GET /charging-stations` with the ≤81-cities sanity check |
| WKWebView PDF (detail "KATALOGU PDF İNDİR") | `expo-print` / react-native-html-to-pdf (host view, not in this file set) |

### Known quirks to preserve or consciously fix
1. `CarTechSpecBuilder.autoValue` has a dead `batteryUsable` branch (`* 0.93`) — first switch case wins, so usable = total today. Decide: replicate (parity) or fix.
2. `AdSlotView` adsense mode never injects the adsbygoogle `<script>` — renders blank webview today.
3. AC clamp of 11 kW in `ChargerType.effectivePowerKw` intentionally caps the 22 kW public AC option.
4. `CarSortOption.newest` and `.popular` sort identically (popularity desc).
5. `CarSearchEngine` price filter silently skips foreign/unpriced cars (they always pass the price filter).
6. `WebGarageButton.busyAction` prop is accepted but unused in rendering.
