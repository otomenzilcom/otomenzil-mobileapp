// Navigasyon enum'ları (UI katmanı) — ShellModels.swift AppViewID / ShellOverlay.
// AppViewID string-literal birleşimi Swift enum RAW değerleridir (deep-link için kritik;
// vehicle-loan / best-cars / longest-range / lowest-consumption kebab-case).

export type AppViewID =
  | 'home'
  | 'search'
  | 'compare'
  | 'blog'
  | 'stations'
  | 'brands'
  | 'consumption'
  | 'trunk'
  | 'otv'
  | 'mtv'
  | 'vehicle-loan'
  | 'best-cars'
  | 'longest-range'
  | 'lowest-consumption'
  | 'profile'
  | 'garage'
  | 'settings'
  | 'contact'
  | 'about'
  | 'privacy'
  | 'cookies'
  | 'terms';

/** Swift `AppViewID.allCases` sırası — deep-link çözümü / iterasyon için. */
export const appViewIds: AppViewID[] = [
  'home',
  'search',
  'compare',
  'blog',
  'stations',
  'brands',
  'consumption',
  'trunk',
  'otv',
  'mtv',
  'vehicle-loan',
  'best-cars',
  'longest-range',
  'lowest-consumption',
  'profile',
  'garage',
  'settings',
  'contact',
  'about',
  'privacy',
  'cookies',
  'terms',
];

/** camelCase erişim → raw değer eşlemesi (ergonomi; Swift case adları). */
export const AppView = {
  home: 'home',
  search: 'search',
  compare: 'compare',
  blog: 'blog',
  stations: 'stations',
  brands: 'brands',
  consumption: 'consumption',
  trunk: 'trunk',
  otv: 'otv',
  mtv: 'mtv',
  vehicleLoan: 'vehicle-loan',
  bestCars: 'best-cars',
  longestRange: 'longest-range',
  lowestConsumption: 'lowest-consumption',
  profile: 'profile',
  garage: 'garage',
  settings: 'settings',
  contact: 'contact',
  about: 'about',
  privacy: 'privacy',
  cookies: 'cookies',
  terms: 'terms',
} as const satisfies Record<string, AppViewID>;

/** Geçerli bir AppViewID mı? (deep-link raw değeri doğrulama) */
export function isAppViewID(value: string): value is AppViewID {
  return (appViewIds as string[]).includes(value);
}

/** Detay overlay'i — Swift ShellOverlay (car(slug) / blog(slug)). */
export interface ShellOverlay {
  kind: 'car' | 'blog';
  slug: string;
}
