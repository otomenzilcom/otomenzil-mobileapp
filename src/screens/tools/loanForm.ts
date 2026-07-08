// VehicleLoanView form-durumu → VehicleLoanCalculator girdi eşlemesi (spec 03 §1.5).
//
// Alanlar canlı (submit yok). Para alanları digit-only + binlik gruplama gösterimi; faiz
// virgül→nokta; vade sayısal. Bu modül parse/format saf yardımcılarını toplar — UI'dan bağımsız test.

import type { LoanVehicleCategory } from '../../utils/vehicleLoanCalculator';

/** Yerli EV kategori varsayılanları (spec §1.5). */
export const LOAN_DEFAULTS = {
  principal: 2_500_000,
  downPayment: 750_000,
  annualRatePercent: 3.35,
  termMonths: 48,
  category: 'domestic_ev' as LoanVehicleCategory,
};

/** Sadece rakamları alır (para alanı). Boş → 0. */
export function parseMoney(text: string): number {
  const digits = text.replace(/[^\d]/g, '');
  if (digits.length === 0) return 0;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : 0;
}

/** Binlik ayraçlı gösterim (tr "." grup) — LoanMoneyField input değeri. */
export function formatMoneyInput(value: number): string {
  if (!(value > 0)) return '';
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Faiz alanı: virgül→nokta, geçersiz → fallback. */
export function parseRate(text: string, fallback: number): number {
  const n = parseFloat(text.replace(',', '.').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : fallback;
}

/** Vade alanı (ay): rakam-only, geçersiz → fallback. */
export function parseTerm(text: string, fallback: number): number {
  const digits = text.replace(/[^\d]/g, '');
  if (digits.length === 0) return fallback;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : fallback;
}
