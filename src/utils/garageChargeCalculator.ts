// GarageChargeCalculator.swift birebir port. Garaj ekranı şarj simülatörü.
// Port tanımları, DC tavan tablosu ve süre/menzil hesabı Swift kaynağından aynen kopyalandı.

import type { CarSummary } from '../models/car';

// Swift Double.rounded() -> half away from zero.
function roundHalfAwayFromZero(x: number): number {
  return x < 0 ? -Math.round(-x) : Math.round(x);
}

export type GarageChargeMode = 'ac' | 'dc' | 'hpc';

export interface GaragePortOption {
  id: string;
  label: string;
  powerKw: number;
  mode: GarageChargeMode;
}

export interface GarageChargeSession {
  energyKwh: number;
  durationMins: number;
  rangeGainedKm: number;
  effectiveSpeedKw: number;
}

export interface GarageChargeCalculateParams {
  car: CarSummary;
  port: GaragePortOption;
  startPercent: number;
  targetPercent: number;
}

const DEFAULT_PORTS: GaragePortOption[] = [
  { id: 'ac-22', label: 'Type 2 · 22 kW', powerKw: 22, mode: 'ac' },
  { id: 'dc-50', label: 'CCS2 · 50 kW', powerKw: 50, mode: 'dc' },
  { id: 'dc-120', label: 'CCS2 · 120 kW', powerKw: 120, mode: 'dc' },
  { id: 'dc-180', label: 'CCS2 · 180 kW', powerKw: 180, mode: 'dc' },
  { id: 'hpc-300', label: 'CCS2 · 300 kW', powerKw: 300, mode: 'hpc' },
];

function estimateDcMaxKw(car: Pick<CarSummary, 'chargingMin'>): number {
  const minutes = car.chargingMin;
  if (minutes == null || !(minutes > 0)) {
    return 120;
  }
  if (minutes <= 22) return 250;
  if (minutes <= 30) return 180;
  if (minutes <= 40) return 150;
  if (minutes <= 50) return 120;
  return 100;
}

function calculate(params: GarageChargeCalculateParams): GarageChargeSession {
  const { car, port, startPercent, targetPercent } = params;
  const battery = car.batteryKwh ?? 65;
  const rangeKm = car.rangeKm ?? 400;
  const delta = Math.max(0, targetPercent - startPercent);
  const energy = roundHalfAwayFromZero((battery * delta) / 100 * 10) / 10;

  const dcMax = estimateDcMaxKw(car);
  let speed = port.powerKw;
  switch (port.mode) {
    case 'ac':
      speed = Math.min(22, port.powerKw);
      break;
    case 'dc':
      speed = Math.min(dcMax, port.powerKw, 120);
      break;
    case 'hpc':
      speed = Math.min(dcMax, port.powerKw, 300);
      break;
  }

  let duration = roundHalfAwayFromZero((energy / Math.max(speed, 1)) * 60);
  if (port.mode !== 'ac' && targetPercent > 80) {
    duration += Math.trunc((targetPercent - 80) * 1.1);
  }
  if (duration < 5 && energy > 0) {
    duration = 10;
  }

  const rangePerKwh = rangeKm / battery;
  const rangeGained = roundHalfAwayFromZero(energy * rangePerKwh);

  return {
    energyKwh: energy,
    durationMins: duration,
    rangeGainedKm: rangeGained,
    effectiveSpeedKw: speed,
  };
}

export const GarageChargeCalculator = {
  defaultPorts: DEFAULT_PORTS,
  estimateDcMaxKw,
  calculate,
};
