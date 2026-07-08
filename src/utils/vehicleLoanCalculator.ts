// VehicleLoanCalculator.swift birebir port. BDDK taşıt kredisi limitleri + anüite.
// Dilim eşikleri, LTV/vade değerleri ve Türkçe not/uyarı metinleri Swift kaynağından aynen kopyalandı.

import { CarPriceFormatter } from './carPriceFormatter';

export type LoanVehicleCategory = 'domestic_ev' | 'standard';

export const loanVehicleCategoryLabel: Record<LoanVehicleCategory, string> = {
  domestic_ev: 'Yerli Tam Elektrikli',
  standard: 'Standart Taşıt',
};

export interface BddkLimits {
  creditAvailable: boolean;
  maxLoanAmount: number;
  maxTermMonths: number;
  maxLtvPercent: number;
  minDownPayment: number;
  tierLabel: string;
  note: string | null;
}

export interface VehicleLoanResult {
  loanAmount: number;
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
  limits: BddkLimits;
  adjustedTermMonths: number;
  adjustedLoanAmount: number;
  warnings: string[];
}

export interface VehicleLoanCalculateParams {
  principal: number;
  downPayment: number;
  annualRatePercent: number;
  termMonths: number;
  category: LoanVehicleCategory;
}

interface Tier {
  maxPrice: number;
  ltv: number;
  term: number;
  label: string;
}

const STANDARD_TIERS: Tier[] = [
  { maxPrice: 400_000, ltv: 70, term: 48, label: '0 – 400.000 TL' },
  { maxPrice: 800_000, ltv: 50, term: 36, label: '400.001 – 800.000 TL' },
  { maxPrice: 1_200_000, ltv: 30, term: 24, label: '800.001 – 1.200.000 TL' },
  { maxPrice: 2_000_000, ltv: 20, term: 12, label: '1.200.001 – 2.000.000 TL' },
];

const DOMESTIC_EV_TIERS: Tier[] = [
  { maxPrice: 2_500_000, ltv: 70, term: 48, label: '0 – 2.500.000 TL (Yerli EV)' },
  { maxPrice: 5_000_000, ltv: 50, term: 36, label: '2.500.001 – 5.000.000 TL (Yerli EV)' },
  { maxPrice: 6_500_000, ltv: 30, term: 24, label: '5.000.001 – 6.500.000 TL (Yerli EV)' },
  { maxPrice: 7_500_000, ltv: 20, term: 12, label: '6.500.001 – 7.500.000 TL (Yerli EV)' },
];

function getBddkLimits(price: number, category: LoanVehicleCategory): BddkLimits {
  const tiers = category === 'domestic_ev' ? DOMESTIC_EV_TIERS : STANDARD_TIERS;
  const maxAllowed = tiers.length > 0 ? tiers[tiers.length - 1].maxPrice : 0;

  if (!(price > 0)) {
    return {
      creditAvailable: false,
      maxLoanAmount: 0,
      maxTermMonths: 0,
      maxLtvPercent: 0,
      minDownPayment: 0,
      tierLabel: '—',
      note: 'Araç fiyatı girin.',
    };
  }

  if (!(price <= maxAllowed)) {
    return {
      creditAvailable: false,
      maxLoanAmount: 0,
      maxTermMonths: 0,
      maxLtvPercent: 0,
      minDownPayment: price,
      tierLabel: 'Kredi limiti dışı',
      note:
        category === 'domestic_ev'
          ? '7.500.000 TL üzeri yerli EV araçlarda taşıt kredisi kullanılamaz (BDDK).'
          : '2.000.000 TL üzeri araçlarda taşıt kredisi kullanılamaz (BDDK).',
    };
  }

  const tier = tiers.find((t) => price <= t.maxPrice) ?? tiers[tiers.length - 1];
  const maxLoan = Math.floor((price * tier.ltv) / 100);
  const minDown = Math.max(0, price - maxLoan);

  return {
    creditAvailable: true,
    maxLoanAmount: maxLoan,
    maxTermMonths: tier.term,
    maxLtvPercent: tier.ltv,
    minDownPayment: minDown,
    tierLabel: tier.label,
    note: `Bu dilimde en fazla %${tier.ltv} kredilendirme ve ${tier.term} ay vade uygulanır.`,
  };
}

function calculate(params: VehicleLoanCalculateParams): VehicleLoanResult {
  const { principal, downPayment, annualRatePercent, termMonths, category } = params;
  const limits = getBddkLimits(principal, category);
  const warnings: string[] = [];

  if (!limits.creditAvailable) {
    return {
      loanAmount: 0,
      monthlyPayment: 0,
      totalPayment: 0,
      totalInterest: 0,
      limits,
      adjustedTermMonths: 0,
      adjustedLoanAmount: 0,
      warnings: limits.note != null ? [limits.note] : ['Taşıt kredisi kullanılamaz.'],
    };
  }

  let adjustedLoan = Math.max(0, principal - downPayment);
  if (adjustedLoan > limits.maxLoanAmount) {
    adjustedLoan = limits.maxLoanAmount;
    warnings.push(
      `Kredi tutarı BDDK limiti olan ${CarPriceFormatter.formatTL(limits.maxLoanAmount)} ile sınırlandı.`,
    );
  }

  let adjustedTerm = Math.max(1, termMonths);
  if (adjustedTerm > limits.maxTermMonths) {
    adjustedTerm = limits.maxTermMonths;
    warnings.push(
      `Vade, bu fiyat dilimi için izin verilen ${limits.maxTermMonths} ay ile sınırlandı.`,
    );
  }

  if (downPayment < limits.minDownPayment) {
    warnings.push(
      `Minimum peşinat en az ${CarPriceFormatter.formatTL(limits.minDownPayment)} olmalı.`,
    );
  }

  if (!(adjustedLoan > 0)) {
    return {
      loanAmount: 0,
      monthlyPayment: 0,
      totalPayment: 0,
      totalInterest: 0,
      limits,
      adjustedTermMonths: adjustedTerm,
      adjustedLoanAmount: adjustedLoan,
      warnings,
    };
  }

  const monthlyRate = annualRatePercent / 100 / 12;
  let monthly: number;
  if (monthlyRate <= 0) {
    monthly = adjustedLoan / adjustedTerm;
  } else {
    const factor = Math.pow(1 + monthlyRate, adjustedTerm);
    monthly = (adjustedLoan * monthlyRate * factor) / (factor - 1);
  }

  const total = monthly * adjustedTerm;
  return {
    loanAmount: adjustedLoan,
    monthlyPayment: monthly,
    totalPayment: total,
    totalInterest: total - adjustedLoan,
    limits,
    adjustedTermMonths: adjustedTerm,
    adjustedLoanAmount: adjustedLoan,
    warnings,
  };
}

export const VehicleLoanCalculator = {
  getBddkLimits,
  calculate,
};
