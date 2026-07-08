// Jest global kurulumu (jest-expo preset üstüne).
//
// AsyncStorage native modülünü resmi in-memory mock ile değiştirir; api/http.ts (yerel GET
// önbelleği) ve store'lar (preferences/campaign/bootstrapCache) test ortamında bu modülü içe
// aktardığından gereklidir. Mock, testler arası durumu korumaz — her test kendi anahtarlarını
// yazar/okur; gerekirse test içinde AsyncStorage.clear() çağrılabilir.

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// expo-secure-store: localAuthSession testleri için basit in-memory mock.
jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    setItemAsync: jest.fn((key, value) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    getItemAsync: jest.fn((key) => Promise.resolve(store.get(key) ?? null)),
    deleteItemAsync: jest.fn((key) => {
      store.delete(key);
      return Promise.resolve();
    }),
  };
});
