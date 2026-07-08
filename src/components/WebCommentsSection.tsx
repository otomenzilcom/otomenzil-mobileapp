// WebCommentsSection — iOS jenerik iş parçacıklı yorum UI'si (spec §4.6).
//
// Item accessor closure'larıyla jenerik (author/text/date/memberSlug/parentId). Konteyner
// gradient + başlık + "Üye Tartışması" pill; bildirim banner'ı; composer (giriş yapılmışsa) veya
// amber giriş paneli; iş parçacığı (tek seviye iç içe). Boş durum metni sabit.

import { Fragment } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { trUppercase } from '../utils/turkishText';
import { radii, useTheme, webFont } from '../theme';
import { Icon } from './ComponentIcon';

export interface CommentAccessors<Item> {
  id: (item: Item) => string;
  author: (item: Item) => string;
  text: (item: Item) => string;
  date: (item: Item) => string;
  memberSlug: (item: Item) => string | undefined;
  parentId: (item: Item) => string | undefined;
}

export interface WebCommentsSectionProps<Item> {
  items: Item[];
  accessors: CommentAccessors<Item>;
  title: string;
  badge: string;
  isLoggedIn: boolean;
  currentUsername?: string;
  draft: string;
  onDraftChange: (text: string) => void;
  isSubmitting: boolean;
  notice?: string | null;
  noticeIsError?: boolean;
  replyTargetName?: string | null;
  onCancelReply?: () => void;
  onSubmit: () => void;
  onReply?: (item: Item) => void;
  onLoginRequest: () => void;
  /** Composer üstünde ekstra içerik (ör. karşılaştırma tercih seçici). */
  composerAccessory?: React.ReactNode;
}

const PLACEHOLDER = 'Bu makale hakkındaki görüşünüzü paylaşın...';
const EMPTY = 'Henüz yorum yok — ilk yorumu siz yazın.';
const LOGIN_PROMPT = 'Yorum yazmak ve yanıtlamak için üye girişi gereklidir.';
const LOGIN_CTA = 'Üye Girişi Yap veya Kaydol →';

export function WebCommentsSection<Item>({
  items,
  accessors,
  title,
  badge,
  isLoggedIn,
  currentUsername,
  draft,
  onDraftChange,
  isSubmitting,
  notice,
  noticeIsError,
  replyTargetName,
  onCancelReply,
  onSubmit,
  onReply,
  onLoginRequest,
  composerAccessory,
}: WebCommentsSectionProps<Item>): React.JSX.Element {
  const { colors } = useTheme();

  const topLevel = items.filter((it) => {
    const pid = accessors.parentId(it);
    return pid == null || pid.length === 0;
  });
  const repliesOf = (parentId: string): Item[] =>
    items.filter((it) => accessors.parentId(it) === parentId);

  const canSubmit = isLoggedIn && !isSubmitting && draft.trim().length > 0;
  const avatarInitial = (currentUsername ?? 'Ü').trim().charAt(0).toUpperCase() || 'Ü';

  return (
    <LinearGradient
      colors={[colors.cardBackground, colors.stone50, colors.emerald50]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { borderColor: colors.border }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[webFont(9, 900), { color: colors.emerald600, letterSpacing: 0.4 }]}>
            {trUppercase(badge)}
          </Text>
          <Text style={[webFont(14, 900), { color: colors.stone900 }]}>{trUppercase(title)}</Text>
        </View>
        <View style={[styles.headerPill, { backgroundColor: colors.emerald50, borderColor: colors.emerald100 }]}>
          <Text style={[webFont(9, 700), { color: colors.emerald700 }]}>Üye Tartışması</Text>
        </View>
      </View>
      <View style={[styles.hairline, { backgroundColor: colors.border }]} />

      {/* Notice */}
      {notice ? (
        <View
          style={[
            styles.notice,
            noticeIsError
              ? { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }
              : { backgroundColor: colors.emerald50, borderColor: colors.emerald100 },
          ]}
        >
          <Text style={[webFont(12, 700), { color: noticeIsError ? '#B91C1C' : colors.emerald700 }]}>
            {notice}
          </Text>
        </View>
      ) : null}

      {/* Composer or login panel */}
      {isLoggedIn ? (
        <View style={styles.composer}>
          {composerAccessory}
          {replyTargetName ? (
            <View style={styles.replyBar}>
              <Text style={[webFont(11, 600), { color: colors.stone600 }]}>
                Yanıt: {replyTargetName}
              </Text>
              <Pressable onPress={onCancelReply} accessibilityRole="button" accessibilityLabel="İptal">
                <Text style={[webFont(11, 700), { color: colors.red600 }]}>İptal</Text>
              </Pressable>
            </View>
          ) : null}
          <Text style={[webFont(10, 900), { color: colors.stone500, letterSpacing: 0.4 }]}>
            YORUMUNUZ
          </Text>
          <View style={styles.composerRow}>
            <View style={[styles.avatar, { backgroundColor: colors.emerald50, borderColor: colors.emerald100 }]}>
              <Text style={[webFont(14, 700), { color: colors.emerald700 }]}>{avatarInitial}</Text>
            </View>
            <TextInput
              value={draft}
              onChangeText={onDraftChange}
              placeholder={PLACEHOLDER}
              placeholderTextColor={colors.stone400}
              multiline
              style={[
                styles.input,
                { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.stone900 },
              ]}
            />
          </View>
          <Pressable
            onPress={onSubmit}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityLabel="Gönder"
            style={({ pressed }) => [
              styles.submit,
              { backgroundColor: colors.stone950, opacity: !canSubmit ? 0.5 : pressed ? 0.85 : 1 },
            ]}
          >
            <Icon name="send" size={14} color="#FFFFFF" />
            <Text style={[webFont(11, 900), { color: '#FFFFFF' }]}>
              {isSubmitting ? 'Gönderiliyor…' : 'Gönder'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.loginPanel, { backgroundColor: colors.amber50, borderColor: colors.amber200 }]}>
          <Text style={[webFont(12, 500), { color: colors.stone700 }]}>{LOGIN_PROMPT}</Text>
          <Pressable onPress={onLoginRequest} accessibilityRole="button" accessibilityLabel={LOGIN_CTA}>
            <Text style={[webFont(10, 900), { color: colors.emerald700 }]}>{LOGIN_CTA}</Text>
          </Pressable>
        </View>
      )}

      {/* Thread */}
      {topLevel.length === 0 ? (
        <Text style={[webFont(12, 500), styles.empty, { color: colors.stone500 }]}>{EMPTY}</Text>
      ) : (
        <View style={styles.thread}>
          {topLevel.map((item) => {
            const id = accessors.id(item);
            return (
              <Fragment key={id}>
                <CommentCard
                  item={item}
                  accessors={accessors}
                  isTopLevel
                  canReply={isLoggedIn}
                  onReply={onReply}
                />
                {repliesOf(id).map((reply) => (
                  <View key={accessors.id(reply)} style={styles.replyInset}>
                    <CommentCard
                      item={reply}
                      accessors={accessors}
                      isTopLevel={false}
                      canReply={false}
                      onReply={onReply}
                    />
                  </View>
                ))}
              </Fragment>
            );
          })}
        </View>
      )}
    </LinearGradient>
  );
}

function CommentCard<Item>({
  item,
  accessors,
  isTopLevel,
  canReply,
  onReply,
}: {
  item: Item;
  accessors: CommentAccessors<Item>;
  isTopLevel: boolean;
  canReply: boolean;
  onReply?: (item: Item) => void;
}): React.JSX.Element {
  const { colors } = useTheme();
  const author = trUppercase(accessors.author(item));
  const memberSlug = accessors.memberSlug(item);

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={styles.authorRow}>
          <Text style={[webFont(11, 900), { color: colors.stone900 }]} numberOfLines={1}>
            {author}
          </Text>
          {memberSlug ? <Icon name="check-seal" size={9} color={colors.emerald600} /> : null}
        </View>
        <Text style={[webFont(9, 600), { color: colors.stone400 }]}>{accessors.date(item)}</Text>
      </View>
      <Text style={[webFont(14, 500), { color: colors.stone650 }]}>{accessors.text(item)}</Text>
      {isTopLevel && canReply && onReply ? (
        <Pressable
          onPress={() => onReply(item)}
          accessibilityRole="button"
          accessibilityLabel="Yanıtla"
          style={styles.replyAction}
        >
          <Icon name="reply" size={10} color={colors.emerald700} />
          <Text style={[webFont(10, 900), { color: colors.emerald700 }]}>Yanıtla</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  headerPill: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
  },
  notice: {
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  composer: {
    gap: 8,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  composerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 72,
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    textAlignVertical: 'top',
  },
  submit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radii.button,
    paddingVertical: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
  },
  loginPanel: {
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 8,
  },
  empty: {
    paddingVertical: 8,
  },
  thread: {
    gap: 10,
  },
  replyInset: {
    paddingLeft: 16,
  },
  card: {
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  replyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
});
