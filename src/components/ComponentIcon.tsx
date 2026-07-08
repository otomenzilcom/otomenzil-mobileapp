// Bileşen ikonları — iOS SF Symbol / web Lucide adlarını @expo/vector-icons Ionicons'a eşler.
//
// Shell'in NavIcon.tsx deseniyle aynı yaklaşım: spec Lucide öneriyor ama o paket kurulu değil;
// zaten kurulu Ionicons kullanılır (tam kapsam). Bileşenler yalnızca bu <Icon> soyutlamasına
// bağlıdır — ileride Lucide'a geçiş tek dosyayı etkiler.

import Ionicons from '@expo/vector-icons/Ionicons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * Bileşenlerde geçen semantik ikon adları (SF Symbol / Lucide karışımı) → Ionicons.
 * `-fill` gibi son ekler sadeleştirilmiş; fill/outline ayrımını Ionicons kendi adlarıyla verir.
 */
export type IconName =
  | 'heart'
  | 'heart-outline'
  | 'star'
  | 'star-outline'
  | 'chevron-down'
  | 'chevron-up'
  | 'chevron-forward'
  | 'chevron-back'
  | 'close'
  | 'sparkles'
  | 'send'
  | 'reply'
  | 'check-seal'
  | 'check-circle'
  | 'alert-triangle'
  | 'info'
  | 'lock'
  | 'printer'
  | 'compare'
  | 'flame'
  | 'battery'
  | 'bolt'
  | 'sliders'
  | 'book'
  | 'clock'
  | 'calendar'
  | 'arrow-forward'
  | 'list'
  | 'signpost'
  | 'snow'
  | 'sun'
  | 'moon'
  | 'location'
  | 'chart-up'
  | 'share'
  | 'mail'
  | 'shield'
  | 'scale'
  | 'fork-knife'
  | 'search'
  | 'user'
  | 'menu'
  | 'car'
  | 'login'
  | 'gauge';

const ICON_MAP: Record<IconName, IoniconName> = {
  heart: 'heart',
  'heart-outline': 'heart-outline',
  star: 'star',
  'star-outline': 'star-outline',
  'chevron-down': 'chevron-down',
  'chevron-up': 'chevron-up',
  'chevron-forward': 'chevron-forward',
  'chevron-back': 'chevron-back',
  close: 'close',
  sparkles: 'sparkles',
  send: 'paper-plane',
  reply: 'arrow-undo',
  'check-seal': 'checkmark-circle',
  'check-circle': 'checkmark-circle',
  'alert-triangle': 'warning',
  info: 'information-circle',
  lock: 'lock-closed',
  printer: 'print',
  compare: 'swap-horizontal',
  flame: 'flame',
  battery: 'battery-charging',
  bolt: 'flash',
  sliders: 'options',
  book: 'book',
  clock: 'time',
  calendar: 'calendar',
  'arrow-forward': 'arrow-forward',
  list: 'list',
  signpost: 'navigate',
  snow: 'snow',
  sun: 'sunny',
  moon: 'moon',
  location: 'location',
  'chart-up': 'trending-up',
  share: 'share-social',
  mail: 'mail',
  shield: 'shield-checkmark',
  scale: 'scale',
  'fork-knife': 'restaurant',
  search: 'search',
  user: 'person',
  menu: 'menu',
  car: 'car',
  login: 'log-in',
  gauge: 'speedometer',
};

export interface IconProps {
  name: IconName;
  size?: number;
  color: string;
}

/** Semantik ada göre ikon çizer (bileşen genelinde tek soyutlama). */
export function Icon({ name, size = 16, color }: IconProps): React.JSX.Element {
  return <Ionicons name={ICON_MAP[name]} size={size} color={color} />;
}
