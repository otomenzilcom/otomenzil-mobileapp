// SiteLogoView — iOS SiteLogoView karşılığı (spec 03 §5.3).
//
// Uzak logo (theme setting, dark-mode varyantı) varsa expo-image ile çizer; yoksa fallback
// wordmark: emerald yuvarlak kare + gauge ikonu + "oto"(stone900)+"menzil"(emerald)+".com"
// (stone400) + tagline "ELEKTRİKLİ MOBİLİTE". Logo URL çözümü navigationStore.resolvedLogoURL
// ve appSettings üzerinden (dark varyant tercihli, http→https).

import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { httpsUrl } from '../models/decode';
import { useNavigationStore } from '../stores';
import { useTheme, webFont } from '../theme';
import { Glyph } from './NavIcon';

/** Aktif temaya göre logo URL'i seçer (dark → light → scraped), http→https. */
function resolveLogoURL(isDark: boolean): string | undefined {
  const { appSettings, resolvedLogoURL } = useNavigationStore.getState();
  const dark = httpsUrl(appSettings?.generalLogoDarkUrl);
  const light = httpsUrl(appSettings?.generalLogoUrl);
  const scraped = resolvedLogoURL ?? undefined;
  if (isDark && dark) return dark;
  return light ?? scraped ?? (isDark ? dark : undefined);
}

export interface SiteLogoProps {
  onPress: () => void;
}

export function SiteLogo({ onPress }: SiteLogoProps): React.JSX.Element {
  const { colors, isDark } = useTheme();
  const logoURL = resolveLogoURL(isDark);

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Ana sayfa">
      {logoURL ? (
        <Image source={{ uri: logoURL }} style={styles.remoteLogo} contentFit="contain" />
      ) : (
        <View style={styles.fallback}>
          <View style={[styles.mark, { backgroundColor: colors.emerald600 }]}>
            <Glyph name="speedometer" size={18} color="#FFFFFF" />
          </View>
          <View>
            <View style={styles.wordmarkRow}>
              <Text style={[webFont(18, 700), { color: colors.stone900 }]}>oto</Text>
              <Text style={[webFont(18, 700), { color: colors.emerald600 }]}>menzil</Text>
              <Text style={[webFont(18, 700), { color: colors.stone400 }]}>.com</Text>
            </View>
            <Text style={[webFont(8, 600), styles.tagline, { color: colors.stone500 }]}>
              ELEKTRİKLİ MOBİLİTE
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  remoteLogo: {
    height: 36,
    width: 132,
  },
  fallback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mark: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  tagline: {
    letterSpacing: 1.6,
  },
});
