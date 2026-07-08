// AccountSettingsView — iOS ayarlar ekranı (spec §3.5).
//
// Alanlar authStore.currentUser'dan senkronlanır; kaydet updateProfile ile. Tercihler
// usePreferencesStore (5 boolean, AsyncStorage). Avatar teması avatarColor payload'a dahil edilir
// ve yalnızca hesap-kaydet butonuyla kalıcılaşır. Çıkış authStore.logout.

import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Icon, type IconName } from '../../components';
import { useAuthStore, useNavigationStore, usePreferencesStore } from '../../stores';
import { AVATAR_THEME_OPTIONS, radii, useTheme, webFont } from '../../theme';
import {
  AccountAvatar,
  CopyableProfileUrl,
  LoggedOutPrompt,
  NoticeBanner,
} from './accountPrimitives';

export function AccountSettingsScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const currentUser = useAuthStore((s) => s.currentUser);
  const isSubmitting = useAuthStore((s) => s.isSubmitting);

  if (currentUser === null) {
    return (
      <ScrollView style={{ backgroundColor: colors.pageBackground }}>
        <LoggedOutPrompt
          icon="sliders"
          title="Ayarlar"
          message="Tercihlerinizi ve hesap ayarlarınızı yönetmek için giriş yapmalısınız."
          buttonLabel="GİRİŞ YAP"
          onPress={() =>
            useAuthStore.getState().openAuth('Ayarlarınızı yönetmek için giriş yapın.')
          }
        />
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <SettingsBody
        // Kullanıcı kimliği değişince form state'i props'tan yeniden başlatılsın diye remount
        // ediyoruz (effect ile senkron yerine — react-hooks/set-state-in-effect'ten kaçınır).
        key={`${currentUser.username}|${currentUser.email}|${currentUser.avatarColor ?? ''}`}
        username={currentUser.username}
        email={currentUser.email}
        memberSlug={currentUser.memberSlug}
        avatarColor={currentUser.avatarColor}
        isSubmitting={isSubmitting}
      />
    </KeyboardAvoidingView>
  );
}

interface SettingsBodyProps {
  username: string;
  email: string;
  memberSlug?: string;
  avatarColor?: string;
  isSubmitting: boolean;
}

function SettingsBody({
  username,
  email,
  memberSlug,
  avatarColor,
  isSubmitting,
}: SettingsBodyProps): React.JSX.Element {
  const { colors } = useTheme();

  // Form durumu — currentUser değişince (mount / oturum değişimi) senkronla.
  const [name, setName] = useState(username);
  const [mail, setMail] = useState(email);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [avatarKey, setAvatarKey] = useState(avatarColor ?? 'emerald');
  const [notice, setNotice] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);

  const onSave = async (): Promise<void> => {
    setNotice(null);
    const message = await useAuthStore.getState().updateProfile({
      username: name.trim(),
      email: mail.trim(),
      currentPassword,
      newPassword,
      avatarColor: avatarKey,
    });
    if (message !== null) {
      setNotice({ message, tone: message.includes('kaydedildi') ? 'success' : 'error' });
      setCurrentPassword('');
      setNewPassword('');
    } else {
      const err = useAuthStore.getState().lastError;
      setNotice({ message: err ?? 'Hesap güncellenemedi.', tone: 'error' });
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.pageBackground }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Hero */}
      <LinearGradient
        colors={[colors.stone950, colors.stone900]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={[webFont(11, 800), styles.heroEyebrow, { color: colors.emerald400 }]}>
          HESAP
        </Text>
        <Text style={[webFont(26, 900), { color: '#FFFFFF' }]}>Ayarlar</Text>
        <Text style={[webFont(12, 500), { color: colors.stone300 }]}>
          Ad, e-posta, şifre, profil teması ve favoriler. Üye profilinizi görüntülemek için profil
          sayfanıza gidin.
        </Text>
        <Pressable
          onPress={() => useNavigationStore.getState().navigate('profile')}
          accessibilityRole="button"
          accessibilityLabel="Profil sayfasına git"
          style={styles.heroLink}
        >
          <Text style={[webFont(12, 800), { color: colors.emerald400 }]}>Profil sayfasına git →</Text>
        </Pressable>
      </LinearGradient>

      {/* Account form */}
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <SectionTitle icon="lock" title="Hesap bilgileri" />
        {notice ? <NoticeBanner message={notice.message} tone={notice.tone} /> : null}

        <LabeledField label="Ad Soyad" value={name} onChangeText={setName} />

        <View style={styles.slugBlock}>
          <Text style={[webFont(10, 800), styles.fieldLabel, { color: colors.stone450 }]}>
            PROFİL KULLANICI ADI
          </Text>
          {memberSlug ? (
            <>
              <CopyableProfileUrl memberSlug={memberSlug} showOpenLink={false} />
              <Text style={[webFont(11, 500), { color: colors.stone500 }]}>
                Kullanıcı adı üyelik sırasında seçilir ve değiştirilemez.
              </Text>
            </>
          ) : (
            <Text style={[webFont(12, 500), { color: colors.stone500 }]}>
              Kullanıcı adı tanımlı değil.
            </Text>
          )}
        </View>

        <LabeledField
          label="E-posta"
          value={mail}
          onChangeText={setMail}
          keyboardType="email-address"
        />

        <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

        <LabeledField
          label="Mevcut şifre"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
        />
        <LabeledField
          label="Yeni şifre"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          placeholder="Değiştirmek istiyorsanız girin"
        />

        <Pressable
          onPress={() => void onSave()}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel="Hesap bilgilerini kaydet"
          style={({ pressed }) => [
            styles.saveButton,
            { backgroundColor: colors.emerald600, opacity: isSubmitting ? 0.6 : pressed ? 0.85 : 1 },
          ]}
        >
          <Icon name="arrow-forward" size={15} color="#FFFFFF" />
          <Text style={[webFont(12, 900), { color: '#FFFFFF' }]}>
            {isSubmitting ? 'Kaydediliyor…' : 'Hesap bilgilerini kaydet'}
          </Text>
        </Pressable>
      </View>

      {/* Preferences */}
      <PreferencesCard />

      {/* Avatar theme */}
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <SectionTitle icon="sparkles" title="Profil teması" />
        <Text style={[webFont(11, 500), { color: colors.stone500 }]}>
          Menü ve profil avatarınızda kullanılan renk teması.
        </Text>
        <View style={styles.previewRow}>
          <AccountAvatar username={name} avatarColor={avatarKey} size={48} radius={14} fontSize={20} />
          <Text style={[webFont(12, 700), { color: colors.stone600 }]}>Önizleme</Text>
        </View>
        <View style={styles.themeChips}>
          {AVATAR_THEME_OPTIONS.map((opt) => {
            const active = opt.key === avatarKey;
            return (
              <Pressable
                key={opt.key}
                onPress={() => setAvatarKey(opt.key)}
                accessibilityRole="button"
                accessibilityLabel={opt.label}
                style={({ pressed }) => [
                  styles.themeChip,
                  {
                    backgroundColor: active ? colors.emerald50 : colors.inputBackground,
                    borderColor: active ? colors.emerald600 : colors.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={[styles.themeSwatch, { backgroundColor: opt.color }]} />
                <Text
                  style={[webFont(11, active ? 800 : 600), { color: active ? colors.emerald700 : colors.stone700 }]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Quick links */}
      <View style={styles.quickRow}>
        <QuickLink icon="car" title="Garajım" subtitle="Araçlarınızı yönetin" view="garage" />
        <QuickLink icon="user" title="Profilim" subtitle="Üye profilini görüntüle" view="profile" />
      </View>

      {/* Logout */}
      <Pressable
        onPress={() => void useAuthStore.getState().logout()}
        accessibilityRole="button"
        accessibilityLabel="Oturumu Kapat"
        style={({ pressed }) => [
          styles.logout,
          { backgroundColor: colors.dangerBackground, borderColor: colors.dangerBorder, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Icon name="login" size={15} color={colors.dangerForeground} />
        <Text style={[webFont(12, 900), { color: colors.dangerForeground }]}>Oturumu Kapat</Text>
      </Pressable>
    </ScrollView>
  );
}

// ── Preferences card ────────────────────────────────────────────────────────────────

function PreferencesCard(): React.JSX.Element {
  const { colors } = useTheme();
  const prefs = usePreferencesStore();

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <SectionTitle icon="sliders" title="Uygulama tercihleri" />
      <Text style={[webFont(11, 500), { color: colors.stone500 }]}>
        Uygulama tercihleri cihazınızda saklanır.
      </Text>
      <ToggleRow
        title="Bildirimler"
        subtitle="Kampanya ve güncelleme bildirimleri"
        value={prefs.pushNotificationsEnabled}
        onValueChange={prefs.setPushNotificationsEnabled}
      />
      <ToggleRow
        title="Veri doğrulama"
        subtitle="Yalnızca doğrulanmış teknik verileri vurgula"
        value={prefs.showVerifiedDataOnly}
        onValueChange={prefs.setShowVerifiedDataOnly}
      />
      <ToggleRow
        title="Analitik"
        subtitle="Anonim kullanım istatistiklerini paylaş"
        value={prefs.analyticsEnabled}
        onValueChange={prefs.setAnalyticsEnabled}
      />
      <ToggleRow
        title="Kompakt kartlar"
        subtitle="Katalog listesinde daha sıkı kart düzeni"
        value={prefs.compactCatalogCards}
        onValueChange={prefs.setCompactCatalogCards}
      />
    </View>
  );
}

interface ToggleRowProps {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

function ToggleRow({ title, subtitle, value, onValueChange }: ToggleRowProps): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={[styles.toggleRow, { borderColor: colors.borderLight }]}>
      <View style={styles.toggleText}>
        <Text style={[webFont(13, 800), { color: colors.stone900 }]}>{title}</Text>
        <Text style={[webFont(11, 500), { color: colors.stone500 }]}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.emerald600, false: colors.stone300 }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={colors.stone300}
      />
    </View>
  );
}

// ── Quick link ────────────────────────────────────────────────────────────────────

interface QuickLinkProps {
  icon: IconName;
  title: string;
  subtitle: string;
  view: 'garage' | 'profile';
}

function QuickLink({ icon, title, subtitle, view }: QuickLinkProps): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => useNavigationStore.getState().navigate(view)}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        styles.quickLink,
        { backgroundColor: colors.cardBackground, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[styles.quickIcon, { backgroundColor: colors.emerald50 }]}>
        <Icon name={icon} size={16} color={colors.emerald600} />
      </View>
      <Text style={[webFont(13, 900), { color: colors.stone900 }]}>{title}</Text>
      <Text style={[webFont(10, 500), { color: colors.stone500 }]}>{subtitle}</Text>
    </Pressable>
  );
}

// ── Shared bits ─────────────────────────────────────────────────────────────────────

function SectionTitle({ icon, title }: { icon: IconName; title: string }): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionTitle}>
      <Icon name={icon} size={15} color={colors.emerald600} />
      <Text style={[webFont(15, 900), { color: colors.stone900 }]}>{title}</Text>
    </View>
  );
}

interface LabeledFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  placeholder?: string;
}

function LabeledField({
  label,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  placeholder,
}: LabeledFieldProps): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[webFont(10, 800), styles.fieldLabel, { color: colors.stone450 }]}>
        {label.toUpperCase()}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.stone400}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        autoCorrect={false}
        style={[
          webFont(14, 500),
          styles.input,
          { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.stone900 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: 16,
    gap: 16,
  },
  hero: {
    borderRadius: radii.card,
    padding: 20,
    gap: 6,
  },
  heroEyebrow: {
    letterSpacing: 1,
  },
  heroLink: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  card: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.button,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  slugBlock: {
    gap: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radii.button,
    paddingVertical: 14,
    marginTop: 4,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  themeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  themeSwatch: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  toggleText: {
    flex: 1,
    gap: 3,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickLink: {
    flex: 1,
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 6,
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 15,
  },
});
