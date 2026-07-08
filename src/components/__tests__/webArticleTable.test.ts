import { describe, it, expect } from '@jest/globals';

import { cellStyleFor } from '../WebArticleTable';

describe('cellStyleFor — hücre stil kuralları (iOS sırası)', () => {
  it('"Kredi kullanılamaz" → kırmızı bold (en yüksek öncelik)', () => {
    // "%" da içerse bile kredi kuralı önce gelir.
    expect(cellStyleFor('Kredi kullanılamaz %70', true)).toEqual({ color: '#DC2626', weight: 700 });
  });

  it('highlightFirstRate && "%70" → emerald700 bold', () => {
    expect(cellStyleFor('%70', true)).toEqual({ color: '#166534', weight: 700 });
  });

  it('highlightFirstRate kapalıyken "%70" jenerik yüzde kuralına düşer', () => {
    expect(cellStyleFor('%70', false)).toEqual({ color: '#292524', weight: 700 });
  });

  it('"%" içeren diğer hücreler → stone800 bold', () => {
    expect(cellStyleFor('%50', false)).toEqual({ color: '#292524', weight: 700 });
    expect(cellStyleFor('%20 kredilendirme', true)).toEqual({ color: '#292524', weight: 700 });
  });

  it('yüzde/kredi içermeyen → stone700 medium', () => {
    expect(cellStyleFor('400.000 TL', true)).toEqual({ color: '#44403C', weight: 500 });
    expect(cellStyleFor('48 ay', false)).toEqual({ color: '#44403C', weight: 500 });
  });
});
