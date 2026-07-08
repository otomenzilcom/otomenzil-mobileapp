// Araç metrik değer biçimlendirme yardımcıları — CarSpecDeckView / CarDetailMetricsGrid (spec
// §4.12, §4.14) ile birebir. Eksik değer → "—".

/** "{n} km" veya "—". */
export function formatRange(rangeKm?: number): string {
  return rangeKm != null ? `${rangeKm} km` : '—';
}

/** Tam sayı → "{n} kWh", değilse "%.1f kWh"; eksik → "—". */
export function formatBattery(batteryKwh?: number): string {
  if (batteryKwh == null) return '—';
  return Number.isInteger(batteryKwh) ? `${batteryKwh} kWh` : `${batteryKwh.toFixed(1)} kWh`;
}

/** "{n} HP" veya "—". */
export function formatPower(powerHp?: number): string {
  return powerHp != null ? `${powerHp} HP` : '—';
}

/** "%.1f sn" veya "—". */
export function formatAcceleration(accelerationSec?: number): string {
  return accelerationSec != null ? `${accelerationSec.toFixed(1)} sn` : '—';
}

/** "{n} dk" veya "—". */
export function formatChargingMinutes(chargingMin?: number): string {
  return chargingMin != null ? `${chargingMin} dk` : '—';
}
