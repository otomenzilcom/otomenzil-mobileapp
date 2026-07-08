// WebShellComponents — iOS AppTheme.swift + WebShellComponents.swift paylaşılan parçaları
// (spec §1.5 ve §4.7). Bölüm başlıkları, rozetler, birincil buton, aksan çubuğu, özellik
// kartları, renk modu toggle'ı, garaj/favori overlay butonları.

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { usePreferencesStore } from '../stores';
import { radii, useTheme, webFont } from '../theme';
import { Icon, type IconName } from './ComponentIcon';

// ── WebEmeraldBadge (§1.5) ──────────────────────────────────────────────────────────

export interface WebEmeraldBadgeProps {
  text: string;
}

/** Uppercased 10/black tracking 0.8, emerald700, emerald50 bg, emerald100 capsule stroke. */
export function WebEmeraldBadge({ text }: WebEmeraldBadgeProps): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.emeraldBadge,
        { backgroundColor: colors.emerald50, borderColor: colors.emerald100 },
      ]}
    >
      <Text style={[webFont(10, 900), { color: colors.emerald700, letterSpacing: 0.8 }]}>
        {text.toUpperCase()}
      </Text>
    </View>
  );
}

// ── WebSectionHeader (§1.5) ─────────────────────────────────────────────────────────

export interface WebSectionHeaderProps {
  badge: string;
  title: string;
  subtitle?: string;
}

/** Badge (10/black tracking 1 emerald600) + title (24/black stone900) + subtitle (13/medium). */
export function WebSectionHeader({
  badge,
  title,
  subtitle,
}: WebSectionHeaderProps): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[webFont(10, 900), { color: colors.emerald600, letterSpacing: 1 }]}>
        {badge.toUpperCase()}
      </Text>
      <Text style={[webFont(24, 900), { color: colors.stone900 }]}>{title}</Text>
      {subtitle ? (
        <Text style={[webFont(13, 500), { color: colors.stone500 }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

// ── WebPrimaryButton (§1.5) ─────────────────────────────────────────────────────────

export interface WebPrimaryButtonProps {
  title: string;
  onPress: () => void;
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Uppercased 11/black tracking 1.2 white on emerald600, full width, v-pad 14, radius 16. */
export function WebPrimaryButton({
  title,
  onPress,
  icon,
  disabled,
  style,
}: WebPrimaryButtonProps): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        styles.primaryButton,
        { backgroundColor: colors.emerald600, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={15} color="#FFFFFF" /> : null}
      <Text style={[webFont(11, 900), { color: '#FFFFFF', letterSpacing: 1.2 }]}>
        {title.toUpperCase()}
      </Text>
    </Pressable>
  );
}

// ── WebCardAccentBar (§1.5) ─────────────────────────────────────────────────────────

export interface WebCardAccentBarProps {
  width?: number;
  color?: string;
}

/** Dikey yuvarlatılmış aksan çubuğu (r=2). */
export function WebCardAccentBar({ width = 5, color }: WebCardAccentBarProps): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={[styles.accentBar, { width, backgroundColor: color ?? colors.emerald500 }]} />
  );
}

// ── WebFeatureCard (§4.7) ───────────────────────────────────────────────────────────

export interface WebFeatureCardProps {
  icon: IconName;
  title: string;
  text: string;
  darkSurface?: boolean;
}

/** 40×40 ikon karo (emerald tint) + başlık 13/black + metin 11/medium; radius 16. */
export function WebFeatureCard({
  icon,
  title,
  text,
  darkSurface = false,
}: WebFeatureCardProps): React.JSX.Element {
  const { colors } = useTheme();
  const surface = darkSurface
    ? { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }
    : { backgroundColor: colors.cardBackground, borderColor: colors.border };
  const titleColor = darkSurface ? '#FFFFFF' : colors.stone900;
  const textColor = darkSurface ? colors.stone300 : colors.stone600;
  const iconColor = darkSurface ? colors.emerald400 : colors.emerald600;

  return (
    <View style={[styles.featureCard, surface]}>
      <View
        style={[
          styles.featureIconTile,
          { backgroundColor: 'rgba(22,163,74,0.1)', borderColor: 'rgba(52,211,153,0.2)' },
        ]}
      >
        <Icon name={icon} size={18} color={iconColor} />
      </View>
      <Text style={[webFont(13, 900), { color: titleColor }]}>{title}</Text>
      <Text style={[webFont(11, 500), { color: textColor }]}>{text}</Text>
    </View>
  );
}

/** LaunchFeatureCards.items (= GuestGarageFeatureCards.items) — spec §4.7 birebir. */
export const launchFeatureCards: WebFeatureCardProps[] = [
  {
    icon: 'car',
    title: 'Garajım',
    text: 'Aracını garajına ekle; WLTP menzili, batarya ve port bazlı şarj süresini kişisel panelinden takip et.',
  },
  {
    icon: 'compare',
    title: 'Karşılaştırma',
    text: 'En fazla 3 elektrikli modeli yan yana kıyasla; menzil, fiyat ve teknik verileri tek ekranda gör.',
  },
  {
    icon: 'bolt',
    title: 'Şarj İstasyonları',
    text: 'Konumuna göre yakın EPDK lisanslı istasyonları bul, haritada gör ve yol tarifi al.',
  },
];

// ── ShareMetaPillButton (§4.7) ──────────────────────────────────────────────────────

export interface ShareMetaPillButtonProps {
  title: string;
  icon: IconName;
  onPress: () => void;
}

/** Kapsül pill 10/semibold stone500, cardBackground/border (paylaş & meta pill'leri). */
export function ShareMetaPillButton({
  title,
  icon,
  onPress,
}: ShareMetaPillButtonProps): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        styles.metaPill,
        { backgroundColor: colors.cardBackground, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Icon name={icon} size={13} color={colors.stone500} />
      <Text style={[webFont(10, 600), { color: colors.stone500 }]}>{title}</Text>
    </Pressable>
  );
}

// ── WebColorModeToggle (§4.7) ───────────────────────────────────────────────────────

export interface WebColorModeToggleProps {
  compact?: boolean;
  fullWidth?: boolean;
}

/** Karanlık modu değiştirir; dark → Sun, light → Moon. Size 36 (compact) / 40. */
export function WebColorModeToggle({
  compact = true,
  fullWidth = false,
}: WebColorModeToggleProps): React.JSX.Element {
  const { colors, isDark } = useTheme();
  const toggle = usePreferencesStore((s) => s.toggleDarkMode);
  const size = compact ? 36 : 40;
  const radius = fullWidth ? radii.button : radii.inner;
  const bg = isDark ? '#22262C' : '#FAFAF9';
  const stroke = isDark ? '#2F3540' : '#E5E7EB';
  const iconColor = isDark ? colors.stone300 : colors.stone600;

  return (
    <Pressable
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel={isDark ? 'Açık moda geç' : 'Koyu moda geç'}
      style={({ pressed }) => [
        {
          width: fullWidth ? undefined : size,
          height: size,
          borderRadius: radius,
          backgroundColor: bg,
          borderColor: stroke,
          borderWidth: StyleSheet.hairlineWidth,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Icon name={isDark ? 'sun' : 'moon'} size={compact ? 18 : 20} color={iconColor} />
    </Pressable>
  );
}

// ── WebGarageButton / WebFavoriteOverlayButton (§1.5) ───────────────────────────────

export interface OverlayToggleButtonProps {
  /** true → dolu (favori/garajda). */
  active: boolean;
  busy?: boolean;
  onPress: () => void;
  /** 'heart' (garaj/favori) veya 'star' (kaydet). */
  glyph?: 'heart' | 'star';
}

/**
 * WebGarageButton .overlay ve WebFavoriteOverlayButton: 32×32 daire, cardBackground@95%,
 * border stroke, hafif gölge. heart → aktif #F43F5E; star → aktif #F59E0B; inaktif stone400.
 */
export function OverlayToggleButton({
  active,
  busy,
  onPress,
  glyph = 'heart',
}: OverlayToggleButtonProps): React.JSX.Element {
  const { colors } = useTheme();
  const activeColor = glyph === 'heart' ? '#F43F5E' : '#F59E0B';
  const spinnerColor = glyph === 'heart' ? '#E11D48' : '#F59E0B';
  const iconName: IconName = active
    ? glyph === 'heart'
      ? 'heart'
      : 'star'
    : glyph === 'heart'
      ? 'heart-outline'
      : 'star-outline';

  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={active ? 'Kaldır' : 'Ekle'}
      style={({ pressed }) => [
        styles.overlayButton,
        {
          backgroundColor: colors.cardBackground,
          borderColor: colors.border,
          transform: [{ scale: busy ? 0.94 : pressed ? 0.9 : 1 }],
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <Icon name={iconName} size={16} color={active ? activeColor : colors.stone400} />
      )}
    </Pressable>
  );
}

export interface CompactGarageButtonProps {
  isFavorite: boolean;
  guestHint?: boolean;
  busy?: boolean;
  onPress: () => void;
}

/**
 * WebGarageButton .compact: tam genişlik pill (radius 12, v-pad 8) heart + label.
 * Labels: guestHint → "Giriş Yapın"; favorite → "Garajda"; else "Garaja Ekle".
 * guestHint iken altta 9/bold #E11D48 uyarı metni.
 */
export function CompactGarageButton({
  isFavorite,
  guestHint = false,
  busy,
  onPress,
}: CompactGarageButtonProps): React.JSX.Element {
  const { colors } = useTheme();
  const active = isFavorite;
  const label = guestHint ? 'Giriş Yapın' : isFavorite ? 'Garajda' : 'Garaja Ekle';
  const fg = active ? '#E11D48' : colors.stone700;
  const bg = active ? colors.garageTintBackground : colors.inputBackground;
  const stroke = active ? colors.garageTintBorder : colors.border;

  return (
    <View style={styles.compactWrap}>
      <Pressable
        onPress={onPress}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [
          styles.compactButton,
          { backgroundColor: bg, borderColor: stroke, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        {busy ? (
          <ActivityIndicator size="small" color="#E11D48" />
        ) : (
          <Icon name={active ? 'heart' : 'heart-outline'} size={11} color={fg} />
        )}
        <Text style={[webFont(10, 900), { color: fg, letterSpacing: 0.4 }]}>
          {label.toUpperCase()}
        </Text>
      </Pressable>
      {guestHint ? (
        <Text style={[webFont(9, 700), styles.guestHint, { color: '#E11D48' }]}>
          Garaj özelliği üyelere özel — giriş yapın.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  emeraldBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sectionHeader: {
    gap: 6,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radii.inner,
    paddingVertical: 14,
  },
  accentBar: {
    borderRadius: 2,
    alignSelf: 'stretch',
  },
  featureCard: {
    gap: 8,
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  featureIconTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  overlayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  compactWrap: {
    gap: 4,
  },
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radii.button,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
  },
  guestHint: {
    textAlign: 'center',
  },
});
