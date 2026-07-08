// BlogDetailView — iOS BlogDetailView `.blog(slug)` overlay'i (spec 03 §2.2).
//
// SHELL SÖZLEŞMESİ (istisna): overlay yuvasında yaşar; useNavigationStore().overlay slug'ını
// KENDİSİ okur ve kendi verisini çeker (Wave 6 AppShell.DetailOverlaySlot'a takar). 404'te
// client.ts katalogdan değil, blog listesinden id ile eşleştirir (spec §2.2). Açılışta
// trackBlogView (fire-and-forget). Beğeni: iyimser toggle + likeBlog, hatada rollback; misafir →
// openAuth. TOC scroll HOST-owned: HTMLContentView'e injectHeadingIds ile id'ler önden gömülür,
// onHeadingOffset ile offset toplanır, ArticleToc seçiminde kendi ScrollView'imiz kaydırılır.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { apiClient } from '../../api';
import { engagementApi } from '../../api/engagement';
import { siteBaseURL } from '../../config';
import type { BlogPost } from '../../models/blog';
import type { CarSummary } from '../../models/car';
import { BlogTocExtractor, type BlogTocItem } from '../../utils/blogTocExtractor';
import { useAuthStore, useNavigationStore } from '../../stores';
import { radii, useTheme, webFont } from '../../theme';
import {
  ArticleToc,
  BlogCommentsSection,
  CachedImage,
  CarPrice,
  HTMLContentView,
  Icon,
  ShareMetaPillButton,
  share,
} from '../../components';
import { batteryDisplay, displayTitle, heroImageURL, rangeDisplay } from '../catalog/shared';

const LOADING_MESSAGE = 'Makale yükleniyor…';
const LIKE_GUEST_MESSAGE = 'Yazıları beğenebilmek için giriş yapmalısınız.';
// ArticleToc seçiminde kaydırma çapası tepeden ~%8 (iOS anchor ile parite).
const SCROLL_ANCHOR_FRACTION = 0.08;

export function BlogDetailView(): React.JSX.Element | null {
  const { colors } = useTheme();

  const overlay = useNavigationStore((s) => s.overlay);
  const slug = overlay?.kind === 'blog' ? overlay.slug : null;
  const catalogCars = useNavigationStore((s) => s.catalogCars);
  const closeOverlay = useNavigationStore((s) => s.closeOverlay);
  const openCarDetail = useNavigationStore((s) => s.openCarDetail);
  const openBlogCategory = useNavigationStore((s) => s.openBlogCategory);
  const setPageLoadingMessage = useNavigationStore((s) => s.setPageLoadingMessage);

  const isLoggedIn = useAuthStore((s) => s.currentUser !== null);
  const openAuth = useAuthStore((s) => s.openAuth);
  const fetchFreshNonce = useAuthStore((s) => s.fetchFreshNonce);

  const [blog, setBlog] = useState<BlogPost | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeSubmitting, setLikeSubmitting] = useState(false);

  const [tocOpen, setTocOpen] = useState(true);
  const scrollRef = useRef<ScrollView>(null);
  const htmlTopRef = useRef(0);
  const scrollHeightRef = useRef(0);
  const headingOffsets = useRef<Map<string, number>>(new Map());

  // Blog verisini çek (404 fallback client.ts'te). Açılışta trackBlogView (fire-and-forget).
  // setState effect gövdesinde senkron çağrılmaz — async IIFE'ye ertelenir (5b CarDetailView
  // deseniyle aynı; react-hooks/set-state-in-effect ile uyum). Ref mutasyonu (headingOffsets)
  // senkron kalır (setState değil).
  useEffect(() => {
    if (slug == null) return;
    let active = true;
    headingOffsets.current.clear();

    void (async () => {
      if (!active) return;
      setBlog(null);
      setError(null);
      setPageLoadingMessage(LOADING_MESSAGE);
      try {
        const fetched = await apiClient.fetchBlogDetail(slug);
        if (!active) return;
        setBlog(fetched);
        setLiked(fetched.userLiked === true);
        setLikeCount(fetched.likes ?? 0);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Makale yüklenemedi.');
      } finally {
        if (active) setPageLoadingMessage(null);
      }
    })();

    // Görüntüleme izleme (nonce varsa; yoksa yut).
    void (async () => {
      const nonce = await fetchFreshNonce();
      if (nonce) void apiClient.trackBlogView(slug, nonce);
    })();

    return () => {
      active = false;
    };
  }, [slug, setPageLoadingMessage, fetchFreshNonce]);

  // TOC öğeleri + heading id'leri gömülmüş HTML.
  const rawHtml = blog?.content ?? '';
  const tocItems = useMemo<BlogTocItem[]>(
    () => (rawHtml.length > 0 ? BlogTocExtractor.extract(rawHtml) : []),
    [rawHtml],
  );
  const injectedHtml = useMemo(
    () => (tocItems.length > 0 ? BlogTocExtractor.injectHeadingIds(rawHtml, tocItems) : rawHtml),
    [rawHtml, tocItems],
  );

  // İlgili araçlar: relatedCarIds katalogda çözülenler.
  const relatedCars = useMemo<CarSummary[]>(() => {
    const ids = blog?.relatedCarIds ?? [];
    if (ids.length === 0) return [];
    return ids
      .map((id) => catalogCars.find((c) => c.id === id))
      .filter((c): c is CarSummary => c != null);
  }, [blog?.relatedCarIds, catalogCars]);

  const onHeadingOffset = useCallback((id: string, offset: number) => {
    headingOffsets.current.set(id, offset);
  }, []);

  const scrollToHeading = useCallback((item: BlogTocItem) => {
    setTocOpen(false);
    const offset = headingOffsets.current.get(item.id);
    if (offset == null) return;
    const anchor = scrollHeightRef.current * SCROLL_ANCHOR_FRACTION;
    const target = Math.max(0, htmlTopRef.current + offset - anchor);
    scrollRef.current?.scrollTo({ y: target, animated: true });
  }, []);

  const toggleLike = useCallback(async () => {
    if (blog == null || likeSubmitting) return;
    if (!isLoggedIn) {
      openAuth(LIKE_GUEST_MESSAGE);
      return;
    }
    // İyimser toggle.
    const prevLiked = liked;
    const prevCount = likeCount;
    const nextLiked = !prevLiked;
    setLiked(nextLiked);
    setLikeCount(prevCount + (nextLiked ? 1 : -1));
    setLikeSubmitting(true);
    try {
      const nonce = (await fetchFreshNonce()) ?? '';
      const response = await engagementApi.likeBlog(blog.id, nonce);
      setLiked(response.userLiked);
      setLikeCount(response.likes);
    } catch {
      // Rollback.
      setLiked(prevLiked);
      setLikeCount(prevCount);
    } finally {
      setLikeSubmitting(false);
    }
  }, [blog, likeSubmitting, isLoggedIn, openAuth, liked, likeCount, fetchFreshNonce]);

  const onShare = useCallback(() => {
    if (blog == null) return;
    void share({ message: blog.title, url: `${siteBaseURL}/haber/${blog.id}/` });
  }, [blog]);

  if (slug == null) return null;

  if (error && blog == null) {
    return (
      <View style={[styles.root, { backgroundColor: colors.detailBackground }]}>
        <BackBar onPress={closeOverlay} />
        <View style={styles.errorBody}>
          <Icon name="alert-triangle" size={32} color={colors.amber800} />
          <Text style={[webFont(14, 600), styles.errorText, { color: colors.stone700 }]}>{error}</Text>
        </View>
      </View>
    );
  }

  if (blog == null) {
    return (
      <View style={[styles.root, { backgroundColor: colors.detailBackground }]}>
        <BackBar onPress={closeOverlay} />
        <View style={styles.errorBody}>
          <ActivityIndicator color={colors.emerald600} />
        </View>
      </View>
    );
  }

  const category = blog.category ?? 'Haber';
  const readTime = blog.readTimeMin ?? 3;

  return (
    <View style={[styles.root, { backgroundColor: colors.detailBackground }]}>
      <BackBar onPress={closeOverlay} />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        onLayout={(e: LayoutChangeEvent) => {
          scrollHeightRef.current = e.nativeEvent.layout.height;
        }}
      >
        {/* Hero + kategori chip */}
        <View style={styles.hero}>
          <CachedImage
            uri={blog.image}
            style={styles.heroImage}
            placeholderColor={colors.stone100}
            recyclingKey={blog.id}
          />
          <Pressable
            onPress={() => openBlogCategory(category)}
            accessibilityRole="button"
            accessibilityLabel={category}
            style={[styles.categoryChip, { backgroundColor: colors.stone950 }]}
          >
            <Text style={[webFont(9, 900), { color: '#FFFFFF', letterSpacing: 0.6 }]}>
              {category.toUpperCase()}
            </Text>
          </Pressable>
        </View>

        {/* Başlık */}
        <Text style={[webFont(24, 900), { color: colors.stone900 }]}>{blog.title}</Text>

        {/* Meta chip'leri */}
        <View style={styles.metaRow}>
          <MetaChip icon="book" text={category} />
          <MetaChip icon="clock" text={`${readTime} dk okuma`} />
          {blog.date ? <MetaChip icon="calendar" text={blog.date} /> : null}
        </View>

        {/* Etkileşim: beğeni + paylaş */}
        <View style={styles.engagementRow}>
          <Pressable
            onPress={() => void toggleLike()}
            disabled={likeSubmitting}
            accessibilityRole="button"
            accessibilityLabel={liked ? 'Beğenildi' : 'Beğen'}
            style={[
              styles.likePill,
              liked
                ? { backgroundColor: colors.rose500, borderColor: colors.rose500 }
                : { backgroundColor: colors.cardBackground, borderColor: colors.rose500 },
            ]}
          >
            <Icon
              name={liked ? 'heart' : 'heart-outline'}
              size={14}
              color={liked ? '#FFFFFF' : colors.rose500}
            />
            <Text style={[webFont(11, 800), { color: liked ? '#FFFFFF' : colors.rose500 }]}>
              {`${likeCount} · ${liked ? 'Beğenildi' : 'Beğen'}`}
            </Text>
          </Pressable>
          <ShareMetaPillButton title="Paylaş" icon="share" onPress={onShare} />
        </View>

        {/* Rapor istatistikleri (2×2) */}
        <View style={[styles.statsGrid, { backgroundColor: colors.elevatedSurface }]}>
          <StatTile
            label="Güvenilirlik"
            value={blog.reportReliability ?? 'Yüksek Sınıf'}
            withDot
          />
          <StatTile label="Rapor Kaynağı" value={blog.reportSource ?? 'otomenzil Lab'} />
          <StatTile label="Güncelleme" value={blog.reportUpdated ?? blog.date ?? '—'} />
          <StatTile
            label="Yayın Modeli"
            value={blog.reportModel ?? 'Bağımsız Basın'}
            accent
          />
        </View>

        {/* İçindekiler */}
        {tocItems.length > 0 ? (
          <ArticleToc
            items={tocItems}
            isOpen={tocOpen}
            onToggle={setTocOpen}
            onSelect={scrollToHeading}
          />
        ) : null}

        {/* HTML gövdesi */}
        {injectedHtml.length > 0 ? (
          <View
            onLayout={(e: LayoutChangeEvent) => {
              htmlTopRef.current = e.nativeEvent.layout.y;
            }}
          >
            <HTMLContentView
              html={injectedHtml}
              proseStyle="article"
              onHeadingOffset={onHeadingOffset}
            />
          </View>
        ) : blog.excerpt ? (
          <Text style={[webFont(13, 500), styles.excerpt, { color: colors.stone700 }]}>
            {blog.excerpt}
          </Text>
        ) : null}

        {/* İlgili araçlar */}
        {relatedCars.length > 0 ? (
          <View style={[styles.relatedCard, { borderColor: colors.emerald100 }]}>
            <Text style={[webFont(9, 900), { color: colors.emerald700, letterSpacing: 0.6 }]}>
              BU YAZIYLA İLİŞKİLİ
            </Text>
            <View style={styles.relatedHeaderRow}>
              <Icon name="car" size={16} color={colors.emerald600} />
              <Text style={[webFont(15, 900), { color: colors.stone900 }]}>İlgili Araçlar</Text>
            </View>
            {relatedCars.map((car) => (
              <Pressable
                key={car.id}
                onPress={() => openCarDetail(car.id)}
                accessibilityRole="button"
                accessibilityLabel={displayTitle(car)}
                style={({ pressed }) => [
                  styles.relatedRow,
                  { backgroundColor: colors.cardBackground, borderColor: colors.border, opacity: pressed ? 0.9 : 1 },
                ]}
              >
                <CachedImage
                  uri={heroImageURL(car)}
                  style={styles.relatedImage}
                  placeholderColor={colors.stone100}
                  recyclingKey={car.id}
                />
                <View style={styles.relatedBody}>
                  <Text style={[webFont(9, 900), { color: colors.emerald700, letterSpacing: 0.4 }]}>
                    {car.brand.toUpperCase()}
                  </Text>
                  <Text style={[webFont(13, 700), { color: colors.stone900 }]} numberOfLines={1}>
                    {displayTitle(car)}
                  </Text>
                  <Text style={[webFont(11, 500), { color: colors.stone500 }]}>
                    {`${rangeDisplay(car.rangeKm)} · ${batteryDisplay(car.batteryKwh)}`}
                  </Text>
                  <CarPrice
                    priceTL={car.priceTL}
                    priceForeign={car.priceForeign}
                    trAvailable={car.trAvailable}
                    style="compact"
                  />
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* Yorumlar */}
        <BlogCommentsSection slug={blog.id} blogId={blog.id} />
      </ScrollView>
    </View>
  );
}

function BackBar({ onPress }: { onPress: () => void }): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Haber Merkezine Dön"
      style={[styles.backBar, { borderBottomColor: colors.border }]}
    >
      <Icon name="chevron-back" size={18} color={colors.emerald600} />
      <Text style={[webFont(13, 600), { color: colors.emerald600 }]}>Haber Merkezine Dön</Text>
    </Pressable>
  );
}

function MetaChip({ icon, text }: { icon: 'book' | 'clock' | 'calendar'; text: string }): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={[styles.metaChip, { backgroundColor: colors.stone50, borderColor: colors.border }]}>
      <Icon name={icon} size={11} color={colors.emerald500} />
      <Text style={[webFont(10, 700), { color: colors.stone600 }]}>{text}</Text>
    </View>
  );
}

function StatTile({
  label,
  value,
  withDot = false,
  accent = false,
}: {
  label: string;
  value: string;
  withDot?: boolean;
  accent?: boolean;
}): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={styles.statTile}>
      <Text style={[webFont(9, 800), { color: colors.stone400, letterSpacing: 0.4 }]}>
        {label.toUpperCase()}
      </Text>
      <View style={styles.statValueRow}>
        {withDot ? <View style={[styles.statDot, { backgroundColor: colors.emerald500 }]} /> : null}
        <Text style={[webFont(12, 700), { color: accent ? colors.emerald700 : colors.stone900 }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  content: {
    padding: 16,
    gap: 14,
  },
  hero: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: 220,
  },
  categoryChip: {
    position: 'absolute',
    top: 12,
    left: 12,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  engagementRow: {
    flexDirection: 'row',
    gap: 8,
  },
  likePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: radii.inner,
    padding: 4,
  },
  statTile: {
    flexBasis: '50%',
    padding: 12,
    gap: 4,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  excerpt: {
    lineHeight: 20,
  },
  relatedCard: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 10,
  },
  relatedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  relatedRow: {
    flexDirection: 'row',
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  relatedImage: {
    width: 112,
    height: 96,
  },
  relatedBody: {
    flex: 1,
    padding: 12,
    gap: 3,
  },
  errorBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 14,
  },
  errorText: {
    textAlign: 'center',
  },
});
