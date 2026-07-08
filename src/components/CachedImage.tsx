// CachedImage — iOS CachedAsyncImage + ImageCache karşılığı (spec §4.1).
//
// iOS özel NSCache (countLimit 200 / 80 MB) yerine expo-image `cachePolicy="memory-disk"`
// kullanılır — kaynak öneriyor (üst küme; disk önbelleği de var). http→https normalize
// (spec bazı görsellerde http verebilir; sunucu hotlink filtresi ve ATS için https zorunlu).

import { Image, type ImageContentFit, type ImageStyle } from 'expo-image';
import { StyleSheet, type StyleProp } from 'react-native';

import { httpsUrl } from '../models/decode';
import { useTheme } from '../theme';

export interface CachedImageProps {
  /** Görsel URL'i (http→https normalize edilir); yok/boş → placeholder rengi. */
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  /** Yer tutucu arka plan rengi (varsayılan tema `imagePlaceholder`). */
  placeholderColor?: string;
  /** expo-image geçiş süresi (ms). */
  transition?: number;
  /** Liste geri-dönüşümü için (aynı hücre farklı URL). */
  recyclingKey?: string;
  accessibilityLabel?: string;
}

/** expo-image sarmalayıcı: memory-disk önbellek + http→https + tema yer tutucu. */
export function CachedImage({
  uri,
  style,
  contentFit = 'cover',
  placeholderColor,
  transition = 180,
  recyclingKey,
  accessibilityLabel,
}: CachedImageProps): React.JSX.Element {
  const { colors } = useTheme();
  const normalized = httpsUrl(uri ?? undefined);
  const placeholder = placeholderColor ?? colors.imagePlaceholder;

  return (
    <Image
      source={normalized ? { uri: normalized } : undefined}
      style={[styles.base, { backgroundColor: placeholder }, style]}
      contentFit={contentFit}
      transition={transition}
      cachePolicy="memory-disk"
      recyclingKey={recyclingKey ?? normalized}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});
