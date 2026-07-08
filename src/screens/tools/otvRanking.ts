// OtvExemptionView saf sıralama/uygunluk yardımcıları (spec 03 §1.7).
//
// Katalog filtresi: trAvailable != false && priceTL > 0. Her araç için OtvCalculator ile matrah/rate
// tahmini; mode 0 (engelli muafiyeti) yerli üretim + fiyat limiti; mode 1 (%25 dilim) rate == 25.
// Sıralama: uygun önce; mode 1 ikincil rate asc; sonra price asc. UI'dan bağımsız test.

import type { CarSummary } from '../../models/car';
import { OtvCalculator } from '../../utils/otvCalculator';

export type OtvMode = 0 | 1;

export interface OtvRankedCar {
  car: CarSummary;
  otvRate: number;
  eligible: boolean;
  /** Mode 0 tahmini muaf fiyat = price / (1 + rate/100). */
  exemptPrice: number;
}

/** Katalog filtresi (spec §1.7): trAvailable != false && priceTL > 0. */
export function otvEligibleCatalog(catalog: CarSummary[]): CarSummary[] {
  return catalog.filter((car) => car.trAvailable !== false && (car.priceTL ?? 0) > 0);
}

function evaluate(car: CarSummary, mode: OtvMode): OtvRankedCar {
  const price = car.priceTL ?? 0;
  const estimate = OtvCalculator.estimateMatrahAndRate(price, car.powerHp ?? 0);
  const rate = estimate.otvRate;

  let eligible: boolean;
  if (mode === 0) {
    eligible =
      OtvCalculator.meetsLocalProduction(car.brand, car.model) &&
      price <= OtvCalculator.disabledExemptionLimit2026;
  } else {
    eligible = rate === 25;
  }

  return {
    car,
    otvRate: rate,
    eligible,
    exemptPrice: price / (1 + rate / 100),
  };
}

/**
 * Sıralı ÖTV kartları: uygun önce; mode 1 ise ikincil rate asc; sonra price asc.
 */
export function otvRankedCars(catalog: CarSummary[], mode: OtvMode): OtvRankedCar[] {
  const items = otvEligibleCatalog(catalog).map((car) => evaluate(car, mode));
  return items.sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    if (mode === 1 && a.otvRate !== b.otvRate) return a.otvRate - b.otvRate;
    return (a.car.priceTL ?? 0) - (b.car.priceTL ?? 0);
  });
}

/** Mode 0 uygun sayısı (özet bar). */
export function otvEligibleCount(ranked: OtvRankedCar[]): number {
  return ranked.filter((r) => r.eligible).length;
}
