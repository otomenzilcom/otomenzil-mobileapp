// GarageHomeSection — iOS GarageHomeSection (spec §10). WebHomeView'in üstüne gömülü garaj paneli.
//
// SÖZLEŞME: WebHomeScreen bu bileşeni doğrudan tüketir. Props: `onOpenGarage`
// (store.navigate('garage')) ve `onLogin` (auth.openAuth("Aracını garajına eklemek için giriş
// yapın.")). Kendi verisini auth store'dan okur.
//
// Dallanma: (1) ziyaretçi → guest; (2) girişli + garaj boş → empty; (3) birincil araç var → primary
// widget; (4) id'ler var ama özet çözülmemiş → loading. Tüm varyantlar koyu shell (stone950→stone900
// →emerald950 gradient + sağ-üst emerald radyal parıltı + alt kenarlık).

import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import type { CarSummary } from '../../models/car';
import { GarageChargeCalculator } from '../../utils/garageChargeCalculator';
import { useAuthStore } from '../../stores';
import { radii, useTheme, webFont } from '../../theme';
import {
  CachedImage,
  Icon,
  WebFeatureCard,
  type IconName,
  type WebFeatureCardProps,
} from '../../components';

export interface GarageHomeSectionProps {
  /** store.navigate('garage') — birincil araç widget'ı ve boş durum CTA'sı. */
  onOpenGarage: () => void;
  /** auth.openAuth('Aracını garajına eklemek için giriş yapın.') — ziyaretçi CTA'sı. */
  onLogin: () => void;
}

/** Swift CarSummary.displayTitle. */
function displayTitle(car: CarSummary): string {
  return car.model.toLowerCase().startsWith(car.brand.toLowerCase())
    ? car.model
    : `${car.brand} ${car.model}`;
}

export function GarageHomeSection({ onOpenGarage, onLogin }: GarageHomeSectionProps): React.JSX.Element {
  const isLoggedIn = useAuthStore((s) => s.currentUser !== null);
  const garageCarIds = useAuthStore((s) => s.garageCarIds);
  const primaryGarageCarId = useAuthStore((s) => s.primaryGarageCarId);
  const garageCarSummaries = useAuthStore((s) => s.garageCarSummaries);

  const primaryCar =
    primaryGarageCarId.length > 0 ? garageCarSummaries[primaryGarageCarId] : undefined;

  let content: React.JSX.Element;
  if (!isLoggedIn) {
    content = <GuestVariant onLogin={onLogin} />;
  } else if (garageCarIds.length === 0) {
    content = <EmptyVariant onOpenGarage={onOpenGarage} />;
  } else if (primaryCar) {
    content = (
      <PrimaryVariant car={primaryCar} carCount={garageCarIds.length} onOpenGarage={onOpenGarage} />
    );
  } else {
    content = <LoadingVariant count={garageCarIds.length} />;
  }

  return <DarkShell>{content}</DarkShell>;
}

// ── Ortak koyu shell ─────────────────────────────────────────────────────────────────

function DarkShell({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <LinearGradient
      colors={[colors.stone950, colors.stone900, colors.emerald950]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.shell, { borderBottomColor: colors.border }]}
    >
      <LinearGradient
        colors={['rgba(22,163,74,0.3)', 'rgba(22,163,74,0)']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.2, y: 0.6 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.shellBody}>{children}</View>
    </LinearGradient>
  );
}

function BadgeCapsule({ text }: { text: string }): React.JSX.Element {
  return (
    <View style={styles.badge}>
      <Icon name="sparkles" size={12} color="#A7F3D0" />
      <Text style={[webFont(10, 900), { color: '#A7F3D0', letterSpacing: 0.5 }]}>
        {text.toUpperCase()}
      </Text>
    </View>
  );
}

// ── Guest (minHeight 320) ────────────────────────────────────────────────────────────

const GUEST_FEATURES: WebFeatureCardProps[] = [
  {
    icon: 'car',
    title: 'Garajına aracını ekle',
    text: 'Kullandığınız EV modelini kaydedin; menzil, batarya ve şarj verileri size özel hesaplansın.',
    darkSurface: true,
  },
  {
    icon: 'star',
    title: 'Ana aracını belirle',
    text: 'Birden fazla aracınız varsa birini ana araç seçin — ana sayfa ve hesaplamalar buna göre açılır.',
    darkSurface: true,
  },
  {
    icon: 'location',
    title: 'Yakın istasyonları gör',
    text: 'Konumunuza göre EPDK lisanslı şarj noktaları ve Google · Apple · Yandex yol tarifi.',
    darkSurface: true,
  },
  {
    icon: 'compare',
    title: 'Katalog ve karşılaştırma',
    text: 'Üye olmadan da araçları inceleyebilirsiniz; garaj ise sahip olduğunuz aracı takip etmek içindir.',
    darkSurface: true,
  },
];

function GuestVariant({ onLogin }: { onLogin: () => void }): React.JSX.Element {
  return (
    <View style={styles.guest}>
      <BadgeCapsule text="Oto Menzil Garaj" />
      <Text style={[webFont(24, 900), { color: '#FFFFFF' }]}>
        Elektrikli aracınız için menzil, şarj ve garaj merkezi
      </Text>
      <Text style={[webFont(12, 500), { color: '#D6D3D1' }]}>
        Ücretsiz üyelikle aracınızı garajınıza ekleyin; WLTP menzili, yakın şarj istasyonları ve port
        bazlı dolum süresini tek panelden takip edin. Katalog, karşılaştırma ve haberler herkese açık.
      </Text>
      <Pressable
        onPress={onLogin}
        accessibilityRole="button"
        accessibilityLabel="Giriş Yap"
        style={styles.guestCta}
      >
        <Icon name="login" size={15} color="#0C0A09" />
        <Text style={[webFont(12, 900), { color: '#0C0A09', letterSpacing: 0.4 }]}>
          Giriş Yap · Aracını Garajına Ekle
        </Text>
      </Pressable>
      <View style={styles.featureGrid}>
        {GUEST_FEATURES.map((f) => (
          <View key={f.title} style={styles.featureGridItem}>
            <WebFeatureCard {...f} />
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Logged-in empty ──────────────────────────────────────────────────────────────────

const EMPTY_FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'car', title: 'Araç seç', text: 'Katalogdan sahip olduğun modeli bul ve garajına ekle.' },
  { icon: 'star', title: 'Ana aracı belirle', text: 'Birden fazla aracın varsa birini ana araç yap.' },
  { icon: 'location', title: 'İstasyonları gör', text: 'Konumuna göre yakın şarj noktalarını aç.' },
];

function EmptyVariant({ onOpenGarage }: { onOpenGarage: () => void }): React.JSX.Element {
  return (
    <View style={styles.guest}>
      <BadgeCapsule text="Garajın Boş" />
      <Text style={[webFont(22, 900), { color: '#FFFFFF' }]}>
        Aracını garajına ekle, kişisel menzil merkezini aç
      </Text>
      <Text style={[webFont(12, 500), { color: '#D6D3D1' }]}>
        Katalogdan kullandığın EV modelini seç; WLTP menzili, yakın istasyonlar ve port bazlı şarj
        süresi hesapları profiline özel çalışsın.
      </Text>
      <Pressable
        onPress={onOpenGarage}
        accessibilityRole="button"
        accessibilityLabel="Aracını Garajına Ekle"
        style={styles.guestCta}
      >
        <Icon name="car" size={15} color="#0C0A09" />
        <Text style={[webFont(12, 900), { color: '#0C0A09', letterSpacing: 0.4 }]}>
          Aracını Garajına Ekle
        </Text>
        <Icon name="chevron-forward" size={14} color="#0C0A09" />
      </Pressable>
      <View style={styles.emptyFeatures}>
        {EMPTY_FEATURES.map((f) => (
          <WebFeatureCard key={f.title} icon={f.icon} title={f.title} text={f.text} darkSurface />
        ))}
      </View>
    </View>
  );
}

// ── Loading ──────────────────────────────────────────────────────────────────────────

function LoadingVariant({ count }: { count: number }): React.JSX.Element {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color="#34D399" />
      <Text style={[webFont(12, 700), { color: '#D6D3D1' }]}>
        {count} araç garajınızda yükleniyor…
      </Text>
    </View>
  );
}

// ── Primary car widget ───────────────────────────────────────────────────────────────

function PrimaryVariant({
  car,
  carCount,
  onOpenGarage,
}: {
  car: CarSummary;
  carCount: number;
  onOpenGarage: () => void;
}): React.JSX.Element {
  const { colors } = useTheme();
  const image = car.images?.find((u) => u.length > 0);

  const consumptionLine = buildConsumptionLine(car);

  const stats: { label: string; value: string }[] = [
    { label: 'WLTP MENZİL', value: car.rangeKm != null ? `${car.rangeKm} km` : '—' },
    { label: 'BATARYA', value: batteryDisplay(car.batteryKwh) },
    { label: '10-80 DC', value: car.chargingMin != null ? `${car.chargingMin} dk` : '—' },
    { label: '0-100', value: car.accelerationSec != null ? `${car.accelerationSec.toFixed(1)} sn` : '—' },
    { label: 'BAGAJ', value: car.trunkLiters != null ? `${car.trunkLiters} L` : '—' },
    { label: 'GÜÇ', value: car.powerHp != null ? `${car.powerHp} HP` : '—' },
  ];

  return (
    <Pressable
      onPress={onOpenGarage}
      accessibilityRole="button"
      accessibilityLabel="Garaj sayfasını aç"
      style={styles.primary}
    >
      <View style={styles.primaryTop}>
        <CachedImage uri={image} style={styles.primaryImage} placeholderColor="rgba(255,255,255,0.1)" recyclingKey={car.id} />
        <View style={styles.primaryHeaderText}>
          <View style={styles.primaryLabels}>
            <Text style={[webFont(9, 900), { color: '#34D399', letterSpacing: 0.5 }]}>GARAJIM</Text>
            {carCount > 1 ? (
              <View style={styles.primaryCapsule}>
                <Text style={[webFont(9, 700), { color: '#D6D3D1' }]}>{carCount} araç</Text>
              </View>
            ) : null}
            <View style={styles.primaryCapsuleEmerald}>
              <Icon name="star" size={9} color="#A7F3D0" />
              <Text style={[webFont(9, 700), { color: '#A7F3D0' }]}>Ana araç</Text>
            </View>
          </View>
          <Text style={[webFont(16, 900), { color: '#FFFFFF' }]} numberOfLines={2}>
            {displayTitle(car)}
          </Text>
          {car.year != null && car.bodyType && car.driveType ? (
            <Text style={[webFont(10, 500), { color: '#A8A29E' }]}>
              {car.year} · {car.bodyType} · {car.driveType}
            </Text>
          ) : null}
          {consumptionLine ? (
            <Text style={[webFont(9, 500), { color: '#78716C' }]}>{consumptionLine}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.statPills}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.statPill}>
            <Text style={[webFont(7, 900), { color: '#34D399', letterSpacing: 0.3 }]}>{stat.label}</Text>
            <Text style={[webFont(10, 900), { color: '#FFFFFF' }]}>{stat.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.primaryFooter}>
        <View style={styles.primaryFooterText}>
          <Text style={[webFont(11, 900), { color: '#A7F3D0' }]}>Garaj sayfası</Text>
          <Text style={[webFont(10, 500), { color: '#D6D3D1' }]}>
            Port bazlı menzil, yakın istasyonlar ve araç yönetimi
          </Text>
        </View>
        <View style={styles.primaryFooterCta}>
          <Text style={[webFont(11, 900), { color: '#34D399' }]}>Aç</Text>
          <Icon name="chevron-forward" size={14} color="#34D399" />
        </View>
      </View>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4 }}>
        <LinearGradient
          colors={[colors.emerald500, '#14B8A6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
    </Pressable>
  );
}

// ── Yardımcılar ──────────────────────────────────────────────────────────────────────

function batteryDisplay(kwh?: number): string {
  if (kwh == null) return '—';
  return Number.isInteger(kwh) ? `${kwh} kWh` : `${kwh.toFixed(1)} kWh`;
}

/** "{Wh} Wh/km · {eff} km/kWh verim · DC üst sınır {kW} kW" (spec §10 primary). */
function buildConsumptionLine(car: CarSummary): string | null {
  if (car.batteryKwh == null || car.rangeKm == null || car.rangeKm <= 0) return null;
  const wh = Math.round((car.batteryKwh / car.rangeKm) * 1000);
  const eff = (car.rangeKm / car.batteryKwh).toFixed(1);
  const dc = GarageChargeCalculator.estimateDcMaxKw(car);
  return `${wh} Wh/km · ${eff} km/kWh verim · DC üst sınır ${dc} kW`;
}

const styles = StyleSheet.create({
  shell: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  shellBody: {
    padding: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: 'rgba(22,163,74,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  guest: {
    gap: 12,
    minHeight: 320,
    justifyContent: 'center',
  },
  guestCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    borderRadius: radii.inner,
    backgroundColor: '#16A34A',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureGridItem: {
    width: '48%',
    flexGrow: 1,
  },
  emptyFeatures: {
    gap: 8,
  },
  loading: {
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primary: {
    gap: 12,
    paddingTop: 8,
  },
  primaryTop: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryImage: {
    width: 112,
    height: 80,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  primaryHeaderText: {
    flex: 1,
    gap: 3,
  },
  primaryLabels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  primaryCapsule: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  primaryCapsuleEmerald: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(22,163,74,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statPill: {
    width: '31%',
    flexGrow: 1,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(12,10,9,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  primaryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(22,163,74,0.1)',
    padding: 12,
  },
  primaryFooterText: {
    flex: 1,
    gap: 2,
  },
  primaryFooterCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
