// Hesap + auth ekranları barrel'ı (Wave 5d).
//
// Rota ekranları (prop almaz, store'lardan okur) — Wave 6 registry.tsx'te ilgili AppViewID'lere
// bağlar: profile → ProfileScreen, garage → GarageScreen, settings → AccountSettingsScreen,
// contact → ContactScreen, about/privacy/cookies/terms → LegalPageScreen (currentView'a göre kind).
//
// Auth overlay bileşenleri (EXPORT — Wave 6 shell AuthModal/onboarding yer tutucularına takar):
//   - GoogleSignInSheet: props { visible, mode, googleClientId?, onClose } (bkz. dosya başı wiring).
//   - UsernameOnboardingView: prop almaz; authStore.pendingUsernameSetup true iken render.
//   - GarageOnboardingView: prop almaz; authStore.pendingGarageOnboarding true iken render.

// ── Rota ekranları ──
export { ProfileScreen } from './ProfileScreen';
export { GarageScreen } from './GarageScreen';
export { AccountSettingsScreen } from './AccountSettingsScreen';
export { ContactScreen } from './ContactScreen';
export { LegalPageScreen } from './LegalPageScreen';

// ── Auth overlay bileşenleri (Wave 6 shell'e wiring) ──
export { GoogleSignInSheet } from './GoogleSignInSheet';
export type { GoogleSignInSheetProps, GoogleSignInMode } from './GoogleSignInSheet';
export { UsernameOnboardingView } from './UsernameOnboardingView';
export { GarageOnboardingView } from './GarageOnboardingView';

// ── Garaj alt bileşenleri (yeniden kullanım / test görünürlüğü) ──
export { GarageChargeCalculatorCard } from './GarageChargeCalculatorCard';
export type { GarageChargeCalculatorCardProps } from './GarageChargeCalculatorCard';
export { NearbyStationsSection } from './NearbyStationsSection';

// ── Saf mantık (Wave 6 / testler) ──
export {
  normalizeSlug,
  isSlugValid,
  profilePreviewPath,
  profileUrl,
  SLUG_TOO_SHORT_MESSAGE,
  SLUG_TOO_SHORT_MESSAGE_SHORT,
  SLUG_UNAVAILABLE_MESSAGE,
} from './accountSlug';
export type { SlugCheckState } from './accountSlug';
export {
  applyStartChange,
  applyTargetChange,
  gaugeColorForTarget,
} from './garageChargeState';
export type { ChargeLevels } from './garageChargeState';
