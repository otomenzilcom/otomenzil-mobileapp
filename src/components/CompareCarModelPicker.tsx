// CompareCarModelPicker — iOS 3-adım kademeli menü (spec §4.17).
//
// Marka → Kasa Tipi → Model. Her adım numaralı rozet + uppercased etiket. Marka değişince
// kasa sıfırlanır; model seçimi onSelect çağırır ve marka/kasa sıfırlanır. Menu yerine RN Modal
// tabanlı liste seçici (yeni bağımlılık yok).

import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { CarSummary } from '../models/car';
import { compareLocalizedTr } from '../utils/turkishText';
import { radii, useTheme, webFont } from '../theme';
import { Icon } from './ComponentIcon';

export interface CompareCarModelPickerProps {
  cars: CarSummary[];
  excludeIds?: string[];
  onSelect: (car: CarSummary) => void;
}

function distinct(values: (string | undefined)[]): string[] {
  const set = new Set<string>();
  for (const v of values) {
    if (v != null && v.trim().length > 0) set.add(v);
  }
  return [...set].sort(compareLocalizedTr);
}

export function CompareCarModelPicker({
  cars,
  excludeIds = [],
  onSelect,
}: CompareCarModelPickerProps): React.JSX.Element {
  const { colors } = useTheme();
  const [brand, setBrand] = useState<string | null>(null);
  const [bodyType, setBodyType] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | null>(null);

  const available = useMemo(
    () => cars.filter((c) => !excludeIds.includes(c.id)),
    [cars, excludeIds],
  );

  const brands = useMemo(() => distinct(available.map((c) => c.brand)), [available]);
  const bodyTypes = useMemo(
    () => (brand ? distinct(available.filter((c) => c.brand === brand).map((c) => c.bodyType)) : []),
    [available, brand],
  );
  const models = useMemo(
    () =>
      brand && bodyType
        ? available
            .filter((c) => c.brand === brand && c.bodyType === bodyType)
            .sort((a, b) => compareLocalizedTr(a.model, b.model))
        : [],
    [available, brand, bodyType],
  );

  const closeStep = (): void => setActiveStep(null);

  const handleBrand = (value: string): void => {
    setBrand(value);
    setBodyType(null); // marka değişince kasa sıfırla
    closeStep();
  };
  const handleBodyType = (value: string): void => {
    setBodyType(value);
    closeStep();
  };
  const handleModel = (car: CarSummary): void => {
    onSelect(car);
    setBrand(null);
    setBodyType(null);
    closeStep();
  };

  return (
    <View style={styles.wrap}>
      <StepTrigger
        index={1}
        label="Marka Seçin"
        value={brand ?? 'Marka seçin...'}
        onPress={() => setActiveStep(1)}
      />
      <StepTrigger
        index={2}
        label="Kasa Tipi Seçin"
        value={bodyType ?? 'Kasa tipi seçin...'}
        disabled={!brand}
        onPress={() => setActiveStep(2)}
      />
      <StepTrigger
        index={3}
        label="Model Seçin"
        value="Model seçin..."
        disabled={!brand || !bodyType}
        onPress={() => setActiveStep(3)}
      />

      <PickerSheet
        visible={activeStep === 1}
        title="Marka Seçin"
        onClose={closeStep}
        options={brands.map((b) => ({ key: b, label: b }))}
        onPick={(k) => handleBrand(k)}
      />
      <PickerSheet
        visible={activeStep === 2}
        title="Kasa Tipi Seçin"
        onClose={closeStep}
        options={bodyTypes.map((b) => ({ key: b, label: b }))}
        onPick={(k) => handleBodyType(k)}
      />
      <PickerSheet
        visible={activeStep === 3}
        title="Model Seçin"
        onClose={closeStep}
        options={models.map((c) => ({
          key: c.id,
          label: `${c.model} (${c.year != null ? c.year : '—'})`,
        }))}
        onPick={(k) => {
          const match = models.find((c) => c.id === k);
          if (match) handleModel(match);
        }}
      />
    </View>
  );

  function StepTrigger({
    index,
    label,
    value,
    disabled,
    onPress,
  }: {
    index: number;
    label: string;
    value: string;
    disabled?: boolean;
    onPress: () => void;
  }): React.JSX.Element {
    return (
      <View style={[styles.step, disabled && styles.stepDisabled]}>
        <View style={styles.stepLabelRow}>
          <View style={[styles.badge, { backgroundColor: colors.emerald600 }]}>
            <Text style={[webFont(9, 900), { color: '#FFFFFF' }]}>{index}</Text>
          </View>
          <Text style={[webFont(10, 900), { color: colors.stone500, letterSpacing: 0.4 }]}>
            {label.toUpperCase()}
          </Text>
        </View>
        <Pressable
          onPress={onPress}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={label}
          style={[
            styles.trigger,
            { backgroundColor: colors.cardBackground, borderColor: colors.border },
          ]}
        >
          <Text style={[webFont(14, 700), { color: colors.stone800 }]} numberOfLines={1}>
            {value}
          </Text>
          <Icon name="chevron-down" size={16} color={colors.stone500} />
        </Pressable>
      </View>
    );
  }
}

interface PickerOption {
  key: string;
  label: string;
}

function PickerSheet({
  visible,
  title,
  options,
  onClose,
  onPick,
}: {
  visible: boolean;
  title: string;
  options: PickerOption[];
  onClose: () => void;
  onPick: (key: string) => void;
}): React.JSX.Element {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.scrim }]} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.cardBackground, paddingBottom: insets.bottom + 12 },
        ]}
      >
        <View style={[styles.grabber, { backgroundColor: colors.border }]} />
        <Text style={[webFont(13, 900), styles.sheetTitle, { color: colors.stone900 }]}>
          {title}
        </Text>
        <ScrollView style={styles.optionList}>
          {options.length === 0 ? (
            <Text style={[webFont(12, 500), styles.emptyOption, { color: colors.stone500 }]}>
              Seçenek yok.
            </Text>
          ) : (
            options.map((opt) => (
              <Pressable
                key={opt.key}
                onPress={() => onPick(opt.key)}
                accessibilityRole="button"
                accessibilityLabel={opt.label}
                style={({ pressed }) => [
                  styles.option,
                  { borderBottomColor: colors.borderLight, opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Text style={[webFont(14, 600), { color: colors.stone800 }]}>{opt.label}</Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  step: {
    gap: 6,
  },
  stepDisabled: {
    opacity: 0.55,
  },
  stepLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  optionList: {
    flexGrow: 0,
  },
  option: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  emptyOption: {
    paddingVertical: 14,
  },
});
