import { describe, it, expect } from '@jest/globals';

import { CONSUMPTION_TARIFFS, consumptionResult } from '../consumptionCalc';

describe('consumptionResult', () => {
  it('computes consumed kWh, cost and TL/km (spec 03 §1.1 formulas)', () => {
    // per100 = 18 kWh/100km, 100 km, ev düşük kademe 2.30 TL/kWh.
    const r = consumptionResult(18, 100, 2.3);
    expect(r.consumedKwh).toBeCloseTo(18, 6); // 18 * 100 / 100
    expect(r.totalCost).toBeCloseTo(41.4, 6); // 18 * 2.30
    expect(r.costPerKm).toBeCloseTo(0.414, 6); // 41.4 / 100
  });

  it('scales with distance', () => {
    const r = consumptionResult(20, 250, 9.8);
    expect(r.consumedKwh).toBeCloseTo(50, 6); // 20 * 250 / 100
    expect(r.totalCost).toBeCloseTo(490, 6); // 50 * 9.80
    expect(r.costPerKm).toBeCloseTo(1.96, 6);
  });

  it('zero distance yields zero cost and guards TL/km divide', () => {
    const r = consumptionResult(20, 0, 7.5);
    expect(r.consumedKwh).toBe(0);
    expect(r.totalCost).toBe(0);
    expect(r.costPerKm).toBe(0);
  });

  it('zero per100 (missing spec data) yields zero result', () => {
    const r = consumptionResult(0, 100, 2.3);
    expect(r.consumedKwh).toBe(0);
    expect(r.totalCost).toBe(0);
  });
});

describe('CONSUMPTION_TARIFFS', () => {
  it('carries the four iOS hardcoded tariff prices', () => {
    expect(CONSUMPTION_TARIFFS.map((t) => t.price)).toEqual([2.3, 3.4, 7.5, 9.8]);
    expect(CONSUMPTION_TARIFFS.map((t) => t.id)).toEqual([
      'home_low',
      'home_high',
      'public_ac',
      'fast_dc',
    ]);
  });
});
