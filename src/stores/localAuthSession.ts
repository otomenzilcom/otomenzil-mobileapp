// LocalAuthSession — iOS LocalAuthSession karşılığı (spec 01 §6.4).
//
// Tek anahtar (`otomenzil.auth.session`) altında JSON oturum blob'u saklar. iOS UserDefaults
// kullanıyordu; RN'de token güvenli olmalı → expo-secure-store (spec §8 mapping notu). Blob;
// user, favorites, garageCarIds, primaryGarageCarId, sessionToken (kırpılmış) ve bilgilendirici
// savedAt (epoch ms — Swift referans-tarih saniyesi yerine; hiçbir yerde okunmaz) içerir.
//
// setAuthToken(http.ts) ile senkron: kaydederken non-empty token bearer olarak set edilir;
// clear() token'ı null'lar. restore() legacy şekli (garaj alanları olmayan) tolere eder.

import * as SecureStore from 'expo-secure-store';

import { setAuthToken } from '../api';
import type { StoredAuthSession, UserProfile } from '../models';

/** SecureStore anahtarı — iOS ile birebir. */
export const AUTH_SESSION_KEY = 'otomenzil.auth.session';

export interface RestoredSession {
  user: UserProfile;
  favorites: string[];
  garageCarIds: string[];
  primaryGarageCarId: string;
  sessionToken: string;
}

/**
 * Oturumu güvenli depoya yazar. Token kırpılır; non-empty ise http.ts bearer'ı ayarlanır.
 * Yalnızca bir kullanıcı varken çağrılmalı (iOS `persistSession()` semantiği).
 */
export async function saveAuthSession(session: RestoredSession): Promise<void> {
  const token = session.sessionToken.trim();
  const blob: StoredAuthSession = {
    user: session.user,
    favorites: session.favorites,
    garageCarIds: session.garageCarIds,
    primaryGarageCarId: session.primaryGarageCarId,
    sessionToken: token,
    savedAt: Date.now(),
  };
  if (token.length > 0) setAuthToken(token);
  try {
    await SecureStore.setItemAsync(AUTH_SESSION_KEY, JSON.stringify(blob));
  } catch {
    // yazma en iyi çaba — hata yutulur
  }
}

/** Esnek string dizi çözümü. */
function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

/**
 * Depolanan oturumu çözer. Ana şekil başarısızsa legacy `{user, favorites, sessionToken}`
 * (garaj alanları → []/"") denenir. Non-empty token http.ts bearer'ına yazılır. Yoksa null.
 */
export async function restoreAuthSession(): Promise<RestoredSession | null> {
  let raw: string | null = null;
  try {
    raw = await SecureStore.getItemAsync(AUTH_SESSION_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;

  const user = obj.user;
  if (user === null || typeof user !== 'object') return null;
  const u = user as Record<string, unknown>;

  const restored: RestoredSession = {
    user: {
      username: typeof u.username === 'string' ? u.username : 'Üye',
      email: typeof u.email === 'string' ? u.email : '',
      memberSlug: typeof u.memberSlug === 'string' ? u.memberSlug : undefined,
      canChangeUsername: typeof u.canChangeUsername === 'boolean' ? u.canChangeUsername : undefined,
      isAdmin: typeof u.isAdmin === 'boolean' ? u.isAdmin : undefined,
      avatarColor: typeof u.avatarColor === 'string' ? u.avatarColor : undefined,
      memberSince: typeof u.memberSince === 'string' ? u.memberSince : undefined,
    },
    favorites: asStringArray(obj.favorites),
    // legacy şekil: garageCarIds/primaryGarageCarId yok → []/"".
    garageCarIds: asStringArray(obj.garageCarIds),
    primaryGarageCarId: typeof obj.primaryGarageCarId === 'string' ? obj.primaryGarageCarId : '',
    sessionToken: typeof obj.sessionToken === 'string' ? obj.sessionToken.trim() : '',
  };

  if (restored.sessionToken.length > 0) setAuthToken(restored.sessionToken);
  return restored;
}

/** Oturumu siler ve bearer token'ı null'lar (iOS `clear()`). */
export async function clearAuthSession(): Promise<void> {
  setAuthToken(null);
  try {
    await SecureStore.deleteItemAsync(AUTH_SESSION_KEY);
  } catch {
    // silme en iyi çaba
  }
}
