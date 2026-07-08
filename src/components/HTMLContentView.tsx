// HTMLContentView — iOS HTMLContentView (WKWebView) karşılığı (spec §4.2).
//
// react-native-webview ile HTML prose (blog/legal) render eder. Yükseklik JS köprüsüyle kendini
// bildirir (postMessage → onMessage); +12 pt eklenir, ≤1 pt delta yok sayılır (iOS debounce).
// Tema-duyarlı CSS themeStore.isDark üzerinden (hook-dışı okuma da mümkün ama burada prop). Link
// yakalama: dış linkler Linking, iç car/blog linkleri navigationStore openCarDetail/openBlogDetail.

import { useCallback, useMemo, useRef, useState } from 'react';
import { Linking, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { WebViewNavigation } from 'react-native-webview/lib/WebViewTypes';

import { siteBaseURL } from '../config';
import { useNavigationStore } from '../stores';
import { useTheme } from '../theme';
import {
  buildHtmlDocument,
  buildInjectedJs,
  parseBridgeMessage,
  type ProseStyle,
} from './htmlContentTemplate';

export interface HTMLContentViewProps {
  html: string;
  proseStyle?: ProseStyle;
  /** Başlangıç/min yükseklik (legal 420, article daha küçük). */
  initialHeight?: number;
  /** Bir başlığın ölçülen y offset'i (parent native ScrollView'i kaydırmak için). */
  onHeadingOffset?: (id: string, offset: number) => void;
  style?: StyleProp<ViewStyle>;
}

/** iç link mi? (site kökü + car/blog slug yolu → overlay). */
function interpretInternalLink(url: string): { kind: 'car' | 'blog'; slug: string } | null {
  let path: string;
  try {
    const parsed = new URL(url, siteBaseURL);
    // Yalnızca kendi sitemizin linkleri iç kabul edilir.
    if (parsed.hostname !== new URL(siteBaseURL).hostname) return null;
    path = parsed.pathname;
  } catch {
    return null;
  }
  const segments = path.split('/').filter((s) => s.length > 0);
  if (segments.length < 2) return null;
  const [head, slug] = segments;
  if ((head === 'elektrikli-arabalar' || head === 'arac' || head === 'car') && slug) {
    return { kind: 'car', slug };
  }
  if ((head === 'blog' || head === 'haber') && slug) {
    return { kind: 'blog', slug };
  }
  return null;
}

export function HTMLContentView({
  html,
  proseStyle = 'article',
  initialHeight = 200,
  onHeadingOffset,
  style,
}: HTMLContentViewProps): React.JSX.Element {
  const { isDark } = useTheme();
  const [height, setHeight] = useState(initialHeight);
  const heightRef = useRef(initialHeight);

  const source = useMemo(
    () => ({
      html: buildHtmlDocument({ html, isDark, proseStyle }),
      baseUrl: `${siteBaseURL}/`,
    }),
    [html, isDark, proseStyle],
  );

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const msg = parseBridgeMessage(event.nativeEvent.data);
      if (msg === null) return;
      if (msg.type === 'height') {
        const next = msg.height + 12; // iOS: height + 12
        if (Math.abs(next - heightRef.current) > 1) {
          heightRef.current = next;
          setHeight(next);
        }
      } else if (msg.type === 'heading' && msg.found) {
        onHeadingOffset?.(msg.id, msg.offset);
      }
    },
    [onHeadingOffset],
  );

  const onShouldStartLoadWithRequest = useCallback((request: WebViewNavigation): boolean => {
    const url = request.url;
    // İlk yükleme (about:blank / data / baseUrl) → izin ver.
    if (url === 'about:blank' || url.startsWith('data:') || url.startsWith('file:')) {
      return true;
    }
    const internal = interpretInternalLink(url);
    const nav = useNavigationStore.getState();
    if (internal) {
      if (internal.kind === 'car') nav.openCarDetail(internal.slug);
      else nav.openBlogDetail(internal.slug);
      return false;
    }
    if (url.startsWith('http')) {
      void Linking.openURL(url);
      return false;
    }
    return false;
  }, []);

  return (
    <View style={[{ height }, style]}>
      <WebView
        originWhitelist={['*']}
        source={source}
        injectedJavaScript={buildInjectedJs()}
        onMessage={onMessage}
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        style={styles.web}
        containerStyle={styles.web}
        androidLayerType="software"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  web: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
