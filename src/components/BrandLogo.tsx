// BrandLogoView — iOS marka logosu (spec §4.10).
//
// Uzak logo (logoURL) varsa scaledToFit size×size, radius 6; yoksa fallback = ilk 2 harf
// uppercased (size×0.38 black weight, stone600 on stone100).

import { StyleSheet, Text, View } from 'react-native';

import { trUppercase } from '../utils/turkishText';
import { useTheme, webFont } from '../theme';
import { CachedImage } from './CachedImage';

export interface BrandLogoProps {
  brand: string;
  logoURL?: string;
  size?: number;
}

export function BrandLogo({ brand, logoURL, size = 24 }: BrandLogoProps): React.JSX.Element {
  const { colors } = useTheme();
  const hasLogo = logoURL != null && logoURL.trim().length > 0;
  const initials = trUppercase(brand.trim().slice(0, 2));

  if (hasLogo) {
    return (
      <CachedImage
        uri={logoURL}
        contentFit="contain"
        style={{ width: size, height: size, borderRadius: 6 }}
        placeholderColor={colors.stone100}
        accessibilityLabel={brand}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, backgroundColor: colors.stone100 },
      ]}
    >
      <Text style={[webFont(size * 0.38, 900), { color: colors.stone600 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
