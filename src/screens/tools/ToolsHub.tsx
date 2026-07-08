// ToolViews hub — araç/hesaplayıcı robotları landing içeriği (spec 03 §1 / §5.3 ToolsSubnav
// eşlik içeriği).
//
// Shell zaten "ROBOTLAR:" subnav chrome'unu çizer (ToolsSubnav). Bu bileşen o şeridin ekran
// içeriğini sağlar: her hesaplayıcı robotuna giden kart ızgarası. Prop almaz — navigate store'dan.
//
// NOT (Wave 6): AppViewID'de ayrı bir `tools` rotası yok; her araç doğrudan kendi rotasına
// (consumption/trunk/otv/mtv/vehicle-loan) gider. Bu hub, bir landing yuvası isteyen host için
// hazır bir bileşendir — registry'ye takma kararı Wave 6'ya bırakılır (registry bu wave'de sahibim değil).

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon, WebSectionHeader, type IconName } from '../../components';
import type { AppViewID } from '../../models/navigation';
import { useNavigationStore } from '../../stores';
import { radii, useTheme, webFont } from '../../theme';

interface ToolEntry {
  id: AppViewID;
  icon: IconName;
  badge: string;
  title: string;
  subtitle: string;
}

/** Robot/hesaplayıcı kartları (spec §1 tool rotaları). */
const TOOL_ENTRIES: ToolEntry[] = [
  {
    id: 'consumption',
    icon: 'bolt',
    badge: 'Hesaplama',
    title: 'Tüketim ve Şarj Maliyeti',
    subtitle: 'Gerçek yol senaryolarında kWh tüketimi ve TL maliyetini hesaplayın.',
  },
  {
    id: 'trunk',
    icon: 'fork-knife',
    badge: 'Sıralama',
    title: 'Bagaj Hacmi Sıralaması',
    subtitle: 'En geniş bagaj hacmine sahip elektrikli modelleri karşılaştırın.',
  },
  {
    id: 'otv',
    icon: 'scale',
    badge: '2026 Limit',
    title: 'ÖTV Muafiyeti Rehberi',
    subtitle: 'Engelli muafiyeti ve indirimli ÖTV dilimi senaryolarını inceleyin.',
  },
  {
    id: 'mtv',
    icon: 'gauge',
    badge: '2026 MTV',
    title: 'MTV Hesaplama',
    subtitle: 'Motor gücü, model yılı ve matraha göre yıllık MTV tutarını hesaplayın.',
  },
  {
    id: 'vehicle-loan',
    icon: 'sliders',
    badge: 'BDDK',
    title: 'Taşıt Kredisi Hesaplama',
    subtitle: 'BDDK dilimine göre maksimum kredi, vade ve aylık taksiti görün.',
  },
];

export function ToolsHub(): React.JSX.Element {
  const { colors } = useTheme();
  const navigate = useNavigationStore((s) => s.navigate);

  return (
    <ScrollView
      style={{ backgroundColor: colors.pageBackground }}
      contentContainerStyle={styles.content}
    >
      <WebSectionHeader
        badge="Robotlar"
        title="Elektrikli Araç Hesaplama Robotları"
        subtitle="Vergi, kredi, tüketim ve bagaj hacmi araçlarıyla katalog verilerini analiz edin."
      />

      <View style={styles.grid}>
        {TOOL_ENTRIES.map((entry) => (
          <Pressable
            key={entry.id}
            onPress={() => navigate(entry.id)}
            accessibilityRole="button"
            accessibilityLabel={entry.title}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: colors.cardBackground, borderColor: colors.border, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <View style={[styles.iconTile, { backgroundColor: colors.emerald50, borderColor: colors.emerald100 }]}>
              <Icon name={entry.icon} size={18} color={colors.emerald600} />
            </View>
            <View style={[styles.badge, { backgroundColor: colors.emerald50 }]}>
              <Text style={[webFont(9, 900), { color: colors.emerald700, letterSpacing: 0.4 }]}>
                {entry.badge.toUpperCase()}
              </Text>
            </View>
            <Text style={[webFont(15, 900), { color: colors.stone900 }]}>{entry.title}</Text>
            <Text style={[webFont(11, 500), { color: colors.stone500 }]}>{entry.subtitle}</Text>
            <View style={styles.footerRow}>
              <Text style={[webFont(11, 800), { color: colors.emerald600 }]}>Aç</Text>
              <Icon name="arrow-forward" size={13} color={colors.emerald600} />
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingTop: 20,
    gap: 16,
  },
  grid: {
    gap: 12,
  },
  card: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 8,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
});
