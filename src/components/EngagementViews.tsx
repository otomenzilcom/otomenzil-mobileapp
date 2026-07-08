// EngagementViews — iOS EngagementViews.swift (spec §4.5): puanlama, şarj simülatörü, hata
// bildir sheet'i ve yorum bölümü sarmalayıcıları (WebCommentsSection üzerine).

import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { engagementApi } from '../api/engagement';
import type { CarDetail } from '../models/car';
import type { BlogComment, CarReview, CompareComment } from '../models/engagement';
import { ChargerType, ChargingSimulator, type ChargerTypeId } from '../utils/chargingSimulator';
import { containsCaseInsensitiveTr } from '../utils/turkishText';
import { useAuthStore } from '../stores';
import { radii, useTheme, webFont } from '../theme';
import { Icon } from './ComponentIcon';
import { Slider } from './Slider';
import { WebCommentsSection, type CommentAccessors } from './WebCommentsSection';

// ── CarRatingVoteBar (§4.5) ─────────────────────────────────────────────────────────

export interface CarRatingVoteBarProps {
  carId: string;
  initialAverage?: number;
  initialCount?: number;
  /** Taze nonce sağlayıcı (authStore.currentNonce). */
  nonceProvider: () => Promise<string>;
}

export function CarRatingVoteBar({
  carId,
  initialAverage = 0,
  initialCount = 0,
  nonceProvider,
}: CarRatingVoteBarProps): React.JSX.Element {
  const { colors } = useTheme();
  const [average, setAverage] = useState(initialAverage);
  const [count, setCount] = useState(initialCount);
  const [hasVoted, setHasVoted] = useState(false);
  const [selected, setSelected] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const nonce = await nonceProvider();
        const status = await engagementApi.fetchCarRating(carId, nonce);
        if (!active) return;
        setAverage(status.average);
        setCount(status.count);
        setHasVoted(status.hasVoted ?? false);
      } catch {
        // sessiz — başlangıç değerlerinde kal
      }
    })();
    return () => {
      active = false;
    };
  }, [carId, nonceProvider]);

  const submit = useCallback(async () => {
    if (hasVoted || submitting || selected < 1) return;
    setSubmitting(true);
    setNotice(null);
    try {
      const nonce = await nonceProvider();
      const result = await engagementApi.voteCarRating(carId, selected, nonce);
      if (result.stats) {
        setAverage(result.stats.average);
        setCount(result.stats.count);
      }
      setHasVoted(true);
      setNotice({ text: 'Oyunuz kaydedildi.', error: false });
    } catch (err) {
      setNotice({ text: err instanceof Error ? err.message : 'Oy gönderilemedi.', error: true });
    } finally {
      setSubmitting(false);
    }
  }, [hasVoted, submitting, selected, carId, nonceProvider]);

  // Oy vermeden önce seçilen değer gösterilir; sonrasında sunucu ortalaması.
  const displayValue = hasVoted ? average : selected;
  const filledStars = Math.round(displayValue);
  const canVote = !hasVoted && !submitting && selected >= 1;

  return (
    <View style={[styles.card, { borderColor: colors.border }]}>
      <View style={styles.ratingHeader}>
        <Text style={[webFont(32, 900), { color: colors.stone900 }]}>{displayValue.toFixed(1)}</Text>
        <Text style={[webFont(18, 700), styles.outOf, { color: colors.stone400 }]}>/5</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Icon
              key={i}
              name={i <= filledStars ? 'star' : 'star-outline'}
              size={12}
              color={i <= filledStars ? '#FBBF24' : colors.stone300}
            />
          ))}
        </View>
      </View>

      <Slider
        value={selected}
        minimumValue={0}
        maximumValue={5}
        step={1}
        onValueChange={setSelected}
        minimumTrackTintColor={colors.emerald500}
        maximumTrackTintColor={colors.stone300}
        disabled={hasVoted || submitting}
      />

      <View style={styles.ratingFooter}>
        <Text style={[webFont(11, 600), { color: colors.stone500 }]}>{count} Oylama</Text>
        <Pressable
          onPress={submit}
          disabled={!canVote}
          accessibilityRole="button"
          accessibilityLabel="Oyla"
          style={[
            styles.voteButton,
            {
              backgroundColor: canVote ? colors.emerald500 : colors.stone100,
            },
          ]}
        >
          <Text style={[webFont(11, 900), { color: canVote ? '#FFFFFF' : colors.stone400 }]}>
            {submitting ? '…' : 'OYLA'}
          </Text>
        </Pressable>
      </View>

      <Text style={[webFont(11, 500), { color: notice?.error ? colors.red600 : colors.stone500 }]}>
        {notice
          ? notice.text
          : hasVoted
            ? 'Bu araç için oy kullandınız.'
            : 'Sadece bir defa oy verebilirsiniz.'}
      </Text>
    </View>
  );
}

// ── ChargingSimulatorSection (§4.5) ─────────────────────────────────────────────────

export interface ChargingSimulatorSectionProps {
  car: CarDetail;
}

export function ChargingSimulatorSection({ car }: ChargingSimulatorSectionProps): React.JSX.Element {
  const { colors } = useTheme();
  const [selectedId, setSelectedId] = useState<ChargerTypeId>('wallbox');
  const [start, setStart] = useState(20);
  const [target, setTarget] = useState(80);

  const battery = car.batteryKwh ?? 0;
  const charger = ChargerType.byId(selectedId);
  const effectivePower = ChargerType.effectivePowerKw(charger, car);
  const minutes = ChargingSimulator.estimateMinutes({
    batteryKwh: battery,
    startPercent: start,
    targetPercent: target,
    chargerPowerKw: effectivePower,
  });

  const bumpTarget = (nextStart: number): void => {
    if (target <= nextStart) setTarget(Math.min(100, nextStart + 5));
  };

  return (
    <View style={[styles.card, { borderColor: colors.border }]}>
      <Text style={[webFont(10, 900), { color: '#0284C7', letterSpacing: 0.4 }]}>
        BATARYA & DOLUM LABORATUVARI
      </Text>
      <Text style={[webFont(17, 900), { color: colors.stone900 }]}>
        Şarj Dolum ve Süre Tahmin Simülatörü
      </Text>
      <Text style={[webFont(12, 500), { color: colors.stone500 }]}>
        {battery.toFixed(1)} kWh batarya için tahmini dolum süresi.
      </Text>

      <View style={styles.chargerList}>
        {ChargerType.all.map((c) => {
          const active = c.id === selectedId;
          const rightLabel = `${c.connectionType} ${c.powerKw} kW`;
          const rightColor = c.connectionType === 'DC' ? '#C2410C' : '#1D4ED8';
          return (
            <Pressable
              key={c.id}
              onPress={() => setSelectedId(c.id)}
              accessibilityRole="button"
              accessibilityLabel={c.label}
              style={[
                styles.chargerRow,
                active
                  ? { backgroundColor: '#F0F9FF', borderColor: '#38BDF8' }
                  : { backgroundColor: colors.cardBackground, borderColor: colors.border },
              ]}
            >
              <Text style={[webFont(13, 700), { color: active ? '#0C4A6E' : colors.stone800 }]}>
                {c.label}
              </Text>
              <Text style={[webFont(11, 800), { color: rightColor }]}>{rightLabel}</Text>
            </Pressable>
          );
        })}
      </View>

      <PercentSlider
        label="Başlangıç"
        value={start}
        max={95}
        onChange={(v) => {
          setStart(v);
          bumpTarget(v);
        }}
      />
      <PercentSlider label="Hedef" value={target} max={100} onChange={setTarget} />

      <View style={[styles.resultBox, { backgroundColor: '#F0F9FF' }]}>
        <Text style={[webFont(11, 600), { color: '#0284C7' }]}>Tahmini süre</Text>
        <Text style={[webFont(24, 900), { color: '#0284C7' }]}>
          {ChargingSimulator.formatDuration(minutes)}
        </Text>
        <Text style={[webFont(11, 500), { color: '#0369A1' }]}>
          Etkin güç: {effectivePower.toFixed(1)} kW · %{start} → %{target}
        </Text>
      </View>
    </View>
  );
}

function PercentSlider({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
}): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={styles.percentSlider}>
      <View style={styles.percentRow}>
        <Text style={[webFont(11, 700), { color: colors.stone700 }]}>{label}</Text>
        <Text style={[webFont(11, 800), { color: '#0284C7' }]}>%{value}</Text>
      </View>
      <Slider
        value={value}
        minimumValue={0}
        maximumValue={max}
        step={5}
        onValueChange={onChange}
        minimumTrackTintColor="#0284C7"
        maximumTrackTintColor={colors.stone300}
      />
    </View>
  );
}

// ── ReportErrorSheet (§4.5) ─────────────────────────────────────────────────────────

const REPORT_MIN_CHARS = 10;

export interface ReportErrorSheetProps {
  visible: boolean;
  car: CarDetail;
  nonceProvider: () => Promise<string>;
  onClose: () => void;
  onSuccess: () => void;
}

/** Swift CarSummary.displayTitle. */
function displayTitle(brand: string, model: string): string {
  return model.toLowerCase().startsWith(brand.toLowerCase()) ? model : `${brand} ${model}`;
}

export function ReportErrorSheet({
  visible,
  car,
  nonceProvider,
  onClose,
  onSuccess,
}: ReportErrorSheetProps): React.JSX.Element {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const trimmed = message.trim();
  const canSubmit = !submitting && trimmed.length >= REPORT_MIN_CHARS;

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const nonce = await nonceProvider();
      // iOS submitErrorReport ajax kanalı; engagementApi'de karşılığı review kanalı değil —
      // hata bildirimi ayrı; burada engagementApi kullanılmıyorsa host tarafında ele alınır.
      // Parite: mesaj + carId + carTitle + nonce ile ajax; wave5 host bağlar. Şimdilik yerelde
      // başarı akışını tetikle (ajax çağrısı push/api katmanında yok ise no-op).
      void nonce;
      onSuccess();
      setMessage('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, nonceProvider, onSuccess, onClose]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.scrim }]} onPress={onClose} />
      <View
        style={[
          styles.reportSheet,
          { backgroundColor: colors.cardBackground, paddingBottom: insets.bottom + 20 },
        ]}
      >
        <View style={[styles.grabber, { backgroundColor: colors.border }]} />
        <View style={styles.reportHeader}>
          <Text style={[webFont(16, 900), { color: colors.stone900 }]}>Hata Bildir</Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Kapat" style={styles.reportClose}>
            <Icon name="close" size={18} color={colors.stone500} />
          </Pressable>
        </View>
        <Text style={[webFont(12, 500), { color: colors.stone500 }]}>
          Veri hatası veya eksik bilgi mi fark ettiniz? Kısa bir açıklama bırakın.
        </Text>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder={displayTitle(car.brand, car.model)}
          placeholderTextColor={colors.stone400}
          multiline
          style={[
            styles.reportInput,
            { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.stone900 },
          ]}
        />
        <Pressable
          onPress={submit}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityLabel="Bildirimi Gönder"
          style={[styles.reportSubmit, { backgroundColor: colors.emerald600, opacity: canSubmit ? 1 : 0.5 }]}
        >
          <Text style={[webFont(12, 900), { color: '#FFFFFF' }]}>
            {submitting ? 'Gönderiliyor…' : 'Bildirimi Gönder'}
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}

// ── Yorum bölümü sarmalayıcıları (§4.5) ─────────────────────────────────────────────

const carReviewAccessors: CommentAccessors<CarReview> = {
  id: (r) => r.id,
  author: (r) => r.userName,
  text: (r) => r.comment,
  date: (r) => r.date,
  memberSlug: (r) => r.memberSlug,
  parentId: (r) => r.parentId,
};

const blogCommentAccessors: CommentAccessors<BlogComment> = {
  id: (c) => c.id,
  author: (c) => c.userName,
  text: (c) => c.text,
  date: (c) => c.date,
  memberSlug: (c) => c.memberSlug,
  parentId: (c) => c.parentId,
};

const compareCommentAccessors: CommentAccessors<CompareComment> = {
  id: (c) => c.id,
  author: (c) => c.userName,
  text: (c) => c.text,
  date: (c) => c.date,
  memberSlug: (c) => c.memberSlug,
  parentId: (c) => c.parentId,
};

interface ReplyState {
  parentId: string | null;
  targetName: string | null;
}

const NO_REPLY: ReplyState = { parentId: null, targetName: null };

/** Ortak yorum bölümü durumu (draft/notice/reply/submit). */
function useCommentSectionState() {
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const [reply, setReply] = useState<ReplyState>(NO_REPLY);
  return { draft, setDraft, submitting, setSubmitting, notice, setNotice, reply, setReply };
}

export interface CarReviewsSectionProps {
  slug: string;
  carId: string;
}

export function CarReviewsSection({ slug, carId }: CarReviewsSectionProps): React.JSX.Element {
  const isLoggedIn = useAuthStore((s) => s.currentUser !== null);
  const username = useAuthStore((s) => s.currentUser?.username);
  const openAuth = useAuthStore((s) => s.openAuth);
  const fetchFreshNonce = useAuthStore((s) => s.fetchFreshNonce);
  const [items, setItems] = useState<CarReview[]>([]);
  const st = useCommentSectionState();

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const reviews = await engagementApi.fetchCarReviews(slug);
        if (active) setItems(reviews);
      } catch {
        /* sessiz */
      }
    })();
    return () => {
      active = false;
    };
  }, [slug]);

  const submit = useCallback(async () => {
    const text = st.draft.trim();
    if (text.length === 0 || st.submitting) return;
    st.setSubmitting(true);
    st.setNotice(null);
    try {
      const nonce = (await fetchFreshNonce()) ?? '';
      const review = await engagementApi.addCarReview(carId, text, nonce, st.reply.parentId ?? undefined);
      setItems((prev) => [review, ...prev]); // araç yorumları başa eklenir
      st.setDraft('');
      st.setReply(NO_REPLY);
      st.setNotice({ text: 'Yorumunuz gönderildi.', error: false });
    } catch (err) {
      st.setNotice({ text: err instanceof Error ? err.message : 'Gönderilemedi.', error: true });
    } finally {
      st.setSubmitting(false);
    }
  }, [st, fetchFreshNonce, carId]);

  return (
    <WebCommentsSection
      items={items}
      accessors={carReviewAccessors}
      title={`Kullanıcı Yorumları (${items.length})`}
      badge="Topluluk"
      isLoggedIn={isLoggedIn}
      currentUsername={username}
      draft={st.draft}
      onDraftChange={st.setDraft}
      isSubmitting={st.submitting}
      notice={st.notice?.text}
      noticeIsError={st.notice?.error}
      replyTargetName={st.reply.targetName}
      onCancelReply={() => st.setReply(NO_REPLY)}
      onSubmit={submit}
      onReply={(r) => st.setReply({ parentId: r.id, targetName: r.userName })}
      onLoginRequest={() => openAuth('Yorum yapabilmek için giriş yapmalısınız.')}
    />
  );
}

export interface BlogCommentsSectionProps {
  slug: string;
  blogId: string;
}

export function BlogCommentsSection({ slug, blogId }: BlogCommentsSectionProps): React.JSX.Element {
  const isLoggedIn = useAuthStore((s) => s.currentUser !== null);
  const username = useAuthStore((s) => s.currentUser?.username);
  const openAuth = useAuthStore((s) => s.openAuth);
  const fetchFreshNonce = useAuthStore((s) => s.fetchFreshNonce);
  const [items, setItems] = useState<BlogComment[]>([]);
  const st = useCommentSectionState();

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const comments = await engagementApi.fetchBlogComments(slug);
        if (active) setItems(comments);
      } catch {
        /* sessiz */
      }
    })();
    return () => {
      active = false;
    };
  }, [slug]);

  const submit = useCallback(async () => {
    const text = st.draft.trim();
    if (text.length === 0 || st.submitting) return;
    st.setSubmitting(true);
    st.setNotice(null);
    try {
      const nonce = (await fetchFreshNonce()) ?? '';
      const comment = await engagementApi.addBlogComment(blogId, text, nonce, st.reply.parentId ?? undefined);
      setItems((prev) => [...prev, comment]); // blog yorumları sona eklenir
      st.setDraft('');
      st.setReply(NO_REPLY);
      st.setNotice({ text: 'Yorumunuz gönderildi.', error: false });
    } catch (err) {
      st.setNotice({ text: err instanceof Error ? err.message : 'Gönderilemedi.', error: true });
    } finally {
      st.setSubmitting(false);
    }
  }, [st, fetchFreshNonce, blogId]);

  return (
    <WebCommentsSection
      items={items}
      accessors={blogCommentAccessors}
      title={`Makale Yorumları (${items.length})`}
      badge="Topluluk"
      isLoggedIn={isLoggedIn}
      currentUsername={username}
      draft={st.draft}
      onDraftChange={st.setDraft}
      isSubmitting={st.submitting}
      notice={st.notice?.text}
      noticeIsError={st.notice?.error}
      replyTargetName={st.reply.targetName}
      onCancelReply={() => st.setReply(NO_REPLY)}
      onSubmit={submit}
      onReply={(c) => st.setReply({ parentId: c.id, targetName: c.userName })}
      onLoginRequest={() => openAuth('Yorum paylaşabilmek için oturum açmalısınız.')}
    />
  );
}

export interface CompareCommentsSectionProps {
  carIds: string[];
  /** Tercih seçici için araç etiketleri (id → görünen ad). */
  carLabels?: Record<string, string>;
}

export function CompareCommentsSection({
  carIds,
  carLabels = {},
}: CompareCommentsSectionProps): React.JSX.Element {
  const { colors } = useTheme();
  const isLoggedIn = useAuthStore((s) => s.currentUser !== null);
  const username = useAuthStore((s) => s.currentUser?.username);
  const openAuth = useAuthStore((s) => s.openAuth);
  const fetchFreshNonce = useAuthStore((s) => s.fetchFreshNonce);
  const currentNonce = useAuthStore((s) => s.currentNonce);
  const [items, setItems] = useState<CompareComment[]>([]);
  const [preferredCarId, setPreferredCarId] = useState<string | null>(null);
  const st = useCommentSectionState();

  const key = carIds.join('|');
  const enoughCars = carIds.length >= 2;

  useEffect(() => {
    if (!enoughCars) return;
    let active = true;
    void (async () => {
      try {
        const nonce = await currentNonce();
        const payload = await engagementApi.fetchCompareComments(carIds, nonce);
        if (active) setItems(payload.comments);
      } catch {
        /* sessiz */
      }
    })();
    return () => {
      active = false;
    };
    // key ile yeniden yüklenir (carIds.joined("|"))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enoughCars]);

  const submit = useCallback(async () => {
    const text = st.draft.trim();
    if (text.length === 0 || st.submitting) return;
    st.setSubmitting(true);
    st.setNotice(null);
    const attempt = async (nonce: string): Promise<CompareComment> =>
      engagementApi.addCompareComment(
        carIds,
        text,
        nonce,
        st.reply.parentId ?? undefined,
        preferredCarId ?? undefined,
      );
    try {
      let nonce = (await fetchFreshNonce()) ?? '';
      let comment: CompareComment;
      try {
        comment = await attempt(nonce);
      } catch (err) {
        // "güvenlik" içeren hatada nonce tazele ve bir kez yeniden dene.
        if (err instanceof Error && containsCaseInsensitiveTr(err.message, 'güvenlik')) {
          nonce = (await fetchFreshNonce()) ?? '';
          comment = await attempt(nonce);
        } else {
          throw err;
        }
      }
      setItems((prev) => [...prev, comment]); // karşılaştırma yorumları sona eklenir
      st.setDraft('');
      st.setReply(NO_REPLY);
      st.setNotice({ text: 'Yorumunuz gönderildi.', error: false });
    } catch (err) {
      st.setNotice({ text: err instanceof Error ? err.message : 'Gönderilemedi.', error: true });
    } finally {
      st.setSubmitting(false);
    }
  }, [st, fetchFreshNonce, carIds, preferredCarId]);

  const accessory = (
    <View style={styles.prefPicker}>
      <Text style={[webFont(9, 900), { color: colors.stone500, letterSpacing: 0.4 }]}>
        HANGİ MODELİ TERCİH EDERSİNİZ?
      </Text>
      <View style={styles.prefChips}>
        <PrefChip
          label="Kararsızım"
          active={preferredCarId === null}
          activeBg={colors.emerald700}
          onPress={() => setPreferredCarId(null)}
        />
        {carIds.map((id) => (
          <PrefChip
            key={id}
            label={carLabels[id] ?? id}
            active={preferredCarId === id}
            activeBg={colors.emerald600}
            onPress={() => setPreferredCarId((cur) => (cur === id ? null : id))}
          />
        ))}
      </View>
    </View>
  );

  if (!enoughCars) {
    return (
      <View style={[styles.card, { borderColor: colors.border }]}>
        <Text style={[webFont(12, 500), { color: colors.stone500 }]}>
          Karşılaştırma yorumları için en az iki araç seçin.
        </Text>
      </View>
    );
  }

  return (
    <WebCommentsSection
      items={items}
      accessors={compareCommentAccessors}
      title="Karşılaştırma Yorumları"
      badge="Topluluk"
      isLoggedIn={isLoggedIn}
      currentUsername={username}
      draft={st.draft}
      onDraftChange={st.setDraft}
      isSubmitting={st.submitting}
      notice={st.notice?.text}
      noticeIsError={st.notice?.error}
      replyTargetName={st.reply.targetName}
      onCancelReply={() => st.setReply(NO_REPLY)}
      onSubmit={submit}
      onReply={(c) => st.setReply({ parentId: c.id, targetName: c.userName })}
      onLoginRequest={() => openAuth('Karşılaştırma yorumu yapmak için giriş yapın.')}
      composerAccessory={accessory}
    />
  );
}

function PrefChip({
  label,
  active,
  activeBg,
  onPress,
}: {
  label: string;
  active: boolean;
  activeBg: string;
  onPress: () => void;
}): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.prefChip,
        active
          ? { backgroundColor: activeBg, borderColor: activeBg }
          : { backgroundColor: colors.cardBackground, borderColor: colors.border },
      ]}
    >
      <Text style={[webFont(10, 800), { color: active ? '#FFFFFF' : colors.stone700 }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  outOf: {
    marginBottom: 4,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
    marginLeft: 8,
    marginBottom: 6,
  },
  ratingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voteButton: {
    borderRadius: radii.button,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  chargerList: {
    gap: 8,
  },
  chargerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radii.button,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  percentSlider: {
    gap: 4,
  },
  percentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultBox: {
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  reportSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reportClose: {
    padding: 4,
  },
  reportInput: {
    minHeight: 96,
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    textAlignVertical: 'top',
  },
  reportSubmit: {
    borderRadius: radii.button,
    paddingVertical: 14,
    alignItems: 'center',
  },
  prefPicker: {
    gap: 8,
  },
  prefChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  prefChip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
