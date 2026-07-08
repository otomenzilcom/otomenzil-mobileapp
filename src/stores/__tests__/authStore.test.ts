import { describe, it, expect } from '@jest/globals';

import { setAuthToken } from '../../api';
import {
  applyGarageOptimistic,
  mergeSession,
  resolveServerFavorites,
  resolveServerGarage,
  type GarageSnapshot,
} from '../authStore';
import { makeCore, makeUser } from '../__fixtures__/session';

describe('mergeSession — spec §5.5 merge kuralları', () => {
  it('gelen boş favori ama yerel dolu → yereli korur', () => {
    const current = makeCore({ favorites: ['car-1', 'car-2'] });
    const merged = mergeSession(current, { user: makeUser(), favorites: [] });
    expect(merged.favorites).toEqual(['car-1', 'car-2']);
  });

  it('gelen dolu favori → gelen kazanır', () => {
    const current = makeCore({ favorites: ['car-1'] });
    const merged = mergeSession(current, { user: makeUser(), favorites: ['car-9'] });
    expect(merged.favorites).toEqual(['car-9']);
  });

  it('favori gelmezse (undefined) yereli korur', () => {
    const current = makeCore({ favorites: ['car-1'] });
    const merged = mergeSession(current, { user: makeUser() });
    expect(merged.favorites).toEqual(['car-1']);
  });

  it('gelen boş garaj ama yerel dolu → yereli korur', () => {
    const current = makeCore({ garageCarIds: ['g-1'], primaryGarageCarId: 'g-1' });
    const merged = mergeSession(current, {
      user: makeUser(),
      garageCarIds: [],
      primaryGarageCarId: '',
    });
    expect(merged.garageCarIds).toEqual(['g-1']);
    expect(merged.primaryGarageCarId).toBe('g-1');
  });

  it('token çözüm sırası: gelen → mevcut → http.ts', () => {
    setAuthToken(null);
    const current = makeCore({ sessionToken: 'local-token' });
    // gelen token yok → mevcut korunur
    expect(mergeSession(current, { user: makeUser() }).sessionToken).toBe('local-token');
    // gelen token varsa gelen kazanır
    expect(
      mergeSession(current, { user: makeUser(), sessionToken: 'fresh' }).sessionToken
    ).toBe('fresh');
    // ne gelen ne mevcut → http.ts authToken
    setAuthToken('http-token');
    expect(mergeSession(makeCore(), { user: makeUser() }).sessionToken).toBe('http-token');
    setAuthToken(null);
  });

  it('boş/whitespace gelen token yok sayılır', () => {
    const current = makeCore({ sessionToken: 'local' });
    expect(mergeSession(current, { user: makeUser(), sessionToken: '   ' }).sessionToken).toBe(
      'local'
    );
  });
});

describe('resolveServerFavorites — spec §5.6', () => {
  it('boş sunucu yankısına güvenme: iyimser doluysa iyimseri koru', () => {
    expect(resolveServerFavorites([], ['car-1'])).toEqual(['car-1']);
  });

  it('dolu sunucu yankısı kazanır', () => {
    expect(resolveServerFavorites(['s-1'], ['car-1'])).toEqual(['s-1']);
  });

  it('ikisi de boşsa boş', () => {
    expect(resolveServerFavorites([], [])).toEqual([]);
  });
});

describe('applyGarageOptimistic — spec §5.7', () => {
  const empty: GarageSnapshot = { garageCarIds: [], primaryGarageCarId: '' };

  it('ilk aracı ekler ve primary yapar', () => {
    expect(applyGarageOptimistic(empty, 'g-1', 'add')).toEqual({
      garageCarIds: ['g-1'],
      primaryGarageCarId: 'g-1',
    });
  });

  it('ikinci aracı ekler, primary değişmez', () => {
    const snapshot: GarageSnapshot = { garageCarIds: ['g-1'], primaryGarageCarId: 'g-1' };
    expect(applyGarageOptimistic(snapshot, 'g-2', 'add')).toEqual({
      garageCarIds: ['g-1', 'g-2'],
      primaryGarageCarId: 'g-1',
    });
  });

  it('zaten garajdaysa değişmez (aynı referans)', () => {
    const snapshot: GarageSnapshot = { garageCarIds: ['g-1'], primaryGarageCarId: 'g-1' };
    expect(applyGarageOptimistic(snapshot, 'g-1', 'add')).toBe(snapshot);
  });

  it('primary aracı çıkarınca ilk kalanı promote eder', () => {
    const snapshot: GarageSnapshot = {
      garageCarIds: ['g-1', 'g-2', 'g-3'],
      primaryGarageCarId: 'g-1',
    };
    expect(applyGarageOptimistic(snapshot, 'g-1', 'remove')).toEqual({
      garageCarIds: ['g-2', 'g-3'],
      primaryGarageCarId: 'g-2',
    });
  });

  it('primary olmayanı çıkarınca primary korunur', () => {
    const snapshot: GarageSnapshot = {
      garageCarIds: ['g-1', 'g-2'],
      primaryGarageCarId: 'g-1',
    };
    expect(applyGarageOptimistic(snapshot, 'g-2', 'remove')).toEqual({
      garageCarIds: ['g-1'],
      primaryGarageCarId: 'g-1',
    });
  });

  it('son aracı çıkarınca primary boşalır', () => {
    const snapshot: GarageSnapshot = { garageCarIds: ['g-1'], primaryGarageCarId: 'g-1' };
    expect(applyGarageOptimistic(snapshot, 'g-1', 'remove')).toEqual({
      garageCarIds: [],
      primaryGarageCarId: '',
    });
  });

  it('garajda olmayanı çıkarmak değişiklik yapmaz', () => {
    const snapshot: GarageSnapshot = { garageCarIds: ['g-1'], primaryGarageCarId: 'g-1' };
    expect(applyGarageOptimistic(snapshot, 'x', 'remove')).toBe(snapshot);
  });
});

describe('resolveServerGarage', () => {
  it('primary yoksa boş string', () => {
    expect(resolveServerGarage({ garageCarIds: ['g-1'] })).toEqual({
      garageCarIds: ['g-1'],
      primaryGarageCarId: '',
    });
  });

  it('sunucu ids/primary tümüyle değiştirir', () => {
    expect(
      resolveServerGarage({ garageCarIds: ['a', 'b'], primaryGarageCarId: 'b' })
    ).toEqual({ garageCarIds: ['a', 'b'], primaryGarageCarId: 'b' });
  });
});
