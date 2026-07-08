// Şarj istasyonu modelleri — EpdkStationsData.swift.
// Wire DTO'lar (GET charging-stations + bundle seed JSON) ve normalize edilmiş
// domain tipleri. Normalizasyon/filtreleme Wave 2 util katmanında yapılır.

/** GET charging-stations / seed JSON soket DTO'su. */
export interface SocketDTO {
  type: string;
  powerKw: number;
  count: number;
  socketNumbers?: string[];
}

/**
 * GET charging-stations / seed JSON istasyon DTO'su.
 * `epdkId` eksikse `id`'den `"epdk-"` öneki soyularak int'e çevrilir (yoksa 0).
 */
export interface SeedStationDTO {
  id: string;
  epdkId?: number;
  operatorName: string;
  operatorKey: string;
  stationName: string;
  city: string;
  district: string;
  latitude: number;
  longitude: number;
  address: string;
  sockets: SocketDTO[];
  hasAc: boolean;
  hasDc: boolean;
  hasHpc: boolean;
  maxPowerKw: number;
  serviceType?: string;
  phone?: string;
}

export interface ChargingStationsResponse {
  stations: SeedStationDTO[];
}

/** Normalize edilmiş soket (powerKw yuvarlanmış int, socketNumbers zorunlu). */
export interface EPDKSocket {
  type: string;
  powerKw: number;
  count: number;
  socketNumbers: string[];
}

/** Normalize edilmiş istasyon domain modeli. */
export interface EPDKStation {
  id: string;
  epdkId: number;
  operatorName: string;
  operatorKey: string;
  stationName: string;
  city: string;
  district: string;
  latitude: number;
  longitude: number;
  address: string;
  sockets: EPDKSocket[];
  hasAc: boolean;
  hasDc: boolean;
  hasHpc: boolean;
  maxPowerKw: number;
  serviceType?: string;
  phone?: string;
}

export interface EPDKOperator {
  id: string;
  name: string;
  hotline: string;
  website: string;
}

/** turkiye-districts.json şekli: şehir → resmi ilçe listesi. */
export type DistrictsByCity = Record<string, string[]>;
