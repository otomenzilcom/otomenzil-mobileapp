import { describe, it, expect } from '@jest/globals';

import { OtvCalculator } from '../../../utils/otvCalculator';
import { otvEligibleCatalog, otvEligibleCount, otvRankedCars } from '../otvRanking';
import { makeCar } from '../__fixtures__/toolsFixtures';

describe('otvEligibleCatalog', () => {
  it('keeps trAvailable!=false && priceTL>0', () => {
    const cars = [
      makeCar({ id: 'ok', priceTL: 100 }),
      makeCar({ id: 'noPrice', priceTL: 0 }),
      makeCar({ id: 'foreign', priceTL: 100, trAvailable: false }),
    ];
    expect(otvEligibleCatalog(cars).map((c) => c.id)).toEqual(['ok']);
  });
});

describe('otvRankedCars mode 0 (engelli muafiyeti)', () => {
  it('marks local-production cars under the limit eligible and sorts them first', () => {
    const cars = [
      makeCar({ id: 'import', brand: 'Tesla', model: 'Model 3', priceTL: 2_000_000, powerHp: 300 }),
      makeCar({ id: 'togg', brand: 'Togg', model: 'T10X', priceTL: 1_500_000, powerHp: 200 }),
    ];
    const ranked = otvRankedCars(cars, 0);
    expect(ranked[0].car.id).toBe('togg');
    expect(ranked[0].eligible).toBe(true);
    const importRow = ranked.find((r) => r.car.id === 'import');
    expect(importRow?.eligible).toBe(false);
  });

  it('local car over the exemption limit is not eligible', () => {
    const price = OtvCalculator.disabledExemptionLimit2026 + 1;
    const cars = [makeCar({ id: 'togg', brand: 'Togg', model: 'T10X', priceTL: price, powerHp: 200 })];
    expect(otvRankedCars(cars, 0)[0].eligible).toBe(false);
  });
});

describe('otvRankedCars mode 1 (%25 dilim)', () => {
  it('eligible when estimated rate is 25, sorted eligible-first then rate asc then price asc', () => {
    const cars = [
      // Yüksek fiyat/güç → üst dilim (rate > 25).
      makeCar({ id: 'premium', brand: 'BMW', model: 'iX', priceTL: 5_000_000, powerHp: 500 }),
      // Düşük fiyat/güç → 25 dilimi beklenir.
      makeCar({ id: 'budget', brand: 'MG', model: 'MG4', priceTL: 1_200_000, powerHp: 170 }),
    ];
    const ranked = otvRankedCars(cars, 1);
    expect(ranked[0].car.id).toBe('budget');
    expect(ranked[0].otvRate).toBe(25);
    expect(ranked[0].eligible).toBe(true);
  });
});

describe('otvEligibleCount', () => {
  it('counts eligible rows', () => {
    const cars = [
      makeCar({ id: 'togg', brand: 'Togg', model: 'T10X', priceTL: 1_500_000, powerHp: 200 }),
      makeCar({ id: 'import', brand: 'Tesla', model: 'Model 3', priceTL: 2_000_000, powerHp: 300 }),
    ];
    expect(otvEligibleCount(otvRankedCars(cars, 0))).toBe(1);
  });
});
