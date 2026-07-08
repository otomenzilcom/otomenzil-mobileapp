// Araç katalog modelleri — Car.swift birebir. JSON anahtarı == alan adı.

/** techSpecs için özyinelemeli JSON birleşimi (Swift JSONValue karşılığı). */
export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

export interface CarColor {
  name: string;
  hex: string;
}

export interface CarSummary {
  id: string;
  brand: string;
  model: string;
  year?: number;
  priceTL?: number;
  priceForeign?: string;
  trAvailable?: boolean;
  rangeKm?: number;
  batteryKwh?: number;
  powerHp?: number;
  accelerationSec?: number;
  chargingMin?: number;
  maxSpeedKmh?: number;
  driveType?: string;
  bodyType?: string;
  segment?: string;
  trunkLiters?: number;
  popularity?: number;
  rating?: number;
  ratingVoteCount?: number;
  dataVerified?: boolean;
  images?: string[];
}

/** CarSummary alanları (popularity HARİÇ) + detay alanları. */
export interface CarDetail {
  id: string;
  brand: string;
  model: string;
  year?: number;
  priceTL?: number;
  priceForeign?: string;
  trAvailable?: boolean;
  rangeKm?: number;
  batteryKwh?: number;
  powerHp?: number;
  accelerationSec?: number;
  chargingMin?: number;
  maxSpeedKmh?: number;
  driveType?: string;
  bodyType?: string;
  trunkLiters?: number;
  torqueNm?: number;
  warrantyYears?: number;
  segment?: string;
  description?: string;
  images?: string[];
  colors?: CarColor[];
  rating?: number;
  ratingVoteCount?: number;
  dataVerified?: boolean;
  techSpecs?: Record<string, JSONValue>;
}

export interface CarCatalogResponse {
  cars: CarSummary[];
  count: number;
}
