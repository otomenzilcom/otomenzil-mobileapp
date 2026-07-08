// WebFilterField — iOS jenerik dropdown alanı (spec §4.24).
//
// Uppercased başlık 10/heavy stone450 + Menu trigger (seçili etiket 12/bold + chevron). bg
// inputBackground, radius 16, border stroke. Menu yerine RN Modal tabanlı alt-sayfa seçici.

import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radii, useTheme, webFont } from '../theme';
import { Icon } from './ComponentIcon';

export interface FilterOption {
  value: string;
  label: string;
}

export interface WebFilterFieldProps {
  title: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

export function WebFilterField({
  title,
  value,
  options,
  onChange,
}: WebFilterFieldProps): React.JSX.Element {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label ?? options[0]?.label ?? '';

  return (
    <View style={styles.field}>
      <Text style={[webFont(10, 800), styles.title, { color: colors.stone450 }]}>
        {title.toUpperCase()}
      </Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={title}
        style={[styles.trigger, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
      >
        <Text style={[webFont(12, 700), { color: colors.stone800 }]} numberOfLines={1}>
          {selectedLabel}
        </Text>
        <Icon name="chevron-down" size={14} color={colors.stone500} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: colors.scrim }]} onPress={() => setOpen(false)} />
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
          <ScrollView style={styles.list}>
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={opt.label}
                  style={({ pressed }) => [
                    styles.option,
                    { borderBottomColor: colors.borderLight, opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Text
                    style={[webFont(14, active ? 800 : 600), { color: active ? colors.emerald700 : colors.stone800 }]}
                  >
                    {opt.label}
                  </Text>
                  {active ? <Icon name="check-circle" size={16} color={colors.emerald600} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 6,
  },
  title: {
    letterSpacing: 0.4,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 11,
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
  list: {
    flexGrow: 0,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
