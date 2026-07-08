// Shell saf yardımcıları — RN bileşeni içe aktarmaz (jest'te native modül yüklemeden test edilir).
//
// carSlugFromCampaignUrl: kampanya CTA URL'inden araç slug'ı (spec §5.1). normalizeSlug: üye
// kullanıcı adı normalizasyonu (spec §6/§4.4). Bu fonksiyonlar AppShell/AuthModal'dan buraya
// taşındı ki birim testleri Ionicons/expo-image gibi native bağımlılıkları tetiklemeden koşsun.

/** Kampanya CTA URL'inden araç slug'ı çıkarır: son path bileşeni "arac"/"araclar" değilse. */
export function carSlugFromCampaignUrl(url: string): string | null {
  const withoutQuery = url.split('?')[0].split('#')[0];
  const parts = withoutQuery.split('/').filter((p) => p.length > 0);
  if (parts.length === 0) return null;
  const last = parts[parts.length - 1];
  if (last === 'arac' || last === 'araclar') return null;
  return last;
}

/** Slug normalizasyonu — lowercase, [^a-z0-9-]→-, -{2,}→-, trim -. Min uzunluk çağıranda. */
export function normalizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}
