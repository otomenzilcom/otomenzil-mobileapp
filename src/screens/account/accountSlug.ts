// Üye kullanıcı adı (slug) normalizasyonu + doğrulama — spec §4.2 (slug alanı) / §4.4 birebir.
//
// AuthModal shell'de aynı normalizasyonu src/shell/urls.ts'ten kullanır; shell forbidden
// olduğundan burada yerel bir kopya tutulur (saf mantık — birim testli). Kurallar: lowercase,
// [^a-z0-9-]→-, -{2,}→-, baş/son - kırp. Minimum uzunluk 3 (spec §4.2 canlı kontrol / §4.4).

/** Slug canlı-normalizasyon durumu (§4.2 üye slug alanı / §4.4 UsernameOnboarding). */
export type SlugCheckState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'ok' }
  | { status: 'error'; message: string };

/** Yalnızca harf, rakam ve tire mesajı — §4.2/§4.4 birebir. */
export const SLUG_TOO_SHORT_MESSAGE =
  'Kullanıcı adı en az 3 karakter olmalı. Yalnızca harf, rakam ve tire kullanın.';

/** UsernameOnboarding kısa varyantı (§4.4). */
export const SLUG_TOO_SHORT_MESSAGE_SHORT =
  'Kullanıcı adı en az 3 karakter olmalı. Yalnızca harf, rakam ve tire.';

export const SLUG_UNAVAILABLE_MESSAGE = 'Bu kullanıcı adı kullanılamaz.';

/**
 * Slug normalizasyonu — lowercase, [^a-z0-9-]+→-, -{2,}→-, baş/son - kırp.
 * (src/shell/urls.ts normalizeSlug ile birebir; min uzunluk çağırana bırakılır.)
 */
export function normalizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Normalize edilmiş slug ≥3 karakter mi? */
export function isSlugValid(slug: string): boolean {
  return normalizeSlug(slug).length >= 3;
}

/** Profil adresi önizlemesi: "/uye/<slug>/" (slug boşsa örnek yer tutucu). */
export function profilePreviewPath(slug: string, placeholder = 'kullanici-adin'): string {
  const s = slug.length > 0 ? slug : placeholder;
  return `/uye/${s}/`;
}

/** Tam profil URL'i (kopyala/aç için): "{site}/uye/<slug>/". */
export function profileUrl(siteBaseURL: string, slug: string): string {
  return `${siteBaseURL}/uye/${slug}/`;
}
