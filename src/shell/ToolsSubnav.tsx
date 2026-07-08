// ToolsSubnavView — iOS ToolsSubnavView "Robotlar" şeridi (spec 03 §5.3).
//
// "Robotlar:" etiketi + yatay kaydırılabilir ToolChip'ler. Chip'ler navigation.secondary'den
// (server-güdümlü; fallback SiteBootstrap.NavigationDefaults). Aktif chip = stone950 bg/white.
// iOS'taki ‹/› ok butonları yerine RN'de doğrudan yatay ScrollView (dokunmatikte kaydırma doğal).

import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { NavItem } from '../models';
import { isAppViewID } from '../models/navigation';
import { useNavigationStore } from '../stores';
import { NavigationDefaults } from '../utils/siteBootstrap';
import { useTheme, webFont } from '../theme';
import { NavIcon } from './NavIcon';
import { ShellPressable } from './ShellPressable';

/** Aktif secondary nav öğelerini çözer (settings.navigation → fallback defaults). */
function secondaryItems(): NavItem[] {
  const settings = useNavigationStore.getState().appSettings;
  return settings?.navigation?.secondary ?? NavigationDefaults.navigation.secondary;
}

export function ToolsSubnav(): React.JSX.Element {
  const { colors } = useTheme();
  const currentView = useNavigationStore((s) => s.currentView);
  const overlay = useNavigationStore((s) => s.overlay);
  const navigate = useNavigationStore((s) => s.navigate);
  const items = secondaryItems();

  return (
    <View style={[styles.strip, { backgroundColor: colors.subnavBackground, borderBottomColor: colors.border }]}>
      <View style={styles.labelRow}>
        <View style={[styles.dot, { backgroundColor: colors.emerald500 }]} />
        <Text style={[webFont(10, 700), styles.label, { color: colors.stone500 }]}>ROBOTLAR:</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {items.map((item) => {
          const active = overlay === null && isAppViewID(item.id) && item.id === currentView;
          return (
            <ShellPressable
              key={item.id}
              onPress={() => {
                if (isAppViewID(item.id)) navigate(item.id);
              }}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.stone950 : colors.cardBackground,
                  borderColor: active ? colors.stone950 : colors.border,
                },
              ]}
              accessibilityLabel={item.title ?? item.label}
            >
              <NavIcon token={item.icon} size={13} color={active ? '#FFFFFF' : colors.stone700} />
              <Text
                style={[webFont(11, 600), { color: active ? '#FFFFFF' : colors.stone700 }]}
                numberOfLines={1}
              >
                {item.label.toUpperCase()}
              </Text>
              {item.badge ? (
                <View style={[styles.badge, { backgroundColor: active ? 'rgba(255,255,255,0.18)' : colors.emerald50 }]}>
                  <Text style={[webFont(8, 700), { color: active ? '#FFFFFF' : colors.emerald700 }]}>
                    {item.badge.toUpperCase()}
                  </Text>
                </View>
              ) : null}
            </ShellPressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    letterSpacing: 0.8,
  },
  chips: {
    alignItems: 'center',
    gap: 8,
    paddingRight: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 260,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
});
