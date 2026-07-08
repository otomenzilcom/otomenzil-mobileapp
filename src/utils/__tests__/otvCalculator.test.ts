import { describe, it, expect } from '@jest/globals';
import { OtvCalculator } from '../otvCalculator';

describe('OtvCalculator constants', () => {
  it('2026 thresholds', () => {
    expect(OtvCalculator.matrahThreshold2026).toBe(1_650_000);
    expect(OtvCalculator.disabledExemptionLimit2026).toBe(2_873_972);
  });
});

describe('OtvCalculator.powerKw', () => {
  it('hp * 0.7457 with no rounding', () => {
    expect(OtvCalculator.powerKw(200)).toBeCloseTo(149.14, 10);
    expect(OtvCalculator.powerKw(150)).toBeCloseTo(111.855, 10);
    expect(OtvCalculator.powerKw(0)).toBe(0);
  });
});

describe('OtvCalculator.rateBand', () => {
  it('<=160 kW: 25 below threshold, 55 above', () => {
    expect(OtvCalculator.rateBand(100, 1_000_000)).toBe(25);
    expect(OtvCalculator.rateBand(100, 2_000_000)).toBe(55);
    expect(OtvCalculator.rateBand(160, 1_000_000)).toBe(25);
  });
  it('>160 kW: 65 below threshold, 75 above', () => {
    expect(OtvCalculator.rateBand(161, 1_000_000)).toBe(65);
    expect(OtvCalculator.rateBand(200, 1_000_000)).toBe(65);
    expect(OtvCalculator.rateBand(200, 2_000_000)).toBe(75);
  });
  it('threshold is strict (>): exactly at threshold is not "over"', () => {
    expect(OtvCalculator.rateBand(100, 1_650_000)).toBe(25);
  });
});

describe('OtvCalculator.estimateMatrahAndRate', () => {
  it('low-power economical car settles at 25%', () => {
    const r = OtvCalculator.estimateMatrahAndRate(1_000_000, 150);
    expect(r.otvRate).toBe(25);
    expect(r.powerKw).toBe(112); // round(111.855)
    expect(r.matrah).toBeCloseTo(1_000_000 / 1.5, 6); // 666666.67
  });

  it('<=160 kW crossing matrah threshold settles at 55%', () => {
    const r = OtvCalculator.estimateMatrahAndRate(5_000_000, 150);
    expect(r.otvRate).toBe(55);
    expect(r.powerKw).toBe(112);
    expect(r.matrah).toBeCloseTo(5_000_000 / (1.55 * 1.2), 6);
  });

  it('high-power car oscillates then settles at 65% (iteration order matters)', () => {
    const r = OtvCalculator.estimateMatrahAndRate(3_000_000, 300);
    expect(r.otvRate).toBe(65);
    expect(r.powerKw).toBe(224); // round(223.71)
    expect(r.matrah).toBeCloseTo(3_000_000 / (1.65 * 1.2), 6); // 1515151.52
  });
});

describe('OtvCalculator.meetsLocalProduction', () => {
  it('matches whitelist brands + model substrings (case-insensitive)', () => {
    expect(OtvCalculator.meetsLocalProduction('Togg', 'T10X')).toBe(true);
    expect(OtvCalculator.meetsLocalProduction('TOGG', 't10x')).toBe(true);
    expect(OtvCalculator.meetsLocalProduction(' togg ', 'T10 Long Range')).toBe(true);
    expect(OtvCalculator.meetsLocalProduction('Citroën', 'ë-C3')).toBe(true);
    expect(OtvCalculator.meetsLocalProduction('Citroen', 'C3 You')).toBe(true);
    expect(OtvCalculator.meetsLocalProduction('Dacia', 'Spring')).toBe(true);
    expect(OtvCalculator.meetsLocalProduction('Renault', 'Spring')).toBe(true);
    expect(OtvCalculator.meetsLocalProduction('MG', 'MG4 Electric')).toBe(true);
    expect(OtvCalculator.meetsLocalProduction('Fiat', '500e')).toBe(true);
  });

  it('honors the Citroën C3 Aircross exclusion', () => {
    expect(OtvCalculator.meetsLocalProduction('Citroën', 'C3 Aircross')).toBe(false);
  });

  it('rejects non-whitelisted brand/model', () => {
    expect(OtvCalculator.meetsLocalProduction('Tesla', 'Model Y')).toBe(false);
    expect(OtvCalculator.meetsLocalProduction('Togg', 'T8')).toBe(false);
    expect(OtvCalculator.meetsLocalProduction('BYD', 'Seal')).toBe(false);
    expect(OtvCalculator.meetsLocalProduction('MG', 'ZS EV')).toBe(false);
  });
});
