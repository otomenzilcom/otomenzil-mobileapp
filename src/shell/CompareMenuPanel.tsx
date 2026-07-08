// CompareMenuPanelView — iOS karşılaştırma listesi paneli (spec 03 §5.4).
//
// Hem drawer içinde (inline) hem de sağ-üst bağımsız overlay (z-105) olarak kullanılır.
// header "KARŞILAŞTIRMA LİSTESİ" + "<n>/3 araç seçildi"; boş/dolu durumları; satırlar (thumb,
// marka uppercased, model, çöp kutusu); CTA "KARŞILAŞTIRMAYA GİT" (≥2) ve "LİSTEYİ BOŞALT".

import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { COMPARE_LIMIT, useNavigationStore } from '../stores';
import { radii, useTheme, webFont } from '../theme';
import { Glyph } from './NavIcon';
import { ShellPressable } from './ShellPressable';

/** Swift CarSummary.displayTitle. */
function displayTitle(brand: string, model: string): string {
  return model.toLowerCase().startsWith(brand.toLowerCase()) ? model : `${brand} ${model}`;
}

export interface CompareMenuPanelProps {
  /** Kapatma aksiyonu (overlay için X; drawer içinde de kullanılır). */
  onClose: () => void;
  /** Karşılaştırma sayfasına gidince ek kapatma (drawer'ı da kapat vb.). */
  onNavigated?: () => void;
}

export function CompareMenuPanel({ onClose, onNavigated }: CompareMenuPanelProps): React.JSX.Element {
  const { colors } = useTheme();
  const list = useNavigationStore((s) => s.compareList);
  const nav = useNavigationStore.getState();

  return (
    <View style={[styles.panel, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[webFont(11, 700), styles.eyebrow, { color: colors.stone500 }]}>
            KARŞILAŞTIRMA LİSTESİ
          </Text>
          <Text style={[webFont(13, 600), { color: colors.stone900 }]}>
            {list.length > 0 ? `${list.length}/${COMPARE_LIMIT} araç seçildi` : `En fazla ${COMPARE_LIMIT} model`}
          </Text>
        </View>
        <ShellPressable onPress={onClose} accessibilityLabel="Kapat" style={styles.closeButton}>
          <Glyph name="close" size={18} color={colors.stone500} />
        </ShellPressable>
      </View>

      {list.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[webFont(13, 600), { color: colors.stone700 }]}>Henüz araç eklemediniz.</Text>
          <Text style={[webFont(12, 500), { color: colors.stone500 }]}>
            Araç kartlarındaki karşılaştır butonuyla listeye ekleyin.
          </Text>
        </View>
      ) : (
        <View style={styles.rows}>
          {list.map((car) => {
            const image = car.images?.find((u) => u.length > 0);
            return (
              <View key={car.id} style={styles.row}>
                <Image
                  source={image ? { uri: image } : undefined}
                  style={[styles.thumb, { backgroundColor: colors.imagePlaceholder }]}
                  contentFit="cover"
                />
                <View style={styles.rowText}>
                  <Text style={[webFont(9, 700), { color: colors.emerald600 }]} numberOfLines={1}>
                    {car.brand.toUpperCase()}
                  </Text>
                  <Text style={[webFont(12, 600), { color: colors.stone900 }]} numberOfLines={1}>
                    {displayTitle(car.brand, car.model)}
                  </Text>
                </View>
                <ShellPressable
                  onPress={() => nav.removeFromCompare(car.id)}
                  accessibilityLabel="Listeden çıkar"
                  style={styles.trash}
                >
                  <Glyph name="trash" size={16} color={colors.red600} />
                </ShellPressable>
              </View>
            );
          })}
        </View>
      )}

      <ShellPressable
        onPress={() => {
          nav.navigate('compare');
          onNavigated?.();
          onClose();
        }}
        accessibilityLabel="Karşılaştırmaya git"
        style={[styles.cta, { backgroundColor: colors.emerald600 }]}
      >
        <Text style={[webFont(12, 700), { color: '#FFFFFF' }]}>
          {list.length >= 2 ? 'KARŞILAŞTIRMAYA GİT' : 'KARŞILAŞTIRMA SAYFASINA GİT'}
        </Text>
      </ShellPressable>

      {list.length > 0 ? (
        <ShellPressable
          onPress={() => nav.clearCompare()}
          accessibilityLabel="Listeyi boşalt"
          style={[styles.clear, { borderColor: colors.dangerBorder }]}
        >
          <Text style={[webFont(11, 700), { color: colors.red600 }]}>LİSTEYİ BOŞALT</Text>
        </ShellPressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerText: {
    gap: 2,
  },
  eyebrow: {
    letterSpacing: 0.8,
  },
  closeButton: {
    padding: 2,
  },
  empty: {
    gap: 4,
    paddingVertical: 8,
  },
  rows: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  thumb: {
    width: 44,
    height: 32,
    borderRadius: 6,
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  trash: {
    padding: 4,
  },
  cta: {
    borderRadius: radii.button,
    paddingVertical: 12,
    alignItems: 'center',
  },
  clear: {
    borderRadius: radii.button,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    alignItems: 'center',
  },
});
