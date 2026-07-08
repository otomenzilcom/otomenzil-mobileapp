// GarageView — iOS garaj ekranı (spec §3.2).
//
// Ziyaretçi → GuestGarageGate. Oturumlu: hero (ana araç showcase + diğer araçlar şeridi), yakın
// istasyonlar (özet + tam sayfa linki), şarj hesaplayıcı ve yönetim (grid + katalogdan ekleme).
// Garaj durumu authStore'da (garageCarSummaries/garageCarIds/primaryGarageCarId/busyGarageCarIds).

import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { BrandLogo, CachedImage, GuestGarageGate, Icon } from '../../components';
import type { CarSummary } from '../../models';
import { useAuthStore, useNavigationStore } from '../../stores';
import { containsCaseInsensitiveTr } from '../../utils/turkishText';
import { radii, useTheme, webFont } from '../../theme';
import { GarageChargeCalculatorCard } from './GarageChargeCalculatorCard';
import { NearbyStationsSection } from './NearbyStationsSection';

const PICKER_LIMIT = 12;

function displayTitle(car: CarSummary): string {
  return car.model.toLowerCase().startsWith(car.brand.toLowerCase())
    ? car.model
    : `${car.brand} ${car.model}`;
}

export function GarageScreen(): React.JSX.Element {
  const currentUser = useAuthStore((s) => s.currentUser);

  if (currentUser === null) {
    return (
      <GuestGarageGate
        onLogin={() =>
          useAuthStore.getState().openAuth('Aracını garajına eklemek için giriş yapın.')
        }
      />
    );
  }
  return <GarageBody />;
}

function GarageBody(): React.JSX.Element {
  const { colors } = useTheme();
  const garageCarIds = useAuthStore((s) => s.garageCarIds);
  const primaryGarageCarId = useAuthStore((s) => s.primaryGarageCarId);
  const summaries = useAuthStore((s) => s.garageCarSummaries);
  const busy = useAuthStore((s) => s.busyGarageCarIds);
  const catalogCars = useNavigationStore((s) => s.catalogCars);
  const brandLogos = useNavigationStore((s) => s.brandLogos);

  // Kullanıcı seçili "aktif" araç (ana araçtan bağımsız izleme/hesaplama için).
  const [activeCarId, setActiveCarId] = useState<string | null>(null);

  const garageCars = useMemo(
    () => garageCarIds.map((id) => summaries[id]).filter((c): c is CarSummary => c != null),
    [garageCarIds, summaries],
  );

  const displayCar =
    (activeCarId != null ? summaries[activeCarId] : undefined) ??
    summaries[primaryGarageCarId] ??
    garageCars[0];

  const summariesLoading = garageCarIds.length > garageCars.length;

  return (
    <ScrollView
      style={{ backgroundColor: colors.pageBackground }}
      contentContainerStyle={styles.content}
    >
      {/* Hero */}
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <View style={[styles.capsule, { backgroundColor: colors.emerald50, borderColor: colors.emerald100 }]}>
          <Icon name="sparkles" size={12} color={colors.emerald700} />
          <Text style={[webFont(10, 800), { color: colors.emerald700 }]}>Kişisel garaj</Text>
        </View>
        <Text style={[webFont(28, 900), { color: colors.stone900 }]}>Garajım</Text>
        <Text style={[webFont(12, 500), { color: colors.stone500 }]}>
          Araçlarınızı yönetin, port bazlı menzil hesaplayın ve konumunuza göre yakın şarj
          noktalarını görün.
        </Text>

        {garageCars.length === 0 && summariesLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.emerald600} />
            <Text style={[webFont(12, 600), { color: colors.stone500 }]}>
              {garageCarIds.length} araç garajınızda yükleniyor…
            </Text>
          </View>
        ) : displayCar ? (
          <PrimaryShowcase
            car={displayCar}
            isPrimary={displayCar.id === primaryGarageCarId}
            brandLogos={brandLogos}
          />
        ) : (
          <View style={[styles.emptyPanel, { borderColor: colors.border }]}>
            <Icon name="car" size={30} color={colors.stone400} />
            <Text style={[webFont(13, 800), { color: colors.stone700 }]}>
              Henüz garajınızda araç yok
            </Text>
            <Text style={[webFont(11, 500), styles.centered, { color: colors.stone500 }]}>
              Aşağıdan katalogda arayıp ilk aracınızı ekleyin.
            </Text>
          </View>
        )}

        {garageCars.length > 1 ? (
          <OtherCarsStrip
            cars={garageCars.filter((c) => c.id !== displayCar?.id)}
            activeCarId={displayCar?.id}
            onSelect={setActiveCarId}
          />
        ) : null}
      </View>

      {/* Nearby stations (only when a display car exists) */}
      {displayCar ? <NearbyStationsSection car={displayCar} /> : null}

      {/* Charge calculator */}
      {displayCar ? <GarageChargeCalculatorCard car={displayCar} /> : null}

      {/* Management */}
      <ManagementSection
        garageCars={garageCars}
        primaryGarageCarId={primaryGarageCarId}
        activeCarId={displayCar?.id}
        busy={busy}
        onSelectActive={setActiveCarId}
      />

      {/* Car picker */}
      <CarPicker garageCarIds={garageCarIds} catalogCars={catalogCars} busy={busy} />
    </ScrollView>
  );
}

// ── Primary showcase (§3.2 #1) ──────────────────────────────────────────────────────

interface PrimaryShowcaseProps {
  car: CarSummary;
  isPrimary: boolean;
  brandLogos: Record<string, string>;
}

function PrimaryShowcase({ car, isPrimary, brandLogos }: PrimaryShowcaseProps): React.JSX.Element {
  const { colors } = useTheme();
  const image = car.images?.find((u) => u.length > 0);

  const stats: { label: string; value: string }[] = [
    { label: 'WLTP Menzil', value: car.rangeKm != null ? `${car.rangeKm} km` : '—' },
    { label: 'Batarya', value: car.batteryKwh != null ? `${car.batteryKwh} kWh` : '—' },
    { label: '10-80 DC', value: car.chargingMin != null ? `${car.chargingMin} dk` : '—' },
    { label: 'Güç', value: car.powerHp != null ? `${car.powerHp} HP` : '—' },
    { label: '0-100', value: car.accelerationSec != null ? `${car.accelerationSec} s` : '—' },
    { label: 'Bagaj', value: car.trunkLiters != null ? `${car.trunkLiters} L` : '—' },
  ];

  return (
    <View style={[styles.showcase, { borderColor: colors.border }]}>
      <Pressable
        onPress={() => useNavigationStore.getState().openCarDetail(car.id)}
        accessibilityRole="button"
        accessibilityLabel={displayTitle(car)}
      >
        <CachedImage uri={image} style={styles.showcaseImage} placeholderColor={colors.stone100} recyclingKey={car.id} />
        <LinearGradient
          colors={['transparent', 'rgba(12,10,9,0.75)']}
          style={styles.showcaseOverlay}
          pointerEvents="none"
        />
        {isPrimary ? (
          <View style={styles.crownBadge}>
            <Icon name="star" size={11} color="#0C0A09" />
            <Text style={[webFont(9, 900), { color: '#0C0A09' }]}>Ana araç</Text>
          </View>
        ) : null}
        <View style={styles.showcaseTitle}>
          <BrandLogo brand={car.brand} logoURL={brandLogos[car.brand]} size={24} />
          <Text style={[webFont(20, 900), { color: '#FFFFFF' }]}>{displayTitle(car)}</Text>
        </View>
      </Pressable>
      <View style={styles.showcaseStats}>
        {stats.map((s) => (
          <View key={s.label} style={[styles.showcaseStat, { backgroundColor: colors.inputBackground }]}>
            <Text style={[webFont(9, 700), { color: colors.stone450 }]}>{s.label}</Text>
            <Text style={[webFont(13, 900), { color: colors.stone900 }]}>{s.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Other cars strip (§3.2 #1) ────────────────────────────────────────────────────────

interface OtherCarsStripProps {
  cars: CarSummary[];
  activeCarId?: string;
  onSelect: (id: string) => void;
}

function OtherCarsStrip({ cars, activeCarId, onSelect }: OtherCarsStripProps): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={styles.stripBlock}>
      <Text style={[webFont(11, 800), { color: colors.stone500 }]}>Diğer araçlarınız</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stripRow}>
        {cars.map((car) => {
          const active = car.id === activeCarId;
          const image = car.images?.find((u) => u.length > 0);
          return (
            <Pressable
              key={car.id}
              onPress={() => onSelect(car.id)}
              accessibilityRole="button"
              accessibilityLabel={displayTitle(car)}
              style={[
                styles.stripCard,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: active ? colors.emerald600 : colors.border,
                },
              ]}
            >
              <CachedImage uri={image} style={styles.stripThumb} placeholderColor={colors.stone100} recyclingKey={car.id} />
              <Text style={[webFont(11, 800), { color: colors.stone900 }]} numberOfLines={1}>
                {displayTitle(car)}
              </Text>
              <Text style={[webFont(9, 600), { color: colors.stone500 }]}>
                {car.rangeKm ?? '—'} km · {car.batteryKwh ?? '—'} kWh
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ── Management (§3.2 #4) ──────────────────────────────────────────────────────────────

interface ManagementSectionProps {
  garageCars: CarSummary[];
  primaryGarageCarId: string;
  activeCarId?: string;
  busy: string[];
  onSelectActive: (id: string) => void;
}

function ManagementSection({
  garageCars,
  primaryGarageCarId,
  activeCarId,
  busy,
  onSelectActive,
}: ManagementSectionProps): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <View style={styles.sectionHead}>
        <Icon name="car" size={16} color={colors.emerald600} />
        <Text style={[webFont(15, 900), { color: colors.stone900 }]}>
          Garajdaki Araçlar ({garageCars.length})
        </Text>
      </View>

      {garageCars.length === 0 ? (
        <View style={[styles.emptyPanel, { borderColor: colors.border }]}>
          <Text style={[webFont(12, 700), { color: colors.stone600 }]}>Garajınız boş</Text>
        </View>
      ) : (
        <View style={styles.manageGrid}>
          {garageCars.map((car) => {
            const isPrimary = car.id === primaryGarageCarId;
            const isActive = car.id === activeCarId;
            const isBusy = busy.includes(car.id);
            const image = car.images?.find((u) => u.length > 0);
            return (
              <View
                key={car.id}
                style={[
                  styles.manageCard,
                  {
                    backgroundColor: isActive ? colors.emerald50 : colors.inputBackground,
                    borderColor: isActive ? colors.emerald600 : colors.border,
                  },
                ]}
              >
                <Pressable
                  onPress={() => onSelectActive(car.id)}
                  accessibilityRole="button"
                  accessibilityLabel={displayTitle(car)}
                  style={styles.manageCardTop}
                >
                  <CachedImage uri={image} style={styles.manageThumb} placeholderColor={colors.stone100} recyclingKey={car.id} />
                  <View style={styles.manageText}>
                    <Text style={[webFont(11, 800), { color: colors.stone900 }]} numberOfLines={2}>
                      {displayTitle(car)}
                    </Text>
                    <Text style={[webFont(9, 600), { color: colors.stone500 }]}>
                      {car.rangeKm ?? '—'} km · {car.batteryKwh ?? '—'} kWh
                    </Text>
                  </View>
                </Pressable>
                <View style={styles.manageActions}>
                  {isPrimary ? (
                    <View style={styles.primaryLabel}>
                      <Icon name="star" size={11} color={colors.emerald600} />
                      <Text style={[webFont(9, 800), { color: colors.emerald600 }]}>Ana araç</Text>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => void useAuthStore.getState().setPrimaryGarageCar(car.id)}
                      disabled={isBusy}
                      accessibilityRole="button"
                      accessibilityLabel="Ana araç yap"
                      style={styles.primaryButton}
                    >
                      <Icon name="star-outline" size={11} color={colors.stone600} />
                      <Text style={[webFont(9, 800), { color: colors.stone600 }]}>Ana araç yap</Text>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => void useAuthStore.getState().toggleGarageCar(car.id)}
                    disabled={isBusy}
                    accessibilityRole="button"
                    accessibilityLabel="Kaldır"
                    style={styles.removeButton}
                  >
                    {isBusy ? (
                      <ActivityIndicator size="small" color={colors.dangerForeground} />
                    ) : (
                      <>
                        <Icon name="close" size={11} color={colors.dangerForeground} />
                        <Text style={[webFont(9, 800), { color: colors.dangerForeground }]}>Kaldır</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ── Car picker (§3.2 #4) ──────────────────────────────────────────────────────────────

interface CarPickerProps {
  garageCarIds: string[];
  catalogCars: CarSummary[];
  busy: string[];
}

function CarPicker({ garageCarIds, catalogCars, busy }: CarPickerProps): React.JSX.Element {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const inGarage = new Set(garageCarIds);
    const pool = catalogCars.filter((c) => !inGarage.has(c.id));
    const trimmed = query.trim();
    const filtered =
      trimmed.length === 0
        ? pool
        : pool.filter((c) => containsCaseInsensitiveTr(displayTitle(c), trimmed));
    return filtered.slice(0, PICKER_LIMIT);
  }, [garageCarIds, catalogCars, query]);

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <View style={styles.sectionHead}>
        <Icon name="search" size={16} color={colors.emerald600} />
        <Text style={[webFont(15, 900), { color: colors.stone900 }]}>Araç Ara</Text>
      </View>
      <Text style={[webFont(11, 500), { color: colors.stone500 }]}>
        Katalogdan aracınızı bulup garajınıza ekleyin.
      </Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Marka veya model ara..."
        placeholderTextColor={colors.stone400}
        autoCapitalize="none"
        autoCorrect={false}
        style={[
          webFont(14, 500),
          styles.pickerInput,
          { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.stone900 },
        ]}
      />
      {results.length === 0 ? (
        <Text style={[webFont(12, 600), styles.centered, { color: colors.stone500 }]}>
          Sonuç bulunamadı.
        </Text>
      ) : (
        <View style={styles.pickerList}>
          {results.map((car) => {
            const image = car.images?.find((u) => u.length > 0);
            const isBusy = busy.includes(car.id);
            return (
              <View
                key={car.id}
                style={[styles.pickerRow, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
              >
                <CachedImage uri={image} style={styles.pickerThumb} placeholderColor={colors.stone100} recyclingKey={car.id} />
                <View style={styles.pickerText}>
                  <Text style={[webFont(12, 800), { color: colors.stone900 }]} numberOfLines={1}>
                    {displayTitle(car)}
                  </Text>
                  <Text style={[webFont(9, 600), { color: colors.stone500 }]}>
                    {car.rangeKm ?? '—'} km · {car.batteryKwh ?? '—'} kWh
                  </Text>
                </View>
                <Pressable
                  onPress={() => void useAuthStore.getState().toggleGarageCar(car.id, catalogCars)}
                  disabled={isBusy}
                  accessibilityRole="button"
                  accessibilityLabel="Garaja Ekle"
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
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16,
  },
  card: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
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
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  emptyPanel: {
    alignItems: 'center',
    gap: 8,
    borderRadius: radii.inner,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 24,
  },
  centered: {
    textAlign: 'center',
  },
  showcase: {
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  showcaseImage: {
    width: '100%',
    height: 200,
  },
  showcaseOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
  },
  crownBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#A7F3D0',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  showcaseTitle: {
    position: 'absolute',
    left: 14,
    bottom: 12,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  showcaseStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 12,
  },
  showcaseStat: {
    flexGrow: 1,
    minWidth: '30%',
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  stripBlock: {
    gap: 8,
  },
  stripRow: {
    gap: 10,
    paddingVertical: 2,
  },
  stripCard: {
    width: 180,
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 8,
    gap: 6,
  },
  stripThumb: {
    width: '100%',
    height: 90,
    borderRadius: 10,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  manageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  manageCard: {
    width: '48%',
    flexGrow: 1,
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    gap: 8,
  },
  manageCardTop: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  manageThumb: {
    width: 72,
    height: 54,
    borderRadius: 8,
  },
  manageText: {
    flex: 1,
    gap: 4,
  },
  manageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  primaryLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pickerInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.button,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  pickerList: {
    gap: 8,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 8,
  },
  pickerThumb: {
    width: 56,
    height: 42,
    borderRadius: 8,
  },
  pickerText: {
    flex: 1,
    gap: 3,
  },
  addButton: {
    borderRadius: radii.button,
    paddingHorizontal: 14,
    paddingVertical: 9,
    minWidth: 56,
    alignItems: 'center',
  },
});
