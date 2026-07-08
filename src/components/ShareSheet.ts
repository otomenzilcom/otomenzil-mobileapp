// ShareSheet — iOS UIActivityViewController (spec §4.22) karşılığı.
//
// RN yerleşik `Share.share` API'si. iOS `items: [Any]` çoğunlukla URL + başlık taşır; RN Share
// message/url ayrımını kullanır. Bu modül tek çağrı noktası — bileşenler `share(...)` çağırır.

import { Share } from 'react-native';

export interface ShareContent {
  /** Paylaşım başlığı (Android intent başlığı). */
  title?: string;
  /** Paylaşılacak metin gövdesi. */
  message?: string;
  /** Paylaşılacak URL (iOS ayrı alan; Android message'a eklenir). */
  url?: string;
}

/**
 * Sistem paylaşım sayfasını açar. iOS'ta url ayrı alan olarak geçer; Android'de url yoksa
 * yalnızca message paylaşılır. Kullanıcı iptal ederse sessizce döner.
 */
export async function share(content: ShareContent): Promise<void> {
  const { title, message, url } = content;
  try {
    await Share.share(
      {
        title,
        message: message ?? url ?? '',
        url,
      },
      { subject: title },
    );
  } catch {
    // Paylaşım hataları/iptalleri sessiz — kullanıcı akışını bozmaz.
  }
}

export const ShareSheet = { share };
