// CarSummaryCardView — iOS "AI özeti" akordeon (spec §4.13).
//
// Kapalı header: emerald daire 28 + sparkles, başlık "Oto menzil ai özeti için tıkla" (açık:
// "Oto Menzil AI Özeti"), alt metin (yalnız kapalı), dönen chevron; header bg stone50@80%.
// Açık: 2pt emerald sol çizgi + gövde 13/medium stone600. Boş fallback metni sabittir.

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radii, useTheme, webFont } from '../theme';
import { Icon } from './ComponentIcon';

const EMPTY_FALLBACK =
  'Bu model için henüz açıklama metni eklenmemiş. Katalog güncellendiğinde Oto Menzil AI özeti burada görünecek.';

export interface CarSummaryCardProps {
  description?: string | null;
}

export function CarSummaryCard({ description }: CarSummaryCardProps): React.JSX.Element {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const body = description != null && description.trim().length > 0 ? description.trim() : EMPTY_FALLBACK;

  return (
    <View
      style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
    >
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel="Oto Menzil AI Özeti"
        style={[styles.header, { backgroundColor: colors.stone50 }]}
      >
        <View style={[styles.iconCircle, { backgroundColor: colors.emerald600 }]}>
          <Icon name="sparkles" size={15} color="#FFFFFF" />
        </View>
        <View style={styles.headerText}>
          <Text style={[webFont(13, 900), { color: colors.stone900 }]}>
            {expanded ? 'Oto Menzil AI Özeti' : 'Oto menzil ai özeti için tıkla'}
          </Text>
          {!expanded ? (
            <Text style={[webFont(10, 500), { color: colors.stone500 }]}>
              Model açıklaması ve editoryal özet
            </Text>
          ) : null}
        </View>
        <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.stone500} />
      </Pressable>

      {expanded ? (
        <View style={styles.bodyRow}>
          <View style={[styles.rule, { backgroundColor: colors.emerald500 }]} />
          <Text style={[webFont(13, 500), styles.bodyText, { color: colors.stone600 }]}>
            {body}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 1,
  },
  bodyRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  rule: {
    width: 2,
    borderRadius: 1,
    alignSelf: 'stretch',
  },
  bodyText: {
    flex: 1,
    lineHeight: 18,
  },
});
