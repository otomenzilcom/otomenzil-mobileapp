import { describe, it, expect } from '@jest/globals';
import { MtvCalculator } from '../mtvCalculator';

describe('MtvCalculator.hpToKw', () => {
  it('rounds to 1 decimal (half away from zero)', () => {
    expect(MtvCalculator.hpToKw(200)).toBe(149.1); // 1491.4 -> 1491 / 10
    expect(MtvCalculator.hpToKw(100)).toBe(74.6); // 745.7 -> 746 / 10
    expect(MtvCalculator.hpToKw(0)).toBe(0);
  });
});

describe('MtvCalculator.estimateTaxBase', () => {
  it('strips ~KDV+ÖTV: round(price / 1.32)', () => {
    expect(MtvCalculator.estimateTaxBase(2000000)).toBe(1515152); // 1515151.51 -> 1515152
    expect(MtvCalculator.estimateTaxBase(1320000)).toBe(1000000);
  });
  it('non-positive price -> 0', () => {
    expect(MtvCalculator.estimateTaxBase(0)).toBe(0);
    expect(MtvCalculator.estimateTaxBase(-5)).toBe(0);
  });
});

describe('MtvCalculator.calculate — power tiers & brackets', () => {
  it('121-150 kW, matrah in first bracket', () => {
    const r = MtvCalculator.calculate({
      motorPowerKw: 150,
      modelYear: 2026,
      taxBaseTry: 700000,
      registrationYear: 2024,
    });
    expect(r.powerTier.id).toBe('121-150');
    expect(r.baseAmountTry).toBe(11963);
    expect(r.matrahBracketLabel).toBe("775.100 TL'ye kadar matrah");
    expect(r.ageGroup.id).toBe('1-3');
    expect(r.ageMultiplier).toBe(1);
    expect(r.annualMtvTry).toBe(11963);
    expect(r.installmentMtvTry).toBe(5982); // round(5981.5)
    expect(r.estimatedIceMtvTry).toBe(47852);
    expect(r.vehicleAge).toBe(0);
  });

  it('121-150 kW, matrah above top numeric bracket -> "üzeri" label', () => {
    const r = MtvCalculator.calculate({
      motorPowerKw: 150,
      modelYear: 2026,
      taxBaseTry: 800000,
      registrationYear: 2024,
    });
    expect(r.baseAmountTry).toBe(13053);
    expect(r.matrahBracketLabel).toBe("775.101 TL üzeri matrah");
    expect(r.annualMtvTry).toBe(13053);
    expect(r.installmentMtvTry).toBe(6527); // round(6526.5)
  });

  it('pre-2018 registration ignores matrah, uses first bracket', () => {
    const r = MtvCalculator.calculate({
      motorPowerKw: 100,
      modelYear: 2020,
      taxBaseTry: 500000,
      registrationYear: 2017,
    });
    expect(r.powerTier.id).toBe('86-105');
    expect(r.baseAmountTry).toBe(4868);
    expect(r.matrahBracketLabel).toBe('2018 öncesi tescil (matrah uygulanmaz)');
    expect(r.ageGroup.id).toBe('4-6');
    expect(r.ageMultiplier).toBe(0.75);
    expect(r.annualMtvTry).toBe(3651); // round(4868 * 0.75)
    expect(r.installmentMtvTry).toBe(1826); // round(1825.5)
    expect(r.estimatedIceMtvTry).toBe(14604);
    expect(r.vehicleAge).toBe(6);
  });

  it('post-2018 with zero matrah -> "alt dilim" label', () => {
    const r = MtvCalculator.calculate({
      motorPowerKw: 70,
      modelYear: 2026,
      taxBaseTry: 0,
      registrationYear: 2020,
    });
    expect(r.powerTier.id).toBe('0-70');
    expect(r.baseAmountTry).toBe(1437);
    expect(r.matrahBracketLabel).toBe('Matrah bilgisi yok — alt dilim');
    expect(r.annualMtvTry).toBe(1437);
    expect(r.installmentMtvTry).toBe(719); // round(718.5)
  });

  it('241+ tier: high matrah -> prevMax+1 label; oldest age group multiplier', () => {
    const r = MtvCalculator.calculate({
      motorPowerKw: 241,
      modelYear: 2005,
      taxBaseTry: 4000000,
      registrationYear: 2019,
    });
    expect(r.powerTier.id).toBe('241+');
    expect(r.baseAmountTry).toBe(41917);
    expect(r.matrahBracketLabel).toBe('3.101.801 TL üzeri matrah');
    expect(r.ageGroup.id).toBe('16+');
    expect(r.ageMultiplier).toBe(0.2);
    expect(r.annualMtvTry).toBe(8383); // round(41917 * 0.2 = 8383.4)
    expect(r.installmentMtvTry).toBe(4192); // round(4191.5)
    expect(r.estimatedIceMtvTry).toBe(33532);
    expect(r.vehicleAge).toBe(21);
  });
});

describe('MtvCalculator.calculate — power tier boundaries & quirks', () => {
  it('kW at exact tier edges', () => {
    const base = { modelYear: 2026, taxBaseTry: 100000, registrationYear: 2024 };
    expect(MtvCalculator.calculate({ ...base, motorPowerKw: 70 }).powerTier.id).toBe('0-70');
    expect(MtvCalculator.calculate({ ...base, motorPowerKw: 71 }).powerTier.id).toBe('71-85');
    expect(MtvCalculator.calculate({ ...base, motorPowerKw: 85 }).powerTier.id).toBe('71-85');
    expect(MtvCalculator.calculate({ ...base, motorPowerKw: 86 }).powerTier.id).toBe('86-105');
  });

  it('QUIRK: fractional kW between tiers falls through to last tier (241+)', () => {
    const r = MtvCalculator.calculate({
      motorPowerKw: 70.5,
      modelYear: 2026,
      taxBaseTry: 100000,
      registrationYear: 2024,
    });
    expect(r.powerTier.id).toBe('241+');
  });

  it('negative kW clamps to 0 -> first tier', () => {
    const r = MtvCalculator.calculate({
      motorPowerKw: -10,
      modelYear: 2026,
      taxBaseTry: 100000,
      registrationYear: 2024,
    });
    expect(r.powerTier.id).toBe('0-70');
  });
});

describe('MtvCalculator.calculate — age group boundaries', () => {
  const base = { motorPowerKw: 100, taxBaseTry: 100000, registrationYear: 2024 };
  const cases: [number, string][] = [
    [2023, '1-3'], // age 3
    [2022, '4-6'], // age 4
    [2020, '4-6'], // age 6
    [2019, '7-11'], // age 7
    [2015, '7-11'], // age 11
    [2014, '12-15'], // age 12
    [2011, '12-15'], // age 15
    [2010, '16+'], // age 16
    [2030, '1-3'], // future -> age clamped to 0
  ];
  it.each(cases)('modelYear %i -> age group %s', (modelYear, expected) => {
    expect(MtvCalculator.calculate({ ...base, modelYear }).ageGroup.id).toBe(expected);
  });
});
