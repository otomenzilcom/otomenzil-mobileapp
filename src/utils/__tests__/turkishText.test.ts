import { describe, it, expect } from '@jest/globals';
import {
  compareLocalizedTr,
  containsCaseInsensitiveTr,
  equalsCaseInsensitive,
  equalsCaseInsensitiveTr,
  foldDiacritics,
  trLowercase,
  trUppercase,
} from '../turkishText';

describe('foldDiacritics', () => {
  it('aksanları kaldırır ve küçük harfe indirir', () => {
    expect(foldDiacritics('İstanbul')).toBe('istanbul');
    expect(foldDiacritics('Şişli')).toBe('sisli');
    expect(foldDiacritics('Beşiktaş')).toBe('besiktas');
    expect(foldDiacritics('Gümüşhane')).toBe('gumushane');
  });

  it('ı/i ayrımını korur (ı taban harf, aksan değil)', () => {
    expect(foldDiacritics('Kadıköy')).toBe('kadıkoy');
    expect(foldDiacritics('Sarıyer')).toBe('sarıyer');
  });

  it('combining-nokta tuhaflıklarını (districts JSON) temizler', () => {
    // "İ̇mamoğlu" — İ + fazladan combining nokta.
    expect(foldDiacritics('İ̇mamoğlu')).toBe('imamoglu');
    expect(foldDiacritics('Sai̇mbeyli̇')).toBe('saimbeyli');
  });
});

describe('tr yerel büyük/küçük harf', () => {
  it('trLowercase İ→i, I→ı', () => {
    expect(trLowercase('İSTANBUL')).toBe('istanbul');
    expect(trLowercase('ISPARTA')).toBe('ısparta');
  });

  it('trUppercase i→İ, ı→I', () => {
    expect(trUppercase('istanbul')).toBe('İSTANBUL');
    expect(trUppercase('ısparta')).toBe('ISPARTA');
  });
});

describe('karşılaştırıcılar', () => {
  it('equalsCaseInsensitiveTr tr katlamayla eşit (aksan duyarlı)', () => {
    expect(equalsCaseInsensitiveTr('İstanbul', 'istanbul')).toBe(true);
    expect(equalsCaseInsensitiveTr('KADIKÖY', 'kadıköy')).toBe(true);
    expect(equalsCaseInsensitiveTr('Şişli', 'sisli')).toBe(false); // aksan duyarlı
  });

  it('equalsCaseInsensitive yerel-bağımsız ASCII eşitlik', () => {
    expect(equalsCaseInsensitive('Adana', 'ADANA')).toBe(true);
    expect(equalsCaseInsensitive('bursa', 'Bursa')).toBe(true);
  });

  it('containsCaseInsensitiveTr içerir', () => {
    expect(containsCaseInsensitiveTr('AWD (Dört Çeker)', 'awd')).toBe(true);
    expect(containsCaseInsensitiveTr('RWD', 'awd')).toBe(false);
  });

  it('compareLocalizedTr tr collation ile sıralar', () => {
    const cities = ['İzmir', 'Çanakkale', 'Ankara', 'Şırnak'];
    expect([...cities].sort(compareLocalizedTr)).toEqual([
      'Ankara',
      'Çanakkale',
      'İzmir',
      'Şırnak',
    ]);
  });
});