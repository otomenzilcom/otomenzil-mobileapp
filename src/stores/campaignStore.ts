// MobileCampaignManager — iOS MobileCampaignManager karşılığı (spec 01 §6.5, spec 03 §5.7).
//
// activePopup + unreadNotifications. Cihaz kaydı (campaigns/device), popup fetch (per-popup
// per-GÜN dismissal), notifications fetch. Dismissal anahtarı yerel-saat dilimi tarihiyle:
// `otomenzil.popup.dismissed.<popupId>.<yyyy-MM-dd>` — aynı popup ertesi gün yeniden görünür.
//
// Saf yardımcılar (dismissKey, localDateKey, shouldShowPopup) UI'dan bağımsız export edilir.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { apiClient } from '../api';
import { getOrCreateDeviceId } from '../api/push';
import type { MobileNotificationItem, MobilePopupPayload } from '../models';

/** Yerel saat diliminde yyyy-MM-dd (iOS local timezone date). */
export function localDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Popup dismissal anahtarı — per-popup per-gün (spec §6.5). */
export function dismissKey(popupId: string, date: Date = new Date()): string {
  return `otomenzil.popup.dismissed.${popupId}.${localDateKey(date)}`;
}

interface CampaignState {
  activePopup: MobilePopupPayload | null;
  unreadNotifications: MobileNotificationItem[];
  /** En son alınan push token'ı (token değişiminde bootstrap yeniden çalışır). */
  latestPushToken: string;

  bootstrap: (pushToken?: string) => Promise<void>;
  registerDevice: (pushToken: string) => Promise<void>;
  refreshPopup: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  dismissPopup: (popup: MobilePopupPayload) => Promise<void>;
  setLatestPushToken: (token: string) => void;
}

export const useCampaignStore = create<CampaignState>((set, get) => ({
  activePopup: null,
  unreadNotifications: [],
  latestPushToken: '',

  bootstrap: async (pushToken) => {
    const token = pushToken ?? get().latestPushToken;
    await get().registerDevice(token);
    await get().refreshPopup();
    await get().refreshNotifications();
  },

  registerDevice: async (pushToken) => {
    try {
      const deviceId = await getOrCreateDeviceId();
      await apiClient.registerDevice(deviceId, pushToken);
    } catch {
      // hatalar yutulur (spec §3.5 #38)
    }
  },

  refreshPopup: async () => {
    try {
      const popup = await apiClient.fetchPopup();
      if (popup === null) {
        set({ activePopup: null });
        return;
      }
      // Bugün için reddedildi mi?
      const dismissed = await AsyncStorage.getItem(dismissKey(popup.id));
      if (dismissed === 'true') {
        set({ activePopup: null });
        return;
      }
      set({ activePopup: popup });
    } catch {
      // hatalar yutulur — mevcut popup korunur
    }
  },

  refreshNotifications: async () => {
    try {
      const notifications = await apiClient.fetchNotifications();
      set({ unreadNotifications: notifications });
    } catch {
      // hatalar yutulur
    }
  },

  dismissPopup: async (popup) => {
    set({ activePopup: null });
    try {
      await AsyncStorage.setItem(dismissKey(popup.id), 'true');
    } catch {
      // yazma en iyi çaba
    }
  },

  setLatestPushToken: (token) => set({ latestPushToken: token }),
}));
