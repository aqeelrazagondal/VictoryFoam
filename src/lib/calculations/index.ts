export {
  blendMissingChemical,
  plannerMissingChemical,
  suggestBlendAlternatives,
  suggestFillAlternatives,
  suggestPlannerAlternatives,
  suggestPlannerHits,
} from "./alternatives.ts";
export type {
  Alternative,
  BlendApply,
  FillApply,
  MissingChemicalAdvice,
  PlannerApply,
} from "./alternatives.ts";
export {
  solveBlend,
  solveBlendThree,
  solveBlendThreeWithStock,
  solveBlendWithStock,
} from "./blend.ts";
export type {
  BlendAmounts,
  BlendInput,
  BlendSolveResult,
  BlendThreeAmounts,
  BlendThreeInput,
  BlendThreeSolveResult,
} from "./blend.ts";
export {
  computeRequiredBlend,
  solveFill,
  solveFillThree,
  solveFillThreeWithStock,
  solveFillWithStock,
  suggestFillPair,
} from "./fill.ts";
export type {
  FillAmounts,
  FillSolveResult,
  FillThreeAmounts,
  FillThreeSolveResult,
  RequiredBlendResult,
  SuggestedPair,
} from "./fill.ts";
export {
  formatLogWhen,
  formatPct,
  formatQty,
  parseDatetimeLocal,
  toDatetimeLocalValue,
} from "./format.ts";
export { previewAddBatch, reverseAdd } from "./planner.ts";
export type { PreviewAddResult, ReverseAddResult } from "./planner.ts";
export { checkStock, combineStockStatus } from "./stock.ts";
export type { StockCheck } from "./stock.ts";
export {
  amountsEqual,
  editChemicalAmount,
  editSolidContent,
  encodeAdjustNote,
  parseAdjustNote,
  scaleTankTotal,
  snapshotToAmounts,
} from "./composition-edit.ts";
export type {
  AdjustCompositionPayload,
  CompositionAmounts,
  CompositionEditResult,
} from "./composition-edit.ts";
export {
  canConsume,
  compositionRows,
  consumeBreakdown,
  drawableNow,
  hasReconciliationGap,
  isHeelBreach,
  replayLog,
  roomToCapacity,
  capacityOverflowMessage,
  previewTankAfterAdds,
  summarizeMix,
} from "./tank-log.ts";
export type {
  ConsumeBreakdown,
  ConsumptionRow,
  LogEntryInput,
  RunningEntry,
  TankSnapshot,
} from "./tank-log.ts";
export type { ChemicalRef, FeasibilityStatus, LogEntryType } from "./types.ts";
export { UNATTRIBUTED_KEY } from "./types.ts";
