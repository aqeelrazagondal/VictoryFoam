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
export { solveBlend, solveBlendWithStock } from "./blend.ts";
export type { BlendAmounts, BlendInput, BlendSolveResult } from "./blend.ts";
export { computeRequiredBlend, solveFill, solveFillWithStock, suggestFillPair } from "./fill.ts";
export type {
  FillAmounts,
  FillSolveResult,
  RequiredBlendResult,
  SuggestedPair,
} from "./fill.ts";
export { formatPct, formatQty } from "./format.ts";
export { previewAddBatch, reverseAdd } from "./planner.ts";
export type { PreviewAddResult, ReverseAddResult } from "./planner.ts";
export { checkStock, combineStockStatus } from "./stock.ts";
export type { StockCheck } from "./stock.ts";
export {
  canConsume,
  compositionRows,
  consumeBreakdown,
  drawableNow,
  hasReconciliationGap,
  isHeelBreach,
  replayLog,
} from "./tank-log.ts";
export type {
  ConsumeBreakdown,
  ConsumptionRow,
  LogEntryInput,
  RunningEntry,
  TankSnapshot,
} from "./tank-log.ts";
export type { ChemicalRef, FeasibilityStatus, LogEntryType } from "./types.ts";
