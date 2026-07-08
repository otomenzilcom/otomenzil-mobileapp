// ChargingSimulator.swift + ChargerType birebir port. Detay sayfası şarj simülatörü.
// Güç değerleri, araç-bazlı DC tavanları ve Türkçe etiketler Swift kaynağından aynen kopyalandı.

import type { CarDetail } from '../models/car';

// Swift Double.rounded() -> half away from zero.
function roundHalfAwayFromZero(x: number): number {
  return x < 0 ? -Math.round(-x) : Math.round(x);
}

export type ChargerTypeId = 'house' | 'wallbox' | 'publicAC' | 'fastDC' | 'ultraDC';

export type ChargerConnectionType = 'AC' | 'DC';

export interface ChargerTypeInfo {
  id: ChargerTypeId;
  label: string;
  powerKw: number;
  connectionType: ChargerConnectionType;
  description: string;
}

export const CHARGER_TYPE_ORDER: ChargerTypeId[] = [
  'house',
  'wallbox',
  'publicAC',
  'fastDC',
  'ultraDC',
];

export const CHARGER_TYPES: Record<ChargerTypeId, ChargerTypeInfo> = {
  house: {
    id: 'house',
    label: 'Ev Standart Priz',
    powerKw: 2.3,
    connectionType: 'AC',
    description: 'Monofaze ev prizi — acil durumlar için.',
  },
  wallbox: {
    id: 'wallbox',
    label: 'Akıllı Wallbox',
    powerKw: 11,
    connectionType: 'AC',
    description: '11 kW korumalı ev/işyeri wallbox.',
  },
  publicAC: {
    id: 'publicAC',
    label: 'Halka Açık AC',
    powerKw: 22,
    connectionType: 'AC',
    description: 'AVM ve otopark AC soketleri.',
  },
  fastDC: {
    id: 'fastDC',
    label: 'DC Hızlı Şarj',
    powerKw: 50,
    connectionType: 'DC',
    description: '50 kW hızlı DC istasyon.',
  },
  ultraDC: {
    id: 'ultraDC',
    label: 'DC Ultra Hızlı',
    powerKw: 150,
    connectionType: 'DC',
    description: '150+ kW otoyol ultra hızlı şarj.',
  },
};

function maxDcKw(car: Pick<CarDetail, 'id'>): number {
  switch (car.id) {
    case 'porsche-taycan':
      return 270;
    case 'tesla-model-y':
      return 250;
    case 'kia-ev6':
    case 'hyundai-ioniq-5':
      return 233;
    case 'bmw-i4':
      return 205;
    case 'byd-seal':
      return 150;
    case 'mg-mg4':
      return 135;
    default:
      return 150;
  }
}

function effectivePowerKw(charger: ChargerTypeInfo, car: Pick<CarDetail, 'id'>): number {
  if (charger.connectionType === 'AC') {
    return Math.min(charger.powerKw, 11);
  }
  return Math.min(charger.powerKw, maxDcKw(car));
}

export const ChargerType = {
  order: CHARGER_TYPE_ORDER,
  all: CHARGER_TYPE_ORDER.map((id) => CHARGER_TYPES[id]),
  byId(id: ChargerTypeId): ChargerTypeInfo {
    return CHARGER_TYPES[id];
  },
  effectivePowerKw,
};

export interface ChargingEstimateParams {
  batteryKwh: number;
  startPercent: number;
  targetPercent: number;
  chargerPowerKw: number;
}

function estimateMinutes(params: ChargingEstimateParams): number {
  const { batteryKwh, startPercent, targetPercent, chargerPowerKw } = params;
  if (!(batteryKwh > 0) || !(chargerPowerKw > 0) || !(targetPercent > startPercent)) {
    return 0;
  }
  const delta = (targetPercent - startPercent) / 100;
  const energyKwh = batteryKwh * delta;
  // DC taper approximation: charge slows above 80%
  const taper = targetPercent > 80 ? 1.35 : 1.0;
  return (energyKwh / chargerPowerKw) * 60 * taper;
}

function formatDuration(minutes: number): string {
  const total = roundHalfAwayFromZero(minutes);
  if (total < 60) {
    return `${total} dk`;
  }
  const hours = Math.trunc(total / 60);
  const mins = total % 60;
  return mins === 0 ? `${hours} sa` : `${hours} sa ${mins} dk`;
}

export const ChargingSimulator = {
  estimateMinutes,
  formatDuration,
};
