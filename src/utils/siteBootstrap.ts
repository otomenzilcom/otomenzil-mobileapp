// Site önyükleme yardımcıları — SiteBootstrap.swift birebir.
// NavigationDefaults (fallback nav payload), NavIconHelper, PopularDuelsBuilder,
// SiteDataEnricher (spotlight/bodyType/duel + window.otomenzilData regex ayrıştırıcıları).

import type { CarSummary } from '../models/car';
import type {
  BodyTypeCount,
  CompareDuel,
  CompareDuelCar,
  NavigationPayload,
  SpotlightCard,
} from '../models/home';

/** Swift CarSummary.displayTitle. */
function displayTitle(car: Pick<CarSummary, 'brand' | 'model'>): string {
  if (car.model.toLowerCase().startsWith(car.brand.toLowerCase())) {
    return car.model;
  }
  return `${car.brand} ${car.model}`;
}

const navigation: NavigationPayload = {
  primary: [
    { id: 'home', label: 'Ana Sayfa', icon: 'home' },
    { id: 'search', label: 'Elektrikli Araçlar', icon: 'car' },
    { id: 'compare', label: 'Karşılaştırma', icon: 'compare' },
    { id: 'blog', label: 'Haber', icon: 'blog' },
  ],
  secondary: [
    { id: 'stations', label: 'Şarj İstasyonları', icon: 'zap', badge: 'Harita & Tarifeler' },
    { id: 'brands', label: 'Elektrikli Araç Markaları', icon: 'globe', badge: 'Tüm Liste' },
    { id: 'consumption', label: 'Menzil Hesaplama', icon: 'zap', badge: 'Hesaplama' },
    {
      id: 'trunk',
      label: 'Bagaj Hacmi En Geniş Elektrikli Araçlar',
      icon: 'layers',
      badge: 'Sıralama',
    },
    { id: 'otv', label: 'Elektrikli Araçlar ÖTV Muafiyeti', icon: 'landmark', badge: '2026 Limit' },
    { id: 'mtv', label: 'Elektrikli Araç MTV Hesaplama', icon: 'lira', badge: '2026 MTV' },
    { id: 'vehicle-loan', label: 'Elektrikli Araç Taşıt Kredisi', icon: 'landmark', badge: 'BDDK' },
  ],
  heroQuickLinks: [
    { id: 'mtv', label: 'Vergi', title: 'Elektrikli Araç MTV Hesaplama', icon: 'lira' },
    { id: 'otv', label: 'Mevzuat', title: 'Elektrikli Araçlar ÖTV Muafiyeti', icon: 'landmark' },
    { id: 'vehicle-loan', label: 'Finans', title: 'Elektrikli Araç Taşıt Kredisi', icon: 'calculator' },
    { id: 'compare', label: 'Analiz', title: 'Elektrikli Araç Karşılaştırma', icon: 'compare' },
    { id: 'stations', label: 'Şarj', title: 'Harita & Tarifeler', icon: 'zap' },
  ],
  rankedGuides: [
    { id: 'best-cars', label: 'Rehber', title: 'En İyi Elektrikli Araçlar', icon: 'trophy' },
    {
      id: 'longest-range',
      label: 'Menzil',
      title: 'En Uzun Menzilli Elektrikli Araçlar',
      icon: 'battery',
    },
    {
      id: 'lowest-consumption',
      label: 'Verim',
      title: 'En Az Yakan Elektrikli Araçlar',
      icon: 'gauge',
    },
    {
      id: 'trunk',
      label: 'Bagaj',
      title: 'Bagaj Hacmi En Geniş Elektrikli Araçlar',
      icon: 'layers',
    },
  ],
};

export const NavigationDefaults = { navigation };

/** Swift NavIconHelper.systemName — web ikon token → SF Symbol (birebir referans). */
function systemName(icon?: string): string {
  switch (icon) {
    case 'home':
      return 'house.fill';
    case 'car':
      return 'car.fill';
    case 'compare':
      return 'arrow.left.arrow.right';
    case 'blog':
      return 'book.fill';
    case 'zap':
      return 'bolt.fill';
    case 'globe':
      return 'globe';
    case 'layers':
      return 'square.stack.3d.up.fill';
    case 'landmark':
      return 'building.columns.fill';
    case 'lira':
      return 'turkishlirasign.circle.fill';
    case 'calculator':
      return 'function';
    case 'trophy':
      return 'trophy.fill';
    case 'battery':
      return 'battery.100';
    case 'gauge':
      return 'gauge.with.dots.needle.67percent';
    default:
      return 'chevron.right';
  }
}

/** RN karşılığı — web ikon token → lucide-react-native adı (analiz §2.15). */
function lucideName(icon?: string): string {
  switch (icon) {
    case 'home':
      return 'home';
    case 'car':
      return 'car';
    case 'compare':
      return 'arrow-left-right';
    case 'blog':
      return 'newspaper';
    case 'zap':
      return 'zap';
    case 'globe':
      return 'globe';
    case 'layers':
      return 'layers';
    case 'landmark':
    case 'lira':
      return 'landmark';
    case 'calculator':
      return 'calculator';
    case 'trophy':
      return 'trophy';
    case 'battery':
      return 'battery';
    case 'gauge':
      return 'gauge';
    default:
      return 'chevron-right';
  }
}

export const NavIconHelper = { systemName, lucideName };

const duelTags = [
  'En Sık Karşılaştırılanlar',
  'Segment Liderleri',
  'Popüler Seçim',
  'Rakip Modeller',
];

function duelCar(car: CarSummary): CompareDuelCar {
  return {
    id: car.id,
    name: displayTitle(car),
    brand: car.brand,
    rangeKm: car.rangeKm,
    priceTL: car.priceTL,
  };
}

interface DuelCandidate {
  first: CarSummary;
  second: CarSummary;
  score: number;
  reason: string;
}

function buildDuels(cars: CarSummary[], count = 4): CompareDuel[] {
  if (cars.length < 2) return [];

  const candidates: DuelCandidate[] = [];

  const grouped = new Map<string, CarSummary[]>();
  for (const car of cars) {
    const bodyType = car.bodyType ?? '';
    if (bodyType.length === 0) continue;
    const bucket = grouped.get(bodyType);
    if (bucket) bucket.push(car);
    else grouped.set(bodyType, [car]);
  }

  for (const group of grouped.values()) {
    if (group.length < 2) continue;
    const sorted = group.slice().sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
    for (let index = 0; index < Math.min(sorted.length - 1, 3); index++) {
      const first = sorted[index];
      const second = sorted[index + 1];
      const score = (first.popularity ?? 0) + (second.popularity ?? 0);
      candidates.push({ first, second, score, reason: 'Aynı kasa tipi' });
    }
  }

  if (candidates.length === 0) {
    const sorted = cars.slice().sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
    for (let index = 0; index < Math.min(sorted.length - 1, count); index++) {
      candidates.push({
        first: sorted[index],
        second: sorted[index + 1],
        score: sorted[index].popularity ?? 0,
        reason: 'Popüler modeller',
      });
    }
  }

  const seen = new Set<string>();
  const duels: CompareDuel[] = [];

  for (const candidate of candidates.slice().sort((a, b) => b.score - a.score)) {
    const key = [candidate.first.id, candidate.second.id].sort().join('|');
    if (seen.has(key)) continue;
    seen.add(key);

    duels.push({
      id: `duel-${candidate.first.id}-${candidate.second.id}`,
      title: `${candidate.first.brand} vs ${candidate.second.brand}`,
      tag: duelTags[duels.length % duelTags.length],
      matchReason: candidate.reason,
      car1: duelCar(candidate.first),
      car2: duelCar(candidate.second),
    });
    if (duels.length >= count) break;
  }

  return duels;
}

export const PopularDuelsBuilder = { build: buildDuels };

interface SpotlightDefault {
  id: string;
  label: string;
  badge: string;
  tone: string;
}

function buildSpotlightCards(cars: CarSummary[], existing?: SpotlightCard[]): SpotlightCard[] {
  if (existing && existing.length > 0) return existing;

  const index = new Map(cars.map((car) => [car.id, car]));
  const defaults: SpotlightDefault[] = [
    { id: 'porsche-taycan', label: 'Menzil Şampiyonu', badge: '720 km', tone: 'emerald' },
    { id: 'togg-t10x-4more', label: 'Milli Gurur — En Popüler', badge: '88.5 kWh', tone: 'stone' },
    { id: 'byd-seal', label: '%10 ÖTV Güvenceli', badge: '%10 ÖTV', tone: 'rose' },
  ];

  const result: SpotlightCard[] = [];
  for (const item of defaults) {
    const firstToken = item.id.split('-')[0] ?? '';
    const car =
      index.get(item.id) ?? cars.find((c) => c.id.includes(firstToken)) ?? cars[0];
    if (car == null) continue;

    let badge = item.badge;
    if (item.label.includes('Menzil') && car.rangeKm != null) {
      badge = `${car.rangeKm} km`;
    } else if (item.badge.includes('kWh') && car.batteryKwh != null) {
      badge = `${car.batteryKwh.toFixed(1)} kWh`;
    }
    result.push({ label: item.label, badge, tone: item.tone, car });
  }
  return result;
}

function buildBodyTypeCounts(cars: CarSummary[], existing?: BodyTypeCount[]): BodyTypeCount[] {
  if (existing && existing.length > 0) return existing;

  const counts = new Map<string, number>();
  for (const car of cars) {
    const type = car.bodyType;
    if (type == null || type.length === 0) continue;
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }

  return Array.from(counts, ([type, count]) => ({ type, count })).sort(
    (a, b) => b.count - a.count,
  );
}

// Swift `window\.otomenzilData\s*=\s*(\{.*?\});` — dotMatchesLineSeparators YOK ("." satır
// sonu eşlemez); `.*?` tek satırlık minimal eşleşme.
const OTOMENZIL_DATA = /window\.otomenzilData\s*=\s*(\{.*?\});/;

function extractOtomenzilData(html: string): Record<string, unknown> | null {
  const match = html.match(OTOMENZIL_DATA);
  if (!match) return null;
  const matched = match[0];
  const start = matched.indexOf('{');
  const end = matched.lastIndexOf('}');
  if (start < 0 || end < 0 || end < start) return null;
  try {
    const parsed: unknown = JSON.parse(matched.slice(start, end + 1));
    return parsed != null && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function themeSettings(html: string): Record<string, unknown> | null {
  const obj = extractOtomenzilData(html);
  const theme = obj?.['themeSettings'];
  return theme != null && typeof theme === 'object' ? (theme as Record<string, unknown>) : null;
}

function parseLogoURL(html: string): string | null {
  const theme = themeSettings(html);
  const logo = theme?.['general_logo_url'];
  if (typeof logo !== 'string' || logo.length === 0) return null;
  return logo.replace(/http:\/\//g, 'https://');
}

function parseTagline(html: string): string | null {
  const theme = themeSettings(html);
  const tagline = theme?.['general_tagline'];
  if (typeof tagline !== 'string' || tagline.length === 0) return null;
  return tagline;
}

export const SiteDataEnricher = {
  buildSpotlightCards,
  buildBodyTypeCounts,
  parseLogoURL,
  parseTagline,
};
