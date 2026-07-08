// StationsScreen — iOS StationsView (route `stations`, spec §9). LİSTE tabanlı (harita YOK).
//
// EpdkStationsData tembel seed + apiClient.fetchChargingStations sunucu tazeleme; UserLocationService
// (expo-location) mesafe sıralaması ve şehir/ilçe otomatik seçimi. İl/İlçe vs Konumum modları,
// güç/operatör/arama filtreleri, sayfalama (8/sayfa), istasyon detayı + Google/Yandex/Apple yol
// tarifi derin bağlantıları, şarj süresi hesaplayıcı (garaj birincil aracı + preset araçlar).
//
// Ekran prop ALMAZ; store'lardan okur. Kendi ScrollView'ı; ek alt padding yok.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { apiClient } from '../../api';
import type { CarSummary } from '../../models/car';
import type { EPDKStation } from '../../models/stations';
import {
  EpdkStationsData,
  StationCalculator,
  type StationVehicleOption,
} from '../../utils/epdkStationsData';
import { GarageChargeCalculator } from '../../utils/garageChargeCalculator';
import { UserLocationService, type Coordinate } from '../../utils/userLocationService';
import { foldDiacritics } from '../../utils/turkishText';
import { useAuthStore, useNavigationStore } from '../../stores';
import { radii, useTheme, webFont } from '../../theme';
import { Icon, Slider, WebFilterField } from '../../components';
import {
  chargeEnergyKwh,
  chargeMinutes,
  computeChargePower,
  type ChargeMode,
} from './stationCalcHelpers';

type BrowseMode = 'city' | 'nearby';
type PowerFilter = 'all' | 'ac' | 'dc' | 'hpc';

const PAGE_SIZE = 8;

const POWER_OPTIONS = [
  { value: 'all', label: 'Tümü (AC & DC & HPC)' },
  { value: 'ac', label: 'AC (22kW)' },
  { value: 'dc', label: 'DC (60-120kW)' },
  { value: 'hpc', label: 'HPC (150kW+)' },
];

const FOOTNOTE =
  'Veriler EPDK Şarj@TR kaynağından alınır. Canlı müsaitlik için EPDK veya operatör uygulamasına bakın.';

interface CalcVehicle extends StationVehicleOption {
  fromGarage?: boolean;
}

export function StationsScreen(): React.JSX.Element {
  const { colors } = useTheme();

  const primaryGarageCarId = useAuthStore((s) => s.primaryGarageCarId);
  const garageCarSummaries = useAuthStore((s) => s.garageCarSummaries);
  const appSettings = useNavigationStore((s) => s.appSettings);
  const homeData = useNavigationStore((s) => s.homeData);
  const settings = appSettings ?? homeData?.settings;

  const locationRef = useRef(new UserLocationService());
  const [dataVersion, setDataVersion] = useState(0); // seed/refresh sonrası yeniden hesaplama tetikleyicisi
  const [coordinate, setCoordinate] = useState<Coordinate | null>(null);
  const [outsideTurkey, setOutsideTurkey] = useState(false);
  const [authDenied, setAuthDenied] = useState(false);
  const [locating, setLocating] = useState(false);

  const [browseMode, setBrowseMode] = useState<BrowseMode>('city');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('Tümü');
  const [powerFilter, setPowerFilter] = useState<PowerFilter>('all');
  const [operatorFilter, setOperatorFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedStation, setSelectedStation] = useState<EPDKStation | null>(null);
  const [page, setPage] = useState(1);

  // Hesaplayıcı. vehicleId null iken varsayılan türetilir (garaj birincil aracı → yoksa preset[0]);
  // kullanıcı seçince sabitlenir — böylece effect'te senkron default set etmeye gerek kalmaz.
  const [chargeMode, setChargeMode] = useState<ChargeMode>('dc');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [startPercent, setStartPercent] = useState(20);
  const [targetPercent, setTargetPercent] = useState(80);

  const scrollRef = useRef<ScrollView>(null);
  const detailY = useRef(0);

  // Garaj birincil aracını hesaplayıcı araç listesine ekle.
  const primaryCar: CarSummary | undefined =
    primaryGarageCarId.length > 0 ? garageCarSummaries[primaryGarageCarId] : undefined;

  const calcVehicles = useMemo<CalcVehicle[]>(() => {
    const base: CalcVehicle[] = StationCalculator.vehicles.map((v) => ({ ...v }));
    if (primaryCar && primaryCar.batteryKwh != null) {
      const garageVehicle: CalcVehicle = {
        id: `garage-${primaryCar.id}`,
        label: `${primaryCar.brand} ${primaryCar.model}`.trim(),
        batteryKwh: primaryCar.batteryKwh,
        dcMaxKw: GarageChargeCalculator.estimateDcMaxKw(primaryCar),
        fromGarage: true,
      };
      return [garageVehicle, ...base];
    }
    return base;
  }, [primaryCar]);

  // Etkin araç: kullanıcı seçimi → garaj birincil aracı → ilk preset. Effect'siz türetilir.
  const vehicleId =
    selectedVehicleId ?? calcVehicles.find((v) => v.fromGarage)?.id ?? calcVehicles[0]?.id ?? '';

  const reloadStations = useCallback(async () => {
    try {
      await EpdkStationsData.refreshFromServer(() => apiClient.fetchChargingStations());
      setDataVersion((v) => v + 1);
    } catch {
      // seed korunur
    }
  }, []);

  // Coğrafi çözümleme — koordinat değişince şehir/ilçe otomatik seç.
  const resolveGeoSelection = useCallback((coord: Coordinate) => {
    void (async () => {
      const stations = EpdkStationsData.allStations();
      const area = await EpdkStationsData.resolveCityDistrictFromGeoAsync(
        stations,
        coord.latitude,
        coord.longitude,
      );
      if (area) {
        setSelectedCity(area.city);
        setSelectedDistrict(EpdkStationsData.pickDistrictSelection(area.city, area.district, stations));
      }
    })();
  }, []);

  const requestLocation = useCallback(
    (withFeedback: boolean) => {
      setLocating(true);
      void locationRef.current.request(withFeedback, (feedback) => {
        setLocating(false);
        if (feedback.kind === 'success') {
          const coord = { latitude: feedback.latitude, longitude: feedback.longitude };
          setCoordinate(coord);
          setOutsideTurkey(false);
          setAuthDenied(false);
          resolveGeoSelection(coord);
          if (withFeedback) {
            const stations = EpdkStationsData.allStations();
            void (async () => {
              const area = await EpdkStationsData.resolveCityDistrictFromGeoAsync(
                stations,
                coord.latitude,
                coord.longitude,
              );
              Alert.alert(
                'Konum güncellendi',
                area
                  ? `Konum güncellendi: ${area.city}${area.district ? ` / ${area.district}` : ''}`
                  : 'Konum güncellendi.',
                [{ text: 'Tamam' }],
              );
            })();
          }
        } else if (feedback.kind === 'outsideTurkey') {
          setOutsideTurkey(true);
          setCoordinate(null);
          if (withFeedback) {
            Alert.alert(
              'Konum güncellenemedi',
              'Konumunuz Türkiye dışında görünüyor. Simülatörde Features → Location ile Türkiye koordinatı seçin.',
              [{ text: 'Tamam' }],
            );
          }
        } else if (feedback.kind === 'denied') {
          setAuthDenied(true);
          setCoordinate(null);
          if (withFeedback) {
            Alert.alert(
              'Konum güncellenemedi',
              'Konum izni reddedildi. Ayarlar → Oto Menzil → Konum iznini açın.',
              [{ text: 'Tamam' }],
            );
          }
        } else if (feedback.kind === 'timeout') {
          if (withFeedback) {
            Alert.alert('Konum güncellenemedi', 'Konum isteği zaman aşımına uğradı. Tekrar deneyin.', [
              { text: 'Tamam' },
            ]);
          }
        } else if (withFeedback) {
          Alert.alert('Konum güncellenemedi', 'Konum alınamadı.', [{ text: 'Tamam' }]);
        }
      });
    },
    [resolveGeoSelection],
  );

  // onAppear: dış sistemlerle senkron (sunucu tazeleme + geolocation isteği). requestLocation
  // içeride yükleme durumunu set eder; bu bilinçli bir dış-sistem senkronudur (effect'in amacı).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reloadStations();
    requestLocation(false);
  }, [reloadStations, requestLocation]);

  // browseMode değişince sayfa/seçim sıfırla; nearby'e geçişte konum yoksa yeniden iste
  // (kullanıcı-güdümlü mod değişimine tepki — reset-on-prop-change).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
    setSelectedStation(null);
    if (browseMode === 'nearby' && coordinate == null && !authDenied) requestLocation(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browseMode]);

  // Şehir değişince ilçe/sayfa/seçim sıfırla (reset-on-prop-change).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedDistrict('Tümü');
    setPage(1);
    setSelectedStation(null);
  }, [selectedCity]);

  // Şehir/ilçe/operatör listeleri. dataVersion, sunucu tazelemesi sonrası modül önbelleğinden
  // yeniden okumak için bilinçli bir tetikleyicidir (fonksiyon çıktısı ref-eşit değildir).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cities = useMemo(() => EpdkStationsData.cities(), [dataVersion]);
  const districts = useMemo(
    () => (selectedCity.length > 0 ? EpdkStationsData.districts(selectedCity) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedCity, dataVersion],
  );
  const operators = useMemo(() => EpdkStationsData.operators, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const totalStationCount = useMemo(() => EpdkStationsData.allStations().length, [dataVersion]);

  // Filtre boru hattı.
  const filtered = useMemo(() => {
    let base: EPDKStation[];
    if (browseMode === 'city') {
      base = selectedCity.length > 0 ? EpdkStationsData.stationsForCity(selectedCity) : [];
    } else if (coordinate) {
      base = EpdkStationsData.stationsNearAll(coordinate.latitude, coordinate.longitude, 120, 120);
    } else {
      base = [];
    }

    const q = foldDiacritics(search.trim());
    return base.filter((station) => {
      if (q.length > 0) {
        const haystack = foldDiacritics(`${station.stationName} ${station.address}`);
        if (!haystack.includes(q)) return false;
      }
      if (browseMode === 'city' && selectedDistrict !== 'Tümü') {
        if (!EpdkStationsData.stationMatchesDistrict(station, selectedCity, selectedDistrict)) return false;
      }
      if (operatorFilter !== 'all' && station.operatorKey !== operatorFilter) return false;
      if (powerFilter === 'ac' && !(station.hasAc && !station.hasDc)) return false;
      if (powerFilter === 'dc' && !(station.hasDc && !station.hasHpc)) return false;
      if (powerFilter === 'hpc' && !station.hasHpc) return false;
      return true;
    });
    // dataVersion: sunucu tazelemesi sonrası modül önbelleğinden yeniden hesaplama tetikleyicisi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browseMode, selectedCity, selectedDistrict, coordinate, search, operatorFilter, powerFilter, dataVersion]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const paged = filtered.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

  const operatorCount = operators.length;

  const cityCountLabel = locating && cities.length === 0 ? '…' : String(cities.length);

  const selectStation = (station: EPDKStation): void => {
    setSelectedStation(station);
    setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, detailY.current - 12), animated: true }), 60);
  };

  const selectedVehicle = calcVehicles.find((v) => v.id === vehicleId) ?? calcVehicles[0];
  const power = computeChargePower(chargeMode, selectedVehicle, selectedStation);
  const energyKwh =
    selectedVehicle != null
      ? chargeEnergyKwh(selectedVehicle.batteryKwh, startPercent, targetPercent)
      : 0;
  const minutes = chargeMinutes(energyKwh, power);

  return (
    <ScrollView
      ref={scrollRef}
      style={{ backgroundColor: colors.pageBackground }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <LinearGradient
        colors={['#166534', '#0F766E', colors.stone950]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={[webFont(10, 900), { color: '#A7F3D0', letterSpacing: 0.8 }]}>
          EPDK LİSANSLI · {cityCountLabel} İL
        </Text>
        <Text style={[webFont(22, 900), { color: '#FFFFFF' }]}>Şarj İstasyonları Haritası</Text>
        <Text style={[webFont(12, 500), { color: 'rgba(255,255,255,0.85)' }]}>
          {settings?.stationsSyncMessage ??
            'Lisanslı soket sayısı ve güç bilgisi EPDK kayıtlarından gelir.'}
        </Text>
      </LinearGradient>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatChip value={String(totalStationCount)} label="EPDK" />
        <StatChip value={String(filtered.length)} label="FİLTRELİ" />
        <StatChip value={String(operatorCount)} label="OPERATÖR" />
      </View>

      {/* Location selector */}
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <Text style={[webFont(10, 900), { color: colors.stone500, letterSpacing: 0.4 }]}>İSTASYON ARAMA</Text>
        <Segmented
          options={[
            { value: 'city', label: 'İl / İlçe' },
            { value: 'nearby', label: 'Konumum' },
          ]}
          value={browseMode}
          onChange={(v) => setBrowseMode(v as BrowseMode)}
        />

        {browseMode === 'city' ? (
          <>
            {outsideTurkey ? (
              <Text style={[webFont(11, 600), { color: colors.amber800 }]}>
                ⚠ Konumunuz Türkiye dışında görünüyor. Oto Menzil yalnızca Türkiye sınırları içindeki EPDK
                istasyonlarını listeler.
              </Text>
            ) : coordinate ? (
              <Text style={[webFont(11, 600), { color: colors.emerald700 }]}>
                📍 Konumunuza göre {selectedCity.length > 0 ? selectedCity : 'il'} seçildi.
              </Text>
            ) : null}
            <WebFilterField
              title="İl"
              value={selectedCity}
              options={[
                { value: '', label: '🇹🇷 İl seçin' },
                ...cities.map((c) => ({ value: c, label: `🇹🇷 ${c}` })),
              ]}
              onChange={setSelectedCity}
            />
            <WebFilterField
              title="İlçe"
              value={selectedDistrict}
              options={[
                { value: 'Tümü', label: '📍 Tüm İlçeler' },
                ...districts.map((d) => ({ value: d, label: d })),
              ]}
              onChange={setSelectedDistrict}
            />
          </>
        ) : (
          <View style={[styles.nearbyBox, { backgroundColor: colors.stone50 }]}>
            {outsideTurkey ? (
              <Text style={[webFont(11, 600), { color: colors.amber800 }]}>
                Konumunuz Türkiye dışında görünüyor.
              </Text>
            ) : coordinate ? (
              <Text style={[webFont(11, 600), { color: colors.emerald700 }]}>
                📍 Konumunuza göre en yakın istasyonlar listeleniyor
              </Text>
            ) : authDenied ? (
              <Text style={[webFont(11, 600), { color: colors.amber800 }]}>
                Konum izni kapalı. Ayarlar → Oto Menzil → Konum iznini açın.
              </Text>
            ) : (
              <Text style={[webFont(11, 600), { color: colors.stone500 }]}>Konum alınıyor…</Text>
            )}
          </View>
        )}

        <Pressable
          onPress={() => requestLocation(true)}
          accessibilityRole="button"
          accessibilityLabel="Konumu güncelle"
        >
          <Text style={[webFont(10, 900), { color: colors.emerald700 }]}>Konumu güncelle</Text>
        </Pressable>

        {/* Status strip */}
        <View style={[styles.statusStrip, { backgroundColor: colors.stone50 }]}>
          <View style={[styles.dot, { backgroundColor: colors.emerald500 }]} />
          <Text style={[webFont(11, 600), styles.statusText, { color: colors.stone600 }]}>
            {browseMode === 'nearby'
              ? 'Konuma göre sıralı'
              : selectedDistrict === 'Tümü'
                ? 'Şehir genelinde'
                : `${selectedDistrict} ilçesinde`}
          </Text>
          <Text style={[webFont(11, 700), { color: colors.emerald700 }]}>{filtered.length} istasyon</Text>
        </View>

        <Text style={[webFont(9, 500), { color: colors.stone400 }]}>{FOOTNOTE}</Text>
      </View>

      {/* Filters */}
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <Text style={[webFont(10, 900), { color: colors.stone500, letterSpacing: 0.4 }]}>
          GELİŞMİŞ İSTASYON FİLTRELERİ
        </Text>
        <View style={styles.filterRow}>
          <View style={styles.filterHalf}>
            <WebFilterField
              title="Güç Soket Tipi"
              value={powerFilter}
              options={POWER_OPTIONS}
              onChange={(v) => setPowerFilter(v as PowerFilter)}
            />
          </View>
          <View style={styles.filterHalf}>
            <WebFilterField
              title="Operatör"
              value={operatorFilter}
              options={[
                { value: 'all', label: 'Tümü' },
                ...operators.map((op) => ({ value: op.id, label: op.name.split(' ')[0] })),
              ]}
              onChange={setOperatorFilter}
            />
          </View>
        </View>
        <TextInput
          value={search}
          onChangeText={(t) => {
            setSearch(t);
            setPage(1);
          }}
          placeholder="İlçe, cadde, otel/AVM veya istasyon ara…"
          placeholderTextColor={colors.stone400}
          style={[styles.searchInput, { backgroundColor: colors.stone50, borderColor: colors.border, color: colors.stone900 }]}
        />
      </View>

      {/* Station list */}
      {paged.map((station) => (
        <StationRow
          key={station.id}
          station={station}
          selected={selectedStation?.id === station.id}
          distanceLabel={
            browseMode === 'nearby' && coordinate
              ? EpdkStationsData.formattedDistance(coordinate.latitude, coordinate.longitude, station)
              : null
          }
          onPress={() => selectStation(station)}
        />
      ))}
      {filtered.length === 0 ? (
        <Text style={[webFont(12, 500), styles.emptyList, { color: colors.stone500 }]}>
          {browseMode === 'city' && selectedCity.length === 0
            ? 'İstasyonları görmek için bir il seçin.'
            : 'Filtrenize uyan istasyon bulunamadı.'}
        </Text>
      ) : null}

      {/* Pager */}
      {totalPages > 1 ? (
        <View style={styles.pager}>
          <Pressable
            onPress={() => setPage((p) => Math.max(1, p - 1))}
            disabled={clampedPage <= 1}
            accessibilityRole="button"
            accessibilityLabel="Önceki"
            style={[styles.pagerButton, { borderColor: colors.border, opacity: clampedPage <= 1 ? 0.4 : 1 }]}
          >
            <Icon name="chevron-back" size={16} color={colors.stone700} />
          </Pressable>
          <Text style={[webFont(12, 800), { color: colors.stone800 }]}>Sayfa {clampedPage}</Text>
          <Pressable
            onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={clampedPage >= totalPages}
            accessibilityRole="button"
            accessibilityLabel="Sonraki"
            style={[styles.pagerButton, { borderColor: colors.border, opacity: clampedPage >= totalPages ? 0.4 : 1 }]}
          >
            <Icon name="chevron-forward" size={16} color={colors.stone700} />
          </Pressable>
        </View>
      ) : null}

      {/* Station detail */}
      {selectedStation ? (
        <View onLayout={(e) => { detailY.current = e.nativeEvent.layout.y; }}>
          <StationDetail station={selectedStation} origin={coordinate} />
        </View>
      ) : null}

      {/* Charge calculator */}
      <ChargeCalculator
        chargeMode={chargeMode}
        onChangeMode={setChargeMode}
        vehicles={calcVehicles}
        vehicleId={selectedVehicle?.id ?? ''}
        onChangeVehicle={setSelectedVehicleId}
        startPercent={startPercent}
        targetPercent={targetPercent}
        onChangeStart={(v) => {
          setStartPercent(v);
          if (targetPercent <= v) setTargetPercent(Math.min(100, v + 5));
        }}
        onChangeTarget={setTargetPercent}
        energyKwh={energyKwh}
        minutes={minutes}
      />
    </ScrollView>
  );
}

// ── Segmented control ────────────────────────────────────────────────────────────────

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: colors.stone50 }]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="button"
            accessibilityLabel={opt.label}
            style={[styles.segment, active && { backgroundColor: colors.stone950 }]}
          >
            <Text style={[webFont(12, 800), { color: active ? '#FFFFFF' : colors.stone600 }]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function StatChip({ value, label }: { value: string; label: string }): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={[styles.statChip, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <Text style={[webFont(18, 900), { color: colors.stone900 }]}>{value}</Text>
      <Text style={[webFont(9, 800), { color: colors.stone500, letterSpacing: 0.4 }]}>{label}</Text>
    </View>
  );
}

function StationRow({
  station,
  selected,
  distanceLabel,
  onPress,
}: {
  station: EPDKStation;
  selected: boolean;
  distanceLabel: string | null;
  onPress: () => void;
}): React.JSX.Element {
  const { colors } = useTheme();
  const powerLabel = EpdkStationsData.formatStationPowerLabel(station);
  const socketCount = EpdkStationsData.licensedSocketCount(station);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={station.stationName}
      style={[
        styles.stationRow,
        selected
          ? { backgroundColor: colors.emerald50, borderColor: colors.emerald250 }
          : { backgroundColor: colors.cardBackground, borderColor: colors.border },
      ]}
    >
      <View style={styles.stationInfo}>
        <Text style={[webFont(10, 900), { color: colors.emerald600 }]}>{station.operatorName}</Text>
        <Text style={[webFont(14, 900), { color: colors.stone900 }]} numberOfLines={1}>
          {station.stationName}
        </Text>
        <Text style={[webFont(11, 500), { color: colors.stone500 }]}>
          {station.district}, {station.city}
        </Text>
        {distanceLabel ? (
          <Text style={[webFont(10, 900), { color: colors.emerald700 }]}>{distanceLabel}</Text>
        ) : null}
        <View style={styles.stationBadges}>
          <View style={[styles.stationBadge, { backgroundColor: colors.stone50 }]}>
            <Text style={[webFont(9, 800), { color: colors.stone600 }]}>{powerLabel}</Text>
          </View>
          <View style={[styles.stationBadge, { backgroundColor: colors.stone50 }]}>
            <Text style={[webFont(9, 800), { color: colors.stone600 }]}>{socketCount} lisanslı soket</Text>
          </View>
        </View>
      </View>
      <Icon name="chevron-forward" size={16} color={colors.stone400} />
    </Pressable>
  );
}

function StationDetail({
  station,
  origin,
}: {
  station: EPDKStation;
  origin: Coordinate | null;
}): React.JSX.Element {
  const { colors } = useTheme();
  const originLat = origin?.latitude;
  const originLng = origin?.longitude;

  const maps: { label: string; badge: string; badgeColor: string; url: string }[] = [
    {
      label: 'Google Maps',
      badge: 'G',
      badgeColor: '#4285F4',
      url: EpdkStationsData.googleMapsUrl(station, originLat, originLng),
    },
    {
      label: 'Yandex Navigasyon',
      badge: 'Y',
      badgeColor: '#FC3F1D',
      url: EpdkStationsData.yandexMapsUrl(station, originLat, originLng),
    },
    {
      label: 'Apple Haritalar',
      badge: '',
      badgeColor: colors.stone800,
      url: EpdkStationsData.appleMapsUrl(station),
    },
  ];

  return (
    <View style={[styles.detailCard, { backgroundColor: colors.cardBackground, borderColor: colors.emerald100 }]}>
      <Text style={[webFont(10, 900), { color: colors.emerald600, letterSpacing: 0.4 }]}>İSTASYON DETAYI</Text>
      <Text style={[webFont(18, 900), { color: colors.stone900 }]}>{station.stationName}</Text>
      <Text style={[webFont(12, 500), { color: colors.stone500 }]}>{station.address}</Text>
      <Text style={[webFont(11, 600), { color: colors.stone600 }]}>EPDK Kayıt: {station.epdkId}</Text>

      <View style={styles.socketList}>
        {station.sockets.map((socket, i) => (
          <View key={`${socket.type}-${i}`} style={[styles.socketRow, { borderColor: colors.borderLight }]}>
            <Text style={[webFont(12, 700), { color: colors.stone800 }]}>
              {socket.type} · {socket.powerKw} kW
            </Text>
            <Text style={[webFont(11, 800), { color: colors.emerald700 }]}>{socket.count} adet (lisanslı)</Text>
          </View>
        ))}
      </View>

      <View style={[styles.directionsBox, { backgroundColor: colors.stone50 }]}>
        <Text style={[webFont(13, 900), { color: colors.stone900 }]}>Yol Tarifi Al</Text>
        <Text style={[webFont(11, 500), { color: colors.stone500 }]}>
          Harita uygulamanızda doğru adresle navigasyonu açın.
        </Text>
        {maps.map((m) => (
          <Pressable
            key={m.label}
            onPress={() => void Linking.openURL(m.url)}
            accessibilityRole="button"
            accessibilityLabel={m.label}
            style={[styles.mapButton, { borderColor: colors.border }]}
          >
            <View style={[styles.mapBadge, { backgroundColor: m.badgeColor }]}>
              <Text style={[webFont(11, 900), { color: '#FFFFFF' }]}>{m.badge}</Text>
            </View>
            <Text style={[webFont(12, 700), styles.mapLabel, { color: colors.stone800 }]}>{m.label}</Text>
            <Icon name="arrow-forward" size={14} color={colors.stone500} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function ChargeCalculator({
  chargeMode,
  onChangeMode,
  vehicles,
  vehicleId,
  onChangeVehicle,
  startPercent,
  targetPercent,
  onChangeStart,
  onChangeTarget,
  energyKwh,
  minutes,
}: {
  chargeMode: ChargeMode;
  onChangeMode: (m: ChargeMode) => void;
  vehicles: CalcVehicle[];
  vehicleId: string;
  onChangeVehicle: (id: string) => void;
  startPercent: number;
  targetPercent: number;
  onChangeStart: (v: number) => void;
  onChangeTarget: (v: number) => void;
  energyKwh: number;
  minutes: number;
}): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <Text style={[webFont(10, 900), { color: colors.emerald600, letterSpacing: 0.4 }]}>ŞARJ SÜRESİ TAHMİNİ</Text>
      <Segmented
        options={[
          { value: 'ac', label: 'AC' },
          { value: 'dc', label: 'DC' },
          { value: 'hpc', label: 'HPC' },
        ]}
        value={chargeMode}
        onChange={(v) => onChangeMode(v as ChargeMode)}
      />
      <WebFilterField
        title="Araç Seçin"
        value={vehicleId}
        options={vehicles.map((v) => ({ value: v.id, label: v.label }))}
        onChange={onChangeVehicle}
      />
      <PercentRow label="Başlangıç" value={startPercent} max={95} onChange={onChangeStart} />
      <PercentRow label="Hedef" value={targetPercent} max={100} onChange={onChangeTarget} />
      <View style={[styles.calcResult, { backgroundColor: colors.emerald50 }]}>
        <Text style={[webFont(20, 900), { color: colors.emerald700 }]}>{energyKwh.toFixed(1)} kWh</Text>
        <Text style={[webFont(11, 500), { color: colors.emerald700 }]}>
          Tahmini süre: {Math.round(minutes)} dk · Güncel tarife için EPDK/operatör uygulaması
        </Text>
      </View>
    </View>
  );
}

function PercentRow({
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
    <View style={styles.percentRow}>
      <View style={styles.percentLabelRow}>
        <Text style={[webFont(10, 900), { color: colors.stone500, letterSpacing: 0.4 }]}>
          {label.toUpperCase()}
        </Text>
        <Text style={[webFont(11, 800), { color: colors.emerald700 }]}>%{value}</Text>
      </View>
      <Slider
        value={value}
        minimumValue={0}
        maximumValue={max}
        step={5}
        onValueChange={onChange}
        minimumTrackTintColor={colors.emerald500}
        maximumTrackTintColor={colors.stone300}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16,
  },
  hero: {
    borderRadius: radii.card,
    padding: 20,
    gap: 6,
    minHeight: 160,
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statChip: {
    flex: 1,
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    alignItems: 'center',
    gap: 2,
  },
  card: {
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: radii.button,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    borderRadius: 9,
    paddingVertical: 8,
    alignItems: 'center',
  },
  nearbyBox: {
    borderRadius: 14,
    padding: 12,
  },
  statusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    flex: 1,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
  },
  filterHalf: {
    flex: 1,
  },
  searchInput: {
    borderRadius: radii.button,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  stationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  stationInfo: {
    flex: 1,
    gap: 3,
  },
  stationBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  stationBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  emptyList: {
    textAlign: 'center',
    paddingVertical: 24,
  },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  pagerButton: {
    width: 44,
    height: 40,
    borderRadius: radii.button,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCard: {
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 8,
  },
  socketList: {
    gap: 2,
  },
  socketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  directionsBox: {
    borderRadius: radii.inner,
    padding: 14,
    gap: 8,
    marginTop: 4,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radii.button,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  mapBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapLabel: {
    flex: 1,
  },
  calcResult: {
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  percentRow: {
    gap: 6,
  },
  percentLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
