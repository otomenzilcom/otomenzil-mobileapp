import { describe, it, expect } from '@jest/globals';

import type { CarSummary } from '../../../models/car';
import { makeCar } from '../__fixtures__/cars';
import {
  barPercent,
  CONSUMPTION_SENTINEL,
  consumption,
  metricValue,
  preFilter,
  primaryMetric,
  rank,
  secondaryMetric,
} from '../rankedCars';

const catalog: CarSummary[] = [
  makeCar({ id: 'a', brand: 'A', model: 'A1', rating: 4.5, popularity: 90, rangeKm: 500, batteryKwh: 75, trunkLiters: 500, bodyType: 'SUV', priceTL: 2_000_000, trAvailable: true }),
  makeCar({ id: 'b', brand: 'B', model: 'B1', rating: 4.0, popularity: 80, rangeKm: 600, batteryKwh: 90, trunkLiters: 400, bodyType: 'Sedan', priceForeign: '€80k', trAvailable: false }),
  makeCar({ id: 'c', brand: 'C', model: 'C1', rating: 3.5, popularity: 70, rangeKm: 300, batteryKwh: 60, trunkLiters: 0, bodyType: 'Hatchback', trAvailable: true }),
];

describe('consumption', () => {
  it('batarya·menzil oranı; eksikse sentinel', () => {
    expect(consumption(catalog[0])).toBeCloseTo(15, 5);
    expect(consumption(makeCar({ id: 'z', brand: 'Z', model: 'Z' }))).toBe(CONSUMPTION_SENTINEL);
  });
});

describe('metricValue', () => {
  it('bestCars = rating*2 + popularity', () => {
    expect(metricValue(catalog[0], 'best-cars')).toBe(4.5 * 2 + 90);
  });
  it('longestRange = rangeKm; trunk = trunkLiters', () => {
    expect(metricValue(catalog[1], 'longest-range')).toBe(600);
    expect(metricValue(catalog[0], 'trunk')).toBe(500);
  });
});

describe('preFilter', () => {
  it('trFilter tr/foreign', () => {
    expect(preFilter(catalog, 'longest-range', 'tr', 'all').map((c) => c.id)).toEqual(['a', 'c']);
    expect(preFilter(catalog, 'longest-range', 'foreign', 'all').map((c) => c.id)).toEqual(['b']);
  });
  it('priceFilter known/unknown', () => {
    expect(preFilter(catalog, 'longest-range', 'all', 'known').map((c) => c.id)).toEqual(['a']);
    expect(preFilter(catalog, 'longest-range', 'all', 'unknown').map((c) => c.id).sort()).toEqual(['b', 'c']);
  });
  it('trunk 0/negatif bagajı düşürür', () => {
    expect(preFilter(catalog, 'trunk', 'all', 'all').map((c) => c.id).sort()).toEqual(['a', 'b']);
  });
  it('lowestConsumption bilinmeyen tüketimi düşürür', () => {
    const withMissing = [...catalog, makeCar({ id: 'd', brand: 'D', model: 'D' })];
    expect(preFilter(withMissing, 'lowest-consumption', 'all', 'all').map((c) => c.id).sort()).toEqual(['a', 'b', 'c']);
  });
});

describe('rank', () => {
  it('longestRange azalan; lowestConsumption artan', () => {
    expect(rank(catalog, 'longest-range').map((c) => c.id)).toEqual(['b', 'a', 'c']);
    // tüketim: a=15, b=15, c=20 → artan a/b önce, c son (a,b eşit → sıra korunur)
    expect(rank(catalog, 'lowest-consumption').map((c) => c.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('metric display', () => {
  it('primaryMetric mod başına format', () => {
    expect(primaryMetric(catalog[0], 'best-cars')).toBe('4.5 ★');
    expect(primaryMetric(catalog[1], 'longest-range')).toBe('600 km');
    expect(primaryMetric(catalog[0], 'lowest-consumption')).toBe('15.0 kWh/100km');
    expect(primaryMetric(catalog[0], 'trunk')).toBe('500 L');
  });
  it('secondaryMetric mod başına format', () => {
    expect(secondaryMetric(catalog[0], 'best-cars')).toBe('500 km');
    expect(secondaryMetric(catalog[1], 'longest-range')).toBe('90 kWh');
    expect(secondaryMetric(catalog[0], 'trunk')).toBe('SUV');
  });
});

describe('barPercent', () => {
  it('normal mod metric/max, min 0.08', () => {
    const ranked = rank(catalog, 'longest-range');
    expect(barPercent(ranked[0], ranked[0], 'longest-range')).toBe(1); // 600/600
    expect(barPercent(ranked[2], ranked[0], 'longest-range')).toBeCloseTo(0.5, 5); // 300/600
  });
  it('lowestConsumption ters oran max(0.08, maxMetric/value)', () => {
    const ranked = rank(catalog, 'lowest-consumption'); // a=15(min), c=20
    // first = a (15). c: 15/20 = 0.75
    expect(barPercent(ranked[0], ranked[0], 'lowest-consumption')).toBe(1); // 15/15
    const cCar = catalog[2];
    expect(barPercent(cCar, ranked[0], 'lowest-consumption')).toBeCloseTo(0.75, 5);
  });
});
