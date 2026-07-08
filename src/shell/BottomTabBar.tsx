// BottomTabBarView — iOS BottomTabBarView yüzen kapsül (spec 03 §5.5).
//
// 6 sekme (home/search/cars/compare/blog/garage). Aktiflik kuralları spec tablosu:
//  - home: currentView==home && overlay yok
//  - search: searchModalOpen
//  - cars: currentView==search && !searchModal && overlay yok
//  - compare: currentView==compare && overlay yok; count kapsülü (min(count,9))
//  - blog: currentView==blog && overlay yok
//  - garage: currentView==garage && overlay yok; garaj doluysa nokta rozeti
// Güvenli alan alt boşluğu + 6pt. Görünürlük kuralı AppShell'de (bu bileşen çizilirse görünür).

import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppView, type AppViewID } from '../models/navigation';
import { useAuthStore, useNavigationStore } from '../stores';
import { useTheme, webFont } from '../theme';
import { ShellPressable } from './ShellPressable';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface TabDef {
  id: string;
  label: string;
  icon: IoniconName;
}

const TABS: TabDef[] = [
  { id: 'home', label: 'Ana Sayfa', icon: 'home' },
  { id: 'search', label: 'Ara', icon: 'search' },
  { id: 'cars', label: 'Araçlar', icon: 'car' },
  { id: 'compare', label: 'Karşılaştır', icon: 'swap-horizontal' },
  { id: 'blog', label: 'Blog', icon: 'newspaper' },
  { id: 'garage', label: 'Garajım', icon: 'car-sport' },
];

export function BottomTabBar(): React.JSX.Element {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const currentView = useNavigationStore((s) => s.currentView);
  const overlay = useNavigationStore((s) => s.overlay);
  const searchModalOpen = useNavigationStore((s) => s.searchModalOpen);
  const compareCount = useNavigationStore((s) => s.compareList.length);
  const garageCount = useAuthStore((s) => s.garageCarIds.length);
  const nav = useNavigationStore.getState();

  const noOverlay = overlay === null;

  function isActive(id: string): boolean {
    switch (id) {
      case 'home':
        return currentView === AppView.home && noOverlay && !searchModalOpen;
      case 'search':
        return searchModalOpen;
      case 'cars':
        return currentView === AppView.search && !searchModalOpen && noOverlay;
      case 'compare':
        return currentView === AppView.compare && noOverlay;
      case 'blog':
        return currentView === AppView.blog && noOverlay;
      case 'garage':
        return currentView === AppView.garage && noOverlay;
      default:
        return false;
    }
  }

  function onPress(id: string): void {
    if (id === 'search') {
      nav.openSearchModal();
      return;
    }
    const route: Record<string, AppViewID> = {
      home: AppView.home,
      cars: AppView.search,
      compare: AppView.compare,
      blog: AppView.blog,
      garage: AppView.garage,
    };
    const target = route[id];
    if (target) nav.navigate(target);
  }

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom + 6 }]} pointerEvents="box-none">
      <View style={[styles.bar, { backgroundColor: colors.tabBarSurface, borderColor: colors.tabBarBorder }]}>
        {TABS.map((tab) => {
          const active = isActive(tab.id);
          const fg = active ? colors.tabBarActiveForeground : colors.tabBarInactiveForeground;
          return (
            <ShellPressable
              key={tab.id}
              onPress={() => onPress(tab.id)}
              accessibilityLabel={tab.label}
              style={[styles.tab, active ? { backgroundColor: colors.tabBarActiveBackground } : null]}
            >
              <View>
                <Ionicons name={tab.icon} size={20} color={fg} />
                {tab.id === 'compare' && compareCount > 0 ? (
                  <View style={[styles.countBadge, { backgroundColor: colors.emerald600 }]}>
                    <Text style={[webFont(9, 700), { color: '#FFFFFF' }]}>
                      {Math.min(compareCount, 9)}
                    </Text>
                  </View>
                ) : null}
                {tab.id === 'garage' && garageCount > 0 ? (
                  <View
                    style={[
                      styles.dotBadge,
                      { backgroundColor: colors.emerald500, borderColor: colors.cardBackground },
                    ]}
                  />
                ) : null}
              </View>
              <Text style={[webFont(8, 700), styles.label, { color: fg }]} numberOfLines={1}>
                {tab.label}
              </Text>
            </ShellPressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 2,
    maxWidth: '94%',
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 2,
    minWidth: 52,
  },
  label: {
    textAlign: 'center',
  },
  countBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  dotBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
  },
});
