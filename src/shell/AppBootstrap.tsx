// AppBootstrapView — iOS bootstrap orkestrasyonu (spec 03 §5.1, spec 01 §6.1).
//
// Akış: prefs hidrate → ShellBootstrapCache uygula (first-paint) → GET home → catalog/blog/logo
// seed → cache kaydet → arka plan zenginleştirme (settings/cars/brands/blogs paralel) → auth
// bootstrap (settings.ajaxNonce ile) → campaigns bootstrap + push kaydı. Yükleme sırasında
// AuraLoading gösterir. Cache VEYA home gelene kadar (restored) çocuklar gizlenir; cache varsa
// hemen çizilir, ağ arka planda tazeler.

import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { apiClient } from '../api';
import { registerForPushNotifications, addDevicePushTokenListener } from '../api/push';
import {
  ShellBootstrapCache,
  useAuthStore,
  useCampaignStore,
  useNavigationStore,
  usePreferencesStore,
  type ShellCacheSnapshot,
} from '../stores';
import { httpsUrl } from '../models/decode';
import { AuraLoading } from './AuraLoading';

/** home yanıtından logo/tagline çözer (settings → scraped). */
function resolvedLogoFromHome(snapshot: ShellCacheSnapshot): { logo: string | null; tagline: string | null } {
  const settings = snapshot.settings ?? snapshot.home?.settings;
  const logo = httpsUrl(settings?.generalLogoDarkUrl) ?? httpsUrl(settings?.generalLogoUrl) ?? null;
  const tagline = settings?.generalTagline ?? null;
  return { logo, tagline };
}

export function AppBootstrap({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [ready, setReady] = useState(false);
  const firstActivation = useRef(true);

  useEffect(() => {
    let cancelled = false;

    async function run(): Promise<void> {
      const nav = useNavigationStore.getState();
      // 1. Tercihleri hidrate et (tema).
      await usePreferencesStore.getState().hydrate();

      // 2. Cache'i uygula (first-paint).
      const { snapshot, restored } = await ShellBootstrapCache.load();
      if (restored) {
        applySnapshot(snapshot);
        if (!cancelled) setReady(true);
      }

      // 3. GET home.
      try {
        const home = await apiClient.fetchHome();
        if (cancelled) return;
        const merged: ShellCacheSnapshot = { home, settings: home.settings };
        // Katalog/blog seed (home'dakiler, boşsa).
        if (nav.catalogCars.length === 0 && home.featuredCars.length > 0) {
          merged.cars = home.featuredCars;
        }
        applySnapshot(merged);
        nav.applyShellData({
          homeData: home,
          appSettings: home.settings ?? nav.appSettings,
          brandLogos: home.brandLogos ?? nav.brandLogos,
          cachedBlogs: home.latestBlogs.length > 0 ? home.latestBlogs : nav.cachedBlogs,
        });
        await ShellBootstrapCache.save({ home, settings: home.settings });
        nav.setShellError(null);
        nav.setLoadingShell(false);
        if (!cancelled) setReady(true);
      } catch {
        if (cancelled) return;
        // Cache yoksa hata göster.
        if (!restored) {
          nav.setShellError('Ana sayfa verileri yüklenemedi.');
          nav.setLoadingShell(false);
          setReady(true);
        }
      }

      // 4. Arka plan zenginleştirme (paralel; hatalar yutulur).
      void enrichInBackground();

      // 5. Auth bootstrap (settings.ajaxNonce tohumu).
      const settingsNonce = useNavigationStore.getState().appSettings?.ajaxNonce;
      void useAuthStore.getState().bootstrap(settingsNonce);

      // 6. Kampanya bootstrap + push kaydı.
      void bootstrapCampaigns();
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  // Sahne yeniden etkinleşmesinde: katalog + popup tazele (ilk etkinleşme atlanır).
  useEffect(() => {
    const onChange = (status: AppStateStatus) => {
      if (status !== 'active') return;
      if (firstActivation.current) {
        firstActivation.current = false;
        return;
      }
      void refreshCatalog();
      void useCampaignStore.getState().refreshPopup();
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  if (!ready) {
    return <AuraLoading message="Katalog ve garaj verileri hazırlanıyor…" showBrand />;
  }
  return <>{children}</>;
}

/** Snapshot'ı navigationStore veri alanlarına + çözülmüş logoya uygular. */
function applySnapshot(snapshot: ShellCacheSnapshot): void {
  const nav = useNavigationStore.getState();
  const patch: Parameters<typeof nav.applyShellData>[0] = {};
  if (snapshot.home) {
    patch.homeData = snapshot.home;
    if (snapshot.home.latestBlogs.length > 0) patch.cachedBlogs = snapshot.home.latestBlogs;
    if (snapshot.home.brandLogos) patch.brandLogos = snapshot.home.brandLogos;
  }
  if (snapshot.settings) patch.appSettings = snapshot.settings;
  if (snapshot.cars && snapshot.cars.length > 0) patch.catalogCars = snapshot.cars;
  nav.applyShellData(patch);

  const { logo, tagline } = resolvedLogoFromHome(snapshot);
  if (logo !== null || tagline !== null) nav.setResolvedLogo(logo, tagline);
}

/** settings/cars/brands/blogs paralel çekimi (hatalar yutulur). */
async function enrichInBackground(): Promise<void> {
  const nav = useNavigationStore.getState();
  const [settings, cars, brands, blogs] = await Promise.allSettled([
    apiClient.fetchSettings(),
    apiClient.fetchCars(),
    apiClient.fetchBrandLogos(),
    apiClient.fetchBlogs(),
  ]);

  const patch: Parameters<typeof nav.applyShellData>[0] = {};
  if (settings.status === 'fulfilled') patch.appSettings = settings.value;
  if (cars.status === 'fulfilled' && cars.value.length > 0) patch.catalogCars = cars.value;
  if (brands.status === 'fulfilled') patch.brandLogos = brands.value;
  if (blogs.status === 'fulfilled' && blogs.value.length > 0) patch.cachedBlogs = blogs.value;
  nav.applyShellData(patch);

  // Logo hâlâ yoksa ana sayfa HTML'inden kazı.
  if (nav.resolvedLogoURL === null && patch.appSettings) {
    const logo = httpsUrl(patch.appSettings.generalLogoDarkUrl) ?? httpsUrl(patch.appSettings.generalLogoUrl);
    if (!logo) {
      try {
        const extras = await apiClient.fetchSiteThemeExtras();
        useNavigationStore.getState().setResolvedLogo(extras.logoURL ?? null, extras.tagline ?? null);
      } catch {
        // yut
      }
    }
  }

  // Cache'i güncelle.
  const current = useNavigationStore.getState();
  await ShellBootstrapCache.save({
    home: current.homeData ?? undefined,
    cars: current.catalogCars,
    settings: current.appSettings ?? undefined,
  });

  // Şarj istasyonları tazeleme (Wave 5 EpdkStationsData bunu tüketecek; hatalar yutulur).
  try {
    await apiClient.fetchChargingStations();
  } catch {
    // yut
  }
}

/** Kampanya bootstrap + push token dinleyicisi. */
async function bootstrapCampaigns(): Promise<void> {
  const campaigns = useCampaignStore.getState();
  try {
    const registration = await registerForPushNotifications();
    campaigns.setLatestPushToken(registration.pushToken);
    await campaigns.bootstrap(registration.pushToken);
  } catch {
    // push Expo Go'da etkisiz — yine de popup/notifications çek
    await campaigns.bootstrap('');
  }
  // Token değişiminde kampanya bootstrap yeniden.
  addDevicePushTokenListener((token) => {
    useCampaignStore.getState().setLatestPushToken(token);
    void useCampaignStore.getState().bootstrap(token);
  });
}

/** Katalog tazeleme (300 sn throttle iOS'ta store'daydı; burada basit force). */
async function refreshCatalog(): Promise<void> {
  try {
    const cars = await apiClient.fetchCars();
    if (cars.length > 0) useNavigationStore.getState().setCatalogCars(cars);
  } catch {
    // yut
  }
}
