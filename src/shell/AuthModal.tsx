// AuthModalView + AuthLaunchView ortak formu — iOS auth ekranları (spec 03 §4.1/§4.2).
//
// Tek bileşen iki modda:
//  - variant="launch": cold-start tam-ekran kapısı (kapatılamaz backdrop, hero + ziyaretçi
//    linki, forgot YOK, canlı slug kontrolü YOK — yalnızca yerel ≥3 karakter doğrulaması).
//  - variant="modal": uygulama içi modal (dışarı tıkla kapan, forgot sekmesi var).
//
// Google satırı: settings.googleClientId çözülmemişse gizlenir. Native Google SDK (spec §4.3
// önerisi) kurulu olmadığından Wave 3'te Google butonu bilgi mesajı gösterir; gerçek akış Wave 5.
// Slug normalizasyonu spec §6/§4.4: lowercase, [^a-z0-9-]→-, -{2,}→-, trim -, min 3.

import { useState } from 'react';
import {
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

import { GoogleSignInSheet } from '../screens/account';
import { useAuthStore, useNavigationStore } from '../stores';
import { radii, useTheme, webFont } from '../theme';
import { Glyph } from './NavIcon';
import { ShellPressable } from './ShellPressable';
import { normalizeSlug } from './urls';

type Tab = 'signin' | 'signup' | 'forgot';

export interface AuthModalProps {
  variant: 'launch' | 'modal';
}

export function AuthModal({ variant }: AuthModalProps): React.JSX.Element {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('signin');
  const [fullName, setFullName] = useState('');
  const [memberSlug, setMemberSlug] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [forgotDone, setForgotDone] = useState<string | null>(null);
  const [googleSheetOpen, setGoogleSheetOpen] = useState(false);

  const isSubmitting = useAuthStore((s) => s.isSubmitting);
  const lastError = useAuthStore((s) => s.lastError);
  const showSuccess = useAuthStore((s) => s.showSuccess);
  const authMessage = useAuthStore((s) => s.authMessage);
  const googleClientId = useNavigationStore((s) => s.appSettings?.googleClientId);
  const auth = useAuthStore.getState();
  const nav = useNavigationStore.getState();

  const isLaunch = variant === 'launch';

  const switchTab = (next: Tab) => {
    setTab(next);
    auth.clearError();
    setForgotDone(null);
  };

  const onSubmit = async () => {
    auth.clearError();
    if (tab === 'forgot') {
      const message = await auth.forgotPassword(identifier.trim());
      if (message) setForgotDone(message);
      return;
    }
    if (tab === 'signup') {
      const slug = normalizeSlug(memberSlug);
      if (slug.length < 3) {
        useAuthStore.setState({ lastError: 'Kullanıcı adı en az 3 karakter olmalı.' });
        return;
      }
      await auth.register(fullName.trim(), identifier.trim(), password, slug);
      return;
    }
    await auth.login(identifier.trim(), password);
  };

  const card = (
    <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <View style={[styles.topStrip, { backgroundColor: colors.emerald600 }]} />
      {variant === 'modal' ? (
        <ShellPressable
          onPress={() => auth.closeAuth()}
          accessibilityLabel="Kapat"
          style={styles.closeButton}
        >
          <Glyph name="close" size={20} color={colors.stone500} />
        </ShellPressable>
      ) : null}

      <View style={[styles.shield, { backgroundColor: colors.emerald50 }]}>
        <Glyph name="shield-checkmark" size={22} color={colors.emerald600} />
      </View>
      <Text style={[webFont(20, 700), styles.centered, { color: colors.stone900 }]}>
        {tab === 'signin' ? 'ÜYE GİRİŞİ' : tab === 'signup' ? 'YENİ ÜYELİK' : 'ŞİFRE SIFIRLAMA'}
      </Text>
      {authMessage ? (
        <View style={[styles.messagePill, { backgroundColor: colors.emerald50 }]}>
          <Text style={[webFont(11, 600), styles.centered, { color: colors.emerald700 }]}>
            🔐 {authMessage}
          </Text>
        </View>
      ) : (
        <Text style={[webFont(10, 600), styles.centered, { color: colors.stone500 }]}>
          OTOMENZİL — ELEKTRİKLİ ARAÇ KARŞILAŞTIRMA
        </Text>
      )}

      {tab !== 'forgot' ? (
        <View style={styles.tabs}>
          {(['signin', 'signup'] as const).map((t) => {
            const active = tab === t;
            return (
              <ShellPressable
                key={t}
                onPress={() => switchTab(t)}
                accessibilityLabel={t === 'signin' ? 'Giriş yap' : 'Üye ol'}
                style={[styles.tab, active ? { backgroundColor: colors.stone950 } : null]}
              >
                <Text style={[webFont(12, 700), { color: active ? '#FFFFFF' : colors.stone600 }]}>
                  {t === 'signin' ? 'GİRİŞ YAP' : 'HIZLI ÜYE OL'}
                </Text>
              </ShellPressable>
            );
          })}
        </View>
      ) : (
        <ShellPressable onPress={() => switchTab('signin')} accessibilityLabel="Giriş ekranına dön" style={styles.backLink}>
          <Glyph name="arrow-back" size={14} color={colors.emerald600} />
          <Text style={[webFont(11, 700), { color: colors.emerald600 }]}>GİRİŞ EKRANINA DÖN</Text>
        </ShellPressable>
      )}

      {showSuccess ? (
        <View style={styles.successBox}>
          <Glyph name="checkmark-circle" size={20} color={colors.emerald600} />
          <Text style={[webFont(12, 700), { color: colors.emerald700 }]}>
            GİRİŞ BAŞARILI! YÖNLENDİRİLİYORSUNUZ...
          </Text>
        </View>
      ) : null}

      {lastError ? (
        <View style={[styles.errorBox, { backgroundColor: colors.dangerBackground }]}>
          <Text style={[webFont(12, 500), { color: colors.dangerForeground }]}>{lastError}</Text>
        </View>
      ) : null}

      {forgotDone ? (
        <View style={styles.successBox}>
          <Text style={[webFont(12, 600), { color: colors.emerald700 }]}>{forgotDone}</Text>
          <ShellPressable onPress={() => switchTab('signin')} accessibilityLabel="Şimdi giriş yap" style={styles.inlineButton}>
            <Text style={[webFont(12, 700), { color: colors.emerald600 }]}>ŞİMDİ GİRİŞ YAP</Text>
          </ShellPressable>
        </View>
      ) : (
        <View style={styles.fields}>
          {tab === 'signup' ? (
            <>
              <Field
                label="AD SOYAD"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Adınız ve soyadınız"
              />
              <Field
                label="PROFİL KULLANICI ADI"
                value={memberSlug}
                onChangeText={(t) => setMemberSlug(normalizeSlug(t))}
                placeholder="ornek-kullanici"
                autoCapitalize="none"
              />
            </>
          ) : null}

          {tab !== 'forgot' ? (
            <Field
              label={tab === 'signup' ? 'E-POSTA' : 'E-POSTA VEYA KULLANICI ADI'}
              value={identifier}
              onChangeText={setIdentifier}
              placeholder={tab === 'signup' ? 'ornek@ornek.com' : '@kullanici veya ornek@ornek.com'}
              keyboardType={tab === 'signup' ? 'email-address' : 'default'}
              autoCapitalize="none"
            />
          ) : (
            <Field
              label="KAYITLI E-POSTA ADRESİ"
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="ornek@ornek.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          )}

          {tab !== 'forgot' ? (
            <Field
              label="ŞİFRE"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              trailing={
                <ShellPressable
                  onPress={() => setShowPassword((v) => !v)}
                  accessibilityLabel={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  hitSlop={8}
                  style={styles.eye}
                >
                  <Glyph name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.stone500} />
                </ShellPressable>
              }
            />
          ) : null}

          {tab === 'signin' && !isLaunch ? (
            <ShellPressable onPress={() => switchTab('forgot')} accessibilityLabel="Şifremi unuttum" style={styles.forgotLink}>
              <Text style={[webFont(11, 600), { color: colors.emerald600 }]}>Şifremi Unuttum?</Text>
            </ShellPressable>
          ) : null}

          <ShellPressable
            onPress={() => void onSubmit()}
            disabled={isSubmitting}
            accessibilityLabel="Gönder"
            style={[styles.submit, { backgroundColor: colors.emerald600 }]}
          >
            <Text style={[webFont(13, 700), { color: '#FFFFFF' }]}>
              {tab === 'signin' ? 'OTURUM AÇ' : tab === 'signup' ? 'KAYIT OL' : 'ŞİFREMİ SIFIRLA'}
            </Text>
          </ShellPressable>

          {/* Google satırı — yalnızca settings.googleClientId çözülmüşse (spec §4.3). */}
          {tab !== 'forgot' && googleClientId ? (
            <>
              <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                <Text style={[webFont(9, 700), styles.dividerText, { color: colors.stone400 }]}>
                  VEYA
                </Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              </View>
              <ShellPressable
                onPress={() => setGoogleSheetOpen(true)}
                accessibilityLabel={tab === 'signup' ? 'Google ile kaydol' : 'Google ile giriş yap'}
                style={[styles.googleButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
              >
                <Glyph name="logo-google" size={18} color="#EA4335" />
                <Text style={[webFont(13, 700), { color: colors.stone700 }]}>
                  {tab === 'signup' ? 'Google ile Kaydol' : 'Google ile Giriş Yap'}
                </Text>
              </ShellPressable>
            </>
          ) : null}
        </View>
      )}
    </View>
  );

  const googleSheet = (
    <GoogleSignInSheet
      visible={googleSheetOpen}
      mode={tab === 'signup' ? 'signup' : 'signin'}
      googleClientId={googleClientId}
      onClose={() => setGoogleSheetOpen(false)}
    />
  );

  if (isLaunch) {
    return (
      <View style={[styles.launchRoot, { backgroundColor: colors.pageBackground }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView
            contentContainerStyle={[styles.launchScroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.hero}>
              <Text style={[webFont(24, 700), { color: colors.stone900 }]}>Türkiye’nin Elektrikli Araç</Text>
              <Text style={[webFont(24, 700), { color: colors.emerald600 }]}>Karşılaştırma Platformu</Text>
              <Text style={[webFont(13, 500), { color: colors.stone500 }]}>
                Garajına aracını ekle, yakın şarj istasyonlarını keşfet.
              </Text>
            </View>
            {card}
            <ShellPressable
              onPress={() => nav.dismissLaunchAuth()}
              accessibilityLabel="Ziyaretçi olarak devam et"
              style={styles.guestLink}
            >
              <Text style={[webFont(13, 600), styles.underline, { color: colors.stone600 }]}>
                Ziyaretçi olarak devam et
              </Text>
            </ShellPressable>
          </ScrollView>
        </KeyboardAvoidingView>
        {googleSheet}
      </View>
    );
  }

  return (
    <View style={[StyleSheet.absoluteFill, styles.modalRoot]}>
      <Pressable
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
        onPress={() => auth.closeAuth()}
        accessibilityLabel="Kapat"
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalCenter}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalScroll}>
          {card}
        </ScrollView>
      </KeyboardAvoidingView>
      {googleSheet}
    </View>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences';
  trailing?: React.ReactNode;
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  trailing,
}: FieldProps): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[webFont(10, 700), styles.fieldLabel, { color: colors.stone500 }]}>{label}</Text>
      <View style={[styles.inputWrap, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.stone400}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          style={[webFont(14, 500), styles.input, { color: colors.stone900 }]}
        />
        {trailing}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  launchRoot: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 130 },
  launchScroll: { padding: 20, gap: 20, flexGrow: 1, justifyContent: 'center' },
  hero: { gap: 6 },
  guestLink: { alignItems: 'center', paddingVertical: 8 },
  underline: { textDecorationLine: 'underline' },
  modalRoot: { zIndex: 120, alignItems: 'center', justifyContent: 'center' },
  modalCenter: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  modalScroll: { padding: 20, alignItems: 'center' },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    paddingTop: 26,
    gap: 12,
    overflow: 'hidden',
  },
  topStrip: { position: 'absolute', top: 0, left: 0, right: 0, height: 6 },
  closeButton: { position: 'absolute', top: 12, right: 12, padding: 4, zIndex: 1 },
  shield: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  centered: { textAlign: 'center' },
  messagePill: { borderRadius: radii.button, paddingVertical: 8, paddingHorizontal: 12 },
  tabs: { flexDirection: 'row', gap: 6 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: 'center' },
  backLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6 },
  successBox: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  inlineButton: { paddingVertical: 6 },
  errorBox: { borderRadius: radii.button, padding: 10 },
  fields: { gap: 10 },
  field: { gap: 5 },
  fieldLabel: { letterSpacing: 0.6 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.button,
    paddingHorizontal: 12,
  },
  input: { flex: 1, paddingVertical: 12 },
  eye: { padding: 4 },
  forgotLink: { alignSelf: 'flex-end' },
  submit: { borderRadius: radii.button, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { letterSpacing: 1 },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radii.button,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 13,
  },
});
