// AdvancedSearchModalView — shell header'ından açılan global omnisearch (spec §8).
//
// store.catalogCars + store.homeData?.latestBlogs üzerinde canlı arama (her biri max 6). Tamamen
// yerel. Görünürlük navigationStore.searchModalOpen ile sürülür (shell header açar); kapanış
// closeSearchModal. Submit: blogs kapsamı → blogSearchQuery + navigate(.blog); aksi → pendingSearchQuery
// + navigate(.search) (CarSearchScreen onAppear tüketir).

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CachedImage, Icon } from '../../components';
import type { BlogPost } from '../../models/blog';
import type { CarSummary } from '../../models/car';
import { AppView } from '../../models/navigation';
import { useNavigationStore } from '../../stores/navigationStore';
import { radii, useTheme, webFont } from '../../theme';
import { displayTitle, heroImageURL } from './shared';

type SearchScope = 'all' | 'cars' | 'blogs';

const SCOPE_LABELS: Record<SearchScope, string> = {
  all: 'Tümü',
  cars: 'Elektrikli Araçlar',
  blogs: 'Makaleler',
};

const SUBMIT_LABELS: Record<SearchScope, string> = {
  all: 'Tüm Sonuçları Gör',
  cars: 'Araç Arşivinde Ara',
  blogs: 'Makale Arşivinde Ara',
};

const RESULT_LIMIT = 6;

/** Araç eşleşme haystack'i (spec §8): "{brand} {model} {bodyType} {segment}". */
function carHaystack(car: CarSummary): string {
  return `${car.brand} ${car.model} ${car.bodyType ?? ''} ${car.segment ?? ''}`.toLowerCase();
}

/** Blog eşleşme haystack'i (spec §8): "{title} {excerpt} {category} {tags}". */
function blogHaystack(blog: BlogPost): string {
  return `${blog.title} ${blog.excerpt ?? ''} ${blog.category ?? ''} ${(blog.tags ?? []).join(' ')}`.toLowerCase();
}

export function AdvancedSearchModal(): React.JSX.Element {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const open = useNavigationStore((s) => s.searchModalOpen);
  const closeSearchModal = useNavigationStore((s) => s.closeSearchModal);
  const catalogCars = useNavigationStore((s) => s.catalogCars);
  const homeData = useNavigationStore((s) => s.homeData);
  const navigate = useNavigationStore((s) => s.navigate);
  const openCarDetail = useNavigationStore((s) => s.openCarDetail);
  const openBlogDetail = useNavigationStore((s) => s.openBlogDetail);
  const setPendingSearchQuery = useNavigationStore((s) => s.setPendingSearchQuery);
  const setBlogSearchQuery = useNavigationStore((s) => s.setBlogSearchQuery);

  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<SearchScope>('all');
  const inputRef = useRef<TextInput>(null);

  // Görününce query + scope sıfırla (spec §8): açılış geçişini render sırasında yakalarız
  // (React "you might not need an effect" deseni) — efekt içinde senkron setState yerine.
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setQuery('');
      setScope('all');
    }
  }

  // Autofocus efekt olarak kalır (harici sistem: klavye/odak) — spec §8.
  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(timer);
  }, [open]);

  const trimmed = query.trim().toLowerCase();

  const carResults = useMemo(() => {
    if (scope === 'blogs' || trimmed.length === 0) return [];
    return catalogCars.filter((car) => carHaystack(car).includes(trimmed)).slice(0, RESULT_LIMIT);
  }, [catalogCars, scope, trimmed]);

  const blogResults = useMemo(() => {
    if (scope === 'cars' || trimmed.length === 0) return [];
    const blogs = homeData?.latestBlogs ?? [];
    return blogs.filter((blog) => blogHaystack(blog).includes(trimmed)).slice(0, RESULT_LIMIT);
  }, [homeData?.latestBlogs, scope, trimmed]);

  function submitSearch(): void {
    if (query.trim().length === 0) return;
    if (scope === 'blogs') {
      setBlogSearchQuery(query);
      navigate(AppView.blog);
    } else {
      setPendingSearchQuery(query);
      navigate(AppView.search);
    }
    closeSearchModal();
  }

  const emptyResults = trimmed.length > 0 && carResults.length === 0 && blogResults.length === 0;
  const submitDisabled = query.trim().length === 0;

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={closeSearchModal}>
      <Pressable style={[styles.backdrop, { backgroundColor: 'rgba(12,10,9,0.5)' }]} onPress={closeSearchModal} />
      <View style={[styles.panelWrap, { paddingTop: insets.top + 48 }]} pointerEvents="box-none">
        <View style={[styles.panel, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: colors.stone50, borderBottomColor: colors.border }]}>
            <View style={[styles.headerIcon, { backgroundColor: colors.emerald50 }]}>
              <Icon name="sparkles" size={18} color={colors.emerald600} />
            </View>
            <View style={styles.headerText}>
              <Text style={[webFont(14, 900), { color: colors.stone900 }]}>Gelişmiş Arama</Text>
              <Text style={[webFont(10, 500), { color: colors.stone500 }]}>
                Araç kataloğu ve haber arşivinde arayın
              </Text>
            </View>
            <Pressable
              onPress={closeSearchModal}
              accessibilityRole="button"
              accessibilityLabel="Kapat"
              style={[styles.closeButton, { backgroundColor: colors.stone50 }]}
            >
              <Icon name="close" size={18} color={colors.stone600} />
            </Pressable>
          </View>

          <View style={styles.body}>
            {/* Arama alanı */}
            <View style={[styles.searchField, { backgroundColor: colors.stone50 }]}>
              <Icon name="search" size={18} color={colors.stone400} />
              <TextInput
                ref={inputRef}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={submitSearch}
                placeholder="Marka, model, haber başlığı veya konu yazın..."
                placeholderTextColor={colors.stone400}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
                style={[webFont(14, 500), styles.searchInput, { color: colors.stone900 }]}
              />
            </View>

            {/* Kapsam chipleri */}
            <View style={styles.scopeRow}>
              {(Object.keys(SCOPE_LABELS) as SearchScope[]).map((key) => {
                const isActive = scope === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setScope(key)}
                    accessibilityRole="button"
                    accessibilityLabel={SCOPE_LABELS[key]}
                    style={[
                      styles.scopeChip,
                      { backgroundColor: isActive ? colors.stone950 : colors.stone50 },
                    ]}
                  >
                    <Text style={[webFont(10, 800), { color: isActive ? '#FFFFFF' : colors.stone500 }]}>
                      {SCOPE_LABELS[key].toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Canlı sonuçlar */}
            {trimmed.length > 0 ? (
              <ScrollView style={styles.results} keyboardShouldPersistTaps="handled">
                {carResults.length > 0 ? (
                  <>
                    <ResultHeader icon="car" text={`ELEKTRİKLİ ARAÇLAR (${carResults.length})`} />
                    {carResults.map((car) => (
                      <Pressable
                        key={car.id}
                        onPress={() => {
                          closeSearchModal();
                          openCarDetail(car.id);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={displayTitle(car)}
                        style={({ pressed }) => [styles.resultRow, { opacity: pressed ? 0.7 : 1 }]}
                      >
                        <CachedImage
                          uri={heroImageURL(car)}
                          style={styles.carThumb}
                          placeholderColor={colors.stone100}
                        />
                        <View style={styles.resultBody}>
                          <Text style={[webFont(9, 900), styles.tracked, { color: colors.stone450 }]}>
                            {car.brand.toUpperCase()}
                          </Text>
                          <Text style={[webFont(12, 700), { color: colors.stone900 }]} numberOfLines={2}>
                            {displayTitle(car)}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </>
                ) : null}

                {blogResults.length > 0 ? (
                  <>
                    <ResultHeader icon="book" text={`MAKALELER (${blogResults.length})`} />
                    {blogResults.map((blog) => (
                      <Pressable
                        key={blog.id}
                        onPress={() => {
                          closeSearchModal();
                          openBlogDetail(blog.id);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={blog.title}
                        style={({ pressed }) => [styles.resultRow, { opacity: pressed ? 0.7 : 1 }]}
                      >
                        <CachedImage
                          uri={blog.image}
                          style={styles.blogThumb}
                          placeholderColor={colors.stone100}
                        />
                        <View style={styles.resultBody}>
                          <Text style={[webFont(9, 900), styles.tracked, { color: colors.stone450 }]}>
                            {(blog.category ?? 'Blog').toUpperCase()}
                          </Text>
                          <Text style={[webFont(12, 700), { color: colors.stone900 }]} numberOfLines={2}>
                            {blog.title}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </>
                ) : null}

                {emptyResults ? (
                  <Text style={[webFont(12, 500), styles.emptyText, { color: colors.stone500 }]}>
                    Sonuç bulunamadı. Farklı bir anahtar kelime deneyin.
                  </Text>
                ) : null}
              </ScrollView>
            ) : null}

            {/* Submit butonu */}
            <Pressable
              onPress={submitSearch}
              disabled={submitDisabled}
              accessibilityRole="button"
              accessibilityLabel={SUBMIT_LABELS[scope]}
              style={({ pressed }) => [
                styles.submitButton,
                {
                  backgroundColor: submitDisabled ? colors.stone100 : colors.stone950,
                  opacity: pressed && !submitDisabled ? 0.85 : 1,
                },
              ]}
            >
              <Text style={[webFont(12, 900), styles.tracked, { color: submitDisabled ? colors.stone400 : '#FFFFFF' }]}>
                {SUBMIT_LABELS[scope].toUpperCase()}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ResultHeader({ icon, text }: { icon: 'car' | 'book'; text: string }): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={styles.resultHeader}>
      <Icon name={icon} size={13} color={colors.emerald600} />
      <Text style={[webFont(9, 900), styles.tracked, { color: colors.stone450 }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  panelWrap: {
    flex: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  panel: {
    width: '100%',
    maxWidth: 640,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 16,
    gap: 12,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radii.inner,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    padding: 0,
  },
  scopeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  scopeChip: {
    flex: 1,
    alignItems: 'center',
    borderRadius: radii.button,
    paddingVertical: 8,
  },
  results: {
    maxHeight: 280,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  carThumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  blogThumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  resultBody: {
    flex: 1,
    gap: 2,
  },
  tracked: {
    letterSpacing: 0.6,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 24,
  },
  submitButton: {
    borderRadius: radii.inner,
    paddingVertical: 14,
    alignItems: 'center',
  },
});
