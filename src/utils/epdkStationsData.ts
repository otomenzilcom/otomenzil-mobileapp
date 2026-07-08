// EPDK şarj istasyonu verisi — EpdkStationsData.swift birebir.
// - Seed (8 MB) TEMBEL yüklenir: ilk çağrıda fonksiyon-içi require, modül state'te cache.
// - Sunucu tazeleme: refreshFromServer(fetchStations) enjeksiyonu (src/api'ye bağlı değil);
//   allStations() uzak cache'i yalnız ≤81 şehir sağlıksa tercih eder.
// - Soket-güç çıkarımı, 81 il centroid'i, ağırlıklı ilçe oylaması (3/2/1 @ 8/20/40 km).
// - İlçe listesi bundle turkiye-districts.json'dan (o da tembel yüklenir).

import type {
  DistrictsByCity,
  EPDKOperator,
  EPDKSocket,
  EPDKStation,
  SeedStationDTO,
} from '../models/stations';
import {
  compareLocalizedTr,
  equalsCaseInsensitive,
  equalsCaseInsensitiveTr,
  foldDiacritics,
} from './turkishText';

// ---------------------------------------------------------------------------
// Sabitler
// ---------------------------------------------------------------------------

const INVALID_CITY_NAMES = new Set<string>(['Türkiye', 'Turkiye', '']);

// Türkiye bbox: lat ∈ [35.5, 42.5], lng ∈ [25.0, 45.0].
const TR_LAT_MIN = 35.5;
const TR_LAT_MAX = 42.5;
const TR_LNG_MIN = 25.0;
const TR_LNG_MAX = 45.0;

const EARTH_RADIUS_KM = 6371;

const operators: EPDKOperator[] = [
  { id: 'zes', name: 'ZES (Zorlu Energy)', hotline: '0850 339 99 37', website: 'https://zes.net' },
  { id: 'esarj', name: 'Eşarj (Enerjisa)', hotline: '0850 433 72 75', website: 'https://esarj.com' },
  { id: 'trugo', name: 'Trugo (Togg)', hotline: '0850 250 86 44', website: 'https://www.trugo.com.tr' },
  { id: 'astor', name: 'Astor Enerji Şarj', hotline: '0850 308 30 06', website: 'https://astorsarj.com.tr' },
  { id: 'voltrun', name: 'Voltrun', hotline: '0850 460 63 33', website: 'https://voltrun.com' },
  { id: 'sharz', name: 'Sharz.net', hotline: '0850 840 85 85', website: 'https://sharz.net' },
];

// 81 il centroid'i (Swift EpdkStationsData.swift:473-501 birebir).
const provinceCentroids: [string, number, number][] = [
  ['Adana', 37.0, 35.32], ['Adıyaman', 37.76, 38.28], ['Afyonkarahisar', 38.76, 30.54],
  ['Ağrı', 39.72, 43.05], ['Aksaray', 38.37, 34.03], ['Amasya', 40.65, 35.83],
  ['Ankara', 39.93, 32.86], ['Antalya', 36.89, 30.71], ['Ardahan', 41.11, 42.7],
  ['Artvin', 41.18, 41.82], ['Aydın', 37.85, 27.84], ['Balıkesir', 39.65, 27.89],
  ['Bartın', 41.63, 32.34], ['Batman', 37.88, 41.13], ['Bayburt', 40.26, 40.23],
  ['Bilecik', 40.14, 29.98], ['Bingöl', 38.88, 40.5], ['Bitlis', 38.4, 42.11],
  ['Bolu', 40.74, 31.61], ['Burdur', 37.72, 30.29], ['Bursa', 40.19, 29.06],
  ['Çanakkale', 40.15, 26.41], ['Çankırı', 40.6, 33.62], ['Çorum', 40.55, 34.95],
  ['Denizli', 37.78, 29.09], ['Diyarbakır', 37.91, 40.23], ['Düzce', 40.84, 31.16],
  ['Edirne', 41.68, 26.56], ['Elazığ', 38.67, 39.22], ['Erzincan', 39.75, 39.49],
  ['Erzurum', 39.9, 41.27], ['Eskişehir', 39.78, 30.52], ['Gaziantep', 37.07, 37.38],
  ['Giresun', 40.92, 38.39], ['Gümüşhane', 40.46, 39.48], ['Hakkari', 37.57, 43.74],
  ['Hatay', 36.2, 36.16], ['Iğdır', 39.92, 44.05], ['Isparta', 37.76, 30.56],
  ['İstanbul', 41.01, 28.97], ['İzmir', 38.42, 27.14], ['Kahramanmaraş', 37.58, 36.93],
  ['Karabük', 41.2, 32.63], ['Karaman', 37.18, 33.22], ['Kars', 40.6, 43.1],
  ['Kastamonu', 41.38, 33.78], ['Kayseri', 38.73, 35.48], ['Kilis', 36.72, 37.12],
  ['Kırıkkale', 39.85, 33.51], ['Kırklareli', 41.73, 27.22], ['Kırşehir', 39.15, 34.16],
  ['Kocaeli', 40.77, 29.96], ['Konya', 37.87, 32.48], ['Kütahya', 39.42, 29.98],
  ['Malatya', 38.35, 38.31], ['Manisa', 38.62, 27.43], ['Mardin', 37.31, 40.73],
  ['Mersin', 36.8, 34.64], ['Muğla', 37.22, 28.36], ['Muş', 38.73, 41.49],
  ['Nevşehir', 38.62, 34.72], ['Niğde', 37.97, 34.68], ['Ordu', 40.98, 37.88],
  ['Osmaniye', 37.07, 36.25], ['Rize', 41.02, 40.52], ['Sakarya', 40.78, 30.4],
  ['Samsun', 41.29, 36.33], ['Şanlıurfa', 37.16, 38.79], ['Siirt', 37.93, 41.94],
  ['Sinop', 42.03, 35.15], ['Sivas', 39.75, 37.02], ['Şırnak', 37.52, 42.46],
  ['Tekirdağ', 40.98, 27.51], ['Tokat', 40.31, 36.55], ['Trabzon', 41.0, 39.72],
  ['Tunceli', 39.11, 39.55], ['Uşak', 38.68, 29.41], ['Van', 38.49, 43.38],
  ['Yalova', 40.65, 29.27], ['Yozgat', 39.82, 34.8], ['Zonguldak', 41.45, 31.79],
];

const DISTRICT_BLACKLIST = ['Merkez', 'Türkiye', 'Turkiye', 'Bölge', 'Evleri', 'Kisim', 'Ac', 'Vzx'];

// ---------------------------------------------------------------------------
// Modül state (tembel cache)
// ---------------------------------------------------------------------------

let licensedSeedCache: EPDKStation[] | null = null;
let remoteSeedCache: EPDKStation[] | null = null;
let officialDistrictsCache: DistrictsByCity | null = null;

// ---------------------------------------------------------------------------
// Coğrafi yardımcılar (haversine)
// ---------------------------------------------------------------------------

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isInTurkey(station: EPDKStation): boolean {
  return (
    station.latitude >= TR_LAT_MIN &&
    station.latitude <= TR_LAT_MAX &&
    station.longitude >= TR_LNG_MIN &&
    station.longitude <= TR_LNG_MAX
  );
}

function isInTurkeyCoord(latitude: number, longitude: number): boolean {
  return (
    latitude >= TR_LAT_MIN &&
    latitude <= TR_LAT_MAX &&
    longitude >= TR_LNG_MIN &&
    longitude <= TR_LNG_MAX
  );
}

function distanceKm(latitude: number, longitude: number, station: EPDKStation): number {
  return haversineKm(latitude, longitude, station.latitude, station.longitude);
}

function formattedDistance(latitude: number, longitude: number, station: EPDKStation): string {
  const km = distanceKm(latitude, longitude, station);
  if (km < 1) return `${(km * 1000).toFixed(0)} m`;
  return `${km.toFixed(1)} km`;
}

// ---------------------------------------------------------------------------
// Seed yükleme / normalize / tazeleme
// ---------------------------------------------------------------------------

function parseEpdkId(dto: SeedStationDTO): number {
  if (dto.epdkId != null) return dto.epdkId;
  // Swift `Int(id.replacingOccurrences(of: "epdk-", with: "")) ?? 0` — tüm "epdk-" silinir,
  // TAM sayı değilse 0 (parseInt gibi kısmi ayrıştırma YOK).
  const stripped = dto.id.split('epdk-').join('');
  return /^[+-]?\d+$/.test(stripped) ? parseInt(stripped, 10) : 0;
}

function toStation(dto: SeedStationDTO): EPDKStation {
  return {
    id: dto.id,
    epdkId: parseEpdkId(dto),
    operatorName: dto.operatorName,
    operatorKey: dto.operatorKey,
    stationName: dto.stationName,
    city: dto.city,
    district: dto.district,
    latitude: dto.latitude,
    longitude: dto.longitude,
    address: dto.address,
    sockets: dto.sockets.map(
      (socket): EPDKSocket => ({
        type: socket.type,
        powerKw: Math.round(socket.powerKw),
        count: socket.count,
        socketNumbers: socket.socketNumbers ?? [],
      }),
    ),
    hasAc: dto.hasAc,
    hasDc: dto.hasDc,
    hasHpc: dto.hasHpc,
    maxPowerKw: dto.maxPowerKw,
    serviceType: dto.serviceType,
    phone: dto.phone,
  };
}

/** Bundle seed'i TEMBEL yükler (8 MB) — ilk çağrıda fonksiyon-içi require, sonra cache. */
function loadLicensedSeed(): EPDKStation[] {
  if (licensedSeedCache) return licensedSeedCache;
   
  const raw = require('../../assets/data/epdk-stations-seed.json') as SeedStationDTO[];
  licensedSeedCache = raw.map(toStation);
  return licensedSeedCache;
}

function normalizeCityName(city: string): string {
  const trimmed = city.trim();
  return INVALID_CITY_NAMES.has(trimmed) ? '' : trimmed;
}

function normalizeStation(station: EPDKStation): EPDKStation {
  return {
    ...station,
    stationName: station.stationName.trim(),
    city: normalizeCityName(station.city),
    district: station.district.trim(),
    address: station.address.trim(),
  };
}

/**
 * Sunucu tazelemesi. `fetchStations` GET charging-stations sonucunu (SeedStationDTO[])
 * döndürür — src/api enjeksiyonu. Hata/boş → mevcut cache/seed korunur.
 */
async function refreshFromServer(fetchStations: () => Promise<SeedStationDTO[]>): Promise<void> {
  try {
    const dtos = await fetchStations();
    if (!dtos || dtos.length === 0) return;
    remoteSeedCache = dtos
      .map(toStation)
      .filter((station) => isInTurkey(station) && normalizeCityName(station.city).length > 0);
  } catch {
    // Swift `guard try? ... else return` — sessizce koru.
  }
}

/** Test/warmup için enjekte edilmiş uzak cache (src/api'ye bağımlı olmadan). */
function setRemoteSeedCacheForTesting(stations: EPDKStation[] | null): void {
  remoteSeedCache = stations;
}

function citiesFrom(stations: EPDKStation[]): string[] {
  const set = new Set<string>();
  for (const station of stations) {
    const normalized = normalizeCityName(station.city);
    if (normalized.length > 0) set.add(normalized);
  }
  return Array.from(set).sort(compareLocalizedTr);
}

/** Uzak cache yalnızca ≤81 farklı şehir sağlıklıysa; değilse bundle seed. */
function allStations(): EPDKStation[] {
  if (remoteSeedCache && remoteSeedCache.length > 0) {
    const normalized = remoteSeedCache.map(normalizeStation);
    if (citiesFrom(normalized).length <= 81) {
      return normalized;
    }
  }
  return loadLicensedSeed();
}

function citiesList(): string[] {
  return citiesFrom(allStations());
}

// ---------------------------------------------------------------------------
// Güç / soket
// ---------------------------------------------------------------------------

function inferSocketPowerKw(socket: EPDKSocket, station: EPDKStation): number {
  if (socket.powerKw > 0) return socket.powerKw;

  const type = socket.type.toUpperCase();
  if (type.includes('TYPE 2') || type === 'TYPE2') return 22;
  if (type.includes('CHADEMO')) return 50;
  if (type.includes('CCS')) return station.hasHpc ? 180 : 120;
  if (station.hasAc && !station.hasDc) return 22;
  if (station.hasHpc) return 180;
  if (station.hasDc) return 120;
  return 22;
}

function isStationPowerVerified(station: EPDKStation): boolean {
  if (station.maxPowerKw > 0) return true;
  return station.sockets.some((socket) => socket.powerKw > 0);
}

function officialMaxPowerKw(station: EPDKStation): number {
  if (station.maxPowerKw > 0) return station.maxPowerKw;
  const powers = station.sockets.map((socket) => socket.powerKw);
  return powers.length > 0 ? Math.max(...powers) : 0;
}

function formatStationPowerLabel(station: EPDKStation): string {
  const kw = officialMaxPowerKw(station);
  return kw > 0 ? `${kw} kW` : 'Belirtilmemiş';
}

function effectiveMaxPowerKw(station: EPDKStation): number {
  if (station.maxPowerKw > 0) return station.maxPowerKw;
  if (station.sockets.length === 0) return 0;
  const powers = station.sockets.map((socket) => inferSocketPowerKw(socket, station));
  return powers.length > 0 ? Math.max(...powers) : 0;
}

function licensedSocketCount(station: EPDKStation): number {
  return station.sockets.reduce((sum, socket) => sum + socket.count, 0);
}

// ---------------------------------------------------------------------------
// İlçe listesi (resmi + fallback)
// ---------------------------------------------------------------------------

function loadOfficialDistricts(): DistrictsByCity {
  if (officialDistrictsCache) return officialDistrictsCache;
   
  const data = require('../../assets/data/turkiye-districts.json') as DistrictsByCity;
  officialDistrictsCache = data;
  return data;
}

function officialDistricts(city: string): string[] {
  const map = loadOfficialDistricts();
  if (Object.prototype.hasOwnProperty.call(map, city)) return map[city];
  const entry = Object.entries(map).find(([name]) => equalsCaseInsensitiveTr(name, city));
  return entry ? entry[1] : [];
}

function parseDistrictFromAddress(address: string, city: string): string | null {
  if (!address.includes('/')) return null;
  const parts = address.split('/').map((part) => part.trim());
  if (parts.length < 2) return null;

  const addrCityRaw = parts[parts.length - 1];
  if (/^\d+$/.test(addrCityRaw) || addrCityRaw.length < 3) return null;
  if (!equalsCaseInsensitive(addrCityRaw, city)) return null;

  const districtPart = parts[parts.length - 2];
  if (districtPart.length > 40 || districtPart.includes(' - ')) return null;

  const tokens = districtPart.split(' ').filter((token) => token.length > 0);
  while (tokens.length > 0 && /^\d+$/.test(tokens[0])) {
    tokens.shift();
  }

  const district = tokens[tokens.length - 1];
  if (district == null || district.length === 0) return null;
  if (/^\d+$/.test(district)) return null;
  if (district.length > 24) return null;
  if (DISTRICT_BLACKLIST.includes(district)) return null;
  return district;
}

function districts(city: string, stations?: EPDKStation[]): string[] {
  const official = officialDistricts(city);
  if (official.length > 0) return official;

  const source = stations ?? allStations();
  const names = new Set<string>();
  for (const station of source) {
    if (station.city !== city) continue;
    const trimmed = station.district.trim();
    if (trimmed.length > 0) names.add(trimmed);
    const parsed = parseDistrictFromAddress(station.address, city);
    if (parsed && parsed.length > 0) names.add(parsed);
  }
  return Array.from(names).sort(compareLocalizedTr);
}

function normalizeDistrictLabel(city: string, district: string, stations: EPDKStation[]): string {
  const trimmed = district.trim();
  if (trimmed.length === 0) return '';

  const official = districts(city, stations);
  if (official.length === 0) return trimmed;
  if (official.includes(trimmed)) return trimmed;

  const fuzzy = official.find((name) => equalsCaseInsensitiveTr(name, trimmed));
  return fuzzy ?? trimmed;
}

// ---------------------------------------------------------------------------
// Yakınlık / coğrafi çözümleme
// ---------------------------------------------------------------------------

function stationsNear(
  latitude: number,
  longitude: number,
  from: EPDKStation[],
  limit = 6,
  maxDistanceKm = 120,
): [EPDKStation, number][] {
  return from
    .filter(isInTurkey)
    .map((station): [EPDKStation, number] => [station, distanceKm(latitude, longitude, station)])
    .filter(([, km]) => km <= maxDistanceKm)
    .sort((a, b) => a[1] - b[1])
    .slice(0, limit);
}

function stationsNearAll(
  latitude: number,
  longitude: number,
  limit = 6,
  maxDistanceKm = 120,
): EPDKStation[] {
  return stationsNear(latitude, longitude, allStations(), limit, maxDistanceKm).map(
    (entry) => entry[0],
  );
}

function resolveCityFromCoords(latitude: number, longitude: number): string {
  let best = 'İstanbul';
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const [city, lat, lng] of provinceCentroids) {
    const distance = haversineKm(latitude, longitude, lat, lng);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = city;
    }
  }
  return best;
}

function resolveDistrictFromNearbyStations(
  city: string,
  stations: EPDKStation[],
  latitude: number,
  longitude: number,
): string {
  const cityStations = stations.filter((station) => station.city === city);
  const pool = cityStations.length === 0 ? stations : cityStations;
  const nearest = stationsNear(latitude, longitude, pool, 12, 40);

  const votes = new Map<string, number>();
  for (const [station, distance] of nearest) {
    const trimmed = station.district.trim();
    const candidate =
      trimmed.length === 0 ? parseDistrictFromAddress(station.address, city) ?? '' : trimmed;
    if (candidate.length === 0) continue;

    const weight = distance <= 8 ? 3 : distance <= 20 ? 2 : 1;
    votes.set(candidate, (votes.get(candidate) ?? 0) + weight);
  }

  let bestDistrict = '';
  let bestScore = 0;
  for (const [district, score] of votes) {
    if (score > bestScore) {
      bestScore = score;
      bestDistrict = district;
    }
  }

  if (bestDistrict.length === 0 && nearest.length > 0 && nearest[0][1] <= 40) {
    const station = nearest[0][0];
    bestDistrict = station.district.trim();
    if (bestDistrict.length === 0) {
      bestDistrict = parseDistrictFromAddress(station.address, city) ?? '';
    }
  }

  return normalizeDistrictLabel(city, bestDistrict, stations);
}

export interface ResolvedGeoArea {
  city: string;
  district: string;
}

function resolveCityDistrictFromGeo(
  stations: EPDKStation[],
  latitude: number,
  longitude: number,
): ResolvedGeoArea | null {
  if (!isInTurkeyCoord(latitude, longitude)) return null;
  const city = resolveCityFromCoords(latitude, longitude);
  const district = resolveDistrictFromNearbyStations(city, stations, latitude, longitude);
  return { city, district };
}

async function resolveDistrictFromReverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string> {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: 'json',
    'accept-language': 'tr',
    zoom: '12',
    addressdetails: '1',
  });
  const url = `https://nominatim.openstreetmap.org/reverse?${params.toString()}`;

  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'OtoMenzil-iOS/1.0' } });
    if (!response.ok) return '';
    const payload = (await response.json()) as {
      address?: Record<string, string | undefined>;
    };
    const address = payload.address ?? {};
    const candidates = [
      address['city_district'],
      address['town'],
      address['suburb'],
      address['county'],
      address['municipality'],
    ];
    for (const candidate of candidates) {
      const trimmed = (candidate ?? '').trim();
      if (trimmed.length > 0) return trimmed;
    }
    return '';
  } catch {
    return '';
  }
}

async function resolveCityDistrictFromGeoAsync(
  stations: EPDKStation[],
  latitude: number,
  longitude: number,
): Promise<ResolvedGeoArea | null> {
  const base = resolveCityDistrictFromGeo(stations, latitude, longitude);
  if (!base) return null;

  let district = base.district;
  if (district.length === 0) {
    district = await resolveDistrictFromReverseGeocode(latitude, longitude);
    district = normalizeDistrictLabel(base.city, district, stations);
  }
  return { city: base.city, district };
}

function pickDistrictSelection(city: string, district: string, stations: EPDKStation[]): string {
  const normalized = normalizeDistrictLabel(city, district, stations);
  return normalized.length === 0 ? 'Tümü' : normalized;
}

// ---------------------------------------------------------------------------
// Filtre / eşleştirme
// ---------------------------------------------------------------------------

function stationMatchesDistrict(station: EPDKStation, city: string, district: string): boolean {
  if (station.city !== city) return false;
  if (district === 'Tümü') return true;

  const needle = foldDiacritics(district);
  const haystack = foldDiacritics(
    `${station.district} ${station.stationName} ${station.address}`,
  );
  return station.district === district || haystack.includes(needle);
}

function filteredNearbyStations(
  city: string,
  district: string,
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  limit = 8,
): EPDKStation[] {
  let pool = allStations();

  if (city.length > 0) {
    pool = pool.filter((station) => station.city === city);
    if (district !== 'Tümü') {
      pool = pool.filter((station) => stationMatchesDistrict(station, city, district));
    }
  }

  if (latitude != null && longitude != null) {
    const source = pool.length === 0 ? allStations() : pool;
    return stationsNear(latitude, longitude, source, limit).map((entry) => entry[0]);
  }

  return pool.slice(0, limit);
}

function stationsForCity(city: string): EPDKStation[] {
  return allStations().filter((station) => station.city === city);
}

// ---------------------------------------------------------------------------
// Harita URL'leri (RN: string döner; virgül encode edilmez — Swift ile eşleşir)
// ---------------------------------------------------------------------------

function googleMapsUrl(station: EPDKStation, originLat?: number, originLng?: number): string {
  let url = `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`;
  if (originLat != null && originLng != null) {
    url += `&origin=${originLat},${originLng}`;
  }
  return url;
}

function yandexMapsUrl(station: EPDKStation, originLat?: number, originLng?: number): string {
  const destination = `${station.latitude},${station.longitude}`;
  if (originLat != null && originLng != null) {
    return `https://yandex.com.tr/maps/?rtext=${originLat},${originLng}~${destination}&rtt=auto`;
  }
  return `https://yandex.com.tr/maps/?rtext=~${destination}&rtt=auto`;
}

function appleMapsUrl(station: EPDKStation): string {
  return `https://maps.apple.com/?daddr=${station.latitude},${station.longitude}&dirflg=d`;
}

export const EpdkStationsData = {
  operators,
  provinceCentroids,
  normalizeCityName,
  normalizeStation,
  stationMatchesDistrict,
  allStations,
  cities: citiesList,
  citiesFrom,
  districts,
  officialDistricts,
  inferSocketPowerKw,
  isStationPowerVerified,
  officialMaxPowerKw,
  formatStationPowerLabel,
  effectiveMaxPowerKw,
  licensedSocketCount,
  pickDistrictSelection,
  resolveCityDistrictFromGeo,
  resolveCityDistrictFromGeoAsync,
  resolveCityFromCoords,
  resolveDistrictFromNearbyStations,
  parseDistrictFromAddress,
  filteredNearbyStations,
  stationsForCity,
  stationsNear,
  stationsNearAll,
  distanceKm,
  formattedDistance,
  haversineKm,
  isInTurkey,
  isInTurkeyCoord,
  googleMapsUrl,
  yandexMapsUrl,
  appleMapsUrl,
  refreshFromServer,
  setRemoteSeedCacheForTesting,
  loadLicensedSeed,
  toStation,
};

// ---------------------------------------------------------------------------
// StationCalculator (aynı dosya) — preset araçlar + basit süre tahmini
// ---------------------------------------------------------------------------

export interface StationVehicleOption {
  id: string;
  label: string;
  batteryKwh: number;
  dcMaxKw: number;
}

const stationVehicles: StationVehicleOption[] = [
  { id: 'togg-t10x', label: 'Togg T10X Long Range', batteryKwh: 88.5, dcMaxKw: 180 },
  { id: 'tesla-my', label: 'Tesla Model Y LR', batteryKwh: 75, dcMaxKw: 250 },
  { id: 'hyundai-ioniq5', label: 'Hyundai Ioniq 5', batteryKwh: 77.4, dcMaxKw: 233 },
  { id: 'byd-atto3', label: 'BYD Atto 3', batteryKwh: 60.5, dcMaxKw: 115 },
  { id: 'custom', label: 'Özel Araç', batteryKwh: 65, dcMaxKw: 150 },
];

function chargeDurationMinutes(
  batteryKwh: number,
  startPercent: number,
  targetPercent: number,
  powerKw: number,
): number {
  const kwh = (batteryKwh * Math.max(0, targetPercent - startPercent)) / 100;
  return Math.max(10, (kwh / Math.max(1, powerKw)) * 60);
}

export const StationCalculator = {
  vehicles: stationVehicles,
  chargeDurationMinutes,
};
