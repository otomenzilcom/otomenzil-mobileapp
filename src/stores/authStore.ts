// AuthStore — iOS AuthStore karşılığı (spec 01 §5, spec 03 §4).
//
// Oturum (bearer token + user), favoriler ve garaj. Favoriler/garaj İYİMSER güncellenir ve API
// hatasında geri alınır (spec §5.6/§5.7). Nonce yaşam döngüsü (900 sn TTL, settings.ajaxNonce
// tohumu) burada; apiClient nonce'u parametre olarak alır. Oturum expo-secure-store'a kalıcı
// (localAuthSession); cold-start'ta hidrasyon.
//
// SAF İNDİRGEYİCİLER (mergeSession, applyGarageOptimistic, resolveServerFavorites,
// resolveServerGarage) UI'dan bağımsız export edilir — iyimser rollback ve merge kuralları
// birim testlerle doğrulanır.

import { create } from 'zustand';

import { apiClient, setAuthToken, getAuthToken } from '../api';
import type {
  AuthSuccessResponse,
  CarSummary,
  GarageClientPayload,
  UserProfile,
} from '../models';
import { useNavigationStore } from './navigationStore';
import {
  clearAuthSession,
  restoreAuthSession,
  saveAuthSession,
  type RestoredSession,
} from './localAuthSession';

/** Nonce istemci TTL'i — 900 sn (spec §5.2). */
export const NONCE_TTL_MS = 900_000;

// ── Saf indirgeyiciler (spec §5.5 / §5.6 / §5.7) ──────────────────────────────────

/** applySession'a gelen kısmi oturum. */
export interface IncomingSession {
  user: UserProfile;
  favorites?: string[];
  garageCarIds?: string[];
  primaryGarageCarId?: string;
  sessionToken?: string;
}

/** Merge sonrası oturum çekirdeği. */
export interface SessionCore {
  currentUser: UserProfile;
  favorites: string[];
  garageCarIds: string[];
  primaryGarageCarId: string;
  sessionToken: string;
}

/**
 * applySession merge kuralları (spec §5.5, birebir):
 *  - favorites: gelen boş ama yerel doluysa → yereli KORU.
 *  - garageCarIds: gelen boş ama yerel doluysa → yereli koru.
 *  - primaryGarageCarId: aynı kural.
 *  - token çözüm sırası: gelen token → mevcut sessionToken → http.ts authToken.
 */
export function mergeSession(current: SessionCore, incoming: IncomingSession): SessionCore {
  const favorites =
    incoming.favorites && incoming.favorites.length > 0
      ? incoming.favorites
      : incoming.favorites !== undefined && current.favorites.length > 0
        ? current.favorites
        : (incoming.favorites ?? current.favorites);

  const incomingGarage = incoming.garageCarIds;
  const garageCarIds =
    incomingGarage === undefined
      ? current.garageCarIds
      : incomingGarage.length === 0 && current.garageCarIds.length > 0
        ? current.garageCarIds
        : incomingGarage;

  const incomingPrimary = incoming.primaryGarageCarId;
  const primaryGarageCarId =
    incomingPrimary === undefined
      ? current.primaryGarageCarId
      : incomingPrimary.length === 0 && current.primaryGarageCarId.length > 0
        ? current.primaryGarageCarId
        : incomingPrimary;

  const resolvedToken =
    (incoming.sessionToken && incoming.sessionToken.trim().length > 0
      ? incoming.sessionToken.trim()
      : undefined) ??
    (current.sessionToken.length > 0 ? current.sessionToken : undefined) ??
    (getAuthToken() ?? '');

  return {
    currentUser: incoming.user,
    favorites,
    garageCarIds,
    primaryGarageCarId,
    sessionToken: resolvedToken,
  };
}

/**
 * Sunucu favori yankısını çöz (spec §5.6): beklenmedik boş yankıya güvenme —
 * `saved boş && optimistic dolu ? optimistic : saved`.
 */
export function resolveServerFavorites(saved: string[], optimistic: string[]): string[] {
  return saved.length === 0 && optimistic.length > 0 ? optimistic : saved;
}

export interface GarageSnapshot {
  garageCarIds: string[];
  primaryGarageCarId: string;
}

/**
 * Garaj iyimser güncellemesi (spec §5.7). add: yoksa ekle, ilk araç/primary boşsa primary yap.
 * remove: çıkar, primary ise ilk kalanı (veya "") promote et. Zaten uygun durumdaysa aynı döner.
 */
export function applyGarageOptimistic(
  snapshot: GarageSnapshot,
  carId: string,
  action: 'add' | 'remove'
): GarageSnapshot {
  if (action === 'add') {
    if (snapshot.garageCarIds.includes(carId)) return snapshot;
    const garageCarIds = [...snapshot.garageCarIds, carId];
    const primaryGarageCarId =
      snapshot.primaryGarageCarId.length === 0 ? carId : snapshot.primaryGarageCarId;
    return { garageCarIds, primaryGarageCarId };
  }
  // remove
  if (!snapshot.garageCarIds.includes(carId)) return snapshot;
  const garageCarIds = snapshot.garageCarIds.filter((id) => id !== carId);
  let primaryGarageCarId = snapshot.primaryGarageCarId;
  if (primaryGarageCarId === carId) {
    primaryGarageCarId = garageCarIds[0] ?? '';
  }
  return { garageCarIds, primaryGarageCarId };
}

/** Sunucu GarageClientPayload'ı çöz: ids/primary tümüyle değiştirir (§5.7 son madde). */
export function resolveServerGarage(payload: GarageClientPayload): GarageSnapshot {
  return {
    garageCarIds: payload.garageCarIds,
    primaryGarageCarId: payload.primaryGarageCarId ?? '',
  };
}

// ── Store ─────────────────────────────────────────────────────────────────────────

interface AuthState {
  // Oturum
  currentUser: UserProfile | null;
  favorites: string[];
  garageCarIds: string[];
  primaryGarageCarId: string;
  garageCarSummaries: Record<string, CarSummary>;
  busyGarageCarIds: string[];
  sessionToken: string;

  // Modal / onboarding / geri bildirim
  showModal: boolean;
  authMessage: string | null;
  isSubmitting: boolean;
  lastError: string | null;
  showSuccess: boolean;
  pendingGarageOnboarding: boolean;
  pendingUsernameSetup: boolean;
  logoutToastMessage: string | null;
  favoriteToastMessage: string | null;

  // Nonce (özel yaşam döngüsü)
  nonce: string | null;
  nonceFetchedAt: number;

  get isLoggedIn(): boolean;

  // Bootstrap / hidrasyon
  hydrate: () => Promise<void>;
  bootstrap: (nonceFromSettings?: string) => Promise<void>;

  // Modal
  openAuth: (message?: string) => void;
  closeAuth: () => void;
  clearError: () => void;

  // Nonce
  currentNonce: () => Promise<string>;
  fetchFreshNonce: () => Promise<string | null>;

  // Auth akışları
  login: (email: string, password: string) => Promise<boolean>;
  register: (
    fullName: string,
    email: string,
    password: string,
    memberSlug: string
  ) => Promise<boolean>;
  googleLogin: (credential: string) => Promise<boolean>;
  completeUsernameSetup: (user: UserProfile) => void;
  forgotPassword: (email: string) => Promise<string | null>;
  updateProfile: (params: {
    username: string;
    email: string;
    currentPassword: string;
    newPassword: string;
    avatarColor: string;
  }) => Promise<string | null>;
  logout: () => Promise<void>;

  // Favoriler / garaj
  isFavorite: (carId: string) => boolean;
  isInGarage: (carId: string) => boolean;
  toggleFavorite: (carId: string) => Promise<void>;
  toggleGarageCar: (carId: string, catalog?: CarSummary[]) => Promise<void>;
  setPrimaryGarageCar: (carId: string) => Promise<void>;

  clearToasts: () => void;
}

/** Store'un oturum çekirdeğini SessionCore görünümüne indirger. */
function coreFrom(s: {
  currentUser: UserProfile | null;
  favorites: string[];
  garageCarIds: string[];
  primaryGarageCarId: string;
  sessionToken: string;
}): SessionCore {
  return {
    currentUser: s.currentUser ?? { username: 'Üye', email: '' },
    favorites: s.favorites,
    garageCarIds: s.garageCarIds,
    primaryGarageCarId: s.primaryGarageCarId,
    sessionToken: s.sessionToken,
  };
}

export const useAuthStore = create<AuthState>((set, get) => {
  /** Oturumu uygula + kalıcılaştır (iOS applySession + persistSession). */
  function applySession(incoming: IncomingSession, garageCars?: CarSummary[]): void {
    const merged = mergeSession(coreFrom(get()), incoming);
    const summaries = { ...get().garageCarSummaries };
    if (garageCars) {
      for (const car of garageCars) summaries[car.id] = car;
    }
    setAuthToken(merged.sessionToken.length > 0 ? merged.sessionToken : null);
    set({
      currentUser: merged.currentUser,
      favorites: merged.favorites,
      garageCarIds: merged.garageCarIds,
      primaryGarageCarId: merged.primaryGarageCarId,
      sessionToken: merged.sessionToken,
      garageCarSummaries: summaries,
    });
    void persist();
  }

  /** Mevcut oturumu güvenli depoya yazar (yalnızca kullanıcı varsa). */
  function persist(): Promise<void> {
    const s = get();
    if (s.currentUser === null) return Promise.resolve();
    const session: RestoredSession = {
      user: s.currentUser,
      favorites: s.favorites,
      garageCarIds: s.garageCarIds,
      primaryGarageCarId: s.primaryGarageCarId,
      sessionToken: s.sessionToken,
    };
    return saveAuthSession(session);
  }

  /** AuthSuccessResponse'un garaj yükünü uygula. */
  function applyAuthPayload(response: AuthSuccessResponse): void {
    applySession(
      {
        user: response.user,
        favorites: response.favorites,
        garageCarIds: response.garageCarIds,
        primaryGarageCarId: response.primaryGarageCarId,
        sessionToken: response.sessionToken,
      },
      response.garageCars
    );
  }

  return {
    currentUser: null,
    favorites: [],
    garageCarIds: [],
    primaryGarageCarId: '',
    garageCarSummaries: {},
    busyGarageCarIds: [],
    sessionToken: '',

    showModal: false,
    authMessage: null,
    isSubmitting: false,
    lastError: null,
    showSuccess: false,
    pendingGarageOnboarding: false,
    pendingUsernameSetup: false,
    logoutToastMessage: null,
    favoriteToastMessage: null,

    nonce: null,
    nonceFetchedAt: 0,

    get isLoggedIn() {
      return get().currentUser !== null;
    },

    hydrate: async () => {
      const restored = await restoreAuthSession();
      if (restored) {
        if (restored.sessionToken.length > 0) setAuthToken(restored.sessionToken);
        set({
          currentUser: restored.user,
          favorites: restored.favorites,
          garageCarIds: restored.garageCarIds,
          primaryGarageCarId: restored.primaryGarageCarId,
          sessionToken: restored.sessionToken,
        });
      }
    },

    bootstrap: async (nonceFromSettings) => {
      // 1. Depolanan oturumu (hidrate edilmemişse) uygula.
      if (get().currentUser === null) {
        await get().hydrate();
      }
      // 2. Settings nonce'unu tohumla.
      if (nonceFromSettings && nonceFromSettings.length > 0 && get().nonce === null) {
        set({ nonce: nonceFromSettings, nonceFetchedAt: Date.now() });
      }
      // 3. Token'ı ayarla.
      const token = get().sessionToken;
      if (token.length > 0 && getAuthToken() === null) setAuthToken(token);
      // 4. Ne user ne token → dur (settings nonce'u korunur).
      if (get().currentUser === null && token.length === 0) return;
      // 5. Nonce yoksa taze çek.
      if (get().nonce === null) await get().fetchFreshNonce();
      // 6. auth/me — user dönerse oturumu uygula (hatalar yutulur).
      try {
        const me = await apiClient.fetchMe();
        if (me.user) {
          applySession(
            {
              user: me.user,
              favorites: me.favorites,
              garageCarIds: me.garageCarIds,
              primaryGarageCarId: me.primaryGarageCarId,
              sessionToken: get().sessionToken,
            },
            me.garageCars
          );
        }
      } catch {
        // cached oturumda kal
      }
    },

    openAuth: (message) => set({ showModal: true, authMessage: message ?? null, lastError: null }),
    closeAuth: () => set({ showModal: false, authMessage: null }),
    clearError: () => set({ lastError: null }),

    fetchFreshNonce: async () => {
      try {
        const nonce = await apiClient.getNonce();
        set({ nonce, nonceFetchedAt: Date.now() });
        return nonce;
      } catch {
        return get().nonce; // önceki nonce'a düş
      }
    },

    currentNonce: async () => {
      const { nonce, nonceFetchedAt } = get();
      if (nonce !== null && Date.now() - nonceFetchedAt < NONCE_TTL_MS) return nonce;
      const fresh = await get().fetchFreshNonce();
      return fresh ?? '';
    },

    login: async (email, password) => {
      set({ isSubmitting: true, lastError: null });
      const nonce = await get().fetchFreshNonce();
      if (nonce === null || nonce.length === 0) {
        set({ isSubmitting: false, lastError: 'Güvenlik anahtarı alınamadı.' });
        return false;
      }
      try {
        const response = await apiClient.login(email, password, nonce);
        applyAuthPayload(response);
        set({ showSuccess: true, isSubmitting: false, showModal: false, authMessage: null });
        setTimeout(() => set({ showSuccess: false }), 350);
        return true;
      } catch (err) {
        set({ isSubmitting: false, lastError: messageFrom(err) });
        return false;
      }
    },

    register: async (fullName, email, password, memberSlug) => {
      set({ isSubmitting: true, lastError: null });
      const nonce = await get().fetchFreshNonce();
      if (nonce === null || nonce.length === 0) {
        set({ isSubmitting: false, lastError: 'Güvenlik anahtarı alınamadı.' });
        return false;
      }
      try {
        const response = await apiClient.register(fullName, email, password, memberSlug, nonce);
        applyAuthPayload(response);
        set({
          showSuccess: true,
          isSubmitting: false,
          showModal: false,
          authMessage: null,
          pendingGarageOnboarding: true,
        });
        setTimeout(() => set({ showSuccess: false }), 350);
        return true;
      } catch (err) {
        set({ isSubmitting: false, lastError: messageFrom(err) });
        return false;
      }
    },

    googleLogin: async (credential) => {
      set({ isSubmitting: true, lastError: null });
      const nonce = await get().fetchFreshNonce();
      if (nonce === null || nonce.length === 0) {
        set({ isSubmitting: false, lastError: 'Güvenlik anahtarı alınamadı.' });
        return false;
      }
      try {
        const response = await apiClient.googleLogin(credential, nonce);
        applyAuthPayload(response);
        const patch: Partial<AuthState> = {
          showSuccess: true,
          isSubmitting: false,
          showModal: false,
          authMessage: null,
        };
        if (response.needsUsernameSetup === true) patch.pendingUsernameSetup = true;
        else if (response.isNewUser === true) patch.pendingGarageOnboarding = true;
        set(patch);
        setTimeout(() => set({ showSuccess: false }), 350);
        return true;
      } catch (err) {
        set({ isSubmitting: false, lastError: messageFrom(err) });
        return false;
      }
    },

    completeUsernameSetup: (user) => {
      applySession({ user, sessionToken: get().sessionToken });
      set({ pendingUsernameSetup: false, pendingGarageOnboarding: true });
    },

    forgotPassword: async (email) => {
      set({ isSubmitting: true, lastError: null });
      const nonce = await get().currentNonce();
      try {
        const message = await apiClient.forgotPassword(email, nonce);
        set({ isSubmitting: false });
        return message;
      } catch (err) {
        set({ isSubmitting: false, lastError: messageFrom(err) });
        return null;
      }
    },

    updateProfile: async (params) => {
      set({ isSubmitting: true, lastError: null });
      const nonce = await get().currentNonce();
      try {
        const response = await apiClient.updateProfile(params, nonce);
        applySession({ user: response.user, sessionToken: get().sessionToken });
        set({ isSubmitting: false });
        return response.message ?? 'Hesap bilgileriniz kaydedildi.';
      } catch (err) {
        set({ isSubmitting: false, lastError: messageFrom(err) });
        return null;
      }
    },

    logout: async () => {
      const nonce = await get().currentNonce();
      try {
        await apiClient.logout(nonce);
      } catch {
        // en iyi çaba
      }
      await clearAuthSession();
      set({
        currentUser: null,
        favorites: [],
        garageCarIds: [],
        primaryGarageCarId: '',
        garageCarSummaries: {},
        busyGarageCarIds: [],
        sessionToken: '',
        pendingGarageOnboarding: false,
        pendingUsernameSetup: false,
        showModal: false,
        logoutToastMessage: 'Çıkış yapıldı',
      });
      const nav = useNavigationStore.getState();
      nav.closeOverlay();
      nav.closeDrawer();
      nav.navigate('home');
    },

    isFavorite: (carId) => get().favorites.includes(carId),
    isInGarage: (carId) => get().garageCarIds.includes(carId),

    toggleFavorite: async (carId) => {
      if (get().currentUser === null) {
        get().openAuth('Favorilere eklemek için giriş yapın.');
        return;
      }
      const wasFavorite = get().favorites.includes(carId);
      const optimistic = wasFavorite
        ? get().favorites.filter((id) => id !== carId)
        : [...get().favorites, carId];
      set({ favorites: optimistic });
      void persist();

      const nonce = await get().currentNonce();
      try {
        const saved = await apiClient.updateFavorites(optimistic, nonce);
        const resolved = resolveServerFavorites(saved, optimistic);
        set({
          favorites: resolved,
          favoriteToastMessage: wasFavorite
            ? 'Favorilerden çıkarıldı.'
            : 'Favorilerinize eklendi.',
        });
        void persist();
      } catch (err) {
        // iyimser değeri koru, hatayı bildir, yine de kalıcılaştır
        set({ lastError: messageFrom(err) });
        void persist();
      }
    },

    toggleGarageCar: async (carId, catalog) => {
      if (get().currentUser === null) {
        get().openAuth('Aracını garajına eklemek için giriş yapın.');
        return;
      }
      if (get().busyGarageCarIds.includes(carId)) return;

      const before: GarageSnapshot = {
        garageCarIds: get().garageCarIds,
        primaryGarageCarId: get().primaryGarageCarId,
      };
      const beforeSummaries = get().garageCarSummaries;
      const isRemove = before.garageCarIds.includes(carId);
      const action: 'add' | 'remove' = isRemove ? 'remove' : 'add';
      const after = applyGarageOptimistic(before, carId, action);

      // Ekleme: özeti katalogdan cache'le.
      const summaries = { ...beforeSummaries };
      if (action === 'add' && catalog) {
        const match = catalog.find((c) => c.id === carId);
        if (match) summaries[carId] = match;
      }

      set({
        garageCarIds: after.garageCarIds,
        primaryGarageCarId: after.primaryGarageCarId,
        garageCarSummaries: summaries,
        busyGarageCarIds: [...get().busyGarageCarIds, carId],
      });
      void persist();

      // Nonce'u tazele (spec §5.7); updateGarage refreshNonce collaborator'ını kullanır, gövdede nonce yok.
      await get().currentNonce();
      try {
        const payload = await apiClient.updateGarage(carId, action, {
          refreshNonce: () => get().fetchFreshNonce(),
        });
        const server = resolveServerGarage(payload);
        const merged = { ...get().garageCarSummaries };
        if (payload.garageCars) for (const c of payload.garageCars) merged[c.id] = c;
        set({
          garageCarIds: server.garageCarIds,
          primaryGarageCarId: server.primaryGarageCarId,
          garageCarSummaries: merged,
        });
        void persist();
      } catch (err) {
        // rollback ids/primary/summaries
        set({
          garageCarIds: before.garageCarIds,
          primaryGarageCarId: before.primaryGarageCarId,
          garageCarSummaries: beforeSummaries,
          lastError: messageFrom(err),
        });
        void persist();
      } finally {
        set({ busyGarageCarIds: get().busyGarageCarIds.filter((id) => id !== carId) });
      }
    },

    setPrimaryGarageCar: async (carId) => {
      if (!get().garageCarIds.includes(carId)) return;
      if (get().busyGarageCarIds.includes(carId)) return;

      const previousPrimary = get().primaryGarageCarId;
      set({
        primaryGarageCarId: carId,
        busyGarageCarIds: [...get().busyGarageCarIds, carId],
      });
      void persist();

      // Nonce'u tazele (spec §5.7); updateGarage refreshNonce collaborator'ını kullanır, gövdede nonce yok.
      await get().currentNonce();
      try {
        const payload = await apiClient.updateGarage(carId, 'setPrimary', {
          refreshNonce: () => get().fetchFreshNonce(),
        });
        const server = resolveServerGarage(payload);
        const merged = { ...get().garageCarSummaries };
        if (payload.garageCars) for (const c of payload.garageCars) merged[c.id] = c;
        set({
          garageCarIds: server.garageCarIds,
          primaryGarageCarId: server.primaryGarageCarId,
          garageCarSummaries: merged,
        });
        void persist();
      } catch (err) {
        set({ primaryGarageCarId: previousPrimary, lastError: messageFrom(err) });
        void persist();
        // GET user/garage ile yeniden senkronla
        try {
          const payload = await apiClient.getGarage();
          const server = resolveServerGarage(payload);
          set({
            garageCarIds: server.garageCarIds,
            primaryGarageCarId: server.primaryGarageCarId,
          });
          void persist();
        } catch {
          // senkron başarısız — mevcut durumda kal
        }
      } finally {
        set({ busyGarageCarIds: get().busyGarageCarIds.filter((id) => id !== carId) });
      }
    },

    clearToasts: () => set({ logoutToastMessage: null, favoriteToastMessage: null }),
  };
});

/** ApiError/Error → kullanıcıya gösterilecek Türkçe mesaj (fallback jenerik). */
function messageFrom(err: unknown): string {
  if (err instanceof Error && err.message.length > 0) return err.message;
  return 'Bir hata oluştu. Lütfen tekrar deneyin.';
}
