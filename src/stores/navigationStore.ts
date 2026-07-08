// AppNavigationStore — iOS AppNavigationStore karşılığı (spec 01 §6.1, spec 03 §5).
//
// TEK-EKRAN STORE-GÜDÜMLÜ SHELL: iOS native bir nav yığını KULLANMAZ. `currentView`
// (AppViewID) hangi ana ekranın gösterileceğini belirler; detay görünümleri (`car(slug)` /
// `blog(slug)`) global `overlay` alanıyla sürülür — bunlar ana içeriğin ÜZERİNE biner, ayrı
// bir stack değildir. Android donanım geri tuşu için `history` tutulur (iOS'ta yok; RN eklentisi).
//
// Bu store veri katmanı alanlarını da (homeData/appSettings/catalogCars/brandLogos) taşır;
// bootstrap orkestrasyonu AppBootstrap (shell) tarafından yürütülür ve bu setter'larla beslenir.
// Saf indirgeyiciler (reduceBack) ayrı export edilir — birim testi için (UI'dan bağımsız).

import { create } from 'zustand';

import { apiClient } from '../api';
import type {
  BlogPost,
  CarSummary,
  HomeResponse,
  MobileAppSettings,
  ShellOverlay,
} from '../models';
import { AppView, type AppViewID } from '../models/navigation';

/** Karşılaştırma listesi üst sınırı (iOS ile birebir). */
export const COMPARE_LIMIT = 3;

export interface NavigationState {
  // ── Navigasyon çekirdeği ──
  currentView: AppViewID;
  overlay: ShellOverlay | null;
  /** Android donanım-geri için görünüm geçmişi (en eski → en yeni). currentView dahil DEĞİL. */
  history: AppViewID[];

  // ── Shell overlay/panel bayrakları ──
  drawerOpen: boolean;
  profilePopoverOpen: boolean;
  searchModalOpen: boolean;
  comparePanelOpen: boolean;
  /** Gelişmiş arama filtreleri açık (bottom tab gizleme kuralı için — spec §5.1). */
  mobileFiltersOpen: boolean;
  /** Galeri tam ekran (bottom tab gizleme kuralı için). */
  galleryExpanded: boolean;
  /** Cold-start auth kapısı reddedildi mi (Ziyaretçi olarak devam et). */
  launchAuthDismissed: boolean;

  // ── Yükleme / hata ──
  pageLoadingMessage: string | null;
  isLoadingShell: boolean;
  shellError: string | null;

  // ── Veri katmanı (bootstrap besler) ──
  homeData: HomeResponse | null;
  appSettings: MobileAppSettings | null;
  catalogCars: CarSummary[];
  brandLogos: Record<string, string>;
  cachedBlogs: BlogPost[];
  resolvedLogoURL: string | null;
  resolvedTagline: string | null;

  // ── Karşılaştırma listesi (max 3) ──
  compareList: CarSummary[];

  // ── Blog arşivi filtreleri ──
  blogCategoryFilter: string;
  blogSearchQuery: string;

  // ── Diğer geçişli durumlar ──
  pendingSearchQuery: string | null;
  selectedBrandName: string | null;

  // ── Aksiyonlar ──
  navigate: (view: AppViewID) => void;
  openCarDetail: (slug: string) => void;
  openBlogDetail: (slug: string) => void;
  closeOverlay: () => void;
  /** Android donanım-geri indirgemesi. true → tükettik; false → uygulamadan çık. */
  handleBack: () => boolean;

  openDrawer: () => void;
  closeDrawer: () => void;
  toggleProfilePopover: () => void;
  closeProfilePopover: () => void;
  openSearchModal: () => void;
  closeSearchModal: () => void;
  openComparePanel: () => void;
  closeComparePanel: () => void;
  setMobileFiltersOpen: (open: boolean) => void;
  setGalleryExpanded: (expanded: boolean) => void;
  dismissLaunchAuth: () => void;

  setPageLoadingMessage: (message: string | null) => void;
  setLoadingShell: (loading: boolean) => void;
  setShellError: (error: string | null) => void;

  // Veri setter'ları (AppBootstrap kullanır)
  applyShellData: (data: Partial<ShellDataFields>) => void;
  setCatalogCars: (cars: CarSummary[]) => void;
  setResolvedLogo: (logoURL: string | null, tagline: string | null) => void;
  /**
   * Ana sayfa pull-to-refresh: home + settings + cars'ı paralel yeniden çeker (AppBootstrap ilk
   * yükleme yolunun bir yansıması). Dayanıklı — her fetch bağımsız değerlendirilir; başarısız
   * olanlar eski veriyi korur. WebHomeScreen RefreshControl bunu çağırır.
   */
  refreshHome: () => Promise<void>;

  // Karşılaştırma
  addToCompare: (car: CarSummary) => void;
  removeFromCompare: (carId: string) => void;
  clearCompare: () => void;
  isInCompare: (carId: string) => boolean;

  // Blog filtreleri
  setBlogCategoryFilter: (filter: string) => void;
  setBlogSearchQuery: (query: string) => void;
  openBlogCategory: (category: string) => void;

  setPendingSearchQuery: (query: string | null) => void;
  setSelectedBrandName: (name: string | null) => void;
}

/** applyShellData ile beslenen veri alanları. */
export interface ShellDataFields {
  homeData: HomeResponse | null;
  appSettings: MobileAppSettings | null;
  catalogCars: CarSummary[];
  brandLogos: Record<string, string>;
  cachedBlogs: BlogPost[];
}

// ── Saf indirgeyiciler (UI'dan bağımsız — birim testi kolay) ──────────────────────

/** Geri-tuşu için minimal shell durumu görünümü. */
export interface BackReducibleState {
  overlay: ShellOverlay | null;
  drawerOpen: boolean;
  profilePopoverOpen: boolean;
  searchModalOpen: boolean;
  comparePanelOpen: boolean;
  mobileFiltersOpen: boolean;
  currentView: AppViewID;
  history: AppViewID[];
}

export interface BackResult {
  /** true → geri tuşu tüketildi (uygulama açık kalır); false → uygulamadan çıkılır. */
  handled: boolean;
  /** Uygulanacak durum değişikliği (yalnızca `handled` true iken anlamlı). */
  patch: Partial<BackReducibleState>;
}

/**
 * Android donanım-geri indirgemesi (saf). Öncelik sırası (spec §5.1'deki katman z-index'iyle
 * uyumlu): en üstteki overlay/drawer/modal/panel önce kapanır; hiçbiri açık değilse görünüm
 * geçmişinde geri gidilir; kök görünümde (history boş) çıkılır.
 *
 * Not: profilePopover geri tuşuna dahil edilmez (iOS'ta rota değişince/dışarı tıklayınca
 * kapanır; Android geri onu da kapatabilir ama kullanıcı akışında baskın değil — basitlik
 * için overlay/drawer katmanlarına odaklanıyoruz; yine de açıksa önce onu kapatırız).
 */
export function reduceBack(state: BackReducibleState): BackResult {
  // 1. En üstteki geçici katmanlar (z-index sırasına göre yukarıdan aşağı).
  if (state.profilePopoverOpen) {
    return { handled: true, patch: { profilePopoverOpen: false } };
  }
  if (state.drawerOpen) {
    return { handled: true, patch: { drawerOpen: false } };
  }
  if (state.mobileFiltersOpen) {
    return { handled: true, patch: { mobileFiltersOpen: false } };
  }
  if (state.searchModalOpen) {
    return { handled: true, patch: { searchModalOpen: false } };
  }
  if (state.comparePanelOpen) {
    return { handled: true, patch: { comparePanelOpen: false } };
  }
  // 2. Detay overlay (car/blog) — ana içeriğe döner.
  if (state.overlay !== null) {
    return { handled: true, patch: { overlay: null } };
  }
  // 3. Görünüm geçmişinde geri git.
  if (state.history.length > 0) {
    const history = state.history.slice();
    const previous = history.pop() as AppViewID;
    return { handled: true, patch: { currentView: previous, history } };
  }
  // 4. Kök görünümde: home değilse home'a dön (bir adım daha), yoksa çık.
  if (state.currentView !== AppView.home) {
    return { handled: true, patch: { currentView: AppView.home } };
  }
  // 5. Kök home + geçmiş yok → uygulamadan çık.
  return { handled: false, patch: {} };
}

/**
 * Karşılaştırmaya ekleme (saf). Zaten varsa değişmez; doluysa (max 3) değişmez. iOS
 * `addToCompare` üst sınıra ulaşınca sessizce yok sayar.
 */
export function reduceAddToCompare(list: CarSummary[], car: CarSummary): CarSummary[] {
  if (list.some((c) => c.id === car.id)) return list;
  if (list.length >= COMPARE_LIMIT) return list;
  return [...list, car];
}

// ── Store ─────────────────────────────────────────────────────────────────────────

export const useNavigationStore = create<NavigationState>((set, get) => ({
  currentView: AppView.home,
  overlay: null,
  history: [],

  drawerOpen: false,
  profilePopoverOpen: false,
  searchModalOpen: false,
  comparePanelOpen: false,
  mobileFiltersOpen: false,
  galleryExpanded: false,
  launchAuthDismissed: false,

  pageLoadingMessage: null,
  isLoadingShell: true,
  shellError: null,

  homeData: null,
  appSettings: null,
  catalogCars: [],
  brandLogos: {},
  cachedBlogs: [],
  resolvedLogoURL: null,
  resolvedTagline: null,

  compareList: [],

  blogCategoryFilter: 'all',
  blogSearchQuery: '',

  pendingSearchQuery: null,
  selectedBrandName: null,

  navigate: (view) => {
    const { currentView, overlay } = get();
    // Overlay açıksa navigate onu kapatır ve ana içeriğe geçer (iOS davranışı).
    // Geçmişe yalnızca gerçekten farklı bir ana görünüme geçerken mevcut görünümü ekleriz.
    if (view === currentView && overlay === null) {
      // Aynı görünüme yeniden basış — yalnızca geçici katmanları kapat.
      set({ drawerOpen: false, profilePopoverOpen: false });
      return;
    }
    set((s) => ({
      currentView: view,
      overlay: null,
      history: overlay === null ? [...s.history, currentView] : s.history,
      drawerOpen: false,
      profilePopoverOpen: false,
    }));
  },

  openCarDetail: (slug) => set({ overlay: { kind: 'car', slug }, drawerOpen: false, profilePopoverOpen: false }),
  openBlogDetail: (slug) => set({ overlay: { kind: 'blog', slug }, drawerOpen: false, profilePopoverOpen: false }),
  closeOverlay: () => set({ overlay: null }),

  handleBack: () => {
    const result = reduceBack(get());
    if (result.handled) {
      set(result.patch as Partial<NavigationState>);
    }
    return result.handled;
  },

  openDrawer: () => set({ drawerOpen: true, profilePopoverOpen: false }),
  closeDrawer: () => set({ drawerOpen: false }),
  toggleProfilePopover: () => set((s) => ({ profilePopoverOpen: !s.profilePopoverOpen })),
  closeProfilePopover: () => set({ profilePopoverOpen: false }),
  openSearchModal: () => set({ searchModalOpen: true, drawerOpen: false }),
  closeSearchModal: () => set({ searchModalOpen: false }),
  openComparePanel: () => set({ comparePanelOpen: true }),
  closeComparePanel: () => set({ comparePanelOpen: false }),
  setMobileFiltersOpen: (open) => set({ mobileFiltersOpen: open }),
  setGalleryExpanded: (expanded) => set({ galleryExpanded: expanded }),
  dismissLaunchAuth: () => set({ launchAuthDismissed: true }),

  setPageLoadingMessage: (message) => set({ pageLoadingMessage: message }),
  setLoadingShell: (loading) => set({ isLoadingShell: loading }),
  setShellError: (error) => set({ shellError: error }),

  applyShellData: (data) => set((s) => ({ ...s, ...data })),
  setCatalogCars: (cars) => set({ catalogCars: cars }),
  setResolvedLogo: (logoURL, tagline) =>
    set({ resolvedLogoURL: logoURL, resolvedTagline: tagline }),

  refreshHome: async () => {
    const [home, settings, cars] = await Promise.allSettled([
      apiClient.fetchHome(),
      apiClient.fetchSettings(),
      apiClient.fetchCars(true),
    ]);

    const current = get();
    const patch: Partial<ShellDataFields> = {};
    if (home.status === 'fulfilled') {
      const h = home.value;
      patch.homeData = h;
      if (h.settings) patch.appSettings = h.settings;
      if (h.brandLogos) patch.brandLogos = h.brandLogos;
      if (h.latestBlogs.length > 0) patch.cachedBlogs = h.latestBlogs;
      // Katalog boşsa home öne çıkanlarıyla tohumla (AppBootstrap paritesi).
      if (current.catalogCars.length === 0 && h.featuredCars.length > 0) {
        patch.catalogCars = h.featuredCars;
      }
    }
    // Ayrı settings/cars fetch'leri home'un üzerine yazar (daha eksiksiz kaynaklar).
    if (settings.status === 'fulfilled') patch.appSettings = settings.value;
    if (cars.status === 'fulfilled' && cars.value.length > 0) patch.catalogCars = cars.value;

    // Hiçbir alan başarılı çözülmediyse dokunma (eski veri korunur).
    if (Object.keys(patch).length > 0) get().applyShellData(patch);
  },

  addToCompare: (car) => set((s) => ({ compareList: reduceAddToCompare(s.compareList, car) })),
  removeFromCompare: (carId) =>
    set((s) => ({ compareList: s.compareList.filter((c) => c.id !== carId) })),
  clearCompare: () => set({ compareList: [] }),
  isInCompare: (carId) => get().compareList.some((c) => c.id === carId),

  setBlogCategoryFilter: (filter) => set({ blogCategoryFilter: filter }),
  setBlogSearchQuery: (query) => set({ blogSearchQuery: query }),
  openBlogCategory: (category) =>
    set({ currentView: AppView.blog, overlay: null, blogCategoryFilter: category }),

  setPendingSearchQuery: (query) => set({ pendingSearchQuery: query }),
  setSelectedBrandName: (name) => set({ selectedBrandName: name }),
}));
