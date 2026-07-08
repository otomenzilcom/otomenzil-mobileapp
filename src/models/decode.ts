// Esnek decode yardımcıları — Swift JSONDecoder'ın toleranslı davranışını taşır.
// (UserProfile.decodeFlexibleBool, logo http→https rewrite, vb.)

/**
 * Esnek bool — Swift `decodeFlexibleBool` birebir:
 * bool → aynen; sayı → `!= 0`; string → `"1"` veya (case-insensitive) `"true"` → true,
 * diğer her string → false; başka her şey (null/undefined/dizi/nesne) → undefined.
 */
export function flexBool(v: unknown): boolean | undefined {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return v === '1' || v.toLowerCase() === 'true';
  return undefined;
}

/**
 * Esnek sayı — sayı ise aynen (sonlu olmalı), sayısal string ise parse edilir,
 * aksi halde undefined.
 */
export function flexNumber(v: unknown): number | undefined {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (typeof v === 'string') {
    const trimmed = v.trim();
    if (trimmed === '') return undefined;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/**
 * Esnek string — string ise aynen, sonlu sayı ise metne çevrilir, aksi halde undefined.
 */
export function flexString(v: unknown): string | undefined {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return undefined;
}

/**
 * `http://` → `https://` yeniden yazımı (logo/medya URL'leri için).
 * Swift global replace yapıyor; burada da global (`/http:\/\//g`).
 * Boş/geçersiz girdi → undefined.
 */
export function httpsUrl(v: unknown): string | undefined {
  if (typeof v !== 'string' || v.length === 0) return undefined;
  return v.replace(/http:\/\//g, 'https://');
}
