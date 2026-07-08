import { describe, it, expect, afterEach } from '@jest/globals';
import {
  EngineeringLabSimulator,
  setLabNumericValueResolver,
} from '../engineeringLabSimulator';
import type { CarDetail } from '../../models/car';

function car(overrides: Partial<CarDetail>): CarDetail {
  return { id: 'x', brand: 'B', model: 'M', ...overrides };
}

afterEach(() => {
  setLabNumericValueResolver(undefined);
});

describe('EngineeringLabSimulator.values — techSpecs (highest priority)', () => {
  it('reads numeric techSpecs for the (temperature, route) key pair', () => {
    const c = car({
      rangeKm: 400,
      techSpecs: { rangeCombinedMild: 420, consCombinedMild: 160 },
    });
    expect(EngineeringLabSimulator.values(c, 'mild', 'combined')).toEqual({
      rangeKm: 420,
      consumptionWhPerKm: 160,
    });
  });

  it('extracts digits from string techSpecs (units stripped)', () => {
    const c = car({
      rangeKm: 400,
      techSpecs: { rangeCityCold: '310 km', consCityCold: '180 Wh/km' },
    });
    expect(EngineeringLabSimulator.values(c, 'cold', 'city')).toEqual({
      rangeKm: 310,
      consumptionWhPerKm: 180,
    });
  });

  it('truncates double techSpecs toward zero (Int(d))', () => {
    const c = car({ rangeKm: 400, techSpecs: { rangeHwyMild: 415.9 } });
    expect(EngineeringLabSimulator.values(c, 'mild', 'hwy').rangeKm).toBe(415);
  });
});

describe('EngineeringLabSimulator.values — key routing', () => {
  it('maps every (temperature, route) combination to the right keys', () => {
    const c = car({
      techSpecs: {
        rangeCityCold: 1,
        rangeHwyCold: 2,
        rangeCombinedCold: 3,
        rangeCityMild: 4,
        rangeHwyMild: 5,
        rangeCombinedMild: 6,
      },
    });
    expect(EngineeringLabSimulator.values(c, 'cold', 'city').rangeKm).toBe(1);
    expect(EngineeringLabSimulator.values(c, 'cold', 'hwy').rangeKm).toBe(2);
    expect(EngineeringLabSimulator.values(c, 'cold', 'combined').rangeKm).toBe(3);
    expect(EngineeringLabSimulator.values(c, 'mild', 'city').rangeKm).toBe(4);
    expect(EngineeringLabSimulator.values(c, 'mild', 'hwy').rangeKm).toBe(5);
    expect(EngineeringLabSimulator.values(c, 'mild', 'combined').rangeKm).toBe(6);
  });
});

describe('EngineeringLabSimulator.values — labNumericValue fallback', () => {
  it('uses injected resolver when techSpecs missing the key', () => {
    setLabNumericValueResolver((_c, key) => (key.startsWith('range') ? 350 : 190));
    const c = car({ rangeKm: 400 });
    expect(EngineeringLabSimulator.values(c, 'cold', 'hwy')).toEqual({
      rangeKm: 350,
      consumptionWhPerKm: 190,
    });
  });

  it('techSpecs still wins over the resolver', () => {
    setLabNumericValueResolver(() => 999);
    const c = car({ rangeKm: 400, techSpecs: { rangeCityMild: 333 } });
    const v = EngineeringLabSimulator.values(c, 'mild', 'city');
    expect(v.rangeKm).toBe(333); // techSpecs
    expect(v.consumptionWhPerKm).toBe(999); // resolver (no techSpecs key)
  });

  it('non-numeric techSpecs (bool) falls through to resolver', () => {
    setLabNumericValueResolver((_c, key) => (key.startsWith('range') ? 200 : 150));
    const c = car({ rangeKm: 400, techSpecs: { rangeCityMild: true } });
    expect(EngineeringLabSimulator.values(c, 'mild', 'city').rangeKm).toBe(200);
  });
});

describe('EngineeringLabSimulator.values — defaults', () => {
  it('no techSpecs, no resolver -> range = rangeKm ?? 0, consumption = 170', () => {
    expect(EngineeringLabSimulator.values(car({ rangeKm: 480 }), 'mild', 'city')).toEqual({
      rangeKm: 480,
      consumptionWhPerKm: 170,
    });
    expect(EngineeringLabSimulator.values(car({}), 'cold', 'combined')).toEqual({
      rangeKm: 0,
      consumptionWhPerKm: 170,
    });
  });

  it('resolver returning null falls back to defaults', () => {
    setLabNumericValueResolver(() => null);
    expect(EngineeringLabSimulator.values(car({ rangeKm: 500 }), 'cold', 'hwy')).toEqual({
      rangeKm: 500,
      consumptionWhPerKm: 170,
    });
  });
});
