// MtvCalculator.swift birebir port. 2026 referans yılı, Türkiye EV MTV hesabı.
// Tüm bracket eşikleri, çarpanlar ve Türkçe etiketler Swift kaynağından aynen kopyalandı.

import { CarPriceFormatter } from './carPriceFormatter';

// Swift Double.rounded() -> .toNearestOrAwayFromZero (half away from zero).
function roundHalfAwayFromZero(x: number): number {
  return x < 0 ? -Math.round(-x) : Math.round(x);
}

export type MtvAgeGroupId = '1-3' | '4-6' | '7-11' | '12-15' | '16+';

export interface MtvAgeGroup {
  id: MtvAgeGroupId;
  label: string;
  multiplier: number;
}

export interface MtvMatrahBracket {
  maxMatrah: number | null;
  amountTry: number;
}

export interface MtvPowerTier {
  id: string;
  label: string;
  minKw: number;
  maxKw: number | null;
  brackets: MtvMatrahBracket[];
}

export interface MtvCalculationResult {
  annualMtvTry: number;
  installmentMtvTry: number;
  estimatedIceMtvTry: number;
  ageGroup: MtvAgeGroup;
  vehicleAge: number;
  powerTier: MtvPowerTier;
  matrahBracketLabel: string;
  baseAmountTry: number;
  ageMultiplier: number;
}

export interface MtvCalculateParams {
  motorPowerKw: number;
  modelYear: number;
  taxBaseTry: number;
  registrationYear: number;
}

const REFERENCE_YEAR = 2026;

const AGE_GROUPS: Record<MtvAgeGroupId, MtvAgeGroup> = {
  '1-3': { id: '1-3', label: '1–3 yaş', multiplier: 1 },
  '4-6': { id: '4-6', label: '4–6 yaş', multiplier: 0.75 },
  '7-11': { id: '7-11', label: '7–11 yaş', multiplier: 0.5 },
  '12-15': { id: '12-15', label: '12–15 yaş', multiplier: 0.35 },
  '16+': { id: '16+', label: '16 yaş ve üzeri', multiplier: 0.2 },
};

const POWER_TIERS: MtvPowerTier[] = [
  {
    id: '0-70',
    label: '70 kW ve altı',
    minKw: 0,
    maxKw: 70,
    brackets: [
      { maxMatrah: 309_100, amountTry: 1_437 },
      { maxMatrah: 541_500, amountTry: 1_579 },
      { maxMatrah: null, amountTry: 1_725 },
    ],
  },
  {
    id: '71-85',
    label: '71 – 85 kW',
    minKw: 71,
    maxKw: 85,
    brackets: [
      { maxMatrah: 309_100, amountTry: 2_504 },
      { maxMatrah: 541_500, amountTry: 2_755 },
      { maxMatrah: null, amountTry: 3_007 },
    ],
  },
  {
    id: '86-105',
    label: '86 – 105 kW',
    minKw: 86,
    maxKw: 105,
    brackets: [
      { maxMatrah: 775_100, amountTry: 4_868 },
      { maxMatrah: null, amountTry: 5_312 },
    ],
  },
  {
    id: '106-120',
    label: '106 – 120 kW',
    minKw: 106,
    maxKw: 120,
    brackets: [
      { maxMatrah: 775_100, amountTry: 7_669 },
      { maxMatrah: null, amountTry: 8_368 },
    ],
  },
  {
    id: '121-150',
    label: '121 – 150 kW',
    minKw: 121,
    maxKw: 150,
    brackets: [
      { maxMatrah: 775_100, amountTry: 11_963 },
      { maxMatrah: null, amountTry: 13_053 },
    ],
  },
  {
    id: '151-180',
    label: '151 – 180 kW',
    minKw: 151,
    maxKw: 180,
    brackets: [
      { maxMatrah: 968_100, amountTry: 11_506 },
      { maxMatrah: null, amountTry: 12_554 },
    ],
  },
  {
    id: '181-210',
    label: '181 – 210 kW',
    minKw: 181,
    maxKw: 210,
    brackets: [
      { maxMatrah: 1_937_500, amountTry: 16_043 },
      { maxMatrah: null, amountTry: 17_504 },
    ],
  },
  {
    id: '211-240',
    label: '211 – 240 kW',
    minKw: 211,
    maxKw: 240,
    brackets: [
      { maxMatrah: 1_937_500, amountTry: 24_436 },
      { maxMatrah: null, amountTry: 26_660 },
    ],
  },
  {
    id: '241+',
    label: '241 kW ve üzeri',
    minKw: 241,
    maxKw: null,
    brackets: [
      { maxMatrah: 3_101_800, amountTry: 38_421 },
      { maxMatrah: null, amountTry: 41_917 },
    ],
  },
];

// Swift private extension Int.formatted(): formatTL sonucundan ₺ ve boşlukları temizler.
function formatMatrah(n: number): string {
  return CarPriceFormatter.formatTL(n).replace(/₺/g, '').trim();
}

function hpToKw(hp: number): number {
  return roundHalfAwayFromZero(hp * 0.7457 * 10) / 10;
}

function estimateTaxBase(retailPrice: number): number {
  if (!(retailPrice > 0)) {
    return 0;
  }
  return roundHalfAwayFromZero(retailPrice / 1.32);
}

function resolveAgeGroup(modelYear: number): MtvAgeGroup {
  const age = Math.max(0, REFERENCE_YEAR - modelYear);
  if (age <= 3) return AGE_GROUPS['1-3'];
  if (age <= 6) return AGE_GROUPS['4-6'];
  if (age <= 11) return AGE_GROUPS['7-11'];
  if (age <= 15) return AGE_GROUPS['12-15'];
  return AGE_GROUPS['16+'];
}

function resolvePowerTier(motorPowerKw: number): MtvPowerTier {
  const kw = Math.max(0, motorPowerKw);
  const found = POWER_TIERS.find((tier) => {
    if (tier.maxKw != null) {
      return kw >= tier.minKw && kw <= tier.maxKw;
    }
    return kw >= tier.minKw;
  });
  return found ?? POWER_TIERS[POWER_TIERS.length - 1];
}

function resolveMatrahBracket(
  tier: MtvPowerTier,
  taxBaseTry: number,
  usesMatrahTier: boolean,
): { amount: number; label: string } {
  if (!usesMatrahTier || taxBaseTry <= 0) {
    return {
      amount: tier.brackets[0].amountTry,
      label: usesMatrahTier
        ? 'Matrah bilgisi yok — alt dilim'
        : '2018 öncesi tescil (matrah uygulanmaz)',
    };
  }

  for (let index = 0; index < tier.brackets.length; index++) {
    const bracket = tier.brackets[index];
    if (bracket.maxMatrah == null) {
      const prev = index > 0 ? tier.brackets[index - 1] : null;
      const label =
        prev != null && prev.maxMatrah != null
          ? `${formatMatrah(Math.trunc(prev.maxMatrah + 1))} TL üzeri matrah`
          : 'En üst matrah dilimi';
      return { amount: bracket.amountTry, label };
    }
    if (taxBaseTry <= bracket.maxMatrah) {
      return {
        amount: bracket.amountTry,
        label: `${formatMatrah(Math.trunc(bracket.maxMatrah))} TL'ye kadar matrah`,
      };
    }
  }

  const last = tier.brackets[tier.brackets.length - 1];
  return { amount: last.amountTry, label: 'En üst matrah dilimi' };
}

function calculate(params: MtvCalculateParams): MtvCalculationResult {
  const { motorPowerKw, modelYear, taxBaseTry, registrationYear } = params;
  const usesMatrahTier = registrationYear >= 2018;
  const ageGroup = resolveAgeGroup(modelYear);
  const vehicleAge = Math.max(0, REFERENCE_YEAR - modelYear);
  const powerTier = resolvePowerTier(motorPowerKw);
  const bracket = resolveMatrahBracket(powerTier, taxBaseTry, usesMatrahTier);
  const annual = roundHalfAwayFromZero(bracket.amount * ageGroup.multiplier);

  return {
    annualMtvTry: annual,
    installmentMtvTry: roundHalfAwayFromZero(annual / 2),
    estimatedIceMtvTry: annual * 4,
    ageGroup,
    vehicleAge,
    powerTier,
    matrahBracketLabel: bracket.label,
    baseAmountTry: bracket.amount,
    ageMultiplier: ageGroup.multiplier,
  };
}

export const MtvCalculator = {
  referenceYear: REFERENCE_YEAR,
  ageGroups: AGE_GROUPS,
  powerTiers: POWER_TIERS,
  hpToKw,
  estimateTaxBase,
  calculate,
};
