// EngineeringLabSection — iOS gerçek-menzil laboratuvarı (spec §4.19).
//
// Sıcaklık (mild default) × güzergah (combined default) → EngineeringLabSimulator.values. İki
// sonuç kartı: REAL MENZİL (progress range/700) ve ORTALAMA TÜKETİM (progress cons/300).

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CarDetail } from '../models/car';
import {
  EngineeringLabSimulator,
  type LabRoute,
  type LabTemperature,
} from '../utils/engineeringLabSimulator';
import { radii, useTheme, webFont } from '../theme';
import { Icon, type IconName } from './ComponentIcon';

const DISCLAIMER =
  'WLTP menzil ve tüketim verilerine dayalı tahmindir; sıcaklık ve güzergah seçimine göre sonuç değişir. Resmi test değeri değildir.';

interface RouteOption {
  route: LabRoute;
  title: string;
  subtitle: string;
}

const ROUTE_OPTIONS: RouteOption[] = [
  {
    route: 'city',
    title: 'Şehir İçi Sıkışık Trafik (Rejenerasyon Yüksek)',
    subtitle:
      'Düşük hızlar sayesinde hava direnci en aza iner, motor frenlerinden geri kazanım maksimumdadır.',
  },
  {
    route: 'hwy',
    title: 'Kesintisiz Otoyol Sürüşü (Hızlı Parkur)',
    subtitle: 'Yüksek otoban süratlerinde aerodinamik sürtünme katlanır, rejeneratif kazanç düşer.',
  },
  {
    route: 'combined',
    title: 'Karma Dinamik Sürüş Değeri (%50 Otoban, %50 Şehir)',
    subtitle:
      'Standart WLTP laboratuvar çevrimlerine en yakın karma dinamik simülasyon profili.',
  },
];

const COLD_FOOTNOTE =
  '* Soğuk havalarda bataryanın iç direnci artar, kabin ısıtma fazladan enerji çeker.';
const MILD_FOOTNOTE =
  '* Ilıman bahar havasında kimya akışkanlığı en yüksek kondüsyona varır, menzil zirve yapar.';
const CONS_FOOTNOTE = 'Sürüş tarzı ve klima yükü Wh/km tüketim oranını doğrudan etkiler.';

export interface EngineeringLabSectionProps {
  car: CarDetail;
}

export function EngineeringLabSection({ car }: EngineeringLabSectionProps): React.JSX.Element {
  const { colors } = useTheme();
  const [temperature, setTemperature] = useState<LabTemperature>('mild');
  const [route, setRoute] = useState<LabRoute>('combined');

  const result = EngineeringLabSimulator.values(car, temperature, route);
  const rangeProgress = Math.min(100, (result.rangeKm / 700) * 100);
  const consProgress = Math.min(100, (result.consumptionWhPerKm / 300) * 100);

  return (
    <View style={styles.wrap}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[webFont(10, 900), { color: '#EF4444', letterSpacing: 0.4 }]}>
          MENZİL TAHMİNİ
        </Text>
        <View style={styles.headerTitleRow}>
          <Icon name="signpost" size={16} color={colors.emerald600} />
          <Text style={[webFont(16, 900), { color: colors.stone900 }]}>Gerçek Sürüş Menzili</Text>
        </View>
        <Text style={[webFont(11, 500), { color: colors.stone500 }]}>{DISCLAIMER}</Text>
      </View>

      {/* Controls */}
      <View style={[styles.controls, { backgroundColor: colors.stone50 }]}>
        <Text style={[webFont(10, 900), { color: colors.stone500, letterSpacing: 0.4 }]}>
          YILLIK SEZONEL SICAKLIK DEĞERİ
        </Text>
        <View style={styles.tempRow}>
          <TempButton
            label="SOĞUK HAVA (0°C)"
            icon="snow"
            tint="#3B82F6"
            active={temperature === 'cold'}
            onPress={() => setTemperature('cold')}
          />
          <TempButton
            label="ILIMAN HAVA (23°C)"
            icon="sun"
            tint="#F59E0B"
            active={temperature === 'mild'}
            onPress={() => setTemperature('mild')}
          />
        </View>

        <Text style={[webFont(10, 900), styles.routeLabel, { color: colors.stone500, letterSpacing: 0.4 }]}>
          YOL GÜZERGAH PROFİLİ
        </Text>
        {ROUTE_OPTIONS.map((opt) => {
          const active = route === opt.route;
          return (
            <Pressable
              key={opt.route}
              onPress={() => setRoute(opt.route)}
              accessibilityRole="button"
              accessibilityLabel={opt.title}
              style={[
                styles.routeRow,
                active
                  ? { backgroundColor: colors.emerald50, borderColor: colors.emerald500 }
                  : { backgroundColor: colors.cardBackground, borderColor: colors.border },
              ]}
            >
              <Text style={[webFont(11, 700), { color: active ? colors.emerald700 : colors.stone800 }]}>
                {opt.title}
              </Text>
              <Text style={[webFont(9, 500), { color: colors.stone500 }]}>{opt.subtitle}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Results */}
      <ResultCard
        label="REAL MENZİL TAHMİNİ"
        value={String(result.rangeKm)}
        unit="km"
        progress={rangeProgress}
        barColor={colors.emerald500}
        icon="location"
        iconColor={colors.emerald600}
        footnote={temperature === 'cold' ? COLD_FOOTNOTE : MILD_FOOTNOTE}
      />
      <ResultCard
        label="ORTALAMA GÜÇ TÜKETİMİ"
        value={String(result.consumptionWhPerKm)}
        unit="Wh/km"
        progress={consProgress}
        barColor="#F97316"
        icon="chart-up"
        iconColor="#EA580C"
        footnote={CONS_FOOTNOTE}
      />
    </View>
  );
}

function TempButton({
  label,
  icon,
  tint,
  active,
  onPress,
}: {
  label: string;
  icon: IconName;
  tint: string;
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
        styles.tempButton,
        active
          ? { backgroundColor: `${tint}1F`, borderColor: tint, borderWidth: 2 }
          : { backgroundColor: colors.cardBackground, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth },
      ]}
    >
      <Icon name={icon} size={15} color={active ? tint : colors.stone500} />
      <Text style={[webFont(10, 800), { color: active ? tint : colors.stone700 }]}>{label}</Text>
    </Pressable>
  );
}

function ResultCard({
  label,
  value,
  unit,
  progress,
  barColor,
  icon,
  iconColor,
  footnote,
}: {
  label: string;
  value: string;
  unit: string;
  progress: number;
  barColor: string;
  icon: IconName;
  iconColor: string;
  footnote: string;
}): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={[styles.resultCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <View style={styles.resultHeader}>
        <Icon name={icon} size={16} color={iconColor} />
        <Text style={[webFont(9, 800), { color: colors.stone400, letterSpacing: 0.4 }]}>{label}</Text>
      </View>
      <View style={styles.valueRow}>
        <Text style={[webFont(28, 900), { color: colors.stone900 }]}>{value}</Text>
        <Text style={[webFont(13, 600), styles.unit, { color: colors.stone500 }]}>{unit}</Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: colors.stone300 }]}>
        <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: barColor }]} />
      </View>
      <Text style={[webFont(9, 500), { color: colors.stone500 }]}>{footnote}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  header: {
    gap: 6,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controls: {
    borderRadius: radii.inner,
    padding: 14,
    gap: 8,
  },
  tempRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tempButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radii.button,
    paddingVertical: 10,
  },
  routeLabel: {
    marginTop: 8,
  },
  routeRow: {
    borderRadius: radii.button,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 4,
  },
  resultCard: {
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 8,
    minHeight: 180,
    justifyContent: 'center',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  unit: {
    marginBottom: 4,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
});
