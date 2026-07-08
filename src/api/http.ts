// Düşük seviye fetch sarmalayıcısı — iOS APIClient'ın transport katmanı (spec §2).
//
// Sorumluluklar:
//  - Her isteğe sabit başlıkları uygular (User-Agent + Referer + Accept + Accept-Language;
//    token varsa Authorization: Bearer). UA/Referer sunucu bot/hotlink filtrelerini
//    geçmek için bilinçli (spec §2.2).
//  - REST yol → mutlak URL çözümü (baştaki/sondaki `/` kırpılır, apiBaseURL'e göre çözülür).
//  - JSON gövde POST/PUT ve JSON çözümü; hata durumunda Türkçe mesaj çıkarımı (spec §2.5).
//  - GET yanıtları için AsyncStorage tabanlı yerel önbellek — iOS `URLCache` +
//    `.returnCacheDataElseLoad` semantiğini taklit eder (varsa önbelleği ağ olmadan döner).
//  - http→https URL normalizasyonu (logo/medya için).
//
// AUTH SEAM (Wave 3 authStore buraya bağlanır):
//  - Bearer token modül seviyesinde `setAuthToken(token)` ile enjekte edilir; iOS'un statik
//    `APIClient.authToken` alanının karşılığı. authStore, oturum uygulanınca/temizlenince çağırır.
//    Token boş/null ise Authorization başlığı hiç eklenmez.
//  - Nonce, istemci metodlarına açık parametre olarak geçirilir (iOS'ta olduğu gibi); nonce
//    yaşam döngüsü authStore'a aittir. `client.getNonce()` ilkel nonce çekimini sağlar.
//
// ÇEREZLER (load-bearing): React Native `fetch` çerezleri her iki platformda da yerel HTTP
// yığını üzerinden otomatik yönetir. WP oturum çerezleri (warm-up GET ve login yanıtlarında
// set edilir; admin-ajax fallback'leri bunlara bağımlıdır) bu sayede taşınır. `credentials`
// AYARINI KAPATMAYIN — varsayılan (include) davranışı korunmalı.

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  apiBaseURL,
  acceptHeader,
  acceptLanguage,
  referer,
  userAgent,
} from '../config';

// ── Auth token holder (enjeksiyon noktası) ────────────────────────────────────

let authToken: string | null = null;

/** authStore tarafından çağrılır: Bearer token'ı ayarlar/temizler (iOS `APIClient.authToken`). */
export function setAuthToken(token: string | null): void {
  authToken = token && token.length > 0 ? token : null;
}

/** Geçerli bearer token (test/teşhis için). */
export function getAuthToken(): string | null {
  return authToken;
}

// ── Hata tipi (iOS APIError enum karşılığı, spec §2.5) ─────────────────────────

export type ApiErrorKind = 'invalidURL' | 'badStatus' | 'decodingFailed' | 'authFailed';

/**
 * `message` alanı doğrudan kullanıcıya gösterilen Türkçe metindir (iOS `errorDescription`).
 * `kind`/`status` fallback matrisinin karar vermesi için korunur (ör. authFailed vs 404).
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;

  constructor(kind: ApiErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static invalidURL(): ApiError {
    return new ApiError('invalidURL', 'Site adresi hatalı.');
  }

  static badStatus(code: number): ApiError {
    return new ApiError('badStatus', `Sunucu hatası (${code}).`, code);
  }

  static decodingFailed(detail: string): ApiError {
    return new ApiError('decodingFailed', `Veri okunamadı. (${detail})`);
  }

  static authFailed(message: string): ApiError {
    return new ApiError('authFailed', message);
  }

  get isAuthFailed(): boolean {
    return this.kind === 'authFailed';
  }
}

/** `err` bir ApiError ve authFailed türünde mi? (fallback matrisinde sık kullanılır) */
export function isAuthFailed(err: unknown): boolean {
  return err instanceof ApiError && err.kind === 'authFailed';
}

/** `err` bir ApiError ve `badStatus(code)` mı? */
export function isBadStatus(err: unknown, code?: number): boolean {
  return err instanceof ApiError && err.kind === 'badStatus' && (code === undefined || err.status === code);
}

// ── URL yardımcıları ───────────────────────────────────────────────────────────

/** `http://` → `https://` (global; logo/medya URL'leri için — iOS ile birebir). */
export function toHttpsUrl(url: string): string {
  return url.replace(/http:\/\//g, 'https://');
}

/** REST yolunu mutlak URL'e çevirir: baştaki/sondaki `/` kırpılır, apiBaseURL'e göre çözülür. */
export function resolveApiUrl(path: string): string {
  const trimmed = path.replace(/^\/+/, '').replace(/\/+$/, '');
  try {
    return new URL(trimmed, apiBaseURL).toString();
  } catch {
    throw ApiError.invalidURL();
  }
}

// ── Başlıklar ──────────────────────────────────────────────────────────────────

function siteHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': userAgent,
    Referer: referer,
    Accept: acceptHeader,
    'Accept-Language': acceptLanguage,
    ...extra,
  };
  if (authToken && authToken.length > 0) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  return headers;
}

// ── Hata mesajı çıkarımı (spec §2.5) ─────────────────────────────────────────────

/** İlk 800 karakterde `<html` varsa HTML hata mesajını çıkarır (iOS parseHtmlError). */
export function parseHtmlError(raw: string): string | undefined {
  const head = raw.slice(0, 800);
  if (!head.toLowerCase().includes('<html')) return undefined;
  if (head.includes('401 Unauthorized')) {
    return 'Sunucu giriş isteğini reddetti (401). wp-admin erişimi engellenmiş olabilir.';
  }
  const start = head.indexOf('<title>');
  if (start !== -1) {
    const end = head.indexOf('</title>', start + 7);
    if (end !== -1) {
      const title = head.slice(start + 7, end).trim();
      if (title.length > 0) return title;
    }
  }
  return 'Sunucu beklenmeyen bir HTML yanıtı döndürdü.';
}

/**
 * JSON/HTML gövdeden insan-okur mesaj çıkarır (iOS parseErrorMessage sırasıyla):
 * WP REST hata `{message, code?}` → message; ajax zarfı `{success:false, data:{message}}`
 * → data.message; genel `message`; `success:false` + `data` string. Bulunamazsa parseHtmlError.
 * (iOS boş `message`'ı da döndürüyor; burada boş metinleri atlıyoruz — boş hata mesajı
 * göstermek yerine bir sonraki adayı denemek daha doğru.)
 */
export function parseErrorMessage(raw: string): string | undefined {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return parseHtmlError(raw);
  }
  if (json && typeof json === 'object' && !Array.isArray(json)) {
    const obj = json as Record<string, unknown>;
    if (typeof obj.message === 'string' && obj.message.length > 0) {
      return obj.message;
    }
    if (obj.success === false) {
      const data = obj.data;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const msg = (data as Record<string, unknown>).message;
        if (typeof msg === 'string' && msg.length > 0) return msg;
      }
      if (typeof data === 'string' && data.length > 0) return data;
    }
    return undefined;
  }
  return parseHtmlError(raw);
}

// ── JSON çözümü ──────────────────────────────────────────────────────────────────

/** Başarılı (2xx) gövdeyi JSON'a çevirir; başarısızsa mesaj çıkarımı → decodingFailed. */
function decodeJson<T>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    const message = parseHtmlError(raw) ?? parseErrorMessage(raw);
    if (message) throw ApiError.authFailed(message);
    throw ApiError.decodingFailed(raw.slice(0, 180) || 'binary');
  }
}

// ── Yerel GET önbelleği (URLCache + returnCacheDataElseLoad taklidi) ──────────────

const CACHE_PREFIX = 'otomenzil.httpcache:';

async function readCache(url: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(CACHE_PREFIX + url);
  } catch {
    return null;
  }
}

async function writeCache(url: string, raw: string): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_PREFIX + url, raw);
  } catch {
    // Önbellek yazımı en iyi çaba — hata sessizce yutulur.
  }
}

export interface GetOptions {
  /**
   * `true` → yerel önbellek OKUMASINI atla, ağdan çek, başarıda önbelleği ÜZERİNE YAZ
   * (iOS `.reloadIgnoringLocalCacheData` + `cars?fresh=1` server-cache bust semantiği).
   */
  fresh?: boolean;
  /**
   * `false` → yerel önbelleği hiç kullanma (ne oku ne yaz); her zaman ağ. Kullanıcıya özel /
   * uçucu uçlar için (auth/me, user/garage, engagement GET'leri) — bunları WP zaten
   * `no-store` ile döndürdüğünden URLCache de fiilen önbelleğe almazdı. Varsayılan `true`.
   */
  store?: boolean;
}

/**
 * GET + JSON çöz. Önbellek davranışı GetOptions'a göre (spec §2.3). Non-2xx'te iOS `get`
 * ile birebir: `parseErrorMessage` → varsa authFailed, yoksa badStatus(code).
 */
export async function getJson<T>(path: string, opts: GetOptions = {}): Promise<T> {
  const url = resolveApiUrl(path);
  const store = opts.store !== false;
  const fresh = opts.fresh === true;

  if (store && !fresh) {
    const cached = await readCache(url);
    if (cached !== null) {
      try {
        return JSON.parse(cached) as T;
      } catch {
        // Bozuk önbellek — yok say, ağdan tazele.
      }
    }
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: siteHeaders(),
    // Çerez yönetimi yerel yığına bırakılır (WP oturumu için gerekli).
    credentials: 'include',
  });
  const raw = await response.text();

  if (!(response.status >= 200 && response.status <= 299)) {
    const message = parseErrorMessage(raw);
    if (message) throw ApiError.authFailed(message);
    throw ApiError.badStatus(response.status);
  }

  const value = decodeJson<T>(raw);
  if (store) await writeCache(url, raw);
  return value;
}

// ── JSON gövdeli POST/PUT ────────────────────────────────────────────────────────

async function sendJson<T>(path: string, method: 'POST' | 'PUT', body: unknown): Promise<T> {
  const url = resolveApiUrl(path);
  const response = await fetch(url, {
    method,
    headers: siteHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
    credentials: 'include',
  });
  const raw = await response.text();

  if (!(response.status >= 200 && response.status <= 299)) {
    // POST/PUT: iOS önce HTML sonra JSON mesajı dener.
    const message = parseHtmlError(raw) ?? parseErrorMessage(raw);
    if (message) throw ApiError.authFailed(message);
    throw ApiError.badStatus(response.status);
  }

  return decodeJson<T>(raw);
}

export function postJson<T>(path: string, body: unknown): Promise<T> {
  return sendJson<T>(path, 'POST', body);
}

export function putJson<T>(path: string, body: unknown): Promise<T> {
  return sendJson<T>(path, 'PUT', body);
}

// ── Ham metin çekimi (warm-up + tema HTML kazıması) ──────────────────────────────

/**
 * Verilen mutlak URL'i GET eder ve ham gövdeyi döndürür. Önbelleksiz. Warm-up için
 * `expectOk=false` (durum yok sayılır, yalnızca ağ hatası fırlar); tema kazıması için
 * `expectOk=true` (non-2xx → badStatus).
 */
export async function fetchText(url: string, expectOk = false): Promise<string> {
  const response = await fetch(url, {
    method: 'GET',
    headers: siteHeaders(),
    credentials: 'include',
  });
  if (expectOk && !(response.status >= 200 && response.status <= 299)) {
    throw ApiError.badStatus(response.status);
  }
  return response.text();
}

export { siteHeaders };
