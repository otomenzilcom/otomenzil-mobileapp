// StationsScreen şarj hesaplayıcı saf yardımcıları (spec §9.7).
//
// Etkin güç seçimi: ac → 22 kW; hpc → istasyonun effectiveMaxPowerKw'ı (yoksa 180); dc →
// min(istasyon effective (yoksa 120), araç dcMaxKw). effectiveMaxPowerKw util'den gelir (soket-güç
// çıkarımı dahil). UI'dan bağımsız — birim testi kolay.

import type { EPDKStation } from '../../models/stations';
import { EpdkStationsData } from '../../utils/epdkStationsData';

export type ChargeMode = 'ac' | 'dc' | 'hpc';

export interface CalcVehicleLike {
  dcMaxKw: number;
}

/** Etkin şarj gücü (kW) — spec §9.7 birebir. */
export function computeChargePower(
  mode: ChargeMode,
  vehicle: CalcVehicleLike | undefined,
  station: EPDKStation | null,
): number {
  if (mode === 'ac') return 22;
  const stationKw = station ? EpdkStationsData.effectiveMaxPowerKw(station) : 0;
  if (mode === 'hpc') return stationKw > 0 ? stationKw : 180;
  const stationEffective = stationKw > 0 ? stationKw : 120;
  const vehicleMax = vehicle?.dcMaxKw ?? 150;
  return Math.min(stationEffective, vehicleMax);
}

/** Şarj enerjisi (kWh) = batarya × Δ%/100. */
export function chargeEnergyKwh(batteryKwh: number, startPercent: number, targetPercent: number): number {
  return (batteryKwh * Math.max(0, targetPercent - startPercent)) / 100;
}

/** Tahmini süre (dk) = max(10, kWh/güç×60). */
export function chargeMinutes(energyKwh: number, powerKw: number): number {
  return Math.max(10, (energyKwh / Math.max(1, powerKw)) * 60);
}
