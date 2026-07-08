// Shell / ana sayfa modelleri — ShellModels.swift (+ CarTechSpecBuilder spec tipleri) birebir.

import type { CarSummary } from './car';
import type { BlogPost } from './blog';
import type { AdSlotConfig } from './adSlots';

export interface NavItem {
  id: string;
  label: string;
  title?: string;
  icon?: string;
  badge?: string;
}

export interface NavigationPayload {
  primary: NavItem[];
  secondary: NavItem[];
  heroQuickLinks: NavItem[];
  rankedGuides: NavItem[];
}

/** Karşılaştırma spec şeması — settings JSON'unun parçası (CarTechSpecBuilder.swift). */
export interface ComparisonSpecDefinition {
  label: string;
  key: string;
  unit?: string;
}

export interface ComparisonSpecCategory {
  categoryName: string;
  specs: ComparisonSpecDefinition[];
}

export interface FilterOptions {
  brands?: string[];
  bodyTypes?: string[];
  driveTypes?: string[];
  segments?: string[];
}

/** MobileAppSettings — tüm alanlar opsiyonel. */
export interface MobileAppSettings {
  siteName?: string;
  siteUrl?: string;
  generalSiteName?: string;
  generalTagline?: string;
  generalLogoUrl?: string;
  generalLogoDarkUrl?: string;
  themePrimaryColor?: string;
  headerBarTagline?: string;
  headerUpdateLabel?: string;
  homeHeroTitle?: string;
  homeHeroSubtitle?: string;
  homeFeaturedCarsTitle?: string;
  carPriceMin?: number;
  carPriceMax?: number;
  carArchiveTitle?: string;
  carArchiveSubtitle?: string;
  carDefaultSort?: string;
  mobileShowBlog?: boolean;
  mobileShowStations?: boolean;
  navigation?: NavigationPayload;
  brandLogos?: Record<string, string>;
  filterOptions?: FilterOptions;
  ajaxNonce?: string; // AuthStore için tohum nonce
  stationsSyncMessage?: string;
  googleClientId?: string;
  comparisonSpecSchema?: ComparisonSpecCategory[];
  adSlots?: Record<string, AdSlotConfig>;
  adsensePublisherId?: string;
  brandPriceListUrls?: Record<string, string>;
}

export interface SpotlightCard {
  label: string;
  badge: string;
  tone: string;
  car: CarSummary;
}

export interface BodyTypeCount {
  type: string;
  count: number;
}

export interface CompareDuelCar {
  id: string;
  name: string;
  brand: string;
  rangeKm?: number;
  priceTL?: number;
}

export interface CompareDuel {
  id: string;
  title: string;
  tag?: string;
  matchReason: string;
  car1: CompareDuelCar;
  car2: CompareDuelCar;
}

export interface BrandsResponse {
  brandLogos: Record<string, string>;
}

export interface BlogCategoryArchive {
  name: string;
  slug: string;
  description: string;
  emoji: string;
  count: number;
}

export interface HomeResponse {
  settings?: MobileAppSettings;
  spotlightCards?: SpotlightCard[];
  featuredCars: CarSummary[];
  featuredCarsTitle?: string;
  latestBlogs: BlogPost[];
  blogCategories?: Record<string, BlogCategoryArchive>;
  brandLogos?: Record<string, string>;
  bodyTypeCounts?: BodyTypeCount[];
  popularDuels?: CompareDuel[];
  filterOptions?: FilterOptions;
  brandPriceListUrls?: Record<string, string>;
}
