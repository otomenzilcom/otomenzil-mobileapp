// ContactView — iOS iletişim formu (spec §3.6).
//
// Ad/e-posta authStore.currentUser'dan ön doldurulur. Gönder → taze nonce + apiClient.submitContact
// (ajax otomenzil_contact; snake_case istemci içinde). Gönder trimmed mesaj ≥10 karaktere kadar
// pasif. Başarıda form yerine onay kartı.

import { useState } from 'react';
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

import { Icon } from '../../components';
import { apiClient } from '../../api';
import { useAuthStore } from '../../stores';
import { radii, useTheme, webFont } from '../../theme';

const MESSAGE_MIN = 10;

export function ContactScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const currentUser = useAuthStore((s) => s.currentUser);

  const [name, setName] = useState(currentUser?.username ?? '');
  const [email, setEmail] = useState(currentUser?.email ?? '');
  const [subject, setSubject] = useState('Genel İletişim');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const canSubmit = message.trim().length >= MESSAGE_MIN && !submitting;

  const onSubmit = async (): Promise<void> => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const nonce = await useAuthStore.getState().currentNonce();
      await apiClient.submitContact(name.trim(), email.trim(), subject.trim(), message.trim(), nonce);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error && err.message.length > 0 ? err.message : 'Mesaj gönderilemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <ScrollView
        style={{ backgroundColor: colors.pageBackground }}
        contentContainerStyle={styles.content}
      >
        <View style={[styles.successCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Icon name="check-circle" size={44} color={colors.emerald600} />
          <Text style={[webFont(20, 900), styles.centered, { color: colors.stone900 }]}>
            Mesajınız alındı!
          </Text>
          <Text style={[webFont(13, 500), styles.centered, { color: colors.stone500 }]}>
            Ekibimiz en kısa sürede size dönüş yapacaktır.
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <ScrollView
        style={{ backgroundColor: colors.pageBackground }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={[webFont(24, 900), { color: colors.stone900 }]}>İletişim</Text>
          <Text style={[webFont(13, 500), { color: colors.stone500 }]}>
            Sponsorluk, veri düzeltmesi, iş birliği veya genel sorularınız için bize yazın.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Field label="Ad Soyad" value={name} onChangeText={setName} />
          <Field
            label="E-posta"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
          <Field label="Konu" value={subject} onChangeText={setSubject} />

          <View style={styles.field}>
            <Text style={[webFont(10, 800), styles.label, { color: colors.stone450 }]}>MESAJ</Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Mesajınızı buraya yazın…"
              placeholderTextColor={colors.stone400}
              multiline
              textAlignVertical="top"
              style={[
                webFont(14, 500),
                styles.textarea,
                { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.stone900 },
              ]}
            />
          </View>

          {error ? (
            <Text style={[webFont(12, 600), { color: colors.dangerForeground }]}>{error}</Text>
          ) : null}

          <Pressable
            onPress={() => void onSubmit()}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityLabel="Mesajı Gönder"
            style={({ pressed }) => [
              styles.submit,
              { backgroundColor: colors.emerald600, opacity: !canSubmit ? 0.5 : pressed ? 0.85 : 1 },
            ]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Icon name="send" size={15} color="#FFFFFF" />
            )}
            <Text style={[webFont(12, 900), styles.submitText, { color: '#FFFFFF' }]}>
              MESAJI GÖNDER
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: 'default' | 'email-address';
}

function Field({ label, value, onChangeText, keyboardType }: FieldProps): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[webFont(10, 800), styles.label, { color: colors.stone450 }]}>
        {label.toUpperCase()}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
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
  header: {
    gap: 6,
  },
  card: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  field: {
    gap: 6,
  },
  label: {
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.button,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  textarea: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.button,
    paddingHorizontal: 12,
    paddingVertical: 12,
    height: 120,
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
  submitText: {
    letterSpacing: 0.8,
  },
  successCard: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 28,
    gap: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  centered: {
    textAlign: 'center',
  },
});
