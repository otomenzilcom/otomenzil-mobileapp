import { describe, it, expect } from '@jest/globals';

import { formatMoneyInput, parseMoney, parseRate, parseTerm } from '../loanForm';

describe('parseMoney', () => {
  it('strips grouping and non-digits', () => {
    expect(parseMoney('2.500.000')).toBe(2_500_000);
    expect(parseMoney('750000 TL')).toBe(750_000);
    expect(parseMoney('')).toBe(0);
    expect(parseMoney('abc')).toBe(0);
  });
});

describe('formatMoneyInput', () => {
  it('groups thousands with dot; empty for non-positive', () => {
    expect(formatMoneyInput(2_500_000)).toBe('2.500.000');
    expect(formatMoneyInput(750_000)).toBe('750.000');
    expect(formatMoneyInput(0)).toBe('');
  });

  it('round-trips through parseMoney', () => {
    expect(parseMoney(formatMoneyInput(1_234_567))).toBe(1_234_567);
  });
});

describe('parseRate', () => {
  it('accepts comma decimals and falls back on garbage', () => {
    expect(parseRate('3,35', 1)).toBeCloseTo(3.35, 6);
    expect(parseRate('4.10', 1)).toBeCloseTo(4.1, 6);
    expect(parseRate('', 3.35)).toBe(3.35);
    expect(parseRate('abc', 3.35)).toBe(3.35);
  });
});

describe('parseTerm', () => {
  it('digit-only with fallback', () => {
    expect(parseTerm('48', 12)).toBe(48);
    expect(parseTerm('36 ay', 12)).toBe(36);
    expect(parseTerm('', 48)).toBe(48);
  });
});
