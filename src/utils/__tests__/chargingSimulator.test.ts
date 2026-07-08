import { describe, it, expect } from '@jest/globals';
import {
  ChargingSimulator,
  ChargerType,
  CHARGER_TYPES,
  CHARGER_TYPE_ORDER,
} from '../chargingSimulator';

describe('ChargerType data', () => {
  it('has 5 chargers in order with exact specs', () => {
    expect(CHARGER_TYPE_ORDER).toEqual(['house', 'wallbox', 'publicAC', 'fastDC', 'ultraDC']);
    expect(CHARGER_TYPES.house).toMatchObject({ powerKw: 2.3, connectionType: 'AC' });
    expect(CHARGER_TYPES.wallbox).toMatchObject({ powerKw: 11, connectionType: 'AC' });
    expect(CHARGER_TYPES.publicAC).toMatchObject({ powerKw: 22, connectionType: 'AC' });
    expect(CHARGER_TYPES.fastDC).toMatchObject({ powerKw: 50, connectionType: 'DC' });
    expect(CHARGER_TYPES.ultraDC).toMatchObject({ powerKw: 150, connectionType: 'DC' });
    expect(CHARGER_TYPES.house.label).toBe('Ev Standart Priz');
    expect(CHARGER_TYPES.ultraDC.description).toBe('150+ kW otoyol ultra hızlı şarj.');
  });
});

describe('ChargerType.effectivePowerKw', () => {
  it('AC chargers clamp to 11 kW onboard cap (incl. 22 kW publicAC quirk)', () => {
    const car = { id: 'porsche-taycan' };
    expect(ChargerType.effectivePowerKw(CHARGER_TYPES.house, car)).toBe(2.3);
    expect(ChargerType.effectivePowerKw(CHARGER_TYPES.wallbox, car)).toBe(11);
    expect(ChargerType.effectivePowerKw(CHARGER_TYPES.publicAC, car)).toBe(11); // 22 -> clamped
  });

  it('DC chargers clamp to per-car DC cap', () => {
    expect(ChargerType.effectivePowerKw(CHARGER_TYPES.fastDC, { id: 'porsche-taycan' })).toBe(50);
    expect(ChargerType.effectivePowerKw(CHARGER_TYPES.ultraDC, { id: 'porsche-taycan' })).toBe(150);
    expect(ChargerType.effectivePowerKw(CHARGER_TYPES.ultraDC, { id: 'tesla-model-y' })).toBe(150);
    expect(ChargerType.effectivePowerKw(CHARGER_TYPES.ultraDC, { id: 'mg-mg4' })).toBe(135);
    expect(ChargerType.effectivePowerKw(CHARGER_TYPES.ultraDC, { id: 'byd-seal' })).toBe(150);
    expect(ChargerType.effectivePowerKw(CHARGER_TYPES.ultraDC, { id: 'unknown-car' })).toBe(150);
    expect(ChargerType.effectivePowerKw(CHARGER_TYPES.fastDC, { id: 'mg-mg4' })).toBe(50);
  });
});

describe('ChargingSimulator.estimateMinutes', () => {
  it('DC 10->80% (no taper below/at 80%)', () => {
    const m = ChargingSimulator.estimateMinutes({
      batteryKwh: 75,
      startPercent: 10,
      targetPercent: 80,
      chargerPowerKw: 150,
    });
    expect(m).toBeCloseTo(21.0, 10); // 52.5 / 150 * 60
  });

  it('above 80% applies 1.35 taper', () => {
    const m = ChargingSimulator.estimateMinutes({
      batteryKwh: 75,
      startPercent: 10,
      targetPercent: 90,
      chargerPowerKw: 150,
    });
    expect(m).toBeCloseTo(32.4, 10); // 60 / 150 * 60 * 1.35
  });

  it('guards return 0', () => {
    const base = { batteryKwh: 75, startPercent: 10, targetPercent: 80, chargerPowerKw: 150 };
    expect(ChargingSimulator.estimateMinutes({ ...base, batteryKwh: 0 })).toBe(0);
    expect(ChargingSimulator.estimateMinutes({ ...base, chargerPowerKw: 0 })).toBe(0);
    expect(ChargingSimulator.estimateMinutes({ ...base, targetPercent: 10 })).toBe(0);
    expect(ChargingSimulator.estimateMinutes({ ...base, targetPercent: 5 })).toBe(0);
  });
});

describe('ChargingSimulator.formatDuration', () => {
  it('< 60 min -> "n dk" (rounded)', () => {
    expect(ChargingSimulator.formatDuration(21)).toBe('21 dk');
    expect(ChargingSimulator.formatDuration(59.4)).toBe('59 dk');
    expect(ChargingSimulator.formatDuration(32.4)).toBe('32 dk');
  });

  it('>= 60 min -> hours (+ minutes)', () => {
    expect(ChargingSimulator.formatDuration(59.6)).toBe('1 sa'); // rounds to 60
    expect(ChargingSimulator.formatDuration(60)).toBe('1 sa');
    expect(ChargingSimulator.formatDuration(90)).toBe('1 sa 30 dk');
    expect(ChargingSimulator.formatDuration(125)).toBe('2 sa 5 dk');
    expect(ChargingSimulator.formatDuration(120)).toBe('2 sa');
  });
});
