// admin-ajax.php transport'u — iOS `ajaxPost` (§2.6) ve `performEngagementAjax` (§2.7).
//
// Form-encoded POST (`application/x-www-form-urlencoded; charset=utf-8`), gövde
// `action=<action>&k1=v1&k2=v2` biçiminde. Alan anahtarları çağırandan geldiği gibi
// kullanılır (bazıları snake_case — ör. otomenzil_submit_error_report: car_id, car_title,
// page_view, page_url). Değerler encodeURIComponent ile kodlanır.
//
// KODLAMA NOTU (çözülen belirsizlik): spec §2.4 kodlamayı "encodeURIComponent-benzeri;
// &/= değer içinde kodlanır, boşluk %20" olarak tanımlar. iOS'un birebir kullandığı
// `.urlQueryAllowed` karakter kümesi ise `&`/`=` işaretlerini KODLAMAZ — bu, `&`/`=`
// içeren bir değeri (ör. yorum metni) bozacak gizli bir iOS hatasıdır. Sunucu-doğru ve
// spec'in yazılı sözleşmesine uygun olan encodeURIComponent kullanılır.
//
// admin-ajax çerezlere bağımlıdır (WP oturumu); `credentials` KAPATILMAZ (bkz. http.ts).

import { ajaxURL } from '../config';
import { ApiError, parseErrorMessage, parseHtmlError, siteHeaders } from './http';

/** `action=<action>&key=<enc(value)>...` gövdesini kurar. */
function encodeForm(action: string, fields: Record<string, string>): string {
  const items = [`action=${action}`];
  for (const [key, value] of Object.entries(fields)) {
    items.push(`${key}=${encodeURIComponent(value)}`);
  }
  return items.join('&');
}

async function postForm(action: string, fields: Record<string, string>): Promise<{ status: number; raw: string }> {
  const response = await fetch(ajaxURL, {
    method: 'POST',
    headers: siteHeaders({ 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8' }),
    body: encodeForm(action, fields),
    credentials: 'include',
  });
  const raw = await response.text();
  return { status: response.status, raw };
}

function assertAjaxStatus(status: number): void {
  // WordPress ajax hataları 200/400/403 + JSON zarfı olarak döner. ≥500 → badStatus.
  if (!(status >= 200 && status <= 499)) {
    throw ApiError.badStatus(status);
  }
}

/**
 * Auth ajax akışları (spec §2.6). Tüm gövdeyi `T` olarak döndürür (genelde
 * `AjaxEnvelope<X>`); çağıran `success`/`data`'yı kendisi kontrol eder.
 */
export async function ajaxPost<T>(action: string, fields: Record<string, string> = {}): Promise<T> {
  const { status, raw } = await postForm(action, fields);
  assertAjaxStatus(status);

  if (status === 401 || status === 403) {
    const message = parseHtmlError(raw);
    if (message) throw ApiError.authFailed(message);
  }

  // WordPress "geçersiz action/nonce" sentineli.
  if (raw.trim() === '0') {
    throw ApiError.authFailed('Oturum doğrulaması başarısız. Lütfen tekrar deneyin.');
  }

  // `{success:false}` zarfı → hata mesajı. (iOS'ta iki ayrı decode denemesi vardı; ilki
  // her success:false gövdesini yakaladığından ikincisi fiilen ölü koddu — burada tek
  // kontrol yeterli.)
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = undefined;
  }
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const obj = parsed as Record<string, unknown>;
    if (obj.success === false) {
      const data = obj.data;
      let dataMessage: string | undefined;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const m = (data as Record<string, unknown>).message;
        if (typeof m === 'string' && m.length > 0) dataMessage = m;
      }
      throw ApiError.authFailed(dataMessage ?? parseErrorMessage(raw) ?? 'İşlem başarısız.');
    }
    return parsed as T;
  }

  // Nesne değilse (dizi/primitive) tam gövdeyi çözmeye çalış — geçersizse decodingFailed.
  if (parsed !== undefined) return parsed as T;
  const message = parseHtmlError(raw) ?? parseErrorMessage(raw);
  if (message) throw ApiError.authFailed(message);
  throw ApiError.decodingFailed(raw.slice(0, 180) || 'binary');
}

/**
 * Engagement ajax akışları (spec §2.7): `{success, data}` çözer, `success===true` ise
 * `data`'yı döndürür; aksi halde parse edilmiş mesaj ya da "İşlem başarısız." ile authFailed.
 */
export async function performEngagementAjax<T>(action: string, fields: Record<string, string>): Promise<T> {
  const { status, raw } = await postForm(action, fields);
  assertAjaxStatus(status);

  if (status === 401 || status === 403) {
    const message = parseHtmlError(raw);
    if (message) throw ApiError.authFailed(message);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = undefined;
  }
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const obj = parsed as Record<string, unknown>;
    if (obj.success === true && obj.data !== undefined && obj.data !== null) {
      return obj.data as T;
    }
  }

  const message = parseHtmlError(raw) ?? parseErrorMessage(raw);
  if (message) throw ApiError.authFailed(message);
  throw ApiError.authFailed('İşlem başarısız.');
}
