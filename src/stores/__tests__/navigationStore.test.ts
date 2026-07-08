import { describe, it, expect } from '@jest/globals';

import type { CarSummary } from '../../models';
import { makeCar } from '../../utils/__fixtures__/cars';
import {
  COMPARE_LIMIT,
  reduceAddToCompare,
  reduceBack,
  type BackReducibleState,
} from '../navigationStore';

function baseState(overrides: Partial<BackReducibleState> = {}): BackReducibleState {
  return {
    overlay: null,
    drawerOpen: false,
    profilePopoverOpen: false,
    searchModalOpen: false,
    comparePanelOpen: false,
    mobileFiltersOpen: false,
    currentView: 'home',
    history: [],
    ...overrides,
  };
}

describe('reduceBack — katman öncelik sırası', () => {
  it('profil popover en üstte önce kapanır', () => {
    const result = reduceBack(baseState({ profilePopoverOpen: true, drawerOpen: true }));
    expect(result.handled).toBe(true);
    expect(result.patch).toEqual({ profilePopoverOpen: false });
  });

  it('drawer, arama modalından önce kapanır', () => {
    const result = reduceBack(baseState({ drawerOpen: true, searchModalOpen: true }));
    expect(result.patch).toEqual({ drawerOpen: false });
  });

  it('mobil filtreler arama modalından önce kapanır', () => {
    const result = reduceBack(baseState({ mobileFiltersOpen: true, searchModalOpen: true }));
    expect(result.patch).toEqual({ mobileFiltersOpen: false });
  });

  it('arama modalı karşılaştırma panelinden önce kapanır', () => {
    const result = reduceBack(baseState({ searchModalOpen: true, comparePanelOpen: true }));
    expect(result.patch).toEqual({ searchModalOpen: false });
  });

  it('karşılaştırma paneli overlay öncesinde kapanır', () => {
    const result = reduceBack(
      baseState({ comparePanelOpen: true, overlay: { kind: 'car', slug: 'x' } })
    );
    expect(result.patch).toEqual({ comparePanelOpen: false });
  });

  it('detay overlay ana içeriğe döner', () => {
    const result = reduceBack(baseState({ overlay: { kind: 'blog', slug: 'y' } }));
    expect(result.patch).toEqual({ overlay: null });
  });

  it('geçmişte geri gider (son öğeyi pop eder, currentView günceller)', () => {
    const result = reduceBack(
      baseState({ currentView: 'garage', history: ['home', 'search'] })
    );
    expect(result.handled).toBe(true);
    expect(result.patch).toEqual({ currentView: 'search', history: ['home'] });
  });

  it('geçmiş boş + kök home değil → home’a döner', () => {
    const result = reduceBack(baseState({ currentView: 'settings', history: [] }));
    expect(result.patch).toEqual({ currentView: 'home' });
  });

  it('kök home + geçmiş yok → uygulamadan çıkar (handled=false)', () => {
    const result = reduceBack(baseState({ currentView: 'home', history: [] }));
    expect(result.handled).toBe(false);
    expect(result.patch).toEqual({});
  });
});

describe('reduceAddToCompare', () => {
  const a = makeCar({ id: 'a' });
  const b = makeCar({ id: 'b' });
  const c = makeCar({ id: 'c' });
  const d = makeCar({ id: 'd' });

  it('yeni araç ekler', () => {
    expect(reduceAddToCompare([a], b)).toEqual([a, b]);
  });

  it('mevcut aracı yeniden eklemez (aynı referansı döner)', () => {
    const list = [a, b];
    expect(reduceAddToCompare(list, a)).toBe(list);
  });

  it(`üst sınıra (${COMPARE_LIMIT}) ulaşınca sessizce yok sayar`, () => {
    const full: CarSummary[] = [a, b, c];
    expect(reduceAddToCompare(full, d)).toBe(full);
    expect(full).toHaveLength(COMPARE_LIMIT);
  });
});
