import { describe, it, expect } from '@jest/globals';
import { CarTechSpecBuilder } from '../carTechSpecBuilder';
import type { CarDetail } from '../../models/car';
import type { MobileAppSettings } from '../../models/home';

function makeDetail(overrides: Partial<CarDetail> & Pick<CarDetail, 'id'>): CarDetail {
  return {
    brand: 'Tesla',
    model: 'Model Y',
    ...overrides,
  } as CarDetail;
}

const car = makeDetail({
  id: 'a',
  rangeKm: 500,
  batteryKwh: 75,
  powerHp: 340,
  accelerationSec: 5.0,
  chargingMin: 27,
  maxSpeedKmh: 250,
  torqueNm: 420,
  trunkLiters: 500,
  warrantyYears: 8,
});

describe('CarTechSpecBuilder.defaultSchema / schema', () => {
  it('6 varsayılan kategori', () => {
    expect(CarTechSpecBuilder.defaultSchema).toHaveLength(6);
    expect(CarTechSpecBuilder.schema(undefined)).toHaveLength(6);
  });

  it('dışlanan kategori + anahtarları süzer', () => {
    const settings: MobileAppSettings = {
      comparisonSpecSchema: [
        { categoryName: 'Güvenlik Puanları (Euro NCAP)', specs: [{ label: 'x', key: 'y' }] },
        {
          categoryName: 'Kept',
          specs: [
            { label: 'Platform', key: 'platformName' },
            { label: 'Menzil', key: 'rangeCombinedMild', unit: 'km' },
          ],
        },
      ],
    };
    const result = CarTechSpecBuilder.schema(settings);
    expect(result).toHaveLength(1);
    expect(result[0].categoryName).toBe('Kept');
    expect(result[0].specs.map((s) => s.key)).toEqual(['rangeCombinedMild']);
  });
});

describe('CarTechSpecBuilder.formattedValue — otomatik türetme', () => {
  it('menzil çarpanları (Int truncation) + birim', () => {
    expect(CarTechSpecBuilder.formattedValue(car, 'rangeCityMild', 'km')).toBe('540 km');
    expect(CarTechSpecBuilder.formattedValue(car, 'rangeHwyMild', 'km')).toBe('410 km');
    expect(CarTechSpecBuilder.formattedValue(car, 'rangeCityCold', 'km')).toBe('390 km');
    expect(CarTechSpecBuilder.formattedValue(car, 'rangeHwyCold', 'km')).toBe('340 km');
  });

  it('performans / batarya / şarj / tüketim', () => {
    expect(CarTechSpecBuilder.formattedValue(car, 'accel_0_100', 'sn')).toBe('5.0 sn');
    expect(CarTechSpecBuilder.formattedValue(car, 'maxPower', undefined)).toBe('340');
    expect(CarTechSpecBuilder.formattedValue(car, 'batteryTotal', 'kWh')).toBe('75.0 kWh');
    // batteryUsable = total (ölü *0.93 dalı — parite)
    expect(CarTechSpecBuilder.formattedValue(car, 'batteryUsable', 'kWh')).toBe('75.0 kWh');
    expect(CarTechSpecBuilder.formattedValue(car, 'acPower', 'kW')).toBe('11 kW');
    expect(CarTechSpecBuilder.formattedValue(car, 'acTime', undefined)).toBe('6.8 saat');
    expect(CarTechSpecBuilder.formattedValue(car, 'dcMaxPower', 'kW')).toBe('150 kW');
    expect(CarTechSpecBuilder.formattedValue(car, 'dcTime', 'dk')).toBe('27 dk');
    expect(CarTechSpecBuilder.formattedValue(car, 'avgCons', 'Wh/km')).toBe('15.0 Wh/km');
  });

  it('eksik veri → "—"', () => {
    const bare = makeDetail({ id: 'z' });
    expect(CarTechSpecBuilder.formattedValue(bare, 'accel_0_100', 'sn')).toBe('—');
  });
});

describe('CarTechSpecBuilder.formattedValue — manuel techSpecs', () => {
  it('manuel değer otomatiği ezer; birim çift eklenmez; bool → Evet/Hayır', () => {
    const manual = makeDetail({
      id: 'm',
      rangeKm: 500,
      techSpecs: {
        rangeCityMild: 480,
        maxSpeed: '250 km/s',
        batteryType: 'LFP',
        dedicatedPlatform: true,
      },
    });
    expect(CarTechSpecBuilder.formattedValue(manual, 'rangeCityMild', 'km')).toBe('480 km');
    expect(CarTechSpecBuilder.formattedValue(manual, 'maxSpeed', 'km/s')).toBe('250 km/s');
    expect(CarTechSpecBuilder.formattedValue(manual, 'batteryType', undefined)).toBe('LFP');
    expect(CarTechSpecBuilder.formattedValue(manual, 'dedicatedPlatform', undefined)).toBe('Evet');
  });
});

describe('CarTechSpecBuilder.labNumericValue', () => {
  it('manuel önce, sonra otomatik; sadece rakamlar', () => {
    expect(CarTechSpecBuilder.labNumericValue(car, 'rangeCityMild')).toBe(540);
    expect(CarTechSpecBuilder.labNumericValue(car, 'acTime')).toBe(68); // "6.8 saat" → 68
    const manual = makeDetail({ id: 'm', rangeKm: 500, techSpecs: { rangeCityMild: 480 } });
    expect(CarTechSpecBuilder.labNumericValue(manual, 'rangeCityMild')).toBe(480);
  });
});

describe('CarTechSpecBuilder.groups', () => {
  it('kategori + satır listesi üretir', () => {
    const groups = CarTechSpecBuilder.groups(car);
    expect(groups).toHaveLength(6);
    const perf = groups.find((g) => g.categoryName === 'Performans Verileri');
    expect(perf?.rows.find((r) => r.label === 'Maksimum Güç')?.value).toBe('340');
  });
});