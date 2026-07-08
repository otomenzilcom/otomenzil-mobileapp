// Benzer araç motoru — toplamsal skor, varsayılan limit 6. SimilarCarsEngine.swift birebir.
// Skor: bodyType +4, segment +3, driveType +1, trAvailable eşit +1, aynı marka -1,
// artı fiyat/menzil yakınlık puanları. Skor azalan, eşitlikte popülarite azalan.

import type { CarSummary } from '../models/car';

function priceScore(a: number, b: number): number {
  if (!(a > 0 && b > 0)) return 0;
  const diff = Math.abs(a - b) / Math.max(a, b);
  if (diff <= 0.15) return 3;
  if (diff <= 0.3) return 2;
  if (diff <= 0.45) return 1;
  return 0;
}

function rangeScore(a: number, b: number): number {
  if (!(a > 0 && b > 0)) return 0;
  const diff = Math.abs(a - b) / Math.max(a, b);
  if (diff <= 0.12) return 3;
  if (diff <= 0.25) return 2;
  if (diff <= 0.4) return 1;
  return 0;
}

function similar(car: CarSummary, catalog: CarSummary[], limit = 6): CarSummary[] {
  return catalog
    .filter((candidate) => candidate.id !== car.id)
    .map((candidate) => {
      let score = 0;
      if (candidate.bodyType === car.bodyType) score += 4;
      if (candidate.segment === car.segment) score += 3;
      if (candidate.driveType === car.driveType) score += 1;
      score += priceScore(car.priceTL ?? 0, candidate.priceTL ?? 0);
      score += rangeScore(car.rangeKm ?? 0, candidate.rangeKm ?? 0);
      if (candidate.brand === car.brand) score -= 1;
      if (candidate.trAvailable === car.trAvailable) score += 1;
      return { candidate, score };
    })
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return (b.candidate.popularity ?? 0) - (a.candidate.popularity ?? 0);
    })
    .slice(0, limit)
    .map((entry) => entry.candidate);
}

export const SimilarCarsEngine = {
  similar,
  priceScore,
  rangeScore,
};
