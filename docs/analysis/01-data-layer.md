# OtoMenzil iOS → React Native: Data Layer Specification

Source: `otomenzil-ios/OtoMenzil/` (Config.swift, Models/, Services/, Store/).
Goal: a TypeScript developer can reimplement the entire data layer from this document alone, decoding **identical JSON**.

> **Important:** `Models/Models.swift` (legacy `Car`, `CarsResponse`, `HomePayload`, `MobileSettings`, an old `HomeResponse`/`BlogPost` and an old `APIError`) is **NOT in the Xcode build target** — it is dead code. Ignore it entirely. The live models are in `Car.swift`, `BlogPost.swift`, `ShellModels.swift`, `AuthModels.swift`, `EngagementModels.swift`, `AdSlotModels.swift`.

---

## 1. Configuration

```swift
// Config.swift
siteBaseURL = "https://www.otomenzil.com"            // no trailing slash
apiBaseURL  = siteBaseURL + "/wp-json/otomenzil/v1/" // trailing slash REQUIRED
```

- All REST paths below are relative to `https://www.otomenzil.com/wp-json/otomenzil/v1/`. Paths are trimmed of leading/trailing `/` before being resolved against the base.
- A second base exists for WordPress admin-ajax fallbacks: `https://www.otomenzil.com/wp-admin/admin-ajax.php`.
- The site root `https://www.otomenzil.com/` itself is fetched for (a) session cookie warm-up and (b) HTML scraping of theme extras (see §3.9).

---

## 2. HTTP Client behavior (`APIClient`)

### 2.1 Session

- One shared `URLSession` with `HTTPCookieStorage.shared` and `httpShouldSetCookies = true`. **Cookies matter**: WordPress sets session cookies (on the warm-up GET and on login responses) and the admin-ajax fallbacks depend on them. In RN, the native `fetch` cookie jar handles this automatically on both platforms — do not disable cookies.
- A static mutable `APIClient.authToken: String?` holds the bearer token. It is set by `LocalAuthSession.restore()`, by `AuthStore.applySession`, cleared on logout.

### 2.2 Headers applied to EVERY request (`applySiteHeaders`)

| Header | Value |
|---|---|
| `User-Agent` | `Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 OtoMenzil/1.0` |
| `Referer` | `https://www.otomenzil.com/` |
| `Accept` | `application/json, text/plain, */*` |
| `Accept-Language` | `tr-TR,tr;q=0.9` |
| `Authorization` | `Bearer <authToken>` — only when a non-empty token is set |

The custom User-Agent and Referer are deliberate (server-side bot/hotlink filters). Replicate them in RN.

### 2.3 Caching (GET)

- `get(path, fresh:)` uses `URLRequest.cachePolicy`:
  - default (`fresh == false`): `.returnCacheDataElseLoad` — **serve any cached response without revalidation**, hit network only on cache miss. There is no explicit TTL in the app; the shared `URLCache` obeys server `Cache-Control` headers for storage, but `returnCacheDataElseLoad` returns even stale entries.
  - `fresh == true`: `.reloadIgnoringLocalCacheData` — bypass cache entirely. Used only by `GET auth/nonce` and by the warm-up/theme-extras homepage fetches.
- `fetchCars(fresh: true)` does **not** change the cache policy; it appends `?fresh=1` to the URL (a *server-side* cache-bust that also happens to be a distinct URLCache key). `fetchCars(fresh: false)` → plain `cars`.
- POST/PUT requests use the default cache policy (effectively no caching).

### 2.4 JSON encoding/decoding

- Plain `JSONDecoder()` / `JSONEncoder()` — **no key conversion strategy**. Every JSON key equals the Swift property name (camelCase) exactly, unless a custom `CodingKeys` is noted below (none rename anything).
- POST/PUT bodies are `Content-Type: application/json`.
- admin-ajax bodies are `Content-Type: application/x-www-form-urlencoded; charset=utf-8`, body built as `action=<action>&k1=v1&k2=v2` where each value is percent-encoded with the `.urlQueryAllowed` character set (i.e. `encodeURIComponent`-like; note `&`/`=` inside values get encoded, spaces become `%20`).

### 2.5 Error handling (replicate faithfully — the UI shows these messages)

`APIError` cases: `invalidURL` ("Site adresi hatalı."), `badStatus(code)` ("Sunucu hatası (code)."), `decodingFailed(detail)` ("Veri okunamadı. (detail)" — detail is the first 180 bytes of the body), `authFailed(message)` (message shown verbatim).

For any non-2xx REST response, the client attempts to extract a human message, in order:
1. **HTML error** (`parseHtmlError`): if the first 800 bytes contain `<html` (case-insensitive):
   - if body contains `401 Unauthorized` → `"Sunucu giriş isteğini reddetti (401). wp-admin erişimi engellenmiş olabilir."`
   - else the `<title>…</title>` text, if non-empty
   - else `"Sunucu beklenmeyen bir HTML yanıtı döndürdü."`
2. **WP REST error** shape `{ "message": string, "code": string? }` → its `message`.
3. **Ajax envelope** `{ "success": false, "data": { "message": string } }` → the message.
4. Generic JSON: top-level `message` string; or if `success === false`, `data.message` or `data` (when `data` is a string).

If a message was found → throw `authFailed(message)`; otherwise `badStatus(code)`.
If a 2xx body fails to decode → same message extraction; else `decodingFailed(preview)`.

### 2.6 admin-ajax POST (`ajaxPost` — auth flows)

`POST https://www.otomenzil.com/wp-admin/admin-ajax.php`, form-encoded (see §2.4). Behavior:
- Accepts HTTP status **200–499** (WordPress ajax returns errors as 200/400/403 with JSON envelope). ≥500 or no HTTP response → `badStatus`.
- Status 401/403 with an HTML body → `authFailed(parsedHtmlMessage)`.
- Raw body exactly `"0"` (WordPress "invalid action/nonce" sentinel) → `authFailed("Oturum doğrulaması başarısız. Lütfen tekrar deneyin.")`.
- If body decodes as `{success:false, ...}` → `authFailed` with `data.message` or parsed message or `"İşlem başarısız."` / `"Giriş veya kayıt başarısız."`.
- Otherwise decodes the full body into the expected type (usually `AjaxEnvelope<T>`; caller then checks `success` and unwraps `data`).

### 2.7 admin-ajax POST (`performEngagementAjax` — engagement flows)

Same transport as §2.6 but decodes `{ "success": bool, "data": T }` and returns `data` directly when `success === true`; otherwise throws `authFailed` with a parsed message or `"İşlem başarısız."`.

### 2.8 WordPress session warm-up

`warmupWordPressSession()`: `GET https://www.otomenzil.com/` with cache disabled and the standard headers, response discarded. Its only purpose is to receive WP cookies. Called at the start of every `fetchAuthNonce()`.

---

## 3. API Endpoints

All REST paths relative to `…/wp-json/otomenzil/v1/`. "Cache: default" = `.returnCacheDataElseLoad` GET (§2.3). Auth = `Authorization: Bearer` header is attached automatically whenever a token exists (all requests).

### 3.1 Shell / content

| # | Method & path | Params | Response | Notes |
|---|---|---|---|---|
| 1 | `GET home` | — | `HomeResponse` | Cache: default. Primary bootstrap payload. |
| 2 | `GET cars` | optional `?fresh=1` | `CarCatalogResponse` `{cars, count}` | Cache: default (even with `fresh=1`; that flag busts the *server* cache). |
| 3 | `GET cars/{slug}` | — | `CarDetail` | Cache: default. `{slug}` is the car id/slug (`CarSummary.id`). |
| 4 | `GET blogs` | — | `BlogListResponse` `{blogs, count}` | Cache: default. |
| 5 | `GET blogs/{slug}` | — | `BlogPost` | Cache: default. **Fallback:** on `badStatus(404)`, fetch `GET blogs` and return the post whose `id == slug`; if none, rethrow 404. |
| 6 | `GET settings` | — | `MobileAppSettings` | Cache: default. |
| 7 | `GET brands` | — | `BrandsResponse` `{brandLogos: Record<string,string>}` | Cache: default. |
| 8 | `GET charging-stations` | — | `{stations: SeedStationDTO[]}` | Cache: default. Used by `EpdkStationsData.refreshFromServerIfNeeded()` (Utils); results filtered client-side to stations inside Turkey with a non-empty city. Failure is silently ignored (bundled seed JSON `epdk-stations-seed.json` is the fallback data source). |

### 3.2 Auth (REST first, admin-ajax fallback)

Every auth call needs a **nonce** (§4.2). All bodies are JSON objects of strings unless noted.

| # | Method & path | Body | Response | Fallback |
|---|---|---|---|---|
| 9 | `GET auth/nonce` (`fresh=true`, cache bypassed; preceded by homepage warm-up GET) | — | `NonceResponse` `{nonce}` | ajax `action=otomenzil_refresh_nonce` (no extra fields) → `AjaxEnvelope<NonceResponse>`; if `!success or !data.nonce` → `authFailed("Güvenlik anahtarı alınamadı.")` |
| 10 | `GET auth/me` | — | `AuthMeResponse` | none (errors swallowed by caller) |
| 11 | `POST auth/login` | `{email, password, nonce}` | `AuthSuccessResponse` | Only if the REST call threw `authFailed` → ajax `action=otomenzil_login`, same fields → `AjaxEnvelope<AuthSuccessResponse>`; failure → `authFailed("Giriş başarısız. Lütfen bilgilerinizi kontrol edin.")` |
| 12 | `POST auth/register` | `{fullName, email, password, memberSlug, nonce}` | `AuthSuccessResponse` | Only on `authFailed` → ajax `action=otomenzil_register`, same fields; failure → `authFailed("Kayıt başarısız. Lütfen bilgilerinizi kontrol edin.")` |
| 13 | `POST auth/check-member-slug` | `{memberSlug, nonce}` | `MemberSlugCheckResponse` | none |
| 14 | `POST auth/suggest-member-slug` | `{fullName, nonce}` | `MemberSlugSuggestResponse` | none |
| 15 | `POST auth/google` | `{credential, nonce}` (`credential` = Google ID token/JWT) | `AuthSuccessResponse` | **Inverted logic vs login:** if REST threw `authFailed` → rethrow (server rejected credentials); on *any other* error (404, network, decode) → ajax `action=otomenzil_google_auth`; failure → `authFailed("Google ile giriş tamamlanamadı.")` |
| 16 | `POST auth/forgot-password` | `{email, nonce}` | `AuthMessageResponse` `{message?}`; default success text `"Şifre sıfırlama bağlantısı e-posta adresinize gönderildi."` | `authFailed` → rethrow; other errors → ajax `action=otomenzil_forgot_password`; failure → `authFailed(data.message ?? "Şifre sıfırlama başarısız.")` |
| 17 | `POST auth/logout` | `{nonce}` | `AuthMessageResponse` (ignored) | **Both are always fired best-effort** (errors swallowed): REST `auth/logout` *and* ajax `action=otomenzil_logout`. |
| 18 | ajax only: `action=otomenzil_setup_username` | fields `{memberSlug, nonce}` | `AjaxEnvelope<ProfileUpdateResponse>`; `!success` → `authFailed("Kullanıcı adı kaydedilemedi.")` | (no REST variant) |

### 3.3 User profile / favorites / garage

| # | Method & path | Body | Response | Fallback |
|---|---|---|---|---|
| 19 | `POST user/profile` | `{username, email, currentPassword, newPassword, avatarColor, nonce}` | `ProfileUpdateResponse` | On **any** REST error → ajax `action=otomenzil_update_profile` with the same fields; failure → `authFailed("Profil güncellenemedi.")` |
| 20 | `PUT user/favorites` | `{favorites: string[]}` | `FavoritesPayload` `{favorites: string[]}` | On any error → `POST user/favorites` same body; on any error → ajax `action=otomenzil_save_favorites`, fields `{nonce, favorites: <JSON-stringified array>}` |
| 21 | `GET user/garage` | — | `GarageClientPayload` | none |
| 22 | `PUT user/garage` | `{carId, action}` where `action ∈ "add" \| "remove" \| "setPrimary"` | `GarageClientPayload` | none at API level (AuthStore retries once after refreshing the nonce — §4.6) |

### 3.4 Engagement — ratings, reviews, likes, comments

| # | Method & path | Body / fields | Response | Fallback |
|---|---|---|---|---|
| 23 | `GET cars/{carId}/rating` | — | `CarRatingStatusResponse` | Any error → ajax `action=otomenzil_car_rating_status`, fields `{nonce, carId}` |
| 24 | `POST cars/{carId}/rating/vote` | `{rating: number}` | `CarRatingVoteResponse` | Any error → ajax `action=otomenzil_car_rating_vote`, fields `{nonce, carId, rating}` (rating stringified) |
| 25 | `GET cars/{slug}/reviews` | — | `{reviews: CarReview[]}` | none |
| 26 | `POST cars/{carId}/reviews` | `{comment, parentId?}` (`parentId` omitted/null for top-level) | `CarReviewResponse` `{review}` | Any error → ajax `action=otomenzil_add_car_review`, fields `{nonce, carId, comment[, parentId]}` |
| 27 | `GET blogs/{slug}/comments` | — | `{comments: BlogComment[]}` | none |
| 28 | `POST blogs/{blogId}/like` | `{}` (empty JSON object) | `BlogLikeResponse` | Any error → ajax `action=otomenzil_blog_like`, fields `{nonce, blogId}` |
| 29 | `POST blogs/{blogId}/comments` | `{text, parentId?}` | `BlogCommentResponse` `{comment}` | Any error → ajax `action=otomenzil_add_blog_comment`, fields `{nonce, blogId, text[, parentId]}` |
| 30 | `GET compare/comments?carIds=a,b,c` | ids comma-joined then percent-encoded as one query value | `CompareCommentsPayload` | Any error → ajax `action=otomenzil_get_compare_comments`, fields `{nonce, carIds: <JSON-stringified array>}` |
| 31 | `POST compare/comments` | `{carIds: string[], text, parentId?, preferredCarId?}` | `CompareCommentResponse` `{comment}` | **Only on 404** → ajax `action=otomenzil_add_compare_comment`, fields `{nonce, carIds: <JSON string>, text[, parentId][, preferredCarId]}`; other errors rethrown |
| 32 | ajax only: `action=otomenzil_car_view` | `{nonce, carId}` | ignored | Fire-and-forget view tracking |
| 33 | ajax only: `action=otomenzil_blog_view` | `{nonce, blogId}` | ignored | Fire-and-forget |
| 34 | ajax only: `action=otomenzil_contact` | `{nonce, name, email, subject, message}` | `{message?}`; default `"Mesajınız iletildi."` | — |
| 35 | ajax only: `action=otomenzil_submit_error_report` | `{nonce, message, car_id, car_title, page_view: "detail", page_url: "https://www.otomenzil.com/arac/{carId}/", name, email}` (name/email may be empty strings) | `{message?}`; default `"Bildiriniz alındı."` | Note the **snake_case** field names here. |

### 3.5 Campaigns / push

| # | Method & path | Body | Response |
|---|---|---|---|
| 36 | `GET campaigns/popup` | — | `{popup: MobilePopupPayload \| null}` |
| 37 | `GET campaigns/notifications` | — | `{notifications: MobileNotificationItem[]}` |
| 38 | `POST campaigns/device` | `{deviceId: string, pushToken: string}` (`pushToken` may be `""`) | `{ok: boolean}` — errors swallowed |

### 3.9 Site HTML scraping (`fetchSiteThemeExtras`)

`GET https://www.otomenzil.com/` (cache bypassed). The HTML is searched with regex `window\.otomenzilData\s*=\s*(\{.*?\});`; the JSON object is parsed and:
- `themeSettings.general_logo_url` → logo URL, with `http://` rewritten to `https://`
- `themeSettings.general_tagline` → tagline

Used only when the API `settings` didn't provide a logo. Returns `SiteThemeExtras {logoURL?, tagline?}`.

---

## 4. Models (exact JSON contracts)

No key-mapping strategy is used anywhere: **JSON key == property name** below. "opt" = the key may be missing or null; decoding must tolerate both. Suggested TS types included.

### 4.1 Car catalog (`Car.swift`)

**`CarCatalogResponse`** — `{ cars: CarSummary[], count: number }`

**`CarSummary`**
| JSON key | TS type | opt |
|---|---|---|
| `id` | `string` | required |
| `brand` | `string` | required |
| `model` | `string` | required |
| `year` | `number` (int) | opt |
| `priceTL` | `number` (double) | opt |
| `priceForeign` | `string` | opt |
| `trAvailable` | `boolean` | opt |
| `rangeKm` | `number` (int) | opt |
| `batteryKwh` | `number` (double) | opt |
| `powerHp` | `number` (int) | opt |
| `accelerationSec` | `number` (double) | opt |
| `chargingMin` | `number` (int) | opt |
| `maxSpeedKmh` | `number` (int) | opt |
| `driveType` | `string` | opt |
| `bodyType` | `string` | opt |
| `segment` | `string` | opt |
| `trunkLiters` | `number` (int) | opt |
| `popularity` | `number` (int) | opt |
| `rating` | `number` (double) | opt |
| `ratingVoteCount` | `number` (int) | opt |
| `dataVerified` | `boolean` | opt |
| `images` | `string[]` | opt |

Computed helpers to port (pure functions):
- `displayTitle`: if `model.toLowerCase().startsWith(brand.toLowerCase())` → `model`, else `` `${brand} ${model}` ``
- `heroImageURL`: first non-empty entry of `images`
- `priceDisplay`: `priceTL` formatted `tr-TR` decimal, 0 fraction digits, suffix `" ₺"` (via `CarPriceFormatter`)
- `rangeDisplay` `"{rangeKm} km"`, `batteryDisplay` `"{n} kWh"` (integral → no decimals, else 1 decimal), `powerDisplay` `"{powerHp} HP"`, `accelerationDisplay` `"{x.x} sn"`, `chargingDisplay` `"{chargingMin} dk"`
- `consumptionDisplay`: `batteryKwh / rangeKm * 100` → `"{x.x} kWh/100km"` (needs `rangeKm > 0` and both present)

**`CarDetail`** — all `CarSummary` fields **except `popularity`**, plus:
| JSON key | TS type | opt |
|---|---|---|
| `torqueNm` | `number` (int) | opt |
| `warrantyYears` | `number` (int) | opt |
| `description` | `string` | opt |
| `colors` | `CarColor[]` | opt |
| `techSpecs` | `Record<string, JSONValue>` | opt |

Computed: `displayTitle` (same rule), `galleryURLs` (valid URLs from `images`), `soldInTurkey = trAvailable !== false` (**null/undefined counts as sold-in-Turkey**).

The app converts between summary and detail: `CarDetail(summary:)` fills missing detail fields with null; `CarSummary(detail:)` sets `popularity: null`.

**`CarColor`** — `{ name: string, hex: string }` (both required; synthetic id = `"{name}-{hex}"`).

**`JSONValue`** (for `techSpecs`): recursive JSON union. TS:
```ts
type JSONValue = string | number | boolean | null | JSONValue[] | { [key: string]: JSONValue };
```
Swift decode order is bool → int → double → string → array → object → null (unknown → null). Plain `JSON.parse` output is equivalent.

### 4.2 Blog (`BlogPost.swift`)

**`BlogListResponse`** — `{ blogs: BlogPost[], count: number }`

**`BlogPost`**
| JSON key | TS type | opt |
|---|---|---|
| `id` | `string` | required |
| `title` | `string` | required |
| `excerpt` | `string` | opt |
| `category` | `string` | opt |
| `author` | `string` | opt |
| `authorSlug` | `string` | opt |
| `image` | `string` | opt |
| `readTimeMin` | `number` (int) | opt |
| `date` | `string` | opt (display string, not parsed) |
| `content` | `string` | opt (HTML) |
| `tags` | `string[]` | opt |
| `likes` | `number` (int) | opt |
| `views` | `number` (int) | opt |
| `userLiked` | `boolean` | opt |
| `reportReliability` | `string` | opt |
| `reportSource` | `string` | opt |
| `reportUpdated` | `string` | opt |
| `reportModel` | `string` | opt |
| `relatedCarIds` | `string[]` | opt |
| `commentCount` | `number` (int) | opt |

### 4.3 Shell (`ShellModels.swift`)

**`NavItem`** — `{ id: string, label: string, title?: string, icon?: string, badge?: string }`

**`NavigationPayload`** — `{ primary: NavItem[], secondary: NavItem[], heroQuickLinks: NavItem[], rankedGuides: NavItem[] }` (all four required arrays).

**`MobileAppSettings`** — every field optional:
| JSON key | TS type |
|---|---|
| `siteName`, `siteUrl`, `generalSiteName`, `generalTagline` | `string` |
| `generalLogoUrl`, `generalLogoDarkUrl`, `themePrimaryColor` | `string` |
| `headerBarTagline`, `headerUpdateLabel` | `string` |
| `homeHeroTitle`, `homeHeroSubtitle`, `homeFeaturedCarsTitle` | `string` |
| `carPriceMin`, `carPriceMax` | `number` (int) |
| `carArchiveTitle`, `carArchiveSubtitle`, `carDefaultSort` | `string` |
| `mobileShowBlog`, `mobileShowStations` | `boolean` |
| `navigation` | `NavigationPayload` |
| `brandLogos` | `Record<string,string>` (brand → logo URL) |
| `filterOptions` | `FilterOptions` |
| `ajaxNonce` | `string` (**seed nonce for AuthStore**) |
| `stationsSyncMessage` | `string` |
| `googleClientId` | `string` (Google Sign-In web client id) |
| `comparisonSpecSchema` | `ComparisonSpecCategory[]` |
| `adSlots` | `Record<string, AdSlotConfig>` |
| `adsensePublisherId` | `string` |
| `brandPriceListUrls` | `Record<string,string>` |

**`ComparisonSpecCategory`** (defined in `Utils/CarTechSpecBuilder.swift` but part of the settings JSON) — `{ categoryName: string, specs: ComparisonSpecDefinition[] }`; **`ComparisonSpecDefinition`** — `{ label: string, key: string, unit?: string }`.

**`FilterOptions`** — `{ brands?: string[], bodyTypes?: string[], driveTypes?: string[], segments?: string[] }`

**`SpotlightCard`** — `{ label: string, badge: string, tone: string, car: CarSummary }` (id = `car.id`).

**`BodyTypeCount`** — `{ type: string, count: number }` (id = `type`).

**`CompareDuelCar`** — `{ id: string, name: string, brand: string, rangeKm?: number, priceTL?: number }`
**`CompareDuel`** — `{ id: string, title: string, tag?: string, matchReason: string, car1: CompareDuelCar, car2: CompareDuelCar }`

**`BrandsResponse`** — `{ brandLogos: Record<string,string> }`

**`BlogCategoryArchive`** — `{ name: string, slug: string, description: string, emoji: string, count: number }` (all required).

**`HomeResponse`** (`GET home`)
| JSON key | TS type | opt |
|---|---|---|
| `settings` | `MobileAppSettings` | opt |
| `spotlightCards` | `SpotlightCard[]` | opt |
| `featuredCars` | `CarSummary[]` | **required** |
| `featuredCarsTitle` | `string` | opt |
| `latestBlogs` | `BlogPost[]` | **required** |
| `blogCategories` | `Record<string, BlogCategoryArchive>` | opt |
| `brandLogos` | `Record<string,string>` | opt |
| `bodyTypeCounts` | `BodyTypeCount[]` | opt |
| `popularDuels` | `CompareDuel[]` | opt |
| `filterOptions` | `FilterOptions` | opt |
| `brandPriceListUrls` | `Record<string,string>` | opt |

`ShellOverlay` / `AppViewID` are navigation enums (UI layer). `AppViewID` raw values worth noting for deep links: `home, search, compare, blog, stations, brands, consumption, trunk, otv, mtv, vehicle-loan, best-cars, longest-range, lowest-consumption, profile, garage, settings, contact, about, privacy, cookies, terms`.

### 4.4 Auth (`AuthModels.swift`)

**`UserProfile`** — custom decoding:
| JSON key | TS type | Decoding rule |
|---|---|---|
| `username` | `string` | missing/null → default `"Üye"` |
| `email` | `string` | missing/null → default `""` |
| `memberSlug` | `string?` | plain optional |
| `canChangeUsername` | `boolean?` | **flexible bool**: accepts `true/false`, numbers (`≠0` → true), strings (`"1"` or case-insensitive `"true"` → true; any other string → false); anything else → undefined |
| `isAdmin` | `boolean?` | flexible bool (same rule) |
| `avatarColor` | `string?` | plain optional |
| `memberSince` | `string?` | plain optional |

**`AuthSuccessResponse`** — `{ user: UserProfile, favorites?: string[], sessionToken?: string, needsUsernameSetup?: boolean, isNewUser?: boolean, garageCarIds?: string[], primaryGarageCarId?: string, garageCars?: CarSummary[] }` (`user` required).

**`AuthMeResponse`** — same shape but `user` is also optional: `{ user?, favorites?, garageCarIds?, primaryGarageCarId?, garageCars? }`.

**`GarageClientPayload`** — `{ garageCarIds: string[], primaryGarageCarId?: string, garageCars?: CarSummary[] }`; custom decode: missing `garageCarIds` → `[]`.

**`AuthMessageResponse`** — `{ message?: string }`
**`ProfileUpdateResponse`** — `{ user: UserProfile, message?: string }`
**`NonceResponse`** — `{ nonce: string }`
**`MemberSlugCheckResponse`** — `{ memberSlug?: string, available?: boolean }`
**`MemberSlugSuggestResponse`** — `{ suggestions: string[] }`

**`AjaxEnvelope<T>`** — `{ success: boolean, data?: T }`; `success` required; **`data` is decoded with `try?`** — if `data` fails to decode as `T`, it becomes `undefined` rather than failing the whole parse. Reproduce this leniency (e.g. zod `.catch(undefined)` on `data`).
**`AjaxErrorPayload`** — `{ message?: string }`.

### 4.5 Engagement (`EngagementModels.swift`)

- **`FavoritesPayload`** — `{ favorites: string[] }`
- **`CarRatingStats`** / **`CarRatingStatusResponse`** — `{ average: number, count: number, hasVoted?: boolean }`; helper `voted = hasVoted ?? false`
- **`CarRatingVoteResponse`** — `{ recorded?: boolean, message?: string, stats?: CarRatingStats }`
- **`CarReview`** — `{ id: string, userName: string, memberSlug?: string, rating?: number, comment: string, date: string, carId?: string, parentId?: string, likes?: number }`
- **`CarReviewResponse`** — `{ review: CarReview }`
- **`BlogComment`** — `{ id: string, userName: string, memberSlug?: string, text: string, date: string, parentId?: string, likes?: number }`
- **`BlogCommentResponse`** — `{ comment: BlogComment }`
- **`BlogLikeResponse`** — `{ likes: number, userLiked: boolean }` (both required)
- **`MessagePayload`** — `{ message?: string }`
- **`CarDetailResponse`** — `{ car: CarDetail, reviews?: CarReview[] }` *(declared; detail fetch actually decodes bare `CarDetail`)*
- **`BlogDetailResponse`** — `{ blog: BlogPost, comments?: BlogComment[] }` *(declared, ditto)*
- **`CompareComment`** — `{ id: string, userName: string, memberSlug?: string, text: string, date: string, parentId?: string, likes?: number, preferredCarId?: string }`
- **`CompareCommentsPayload`** — `{ comments: CompareComment[], likedCommentIds?: string[], compareKey?: string }`
- **`CompareCommentResponse`** — `{ comment: CompareComment }`

### 4.6 Ads (`AdSlotModels.swift`)

**`AdSlotConfig`** — `{ mode?: string, image?: string, code?: string, link?: string, adsenseSlot?: string }`.
Slot keys (`AdSlotKey` raw values, used as keys of `settings.adSlots`): `home_top`, `home_mid`, `search_top`, `detail_top`, `detail_sidebar`. Each key has hardcoded Turkish placeholder copy + layout (`banner`/`sidebar`) for when no config exists — see `AdSlotModels.swift` for the exact strings.

### 4.7 Campaigns (`MobileCampaignManager.swift`)

**`MobilePopupPayload`** — `{ id: string, title?: string, body?: string, imageUrl?: string, buttonLabel?: string, buttonUrl?: string, dismissLabel?: string }`
**`MobileNotificationItem`** — `{ id: string, title?: string, body?: string, url?: string }`

### 4.8 Charging stations DTO (`Utils/EpdkStationsData.swift`, `GET charging-stations`)

**`SeedStationDTO`** — `{ id: string, epdkId?: number, operatorName: string, operatorKey: string, stationName: string, city: string, district: string, latitude: number, longitude: number, address: string, sockets: SocketDTO[], hasAc: boolean, hasDc: boolean, hasHpc: boolean, maxPowerKw: number, serviceType?: string, phone?: string }`
**`SocketDTO`** — `{ type: string, powerKw: number, count: number, socketNumbers?: string[] }`
Missing `epdkId` is derived from `id` by stripping an `"epdk-"` prefix and parsing as int (else 0). Same DTO shape is used for the bundled seed file `Resources/epdk-stations-seed.json` (a bare array).

---

## 5. AuthStore — full auth flow

Observable store; state fields:
`currentUser: UserProfile?`, `favorites: string[]`, `garageCarIds: string[]`, `primaryGarageCarId: string` (empty = none), `garageCarSummaries: Record<string, CarSummary>` (cache), `busyGarageCarIds: Set<string>`, `busyGarageCarActions: Record<string,string>` (declared, effectively unused), `showModal`, `authMessage: string?`, `isSubmitting`, `lastError: string?`, `showSuccess`, `pendingGarageOnboarding`, `pendingUsernameSetup`, `logoutToastMessage: string?`, `favoriteToastMessage: string?`. Private: `nonce`, `nonceFetchedAt`, `nonceTTL = 900s`, `sessionToken`. `isLoggedIn = currentUser != null`.

### 5.1 Init & bootstrap

- **Constructor** restores `LocalAuthSession` (user, favorites, garage ids, primary, token) synchronously so the UI renders logged-in immediately.
- **`bootstrap(nonceFromSettings)`** (called after shell settings load, passing `settings.ajaxNonce`):
  1. Re-applies the stored session for any fields still empty.
  2. Seeds `nonce` from `nonceFromSettings` if non-empty.
  3. Sets `APIClient.authToken` from the stored token if unset.
  4. If neither a user nor a token exists → stop (keep the settings nonce).
  5. If no nonce yet → `fetchFreshNonce()`.
  6. `GET auth/me`; if it returns a `user`, apply the session (server favorites/garage override local, but see merge rules in 5.5) and merge `garageCars` summaries. Errors are silently ignored (stay on cached session).

### 5.2 Nonce lifecycle

- `fetchFreshNonce()` → `api.fetchAuthNonce()` (§3.2 #9: homepage warm-up → REST `auth/nonce` fresh → ajax fallback). Stores nonce + timestamp; on failure returns the previous nonce.
- `refreshNonceIfNeeded()` / `currentNonce()`: reuse the cached nonce if younger than **900 s**, else fetch fresh.
- Login/register/google always force a **fresh** nonce first; if unobtainable → `lastError = "Güvenlik anahtarı alınamadı."` and abort.

### 5.3 Login / Register / Google / Forgot / Profile

- **login(email, password)**: fresh nonce → `POST auth/login` (ajax fallback) → `applySession(user, favorites ?? [], token: sessionToken)` + apply garage payload from response → `showSuccess = true` for 350 ms → close modal. Errors → `lastError = message`.
- **register(fullName, email, password, memberSlug)**: same, plus `pendingGarageOnboarding = true` after closing the modal. (Username/slug is chosen during registration; `auth/check-member-slug` and `auth/suggest-member-slug` back the registration form.)
- **googleLogin(credential)**: same as login; afterwards: `needsUsernameSetup === true` → `pendingUsernameSetup = true`; else `isNewUser === true` → `pendingGarageOnboarding = true`.
- **Username onboarding**: the setup UI calls ajax `otomenzil_setup_username` (§3.2 #18) then `completeUsernameSetup(user)` → re-apply session with the new user, `pendingUsernameSetup = false`, `pendingGarageOnboarding = true` (chained onboarding).
- **forgotPassword(email)**: cached-nonce refresh → §3.2 #16 → returns the message string (or null with `lastError` set).
- **updateProfile(username, email, currentPassword, newPassword, avatarColor)**: nonce refresh → §3.3 #19 → apply session with updated user → return `message ?? "Hesap bilgileriniz kaydedildi."`.

### 5.4 Logout

Best-effort `refreshNonceIfNeeded()` + `api.logout(nonce)` (fires **both** REST `auth/logout` and ajax `otomenzil_logout`, errors ignored). Then clear all state (user, favorites, garage, pending flags, token), `LocalAuthSession.clear()` (also nulls `APIClient.authToken`), navigate home / close overlay / close drawer, and set `logoutToastMessage = "Çıkış yapıldı"`.

### 5.5 applySession merge rules (subtle — replicate exactly)

- `favorites`: if the incoming list is empty but local is non-empty → **keep local** (protects against a lossy server response).
- `garageCarIds`: take incoming unless incoming is empty *and* local is non-empty.
- `primaryGarageCarId`: same rule.
- token resolution order: explicit incoming token → existing `sessionToken` → `APIClient.authToken`; the resolved token is written back to `APIClient.authToken`.
- Every `applySession`/garage/favorite mutation calls `persistSession()` → `LocalAuthSession.save(...)` (only when a user exists).

### 5.6 Favorites

`toggleFavorite(carID)`:
- Not logged in → `openAuth("Favorilere eklemek için giriş yapın.")` and return.
- Optimistically add/remove locally, then `refreshNonceIfNeeded()` + `saveFavorites` (§3.3 #20 with its PUT→POST→ajax chain).
- Server result rule: `favorites = (saved.isEmpty && !updated.isEmpty) ? updated : saved` — i.e. distrust an unexpectedly empty server echo.
- Persist; toast `favoriteToastMessage = "Favorilerden çıkarıldı."` (removed) or `"Favorilerinize eklendi."` (added). On error: keep the optimistic value, set `lastError`, persist anyway.

### 5.7 Garage

- `toggleGarageCar(carID)`: requires login (`openAuth("Aracını garajına eklemek için giriş yapın.")`), skips if the car id is busy. Optimistic update: remove (and if it was primary, promote first remaining id or `""`) or append (first car / empty primary → becomes primary; summary cached from the catalog). Persist, then `PUT user/garage {carId, action: "add"|"remove"}`. On failure: refresh nonce and retry **once**; if the retry also fails, roll back ids/primary/summaries, set `lastError`, persist.
- `setPrimaryGarageCar(carID)`: only if in garage & not busy → optimistic `primaryGarageCarId = carID`, persist, nonce refresh, `PUT user/garage {carId, action: "setPrimary"}`. On failure: revert primary, set `lastError`, then `GET user/garage` to resync. Marks the id busy during the call.
- Server `GarageClientPayload` responses fully replace `garageCarIds` and `primaryGarageCarId` (`?? ""`), and merge `garageCars` into the summary cache.
- Helpers: `isFavorite`, `isInGarage`, `primaryGarageCar(from:)` (primary id, else first garage id; summary from cache or catalog), `garageCars(from:)`.

---

## 6. Stores

### 6.1 AppNavigationStore (brief, per request)

Shell state: `currentView`, `overlay` (`car(slug)`/`blog(slug)`), `drawerOpen`, `homeData`, `appSettings`, `catalogCars`, `brandLogos`, `compareList` (max 3), `carDetailCache: Record<slug, CarDetail>`, `cachedBlogs`, `resolvedLogoURL/Tagline`, `isLoadingShell`, `shellError`, blog filter/search, various modal flags, `pendingSearchQuery`, `selectedBrandName`, `pageLoadingMessage`.

Data-layer-relevant behavior:
- **`bootstrap()`**: restore `ShellBootstrapCache` → `GET home` → seed `catalogCars`/`cachedBlogs`/`brandLogos` from home if empty → save cache → background enrichment (`GET settings`, `GET cars`, `GET brands`, `GET blogs` in parallel; homepage HTML theme-extras only if still no logo; `GET charging-stations` refresh) → save cache again. On failure with no cache → `shellError`.
- **`refreshHome()`**: settings + home + cars, sequential.
- **`refreshCatalog(forceFresh)`**: throttled — skips if the last refresh was < **300 s** ago (unless forced); forced uses `cars?fresh=1`; saves cache.
- `logoURL(isDarkMode:)` picks dark logo then light logo from settings with `http://`→`https://` rewriting, falling back to the scraped `resolvedLogoURL`. Default tagline: `"Türkiye'nin elektrikli araç karşılaştırma platformu"`.
- Derived: `settings = appSettings ?? homeData.settings`, `googleClientId`, `spotlightCards`/`bodyTypeCounts`/`popularDuels` (client-side builders fill in when the API omits them), `brandPriceListUrls`, `filterOptions`, `adSlotConfig(for:)`, `relatedBlogs(for:)` (matches `relatedCarIds` contains car id, else brand/model substring over title+excerpt+tags; needs ≥2 matches else first 6 blogs), `carSummary(for:)`.

### 6.2 AppPreferencesStore (UserDefaults-backed booleans)

| Key | Default |
|---|---|
| `otomenzil.pref.pushNotifications` | `true` |
| `otomenzil.pref.verifiedDataOnly` | `false` |
| `otomenzil.pref.analytics` | `true` |
| `otomenzil.pref.compactCards` | `false` |
| `otomenzil.pref.darkMode` | `false` (also syncs the app theme on change and at init) |

Each setter writes through immediately.

### 6.3 ShellBootstrapCache

UserDefaults keys, each holding **JSON-encoded** model data (encoded with default `JSONEncoder`, same camelCase keys as the API):

| Key | Content |
|---|---|
| `otomenzil.shell.home` | `HomeResponse` |
| `otomenzil.shell.cars` | `CarSummary[]` |
| `otomenzil.shell.settings` | `MobileAppSettings` |

- `apply(to:)` restores home → `homeData`, cars → `catalogCars` (only if non-empty), settings → `appSettings`; returns `true` if home **or** cars restored (settings alone doesn't count).
- `save(from:)` writes whichever of the three are present/non-empty. No TTL/expiry — cache is unconditionally trusted for first paint, then refreshed from network.

### 6.4 LocalAuthSession

Single UserDefaults key **`otomenzil.auth.session`** containing JSON-encoded:

```jsonc
{
  "user": {            // StoredUserProfile — same keys as UserProfile
    "username": "...", "email": "...", "memberSlug": null,
    "canChangeUsername": null, "isAdmin": null, "avatarColor": null, "memberSince": null
  },
  "favorites": ["car-id"],
  "garageCarIds": ["car-id"],
  "primaryGarageCarId": "",
  "sessionToken": "",       // trimmed; "" when cookie-only session
  "savedAt": 773107200.0    // Swift Date = seconds since 2001-01-01 (reference date), not Unix epoch
}
```

- `save(...)` trims the token; non-empty token also sets `APIClient.authToken`.
- `restore()` decodes; on failure tries a **legacy** shape `{user, favorites, sessionToken}` (missing garage fields → `[]` / `""`). Sets `APIClient.authToken` when the token is non-empty. Returns tuple or null.
- `clear()` removes the key and nulls `APIClient.authToken`.
- **Note:** the token lives in UserDefaults, not Keychain, and the auth session may also be cookie-based only (empty token) — the WP cookies in the shared cookie jar then carry authentication.

### 6.5 MobileCampaignManager

State: `activePopup: MobilePopupPayload?`, `unreadNotifications: MobileNotificationItem[]`.

- **deviceId**: UserDefaults key `otomenzil.device.id`; first run stores `identifierForVendor` UUID (fallback random UUID) and reuses it forever.
- **`bootstrap()`** (run at shell appear, and re-run whenever a push token arrives): `registerDevice(pushToken: latestToken ?? "")` → `refreshPopup()` → `refreshNotifications()`.
- **registerDevice**: `POST campaigns/device {deviceId, pushToken}` — response `{ok}` and all errors ignored.
- **refreshPopup**: `GET campaigns/popup`; if `popup` null → clear. Otherwise check dismissal key **`otomenzil.popup.dismissed.<popupId>.<yyyy-MM-dd>`** (local timezone date): if set → suppress, else show.
- **dismissPopup(popup)**: set that key to `true` (i.e. **dismissal is per-popup per-day**; the same popup reappears the next day) and clear `activePopup`.
- **refreshNotifications**: `GET campaigns/notifications` → `{notifications: MobileNotificationItem[]}`; errors ignored.
- The shell also calls `refreshPopup()` on app foreground/refresh cycles.

---

## 7. PushNotificationService

- On app launch (`AppDelegate.didFinishLaunching`): set `UNUserNotificationCenter` delegate, request authorization for **alert + badge + sound**; if granted → `registerForRemoteNotifications()` on the main thread.
- On APNs token receipt: hex-encode the token bytes **lowercase** (`%02x` per byte, concatenated), store in static `PushNotificationService.latestToken`, and broadcast a `otomenzil.pushTokenDidUpdate` NotificationCenter event.
- `AppShellView` listens for that event and re-runs `MobileCampaignManager.bootstrap()`, which uploads the token via **`POST campaigns/device {deviceId, pushToken}`** (§3.5 #38). There is **no separate push-token endpoint**.
- Foreground notifications are presented with banner + sound + badge. There is **no tap/deep-link handling** of notification payloads in the iOS app.
- Registration failures are only logged in debug. The `otomenzil.pref.pushNotifications` preference exists but does **not** gate registration in the current code (registration always requested at launch).

---

## 8. React Native mapping notes

| iOS mechanism | RN equivalent / recommendation |
|---|---|
| `URLCache` + `.returnCacheDataElseLoad` | RN `fetch` has no equivalent policy. Use TanStack Query with persisted cache (AsyncStorage/MMKV persister), `staleTime: Infinity`-style "serve cache, refetch manually" semantics; expose a `fresh` flag that maps to `refetch`/`fetchQuery` with cache bypass. For `cars?fresh=1` keep the query param — the server keys its own cache on it. |
| `HTTPCookieStorage.shared` cookies | Native cookie jars back RN `fetch` on both platforms — leave `credentials` handling default and do not clear cookies. Keep the homepage warm-up GET before nonce fetches; keep it before login too since ajax fallbacks depend on WP cookies. |
| `UserDefaults` (prefs, shell cache, device id, popup dismissals) | `AsyncStorage` (or `react-native-mmkv` for the shell cache — it holds full JSON payloads read at cold start; MMKV's sync reads reproduce the instant first paint). Keep the same key names if you want migration-free upgrades from... (not applicable cross-app, but keep names for consistency). |
| `UserDefaults` auth session (`otomenzil.auth.session`) | **Upgrade to `expo-secure-store`** for the token (iOS stored it insecurely). Store the JSON blob; replace `savedAt` (Swift reference-date seconds) with ISO 8601 or epoch ms — nothing reads it, it's informational. |
| Static `APIClient.authToken` | Module-level token holder in the API client (set before any request; attach `Authorization: Bearer` when non-empty). |
| `NotificationCenter` `.pushTokenDidUpdate` | Any event emitter / zustand subscription: on push-token change → re-run campaign bootstrap (device registration). |
| `@Observable` stores | zustand (or Redux Toolkit) stores mirroring the state fields in §5/§6. |
| `identifierForVendor` | `expo-application` (`getIosIdForVendorAsync()` / `androidId`), persisted under the same "generate once, reuse forever" rule. |
| APNs raw token | The backend receives a **raw hex APNs device token**. With Expo use `Notifications.getDevicePushTokenAsync()` (NOT the Expo push token) and lowercase-hex it on iOS; decide with backend how to flag Android FCM tokens (the current backend only ever saw APNs hex strings). |
| `UNUserNotificationCenter` foreground presentation | `expo-notifications` `setNotificationHandler` returning `{shouldShowAlert/banner: true, shouldPlaySound: true, shouldSetBadge: true}`. |
| `JSONDecoder` leniency | Use zod/valibot schemas that mirror §4 exactly: optional = `.optional().nullable()`; flexible bool (`UserProfile`) = union transform; `AjaxEnvelope.data` = `.catch(undefined)`; `GarageClientPayload.garageCarIds` = `.default([])`; `UserProfile.username/email` defaults `"Üye"` / `""`. |
| Turkish formatting (`tr_TR` NumberFormatter) | `Intl.NumberFormat('tr-TR', {maximumFractionDigits: 0})` + `" ₺"` suffix (Hermes ships Intl). |
| `http://`→`https://` rewrite on logo/media URLs | Apply the same `.replace(/^http:\/\//, 'https://')` (actually a global replace in Swift) on `generalLogoUrl`, `generalLogoDarkUrl`, and scraped logo URLs. |
| Homepage HTML scraping (`window.otomenzilData`) | Fetch site root as text, regex `window\.otomenzilData\s*=\s*(\{.*?\});`, `JSON.parse`, read `themeSettings.general_logo_url` / `general_tagline`. Only needed when settings lack a logo. |
| Google Sign-In | `@react-native-google-signin/google-signin` with `webClientId = settings.googleClientId`; send the **idToken** as `credential` to `POST auth/google`. |

### Tricky behaviors checklist (easy to miss)

1. **Nonce**: 15-minute client TTL; seeded from `settings.ajaxNonce`; always preceded by a cookie warm-up GET; REST endpoint with ajax fallback; login/register/google always force-refresh it.
2. **REST→ajax fallback matrix** differs per endpoint (§3): login/register fall back only on `authFailed`; google/forgot-password fall back on everything *except* `authFailed`; profile-update and most engagement calls fall back on *any* error; compare-comment POST only on 404; favorites try PUT → POST → ajax.
3. **admin-ajax quirks**: 200–499 accepted, body `"0"` = invalid nonce/session, `{success:false}` envelopes, form-encoding with percent-escaped values, snake_case fields on `otomenzil_submit_error_report` only.
4. **Optimistic updates with specific rollback rules** for favorites (trust-local-if-server-empty) and garage (retry once after nonce refresh, then rollback; setPrimary resyncs via `GET user/garage`).
5. **Session persistence merge rules** (§5.5) prevent an empty server payload from wiping local favorites/garage.
6. **Popup dismissal is per-day** (`…dismissed.<id>.<yyyy-MM-dd>`), so purge nothing — old keys just become irrelevant.
7. **Blog detail 404 fallback** re-fetches the whole list and matches by id.
8. **`CarDetail.soldInTurkey`**: `trAvailable !== false` — missing means *available*.
9. All user-facing error/toast strings are Turkish and come from the data layer (§2.5, §5) — keep them verbatim.
