// VehicleLoanGuideView — loan sayfasına gömülü statik rehber (spec 03 §1.6).
//
// Katlanabilir TOC (tocOpen default true) + 10 statik bölüm. Metinler iOS kaynağından verbatim.
// İki tablo WebArticleTable ile (BDDK oranları highlightFirstRate, ÖTV oranları düz).

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, WebArticleTable, type IconName } from '../../components';
import { radii, useTheme, webFont } from '../../theme';

const TOC_ITEMS = [
  'Kredi oranı ve vade',
  'Hangi modeller?',
  'Nihai fatura değeri',
  'Bireysel / ticari fark',
  'ÖTV avantajı',
  'ÖTV oranları 2026',
  'Rehin ve fek',
  'Genel şartlar',
];

const LOAN_RATE_TABLE: string[][] = [
  ['0 – 2.500.000', '%70', '48 ay'],
  ['2.500.001 – 5.000.000', '%50', '36 ay'],
  ['5.000.001 – 6.500.000', '%30', '24 ay'],
  ['6.500.001 – 7.500.000', '%20', '12 ay'],
  ['7.500.001 ve üzeri', 'Kredi kullanılamaz', '—'],
];

const LOAN_RATE_BULLETS = [
  "2.500.000 TL ve altındaki taşıtlar için: Araç değerinin %70'ine kadar kredi ve 48 ay vade,",
  "2.500.001 – 5.000.000 TL arasındaki taşıtlar için: Araç değerinin %50'sine kadar kredi ve 36 ay vade,",
  "5.000.001 – 6.500.000 TL arasındaki taşıtlar için: Araç değerinin %30'una kadar kredi ve 24 ay vade,",
  "6.500.001 – 7.500.000 TL arasındaki taşıtlar için: Araç değerinin %20'sine kadar kredi ve 12 ay vade,",
  '7.500.001 TL üzerindeki taşıtlar için: Kredi imkânı bulunmamaktadır (%0).',
];

const OTV_RATE_TABLE: string[][] = [
  ["160 kW'ı geçmeyen", '1.650.000 TL’ye kadar', '%25', '%20'],
  ["160 kW'ı geçmeyen", '1.650.000 TL üzeri', '%55', '%20'],
  ['160 kW üzeri', '1.650.000 TL’ye kadar', '%65', '%20'],
  ['160 kW üzeri', '1.650.000 TL üzeri', '%75', '%20'],
];

const GENERAL_TERMS = [
  'Belgeli gelire sahip olmak (SGK kaydı ve vergi levhası)',
  'Taşıtın yaşının sıfır olması ya da çok yüksek olmaması',
  'Taşıt üzerinde herhangi bir kurum veya kişinin rehin kaydı olmaması',
  'Kişinin kredi notunun riskli seviyede olmaması',
  'Gelirin kredi taksit ödemelerini karşılayabilmesi',
];

const SOURCES = [
  '21.03.2024 Tarihli 10880 Sayılı Bankacılık Düzenleme ve Denetleme Kurulu Kararı',
  '06.03.2025 Tarihli 11158 Sayılı Bankacılık Düzenleme ve Denetleme Kurulu Kararı',
];

export function VehicleLoanGuide(): React.JSX.Element {
  const { colors } = useTheme();
  const [tocOpen, setTocOpen] = useState(true);

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      {/* Header */}
      <Badge icon="book" text="Rehber · BDDK 2026" />
      <Text style={[webFont(18, 900), { color: colors.stone900 }]}>
        Elektrikli Araç Taşıt Kredisi Şartları ve Limitleri (2026)
      </Text>
      <Text style={[webFont(12, 500), { color: colors.stone600 }]}>
        Yerli üretim tam elektrikli araçlarda geçerli BDDK kredi oranları, vade tavanları, nihai
        fatura baremleri, ÖTV avantajları ve taşıt kredisi genel şartlarını kapsayan güncel
        bilgilendirme rehberi.
      </Text>
      <Text style={[webFont(10, 700), { color: colors.stone400 }]}>
        Son güncelleme: 6 Mart 2026 · BDDK 11158
      </Text>

      {/* TOC */}
      <View style={[styles.toc, { backgroundColor: colors.stone50, borderColor: colors.border }]}>
        <Pressable
          onPress={() => setTocOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel="İçindekiler"
          style={styles.tocHeader}
        >
          <Icon name="list" size={16} color={colors.emerald600} />
          <Text style={[webFont(12, 900), { color: colors.stone900 }]}>İçindekiler</Text>
          <View style={styles.spacer} />
          <Icon name={tocOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.stone500} />
        </Pressable>
        {tocOpen ? (
          <View style={styles.tocList}>
            {TOC_ITEMS.map((item) => (
              <Text key={item} style={[webFont(11, 600), { color: colors.stone600 }]}>
                {`· ${item}`}
              </Text>
            ))}
          </View>
        ) : null}
      </View>

      {/* 1. Kredi oranı ve vade */}
      <Section title="Elektrikli Araç Kredisi Kredi Oranı ve Vade Sınırları">
        <Paragraph>
          Bankacılık Düzenleme ve Denetleme Kurulu (BDDK), yerli elektrikli araç üretimini teşvik
          etmek amacıyla kredi limitlerinde önemli bir güncellemeye gitti. 6 Mart 2025 tarihli ve
          11158 sayılı Kurul Kararı uyarınca, Türkiye&apos;de üretilen elektrik motorlu taşıtlar için
          uygulanan 2026 yılı güncel kredi oranları ve vade sınırları aşağıda yer almaktadır:
        </Paragraph>
        <WebArticleTable
          headers={['Araç Fiyatı (TL)', 'Kredi Oranı', 'Vade Sayısı']}
          rows={LOAN_RATE_TABLE}
          highlightFirstRate
        />
        <BulletList items={LOAN_RATE_BULLETS} />
      </Section>

      {/* 2. Hangi modeller */}
      <Section title="Avantajlı Elektrikli Araç Kredisinden Hangi Modeller Yararlanır?">
        <Paragraph>
          Kredi avantajından yararlanabilmek için aracın Türkiye&apos;de üretilmiş tam elektrikli bir
          taşıt olması gerekir. Öne çıkan model grupları:
        </Paragraph>
        <InfoBox
          tone="neutral"
          title="Mevcut modeller (Togg ve ticari araçlar)"
          text="Togg T10X ve T10F, Ford E-Transit, E-Tourneo Custom ile VW ID. Buzz gibi yerli üretim veya yerli montaj modeller bu kapsamda değerlendirilir."
        />
        <InfoBox
          tone="emerald"
          title="Üretimi planlanan markalar (2026)"
          text="Hyundai, BYD, Renault ve Tofaş&apos;ın Türkiye üretim planları hayata geçtikçe yeni modeller de avantajlı kredi kapsamına girecektir."
        />
        <InfoBox
          tone="amber"
          title="İthal modellerin durumu"
          text="Tesla, BMW ve Mercedes EQ gibi ithal elektrikli araçlar yerli üretim kriterini karşılamadığından standart taşıt kredisi baremlerine tabidir."
        />
        <InfoBox
          tone="neutral"
          title="Hibrit araçlar"
          text="PHEV ve hibrit araçlar bu kapsamın dışındadır ve standart taşıt kredisi şartlarına tabidir."
        />
      </Section>

      {/* 3. Nihai fatura değeri */}
      <Section title="Nihai Fatura Değeri Nedir, Kredi Limitini Nasıl Etkiler?" tone="emerald">
        <Paragraph>
          Kredi limiti, aracın nihai fatura (anahtar teslim) değeri üzerinden hesaplanır. ÖTV ve KDV
          dahil toplam tutar hangi fiyat dilimine giriyorsa, o dilimin kredi oranı ve vadesi geçerli
          olur.
        </Paragraph>
        <Paragraph>
          Kredi başvurusu yapmadan önce bayiden alacağınız teklif formundaki &quot;Genel Toplam&quot;
          hanesini kontrol etmeniz oldukça önemlidir.
        </Paragraph>
        <Paragraph>
          Dilim sınırına çok yakın fiyatlı araçlarda küçük bir donanım farkı bile üst dilime geçişe ve
          daha düşük kredi oranına yol açabilir.
        </Paragraph>
      </Section>

      {/* 4. Bireysel / ticari fark */}
      <Section title="Elektrikli Araçlarda Bireysel ve Ticari Alım Farkı Var mı?">
        <InfoBox
          tone="neutral"
          title="Bireysel alımlar"
          text="Bireysel müşteriler BDDK&apos;nın belirlediği kredi oranı ve vade tavanlarına doğrudan tabidir; KDV indirimi söz konusu değildir."
        />
        <InfoBox
          tone="neutral"
          title="Ticari (kurumsal) alımlar"
          text="Vergi mükellefi işletmeler KDV ve amortisman avantajlarından yararlanabilir; kredi şartları bankanın kurumsal politikasına göre değişebilir."
        />
      </Section>

      {/* 5. ÖTV avantajı */}
      <Section title="Elektrikli Araçlarda ÖTV Avantajı">
        <Paragraph>
          Elektrikli araçlar, motor gücü ve matrah değerine göre kademeli ÖTV oranlarına tabidir.
          Düşük güçlü ve uygun fiyatlı modeller en avantajlı %25 diliminden yararlanır.
        </Paragraph>
        <Paragraph>
          Engelli vatandaşlar için ise belirlenen fiyat limiti altındaki araçlarda ÖTV muafiyeti
          uygulanabilir; bu muafiyet kredi maliyetini de dolaylı olarak düşürür.
        </Paragraph>
      </Section>

      {/* 6. ÖTV oranları 2026 */}
      <Section title="Elektrikli Araç ÖTV Oranları 2026" tone="stone">
        <WebArticleTable
          headers={['Motor gücü', 'Vergisiz satış tutarı', 'ÖTV', 'KDV']}
          rows={OTV_RATE_TABLE}
        />
      </Section>

      {/* 7. Rehin ve fek */}
      <Section title="Taşıt Kredilerinde Rehin İşlemi ve Borç Bitiminde Fek Süreci">
        <Paragraph>
          Taşıt kredisi kullanıldığında araç ruhsatına bankanın rehin kaydı işlenir; borç bitene kadar
          araç bu rehin altında kalır.
        </Paragraph>
        <Paragraph>
          Kredi tamamen kapatıldığında banka fek yazısı düzenler ve rehin kaydı ilgili trafik tescil
          biriminde kaldırılarak araç üzerindeki kısıtlama sona erer.
        </Paragraph>
      </Section>

      {/* 8. Genel şartlar */}
      <Section title="Taşıt Kredisi Genel Şartları Nelerdir?">
        <BulletList items={GENERAL_TERMS} />
      </Section>

      {/* 9. Kaynak */}
      <Section title="Kaynak">
        <BulletList items={SOURCES} />
      </Section>

      {/* 10. Disclaimer */}
      <View style={[styles.disclaimer, { backgroundColor: colors.amber50, borderColor: colors.amber200 }]}>
        <Text style={[webFont(11, 600), { color: colors.amber800 }]}>
          Yasal uyarı: Bu içerik yalnızca genel bilgilendirme amacı taşır; yatırım veya kredi tavsiyesi
          niteliğinde değildir. Nihai kredi teklifi, faiz oranı ve onay süreci bankanızın güncel
          politikasına bağlıdır.
        </Text>
      </View>
    </View>
  );
}

function Section({
  title,
  tone = 'plain',
  children,
}: {
  title: string;
  tone?: 'plain' | 'emerald' | 'stone';
  children: React.ReactNode;
}): React.JSX.Element {
  const { colors } = useTheme();
  const surface =
    tone === 'emerald'
      ? { backgroundColor: colors.emerald50 }
      : tone === 'stone'
        ? { backgroundColor: colors.stone50 }
        : null;
  return (
    <View style={[styles.section, surface, surface ? styles.sectionPadded : null]}>
      <Text style={[webFont(15, 900), { color: colors.stone900 }]}>{title}</Text>
      {children}
    </View>
  );
}

function Paragraph({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { colors } = useTheme();
  return <Text style={[webFont(12, 500), styles.paragraph, { color: colors.stone600 }]}>{children}</Text>;
}

function BulletList({ items }: { items: string[] }): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={styles.bulletList}>
      {items.map((item, i) => (
        <View key={i} style={styles.bulletRow}>
          <Text style={[webFont(12, 700), { color: colors.emerald600 }]}>•</Text>
          <Text style={[webFont(12, 500), styles.bulletText, { color: colors.stone600 }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function InfoBox({
  tone,
  title,
  text,
}: {
  tone: 'neutral' | 'emerald' | 'amber';
  title: string;
  text: string;
}): React.JSX.Element {
  const { colors } = useTheme();
  const surface =
    tone === 'emerald'
      ? { backgroundColor: colors.emerald50, borderColor: colors.emerald100 }
      : tone === 'amber'
        ? { backgroundColor: colors.amber50, borderColor: colors.amber200 }
        : { backgroundColor: colors.stone50, borderColor: colors.border };
  const titleColor = tone === 'amber' ? colors.amber800 : tone === 'emerald' ? colors.emerald700 : colors.stone800;
  return (
    <View style={[styles.infoBox, surface]}>
      <Text style={[webFont(12, 800), { color: titleColor }]}>{title}</Text>
      <Text style={[webFont(11, 500), { color: colors.stone600 }]}>{text}</Text>
    </View>
  );
}

function Badge({ icon, text }: { icon: IconName; text: string }): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: colors.emerald50, borderColor: colors.emerald100 }]}>
      <Icon name={icon} size={12} color={colors.emerald700} />
      <Text style={[webFont(10, 900), { color: colors.emerald700, letterSpacing: 0.4 }]}>
        {text.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 10,
  },
  toc: {
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    marginTop: 4,
  },
  tocHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spacer: {
    flex: 1,
  },
  tocList: {
    marginTop: 10,
    gap: 6,
  },
  section: {
    gap: 8,
    marginTop: 6,
  },
  sectionPadded: {
    borderRadius: radii.inner,
    padding: 14,
  },
  paragraph: {
    lineHeight: 18,
  },
  bulletList: {
    gap: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 8,
  },
  bulletText: {
    flex: 1,
    lineHeight: 18,
  },
  infoBox: {
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 4,
  },
  disclaimer: {
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginTop: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
});
