import { describe, it, expect } from '@jest/globals';
import { CarSearchEngine, carSortOptions, carSortOptionLabels } from '../carSearchEngine';
import type { CarSummary } from '../../models/car';
import { makeCar } from '../__fixtures__/cars';

const cars: CarSummary[] = [
  makeCar({
    id: 'a',
    brand: 'Tesla',
    model: 'Model Y',
    bodyType: 'SUV',
    segment: 'D',
    priceTL: 2_500_000,
    trAvailable: true,
    rangeKm: 500,
    batteryKwh: 75,
    driveType: 'AWD',
    popularity: 90,
    accelerationSec: 5.0,
  }),
  makeCar({
    id: 'b',
    brand: 'BYD',
    model: 'Seal',
    bodyType: 'Sedan',
    segment: 'D',
    priceTL: 1_800_000,
    trAvailable: true,
    rangeKm: 550,
    batteryKwh: 82.5,
    driveType: 'RWD',
    popularity: 80,
    accelerationSec: 3.8,
  }),
  makeCar({
    id: 'c',
    brand: 'Porsche',
    model: 'Taycan',
    bodyType: 'Sedan',
    segment: 'F',
    priceForeign: '€100.000',
    trAvailable: false,
    rangeKm: 450,
    batteryKwh: 93,
    driveType: 'AWD',
    popularity: 100,
    accelerationSec: 2.8,
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
    batteryKwh: 88.5,
    driveType: 'RWD',
    popularity: 70,
    accelerationSec: 7.6,
  }),
];

const baseFilter = {
  cars,
  brand: 'all',
  bodyType: 'all',
  query: '',
  minPrice: CarSearchEngine.defaultPriceFloor,
  maxPrice: CarSearchEngine.defaultPriceCeiling,
  minRange: 0,
  minBattery: 0,
  drive: 'all',
};

const ids = (list: CarSummary[]): string[] => list.map((car) => car.id);

describe('CarSearchEngine sabitleri', () => {
  it('pageSize 15, taban/tavan doğru', () => {
    expect(CarSearchEngine.pageSize).toBe(15);
    expect(CarSearchEngine.defaultPriceFloor).toBe(1_000_000);
    expect(CarSearchEngine.defaultPriceCeiling).toBe(6_000_000);
  });

  it('6 sıralama seçeneği ve etiketleri', () => {
    expect(carSortOptions).toHaveLength(6);
    expect(carSortOptionLabels.price_asc).toBe('Fiyat: Artan (Ekonomik)');
    expect(carSortOptionLabels.range_desc).toBe('Menzil (En Yüksek)');
  });
});

describe('CarSearchEngine.filter', () => {
  it('markaya göre süzer', () => {
    expect(ids(CarSearchEngine.filter({ ...baseFilter, brand: 'Tesla' }))).toEqual(['a']);
  });

  it('kasa tipine göre süzer', () => {
    expect(ids(CarSearchEngine.filter({ ...baseFilter, bodyType: 'SUV' }))).toEqual(['a', 'd']);
  });

  it('arama sorgusu haystack üzerinde eşleşir', () => {
    expect(ids(CarSearchEngine.filter({ ...baseFilter, query: 'seal' }))).toEqual(['b']);
    expect(ids(CarSearchEngine.filter({ ...baseFilter, query: 'model y' }))).toEqual(['a']);
  });

  it('minRange / minBattery süzer', () => {
    expect(ids(CarSearchEngine.filter({ ...baseFilter, minRange: 500 }))).toEqual(['a', 'b']);
    expect(ids(CarSearchEngine.filter({ ...baseFilter, minBattery: 85 }))).toEqual(['c', 'd']);
  });

  it('drive içerir (case-insensitive)', () => {
    expect(ids(CarSearchEngine.filter({ ...baseFilter, drive: 'awd' }))).toEqual(['a', 'c']);
  });

  it('fiyat filtresi yalnız aktifken ve TR-fiyatlı araçlara uygulanır', () => {
    // minPrice > taban → aktif. d (1.5M) elenir, c (yurt dışı) hep geçer.
    const result = CarSearchEngine.filter({ ...baseFilter, minPrice: 1_600_000 });
    expect(ids(result)).toEqual(['a', 'b', 'c']);
  });

  it('fiyat filtresi taban/tavan aşılmazsa uygulanmaz', () => {
    const result = CarSearchEngine.filter({ ...baseFilter });
    expect(ids(result)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('CarSearchEngine.sort', () => {
  it('newest ve popular: popülarite azalan (özdeş)', () => {
    expect(ids(CarSearchEngine.sort(cars, 'newest'))).toEqual(['c', 'a', 'b', 'd']);
    expect(ids(CarSearchEngine.sort(cars, 'popular'))).toEqual(['c', 'a', 'b', 'd']);
  });

  it('price_asc: comparablePrice (yurt dışı araç menzil proxy ile)', () => {
    // comparablePrice: a=2.5M, b=1.8M, c=450 (menzil), d=1.5M
    expect(ids(CarSearchEngine.sort(cars, 'price_asc'))).toEqual(['c', 'd', 'b', 'a']);
  });

  it('range_desc menzile göre azalan', () => {
    expect(ids(CarSearchEngine.sort(cars, 'range_desc'))).toEqual(['b', 'a', 'c', 'd']);
  });

  it('acceleration_asc 0-100 artan', () => {
    expect(ids(CarSearchEngine.sort(cars, 'acceleration_asc'))).toEqual(['c', 'b', 'a', 'd']);
  });

  it('girdi dizisini mutasyona uğratmaz', () => {
    const before = ids(cars);
    CarSearchEngine.sort(cars, 'range_desc');
    expect(ids(cars)).toEqual(before);
  });
});