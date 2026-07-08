// Şablonlu "AI özeti" metni üreticisi. CarSummaryBuilder.swift birebir.
// Referans akranlar: ≥3 ise segment akranları, yoksa ≥3 ise gövde akranları, yoksa tümü.

import type { CarSummary } from '../models/car';
import { containsCaseInsensitiveTr } from './turkishText';

export interface CarSummaryHighlight {
  label: string;
  value: string;
}

export interface CarSummaryInsight {
  lead: string;
  body: string;
  closing: string;
  highlights: CarSummaryHighlight[];
}

/**
 * Swift `NumberFormatter()` — numberStyle atanmaz (.none): GRUPLAMA YOK, tr ondalık
 * virgül, min=max=digits kesir hanesi. Yani formatNumber(2500000, 0) → "2500000"
 * (binlik ayracı YOK), formatNumber(88.5, 1) → "88,5".
 * (Analiz dokümanı §2.14 "dot thousands" der ama Swift kaynağı gruplama uygulamaz —
 *  kaynağa güveniliyor.)
 */
function formatNumber(value: number, digits: number): string {
  return new Intl.NumberFormat('tr-TR', {
    useGrouping: false,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function rangeComparison(car: CarSummary, segmentAvg: number): string {
  if (car.rangeKm == null || car.rangeKm <= 0) return 'menzil verisi henüz net değil';
  if (!(segmentAvg > 0)) {
    return `tek şarjla yaklaşık ${formatNumber(car.rangeKm, 0)} km menzile ulaşabiliyor`;
  }
  const diff = ((car.rangeKm - segmentAvg) / segmentAvg) * 100;
  if (diff >= 12) {
    return `tek şarjla ${formatNumber(car.rangeKm, 0)} km menzile çıkıyor; segmentteki benzer modellere göre oldukça iddialı`;
  }
  if (diff <= -12) {
    return `menzili ${formatNumber(car.rangeKm, 0)} km civarında; segment ortalamasının biraz altında kalıyor`;
  }
  return `${formatNumber(car.rangeKm, 0)} km menzille segmentteki rakiplerine yakın bir profil çiziyor`;
}

function chargeComparison(car: CarSummary): string {
  const min = car.chargingMin;
  if (min == null || min <= 0) return 'hızlı şarj süresi için net bir tablo henüz yok';
  if (min <= 25) {
    return `DC istasyonda 10–80 % aralığını yaklaşık ${min} dakikada doldurabiliyor; uzun yolda molaları kısa tutar`;
  }
  if (min <= 35) {
    return `DC şarjda 10–80 % için ${min} dakika civarı beklemek gerekiyor; günlük kullanım için yeterli`;
  }
  return `DC şarj süresi ${min} dakika bandında; planlı molalarla yönetmek daha mantıklı`;
}

function priceComparison(car: CarSummary, segmentAvgPrice: number): string {
  if (car.trAvailable === false || (car.priceTL ?? 0) <= 0) {
    if (car.priceForeign != null && car.priceForeign.length > 0) {
      return `Türkiye'de satışta görünmüyor; yurt dışı referans fiyatı ${car.priceForeign} civarında`;
    }
    return 'Türkiye fiyat bilgisi katalogda henüz yer almıyor';
  }
  if (car.priceTL == null || !(segmentAvgPrice > 0)) {
    if (car.priceTL != null) {
      return `Türkiye'de ${formatNumber(car.priceTL, 0)} TL bandında konumlanıyor`;
    }
    return 'Türkiye fiyat bilgisi katalogda henüz yer almıyor';
  }
  const diff = ((car.priceTL - segmentAvgPrice) / segmentAvgPrice) * 100;
  if (diff <= -10) {
    return `fiyatı ${formatNumber(car.priceTL, 0)} TL ile segment ortalamasının altında; bütçe dostu bir seçenek`;
  }
  if (diff >= 10) {
    return `${formatNumber(car.priceTL, 0)} TL bandında; segment ortalamasının üzerinde premium bir konumda`;
  }
  return `${formatNumber(car.priceTL, 0)} TL ile segment fiyat ortalamasına oldukça yakın duruyor`;
}

function driveTone(car: CarSummary): string {
  const drive = car.driveType ?? '';
  if (containsCaseInsensitiveTr(drive, 'AWD') || containsCaseInsensitiveTr(drive, '4x4')) {
    return 'Dört çeker aktarma, karlı yol ve hızlı ivmelenme isteyen sürücülere hitap ediyor';
  }
  if (containsCaseInsensitiveTr(drive, 'RWD')) {
    return 'Arkadan itişli yapısı dengeli sürüş ve verim odaklı bir karakter sunuyor';
  }
  return 'Önden çekişli düzeni günlük şehir kullanımında pratik bir sürüş sağlıyor';
}

function insight(car: CarSummary, catalog: CarSummary[]): CarSummaryInsight {
  const peers = catalog.filter((c) => c.id !== car.id);
  const segmentPeers = peers.filter((c) => c.segment === car.segment);
  const bodyPeers = peers.filter((c) => c.bodyType === car.bodyType);
  const reference =
    segmentPeers.length >= 3 ? segmentPeers : bodyPeers.length >= 3 ? bodyPeers : peers;

  const avgRange = average(
    reference.map((c) => c.rangeKm).filter((v): v is number => v != null),
  );
  const avgPrice = average(
    reference
      .filter((c) => c.trAvailable !== false)
      .map((c) => c.priceTL)
      .filter((v): v is number => v != null),
  );

  const consumption =
    car.rangeKm != null && car.rangeKm > 0 && car.batteryKwh != null
      ? (car.batteryKwh / car.rangeKm) * 100
      : 0;

  const year = car.year != null ? String(car.year) : '—';
  const lead = `${car.brand} ${car.model}, ${year} model ${car.bodyType ?? '—'} gövdesiyle ${car.segment ?? '—'} segmentinde yer alıyor.`;

  const bodyParts: string[] = [rangeComparison(car, avgRange) + '.'];
  if (car.batteryKwh != null && car.batteryKwh > 0) {
    const consText =
      consumption > 0
        ? ` ve yaklaşık ${formatNumber(consumption, 1)} kWh/100 km tüketim profili`
        : '';
    bodyParts.push(
      `${formatNumber(car.batteryKwh, 1)} kWh bataryası${consText} var; ${chargeComparison(car)}.`,
    );
  } else {
    bodyParts.push(`${chargeComparison(car)}.`);
  }
  if (car.powerHp != null && car.powerHp > 0) {
    const accel =
      car.accelerationSec != null
        ? ` ve ${formatNumber(car.accelerationSec, 1)} sn'lik 0–100 hızlanması`
        : '';
    // Swift `.lowercased()` yerel-BAĞIMSIZ — düz toLowerCase.
    bodyParts.push(`${car.powerHp} bg güç${accel} ile ${driveTone(car).toLowerCase()}.`);
  } else {
    bodyParts.push(`${driveTone(car)}.`);
  }

  return {
    lead,
    body: bodyParts.join(' '),
    closing: priceComparison(car, avgPrice) + '.',
    highlights: [
      { label: 'Menzil', value: car.rangeKm != null ? `${formatNumber(car.rangeKm, 0)} km` : '—' },
      {
        label: 'Batarya',
        value: car.batteryKwh != null ? `${formatNumber(car.batteryKwh, 1)} kWh` : '—',
      },
      { label: 'DC Şarj', value: car.chargingMin != null ? `${car.chargingMin} dk` : '—' },
      { label: 'Güç', value: car.powerHp != null ? `${formatNumber(car.powerHp, 0)} bg` : '—' },
    ],
  };
}

export const CarSummaryBuilder = {
  insight,
};
