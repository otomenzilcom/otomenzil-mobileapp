// LegalPageLayoutView (+ FlowLayout, LegalRelatedDefaults) — iOS yasal sayfa düzeni (spec §4.21).
//
// Kind meta (badge/icon/excerpt). showHtml gate: HTML düz-metin ≥ 200 karakter → HTMLContentView
// (.legal); değilse extraContent + yardım banner'ı. Hero kart (radius 28) gradient strip + ikon
// karo + badge + başlık + excerpt + ilk 3 ilgili link (FlowLayout). İlgili bölüm 2-sütun grid.

import { LinearGradient } from 'expo-linear-gradient';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { gradients, radii, useTheme, webFont } from '../theme';
import { Icon, type IconName } from './ComponentIcon';
import { HTMLContentView } from './HTMLContentView';

export type LegalKind = 'about' | 'cookies' | 'privacy' | 'terms' | 'contact';

interface KindMeta {
  badge: string;
  icon: IconName;
  excerpt: string;
}

const KIND_META: Record<LegalKind, KindMeta> = {
  about: {
    badge: 'BİZ KİMİZ?',
    icon: 'sparkles',
    excerpt: "Türkiye'nin bağımsız elektrikli araç karşılaştırma ve bilgi platformu.",
  },
  cookies: {
    badge: 'ÇEREZLER',
    icon: 'fork-knife',
    excerpt: 'Zorunlu, tercih ve analitik çerezler; yönetim seçenekleriniz.',
  },
  privacy: {
    badge: 'KVKK & GİZLİLİK',
    icon: 'shield',
    excerpt: '6698 sayılı KVKK kapsamında kişisel verilerinizin işlenmesi ve haklarınız.',
  },
  terms: {
    badge: 'KULLANIM KOŞULLARI',
    icon: 'scale',
    excerpt: 'Platform kullanım kuralları, sorumluluk sınırları ve üyelik şartları.',
  },
  contact: {
    badge: 'BİZE ULAŞIN',
    icon: 'mail',
    excerpt: 'destek@otomenzil.com üzerinden veya form ile bize ulaşın.',
  },
};

export interface LegalRelatedLink {
  label: string;
  kind: LegalKind;
  description: string;
}

/** LegalRelatedDefaults.all — spec §4.21 birebir. */
export const legalRelatedDefaults: LegalRelatedLink[] = [
  { label: 'Hakkımızda', kind: 'about', description: 'Platformumuzun misyonu ve bağımsızlık ilkesi.' },
  { label: 'Gizlilik Politikası', kind: 'privacy', description: 'KVKK kapsamında veri işleme beyanımız.' },
  { label: 'Çerez Politikası', kind: 'cookies', description: 'Teknik çerezler ve tercih yönetimi.' },
  { label: 'Kullanım Koşulları', kind: 'terms', description: 'Platform kullanım şartları.' },
  { label: 'İletişim', kind: 'contact', description: 'Destek ekibine ulaşın.' },
];

const HTML_MIN_PLAINTEXT = 200;

/** HTML → düz metin (etiket sıyır) uzunluğu; gate için. */
export function htmlPlainTextLength(html: string): number {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim().length;
}

export interface LegalPageLayoutProps {
  kind: LegalKind;
  title: string;
  excerpt?: string;
  htmlContent?: string;
  relatedLinks?: LegalRelatedLink[];
  onNavigate: (kind: LegalKind) => void;
  onHeadingOffset?: (id: string, offset: number) => void;
  /** HTML yetersizse gösterilecek ekstra içerik (form vb.). */
  extraContent?: React.ReactNode;
}

export function LegalPageLayout({
  kind,
  title,
  excerpt,
  htmlContent,
  relatedLinks = legalRelatedDefaults,
  onNavigate,
  onHeadingOffset,
  extraContent,
}: LegalPageLayoutProps): React.JSX.Element {
  const { colors } = useTheme();
  const meta = KIND_META[kind];
  const shownExcerpt = excerpt != null && excerpt.trim().length > 0 ? excerpt : meta.excerpt;
  const showHtml = htmlContent != null && htmlPlainTextLength(htmlContent) >= HTML_MIN_PLAINTEXT;
  const related = relatedLinks.filter((l) => l.kind !== kind);
  const heroLinks = related.slice(0, 3);

  return (
    <View style={styles.wrap}>
      {/* Hero card */}
      <View style={[styles.heroCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <LinearGradient
          colors={gradients.legalHeroStrip}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.strip}
        />
        <View style={styles.heroBody}>
          <View style={[styles.iconTile, { backgroundColor: colors.emerald50 }]}>
            <Icon name={meta.icon} size={28} color={colors.emerald600} />
          </View>
          <View style={[styles.badge, { backgroundColor: 'rgba(22,163,74,0.15)' }]}>
            <Icon name="sparkles" size={11} color={colors.emerald800} />
            <Text style={[webFont(10, 900), styles.badgeText, { color: colors.emerald800 }]}>
              {meta.badge}
            </Text>
          </View>
          <View style={[styles.updateChip, { backgroundColor: colors.stone50, borderColor: colors.border }]}>
            <Text style={[webFont(9, 700), { color: colors.stone500 }]}>Güncellenmiş metin</Text>
          </View>
          <Text style={[webFont(28, 900), { color: colors.stone900 }]}>{title}</Text>
          <Text style={[webFont(14, 500), { color: colors.stone600 }]}>{shownExcerpt}</Text>

          {heroLinks.length > 0 ? (
            <FlowLayout>
              {heroLinks.map((link) => (
                <Pressable
                  key={link.kind}
                  onPress={() => onNavigate(link.kind)}
                  accessibilityRole="button"
                  accessibilityLabel={link.label}
                  style={[styles.heroLinkChip, { backgroundColor: colors.emerald50, borderColor: colors.emerald100 }]}
                >
                  <Text style={[webFont(10, 800), { color: colors.emerald700 }]}>{link.label}</Text>
                </Pressable>
              ))}
            </FlowLayout>
          ) : null}
        </View>
      </View>

      {/* HTML body or extraContent + help banner */}
      {showHtml ? (
        <View style={[styles.htmlCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <HTMLContentView
            html={htmlContent as string}
            proseStyle="legal"
            initialHeight={420}
            onHeadingOffset={onHeadingOffset}
          />
        </View>
      ) : (
        <>
          {extraContent}
          <HelpBanner />
        </>
      )}

      {/* Related section */}
      {related.length > 0 ? (
        <View style={styles.relatedSection}>
          <Text style={[webFont(10, 900), styles.relatedCaption, { color: colors.stone500 }]}>
            İLGİLİ YASAL SAYFALAR
          </Text>
          <View style={styles.relatedGrid}>
            {related.map((link) => (
              <Pressable
                key={link.kind}
                onPress={() => onNavigate(link.kind)}
                accessibilityRole="button"
                accessibilityLabel={link.label}
                style={[styles.relatedCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
              >
                <Text style={[webFont(13, 900), { color: colors.stone900 }]}>{link.label}</Text>
                <Text style={[webFont(11, 500), { color: colors.stone600 }]} numberOfLines={2}>
                  {link.description}
                </Text>
                <Text style={[webFont(11, 800), { color: colors.emerald600 }]}>Oku →</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function HelpBanner(): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={[styles.helpBanner, { backgroundColor: colors.emerald50, borderColor: colors.emerald100 }]}>
      <Text style={[webFont(14, 900), { color: colors.stone900 }]}>Yardıma mı ihtiyacınız var?</Text>
      <Text style={[webFont(12, 500), { color: colors.stone600 }]}>
        Gizlilik, çerez veya kullanım koşulları hakkında bize yazın.
      </Text>
      <Pressable
        onPress={() => void Linking.openURL('mailto:destek@otomenzil.com')}
        accessibilityRole="button"
        accessibilityLabel="DESTEK@OTOMENZIL.COM"
        style={[styles.mailtoButton, { backgroundColor: colors.emerald600 }]}
      >
        <Text style={[webFont(11, 900), { color: '#FFFFFF' }]}>DESTEK@OTOMENZIL.COM</Text>
      </Pressable>
    </View>
  );
}

// ── FlowLayout (§4.21) ──────────────────────────────────────────────────────────────

export interface FlowLayoutProps {
  spacing?: number;
  children: React.ReactNode;
}

/** Basit satır-sarmalayan yerleşim (RN: flexWrap row). */
export function FlowLayout({ spacing = 8, children }: FlowLayoutProps): React.JSX.Element {
  return <View style={[styles.flow, { gap: spacing }]}>{children}</View>;
}

const styles = StyleSheet.create({
  wrap: {
    gap: 16,
  },
  heroCard: {
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  strip: {
    height: 4,
  },
  heroBody: {
    padding: 20,
    gap: 10,
  },
  iconTile: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    letterSpacing: 1.4,
  },
  updateChip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroLinkChip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  htmlCard: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  helpBanner: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 8,
  },
  mailtoButton: {
    borderRadius: radii.button,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  relatedSection: {
    gap: 10,
  },
  relatedCaption: {
    letterSpacing: 0.8,
  },
  relatedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  relatedCard: {
    width: '48%',
    flexGrow: 1,
    gap: 4,
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  flow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
