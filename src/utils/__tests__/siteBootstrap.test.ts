import { describe, it, expect } from '@jest/globals';
import {
  NavigationDefaults,
  NavIconHelper,
  PopularDuelsBuilder,
  SiteDataEnricher,
} from '../siteBootstrap';
import type { CarSummary } from '../../models/car';
import { makeCar } from '../__fixtures__/cars';

describe('NavigationDefaults', () => {
  it('fallback nav payload birebir', () => {
    const nav = NavigationDefaults.navigation;
    expect(nav.primary.map((i) => i.id)).toEqual(['home', 'search', 'compare', 'blog']);
    expect(nav.secondary[0]).toMatchObject({
      id: 'stations',
      label: 'Şarj İstasyonları',
      icon: 'zap',
      badge: 'Harita & Tarifeler',
    });
    expect(nav.rankedGuides.map((i) => i.id)).toEqual([
      'best-cars',
      'longest-range',
      'lowest-consumption',
      'trunk',
    ]);
  });
});

describe('NavIconHelper', () => {
  it('systemName SF Symbol eşlemesi', () => {
    expect(NavIconHelper.systemName('home')).toBe('house.fill');
    expect(NavIconHelper.systemName('lira')).toBe('turkishlirasign.circle.fill');
    expect(NavIconHelper.systemName('bilinmeyen')).toBe('chevron.right');
  });

  it('lucideName RN eşlemesi', () => {
    expect(NavIconHelper.lucideName('compare')).toBe('arrow-left-right');
    expect(NavIconHelper.lucideName('blog')).toBe('newspaper');
  });
});

describe('SiteDataEnricher.buildBodyTypeCounts', () => {
  it('boş olmayan kasa tiplerini sayar, azalan sıralar', () => {
    const cars: CarSummary[] = [
      makeCar({ id: '1', bodyType: 'SUV' }),
      makeCar({ id: '2', bodyType: 'SUV' }),
      makeCar({ id: '3', bodyType: 'Sedan' }),
      makeCar({ id: '4', bodyType: '' }),
    ];
    expect(SiteDataEnricher.buildBodyTypeCounts(cars)).toEqual([
      { type: 'SUV', count: 2 },
      { type: 'Sedan', count: 1 },
    ]);
  });

  it('mevcut (existing) varsa aynen döner', () => {
    const existing = [{ type: 'X', count: 9 }];
    expect(SiteDataEnricher.buildBodyTypeCounts([], existing)).toBe(existing);
  });
});

describe('SiteDataEnricher.buildSpotlightCards', () => {
  it('varsayılan 3 kart + rozet override (menzil/kWh)', () => {
    const cars: CarSummary[] = [
      makeCar({ id: 'porsche-taycan', rangeKm: 700 }),
      makeCar({ id: 'togg-t10x-4more', batteryKwh: 88.5 }),
      makeCar({ id: 'byd-seal' }),
    ];
    const cards = SiteDataEnricher.buildSpotlightCards(cars);
    expect(cards).toHaveLength(3);
    expect(cards[0]).toMatchObject({ label: 'Menzil Şampiyonu', badge: '700 km', tone: 'emerald' });
    expect(cards[1]).toMatchObject({ label: 'Milli Gurur — En Popüler', badge: '88.5 kWh' });
    expect(cards[2]).toMatchObject({ label: '%10 ÖTV Güvenceli', badge: '%10 ÖTV' });
  });

  it('mevcut varsa aynen döner', () => {
    const existing = [{ label: 'x', badge: 'y', tone: 'z', car: makeCar({ id: 'q' }) }];
    expect(SiteDataEnricher.buildSpotlightCards([], existing)).toBe(existing);
  });
});

describe('PopularDuelsBuilder.build', () => {
  it('aynı kasa tipinde komşu çiftler kurar', () => {
    const cars: CarSummary[] = [
      makeCar({ id: 's1', brand: 'Tesla', bodyType: 'SUV', popularity: 90 }),
      makeCar({ id: 's2', brand: 'Togg', bodyType: 'SUV', popularity: 80 }),
      makeCar({ id: 'd1', brand: 'BYD', bodyType: 'Sedan', popularity: 100 }),
      makeCar({ id: 'd2', brand: 'Porsche', bodyType: 'Sedan', popularity: 70 }),
    ];
    const duels = PopularDuelsBuilder.build(cars);
    expect(duels).toHaveLength(2);
    expect(duels[0]).toMatchObject({
      id: 'duel-s1-s2',
      title: 'Tesla vs Togg',
      matchReason: 'Aynı kasa tipi',
      tag: 'En Sık Karşılaştırılanlar',
    });
    expect(duels[1]).toMatchObject({ id: 'duel-d1-d2', title: 'BYD vs Porsche' });
  });

  it('2 araçtan az → boş', () => {
    expect(PopularDuelsBuilder.build([makeCar({ id: 'x' })])).toEqual([]);
  });
});

describe('SiteDataEnricher window.otomenzilData ayrıştırıcıları', () => {
  const html =
    'x window.otomenzilData = {"themeSettings":{"general_logo_url":"http://cdn.x/logo.png","general_tagline":"Elektrikli araç rehberi"}}; y';

  it('parseLogoURL http→https', () => {
    expect(SiteDataEnricher.parseLogoURL(html)).toBe('https://cdn.x/logo.png');
  });

  it('parseTagline', () => {
    expect(SiteDataEnricher.parseTagline(html)).toBe('Elektrikli araç rehberi');
  });

  it('eşleşme yoksa null', () => {
    expect(SiteDataEnricher.parseLogoURL('boş')).toBeNull();
    expect(SiteDataEnricher.parseTagline('boş')).toBeNull();
  });
});