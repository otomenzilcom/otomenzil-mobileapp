// Store test sabitleri — SessionCore / UserProfile fabrikaları.
// __fixtures__ altında (jest testMatch yalnızca __tests__ dizinini tarar; burası hariç).

import type { UserProfile } from '../../models';
import type { SessionCore } from '../authStore';

export function makeUser(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    username: 'Ada',
    email: 'ada@example.com',
    ...overrides,
  };
}

export function makeCore(overrides: Partial<SessionCore> = {}): SessionCore {
  return {
    currentUser: makeUser(),
    favorites: [],
    garageCarIds: [],
    primaryGarageCarId: '',
    sessionToken: '',
    ...overrides,
  };
}
