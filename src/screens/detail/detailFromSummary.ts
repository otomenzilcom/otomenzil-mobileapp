// CarSummary → CarDetail tohumu (iOS CarDetail(summary:) karşılığı; client.ts'teki özel
// detailFromSummary ile aynı kural: popularity düşürülür, detay alanları undefined kalır).
// İlk boyama (instant paint) için kullanılır — ağ yanıtı gelene kadar özet alanları gösterilir.

import type { CarDetail, CarSummary } from '../../models/car';

export function detailFromSummary(summary: CarSummary): CarDetail {
  const { popularity: _popularity, ...rest } = summary;
  return { ...rest };
}
