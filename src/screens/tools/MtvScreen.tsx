// MtvCalculationView — route `mtv` (spec 03 §1.4).
//
// 2026 EV MTV hesaplayıcı. Katalog (trAvailable != false && priceTL > 0) veya manuel giriş;
// hesap MtvCalculator ile tamamen istemci-taraflı. Sonuç yalnızca "MTV HESAPLA" sonrası görünür.

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  Icon,
  WebArticleTable,
  WebCardAccentBar,
  WebFilterField,
  type FilterOption,
  type IconName,
} from '../../components';
import { useNavigationStore } from '../../stores';
import { radii, useTheme, webFont } from '../../theme';
import { CarPriceFormatter } from '../../utils/carPriceFormatter';
import { MtvCalculator } from '../../utils/mtvCalculator';
import {
  MTV_DEFAULTS,
  mtvCarOptionLabel,
  mtvEligibleCars,
  mtvGuideRows,
  mtvParamsFromForm,
  mtvSeedFromCar,
} from './mtvForm';

type Mode = 'catalog' | 'manual';

function parseIntSafe(text: string, fallback: number): number {
  const n = parseInt(text.replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

function parseFloatSafe(text: string, fallback: number): number {
  const n = parseFloat(text.replace(',', '.').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : fallback;
}

export function MtvScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const catalog = useNavigationStore((s) => s.catalogCars);
  const navigate = useNavigationStore((s) => s.navigate);

  const [mode, setMode] = useState<Mode>('catalog');
  const [calculated, setCalculated] = useState(false);

  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [carInfoLine, setCarInfoLine] = useState<string | null>(null);

  const [modelYear, setModelYear] = useState<number>(MTV_DEFAULTS.modelYear);
  const [registrationYear, setRegistrationYear] = useState<number>(MTV_DEFAULTS.registrationYear);
  const [motorPowerKw, setMotorPowerKw] = useState<number>(MTV_DEFAULTS.motorPowerKw);
  const [taxBaseTry, setTaxBaseTry] = useState<number>(MTV_DEFAULTS.taxBaseTry);

  const eligibleCars = useMemo(() => mtvEligibleCars(catalog), [catalog]);
  const carOptions: FilterOption[] = eligibleCars.map((car) => ({
    value: car.id,
    label: mtvCarOptionLabel(car),
  }));

  const guideRows = useMemo(() => mtvGuideRows(), []);

  const applyCar = (carId: string): void => {
    setSelectedCarId(carId);
    const car = eligibleCars.find((c) => c.id === carId);
    if (!car) return;
    const seed = mtvSeedFromCar(car);
    setModelYear(seed.modelYear);
    setRegistrationYear(seed.registrationYear);
    setMotorPowerKw(seed.motorPowerKw);
    setTaxBaseTry(seed.taxBaseTry);
    setCarInfoLine(seed.infoLine);
    setCalculated(false);
  };

  const switchMode = (next: Mode): void => {
    setMode(next);
    setCalculated(false);
  };

  const result = useMemo(
    () =>
      MtvCalculator.calculate(
        mtvParamsFromForm({ motorPowerKw, modelYear, taxBaseTry, registrationYear }),
      ),
    [motorPowerKw, modelYear, taxBaseTry, registrationYear],
  );

  return (
    <ScrollView
      style={{ backgroundColor: colors.pageBackground }}
      contentContainerStyle={styles.content}
    >
      {/* Header card */}
      <View style={[styles.headerCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <WebCardAccentBar />
        <View style={styles.headerBody}>
          <Badge icon="scale" text={`${MtvCalculator.referenceYear} Resmi Tarife`} />
          <Text style={[webFont(24, 900), { color: colors.stone900 }]}>
            Elektrikli Araç MTV Hesaplama
          </Text>
          <Text style={[webFont(12, 500), { color: colors.stone500 }]}>
            Motor gücü (kW), model yılı ve matrah bilgisiyle yıllık Motorlu Taşıtlar Vergisi tutarını
            hesaplayın. Elektrikli otomobiller benzer segment benzinli araca göre yaklaşık %25 oranında
            vergilendirilir.
          </Text>
          <View style={[styles.payTile, { backgroundColor: colors.stone50 }]}>
            <Icon name="gauge" size={18} color={colors.emerald600} />
            <View style={styles.payText}>
              <Text style={[webFont(9, 800), { color: colors.stone400, letterSpacing: 0.4 }]}>
                ÖDEME
              </Text>
              <Text style={[webFont(13, 700), { color: colors.stone900 }]}>
                Ocak + Temmuz (2 taksit)
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Form card */}
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <View style={styles.cardHeaderRow}>
          <Icon name="sliders" size={16} color={colors.emerald600} />
          <Text style={[webFont(16, 900), { color: colors.stone900 }]}>Hesaplama Formu</Text>
        </View>

        {/* Mode toggle */}
        <View style={styles.modeRow}>
          <ModeButton
            icon="list"
            label="Listeden Seç"
            active={mode === 'catalog'}
            onPress={() => switchMode('catalog')}
          />
          <ModeButton
            icon="sliders"
            label="Manuel Gir"
            active={mode === 'manual'}
            onPress={() => switchMode('manual')}
          />
        </View>

        {mode === 'catalog' ? (
          <View style={styles.stack}>
            {carOptions.length > 0 ? (
              <WebFilterField
                title="Araç modeli"
                value={selectedCarId ?? ''}
                options={carOptions}
                onChange={applyCar}
              />
            ) : (
              <Text style={[webFont(12, 500), { color: colors.stone500 }]}>
                Uygun araç bulunamadı.
              </Text>
            )}
            {carInfoLine ? (
              <Text style={[webFont(11, 600), { color: colors.emerald700 }]}>{carInfoLine}</Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.stack}>
            <NumberField
              label="Model yılı"
              value={String(modelYear)}
              onChangeText={(t) => {
                setModelYear(parseIntSafe(t, MTV_DEFAULTS.modelYear));
                setCalculated(false);
              }}
            />
            <NumberField
              label="Tescil yılı"
              value={String(registrationYear)}
              onChangeText={(t) => {
                setRegistrationYear(parseIntSafe(t, MTV_DEFAULTS.registrationYear));
                setCalculated(false);
              }}
            />
            <NumberField
              label="Motor gücü (kW)"
              value={String(motorPowerKw)}
              keyboardType="decimal-pad"
              onChangeText={(t) => {
                setMotorPowerKw(parseFloatSafe(t, MTV_DEFAULTS.motorPowerKw));
                setCalculated(false);
              }}
            />
            <NumberField
              label="Vergisiz satış bedeli / matrah (TL)"
              value={String(taxBaseTry)}
              keyboardType="decimal-pad"
              onChangeText={(t) => {
                setTaxBaseTry(parseFloatSafe(t, MTV_DEFAULTS.taxBaseTry));
                setCalculated(false);
              }}
            />
            <Text style={[webFont(11, 500), { color: colors.stone500 }]}>
              2018 sonrası tescilde matrah dilimi uygulanır.
            </Text>
          </View>
        )}

        <Pressable
          onPress={() => setCalculated(true)}
          accessibilityRole="button"
          accessibilityLabel="MTV Hesapla"
          style={({ pressed }) => [
            styles.submit,
            { backgroundColor: colors.emerald600, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[webFont(12, 900), { color: '#FFFFFF', letterSpacing: 1 }]}>MTV HESAPLA</Text>
        </Pressable>
      </View>

      {/* Result card */}
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <View style={styles.resultHeader}>
          <Text style={[webFont(10, 900), { color: colors.emerald600, letterSpacing: 0.4 }]}>
            SONUÇ
          </Text>
          {calculated ? (
            <View style={[styles.tariffPill, { backgroundColor: colors.emerald50, borderColor: colors.emerald100 }]}>
              <Text style={[webFont(9, 800), { color: colors.emerald700 }]}>
                {`${MtvCalculator.referenceYear} tarifesi`}
              </Text>
            </View>
          ) : null}
        </View>

        {calculated ? (
          <View style={styles.stack}>
            <Text style={[webFont(9, 800), { color: colors.stone400, letterSpacing: 0.4 }]}>
              YILLIK MTV
            </Text>
            <Text style={[webFont(34, 900), { color: colors.stone900 }]}>
              {CarPriceFormatter.formatTL(result.annualMtvTry)}
            </Text>
            <Text style={[webFont(12, 600), { color: colors.stone500 }]}>
              {`Taksit (Ocak / Temmuz): ${CarPriceFormatter.formatTL(result.installmentMtvTry)}`}
            </Text>

            <View style={styles.grid}>
              <GridTile label="Güç dilimi" value={result.powerTier.label} />
              <GridTile label="Matrah" value={result.matrahBracketLabel} />
              <GridTile label="Araç yaşı" value={`${result.vehicleAge} yıl · ${result.ageGroup.label}`} />
              <GridTile label="Baz tutar (1–3 yaş)" value={CarPriceFormatter.formatTL(result.baseAmountTry)} />
              <GridTile label="Yaş katsayısı" value={`%${Math.round(result.ageMultiplier * 100)}`} />
              <GridTile
                label="Benzinli eşdeğer (tah.)"
                value={CarPriceFormatter.formatTL(result.estimatedIceMtvTry)}
              />
            </View>

            <View style={styles.disclaimerRow}>
              <Icon name="info" size={14} color={colors.stone500} />
              <Text style={[webFont(11, 500), styles.disclaimerText, { color: colors.stone500 }]}>
                Bilgilendirme amaçlıdır. Kesin tutar için GİB / e-Devlet MTV sorgulamasını kullanın.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.emptyResult}>
            <Icon name="sliders" size={28} color={colors.stone300} />
            <Text style={[webFont(13, 800), { color: colors.stone700 }]}>
              Formu doldurup hesaplayın
            </Text>
            <Text style={[webFont(11, 500), styles.emptyResultSub, { color: colors.stone500 }]}>
              Yıllık MTV ve taksit tutarı burada görünecek.
            </Text>
          </View>
        )}
      </View>

      {/* Guide section */}
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <Text style={[webFont(16, 900), { color: colors.stone900 }]}>
          Elektrikli araçta MTV nasıl hesaplanır?
        </Text>
        <Text style={[webFont(12, 500), { color: colors.stone500 }]}>
          cc yerine kW esas alınır; 2018 sonrası tescilde matrah da devreye girer.
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.guideTable}>
            <WebArticleTable
              headers={['Motor gücü', 'Matrah dilimi', 'Yıllık MTV (1–3 yaş)']}
              rows={guideRows.map((r) => [r.power, r.matrah, r.amount])}
            />
          </View>
        </ScrollView>
        <Text style={[webFont(11, 500), { color: colors.stone500 }]}>
          Tutarlar 2026 tarifesine göre 1–3 yaşlı araçlar için baz yıllık MTV&apos;dir; araç yaşı
          arttıkça indirim katsayısı uygulanır.
        </Text>
      </View>

      {/* Footer links */}
      <View style={styles.footerRow}>
        <FooterLink icon="chevron-forward" label="ÖTV Muafiyeti" onPress={() => navigate('otv')} />
        <FooterLink icon="car" label="Araç Kataloğu" onPress={() => navigate('search')} />
      </View>
    </ScrollView>
  );
}

function Badge({ icon, text }: { icon: IconName; text: string }): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: colors.emerald50, borderColor: colors.emerald100 }]}>
      <Icon name={icon} size={12} color={colors.emerald700} />
      <Text style={[webFont(10, 900), { color: colors.emerald700, letterSpacing: 0.4 }]}>
        {text.toUpperCase()}
      </Text>
    </View>
  );
}

function ModeButton({
  icon,
  label,
  active,
  onPress,
}: {
  icon: IconName;
  label: string;
  active: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.modeButton,
        active
          ? { backgroundColor: colors.stone950 }
          : { backgroundColor: colors.inputBackground, borderColor: colors.border },
      ]}
    >
      <Icon name={icon} size={14} color={active ? '#FFFFFF' : colors.stone600} />
      <Text style={[webFont(11, 800), { color: active ? '#FFFFFF' : colors.stone700 }]}>
        {label.toUpperCase()}
      </Text>
    </Pressable>
  );
}

function NumberField({
  label,
  value,
  onChangeText,
  keyboardType = 'number-pad',
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'number-pad' | 'decimal-pad';
}): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={styles.fieldStack}>
      <Text style={[webFont(10, 800), styles.fieldLabel, { color: colors.stone450 }]}>
        {label.toUpperCase()}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        style={[
          webFont(14, 600),
          styles.textInput,
          { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.stone900 },
        ]}
      />
    </View>
  );
}

function GridTile({ label, value }: { label: string; value: string }): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={[styles.gridTile, { backgroundColor: colors.stone50 }]}>
      <Text style={[webFont(9, 800), { color: colors.stone400, letterSpacing: 0.4 }]}>
        {label.toUpperCase()}
      </Text>
      <Text style={[webFont(13, 700), { color: colors.stone900 }]}>{value}</Text>
    </View>
  );
}

function FooterLink({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.footerLink,
        { backgroundColor: colors.cardBackground, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Icon name={icon} size={14} color={colors.emerald600} />
      <Text style={[webFont(12, 700), { color: colors.stone800 }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingTop: 20,
    gap: 16,
  },
  headerCard: {
    flexDirection: 'row',
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  headerBody: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
  payTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radii.inner,
    padding: 12,
    marginTop: 4,
  },
  payText: {
    gap: 2,
  },
  card: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radii.button,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
  },
  stack: {
    gap: 12,
  },
  fieldStack: {
    gap: 6,
  },
  fieldLabel: {
    letterSpacing: 0.4,
  },
  textInput: {
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  submit: {
    alignItems: 'center',
    borderRadius: radii.inner,
    paddingVertical: 14,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tariffPill: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  gridTile: {
    flexBasis: '48%',
    flexGrow: 1,
    borderRadius: radii.inner,
    padding: 12,
    gap: 4,
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 4,
  },
  disclaimerText: {
    flex: 1,
  },
  emptyResult: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 20,
  },
  emptyResultSub: {
    textAlign: 'center',
  },
  guideTable: {
    minWidth: 480,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  footerLink: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
});
