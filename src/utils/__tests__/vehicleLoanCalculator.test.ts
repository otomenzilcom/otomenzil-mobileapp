import { describe, it, expect } from '@jest/globals';
import { VehicleLoanCalculator } from '../vehicleLoanCalculator';

describe('VehicleLoanCalculator.getBddkLimits — standard', () => {
  it('price <= 0 -> not available', () => {
    const l = VehicleLoanCalculator.getBddkLimits(0, 'standard');
    expect(l.creditAvailable).toBe(false);
    expect(l.tierLabel).toBe('—');
    expect(l.note).toBe('Araç fiyatı girin.');
    expect(l.maxLoanAmount).toBe(0);
    expect(l.minDownPayment).toBe(0);
  });

  it('first tier: 300.000 TL', () => {
    const l = VehicleLoanCalculator.getBddkLimits(300000, 'standard');
    expect(l.creditAvailable).toBe(true);
    expect(l.maxLtvPercent).toBe(70);
    expect(l.maxTermMonths).toBe(48);
    expect(l.maxLoanAmount).toBe(210000); // floor(300000 * 70 / 100)
    expect(l.minDownPayment).toBe(90000);
    expect(l.tierLabel).toBe('0 – 400.000 TL');
    expect(l.note).toBe('Bu dilimde en fazla %70 kredilendirme ve 48 ay vade uygulanır.');
  });

  it('boundary 400.000 stays in tier 1; 400.001 moves to tier 2 with floor rounding', () => {
    expect(VehicleLoanCalculator.getBddkLimits(400000, 'standard').maxLtvPercent).toBe(70);
    const l2 = VehicleLoanCalculator.getBddkLimits(400001, 'standard');
    expect(l2.maxLtvPercent).toBe(50);
    expect(l2.maxLoanAmount).toBe(200000); // floor(400001 * 50 / 100 = 200000.5)
    expect(l2.minDownPayment).toBe(200001);
    expect(l2.tierLabel).toBe('400.001 – 800.000 TL');
  });

  it('price above last tier -> not available with standard note', () => {
    const l = VehicleLoanCalculator.getBddkLimits(2500000, 'standard');
    expect(l.creditAvailable).toBe(false);
    expect(l.tierLabel).toBe('Kredi limiti dışı');
    expect(l.minDownPayment).toBe(2500000);
    expect(l.note).toBe('2.000.000 TL üzeri araçlarda taşıt kredisi kullanılamaz (BDDK).');
  });
});

describe('VehicleLoanCalculator.getBddkLimits — domestic EV', () => {
  it('second EV tier: 3.000.000 TL', () => {
    const l = VehicleLoanCalculator.getBddkLimits(3000000, 'domestic_ev');
    expect(l.creditAvailable).toBe(true);
    expect(l.maxLtvPercent).toBe(50);
    expect(l.maxTermMonths).toBe(36);
    expect(l.maxLoanAmount).toBe(1500000);
    expect(l.minDownPayment).toBe(1500000);
    expect(l.tierLabel).toBe('2.500.001 – 5.000.000 TL (Yerli EV)');
  });

  it('price above 7.5M EV limit -> not available with EV note', () => {
    const l = VehicleLoanCalculator.getBddkLimits(8000000, 'domestic_ev');
    expect(l.creditAvailable).toBe(false);
    expect(l.note).toBe('7.500.000 TL üzeri yerli EV araçlarda taşıt kredisi kullanılamaz (BDDK).');
  });
});

describe('VehicleLoanCalculator.calculate', () => {
  it('credit unavailable -> zeros + note as warning', () => {
    const r = VehicleLoanCalculator.calculate({
      principal: 2500000,
      downPayment: 0,
      annualRatePercent: 40,
      termMonths: 24,
      category: 'standard',
    });
    expect(r.loanAmount).toBe(0);
    expect(r.monthlyPayment).toBe(0);
    expect(r.adjustedLoanAmount).toBe(0);
    expect(r.adjustedTermMonths).toBe(0);
    expect(r.warnings).toEqual(['2.000.000 TL üzeri araçlarda taşıt kredisi kullanılamaz (BDDK).']);
  });

  it('normal annuity: no clamps, interest accrues', () => {
    const r = VehicleLoanCalculator.calculate({
      principal: 300000,
      downPayment: 100000,
      annualRatePercent: 48,
      termMonths: 24,
      category: 'standard',
    });
    expect(r.warnings).toEqual([]);
    expect(r.loanAmount).toBe(200000);
    expect(r.adjustedTermMonths).toBe(24);
    // annuity: r=0.04/mo, f=1.04^24
    expect(r.monthlyPayment).toBeCloseTo(13117.4, -1);
    expect(r.monthlyPayment).toBeGreaterThan(200000 / 24); // interest-bearing
    expect(r.totalPayment).toBeCloseTo(r.monthlyPayment * 24, 6);
    expect(r.totalInterest).toBeCloseTo(r.totalPayment - 200000, 6);
  });

  it('zero rate -> straight-line, no interest', () => {
    const r = VehicleLoanCalculator.calculate({
      principal: 300000,
      downPayment: 100000,
      annualRatePercent: 0,
      termMonths: 20,
      category: 'standard',
    });
    expect(r.monthlyPayment).toBe(10000); // 200000 / 20
    expect(r.totalPayment).toBe(200000);
    expect(r.totalInterest).toBe(0);
    expect(r.warnings).toEqual([]);
  });

  it('loan clamped to BDDK limit + min down-payment warning (ordered)', () => {
    const r = VehicleLoanCalculator.calculate({
      principal: 300000,
      downPayment: 0,
      annualRatePercent: 48,
      termMonths: 24,
      category: 'standard',
    });
    expect(r.loanAmount).toBe(210000);
    expect(r.adjustedLoanAmount).toBe(210000);
    expect(r.warnings).toEqual([
      'Kredi tutarı BDDK limiti olan ₺210.000 ile sınırlandı.',
      'Minimum peşinat en az ₺90.000 olmalı.',
    ]);
  });

  it('term clamped to tier maximum', () => {
    const r = VehicleLoanCalculator.calculate({
      principal: 300000,
      downPayment: 100000,
      annualRatePercent: 48,
      termMonths: 60,
      category: 'standard',
    });
    expect(r.adjustedTermMonths).toBe(48);
    expect(r.warnings).toEqual(['Vade, bu fiyat dilimi için izin verilen 48 ay ile sınırlandı.']);
  });

  it('full down-payment -> zero loan, no annuity computed', () => {
    const r = VehicleLoanCalculator.calculate({
      principal: 300000,
      downPayment: 300000,
      annualRatePercent: 48,
      termMonths: 24,
      category: 'standard',
    });
    expect(r.loanAmount).toBe(0);
    expect(r.monthlyPayment).toBe(0);
    expect(r.adjustedLoanAmount).toBe(0);
    expect(r.adjustedTermMonths).toBe(24);
    expect(r.warnings).toEqual([]);
  });
});
