// Shell ikonları — web ikon token'ı / SF Symbol adı → @expo/vector-icons Ionicons.
//
// Wave 3 shell chrome'u için hafif ikon eşlemesi. Spec Lucide (lucide-react-native) öneriyor
// ancak o paket kurulu değil ve Wave 3'e yeni bağımlılık eklemeden ilerlemek için @expo/
// vector-icons (zaten kurulu, Ionicons tam kapsam) kullanılır. Wave 5 isterse Lucide'a geçebilir;
// bileşenler yalnızca bu <NavIcon> soyutlamasına bağlıdır.

import Ionicons from '@expo/vector-icons/Ionicons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * siteBootstrap NavIconHelper web token'ı (home/car/compare/blog/zap/globe/layers/landmark/
 * lira/calculator/trophy/battery/gauge) → Ionicons adı.
 */
export function ioniconForToken(icon?: string): IoniconName {
  switch (icon) {
    case 'home':
      return 'home';
    case 'car':
      return 'car';
    case 'compare':
      return 'swap-horizontal';
    case 'blog':
      return 'newspaper';
    case 'zap':
      return 'flash';
    case 'globe':
      return 'globe';
    case 'layers':
      return 'layers';
    case 'landmark':
    case 'lira':
      return 'business';
    case 'calculator':
      return 'calculator';
    case 'trophy':
      return 'trophy';
    case 'battery':
      return 'battery-charging';
    case 'gauge':
      return 'speedometer';
    default:
      return 'chevron-forward';
  }
}

export interface NavIconProps {
  /** Web ikon token'ı (siteBootstrap NavIconHelper ile aynı). */
  token?: string;
  size?: number;
  color: string;
}

/** Web token'ıyla ikon çizer (drawer/subnav navigasyon öğeleri için). */
export function NavIcon({ token, size = 18, color }: NavIconProps): React.JSX.Element {
  return <Ionicons name={ioniconForToken(token)} size={size} color={color} />;
}

export interface GlyphProps {
  name: IoniconName;
  size?: number;
  color: string;
}

/** Doğrudan Ionicons adıyla ikon (shell chrome — arama/menü/çarpı vb.). */
export function Glyph({ name, size = 22, color }: GlyphProps): React.JSX.Element {
  return <Ionicons name={name} size={size} color={color} />;
}
