import { describe, it, expect } from '@jest/globals';

import { dismissKey, localDateKey } from '../campaignStore';

describe('localDateKey — yerel saat dilimi yyyy-MM-dd', () => {
  it('tek haneli ay/gün sıfırla doldurulur', () => {
    // 2026-03-05 yerel — new Date(y, m0, d) yerel saat diliminde kurar.
    const date = new Date(2026, 2, 5, 10, 30);
    expect(localDateKey(date)).toBe('2026-03-05');
  });

  it('çift haneli ay/gün', () => {
    const date = new Date(2026, 11, 25, 0, 0);
    expect(localDateKey(date)).toBe('2026-12-25');
  });
});

describe('dismissKey — per-popup per-gün', () => {
  it('anahtar formatı otomenzil.popup.dismissed.<id>.<date>', () => {
    const date = new Date(2026, 6, 8);
    expect(dismissKey('promo-42', date)).toBe('otomenzil.popup.dismissed.promo-42.2026-07-08');
  });

  it('aynı popup farklı günlerde farklı anahtar üretir (ertesi gün yeniden görünür)', () => {
    const day1 = dismissKey('p', new Date(2026, 6, 8));
    const day2 = dismissKey('p', new Date(2026, 6, 9));
    expect(day1).not.toBe(day2);
  });
});
