// BrandsView (route `brands`) — A–Z marka gezgini + marka başına model listesi (spec §7).
//
// store.catalogCars / store.brandLogos üzerinden tamamen istemci-taraflı. Görünürken
// store.selectedBrandName ön-seçimini (openBrand set eder) tüketir ve temizler. Tek ScrollView:
// header, harf filtresi, marka listesi, marka detay başlığı, model listesi (list layout kartları).

import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  BrandLogo,
  CarCatalogCard,
  Icon,
  WebEmeraldBadge,
} from '../../components';
import type { CarSummary } from '../../models/car';
import { AppView } from '../../models/navigation';
import { useAuthStore } from '../../stores/authStore';
import { useNavigationStore } from '../../stores/navigationStore';
import { radii, useTheme, webFont } from '../../theme';
import { brandLetter, brandLetters, catalogBrands } from './shared';

export function BrandsScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const catalogCars = useNavigationStore((s) => s.catalogCars);
  const brandLogos = useNavigationStore((s) => s.brandLogos);
  const selectedBrandName = useNavigationStore((s) => s.selectedBrandName);
  const setSelectedBrandName = useNavigationStore((s) => s.setSelectedBrandName);
  const navigate = useNavigationStore((s) => s.navigate);
  const openCarDetail = useNavigationStore((s) => s.openCarDetail);
  const addToCompare = useNavigationStore((s) => s.addToCompare);
  const removeFromCompare = useNavigationStore((s) => s.removeFromCompare);
  const compareList = useNavigationStore((s) => s.compareList);

  const toggleFavorite = useAuthStore((s) => s.toggleFavorite);
  const toggleGarageCar = useAuthStore((s) => s.toggleGarageCar);
  const garageCarIds = useAuthStore((s) => s.garageCarIds);
  const favorites = useAuthStore((s) => s.favorites);
  const busyGarageCarIds = useAuthStore((s) => s.busyGarageCarIds);
  const isLoggedIn = useAuthStore((s) => s.currentUser !== null);

  const brands = useMemo(() => catalogBrands(catalogCars), [catalogCars]);
  const letters = useMemo(() => brandLetters(brands), [brands]);

  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  const filteredBrands = useMemo(() => {
    if (activeLetter == null) return brands;
    return brands.filter((brand) => brandLetter(brand) === activeLetter);
  }, [brands, activeLetter]);

  // openBrand ön-seçimini render sırasında yakala (React "you might not need an effect" deseni):
  // store'daki geçişli değeri yerel seçime kopyala; store temizliği harici yazımdır → efektte.
  if (selectedBrandName != null && selectedBrandName !== selectedBrand) {
    setSelectedBrand(selectedBrandName);
  }
  useEffect(() => {
    if (selectedBrandName != null) setSelectedBrandName(null);
  }, [selectedBrandName, setSelectedBrandName]);

  // Seçim filtreli listeden düşerse ilk uygun markaya düş.
  const activeBrand = useMemo(() => {
    if (selectedBrand != null && filteredBrands.includes(selectedBrand)) return selectedBrand;
    return filteredBrands[0] ?? brands[0] ?? null;
  }, [selectedBrand, filteredBrands, brands]);

  const brandCars = useMemo(
    () => (activeBrand == null ? [] : catalogCars.filter((car) => car.brand === activeBrand)),
    [catalogCars, activeBrand],
  );

  const rangeAverage = useMemo(() => {
    const values = brandCars.map((c) => c.rangeKm).filter((v): v is number => v != null && v > 0);
    if (values.length === 0) return null;
    return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
  }, [brandCars]);

  function toggleCompare(car: CarSummary): void {
    if (compareList.some((c) => c.id === car.id)) removeFromCompare(car.id);
    else addToCompare(car);
  }

  function cardProps(car: CarSummary): React.ComponentProps<typeof CarCatalogCard> {
    return {
      car,
      layout: 'list',
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

  return (
    <ScrollView
      style={{ backgroundColor: colors.pageBackground }}
      contentContainerStyle={styles.content}
    >
      {/* 1. Header */}
      <View style={styles.headerRow}>
        <WebEmeraldBadge text="Elektrikli Araç Markaları" />
        <View style={[styles.countCapsule, { backgroundColor: colors.stone950 }]}>
          <Text style={[webFont(10, 900), styles.tracked, { color: '#FFFFFF' }]}>
            {brands.length} MARKA
          </Text>
        </View>
      </View>
      <Text style={[webFont(28, 900), { color: colors.stone900 }]}>Elektrikli Araç Markaları</Text>
      <Text style={[webFont(12, 600), { color: colors.stone500 }]}>
        Türkiye pazarındaki markaları seçerek modelleri, menzil ortalamalarını ve teknik profilleri
        karşılaştırın.
      </Text>

      {/* 2. Harf filtresi */}
      <View style={styles.letterHeaderRow}>
        <Text style={[webFont(10, 900), styles.tracked, { color: colors.stone400 }]}>
          MARKALAR ({filteredBrands.length})
        </Text>
        {activeLetter != null ? (
          <Text style={[webFont(10, 700), { color: colors.stone500 }]}>Seçili harf: {activeLetter}</Text>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.letterRow}>
        <LetterChip
          label="Tümü"
          active={activeLetter == null}
          activeBg={colors.stone950}
          onPress={() => setActiveLetter(null)}
        />
        {letters.map((letter) => (
          <LetterChip
            key={letter}
            label={letter}
            active={activeLetter === letter}
            activeBg={colors.emerald600}
            onPress={() => setActiveLetter(letter)}
          />
        ))}
      </ScrollView>

      {/* 3. Marka listesi */}
      <View style={styles.brandList}>
        {filteredBrands.map((brand) => {
          const isActive = brand === activeBrand;
          const count = catalogCars.filter((c) => c.brand === brand).length;
          return (
            <Pressable
              key={brand}
              onPress={() => setSelectedBrand(brand)}
              accessibilityRole="button"
              accessibilityLabel={brand}
              style={[
                styles.brandRow,
                {
                  backgroundColor: isActive ? colors.stone950 : colors.cardBackground,
                  borderColor: colors.border,
                },
              ]}
            >
              <BrandLogo brand={brand} logoURL={brandLogos[brand]} size={36} />
              <Text style={[webFont(14, 900), styles.brandRowName, { color: isActive ? '#FFFFFF' : colors.stone900 }]}>
                {brand}
              </Text>
              <Text style={[webFont(11, 600), { color: isActive ? colors.stone300 : colors.stone500 }]}>
                {count} model
              </Text>
              <Icon name="chevron-forward" size={16} color={isActive ? colors.stone300 : colors.stone400} />
            </Pressable>
          );
        })}
      </View>

      {/* 4. Marka detay başlığı */}
      {activeBrand != null ? (
        <View style={[styles.brandDetailHeader, { backgroundColor: colors.emerald50, borderColor: colors.emerald100 }]}>
          <BrandLogo brand={activeBrand} logoURL={brandLogos[activeBrand]} size={48} />
          <View style={styles.brandDetailBody}>
            <Text style={[webFont(20, 900), { color: colors.stone900 }]}>{activeBrand}</Text>
            <View style={styles.brandChips}>
              <View style={[styles.brandChip, { backgroundColor: colors.emerald50, borderColor: colors.emerald100 }]}>
                <Text style={[webFont(9, 900), styles.tracked, { color: colors.emerald700 }]}>
                  {brandCars.length} MODEL
                </Text>
              </View>
              {rangeAverage != null ? (
                <View style={[styles.brandChip, { backgroundColor: colors.emerald50, borderColor: colors.emerald100 }]}>
                  <Text style={[webFont(9, 900), styles.tracked, { color: colors.emerald700 }]}>
                    ORT. {rangeAverage} KM
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      ) : null}

      {/* 5. Model listesi */}
      <View style={styles.modelList}>
        {brandCars.map((car) => (
          <CarCatalogCard key={car.id} {...cardProps(car)} />
        ))}
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

function LetterChip({
  label,
  active,
  activeBg,
  onPress,
}: {
  label: string;
  active: boolean;
  activeBg: string;
  onPress: () => void;
}): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.letterChip,
        { backgroundColor: active ? activeBg : colors.stone50, borderColor: colors.border },
      ]}
    >
      <Text style={[webFont(12, 800), { color: active ? '#FFFFFF' : colors.stone700 }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
  },
  tracked: {
    letterSpacing: 0.8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countCapsule: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  letterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  letterRow: {
    gap: 6,
    paddingVertical: 2,
  },
  letterChip: {
    minWidth: 40,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  brandList: {
    gap: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  brandRowName: {
    flex: 1,
  },
  brandDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginTop: 4,
  },
  brandDetailBody: {
    flex: 1,
    gap: 8,
  },
  brandChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  brandChip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  modelList: {
    gap: 14,
  },
  bottomSpacer: {
    height: 24,
  },
});
