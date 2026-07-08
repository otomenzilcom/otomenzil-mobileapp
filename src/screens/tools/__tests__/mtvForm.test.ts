import { describe, it, expect } from '@jest/globals';

import { MtvCalculator } from '../../../utils/mtvCalculator';
import {
  mtvCarOptionLabel,
  mtvEligibleCars,
  mtvGuideRows,
  mtvSeedFromCar,
} from '../mtvForm';
import { makeCar } from '../__fixtures__/toolsFixtures';

describe('mtvSeedFromCar (applyCar mapping, spec 03 §1.4)', () => {
  it('seeds year, kW (hpToKw), taxBase (estimateTaxBase)', () => {
    const car = makeCar({ id: 'x', year: 2024, powerHp: 200, priceTL: 2_000_000 });
    const seed = mtvSeedFromCar(car);
    expect(seed.modelYear).toBe(2024);
    expect(seed.registrationYear).toBe(2024);
    expect(seed.motorPowerKw).toBe(MtvCalculator.hpToKw(200)); // 149.1
    expect(seed.taxBaseTry).toBe(MtvCalculator.estimateTaxBase(2_000_000)); // 1515152
    expect(seed.infoLine).toContain('149.1 kW');
  });

  it('falls back when year/power/price missing', () => {
    const car = makeCar({ id: 'y' });
    const seed = mtvSeedFromCar(car);
    expect(seed.modelYear).toBe(2026);
    expect(seed.motorPowerKw).toBe(0);
    expect(seed.taxBaseTry).toBe(0);
  });
});

describe('mtvEligibleCars', () => {
  it('keeps trAvailable!=false && priceTL>0, sorted by brand', () => {
    const cars = [
      makeCar({ id: '1', brand: 'Zeta', priceTL: 1 }),
      makeCar({ id: '2', brand: 'Alfa', priceTL: 1 }),
      makeCar({ id: '3', brand: 'Beta', priceTL: 0 }), // fiyatsız → hariç
      makeCar({ id: '4', brand: 'Delta', priceTL: 1, trAvailable: false }), // TR yok → hariç
    ];
    expect(mtvEligibleCars(cars).map((c) => c.id)).toEqual(['2', '1']);
  });
});

describe('mtvCarOptionLabel', () => {
  it('formats "{brand} {model} ({year|—})"', () => {
    expect(mtvCarOptionLabel(makeCar({ id: '1', brand: 'Togg', model: 'T10X', year: 2026 }))).toBe(
      'Togg T10X (2026)',
    );
    expect(mtvCarOptionLabel(makeCar({ id: '2', brand: 'Togg', model: 'T10X' }))).toBe(
      'Togg T10X (—)',
    );
  });
});

describe('mtvGuideRows', () => {
  it('emits one row per bracket; power label only on first bracket row', () => {
    const rows = mtvGuideRows();
    const totalBrackets = MtvCalculator.powerTiers.reduce((n, t) => n + t.brackets.length, 0);
    expect(rows).toHaveLength(totalBrackets);
    // İlk tier ilk bracket → güç etiketi dolu; ikinci bracket → boş.
    expect(rows[0].power).toBe(MtvCalculator.powerTiers[0].label);
    expect(rows[1].power).toBe('');
    // Üst dilim (maxMatrah null) → "Üst dilim".
    const openBracketRow = rows.find((r) => r.matrah === 'Üst dilim');
    expect(openBracketRow).toBeDefined();
  });
});
