// LegalPageView — iOS yasal sayfa (spec §3.7). Rotalar: about / privacy / cookies / terms.
//
// currentView'a göre kind çözülür; LegalPageLayout (Wave 4) hero + ilgili linkleri çizer, kind
// çapraz-linkleri onNavigate ile rotaya bağlanır.
//
// GAP (Wave 6): iOS bu sayfaların içeriğini WP REST `wp/v2/pages?slug=<slug>` ile çeker (§3.7);
// apiClient'ta bu uç YOK ve API/istemci katmanı bu wave'de forbidden. HTML gövde olmadan
// LegalPageLayout zaten fallback yolunu (yardım banner'ı + ilgili linkler) gösterir. WP-pages
// getirme eklendiğinde htmlContent prop'u beslenmelidir. WP slug'ları (Wave 6 için):
// about→hakkimizda, privacy→gizlilik-politikasi, cookies→cerez-politikasi, terms→kullanim-kosullari.

import { ScrollView, StyleSheet } from 'react-native';

import { LegalPageLayout, type LegalKind } from '../../components';
import type { AppViewID } from '../../models';
import { useNavigationStore } from '../../stores';
import { useTheme } from '../../theme';

/** Yasal rota kimlikleri (LegalPageScreen yalnızca bunlar için render edilir). */
type LegalViewID = 'about' | 'privacy' | 'cookies' | 'terms';

/** LegalKind ↔ AppViewID eşlemesi. LegalPageLayout 'contact' kind'ını da linkler → contact rotası. */
const KIND_TO_VIEW: Record<LegalKind, AppViewID> = {
  about: 'about',
  privacy: 'privacy',
  cookies: 'cookies',
  terms: 'terms',
  contact: 'contact',
};

/** Fallback başlıklar (§3.7 — WP getirmesi olmadığında). */
const FALLBACK_TITLE: Record<LegalViewID, string> = {
  about: 'Hakkımızda • Oto Menzil',
  privacy: 'Gizlilik Politikası',
  cookies: 'Çerez Politikası',
  terms: 'Kullanım Koşulları',
};

function kindForView(view: AppViewID): LegalViewID {
  return view === 'about' || view === 'privacy' || view === 'cookies' || view === 'terms'
    ? view
    : 'about';
}

export function LegalPageScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const currentView = useNavigationStore((s) => s.currentView);
  const kind = kindForView(currentView);

  return (
    <ScrollView
      style={{ backgroundColor: colors.pageBackground }}
      contentContainerStyle={styles.content}
    >
      <LegalPageLayout
        kind={kind}
        title={FALLBACK_TITLE[kind]}
        onNavigate={(k) => useNavigationStore.getState().navigate(KIND_TO_VIEW[k])}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
  },
});
