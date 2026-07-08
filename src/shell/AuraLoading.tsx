// AuraLoadingView + PageLoadingOverlay — iOS AuraLoadingView karşılığı (spec 03 §5.2).
//
// Sayfa-renkli arka plan, 7 çubuklu ses-dalgası animasyonu, opsiyonel marka bloğu ("OTO MENZİL")
// ve mesaj. iOS reanimated öneriyor ama o paket kurulu değil; Wave 3'e bağımlılık eklememek için
// RN yerleşik Animated API kullanılır (7 çubuk, kaydırmalı ease döngüsü). Görsel yaklaşım niyeti
// yakalar; Wave 5 reanimated'a yükseltebilir.

import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { radii, useTheme, webFont } from '../theme';

const BAR_COUNT = 7;
// Çubuk başına staggered süre (iOS 0.55–0.9s ease döngüleri).
const BAR_DURATIONS = [620, 780, 540, 900, 700, 600, 820];

function WaveBar({ index, color }: { index: number; color: string }): React.JSX.Element {
  // useState lazy init — Animated.Value bir kez oluşturulur; ref.current render'da okunmaz.
  const [scale] = useState(() => new Animated.Value(0.3));

  useEffect(() => {
    const duration = BAR_DURATIONS[index % BAR_DURATIONS.length];
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.3,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [index, scale]);

  return (
    <Animated.View
      style={[
        styles.bar,
        { backgroundColor: color, transform: [{ scaleY: scale }] },
      ]}
    />
  );
}

export interface AuraLoadingProps {
  message?: string;
  showBrand?: boolean;
}

/** Animasyonlu yükleme kartı (boot ve sayfa yükleme overlay'i tarafından kullanılır). */
export function AuraLoading({ message, showBrand = false }: AuraLoadingProps): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={[styles.backdrop, { backgroundColor: colors.pageBackground }]}>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.cardBackground, borderColor: colors.border },
        ]}
      >
        <View style={styles.bars}>
          {Array.from({ length: BAR_COUNT }, (_, i) => (
            <WaveBar key={i} index={i} color={colors.emerald500} />
          ))}
        </View>
        {showBrand ? (
          <View style={styles.brand}>
            <Text style={[webFont(18, 700), styles.brandText, { color: colors.stone900 }]}>
              OTO MENZİL
            </Text>
            <Text style={[webFont(11, 500), { color: colors.stone500 }]}>
              Elektrikli araç karşılaştırma platformu
            </Text>
          </View>
        ) : null}
        {message ? (
          <Text style={[webFont(13, 500), styles.message, { color: colors.emerald700 }]}>
            {message}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export interface PageLoadingOverlayProps {
  message: string;
}

/** store.pageLoadingMessage != null iken sayfanın üzerine biner (z-200). */
export function PageLoadingOverlay({ message }: PageLoadingOverlayProps): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: colors.scrim }]}>
      <AuraLoading message={message} />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  overlay: {
    zIndex: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 28,
    paddingHorizontal: 32,
    alignItems: 'center',
    gap: 18,
    minWidth: 220,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    gap: 5,
  },
  bar: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  brand: {
    alignItems: 'center',
    gap: 4,
  },
  brandText: {
    letterSpacing: 4,
  },
  message: {
    textAlign: 'center',
  },
});
