// TrunkVolumeView — route `trunk` (spec 03 §1.2).
//
// Katalog araçlarının bagaj hacmine göre sıralı listesi. Filtre chip'leri (Tümü/SUV/Sedan),
// ≥2 sonuçta "Liderleri Karşılaştır" (top 3 → compare + navigate), satır tıklaması → araç detayı.

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../components';
import { useNavigationStore } from '../../stores';
import { radii, useTheme, webFont } from '../../theme';
import { displayTitle } from '../catalog/shared';
import { ToolHeader } from './ToolHeader';
import { trunkFilterCounts, trunkRankedCars, type TrunkFilterId } from './trunkRank';

export function TrunkScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const catalog = useNavigationStore((s) => s.catalogCars);
  const addToCompare = useNavigationStore((s) => s.addToCompare);
  const navigate = useNavigationStore((s) => s.navigate);
  const openCarDetail = useNavigationStore((s) => s.openCarDetail);

  const [filter, setFilter] = useState<TrunkFilterId>('all');

  const ranked = useMemo(() => trunkRankedCars(catalog, filter), [catalog, filter]);
  const counts = useMemo(() => trunkFilterCounts(catalog), [catalog]);
  const maxTrunk = ranked.length > 0 ? (ranked[0].trunkLiters ?? 0) : 0;

  const filters: { id: TrunkFilterId; label: string; count: number }[] = [
    { id: 'all', label: 'Tümü', count: counts.all },
    { id: 'suv', label: 'SUV', count: counts.suv },
    { id: 'sedan', label: 'Sedan', count: counts.sedan },
  ];

  const compareLeaders = (): void => {
    for (const car of ranked.slice(0, 3)) {
      addToCompare(car);
    }
    navigate('compare');
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.pageBackground }}
      contentContainerStyle={styles.content}
    >
      <ToolHeader
        badge="BAGAJ HACMİ LİSTESİ"
        title="Bagaj Hacmi En Geniş Elektrikli Araçlar"
        subtitle="Aile ve yük ihtiyaçlarına göre en geniş bagaj hacmine sahip modelleri karşılaştırın."
      />

      {/* Filtre chip'leri */}
      <View style={styles.chipRow}>
        {filters.map((f) => {
          const active = f.id === filter;
          return (
            <Pressable
              key={f.id}
              onPress={() => setFilter(f.id)}
              accessibilityRole="button"
              accessibilityLabel={f.label}
              style={[
                styles.chip,
                active
                  ? { backgroundColor: colors.stone900 }
                  : { backgroundColor: colors.cardBackground, borderColor: colors.border },
              ]}
            >
              <Text style={[webFont(11, 800), { color: active ? '#FFFFFF' : colors.stone700 }]}>
                {`${f.label} (${f.count})`}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {ranked.length >= 2 ? (
        <Pressable
          onPress={compareLeaders}
          accessibilityRole="button"
          accessibilityLabel="Liderleri Karşılaştır"
          style={({ pressed }) => [
            styles.compareButton,
            { backgroundColor: colors.emerald600, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Icon name="compare" size={16} color="#FFFFFF" />
          <Text style={[webFont(12, 900), { color: '#FFFFFF', letterSpacing: 0.6 }]}>
            Liderleri Karşılaştır
          </Text>
        </Pressable>
      ) : null}

      {/* Sıralı satırlar */}
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        {ranked.map((car, index) => {
          const rank = index + 1;
          const liters = car.trunkLiters ?? 0;
          const barPercent = maxTrunk > 0 ? Math.min(100, (liters / maxTrunk) * 100) : 0;
          const topThree = rank <= 3;
          return (
            <Pressable
              key={car.id}
              onPress={() => openCarDetail(car.id)}
              accessibilityRole="button"
              accessibilityLabel={displayTitle(car)}
              style={({ pressed }) => [
                styles.row,
                { borderBottomColor: colors.borderLight, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text
                style={[
                  webFont(13, 900),
                  styles.rank,
                  { color: topThree ? colors.emerald600 : colors.stone400 },
                ]}
              >
                {`#${rank}`}
              </Text>
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <Text style={[webFont(13, 700), styles.rowTitle, { color: colors.stone900 }]} numberOfLines={1}>
                    {displayTitle(car)}
                  </Text>
                  <Text style={[webFont(13, 900), { color: colors.emerald700 }]}>
                    {`${liters} L`}
                  </Text>
                </View>
                <View style={[styles.barTrack, { backgroundColor: colors.stone100 }]}>
                  <View
                    style={[styles.barFill, { width: `${barPercent}%`, backgroundColor: colors.emerald50 }]}
                  />
                </View>
              </View>
            </Pressable>
          );
        })}
        {ranked.length === 0 ? (
          <Text style={[webFont(12, 500), styles.empty, { color: colors.stone500 }]}>
            Bu filtre için bagaj verisi bulunamadı.
          </Text>
        ) : null}
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  compareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radii.inner,
    paddingVertical: 14,
  },
  card: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rank: {
    width: 32,
  },
  rowBody: {
    flex: 1,
    gap: 8,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowTitle: {
    flex: 1,
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  empty: {
    padding: 16,
    textAlign: 'center',
  },
});
