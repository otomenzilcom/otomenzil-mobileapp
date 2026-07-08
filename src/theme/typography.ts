// Outfit tipografi — iOS AppFont.swift `Font.web(size:weight:)` / `webFont` karşılığı.
// Web sitesiyle parite için tüm metinlerde Outfit ailesi kullanılır.

import type { TextStyle } from 'react-native';

/**
 * Yüklenen Outfit ağırlıkları → @expo-google-fonts/outfit aile adları.
 * (Wave 1 kapsamı 400/500/600/700; App.tsx bu dördünü yükler.)
 */
export const fontWeights = {
  400: 'Outfit_400Regular',
  500: 'Outfit_500Medium',
  600: 'Outfit_600SemiBold',
  700: 'Outfit_700Bold',
} as const;

export type LoadedFontWeight = keyof typeof fontWeights;

/** Yüklü ağırlık anahtarları, artan sırada — clamp için. */
const loadedWeights: LoadedFontWeight[] = [400, 500, 600, 700];

export const defaultFontSize = 16;
export const defaultFontFamily = fontWeights[400];

/**
 * Verilen sayısal ağırlığa en yakın YÜKLÜ Outfit ailesini döndürür.
 * iOS'ta heavy(800)/black(900) ağırlıkları tek Regular dosyadan sentezleniyordu;
 * burada bunlar en yakın yüklü aileye (700 Bold) sabitlenir.
 */
export function fontFamilyForWeight(weight: number = 400): string {
  if (weight in fontWeights) {
    return fontWeights[weight as LoadedFontWeight];
  }
  let nearest: LoadedFontWeight = loadedWeights[0];
  for (const candidate of loadedWeights) {
    if (Math.abs(candidate - weight) < Math.abs(nearest - weight)) {
      nearest = candidate;
    }
  }
  return fontWeights[nearest];
}

/**
 * `Font.web(size:weight:)` karşılığı — Outfit ailesi + boyut içeren stil objesi.
 * @param size punto (varsayılan 16)
 * @param weight sayısal ağırlık (varsayılan 400); 800/900 en yakın yüklü aileye clamp'lenir
 */
export function webFont(size: number = defaultFontSize, weight: number = 400): TextStyle {
  return {
    fontFamily: fontFamilyForWeight(weight),
    fontSize: size,
  };
}
