// Hook-dışı tema durumu (isDark). preferencesStore tarafından sürülür (setDarkMode/hydrate).
//
// Ayrı modül: theme/index.ts preferencesStore'u, preferencesStore de bu store'u içe aktarır —
// döngüsel bağımlılığı kırmak için isDark durumu buraya çıkarıldı (index.ts ve preferencesStore
// her ikisi de buradan okur; bu modülün geri-bağımlılığı yoktur).

import { create } from 'zustand';

interface ThemeStore {
  isDark: boolean;
  setDark: (isDark: boolean) => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  isDark: false,
  setDark: (isDark: boolean) => set({ isDark }),
}));
