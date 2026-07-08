// OtvExemptionView — route `otv` (spec 03 §1.7).
//
// İki modlu ÖTV rehberi: engelli muafiyeti / %25 indirim dilimi. Katalog araçlarını uygunluğa
// göre sıralar (OtvCalculator). Kart tıklaması → araç detayı.

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CachedImage, Icon, WebCardAccentBar, type IconName } from '../../components';
import { useNavigationStore } from '../../stores';
import { radii, useTheme, webFont } from '../../theme';
import { CarPriceFormatter } from '../../utils/carPriceFormatter';
import { OtvCalculator } from '../../utils/otvCalculator';
import { displayTitle, heroImageURL, priceDisplay } from '../catalog/shared';
import {
  otvEligibleCount,
  otvRankedCars,
  type OtvMode,
  type OtvRankedCar,
} from './otvRanking';

export function OtvExemptionScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const catalog = useNavigationStore((s) => s.catalogCars);
  const openCarDetail = useNavigationStore((s) => s.openCarDetail);

  const [mode, setMode] = useState<OtvMode>(0);

  const ranked = useMemo(() => otvRankedCars(catalog, mode), [catalog, mode]);
  const eligibleCount = otvEligibleCount(ranked);

  const limitLabel = CarPriceFormatter.formatTL(OtvCalculator.disabledExemptionLimit2026);
  const thresholdLabel = CarPriceFormatter.formatTL(OtvCalculator.matrahThreshold2026);

  const summaryText =
    mode === 0
      ? `${eligibleCount} model muafiyet limitine uygun.`
      : `${eligibleCount} model %25 diliminde.`;

  return (
    <ScrollView
      style={{ backgroundColor: colors.pageBackground }}
      contentContainerStyle={styles.content}
    >
      {/* Header card */}
      <View style={[styles.headerCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <WebCardAccentBar />
        <View style={styles.headerBody}>
          <Badge icon="scale" text="Mart 2026 · Güncel Mevzuat" />
          <Text style={[webFont(28, 900), { color: colors.stone900 }]}>
            Elektrikli Araçlar ÖTV Rehberi
          </Text>
          <Text style={[webFont(12, 500), { color: colors.stone500 }]}>
            2026 ÖTV düzenlemesi kapsamında engelli muafiyeti ve indirimli dilim senaryolarını Türkiye
            satıştaki modeller üzerinden inceleyin.
          </Text>
          <Text style={[webFont(12, 700), { color: colors.stone700 }]}>
            {`Engelli muafiyeti limiti (vergiler dahil): ${limitLabel}`}
          </Text>
        </View>
      </View>

      {/* Mode picker card */}
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <Text style={[webFont(10, 900), styles.sectionLabel, { color: colors.stone500 }]}>
          GÖRÜNÜM
        </Text>
        <View style={styles.modeRow}>
          <ModeButton label="Engelli Muafiyeti" active={mode === 0} onPress={() => setMode(0)} />
          <ModeButton label="ÖTV İndirim Dilimi" active={mode === 1} onPress={() => setMode(1)} />
        </View>

        {mode === 0 ? (
          <View style={styles.conditionList}>
            <ConditionRow text={`Fiyat limiti: ${limitLabel} ve altı`} />
            <ConditionRow text="Yerli üretim kriteri (%40 yerli katkı)" />
            <ConditionRow text="10 yıl satış kısıtı ve kullanım şartları geçerlidir" />
          </View>
        ) : (
          <Text style={[webFont(12, 500), { color: colors.stone600 }]}>
            {`Matrah eşiği ${thresholdLabel}. Motor gücü ve matraha göre %25–%75 arası ÖTV dilimleri uygulanır.`}
          </Text>
        )}
      </View>

      {/* Summary bar */}
      <View style={[styles.summaryBar, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <Text style={[webFont(13, 700), styles.summaryText, { color: colors.stone800 }]}>
          {summaryText}
        </Text>
        <View style={[styles.summaryPill, { backgroundColor: colors.stone950 }]}>
          <Text style={[webFont(10, 900), { color: '#FFFFFF' }]}>{`${ranked.length} kayıt`}</Text>
        </View>
      </View>

      {/* Car cards */}
      <View style={styles.cardList}>
        {ranked.map((item) => (
          <OtvCarCard key={item.car.id} item={item} mode={mode} onPress={() => openCarDetail(item.car.id)} />
        ))}
      </View>
    </ScrollView>
  );
}

function OtvCarCard({
  item,
  mode,
  onPress,
}: {
  item: OtvRankedCar;
  mode: OtvMode;
  onPress: () => void;
}): React.JSX.Element {
  const { colors } = useTheme();
  const statusLabel = mode === 0 ? (item.eligible ? 'UYGUN' : 'ŞARTLI') : item.eligible ? '%25 DİLİM' : 'ŞARTLI';
  const statusBg = item.eligible ? colors.emerald600 : colors.stone400;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={displayTitle(item.car)}
      style={({ pressed }) => [
        styles.carCard,
        {
          backgroundColor: colors.cardBackground,
          borderColor: item.eligible ? colors.emerald500 : colors.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <CachedImage
        uri={heroImageURL(item.car)}
        style={styles.carImage}
        placeholderColor={colors.stone100}
        recyclingKey={item.car.id}
      />
      <View style={styles.carBody}>
        <View style={styles.carBadges}>
          <View style={[styles.ratePill, { backgroundColor: colors.stone950 }]}>
            <Text style={[webFont(9, 900), { color: '#FFFFFF' }]}>{`ÖTV %${item.otvRate}`}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
            <Text style={[webFont(9, 900), { color: '#FFFFFF' }]}>{statusLabel}</Text>
          </View>
        </View>
        <Text style={[webFont(14, 700), { color: colors.stone900 }]} numberOfLines={2}>
          {displayTitle(item.car)}
        </Text>
        <Text style={[webFont(13, 800), { color: colors.emerald700 }]}>{priceDisplay(item.car)}</Text>
        {mode === 0 ? (
          <Text style={[webFont(11, 500), { color: colors.stone500 }]}>
            {`Tahmini muaf fiyat: ${CarPriceFormatter.formatTL(item.exemptPrice)}`}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function ModeButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.modeButton,
        active
          ? { backgroundColor: colors.stone950 }
          : { backgroundColor: colors.inputBackground, borderColor: colors.border },
      ]}
    >
      <Text style={[webFont(11, 800), { color: active ? '#FFFFFF' : colors.stone700 }]}>
        {label.toUpperCase()}
      </Text>
    </Pressable>
  );
}

function ConditionRow({ text }: { text: string }): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={styles.conditionRow}>
      <Icon name="check-circle" size={16} color={colors.emerald600} />
      <Text style={[webFont(12, 600), styles.conditionText, { color: colors.stone700 }]}>{text}</Text>
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
  content: {
    padding: 16,
    paddingTop: 20,
    gap: 16,
  },
  headerCard: {
    flexDirection: 'row',
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  headerBody: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
  card: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  sectionLabel: {
    letterSpacing: 0.4,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: radii.button,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
  },
  conditionList: {
    gap: 8,
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  conditionText: {
    flex: 1,
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  summaryText: {
    flex: 1,
  },
  summaryPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  cardList: {
    gap: 12,
  },
  carCard: {
    flexDirection: 'row',
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  carImage: {
    width: 120,
    height: 120,
  },
  carBody: {
    flex: 1,
    padding: 12,
    gap: 6,
  },
  carBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  ratePill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
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
