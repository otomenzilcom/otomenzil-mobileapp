// Auth modelleri — AuthModels.swift birebir.
// Not: UserProfile.username/email Swift'te default değerlerle ("Üye" / "") her zaman
// dolu döner; bu yüzden TS'te zorunlu string. canChangeUsername/isAdmin esnek bool
// (bkz. decode.flexBool) ile çözülür — decode katmanında uygulanır.

import type { CarSummary } from './car';

export interface UserProfile {
  username: string;
  email: string;
  memberSlug?: string;
  canChangeUsername?: boolean;
  isAdmin?: boolean;
  avatarColor?: string;
  memberSince?: string;
}

export interface AuthSuccessResponse {
  user: UserProfile;
  favorites?: string[];
  sessionToken?: string;
  needsUsernameSetup?: boolean;
  isNewUser?: boolean;
  garageCarIds?: string[];
  primaryGarageCarId?: string;
  garageCars?: CarSummary[];
}

export interface AuthMeResponse {
  user?: UserProfile;
  favorites?: string[];
  garageCarIds?: string[];
  primaryGarageCarId?: string;
  garageCars?: CarSummary[];
}

/** garageCarIds decode'da eksikse `[]`'e düşürülür (GarageClientPayload custom decode). */
export interface GarageClientPayload {
  garageCarIds: string[];
  primaryGarageCarId?: string;
  garageCars?: CarSummary[];
}

export interface AuthMessageResponse {
  message?: string;
}

export interface ProfileUpdateResponse {
  user: UserProfile;
  message?: string;
}

export interface NonceResponse {
  nonce: string;
}

export interface MemberSlugCheckResponse {
  memberSlug?: string;
  available?: boolean;
}

export interface MemberSlugSuggestResponse {
  suggestions: string[];
}

/** admin-ajax zarfı — `data` decode edilemezse undefined (Swift `try?`). */
export interface AjaxEnvelope<T> {
  success: boolean;
  data?: T;
}

export interface AjaxErrorPayload {
  message?: string;
}

/**
 * LocalAuthSession'da saklanan oturum (§6.4). `savedAt` bilgilendirici — okunmuyor;
 * RN'de ISO 8601 veya epoch ms olarak yazılabilir (Swift referans-tarih saniyesi yerine).
 */
export interface StoredAuthSession {
  user: UserProfile;
  favorites: string[];
  garageCarIds: string[];
  primaryGarageCarId: string;
  sessionToken: string;
  savedAt?: number | string;
}
