import { describe, it, expect } from '@jest/globals';
import { ComparisonBuilder } from '../comparisonBuilder';
import type { CarSummary } from '../../models/car';
import { makeCar } from '../__fixtures__/cars';

const cars: CarSummary[] = [
  makeCar({
    id: 'a',
    priceTL: 2_000_000,
    rangeKm: 500,
    batteryKwh: 75,
    powerHp: 340,
    chargingMin: 27,
    accelerationSec: 5.0,
    trAvailable: true,
  }),
  makeCar({
    id: 'b',
    priceTL: 2_500_000,
    rangeKm: 400,
    batteryKwh: 82.5,
    powerHp: 300,
    chargingMin: 30,
    accelerationSec: 6.0,
    trAvailable: true,
  }),
  makeCar({
    id: 'c',
    priceTL: 3_000_000,
    rangeKm: 600,
    batteryKwh: 82.5,
    powerHp: 500,
    chargingMin: 18,
    accelerationSec: 3.0,
    trAvailable: true,
  }),
];

describe('ComparisonBuilder statik veri', () => {
  it('3 preset, 7 kritik satır, 4 SSS', () => {
    expect(ComparisonBuilder.presets).toHaveLength(3);
    expect(ComparisonBuilder.presets[0].ids).toEqual(['togg-t10x', 'tesla-model-y', 'byd-seal']);
    expect(ComparisonBuilder.criticalRows).toHaveLength(7);
    expect(ComparisonBuilder.faqItems).toHaveLength(4);
    expect(ComparisonBuilder.criticalRows[0]).toMatchObject({ label: 'Fiyat', lowerIsBetter: true });
    expect(ComparisonBuilder.criticalRows[1]).toMatchObject({ label: 'Menzil', lowerIsBetter: false });
  });
});

describe('canonicalCompareIds', () => {
  it('boşları atar, tekilleştirir, sıralar', () => {
    expect(ComparisonBuilder.canonicalCompareIds(['b', 'a', '', 'a', 'c'])).toEqual(['a', 'b', 'c']);
  });
});

describe('display erişimcileri (Car.swift birebir)', () => {
  it('batteryDisplay tam sayı vs ondalık', () => {
    expect(ComparisonBuilder.batteryDisplay(cars[0])).toBe('75 kWh');
    expect(ComparisonBuilder.batteryDisplay(cars[1])).toBe('82.5 kWh');
  });

  it('consumptionDisplay = batarya/menzil*100 (nokta ondalık)', () => {
    expect(ComparisonBuilder.consumptionDisplay(cars[0])).toBe('15.0 kWh/100km');
  });

  it('priceDisplay tr para (binlik nokta gruplu)', () => {
    expect(ComparisonBuilder.priceDisplay(cars[0])).toContain('2.000.000');
  });
});

describe('leader', () => {
  const rowLeader = (label: string): string | null => {
    const row = ComparisonBuilder.criticalRows.find((r) => r.label === label);
    if (!row) throw new Error(`row ${label} yok`);
    return ComparisonBuilder.leader(cars, row.value, row.lowerIsBetter);
  };

  it('Fiyat (düşük iyi) → en ucuz araç', () => {
    expect(rowLeader('Fiyat')).toBe('a');
  });

  it('Menzil (yüksek iyi) → en uzun menzil', () => {
    expect(rowLeader('Menzil')).toBe('c');
  });

  it('0-100 (düşük iyi) → en hızlı', () => {
    expect(rowLeader('0-100')).toBe('c');
  });

  it('Batarya berabere → null (b ve c aynı, parseNumeric ile 825)', () => {
    // batteryDisplay: "75 kWh"→75, "82.5 kWh"→825, "82.5 kWh"→825 → en yüksek berabere.
    expect(rowLeader('Batarya')).toBeNull();
  });

  it('<2 ayrıştırılabilir değer → null', () => {
    const single = [makeCar({ id: 'x', rangeKm: 400 }), makeCar({ id: 'y' })];
    const row = ComparisonBuilder.criticalRows.find((r) => r.label === 'Menzil');
    expect(ComparisonBuilder.leader(single, row!.value, row!.lowerIsBetter)).toBeNull();
  });
});