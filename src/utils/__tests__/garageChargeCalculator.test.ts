import { describe, it, expect } from '@jest/globals';
import { GarageChargeCalculator, GaragePortOption } from '../garageChargeCalculator';
import type { CarSummary } from '../../models/car';

const PORTS: Record<string, GaragePortOption> = Object.fromEntries(
  GarageChargeCalculator.defaultPorts.map((p) => [p.id, p]),
);

function car(overrides: Partial<CarSummary>): CarSummary {
  return { id: 'x', brand: 'B', model: 'M', ...overrides };
}

describe('GarageChargeCalculator.defaultPorts', () => {
  it('exposes the 5 CCS/Type-2 presets', () => {
    expect(GarageChargeCalculator.defaultPorts.map((p) => p.id)).toEqual([
      'ac-22',
      'dc-50',
      'dc-120',
      'dc-180',
      'hpc-300',
    ]);
    expect(PORTS['ac-22']).toMatchObject({ label: 'Type 2 · 22 kW', powerKw: 22, mode: 'ac' });
    expect(PORTS['hpc-300']).toMatchObject({ label: 'CCS2 · 300 kW', powerKw: 300, mode: 'hpc' });
  });
});

describe('GarageChargeCalculator.estimateDcMaxKw', () => {
  it('maps chargingMin (10-80% DC) to a DC peak', () => {
    expect(GarageChargeCalculator.estimateDcMaxKw({ chargingMin: undefined })).toBe(120);
    expect(GarageChargeCalculator.estimateDcMaxKw({ chargingMin: 0 })).toBe(120);
    expect(GarageChargeCalculator.estimateDcMaxKw({ chargingMin: 20 })).toBe(250);
    expect(GarageChargeCalculator.estimateDcMaxKw({ chargingMin: 22 })).toBe(250);
    expect(GarageChargeCalculator.estimateDcMaxKw({ chargingMin: 25 })).toBe(180);
    expect(GarageChargeCalculator.estimateDcMaxKw({ chargingMin: 30 })).toBe(180);
    expect(GarageChargeCalculator.estimateDcMaxKw({ chargingMin: 40 })).toBe(150);
    expect(GarageChargeCalculator.estimateDcMaxKw({ chargingMin: 50 })).toBe(120);
    expect(GarageChargeCalculator.estimateDcMaxKw({ chargingMin: 60 })).toBe(100);
  });
});

describe('GarageChargeCalculator.calculate', () => {
  it('DC port clamped by min(dcMax, portPower, 120)', () => {
    const s = GarageChargeCalculator.calculate({
      car: car({ batteryKwh: 75, rangeKm: 500, chargingMin: 20 }),
      port: PORTS['dc-120'],
      startPercent: 10,
      targetPercent: 80,
    });
    expect(s.energyKwh).toBe(52.5); // round(75*70/100*10)/10
    expect(s.effectiveSpeedKw).toBe(120); // min(250, 120, 120)
    expect(s.durationMins).toBe(26); // round(52.5/120*60)
    expect(s.rangeGainedKm).toBe(350); // round(52.5 * 500/75)
  });

  it('HPC above 80% adds taper minutes', () => {
    const s = GarageChargeCalculator.calculate({
      car: car({ batteryKwh: 75, rangeKm: 500, chargingMin: 20 }),
      port: PORTS['hpc-300'],
      startPercent: 10,
      targetPercent: 90,
    });
    expect(s.energyKwh).toBe(60);
    expect(s.effectiveSpeedKw).toBe(250); // min(250, 300, 300)
    // round(60/250*60)=14, + floor((90-80)*1.1)=11 -> 25
    expect(s.durationMins).toBe(25);
    expect(s.rangeGainedKm).toBe(400);
  });

  it('AC port clamps speed to 22 and never adds >80% taper', () => {
    const s = GarageChargeCalculator.calculate({
      car: car({ batteryKwh: 75, rangeKm: 500, chargingMin: 20 }),
      port: PORTS['ac-22'],
      startPercent: 10,
      targetPercent: 80,
    });
    expect(s.effectiveSpeedKw).toBe(22);
    expect(s.durationMins).toBe(143); // round(52.5/22*60)
  });

  it('applies default battery(65)/range(400) when car lacks specs', () => {
    const s = GarageChargeCalculator.calculate({
      car: car({ batteryKwh: undefined, rangeKm: undefined, chargingMin: undefined }),
      port: PORTS['dc-50'],
      startPercent: 0,
      targetPercent: 100,
    });
    expect(s.energyKwh).toBe(65);
    expect(s.effectiveSpeedKw).toBe(50); // min(120, 50, 120)
    // round(65/50*60)=78 + floor((100-80)*1.1)=22 -> 100
    expect(s.durationMins).toBe(100);
    expect(s.rangeGainedKm).toBe(400);
  });

  it('tiny charge (<5 min, energy>0) is floored up to 10 min', () => {
    const s = GarageChargeCalculator.calculate({
      car: car({ batteryKwh: 75, rangeKm: 500, chargingMin: 20 }),
      port: PORTS['hpc-300'],
      startPercent: 79,
      targetPercent: 80,
    });
    expect(s.energyKwh).toBe(0.8); // round(75*1/100*10)/10
    expect(s.durationMins).toBe(10);
  });

  it('start >= target -> zero energy and duration', () => {
    const s = GarageChargeCalculator.calculate({
      car: car({ batteryKwh: 75, rangeKm: 500, chargingMin: 20 }),
      port: PORTS['dc-120'],
      startPercent: 90,
      targetPercent: 80,
    });
    expect(s.energyKwh).toBe(0);
    expect(s.durationMins).toBe(0);
    expect(s.rangeGainedKm).toBe(0);
  });
});
