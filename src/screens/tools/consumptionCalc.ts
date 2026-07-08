// ConsumptionCalculationView saf hesap yardımcıları (spec 03 §1.1 Formulas).
//
// consumedKwh = consumptionPer100 * distanceKm / 100; totalCost = consumedKwh * tariff.price;
// costPerKm = totalCost / distance (distance>0). Tarife fiyatları iOS kaynağından birebir.

export type ConsumptionTariffId = 'home_low' | 'home_high' | 'public_ac' | 'fast_dc';

export interface ConsumptionTariff {
  id: ConsumptionTariffId;
  name: string;
  price: number; // TL/kWh
}

/** iOS 4 tarife satırı (isim + hardcoded TL/kWh). */
export const CONSUMPTION_TARIFFS: ConsumptionTariff[] = [
  { id: 'home_low', name: 'Ev Tipi (Düşük Kademe)', price: 2.3 },
  { id: 'home_high', name: 'Ev Tipi (Yüksek Kademe)', price: 3.4 },
  { id: 'public_ac', name: 'Halka Açık AC Şarj', price: 7.5 },
  { id: 'fast_dc', name: 'Hızlı DC Şarj', price: 9.8 },
];

export interface ConsumptionResult {
  consumedKwh: number;
  totalCost: number;
  costPerKm: number;
}

/**
 * per100 = kWh/100km (katalog: seçili aracın batarya/menzil*100; manuel: batteryKwh/rangeKm*100).
 * distanceKm ve tariffPrice ile tüketilen kWh, toplam maliyet ve TL/km hesaplar.
 */
export function consumptionResult(
  per100: number,
  distanceKm: number,
  tariffPrice: number,
): ConsumptionResult {
  const consumedKwh = (per100 * distanceKm) / 100;
  const totalCost = consumedKwh * tariffPrice;
  const costPerKm = distanceKm > 0 ? totalCost / distanceKm : 0;
  return { consumedKwh, totalCost, costPerKm };
}
