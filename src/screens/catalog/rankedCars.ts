// RankedCarsView sıralama motoru — saf mantık (spec §6). RankedCarsView.swift birebir.
//
// 4 mod (bestCars / longestRange / lowestConsumption / trunk); tamamen store.catalogCars üzerinde.
// UI'dan bağımsız test edilebilir: ön-filtreler (trFilter/priceFilter), metricValue, sıralama,
// primary/secondary metrik metinleri ve progress bar yüzdesi (lowestConsumption ters oran quirk'i).

import type { CarSummary } from '../../models/car';

export type RankedMode = 'best-cars' | 'longest-range' | 'lowest-consumption' | 'trunk';

export type TrFilter = 'all' | 'tr' | 'foreign';
export type PriceFilter = 'all' | 'known' | 'unknown';

/** lowestConsumption'ta menzil/batarya yoksa kullanılan sentinel (spec §6). */
export const CONSUMPTION_SENTINEL = 999;

export interface RankedModeConfig {
  badge: string;
  title: string;
  description: string;
  /** Hero gradient renk demeti (topLeading→bottomTrailing). */
  gradient: [string, string, string];
  metricLabel: string;
  secondaryLabel: string;
}

export const RANKED_CONFIGS: Record<RankedMode, RankedModeConfig> = {
  'best-cars': {
    badge: 'Editör & Kullanıcı Puanı',
    title: 'En İyi Elektrikli Araçlar',
    description:
      'Kullanıcı puanı, editör değerlendirmesi ve platform popülerliğine göre sıralanan en iyi ' +
      'elektrikli modeller.',
    gradient: ['#D97706', '#EA580C', '#0C0A09'],
    metricLabel: 'Genel Puan',
    secondaryLabel: 'Menzil',
  },
  'longest-range': {
    badge: 'WLTP Menzil Sıralaması',
    title: 'En Uzun Menzilli Elektrikli Araçlar',
    description: 'WLTP menzil değerine göre en uzun yol kat edebilen elektrikli araçlar.',
    gradient: ['#15803D', '#0D9488', '#0C0A09'],
    metricLabel: 'WLTP Menzil',
    secondaryLabel: 'Batarya',
  },
  'lowest-consumption': {
    badge: 'Enerji Verimliliği',
    title: 'En Az Yakan Elektrikli Araçlar',
    description:
      'Batarya kapasitesi ve menzile göre hesaplanan ortalama tüketim (kWh/100 km) en düşük modeller.',
    gradient: ['#0284C7', '#2563EB', '#0C0A09'],
    metricLabel: 'Ort. Tüketim',
    secondaryLabel: 'Menzil',
  },
  trunk: {
    badge: 'Bagaj Hacmi Sıralaması',
    title: 'Bagaj Hacmi En Geniş Elektrikli Araçlar',
    description:
      'Katalog verilerine göre bagaj hacmi (litre) en yüksek elektrikli modeller. Aile kullanımı, ' +
      'yük taşıma ve frunk avantajı için güncel sıralama.',
    gradient: ['#7C3AED', '#9333EA', '#0C0A09'],
    metricLabel: 'Bagaj Hacmi',
    secondaryLabel: 'Gövde',
  },
};

/** consumption(car) = (batteryKwh / rangeKm) * 100; menzil/batarya eksik/0 → sentinel 999. */
export function consumption(car: CarSummary): number {
  const battery = car.batteryKwh ?? 0;
  const range = car.rangeKm ?? 0;
  if (!(battery > 0) || !(range > 0)) return CONSUMPTION_SENTINEL;
  return (battery / range) * 100;
}

/** metricValue: mod başına sıralama anahtarı (spec §6). */
export function metricValue(car: CarSummary, mode: RankedMode): number {
  switch (mode) {
    case 'best-cars':
      return (car.rating ?? 0) * 2 + (car.popularity ?? 0);
    case 'longest-range':
      return car.rangeKm ?? 0;
    case 'lowest-consumption':
      return consumption(car);
    case 'trunk':
      return car.trunkLiters ?? 0;
  }
}

/** trFilter + priceFilter + mod-özel elemeler (spec §6). */
export function preFilter(
  cars: CarSummary[],
  mode: RankedMode,
  trFilter: TrFilter,
  priceFilter: PriceFilter,
): CarSummary[] {
  return cars.filter((car) => {
    if (trFilter === 'tr' && car.trAvailable === false) return false;
    if (trFilter === 'foreign' && car.trAvailable !== false) return false;

    const hasPrice = (car.priceTL ?? 0) > 0;
    if (priceFilter === 'known' && !hasPrice) return false;
    if (priceFilter === 'unknown' && hasPrice) return false;

    if (mode === 'lowest-consumption' && consumption(car) >= CONSUMPTION_SENTINEL) return false;
    if (mode === 'trunk' && (car.trunkLiters ?? 0) <= 0) return false;

    return true;
  });
}

/** Sıralama: lowestConsumption artan, diğerleri azalan (spec §6). */
export function rank(cars: CarSummary[], mode: RankedMode): CarSummary[] {
  const ascending = mode === 'lowest-consumption';
  return cars
    .slice()
    .sort((a, b) => {
      const va = metricValue(a, mode);
      const vb = metricValue(b, mode);
      return ascending ? va - vb : vb - va;
    });
}

/** primaryMetric görüntüleme metni (spec §6). */
export function primaryMetric(car: CarSummary, mode: RankedMode): string {
  switch (mode) {
    case 'best-cars':
      return `${(car.rating ?? 0).toFixed(1)} ★`;
    case 'longest-range':
      return `${car.rangeKm ?? 0} km`;
    case 'lowest-consumption': {
      const value = consumption(car);
      return `${value.toFixed(1)} kWh/100km`;
    }
    case 'trunk':
      return `${car.trunkLiters ?? 0} L`;
  }
}

/** secondaryMetric görüntüleme metni (spec §6). */
export function secondaryMetric(car: CarSummary, mode: RankedMode): string {
  switch (mode) {
    case 'best-cars':
      return car.rangeKm != null ? `${car.rangeKm} km` : '—';
    case 'longest-range': {
      const battery = car.batteryKwh;
      if (battery == null) return '—';
      return Number.isInteger(battery) ? `${battery} kWh` : `${battery.toFixed(1)} kWh`;
    }
    case 'lowest-consumption':
      return car.rangeKm != null ? `${car.rangeKm} km` : '—';
    case 'trunk':
      return car.bodyType ?? '—';
  }
}

/**
 * Progress bar yüzdesi (spec §6): metric / maxMetric (ilk öğe). lowestConsumption bug-uyumlu ters
 * oran: max(0.08, maxMetric / value); min bar 8%. Sonuç [0.08, 1+] aralığında olabilir (layout kırpar).
 */
export function barPercent(car: CarSummary, first: CarSummary | undefined, mode: RankedMode): number {
  if (first == null) return 0.08;
  const maxMetric = metricValue(first, mode);
  const value = metricValue(car, mode);
  if (mode === 'lowest-consumption') {
    if (!(value > 0)) return 0.08;
    return Math.max(0.08, maxMetric / value);
  }
  if (!(maxMetric > 0)) return 0.08;
  return Math.max(0.08, value / maxMetric);
}
