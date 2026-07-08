// Hesap ekranları paylaşılan primitifleri — iOS AccountViews.swift alt bileşenleri (spec §3.1–§3.5).
//
// Profile / AccountSettings / Garage ekranlarınca paylaşılır: avatar, kopyalanabilir profil URL
// widget'ı (§3.1), bildirim banner'ı, oturum-kapalı istem kartı, bilgi karosu.
//
// NOT: §3.1 "Kopyala" butonu URL'i expo-clipboard ile panoya kopyalar (iOS paritesi) + "Kopyalandı"
// etiketi 2 sn gösterilir. Aç butonu Linking ile tarayıcıda açar.

import { useCallback, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';

import { Icon, type IconName } from '../../components';
import { siteBaseURL } from '../../config';
import { ProfileAvatarTheme, radii, useTheme, webFont } from '../../theme';
import { profileUrl } from './accountSlug';

// ── AccountAvatar ─────────────────────────────────────────────────────────────────

export interface AccountAvatarProps {
  username: string;
  avatarColor?: string;
  size?: number;
  radius?: number;
  fontSize?: number;
}

/** İlk harf (büyük) avatar teması renginde (§3.4/§3.5). */
export function AccountAvatar({
  username,
  avatarColor,
  size = 80,
  radius = 20,
  fontSize = 34,
}: AccountAvatarProps): React.JSX.Element {
  const initial = (username.trim()[0] ?? 'Ü').toUpperCase();
  const color = ProfileAvatarTheme.color(avatarColor);
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: radius, backgroundColor: color },
      ]}
    >
      <Text style={[webFont(fontSize, 900), { color: '#FFFFFF' }]}>{initial}</Text>
    </View>
  );
}

// ── CopyableProfileUrl (§3.1) ───────────────────────────────────────────────────────

export interface CopyableProfileUrlProps {
  memberSlug: string;
  showOpenLink?: boolean;
}

/**
 * "PROFİL ADRESİ" widget'ı (§3.1): yol "/uye/<slug>/", Kopyala (→ Kopyalandı 2 sn) ve isteğe
 * bağlı Aç. Tam URL altta küçük metinde. (Kopyala = Share ikamesi — modül başı notu.)
 */
export function CopyableProfileUrl({
  memberSlug,
  showOpenLink = true,
}: CopyableProfileUrlProps): React.JSX.Element {
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fullUrl = profileUrl(siteBaseURL, memberSlug);

  const onCopy = useCallback(() => {
    void Clipboard.setStringAsync(fullUrl);
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }, [fullUrl]);

  const onOpen = useCallback(() => {
    void Linking.openURL(fullUrl);
  }, [fullUrl]);

  return (
    <View style={[styles.copyCard, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
      <Text style={[webFont(9, 800), styles.copyLabel, { color: colors.stone450 }]}>
        PROFİL ADRESİ
      </Text>
      <Text style={[webFont(13, 700), { color: colors.stone800 }]}>/uye/{memberSlug}/</Text>
      <View style={styles.copyActions}>
        <Pressable
          onPress={onCopy}
          accessibilityRole="button"
          accessibilityLabel={copied ? 'Kopyalandı' : 'Kopyala'}
          style={({ pressed }) => [
            styles.copyButton,
            { backgroundColor: colors.emerald50, borderColor: colors.emerald100, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Icon name={copied ? 'check-circle' : 'share'} size={13} color={colors.emerald700} />
          <Text style={[webFont(11, 800), { color: colors.emerald700 }]}>
            {copied ? 'Kopyalandı' : 'Kopyala'}
          </Text>
        </Pressable>
        {showOpenLink ? (
          <Pressable
            onPress={onOpen}
            accessibilityRole="button"
            accessibilityLabel="Aç"
            style={({ pressed }) => [
              styles.copyButton,
              { backgroundColor: colors.cardBackground, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Icon name="arrow-forward" size={13} color={colors.stone600} />
            <Text style={[webFont(11, 800), { color: colors.stone600 }]}>Aç</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={[webFont(10, 500), { color: colors.stone450 }]} numberOfLines={1}>
        {fullUrl}
      </Text>
    </View>
  );
}

// ── NoticeBanner ─────────────────────────────────────────────────────────────────

export interface NoticeBannerProps {
  message: string;
  tone: 'success' | 'error';
}

/** Yeşil (başarı) / kırmızı (hata) bildirim banner'ı (§3.5 hesap formu). */
export function NoticeBanner({ message, tone }: NoticeBannerProps): React.JSX.Element {
  const { colors } = useTheme();
  const success = tone === 'success';
  return (
    <View
      style={[
        styles.notice,
        {
          backgroundColor: success ? colors.emerald50 : colors.dangerBackground,
          borderColor: success ? colors.emerald100 : colors.dangerBorder,
        },
      ]}
    >
      <Icon
        name={success ? 'check-circle' : 'alert-triangle'}
        size={15}
        color={success ? colors.emerald700 : colors.dangerForeground}
      />
      <Text
        style={[webFont(12, 600), styles.noticeText, { color: success ? colors.emerald700 : colors.dangerForeground }]}
      >
        {message}
      </Text>
    </View>
  );
}

// ── LoggedOutPrompt ─────────────────────────────────────────────────────────────────

export interface LoggedOutPromptProps {
  icon: IconName;
  title: string;
  message: string;
  buttonLabel: string;
  onPress: () => void;
  iconColor?: string;
}

/** Oturum-kapalı istem kartı (§3.4/§3.5 giriş yapmanız gerekiyor ekranları). */
export function LoggedOutPrompt({
  icon,
  title,
  message,
  buttonLabel,
  onPress,
  iconColor,
}: LoggedOutPromptProps): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={styles.promptWrap}>
      <View style={[styles.promptCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <View style={[styles.promptIcon, { backgroundColor: colors.emerald50 }]}>
          <Icon name={icon} size={30} color={iconColor ?? colors.amber800} />
        </View>
        <Text style={[webFont(20, 900), styles.centered, { color: colors.stone900 }]}>{title}</Text>
        <Text style={[webFont(13, 500), styles.centered, { color: colors.stone500 }]}>{message}</Text>
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={buttonLabel}
          style={({ pressed }) => [
            styles.promptButton,
            { backgroundColor: colors.emerald600, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[webFont(12, 900), styles.promptButtonText, { color: '#FFFFFF' }]}>
            {buttonLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── InfoTile (§3.4 profil bilgi karoları) ────────────────────────────────────────────

export interface InfoTileProps {
  icon: IconName;
  label: string;
  value: string;
}

export function InfoTile({ icon, label, value }: InfoTileProps): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={[styles.infoTile, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
      <View style={styles.infoTileHead}>
        <Icon name={icon} size={13} color={colors.stone500} />
        <Text style={[webFont(9, 800), styles.infoLabel, { color: colors.stone450 }]}>
          {label.toUpperCase()}
        </Text>
      </View>
      <Text style={[webFont(13, 700), { color: colors.stone800 }]}>{value}</Text>
    </View>
  );
}

// ── StatTile (§3.4 dört-lü istatistik) ───────────────────────────────────────────────

export interface StatTileProps {
  label: string;
  value: number | string;
}

export function StatTile({ label, value }: StatTileProps): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={[styles.statTile, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <Text style={[webFont(20, 900), { color: colors.stone900 }]}>{value}</Text>
      <Text style={[webFont(10, 700), { color: colors.stone500 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyCard: {
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 8,
  },
  copyLabel: {
    letterSpacing: 0.6,
  },
  copyActions: {
    flexDirection: 'row',
    gap: 8,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radii.button,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  noticeText: {
    flex: 1,
  },
  promptWrap: {
    padding: 16,
    paddingTop: 40,
  },
  promptCard: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
    gap: 12,
    alignItems: 'center',
  },
  promptIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    textAlign: 'center',
  },
  promptButton: {
    borderRadius: radii.button,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    alignSelf: 'stretch',
    marginTop: 4,
  },
  promptButtonText: {
    letterSpacing: 0.8,
  },
  infoTile: {
    flex: 1,
    minWidth: '46%',
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 6,
  },
  infoTileHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoLabel: {
    letterSpacing: 0.4,
  },
  statTile: {
    flex: 1,
    minWidth: '22%',
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
  },
});
