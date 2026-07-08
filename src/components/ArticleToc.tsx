// ArticleTocView — iOS içindekiler bileşeni (spec §4.16).
//
// Boşsa gizli. Header: list ikon (emerald600) + "İÇİNDEKİLER" 11/black + "({count})" 9/bold +
// dönen chevron. Genişletilmiş liste: her satır "H{level}" etiket + metin, seviye girintili.
// Konteyner gradient [cardBackground, emerald50@35%, stone50], radius 16, emerald100 stroke.

import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { BlogTocItem } from '../utils/blogTocExtractor';
import { radii, useTheme, webFont } from '../theme';
import { Icon } from './ComponentIcon';

export interface ArticleTocProps {
  items: BlogTocItem[];
  /** Kontrollü açık durumu (opsiyonel); verilmezse iç state. */
  isOpen?: boolean;
  onToggle?: (next: boolean) => void;
  onSelect: (item: BlogTocItem) => void;
}

const INDENT_BY_LEVEL: Record<number, number> = { 1: 0, 2: 8, 3: 16, 4: 24 };

export function ArticleToc({
  items,
  isOpen,
  onToggle,
  onSelect,
}: ArticleTocProps): React.JSX.Element | null {
  const { colors } = useTheme();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isOpen ?? internalOpen;

  if (items.length === 0) return null;

  const toggle = (): void => {
    const next = !open;
    if (onToggle) onToggle(next);
    else setInternalOpen(next);
  };

  return (
    <LinearGradient
      colors={[colors.cardBackground, colors.emerald50, colors.stone50]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { borderColor: colors.emerald100 }]}
    >
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel="İçindekiler"
        style={styles.header}
      >
        <Icon name="list" size={16} color={colors.emerald600} />
        <Text style={[webFont(11, 900), { color: colors.stone900, letterSpacing: 0.4 }]}>
          İÇİNDEKİLER
        </Text>
        <Text style={[webFont(9, 700), { color: colors.stone400 }]}>({items.length})</Text>
        <View style={styles.spacer} />
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.stone500} />
      </Pressable>

      {open ? (
        <View style={styles.list}>
          {items.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => onSelect(item)}
              accessibilityRole="button"
              accessibilityLabel={item.text}
              style={({ pressed }) => [
                styles.row,
                { paddingLeft: INDENT_BY_LEVEL[item.level] ?? 0, opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text style={[webFont(9, 900), styles.levelTag, { color: colors.emerald600 }]}>
                H{item.level}
              </Text>
              <Text
                style={[webFont(11, 600), styles.rowText, { color: colors.stone700 }]}
                numberOfLines={2}
              >
                {item.text}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  spacer: {
    flex: 1,
  },
  list: {
    marginTop: 12,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  levelTag: {
    width: 22,
    opacity: 0.85,
    paddingTop: 1,
  },
  rowText: {
    flex: 1,
  },
});
