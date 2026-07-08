import { describe, it, expect } from '@jest/globals';
import { CarPriceFormatter } from '../carPriceFormatter';

describe('CarPriceFormatter.formatTL', () => {
  it('formats with tr_TR dot grouping, ₺ prefix, no fraction digits', () => {
    expect(CarPriceFormatter.formatTL(1234567)).toBe('₺1.234.567');
    expect(CarPriceFormatter.formatTL(210000)).toBe('₺210.000');
    expect(CarPriceFormatter.formatTL(0)).toBe('₺0');
    expect(CarPriceFormatter.formatTL(999)).toBe('₺999');
    expect(CarPriceFormatter.formatTL(1000)).toBe('₺1.000');
  });

  it('rounds fractional amounts half-to-even (NumberFormatter default)', () => {
    expect(CarPriceFormatter.formatTL(1234.4)).toBe('₺1.234');
    expect(CarPriceFormatter.formatTL(1234.6)).toBe('₺1.235');
    // exact .5 -> round to even
    expect(CarPriceFormatter.formatTL(2.5)).toBe('₺2');
    expect(CarPriceFormatter.formatTL(3.5)).toBe('₺4');
  });

  it('handles negative amounts', () => {
    expect(CarPriceFormatter.formatTL(-1500)).toBe('-₺1.500');
  });
});

describe('CarPriceFormatter.isAvailableInTurkey', () => {
  it('treats nil/undefined as available; only explicit false is unavailable', () => {
    expect(CarPriceFormatter.isAvailableInTurkey(undefined)).toBe(true);
    expect(CarPriceFormatter.isAvailableInTurkey(null)).toBe(true);
    expect(CarPriceFormatter.isAvailableInTurkey(true)).toBe(true);
    expect(CarPriceFormatter.isAvailableInTurkey(false)).toBe(false);
  });
});

describe('CarPriceFormatter.showsForeignBadge', () => {
  it('is the negation of isAvailableInTurkey', () => {
    expect(CarPriceFormatter.showsForeignBadge(false)).toBe(true);
    expect(CarPriceFormatter.showsForeignBadge(true)).toBe(false);
    expect(CarPriceFormatter.showsForeignBadge(undefined)).toBe(false);
  });
});

describe('CarPriceFormatter.primaryPriceText', () => {
  it('available with positive priceTL -> formatted TL', () => {
    expect(CarPriceFormatter.primaryPriceText(1234567, null, true)).toBe('₺1.234.567');
    expect(CarPriceFormatter.primaryPriceText(1234567, null, undefined)).toBe('₺1.234.567');
  });

  it('available with missing/zero/negative priceTL -> "Fiyat bilgisi yok"', () => {
    expect(CarPriceFormatter.primaryPriceText(null, null, true)).toBe('Fiyat bilgisi yok');
    expect(CarPriceFormatter.primaryPriceText(0, null, true)).toBe('Fiyat bilgisi yok');
    expect(CarPriceFormatter.primaryPriceText(-5, null, true)).toBe('Fiyat bilgisi yok');
  });

  it('not available -> trimmed foreign price or fallback', () => {
    expect(CarPriceFormatter.primaryPriceText(1234567, '  €45.000  ', false)).toBe('€45.000');
    expect(CarPriceFormatter.primaryPriceText(1234567, '   ', false)).toBe(
      'Yurt dışı fiyat bilgisi yok',
    );
    expect(CarPriceFormatter.primaryPriceText(1234567, null, false)).toBe(
      'Yurt dışı fiyat bilgisi yok',
    );
  });
});
