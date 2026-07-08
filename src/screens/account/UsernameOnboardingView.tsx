// UsernameOnboardingView — iOS Google sonrası kullanıcı adı seçici (spec §4.4).
//
// Tam-ekran karartılmış overlay (kapatılamaz — kapat butonu yok). Slug alanı canlı normalize +
// blur/submit'te apiClient.checkMemberSlug; öneriler mount'ta suggestMemberSlugs(fullName=mevcut
// kullanıcı adı). Kaydet → apiClient.setupUsername → authStore.completeUsernameSetup(user)
// (garaj onboarding'e zincirlenir).
//
// WIRING (Wave 6): shell'de authStore.pendingUsernameSetup true iken bu overlay z-126'da render
// edilir (mevcut yer tutucunun yerine). Prop ALMAZ — currentUser/nonce store'dan okunur.

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { Icon } from '../../components';
import { apiClient } from '../../api';
import { useAuthStore } from '../../stores';
import { gradients, radii, useTheme, webFont } from '../../theme';
import {
  isSlugValid,
  normalizeSlug,
  profilePreviewPath,
  SLUG_TOO_SHORT_MESSAGE_SHORT,
  SLUG_UNAVAILABLE_MESSAGE,
  type SlugCheckState,
} from './accountSlug';

const CHECK_DEBOUNCE_MS = 450;

export function UsernameOnboardingView(): React.JSX.Element {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const currentUser = useAuthStore((s) => s.currentUser);

  const [slug, setSlug] = useState('');
  const [check, setCheck] = useState<SlugCheckState>({ status: 'idle' });
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Öneriler: mount'ta mevcut kullanıcı adından türet; ilkini otomatik seç.
  useEffect(() => {
    let cancelled = false;
    const fullName = currentUser?.username ?? '';
    if (fullName.trim().length < 2) return;
    void (async () => {
      try {
        const nonce = await useAuthStore.getState().currentNonce();
        const res = await apiClient.suggestMemberSlug(fullName, nonce);
        if (cancelled) return;
        setSuggestions(res.suggestions);
        if (res.suggestions.length > 0) {
          setSlug(normalizeSlug(res.suggestions[0]));
          setCheck({ status: 'ok' });
        }
      } catch {
        // öneriler isteğe bağlı — sessiz
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.username]);

  const runCheck = (value: string): void => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!isSlugValid(value)) {
      setCheck({ status: 'error', message: SLUG_TOO_SHORT_MESSAGE_SHORT });
      return;
    }
    setCheck({ status: 'checking' });
    debounce.current = setTimeout(() => {
      void (async () => {
        try {
          const nonce = await useAuthStore.getState().currentNonce();
          const res = await apiClient.checkMemberSlug(value, nonce);
          if (res.available === false) {
            setCheck({ status: 'error', message: SLUG_UNAVAILABLE_MESSAGE });
          } else {
            setCheck({ status: 'ok' });
          }
        } catch {
          // Nonce/ağ hatası → slug ok kabul edilir (spec §4.2 notu).
          setCheck({ status: 'ok' });
        }
      })();
    }, CHECK_DEBOUNCE_MS);
  };

  const onChange = (text: string): void => {
    const normalized = normalizeSlug(text);
    setSlug(normalized);
    runCheck(normalized);
  };

  const statusLine = useMemo(() => {
    switch (check.status) {
      case 'checking':
        return { text: 'Kontrol ediliyor…', color: colors.stone500 };
      case 'ok':
        return { text: 'Kullanıcı adı uygun.', color: colors.emerald600 };
      case 'error':
        return { text: check.message, color: colors.dangerForeground };
      default:
        return { text: `Profil adresi: ${profilePreviewPath('')}`, color: colors.stone500 };
    }
  }, [check, colors]);

  const canSubmit = check.status === 'ok' && !saving && isSlugValid(slug);

  const onSubmit = async (): Promise<void> => {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const nonce = await useAuthStore.getState().currentNonce();
      const res = await apiClient.setupUsername(slug, nonce);
      useAuthStore.getState().completeUsernameSetup(res.user);
    } catch (err) {
      setError(err instanceof Error && err.message.length > 0 ? err.message : 'Kullanıcı adı kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[StyleSheet.absoluteFill, styles.root]}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.center}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24 }]}
        >
          <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <LinearGradient
              colors={gradients.hero}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.strip}
            />
            <View style={styles.body}>
              <View style={[styles.capsule, { backgroundColor: colors.emerald50, borderColor: colors.emerald100 }]}>
                <Icon name="sparkles" size={12} color={colors.emerald700} />
                <Text style={[webFont(10, 800), { color: colors.emerald700 }]}>
                  Profil kullanıcı adı
                </Text>
              </View>
              <Text style={[webFont(22, 900), { color: colors.stone900 }]}>
                Kullanıcı adını belirle
              </Text>
              <Text style={[webFont(12, 500), { color: colors.stone500 }]}>
                Google ile giriş yaptınız. Profil adresiniz için bir kullanıcı adı seçin — yalnızca
                harf, rakam ve tire.
              </Text>

              {/* Field */}
              <View style={styles.field}>
                <Text style={[webFont(10, 800), styles.label, { color: colors.stone450 }]}>
                  KULLANICI ADI
                </Text>
                <View
                  style={[
                    styles.inputWrap,
                    {
                      backgroundColor: colors.inputBackground,
                      borderColor:
                        check.status === 'ok'
                          ? colors.emerald600
                          : check.status === 'error'
                            ? colors.dangerBorder
                            : colors.border,
                    },
                  ]}
                >
                  <Icon name="user" size={16} color={colors.stone400} />
                  <TextInput
                    value={slug}
                    onChangeText={onChange}
                    placeholder="ornek-kullanici"
                    placeholderTextColor={colors.stone400}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[webFont(14, 500), styles.input, { color: colors.stone900 }]}
                  />
                  {check.status === 'checking' ? (
                    <ActivityIndicator size="small" color={colors.stone400} />
                  ) : null}
                </View>
                <Text style={[webFont(11, 600), { color: statusLine.color }]}>{statusLine.text}</Text>
                <Text style={[webFont(11, 700), { color: colors.stone600 }]}>
                  {profilePreviewPath(slug)}
                </Text>
              </View>

              {/* Suggestions */}
              {suggestions.length > 0 ? (
                <View style={styles.suggestRow}>
                  {suggestions.map((s) => {
                    const normalized = normalizeSlug(s);
                    return (
                      <Pressable
                        key={s}
                        onPress={() => {
                          setSlug(normalized);
                          setCheck({ status: 'ok' });
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`@${normalized}`}
                        style={[styles.suggestChip, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                      >
                        <Text style={[webFont(11, 700), { color: colors.stone700 }]}>@{normalized}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              {error ? (
                <View style={[styles.errorBox, { backgroundColor: colors.dangerBackground }]}>
                  <Text style={[webFont(12, 600), { color: colors.dangerForeground }]}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                onPress={() => void onSubmit()}
                disabled={!canSubmit}
                accessibilityRole="button"
                accessibilityLabel="Kullanıcı adını kaydet ve devam et"
                style={({ pressed }) => [
                  styles.submit,
                  { backgroundColor: colors.emerald600, opacity: !canSubmit ? 0.5 : pressed ? 0.85 : 1 },
                ]}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Icon name="check-circle" size={15} color="#FFFFFF" />
                )}
                <Text style={[webFont(12, 900), { color: '#FFFFFF' }]}>
                  Kullanıcı adını kaydet ve devam et
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 126,
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
  },
  scroll: {
    padding: 20,
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  strip: {
    height: 5,
  },
  body: {
    padding: 20,
    gap: 12,
  },
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  field: {
    gap: 6,
  },
  label: {
    letterSpacing: 0.6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radii.button,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
  },
  suggestRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestChip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  errorBox: {
    borderRadius: radii.button,
    padding: 12,
  },
  submit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radii.button,
    paddingVertical: 14,
    marginTop: 4,
  },
});
