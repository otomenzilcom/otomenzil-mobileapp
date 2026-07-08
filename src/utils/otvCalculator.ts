// OtvCalculator.swift birebir port. 2026 ÖTV tahmincisi.
// Sabitler ve yerli üretim beyaz listesi Swift kaynağından aynen kopyalandı.

// Swift Double.rounded() -> half away from zero.
function roundHalfAwayFromZero(x: number): number {
  return x < 0 ? -Math.round(-x) : Math.round(x);
}

function containsCaseInsensitive(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

const MATRAH_THRESHOLD_2026 = 1_650_000;
const DISABLED_EXEMPTION_LIMIT_2026 = 2_873_972;

export interface OtvMatrahEstimate {
  matrah: number;
  otvRate: number;
  powerKw: number;
}

function powerKw(fromHp: number): number {
  return fromHp * 0.7457;
}

function rateBand(kw: number, matrah: number): number {
  const over = matrah > MATRAH_THRESHOLD_2026;
  if (kw <= 160) {
    return over ? 55 : 25;
  }
  return over ? 75 : 65;
}

function estimateMatrahAndRate(retailPrice: number, powerHp: number): OtvMatrahEstimate {
  const kw = powerKw(powerHp);
  let otvRate = 25;

  for (let i = 0; i < 4; i++) {
    const matrah = retailPrice / ((1 + otvRate / 100) * 1.2);
    otvRate = rateBand(kw, matrah);
  }

  const matrah = retailPrice / ((1 + otvRate / 100) * 1.2);
  return { matrah, otvRate, powerKw: roundHalfAwayFromZero(kw) };
}

function meetsLocalProduction(brand: string, model: string): boolean {
  const brandNorm = brand.trim().toLowerCase();
  const modelNorm = model;
  const rules: { brands: string[]; pattern: string; exclude: string | null }[] = [
    { brands: ['togg'], pattern: 'T10', exclude: null },
    { brands: ['citroën', 'citroen'], pattern: 'C3', exclude: 'aircross' },
    { brands: ['dacia'], pattern: 'Spring', exclude: null },
    { brands: ['renault'], pattern: 'Spring', exclude: null },
    { brands: ['mg'], pattern: 'MG4', exclude: null },
    { brands: ['fiat'], pattern: '500', exclude: null },
  ];

  return rules.some((rule) => {
    if (!rule.brands.some((b) => brandNorm === b.toLowerCase())) {
      return false;
    }
    if (!containsCaseInsensitive(modelNorm, rule.pattern)) {
      return false;
    }
    if (rule.exclude != null && containsCaseInsensitive(modelNorm, rule.exclude)) {
      return false;
    }
    return true;
  });
}

export const OtvCalculator = {
  matrahThreshold2026: MATRAH_THRESHOLD_2026,
  disabledExemptionLimit2026: DISABLED_EXEMPTION_LIMIT_2026,
  powerKw,
  rateBand,
  estimateMatrahAndRate,
  meetsLocalProduction,
};
