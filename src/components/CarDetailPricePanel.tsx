// CarDetailPricePanel + CarDetailMetricsGrid — iOS detay fiyat paneli (spec §4.14).
//
// Sol aksan çubuğu (satılıksa emerald500). Header "TAVSİYE EDİLEN ANAHTAR TESLİM FİYATI" +
// opsiyonel yetkili satıcı link chip'i. Fiyat satırı (CarPrice detail) + "KDV & ÖTV Dahil" chip.
// Karşılaştır / garaj / PDF butonları + dipnot.

import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CarDetail } from '../models/car';
import { CarPriceFormatter } from '../utils/carPriceFormatter';
import { radii, useTheme, webFont } from '../theme';
import { Icon, type IconName } from './ComponentIcon';
import { CarPrice } from './CarPrice';
import {
  formatBattery,
  formatChargingMinutes,
  formatPower,
  formatRange,
} from './carSpecFormat';

export interface CarDetailPricePanelProps {
  car: CarDetail;
  brandPriceListURL?: string;
  isComparing: boolean;
  isInGarage: boolean;
  onCompare: () => void;
  onOpenCompare: () => void;
  onToggleGarage: () => void;
  onDownloadPDF: () => void;
}

const FOOTNOTE =
  '* Bu aracı listenize ekleyerek diğer 2 elektrikli araçla teknik, batarya ömrü, kış menzili ve motor verilerini yan yana karşılaştırabilirsiniz (Maks 3 Araç).';

export function CarDetailPricePanel({
  car,
  brandPriceListURL,
  isComparing,
  isInGarage,
  onCompare,
  onOpenCompare,
  onToggleGarage,
  onDownloadPDF,
}: CarDetailPricePanelProps): React.JSX.Element {
  const { colors } = useTheme();
  const sold = CarPriceFormatter.isAvailableInTurkey(car.trAvailable);
  const priced = (car.priceTL ?? 0) > 0;
  const accentColor = sold ? colors.emerald500 : colors.stone300;
  const cardStroke = sold ? 'rgba(22,163,74,0.35)' : colors.border;

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: cardStroke }]}>
      <View style={[styles.accent, { backgroundColor: accentColor }]} />
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={[webFont(10, 800), styles.eyebrow, { color: colors.stone400 }]}>
            TAVSİYE EDİLEN ANAHTAR TESLİM FİYATI
          </Text>
        </View>
        {brandPriceListURL ? (
          <View style={[styles.linkChip, { backgroundColor: colors.emerald50, borderColor: colors.emerald100 }]}>
            <Text style={[webFont(9, 900), { color: colors.emerald700 }]}>
              YETKİLİ SATICI FİYAT LİSTESİ →
            </Text>
          </View>
        ) : null}

        <View style={styles.priceRow}>
          <CarPrice
            priceTL={car.priceTL}
            priceForeign={car.priceForeign}
            trAvailable={car.trAvailable}
            style="detail"
          />
          {sold && priced ? (
            <View style={[styles.taxChip, { backgroundColor: colors.emerald50 }]}>
              <Text style={[webFont(10, 900), { color: colors.emerald700 }]}>KDV & ÖTV Dahil</Text>
            </View>
          ) : null}
        </View>

        <CarDetailMetricsGrid car={car} />

        {isComparing ? (
          <>
            <View style={[styles.statusBar, { backgroundColor: colors.inverseButtonBackground }]}>
              <View style={[styles.statusDot, { backgroundColor: colors.emerald500 }]} />
              <Text style={[webFont(10, 900), { color: colors.inverseButtonForeground }]}>
                ✓ KARŞILAŞTIRMA LİSTESİNDE
              </Text>
            </View>
            <PanelButton
              icon="compare"
              label="KARŞILAŞTIRMA EKRANINI AÇ →"
              onPress={onOpenCompare}
              bg={colors.emerald600}
              fg="#FFFFFF"
            />
          </>
        ) : (
          <PanelButton
            icon="compare"
            label="ARACI KARŞILAŞTIRMAYA EKLE"
            onPress={onCompare}
            bg={colors.emerald600}
            fg="#FFFFFF"
          />
        )}

        <PanelButton
          icon={isInGarage ? 'heart' : 'heart-outline'}
          label={isInGarage ? 'GARAJIMDAN ÇIKAR' : 'GARAJA EKLE'}
          onPress={onToggleGarage}
          bg={isInGarage ? colors.garageTintBackground : colors.cardBackground}
          fg={isInGarage ? '#E11D48' : colors.stone700}
          borderColor={isInGarage ? colors.garageTintBorder : colors.border}
          iconColor={isInGarage ? '#F43F5E' : colors.stone700}
        />

        <PanelButton
          icon="printer"
          label="KATALOGU PDF İNDİR / SAKLA"
          onPress={onDownloadPDF}
          bg={colors.emerald50}
          fg={colors.emerald700}
          borderColor={colors.emerald250}
        />

        <View style={[styles.footnoteDivider, { backgroundColor: colors.border }]} />
        <Text style={[webFont(9.5, 500), { color: colors.stone450 }]}>{FOOTNOTE}</Text>
      </View>
    </View>
  );
}

interface PanelButtonProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  bg: string;
  fg: string;
  borderColor?: string;
  iconColor?: string;
}

function PanelButton({
  icon,
  label,
  onPress,
  bg,
  fg,
  borderColor,
  iconColor,
}: PanelButtonProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.panelButton,
        {
          backgroundColor: bg,
          borderColor: borderColor ?? 'transparent',
          borderWidth: borderColor ? StyleSheet.hairlineWidth : 0,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Icon name={icon} size={15} color={iconColor ?? fg} />
      <Text style={[webFont(11, 900), { color: fg, letterSpacing: 0.4 }]}>{label}</Text>
    </Pressable>
  );
}

// ── CarDetailMetricsGrid (§4.14) ────────────────────────────────────────────────────

interface MetricCard {
  label: string;
  value: string;
  icon: IconName;
  color: string;
  tint: string;
}

export interface CarDetailMetricsGridProps {
  car: CarDetail;
}

/** 2×2 metrik kart: Menzil / Batarya / Güç / Hızlı Şarj. */
export function CarDetailMetricsGrid({ car }: CarDetailMetricsGridProps): React.JSX.Element {
  const { colors } = useTheme();
  const cards: MetricCard[] = [
    { label: 'RESMİ MENZİL', value: formatRange(car.rangeKm), icon: 'flame', color: colors.emerald600, tint: colors.emerald50 },
    { label: 'NET BATARYA', value: formatBattery(car.batteryKwh), icon: 'battery', color: colors.sky500, tint: colors.sky50 },
    { label: 'MOTOR GÜCÜ', value: formatPower(car.powerHp), icon: 'bolt', color: colors.amber800, tint: colors.amber50 },
    { label: 'HIZLI ŞARJ HIZI', value: formatChargingMinutes(car.chargingMin), icon: 'sliders', color: '#A855F7', tint: '#FAF5FF' },
  ];

  return (
    <View style={styles.metricsGrid}>
      {cards.map((card) => (
        <View
          key={card.label}
          style={[styles.metricCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
        >
          <View
            style={[
              styles.metricIconTile,
              { backgroundColor: card.tint, borderColor: card.color },
            ]}
          >
            <Icon name={card.icon} size={18} color={card.color} />
          </View>
          <Text style={[webFont(9, 700), { color: colors.stone400 }]}>{card.label}</Text>
          <Text style={[webFont(14, 900), { color: colors.stone900 }]} numberOfLines={1}>
            {card.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: radii.card,
    borderWidth: 2,
    overflow: 'hidden',
  },
  accent: {
    width: 5,
  },
  body: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyebrow: {
    letterSpacing: 0.5,
  },
  linkChip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  priceRow: {
    gap: 8,
  },
  taxChip: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radii.button,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  panelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radii.button,
    paddingVertical: 14,
  },
  footnoteDivider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricCard: {
    width: '48%',
    flexGrow: 1,
    gap: 6,
    borderRadius: radii.button,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  metricIconTile: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
