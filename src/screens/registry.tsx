// Ekran kaydı (registry) — her AppViewID → bir ekran bileşeni eşlemesi.
//
// WAVE 6: Wave 5 ekranları beş barrel'dan (catalog/detail/content/tools/account) gerçek
// bileşenlerle bağlandı. Sözleşme (stabil):
//  - Bileşen prop ALMAZ — tüm durum store'lardan hook'larla okunur
//    (useNavigationStore / useAuthStore / usePreferencesStore).
//  - Ekranlar KENDİ ScrollView'ını sağlar; shell yalnızca navbar/subnav (üst) ve bottom tab
//    (alt) çerçevesini çizer, aradaki alanı ekrana bırakır. Güvenli alan alt boşluğu için
//    shell zaten padding uygular; ekranlar ek alt padding EKLEMEZ.
//  - Navigasyon: başka rotaya geçmek için `useNavigationStore().navigate(id)`; detay açmak için
//    `openCarDetail(slug)` / `openBlogDetail(slug)`. Sayfa yüklenirken
//    `setPageLoadingMessage("…")` global overlay'i gösterir.
//
// Tek bileşenli, çok-modlu ekranlar modu currentView'dan kendileri türetir:
//  - RankedCarsScreen: best-cars / longest-range / lowest-consumption / trunk (iOS parite:
//    .trunk → RankedCarsView; content/TrunkScreen bilinçli olarak BAĞLANMAZ).
//  - LegalPageScreen: about / privacy / cookies / terms.
//
// Detay overlay'leri (car/blog) BURADA değildir — onlar AppShell içinde `overlay` alanına göre
// ayrı çizilir (CarDetailView/BlogDetailView shell overlay yuvasına takılır).

import { type AppViewID } from '../models/navigation';

import { WebHomeScreen, CarSearchScreen, BrandsScreen, RankedCarsScreen } from './catalog';
import { CompareScreen, StationsScreen } from './detail';
import { BlogArchiveScreen } from './content';
import { ConsumptionScreen, MtvScreen, OtvExemptionScreen, VehicleLoanScreen } from './tools';
import {
  ProfileScreen,
  GarageScreen,
  AccountSettingsScreen,
  ContactScreen,
  LegalPageScreen,
} from './account';

/** Ekran bileşeni sözleşmesi — prop almaz (durum store'lardan). */
export type ScreenComponent = React.ComponentType;

/** Her rota için insan-okur başlık (erişilebilirlik + başlık kullanımı için). */
export const SCREEN_TITLES: Record<AppViewID, string> = {
  home: 'Ana Sayfa',
  search: 'Elektrikli Araçlar',
  compare: 'Karşılaştırma',
  blog: 'Haber Merkezi',
  stations: 'Şarj İstasyonları',
  brands: 'Elektrikli Araç Markaları',
  consumption: 'Menzil Hesaplama',
  trunk: 'Bagaj Hacmi Sıralaması',
  otv: 'ÖTV Muafiyeti',
  mtv: 'MTV Hesaplama',
  'vehicle-loan': 'Taşıt Kredisi',
  'best-cars': 'En İyi Elektrikli Araçlar',
  'longest-range': 'En Uzun Menzilli Araçlar',
  'lowest-consumption': 'En Az Tüketen Araçlar',
  profile: 'Profilim',
  garage: 'Garajım',
  settings: 'Ayarlar',
  contact: 'İletişim',
  about: 'Hakkımızda',
  privacy: 'Gizlilik Politikası',
  cookies: 'Çerez Politikası',
  terms: 'Kullanım Koşulları',
};

/**
 * AppViewID → ekran bileşeni. Her girdi prop almayan bir bileşendir (durumu store'lardan okur).
 * Çok-modlu ekranlar (RankedCarsScreen, LegalPageScreen) modu currentView'dan türetir; bu yüzden
 * birden çok rota aynı bileşene işaret eder.
 */
export const SCREENS: Record<AppViewID, ScreenComponent> = {
  home: WebHomeScreen,
  search: CarSearchScreen,
  compare: CompareScreen,
  blog: BlogArchiveScreen,
  stations: StationsScreen,
  brands: BrandsScreen,
  consumption: ConsumptionScreen,
  trunk: RankedCarsScreen,
  otv: OtvExemptionScreen,
  mtv: MtvScreen,
  'vehicle-loan': VehicleLoanScreen,
  'best-cars': RankedCarsScreen,
  'longest-range': RankedCarsScreen,
  'lowest-consumption': RankedCarsScreen,
  profile: ProfileScreen,
  garage: GarageScreen,
  settings: AccountSettingsScreen,
  contact: ContactScreen,
  about: LegalPageScreen,
  privacy: LegalPageScreen,
  cookies: LegalPageScreen,
  terms: LegalPageScreen,
};

/** Verilen rota için ekran bileşenini döndürür (stabil erişim noktası). */
export function screenForView(view: AppViewID): ScreenComponent {
  return SCREENS[view];
}

/**
 * Aktif rotanın ekranını çizer. AppShell bunu `<ScreenHost view={currentView} />` olarak kullanır;
 * böylece render sırasında yeni bir bileşen TİPİ oluşturulmaz (SCREENS girdileri modül-seviyesinde
 * stabildir), yalnızca kayıtlı eleman seçilir.
 */
export function ScreenHost({ view }: { view: AppViewID }): React.JSX.Element {
  const Screen = SCREENS[view];
  return <Screen />;
}
