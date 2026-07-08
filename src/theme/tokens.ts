// AppTheme.swift renk token'larının birebir portu. Değerler iOS kaynağından
// (Theme/AppTheme.swift) ve 04-components-utils-theme.md spec'inden alınmıştır.
// Stone skalası dark modda TERS döner (stone900 dark modda beyaza yakın metin rengi).

export interface ThemeColors {
  // Emerald marka skalası (her iki modda aynı)
  emerald400: string;
  emerald500: string;
  emerald600: string;
  emerald700: string;
  emerald800: string;
  emerald950: string;
  emerald250: string;
  emerald: string; // alias = emerald600

  // Emerald dinamik tonlar
  emerald50: string;
  emerald100: string;

  // Tab bar
  tabBarActiveBackground: string;
  tabBarActiveForeground: string;
  tabBarInactiveForeground: string;
  tabBarSurface: string;
  tabBarBorder: string;
  drawerMutedHeader: string;

  // Yüzeyler / arka planlar
  pageBackground: string;
  detailBackground: string;
  inputBackground: string;
  heroBackground: string;
  cardBackground: string;
  navBackground: string;
  elevatedSurface: string;

  // Kenarlıklar
  border: string;
  borderLight: string;
  subnavBackground: string;

  // Statik yardımcı renkler
  stone950: string;
  red600: string;
  sky500: string;
  amber200: string;
  amber800: string;
  rose500: string;

  // Bilgilendirici tonlar
  sky50: string;
  amber50: string;

  // Tehlike / garaj tonları
  dangerBackground: string;
  dangerBorder: string;
  dangerForeground: string;
  garageTintBackground: string;
  garageTintBorder: string;

  // Ters buton
  inverseButtonBackground: string;
  inverseButtonForeground: string;

  // Hero / galeri / overlay
  heroOverlayFill: string;
  heroOverlayStroke: string;
  galleryControlBackground: string;
  imagePlaceholder: string;
  scrim: string;

  // Stone skalası (dark modda ters)
  stone900: string;
  stone850: string;
  stone800: string;
  stone750: string;
  stone700: string;
  stone650: string;
  stone600: string;
  stone550: string;
  stone500: string;
  stone450: string;
  stone400: string;
  stone300: string;
  stone100: string;
  stone50: string;
}

export const lightColors: ThemeColors = {
  emerald400: '#34D399',
  emerald500: '#16A34A',
  emerald600: '#15803D',
  emerald700: '#166534',
  emerald800: '#065F46',
  emerald950: '#022C22',
  emerald250: '#A7F3D0',
  emerald: '#15803D',

  emerald50: '#ECFDF5',
  emerald100: '#D1FAE5',

  tabBarActiveBackground: '#ECFDF5',
  tabBarActiveForeground: '#15803D',
  tabBarInactiveForeground: '#1C1917',
  tabBarSurface: 'rgba(255,255,255,0.9)',
  tabBarBorder: 'rgba(229,231,235,0.7)',
  drawerMutedHeader: 'rgba(250,250,249,0.5)',

  pageBackground: '#F4F5F7',
  detailBackground: '#F8F9FC',
  inputBackground: '#F8F9FA',
  heroBackground: '#FFFFFF',
  cardBackground: '#FFFFFF',
  navBackground: '#FFFFFF',
  elevatedSurface: '#F1F5F9',

  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  subnavBackground: 'rgba(250,250,249,0.5)',

  stone950: '#0C0A09',
  red600: '#DC2626',
  sky500: '#0EA5E9',
  amber200: '#FDE68A',
  amber800: '#92400E',
  rose500: '#F43F5E',

  sky50: '#F0F9FF',
  amber50: '#FFFBEB',

  dangerBackground: '#FEF2F2',
  dangerBorder: '#FECACA',
  dangerForeground: '#DC2626',
  garageTintBackground: '#FFF1F2',
  garageTintBorder: '#FECDD3',

  inverseButtonBackground: '#0C0A09',
  inverseButtonForeground: '#FFFFFF',

  heroOverlayFill: 'rgba(255,255,255,0.05)',
  heroOverlayStroke: 'rgba(255,255,255,0.1)',
  galleryControlBackground: 'rgba(255,255,255,0.95)',
  imagePlaceholder: '#E7E5E4',
  scrim: 'rgba(12,10,9,0.6)',

  stone900: '#1C1917',
  stone850: '#292524',
  stone800: '#292524',
  stone750: '#44403C',
  stone700: '#44403C',
  stone650: '#57534E',
  stone600: '#57534E',
  stone550: '#78716C',
  stone500: '#78716C',
  stone450: '#A8A29E',
  stone400: '#A8A29E',
  stone300: '#D6D3D1',
  stone100: '#F5F5F4',
  stone50: '#FAFAF9',
};

export const darkColors: ThemeColors = {
  emerald400: '#34D399',
  emerald500: '#16A34A',
  emerald600: '#15803D',
  emerald700: '#166534',
  emerald800: '#065F46',
  emerald950: '#022C22',
  emerald250: '#A7F3D0',
  emerald: '#15803D',

  emerald50: 'rgba(2,44,34,0.4)',
  emerald100: 'rgba(6,95,70,0.55)',

  tabBarActiveBackground: 'rgba(2,44,34,0.4)',
  tabBarActiveForeground: '#34D399',
  tabBarInactiveForeground: '#EEF0F3',
  tabBarSurface: 'rgba(26,29,34,0.9)',
  tabBarBorder: 'rgba(47,53,64,0.8)',
  drawerMutedHeader: 'rgba(34,38,44,0.5)',

  pageBackground: '#0F1114',
  detailBackground: '#0F1114',
  inputBackground: '#22262C',
  heroBackground: '#1A1D22',
  cardBackground: '#1A1D22',
  navBackground: '#1A1D22',
  elevatedSurface: '#22262C',

  border: '#2F3540',
  borderLight: '#252A32',
  subnavBackground: 'rgba(26,29,34,0.95)',

  stone950: '#0C0A09',
  red600: '#DC2626',
  sky500: '#0EA5E9',
  amber200: '#FDE68A',
  amber800: '#92400E',
  rose500: '#F43F5E',

  sky50: 'rgba(12,74,110,0.35)',
  amber50: 'rgba(120,53,15,0.35)',

  dangerBackground: 'rgba(69,10,10,0.45)',
  dangerBorder: '#7F1D1D',
  dangerForeground: '#FCA5A5',
  garageTintBackground: 'rgba(76,5,25,0.35)',
  garageTintBorder: '#881337',

  inverseButtonBackground: '#E7E5E4',
  inverseButtonForeground: '#0C0A09',

  heroOverlayFill: 'rgba(255,255,255,0.08)',
  heroOverlayStroke: 'rgba(255,255,255,0.14)',
  galleryControlBackground: 'rgba(26,29,34,0.96)',
  imagePlaceholder: '#2A3038',
  scrim: 'rgba(0,0,0,0.55)',

  stone900: '#F5F5F4',
  stone850: '#E7E5E4',
  stone800: '#D6D3D1',
  stone750: '#A8A29E',
  stone700: '#D6D3D1',
  stone650: '#A8A29E',
  stone600: '#A8A29E',
  stone550: '#78716C',
  stone500: '#78716C',
  stone450: '#57534E',
  stone400: '#57534E',
  stone300: '#44403C',
  stone100: '#2A3038',
  stone50: '#22262C',
};

/** Köşe yarıçapları — cardRadius/innerRadius/buttonRadius. */
export const radii = {
  card: 24,
  inner: 16,
  button: 12,
} as const;

/**
 * Lineer gradient renk demetleri (leading → trailing).
 * hero: emerald600 → #14B8A6. legalHeroStrip: emerald500 → emerald400 → #2DD4BF.
 */
export const gradients = {
  hero: ['#15803D', '#14B8A6'] as [string, string],
  legalHeroStrip: ['#16A34A', '#34D399', '#2DD4BF'] as [string, string, string],
} as const;

/**
 * Gölge preset'leri (iOS'taki çok hafif kart gölgeleri + toast).
 * RN stil objesi; Android için `elevation` de içerir.
 */
export const shadows = {
  // WebGarageButton overlay: black @ 6%, radius 2, y 1
  small: {
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  // Kart gölgesi: black @ 3–4%, radius 2–8, y 1–3
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  // Toast: black @ 35%, radius 20, y 10
  toast: {
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
} as const;

export type Radii = typeof radii;
export type Gradients = typeof gradients;
export type Shadows = typeof shadows;
