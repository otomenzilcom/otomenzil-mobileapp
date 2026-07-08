// CarPriceFormatter.swift birebir port.
// Swift NumberFormatter (locale tr_TR, currency TRY, maximumFractionDigits = 0) yerine
// platform Intl farklarından kaçınmak için manuel biçimlendirme kullanılıyor:
//   - binlik ayıracı "." (tr_TR)
//   - 0 ondalık hane
//   - para simgesi başta, boşluksuz: örn. ₺1.234.567
// Yuvarlama, NumberFormatter varsayılanı olan half-even (bankacı yuvarlaması) ile eşleşir.

function roundHalfEven(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const a = Math.abs(x);
  const floor = Math.floor(a);
  const diff = a - floor;
  let r: number;
  if (diff < 0.5) {
    r = floor;
  } else if (diff > 0.5) {
    r = floor + 1;
  } else {
    r = floor % 2 === 0 ? floor : floor + 1;
  }
  return sign * r;
}

function groupThousands(intDigits: string): string {
  return intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function isAvailableInTurkey(trAvailable?: boolean | null): boolean {
  return trAvailable !== false;
}

function formatTL(amount: number): string {
  const n = roundHalfEven(amount);
  const negative = n < 0;
  const digits = groupThousands(Math.abs(n).toString());
  return `${negative ? '-' : ''}₺${digits}`;
}

function primaryPriceText(
  priceTL: number | null | undefined,
  priceForeign: string | null | undefined,
  trAvailable: boolean | null | undefined,
): string {
  if (isAvailableInTurkey(trAvailable)) {
    if (priceTL == null || !(priceTL > 0)) {
      return 'Fiyat bilgisi yok';
    }
    return formatTL(priceTL);
  }

  const foreign = (priceForeign ?? '').trim();
  return foreign === '' ? 'Yurt dışı fiyat bilgisi yok' : foreign;
}

function showsForeignBadge(trAvailable?: boolean | null): boolean {
  return !isAvailableInTurkey(trAvailable);
}

export const CarPriceFormatter = {
  isAvailableInTurkey,
  formatTL,
  primaryPriceText,
  showsForeignBadge,
};
