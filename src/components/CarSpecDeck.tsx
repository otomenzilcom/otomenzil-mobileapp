// CarSpecDeckView — iOS 2-sütun teknik özet grid'i (spec §4.12).
//
// "Label: value" satırları — Menzil / Batarya / Güç / 0-100. 10/semibold stone500 label,
// black-weight stone850 value. Konteyner bg stone50, radius 16, borderLight stroke.

import { StyleSheet, Text, View } from 'react-native';

import { radii, useTheme, webFont } from '../theme';
import {
  formatAcceleration,
  formatBattery,
  formatPower,
  formatRange,
} from './carSpecFormat';

export interface CarSpecDeckProps {
  rangeKm?: number;
  batteryKwh?: number;
  powerHp?: number;
  accelerationSec?: number;
}

export function CarSpecDeck({
  rangeKm,
  batteryKwh,
  powerHp,
  accelerationSec,
}: CarSpecDeckProps): React.JSX.Element {
  const { colors } = useTheme();
  const rows: { label: string; value: string }[] = [
    { label: 'Menzil', value: formatRange(rangeKm) },
    { label: 'Batarya', value: formatBattery(batteryKwh) },
    { label: 'Güç', value: formatPower(powerHp) },
    { label: '0-100', value: formatAcceleration(accelerationSec) },
  ];

  return (
    <View
      style={[
        styles.deck,
        { backgroundColor: colors.stone50, borderColor: colors.borderLight },
      ]}
    >
      {rows.map((row) => (
        <View key={row.label} style={styles.cell}>
          <Text style={[webFont(10, 600), { color: colors.stone500 }]}>{row.label}</Text>
          <Text style={[webFont(12, 900), { color: colors.stone850 }]} numberOfLines={1}>
            {row.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  deck: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    rowGap: 10,
  },
  cell: {
    width: '50%',
    gap: 2,
  },
});
