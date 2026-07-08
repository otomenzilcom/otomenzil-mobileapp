// CarPriceView — iOS fiyat gösterimi (spec §4.11).
//
// TR-available: tek metin (primaryPriceText), emerald, black weight — detail 28 / compact 14.
// Not available: "TR'de satışta değil" chip + yurt dışı fiyat satırı + (detail, foreign varsa)
// "Yurt dışı liste fiyatı" caption. Hizalama: detail → leading, compact → trailing.

import { StyleSheet, Text, View } from 'react-native';

import { CarPriceFormatter } from '../utils/carPriceFormatter';
import { useTheme, webFont } from '../theme';

export type CarPriceStyle = 'compact' | 'detail';

export interface CarPriceProps {
  priceTL?: number;
  priceForeign?: string;
  trAvailable?: boolean;
  style: CarPriceStyle;
}

export function CarPrice({
  priceTL,
  priceForeign,
  trAvailable,
  style,
}: CarPriceProps): React.JSX.Element {
  const { colors } = useTheme();
  const detail = style === 'detail';
  const available = CarPriceFormatter.isAvailableInTurkey(trAvailable);
  const alignStyle = detail ? styles.leading : styles.trailing;

  if (available) {
    const text = CarPriceFormatter.primaryPriceText(priceTL, priceForeign, trAvailable);
    return (
      <View style={alignStyle}>
        <Text
          style={[webFont(detail ? 28 : 14, 900), { color: colors.emerald }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {text}
        </Text>
      </View>
    );
  }

  const foreign = (priceForeign ?? '').trim();
  const foreignText = CarPriceFormatter.primaryPriceText(priceTL, priceForeign, trAvailable);

  return (
    <View style={[alignStyle, styles.unavailable]}>
      <View style={[styles.chip, { backgroundColor: colors.stone100 }]}>
        <Text style={[webFont(10, 600), { color: colors.stone600 }]}>TR&apos;de satışta değil</Text>
      </View>
      <Text
        style={[webFont(detail ? 28 : 14, detail ? 900 : 700), { color: colors.stone900 }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {foreignText}
      </Text>
      {detail && foreign.length > 0 ? (
        <Text style={[webFont(11, 500), { color: colors.stone400 }]}>Yurt dışı liste fiyatı</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  leading: {
    alignItems: 'flex-start',
  },
  trailing: {
    alignItems: 'flex-end',
  },
  unavailable: {
    gap: 4,
  },
  chip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
});
