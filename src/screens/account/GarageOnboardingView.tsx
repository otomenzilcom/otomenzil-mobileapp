// GarageOnboardingView — iOS kayıt sonrası garaj kurulumu (spec §4.5).
//
// Tam-ekran karartılmış overlay, xmark ile kapatılabilir. İlk araç seçici: query <2 → ilk 6
// katalog aracı, else title-contains eşleşme, max 8. Satıra dokun → authStore.toggleGarageCar →
// başarıda kapan; hata banner'ı authStore.lastError. Atla butonları da kapatır.
//
// WIRING (Wave 6): shell'de authStore.pendingGarageOnboarding true iken z-125'te render edilir.
// Kapatma authStore.pendingGarageOnboarding=false ile (aşağıda dismiss()). Prop ALMAZ.

import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { BrandLogo, CachedImage, Icon } from '../../components';
import type { CarSummary } from '../../models';
import { useAuthStore, useNavigationStore } from '../../stores';
import { containsCaseInsensitiveTr } from '../../utils/turkishText';
import { gradients, radii, useTheme, webFont } from '../../theme';

const EMPTY_QUERY_COUNT = 6;
const MAX_RESULTS = 8;

function displayTitle(car: CarSummary): string {
  return car.model.toLowerCase().startsWith(car.brand.toLowerCase())
    ? car.model
    : `${car.brand} ${car.model}`;
}

/** Garaj onboarding'i kapat (flag temizle). */
function dismiss(): void {
  useAuthStore.setState({ pendingGarageOnboarding: false });
}

export function GarageOnboardingView(): React.JSX.Element {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const catalogCars = useNavigationStore((s) => s.catalogCars);
  const brandLogos = useNavigationStore((s) => s.brandLogos);
  const busy = useAuthStore((s) => s.busyGarageCarIds);
  const lastError = useAuthStore((s) => s.lastError);

  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return catalogCars.slice(0, EMPTY_QUERY_COUNT);
    return catalogCars
      .filter((c) => containsCaseInsensitiveTr(displayTitle(c), trimmed))
      .slice(0, MAX_RESULTS);
  }, [query, catalogCars]);

  const onAdd = async (car: CarSummary): Promise<void> => {
    const before = useAuthStore.getState().garageCarIds.length;
    await useAuthStore.getState().toggleGarageCar(car.id, catalogCars);
    // Başarıyla eklendiyse (sayı arttı, hata yoksa) onboarding'i kapat.
    const after = useAuthStore.getState().garageCarIds.length;
    if (after > before) dismiss();
  };

  return (
    <View style={[StyleSheet.absoluteFill, styles.root]}>
      <Pressable
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
        onPress={dismiss}
        accessibilityLabel="Kapat"
      />
      <View style={[styles.center, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}>
        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <LinearGradient
            colors={gradients.hero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.strip}
          />
          <Pressable
            onPress={dismiss}
            accessibilityRole="button"
            accessibilityLabel="Kapat"
            hitSlop={8}
            style={styles.close}
          >
            <Icon name="close" size={20} color={colors.stone500} />
          </Pressable>

          <View style={styles.body}>
            <View style={[styles.capsule, { backgroundColor: colors.emerald50, borderColor: colors.emerald100 }]}>
              <Icon name="sparkles" size={12} color={colors.emerald700} />
              <Text style={[webFont(10, 800), { color: colors.emerald700 }]}>Garaj kurulumu</Text>
            </View>
            <Text style={[webFont(22, 900), { color: colors.stone900 }]}>Elektrikli aracın var mı?</Text>
            <Text style={[webFont(12, 500), { color: colors.stone500 }]}>
              Kullandığın aracı seç ve garajına ekle; menzil, şarj ve istasyon önerileri sana özel
              açılsın.
            </Text>

            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Marka veya model ara…"
              placeholderTextColor={colors.stone400}
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                webFont(14, 500),
                styles.input,
                { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.stone900 },
              ]}
            />

            {lastError ? (
              <View style={[styles.errorBox, { backgroundColor: colors.dangerBackground }]}>
                <Text style={[webFont(12, 600), { color: colors.dangerForeground }]}>{lastError}</Text>
              </View>
            ) : null}

            <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
              {results.map((car) => {
                const image = car.images?.find((u) => u.length > 0);
                const isBusy = busy.includes(car.id);
                return (
                  <View
                    key={car.id}
                    style={[styles.row, { borderColor: colors.borderLight }]}
                  >
                    <CachedImage uri={image} style={styles.thumb} placeholderColor={colors.stone100} recyclingKey={car.id} />
                    <View style={styles.rowText}>
                      <View style={styles.rowTitle}>
                        <BrandLogo brand={car.brand} logoURL={brandLogos[car.brand]} size={18} />
                        <Text style={[webFont(12, 800), { color: colors.stone900 }]} numberOfLines={1}>
                          {displayTitle(car)}
                        </Text>
                      </View>
                      <Text style={[webFont(9, 600), { color: colors.stone500 }]}>
                        {car.rangeKm ?? '—'} km · {car.batteryKwh ?? '—'} kWh
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => void onAdd(car)}
                      disabled={isBusy}
                      accessibilityRole="button"
                      accessibilityLabel="Ekle"
                      style={({ pressed }) => [
                        styles.addButton,
                        { backgroundColor: colors.emerald600, opacity: isBusy ? 0.6 : pressed ? 0.85 : 1 },
                      ]}
                    >
                      {isBusy ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={[webFont(10, 900), { color: '#FFFFFF' }]}>EKLE</Text>
                      )}
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>

            {/* Skip buttons */}
            <View style={styles.skipRow}>
              <Pressable
                onPress={dismiss}
                accessibilityRole="button"
                accessibilityLabel="Henüz aracım yok"
                style={({ pressed }) => [
                  styles.skipButton,
                  { backgroundColor: colors.inputBackground, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Icon name="bolt" size={12} color={colors.stone600} />
                <Text style={[webFont(11, 800), { color: colors.stone700 }]}>Henüz aracım yok</Text>
              </Pressable>
              <Pressable
                onPress={dismiss}
                accessibilityRole="button"
                accessibilityLabel="Almayı düşünüyorum"
                style={({ pressed }) => [
                  styles.skipButton,
                  { backgroundColor: colors.emerald50, borderColor: colors.emerald100, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text style={[webFont(11, 800), { color: colors.emerald700 }]}>Almayı düşünüyorum</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 125,
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  strip: {
    height: 5,
  },
  close: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 1,
    padding: 4,
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
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.button,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  errorBox: {
    borderRadius: radii.button,
    padding: 12,
  },
  list: {
    maxHeight: 220,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumb: {
    width: 64,
    height: 44,
    borderRadius: 8,
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addButton: {
    borderRadius: radii.button,
    paddingHorizontal: 14,
    paddingVertical: 9,
    minWidth: 54,
    alignItems: 'center',
  },
  skipRow: {
    flexDirection: 'row',
    gap: 10,
  },
  skipButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radii.button,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
  },
});
