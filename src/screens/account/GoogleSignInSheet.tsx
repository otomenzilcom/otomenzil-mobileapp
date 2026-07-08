// GoogleSignInSheet — iOS GoogleSignInSheet/WebView + GSI web akışı (spec §4.3).
//
// Native Google SDK KURULU DEĞİL (spec §4.3 önerisi @react-native-google-signin/google-signin
// eklenmedi — yeni bağımlılık yasak). iOS'taki WebView + GSI (Google Identity Services) yöntemi
// birebir taşınır: inline HTML (baseUrl https://www.otomenzil.com) accounts.google.com/gsi/client
// script'ini yükler, initialize+renderButton çağırır, callback ID-token (JWT) credential'ını
// ReactNativeWebView.postMessage ile geri gönderir → authStore.googleLogin(credential).
//
// WIRING (Wave 6 — AuthModal Google butonu yer tutucusu):
//   <GoogleSignInSheet
//     visible={googleSheetOpen}
//     mode="signin" | "signup"
//     googleClientId={nav.appSettings?.googleClientId}
//     onClose={() => setGoogleSheetOpen(false)}
//   />
//   - visible: modal görünürlüğü (çağıran state).
//   - googleClientId: settings.googleClientId; yoksa yapılandırma mesajı gösterilir.
//   - Başarılı credential → içeride authStore.googleLogin çağrılır; başarıda onClose otomatik.
//   - onClose: kullanıcı "Kapat" veya başarı sonrası.

import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { Icon } from '../../components';
import { siteBaseURL } from '../../config';
import { useAuthStore } from '../../stores';
import { radii, useTheme, webFont } from '../../theme';

export type GoogleSignInMode = 'signin' | 'signup';

export interface GoogleSignInSheetProps {
  visible: boolean;
  mode: GoogleSignInMode;
  googleClientId?: string;
  onClose: () => void;
}

interface BridgeMessage {
  type: 'credential' | 'error';
  credential?: string;
  message?: string;
}

/** WebView köprü mesajını çöz (credential JWT veya hata). */
function parseMessage(raw: string): BridgeMessage | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && 'type' in parsed) {
      const obj = parsed as Record<string, unknown>;
      if (obj.type === 'credential' && typeof obj.credential === 'string') {
        return { type: 'credential', credential: obj.credential };
      }
      if (obj.type === 'error') {
        return { type: 'error', message: typeof obj.message === 'string' ? obj.message : undefined };
      }
    }
  } catch {
    // Bazı GSI derlemeleri düz credential string'i gönderebilir.
    if (raw.length > 0 && !raw.startsWith('{')) return { type: 'credential', credential: raw };
  }
  return null;
}

/** GSI HTML sayfası — inline script, initialize + renderButton, callback postMessage. */
function buildGsiHtml(clientId: string, mode: GoogleSignInMode, isDark: boolean): string {
  const text = mode === 'signup' ? 'signup_with' : 'signin_with';
  const bg = isDark ? '#0F1114' : '#FFFFFF';
  const fg = isDark ? '#E7E5E4' : '#1C1917';
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <meta name="color-scheme" content="${isDark ? 'dark' : 'light'}" />
  <script src="https://accounts.google.com/gsi/client" async defer></script>
  <style>
    html,body{margin:0;padding:0;background:${bg};color:${fg};font-family:-apple-system,system-ui,sans-serif;}
    .wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:32px 20px;text-align:center;}
    .copy{font-size:14px;line-height:1.4;opacity:0.8;}
    #btn{min-height:44px;}
  </style>
</head>
<body>
  <div class="wrap">
    <p class="copy">Devam etmek için Google hesabınızı seçin.</p>
    <div id="btn"></div>
  </div>
  <script>
    function post(payload){
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
    }
    function onCredential(response){
      if (response && response.credential) {
        post({ type: 'credential', credential: response.credential });
      } else {
        post({ type: 'error', message: 'Google kimlik doğrulaması tamamlanamadı.' });
      }
    }
    function init(){
      if (!window.google || !google.accounts || !google.accounts.id) {
        setTimeout(init, 300);
        return;
      }
      try {
        google.accounts.id.initialize({ client_id: ${JSON.stringify(clientId)}, callback: onCredential });
        google.accounts.id.renderButton(document.getElementById('btn'), {
          type: 'standard', theme: 'outline', size: 'large', text: '${text}', shape: 'rectangular', locale: 'tr'
        });
      } catch (e) {
        post({ type: 'error', message: 'Google oturumu başlatılamadı.' });
      }
    }
    init();
  </script>
</body>
</html>`;
}

export function GoogleSignInSheet({
  visible,
  mode,
  googleClientId,
  onClose,
}: GoogleSignInSheetProps): React.JSX.Element {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const source = useMemo(() => {
    if (!googleClientId) return null;
    return {
      html: buildGsiHtml(googleClientId, mode, isDark),
      baseUrl: `${siteBaseURL}/`,
    };
  }, [googleClientId, mode, isDark]);

  const onMessage = useCallback(
    async (event: WebViewMessageEvent) => {
      const msg = parseMessage(event.nativeEvent.data);
      if (msg === null) return;
      if (msg.type === 'error') {
        setError(msg.message ?? 'Google ile giriş tamamlanamadı.');
        return;
      }
      if (msg.type === 'credential' && msg.credential) {
        setBusy(true);
        setError(null);
        const ok = await useAuthStore.getState().googleLogin(msg.credential);
        setBusy(false);
        if (ok) {
          onClose();
        } else {
          setError(useAuthStore.getState().lastError ?? 'Google ile giriş tamamlanamadı.');
        }
      }
    },
    [onClose],
  );

  const title = mode === 'signup' ? 'Google ile Kaydol' : 'Google ile Giriş';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
          onPress={onClose}
          accessibilityLabel="Kapat"
        />
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.cardBackground, paddingBottom: insets.bottom + 16 },
          ]}
        >
          <View style={styles.header}>
            <Text style={[webFont(15, 900), { color: colors.stone900 }]}>{title}</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Kapat" hitSlop={8}>
              <Icon name="close" size={20} color={colors.stone500} />
            </Pressable>
          </View>

          {source === null ? (
            <Text style={[webFont(13, 600), styles.centered, { color: colors.stone500 }]}>
              Google ile giriş yapılandırması yükleniyor…
            </Text>
          ) : (
            <View style={styles.webWrap}>
              <WebView
                originWhitelist={['*']}
                source={source}
                onMessage={(e) => void onMessage(e)}
                javaScriptEnabled
                domStorageEnabled
                thirdPartyCookiesEnabled
                style={styles.web}
              />
              {busy ? (
                <View style={[styles.busyOverlay, { backgroundColor: colors.cardBackground }]}>
                  <ActivityIndicator size="large" color={colors.emerald600} />
                </View>
              ) : null}
            </View>
          )}

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.dangerBackground }]}>
              <Text style={[webFont(12, 600), { color: colors.dangerForeground }]}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Kapat"
            style={({ pressed }) => [
              styles.cancel,
              { backgroundColor: colors.inputBackground, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[webFont(12, 800), { color: colors.stone700 }]}>Kapat</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  centered: {
    textAlign: 'center',
    paddingVertical: 24,
  },
  webWrap: {
    height: 360,
    borderRadius: radii.inner,
    overflow: 'hidden',
  },
  web: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  busyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.85,
  },
  errorBox: {
    borderRadius: radii.button,
    padding: 12,
  },
  cancel: {
    borderRadius: radii.button,
    paddingVertical: 13,
    alignItems: 'center',
  },
});
