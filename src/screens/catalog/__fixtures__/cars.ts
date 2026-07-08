// Katalog ekran testleri için CarSummary fabrikası.
// __fixtures__ altında (jest testMatch yalnızca __tests__ dizinini tarar; burası hariç tutulur).

import type { CarSummary } from '../../../models/car';

export function makeCar(overrides: Partial<CarSummary> & Pick<CarSummary, 'id'>): CarSummary {
  return {
    brand: 'Marka',
    model: 'Model',
    ...overrides,
  } as CarSummary;
}
