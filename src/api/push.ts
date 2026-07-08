// Push kaydı — iOS PushNotificationService + AppDelegate karşılığı (spec §7).
//
// expo-notifications ile: izin iste → `getDevicePushTokenAsync()` (HAM cihaz token'ı — Expo
// push token'ı DEĞİL) → iOS'ta küçük-harf hex normalizasyonu → cihaz id'si üret/kalıcılaştır
// (otomenzil.device.id, AsyncStorage) → registerDevice ile yükle → foreground bildirim işleyici.
//
// Expo Go'da native push yetkileri yoktur; tüm çağrılar try/catch ile sarılıp erişilemezlik
// loglanır (çağrılabilir ama etkisiz). Push token yükleme ucu YOK — token campaigns/device'a
// deviceId ile birlikte gönderilir (spec §7).

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

import { apiClient } from './client';

export const DEVICE_ID_KEY = 'otomenzil.device.id';

type DevicePushToken = Awaited<ReturnType<typeof Notifications.getDevicePushTokenAsync>>;

export interface PushRegistration {
  deviceId: string;
  pushToken: string;
}

/** RFC4122 v4 UUID (Math.random tabanlı — cihaz id'si için yeterli, kriptografik değil). */
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Kalıcı cihaz id'sini döndürür; ilk çağrıda üretip saklar ve sonsuza dek yeniden kullanır
 * (iOS `identifierForVendor` + UserDefaults kalıcılığı yerine). AsyncStorage hatasında da
 * en azından uçucu bir id döner.
 */
export async function getOrCreateDeviceId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (existing && existing.length > 0) return existing;
    const generated = uuidv4();
    await AsyncStorage.setItem(DEVICE_ID_KEY, generated);
    return generated;
  } catch {
    return uuidv4();
  }
}

/** iOS'ta ham APNs token'ını küçük-harf hex'e normalize eder; Android FCM token'ı olduğu gibi. */
function normalizeToken(token: DevicePushToken): string {
  const data: unknown = token.data;
  if (typeof data !== 'string') return '';
  if (token.type === 'ios') {
    // Bazı ortamlarda ham NSData tanımı `<abcd 1234>` gelebilir — köşeli parantez/boşluk temizle.
    return data.replace(/[<>\s]/g, '').toLowerCase();
  }
  return data;
}

/**
 * Foreground bildirim sunumunu yapılandırır (iOS willPresent → banner + sound + badge; liste
 * gösterimi kapalı). Uygulama başlangıcında bir kez çağrılmalı. Expo Go'da güvenli.
 */
export function configureForegroundNotifications(): void {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: false,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (err) {
    console.warn('[push] bildirim işleyici yapılandırılamadı (Expo Go?):', err);
  }
}

/** Bildirim iznini ister (gerekirse), verilip verilmediğini döndürür. */
export async function requestPushPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (current.canAskAgain === false) return false;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch (err) {
    console.warn('[push] izin isteği başarısız (Expo Go?):', err);
    return false;
  }
}

/** Ham cihaz push token'ını döndürür (izin verildiyse); alınamazsa "". */
export async function getRawDeviceToken(): Promise<string> {
  try {
    const token = await Notifications.getDevicePushTokenAsync();
    return normalizeToken(token);
  } catch (err) {
    console.warn('[push] cihaz token alınamadı (Expo Go?):', err);
    return '';
  }
}

/**
 * Tam push kaydı akışı: foreground işleyici + izin + ham token + cihaz id + registerDevice yükleme.
 * Expo Go'da etkisiz (token "" ile döner, yükleme hataları yutulur). Elde edilen {deviceId,
 * pushToken}'ı döndürür — authStore/kampanya yöneticisi (Wave 3) token değişiminde yeniden çağırır.
 */
export async function registerForPushNotifications(): Promise<PushRegistration> {
  configureForegroundNotifications();
  const deviceId = await getOrCreateDeviceId();

  const granted = await requestPushPermission();
  const pushToken = granted ? await getRawDeviceToken() : '';

  try {
    // Hatalar yutulur (spec §3.5 #38) — kayıt en iyi çaba.
    await apiClient.registerDevice(deviceId, pushToken);
  } catch (err) {
    console.warn('[push] cihaz kaydı başarısız:', err);
  }

  return { deviceId, pushToken };
}

/**
 * Cihaz push token'ı değiştiğinde (iOS `.pushTokenDidUpdate`) tetiklenir; normalize edilmiş
 * token'ı callback'e verir. Wave 3 store'u bunu kampanya bootstrap'ını yeniden çalıştırmak için
 * kullanabilir. Kaldırma fonksiyonu döndürür.
 */
export function addDevicePushTokenListener(cb: (token: string) => void): () => void {
  try {
    const sub = Notifications.addPushTokenListener((token) => cb(normalizeToken(token)));
    return () => sub.remove();
  } catch (err) {
    console.warn('[push] token dinleyicisi eklenemedi (Expo Go?):', err);
    return () => {};
  }
}
