// ProfileMenuPopover — iOS profil popover'ı (spec 03 §5.6).
//
// Sağ-üst 272pt kart (z-151) + görünmez tap-catcher (z-150). Header: avatar + kullanıcı adı +
// @slug/email. Satırlar: Profilim / Garajım / Ayarlar. Gece modu toggle kartı. Çıkış yap (kırmızı).
// Tüm satırlar popover'ı kapatır. Yalnızca giriş yapılmışken çizilir.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppView, type AppViewID } from '../models/navigation';
import { useAuthStore, useNavigationStore, usePreferencesStore } from '../stores';
import { ProfileAvatarTheme, radii, useTheme, webFont } from '../theme';
import { Glyph } from './NavIcon';
import { ShellPressable } from './ShellPressable';

interface MenuRow {
  target: AppViewID;
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof Glyph>['name'];
}

const MENU_ROWS: MenuRow[] = [
  { target: AppView.profile, title: 'Profilim', subtitle: 'Rozetler ve istatistikler', icon: 'person' },
  { target: AppView.garage, title: 'Garajım', subtitle: 'Araçlar, menzil, istasyonlar', icon: 'car' },
  { target: AppView.settings, title: 'Ayarlar', subtitle: 'Hesap, tema, favoriler', icon: 'settings' },
];

export function ProfileMenuPopover(): React.JSX.Element | null {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const open = useNavigationStore((s) => s.profilePopoverOpen);
  const isLoggedIn = useAuthStore((s) => s.currentUser !== null);
  const username = useAuthStore((s) => s.currentUser?.username ?? 'Üye');
  const memberSlug = useAuthStore((s) => s.currentUser?.memberSlug);
  const email = useAuthStore((s) => s.currentUser?.email ?? '');
  const avatarColor = useAuthStore((s) => s.currentUser?.avatarColor);
  const toggleDarkMode = usePreferencesStore((s) => s.toggleDarkMode);

  const nav = useNavigationStore.getState();
  const auth = useAuthStore.getState();

  if (!open || !isLoggedIn) return null;

  const initial = username.trim().charAt(0).toUpperCase() || 'Ü';
  const subtitle = memberSlug ? `@${memberSlug}` : email;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* z-150 görünmez tap-catcher */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => nav.closeProfilePopover()}
        accessibilityLabel="Menüyü kapat"
      />
      <View
        style={[
          styles.popover,
          {
            top: insets.top + 58,
            backgroundColor: colors.cardBackground,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={[styles.header, { backgroundColor: colors.emerald50 }]}>
          <View style={[styles.avatar, { backgroundColor: ProfileAvatarTheme.color(avatarColor) }]}>
            <Text style={[webFont(18, 700), { color: '#FFFFFF' }]}>{initial}</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={[webFont(14, 700), { color: colors.stone900 }]} numberOfLines={1}>
              {username}
            </Text>
            <Text style={[webFont(11, 500), { color: colors.stone500 }]} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
        </View>

        {MENU_ROWS.map((row) => (
          <ShellPressable
            key={row.target}
            onPress={() => {
              nav.closeProfilePopover();
              nav.navigate(row.target);
            }}
            accessibilityLabel={row.title}
            style={styles.row}
          >
            <View style={[styles.iconTile, { backgroundColor: colors.inputBackground }]}>
              <Glyph name={row.icon} size={16} color={colors.stone700} />
            </View>
            <View style={styles.rowText}>
              <Text style={[webFont(13, 600), { color: colors.stone900 }]}>{row.title}</Text>
              <Text style={[webFont(11, 500), { color: colors.stone500 }]}>{row.subtitle}</Text>
            </View>
          </ShellPressable>
        ))}

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <ShellPressable
          onPress={toggleDarkMode}
          accessibilityLabel={isDark ? 'Gündüz moduna geç' : 'Gece moduna geç'}
          style={[styles.themeCard, { backgroundColor: colors.inputBackground }]}
        >
          <View style={styles.rowText}>
            <Text style={[webFont(13, 600), { color: colors.stone900 }]}>
              {isDark ? 'Gündüz modu' : 'Gece modu'}
            </Text>
            <Text style={[webFont(11, 500), { color: colors.stone500 }]}>
              {isDark ? 'Açık temaya geç' : 'Koyu temaya geç'}
            </Text>
          </View>
          <Glyph name={isDark ? 'sunny' : 'moon'} size={18} color={colors.emerald600} />
        </ShellPressable>

        <ShellPressable
          onPress={() => {
            nav.closeProfilePopover();
            void auth.logout();
          }}
          accessibilityLabel="Çıkış yap"
          style={[styles.logout, { backgroundColor: colors.dangerBackground }]}
        >
          <Glyph name="log-out" size={16} color={colors.red600} />
          <Text style={[webFont(13, 700), { color: colors.red600 }]}>Çıkış yap</Text>
        </ShellPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  popover: {
    position: 'absolute',
    right: 14,
    width: 272,
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    paddingBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  iconTile: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 6,
    marginHorizontal: 14,
  },
  themeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radii.button,
    padding: 12,
    marginHorizontal: 14,
    marginBottom: 8,
  },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radii.button,
    paddingVertical: 12,
    marginHorizontal: 14,
  },
});
