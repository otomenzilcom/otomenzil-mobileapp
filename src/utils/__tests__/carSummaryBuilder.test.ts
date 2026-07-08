import { describe, it, expect } from '@jest/globals';
import { CarSummaryBuilder } from '../carSummaryBuilder';
import type { CarSummary } from '../../models/car';
import { makeCar } from '../__fixtures__/cars';

const target = makeCar({
  id: 'a',
  brand: 'Tesla',
  model: 'Model Y',
  year: 2024,
  bodyType: 'SUV',
  segment: 'D',
  rangeKm: 500,
  batteryKwh: 75,
  chargingMin: 27,
  powerHp: 340,
  accelerationSec: 5.0,
  driveType: 'AWD',
  priceTL: 2_000_000,
  trAvailable: true,
});

// 3 segment-D akranı → reference = segmentPeers. avgRange=400, avgPrice=2.000.000.
const peers: CarSummary[] = [
  makeCar({ id: 'p1', segment: 'D', rangeKm: 300, priceTL: 1_500_000, trAvailable: true }),
  makeCar({ id: 'p2', segment: 'D', rangeKm: 400, priceTL: 2_000_000, trAvailable: true }),
  makeCar({ id: 'p3', segment: 'D', rangeKm: 500, priceTL: 2_500_000, trAvailable: true }),
];

describe('CarSummaryBuilder.insight — tam veri', () => {
  const insight = CarSummaryBuilder.insight(target, [target, ...peers]);

  it('lead', () => {
    expect(insight.lead).toBe(
      'Tesla Model Y, 2024 model SUV gövdesiyle D segmentinde yer alıyor.',
    );
  });

  it('closing (fiyat segment ortalamasına yakın; gruplama YOK)', () => {
    expect(insight.closing).toBe(
      '2000000 TL ile segment fiyat ortalamasına oldukça yakın duruyor.',
    );
  });

  it('highlights (tr virgül ondalık)', () => {
    expect(insight.highlights).toEqual([
      { label: 'Menzil', value: '500 km' },
      { label: 'Batarya', value: '75,0 kWh' },
      { label: 'DC Şarj', value: '27 dk' },
      { label: 'Güç', value: '340 bg' },
    ]);
  });

  it('body menzil/batarya/şarj/güç cümlelerini içerir', () => {
    expect(insight.body).toContain(
      'tek şarjla 500 km menzile çıkıyor; segmentteki benzer modellere göre oldukça iddialı.',
    );
    expect(insight.body).toContain(
      '75,0 kWh bataryası ve yaklaşık 15,0 kWh/100 km tüketim profili var; DC şarjda 10–80 % için 27 dakika civarı beklemek gerekiyor; günlük kullanım için yeterli.',
    );
    expect(insight.body).toContain(
      '340 bg güç ve 5,0 sn\'lik 0–100 hızlanması ile dört çeker aktarma, karlı yol ve hızlı ivmelenme isteyen sürücülere hitap ediyor.',
    );
  });
});

describe('CarSummaryBuilder.insight — eksik/yurt dışı veri', () => {
  const foreign = makeCar({
    id: 'f',
    brand: 'Lucid',
    model: 'Air',
    trAvailable: false,
    priceForeign: '€90.000',
  });
  const insight = CarSummaryBuilder.insight(foreign, [foreign]);

  it('yurt dışı kapanış cümlesi', () => {
    expect(insight.closing).toBe(
      "Türkiye'de satışta görünmüyor; yurt dışı referans fiyatı €90.000 civarında.",
    );
  });

  it('eksik veriler için yedek cümleler', () => {
    expect(insight.body).toContain('menzil verisi henüz net değil.');
    expect(insight.body).toContain('hızlı şarj süresi için net bir tablo henüz yok.');
    expect(insight.body).toContain(
      'Önden çekişli düzeni günlük şehir kullanımında pratik bir sürüş sağlıyor.',
    );
  });

  it('highlights hepsi "—"', () => {
    expect(insight.highlights.map((h) => h.value)).toEqual(['—', '—', '—', '—']);
  });
});