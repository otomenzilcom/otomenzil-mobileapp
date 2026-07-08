// RankedCarsView (routes best-cars / longest-range / lowest-consumption / trunk) — spec §6.
//
// Tek bileşen, 4 mod; mod currentView'dan türetilir. Tamamen store.catalogCars üzerinde. Hero
// gradient + satış/fiyat chip filtreleri + podium (İlk 3) + tam sıralama + "Daha fazla göster".

import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CachedImage, Icon } from '../../components';
import type { CarSummary } from '../../models/car';
import { useAuthStore } from '../../stores/authStore';
import { useNavigationStore } from '../../stores/navigationStore';
import { radii, useTheme, webFont } from '../../theme';
import { displayTitle, heroImageURL } from './shared';
import {
  barPercent,
  preFilter,
  primaryMetric,
  rank,
  RANKED_CONFIGS,
  secondaryMetric,
  type PriceFilter,
  type RankedMode,
  type TrFilter,
} from './rankedCars';

const PAGE_STEP = 10;
const RANKED_MODES = new Set<string>([
  'best-cars',
  'longest-range',
  'lowest-consumption',
  'trunk',
]);

const TR_FILTERS: { value: TrFilter; label: string }[] = [
  { value: 'all', label: 'Hepsi' },
  { value: 'tr', label: 'TR’de Satışta' },
  { value: 'foreign', label: 'TR’de Satışta Değil' },
];

const PRICE_FILTERS: { value: PriceFilter; label: string }[] = [
  { value: 'all', label: 'Hepsi' },
  { value: 'known', label: 'Fiyatlı' },
  { value: 'unknown', label: 'Fiyatsız' },
];

export function RankedCarsScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const currentView = useNavigationStore((s) => s.currentView);
  const catalogCars = useNavigationStore((s) => s.catalogCars);
  const openCarDetail = useNavigationStore((s) => s.openCarDetail);
  const addToCompare = useNavigationStore((s) => s.addToCompare);
  const removeFromCompare = useNavigationStore((s) => s.removeFromCompare);
  const compareList = useNavigationStore((s) => s.compareList);
  void useAuthStore((s) => s.currentUser); // podium/liste garaj eylemi taşımaz; auth aboneliği yok

  // Mod currentView'dan; katalog dışı bir rota gelirse best-cars'a düş (savunmacı).
  const mode: RankedMode = RANKED_MODES.has(currentView) ? (currentView as RankedMode) : 'best-cars';
  const config = RANKED_CONFIGS[mode];

  const [trFilter, setTrFilter] = useState<TrFilter>('all');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_STEP);

  const ranked = useMemo(
    () => rank(preFilter(catalogCars, mode, trFilter, priceFilter), mode),
    [catalogCars, mode, trFilter, priceFilter],
  );

  const first = ranked[0];
  const podium = ranked.slice(0, 3);
  const visible = ranked.slice(0, visibleCount);
  const remaining = Math.max(0, ranked.length - visible.length);

  function isComparing(car: CarSummary): boolean {
    return compareList.some((c) => c.id === car.id);
  }

  function toggleCompare(car: CarSummary): void {
    if (isComparing(car)) removeFromCompare(car.id);
    else addToCompare(car);
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.pageBackground }}
      contentContainerStyle={styles.content}
    >
      {/* 1. Hero */}
      <LinearGradient
        colors={config.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroBadge}>
          <Icon name="sparkles" size={13} color="rgba(255,255,255,0.9)" />
          <Text style={[webFont(10, 900), styles.tracked, { color: 'rgba(255,255,255,0.9)' }]}>
            {config.badge.toUpperCase()}
          </Text>
        </View>
        <Text style={[webFont(24, 900), { color: '#FFFFFF' }]}>{config.title}</Text>
        <Text style={[webFont(13, 500), { color: 'rgba(255,255,255,0.9)' }]}>{config.description}</Text>
        <Text style={[webFont(11, 700), { color: 'rgba(255,255,255,0.7)' }]}>
          {ranked.length} model · Güncel katalog verisi
        </Text>
      </LinearGradient>

      {/* 2. Filtre çubuğu */}
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <FilterChipRow
          label="SATIŞ"
          options={TR_FILTERS}
          current={trFilter}
          onSelect={(v) => {
            setTrFilter(v);
            setVisibleCount(PAGE_STEP);
          }}
        />
        <FilterChipRow
          label="FİYAT"
          options={PRICE_FILTERS}
          current={priceFilter}
          onSelect={(v) => {
            setPriceFilter(v);
            setVisibleCount(PAGE_STEP);
          }}
        />
      </View>

      {/* 3. Podium (≥3 sonuç) */}
      {podium.length >= 3 ? (
        <View style={styles.podiumBlock}>
          <View style={styles.podiumHeader}>
            <Icon name="star" size={14} color="#F59E0B" />
            <Text style={[webFont(10, 900), styles.tracked, { color: colors.stone900 }]}>İLK 3</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.podiumRow}>
            {podium.map((car, index) => (
              <PodiumCard
                key={car.id}
                car={car}
                rank={index + 1}
                mode={mode}
                onDetail={() => openCarDetail(car.id)}
                onCompare={() => toggleCompare(car)}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* 4. Tam sıralama */}
      <View style={[styles.card, styles.rankCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <View style={[styles.rankHeader, { borderBottomColor: colors.border }]}>
          <View style={styles.rankHeaderLeft}>
            <Icon name="sparkles" size={14} color={colors.emerald600} />
            <Text style={[webFont(11, 900), styles.tracked, { color: colors.stone900 }]}>TAM SIRALAMA</Text>
          </View>
          <Text style={[webFont(11, 700), { color: colors.stone500 }]}>{ranked.length} model</Text>
        </View>
        {visible.map((car, index) => (
          <Pressable
            key={car.id}
            onPress={() => openCarDetail(car.id)}
            accessibilityRole="button"
            accessibilityLabel={displayTitle(car)}
            style={[styles.rankRow, { borderBottomColor: colors.borderLight }]}
          >
            <Text style={[webFont(13, 900), styles.rankIndex, { color: colors.emerald600 }]}>#{index + 1}</Text>
            <CachedImage uri={heroImageURL(car)} style={styles.rankThumb} placeholderColor={colors.stone100} />
            <View style={styles.rankBody}>
              <Text style={[webFont(13, 700), { color: colors.stone900 }]} numberOfLines={1}>
                {displayTitle(car)}
              </Text>
              <View style={styles.rankMetrics}>
                <Text style={[webFont(11, 700), { color: colors.emerald700 }]}>{primaryMetric(car, mode)}</Text>
                <Text style={[webFont(10, 500), { color: colors.stone500 }]}>{secondaryMetric(car, mode)}</Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: colors.stone100 }]}>
                <View
                  style={[
                    styles.progressFill,
                    { backgroundColor: colors.emerald500, width: `${Math.min(100, barPercent(car, first, mode) * 100)}%` },
                  ]}
                />
              </View>
            </View>
          </Pressable>
        ))}
      </View>

      {/* 5. Daha fazla göster */}
      {remaining > 0 ? (
        <Pressable
          onPress={() => setVisibleCount((c) => c + PAGE_STEP)}
          accessibilityRole="button"
          accessibilityLabel="Daha fazla göster"
          style={({ pressed }) => [
            styles.loadMore,
            { backgroundColor: colors.stone950, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[webFont(12, 900), styles.tracked, { color: '#FFFFFF' }]}>
            DAHA FAZLA GÖSTER ({remaining})
          </Text>
        </Pressable>
      ) : null}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

function FilterChipRow<T extends string>({
  label,
  options,
  current,
  onSelect,
}: {
  label: string;
  options: { value: T; label: string }[];
  current: T;
  onSelect: (value: T) => void;
}): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={styles.filterRow}>
      <Text style={[webFont(9, 900), styles.tracked, styles.filterLabel, { color: colors.stone400 }]}>
        {label}
      </Text>
      <View style={styles.filterChips}>
        {options.map((option) => {
          const isActive = option.value === current;
          return (
            <Pressable
              key={option.value}
              onPress={() => onSelect(option.value)}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              style={[
                styles.filterChip,
                { backgroundColor: isActive ? colors.stone950 : colors.stone50, borderColor: colors.border },
              ]}
            >
              <Text style={[webFont(10, 800), { color: isActive ? '#FFFFFF' : colors.stone600 }]}>
                {option.label.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function PodiumCard({
  car,
  rank: rankNumber,
  mode,
  onDetail,
  onCompare,
}: {
  car: CarSummary;
  rank: number;
  mode: RankedMode;
  onDetail: () => void;
  onCompare: () => void;
}): React.JSX.Element {
  const { colors } = useTheme();
  const config = RANKED_CONFIGS[mode];
  const rankBg = rankNumber === 1 ? '#FBBF24' : colors.stone300;
  const rankFg = rankNumber === 1 ? '#92400E' : colors.stone800;

  return (
    <View style={[styles.podiumCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <View style={styles.podiumImageWrap}>
        <CachedImage uri={heroImageURL(car)} style={styles.podiumImage} placeholderColor={colors.stone100} />
        <View style={[styles.rankBadge, { backgroundColor: rankBg }]}>
          <Text style={[webFont(11, 900), { color: rankFg }]}>#{rankNumber}</Text>
        </View>
      </View>
      <Text style={[webFont(13, 900), { color: colors.stone900 }]} numberOfLines={2}>
        {displayTitle(car)}
      </Text>
      <View style={styles.podiumMetrics}>
        <View style={[styles.metricBox, { backgroundColor: colors.emerald50, borderColor: colors.emerald100 }]}>
          <Text style={[webFont(8, 800), styles.tracked, { color: colors.emerald700 }]}>
            {config.metricLabel.toUpperCase()}
          </Text>
          <Text style={[webFont(12, 900), { color: colors.emerald700 }]}>{primaryMetric(car, mode)}</Text>
        </View>
        <View style={[styles.metricBox, { backgroundColor: colors.stone50, borderColor: colors.border }]}>
          <Text style={[webFont(8, 800), styles.tracked, { color: colors.stone500 }]}>
            {config.secondaryLabel.toUpperCase()}
          </Text>
          <Text style={[webFont(12, 900), { color: colors.stone900 }]}>{secondaryMetric(car, mode)}</Text>
        </View>
      </View>
      <View style={styles.podiumButtons}>
        <Pressable
          onPress={onDetail}
          accessibilityRole="button"
          accessibilityLabel="Detay"
          style={[styles.podiumButton, { backgroundColor: colors.stone100 }]}
        >
          <Text style={[webFont(10, 900), { color: colors.stone800 }]}>DETAY</Text>
        </Pressable>
        <Pressable
          onPress={onCompare}
          accessibilityRole="button"
          accessibilityLabel="Karşılaştır"
          style={[styles.podiumButton, { backgroundColor: colors.stone950 }]}
        >
          <Text style={[webFont(10, 900), { color: '#FFFFFF' }]}>KARŞILAŞTIR</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16,
  },
  tracked: {
    letterSpacing: 0.8,
  },
  hero: {
    borderRadius: radii.card,
    padding: 20,
    gap: 8,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  card: {
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  filterRow: {
    gap: 8,
  },
  filterLabel: {},
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  podiumBlock: {
    gap: 10,
  },
  podiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  podiumRow: {
    gap: 12,
    paddingVertical: 2,
  },
  podiumCard: {
    width: 244,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 10,
  },
  podiumImageWrap: {
    width: 220,
    height: 130,
  },
  podiumImage: {
    width: 220,
    height: 130,
    borderRadius: radii.inner,
  },
  rankBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  podiumMetrics: {
    flexDirection: 'row',
    gap: 8,
  },
  metricBox: {
    flex: 1,
    gap: 2,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
  },
  podiumButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  podiumButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: radii.button,
    paddingVertical: 10,
  },
  rankCard: {
    padding: 0,
    gap: 0,
    overflow: 'hidden',
  },
  rankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rankHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rankIndex: {
    width: 32,
  },
  rankThumb: {
    width: 72,
    height: 52,
    borderRadius: 12,
  },
  rankBody: {
    flex: 1,
    gap: 4,
  },
  rankMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  loadMore: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  bottomSpacer: {
    height: 24,
  },
});
