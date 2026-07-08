// TrunkVolumeView saf sıralama/filtre yardımcıları (spec 03 §1.2).
//
// Filtre bodyType lowercased üzerinden (ids all/suv/sedan). Sıralama trunkLiters desc; yalnızca
// trunkLiters > 0 araçlar listelenir (bar chart max'a göre orantılanır). UI'dan bağımsız test.

import type { CarSummary } from '../../models/car';

export type TrunkFilterId = 'all' | 'suv' | 'sedan';

function matchesFilter(car: CarSummary, filter: TrunkFilterId): boolean {
  if (filter === 'all') return true;
  return (car.bodyType ?? '').toLowerCase() === filter;
}

/** trunkLiters > 0 araçları filtreyle süz, trunkLiters desc sırala. */
export function trunkRankedCars(catalog: CarSummary[], filter: TrunkFilterId): CarSummary[] {
  return catalog
    .filter((car) => (car.trunkLiters ?? 0) > 0 && matchesFilter(car, filter))
    .sort((a, b) => (b.trunkLiters ?? 0) - (a.trunkLiters ?? 0));
}

export interface TrunkFilterCounts {
  all: number;
  suv: number;
  sedan: number;
}

/** Chip sayaçları — her filtre için trunkLiters > 0 araç adedi. */
export function trunkFilterCounts(catalog: CarSummary[]): TrunkFilterCounts {
  const withTrunk = catalog.filter((car) => (car.trunkLiters ?? 0) > 0);
  return {
    all: withTrunk.length,
    suv: withTrunk.filter((car) => (car.bodyType ?? '').toLowerCase() === 'suv').length,
    sedan: withTrunk.filter((car) => (car.bodyType ?? '').toLowerCase() === 'sedan').length,
  };
}
