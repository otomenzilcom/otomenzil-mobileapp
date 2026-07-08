// BlogPostCardView + BlogMetaBadgesView — iOS blog kartı (spec §4.15).
//
// List: hero h220 + başlık 18/bold 2-line + excerpt 13/medium 3-line + footer. Sidebar: 16:9
// görsel + başlık 13/bold + excerpt 11/medium + yoğun footer. Footer: meta rozetleri + "Devamını
// Oku" CTA (ters buton renkleri). Kart tamamı basılabilir; radius 16 bordered.

import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { BlogPost } from '../models/blog';
import { radii, useTheme, webFont } from '../theme';
import { CachedImage } from './CachedImage';
import { Icon, type IconName } from './ComponentIcon';

export type BlogCardLayout = 'list' | 'sidebar';

export interface BlogPostCardProps {
  blog: BlogPost;
  layout: BlogCardLayout;
  onCategoryTap?: (category: string) => void;
  onPress: () => void;
}

export function BlogPostCard({
  blog,
  layout,
  onCategoryTap,
  onPress,
}: BlogPostCardProps): React.JSX.Element {
  const { colors } = useTheme();
  const sidebar = layout === 'sidebar';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={blog.title}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.cardBackground, borderColor: colors.border, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <CachedImage
        uri={blog.image}
        style={sidebar ? styles.sidebarImage : styles.listImage}
        placeholderColor={colors.stone100}
        recyclingKey={blog.id}
      />
      <View style={sidebar ? styles.sidebarBody : styles.listBody}>
        <Text
          style={[webFont(sidebar ? 13 : 18, 700), { color: colors.stone900 }]}
          numberOfLines={2}
        >
          {blog.title}
        </Text>
        {blog.excerpt ? (
          <Text
            style={[webFont(sidebar ? 11 : 13, 500), { color: colors.stone600 }]}
            numberOfLines={sidebar ? 2 : 3}
          >
            {blog.excerpt}
          </Text>
        ) : null}

        <View style={[styles.footerDivider, { backgroundColor: colors.border }]} />
        <BlogMetaBadges
          category={blog.category}
          readTimeMin={blog.readTimeMin}
          date={blog.date}
          dense={sidebar}
          onCategoryTap={onCategoryTap}
        />

        <View
          style={[styles.cta, { backgroundColor: colors.inverseButtonBackground }]}
        >
          <Text style={[webFont(10, 900), styles.ctaText, { color: colors.inverseButtonForeground }]}>
            Devamını Oku
          </Text>
          <Icon name="arrow-forward" size={13} color={colors.inverseButtonForeground} />
        </View>
      </View>
    </Pressable>
  );
}

// ── BlogMetaBadgesView (§4.15) ──────────────────────────────────────────────────────

export interface BlogMetaBadgesProps {
  category?: string;
  readTimeMin?: number;
  date?: string;
  dense?: boolean;
  onCategoryTap?: (category: string) => void;
}

/** Kapsül pill'ler: kategori (book), okuma süresi (clock), tarih (calendar). İkon emerald500. */
export function BlogMetaBadges({
  category,
  readTimeMin,
  date,
  dense = false,
  onCategoryTap,
}: BlogMetaBadgesProps): React.JSX.Element {
  const { colors } = useTheme();
  const cat = category ?? 'Genel';
  const readTime = readTimeMin ?? 3;
  const readLabel = dense ? `${readTime} dk` : `${readTime} dk okuma`;

  return (
    <View style={styles.metaRow}>
      <MetaPill
        icon="book"
        text={cat.toUpperCase()}
        fg={colors.emerald700}
        bg={colors.emerald50}
        border={colors.emerald100}
        onPress={onCategoryTap ? () => onCategoryTap(cat) : undefined}
      />
      <MetaPill
        icon="clock"
        text={readLabel}
        fg={colors.stone600}
        bg={colors.stone50}
        border={colors.border}
      />
      {date ? (
        <MetaPill
          icon="calendar"
          text={date}
          fg={colors.stone500}
          bg={colors.cardBackground}
          border={colors.border}
        />
      ) : null}
    </View>
  );
}

function MetaPill({
  icon,
  text,
  fg,
  bg,
  border,
  onPress,
}: {
  icon: IconName;
  text: string;
  fg: string;
  bg: string;
  border: string;
  onPress?: () => void;
}): React.JSX.Element {
  const { colors } = useTheme();
  const inner = (
    <View style={[styles.pill, { backgroundColor: bg, borderColor: border }]}>
      <Icon name={icon} size={11} color={colors.emerald500} />
      <Text style={[webFont(9, 700), { color: fg }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={text}>
        {inner}
      </Pressable>
    );
  }
  return inner;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  listImage: {
    width: '100%',
    height: 220,
  },
  sidebarImage: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  listBody: {
    padding: 16,
    gap: 8,
  },
  sidebarBody: {
    padding: 12,
    gap: 6,
  },
  footerDivider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radii.button,
    paddingVertical: 10,
    marginTop: 4,
  },
  ctaText: {
    letterSpacing: 0.8,
  },
});
