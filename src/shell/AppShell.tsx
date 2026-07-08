// AppShellView — iOS AppShellView kök kompozisyonu (spec 03 §5.1).
//
// Tek-ekran shell. Taban kolon: SiteNavbar (üst) + shellContent + BottomTabBar (alt-inset).
// Üstüne binen katmanlar (z-index): MobileDrawer, AuthLaunch/AuthModal, ProfileMenuPopover,
// CompareMenuPanel overlay, MobileCampaignPopup, PageLoadingOverlay, ToastBanner. Android
// donanım-geri: en üstteki overlay/drawer/panel önce, sonra görünüm geçmişi, kökte çık
// (navigationStore.handleBack / reduceBack).
//
// Detay overlay yuvası (car/blog): CarDetailView/BlogDetailView `overlay.kind`'e göre buraya takılır
// (prop-suz, kendi kendini sürer). BlogDetailView `overlay.slug` ile keyed remount edilir.

import { useEffect } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ShellOverlay } from '../models';
import { AdvancedSearchModal } from '../screens/catalog';
import { BlogDetailView } from '../screens/content';
import { CarDetailView } from '../screens/detail';
import { GarageOnboardingView, UsernameOnboardingView } from '../screens/account';
import { ScreenHost } from '../screens/registry';
import { useAuthStore, useNavigationStore } from '../stores';
import { radii, useTheme, webFont } from '../theme';
import { AuthModal } from './AuthModal';
import { BottomTabBar } from './BottomTabBar';
import { CompareMenuPanel } from './CompareMenuPanel';
import { Glyph } from './NavIcon';
import { MobileCampaignPopup } from './MobileCampaignPopup';
import { MobileDrawer } from './MobileDrawer';
import { PageLoadingOverlay } from './AuraLoading';
import { ProfileMenuPopover } from './ProfileMenuPopover';
import { ShellPressable } from './ShellPressable';
import { SiteNavbar } from './SiteNavbar';
import { ToastBanner } from './ToastBanner';
import { carSlugFromCampaignUrl } from './urls';

export function AppShell(): React.JSX.Element {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const currentView = useNavigationStore((s) => s.currentView);
  const overlay = useNavigationStore((s) => s.overlay);
  const shellError = useNavigationStore((s) => s.shellError);
  const pageLoadingMessage = useNavigationStore((s) => s.pageLoadingMessage);
  const comparePanelOpen = useNavigationStore((s) => s.comparePanelOpen);
  const drawerOpen = useNavigationStore((s) => s.drawerOpen);
  const mobileFiltersOpen = useNavigationStore((s) => s.mobileFiltersOpen);
  const galleryExpanded = useNavigationStore((s) => s.galleryExpanded);
  const launchAuthDismissed = useNavigationStore((s) => s.launchAuthDismissed);

  const isLoggedIn = useAuthStore((s) => s.currentUser !== null);
  const showModal = useAuthStore((s) => s.showModal);
  const pendingUsernameSetup = useAuthStore((s) => s.pendingUsernameSetup);
  const pendingGarageOnboarding = useAuthStore((s) => s.pendingGarageOnboarding);

  const nav = useNavigationStore.getState();

  // Cold-start auth kapısı: bootstrap bitti + çıkış yapılmış + kapı reddedilmemiş.
  const showLaunchGate = !isLoggedIn && !launchAuthDismissed;

  // Bottom tab görünürlük kuralı (spec §5.1).
  const hideTabBar =
    showModal ||
    pendingUsernameSetup ||
    pendingGarageOnboarding ||
    showLaunchGate ||
    drawerOpen ||
    mobileFiltersOpen ||
    galleryExpanded;

  // Android donanım-geri.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () =>
      useNavigationStore.getState().handleBack()
    );
    return () => sub.remove();
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.pageBackground }]}>
      <View style={{ paddingTop: insets.top }}>
        <SiteNavbar />
      </View>

      <View style={styles.content}>
        {shellError ? (
          <ShellError message={shellError} />
        ) : overlay ? (
          <DetailOverlaySlot overlay={overlay} />
        ) : (
          <ScreenHost view={currentView} />
        )}
      </View>

      {!hideTabBar ? <BottomTabBar /> : null}

      {/* Overlay katmanları (z-index sırası spec §5.1). */}
      <MobileDrawer />
      <ProfileMenuPopover />

      {comparePanelOpen ? (
        <View style={[StyleSheet.absoluteFill, styles.compareOverlay]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => nav.closeComparePanel()}
            accessibilityLabel="Kapat"
          />
          <View style={[styles.comparePanelWrap, { top: insets.top + 120 }]}>
            <CompareMenuPanel onClose={() => nav.closeComparePanel()} />
          </View>
        </View>
      ) : null}

      <MobileCampaignPopup
        onAction={(url) => {
          const slug = carSlugFromCampaignUrl(url);
          if (slug) useNavigationStore.getState().openCarDetail(slug);
        }}
      />

      <AdvancedSearchModal />

      {showLaunchGate ? <AuthModal variant="launch" /> : null}
      {showModal ? <AuthModal variant="modal" /> : null}
      {/* Onboarding overlay'leri kendi StyleSheet.absoluteFill + zIndex'lerini (126/125) taşır. */}
      {pendingUsernameSetup && !showLaunchGate ? <UsernameOnboardingView /> : null}
      {pendingGarageOnboarding && !pendingUsernameSetup && !showLaunchGate ? (
        <GarageOnboardingView />
      ) : null}

      {pageLoadingMessage ? <PageLoadingOverlay message={pageLoadingMessage} /> : null}
      <ToastBanner />
    </View>
  );
}

/**
 * Detay overlay yuvası — `overlay.kind`'e göre CarDetailView/BlogDetailView'i çizer. Her iki bileşen
 * de prop-suz: overlay slug'ını store'dan kendi okur, kendi geri çubuğunu çizer ve closeOverlay'i
 * kendisi çağırır. BlogDetailView slug ile keyed remount edilir (in-place swap'te yeniden mount —
 * 5c sözleşmesi); CarDetailView slug değişimini içinde ele alır.
 */
function DetailOverlaySlot({ overlay }: { overlay: ShellOverlay }): React.JSX.Element {
  if (overlay.kind === 'car') {
    return <CarDetailView />;
  }
  return <BlogDetailView key={overlay.slug} />;
}

function ShellError({ message }: { message: string }): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={styles.centered}>
      <Glyph name="alert-circle" size={32} color={colors.amber800} />
      <Text style={[webFont(15, 600), styles.centeredText, { color: colors.stone900 }]}>{message}</Text>
      <ShellPressable
        onPress={() => {
          const nav = useNavigationStore.getState();
          nav.setShellError(null);
          nav.setLoadingShell(true);
        }}
        accessibilityLabel="Yeniden dene"
        style={[styles.retry, { backgroundColor: colors.emerald600 }]}
      >
        <Text style={[webFont(13, 700), { color: '#FFFFFF' }]}>Yeniden Dene</Text>
      </ShellPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 14,
  },
  centeredText: {
    textAlign: 'center',
  },
  retry: {
    borderRadius: radii.button,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  compareOverlay: {
    zIndex: 105,
  },
  comparePanelWrap: {
    position: 'absolute',
    right: 12,
    left: 12,
  },
});
