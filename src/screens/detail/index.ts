// Wave 5b detay ekranları barrel export'u.
//
// - CarDetailView: `.car(slug:)` overlay'i. Prop ALMAZ; useNavigationStore().overlay slug'ını
//   kendisi okur ve verisini çeker. Wave 6 bunu AppShell.DetailOverlaySlot'a takar (overlay.kind
//   === 'car' iken render edilir).
// - CompareScreen / StationsScreen: registry ekranları (prop almaz). Wave 6 registry.SCREENS'te
//   'compare' / 'stations' girdilerini bunlarla değiştirir.
// - GarageHomeSection: WebHomeScreen'e gömülü bölüm (props: onOpenGarage/onLogin). WebHomeScreen
//   bunu doğrudan tüketir.

export { CarDetailView } from './CarDetailView';
export { CompareScreen } from './CompareScreen';
export { StationsScreen } from './StationsScreen';
export { GarageHomeSection } from './GarageHomeSection';
export type { GarageHomeSectionProps } from './GarageHomeSection';

// Saf yardımcılar (Wave 6 / testler için erişilebilir).
export { compareShareURL, copyToClipboard } from './compareShare';
export { cachedCarDetail, cacheCarDetail, clearCarDetailCache } from './carDetailCache';
export { detailFromSummary } from './detailFromSummary';
export {
  computeChargePower,
  chargeEnergyKwh,
  chargeMinutes,
  type ChargeMode,
} from './stationCalcHelpers';
