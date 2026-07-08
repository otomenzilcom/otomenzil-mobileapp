// Katalog ekranları barrel export'u (Wave 5a).
//
// registry.tsx bu ekranları AppViewID'lere bağlar (Wave 6 orkestratörü):
//   home                → WebHomeScreen
//   search              → CarSearchScreen
//   brands              → BrandsScreen
//   best-cars / longest-range / lowest-consumption / trunk → RankedCarsScreen (mod currentView'dan)
// AdvancedSearchModal shell header'ından açılır (navigationStore.searchModalOpen); rota değildir.

export { WebHomeScreen } from './WebHomeScreen';
export { CarSearchScreen } from './CarSearchScreen';
export { AdvancedSearchModal } from './AdvancedSearchModal';
export { BrandsScreen } from './BrandsScreen';
export { RankedCarsScreen } from './RankedCarsScreen';

// Paylaşılan saf yardımcılar (test + ekran-içi).
export {
  displayTitle,
  heroImageURL,
  priceDisplay,
  rangeDisplay,
  batteryDisplay,
  powerDisplay,
  consumptionDisplay,
  consumptionValue,
  brandOptionValues,
  bodyTypeOptionValues,
  catalogBrands,
  brandLetter,
  brandLetters,
  homeMatchingCount,
  homeHasActiveFilters,
  HOME_PREFILTER_DEFAULTS,
  HOME_PRICE_CEILING,
  MAX_BUDGET_OPTIONS,
  MIN_RANGE_OPTIONS,
} from './shared';
export type { HomePrefilter } from './shared';

export {
  RANKED_CONFIGS,
  CONSUMPTION_SENTINEL,
  consumption,
  metricValue,
  preFilter,
  rank,
  primaryMetric,
  secondaryMetric,
  barPercent,
} from './rankedCars';
export type {
  RankedMode,
  RankedModeConfig,
  TrFilter,
  PriceFilter,
} from './rankedCars';
