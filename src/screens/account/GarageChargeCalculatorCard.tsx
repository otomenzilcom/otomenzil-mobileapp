// GaragePortChargeCalculator — iOS garaj şarj hesaplayıcısı (spec §3.2 #3).
//
// Port chip'leri, batarya göstergesi, iki slider (mevcut/hedef, step 5), 4-lü istatistik ve
// altbilgi. Hesap GarageChargeCalculator util'i ile; slider durumu garageChargeState ile.

import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type DimensionValue } from 'react-native';

import { Icon, Slider } from '../../components';
import type { CarSummary } from '../../models';
import {
  GarageChargeCalculator,
  type GaragePortOption,
} from '../../utils/garageChargeCalculator';
import { useTheme, webFont } from '../../theme';
import {
  applyStartChange,
  applyTargetChange,
  gaugeColorForTarget,
  START_DEFAULT,
  START_MAX,
  START_MIN,
  TARGET_DEFAULT,
  TARGET_MAX,
  CHARGE_STEP,
  type ChargeLevels,
} from './garageChargeState';

export interface GarageChargeCalculatorCardProps {
  car: CarSummary;
  /** Seçili istasyon adı (altyazı için); yoksa genel port metni. */
  stationName?: string;
}

function displayTitle(car: CarSummary): string {
  return car.model.toLowerCase().startsWith(car.brand.toLowerCase())
    ? car.model
    : `${car.brand} ${car.model}`;
}

export function GarageChargeCalculatorCard({
  car,
  stationName,
}: GarageChargeCalculatorCardProps): React.JSX.Element {
  const { colors } = useTheme();
  const ports = GarageChargeCalculator.defaultPorts;
  const [portId, setPortId] = useState('dc-120');
  const [levels, setLevels] = useState<ChargeLevels>({
    startPercent: START_DEFAULT,
    targetPercent: TARGET_DEFAULT,
  });

  const port = ports.find((p) => p.id === portId) ?? ports[0];

  const session = useMemo(
    () =>
      GarageChargeCalculator.calculate({
        car,
        port,
        startPercent: levels.startPercent,
        targetPercent: levels.targetPercent,
      }),
    [car, port, levels],
  );

  const battery = car.batteryKwh ?? 65;
  const rangeKm = car.rangeKm ?? 400;
  const dcMax = GarageChargeCalculator.estimateDcMaxKw(car);
  const gaugeColor = gaugeColorForTarget(levels.targetPercent);
  const gaugeFill: DimensionValue = `${levels.targetPercent}%`;
  const startMarker: DimensionValue = `${levels.startPercent}%`;

  return (
    <View style={[styles.card, { backgroundColor: colors.stone950 }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[webFont(10, 900), styles.eyebrow, { color: colors.emerald400 }]}>
          MENZİL HESAPLAYICI
        </Text>
        <Text style={[webFont(17, 900), { color: '#FFFFFF' }]}>{displayTitle(car)}</Text>
        <Text style={[webFont(11, 500), { color: colors.stone400 }]}>
          {stationName
            ? `${stationName} · seçili port gücüne göre süre ve menzil kazancı`
            : 'Genel port güçleriyle tahmini şarj süresi ve menzil kazancı'}
        </Text>
      </View>

      {/* Port chips */}
      <View style={styles.portBlock}>
        <View style={styles.portLabel}>
          <Icon name="bolt" size={12} color={colors.emerald400} />
          <Text style={[webFont(10, 800), { color: colors.stone300 }]}>ŞARJ PORTU</Text>
        </View>
        <View style={styles.portChips}>
          {ports.map((p: GaragePortOption) => {
            const active = p.id === portId;
            return (
              <Pressable
                key={p.id}
                onPress={() => setPortId(p.id)}
                accessibilityRole="button"
                accessibilityLabel={p.label}
                style={[
                  styles.portChip,
                  {
                    backgroundColor: active ? colors.emerald600 : 'rgba(255,255,255,0.06)',
                    borderColor: active ? colors.emerald400 : 'rgba(255,255,255,0.12)',
                  },
                ]}
              >
                <Text style={[webFont(11, 800), { color: active ? '#FFFFFF' : colors.stone300 }]}>
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Battery gauge */}
      <View style={styles.gaugeBlock}>
        <View style={styles.gaugeHead}>
          <Text style={[webFont(11, 700), { color: colors.stone300 }]}>Batarya simülasyonu</Text>
          <Text style={[webFont(13, 900), { color: gaugeColor }]}>%{levels.targetPercent}</Text>
        </View>
        <View style={styles.gaugeTrack}>
          <View style={[styles.gaugeFill, { width: gaugeFill, backgroundColor: gaugeColor }]} />
          <View style={[styles.startMarker, { left: startMarker }]} />
        </View>
        <View style={styles.gaugeCaptions}>
          <Text style={[webFont(9, 700), { color: colors.stone400 }]}>
            Başlangıç %{levels.startPercent}
          </Text>
          <Text style={[webFont(9, 700), { color: colors.stone400 }]}>
            Hedef %{levels.targetPercent}
          </Text>
        </View>
      </View>

      {/* Sliders */}
      <View style={styles.sliderBlock}>
        <Text style={[webFont(10, 700), { color: colors.stone400 }]}>Mevcut şarj</Text>
        <Slider
          value={levels.startPercent}
          minimumValue={START_MIN}
          maximumValue={START_MAX}
          step={CHARGE_STEP}
          onValueChange={(v) => setLevels((prev) => applyStartChange(prev, v))}
          minimumTrackTintColor={colors.stone400}
          maximumTrackTintColor="rgba(255,255,255,0.14)"
          thumbTintColor="#FFFFFF"
        />
      </View>
      <View style={styles.sliderBlock}>
        <Text style={[webFont(10, 700), { color: colors.emerald400 }]}>Hedef şarj</Text>
        <Slider
          value={levels.targetPercent}
          minimumValue={Math.min(TARGET_MAX, levels.startPercent + 10)}
          maximumValue={TARGET_MAX}
          step={CHARGE_STEP}
          onValueChange={(v) => setLevels((prev) => applyTargetChange(prev, v))}
          minimumTrackTintColor={colors.emerald500}
          maximumTrackTintColor="rgba(255,255,255,0.14)"
          thumbTintColor={colors.emerald400}
        />
      </View>

      {/* Stat grid */}
      <View style={styles.statGrid}>
        <ChargeStat icon="battery" label="Aktarılan enerji" value={`${session.energyKwh} kWh`} />
        <ChargeStat icon="clock" label="Tahmini süre" value={`~${session.durationMins} dk`} />
        <ChargeStat
          icon="gauge"
          label="Kazanılan menzil"
          value={`+${session.rangeGainedKm} km`}
          accent
        />
        <ChargeStat icon="bolt" label="Etkin güç" value={`${session.effectiveSpeedKw} kW`} />
      </View>

      {/* Footer */}
      <Text style={[webFont(10, 500), styles.footer, { color: colors.stone400 }]}>
        {battery} kWh batarya · {rangeKm} km WLTP · DC üst sınır {dcMax} kW. %80 üzeri dolumda
        koruma payı eklenir.
      </Text>
    </View>
  );
}

interface ChargeStatProps {
  icon: 'battery' | 'clock' | 'gauge' | 'bolt';
  label: string;
  value: string;
  accent?: boolean;
}

function ChargeStat({ icon, label, value, accent }: ChargeStatProps): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
      <Icon name={icon} size={14} color={accent ? colors.emerald400 : colors.stone300} />
      <Text style={[webFont(15, 900), { color: accent ? colors.emerald400 : '#FFFFFF' }]}>
        {value}
      </Text>
      <Text style={[webFont(9, 600), { color: colors.stone400 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 18,
    gap: 16,
  },
  header: {
    gap: 4,
  },
  eyebrow: {
    letterSpacing: 1,
  },
  portBlock: {
    gap: 8,
  },
  portLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  portChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  portChip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  gaugeBlock: {
    gap: 8,
  },
  gaugeHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gaugeTrack: {
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  gaugeFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 7,
  },
  startMarker: {
    position: 'absolute',
    top: -2,
    bottom: -2,
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  gaugeCaptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderBlock: {
    gap: 4,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stat: {
    flexGrow: 1,
    minWidth: '46%',
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  footer: {
    lineHeight: 15,
  },
});
