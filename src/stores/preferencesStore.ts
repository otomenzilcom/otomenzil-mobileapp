// AppPreferencesStore — iOS AppPreferencesStore karşılığı (spec 01 §6.2).
//
// 5 boolean tercih, her biri kendi UserDefaults anahtarıyla AsyncStorage'a yazılır
// (anahtar adları iOS ile birebir korunur). Her setter yazar-geçer (write-through).
// darkMode değiştiğinde tema store'u (theme/index.ts useThemeStore) da senkronlanır —
// böylece useTheme() abonesi bileşenler yeniden render olur (Wave 1'de planlanan bağlama).
//
// Hidrasyon: hydratePreferences() cold-start'ta AsyncStorage'dan okur; okunana kadar
// varsayılanlar geçerlidir (darkMode=false → light). AppBootstrap bunu bekler.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { useThemeStore } from '../theme/themeStore';

/** UserDefaults anahtarları — iOS ile birebir (migration-free). */
export const PREF_KEYS = {
  pushNotifications: 'otomenzil.pref.pushNotifications',
  verifiedDataOnly: 'otomenzil.pref.verifiedDataOnly',
  analytics: 'otomenzil.pref.analytics',
  compactCards: 'otomenzil.pref.compactCards',
  darkMode: 'otomenzil.pref.darkMode',
} as const;

/** Varsayılanlar (spec §6.2 tablosu). */
const DEFAULTS = {
  pushNotificationsEnabled: true,
  showVerifiedDataOnly: false,
  analyticsEnabled: true,
  compactCatalogCards: false,
  darkMode: false,
} as const;

interface PreferencesState {
  pushNotificationsEnabled: boolean;
  showVerifiedDataOnly: boolean;
  analyticsEnabled: boolean;
  compactCatalogCards: boolean;
  darkMode: boolean;
  hydrated: boolean;

  setPushNotificationsEnabled: (value: boolean) => void;
  setShowVerifiedDataOnly: (value: boolean) => void;
  setAnalyticsEnabled: (value: boolean) => void;
  setCompactCatalogCards: (value: boolean) => void;
  setDarkMode: (value: boolean) => void;
  toggleDarkMode: () => void;
  /** Cold-start hidrasyonu — AsyncStorage'dan okur, temayı senkronlar. */
  hydrate: () => Promise<void>;
}

/** Bir boolean tercihi hemen AsyncStorage'a yazar (en iyi çaba). */
function persist(key: string, value: boolean): void {
  void AsyncStorage.setItem(key, value ? 'true' : 'false').catch(() => {
    // yazma en iyi çaba — hata yutulur
  });
}

/** AsyncStorage'daki "true"/"false" değerini boolean'a çözer; yoksa varsayılan. */
function readBool(raw: string | null, fallback: boolean): boolean {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return fallback;
}

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  ...DEFAULTS,
  hydrated: false,

  setPushNotificationsEnabled: (value) => {
    persist(PREF_KEYS.pushNotifications, value);
    set({ pushNotificationsEnabled: value });
  },
  setShowVerifiedDataOnly: (value) => {
    persist(PREF_KEYS.verifiedDataOnly, value);
    set({ showVerifiedDataOnly: value });
  },
  setAnalyticsEnabled: (value) => {
    persist(PREF_KEYS.analytics, value);
    set({ analyticsEnabled: value });
  },
  setCompactCatalogCards: (value) => {
    persist(PREF_KEYS.compactCards, value);
    set({ compactCatalogCards: value });
  },
  setDarkMode: (value) => {
    persist(PREF_KEYS.darkMode, value);
    set({ darkMode: value });
    // Tema store'unu senkronla — useTheme() aboneleri yeniden render olur (spec §6.2 son madde).
    useThemeStore.getState().setDark(value);
  },
  toggleDarkMode: () => get().setDarkMode(!get().darkMode),

  hydrate: async () => {
    try {
      const entries = await AsyncStorage.multiGet([
        PREF_KEYS.pushNotifications,
        PREF_KEYS.verifiedDataOnly,
        PREF_KEYS.analytics,
        PREF_KEYS.compactCards,
        PREF_KEYS.darkMode,
      ]);
      const map = new Map(entries);
      const darkMode = readBool(map.get(PREF_KEYS.darkMode) ?? null, DEFAULTS.darkMode);
      set({
        pushNotificationsEnabled: readBool(
          map.get(PREF_KEYS.pushNotifications) ?? null,
          DEFAULTS.pushNotificationsEnabled
        ),
        showVerifiedDataOnly: readBool(
          map.get(PREF_KEYS.verifiedDataOnly) ?? null,
          DEFAULTS.showVerifiedDataOnly
        ),
        analyticsEnabled: readBool(map.get(PREF_KEYS.analytics) ?? null, DEFAULTS.analyticsEnabled),
        compactCatalogCards: readBool(
          map.get(PREF_KEYS.compactCards) ?? null,
          DEFAULTS.compactCatalogCards
        ),
        darkMode,
        hydrated: true,
      });
      useThemeStore.getState().setDark(darkMode);
    } catch {
      set({ hydrated: true });
    }
  },
}));
