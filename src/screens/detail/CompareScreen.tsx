// CompareScreen — iOS CompareView (route `compare`, spec §5).
//
// İki mod: WIZARD (compareList boş) — CompareCarModelPicker + hızlı süzme + preset paketleri +
// Bilgi Akademisi + SSS; COMPARE (≥1 araç) — slot pickerlar, aksiyon şeridi, lider widget'ları,
// yalnızca-farklar toggle'ı, kritik/teknik tablolar (ComparisonBuilder.leader), SSS ve yorumlar
// (CompareCommentsSection, ≥2 araç). Store: compareList/addToCompare/removeFromCompare/clearCompare.
//
// Ekran prop ALMAZ; store'lardan okur (registry sözleşmesi). Kendi ScrollView'ı; ek alt padding yok.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { apiClient } from '../../api';
import type { BlogPost } from '../../models/blog';
import type { CarSummary } from '../../models/car';
import { ComparisonBuilder, type ComparisonRow } from '../../utils/comparisonBuilder';
import { containsCaseInsensitiveTr } from '../../utils/turkishText';
import { useNavigationStore } from '../../stores';
import { COMPARE_LIMIT } from '../../stores/navigationStore';
import { radii, useTheme, webFont } from '../../theme';
import {
  BlogPostCard,
  CachedImage,
  CarCatalogCard,
  CompareCarModelPicker,
  CompareCommentsSection,
  Icon,
  ShareMetaPillButton,
  WebSectionHeader,
  share,
  type IconName,
} from '../../components';
import { compareShareURL, copyToClipboard } from './compareShare';

const COMMENTS_ANCHOR = 'compare-comments-section';

/** Swift CarSummary.displayTitle. */
function displayTitle(car: CarSummary): string {
  return car.model.toLowerCase().startsWith(car.brand.toLowerCase())
    ? car.model
    : `${car.brand} ${car.model}`;
}

const technicalExtraRows: ComparisonRow[] = [
  { label: 'Kasa', value: (c) => c.bodyType ?? null, lowerIsBetter: false },
  { label: 'Çekiş', value: (c) => c.driveType ?? null, lowerIsBetter: false },
  { label: 'Segment', value: (c) => c.segment ?? null, lowerIsBetter: false },
];

export function CompareScreen(): React.JSX.Element {
  const { colors } = useTheme();

  const compareList = useNavigationStore((s) => s.compareList);
  const catalogCars = useNavigationStore((s) => s.catalogCars);
  const cachedBlogs = useNavigationStore((s) => s.cachedBlogs);
  const addToCompare = useNavigationStore((s) => s.addToCompare);
  const removeFromCompare = useNavigationStore((s) => s.removeFromCompare);
  const clearCompare = useNavigationStore((s) => s.clearCompare);
  const navigate = useNavigationStore((s) => s.navigate);
  const openBlogDetail = useNavigationStore((s) => s.openBlogDetail);

  const [blogPosts, setBlogPosts] = useState<BlogPost[]>(cachedBlogs);
  const [onlyDifferences, setOnlyDifferences] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const commentsY = useRef(0);
  const prevCount = useRef(compareList.length);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  // Bloglar bir kez yüklenir (wizard "Bilgi Akademisi"); önbellek varsa onu kullan.
  useEffect(() => {
    if (cachedBlogs.length > 0) return;
    let active = true;
    void (async () => {
      try {
        const blogs = await apiClient.fetchBlogs();
        if (active) setBlogPosts(blogs);
      } catch {
        /* sessiz */
      }
    })();
    return () => {
      active = false;
    };
  }, [cachedBlogs]);

  // count ≥2 olunca en üste kaydır (iOS onChange compare-top). Basitçe başa kaydır.
  useEffect(() => {
    if (compareList.length >= 2 && prevCount.current < 2) {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
    prevCount.current = compareList.length;
  }, [compareList.length]);

  const shareURL = useMemo(
    () => compareShareURL(compareList.map((c) => c.id)),
    [compareList],
  );
  const carLabels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of compareList) map[c.id] = displayTitle(c);
    return map;
  }, [compareList]);

  const handleShareLink = useCallback(() => {
    if (!shareURL) return;
    void share({ title: 'Elektrikli Araç Karşılaştırması', url: shareURL });
  }, [shareURL]);

  const handleCopyLink = useCallback(() => {
    if (!shareURL) return;
    void (async () => {
      const copied = await copyToClipboard(shareURL);
      if (copied) showToast('Karşılaştırma linki panoya kopyalandı.');
      else void share({ title: 'Karşılaştırma linki', url: shareURL });
    })();
  }, [shareURL, showToast]);

  const handleOpenPDF = useCallback(() => {
    if (!shareURL) return;
    void Linking.openURL(shareURL);
  }, [shareURL]);

  const scrollToComments = useCallback(() => {
    scrollRef.current?.scrollTo({ y: Math.max(0, commentsY.current - 12), animated: true });
  }, []);

  const isWizard = compareList.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.pageBackground }}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isWizard ? (
          <WizardMode
            catalogCars={catalogCars}
            blogPosts={blogPosts}
            onAdd={addToCompare}
            onApplyPreset={(ids) => {
              clearCompare();
              for (const id of ids) {
                const match = catalogCars.find((c) => c.id === id);
                if (match) addToCompare(match);
              }
            }}
            onOpenBlog={openBlogDetail}
            onOpenBlogArchive={() => navigate('blog')}
          />
        ) : (
          <CompareMode
            compareList={compareList}
            catalogCars={catalogCars}
            carLabels={carLabels}
            onlyDifferences={onlyDifferences}
            onToggleDifferences={setOnlyDifferences}
            onRemove={removeFromCompare}
            onAdd={addToCompare}
            onClear={clearCompare}
            onScrollToComments={scrollToComments}
            onShareLink={handleShareLink}
            onCopyLink={handleCopyLink}
            onOpenPDF={handleOpenPDF}
            hasShareURL={shareURL != null}
            onCommentsLayout={(y) => {
              commentsY.current = y;
            }}
            onOpenCompare={() => navigate('compare')}
          />
        )}
      </ScrollView>

      {toast ? (
        <View style={[styles.toast, { backgroundColor: colors.stone900 }]} pointerEvents="none">
          <Text style={[webFont(12, 700), { color: colors.pageBackground }]}>{toast}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ── Wizard mode (compareList boş) ────────────────────────────────────────────────────

function WizardMode({
  catalogCars,
  blogPosts,
  onAdd,
  onApplyPreset,
  onOpenBlog,
  onOpenBlogArchive,
}: {
  catalogCars: CarSummary[];
  blogPosts: BlogPost[];
  onAdd: (car: CarSummary) => void;
  onApplyPreset: (ids: string[]) => void;
  onOpenBlog: (slug: string) => void;
  onOpenBlogArchive: () => void;
}): React.JSX.Element {
  const { colors } = useTheme();
  const [term, setTerm] = useState('');
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const matches = useMemo(() => {
    const q = term.trim();
    if (q.length === 0) return [];
    return catalogCars
      .filter(
        (c) => containsCaseInsensitiveTr(c.brand, q) || containsCaseInsensitiveTr(c.model, q),
      )
      .slice(0, 6);
  }, [catalogCars, term]);

  return (
    <>
      <WebSectionHeader
        badge="Karşılaştırma"
        title="Elektrikli Araç Karşılaştırma"
        subtitle="En fazla 3 modeli yan yana teknik verilerle inceleyin."
      />

      {/* Wizard card 1 — kademeli seçici */}
      <WizardCard icon="compare" title="İLK ARACI SEÇİN" subtitle="Marka, kasa tipi ve model adımlarıyla karşılaştırmaya başlayın">
        <CompareCarModelPicker cars={catalogCars} onSelect={onAdd} />
      </WizardCard>

      {/* Wizard card 2 — hızlı süzme */}
      <WizardCard icon="compare" title="MODELLERİ SÜZÜP KARŞILAŞTIRIN" subtitle="Katalogdan araç ismi yazarak hızlıca karşılaştırma tablosuna yansıtın">
        <TextInput
          value={term}
          onChangeText={setTerm}
          placeholder="Marka veya model ismi yazın..."
          placeholderTextColor={colors.stone400}
          autoCapitalize="none"
          style={[styles.searchInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.stone900 }]}
        />
        {matches.map((car) => {
          const image = car.images?.find((u) => u.length > 0);
          return (
            <View key={car.id} style={[styles.matchRow, { borderColor: colors.border }]}>
              <CachedImage uri={image} style={styles.matchThumb} placeholderColor={colors.stone100} recyclingKey={car.id} />
              <View style={styles.matchText}>
                <Text style={[webFont(9, 900), { color: colors.emerald600 }]}>{car.brand.toUpperCase()}</Text>
                <Text style={[webFont(13, 700), { color: colors.stone900 }]} numberOfLines={1}>
                  {car.model}
                </Text>
              </View>
              <Pressable
                onPress={() => onAdd(car)}
                accessibilityRole="button"
                accessibilityLabel="Karşılaştır"
                style={[styles.matchButton, { backgroundColor: colors.emerald600 }]}
              >
                <Text style={[webFont(10, 900), { color: '#FFFFFF' }]}>KARŞILAŞTIR</Text>
              </Pressable>
            </View>
          );
        })}
      </WizardCard>

      {/* Preset packages */}
      <View style={styles.presetHeader}>
        <Text style={[webFont(18, 900), styles.centerText, { color: colors.stone900 }]}>
          Hızlı Karşılaştırma Paketleri
        </Text>
        <Text style={[webFont(12, 500), styles.centerText, { color: colors.stone500 }]}>
          Editörlerimizin derlediği popüler karşılaştırma grupları
        </Text>
      </View>
      {ComparisonBuilder.presets.map((preset) => (
        <Pressable
          key={preset.id}
          onPress={() => onApplyPreset(preset.ids)}
          accessibilityRole="button"
          accessibilityLabel={preset.name}
          style={[styles.presetCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
        >
          <View style={styles.presetTop}>
            <Text style={styles.presetEmoji}>{preset.icon}</Text>
            <View style={[styles.presetBadge, { backgroundColor: colors.emerald50 }]}>
              <Text style={[webFont(9, 900), { color: colors.emerald700 }]}>{preset.badge.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={[webFont(15, 900), { color: colors.stone900 }]}>{preset.name}</Text>
          <Text style={[webFont(12, 500), { color: colors.stone500 }]}>{preset.desc}</Text>
          <View style={styles.presetFooter}>
            <Text style={[webFont(10, 900), { color: colors.emerald600, letterSpacing: 0.4 }]}>
              KARŞILAŞTIRMAYI YÜKLE
            </Text>
            <Icon name="arrow-forward" size={13} color={colors.emerald600} />
          </View>
        </Pressable>
      ))}

      {/* Bilgi Akademisi */}
      {blogPosts.length > 0 ? (
        <WizardCard icon="book" title="BİLGİ AKADEMİSİ" subtitle="Karşılaştırmadan Önce Okumanız Gerekenler" onRightPress={onOpenBlogArchive} rightLabel="TÜM REHBERLER">
          <View style={styles.academyList}>
            {blogPosts.slice(0, 3).map((blog) => (
              <BlogPostCard key={blog.id} blog={blog} layout="sidebar" onPress={() => onOpenBlog(blog.id)} />
            ))}
          </View>
        </WizardCard>
      ) : null}

      {/* FAQ */}
      <WizardCard icon="info" title="SIKÇA SORULAN SORULAR" subtitle="S.S.S.">
        {ComparisonBuilder.faqItems.map((item, i) => {
          const open = faqOpen === i;
          return (
            <View key={item.question} style={[styles.faqRow, { borderColor: colors.border }]}>
              <Pressable
                onPress={() => setFaqOpen(open ? null : i)}
                accessibilityRole="button"
                accessibilityLabel={item.question}
                style={styles.faqHeader}
              >
                <Text style={[webFont(12, 700), styles.faqQuestion, { color: colors.stone800 }]}>
                  {item.question}
                </Text>
                <Icon name={open ? 'chevron-up' : 'chevron-down'} size={15} color={colors.stone500} />
              </Pressable>
              {open ? (
                <Text style={[webFont(12, 500), styles.faqAnswer, { color: colors.stone600 }]}>
                  {item.answer}
                </Text>
              ) : null}
            </View>
          );
        })}
      </WizardCard>
    </>
  );
}

function WizardCard({
  icon,
  title,
  subtitle,
  rightLabel,
  onRightPress,
  children,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  rightLabel?: string;
  onRightPress?: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={[styles.wizardCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <View style={styles.wizardHeader}>
        <View style={[styles.wizardIcon, { backgroundColor: colors.emerald50 }]}>
          <Icon name={icon} size={16} color={colors.emerald600} />
        </View>
        <View style={styles.wizardHeaderText}>
          <Text style={[webFont(13, 900), { color: colors.stone900 }]}>{title}</Text>
          <Text style={[webFont(11, 500), { color: colors.stone500 }]}>{subtitle}</Text>
        </View>
        {rightLabel && onRightPress ? (
          <Pressable onPress={onRightPress} accessibilityRole="button" accessibilityLabel={rightLabel}>
            <Text style={[webFont(9, 900), { color: colors.emerald600, letterSpacing: 0.4 }]}>{rightLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

// ── Compare mode (≥1 araç) ───────────────────────────────────────────────────────────

function CompareMode({
  compareList,
  catalogCars,
  carLabels,
  onlyDifferences,
  onToggleDifferences,
  onRemove,
  onAdd,
  onClear,
  onScrollToComments,
  onShareLink,
  onCopyLink,
  onOpenPDF,
  hasShareURL,
  onCommentsLayout,
  onOpenCompare,
}: {
  compareList: CarSummary[];
  catalogCars: CarSummary[];
  carLabels: Record<string, string>;
  onlyDifferences: boolean;
  onToggleDifferences: (v: boolean) => void;
  onRemove: (id: string) => void;
  onAdd: (car: CarSummary) => void;
  onClear: () => void;
  onScrollToComments: () => void;
  onShareLink: () => void;
  onCopyLink: () => void;
  onOpenPDF: () => void;
  hasShareURL: boolean;
  onCommentsLayout: (y: number) => void;
  onOpenCompare: () => void;
}): React.JSX.Element {
  const { colors } = useTheme();
  const enough = compareList.length >= 2;

  const title = useMemo(() => {
    if (compareList.length < 2) return 'Elektrikli Araç Karşılaştırma';
    return `${compareList.map(displayTitle).join(' vs ')} Karşılaştırması`;
  }, [compareList]);

  const subtitle = useMemo(() => {
    if (compareList.length < 2) return 'En fazla 3 modeli yan yana teknik verilerle inceleyin.';
    return `${compareList.map(displayTitle).join(', ')} modellerinin menzil, şarj hızı ve teknik özelliklerini yan yana karşılaştırın.`;
  }, [compareList]);

  const criticalRows = onlyDifferences
    ? ComparisonBuilder.criticalRows.filter((r) => rowHasDifference(r, compareList))
    : ComparisonBuilder.criticalRows;
  const technicalRows = [...ComparisonBuilder.criticalRows, ...technicalExtraRows];
  const filteredTechnical = onlyDifferences
    ? technicalRows.filter((r) => rowHasDifference(r, compareList))
    : technicalRows;

  const excludeIds = compareList.map((c) => c.id);

  return (
    <>
      {enough ? (
        <View style={styles.headerBlock}>
          <Text style={[webFont(10, 900), { color: colors.red600, letterSpacing: 0.4 }]}>
            MÜHENDİSLİK ANALİZ MERKEZİ
          </Text>
          <Text style={[webFont(22, 900), { color: colors.stone900 }]}>{title}</Text>
          <Text style={[webFont(12, 500), { color: colors.stone500 }]}>{subtitle}</Text>
        </View>
      ) : (
        <View style={styles.headerBlock}>
          <Text style={[webFont(22, 900), { color: colors.stone900 }]}>{title}</Text>
          <Text style={[webFont(12, 500), { color: colors.stone500 }]}>{subtitle}</Text>
        </View>
      )}

      {/* Slot pickers */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.slotRow}>
        {Array.from({ length: COMPARE_LIMIT }).map((_, index) => {
          const car = compareList[index];
          if (car) {
            return (
              <View key={car.id} style={styles.slot}>
                <View style={styles.slotCardWrap}>
                  <CarCatalogCard
                    car={car}
                    layout="grid"
                    identityCompact
                    showsFavoriteButton={false}
                    isComparing
                    isFavorite={false}
                    isInGarage={false}
                    onDetail={() => useNavigationStore.getState().openCarDetail(car.id)}
                    onCompare={() => onRemove(car.id)}
                    onToggleFavorite={() => undefined}
                    onToggleGarage={() => undefined}
                    onBrandTap={() => useNavigationStore.getState().navigate('brands')}
                  />
                  <Pressable
                    onPress={() => onRemove(car.id)}
                    accessibilityRole="button"
                    accessibilityLabel="Çıkar"
                    style={[styles.trashButton, { backgroundColor: colors.red600 }]}
                  >
                    <Icon name="close" size={16} color="#FFFFFF" />
                  </Pressable>
                </View>
              </View>
            );
          }
          return (
            <View key={`empty-${index}`} style={styles.slot}>
              <AddSlot cars={catalogCars} excludeIds={excludeIds} onAdd={onAdd} />
            </View>
          );
        })}
      </ScrollView>

      {enough ? (
        <>
          {/* Action bar */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionRow}>
            <ActionChip icon="compare" label="Karşılaştırma Yorumu Yap" color={colors.emerald600} onPress={onScrollToComments} />
            {hasShareURL ? <ShareMetaPillButton title="Linki Paylaş" icon="share" onPress={onShareLink} /> : null}
            {hasShareURL ? <ActionChip icon="list" label="Linki Kopyala" color={colors.stone700} onPress={onCopyLink} /> : null}
            {hasShareURL ? <ActionChip icon="printer" label="PDF Özet (Web)" color={colors.stone700} onPress={onOpenPDF} /> : null}
            <ActionChip icon="close" label="Listeyi Boşalt" color={colors.red600} onPress={onClear} />
          </ScrollView>

          {/* Leader widgets */}
          <LeaderWidgets compareList={compareList} />

          {/* Only-differences toggle */}
          <View style={[styles.toggleRow, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[webFont(12, 700), { color: colors.stone800 }]}>Yalnızca Farkları Göster</Text>
            <Switch
              value={onlyDifferences}
              onValueChange={onToggleDifferences}
              trackColor={{ true: colors.emerald600, false: colors.stone300 }}
            />
          </View>

          {/* Critical comparison table */}
          <ComparisonTable
            heading="KRİTİK KARŞILAŞTIRMA ÖZETİ"
            rows={criticalRows}
            compareList={compareList}
            allFiltered={onlyDifferences && criticalRows.length === 0}
          />

          {/* Technical matrix */}
          <ComparisonTable
            heading="TEKNİK MATRİS"
            rows={filteredTechnical}
            compareList={compareList}
            allFiltered={onlyDifferences && filteredTechnical.length === 0}
          />

          {/* FAQ static */}
          <View style={[styles.faqStatic, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[webFont(10, 900), { color: colors.emerald600, letterSpacing: 0.4 }]}>SIK SORULAN</Text>
            {ComparisonBuilder.faqItems.map((item) => (
              <View key={item.question} style={styles.faqStaticItem}>
                <Text style={[webFont(12, 800), { color: colors.stone800 }]}>{item.question}</Text>
                <Text style={[webFont(12, 500), { color: colors.stone600 }]}>{item.answer}</Text>
              </View>
            ))}
          </View>

          {/* Comments */}
          <View
            onLayout={(e) => onCommentsLayout(e.nativeEvent.layout.y)}
            accessibilityLabel={COMMENTS_ANCHOR}
          >
            <CompareCommentsSection carIds={compareList.map((c) => c.id)} carLabels={carLabels} />
          </View>
        </>
      ) : (
        <Pressable
          onPress={onOpenCompare}
          accessibilityRole="button"
          accessibilityLabel="Karşılaştırmaya devam et"
          style={[styles.singleHint, { backgroundColor: colors.emerald50, borderColor: colors.emerald100 }]}
        >
          <Text style={[webFont(12, 700), { color: colors.emerald700 }]}>
            Karşılaştırmak için en az bir araç daha ekleyin.
          </Text>
        </Pressable>
      )}
    </>
  );
}

function AddSlot({
  cars,
  excludeIds,
  onAdd,
}: {
  cars: CarSummary[];
  excludeIds: string[];
  onAdd: (car: CarSummary) => void;
}): React.JSX.Element {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={[styles.emptySlot, { borderColor: colors.border, backgroundColor: colors.stone50 }]}>
      {open ? (
        <View style={styles.addSlotPicker}>
          <CompareCarModelPicker
            cars={cars}
            excludeIds={excludeIds}
            onSelect={(car) => {
              onAdd(car);
              setOpen(false);
            }}
          />
        </View>
      ) : (
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Araç Ekle"
          style={styles.emptySlotInner}
        >
          <Icon name="compare" size={24} color={colors.stone400} />
          <Text style={[webFont(13, 800), { color: colors.stone700 }]}>Araç Ekle</Text>
          <Text style={[webFont(10, 500), { color: colors.stone400 }]}>Marka · kasa · model</Text>
        </Pressable>
      )}
    </View>
  );
}

function ActionChip({
  icon,
  label,
  color,
  onPress,
}: {
  icon: IconName;
  label: string;
  color: string;
  onPress: () => void;
}): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.actionChip, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
    >
      <Icon name={icon} size={14} color={color} />
      <Text style={[webFont(11, 700), { color }]}>{label}</Text>
    </Pressable>
  );
}

function LeaderWidgets({ compareList }: { compareList: CarSummary[] }): React.JSX.Element {
  const { colors } = useTheme();

  const costLeader = minBy(compareList, (c) => c.priceTL ?? Number.POSITIVE_INFINITY);
  const rangeLeader = maxBy(compareList, (c) => c.rangeKm ?? Number.NEGATIVE_INFINITY);
  const powerLeader = maxBy(compareList, (c) => c.powerHp ?? Number.NEGATIVE_INFINITY);

  const widgets = [
    {
      label: 'Maliyet Lideri',
      icon: 'gauge' as IconName,
      tint: colors.emerald50,
      value: costLeader && costLeader.priceTL != null ? ComparisonBuilder.priceDisplay(costLeader) : '—',
      name: costLeader ? displayTitle(costLeader) : '—',
    },
    {
      label: 'Menzil Lideri',
      icon: 'location' as IconName,
      tint: colors.sky50,
      value: rangeLeader && rangeLeader.rangeKm != null ? `${rangeLeader.rangeKm} km` : '—',
      name: rangeLeader ? displayTitle(rangeLeader) : '—',
    },
    {
      label: 'Performans Lideri',
      icon: 'bolt' as IconName,
      tint: colors.amber50,
      value: powerLeader && powerLeader.powerHp != null ? `${powerLeader.powerHp} HP` : '—',
      name: powerLeader ? displayTitle(powerLeader) : '—',
    },
  ];

  return (
    <View style={styles.leaderBlock}>
      <View style={styles.leaderHeaderRow}>
        <Icon name="sparkles" size={15} color={colors.emerald600} />
        <Text style={[webFont(12, 900), { color: colors.stone900 }]}>Analiz Raporu & Lider Ödülleri</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.leaderRow}>
        {widgets.map((w) => (
          <View key={w.label} style={[styles.leaderCard, { backgroundColor: w.tint, borderColor: colors.border }]}>
            <Icon name={w.icon} size={16} color={colors.emerald700} />
            <Text style={[webFont(9, 800), { color: colors.stone500, letterSpacing: 0.4 }]}>{w.label.toUpperCase()}</Text>
            <Text style={[webFont(16, 900), { color: colors.stone900 }]}>{w.value}</Text>
            <Text style={[webFont(10, 500), { color: colors.stone500 }]} numberOfLines={1}>{w.name}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function ComparisonTable({
  heading,
  rows,
  compareList,
  allFiltered,
}: {
  heading: string;
  rows: ComparisonRow[];
  compareList: CarSummary[];
  allFiltered: boolean;
}): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={styles.tableBlock}>
      <Text style={[webFont(10, 900), { color: colors.stone500, letterSpacing: 0.4 }]}>{heading}</Text>
      <View style={[styles.table, { borderColor: colors.border }]}>
        {allFiltered ? (
          <Text style={[webFont(12, 600), styles.allSame, { color: colors.stone500 }]}>Tüm değerler aynı.</Text>
        ) : (
          rows.map((row) => {
            const leaderId = ComparisonBuilder.leader(compareList, row.value, row.lowerIsBetter);
            return (
              <View key={row.label} style={[styles.tableRow, { borderBottomColor: colors.borderLight }]}>
                <Text style={[webFont(9, 800), styles.tableLabel, { color: colors.stone500 }]}>
                  {row.label.toUpperCase()}
                </Text>
                {compareList.map((car) => {
                  const value = row.value(car) ?? '—';
                  const isLeader = leaderId === car.id;
                  return (
                    <Text
                      key={car.id}
                      style={[
                        webFont(11, isLeader ? 900 : 600),
                        styles.tableValue,
                        { color: isLeader ? colors.emerald700 : colors.stone800 },
                      ]}
                      numberOfLines={1}
                    >
                      {isLeader ? `👑 ${value}` : value}
                    </Text>
                  );
                })}
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

// ── Yardımcılar ────────────────────────────────────────────────────────────────────

/** Bir satırda araçların değerleri farklıysa true (yalnızca-farklar filtresi). */
function rowHasDifference(row: ComparisonRow, cars: CarSummary[]): boolean {
  const values = cars.map((c) => row.value(c) ?? '—');
  return new Set(values).size > 1;
}

function minBy<T>(items: T[], score: (item: T) => number): T | null {
  if (items.length === 0) return null;
  let best = items[0];
  let bestScore = score(best);
  for (const item of items) {
    const s = score(item);
    if (s < bestScore) {
      bestScore = s;
      best = item;
    }
  }
  return best;
}

function maxBy<T>(items: T[], score: (item: T) => number): T | null {
  if (items.length === 0) return null;
  let best = items[0];
  let bestScore = score(best);
  for (const item of items) {
    const s = score(item);
    if (s > bestScore) {
      bestScore = s;
      best = item;
    }
  }
  return best;
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16,
  },
  toast: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    borderRadius: radii.inner,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  wizardCard: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  wizardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wizardIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wizardHeaderText: {
    flex: 1,
    gap: 2,
  },
  searchInput: {
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 8,
  },
  matchThumb: {
    width: 40,
    height: 32,
    borderRadius: 8,
  },
  matchText: {
    flex: 1,
    gap: 1,
  },
  matchButton: {
    borderRadius: radii.button,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  presetHeader: {
    gap: 4,
  },
  centerText: {
    textAlign: 'center',
  },
  presetCard: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 8,
  },
  presetTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  presetEmoji: {
    fontSize: 28,
  },
  presetBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  presetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  academyList: {
    gap: 12,
  },
  faqRow: {
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 8,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  faqQuestion: {
    flex: 1,
  },
  faqAnswer: {
    lineHeight: 18,
  },
  headerBlock: {
    gap: 6,
  },
  slotRow: {
    gap: 12,
    paddingVertical: 2,
  },
  slot: {
    width: 280,
  },
  slotCardWrap: {
    position: 'relative',
  },
  trashButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySlot: {
    minHeight: 420,
    borderRadius: radii.card,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  emptySlotInner: {
    alignItems: 'center',
    gap: 8,
  },
  addSlotPicker: {
    width: '100%',
  },
  actionRow: {
    gap: 8,
    paddingVertical: 2,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radii.button,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  leaderBlock: {
    gap: 10,
  },
  leaderHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  leaderRow: {
    gap: 10,
    paddingVertical: 2,
  },
  leaderCard: {
    width: 150,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 4,
  },
  tableBlock: {
    gap: 8,
  },
  table: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  tableLabel: {
    width: 84,
  },
  tableValue: {
    flex: 1,
    textAlign: 'center',
  },
  allSame: {
    padding: 16,
    textAlign: 'center',
  },
  faqStatic: {
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  faqStaticItem: {
    gap: 4,
  },
  singleHint: {
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    alignItems: 'center',
  },
});
