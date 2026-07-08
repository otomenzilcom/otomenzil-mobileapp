// AdSlotView — iOS reklam alanı (spec §4.3).
//
// mode == "image": görsel scaledToFit radius card, opsiyonel link. "code": ham HTML bare WebView
// (minHeight 250 detailSidebar, else 90). "adsense": <ins class="adsbygoogle" ...> aynı WebView'de
// (iOS gibi script enjekte EDİLMEZ — bilinçli parite: boş kalır). Aksi/disabled/nil → placeholder.
// Placeholder iletişim linkine gider (contactURL ?? "{site}/iletisim/").

import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { siteBaseURL } from '../config';
import type { AdSlotConfig, AdSlotKey } from '../models/adSlots';
import { adSlotPlaceholders } from '../models/adSlots';
import { httpsUrl } from '../models/decode';
import { radii, useTheme, webFont } from '../theme';
import { CachedImage } from './CachedImage';

export interface AdSlotProps {
  slot: AdSlotKey;
  config?: AdSlotConfig;
  contactURL?: string;
  adsensePublisherId?: string;
}

/** code/adsense WebView için tam sayfa HTML. */
function adHtml(inner: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0}img{max-width:100%}</style></head><body>${inner}</body></html>`;
}

export function AdSlot({
  slot,
  config,
  contactURL,
  adsensePublisherId,
}: AdSlotProps): React.JSX.Element {
  const { colors } = useTheme();
  const placeholder = adSlotPlaceholders[slot];
  const contact = contactURL ?? `${siteBaseURL}/iletisim/`;
  const mode = config?.mode;

  // ── image ──
  if (mode === 'image' && config?.image) {
    const image = (
      <CachedImage
        uri={config.image}
        contentFit="contain"
        style={styles.image}
        placeholderColor={colors.stone100}
        accessibilityLabel={placeholder.badge}
      />
    );
    const link = httpsUrl(config.link);
    if (link) {
      return (
        <Pressable onPress={() => void Linking.openURL(link)} accessibilityRole="button">
          {image}
        </Pressable>
      );
    }
    return image;
  }

  // ── code ──
  if (mode === 'code' && config?.code) {
    const minHeight = slot === 'detail_sidebar' ? 250 : 90;
    return (
      <View style={{ minHeight }}>
        <WebView
          originWhitelist={['*']}
          source={{ html: adHtml(config.code) }}
          scrollEnabled={false}
          style={styles.web}
          containerStyle={styles.web}
          androidLayerType="software"
        />
      </View>
    );
  }

  // ── adsense (script enjekte edilmez — iOS ile parite: boş render) ──
  if (mode === 'adsense' && config?.adsenseSlot) {
    const minHeight = slot === 'detail_sidebar' ? 250 : 90;
    const client = adsensePublisherId ? ` data-ad-client="${adsensePublisherId}"` : '';
    const ins = `<ins class="adsbygoogle" style="display:block"${client} data-ad-slot="${config.adsenseSlot}" data-ad-format="auto" data-full-width-responsive="true"></ins>`;
    return (
      <View style={{ minHeight }}>
        <WebView
          originWhitelist={['*']}
          source={{ html: adHtml(ins) }}
          scrollEnabled={false}
          style={styles.web}
          containerStyle={styles.web}
          androidLayerType="software"
        />
      </View>
    );
  }

  // ── placeholder (disabled / nil / bilinmeyen mode) ──
  return placeholder.layout === 'sidebar' ? (
    <Pressable
      onPress={() => void Linking.openURL(contact)}
      accessibilityRole="button"
      accessibilityLabel={placeholder.title}
      style={[styles.sidebarPlaceholder, { backgroundColor: colors.stone50 }]}
    >
      <Text style={[webFont(10, 800), styles.sidebarBadge, { color: colors.stone400 }]}>
        otomenzil sponsor alanı
      </Text>
      <View
        style={[styles.sidebarCta, { backgroundColor: colors.emerald50, borderColor: colors.emerald100 }]}
      >
        <Text style={[webFont(10, 900), { color: colors.emerald700 }]}>{placeholder.cta}</Text>
      </View>
    </Pressable>
  ) : (
    <Pressable
      onPress={() => void Linking.openURL(contact)}
      accessibilityRole="button"
      accessibilityLabel={placeholder.title}
      style={[styles.bannerPlaceholder, { backgroundColor: colors.stone100, borderColor: colors.stone300 }]}
    >
      <View style={[styles.bannerChip, { backgroundColor: colors.stone300 }]}>
        <Text style={[webFont(8, 700), { color: colors.stone600 }]}>{placeholder.badge}</Text>
      </View>
      <Text style={[webFont(11, 900), styles.bannerTitle, { color: colors.stone800 }]}>
        {placeholder.title}
      </Text>
      <Text style={[webFont(10, 800), { color: colors.emerald600 }]}>{placeholder.cta}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    aspectRatio: 970 / 90,
    borderRadius: radii.card,
  },
  web: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  bannerPlaceholder: {
    borderRadius: radii.inner,
    borderWidth: 2,
    borderStyle: 'dashed',
    padding: 16,
    gap: 8,
    alignItems: 'center',
  },
  bannerChip: {
    alignSelf: 'center',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  bannerTitle: {
    textAlign: 'center',
  },
  sidebarPlaceholder: {
    borderRadius: radii.card,
    minHeight: 200,
    padding: 16,
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarBadge: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sidebarCta: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
});
