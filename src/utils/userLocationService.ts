// Konum servisi — UserLocationService.swift (CoreLocation) → expo-location.
// whenInUse izni, tek-atış konum + 15 sn zaman aşımı, Türkiye bbox kapısı,
// 5 geri-bildirim durumu, haversine mesafe yardımcısı.

import * as Location from 'expo-location';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

/** Swift UserLocationFeedback — 5 durum. `unavailable` mesaj taşır. */
export type UserLocationFeedback =
  | { kind: 'success'; latitude: number; longitude: number }
  | { kind: 'denied' }
  | { kind: 'timeout' }
  | { kind: 'outsideTurkey' }
  | { kind: 'unavailable'; message: string };

/** Swift `@unknown default` / servis-yok dalındaki birebir Türkçe metin. */
export const LOCATION_SERVICE_UNAVAILABLE_MESSAGE = 'Konum servisi kullanılamıyor.';

/** Swift `Task.sleep(15_000_000_000)`. */
export const LOCATION_TIMEOUT_MS = 15_000;

// Türkiye sınırlayıcı kutusu: lat ∈ [35.5, 42.5], lng ∈ [25.0, 45.0].
export const TURKEY_LAT_MIN = 35.5;
export const TURKEY_LAT_MAX = 42.5;
export const TURKEY_LNG_MIN = 25.0;
export const TURKEY_LNG_MAX = 45.0;

export function isInTurkey(latitude: number, longitude: number): boolean {
  return (
    latitude >= TURKEY_LAT_MIN &&
    latitude <= TURKEY_LAT_MAX &&
    longitude >= TURKEY_LNG_MIN &&
    longitude <= TURKEY_LNG_MAX
  );
}

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** İki koordinat arası büyük-daire mesafesi (km). Swift CLLocation.distance karşılığı. */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const TIMEOUT_SENTINEL = Symbol('location-timeout');

/**
 * Swift `UserLocationService` gözlemlenebilir servisinin karşılığı. Alanlar
 * (coordinate/authorizationDenied/…) UI'a bağlanabilir; `request` tek-atış akışını
 * yürütür ve isteğe bağlı geri-bildirim döndürür.
 */
export class UserLocationService {
  coordinate: Coordinate | null = null;
  authorizationDenied = false;
  outsideTurkey = false;
  isLoading = false;
  locationUnavailable = false;

  async request(
    withFeedback = false,
    handler?: (feedback: UserLocationFeedback) => void,
  ): Promise<void> {
    this.locationUnavailable = false;
    this.authorizationDenied = false;
    this.outsideTurkey = false;
    this.isLoading = true;

    const deliver = (feedback: UserLocationFeedback): void => {
      if (withFeedback) handler?.(feedback);
    };

    let status: Location.PermissionStatus;
    try {
      const current = await Location.getForegroundPermissionsAsync();
      // notDetermined (veya tekrar sorulabilir) → izin iste (whenInUse).
      if (current.status !== 'granted' && current.canAskAgain) {
        status = (await Location.requestForegroundPermissionsAsync()).status;
      } else {
        status = current.status;
      }
    } catch {
      this.isLoading = false;
      this.locationUnavailable = true;
      deliver({ kind: 'unavailable', message: LOCATION_SERVICE_UNAVAILABLE_MESSAGE });
      return;
    }

    if (status !== 'granted') {
      this.authorizationDenied = true;
      this.isLoading = false;
      this.coordinate = null;
      deliver({ kind: 'denied' });
      return;
    }

    try {
      const position = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(TIMEOUT_SENTINEL), LOCATION_TIMEOUT_MS);
        }),
      ]);

      this.isLoading = false;
      this.locationUnavailable = false;

      const { latitude, longitude } = position.coords;
      const inside = isInTurkey(latitude, longitude);
      this.outsideTurkey = !inside;
      this.coordinate = inside ? { latitude, longitude } : null;

      if (inside) deliver({ kind: 'success', latitude, longitude });
      else deliver({ kind: 'outsideTurkey' });
    } catch (error) {
      this.isLoading = false;
      if (error === TIMEOUT_SENTINEL) {
        // Swift: hâlâ yükleniyor, koordinat yok, reddedilmemiş → timeout.
        if (this.coordinate == null && !this.authorizationDenied) {
          this.locationUnavailable = true;
          deliver({ kind: 'timeout' });
        }
        return;
      }
      // Hata + önceki koordinat yok → unavailable(mesaj).
      if (this.coordinate == null) {
        this.locationUnavailable = true;
        const message =
          error instanceof Error && error.message.length > 0
            ? error.message
            : LOCATION_SERVICE_UNAVAILABLE_MESSAGE;
        deliver({ kind: 'unavailable', message });
      }
    }
  }
}

/** Tek seferlik konum isteği için işlevsel kısayol. */
export function requestUserLocation(): Promise<UserLocationFeedback> {
  return new Promise((resolve) => {
    const service = new UserLocationService();
    void service.request(true, resolve);
  });
}
