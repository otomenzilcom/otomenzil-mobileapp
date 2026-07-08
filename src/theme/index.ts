// Tema erişim noktası. `useTheme()` çözümlenmiş token'ları döndürür.
//
// Wave 3: karanlık mod artık preferencesStore.darkMode'a bağlıdır (spec §6.2). preferencesStore
// setDarkMode/hydrate, aşağıdaki `useThemeStore`'u da senkron tutar; useThemeStore hook-DIŞI
// tüketiciler (ör. WebView CSS şablonu, imperatif okuma) için kalır. useTheme() hook'u ise
// doğrudan preferencesStore.darkMode'u okur (tek kaynak — çift-kaynak sürüklenmesini önler).

import { usePreferencesStore } from '../stores/preferencesStore';
import { darkColors, lightColors, radii, shadows, gradients, type ThemeColors } from './tokens';
import { useThemeStore } from './themeStore';

/**
 * Hook-dışı tema durumu — themeStore.ts'ten yeniden dışa aktarılır (döngü kırma). WebView CSS
 * şablonu gibi bileşen olmayan tüketiciler `useThemeStore.getState().isDark` okur.
 */
export { useThemeStore };

export interface Theme {
  colors: ThemeColors;
  isDark: boolean;
}

/** Aktif temayı döndürür — preferencesStore.darkMode değişince abone bileşenler render olur. */
export function useTheme(): Theme {
  const isDark = usePreferencesStore((s) => s.darkMode);
  return { colors: isDark ? darkColors : lightColors, isDark };
}

export { lightColors, darkColors, radii, shadows, gradients };
export type { ThemeColors } from './tokens';
export * from './typography';
export * from './avatarTheme';
