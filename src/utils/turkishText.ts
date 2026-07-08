// Türkçe yerel-ayar yardımcıları. Swift'teki `folding(.diacriticInsensitive, tr_TR)`,
// `localizedCompare`, `caseInsensitiveCompare(locale: tr_TR)` ve
// `localizedCaseInsensitiveContains` karşılıklarını tek yerde toplar.
// Motor/veri modülleri (blogTocExtractor, epdkStationsData, carSearchEngine,
// carSummaryBuilder) bu dosyadan import eder — ÖNCE bu yazılır.

const TR_LOCALE = 'tr-TR';

/** Birleşik (combining) aksan işaretleri (U+0300–U+036F) — NFD sonrası silinir. */
const COMBINING_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');

/**
 * Aksan-duyarsız katlama. Swift `.folding(options: .diacriticInsensitive,
 * locale: tr_TR).lowercased()` karşılığı: NFD ile ayrıştır → birleşik işaretleri
 * sil → Unicode varsayılan küçük harfe indir.
 *
 * - "İstanbul" → "istanbul", "Şişli" → "sisli", "Kadıköy" → "kadıköy".
 * - `ı`/`i` ayrımı KORUNUR: `ı` (U+0131) taban harftir, aksan değildir.
 * - turkiye-districts.json içindeki birleşik-nokta tuhaflıkları ("İ̇mamoğlu")
 *   NFD ayrıştırması ile temizlenir — ilçe eşleştirmesi bu katlamaya bağımlıdır.
 */
export function foldDiacritics(value: string): string {
  return value.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase();
}

/** tr-TR yerel küçük harf (İ→i, I→ı). Swift `.lowercased(with: tr_TR)` karşılığı. */
export function trLowercase(value: string): string {
  return value.toLocaleLowerCase(TR_LOCALE);
}

/** tr-TR yerel büyük harf (i→İ, ı→I). Swift `.uppercased(with: tr_TR)` karşılığı. */
export function trUppercase(value: string): string {
  return value.toLocaleUpperCase(TR_LOCALE);
}

/**
 * Swift `a.caseInsensitiveCompare(b, ..., locale: tr_TR) == .orderedSame`.
 * Büyük/küçük harf duyarsız, AKSAN duyarlı tr eşitlik (İ↔i, I↔ı katlaması).
 */
export function equalsCaseInsensitiveTr(a: string, b: string): boolean {
  return trLowercase(a) === trLowercase(b);
}

/**
 * Swift `.lowercased() == .lowercased()` — yerel-BAĞIMSIZ (varsayılan Unicode)
 * büyük/küçük harf duyarsız eşitlik. Adres/şehir gibi çoğunlukla ASCII alanlar
 * için `caseInsensitiveCompare` (yerel-bağımsız) davranışına yakındır.
 */
export function equalsCaseInsensitive(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/** Swift `localizedCompare` — tr collation ile sıralama karşılaştırıcısı (-1/0/1). */
export function compareLocalizedTr(a: string, b: string): number {
  return a.localeCompare(b, TR_LOCALE);
}

/**
 * Swift `haystack.localizedCaseInsensitiveContains(needle)` — tr yerel,
 * büyük/küçük harf duyarsız "içerir".
 */
export function containsCaseInsensitiveTr(haystack: string, needle: string): boolean {
  return trLowercase(haystack).includes(trLowercase(needle));
}
