// Reklam alanı modelleri — AdSlotModels.swift birebir.

export interface AdSlotConfig {
  mode?: string;
  image?: string;
  code?: string;
  link?: string;
  adsenseSlot?: string;
}

/** settings.adSlots anahtarları (AdSlotKey raw değerleri). */
export type AdSlotKey = 'home_top' | 'home_mid' | 'search_top' | 'detail_top' | 'detail_sidebar';

export const adSlotKeys: AdSlotKey[] = [
  'home_top',
  'home_mid',
  'search_top',
  'detail_top',
  'detail_sidebar',
];

export type AdSlotLayout = 'banner' | 'sidebar';

export interface AdSlotPlaceholder {
  badge: string;
  title: string;
  cta: string;
  layout: AdSlotLayout;
}

/**
 * Config yokken gösterilecek sabit Türkçe placeholder metinleri + yerleşim
 * (AdSlotModels.swift `placeholder` birebir).
 */
export const adSlotPlaceholders: Record<AdSlotKey, AdSlotPlaceholder> = {
  home_top: {
    badge: 'SPONSOR ALANI',
    title: 'OTOMENZİL ANA SAYFA PREMIUM GÖRSEL REKLAM BANNER YERLEŞİMİ (970x90)',
    cta: 'Reklam ve Sponsorluk Alımı İçin İletişime Geçin →',
    layout: 'banner',
  },
  home_mid: {
    badge: 'MARKA ORTAKLIĞI',
    title: 'ELEKTRİKLİ ŞARJ İSTASYONU VE ENERJİ SPONSORLUĞU BANNERI (728x90)',
    cta: 'Sponsorluk Detaylarını İnceleyin →',
    layout: 'banner',
  },
  search_top: {
    badge: 'SPONSOR REKLAM',
    title: 'OTOMENZİL KATALOG ARŞİV ENTEGRE REKLAM ALANI (970x90)',
    cta: 'Burada Yer Alın →',
    layout: 'banner',
  },
  detail_top: {
    badge: 'SPONSORLU ALAN',
    title: 'OTOMENZİL KAMPANYA REKLAM BANNER ALANI (728x90)',
    cta: 'Reklam Vermek İçin Tıklayın →',
    layout: 'banner',
  },
  detail_sidebar: {
    badge: 'REKLAM',
    title: '300x250 GENİŞ SPONSOR VE GÖRSEL BANNER ALANI',
    cta: 'Tanıtım & Sponsorluk Başvurusu',
    layout: 'sidebar',
  },
};
