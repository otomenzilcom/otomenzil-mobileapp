// WebHomeView (route `home`) — web ana sayfasının aynası (spec §1).
//
// Tek ScrollView (pageBackground) + pull-to-refresh. Bölümler: AdSlot home_top, GarageHomeSection
// (slot yer tutucu — Agent 5b sahibi), hero (tagline/başlık/alt başlık + iki hızlı-link ızgarası +
// spotlight paneli), akıllı filtreleme kartı, marka karuseli, taşıt kredisi banner'ı, popüler
// düellolar, öne çıkanlar, body-type ızgarası ve blog şeridi. Prop ALMAZ — tüm durum store'lardan.
// NOT: seçili filtreler search ekranına AKTARILMAZ (bilinçli parite, spec §1.4 / §12.15).

import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  AdSlot,
  BlogPostCard,
  BrandLogo,
  CachedImage,
  CarCatalogCard,
  Icon,
  WebFilterField,
  type FilterOption,
  type IconName,
} from '../../components';
import type { CarSummary } from '../../models/car';
import type { SpotlightCard } from '../../models/home';
import { AppView, type AppViewID } from '../../models/navigation';
import { useAuthStore } from '../../stores/authStore';
import { useNavigationStore } from '../../stores/navigationStore';
import { NavigationDefaults, PopularDuelsBuilder, SiteDataEnricher } from '../../utils/siteBootstrap';
import { compareLocalizedTr } from '../../utils/turkishText';
import { radii, shadows, useTheme, webFont } from '../../theme';
import { GarageHomeSection } from '../detail';
import {
  brandOptionValues,
  bodyTypeOptionValues,
  displayTitle,
  heroImageURL,
  HOME_PREFILTER_DEFAULTS,
  homeHasActiveFilters,
  homeMatchingCount,
  MAX_BUDGET_OPTIONS,
  MIN_RANGE_OPTIONS,
  rangeDisplay,
  type HomePrefilter,
} from './shared';

const DEFAULT_TAGLINE = 'Türkiye’nin elektrikli araç karşılaştırma platformu';
const FEATURED_TITLE_FALLBACK = 'Oto Menzil Şampiyonları';
const VEHICLE_LOAN_BODY =
  '7,5 milyon TL’ye kadar yerli üretim tam elektrikli araçlarda %70’e varan kredilendirme, ' +
  '48 aya kadar vade ve nihai faturaya göre anlık taksit hesabı.';
const DUELS_SUBTITLE =
  'Menzil, fiyat ve segment verilerine göre öne çıkan elektrikli araç karşılaştırmalarını tek ' +
  'tıkla başlatın.';
const BODY_TYPE_SUBTITLE = 'Kasa tipini seçin, filtrelenmiş arşive geçin';
const BLOG_SUBTITLE =
  'Elektrikli araç dünyasından güncel haberler, rehberler ve analiz yazıları.';

/** Spotlight tone → vurgu rengi (spec §1: emerald varsayılan; stone/rose/blue/amber). */
function toneColor(tone: string): string {
  switch (tone) {
    case 'stone':
      return '#78716C';
    case 'rose':
      return '#F43F5E';
    case 'blue':
      return '#3B82F6';
    case 'amber':
      return '#F59E0B';
    default:
      return '#15803D';
  }
}

/** Body-type ikonu (spec §1.10). */
function bodyTypeIcon(type: string): IconName {
  switch (type) {
    case 'Hatchback':
    case 'Crossover':
      return 'compare';
    default:
      return 'car';
  }
}

export function WebHomeScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const homeData = useNavigationStore((s) => s.homeData);
  const appSettings = useNavigationStore((s) => s.appSettings);
  const catalogCars = useNavigationStore((s) => s.catalogCars);
  const brandLogos = useNavigationStore((s) => s.brandLogos);
  const resolvedTagline = useNavigationStore((s) => s.resolvedTagline);
  const navigate = useNavigationStore((s) => s.navigate);
  const openCarDetail = useNavigationStore((s) => s.openCarDetail);
  const openBlogDetail = useNavigationStore((s) => s.openBlogDetail);
  const addToCompare = useNavigationStore((s) => s.addToCompare);
  const removeFromCompare = useNavigationStore((s) => s.removeFromCompare);
  const compareList = useNavigationStore((s) => s.compareList);

  const refreshHome = useNavigationStore((s) => s.refreshHome);

  const openAuth = useAuthStore((s) => s.openAuth);
  const toggleFavorite = useAuthStore((s) => s.toggleFavorite);
  const toggleGarageCar = useAuthStore((s) => s.toggleGarageCar);
  const garageCarIds = useAuthStore((s) => s.garageCarIds);
  const favorites = useAuthStore((s) => s.favorites);
  const busyGarageCarIds = useAuthStore((s) => s.busyGarageCarIds);
  const isLoggedIn = useAuthStore((s) => s.currentUser !== null);

  const [refreshing, setRefreshing] = useState(false);
  const [prefilter, setPrefilter] = useState<HomePrefilter>(HOME_PREFILTER_DEFAULTS);

  const settings = appSettings ?? homeData?.settings;
  const generalTagline = (
    settings?.generalTagline ??
    resolvedTagline ??
    DEFAULT_TAGLINE
  ).trim();

  const featuredCars = homeData?.featuredCars ?? [];
  const latestBlogs = homeData?.latestBlogs ?? [];

  const spotlightCards = useMemo(
    () => SiteDataEnricher.buildSpotlightCards(catalogCars, homeData?.spotlightCards),
    [catalogCars, homeData?.spotlightCards],
  );
  const bodyTypeCounts = useMemo(
    () => SiteDataEnricher.buildBodyTypeCounts(catalogCars, homeData?.bodyTypeCounts),
    [catalogCars, homeData?.bodyTypeCounts],
  );
  const serverDuels = homeData?.popularDuels;
  const popularDuels = useMemo(
    () => (serverDuels && serverDuels.length > 0
      ? serverDuels
      : PopularDuelsBuilder.build(catalogCars)),
    [catalogCars, serverDuels],
  );

  const filterOptions = homeData?.filterOptions ?? settings?.filterOptions;
  const brandOptions: FilterOption[] = useMemo(() => {
    const list = brandOptionValues(catalogCars, filterOptions).map((b) => ({ value: b, label: b }));
    return [{ value: 'all', label: 'Tüm Markalar (Hepsi)' }, ...list];
  }, [catalogCars, filterOptions]);
  const bodyTypeOptions: FilterOption[] = useMemo(() => {
    const list = bodyTypeOptionValues(catalogCars, filterOptions).map((t) => ({ value: t, label: t }));
    return [{ value: 'all', label: 'Tüm Kasalar (Hepsi)' }, ...list];
  }, [catalogCars, filterOptions]);

  /** Marka karuseli — katalog marka havuzu + model sayıları (tr-aware sıralı). */
  const brandCarousel = useMemo(() => {
    const counts = new Map<string, number>();
    for (const car of catalogCars) {
      if (car.brand.length === 0) continue;
      counts.set(car.brand, (counts.get(car.brand) ?? 0) + 1);
    }
    return Array.from(counts, ([brand, count]) => ({ brand, count })).sort((a, b) =>
      compareLocalizedTr(a.brand, b.brand),
    );
  }, [catalogCars]);

  const matchingCount = useMemo(
    () => homeMatchingCount(catalogCars, prefilter),
    [catalogCars, prefilter],
  );
  const hasActiveFilters = homeHasActiveFilters(prefilter);

  const ctaLabel = hasActiveFilters
    ? matchingCount > 0
      ? `${matchingCount} Modeli Listele`
      : 'Eşleşen Araç Bulunamadı'
    : 'Araç Kataloğuna Git';
  const ctaDisabled = hasActiveFilters && matchingCount === 0;

  const featuredTitle = homeData?.featuredCarsTitle ?? FEATURED_TITLE_FALLBACK;

  // Hero başlık son eki: settings.homeHeroTitle "Karşılaştırma" içeriyorsa tam olarak
  // "Karşılaştırma" render edilir; yoksa değeri; yoksa varsayılan "Karşılaştırma".
  const heroSuffix = ((): string => {
    const raw = settings?.homeHeroTitle;
    if (raw && raw.includes('Karşılaştırma')) return 'Karşılaştırma';
    return raw && raw.length > 0 ? raw : 'Karşılaştırma';
  })();

  async function handleRefresh(): Promise<void> {
    setRefreshing(true);
    try {
      await refreshHome();
    } finally {
      setRefreshing(false);
    }
  }

  function toggleCompare(car: CarSummary): void {
    if (compareList.some((c) => c.id === car.id)) removeFromCompare(car.id);
    else addToCompare(car);
  }

  function cardProps(car: CarSummary): React.ComponentProps<typeof CarCatalogCard> {
    return {
      car,
      layout: 'grid',
      brandLogos,
      isComparing: compareList.some((c) => c.id === car.id),
      isFavorite: favorites.includes(car.id),
      isInGarage: garageCarIds.includes(car.id),
      isLoggedIn,
      garageBusy: busyGarageCarIds.includes(car.id),
      onDetail: () => openCarDetail(car.id),
      onCompare: () => toggleCompare(car),
      onToggleFavorite: () => void toggleFavorite(car.id),
      onToggleGarage: () => void toggleGarageCar(car.id, catalogCars),
      onBrandTap: () => navigate(AppView.brands),
    };
  }

  const quickLinks = NavigationDefaults.navigation.heroQuickLinks;
  const rankedGuides = NavigationDefaults.navigation.rankedGuides;

  return (
    <ScrollView
      style={{ backgroundColor: colors.pageBackground }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void handleRefresh()}
          tintColor={colors.emerald600}
        />
      }
    >
      {/* 1. AdSlot home_top */}
      <View style={styles.adTop}>
        <AdSlot
          slot="home_top"
          config={settings?.adSlots?.home_top}
          adsensePublisherId={settings?.adsensePublisherId}
        />
      </View>

      {/* 2. GarageHomeSection */}
      <GarageHomeSection
        onOpenGarage={() => navigate(AppView.garage)}
        onLogin={() => openAuth('Aracını garajına eklemek için giriş yapın.')}
      />

      {/* 3. Hero */}
      <View style={[styles.hero, { backgroundColor: colors.heroBackground, borderBottomColor: colors.border }]}>
        <View style={[styles.taglineCapsule, { backgroundColor: colors.emerald50, borderColor: colors.emerald100 }]}>
          <Text style={[webFont(10, 900), styles.taglineText, { color: colors.emerald700 }]}>
            {generalTagline.toUpperCase()}
          </Text>
        </View>
        <Text style={[webFont(28, 900), { color: colors.stone900 }]}>Elektrikli Araç</Text>
        <MaskedGradientTitle text={heroSuffix} />
        {settings?.homeHeroSubtitle ? (
          <Text style={[webFont(14, 500), { color: colors.stone600 }]}>{settings.homeHeroSubtitle}</Text>
        ) : null}

        <View style={styles.quickGrid}>
          {quickLinks.map((item) => (
            <QuickLinkTile
              key={item.id}
              label={item.label}
              title={item.title ?? item.label}
              onPress={() => navigate(item.id as AppViewID)}
            />
          ))}
        </View>
        <View style={styles.quickGrid}>
          {rankedGuides.map((item) => (
            <QuickLinkTile
              key={item.id}
              label={item.label}
              title={item.title ?? item.label}
              onPress={() => navigate(item.id as AppViewID)}
            />
          ))}
        </View>

        {/* Spotlight panel */}
        <View style={[styles.spotlightPanel, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <View style={styles.spotlightHeader}>
            <View style={styles.spotlightHeaderLeft}>
              <Icon name="star" size={14} color={colors.emerald600} />
              <Text style={[webFont(10, 900), styles.tracked, { color: colors.stone900 }]}>
                {featuredTitle.toUpperCase()}
              </Text>
            </View>
            <Text style={[webFont(9, 900), styles.tracked, { color: colors.stone400 }]}>EDİTÖR SEÇKİSİ</Text>
          </View>
          {spotlightCards.map((card, index) => (
            <SpotlightRow key={`${card.car.id}-${index}`} card={card} onPress={() => openCarDetail(card.car.id)} />
          ))}
        </View>
      </View>

      {/* 4. Akıllı filtreleme kartı */}
      <View style={styles.section}>
        <View style={[styles.searchCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }, shadows.card]}>
          <View style={[styles.searchAccent, { backgroundColor: colors.emerald600 }]} />
          <View style={styles.searchHeader}>
            <Icon name="sliders" size={16} color={colors.emerald600} />
            <Text style={[webFont(12, 900), styles.tracked, { color: colors.stone900 }]}>
              AKILLI FİLTRELEME VE ARAMA ROBOTU
            </Text>
          </View>
          <View style={[styles.hairline, { backgroundColor: colors.borderLight }]} />

          <WebFilterField
            title="Üretici Marka"
            value={prefilter.brand}
            options={brandOptions}
            onChange={(brand) => setPrefilter((p) => ({ ...p, brand }))}
          />
          <WebFilterField
            title="Kasa Türü"
            value={prefilter.bodyType}
            options={bodyTypeOptions}
            onChange={(bodyType) => setPrefilter((p) => ({ ...p, bodyType }))}
          />
          <WebFilterField
            title="Asgari Menzil (WLTP)"
            value={String(prefilter.minRange)}
            options={MIN_RANGE_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
            onChange={(v) => setPrefilter((p) => ({ ...p, minRange: Number(v) }))}
          />
          <WebFilterField
            title="Maksimum Bütçe"
            value={String(prefilter.maxPrice)}
            options={MAX_BUDGET_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
            onChange={(v) => setPrefilter((p) => ({ ...p, maxPrice: Number(v) }))}
          />

          {hasActiveFilters ? (
            <Text style={[webFont(12, 500), { color: colors.stone600 }]}>
              Seçili filtreye uyan{' '}
              <Text style={[webFont(12, 900), { color: '#DC2626' }]}>{matchingCount}</Text> model.
            </Text>
          ) : (
            <Text style={[webFont(12, 500), { color: colors.stone600 }]}>
              Marka, kasa, menzil veya bütçe seçerek katalogda aradığınız aracı daraltın.
            </Text>
          )}

          <Pressable
            onPress={() => navigate(AppView.search)}
            disabled={ctaDisabled}
            accessibilityRole="button"
            accessibilityLabel={ctaLabel}
            style={({ pressed }) => [
              styles.searchCta,
              {
                backgroundColor: ctaDisabled ? colors.stone100 : colors.stone950,
                opacity: pressed && !ctaDisabled ? 0.85 : 1,
              },
            ]}
          >
            <Icon name="search" size={15} color={ctaDisabled ? colors.stone400 : colors.emerald400} />
            <Text style={[webFont(12, 900), styles.tracked, { color: ctaDisabled ? colors.stone400 : '#FFFFFF' }]}>
              {ctaLabel.toUpperCase()}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* 5. Marka karuseli */}
      {brandCarousel.length > 0 ? (
        <View style={[styles.brandStrip, { backgroundColor: colors.stone50, borderBottomColor: colors.border }]}>
          <Text style={[webFont(10, 900), styles.brandHeading, { color: colors.stone400 }]}>
            ÜRETİCİ MARKA HAVUZU HIZLI SEÇİM
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.brandRow}>
            {brandCarousel.map((item) => (
              <Pressable
                key={item.brand}
                onPress={() => navigate(AppView.brands)}
                accessibilityRole="button"
                accessibilityLabel={item.brand}
                style={[styles.brandTile, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
              >
                <BrandLogo brand={item.brand} logoURL={brandLogos[item.brand]} size={44} />
                <Text style={[webFont(10, 900), styles.brandName, { color: colors.stone900 }]} numberOfLines={2}>
                  {item.brand}
                </Text>
                <Text style={[webFont(9, 600), { color: colors.stone400 }]}>{item.count} Model</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* 6. Taşıt kredisi banner */}
      <View style={styles.section}>
        <Pressable
          onPress={() => navigate(AppView.vehicleLoan)}
          accessibilityRole="button"
          accessibilityLabel="Elektrikli Araç Taşıt Kredisi"
        >
          <LinearGradient
            colors={['#0C0A09', '#064E3B', '#115E59']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.loanBanner}
          >
            <View style={styles.loanCapsule}>
              <Icon name="gauge" size={12} color="#A7F3D0" />
              <Text style={[webFont(10, 900), styles.tracked, { color: '#A7F3D0' }]}>BDDK 2026 · YERLİ EV</Text>
            </View>
            <Text style={[webFont(24, 900), { color: '#FFFFFF' }]}>Elektrikli Araç Taşıt Kredisi</Text>
            <Text style={[webFont(13, 500), { color: '#D6D3D1' }]}>{VEHICLE_LOAN_BODY}</Text>
            <View style={styles.loanPill}>
              <Text style={[webFont(11, 900), { color: '#0C0A09' }]}>Hesapla ve Rehberi Oku →</Text>
            </View>
          </LinearGradient>
        </Pressable>
      </View>

      {/* 7. Popüler düellolar */}
      {popularDuels.length > 0 ? (
        <View style={styles.section}>
          <LinearGradient
            colors={['#0C0A09', '#1C1917', '#064E3B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.duelPanel}
          >
            <View style={styles.duelHeaderRow}>
              <Icon name="compare" size={13} color="#6EE7B7" />
              <Text style={[webFont(10, 900), styles.tracked, { color: '#6EE7B7' }]}>SIK KARŞILAŞTIRILANLAR</Text>
            </View>
            <Text style={[webFont(22, 900), { color: '#FFFFFF' }]}>
              En Çok Karşılaştırılan Elektrikli Araç Modelleri
            </Text>
            <Text style={[webFont(12, 500), { color: '#D6D3D1' }]}>{DUELS_SUBTITLE}</Text>
            {popularDuels.map((duel) => (
              <Pressable
                key={duel.id}
                onPress={() => navigate(AppView.compare)}
                accessibilityRole="button"
                accessibilityLabel={duel.title}
                style={styles.duelCard}
              >
                <View style={styles.duelCardHeader}>
                  <View style={styles.duelReason}>
                    <Text style={[webFont(9, 900), styles.tracked, { color: '#6EE7B7' }]}>
                      {duel.matchReason.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[webFont(10, 900), { color: '#A7F3D0' }]}>Karşılaştır →</Text>
                </View>
                <View style={styles.duelVsRow}>
                  <View style={styles.duelVsCircle}>
                    <Text style={[webFont(11, 900), { color: '#F87171' }]}>VS</Text>
                  </View>
                </View>
                <Text style={[webFont(14, 900), { color: '#FFFFFF' }]}>{duel.title}</Text>
                <View style={styles.duelStats}>
                  <View style={styles.duelStatBox}>
                    <Text style={[webFont(9, 700), { color: '#A8A29E' }]}>Menzil</Text>
                    <Text style={[webFont(13, 900), { color: '#FFFFFF' }]}>{rangeDisplay(duel.car1.rangeKm)}</Text>
                  </View>
                  <View style={styles.duelStatBox}>
                    <Text style={[webFont(9, 700), { color: '#A8A29E' }]}>Menzil</Text>
                    <Text style={[webFont(13, 900), { color: '#FFFFFF' }]}>{rangeDisplay(duel.car2.rangeKm)}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </LinearGradient>
        </View>
      ) : null}

      {/* 8. Öne çıkanlar */}
      {featuredCars.length > 0 ? (
        <View style={styles.section}>
          <Text style={[webFont(10, 900), styles.tracked, { color: '#EF4444' }]}>POPÜLER SEÇİMLER</Text>
          <View style={styles.sectionTitleRow}>
            <Text style={[webFont(22, 900), styles.flexTitle, { color: colors.stone900 }]}>
              Öne Çıkan Elektrikli Araçlar
            </Text>
            <Pressable onPress={() => navigate(AppView.search)} accessibilityRole="button">
              <Text style={[webFont(12, 700), { color: colors.emerald600 }]}>Tüm Kataloğu İncele →</Text>
            </Pressable>
          </View>
          <View style={styles.featuredList}>
            {featuredCars.map((car) => (
              <CarCatalogCard key={car.id} {...cardProps(car)} />
            ))}
          </View>
        </View>
      ) : null}

      {/* 9. AdSlot home_mid */}
      <View style={styles.section}>
        <AdSlot
          slot="home_mid"
          config={settings?.adSlots?.home_mid}
          adsensePublisherId={settings?.adsensePublisherId}
        />
      </View>

      {/* 10. Body-type ızgarası */}
      {bodyTypeCounts.length > 0 ? (
        <View style={styles.section}>
          <Text style={[webFont(20, 900), styles.centeredTitle, { color: colors.stone900 }]}>
            Gövde Tipine Göre Elektrikli Araç Bul
          </Text>
          <Text style={[webFont(13, 500), styles.centeredTitle, { color: colors.stone500 }]}>
            {BODY_TYPE_SUBTITLE}
          </Text>
          <View style={styles.bodyGrid}>
            {bodyTypeCounts.map((item) => {
              const disabled = item.count === 0;
              return (
                <Pressable
                  key={item.type}
                  onPress={() => navigate(AppView.search)}
                  disabled={disabled}
                  accessibilityRole="button"
                  accessibilityLabel={item.type}
                  style={[
                    styles.bodyTile,
                    { backgroundColor: colors.cardBackground, borderColor: colors.border, opacity: disabled ? 0.5 : 1 },
                  ]}
                >
                  <View style={[styles.bodyIcon, { backgroundColor: colors.emerald50 }]}>
                    <Icon name={bodyTypeIcon(item.type)} size={18} color={colors.emerald600} />
                  </View>
                  <Text style={[webFont(11, 900), { color: colors.stone900 }]}>{item.type}</Text>
                  <Text style={[webFont(10, 600), { color: colors.stone400 }]}>{item.count}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* 11. Blog şeridi */}
      {latestBlogs.length > 0 ? (
        <View style={[styles.section, styles.blogSection, { borderTopColor: colors.borderLight }]}>
          <Text style={[webFont(12, 900), styles.tracked, { color: colors.emerald600 }]}>BLOG & HABER</Text>
          <Text style={[webFont(24, 900), { color: colors.stone900 }]}>Oto Menzil Blog</Text>
          <Text style={[webFont(13, 500), { color: colors.stone500 }]}>{BLOG_SUBTITLE}</Text>
          <View style={styles.blogList}>
            {latestBlogs.slice(0, 3).map((blog) => (
              <BlogPostCard
                key={blog.id}
                blog={blog}
                layout="list"
                onPress={() => openBlogDetail(blog.id)}
              />
            ))}
          </View>
          <Pressable onPress={() => navigate(AppView.blog)} accessibilityRole="button">
            <Text style={[webFont(12, 700), { color: colors.emerald600 }]}>Tüm Yazıları Gör →</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

/** Hero başlık son eki — gradient dolgulu (maskeleme yerine gradient metin yaklaşık). */
function MaskedGradientTitle({ text }: { text: string }): React.JSX.Element {
  const { colors } = useTheme();
  // RN'de metin gradient dolgusu doğal değil — emerald600 düz renk (heroGradient yaklaşık başı).
  return <Text style={[webFont(28, 900), { color: colors.emerald600 }]}>{text}</Text>;
}

function QuickLinkTile({
  label,
  title,
  onPress,
}: {
  label: string;
  title: string;
  onPress: () => void;
}): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        styles.quickTile,
        { backgroundColor: colors.cardBackground, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[styles.quickIcon, { backgroundColor: colors.emerald50 }]}>
        <Icon name="chevron-forward" size={16} color={colors.emerald600} />
      </View>
      <Text style={[webFont(8, 900), styles.tracked, { color: colors.emerald600 }]}>
        {label.toUpperCase()}
      </Text>
      <Text style={[webFont(10, 700), { color: colors.stone900 }]} numberOfLines={2}>
        {title}
      </Text>
    </Pressable>
  );
}

function SpotlightRow({
  card,
  onPress,
}: {
  card: SpotlightCard;
  onPress: () => void;
}): React.JSX.Element {
  const { colors } = useTheme();
  const tone = toneColor(card.tone);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={displayTitle(card.car)}
      style={({ pressed }) => [styles.spotlightRow, { opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={[styles.spotlightAccent, { backgroundColor: tone }]} />
      <View style={[styles.spotlightThumbWrap, { backgroundColor: colors.stone50 }]}>
        {/* Küçük araç thumb'ı — CarCatalogCard yerine hafif görsel bloğu. */}
        <SpotlightThumb uri={heroImageURL(card.car)} placeholder={colors.stone100} />
      </View>
      <View style={styles.spotlightBody}>
        <Text style={[webFont(9, 600), styles.tracked, { color: colors.stone400 }]}>
          {card.label.toUpperCase()}
        </Text>
        <Text style={[webFont(13, 700), { color: colors.stone900 }]} numberOfLines={1}>
          {displayTitle(card.car)}
        </Text>
      </View>
      <View style={styles.spotlightRight}>
        <View style={[styles.spotlightBadge, { backgroundColor: `${tone}1F` }]}>
          <Text style={[webFont(10, 900), { color: tone }]}>{card.badge}</Text>
        </View>
        <Text style={[webFont(9, 700), { color: colors.emerald600 }]}>İncele →</Text>
      </View>
    </Pressable>
  );
}

function SpotlightThumb({ uri, placeholder }: { uri?: string; placeholder: string }): React.JSX.Element {
  return (
    <CachedImage
      uri={uri}
      style={styles.spotlightThumb}
      placeholderColor={placeholder}
      contentFit="cover"
    />
  );
}

const styles = StyleSheet.create({
  adTop: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  hero: {
    padding: 16,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  taglineCapsule: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  taglineText: {
    letterSpacing: 1.2,
  },
  tracked: {
    letterSpacing: 0.8,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickTile: {
    width: '48%',
    flexGrow: 1,
    gap: 6,
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  quickIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotlightPanel: {
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  spotlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spotlightHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  spotlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 6,
  },
  spotlightAccent: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
  },
  spotlightThumbWrap: {
    width: 52,
    height: 38,
    borderRadius: 8,
    overflow: 'hidden',
  },
  spotlightThumb: {
    width: '100%',
    height: '100%',
  },
  spotlightBody: {
    flex: 1,
    gap: 2,
  },
  spotlightRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  spotlightBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },
  searchCard: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    paddingTop: 20,
    gap: 12,
    overflow: 'hidden',
  },
  searchAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
  },
  searchCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radii.inner,
    paddingVertical: 14,
  },
  brandStrip: {
    paddingVertical: 20,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brandHeading: {
    textAlign: 'center',
    letterSpacing: 1.2,
  },
  brandRow: {
    paddingHorizontal: 16,
    gap: 10,
  },
  brandTile: {
    width: 88,
    alignItems: 'center',
    gap: 6,
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  brandName: {
    textAlign: 'center',
  },
  loanBanner: {
    borderRadius: 32,
    padding: 24,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(209,250,229,0.3)',
  },
  loanCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  loanPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 4,
  },
  duelPanel: {
    borderRadius: 32,
    padding: 20,
    gap: 12,
  },
  duelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  duelCard: {
    borderRadius: radii.card,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    gap: 10,
    marginTop: 4,
  },
  duelCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  duelReason: {
    borderRadius: 999,
    backgroundColor: 'rgba(110,231,183,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  duelVsRow: {
    alignItems: 'center',
  },
  duelVsCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0C0A09',
    borderWidth: 1,
    borderColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  duelStats: {
    flexDirection: 'row',
    gap: 10,
  },
  duelStatBox: {
    flex: 1,
    gap: 2,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  flexTitle: {
    flex: 1,
  },
  featuredList: {
    gap: 16,
  },
  centeredTitle: {
    textAlign: 'center',
  },
  bodyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  bodyTile: {
    minWidth: 108,
    flexGrow: 1,
    alignItems: 'center',
    gap: 6,
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
  },
  bodyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blogSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  blogList: {
    gap: 16,
  },
  bottomSpacer: {
    height: 24,
  },
});
