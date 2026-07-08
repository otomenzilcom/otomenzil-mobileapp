// Katalog filtre/sıralama motoru. CarSearchEngine.swift birebir.
// Fiyat filtresi yalnızca "aktif" (taban/tavan aşıldığında) ve yalnızca TR'de
// satılan + fiyatlı araçlara uygulanır — yurt dışı/fiyatsız araçlar hep geçer.

import type { CarSummary } from '../models/car';
import { containsCaseInsensitiveTr } from './turkishText';

export type CarCatalogLayout = 'grid' | 'list';

/** Swift CarSortOption RAW değerleri. */
export type CarSortOption =
  | 'newest'
  | 'popular'
  | 'price_asc'
  | 'price_desc'
  | 'range_desc'
  | 'acceleration_asc';

/** Swift `CarSortOption.allCases` sırası. */
export const carSortOptions: CarSortOption[] = [
  'newest',
  'popular',
  'price_asc',
  'price_desc',
  'range_desc',
  'acceleration_asc',
];

/** Swift `CarSortOption.label`. */
export const carSortOptionLabels: Record<CarSortOption, string> = {
  newest: 'Son Eklenen',
  popular: 'Tavsiye Edilen (Popülarite)',
  price_asc: 'Fiyat: Artan (Ekonomik)',
  price_desc: 'Fiyat: Azalan (Premium)',
  range_desc: 'Menzil (En Yüksek)',
  acceleration_asc: 'Sıfırdan En Hızlı',
};

const defaultPriceFloor = 1_000_000;
const defaultPriceCeiling = 6_000_000;
const pageSize = 15;

/** Swift CarSummary.displayTitle — model marka ile başlıyorsa modeli, değilse "marka model". */
function displayTitle(car: Pick<CarSummary, 'brand' | 'model'>): string {
  if (car.model.toLowerCase().startsWith(car.brand.toLowerCase())) {
    return car.model;
  }
  return `${car.brand} ${car.model}`;
}

/** TR'de satılan + fiyatlı ise priceTL; değilse menzil (yurt dışı araçlar menzile göre sıralansın). */
function comparablePrice(car: CarSummary): number {
  if (car.trAvailable !== false && car.priceTL != null && car.priceTL > 0) {
    return car.priceTL;
  }
  return car.rangeKm ?? 0;
}

interface CarFilterInput {
  cars: CarSummary[];
  brand: string;
  bodyType: string;
  query: string;
  minPrice: number;
  maxPrice: number;
  minRange: number;
  minBattery: number;
  drive: string;
}

function filter(input: CarFilterInput): CarSummary[] {
  const { cars, brand, bodyType, query, minPrice, maxPrice, minRange, minBattery, drive } = input;
  // Swift `.lowercased()` yerel-BAĞIMSIZ — arama için düz toLowerCase (parite notu §2.10).
  const normalizedQuery = query.trim().toLowerCase();
  const priceActive = minPrice > defaultPriceFloor || maxPrice < defaultPriceCeiling;

  return cars.filter((car) => {
    if (brand !== 'all' && car.brand !== brand) return false;
    if (bodyType !== 'all' && car.bodyType !== bodyType) return false;
    if (minRange > 0 && (car.rangeKm ?? 0) < minRange) return false;
    if (minBattery > 0 && (car.batteryKwh ?? 0) < minBattery) return false;
    if (drive !== 'all' && !containsCaseInsensitiveTr(car.driveType ?? '', drive)) return false;

    if (priceActive && car.trAvailable !== false && car.priceTL != null && car.priceTL > 0) {
      if (car.priceTL < minPrice || car.priceTL > maxPrice) return false;
    }

    if (normalizedQuery.length > 0) {
      const haystack = [
        car.brand,
        car.model,
        car.bodyType ?? '',
        car.segment ?? '',
        displayTitle(car),
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(normalizedQuery)) return false;
    }

    return true;
  });
}

function sort(cars: CarSummary[], option: CarSortOption): CarSummary[] {
  const copy = cars.slice();
  switch (option) {
    // newest & popular AYNI: popülarite azalan (Swift'te de özdeş).
    case 'newest':
    case 'popular':
      return copy.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
    case 'price_asc':
      return copy.sort((a, b) => comparablePrice(a) - comparablePrice(b));
    case 'price_desc':
      return copy.sort((a, b) => comparablePrice(b) - comparablePrice(a));
    case 'range_desc':
      return copy.sort((a, b) => (b.rangeKm ?? 0) - (a.rangeKm ?? 0));
    case 'acceleration_asc':
      return copy.sort((a, b) => (a.accelerationSec ?? 999) - (b.accelerationSec ?? 999));
  }
}

export const CarSearchEngine = {
  defaultPriceFloor,
  defaultPriceCeiling,
  pageSize,
  comparablePrice,
  filter,
  sort,
};
