// Karşılaştırma paylaşım/kopyalama yardımcıları (spec §5.3).
//
// Paylaşım URL'i: {site}/karsilastirma/{sorted-ids joined "-vs-"}/ (canonicalCompareIds ile
// tekilleştir+sırala); <2 id → null. Kopyalama: expo-clipboard ile panoya yazar; başarıda true,
// hata durumunda false döner (çağıran host paylaşım sayfasına düşebilir).

import * as Clipboard from 'expo-clipboard';

import { siteBaseURL } from '../../config';
import { ComparisonBuilder } from '../../utils/comparisonBuilder';

/** iOS canonicalCompareIds + "/karsilastirma/{a-vs-b}/". <2 id → null. */
export function compareShareURL(ids: string[]): string | null {
  const canonical = ComparisonBuilder.canonicalCompareIds(ids);
  if (canonical.length < 2) return null;
  return `${siteBaseURL}/karsilastirma/${canonical.join('-vs-')}/`;
}

/**
 * Panoya kopyalama. expo-clipboard `setStringAsync` ile yazar; başarıda true döner. Hata olursa
 * false döner ve çağıran (CompareScreen) paylaşım sayfasına düşebilir. İmza (Promise<boolean>)
 * sabittir.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await Clipboard.setStringAsync(text);
    return true;
  } catch {
    return false;
  }
}
