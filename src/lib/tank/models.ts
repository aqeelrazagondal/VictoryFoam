import type { LogEntryType } from "@/lib/calculations";

export type Chemical = {
  id: string;
  name: string;
  solidContentPct: number;
  qtyAvailable: number | null;
  unit: string;
  ohValue: number | null;
  viscosity: number | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
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

export type TankLogEntry = {
  id: string;
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
