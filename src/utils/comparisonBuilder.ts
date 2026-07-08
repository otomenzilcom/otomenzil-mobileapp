// Karşılaştırma motoru — ComparisonBuilder.swift birebir.
// Preset'ler, kritik satırlar, LİDER (leader) mantığı ve Türkçe sayı ayrıştırması.
// Kritik satır değerleri Models/Car.swift'teki display hesaplı-özellikleri (priceDisplay,
// rangeDisplay, ...) — burada 1:1 port edildi (CarPriceFormatter.formatTL dahil).

import type { CarSummary } from '../models/car';

const tryFormatter = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 0,
});

/** CarPriceFormatter.formatTL — tr_TR, TRY, 0 kesir hanesi (ör. ₺1.234.567). */
function formatTL(amount: number): string {
  return tryFormatter.format(amount);
}

// --- Models/Car.swift display hesaplı-özellikleri (String? döner) ---
// NOT: batteryDisplay/accelerationDisplay/consumptionDisplay Swift'te `String(format:)`
// kullanır — C yerel ayarı, ONDALIK NOKTA (ör. "88.5 kWh"), tr virgül DEĞİL.

function priceDisplay(car: CarSummary): string | null {
  return car.priceTL != null ? formatTL(car.priceTL) : null;
}

function rangeDisplay(car: CarSummary): string | null {
  return car.rangeKm != null ? `${car.rangeKm} km` : null;
}

function batteryDisplay(car: CarSummary): string | null {
  if (car.batteryKwh == null) return null;
  return Number.isInteger(car.batteryKwh)
    ? `${car.batteryKwh} kWh`
    : `${car.batteryKwh.toFixed(1)} kWh`;
}

function powerDisplay(car: CarSummary): string | null {
  return car.powerHp != null ? `${car.powerHp} HP` : null;
}

function accelerationDisplay(car: CarSummary): string | null {
  return car.accelerationSec != null ? `${car.accelerationSec.toFixed(1)} sn` : null;
}

function consumptionDisplay(car: CarSummary): string | null {
  if (car.rangeKm == null || car.rangeKm <= 0 || car.batteryKwh == null) return null;
  return `${((car.batteryKwh / car.rangeKm) * 100).toFixed(1)} kWh/100km`;
}

function chargingDisplay(car: CarSummary): string | null {
  return car.chargingMin != null ? `${car.chargingMin} dk` : null;
}

export interface ComparePreset {
  id: string;
  name: string;
  desc: string;
  ids: string[];
  icon: string;
  badge: string;
}

const presets: ComparePreset[] = [
  {
    id: 'compare-preset-1',
    name: 'Milli Mücadele: Togg vs Tesla vs BYD',
    desc: 'Togg T10X, Tesla Model Y ve BYD Seal yan yana.',
    ids: ['togg-t10x', 'tesla-model-y', 'byd-seal'],
    icon: '🇹🇷',
    badge: 'Popüler Paket',
  },
  {
    id: 'compare-preset-2',
    name: '800-Volt Premium Süper Şarj Devleri',
    desc: 'Taycan, Kia EV6 ve Ioniq 5 karşılaştırması.',
    ids: ['porsche-taycan', 'kia-ev6', 'hyundai-ioniq-5'],
    icon: '⚡',
    badge: 'Mühendislik Lideri',
  },
  {
    id: 'compare-preset-3',
    name: 'Fiyat-Performans Elektrikliler',
    desc: 'Ulaşılabilir fiyatlı modeller.',
    ids: ['mg-mg4', 'togg-t10x', 'byd-seal'],
    icon: '💰',
    badge: 'Bütçe Dostu',
  },
];

/** Kritik karşılaştırma satırı — value() ilgili display string'ini üretir. */
export interface ComparisonRow {
  label: string;
  value: (car: CarSummary) => string | null;
  lowerIsBetter: boolean;
}

const criticalRows: ComparisonRow[] = [
  { label: 'Fiyat', value: priceDisplay, lowerIsBetter: true },
  { label: 'Menzil', value: rangeDisplay, lowerIsBetter: false },
  { label: 'Tüketim', value: consumptionDisplay, lowerIsBetter: true },
  { label: 'Batarya', value: batteryDisplay, lowerIsBetter: false },
  { label: 'Güç', value: powerDisplay, lowerIsBetter: false },
  { label: 'DC Süre', value: chargingDisplay, lowerIsBetter: true },
  { label: '0-100', value: accelerationDisplay, lowerIsBetter: true },
];

export interface FaqItem {
  question: string;
  answer: string;
}

const faqItems: FaqItem[] = [
  {
    question: 'En fazla kaç aracı karşılaştırabilirim?',
    answer: 'Karşılaştırma robotu aynı anda en fazla 3 modeli yan yana analiz eder.',
  },
  {
    question: 'WLTP menzil değerleri gerçek hayatta geçerli mi?',
    answer: 'WLTP laboratuvar referansıdır; sıcaklık ve sürüş profili gerçek menzili değiştirir.',
  },
  {
    question: 'LFP ve NMC batarya farkı nedir?',
    answer: 'LFP uzun ömür sunar; NMC enerji yoğunluğu ve soğuk hava performansı avantajlıdır.',
  },
  {
    question: '👑 LİDER rozeti nasıl belirlenir?',
    answer: 'Her parametrede en iyi sayısal değer otomatik işaretlenir.',
  },
];

/** Sırasız kanonik anahtar: boş olmayanları tekilleştir, sırala. */
function canonicalCompareIds(ids: string[]): string[] {
  return Array.from(new Set(ids.filter((id) => id.length > 0))).sort();
}

/**
 * Türkçe sayı ayrıştırma: "." binlik ayracını sil, "," → ".", yalnız [0-9.] tut.
 * NOT (parite): batteryDisplay gibi ONDALIK-NOKTALI string'lerde "." de silinir
 * ("88.5 kWh" → 885) — Swift davranışı birebir korunur.
 */
function parseNumeric(text: string): number | null {
  const cleaned = text.replace(/\./g, '').replace(/,/g, '.');
  const digits = Array.from(cleaned)
    .filter((ch) => '0123456789.'.includes(ch))
    .join('');
  if (digits.length === 0) return null;
  const value = Number(digits);
  return Number.isFinite(value) ? value : null;
}

/**
 * Bir parametrenin lideri. Her aracın display string'ini sayıya çevirir; ≥2 ayrıştırılabilir
 * değer gerekir; en iyi (min/max) tek araca aitse o araç id'si, eşitlikte null.
 */
function leader(
  cars: CarSummary[],
  value: (car: CarSummary) => string | null,
  lowerIsBetter: boolean,
): string | null {
  const values: { id: string; num: number }[] = [];
  for (const car of cars) {
    const text = value(car);
    if (text == null) continue;
    const num = parseNumeric(text);
    if (num == null) continue;
    values.push({ id: car.id, num });
  }
  if (values.length < 2) return null;

  let best = values[0].num;
  for (const entry of values) {
    if (lowerIsBetter ? entry.num < best : entry.num > best) best = entry.num;
  }
  const leaders = values.filter((entry) => entry.num === best).map((entry) => entry.id);
  return leaders.length === 1 ? leaders[0] : null;
}

export const ComparisonBuilder = {
  presets,
  criticalRows,
  faqItems,
  canonicalCompareIds,
  leader,
  // Ekranlar/testler için display erişimcileri:
  priceDisplay,
  rangeDisplay,
  batteryDisplay,
  powerDisplay,
  accelerationDisplay,
  consumptionDisplay,
  chargingDisplay,
  formatTL,
};
