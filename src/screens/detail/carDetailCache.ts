// Araç detay önbelleği — iOS AppNavigationStore.carDetailCache karşılığı.
//
// navigationStore'da detay önbelleği YOK (yalnızca catalogCars özet listesi tutulur). CarDetailView
// slug'ı yeniden açıldığında ağ isteğini atlayabilmek için hafif bir modül-seviyesi map kullanılır
// (spec §4: load() sırası (1) özet tohum, (2) cachedCarDetail, (3) api.fetchCar → cache). Bu map
// sürüm süresince yaşar; oturum/uygulama yeniden başlatınca temizlenir (kalıcı değil, iOS gibi).

import type { CarDetail } from '../../models/car';

const cache = new Map<string, CarDetail>();

export function cachedCarDetail(slug: string): CarDetail | undefined {
  return cache.get(slug);
}

export function cacheCarDetail(detail: CarDetail): void {
  cache.set(detail.id, detail);
}

/** Test yardımcısı — önbelleği sıfırlar. */
export function clearCarDetailCache(): void {
  cache.clear();
}
