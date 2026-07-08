// EngineeringLabSimulator.swift birebir port. Gerçek menzil laboratuvarı (sıcaklık × parkur).
// Değer çözümleme sırası Swift ile aynı: 1) car.techSpecs[key], 2) CarTechSpecBuilder.labNumericValue,
// 3) varsayılanlar (range = car.rangeKm ?? 0, consumption = 170 Wh/km).
//
// Not: Swift doğrudan CarTechSpecBuilder.labNumericValue çağırır. CarTechSpecBuilder ayrı bir modülde
// (başka bir ajan tarafından) yazıldığından, bu bağımlılık enjekte edilebilir tutuldu. Uygulama
// başlangıcında setLabNumericValueResolver(CarTechSpecBuilder.labNumericValue) ile bağlanmalıdır;
// bağlanmazsa 2. adım atlanır ve doğrudan varsayılanlara düşülür.

import type { CarDetail } from '../models/car';

export type LabTemperature = 'cold' | 'mild';
export type LabRoute = 'city' | 'hwy' | 'combined';

export interface LabValues {
  rangeKm: number;
  consumptionWhPerKm: number;
}

/** CarTechSpecBuilder.labNumericValue(for:key:) karşılığı. Değer yoksa null döner. */
export type LabNumericValueResolver = (car: CarDetail, key: string) => number | null;

let labNumericValueResolver: LabNumericValueResolver | undefined;

/** CarTechSpecBuilder.labNumericValue bağımlılığını enjekte eder (uygulama başlangıcında). */
export function setLabNumericValueResolver(resolver: LabNumericValueResolver | undefined): void {
  labNumericValueResolver = resolver;
}

function resolveKeys(
  temperature: LabTemperature,
  route: LabRoute,
): { rangeKey: string; consKey: string } {
  if (temperature === 'cold' && route === 'city') {
    return { rangeKey: 'rangeCityCold', consKey: 'consCityCold' };
  }
  if (temperature === 'cold' && route === 'hwy') {
    return { rangeKey: 'rangeHwyCold', consKey: 'consHwyCold' };
  }
  if (temperature === 'cold' && route === 'combined') {
    return { rangeKey: 'rangeCombinedCold', consKey: 'consCombinedCold' };
  }
  if (temperature === 'mild' && route === 'city') {
    return { rangeKey: 'rangeCityMild', consKey: 'consCityMild' };
  }
  if (temperature === 'mild' && route === 'hwy') {
    return { rangeKey: 'rangeHwyMild', consKey: 'consHwyMild' };
  }
  return { rangeKey: 'rangeCombinedMild', consKey: 'consCombinedMild' };
}

// Swift specNumber(_:key:): techSpecs değerini Int'e indirger.
// .int -> i, .double -> Int(d) (sıfıra doğru kırpma), .string -> yalnız rakamlar -> Int, diğer -> nil.
function specNumber(car: CarDetail, key: string): number | null {
  const value = car.techSpecs?.[key];
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === 'number') {
    return Math.trunc(value);
  }
  if (typeof value === 'string') {
    const digits = value.replace(/[^0-9]/g, '');
    return digits === '' ? null : parseInt(digits, 10);
  }
  return null;
}

function labFallback(car: CarDetail, key: string): number | null {
  if (labNumericValueResolver == null) {
    return null;
  }
  return labNumericValueResolver(car, key);
}

function values(car: CarDetail, temperature: LabTemperature, route: LabRoute): LabValues {
  const { rangeKey, consKey } = resolveKeys(temperature, route);

  let rangeVal = car.rangeKm ?? 0;
  let consVal = 170;

  const rawRange = specNumber(car, rangeKey);
  if (rawRange !== null) {
    rangeVal = rawRange;
  } else {
    const fallback = labFallback(car, rangeKey);
    if (fallback !== null) {
      rangeVal = fallback;
    }
  }

  const rawCons = specNumber(car, consKey);
  if (rawCons !== null) {
    consVal = rawCons;
  } else {
    const fallback = labFallback(car, consKey);
    if (fallback !== null) {
      consVal = fallback;
    }
  }

  return { rangeKm: rangeVal, consumptionWhPerKm: consVal };
}

export const EngineeringLabSimulator = {
  values,
};
