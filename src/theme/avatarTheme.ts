// ProfileAvatarTheme — iOS ProfileAvatarTheme karşılığı (spec 03 §3.4/§3.5).
//
// Kullanıcı avatarında/menüde kullanılan renk teması. avatarColor anahtarı (emerald/indigo/
// amber/purple/stone) → renk. Bilinmeyen/boş anahtar → emerald (varsayılan). Ayarlar ekranındaki
// tema seçici bu seçenek listesini kullanır (Wave 5).

export interface AvatarThemeOption {
  key: string;
  label: string;
  color: string;
}

/** Seçenekler (key → label → color) — spec §3.5 avatar tema kartı sırası. */
export const AVATAR_THEME_OPTIONS: AvatarThemeOption[] = [
  { key: 'emerald', label: 'Ekolojik Yeşil', color: '#15803D' },
  { key: 'indigo', label: 'Lityum Mavi', color: '#4F46E5' },
  { key: 'amber', label: 'Şarj Sarısı', color: '#F59E0B' },
  { key: 'purple', label: 'Termal Mor', color: '#9333EA' },
  { key: 'stone', label: 'Karbon Gri', color: '#57534E' },
];

const BY_KEY = new Map(AVATAR_THEME_OPTIONS.map((o) => [o.key, o]));

/** avatarColor anahtarını renge çözer; bilinmeyen/boş → emerald (varsayılan). */
function colorFor(key?: string): string {
  if (key && BY_KEY.has(key)) return BY_KEY.get(key)!.color;
  return AVATAR_THEME_OPTIONS[0].color;
}

export const ProfileAvatarTheme = {
  options: AVATAR_THEME_OPTIONS,
  color: colorFor,
};
