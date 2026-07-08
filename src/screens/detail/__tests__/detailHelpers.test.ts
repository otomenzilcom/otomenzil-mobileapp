// Wave 5b detay ekranı saf yardımcı testleri (UI'dan bağımsız).
// Fixture'lar __tests__ DIŞINDA (utils/__fixtures__/cars); jest globalleri @jest/globals'dan.

import { describe, it, expect, beforeEach } from '@jest/globals';

import { makeCar, makeSocket, makeStation } from '../../../utils/__fixtures__/cars';
import { compareShareURL } from '../compareShare';
import { detailFromSummary } from '../detailFromSummary';
import { cacheCarDetail, cachedCarDetail, clearCarDetailCache } from '../carDetailCache';
import { computeChargePower, chargeEnergyKwh, chargeMinutes } from '../stationCalcHelpers';

describe('compareShareURL', () => {
  it('<2 id → null', () => {
    expect(compareShareURL([])).toBeNull();
    expect(compareShareURL(['togg-t10x'])).toBeNull();
  });

  it('id\'leri tekilleştirir + sıralar + "-vs-" ile birleştirir', () => {
    expect(compareShareURL(['tesla-model-y', 'byd-seal'])).toBe(
      'https://www.otomenzil.com/karsilastirma/byd-seal-vs-tesla-model-y/',
    );
  });

  it('yinelenen ve boş id\'leri temizler', () => {
    expect(compareShareURL(['byd-seal', 'byd-seal', '', 'aaa'])).toBe(
      'https://www.otomenzil.com/karsilastirma/aaa-vs-byd-seal/',
    );
  });
});

describe('detailFromSummary', () => {
  it('popularity\'yi düşürür, diğer alanları korur', () => {
    const summary = makeCar({ id: 'x', brand: 'Tesla', model: 'Model Y', popularity: 99, rangeKm: 500 });
    const detail = detailFromSummary(summary);
    expect(detail.id).toBe('x');
    expect(detail.rangeKm).toBe(500);
    expect((detail as unknown as Record<string, unknown>).popularity).toBeUndefined();
  });
});

describe('carDetailCache', () => {
  beforeEach(() => clearCarDetailCache());

  it('id ile önbelleğe alır ve okur', () => {
    expect(cachedCarDetail('x')).toBeUndefined();
    cacheCarDetail({ id: 'x', brand: 'Tesla', model: 'Model Y' });
    expect(cachedCarDetail('x')?.model).toBe('Model Y');
  });
});

describe('computeChargePower (spec §9.7)', () => {
  it('ac → her zaman 22 kW', () => {
    expect(computeChargePower('ac', { dcMaxKw: 250 }, null)).toBe(22);
  });

  it('hpc → istasyon effective (yoksa 180)', () => {
    expect(computeChargePower('hpc', { dcMaxKw: 250 }, null)).toBe(180);
    const station = makeStation({ id: 's', maxPowerKw: 300, hasHpc: true });
    expect(computeChargePower('hpc', { dcMaxKw: 250 }, station)).toBe(300);
  });

  it('dc → min(istasyon effective (yoksa 120), araç dcMax)', () => {
    // istasyon yok → 120, araç 250 → min = 120
    expect(computeChargePower('dc', { dcMaxKw: 250 }, null)).toBe(120);
    // istasyon 200, araç 150 → min = 150
    const station = makeStation({ id: 's', maxPowerKw: 200 });
    expect(computeChargePower('dc', { dcMaxKw: 150 }, station)).toBe(150);
    // araç undefined → 150 varsayılan; istasyon 100 → min = 100
    const slow = makeStation({ id: 's2', maxPowerKw: 100 });
    expect(computeChargePower('dc', undefined, slow)).toBe(100);
  });

  it('dc → maxPowerKw 0 iken soket gücünden çıkarım (CCS)', () => {
    const station = makeStation({
      id: 's3',
      maxPowerKw: 0,
      hasDc: true,
      sockets: [makeSocket({ type: 'CCS', powerKw: 0 })],
    });
    // CCS + !hpc → 120; araç 250 → min = 120
    expect(computeChargePower('dc', { dcMaxKw: 250 }, station)).toBe(120);
  });
});

describe('chargeEnergyKwh / chargeMinutes', () => {
  it('enerji = batarya × Δ%/100', () => {
    expect(chargeEnergyKwh(80, 20, 80)).toBeCloseTo(48);
    // negatif delta → 0
    expect(chargeEnergyKwh(80, 90, 80)).toBe(0);
  });

  it('süre = max(10, kWh/güç×60)', () => {
    expect(chargeMinutes(48, 120)).toBeCloseTo(24);
    // küçük enerji → taban 10 dk
    expect(chargeMinutes(1, 120)).toBe(10);
  });
});
