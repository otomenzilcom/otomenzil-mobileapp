import { describe, it, expect } from '@jest/globals';
import { SimilarCarsEngine } from '../similarCarsEngine';
import type { CarSummary } from '../../models/car';
import { makeCar } from '../__fixtures__/cars';

const target = makeCar({
  id: 'a',
  brand: 'Tesla',
  model: 'Model Y',
  bodyType: 'SUV',
  segment: 'D',
  priceTL: 2_500_000,
  trAvailable: true,
  rangeKm: 500,
  driveType: 'AWD',
});

const catalog: CarSummary[] = [
  target,
  makeCar({
    id: 'b',
    brand: 'BYD',
    model: 'Seal',
    bodyType: 'Sedan',
    segment: 'D',
    priceTL: 1_800_000,
    trAvailable: true,
    rangeKm: 550,
    driveType: 'RWD',
    popularity: 80,
  }),
  makeCar({
    id: 'c',
    brand: 'Porsche',
    model: 'Taycan',
    bodyType: 'Sedan',
    segment: 'F',
    trAvailable: false,
    rangeKm: 450,
    driveType: 'AWD',
    popularity: 100,
  }),
  makeCar({
    id: 'd',
    brand: 'Togg',
    model: 'T10X',
    bodyType: 'SUV',
    segment: 'C',
    priceTL: 1_500_000,
    trAvailable: true,
    rangeKm: 314,
    driveType: 'RWD',
    popularity: 70,
  }),
];

describe('SimilarCarsEngine.priceScore / rangeScore', () => {
  it('fiyat yakınlık eşikleri', () => {
    expect(SimilarCarsEngine.priceScore(1_000_000, 1_100_000)).toBe(3); // %10
    expect(SimilarCarsEngine.priceScore(2_500_000, 1_800_000)).toBe(2); // %28
    expect(SimilarCarsEngine.priceScore(2_500_000, 1_500_000)).toBe(1); // %40
    expect(SimilarCarsEngine.priceScore(2_500_000, 1_000_000)).toBe(0); // %60
    expect(SimilarCarsEngine.priceScore(0, 1_000_000)).toBe(0); // biri 0
  });

  it('menzil yakınlık eşikleri', () => {
    expect(SimilarCarsEngine.rangeScore(500, 550)).toBe(3); // %9
    expect(SimilarCarsEngine.rangeScore(500, 450)).toBe(3); // %10
    expect(SimilarCarsEngine.rangeScore(500, 314)).toBe(1); // %37
    expect(SimilarCarsEngine.rangeScore(500, 200)).toBe(0); // %60
  });
});

describe('SimilarCarsEngine.similar', () => {
  it('kendini hariç tutar, skora göre sıralar (B=9, D=7, C=4)', () => {
    const result = SimilarCarsEngine.similar(target, catalog);
    expect(result.map((car) => car.id)).toEqual(['b', 'd', 'c']);
  });

  it('limit uygular', () => {
    const result = SimilarCarsEngine.similar(target, catalog, 2);
    expect(result.map((car) => car.id)).toEqual(['b', 'd']);
  });
});