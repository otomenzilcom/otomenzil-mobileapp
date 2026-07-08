// Test sabitleri — CarSummary / EPDKStation fabrikaları.
// __fixtures__ altında (jest testMatch __tests__ dizinini tarar; burası hariç).

import type { CarSummary } from '../../models/car';
import type { EPDKSocket, EPDKStation } from '../../models/stations';

export function makeCar(overrides: Partial<CarSummary> & Pick<CarSummary, 'id'>): CarSummary {
  return {
    brand: 'Marka',
    model: 'Model',
    ...overrides,
  } as CarSummary;
}

export function makeSocket(overrides: Partial<EPDKSocket> = {}): EPDKSocket {
  return {
    type: '',
    powerKw: 0,
    count: 1,
    socketNumbers: [],
    ...overrides,
  };
}

export function makeStation(
  overrides: Partial<EPDKStation> & Pick<EPDKStation, 'id'>,
): EPDKStation {
  return {
    epdkId: 0,
    operatorName: 'ZES',
    operatorKey: 'zes',
    stationName: '',
    city: 'İstanbul',
    district: '',
    latitude: 41.0,
    longitude: 29.0,
    address: '',
    sockets: [],
    hasAc: false,
    hasDc: true,
    hasHpc: false,
    maxPowerKw: 0,
    ...overrides,
  };
}
