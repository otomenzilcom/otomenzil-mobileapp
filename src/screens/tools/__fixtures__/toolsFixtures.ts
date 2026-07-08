// Tools ekranı test sabitleri — CarSummary fabrikası (jest testMatch __tests__ tarar; burası hariç).

import type { CarSummary } from '../../../models/car';

export function makeCar(overrides: Partial<CarSummary> & Pick<CarSummary, 'id'>): CarSummary {
  return {
    brand: 'Marka',
    model: 'Model',
    ...overrides,
  } as CarSummary;
}
