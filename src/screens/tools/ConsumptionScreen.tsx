// ConsumptionCalculationView — route `consumption` (spec 03 §1.1).
//
// Saf istemci-taraflı EV tüketim & şarj maliyeti hesaplayıcı. Girdi: store.catalogCars.
// API yok, mutasyon yok. Katalog/Manuel iki mod; sonuç kartı canlı güncellenir.

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  Icon,
  Slider,
  WebFilterField,
  type FilterOption,
} from '../../components';
import { useNavigationStore } from '../../stores';
import { radii, useTheme, webFont } from '../../theme';
import { CarPriceFormatter } from '../../utils/carPriceFormatter';
import { containsCaseInsensitiveTr } from '../../utils/turkishText';
import { consumptionValue, displayTitle } from '../catalog/shared';
import { ToolHeader } from './ToolHeader';
import {
  CONSUMPTION_TARIFFS,
  consumptionResult,
  type ConsumptionTariffId,
} from './consumptionCalc';

type Mode = 'catalog' | 'manual';

export function ConsumptionScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const catalog = useNavigationStore((s) => s.catalogCars);

  const [mode, setMode] = useState<Mode>('catalog');
  const [search, setSearch] = useState('');
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);

  const [manualName, setManualName] = useState('Özel Elektrikli Model');
  const [manualBattery, setManualBattery] = useState(75);
  const [manualRange, setManualRange] = useState(450);

  const [distance, setDistance] = useState(100);
  const [tariffId, setTariffId] = useState<ConsumptionTariffId>('home_low');

  // Katalog mod: arama filtresi (displayTitle/segment, tr duyarsız).
  const filteredCars = useMemo(() => {
    const query = search.trim();
    if (query.length === 0) return catalog;
    return catalog.filter(
      (car) =>
        containsCaseInsensitiveTr(displayTitle(car), query) ||
        containsCaseInsensitiveTr(car.segment ?? '', query),
    );
  }, [catalog, search]);

  // Varsayılan seçim = ilk katalog aracı (seçili yoksa / listeden düştüyse).
  const selectedCar = useMemo(() => {
    const explicit = filteredCars.find((c) => c.id === selectedCarId);
    return explicit ?? filteredCars[0] ?? catalog[0];
  }, [filteredCars, selectedCarId, catalog]);

  // Tüketim/100 km: katalog modda seçili araçtan; manuel modda batarya/menzil'den.
  const per100 = useMemo(() => {
    if (mode === 'catalog') {
      return selectedCar ? (consumptionValue(selectedCar) ?? 0) : 0;
    }
    if (!(manualRange > 0)) return 0;
    return (manualBattery / manualRange) * 100;
  }, [mode, selectedCar, manualBattery, manualRange]);

  const tariff = CONSUMPTION_TARIFFS.find((t) => t.id === tariffId) ?? CONSUMPTION_TARIFFS[0];
  const result = consumptionResult(per100, distance, tariff.price);

  const carOptions: FilterOption[] = filteredCars.map((car) => ({
    value: car.id,
    label: displayTitle(car),
  }));

  return (
    <ScrollView
      style={{ backgroundColor: colors.pageBackground }}
      contentContainerStyle={styles.content}
    >
      <ToolHeader
        badge="MENZİL HESAPLAMA"
        title="Elektrikli Araç Tüketim ve Şarj Maliyeti"
        subtitle="Gerçek yol senaryolarında kWh tüketimi ve TL maliyetini hesaplayın."
      />

      {/* Mod seçici */}
      <View style={[styles.segment, { backgroundColor: colors.stone100 }]}>
        <SegmentButton
          label="Katalogdan Seç"
          active={mode === 'catalog'}
          onPress={() => setMode('catalog')}
        />
        <SegmentButton
          label="Manuel Giriş"
          active={mode === 'manual'}
          onPress={() => setMode('manual')}
        />
      </View>

      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        {mode === 'catalog' ? (
          <View style={styles.stack}>
            <View style={[styles.searchField, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <Icon name="search" size={16} color={colors.stone500} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Araç ara…"
                placeholderTextColor={colors.stone450}
                style={[webFont(14, 500), styles.searchInput, { color: colors.stone900 }]}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {carOptions.length > 0 ? (
              <WebFilterField
                title="Araç"
                value={selectedCar?.id ?? ''}
                options={carOptions}
                onChange={setSelectedCarId}
              />
            ) : (
              <Text style={[webFont(12, 500), { color: colors.stone500 }]}>
                Aramaya uyan araç bulunamadı.
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.stack}>
            <LabeledInput
              label="Marka / Model"
              value={manualName}
              onChangeText={setManualName}
            />
            <SliderRow
              label="Batarya (kWh)"
              value={manualBattery}
              min={30}
              max={120}
              step={1}
              onChange={setManualBattery}
            />
            <SliderRow
              label="Menzil (km)"
              value={manualRange}
              min={200}
              max={800}
              step={10}
              onChange={setManualRange}
            />
          </View>
        )}

        <SliderRow
          label="Mesafe (km)"
          value={distance}
          min={10}
          max={500}
          step={1}
          onChange={setDistance}
        />

        {/* Tarife seçimi */}
        <Text style={[webFont(10, 900), styles.sectionLabel, { color: colors.stone500 }]}>
          TARİFE SEÇİMİ
        </Text>
        <View style={styles.tariffList}>
          {CONSUMPTION_TARIFFS.map((t) => {
            const active = t.id === tariffId;
            return (
              <TariffRow
                key={t.id}
                name={t.name}
                price={t.price}
                active={active}
                onPress={() => setTariffId(t.id)}
              />
            );
          })}
        </View>
      </View>

      {/* Sonuç kartı (canlı) */}
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.emerald100 }]}>
        <Text style={[webFont(10, 900), styles.sectionLabel, { color: colors.emerald600 }]}>
          SONUÇ
        </Text>
        <View style={styles.resultRow}>
          <Text style={[webFont(28, 900), { color: colors.stone900 }]}>
            {result.consumedKwh.toFixed(1)}
          </Text>
          <Text style={[webFont(13, 600), styles.resultUnit, { color: colors.stone500 }]}>
            kWh tüketim
          </Text>
        </View>
        <Text style={[webFont(22, 900), { color: colors.emerald700 }]}>
          {CarPriceFormatter.formatTL(result.totalCost)}
        </Text>
        <Text style={[webFont(12, 500), { color: colors.stone500 }]}>
          {`${result.costPerKm.toFixed(2)} TL/km · ${per100.toFixed(1)} kWh/100km`}
        </Text>
      </View>
    </ScrollView>
  );
}

function SegmentButton({
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
      style={[styles.segmentButton, { backgroundColor: active ? colors.stone950 : 'transparent' }]}
    >
      <Text style={[webFont(13, active ? 800 : 600), { color: active ? '#FFFFFF' : colors.stone600 }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
}): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={styles.fieldStack}>
      <Text style={[webFont(10, 800), styles.fieldLabel, { color: colors.stone450 }]}>
        {label.toUpperCase()}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={[
          webFont(14, 600),
          styles.textInput,
          { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.stone900 },
        ]}
      />
    </View>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={styles.fieldStack}>
      <View style={styles.sliderHeader}>
        <Text style={[webFont(10, 800), styles.fieldLabel, { color: colors.stone450 }]}>
          {label.toUpperCase()}
        </Text>
        <Text style={[webFont(13, 800), { color: colors.emerald700 }]}>
          {value.toFixed(0)}
        </Text>
      </View>
      <Slider
        value={value}
        minimumValue={min}
        maximumValue={max}
        step={step}
        onValueChange={onChange}
        minimumTrackTintColor={colors.emerald500}
        maximumTrackTintColor={colors.stone300}
      />
    </View>
  );
}

function TariffRow({
  name,
  price,
  active,
  onPress,
}: {
  name: string;
  price: number;
  active: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={name}
      style={({ pressed }) => [
        styles.tariffRow,
        active
          ? { backgroundColor: colors.emerald50, borderColor: colors.emerald500 }
          : { backgroundColor: colors.cardBackground, borderColor: colors.border },
        { opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Icon
        name="check-circle"
        size={18}
        color={active ? colors.emerald600 : colors.stone300}
      />
      <View style={styles.tariffText}>
        <Text style={[webFont(13, 700), { color: colors.stone900 }]}>{name}</Text>
        <Text style={[webFont(11, 500), { color: colors.stone500 }]}>
          {`${price.toFixed(2)} TL/kWh`}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingTop: 20,
    gap: 16,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: radii.button,
    padding: 4,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: radii.button - 2,
    paddingVertical: 10,
  },
  card: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 14,
  },
  stack: {
    gap: 14,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    padding: 0,
  },
  fieldStack: {
    gap: 6,
  },
  fieldLabel: {
    letterSpacing: 0.4,
  },
  textInput: {
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    letterSpacing: 0.4,
  },
  tariffList: {
    gap: 8,
  },
  tariffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  tariffText: {
    flex: 1,
    gap: 2,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  resultUnit: {
    marginBottom: 4,
  },
});
