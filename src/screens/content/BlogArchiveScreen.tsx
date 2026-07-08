// BlogArchiveView — route `blog` (spec 03 §2.1).
//
// GET blogs → yerel state; kategori metası store.homeData.blogCategories[filter]. Kategori/arama
// store'da iki-yönlü (blogCategoryFilter/blogSearchQuery). Loading pageLoadingMessage; hata → retry.
// Gündem ticker (4 sn rotasyon), manşet carousel (ilk 3), BlogPostCard listesi.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { BlogPostCard, CachedImage, Icon } from '../../components';
import type { BlogPost } from '../../models/blog';
import { apiClient } from '../../api/client';
import { useNavigationStore } from '../../stores';
import { radii, useTheme, webFont } from '../../theme';
import { BLOG_CATEGORY_CHIPS, blogChipLabel, filterBlogs } from './blogArchiveFilter';

const CAROUSEL_WIDTH = Dimensions.get('window').width - 32;

export function BlogArchiveScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const cachedBlogs = useNavigationStore((s) => s.cachedBlogs);
  const blogCategories = useNavigationStore((s) => s.homeData?.blogCategories);
  const categoryFilter = useNavigationStore((s) => s.blogCategoryFilter);
  const searchQuery = useNavigationStore((s) => s.blogSearchQuery);
  const setBlogCategoryFilter = useNavigationStore((s) => s.setBlogCategoryFilter);
  const setBlogSearchQuery = useNavigationStore((s) => s.setBlogSearchQuery);
  const openBlogDetail = useNavigationStore((s) => s.openBlogDetail);
  const openBlogCategory = useNavigationStore((s) => s.openBlogCategory);
  const setPageLoadingMessage = useNavigationStore((s) => s.setPageLoadingMessage);

  const [blogs, setBlogs] = useState<BlogPost[]>(cachedBlogs);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const load = useCallback(
    async (withOverlay: boolean) => {
      if (withOverlay) setPageLoadingMessage('Haberler yükleniyor…');
      setError(null);
      try {
        const fetched = await apiClient.fetchBlogs();
        setBlogs(fetched);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Haberler yüklenemedi.');
      } finally {
        if (withOverlay) setPageLoadingMessage(null);
      }
    },
    [setPageLoadingMessage],
  );

  // İlk yükleme mount'ta bir kez. setState effect gövdesinde senkron çağrılmaz — async IIFE'ye
  // ertelenir (react-hooks/set-state-in-effect ile uyum, 5b CarDetailView deseniyle aynı).
  useEffect(() => {
    let active = true;
    void (async () => {
      if (!active) return;
      await load(useNavigationStore.getState().cachedBlogs.length === 0);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () => filterBlogs(blogs, categoryFilter, searchQuery),
    [blogs, categoryFilter, searchQuery],
  );

  // Gündem ticker: top-5 başlıklar, 4 sn'de bir döner.
  const tickerBlogs = useMemo(() => blogs.slice(0, 5), [blogs]);
  useEffect(() => {
    if (tickerBlogs.length <= 1) return;
    const timer = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % tickerBlogs.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [tickerBlogs.length]);

  const headlineBlogs = useMemo(() => filtered.slice(0, 3), [filtered]);
  const categoryMeta =
    categoryFilter !== 'all' ? blogCategories?.[categoryFilter] : undefined;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(false);
    setRefreshing(false);
  }, [load]);

  const onCarouselScroll = (e: NativeSyntheticEvent<NativeScrollEvent>): void => {
    const index = Math.round(e.nativeEvent.contentOffset.x / CAROUSEL_WIDTH);
    setCarouselIndex(index);
  };

  if (error && blogs.length === 0) {
    return (
      <View style={[styles.errorRoot, { backgroundColor: colors.pageBackground }]}>
        <Icon name="alert-triangle" size={32} color={colors.amber800} />
        <Text style={[webFont(14, 600), styles.errorText, { color: colors.stone700 }]}>{error}</Text>
        <Pressable
          onPress={() => void load(true)}
          accessibilityRole="button"
          accessibilityLabel="Tekrar dene"
          style={[styles.retry, { backgroundColor: colors.emerald600 }]}
        >
          <Text style={[webFont(13, 700), { color: '#FFFFFF' }]}>Tekrar dene</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.pageBackground }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.emerald600} />}
    >
      {/* Header */}
      {categoryMeta ? (
        <View style={styles.headerBlock}>
          <Pressable
            onPress={() => setBlogCategoryFilter('all')}
            accessibilityRole="button"
            accessibilityLabel="Tüm Haberler"
            style={styles.backLink}
          >
            <Icon name="chevron-back" size={14} color={colors.emerald600} />
            <Text style={[webFont(12, 700), { color: colors.emerald600 }]}>Tüm Haberler</Text>
          </Pressable>
          <View style={[styles.categoryCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[webFont(9, 900), { color: colors.stone400, letterSpacing: 0.6 }]}>
              KATEGORİ ARŞİVİ
            </Text>
            <Text style={styles.categoryEmoji}>{categoryMeta.emoji}</Text>
            <Text style={[webFont(24, 900), { color: colors.stone900 }]}>{categoryMeta.name}</Text>
            <Text style={[webFont(12, 500), { color: colors.stone500 }]}>{categoryMeta.description}</Text>
            <Text style={[webFont(11, 700), { color: colors.emerald700 }]}>
              {`${categoryMeta.count} makale`}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.headerBlock}>
          <Text style={[webFont(12, 900), { color: colors.emerald600, letterSpacing: 0.6 }]}>
            ELEKTRİKLİ MOBİLİTE HABER MERKEZİ
          </Text>
          <Text style={[webFont(24, 900), { color: colors.stone900 }]}>
            Elektrikli Araç Rehberleri ve Haberler
          </Text>
          <Text style={[webFont(13, 500), { color: colors.stone500 }]}>
            Teknoloji, sektör ve karşılaştırma rehberleri — güncel elektrikli araç haberleri ve
            analizler.
          </Text>
        </View>
      )}

      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <Icon name="search" size={16} color={colors.stone500} />
        <TextInput
          value={searchQuery}
          onChangeText={setBlogSearchQuery}
          placeholder="Haber ara…"
          placeholderTextColor={colors.stone450}
          style={[webFont(14, 500), styles.searchInput, { color: colors.stone900 }]}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Gündem ticker */}
      {tickerBlogs.length > 0 ? (
        <Pressable
          onPress={() => openBlogDetail(tickerBlogs[tickerIndex].id)}
          accessibilityRole="button"
          accessibilityLabel={tickerBlogs[tickerIndex].title}
          style={[styles.ticker, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
        >
          <View style={[styles.tickerPill, { backgroundColor: colors.stone950 }]}>
            <View style={[styles.tickerDot, { backgroundColor: colors.emerald400 }]} />
            <Text style={[webFont(9, 900), { color: '#FFFFFF' }]}>Gündem</Text>
          </View>
          <Text style={[webFont(12, 600), styles.tickerText, { color: colors.stone800 }]} numberOfLines={1}>
            {tickerBlogs[tickerIndex].title}
          </Text>
        </Pressable>
      ) : null}

      {/* Category chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {BLOG_CATEGORY_CHIPS.map((chip) => {
          const active = chip === categoryFilter;
          return (
            <Pressable
              key={chip}
              onPress={() => setBlogCategoryFilter(chip)}
              accessibilityRole="button"
              accessibilityLabel={blogChipLabel(chip)}
              style={[
                styles.chip,
                active
                  ? { backgroundColor: colors.emerald600 }
                  : { backgroundColor: colors.cardBackground, borderColor: colors.border },
              ]}
            >
              <Text style={[webFont(11, 800), { color: active ? '#FFFFFF' : colors.stone700 }]}>
                {blogChipLabel(chip)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Headline carousel */}
      {headlineBlogs.length > 0 ? (
        <View style={styles.carouselWrap}>
          <FlatList
            data={headlineBlogs}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onCarouselScroll}
            scrollEventThrottle={16}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => openBlogDetail(item.id)}
                accessibilityRole="button"
                accessibilityLabel={item.title}
                style={[styles.carouselItem, { width: CAROUSEL_WIDTH }]}
              >
                <CachedImage
                  uri={item.image}
                  style={styles.carouselImage}
                  placeholderColor={colors.stone100}
                  recyclingKey={item.id}
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.75)']}
                  style={styles.carouselOverlay}
                >
                  <Text style={[webFont(9, 900), { color: colors.emerald400, letterSpacing: 0.6 }]}>
                    {(item.category ?? 'HABER').toUpperCase()}
                  </Text>
                  <Text style={[webFont(18, 900), { color: '#FFFFFF' }]} numberOfLines={3}>
                    {item.title}
                  </Text>
                </LinearGradient>
              </Pressable>
            )}
          />
          {headlineBlogs.length > 1 ? (
            <View style={styles.dots}>
              {headlineBlogs.map((item, i) => (
                <View
                  key={item.id}
                  style={[
                    styles.dot,
                    { backgroundColor: i === carouselIndex ? colors.emerald600 : colors.stone300 },
                  ]}
                />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* List */}
      <View style={styles.list}>
        {filtered.map((blog) => (
          <BlogPostCard
            key={blog.id}
            blog={blog}
            layout="list"
            onPress={() => openBlogDetail(blog.id)}
            onCategoryTap={(category) => openBlogCategory(category)}
          />
        ))}
        {filtered.length === 0 ? (
          <Text style={[webFont(12, 500), styles.empty, { color: colors.stone500 }]}>
            Aramanıza uygun haber bulunamadı.
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingTop: 20,
    gap: 16,
  },
  headerBlock: {
    gap: 6,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  categoryCard: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 6,
    marginTop: 8,
  },
  categoryEmoji: {
    fontSize: 32,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    padding: 0,
  },
  ticker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tickerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tickerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tickerText: {
    flex: 1,
  },
  chips: {
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  carouselWrap: {
    gap: 8,
  },
  carouselItem: {
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  carouselImage: {
    width: '100%',
    height: 200,
  },
  carouselOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 14,
    gap: 4,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  list: {
    gap: 16,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: 24,
  },
  errorRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 14,
  },
  errorText: {
    textAlign: 'center',
  },
  retry: {
    borderRadius: radii.button,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
});
