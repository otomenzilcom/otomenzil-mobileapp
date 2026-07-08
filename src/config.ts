// Uygulama genel yapılandırması. iOS Config.swift + data-layer spec §1/§2.2 birebir.

/** Canlı site adresi — sonunda / YOK. */
export const siteBaseURL = 'https://www.otomenzil.com';

/**
 * REST taban adresi. Sondaki `/` KRİTİK — yoksa "home" yolu v1 yerine geçip 404 olur.
 * Tüm REST yolları bu tabana göre çözülür (baştaki/sondaki `/` kırpılarak).
 */
export const apiBaseURL = `${siteBaseURL}/wp-json/otomenzil/v1/`;

/** WordPress admin-ajax fallback adresi (form-encoded gövde). */
export const ajaxURL = `${siteBaseURL}/wp-admin/admin-ajax.php`;

/**
 * Site kökü — oturum çerezi ısıtması (warm-up) ve tema HTML kazıması için çekilir.
 * `apiBaseURL`'in aksine sonunda `/` ile.
 */
export const siteRootURL = `${siteBaseURL}/`;

/**
 * Her isteğe eklenen sabit başlıklar (spec §2.2). Özel User-Agent ve Referer
 * sunucu tarafı bot/hotlink filtrelerini geçmek için bilinçli — RN'de birebir korunmalı.
 */
export const userAgent =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 OtoMenzil/1.0';
export const referer = siteRootURL;
export const acceptHeader = 'application/json, text/plain, */*';
export const acceptLanguage = 'tr-TR,tr;q=0.9';

export const AppConfig = {
  siteBaseURL,
  apiBaseURL,
  ajaxURL,
  siteRootURL,
  userAgent,
  referer,
  acceptHeader,
  acceptLanguage,
} as const;

export default AppConfig;
