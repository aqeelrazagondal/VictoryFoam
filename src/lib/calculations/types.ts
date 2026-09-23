export type FeasibilityStatus = "feasible" | "warning" | "infeasible";

export type LogEntryType =
  | "opening_balance"
  | "add_batch"
  | "consume_usage"
  | "adjust_composition";

export const UNATTRIBUTED_KEY = "unattributed";

export type ChemicalRef = {
  id: string;
  name: string;
  solidContentPct: number;
  qtyAvailable: number | null;
  unit: string;
  archivedAt: string | null;
};
