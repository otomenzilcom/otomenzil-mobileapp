// MobileDrawerView — iOS sağ-yan drawer (spec 03 §5.4).
//
// Header: SiteLogo (→ home + close) + X. Body: "GELİŞMİŞ ARAMA" butonu → search modal;
// "Ana Gezinti" (navigation.primary; compare satırı count rozeti); "Robotlar & Rehberler"
// (navigation.secondary, badge). Footer: çıkış yapılmışsa üye girişi + dark toggle; collapsible
// karşılaştır bloğu (CompareMenuPanel inline); "HEMEN ARAÇ BUL"; legal 2×2; alt yazı.
// Her aksiyon closeDrawer çağırır.

import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { NavItem } from '../models';
import { AppView, isAppViewID, type AppViewID } from '../models/navigation';
import { useAuthStore, useNavigationStore, usePreferencesStore } from '../stores';
import { NavigationDefaults } from '../utils/siteBootstrap';
import { radii, useTheme, webFont } from '../theme';
import { CompareMenuPanel } from './CompareMenuPanel';
import { Glyph, NavIcon } from './NavIcon';
import { ShellPressable } from './ShellPressable';
import { SiteLogo } from './SiteLogo';

function primaryItems(): NavItem[] {
  const settings = useNavigationStore.getState().appSettings;
  return settings?.navigation?.primary ?? NavigationDefaults.navigation.primary;
}
function secondaryItems(): NavItem[] {
  const settings = useNavigationStore.getState().appSettings;
  return settings?.navigation?.secondary ?? NavigationDefaults.navigation.secondary;
}

const LEGAL_LINKS: { id: AppViewID; label: string }[] = [
  { id: 'about', label: 'Hakkımızda' },
  { id: 'contact', label: 'İletişim' },
  { id: 'cookies', label: 'Çerez Politikası' },
  { id: 'privacy', label: 'Gizlilik Politikası' },
];

export function MobileDrawer(): React.JSX.Element | null {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const open = useNavigationStore((s) => s.drawerOpen);
  const currentView = useNavigationStore((s) => s.currentView);
  const compareCount = useNavigationStore((s) => s.compareList.length);
  const isLoggedIn = useAuthStore((s) => s.currentUser !== null);
  const toggleDarkMode = usePreferencesStore((s) => s.toggleDarkMode);
  const [compareOpen, setCompareOpen] = useState(false);

  const nav = useNavigationStore.getState();
  const auth = useAuthStore.getState();

  if (!open) return null;

  const goto = (id: AppViewID) => {
    nav.navigate(id);
    nav.closeDrawer();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => nav.closeDrawer()}>
      <View style={styles.root}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
          onPress={() => nav.closeDrawer()}
          accessibilityLabel="Menüyü kapat"
        />
        <View
          style={[
            styles.drawer,
            {
              backgroundColor: colors.cardBackground,
              paddingTop: insets.top + 12,
              paddingBottom: insets.bottom + 12,
            },
          ]}
        >
          <View style={styles.header}>
            <SiteLogo
              onPress={() => {
                nav.navigate('home');
                nav.closeDrawer();
              }}
            />
            <ShellPressable onPress={() => nav.closeDrawer()} accessibilityLabel="Kapat" style={styles.closeButton}>
              <Glyph name="close" size={22} color={colors.stone700} />
            </ShellPressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <ShellPressable
              onPress={() => {
                nav.openSearchModal();
                nav.closeDrawer();
              }}
              accessibilityLabel="Gelişmiş arama"
              style={[styles.searchButton, { backgroundColor: colors.emerald50 }]}
            >
              <Glyph name="search" size={18} color={colors.emerald700} />
              <Text style={[webFont(13, 700), { color: colors.emerald700 }]}>GELİŞMİŞ ARAMA</Text>
            </ShellPressable>

            <Text style={[webFont(10, 700), styles.sectionLabel, { color: colors.stone500 }]}>
              ANA GEZİNTİ
            </Text>
            {primaryItems().map((item) => {
              const active = isAppViewID(item.id) && item.id === currentView;
              const showCount = item.id === AppView.compare && compareCount > 0;
              return (
                <ShellPressable
                  key={item.id}
                  onPress={() => {
                    if (isAppViewID(item.id)) goto(item.id);
                  }}
                  accessibilityLabel={item.label}
                  style={[
                    styles.navRow,
                    active ? { backgroundColor: colors.stone950 } : null,
                  ]}
                >
                  <NavIcon token={item.icon} size={18} color={active ? '#FFFFFF' : colors.stone700} />
                  <Text style={[webFont(13, 600), styles.navRowLabel, { color: active ? '#FFFFFF' : colors.stone900 }]}>
                    {item.label.toUpperCase()}
                  </Text>
                  {showCount ? (
                    <View style={[styles.rowBadge, { backgroundColor: colors.red600 }]}>
                      <Text style={[webFont(9, 700), { color: '#FFFFFF' }]}>{compareCount}</Text>
                    </View>
                  ) : null}
                </ShellPressable>
              );
            })}

            <Text style={[webFont(10, 700), styles.sectionLabel, { color: colors.stone500 }]}>
              ROBOTLAR & REHBERLER
            </Text>
            {secondaryItems().map((item) => {
              const active = isAppViewID(item.id) && item.id === currentView;
              return (
                <ShellPressable
                  key={item.id}
                  onPress={() => {
                    if (isAppViewID(item.id)) goto(item.id);
                  }}
                  accessibilityLabel={item.title ?? item.label}
                  style={[
                    styles.navRow,
                    active ? { backgroundColor: colors.stone100 } : null,
                  ]}
                >
                  <NavIcon token={item.icon} size={17} color={colors.stone700} />
                  <Text style={[webFont(12, 600), styles.navRowLabel, { color: colors.stone900 }]} numberOfLines={1}>
                    {item.label}
                  </Text>
                  {item.badge ? (
                    <View style={[styles.toolBadge, { backgroundColor: colors.emerald50 }]}>
                      <Text style={[webFont(8, 700), { color: colors.emerald700 }]}>
                        {item.badge.toUpperCase()}
                      </Text>
                    </View>
                  ) : null}
                </ShellPressable>
              );
            })}

            {/* Footer */}
            {!isLoggedIn ? (
              <>
                <ShellPressable
                  onPress={() => {
                    auth.openAuth('Üye girişi yaparak favorilerinizi ve yorumlarınızı senkronize edin.');
                    nav.closeDrawer();
                  }}
                  accessibilityLabel="Üye girişi yap"
                  style={[styles.footerPrimary, { backgroundColor: colors.emerald600 }]}
                >
                  <Glyph name="person" size={16} color="#FFFFFF" />
                  <Text style={[webFont(12, 700), { color: '#FFFFFF' }]}>ÜYE GİRİŞİ YAP</Text>
                </ShellPressable>
                <ShellPressable
                  onPress={toggleDarkMode}
                  accessibilityLabel={isDark ? 'Açık moda geç' : 'Koyu moda geç'}
                  style={[styles.footerSecondary, { borderColor: colors.border }]}
                >
                  <Glyph name={isDark ? 'sunny' : 'moon'} size={16} color={colors.stone700} />
                  <Text style={[webFont(12, 600), { color: colors.stone900 }]}>
                    {isDark ? 'Açık Mod' : 'Koyu Mod'}
                  </Text>
                </ShellPressable>
              </>
            ) : null}

            <ShellPressable
              onPress={() => setCompareOpen((v) => !v)}
              accessibilityLabel="Karşılaştırma listesi"
              style={[styles.footerSecondary, { borderColor: colors.border }]}
            >
              <Glyph name="swap-horizontal" size={16} color={colors.stone700} />
              <Text style={[webFont(12, 700), styles.navRowLabel, { color: colors.stone900 }]}>
                {`KARŞILAŞTIR (${compareCount})`}
              </Text>
              <Glyph name={compareOpen ? 'chevron-up' : 'chevron-down'} size={14} color={colors.stone500} />
            </ShellPressable>
            {compareOpen ? (
              <CompareMenuPanel onClose={() => setCompareOpen(false)} onNavigated={() => nav.closeDrawer()} />
            ) : null}

            <ShellPressable
              onPress={() => goto(AppView.search)}
              accessibilityLabel="Hemen araç bul"
              style={[styles.footerPrimary, { backgroundColor: colors.inverseButtonBackground }]}
            >
              <Text style={[webFont(12, 700), { color: colors.inverseButtonForeground }]}>HEMEN ARAÇ BUL</Text>
              <Glyph name="arrow-forward" size={16} color={colors.inverseButtonForeground} />
            </ShellPressable>

            <View style={styles.legalGrid}>
              {LEGAL_LINKS.map((link) => (
                <ShellPressable
                  key={link.id}
                  onPress={() => goto(link.id)}
                  accessibilityLabel={link.label}
                  style={[styles.legalCell, { borderColor: colors.border }]}
                >
                  <Text style={[webFont(10, 600), { color: colors.stone600 }]}>{link.label.toUpperCase()}</Text>
                </ShellPressable>
              ))}
            </View>

            <Text style={[webFont(9, 500), styles.copyright, { color: colors.stone400 }]}>
              © OTO MENZİL • MOBİL MENÜ
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  drawer: {
    width: 290,
    height: '100%',
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  closeButton: {
    padding: 4,
  },
  body: {
    gap: 6,
    paddingBottom: 24,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radii.button,
    paddingVertical: 12,
    marginBottom: 6,
  },
  sectionLabel: {
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 2,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: radii.button,
  },
  navRowLabel: {
    flex: 1,
  },
  rowBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  toolBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  footerPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radii.button,
    paddingVertical: 13,
    marginTop: 10,
  },
  footerSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radii.button,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  legalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  legalCell: {
    width: '47%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.button,
    paddingVertical: 12,
    alignItems: 'center',
  },
  copyright: {
    textAlign: 'center',
    letterSpacing: 0.6,
    marginTop: 16,
  },
});
