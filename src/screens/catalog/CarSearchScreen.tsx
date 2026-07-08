// CarSearchView (route `search`) — tam istemci-taraflı katalog (spec §2).
//
// store.catalogCars üzerinde arama/filtre/sıralama/sayfalama. Kendi ağ isteği YOK. Görünürken
// store.pendingSearchQuery tüketilir (AdvancedSearchModal set eder) ve temizlenir. Filtreleme
// senkron olduğu için useMemo ile memoize edilir. Filtre çekmecesi mobileFiltersOpen flag'ine
// bağlıdır (shell tab bar gizleme kuralı).

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AdSlot,
  CarCatalogCard,
  Icon,
  Slider,
  WebFilterField,
  type CarCatalogLayout,
  type FilterOption,
} from '../../components';
import type { CarSummary } from '../../models/car';
import { AppView } from '../../models/navigation';
import { useAuthStore } from '../../stores/authStore';
import { useNavigationStore } from '../../stores/navigationStore';
import {
  carSortOptions,
  carSortOptionLabels,
  CarSearchEngine,
  type CarSortOption,
} from '../../utils/carSearchEngine';
import { radii, shadows, useTheme, webFont } from '../../theme';
import { bodyTypeOptionValues, catalogBrands, MAX_BUDGET_OPTIONS } from './shared';

const PAGE_SIZE = CarSearchEngine.pageSize; // 15
const PRICE_FLOOR = CarSearchEngine.defaultPriceFloor; // 1_000_000
const PRICE_CEILING = CarSearchEngine.defaultPriceCeiling; // 6_000_000
const SEARCH_DEBOUNCE_MS = 250;

interface SearchFilters {
  selectedBrand: string;
  selectedBodyType: string;
  minPrice: number;
  maxPrice: number;
  minRange: number;
  minBattery: number;
  selectedDrive: string; // durum var ama UI kontrolü yok — hep "all" (spec §2)
}

const DEFAULT_FILTERS: SearchFilters = {
  selectedBrand: 'all',
  selectedBodyType: 'all',
  minPrice: PRICE_FLOOR,
  maxPrice: PRICE_CEILING,
  minRange: 0,
  minBattery: 0,
  selectedDrive: 'all',
};

/** Aktif filtre var mı (default'tan sapma + sorgu). Fiyat: taban/tavan aşıldı mı. */
function hasActive(filters: SearchFilters, query: string): boolean {
  return (
    filters.selectedBrand !== 'all' ||
    filters.selectedBodyType !== 'all' ||
    filters.minRange > 0 ||
    filters.minBattery > 0 ||
    filters.minPrice > PRICE_FLOOR ||
    filters.maxPrice < PRICE_CEILING ||
    query.trim().length > 0
  );
}

export function CarSearchScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const catalogCars = useNavigationStore((s) => s.catalogCars);
  const brandLogos = useNavigationStore((s) => s.brandLogos);
  const appSettings = useNavigationStore((s) => s.appSettings);
  const homeData = useNavigationStore((s) => s.homeData);
  const pendingSearchQuery = useNavigationStore((s) => s.pendingSearchQuery);
  const setPendingSearchQuery = useNavigationStore((s) => s.setPendingSearchQuery);
  const mobileFiltersOpen = useNavigationStore((s) => s.mobileFiltersOpen);
  const setMobileFiltersOpen = useNavigationStore((s) => s.setMobileFiltersOpen);
  const navigate = useNavigationStore((s) => s.navigate);
  const openCarDetail = useNavigationStore((s) => s.openCarDetail);
  const addToCompare = useNavigationStore((s) => s.addToCompare);
  const removeFromCompare = useNavigationStore((s) => s.removeFromCompare);
  const compareList = useNavigationStore((s) => s.compareList);

  const openAuth = useAuthStore((s) => s.openAuth);
  const toggleFavorite = useAuthStore((s) => s.toggleFavorite);
  const toggleGarageCar = useAuthStore((s) => s.toggleGarageCar);
  const garageCarIds = useAuthStore((s) => s.garageCarIds);
  const favorites = useAuthStore((s) => s.favorites);
  const busyGarageCarIds = useAuthStore((s) => s.busyGarageCarIds);
  const isLoggedIn = useAuthStore((s) => s.currentUser !== null);

  void openAuth; // giriş kapısı toggleGarageCar/toggleFavorite içinde yönetilir

  const settings = appSettings ?? homeData?.settings;

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState<CarSortOption>('newest');
  const [layout, setLayout] = useState<CarCatalogLayout>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);

  // pendingSearchQuery tüketimi (bir kez).
  const consumedPending = useRef(false);
  useEffect(() => {
    if (pendingSearchQuery != null && !consumedPending.current) {
      consumedPending.current = true;
      setSearchQuery(pendingSearchQuery);
      setDebouncedQuery(pendingSearchQuery);
      setCurrentPage(1);
      setPendingSearchQuery(null);
    }
  }, [pendingSearchQuery, setPendingSearchQuery]);

  // 250 ms debounce.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const brandOptions: FilterOption[] = useMemo(() => {
    const list = catalogBrands(catalogCars).map((b) => ({ value: b, label: b }));
    return [{ value: 'all', label: 'Tüm Markalar (Hepsi)' }, ...list];
  }, [catalogCars]);
  const bodyTypeOptions: FilterOption[] = useMemo(() => {
    const list = bodyTypeOptionValues(catalogCars).map((t) => ({ value: t, label: t }));
    return [{ value: 'all', label: 'Tüm Kasalar (Hepsi)' }, ...list];
  }, [catalogCars]);

  const filtered = useMemo(
    () =>
      CarSearchEngine.filter({
        cars: catalogCars,
        brand: filters.selectedBrand,
        bodyType: filters.selectedBodyType,
        query: debouncedQuery,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        minRange: filters.minRange,
        minBattery: filters.minBattery,
        drive: filters.selectedDrive,
      }),
    [catalogCars, filters, debouncedQuery],
  );

  const sorted = useMemo(() => CarSearchEngine.sort(filtered, sortBy), [filtered, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const clampedPage = Math.min(currentPage, totalPages);
  const paginatedCars = useMemo(() => {
    const start = (clampedPage - 1) * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [sorted, clampedPage]);

  const active = hasActive(filters, debouncedQuery);

  function resetFilters(): void {
    setFilters(DEFAULT_FILTERS);
    setSearchQuery('');
    setDebouncedQuery('');
    setSortBy('newest');
    setCurrentPage(1);
    setMobileFiltersOpen(false);
  }

  function updateQuery(text: string): void {
    setSearchQuery(text);
    setCurrentPage(1);
  }

  function updateFilters(patch: Partial<SearchFilters>): void {
    setFilters((f) => ({ ...f, ...patch }));
    setCurrentPage(1);
  }

  function toggleCompare(car: CarSummary): void {
    if (compareList.some((c) => c.id === car.id)) removeFromCompare(car.id);
    else addToCompare(car);
  }

  function cardProps(car: CarSummary): React.ComponentProps<typeof CarCatalogCard> {
    return {
      car,
      layout,
      brandLogos,
      isComparing: compareList.some((c) => c.id === car.id),
      isFavorite: favorites.includes(car.id),
      isInGarage: garageCarIds.includes(car.id),
      isLoggedIn,
      garageBusy: busyGarageCarIds.includes(car.id),
      onDetail: () => openCarDetail(car.id),
      onCompare: () => toggleCompare(car),
      onToggleFavorite: () => void toggleFavorite(car.id),
      onToggleGarage: () => void toggleGarageCar(car.id, catalogCars),
      onBrandTap: () => navigate(AppView.brands),
    };
  }

  const archiveTitle = settings?.carArchiveTitle ?? 'Elektrikli Araçlar';
  const archiveSubtitle =
    settings?.carArchiveSubtitle ?? 'Filtreleyin, karşılaştırın ve teknik detayları inceleyin.';

  const rankedGuides: { id: typeof AppView[keyof typeof AppView]; label: string }[] = [
    { id: AppView.bestCars, label: 'En İyi' },
    { id: AppView.longestRange, label: 'Menzil' },
    { id: AppView.lowestConsumption, label: 'Verim' },
    { id: AppView.trunk, label: 'Bagaj' },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.pageBackground }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* 1. AdSlot search_top */}
        <AdSlot
          slot="search_top"
          config={settings?.adSlots?.search_top}
          adsensePublisherId={settings?.adsensePublisherId}
        />

        {/* 2. Header */}
        <View style={styles.headerBlock}>
          <Text style={[webFont(10, 900), styles.tracked, { color: colors.emerald600 }]}>
            ELEKTRİKLİ ARABA KARŞILAŞTIRMA KATALOĞU
          </Text>
          <Text style={[webFont(28, 900), { color: colors.stone900 }]}>{archiveTitle}</Text>
          <Text style={[webFont(13, 500), { color: colors.stone500 }]}>{archiveSubtitle}</Text>
          <View style={[styles.hairline, { backgroundColor: colors.borderLight }]} />
        </View>

        {/* 3. Arama çubuğu */}
        <View style={[styles.searchBar, { backgroundColor: colors.cardBackground, borderColor: colors.border }, shadows.card]}>
          <Icon name="search" size={18} color={colors.stone400} />
          <TextInput
            value={searchQuery}
            onChangeText={updateQuery}
            placeholder="Kelimeye göre hızlı filtreleyin... (örn: Togg, Tesla, Sedan)"
            placeholderTextColor={colors.stone400}
            autoCapitalize="none"
            autoCorrect={false}
            style={[webFont(14, 500), styles.searchInput, { color: colors.stone900 }]}
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => updateQuery('')} accessibilityRole="button" accessibilityLabel="Temizle">
              <Icon name="close" size={18} color={colors.stone400} />
            </Pressable>
          ) : null}
        </View>

        {/* 4. Mobil filtre çubuğu */}
        <View style={styles.filterBar}>
          <Pressable
            onPress={() => setMobileFiltersOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Filtreleri göster"
            style={({ pressed }) => [
              styles.filterButton,
              { backgroundColor: colors.stone950, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Icon name="sliders" size={16} color={colors.emerald400} />
            <Text style={[webFont(11, 900), styles.tracked, { color: '#FFFFFF' }]}>FİLTRELERİ GÖSTER</Text>
          </Pressable>
          <Pressable
            onPress={resetFilters}
            accessibilityRole="button"
            accessibilityLabel="Filtreleri sıfırla"
            style={({ pressed }) => [
              styles.resetButton,
              { backgroundColor: colors.cardBackground, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Icon name="chevron-down" size={18} color={colors.stone600} />
          </Pressable>
        </View>

        {/* 5. Sıralama rehberleri kartı */}
        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[webFont(9, 900), styles.tracked, { color: colors.emerald600 }]}>SIRALAMA REHBERLERİ</Text>
          <Text style={[webFont(16, 900), { color: colors.stone900 }]}>
            Elektrikli Araç Karşılaştırma Listeleri
          </Text>
          <Text style={[webFont(11, 500), { color: colors.stone500 }]}>
            En iyi modeller, menzil liderleri ve en verimli araçlar — katalogdan bağımsız güncel
            sıralama sayfaları.
          </Text>
          <View style={styles.chipRow}>
            {rankedGuides.map((guide) => (
              <Pressable
                key={guide.id}
                onPress={() => navigate(guide.id)}
                accessibilityRole="button"
                accessibilityLabel={guide.label}
                style={[styles.guideChip, { backgroundColor: colors.stone50, borderColor: colors.border }]}
              >
                <Text style={[webFont(11, 700), { color: colors.stone800 }]}>{guide.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 6. Sonuç araç çubuğu */}
        <View style={[styles.card, styles.toolbar, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[webFont(12, 700), styles.toolbarSummary, { color: colors.stone550 }]}>
            {active ? `${sorted.length} araç listeleniyor` : 'Elektrikli araç kataloğu'}
          </Text>
          <View style={styles.toolbarControls}>
            <LayoutToggle
              activeLayout={layout}
              onSelect={setLayout}
            />
            <Pressable
              onPress={() => setSortSheetOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Sıralama"
              style={[styles.sortButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
            >
              <Icon name="list" size={14} color={colors.emerald600} />
              <Text style={[webFont(11, 700), { color: colors.stone800 }]} numberOfLines={1}>
                {carSortOptionLabels[sortBy]}
              </Text>
              <Icon name="chevron-down" size={14} color={colors.stone500} />
            </Pressable>
          </View>
        </View>

        {/* 7. Sonuçlar */}
        {paginatedCars.length === 0 ? (
          <EmptyState onReset={resetFilters} />
        ) : (
          <View style={layout === 'grid' ? styles.gridResults : styles.listResults}>
            {paginatedCars.map((car) => (
              <CarCatalogCard key={car.id} {...cardProps(car)} />
            ))}
          </View>
        )}

        {/* 8. Sayfalama */}
        {totalPages > 1 ? (
          <View style={[styles.pagination, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Pressable
              onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={clampedPage <= 1}
              accessibilityRole="button"
              accessibilityLabel="Önceki"
              style={[styles.pageButton, { opacity: clampedPage <= 1 ? 0.4 : 1 }]}
            >
              <Icon name="chevron-back" size={16} color={colors.stone700} />
              <Text style={[webFont(12, 700), { color: colors.stone700 }]}>Önceki</Text>
            </Pressable>
            <Text style={[webFont(12, 900), { color: colors.stone900 }]}>
              Sayfa {clampedPage} / {totalPages}
            </Text>
            <Pressable
              onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={clampedPage >= totalPages}
              accessibilityRole="button"
              accessibilityLabel="Sonraki"
              style={[styles.pageButton, { opacity: clampedPage >= totalPages ? 0.4 : 1 }]}
            >
              <Text style={[webFont(12, 700), { color: colors.stone700 }]}>Sonraki</Text>
              <Icon name="chevron-forward" size={16} color={colors.stone700} />
            </Pressable>
          </View>
        ) : null}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Sıralama alt-sayfası */}
      <SortSheet
        open={sortSheetOpen}
        current={sortBy}
        onSelect={(option) => {
          setSortBy(option);
          setSortSheetOpen(false);
          setCurrentPage(1);
        }}
        onClose={() => setSortSheetOpen(false)}
      />

      {/* Filtre çekmecesi */}
      <FilterDrawer
        open={mobileFiltersOpen}
        filters={filters}
        brandOptions={brandOptions}
        bodyTypeOptions={bodyTypeOptions}
        filteredCount={sorted.length}
        active={active}
        onUpdate={updateFilters}
        onApply={() => {
          setMobileFiltersOpen(false);
          setCurrentPage(1);
        }}
        onClose={() => setMobileFiltersOpen(false)}
      />
    </View>
  );
}

function LayoutToggle({
  activeLayout,
  onSelect,
}: {
  activeLayout: CarCatalogLayout;
  onSelect: (layout: CarCatalogLayout) => void;
}): React.JSX.Element {
  const { colors } = useTheme();
  const items: { key: CarCatalogLayout; label: string }[] = [
    { key: 'grid', label: 'Grid' },
    { key: 'list', label: 'Liste' },
  ];
  return (
    <View style={styles.layoutToggle}>
      {items.map((item) => {
        const isActive = activeLayout === item.key;
        return (
          <Pressable
            key={item.key}
            onPress={() => onSelect(item.key)}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            style={[
              styles.layoutChip,
              { backgroundColor: isActive ? colors.stone950 : colors.stone50 },
            ]}
          >
            <Text style={[webFont(11, 700), { color: isActive ? '#FFFFFF' : colors.stone500 }]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SortSheet({
  open,
  current,
  onSelect,
  onClose,
}: {
  open: boolean;
  current: CarSortOption;
  onSelect: (option: CarSortOption) => void;
  onClose: () => void;
}): React.JSX.Element {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.scrim }]} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.cardBackground, paddingBottom: insets.bottom + 12 }]}>
        <View style={[styles.grabber, { backgroundColor: colors.border }]} />
        <Text style={[webFont(13, 900), styles.sheetTitle, { color: colors.stone900 }]}>Sıralama</Text>
        {carSortOptions.map((option) => {
          const isActive = option === current;
          return (
            <Pressable
              key={option}
              onPress={() => onSelect(option)}
              accessibilityRole="button"
              accessibilityLabel={carSortOptionLabels[option]}
              style={({ pressed }) => [
                styles.sortOption,
                { borderBottomColor: colors.borderLight, opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text style={[webFont(14, isActive ? 800 : 600), { color: isActive ? colors.emerald700 : colors.stone800 }]}>
                {carSortOptionLabels[option]}
              </Text>
              {isActive ? <Icon name="check-circle" size={16} color={colors.emerald600} /> : null}
            </Pressable>
          );
        })}
      </View>
    </Modal>
  );
}

function EmptyState({ onReset }: { onReset: () => void }): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={[styles.emptyCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <Icon name="close" size={32} color="#F43F5E" />
      <Text style={[webFont(14, 900), styles.tracked, styles.emptyTitle, { color: colors.stone900 }]}>
        ARADIĞINIZ ARAÇ BULUNAMADI
      </Text>
      <Text style={[webFont(12, 500), styles.emptyBody, { color: colors.stone500 }]}>
        Belirttiğiniz filtre kurallarına uyan model bulunamadı. Filtrelerinizi gevşeterek yeniden
        deneyin.
      </Text>
      <Pressable
        onPress={onReset}
        accessibilityRole="button"
        accessibilityLabel="Aramayı sıfırla"
        style={({ pressed }) => [
          styles.emptyButton,
          { backgroundColor: colors.stone950, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text style={[webFont(12, 900), styles.tracked, { color: '#FFFFFF' }]}>ARAMAYI SIFIRLA</Text>
      </Pressable>
    </View>
  );
}

function FilterDrawer({
  open,
  filters,
  brandOptions,
  bodyTypeOptions,
  filteredCount,
  active,
  onUpdate,
  onApply,
  onClose,
}: {
  open: boolean;
  filters: SearchFilters;
  brandOptions: FilterOption[];
  bodyTypeOptions: FilterOption[];
  filteredCount: number;
  active: boolean;
  onUpdate: (patch: Partial<SearchFilters>) => void;
  onApply: () => void;
  onClose: () => void;
}): React.JSX.Element {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.drawerRoot}>
        <Pressable style={[styles.drawerScrim, { backgroundColor: 'rgba(0,0,0,0.6)' }]} onPress={onClose} />
        <View style={[styles.drawerPanel, { backgroundColor: colors.cardBackground, paddingTop: insets.top + 12 }]}>
          <ScrollView contentContainerStyle={styles.drawerContent}>
            <View style={styles.drawerHeader}>
              <View style={styles.drawerHeaderLeft}>
                <Icon name="sliders" size={16} color={colors.stone900} />
                <Text style={[webFont(12, 900), { color: colors.stone900 }]}>Arama Filtreleri</Text>
              </View>
              <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Kapat">
                <Text style={[webFont(11, 900), { color: colors.stone600 }]}>✕ Kapat</Text>
              </Pressable>
            </View>
            <View style={[styles.hairline, { backgroundColor: colors.borderLight }]} />

            <WebFilterField
              title="Üretici Marka"
              value={filters.selectedBrand}
              options={brandOptions}
              onChange={(selectedBrand) => onUpdate({ selectedBrand })}
            />
            <WebFilterField
              title="Gövde Tipi"
              value={filters.selectedBodyType}
              options={bodyTypeOptions}
              onChange={(selectedBodyType) => onUpdate({ selectedBodyType })}
            />

            <SliderRow
              label="ASGARİ MENZİL (WLTP)"
              value={`${filters.minRange} km +`}
              min={0}
              max={600}
              step={25}
              current={filters.minRange}
              onChange={(minRange) => onUpdate({ minRange })}
            />
            <SliderRow
              label="MİNİMUM BATARYA"
              value={`${filters.minBattery} kWh`}
              min={0}
              max={100}
              step={5}
              current={filters.minBattery}
              onChange={(minBattery) => onUpdate({ minBattery })}
            />

            <WebFilterField
              title="Maksimum Bütçe"
              value={String(filters.maxPrice)}
              options={MAX_BUDGET_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
              onChange={(v) => onUpdate({ maxPrice: Number(v) })}
            />

            <Pressable
              onPress={onApply}
              accessibilityRole="button"
              accessibilityLabel="Filtreleri uygula"
              style={({ pressed }) => [
                styles.applyButton,
                { backgroundColor: colors.stone950, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[webFont(12, 900), styles.tracked, { color: '#FFFFFF' }]}>
                {active ? `${filteredCount} MODELİ GÖSTER` : 'KATALOĞU GÖSTER'}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  current,
  onChange,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  current: number;
  onChange: (value: number) => void;
}): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={styles.sliderRow}>
      <View style={styles.sliderHeader}>
        <Text style={[webFont(10, 800), styles.tracked, { color: colors.stone450 }]}>{label}</Text>
        <Text style={[webFont(12, 900), { color: colors.emerald600 }]}>{value}</Text>
      </View>
      <Slider
        value={current}
        minimumValue={min}
        maximumValue={max}
        step={step}
        onValueChange={onChange}
        minimumTrackTintColor={colors.emerald600}
        maximumTrackTintColor={colors.stone100}
        thumbTintColor={colors.emerald600}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  tracked: {
    letterSpacing: 0.8,
  },
  headerBlock: {
    gap: 8,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    padding: 0,
  },
  filterBar: {
    flexDirection: 'row',
    gap: 10,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radii.inner,
    paddingVertical: 14,
  },
  resetButton: {
    width: 52,
    height: 52,
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  guideChip: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toolbar: {
    gap: 12,
  },
  toolbarSummary: {
    flexShrink: 1,
  },
  toolbarControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  layoutToggle: {
    flexDirection: 'row',
    gap: 6,
  },
  layoutChip: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radii.button,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexShrink: 1,
  },
  gridResults: {
    gap: 16,
  },
  listResults: {
    gap: 14,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  pageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  emptyCard: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
    gap: 12,
    alignItems: 'center',
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyBody: {
    textAlign: 'center',
  },
  emptyButton: {
    borderRadius: radii.inner,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 4,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '70%',
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
  },
  sheetTitle: {
    marginTop: 12,
    marginBottom: 8,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  drawerRoot: {
    flex: 1,
    flexDirection: 'row',
  },
  drawerScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  drawerPanel: {
    width: 310,
    height: '100%',
  },
  drawerContent: {
    padding: 20,
    gap: 14,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  drawerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sliderRow: {
    gap: 8,
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  applyButton: {
    borderRadius: radii.inner,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  bottomSpacer: {
    height: 24,
  },
});
