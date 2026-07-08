// Katalog ekranları için paylaşılan saf yardımcılar (Wave 5a).
//
// CarSummary görüntüleme yardımcıları (displayTitle / priceDisplay / rangeDisplay …) iOS
// CarSummary computed property'lerinin birebir portudur; ekranlar (Home/Search/Brands/Ranked)
// aynı biçimlendirmeyi paylaşsın diye tek yerde toplanır. Ayrıca filtre seçeneği kurucuları
// (marka/kasa union + tr-aware sıralama) ve Home ön-filtre eşleşme sayacı burada — UI'dan
// bağımsız test edilebilir.

import type { CarSummary } from '../../models/car';
import type { FilterOptions } from '../../models/home';
import { CarPriceFormatter } from '../../utils/carPriceFormatter';
import { compareLocalizedTr, trUppercase } from '../../utils/turkishText';

/** Swift CarSummary.displayTitle — model marka ile başlıyorsa modeli, değilse "marka model". */
export function displayTitle(car: Pick<CarSummary, 'brand' | 'model'>): string {
  if (car.model.toLowerCase().startsWith(car.brand.toLowerCase())) {
    return car.model;
  }
  return `${car.brand} ${car.model}`;
}

/** Swift CarSummary.heroImageURL — ilk boş olmayan görsel. */
export function heroImageURL(car: Pick<CarSummary, 'images'>): string | undefined {
  return car.images?.find((u) => u.length > 0);
}

/** Swift CarSummary.priceDisplay — TR'de satılan+fiyatlı ise ₺, değilse yurt dışı/eksik metni. */
export function priceDisplay(car: CarSummary): string {
  return CarPriceFormatter.primaryPriceText(car.priceTL, car.priceForeign, car.trAvailable);
}

/** Swift CarSummary.rangeDisplay — "{n} km" / "—". */
export function rangeDisplay(rangeKm?: number): string {
  return rangeKm != null ? `${rangeKm} km` : '—';
}

/** Swift CarSummary.batteryDisplay — tam sayı "{n} kWh", kesirli "%.1f kWh"; eksik → "—". */
export function batteryDisplay(batteryKwh?: number): string {
  if (batteryKwh == null) return '—';
  return Number.isInteger(batteryKwh) ? `${batteryKwh} kWh` : `${batteryKwh.toFixed(1)} kWh`;
}

/** Swift CarSummary.powerDisplay — "{n} HP" / "—". */
export function powerDisplay(powerHp?: number): string {
  return powerHp != null ? `${powerHp} HP` : '—';
}

/** Swift CarSummary.consumptionDisplay — "%.1f kWh/100km" (= batarya/menzil*100); eksikse "—". */
export function consumptionDisplay(car: Pick<CarSummary, 'batteryKwh' | 'rangeKm'>): string {
  const value = consumptionValue(car);
  return value == null ? '—' : `${value.toFixed(1)} kWh/100km`;
}

/** Sayısal tüketim (kWh/100km) — batarya/menzil*100; menzil/batarya yoksa null. */
export function consumptionValue(car: Pick<CarSummary, 'batteryKwh' | 'rangeKm'>): number | null {
  const battery = car.batteryKwh ?? 0;
  const range = car.rangeKm ?? 0;
  if (!(battery > 0) || !(range > 0)) return null;
  return (battery / range) * 100;
}

/**
 * Marka seçenek havuzu — `filterOptions.brands` ∪ katalog markaları, tr-aware sıralı benzersiz.
 * Home & Search marka dropdown'ları için (spec §1.4 / §2 filtre).
 */
export function brandOptionValues(
  catalog: CarSummary[],
  filterOptions?: FilterOptions,
): string[] {
  const set = new Set<string>();
  for (const brand of filterOptions?.brands ?? []) {
    if (brand.length > 0) set.add(brand);
  }
  for (const car of catalog) {
    if (car.brand.length > 0) set.add(car.brand);
  }
  return Array.from(set).sort(compareLocalizedTr);
}

/** Kasa türü seçenek havuzu — `filterOptions.bodyTypes` ∪ katalog kasaları, tr-aware sıralı. */
export function bodyTypeOptionValues(
  catalog: CarSummary[],
  filterOptions?: FilterOptions,
): string[] {
  const set = new Set<string>();
  for (const type of filterOptions?.bodyTypes ?? []) {
    if (type.length > 0) set.add(type);
  }
  for (const car of catalog) {
    const type = car.bodyType;
    if (type != null && type.length > 0) set.add(type);
  }
  return Array.from(set).sort(compareLocalizedTr);
}

/** Katalog markaları (yalnızca katalogdan; Brands/Search sürücüsü) tr-aware sıralı benzersiz. */
export function catalogBrands(catalog: CarSummary[]): string[] {
  const set = new Set<string>();
  for (const car of catalog) {
    if (car.brand.length > 0) set.add(car.brand);
  }
  return Array.from(set).sort(compareLocalizedTr);
}

/**
 * Bir markanın baş harfi (tr_TR uppercase; i→İ, ı→I). Boş → "#" (spec §7). Rakam/simge ilk
 * karakterse "#" olarak gruplanır.
 */
export function brandLetter(brand: string): string {
  const trimmed = brand.trim();
  if (trimmed.length === 0) return '#';
  const first = trUppercase(trimmed.charAt(0));
  return /[A-ZÇĞİÖŞÜ]/u.test(first) ? first : '#';
}

/** Katalog markalarının benzersiz baş harfleri, tr-aware sıralı ("#" en sonda). */
export function brandLetters(brands: string[]): string[] {
  const set = new Set<string>();
  for (const brand of brands) set.add(brandLetter(brand));
  return Array.from(set).sort((a, b) => {
    if (a === '#') return 1;
    if (b === '#') return -1;
    return compareLocalizedTr(a, b);
  });
}

/** WebHomeView ön-filtre girdileri (spec §1). */
export interface HomePrefilter {
  brand: string;
  bodyType: string;
  minRange: number;
  maxPrice: number;
}

/** Home varsayılan ön-filtre değerleri (spec §1: "all"/"all"/0/6M). */
export const HOME_PREFILTER_DEFAULTS: HomePrefilter = {
  brand: 'all',
  bodyType: 'all',
  minRange: 0,
  maxPrice: 6_000_000,
};

/** Home "Sınırsız bütçe" tavanı — fiyat filtresi yalnızca (0, 6M) aralığında uygulanır. */
export const HOME_PRICE_CEILING = 6_000_000;

/**
 * Home `matchingCount` (spec §1): marka eşit (all değilse), kasa eşit, rangeKm >= minRange (>0 ise),
 * fiyat yalnızca maxPrice (0, 6M) aralığındayken TR'de satılan araçlara uygulanır — priceTL > maxPrice
 * olanlar dışlanır (trAvailable == false araçlar fiyattan asla dışlanmaz).
 */
export function homeMatchingCount(catalog: CarSummary[], filter: HomePrefilter): number {
  const priceActive = filter.maxPrice > 0 && filter.maxPrice < HOME_PRICE_CEILING;
  return catalog.filter((car) => {
    if (filter.brand !== 'all' && car.brand !== filter.brand) return false;
    if (filter.bodyType !== 'all' && car.bodyType !== filter.bodyType) return false;
    if (filter.minRange > 0 && (car.rangeKm ?? 0) < filter.minRange) return false;
    if (priceActive && car.trAvailable !== false && (car.priceTL ?? 0) > filter.maxPrice) {
      return false;
    }
    return true;
  }).length;
}

/** Home ön-filtrede en az bir alan varsayılandan farklı mı (spec §1 hasActiveFilters). */
export function homeHasActiveFilters(filter: HomePrefilter): boolean {
  return (
    filter.brand !== HOME_PREFILTER_DEFAULTS.brand ||
    filter.bodyType !== HOME_PREFILTER_DEFAULTS.bodyType ||
    filter.minRange !== HOME_PREFILTER_DEFAULTS.minRange ||
    filter.maxPrice !== HOME_PREFILTER_DEFAULTS.maxPrice
  );
}

/** Home bütçe select seçenekleri (spec §1.4 / §2 drawer — aynı 4 seçenek). */
export const MAX_BUDGET_OPTIONS: { value: number; label: string }[] = [
  { value: 6_000_000, label: 'Sınırsız bütçe' },
  { value: 1_500_000, label: '1.500.000 TL’ye kadar' },
  { value: 2_500_000, label: '2.500.000 TL’ye kadar' },
  { value: 4_000_000, label: '4.000.000 TL’ye kadar' },
];

/** Home asgari menzil select seçenekleri (spec §1.4). */
export const MIN_RANGE_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Fark Etmez (Tümü)' },
  { value: 400, label: '400 km ve üzeri' },
  { value: 500, label: '500 km ve üzeri' },
  { value: 600, label: '600 km ve üzeri' },
];
