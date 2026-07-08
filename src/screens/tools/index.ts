// Araç / hesaplayıcı ekranları barrel (Wave 5c).
//
// Prop-almayan ekran bileşenleri (store'lardan okur) + ToolsHub landing. Registry (Wave 6 sahibi)
// AppViewID → bileşen eşlemesini yapar: consumption→ConsumptionScreen, trunk→TrunkScreen,
// otv→OtvExemptionScreen, mtv→MtvScreen, vehicle-loan→VehicleLoanScreen. ToolsHub'un rotası yok
// (bkz. ToolsHub.tsx notu) — landing yuvası isteyen host için export edilir.

export { ConsumptionScreen } from './ConsumptionScreen';
export { TrunkScreen } from './TrunkScreen';
export { MtvScreen } from './MtvScreen';
export { OtvExemptionScreen } from './OtvExemptionScreen';
export { VehicleLoanScreen } from './VehicleLoanScreen';
export { VehicleLoanGuide } from './VehicleLoanGuide';
export { ToolsHub } from './ToolsHub';
export { ToolHeader } from './ToolHeader';
export type { ToolHeaderProps } from './ToolHeader';

// Saf hesap/eşleme yardımcıları (test edilebilir).
export {
  CONSUMPTION_TARIFFS,
  consumptionResult,
  type ConsumptionResult,
  type ConsumptionTariff,
  type ConsumptionTariffId,
} from './consumptionCalc';
export {
  trunkRankedCars,
  trunkFilterCounts,
  type TrunkFilterId,
  type TrunkFilterCounts,
} from './trunkRank';
export {
  MTV_DEFAULTS,
  MTV_MIN_YEAR,
  MTV_MAX_YEAR,
  mtvSeedFromCar,
  mtvCarOptionLabel,
  mtvEligibleCars,
  mtvParamsFromForm,
  mtvGuideRows,
  type MtvCarSeed,
  type MtvGuideRow,
} from './mtvForm';
export {
  otvRankedCars,
  otvEligibleCatalog,
  otvEligibleCount,
  type OtvMode,
  type OtvRankedCar,
} from './otvRanking';
export {
  LOAN_DEFAULTS,
  parseMoney,
  formatMoneyInput,
  parseRate,
  parseTerm,
} from './loanForm';
