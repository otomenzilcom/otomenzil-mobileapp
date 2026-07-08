// CarCardIdentityView — iOS marka/model kimliği (spec §4.9).
//
// Standart: BrandLogo(22) + brand uppercased 10/heavy emerald + "·" + model 12/bold stone900
// (tek satır). Compact: logo(20) + brand 9/heavy tek satır; model 11/bold iki satır altta.
// Marka/model ayrı basılabilir (marka → marka sayfası, model → detay).

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { trUppercase } from '../utils/turkishText';
import { useTheme, webFont } from '../theme';
import { BrandLogo } from './BrandLogo';

export interface CarCardIdentityProps {
  brand: string;
  model: string;
  brandLogos?: Record<string, string>;
  compact?: boolean;
  onBrandTap?: () => void;
  onModelTap?: () => void;
}

function logoFor(brand: string, brandLogos?: Record<string, string>): string | undefined {
  if (!brandLogos) return undefined;
  // Marka anahtarı büyük/küçük harfe duyarsız aranır.
  const key = Object.keys(brandLogos).find((k) => k.toLowerCase() === brand.toLowerCase());
  return key ? brandLogos[key] : undefined;
}

export function CarCardIdentity({
  brand,
  model,
  brandLogos,
  compact = false,
  onBrandTap,
  onModelTap,
}: CarCardIdentityProps): React.JSX.Element {
  const { colors } = useTheme();
  const logoURL = logoFor(brand, brandLogos);
  const brandLabel = trUppercase(brand);

  if (compact) {
    return (
      <View style={styles.compactWrap}>
        <Pressable
          onPress={onBrandTap}
          disabled={!onBrandTap}
          accessibilityRole={onBrandTap ? 'button' : undefined}
          accessibilityLabel={brand}
          style={styles.compactBrandRow}
        >
          <BrandLogo brand={brand} logoURL={logoURL} size={20} />
          <Text style={[webFont(9, 800), { color: colors.emerald }]} numberOfLines={1}>
            {brandLabel}
          </Text>
        </Pressable>
        <Pressable
          onPress={onModelTap}
          disabled={!onModelTap}
          accessibilityRole={onModelTap ? 'button' : undefined}
          accessibilityLabel={model}
        >
          <Text style={[webFont(11, 700), { color: colors.stone900 }]} numberOfLines={2}>
            {model}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onBrandTap}
        disabled={!onBrandTap}
        accessibilityRole={onBrandTap ? 'button' : undefined}
        accessibilityLabel={brand}
        style={styles.brandRow}
      >
        <BrandLogo brand={brand} logoURL={logoURL} size={22} />
        <Text style={[webFont(10, 800), { color: colors.emerald }]} numberOfLines={1}>
          {brandLabel}
        </Text>
      </Pressable>
      <Text style={[webFont(12, 700), { color: colors.stone500 }]}>·</Text>
      <Pressable
        onPress={onModelTap}
        disabled={!onModelTap}
        accessibilityRole={onModelTap ? 'button' : undefined}
        accessibilityLabel={model}
        style={styles.modelWrap}
      >
        <Text style={[webFont(12, 700), { color: colors.stone900 }]} numberOfLines={1}>
          {model}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modelWrap: {
    flexShrink: 1,
  },
  compactWrap: {
    gap: 4,
  },
  compactBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
