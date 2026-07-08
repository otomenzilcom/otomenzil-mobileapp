import { describe, it, expect } from '@jest/globals';

import type { CarSummary } from '../../../models/car';
import { makeCar } from '../__fixtures__/cars';
import {
  batteryDisplay,
  bodyTypeOptionValues,
  brandLetter,
  brandLetters,
  brandOptionValues,
  catalogBrands,
  consumptionDisplay,
  consumptionValue,
  displayTitle,
  homeHasActiveFilters,
  homeMatchingCount,
  HOME_PREFILTER_DEFAULTS,
  priceDisplay,
  rangeDisplay,
} from '../shared';

const catalog: CarSummary[] = [
  makeCar({ id: 'tesla-model-y', brand: 'Tesla', model: 'Model Y', bodyType: 'SUV', rangeKm: 500, priceTL: 2_500_000, trAvailable: true }),
  makeCar({ id: 'byd-seal', brand: 'BYD', model: 'Seal', bodyType: 'Sedan', rangeKm: 550, priceTL: 1_800_000, trAvailable: true }),
  makeCar({ id: 'porsche-taycan', brand: 'Porsche', model: 'Taycan', bodyType: 'Sedan', rangeKm: 480, priceForeign: '€90.000', trAvailable: false }),
  makeCar({ id: ' togg', brand: 'Togg', model: 'Togg T10X', bodyType: 'SUV', rangeKm: 314, priceTL: 1_600_000, trAvailable: true }),
];

describe('displayTitle', () => {
  it('modeli marka ile başlıyorsa yalnızca modeli döner', () => {
    expect(displayTitle({ brand: 'Togg', model: 'Togg T10X' })).toBe('Togg T10X');
  });
  it('değilse marka + model birleştirir', () => {
    expect(displayTitle({ brand: 'Tesla', model: 'Model Y' })).toBe('Tesla Model Y');
  });
});

describe('display helpers', () => {
  it('rangeDisplay eksik değeri "—" yapar', () => {
    expect(rangeDisplay(500)).toBe('500 km');
    expect(rangeDisplay(undefined)).toBe('—');
  });
  it('batteryDisplay tam sayı vs kesirli', () => {
    expect(batteryDisplay(75)).toBe('75 kWh');
    expect(batteryDisplay(82.5)).toBe('82.5 kWh');
    expect(batteryDisplay(undefined)).toBe('—');
  });
  it('priceDisplay TR ₺ / yurt dışı foreign', () => {
    expect(priceDisplay(catalog[0])).toBe('₺2.500.000');
    expect(priceDisplay(catalog[2])).toBe('€90.000');
  });
  it('consumptionValue/Display batarya·menzil oranı', () => {
    const car = makeCar({ id: 'x', brand: 'X', model: 'X', batteryKwh: 75, rangeKm: 500 });
    expect(consumptionValue(car)).toBeCloseTo(15, 5);
    expect(consumptionDisplay(car)).toBe('15.0 kWh/100km');
    expect(consumptionDisplay(makeCar({ id: 'y', brand: 'Y', model: 'Y' }))).toBe('—');
  });
});

describe('option builders', () => {
  it('brandOptionValues tr-aware sıralı benzersiz (filterOptions ∪ katalog)', () => {
    const result = brandOptionValues(catalog, { brands: ['Mercedes'] });
    expect(result).toEqual(['BYD', 'Mercedes', 'Porsche', 'Tesla', 'Togg']);
  });
  it('bodyTypeOptionValues benzersiz sıralı', () => {
    expect(bodyTypeOptionValues(catalog)).toEqual(['Sedan', 'SUV']);
  });
  it('catalogBrands yalnızca katalogdan', () => {
    expect(catalogBrands(catalog)).toEqual(['BYD', 'Porsche', 'Tesla', 'Togg']);
  });
});

describe('brand letters', () => {
  it('brandLetter tr uppercase baş harf; boş → #', () => {
    expect(brandLetter('Tesla')).toBe('T');
    expect(brandLetter('  ')).toBe('#');
    expect(brandLetter('9Brand')).toBe('#');
  });
  it('brandLetters benzersiz sıralı, # sonda', () => {
    expect(brandLetters(['Tesla', 'BYD', 'Porsche', '9X'])).toEqual(['B', 'P', 'T', '#']);
  });
});

describe('home prefilter', () => {
  it('varsayılanlar aktif filtre saymaz', () => {
    expect(homeHasActiveFilters(HOME_PREFILTER_DEFAULTS)).toBe(false);
  });
  it('herhangi bir sapma aktif sayılır', () => {
    expect(homeHasActiveFilters({ ...HOME_PREFILTER_DEFAULTS, brand: 'Tesla' })).toBe(true);
    expect(homeHasActiveFilters({ ...HOME_PREFILTER_DEFAULTS, minRange: 400 })).toBe(true);
  });
  it('matchingCount marka + kasa + menzil filtreler', () => {
    expect(homeMatchingCount(catalog, { ...HOME_PREFILTER_DEFAULTS, brand: 'Tesla' })).toBe(1);
    expect(homeMatchingCount(catalog, { ...HOME_PREFILTER_DEFAULTS, bodyType: 'Sedan' })).toBe(2);
    expect(homeMatchingCount(catalog, { ...HOME_PREFILTER_DEFAULTS, minRange: 500 })).toBe(2);
  });
  it('fiyat filtresi yalnızca (0,6M) aralığında ve TR araçlara uygulanır', () => {
    // maxPrice 1.7M: Tesla(2.5M) ve Togg... Togg 1.6M kalır, BYD 1.8M düşer, Tesla düşer.
    // Porsche trAvailable=false → fiyattan asla dışlanmaz.
    const count = homeMatchingCount(catalog, { ...HOME_PREFILTER_DEFAULTS, maxPrice: 1_700_000 });
    expect(count).toBe(2); // Togg + Porsche
  });
});
