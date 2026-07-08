// APIClient — iOS APIClient.swift'in TypeScript karşılığı (spec §3).
//
// Sorumluluk: her uç için REST öncelikli, uca-özgü admin-ajax fallback matrisini (spec §3.2/§3.3)
// birebir uygular. Transport http.ts/ajax.ts'e; nonce yaşam döngüsü + 15dk TTL + settings.ajaxNonce
// tohumlaması authStore'a (Wave 3) aittir. Bu istemci nonce'u açık parametre olarak alır ve
// `getNonce()` ilkel çekimini sağlar.
//
// AUTH SEAM: Bearer token http.ts `setAuthToken()` ile enjekte edilir (iOS statik
// `APIClient.authToken`). Nonce parametre geçişiyle sağlanır; garaj mutasyonu için opsiyonel
// `refreshNonce` collaborator'ı ile "başarısızsa nonce tazele + bir kez yeniden dene" (§5.7)
// desteklenir — collaborator verilmezse davranış iOS ile birebir (tek deneme).

import { siteBaseURL, siteRootURL } from '../config';
import { flexBool } from '../models/decode';
import type {
  AuthMeResponse,
  AuthMessageResponse,
  AuthSuccessResponse,
  BlogListResponse,
  BlogPost,
  BrandsResponse,
  CarCatalogResponse,
  CarDetail,
  CarSummary,
  ChargingStationsResponse,
  CampaignNotificationsResponse,
  CampaignPopupResponse,
  DeviceRegistrationResponse,
  FavoritesPayload,
  GarageClientPayload,
  HomeResponse,
  MemberSlugCheckResponse,
  MemberSlugSuggestResponse,
  MessagePayload,
  MobileAppSettings,
  MobileNotificationItem,
  MobilePopupPayload,
  NonceResponse,
  ProfileUpdateResponse,
  SeedStationDTO,
  UserProfile,
} from '../models';
import type { AjaxEnvelope } from '../models/auth';
import { ajaxPost, performEngagementAjax } from './ajax';
import {
  ApiError,
  getJson,
  fetchText,
  isAuthFailed,
  postJson,
  putJson,
  toHttpsUrl,
} from './http';

/** iOS `SiteThemeExtras` — settings logosu yoksa ana sayfa HTML'inden kazınır (§3.9). */
export interface SiteThemeExtras {
  logoURL?: string;
  tagline?: string;
}

// ── Normalizasyon (iOS JSONDecoder custom decode karşılıkları, spec §4.4) ──────────

function asStringArray(v: unknown): string[] | undefined {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : undefined;
}

/** UserProfile: username→"Üye"/email→"" varsayılanları, canChangeUsername/isAdmin esnek bool. */
function normUser(raw: unknown): UserProfile {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    username: typeof o.username === 'string' ? o.username : 'Üye',
    email: typeof o.email === 'string' ? o.email : '',
    memberSlug: typeof o.memberSlug === 'string' ? o.memberSlug : undefined,
    canChangeUsername: flexBool(o.canChangeUsername),
    isAdmin: flexBool(o.isAdmin),
    avatarColor: typeof o.avatarColor === 'string' ? o.avatarColor : undefined,
    memberSince: typeof o.memberSince === 'string' ? o.memberSince : undefined,
  };
}

function normAuthSuccess(raw: unknown): AuthSuccessResponse {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    user: normUser(o.user),
    favorites: asStringArray(o.favorites),
    sessionToken: typeof o.sessionToken === 'string' ? o.sessionToken : undefined,
    needsUsernameSetup: typeof o.needsUsernameSetup === 'boolean' ? o.needsUsernameSetup : undefined,
    isNewUser: typeof o.isNewUser === 'boolean' ? o.isNewUser : undefined,
    garageCarIds: o.garageCarIds === undefined ? undefined : asStringArray(o.garageCarIds),
    primaryGarageCarId: typeof o.primaryGarageCarId === 'string' ? o.primaryGarageCarId : undefined,
    garageCars: Array.isArray(o.garageCars) ? (o.garageCars as CarSummary[]) : undefined,
  };
}

function normAuthMe(raw: unknown): AuthMeResponse {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    user: o.user === undefined || o.user === null ? undefined : normUser(o.user),
    favorites: asStringArray(o.favorites),
    garageCarIds: asStringArray(o.garageCarIds),
    primaryGarageCarId: typeof o.primaryGarageCarId === 'string' ? o.primaryGarageCarId : undefined,
    garageCars: Array.isArray(o.garageCars) ? (o.garageCars as CarSummary[]) : undefined,
  };
}

function normProfileUpdate(raw: unknown): ProfileUpdateResponse {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    user: normUser(o.user),
    message: typeof o.message === 'string' ? o.message : undefined,
  };
}

/** GarageClientPayload: garageCarIds eksik → []. */
function normGarage(raw: unknown): GarageClientPayload {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    garageCarIds: asStringArray(o.garageCarIds) ?? [],
    primaryGarageCarId: typeof o.primaryGarageCarId === 'string' ? o.primaryGarageCarId : undefined,
    garageCars: Array.isArray(o.garageCars) ? (o.garageCars as CarSummary[]) : undefined,
  };
}

/** CarSummary → CarDetail (popularity düşürülür, detay alanları undefined). */
function detailFromSummary(summary: CarSummary): CarDetail {
  const { popularity: _popularity, ...rest } = summary;
  return { ...rest };
}

// ── HTML tema kazıması (iOS SiteDataEnricher, §3.9) ───────────────────────────────

function extractOtomenzilData(html: string): Record<string, unknown> | undefined {
  const match = html.match(/window\.otomenzilData\s*=\s*(\{[\s\S]*?\});/);
  if (!match) return undefined;
  const text = match[0];
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return undefined;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

export class APIClient {
  // ── Shell / içerik (§3.1) ──────────────────────────────────────────────────────

  fetchHome(): Promise<HomeResponse> {
    return getJson<HomeResponse>('home');
  }

  async fetchCars(fresh = false): Promise<CarSummary[]> {
    // fresh → server cache-bust (?fresh=1) + yerel önbelleği atla/üzerine yaz (spec §2.3).
    const path = fresh ? 'cars?fresh=1' : 'cars';
    const response = await getJson<CarCatalogResponse>(path, { fresh });
    return response.cars;
  }

  async fetchCarDetail(slug: string): Promise<CarDetail> {
    try {
      return await getJson<CarDetail>(`cars/${slug}`);
    } catch (err) {
      // iOS'ta yalnızca blog detayında 404 fallback vardı; takım talebi üzerine araç detayına
      // da eklendi: 404'te katalogdan id ile eşleştir (CarSummary→CarDetail), yoksa 404'ü fırlat.
      if (err instanceof ApiError && err.kind === 'badStatus' && err.status === 404) {
        const cars = await this.fetchCars();
        const match = cars.find((c) => c.id === slug);
        if (match) return detailFromSummary(match);
      }
      throw err;
    }
  }

  async fetchBlogs(): Promise<BlogPost[]> {
    const response = await getJson<BlogListResponse>('blogs');
    return response.blogs;
  }

  async fetchBlogDetail(slug: string): Promise<BlogPost> {
    try {
      return await getJson<BlogPost>(`blogs/${slug}`);
    } catch (err) {
      // §3.1 #5: 404'te tüm listeyi çek, id ile eşleştir; yoksa 404'ü yeniden fırlat.
      if (err instanceof ApiError && err.kind === 'badStatus' && err.status === 404) {
        const blogs = await this.fetchBlogs();
        const match = blogs.find((b) => b.id === slug);
        if (match) return match;
        throw ApiError.badStatus(404);
      }
      throw err;
    }
  }

  fetchSettings(): Promise<MobileAppSettings> {
    return getJson<MobileAppSettings>('settings');
  }

  async fetchBrandLogos(): Promise<Record<string, string>> {
    const response = await getJson<BrandsResponse>('brands');
    return response.brandLogos;
  }

  async fetchChargingStations(): Promise<SeedStationDTO[]> {
    const response = await getJson<ChargingStationsResponse>('charging-stations');
    return response.stations;
  }

  /** Ana sayfa HTML'inden logo/tagline kazır (settings logosu yoksa kullanılır, §3.9). */
  async fetchSiteThemeExtras(): Promise<SiteThemeExtras> {
    const html = await fetchText(siteRootURL, true);
    const data = extractOtomenzilData(html);
    const theme =
      data && typeof data.themeSettings === 'object' && data.themeSettings !== null
        ? (data.themeSettings as Record<string, unknown>)
        : undefined;
    const rawLogo = theme && typeof theme.general_logo_url === 'string' ? theme.general_logo_url : '';
    const rawTagline = theme && typeof theme.general_tagline === 'string' ? theme.general_tagline : '';
    return {
      logoURL: rawLogo.length > 0 ? toHttpsUrl(rawLogo) : undefined,
      tagline: rawTagline.length > 0 ? rawTagline : undefined,
    };
  }

  // ── Auth (§3.2) ─────────────────────────────────────────────────────────────────

  /**
   * Nonce ilkel çekimi (§3.2 #9): ana sayfa warm-up GET → REST `auth/nonce` (fresh, önbelleksiz)
   * → herhangi bir hatada ajax `otomenzil_refresh_nonce`. (TTL/settings tohumu authStore'da.)
   */
  async getNonce(): Promise<string> {
    // Warm-up GET yalnızca WP çerezlerini almak için (yanıt yok sayılır).
    await fetchText(siteRootURL, false);
    try {
      const rest = await getJson<NonceResponse>('auth/nonce', { fresh: true, store: false });
      return rest.nonce;
    } catch {
      const ajax = await ajaxPost<AjaxEnvelope<NonceResponse>>('otomenzil_refresh_nonce');
      if (!ajax.success || !ajax.data?.nonce) {
        throw ApiError.authFailed('Güvenlik anahtarı alınamadı.');
      }
      return ajax.data.nonce;
    }
  }

  async fetchMe(): Promise<AuthMeResponse> {
    return normAuthMe(await getJson<unknown>('auth/me', { store: false }));
  }

  /** Fallback YALNIZCA authFailed'de (§3.2 #11). */
  async login(email: string, password: string, nonce: string): Promise<AuthSuccessResponse> {
    try {
      return normAuthSuccess(await postJson<unknown>('auth/login', { email, password, nonce }));
    } catch (err) {
      if (!isAuthFailed(err)) throw err;
      const ajax = await ajaxPost<AjaxEnvelope<AuthSuccessResponse>>('otomenzil_login', {
        email,
        password,
        nonce,
      });
      if (!ajax.success || !ajax.data) {
        throw ApiError.authFailed('Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
      }
      return normAuthSuccess(ajax.data);
    }
  }

  /** Fallback YALNIZCA authFailed'de (§3.2 #12). */
  async register(
    fullName: string,
    email: string,
    password: string,
    memberSlug: string,
    nonce: string
  ): Promise<AuthSuccessResponse> {
    try {
      return normAuthSuccess(
        await postJson<unknown>('auth/register', { fullName, email, password, memberSlug, nonce })
      );
    } catch (err) {
      if (!isAuthFailed(err)) throw err;
      const ajax = await ajaxPost<AjaxEnvelope<AuthSuccessResponse>>('otomenzil_register', {
        fullName,
        email,
        password,
        memberSlug,
        nonce,
      });
      if (!ajax.success || !ajax.data) {
        throw ApiError.authFailed('Kayıt başarısız. Lütfen bilgilerinizi kontrol edin.');
      }
      return normAuthSuccess(ajax.data);
    }
  }

  /** Ters mantık: authFailed → yeniden fırlat; DİĞER her hatada ajax (§3.2 #15). */
  async googleLogin(credential: string, nonce: string): Promise<AuthSuccessResponse> {
    try {
      return normAuthSuccess(await postJson<unknown>('auth/google', { credential, nonce }));
    } catch (err) {
      if (isAuthFailed(err)) throw err;
      const ajax = await ajaxPost<AjaxEnvelope<AuthSuccessResponse>>('otomenzil_google_auth', {
        credential,
        nonce,
      });
      if (!ajax.success || !ajax.data) {
        throw ApiError.authFailed('Google ile giriş tamamlanamadı.');
      }
      return normAuthSuccess(ajax.data);
    }
  }

  /** authFailed → yeniden fırlat; diğer her hatada ajax (§3.2 #16). Mesaj metnini döndürür. */
  async forgotPassword(email: string, nonce: string): Promise<string> {
    const defaultSuccess = 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.';
    try {
      const response = await postJson<AuthMessageResponse>('auth/forgot-password', { email, nonce });
      return response.message ?? defaultSuccess;
    } catch (err) {
      if (isAuthFailed(err)) throw err;
      const ajax = await ajaxPost<AjaxEnvelope<AuthMessageResponse>>('otomenzil_forgot_password', {
        email,
        nonce,
      });
      if (!ajax.success) {
        throw ApiError.authFailed(ajax.data?.message ?? 'Şifre sıfırlama başarısız.');
      }
      return ajax.data?.message ?? defaultSuccess;
    }
  }

  /** Her ikisi de en iyi çaba, hatalar yutulur: REST auth/logout + ajax otomenzil_logout (§3.2 #17). */
  async logout(nonce: string): Promise<void> {
    try {
      await postJson<AuthMessageResponse>('auth/logout', { nonce });
    } catch {
      // yut
    }
    try {
      await ajaxPost<AjaxEnvelope<AuthMessageResponse>>('otomenzil_logout', { nonce });
    } catch {
      // yut
    }
  }

  checkMemberSlug(memberSlug: string, nonce: string): Promise<MemberSlugCheckResponse> {
    return postJson<MemberSlugCheckResponse>('auth/check-member-slug', { memberSlug, nonce });
  }

  suggestMemberSlug(fullName: string, nonce: string): Promise<MemberSlugSuggestResponse> {
    return postJson<MemberSlugSuggestResponse>('auth/suggest-member-slug', { fullName, nonce });
  }

  /** ajax-only (§3.2 #18): otomenzil_setup_username. */
  async setupUsername(memberSlug: string, nonce: string): Promise<ProfileUpdateResponse> {
    const ajax = await ajaxPost<AjaxEnvelope<ProfileUpdateResponse>>('otomenzil_setup_username', {
      memberSlug,
      nonce,
    });
    if (!ajax.success || !ajax.data) {
      throw ApiError.authFailed('Kullanıcı adı kaydedilemedi.');
    }
    return normProfileUpdate(ajax.data);
  }

  // ── Profil / favoriler / garaj (§3.3) ────────────────────────────────────────────

  /** HERHANGİ bir REST hatasında ajax otomenzil_update_profile (§3.3 #19). */
  async updateProfile(
    profile: {
      username: string;
      email: string;
      currentPassword: string;
      newPassword: string;
      avatarColor: string;
    },
    nonce: string
  ): Promise<ProfileUpdateResponse> {
    const body = { ...profile, nonce };
    try {
      return normProfileUpdate(await postJson<unknown>('user/profile', body));
    } catch {
      const ajax = await ajaxPost<AjaxEnvelope<ProfileUpdateResponse>>('otomenzil_update_profile', {
        nonce,
        username: profile.username,
        email: profile.email,
        currentPassword: profile.currentPassword,
        newPassword: profile.newPassword,
        avatarColor: profile.avatarColor,
      });
      if (!ajax.success || !ajax.data) {
        throw ApiError.authFailed('Profil güncellenemedi.');
      }
      return normProfileUpdate(ajax.data);
    }
  }

  /** PUT → POST → ajax zinciri (§3.3 #20). Kaydedilen favori listesini döndürür. */
  async updateFavorites(favorites: string[], nonce: string): Promise<string[]> {
    try {
      const payload = await putJson<FavoritesPayload>('user/favorites', { favorites });
      return payload.favorites;
    } catch {
      // PUT başarısız → POST
    }
    try {
      const payload = await postJson<FavoritesPayload>('user/favorites', { favorites });
      return payload.favorites;
    } catch {
      // POST başarısız → ajax
    }
    const payload = await performEngagementAjax<FavoritesPayload>('otomenzil_save_favorites', {
      nonce,
      favorites: JSON.stringify(favorites),
    });
    return payload.favorites;
  }

  getGarage(): Promise<GarageClientPayload> {
    return getJson<unknown>('user/garage', { store: false }).then(normGarage);
  }

  /**
   * PUT user/garage {carId, action} (§3.3 #22). API seviyesinde fallback yok. `refreshNonce`
   * collaborator'ı verilirse (authStore §5.7): ilk deneme başarısızsa nonce tazelenir ve BİR KEZ
   * yeniden denenir. Verilmezse davranış iOS ile birebir (tek deneme). Gövdede nonce YOK (iOS gibi).
   */
  async updateGarage(
    carId: string,
    action: 'add' | 'remove' | 'setPrimary',
    opts?: { refreshNonce?: () => Promise<unknown> }
  ): Promise<GarageClientPayload> {
    try {
      return normGarage(await putJson<unknown>('user/garage', { carId, action }));
    } catch (err) {
      if (!opts?.refreshNonce) throw err;
      await opts.refreshNonce();
      return normGarage(await putJson<unknown>('user/garage', { carId, action }));
    }
  }

  // ── Kampanyalar / push (§3.5) ─────────────────────────────────────────────────────

  /** GET campaigns/popup — dinamik, yerel önbelleğe alınmaz (foreground refresh için). */
  async fetchPopup(): Promise<MobilePopupPayload | null> {
    const response = await getJson<CampaignPopupResponse>('campaigns/popup', { store: false });
    return response.popup;
  }

  async fetchNotifications(): Promise<MobileNotificationItem[]> {
    const response = await getJson<CampaignNotificationsResponse>('campaigns/notifications', {
      store: false,
    });
    return response.notifications;
  }

  /**
   * POST campaigns/device (§3.5 #38). Push token boş ("") olabilir. iOS'ta hatalar çağıranca
   * yutulur (kampanya yöneticisi / push.ts) — bu metod normal fırlatır, çağıran yutar.
   */
  registerDevice(deviceId: string, pushToken: string): Promise<DeviceRegistrationResponse> {
    return postJson<DeviceRegistrationResponse>('campaigns/device', { deviceId, pushToken });
  }

  // ── ajax-only etkileşim uçları (§3.4) ─────────────────────────────────────────────

  /** #32: fire-and-forget araç görüntüleme izleme. */
  async trackCarView(carId: string, nonce: string): Promise<void> {
    try {
      await performEngagementAjax<unknown>('otomenzil_car_view', { nonce, carId });
    } catch {
      // yut
    }
  }

  /** #33: fire-and-forget blog görüntüleme izleme. */
  async trackBlogView(blogId: string, nonce: string): Promise<void> {
    try {
      await performEngagementAjax<unknown>('otomenzil_blog_view', { nonce, blogId });
    } catch {
      // yut
    }
  }

  /** #34: iletişim formu. Mesaj metnini (varsa) döndürür. */
  async submitContact(
    name: string,
    email: string,
    subject: string,
    message: string,
    nonce: string
  ): Promise<string> {
    const payload = await performEngagementAjax<MessagePayload>('otomenzil_contact', {
      nonce,
      name,
      email,
      subject,
      message,
    });
    return payload.message ?? 'Mesajınız iletildi.';
  }

  /** #35: hata bildirimi. Alan adları snake_case (car_id, car_title, page_view, page_url). */
  async submitErrorReport(
    params: { message: string; carId: string; carTitle: string; name?: string; email?: string },
    nonce: string
  ): Promise<string> {
    const payload = await performEngagementAjax<MessagePayload>('otomenzil_submit_error_report', {
      nonce,
      message: params.message,
      car_id: params.carId,
      car_title: params.carTitle,
      page_view: 'detail',
      page_url: `${siteBaseURL}/arac/${params.carId}/`,
      name: params.name ?? '',
      email: params.email ?? '',
    });
    return payload.message ?? 'Bildiriniz alındı.';
  }
}

/** Uygulama genelinde paylaşılan tekil istemci. Token http.ts'te modül-seviyesinde tutulur. */
export const apiClient = new APIClient();
