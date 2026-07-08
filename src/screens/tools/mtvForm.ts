// MtvCalculationView form-durumu → MtvCalculator girdi eşlemesi (spec 03 §1.4).
//
// applyCar: seçilen araçtan modelYear/registrationYear ← year, kW ← hpToKw(powerHp),
// taxBase ← estimateTaxBase(price). Guide tablo satırları powerTiers'tan türetilir. UI'dan
// bağımsız test edilebilir olsun diye tüm dönüşümler burada; ekran yalnızca durum tutar.

import type { CarSummary } from '../../models/car';
import { CarPriceFormatter } from '../../utils/carPriceFormatter';
import { MtvCalculator, type MtvCalculateParams } from '../../utils/mtvCalculator';

/** Manuel form varsayılanları (spec §1.4 manual mode). */
export const MTV_DEFAULTS = {
  modelYear: 2026,
  registrationYear: 2026,
  motorPowerKw: 160,
  taxBaseTry: 1_500_000,
} as const;

/** Model yılı / tescil yılı mantıksal aralığı: 2008…referenceYear+1. */
export const MTV_MIN_YEAR = 2008;
export const MTV_MAX_YEAR = MtvCalculator.referenceYear + 1;

export interface MtvCarSeed {
  modelYear: number;
  registrationYear: number;
  motorPowerKw: number;
  taxBaseTry: number;
  /** Picker altında gösterilen "{kw} kW · Tahmini matrah {TL}" bilgi satırı. */
  infoLine: string;
}

/**
 * applyCar (spec §1.4): araç → form tohumu. year yoksa varsayılan yıl; powerHp yoksa 0 kW;
 * priceTL yoksa 0 matrah. infoLine kW + tahmini matrah'ı formatlar.
 */
export function mtvSeedFromCar(car: CarSummary): MtvCarSeed {
  const year = car.year ?? MTV_DEFAULTS.modelYear;
  const kw = car.powerHp != null ? MtvCalculator.hpToKw(car.powerHp) : 0;
  const taxBase = MtvCalculator.estimateTaxBase(car.priceTL ?? 0);
  return {
    modelYear: year,
    registrationYear: year,
    motorPowerKw: kw,
    taxBaseTry: taxBase,
    infoLine: `${kw} kW · Tahmini matrah ${CarPriceFormatter.formatTL(taxBase)}`,
  };
}

/** Araç picker etiketi: "{brand} {model} ({year|—})". */
export function mtvCarOptionLabel(car: CarSummary): string {
  return `${car.brand} ${car.model} (${car.year != null ? car.year : '—'})`;
}

/** Katalog filtresi (spec §1.4): trAvailable != false && priceTL > 0, marka sırası. */
export function mtvEligibleCars(catalog: CarSummary[]): CarSummary[] {
  return catalog
    .filter((car) => car.trAvailable !== false && (car.priceTL ?? 0) > 0)
    .slice()
    .sort((a, b) => a.brand.localeCompare(b.brand, 'tr-TR'));
}

/** Form alanlarından MtvCalculator.calculate parametrelerini kurar. */
export function mtvParamsFromForm(form: {
  motorPowerKw: number;
  modelYear: number;
  taxBaseTry: number;
  registrationYear: number;
}): MtvCalculateParams {
  return {
    motorPowerKw: form.motorPowerKw,
    modelYear: form.modelYear,
    taxBaseTry: form.taxBaseTry,
    registrationYear: form.registrationYear,
  };
}

/** GİB tarife etiketini binlik ayraçlı TL metnine çevirir (₺ ve boşluk temizlenmiş). */
function formatTierAmount(n: number): string {
  return `${CarPriceFormatter.formatTL(n).replace(/₺/g, '').trim()} TL`;
}

export interface MtvGuideRow {
  /** Güç dilimi etiketi — yalnızca ilk bracket satırında dolu, diğerlerinde "". */
  power: string;
  /** Matrah dilimi etiketi ("{N} TL'ye kadar" / "Üst dilim"). */
  matrah: string;
  /** Yıllık MTV (1–3 yaş) tutarı ("{N} TL"). */
  amount: string;
  /** Zebra gölgesi için tier grup indeksi. */
  tierIndex: number;
}

/**
 * Guide tablo satırları (spec §1.4 Guide section): powerTiers üzerinden; her tier'ın bracket'leri
 * satır olur, güç etiketi yalnızca ilk bracket satırında gösterilir.
 */
export function mtvGuideRows(): MtvGuideRow[] {
  const rows: MtvGuideRow[] = [];
  MtvCalculator.powerTiers.forEach((tier, tierIndex) => {
    tier.brackets.forEach((bracket, bracketIndex) => {
      const matrah =
        bracket.maxMatrah != null ? `${formatTierAmount(bracket.maxMatrah)}'ye kadar` : 'Üst dilim';
      rows.push({
        power: bracketIndex === 0 ? tier.label : '',
        matrah,
        amount: formatTierAmount(bracket.amountTry),
        tierIndex,
      });
    });
  });
  return rows;
}
