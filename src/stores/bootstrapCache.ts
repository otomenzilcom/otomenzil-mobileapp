// ShellBootstrapCache — iOS ShellBootstrapCache karşılığı (spec 01 §6.3).
//
// home / cars / settings payload'larını AsyncStorage'a JSON olarak yazar (anahtarlar iOS ile
// birebir; camelCase JSON API ile aynı). Amaç: cold-start'ta ilk boyamayı ağ olmadan yapmak.
//
// TTL YOK: spec §6.3 açıkça "No TTL/expiry — cache is unconditionally trusted for first paint,
// then refreshed from network" der. Wave 3 görev metnindeki "TTL" ifadesi buradaki shell cache'i
// değil, campaign popup'ın per-gün geçerliliğini kasteder (campaignStore'da ele alınır). Bu
// yüzden burada bilinçli olarak TTL uygulanmaz — kritik: TTL eklemek iOS first-paint semantiğini
// bozardı.

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CarSummary, HomeResponse, MobileAppSettings } from '../models';

/** UserDefaults anahtarları — iOS ile birebir (spec §6.3). */
export const SHELL_CACHE_KEYS = {
  home: 'otomenzil.shell.home',
  cars: 'otomenzil.shell.cars',
  settings: 'otomenzil.shell.settings',
} as const;

export interface ShellCacheSnapshot {
  home?: HomeResponse;
  cars?: CarSummary[];
  settings?: MobileAppSettings;
}

/** Verilen anahtardan JSON okur; yoksa/bozuksa undefined. */
async function readJson<T>(key: string): Promise<T | undefined> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return undefined;
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

/** Verilen anahtara JSON yazar (en iyi çaba). */
async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // yazma en iyi çaba — hata yutulur
  }
}

/**
 * Cache'i okur (iOS `apply(to:)`). home/cars/settings'i döndürür. `restored`, home VEYA cars
 * geri yüklendiğinde true'dur (settings tek başına sayılmaz — spec §6.3). cars yalnızca boş
 * değilse geri yüklenir.
 */
export async function loadShellCache(): Promise<{
  snapshot: ShellCacheSnapshot;
  restored: boolean;
}> {
  const [home, cars, settings] = await Promise.all([
    readJson<HomeResponse>(SHELL_CACHE_KEYS.home),
    readJson<CarSummary[]>(SHELL_CACHE_KEYS.cars),
    readJson<MobileAppSettings>(SHELL_CACHE_KEYS.settings),
  ]);

  const snapshot: ShellCacheSnapshot = {};
  let restored = false;

  if (home !== undefined) {
    snapshot.home = home;
    restored = true;
  }
  if (Array.isArray(cars) && cars.length > 0) {
    snapshot.cars = cars;
    restored = true;
  }
  if (settings !== undefined) {
    snapshot.settings = settings;
  }

  return { snapshot, restored };
}

/**
 * Cache'i yazar (iOS `save(from:)`). Yalnızca mevcut/boş olmayan üçlü yazılır. TTL yok.
 */
export async function saveShellCache(snapshot: ShellCacheSnapshot): Promise<void> {
  const writes: Promise<void>[] = [];
  if (snapshot.home !== undefined) writes.push(writeJson(SHELL_CACHE_KEYS.home, snapshot.home));
  if (snapshot.cars !== undefined && snapshot.cars.length > 0) {
    writes.push(writeJson(SHELL_CACHE_KEYS.cars, snapshot.cars));
  }
  if (snapshot.settings !== undefined) {
    writes.push(writeJson(SHELL_CACHE_KEYS.settings, snapshot.settings));
  }
  await Promise.all(writes);
}

export const ShellBootstrapCache = {
  keys: SHELL_CACHE_KEYS,
  load: loadShellCache,
  save: saveShellCache,
};
