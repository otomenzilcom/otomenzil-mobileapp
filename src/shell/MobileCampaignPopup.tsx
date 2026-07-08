// MobileCampaignPopupView — iOS kampanya popup'ı (spec 03 §5.7).
//
// Dim scrim (tap = dismiss); rounded 24 kart: opsiyonel hero görsel (180pt), başlık, gövde,
// CTA (buttonLabel uppercased → onAction(url) sonra dismiss; shell URL'den araç slug'ı çıkarıp
// araç detayı açar), metin dismiss (dismissLabel ?? "Kapat"). activeCampaign yoksa çizilmez.

import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useCampaignStore } from '../stores';
import { radii, useTheme, webFont } from '../theme';
import { ShellPressable } from './ShellPressable';

export interface MobileCampaignPopupProps {
  /** CTA URL aksiyonu (shell URL'yi ayrıştırıp araç detayı açar). */
  onAction: (url: string) => void;
}

export function MobileCampaignPopup({ onAction }: MobileCampaignPopupProps): React.JSX.Element | null {
  const { colors } = useTheme();
  const popup = useCampaignStore((s) => s.activePopup);
  const dismissPopup = useCampaignStore((s) => s.dismissPopup);

  if (popup === null) return null;

  const dismiss = () => void dismissPopup(popup);
  const heroImage = popup.imageUrl && popup.imageUrl.length > 0 ? popup.imageUrl : undefined;

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]}>
      <Pressable
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
        onPress={dismiss}
        accessibilityLabel="Kampanyayı kapat"
      />
      <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
        {heroImage ? (
          <Image
            source={{ uri: heroImage }}
            style={[styles.hero, { backgroundColor: colors.imagePlaceholder }]}
            contentFit="cover"
          />
        ) : null}
        <View style={styles.content}>
          {popup.title ? (
            <Text style={[webFont(20, 700), { color: colors.stone900 }]}>{popup.title}</Text>
          ) : null}
          {popup.body ? (
            <Text style={[webFont(13, 500), { color: colors.stone600 }]}>{popup.body}</Text>
          ) : null}
          {popup.buttonLabel && popup.buttonUrl ? (
            <ShellPressable
              onPress={() => {
                const url = popup.buttonUrl ?? '';
                if (url.length > 0) onAction(url);
                dismiss();
              }}
              accessibilityLabel={popup.buttonLabel}
              style={[styles.cta, { backgroundColor: colors.emerald600 }]}
            >
              <Text style={[webFont(13, 700), { color: '#FFFFFF' }]}>
                {popup.buttonLabel.toUpperCase()}
              </Text>
            </ShellPressable>
          ) : null}
          <ShellPressable onPress={dismiss} accessibilityLabel="Kapat" style={styles.dismiss}>
            <Text style={[webFont(12, 600), { color: colors.stone500 }]}>
              {(popup.dismissLabel ?? 'Kapat').toUpperCase()}
            </Text>
          </ShellPressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  hero: {
    width: '100%',
    height: 180,
  },
  content: {
    padding: 20,
    gap: 12,
  },
  cta: {
    borderRadius: radii.button,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  dismiss: {
    alignItems: 'center',
    paddingVertical: 6,
  },
});
