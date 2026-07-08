import { describe, it, expect } from '@jest/globals';
import { EpdkStationsData, StationCalculator } from '../epdkStationsData';
import type { SeedStationDTO } from '../../models/stations';
import { makeSocket, makeStation } from '../__fixtures__/cars';

describe('inferSocketPowerKw', () => {
  const station = makeStation({ id: '1' });

  it('powerKw > 0 ise aynen döner', () => {
    expect(EpdkStationsData.inferSocketPowerKw(makeSocket({ powerKw: 50 }), station)).toBe(50);
  });

  it('tip bazlı çıkarım', () => {
    expect(EpdkStationsData.inferSocketPowerKw(makeSocket({ type: 'Type 2' }), station)).toBe(22);
    expect(EpdkStationsData.inferSocketPowerKw(makeSocket({ type: 'TYPE2' }), station)).toBe(22);
    expect(EpdkStationsData.inferSocketPowerKw(makeSocket({ type: 'CHAdeMO' }), station)).toBe(50);
  });

  it('CCS: hasHpc → 180, değilse 120', () => {
    const hpc = makeStation({ id: '2', hasHpc: true });
    expect(EpdkStationsData.inferSocketPowerKw(makeSocket({ type: 'CCS2' }), hpc)).toBe(180);
    expect(EpdkStationsData.inferSocketPowerKw(makeSocket({ type: 'CCS2' }), station)).toBe(120);
  });

  it('tip bilinmiyorsa istasyon yeteneğine göre', () => {
    const acOnly = makeStation({ id: '3', hasAc: true, hasDc: false });
    const hpcOnly = makeStation({ id: '4', hasAc: false, hasDc: false, hasHpc: true });
    const dcOnly = makeStation({ id: '5', hasAc: false, hasDc: true, hasHpc: false });
    const none = makeStation({ id: '6', hasAc: false, hasDc: false, hasHpc: false });
    expect(EpdkStationsData.inferSocketPowerKw(makeSocket({ type: 'X' }), acOnly)).toBe(22);
    expect(EpdkStationsData.inferSocketPowerKw(makeSocket({ type: 'X' }), hpcOnly)).toBe(180);
    expect(EpdkStationsData.inferSocketPowerKw(makeSocket({ type: 'X' }), dcOnly)).toBe(120);
    expect(EpdkStationsData.inferSocketPowerKw(makeSocket({ type: 'X' }), none)).toBe(22);
  });
});

describe('güç etiketleri', () => {
  it('officialMaxPowerKw / formatStationPowerLabel / verified', () => {
    const verified = makeStation({
      id: '1',
      maxPowerKw: 0,
      sockets: [makeSocket({ powerKw: 50 }), makeSocket({ powerKw: 120 })],
    });
    expect(EpdkStationsData.officialMaxPowerKw(verified)).toBe(120);
    expect(EpdkStationsData.formatStationPowerLabel(verified)).toBe('120 kW');
    expect(EpdkStationsData.isStationPowerVerified(verified)).toBe(true);

    const unverified = makeStation({
      id: '2',
      maxPowerKw: 0,
      hasHpc: true,
      sockets: [makeSocket({ type: 'CCS2', powerKw: 0, count: 2 })],
    });
    expect(EpdkStationsData.officialMaxPowerKw(unverified)).toBe(0);
    expect(EpdkStationsData.formatStationPowerLabel(unverified)).toBe('Belirtilmemiş');
    expect(EpdkStationsData.isStationPowerVerified(unverified)).toBe(false);
    expect(EpdkStationsData.effectiveMaxPowerKw(unverified)).toBe(180);
    expect(EpdkStationsData.licensedSocketCount(unverified)).toBe(2);
  });
});

describe('parseDistrictFromAddress', () => {
  it('şehir eşleşen adresten ilçe çıkarır', () => {
    expect(
      EpdkStationsData.parseDistrictFromAddress('Bağdat Caddesi No:12 Kadıköy / İstanbul', 'İstanbul'),
    ).toBe('Kadıköy');
  });

  it('baştaki sayısal token atlanır', () => {
    expect(EpdkStationsData.parseDistrictFromAddress('34 Şişli / İstanbul', 'İstanbul')).toBe(
      'Şişli',
    );
  });

  it('kara listedeki / eşleşmeyen / slash yok → null', () => {
    expect(EpdkStationsData.parseDistrictFromAddress('No: 5 Merkez / Adana', 'Adana')).toBeNull();
    expect(EpdkStationsData.parseDistrictFromAddress('X Kadıköy / Ankara', 'İstanbul')).toBeNull();
    expect(EpdkStationsData.parseDistrictFromAddress('slashsiz adres', 'İstanbul')).toBeNull();
  });
});

describe('stationMatchesDistrict', () => {
  it('Tümü → true, şehir eşleşmezse false', () => {
    const st = makeStation({ id: '1', city: 'İstanbul', district: 'Kadıköy' });
    expect(EpdkStationsData.stationMatchesDistrict(st, 'İstanbul', 'Tümü')).toBe(true);
    expect(EpdkStationsData.stationMatchesDistrict(st, 'Ankara', 'Çankaya')).toBe(false);
  });

  it('district alanı doğrudan eşleşir', () => {
    const st = makeStation({ id: '1', city: 'İstanbul', district: 'Kadıköy' });
    expect(EpdkStationsData.stationMatchesDistrict(st, 'İstanbul', 'Kadıköy')).toBe(true);
  });

  it('aksan-katlamalı içerir (adres/isim üzerinden)', () => {
    const st = makeStation({
      id: '1',
      city: 'İstanbul',
      district: '',
      address: 'Kadıköy Sahil Yolu',
    });
    expect(EpdkStationsData.stationMatchesDistrict(st, 'İstanbul', 'kadıköy')).toBe(true);
    expect(EpdkStationsData.stationMatchesDistrict(st, 'İstanbul', 'Beşiktaş')).toBe(false);
  });
});

describe('stationsNear', () => {
  it('mesafeye göre sıralar, maxDistance süzer, limit uygular', () => {
    const stations = [
      makeStation({ id: 'far', latitude: 40.0, longitude: 35.0 }),
      makeStation({ id: 'near', latitude: 39.03, longitude: 35.0 }),
      makeStation({ id: 'mid', latitude: 39.1, longitude: 35.0 }),
    ];
    const near = EpdkStationsData.stationsNear(39.0, 35.0, stations, 6, 40);
    expect(near.map((e) => e[0].id)).toEqual(['near', 'mid']); // 'far' > 40km elenir
    expect(near[0][1]).toBeLessThan(near[1][1]);
  });
});

describe('resolveDistrictFromNearbyStations (ağırlıklı oylama)', () => {
  it('3/2/1 ağırlıkla en yüksek skorlu ilçe kazanır', () => {
    const stations = [
      makeStation({ id: 's1', city: 'TestCity', district: 'Alpha', latitude: 39.045, longitude: 35.0 }), // ~5km, w3
      makeStation({ id: 's2', city: 'TestCity', district: 'Alpha', latitude: 39.135, longitude: 35.0 }), // ~15km, w2
      makeStation({ id: 's3', city: 'TestCity', district: 'Beta', latitude: 39.027, longitude: 35.0 }), // ~3km, w3
    ];
    // Alpha = 3 + 2 = 5, Beta = 3 → Alpha kazanır.
    expect(
      EpdkStationsData.resolveDistrictFromNearbyStations('TestCity', stations, 39.0, 35.0),
    ).toBe('Alpha');
  });

  it('oy yoksa 40km içindeki en yakın istasyonun adres-ilçesine düşer', () => {
    const stations = [
      makeStation({
        id: 's1',
        city: 'TestCity',
        district: '',
        address: 'Merkez Mah. Gamma / TestCity',
        latitude: 39.02,
        longitude: 35.0,
      }),
    ];
    expect(
      EpdkStationsData.resolveDistrictFromNearbyStations('TestCity', stations, 39.0, 35.0),
    ).toBe('Gamma');
  });
});

describe('normalizeCityName / toStation', () => {
  it('geçersiz şehir adları boşa çevrilir', () => {
    expect(EpdkStationsData.normalizeCityName('  Türkiye ')).toBe('');
    expect(EpdkStationsData.normalizeCityName('  Bursa ')).toBe('Bursa');
  });

  it('epdkId eksikse id\'den türetilir (tam sayı değilse 0)', () => {
    const base: SeedStationDTO = {
      id: 'epdk-123',
      operatorName: 'ZES',
      operatorKey: 'zes',
      stationName: 'X',
      city: 'İstanbul',
      district: '',
      latitude: 41,
      longitude: 29,
      address: '',
      sockets: [{ type: 'CCS2', powerKw: 120, count: 2 }],
      hasAc: false,
      hasDc: true,
      hasHpc: false,
      maxPowerKw: 120,
    };
    expect(EpdkStationsData.toStation(base).epdkId).toBe(123);
    expect(EpdkStationsData.toStation({ ...base, id: 'foo' }).epdkId).toBe(0);
    expect(EpdkStationsData.toStation({ ...base, epdkId: 9 }).epdkId).toBe(9);
    // socketNumbers eksikse [] olur.
    expect(EpdkStationsData.toStation(base).sockets[0].socketNumbers).toEqual([]);
  });
});

describe('StationCalculator', () => {
  it('preset araçlar', () => {
    expect(StationCalculator.vehicles).toHaveLength(5);
    expect(StationCalculator.vehicles[0]).toMatchObject({ id: 'togg-t10x', batteryKwh: 88.5 });
  });

  it('chargeDurationMinutes min 10 dk taban', () => {
    expect(StationCalculator.chargeDurationMinutes(75, 20, 80, 150)).toBe(18);
    expect(StationCalculator.chargeDurationMinutes(65, 50, 55, 150)).toBe(10);
  });
});