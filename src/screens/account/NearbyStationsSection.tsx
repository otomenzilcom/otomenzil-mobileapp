// Garaj "Yakın şarj istasyonları" bölümü — iOS GarageView §3.2 #2 (odaklı port).
//
// Konum izni (expo-location, requestUserLocation) + il/ilçe seçicileri (WebFilterField) +
// EpdkStationsData ile filtreleme (120 km yarıçap, 8 kayıt). İstasyon önizleme kartları; seçili
// karttan harita deep-link'leri (Google/Yandex/Apple). Tam liste için stations rotasına link.
//
// NOT: Detaylı istasyon paneli ve tam istasyon deneyimi ayrı `stations` rotasındadır (Wave 5b);
// burada garaj bağlamında özet + yönlendirme sağlanır.

import { useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Icon, WebFilterField, type FilterOption } from '../../components';
import type { CarSummary } from '../../models';
import { useNavigationStore } from '../../stores';
import { gradients, radii, useTheme, webFont } from '../../theme';
import { EpdkStationsData } from '../../utils/epdkStationsData';
import { requestUserLocation, type Coordinate } from '../../utils/userLocationService';

const STATION_LIMIT = 8;

function displayTitle(car: CarSummary): string {
  return car.model.toLowerCase().startsWith(car.brand.toLowerCase())
    ? car.model
    : `${car.brand} ${car.model}`;
}

export function NearbyStationsSection({ car }: { car: CarSummary }): React.JSX.Element {
  const { colors } = useTheme();
  const [coord, setCoord] = useState<Coordinate | null>(null);
  const [locating, setLocating] = useState(false);
  const [denied, setDenied] = useState(false);
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('Tümü');
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);

  const cityOptions = useMemo<FilterOption[]>(
    () => [
      { value: '', label: 'İl seçin (isteğe bağlı)' },
      ...EpdkStationsData.cities().map((c) => ({ value: c, label: `🇹🇷 ${c}` })),
    ],
    [],
  );

  const districtOptions = useMemo<FilterOption[]>(() => {
    if (city.length === 0) return [{ value: 'Tümü', label: '📍 Tüm ilçeler' }];
    return [
      { value: 'Tümü', label: '📍 Tüm ilçeler' },
      ...EpdkStationsData.districts(city).map((d) => ({ value: d, label: `📍 ${d}` })),
    ];
  }, [city]);

  const stations = useMemo(
    () =>
      EpdkStationsData.filteredNearbyStations(
        city,
        district,
        coord?.latitude,
        coord?.longitude,
        STATION_LIMIT,
      ),
    [city, district, coord],
  );

  const statusLine = denied
    ? "Konum izni kapalı — Ayarlar'dan açın"
    : coord
      ? 'Konumunuza göre sıralandı'
      : city.length > 0
        ? `${city} bölgesindeki istasyonlar`
        : 'Konum veya il seçerek istasyonları görün';

  const updateLocation = async (): Promise<void> => {
    setLocating(true);
    const feedback = await requestUserLocation();
    setLocating(false);
    switch (feedback.kind) {
      case 'success':
        setDenied(false);
        setCoord({ latitude: feedback.latitude, longitude: feedback.longitude });
        Alert.alert('Konum güncellendi', 'Konum güncellendi.', [{ text: 'Tamam' }]);
        break;
      case 'denied':
        setDenied(true);
        Alert.alert(
          'Konum güncellenemedi',
          'Konum izni reddedildi. Ayarlar → Oto Menzil → Konum → «Uygulama Kullanılırken» seçeneğini açın.',
          [{ text: 'Tamam' }],
        );
        break;
      case 'timeout':
        Alert.alert(
          'Konum güncellenemedi',
          'Konum isteği zaman aşımına uğradı. GPS sinyalinizi kontrol edip tekrar deneyin.',
          [{ text: 'Tamam' }],
        );
        break;
      case 'outsideTurkey':
        Alert.alert(
          'Konum güncellenemedi',
          'Konumunuz Türkiye dışında görünüyor. Simülatör kullanıyorsanız Features → Location → Custom Location ile Türkiye koordinatı seçin.',
          [{ text: 'Tamam' }],
        );
        break;
      case 'unavailable':
        Alert.alert('Konum güncellenemedi', feedback.message, [{ text: 'Tamam' }]);
        break;
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      {/* Emerald gradient header */}
      <LinearGradient
        colors={gradients.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Icon name="bolt" size={18} color="#FFFFFF" />
        <View style={styles.headerText}>
          <Text style={[webFont(15, 900), { color: '#FFFFFF' }]}>{displayTitle(car)}</Text>
          <Text style={[webFont(11, 700), { color: 'rgba(255,255,255,0.9)' }]}>
            Yakın şarj istasyonları
          </Text>
          <Text style={[webFont(10, 500), { color: 'rgba(255,255,255,0.8)' }]}>{statusLine}</Text>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        {/* Selectors */}
        <View style={styles.selectors}>
          <View style={styles.selectorFlex}>
            <WebFilterField title="İl" value={city} options={cityOptions} onChange={(v) => {
              setCity(v);
              setDistrict('Tümü');
            }} />
          </View>
          <View style={styles.selectorFlex}>
            <WebFilterField
              title="İlçe"
              value={district}
              options={districtOptions}
              onChange={setDistrict}
            />
          </View>
        </View>

        <Pressable
          onPress={() => void updateLocation()}
          disabled={locating}
          accessibilityRole="button"
          accessibilityLabel="Konumu güncelle"
          style={({ pressed }) => [
            styles.locButton,
            { backgroundColor: colors.emerald50, borderColor: colors.emerald100, opacity: locating ? 0.6 : pressed ? 0.85 : 1 },
          ]}
        >
          <Icon name="location" size={14} color={colors.emerald700} />
          <Text style={[webFont(12, 800), { color: colors.emerald700 }]}>
            {locating ? 'Konum alınıyor…' : 'Konumu güncelle'}
          </Text>
        </Pressable>

        {/* Station preview cards */}
        {stations.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="location" size={22} color={colors.stone400} />
            <Text style={[webFont(12, 600), styles.centered, { color: colors.stone500 }]}>
              {denied
                ? 'Yakın istasyonları görmek için konum izni gerekli.'
                : city.length > 0
                  ? 'Seçilen bölgede istasyon bulunamadı. İlçe filtresini genişletin.'
                  : 'Konum izni verin veya yukarıdan il seçerek istasyonları listeleyin.'}
            </Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stationRow}>
            {stations.map((station) => {
              const id = `${station.stationName}-${station.latitude}-${station.longitude}`;
              const selected = id === selectedStationId;
              const initial = (station.operatorName.trim()[0] ?? '?').toUpperCase();
              const distance = coord
                ? EpdkStationsData.formattedDistance(coord.latitude, coord.longitude, station)
                : null;
              const sockets = EpdkStationsData.licensedSocketCount(station);
              const power = EpdkStationsData.formatStationPowerLabel(station);
              return (
                <Pressable
                  key={id}
                  onPress={() => setSelectedStationId(selected ? null : id)}
                  accessibilityRole="button"
                  accessibilityLabel={station.stationName}
                  style={[
                    styles.stationCard,
                    {
                      backgroundColor: colors.inputBackground,
                      borderColor: selected ? colors.emerald600 : colors.border,
                    },
                  ]}
                >
                  <View style={styles.stationHead}>
                    <View style={[styles.opAvatar, { backgroundColor: colors.emerald50 }]}>
                      <Text style={[webFont(13, 900), { color: colors.emerald700 }]}>{initial}</Text>
                    </View>
                    <View style={styles.stationHeadText}>
                      <Text style={[webFont(11, 800), { color: colors.stone900 }]} numberOfLines={1}>
                        {station.operatorName}
                      </Text>
                      <Text style={[webFont(9, 600), { color: colors.stone500 }]} numberOfLines={1}>
                        {station.district}
                      </Text>
                    </View>
                  </View>
                  <Text style={[webFont(11, 700), { color: colors.stone800 }]} numberOfLines={2}>
                    {station.stationName}
                  </Text>
                  <View style={styles.stationMeta}>
                    {distance ? (
                      <Text style={[webFont(9, 700), { color: colors.stone500 }]}>{distance}</Text>
                    ) : null}
                    <View style={styles.powerChip}>
                      <Icon name="bolt" size={9} color={colors.emerald700} />
                      <Text style={[webFont(9, 700), { color: colors.emerald700 }]}>{power}</Text>
                    </View>
                  </View>
                  <View style={[styles.socketPill, { backgroundColor: colors.emerald50 }]}>
                    <Text style={[webFont(9, 800), { color: colors.emerald700 }]}>
                      {sockets} lisanslı soket
                    </Text>
                  </View>

                  {selected ? (
                    <View style={styles.directions}>
                      <DirectionButton
                        label="Google Maps"
                        color="#4285F4"
                        onPress={() =>
                          void Linking.openURL(
                            EpdkStationsData.googleMapsUrl(station, coord?.latitude, coord?.longitude),
                          )
                        }
                      />
                      <DirectionButton
                        label="Yandex"
                        color="#FC3F1D"
                        onPress={() =>
                          void Linking.openURL(
                            EpdkStationsData.yandexMapsUrl(station, coord?.latitude, coord?.longitude),
                          )
                        }
                      />
                      <DirectionButton
                        label="Apple"
                        color={colors.stone700}
                        onPress={() => void Linking.openURL(EpdkStationsData.appleMapsUrl(station))}
                      />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* Footer link */}
        <Pressable
          onPress={() => useNavigationStore.getState().navigate('stations')}
          accessibilityRole="button"
          accessibilityLabel="Tüm şarj istasyonlarını gör"
          style={styles.footerLink}
        >
          <Text style={[webFont(12, 800), { color: colors.emerald600 }]}>
            Tüm şarj istasyonlarını gör →
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function DirectionButton({
  label,
  color,
  onPress,
}: {
  label: string;
  color: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.dirButton, { backgroundColor: color, opacity: pressed ? 0.85 : 1 }]}
    >
      <Icon name="signpost" size={11} color="#FFFFFF" />
      <Text style={[webFont(9, 800), { color: '#FFFFFF' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  body: {
    padding: 16,
    gap: 12,
  },
  selectors: {
    flexDirection: 'row',
    gap: 10,
  },
  selectorFlex: {
    flex: 1,
  },
  locButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radii.button,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
  },
  emptyState: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 20,
  },
  centered: {
    textAlign: 'center',
  },
  stationRow: {
    gap: 10,
    paddingVertical: 2,
  },
  stationCard: {
    width: 200,
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 8,
  },
  stationHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  opAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stationHeadText: {
    flex: 1,
  },
  stationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  powerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  socketPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  directions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  dirButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  footerLink: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
});
