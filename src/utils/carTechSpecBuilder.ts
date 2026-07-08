// Karşılaştırma/detay teknik-özellik tablosu üreticisi. CarTechSpecBuilder.swift birebir.
// Şema: sunucu comparisonSpecSchema (boş olmayan spec'ler) veya defaultSchema; sonra
// dışlanan kategori/anahtar filtreleri. Değer: manuel (techSpecs) → otomatik türetme → "—".

import type { CarDetail, JSONValue } from '../models/car';
import type {
  ComparisonSpecCategory,
  ComparisonSpecDefinition,
  MobileAppSettings,
} from '../models/home';

const excludedCategories = new Set<string>([
  'Güvenlik Puanları (Euro NCAP)',
  'Boyutlar ve Ağırlık Seviyeleri',
]);

const excludedKeys = new Set<string>([
  'platformName',
  'dedicatedPlatform',
  'turningCircle',
  'roofRails',
]);

const defaultSchema: ComparisonSpecCategory[] = [
  {
    categoryName: 'Menzil Tahminleri (İklimsel & Parkur)',
    specs: [
      { label: 'Şehir İçi - Soğuk Hava', key: 'rangeCityCold', unit: 'km' },
      { label: 'Şehir İçi - Ilıman Hava', key: 'rangeCityMild', unit: 'km' },
      { label: 'Otoyol - Soğuk Hava', key: 'rangeHwyCold', unit: 'km' },
      { label: 'Otoyol - Ilıman Hava', key: 'rangeHwyMild', unit: 'km' },
      { label: 'Karma - Soğuk Hava', key: 'rangeCombinedCold', unit: 'km' },
      { label: 'Karma - Ilıman Hava', key: 'rangeCombinedMild', unit: 'km' },
    ],
  },
  {
    categoryName: 'Performans Verileri',
    specs: [
      { label: 'Hızlanma 0-100 km/s', key: 'accel_0_100', unit: 'sn' },
      { label: 'Maksimum Hız', key: 'maxSpeed', unit: 'km/s' },
      { label: 'Maksimum Güç', key: 'maxPower', unit: undefined },
      { label: 'Maksimum Tork', key: 'maxTorque', unit: 'Nm' },
    ],
  },
  {
    categoryName: 'Batarya Detayları',
    specs: [
      { label: 'Tam Dolu Kapasite', key: 'batteryTotal', unit: 'kWh' },
      { label: 'Kullanılabilir Kapasite', key: 'batteryUsable', unit: 'kWh' },
      { label: 'Batarya Tipi', key: 'batteryType', unit: undefined },
      { label: 'Garanti Süresi (Batarya)', key: 'warrantyYearsSpec', unit: 'Yıl' },
    ],
  },
  {
    categoryName: 'Şarj - Şebeke (AC)',
    specs: [
      { label: 'AC Şarj Gücü', key: 'acPower', unit: 'kW' },
      { label: 'AC Şarj Süresi (%0-%100)', key: 'acTime', unit: undefined },
    ],
  },
  {
    categoryName: 'Şarj - Hızlı Şarj (DC)',
    specs: [
      { label: 'Maksimum DC Şarj Gücü', key: 'dcMaxPower', unit: 'kW' },
      { label: 'DC Şarj Süresi (%10-%80)', key: 'dcTime', unit: 'dk' },
    ],
  },
  {
    categoryName: 'Enerji Tüketimi / Gerçek Tüketim',
    specs: [
      { label: 'Gerçek Ortalama Menzil', key: 'realAvgRange', unit: 'km' },
      { label: 'Ortalama Araç Tüketimi', key: 'avgCons', unit: 'Wh/km' },
    ],
  },
];

function schema(settings?: MobileAppSettings): ComparisonSpecCategory[] {
  const fromAPI = (settings?.comparisonSpecSchema ?? []).filter((c) => c.specs.length > 0);
  const raw = fromAPI.length === 0 ? defaultSchema : fromAPI;
  return raw
    .filter((group) => !excludedCategories.has(group.categoryName))
    .map((group) => ({
      categoryName: group.categoryName,
      specs: group.specs.filter((spec) => !excludedKeys.has(spec.key)),
    }))
    .filter((group) => group.specs.length > 0);
}

/** Swift `.double` formatlama: tam sayı ise "%.0f", değilse "%.1f". */
function formatDouble(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function manualValue(car: CarDetail, key: string): string | null {
  const specs = car.techSpecs;
  if (!specs || !(key in specs)) return null;
  const raw: JSONValue = specs[key];
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    return trimmed.length === 0 ? null : trimmed;
  }
  if (typeof raw === 'number') {
    return formatDouble(raw);
  }
  if (typeof raw === 'boolean') {
    return raw ? 'Evet' : 'Hayır';
  }
  return null;
}

function autoValue(car: CarDetail, key: string): string | null {
  switch (key) {
    case 'accel_0_100':
      return car.accelerationSec != null ? car.accelerationSec.toFixed(1) : null;
    case 'maxSpeed':
      return car.maxSpeedKmh != null ? String(car.maxSpeedKmh) : null;
    case 'maxPower':
      return car.powerHp != null ? String(car.powerHp) : null;
    case 'maxTorque':
      return car.torqueNm != null ? String(car.torqueNm) : null;
    // batteryTotal ve batteryUsable AYNI: tam kapasite (%.1f). Swift'te `* 0.93`
    // dalı ölü koddur (ilk case kazanır) — parite: batteryUsable = total.
    case 'batteryTotal':
    case 'batteryUsable':
      return car.batteryKwh != null ? car.batteryKwh.toFixed(1) : null;
    case 'dcTime':
      return car.chargingMin != null ? String(car.chargingMin) : null;
    case 'trunkSpaceMin':
      return car.trunkLiters != null ? String(car.trunkLiters) : null;
    case 'warrantyYearsSpec':
      return car.warrantyYears != null ? String(car.warrantyYears) : null;
    case 'rangeCombinedMild':
    case 'realAvgRange':
      return car.rangeKm != null ? String(car.rangeKm) : null;
    case 'rangeCityMild':
      return car.rangeKm != null ? String(Math.trunc(car.rangeKm * 1.08)) : null;
    case 'rangeHwyMild':
      return car.rangeKm != null ? String(Math.trunc(car.rangeKm * 0.82)) : null;
    case 'rangeCityCold':
    case 'rangeCombinedCold':
      return car.rangeKm != null ? String(Math.trunc(car.rangeKm * 0.78)) : null;
    case 'rangeHwyCold':
      return car.rangeKm != null ? String(Math.trunc(car.rangeKm * 0.68)) : null;
    case 'avgCons': {
      if (car.rangeKm == null || car.rangeKm <= 0 || car.batteryKwh == null) return null;
      return ((car.batteryKwh / car.rangeKm) * 100).toFixed(1);
    }
    case 'acPower':
      return '11';
    case 'acTime':
      return car.batteryKwh != null ? `${(car.batteryKwh / 11).toFixed(1)} saat` : null;
    case 'dcMaxPower':
      return '150';
    case 'dcAvgPower':
      return '93';
    case 'batteryType':
      return 'Li-ion';
    case 'seats':
      return '5';
    default:
      return null;
  }
}

/** Birimi yalnız değerde henüz geçmiyorsa ekle. */
function appendUnit(value: string, unit?: string): string {
  if (unit == null || unit.length === 0) return value;
  if (value.includes(unit)) return value;
  return `${value} ${unit}`;
}

function formattedValue(car: CarDetail, key: string, unit?: string): string {
  const manual = manualValue(car, key);
  if (manual != null) return appendUnit(manual, unit);
  const auto = autoValue(car, key);
  if (auto != null) return appendUnit(auto, unit);
  return '—';
}

/** Sadece rakamlardan Int — önce manuel, sonra otomatik değer. */
function labNumericValue(car: CarDetail, key: string): number | null {
  const manual = manualValue(car, key);
  if (manual != null) {
    const digits = manual.replace(/[^0-9]/g, '');
    if (digits.length > 0) return parseInt(digits, 10);
  }
  const auto = autoValue(car, key);
  if (auto != null) {
    const digits = auto.replace(/[^0-9]/g, '');
    if (digits.length > 0) return parseInt(digits, 10);
  }
  return null;
}

export interface CarTechSpecRow {
  label: string;
  value: string;
}

export interface CarTechSpecGroup {
  categoryName: string;
  rows: CarTechSpecRow[];
}

function groups(car: CarDetail, settings?: MobileAppSettings): CarTechSpecGroup[] {
  return schema(settings).map((category) => ({
    categoryName: category.categoryName,
    rows: category.specs.map((spec: ComparisonSpecDefinition) => ({
      label: spec.label,
      value: formattedValue(car, spec.key, spec.unit),
    })),
  }));
}

export const CarTechSpecBuilder = {
  defaultSchema,
  schema,
  groups,
  formattedValue,
  labNumericValue,
};
