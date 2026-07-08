// Garaj şarj simülatörü slider durum mantığı — spec §3.2 GaragePortChargeCalculator birebir.
//
// Saf indirgeyiciler (UI'dan bağımsız, birim testli). İki slider (step 5):
//   - "Mevcut şarj" (0…90, default 20): hedefi geçerse hedefi +10 iter (üst sınır 100).
//   - "Hedef şarj" (start+10…100, default 80): en az start+10.
// Ayrıca hedef yüzdesine göre kapsül dolgu rengi (§3.2 batarya göstergesi).

export const START_MIN = 0;
export const START_MAX = 90;
export const START_DEFAULT = 20;
export const TARGET_MAX = 100;
export const TARGET_DEFAULT = 80;
export const CHARGE_STEP = 5;
/** Hedef, başlangıçtan en az bu kadar yüksek olmalı (§3.2). */
export const TARGET_MARGIN = 10;

export interface ChargeLevels {
  startPercent: number;
  targetPercent: number;
}

function clampStep(value: number, min: number, max: number): number {
  const clamped = Math.min(max, Math.max(min, value));
  const steps = Math.round((clamped - min) / CHARGE_STEP);
  return Math.min(max, min + steps * CHARGE_STEP);
}

/**
 * "Mevcut şarj" değişimi (§3.2): start 0…90'a step-clamp; hedefi geçerse (veya margin'e
 * dokunacaksa) hedefi start+10'a (100 sınırlı) iter.
 */
export function applyStartChange(levels: ChargeLevels, rawStart: number): ChargeLevels {
  const startPercent = clampStep(rawStart, START_MIN, START_MAX);
  let targetPercent = levels.targetPercent;
  if (startPercent + TARGET_MARGIN > targetPercent) {
    targetPercent = Math.min(TARGET_MAX, startPercent + TARGET_MARGIN);
  }
  return { startPercent, targetPercent };
}

/**
 * "Hedef şarj" değişimi (§3.2): target (start+10)…100'e step-clamp. Start değişmez.
 */
export function applyTargetChange(levels: ChargeLevels, rawTarget: number): ChargeLevels {
  const min = Math.min(TARGET_MAX, levels.startPercent + TARGET_MARGIN);
  const targetPercent = clampStep(rawTarget, min, TARGET_MAX);
  return { startPercent: levels.startPercent, targetPercent };
}

/** Kapsül dolgu rengi (§3.2): ≤20 kırmızı, ≤55 amber, ≤80 mavi, else emerald. */
export function gaugeColorForTarget(targetPercent: number): string {
  if (targetPercent <= 20) return '#EF4444';
  if (targetPercent <= 55) return '#F59E0B';
  if (targetPercent <= 80) return '#3B82F6';
  return '#10B981';
}
