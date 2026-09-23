import type { LogEntryType } from "@/lib/calculations";

export type Chemical = {
  id: string;
  name: string;
  solidContentPct: number;
  qtyAvailable: number | null;
  unit: string;
  ohValue: number | null;
  viscosity: number | null;
  reorderKg: number | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export const STOCK_MOVEMENT_TYPES = ["receive", "issue", "waste", "count", "pour"] as const;

export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

export type StockMovement = {
  id: string;
  chemicalId: string;
  type: StockMovementType;
  /** Signed change in on-hand. A count stores the difference from the previous balance. */
  quantity: number;
  balanceAfter: number;
  note: string | null;
  tankLogEntryId: string | null;
  createdAt: string;
};

export type StockMovementInput = {
  type: StockMovementType;
  /**
   * Kilograms moved for receive, issue, waste, and pour.
   * For count, the kilograms just counted.
   */
  quantity: number;
  note?: string | null;
  tankLogEntryId?: string | null;
};

export type ChemicalDraft = {
  name: string;
  solidContentPct: number;
  qtyAvailable: number | null;
  unit: string;
  ohValue: number | null;
  viscosity: number | null;
};

export type TankSettings = {
  capacity: number | null;
  heel: number;
};

export type Tank = {
  id: string;
  name: string;
  capacity: number | null;
  heel: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TankLogEntry = {
  id: string;
  tankId: string;
  entryDate: string;
  type: LogEntryType;
  chemicalId: string | null;
  quantity: number;
  solidContentPct: number | null;
  note: string | null;
  createdAt: string;
};

export type TankLogDraft = {
  entryDate?: string;
  /** Full ISO timestamp written to created_at when the factory sets a clock time. */
  loggedAt?: string;
  type: LogEntryType;
  chemicalId: string | null;
  quantity: number;
  solidContentPct: number | null;
  note: string | null;
};

export type BlendLastCalculation = {
  chemical1Id: string;
  chemical2Id: string;
  chemical3Id?: string | null;
  thirdQty?: number | null;
  targetPct: number;
  targetQty: number;
};

export type FillLastCalculation = {
  targetVolume: number;
  targetPct: number;
  chemicalAId: string | null;
  chemicalBId: string | null;
  chemicalCId?: string | null;
  thirdQty?: number | null;
};

export type LastCalculator = "blend" | "fill";

export function isDuplicateName(
  name: string,
  chemicals: Chemical[],
  exceptId?: string,
) {
  const needle = name.trim().toLowerCase();
  return chemicals.some(
    (chemical) =>
      chemical.id !== exceptId &&
      chemical.archivedAt === null &&
      chemical.name.trim().toLowerCase() === needle,
  );
}

export function toChemicalRef(chemical: Chemical) {
  return {
    id: chemical.id,
    name: chemical.name,
    solidContentPct: chemical.solidContentPct,
    qtyAvailable: chemical.qtyAvailable,
    unit: chemical.unit,
    archivedAt: chemical.archivedAt,
  };
}
