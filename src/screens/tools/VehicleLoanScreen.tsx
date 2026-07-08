// VehicleLoanView — route `vehicle-loan` (spec 03 §1.5).
//
// BDDK taşıt kredisi hesaplayıcı; canlı (submit yok). VehicleLoanCalculator ile istemci-taraflı.
// VehicleLoanGuideView gömülü. Sayfa arka planı #EEF1F4.

import { useMemo, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon, type IconName } from '../../components';
import { useNavigationStore } from '../../stores';
import { radii, useTheme, webFont } from '../../theme';
import { CarPriceFormatter } from '../../utils/carPriceFormatter';
import {
  VehicleLoanCalculator,
  loanVehicleCategoryLabel,
  type LoanVehicleCategory,
} from '../../utils/vehicleLoanCalculator';
import { VehicleLoanGuide } from './VehicleLoanGuide';
import {
  LOAN_DEFAULTS,
  formatMoneyInput,
  parseMoney,
  parseRate,
  parseTerm,
} from './loanForm';

const PAGE_BACKGROUND = '#EEF1F4';

export function VehicleLoanScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const navigate = useNavigationStore((s) => s.navigate);

  const [category, setCategory] = useState<LoanVehicleCategory>(LOAN_DEFAULTS.category);
  const [principal, setPrincipal] = useState(LOAN_DEFAULTS.principal);
  const [downPayment, setDownPayment] = useState(LOAN_DEFAULTS.downPayment);
  const [annualRatePercent, setAnnualRatePercent] = useState(LOAN_DEFAULTS.annualRatePercent);
  const [termMonths, setTermMonths] = useState(LOAN_DEFAULTS.termMonths);
  const [rateText, setRateText] = useState(LOAN_DEFAULTS.annualRatePercent.toFixed(2));
  const [termText, setTermText] = useState(String(LOAN_DEFAULTS.termMonths));

  const result = useMemo(
    () =>
      VehicleLoanCalculator.calculate({
        principal,
        downPayment,
        annualRatePercent,
        termMonths,
        category,
      }),
    [principal, downPayment, annualRatePercent, termMonths, category],
  );

  const limits = result.limits;

  return (
    <ScrollView style={{ backgroundColor: PAGE_BACKGROUND }} contentContainerStyle={styles.content}>
      {/* Hero */}
      <LinearGradient
        colors={['#15803D', '#0F766E', '#1C1917']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroBadge}>
          <Icon name="scale" size={12} color="#A7F3D0" />
          <Text style={[webFont(10, 900), { color: '#A7F3D0', letterSpacing: 0.4 }]}>
            BDDK 2026 · YERLİ EV
          </Text>
        </View>
        <Text style={[webFont(24, 900), { color: '#FFFFFF' }]}>Elektrikli Araç Taşıt Kredisi</Text>
        <Text style={[webFont(12, 500), styles.heroBody, { color: 'rgba(255,255,255,0.9)' }]}>
          Yerli üretim tam elektrikli araçlar için %70&apos;e varan kredilendirme ve 48 aya kadar
          vade. Nihai fatura değerine göre aylık taksit ve toplam maliyeti anında hesaplayın.
        </Text>
        <View style={styles.heroChips}>
          <HeroChip text="%70 kredilendirme" />
          <HeroChip text="48 ay vade" />
          <HeroChip text="Anlık taksit" />
        </View>
      </LinearGradient>

      {/* Calculator card */}
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <Text style={[webFont(16, 900), { color: colors.stone900 }]}>
          Taşıt Kredisi Hesaplama Aracı
        </Text>
        <Text style={[webFont(12, 500), { color: colors.stone500 }]}>
          Araç tipini seçin, fiyat ve peşinat bilgilerini girin; BDDK dilimine göre maksimum kredi ve
          taksiti görün.
        </Text>

        {/* Category buttons */}
        <View style={styles.categoryRow}>
          <CategoryButton
            title="Yerli Üretim EV"
            subtitle="BDDK geniş limit (2026)"
            active={category === 'domestic_ev'}
            onPress={() => setCategory('domestic_ev')}
          />
          <CategoryButton
            title="Standart / İthal"
            subtitle="Klasik taşıt kredisi baremleri"
            active={category === 'standard'}
            onPress={() => setCategory('standard')}
          />
        </View>

        <Text style={[webFont(10, 900), styles.sectionLabel, { color: colors.stone500 }]}>
          KREDİ PARAMETRELERİ
        </Text>

        <MoneyField
          icon="scale"
          label="Nihai fatura / araç fiyatı"
          desc="ÖTV ve KDV dahil anahtar teslim tutar"
          value={principal}
          onChange={setPrincipal}
        />
        <MoneyField
          icon="gauge"
          label="Peşinat"
          desc="Minimum peşinat BDDK dilimine göre değişir"
          hint={`Min. peşinat: ${CarPriceFormatter.formatTL(limits.minDownPayment)}`}
          value={downPayment}
          onChange={setDownPayment}
        />

        <View style={styles.pairRow}>
          <View style={styles.pairItem}>
            <PlainField
              label="Yıllık faiz (%)"
              value={rateText}
              keyboardType="decimal-pad"
              onChangeText={(t) => {
                setRateText(t);
                setAnnualRatePercent(parseRate(t, LOAN_DEFAULTS.annualRatePercent));
              }}
            />
          </View>
          <View style={styles.pairItem}>
            <PlainField
              label="Vade (ay)"
              value={termText}
              keyboardType="number-pad"
              hint={`Maks. vade: ${limits.maxTermMonths} ay`}
              onChangeText={(t) => {
                setTermText(t);
                setTermMonths(parseTerm(t, LOAN_DEFAULTS.termMonths));
              }}
            />
          </View>
        </View>

        {/* BDDK info card */}
        <View style={[styles.infoCard, { backgroundColor: colors.sky50, borderColor: colors.sky500 }]}>
          <View style={styles.infoHeader}>
            <Icon name="info" size={14} color={colors.sky500} />
            <Text style={[webFont(12, 800), { color: colors.stone800 }]}>BDDK kredi dilimi</Text>
          </View>
          <Text style={[webFont(12, 700), { color: colors.stone900 }]}>{limits.tierLabel}</Text>
          {limits.note ? (
            <Text style={[webFont(11, 500), { color: colors.stone600 }]}>{limits.note}</Text>
          ) : null}
          <Text style={[webFont(11, 600), { color: colors.stone700 }]}>
            {`Maks. kredi: ${CarPriceFormatter.formatTL(limits.maxLoanAmount)} · Oran: %${limits.maxLtvPercent}`}
          </Text>
        </View>

        {/* Result summary card */}
        <LinearGradient
          colors={['#15803D', '#0F766E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.resultCard}
        >
          <View style={styles.resultHeaderRow}>
            <Icon name="sliders" size={14} color="#FFFFFF" />
            <Text style={[webFont(12, 800), { color: '#FFFFFF' }]}>Sonuç özeti</Text>
          </View>
          <Text style={[webFont(9, 800), styles.resultEyebrow, { color: 'rgba(255,255,255,0.85)' }]}>
            AYLIK TAKSİT
          </Text>
          <Text style={[webFont(32, 900), { color: '#FFFFFF' }]}>
            {CarPriceFormatter.formatTL(result.monthlyPayment)}
          </Text>
          <View style={styles.resultTiles}>
            <ResultTile label="Kredi tutarı" value={CarPriceFormatter.formatTL(result.loanAmount)} />
            <ResultTile label="Toplam faiz" value={CarPriceFormatter.formatTL(result.totalInterest)} />
          </View>
          <View style={[styles.wideTile, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
            <Text style={[webFont(9, 800), { color: 'rgba(255,255,255,0.85)' }]}>
              TOPLAM GERİ ÖDEME
            </Text>
            <Text style={[webFont(15, 900), { color: '#FFFFFF' }]}>
              {CarPriceFormatter.formatTL(result.totalPayment)}
            </Text>
          </View>
          <Text style={[webFont(10, 500), { color: 'rgba(255,255,255,0.8)' }]}>
            {`Peşinat + kredi geri ödemesi toplamı: ${CarPriceFormatter.formatTL(downPayment + result.totalPayment)}`}
          </Text>
        </LinearGradient>

        {/* Warnings */}
        {result.warnings.length > 0 ? (
          <View style={[styles.warnCard, { backgroundColor: colors.amber50, borderColor: colors.amber200 }]}>
            <View style={styles.infoHeader}>
              <Icon name="alert-triangle" size={14} color={colors.amber800} />
              <Text style={[webFont(12, 800), { color: colors.amber800 }]}>Uyarılar</Text>
            </View>
            {result.warnings.map((w, i) => (
              <Text key={i} style={[webFont(11, 500), { color: colors.amber800 }]}>
                {`• ${w}`}
              </Text>
            ))}
          </View>
        ) : null}
      </View>

      {/* Guide */}
      <VehicleLoanGuide />

      {/* CTA */}
      <Pressable
        onPress={() => navigate('search')}
        accessibilityRole="button"
        accessibilityLabel="Elektrikli Araçları İncele"
        style={({ pressed }) => [
          styles.cta,
          { backgroundColor: colors.emerald600, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text style={[webFont(12, 900), { color: '#FFFFFF', letterSpacing: 0.6 }]}>
          Elektrikli Araçları İncele
        </Text>
        <Icon name="arrow-forward" size={15} color="#FFFFFF" />
      </Pressable>

      <Text style={[webFont(10, 600), styles.categoryFootnote, { color: colors.stone500 }]}>
        {loanVehicleCategoryLabel[category]}
      </Text>
    </ScrollView>
  );
}

function HeroChip({ text }: { text: string }): React.JSX.Element {
  return (
    <View style={styles.heroChip}>
      <Text style={[webFont(10, 700), { color: '#FFFFFF' }]}>{text}</Text>
    </View>
  );
}

function CategoryButton({
  title,
  subtitle,
  active,
  onPress,
}: {
  title: string;
  subtitle: string;
  active: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={[
        styles.categoryButton,
        active
          ? { backgroundColor: colors.emerald600, borderColor: colors.emerald600 }
          : { backgroundColor: colors.inputBackground, borderColor: colors.border },
      ]}
    >
      <Text style={[webFont(12, 800), { color: active ? '#FFFFFF' : colors.stone900 }]}>{title}</Text>
      <Text style={[webFont(10, 500), { color: active ? 'rgba(255,255,255,0.85)' : colors.stone500 }]}>
        {subtitle}
      </Text>
    </Pressable>
  );
}

function MoneyField({
  icon,
  label,
  desc,
  hint,
  value,
  onChange,
}: {
  icon: IconName;
  label: string;
  desc: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
}): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={styles.fieldStack}>
      <View style={styles.fieldLabelRow}>
        <Icon name={icon} size={14} color={colors.emerald600} />
        <Text style={[webFont(12, 700), { color: colors.stone800 }]}>{label}</Text>
      </View>
      <Text style={[webFont(10, 500), { color: colors.stone500 }]}>{desc}</Text>
      <TextInput
        value={formatMoneyInput(value)}
        onChangeText={(t) => onChange(parseMoney(t))}
        keyboardType="number-pad"
        style={[
          webFont(15, 700),
          styles.textInput,
          { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.stone900 },
        ]}
      />
      {hint ? <Text style={[webFont(10, 600), { color: colors.emerald700 }]}>{hint}</Text> : null}
    </View>
  );
}

function PlainField({
  label,
  value,
  onChangeText,
  keyboardType,
  hint,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType: 'decimal-pad' | 'number-pad';
  hint?: string;
}): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={styles.fieldStack}>
      <Text style={[webFont(10, 800), styles.plainLabel, { color: colors.stone450 }]}>
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
      {hint ? <Text style={[webFont(10, 600), { color: colors.stone500 }]}>{hint}</Text> : null}
    </View>
  );
}

function ResultTile({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View style={[styles.resultTile, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
      <Text style={[webFont(9, 800), { color: 'rgba(255,255,255,0.85)' }]}>{label.toUpperCase()}</Text>
      <Text style={[webFont(13, 900), { color: '#FFFFFF' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingTop: 20,
    gap: 16,
  },
  hero: {
    borderRadius: radii.card,
    padding: 20,
    gap: 10,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: 'rgba(16,163,74,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  heroBody: {
    lineHeight: 18,
  },
  heroChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  heroChip: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  card: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryButton: {
    flex: 1,
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 2,
  },
  sectionLabel: {
    letterSpacing: 0.4,
    marginTop: 4,
  },
  fieldStack: {
    gap: 4,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  plainLabel: {
    letterSpacing: 0.4,
  },
  textInput: {
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginTop: 2,
  },
  pairRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pairItem: {
    flex: 1,
  },
  infoCard: {
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 4,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resultCard: {
    borderRadius: radii.card,
    padding: 16,
    gap: 8,
  },
  resultHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resultEyebrow: {
    letterSpacing: 0.4,
    marginTop: 4,
  },
  resultTiles: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  resultTile: {
    flex: 1,
    borderRadius: radii.inner,
    padding: 12,
    gap: 2,
  },
  wideTile: {
    borderRadius: radii.inner,
    padding: 12,
    gap: 2,
  },
  warnCard: {
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 4,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radii.inner,
    paddingVertical: 14,
  },
  categoryFootnote: {
    textAlign: 'center',
  },
});
