import { describe, it, expect } from '@jest/globals';

import { carSlugFromCampaignUrl, normalizeSlug } from '../urls';

describe('normalizeSlug — spec §6/§4.4', () => {
  it('küçük harfe çevirir, boşlukları tireye çevirir', () => {
    expect(normalizeSlug('Ada Lovelace')).toBe('ada-lovelace');
  });

  it('[a-z0-9-] dışını tireye indirger ve tekrarları toplar', () => {
    expect(normalizeSlug('ör__nek!!kullanıcı')).toBe('r-nek-kullan-c');
  });

  it('baştaki/sondaki tireleri kırpar', () => {
    expect(normalizeSlug('---abc---')).toBe('abc');
  });

  it('zaten geçerli slug değişmez', () => {
    expect(normalizeSlug('togg-t10x')).toBe('togg-t10x');
  });
});

describe('carSlugFromCampaignUrl — spec §5.1', () => {
  it('son path bileşenini döndürür', () => {
    expect(carSlugFromCampaignUrl('https://www.otomenzil.com/arac/togg-t10x/')).toBe('togg-t10x');
  });

  it('query/hash yok sayılır', () => {
    expect(carSlugFromCampaignUrl('https://x.com/arac/byd-seal?utm=1#top')).toBe('byd-seal');
  });

  it('son bileşen "arac" ise araç detayı açılmaz (null)', () => {
    expect(carSlugFromCampaignUrl('https://www.otomenzil.com/arac/')).toBeNull();
  });

  it('boş URL null', () => {
    expect(carSlugFromCampaignUrl('')).toBeNull();
  });
});
