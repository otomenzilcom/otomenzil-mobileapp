// ToastBannerView — iOS toast (spec 03 §5.1, z-210).
//
// authStore logoutToastMessage / favoriteToastMessage kaynaklarını dinler; 2.5 sn sonra otomatik
// gizlenir (clearToasts). Alt-orta yüzen kapsül.

import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '../stores';
import { radii, shadows, useTheme, webFont } from '../theme';

const AUTO_HIDE_MS = 2500;

export function ToastBanner(): React.JSX.Element | null {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const logoutToast = useAuthStore((s) => s.logoutToastMessage);
  const favoriteToast = useAuthStore((s) => s.favoriteToastMessage);
  const clearToasts = useAuthStore((s) => s.clearToasts);

  const message = logoutToast ?? favoriteToast;

  useEffect(() => {
    if (message === null || message === undefined) return;
    const timer = setTimeout(() => clearToasts(), AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [message, clearToasts]);

  if (message === null || message === undefined) return null;

  return (
    <View style={[styles.wrap, { bottom: insets.bottom + 88 }]} pointerEvents="none">
      <View style={[styles.toast, shadows.toast, { backgroundColor: colors.stone950 }]}>
        <Text style={[webFont(13, 600), { color: '#FFFFFF' }]}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 210,
  },
  toast: {
    borderRadius: radii.button,
    paddingVertical: 12,
    paddingHorizontal: 20,
    maxWidth: '88%',
  },
});
