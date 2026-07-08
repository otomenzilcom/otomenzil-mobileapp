import { describe, it, expect } from '@jest/globals';

import { trunkFilterCounts, trunkRankedCars } from '../trunkRank';
import { makeCar } from '../__fixtures__/toolsFixtures';

const catalog = [
  makeCar({ id: 'a', bodyType: 'SUV', trunkLiters: 500 }),
  makeCar({ id: 'b', bodyType: 'Sedan', trunkLiters: 620 }),
  makeCar({ id: 'c', bodyType: 'SUV', trunkLiters: 0 }), // hariç: trunk yok
  makeCar({ id: 'd', bodyType: 'Hatchback', trunkLiters: 380 }),
  makeCar({ id: 'e', bodyType: 'suv', trunkLiters: 450 }), // lowercased eşleşme
];

describe('trunkRankedCars', () => {
  it('drops trunkLiters<=0 and sorts desc', () => {
    const ranked = trunkRankedCars(catalog, 'all');
    expect(ranked.map((c) => c.id)).toEqual(['b', 'a', 'e', 'd']);
  });

  it('filters by bodyType (case-insensitive lower)', () => {
    const suv = trunkRankedCars(catalog, 'suv');
    expect(suv.map((c) => c.id)).toEqual(['a', 'e']);
    const sedan = trunkRankedCars(catalog, 'sedan');
    expect(sedan.map((c) => c.id)).toEqual(['b']);
  });
});

describe('trunkFilterCounts', () => {
  it('counts only cars with trunk > 0 per body type', () => {
    expect(trunkFilterCounts(catalog)).toEqual({ all: 4, suv: 2, sedan: 1 });
  });
});
