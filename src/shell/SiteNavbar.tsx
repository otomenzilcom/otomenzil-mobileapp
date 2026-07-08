// SiteNavbarView — iOS SiteNavbarView 64pt üst bar + ToolsSubnav (spec 03 §5.3).
//
// Sol: SiteLogo → home. Sağ küme: (1) dark-mode toggle YALNIZCA çıkış yapılmışken (giriş
// yapmış kullanıcı profil popover'dan değiştirir), (2) arama ikonu → openSearchModal,
// (3) profil butonu (giriş: avatar + chevron → popover / çıkış: giriş butonu → openAuth),
// (4) hamburger → openDrawer. Altında ToolsSubnav; alt hairline.

import { StyleSheet, Text, View } from 'react-native';

import { useAuthStore, useNavigationStore, usePreferencesStore } from '../stores';
import { ProfileAvatarTheme } from '../theme/avatarTheme';
import { useTheme, webFont } from '../theme';
import { Glyph } from './NavIcon';
import { ShellPressable } from './ShellPressable';
import { SiteLogo } from './SiteLogo';
import { ToolsSubnav } from './ToolsSubnav';

function IconButton({
  name,
  color,
  bg,
  onPress,
  label,
}: {
  name: React.ComponentProps<typeof Glyph>['name'];
  color: string;
  bg: string;
  onPress: () => void;
  label: string;
}): React.JSX.Element {
  return (
    <ShellPressable onPress={onPress} accessibilityLabel={label} style={[styles.iconButton, { backgroundColor: bg }]}>
      <Glyph name={name} size={20} color={color} />
    </ShellPressable>
  );
}

export function SiteNavbar(): React.JSX.Element {
  const { colors, isDark } = useTheme();
  const isLoggedIn = useAuthStore((s) => s.currentUser !== null);
  const username = useAuthStore((s) => s.currentUser?.username ?? '');
  const avatarColor = useAuthStore((s) => s.currentUser?.avatarColor);
  const popoverOpen = useNavigationStore((s) => s.profilePopoverOpen);
  const toggleDarkMode = usePreferencesStore((s) => s.toggleDarkMode);

  const nav = useNavigationStore.getState();
  const auth = useAuthStore.getState();

  const avatarBg = ProfileAvatarTheme.color(avatarColor);
  const initial = username.trim().charAt(0).toUpperCase() || 'Ü';

  return (
    <View style={[styles.container, { backgroundColor: colors.navBackground, borderBottomColor: colors.border }]}>
      <View style={styles.bar}>
        <SiteLogo onPress={() => nav.navigate('home')} />
        <View style={styles.cluster}>
          {!isLoggedIn ? (
            <IconButton
              name={isDark ? 'sunny' : 'moon'}
              color={colors.stone700}
              bg={colors.inputBackground}
              onPress={toggleDarkMode}
              label={isDark ? 'Açık moda geç' : 'Koyu moda geç'}
            />
          ) : null}
          <IconButton
            name="search"
            color={colors.stone700}
            bg={colors.inputBackground}
            onPress={() => nav.openSearchModal()}
            label="Gelişmiş arama"
          />
          {isLoggedIn ? (
            <ShellPressable
              onPress={() => nav.toggleProfilePopover()}
              accessibilityLabel="Profil menüsü"
              style={styles.profileButton}
            >
              <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
                <Text style={[webFont(15, 700), { color: '#FFFFFF' }]}>{initial}</Text>
              </View>
              <Glyph
                name={popoverOpen ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={popoverOpen ? colors.emerald600 : colors.stone500}
              />
            </ShellPressable>
          ) : (
            <IconButton
              name="person"
              color={colors.emerald600}
              bg={colors.emerald50}
              onPress={() => auth.openAuth()}
              label="Giriş yap"
            />
          )}
          <IconButton
            name="menu"
            color={colors.stone700}
            bg={colors.inputBackground}
            onPress={() => nav.openDrawer()}
            label="Menü"
          />
        </View>
      </View>
      <ToolsSubnav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bar: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  cluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
