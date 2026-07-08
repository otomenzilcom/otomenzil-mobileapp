// DataVerificationBadgeView — iOS doğrulama rozeti + sheet (spec §4.18).
//
// Pill buton → alt sayfa (bottom sheet). verified/unverified metin ve renkleri birebir.
// verified → emerald700 on emerald50/emerald100; unverified → #92400E on amber50/amber200.

import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radii, useTheme, webFont } from '../theme';
import { Icon } from './ComponentIcon';

interface Copy {
  label: string;
  short: string;
  title: string;
  body: string;
}

const VERIFIED: Copy = {
  label: 'Doğrulanmış Araç Verileri',
  short: 'Veriler Doğrulandı',
  title: 'Teknik veriler doğrulandı',
  body: 'Menzil, batarya kapasitesi, şarj süresi, fiyat ve teknik parametreler resmi üretici / yetkili satıcı kaynaklarıyla karşılaştırılarak kontrol edilmiştir.',
};

const UNVERIFIED: Copy = {
  label: 'Doğrulanmamış Araç Verileri',
  short: 'Veriler Doğrulanmadı',
  title: 'Teknik veriler henüz doğrulanmadı',
  body: 'Bu model yeni olabilir veya teknik bilgiler güncelleme aşamasındadır. Gösterilen menzil, batarya, şarj ve fiyat değerleri bilgilendirme amaçlıdır; yakında doğrulanmış veri olarak güncellenecektir.',
};

export interface DataVerificationBadgeProps {
  verified: boolean;
  compact?: boolean;
}

export function DataVerificationBadge({
  verified,
  compact = false,
}: DataVerificationBadgeProps): React.JSX.Element {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const copy = verified ? VERIFIED : UNVERIFIED;

  const fg = verified ? colors.emerald700 : '#92400E';
  const bg = verified ? colors.emerald50 : colors.amber50;
  const stroke = verified ? colors.emerald100 : colors.amber200;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={copy.label}
        style={({ pressed }) => [
          styles.pill,
          { backgroundColor: bg, borderColor: stroke, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Icon name={verified ? 'check-circle' : 'alert-triangle'} size={13} color={fg} />
        <Text style={[webFont(10, 800), { color: fg }]}>{compact ? copy.short : copy.label}</Text>
        <Icon name="info" size={12} color={fg} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: colors.scrim }]} onPress={() => setOpen(false)} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.cardBackground, paddingBottom: insets.bottom + 20 },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />
          <View style={styles.sheetHeaderRow}>
            <Icon name={verified ? 'check-circle' : 'alert-triangle'} size={22} color={fg} />
            <Text style={[webFont(16, 900), styles.sheetTitle, { color: colors.stone900 }]}>
              {copy.title}
            </Text>
          </View>
          <Text style={[webFont(13, 500), styles.sheetBody, { color: colors.stone600 }]}>
            {copy.body}
          </Text>
          <Pressable
            onPress={() => setOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Kapat"
            style={({ pressed }) => [
              styles.closeButton,
              { backgroundColor: colors.inputBackground, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[webFont(12, 700), { color: colors.stone800 }]}>Kapat</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 14,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sheetTitle: {
    flex: 1,
  },
  sheetBody: {
    lineHeight: 20,
  },
  closeButton: {
    borderRadius: radii.button,
    paddingVertical: 12,
    alignItems: 'center',
  },
});
