// CarDetailView — iOS CarDetailView `.car(slug:)` overlay'i (spec §4).
//
// SHELL SÖZLEŞMESİ (istisna): bu bileşen overlay yuvasında yaşar. `useNavigationStore().overlay`
// slug'ını KENDİSİ okur ve kendi verisini çeker (Wave 6 AppShell.DetailOverlaySlot'a takar).
// Load sırası (spec §4): (1) store.catalogCars'tan özet tohumu (CarDetail(summary:)), (2) modül
// önbelleği (cachedCarDetail), (3) api.fetchCarDetail(slug) → değiştir + cache. 404'te client.ts
// zaten katalogdan id ile eşleştirir (spec 01 kuralı). Açılışta trackCarView (nonce varsa).
//
// ToastBanner shell'de authStore'a bağlıdır; bu görünüm KENDİ toast'ını çizer (favori ekleme,
// rapor gönderimi). Rapor gönderimi apiClient.submitErrorReport'a bağlanır (ReportErrorSheet'in
// iç submit'i host'a bırakılmış no-op'tur; API çağrısı onSuccess içinde yapılır).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { apiClient } from '../../api';
import { siteBaseURL } from '../../config';
import type { CarColor, CarDetail } from '../../models/car';
import { CarTechSpecBuilder } from '../../utils/carTechSpecBuilder';
import { SimilarCarsEngine } from '../../utils/similarCarsEngine';
import { useAuthStore, useNavigationStore } from '../../stores';
import { radii, shadows, useTheme, webFont } from '../../theme';
import {
  CachedImage,
  CarDetailPricePanel,
  CarRatingVoteBar,
  CarReviewsSection,
  CarSpecDeck,
  CarSummaryCard,
  ChargingSimulatorSection,
  DataVerificationBadge,
  EngineeringLabSection,
  Icon,
  ReportErrorSheet,
  ShareMetaPillButton,
  share,
} from '../../components';
import { cacheCarDetail, cachedCarDetail } from './carDetailCache';
import { detailFromSummary } from './detailFromSummary';

const TOAST_DURATION_MS = 3000;
const FAVORITE_TOAST_MS = 2500;
const REPORT_TOAST = 'Bildiriminiz gönderildi — teşekkürler!';
const FAVORITE_TOAST = 'Favorilerinize eklendi.';

const DEFAULT_EXPANDED = new Set<string>([
  'Menzil Tahminleri (İklimsel & Parkur)',
  'Performans Verileri',
]);

const DISCLAIMER =
  'Fiyat, menzil ve teknik veriler üretici duyuruları ve bağımsız testlerden derlenmiştir. Nihai değerler donanım paketine göre değişebilir.';

/** Swift CarSummary.displayTitle. */
function displayTitle(brand: string, model: string): string {
  return model.toLowerCase().startsWith(brand.toLowerCase()) ? model : `${brand} ${model}`;
}

function galleryURLs(car: CarDetail): string[] {
  return (car.images ?? []).filter((u) => u.length > 0);
}

/**
 * Overlay giriş noktası. overlay slug'ını okur; `key={slug}` ile CarDetailBody'i yeniden
 * mount ederek araç değişiminde tüm yerel durumu (görsel/renk/accordion) sıfırlar — böylece
 * effect içinde senkron reset gerekmez (React "reset state with key" deseni).
 */
export function CarDetailView(): React.JSX.Element | null {
  const overlay = useNavigationStore((s) => s.overlay);
  const slug = overlay?.kind === 'car' ? overlay.slug : null;
  if (slug == null) return null;
  return <CarDetailBody key={slug} slug={slug} />;
}

function CarDetailBody({ slug }: { slug: string }): React.JSX.Element {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const catalogCars = useNavigationStore((s) => s.catalogCars);
  const appSettings = useNavigationStore((s) => s.appSettings);
  const homeData = useNavigationStore((s) => s.homeData);
  const brandLogos = useNavigationStore((s) => s.brandLogos);
  const closeOverlay = useNavigationStore((s) => s.closeOverlay);
  const navigate = useNavigationStore((s) => s.navigate);
  const setSelectedBrandName = useNavigationStore((s) => s.setSelectedBrandName);
  const openCarDetail = useNavigationStore((s) => s.openCarDetail);
  const compareList = useNavigationStore((s) => s.compareList);
  const addToCompare = useNavigationStore((s) => s.addToCompare);
  const setGalleryExpanded = useNavigationStore((s) => s.setGalleryExpanded);

  const isLoggedIn = useAuthStore((s) => s.currentUser !== null);
  const isFavorite = useAuthStore((s) => s.isFavorite);
  const toggleFavorite = useAuthStore((s) => s.toggleFavorite);
  const isInGarage = useAuthStore((s) => s.isInGarage);
  const toggleGarageCar = useAuthStore((s) => s.toggleGarageCar);
  const currentNonce = useAuthStore((s) => s.currentNonce);

  const settings = appSettings ?? homeData?.settings;
  const brandPriceListUrls = homeData?.brandPriceListUrls ?? settings?.brandPriceListUrls ?? {};

  // İlk boya: önbellek → katalog özeti (CarDetail(summary:)) → null (spec §4 load sırası 1-2).
  const [car, setCar] = useState<CarDetail | null>(() => {
    const cached = cachedCarDetail(slug);
    if (cached) return cached;
    const summary = catalogCars.find((c) => c.id === slug);
    return summary ? detailFromSummary(summary) : null;
  });
  const [loadError, setLoadError] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(DEFAULT_EXPANDED));
  const [showReport, setShowReport] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, duration = TOAST_DURATION_MS) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), duration);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  // Load: özet tohum → önbellek → ağ. Mount'ta bir kez (key={slug} ile araç değişince remount).
  useEffect(() => {
    let active = true;

    // 3. Ağdan hidrasyon (404 → client.ts katalogdan id ile eşleştirir).
    void (async () => {
      const hadSeed = cachedCarDetail(slug) != null || catalogCars.some((c) => c.id === slug);
      try {
        const fresh = await apiClient.fetchCarDetail(slug);
        if (!active) return;
        cacheCarDetail(fresh);
        setCar(fresh);
      } catch {
        if (active && !hadSeed) setLoadError(true);
      }
    })();

    // Görüntüleme izleme (fire-and-forget; nonce varsa).
    void (async () => {
      try {
        const nonce = await currentNonce();
        if (nonce.length > 0) await apiClient.trackCarView(slug, nonce);
      } catch {
        // yut
      }
    })();

    return () => {
      active = false;
    };
    // slug sabittir (key ile mount); currentNonce store aksiyonu (stabil).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const images = useMemo(() => (car ? galleryURLs(car) : []), [car]);
  const similar = useMemo(
    () => (car ? SimilarCarsEngine.similar(car, catalogCars, 6) : []),
    [car, catalogCars],
  );
  const techGroups = useMemo(
    () => (car ? CarTechSpecBuilder.groups(car, settings) : []),
    [car, settings],
  );

  const nonceProvider = useCallback(() => currentNonce(), [currentNonce]);

  const handleBrandTap = useCallback(() => {
    if (!car) return;
    setSelectedBrandName(car.brand);
    navigate('brands');
  }, [car, navigate, setSelectedBrandName]);

  const handleShare = useCallback(() => {
    if (!car) return;
    void share({
      title: `${displayTitle(car.brand, car.model)} — Oto Menzil`,
      url: `${siteBaseURL}/arac/${car.id}/`,
    });
  }, [car]);

  const handleDownloadPDF = useCallback(() => {
    if (!car) return;
    void share({
      message: `${displayTitle(car.brand, car.model)} — Oto Menzil Kataloğu`,
      url: `${siteBaseURL}/arac/${car.id}/`,
    });
  }, [car]);

  const handleCompare = useCallback(() => {
    if (!car) return;
    addToCompare(car);
  }, [addToCompare, car]);

  const handleToggleGarage = useCallback(() => {
    if (!car) return;
    void toggleGarageCar(car.id, catalogCars);
  }, [car, catalogCars, toggleGarageCar]);

  // Rapor gönderimi: apiClient.submitErrorReport (ReportErrorSheet iç submit'i no-op host seam'i).
  const handleReportSuccess = useCallback(() => {
    if (!car) return;
    void (async () => {
      try {
        const nonce = await currentNonce();
        await apiClient.submitErrorReport(
          {
            message: '',
            carId: car.id,
            carTitle: displayTitle(car.brand, car.model),
          },
          nonce,
        );
      } catch {
        // gönderim hatası kullanıcı akışını bozmaz (parite: iOS toast'ı yine gösterir)
      }
    })();
    showToast(REPORT_TOAST);
  }, [car, currentNonce, showToast]);

  const handleSimilarFavorite = useCallback(
    (carId: string) => {
      const wasFavorite = isFavorite(carId);
      void toggleFavorite(carId);
      if (!wasFavorite && isLoggedIn) showToast(FAVORITE_TOAST, FAVORITE_TOAST_MS);
    },
    [isFavorite, isLoggedIn, showToast, toggleFavorite],
  );

  const openGallery = useCallback(() => {
    setShowGallery(true);
    setGalleryExpanded(true);
  }, [setGalleryExpanded]);

  const closeGallery = useCallback(() => {
    setShowGallery(false);
    setGalleryExpanded(false);
  }, [setGalleryExpanded]);

  if (car == null) {
    return (
      <View style={[styles.root, styles.centered, { backgroundColor: colors.detailBackground }]}>
        <ShellBackBar onPress={closeOverlay} />
        {loadError ? (
          <View style={styles.errorBlock}>
            <Icon name="alert-triangle" size={32} color={colors.amber800} />
            <Text style={[webFont(14, 700), styles.centeredText, { color: colors.stone900 }]}>
              Araç yüklenemedi.
            </Text>
            <Pressable
              onPress={() => setLoadError(false)}
              accessibilityRole="button"
              accessibilityLabel="Tekrar dene"
              style={[styles.retryButton, { backgroundColor: colors.emerald600 }]}
            >
              <Text style={[webFont(13, 700), { color: '#FFFFFF' }]}>Tekrar dene</Text>
            </Pressable>
          </View>
        ) : (
          <ActivityIndicator color={colors.emerald600} />
        )}
      </View>
    );
  }

  const isComparing = compareList.some((c) => c.id === car.id);
  const inGarage = isInGarage(car.id);
  const ratingText =
    car.rating != null
      ? `${car.rating.toFixed(1)}/5 (${car.ratingVoteCount ?? 0} oylama)`
      : null;

  return (
    <View style={[styles.root, { backgroundColor: colors.detailBackground }]}>
      <ShellBackBar onPress={closeOverlay} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header card */}
        <View style={[styles.headerCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Pressable onPress={handleBrandTap} accessibilityRole="button" accessibilityLabel={car.brand}>
            <View style={styles.headerIdentity}>
              <CachedImage
                uri={brandLogos[car.brand]}
                style={styles.brandLogo}
                contentFit="contain"
                placeholderColor={colors.stone100}
              />
              <View style={styles.headerText}>
                <Text style={[webFont(10, 900), { color: colors.emerald700, letterSpacing: 0.5 }]}>
                  {car.brand.toUpperCase()}
                </Text>
                <Text style={[webFont(22, 900), { color: colors.stone900 }]}>
                  {displayTitle(car.brand, car.model)}
                </Text>
                <Text style={[webFont(12, 500), { color: colors.stone500 }]}>
                  {car.year ?? '—'} · {car.bodyType ?? '—'}
                </Text>
              </View>
            </View>
          </Pressable>

          <View style={styles.badgeRow}>
            {car.bodyType ? (
              <View style={[styles.chip, { backgroundColor: colors.stone50 }]}>
                <Text style={[webFont(10, 800), { color: colors.stone600 }]}>
                  {car.bodyType.toUpperCase()}
                </Text>
              </View>
            ) : null}
            {ratingText ? (
              <View style={[styles.chip, { backgroundColor: colors.stone50 }]}>
                <Text style={[webFont(10, 800), { color: colors.stone600 }]}>{ratingText}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.headerButtons}>
            <ShareMetaPillButton title="PAYLAŞ" icon="share" onPress={handleShare} />
            <Pressable
              onPress={() => setShowReport(true)}
              accessibilityRole="button"
              accessibilityLabel="Bildir"
              style={[styles.reportPill, { backgroundColor: colors.amber50, borderColor: colors.amber200 }]}
            >
              <Icon name="alert-triangle" size={13} color="#92400E" />
              <Text style={[webFont(10, 800), { color: '#92400E' }]}>BİLDİR</Text>
            </Pressable>
            <DataVerificationBadge verified={car.dataVerified === true} compact />
          </View>
        </View>

        {/* Gallery */}
        {images.length > 0 ? (
          <Gallery
            images={images}
            activeIndex={activeImageIndex}
            onChangeIndex={setActiveImageIndex}
            onExpand={openGallery}
          />
        ) : null}

        {/* Price panel */}
        <CarDetailPricePanel
          car={car}
          brandPriceListURL={brandPriceListUrls[car.brand]}
          isComparing={isComparing}
          isInGarage={inGarage}
          onCompare={handleCompare}
          onOpenCompare={() => navigate('compare')}
          onToggleGarage={handleToggleGarage}
          onDownloadPDF={handleDownloadPDF}
        />

        {/* Rating vote */}
        <CarRatingVoteBar
          carId={car.id}
          initialAverage={car.rating}
          initialCount={car.ratingVoteCount}
          nonceProvider={nonceProvider}
        />

        {/* Editorial summary */}
        <CarSummaryCard description={car.description} />

        {/* Engineering lab (real-range estimator) */}
        <View style={[styles.plainCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <EngineeringLabSection car={car} />
        </View>

        {/* Spec deck */}
        <View style={styles.specDeckWrap}>
          <CarSpecDeck
            rangeKm={car.rangeKm}
            batteryKwh={car.batteryKwh}
            powerHp={car.powerHp}
            accelerationSec={car.accelerationSec}
          />
        </View>

        {/* Charging simulator */}
        <ChargingSimulatorSection car={car} />

        {/* Tech specs accordion */}
        <TechSpecsAccordion
          groups={techGroups}
          expanded={expanded}
          onToggle={(name) =>
            setExpanded((prev) => {
              const next = new Set(prev);
              if (next.has(name)) next.delete(name);
              else next.add(name);
              return next;
            })
          }
        />

        {/* Colors */}
        {car.colors && car.colors.length > 0 ? (
          <ColorsCard
            colors={car.colors}
            selectedIndex={selectedColorIndex}
            onSelect={setSelectedColorIndex}
          />
        ) : null}

        {/* Reviews */}
        <CarReviewsSection slug={car.id} carId={car.id} />

        {/* Similar cars */}
        {similar.length > 0 ? (
          <View style={styles.similarSection}>
            <SectionHeaderBar
              accentColor={colors.emerald500}
              title="Benzer Elektrikli Seçenekleri"
              subtitle="Alternatif segment veya bütçe dostu elektrikli modeller"
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.similarRow}>
              {similar.map((s) => (
                <View key={s.id} style={styles.similarCard}>
                  <SimilarCarCard
                    car={s}
                    onOpen={() => openCarDetail(s.id)}
                    onFavorite={() => handleSimilarFavorite(s.id)}
                    isFavorite={isFavorite(s.id)}
                    brandLogos={brandLogos}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Disclaimer */}
        <View style={[styles.disclaimer, { backgroundColor: colors.stone50 }]}>
          <Text style={[webFont(11, 500), { color: colors.stone500 }]}>{DISCLAIMER}</Text>
        </View>
      </ScrollView>

      {/* Report sheet */}
      <ReportErrorSheet
        visible={showReport}
        car={car}
        nonceProvider={nonceProvider}
        onClose={() => setShowReport(false)}
        onSuccess={handleReportSuccess}
      />

      {/* Fullscreen gallery */}
      <FullscreenGallery
        visible={showGallery}
        images={images}
        initialIndex={activeImageIndex}
        onClose={closeGallery}
      />

      {/* Host toast (favori / rapor) */}
      {toast ? <DetailToast message={toast} topInset={insets.top} /> : null}
    </View>
  );
}

// ── ShellBackBar (§4.1) ─────────────────────────────────────────────────────────────

function ShellBackBar({ onPress }: { onPress: () => void }): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Geri"
      style={[styles.backBar, { borderBottomColor: colors.border }]}
    >
      <Icon name="chevron-back" size={18} color={colors.emerald600} />
      <Text style={[webFont(13, 600), { color: colors.emerald600 }]}>Geri</Text>
    </Pressable>
  );
}

// ── Gallery (§4.4) ──────────────────────────────────────────────────────────────────

function Gallery({
  images,
  activeIndex,
  onChangeIndex,
  onExpand,
}: {
  images: string[];
  activeIndex: number;
  onChangeIndex: (i: number) => void;
  onExpand: () => void;
}): React.JSX.Element {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<string>>(null);
  const pageWidth = width - 32; // 16 h-padding sayfa genişliği

  const goTo = (index: number): void => {
    const clamped = Math.max(0, Math.min(images.length - 1, index));
    listRef.current?.scrollToOffset({ offset: clamped * pageWidth, animated: true });
    onChangeIndex(clamped);
  };

  return (
    <View style={styles.gallery}>
      <View style={{ height: 280, borderRadius: radii.card, overflow: 'hidden' }}>
        <FlatList
          ref={listRef}
          data={images}
          keyExtractor={(uri, i) => `${uri}-${i}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          getItemLayout={(_, index) => ({ length: pageWidth, offset: pageWidth * index, index })}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
            onChangeIndex(index);
          }}
          renderItem={({ item }) => (
            <Pressable onPress={onExpand} accessibilityRole="imagebutton" accessibilityLabel="Görseli büyüt">
              <CachedImage uri={item} style={{ width: pageWidth, height: 280 }} />
            </Pressable>
          )}
        />
        <View style={[styles.counterChip, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
          <Text style={[webFont(10, 700), { color: '#FFFFFF' }]}>
            Görsel {activeIndex + 1} / {images.length}
          </Text>
        </View>
        <Pressable
          onPress={onExpand}
          accessibilityRole="button"
          accessibilityLabel="Büyüt"
          style={[styles.expandChip, { backgroundColor: colors.galleryControlBackground }]}
        >
          <Icon name="search" size={13} color={colors.stone700} />
          <Text style={[webFont(10, 700), { color: colors.stone700 }]}>Büyüt</Text>
        </Pressable>
        {images.length > 1 ? (
          <>
            <Pressable
              onPress={() => goTo(activeIndex - 1)}
              accessibilityRole="button"
              accessibilityLabel="Önceki görsel"
              style={[styles.navCircle, styles.navPrev]}
            >
              <Icon name="chevron-back" size={18} color="#FFFFFF" />
            </Pressable>
            <Pressable
              onPress={() => goTo(activeIndex + 1)}
              accessibilityRole="button"
              accessibilityLabel="Sonraki görsel"
              style={[styles.navCircle, styles.navNext]}
            >
              <Icon name="chevron-forward" size={18} color="#FFFFFF" />
            </Pressable>
          </>
        ) : null}
      </View>

      {images.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
          {images.map((uri, i) => {
            const active = i === activeIndex;
            return (
              <Pressable
                key={`${uri}-thumb-${i}`}
                onPress={() => goTo(i)}
                accessibilityRole="button"
                accessibilityLabel={`Görsel ${i + 1}`}
                style={[styles.thumb, { borderColor: active ? colors.emerald500 : 'transparent' }]}
              >
                <CachedImage uri={uri} style={styles.thumbImage} recyclingKey={`${uri}-${i}`} />
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

function FullscreenGallery({
  visible,
  images,
  initialIndex,
  onClose,
}: {
  visible: boolean;
  images: string[];
  initialIndex: number;
  onClose: () => void;
}): React.JSX.Element {
  return (
    <Modal visible={visible} transparent={false} animationType="fade" onRequestClose={onClose}>
      {visible ? (
        <FullscreenGalleryBody
          key={initialIndex}
          images={images}
          initialIndex={initialIndex}
          onClose={onClose}
        />
      ) : null}
    </Modal>
  );
}

function FullscreenGalleryBody({
  images,
  initialIndex,
  onClose,
}: {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}): React.JSX.Element {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(initialIndex);

  return (
    <View style={styles.fullscreen}>
        <FlatList
          data={images}
          keyExtractor={(uri, i) => `${uri}-full-${i}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <CachedImage uri={item} style={{ width, flex: 1 }} contentFit="contain" placeholderColor="#000000" />
          )}
        />
        <View style={[styles.fullscreenCounter]}>
          <Text style={[webFont(11, 700), { color: '#FFFFFF' }]}>
            Görsel {index + 1} / {images.length}
          </Text>
        </View>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Kapat"
          style={styles.fullscreenClose}
        >
          <Icon name="close" size={22} color="#FFFFFF" />
        </Pressable>
    </View>
  );
}

// ── Tech specs accordion (§4.12) ────────────────────────────────────────────────────

function TechSpecsAccordion({
  groups,
  expanded,
  onToggle,
}: {
  groups: { categoryName: string; rows: { label: string; value: string }[] }[];
  expanded: Set<string>;
  onToggle: (name: string) => void;
}): React.JSX.Element {
  const { colors } = useTheme();
  const totalFields = groups.reduce((sum, g) => sum + g.rows.length, 0);

  return (
    <View style={[styles.techCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <View style={styles.techHeader}>
        <Text style={[webFont(10, 900), { color: colors.emerald600, letterSpacing: 0.4 }]}>
          TEKNİK PARAMETRE TABLOSU
        </Text>
        <Text style={[webFont(16, 900), { color: colors.stone900 }]}>
          Tüm Karşılaştırma Parametreleri
        </Text>
        <Text style={[webFont(11, 500), { color: colors.stone500 }]}>
          Karşılaştırma sayfası ve WordPress panelindeki teknik parametrelerle aynı {totalFields} alan.
        </Text>
      </View>
      {groups.map((group) => {
        const open = expanded.has(group.categoryName);
        return (
          <View key={group.categoryName} style={[styles.techGroup, { borderTopColor: colors.borderLight }]}>
            <Pressable
              onPress={() => onToggle(group.categoryName)}
              accessibilityRole="button"
              accessibilityLabel={group.categoryName}
              style={styles.techGroupHeader}
            >
              <Text style={[webFont(12, 800), styles.techGroupTitle, { color: colors.stone800 }]}>
                {group.categoryName} ({group.rows.length})
              </Text>
              <Icon name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.stone500} />
            </Pressable>
            {open ? (
              <View style={styles.techRows}>
                {group.rows.map((row) => (
                  <View key={row.label} style={[styles.techRow, { borderBottomColor: colors.borderLight }]}>
                    <Text style={[webFont(11, 600), styles.techRowLabel, { color: colors.stone500 }]}>
                      {row.label}
                    </Text>
                    <Text style={[webFont(12, 800), styles.techRowValue, { color: colors.stone850 }]}>
                      {row.value}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

// ── Colors card (§4.13) ─────────────────────────────────────────────────────────────

function ColorsCard({
  colors: carColors,
  selectedIndex,
  onSelect,
}: {
  colors: CarColor[];
  selectedIndex: number;
  onSelect: (i: number) => void;
}): React.JSX.Element {
  const { colors } = useTheme();
  const selected = carColors[selectedIndex] ?? carColors[0];
  return (
    <View style={[styles.plainCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <Text style={[webFont(10, 900), { color: colors.stone500, letterSpacing: 0.4 }]}>
        LANSMAN BOYA SEÇENEKLERİ
      </Text>
      <View style={styles.swatchRow}>
        {carColors.map((color, i) => {
          const active = i === selectedIndex;
          return (
            <Pressable
              key={`${color.name}-${i}`}
              onPress={() => onSelect(i)}
              accessibilityRole="button"
              accessibilityLabel={color.name}
              style={[
                styles.swatch,
                { backgroundColor: color.hex, borderColor: active ? colors.emerald500 : colors.border },
              ]}
            />
          );
        })}
      </View>
      {selected ? (
        <Text style={[webFont(11, 600), { color: colors.stone600 }]}>Seçilen: {selected.name}</Text>
      ) : null}
    </View>
  );
}

// ── Section header bar (accent) ──────────────────────────────────────────────────────

function SectionHeaderBar({
  accentColor,
  title,
  subtitle,
}: {
  accentColor: string;
  title: string;
  subtitle: string;
}): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeaderBar}>
      <View style={[styles.sectionAccent, { backgroundColor: accentColor }]} />
      <View style={styles.sectionHeaderText}>
        <Text style={[webFont(16, 900), { color: colors.stone900 }]}>{title}</Text>
        <Text style={[webFont(11, 500), { color: colors.stone500 }]}>{subtitle}</Text>
      </View>
    </View>
  );
}

// ── Similar car mini card (identityCompact 280-wide) ─────────────────────────────────

function SimilarCarCard({
  car,
  onOpen,
  onFavorite,
  isFavorite,
  brandLogos,
}: {
  car: import('../../models/car').CarSummary;
  onOpen: () => void;
  onFavorite: () => void;
  isFavorite: boolean;
  brandLogos: Record<string, string>;
}): React.JSX.Element {
  const { colors } = useTheme();
  const image = car.images?.find((u) => u.length > 0);
  return (
    <View style={[styles.simCard, shadows.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={displayTitle(car.brand, car.model)}>
        <CachedImage uri={image} style={styles.simImage} placeholderColor={colors.stone50} recyclingKey={car.id} />
      </Pressable>
      <View style={styles.simBody}>
        <View style={styles.simIdentityRow}>
          <CachedImage
            uri={brandLogos[car.brand]}
            style={styles.simBrandLogo}
            contentFit="contain"
            placeholderColor={colors.stone100}
          />
          <Text style={[webFont(9, 800), { color: colors.emerald700 }]}>{car.brand.toUpperCase()}</Text>
        </View>
        <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={displayTitle(car.brand, car.model)}>
          <Text style={[webFont(13, 900), { color: colors.stone900 }]} numberOfLines={2}>
            {displayTitle(car.brand, car.model)}
          </Text>
        </Pressable>
        <CarSpecDeck
          rangeKm={car.rangeKm}
          batteryKwh={car.batteryKwh}
          powerHp={car.powerHp}
          accelerationSec={car.accelerationSec}
        />
        <View style={styles.simActions}>
          <Pressable
            onPress={onOpen}
            accessibilityRole="button"
            accessibilityLabel="Detaylar"
            style={[styles.simDetailBtn, { backgroundColor: colors.stone100 }]}
          >
            <Text style={[webFont(10, 900), { color: colors.stone800 }]}>DETAYLAR</Text>
          </Pressable>
          <Pressable
            onPress={onFavorite}
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
            style={[styles.simFavBtn, { borderColor: colors.border }]}
          >
            <Icon
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={15}
              color={isFavorite ? '#F43F5E' : colors.stone500}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ── Host toast ───────────────────────────────────────────────────────────────────────

function DetailToast({ message, topInset }: { message: string; topInset: number }): React.JSX.Element {
  const { colors } = useTheme();
  const anim = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, [anim, message]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        shadows.toast,
        {
          top: topInset + 12,
          backgroundColor: colors.stone900,
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) },
          ],
        },
      ]}
    >
      <Icon name="check-circle" size={16} color={colors.emerald400} />
      <Text style={[webFont(12, 700), styles.toastText, { color: colors.pageBackground }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredText: {
    textAlign: 'center',
  },
  errorBlock: {
    alignItems: 'center',
    gap: 12,
    padding: 24,
  },
  retryButton: {
    borderRadius: radii.button,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  headerCard: {
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  headerIdentity: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  brandLogo: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  reportPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  gallery: {
    gap: 8,
  },
  counterChip: {
    position: 'absolute',
    top: 10,
    left: 10,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  expandChip: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  navCircle: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navPrev: {
    left: 10,
  },
  navNext: {
    right: 10,
  },
  thumbRow: {
    gap: 8,
    paddingVertical: 2,
  },
  thumb: {
    width: 72,
    height: 56,
    borderRadius: 10,
    borderWidth: 2,
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  plainCard: {
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  specDeckWrap: {
    // CarSpecDeck kendi konteynerini çizer; sarmalayıcı yalnızca boşluk için.
  },
  techCard: {
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  techHeader: {
    padding: 16,
    gap: 6,
  },
  techGroup: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  techGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  techGroupTitle: {
    flex: 1,
  },
  techRows: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  techRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  techRowLabel: {
    flex: 1,
  },
  techRowValue: {
    textAlign: 'right',
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
  },
  similarSection: {
    gap: 12,
  },
  sectionHeaderBar: {
    flexDirection: 'row',
    gap: 10,
  },
  sectionAccent: {
    width: 3,
    borderRadius: 2,
    alignSelf: 'stretch',
  },
  sectionHeaderText: {
    flex: 1,
    gap: 2,
  },
  similarRow: {
    gap: 12,
    paddingVertical: 2,
  },
  similarCard: {
    width: 280,
  },
  simCard: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  simImage: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  simBody: {
    padding: 14,
    gap: 10,
  },
  simIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  simBrandLogo: {
    width: 20,
    height: 20,
    borderRadius: 6,
  },
  simActions: {
    flexDirection: 'row',
    gap: 8,
  },
  simDetailBtn: {
    flex: 1,
    borderRadius: radii.button,
    paddingVertical: 10,
    alignItems: 'center',
  },
  simFavBtn: {
    width: 44,
    borderRadius: radii.button,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimer: {
    borderRadius: radii.button,
    padding: 14,
  },
  fullscreen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fullscreenCounter: {
    position: 'absolute',
    top: 48,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  fullscreenClose: {
    position: 'absolute',
    top: 48,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radii.inner,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  toastText: {
    flex: 1,
  },
});
