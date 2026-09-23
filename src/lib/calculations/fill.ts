import { clampNonNegative, isInClosedRange, nearlyEqual } from "./format.ts";
import { checkStock, combineStockStatus, type StockCheck } from "./stock.ts";
import type { ChemicalRef, FeasibilityStatus } from "./types.ts";

export type RequiredBlendOk = {
  ok: true;
  fillAmount: number;
  requiredActive: number;
  requiredBlendPct: number;
};

export type RequiredBlendResult =
  | RequiredBlendOk
  | { ok: false; reason: string };

export function computeRequiredBlend(input: {
  existingQty: number;
  existingPct: number;
  targetVolume: number;
  targetPct: number;
}): RequiredBlendResult {
  const fillAmount = input.targetVolume - input.existingQty;
  if (fillAmount <= 0) {
    return {
      ok: false,
      reason:
        "You can only fill up, not down — use Tank Planner to dilute instead.",
    };
  }

  const requiredActive =
    input.targetVolume * input.targetPct - input.existingQty * input.existingPct;

  return {
    ok: true,
    fillAmount,
    requiredActive,
    requiredBlendPct: requiredActive / fillAmount,
  };
}

export type SuggestedPair = {
  above: ChemicalRef | null;
  below: ChemicalRef | null;
};

export function suggestFillPair(
  chemicals: ChemicalRef[],
  requiredBlendPct: number,
): SuggestedPair {
  const active = chemicals.filter((chemical) => chemical.archivedAt === null);

  const aboveCandidates = active
    .filter((chemical) => chemical.solidContentPct > requiredBlendPct + 1e-9)
    .sort((a, b) => a.solidContentPct - b.solidContentPct);

  const belowCandidates = active
    .filter((chemical) => chemical.solidContentPct < requiredBlendPct - 1e-9)
    .sort((a, b) => b.solidContentPct - a.solidContentPct);

  return {
    above: aboveCandidates[0] ?? null,
    below: belowCandidates[0] ?? null,
  };
}

export type FillAmounts = {
  xA: number;
  xB: number;
};

export type FillSolveResult =
  | {
      ok: false;
      status: "infeasible";
      reason: string;
      amounts: null;
    }
  | {
      ok: true;
      status: Exclude<FeasibilityStatus, "infeasible">;
      reason: string | null;
      amounts: FillAmounts;
      stock: { chemicalA: StockCheck; chemicalB: StockCheck };
    };

export function solveFill(input: {
  fillAmount: number;
  requiredActive: number;
  qA: number;
  qB: number;
}): Extract<FillSolveResult, { ok: false }> | {
  ok: true;
  status: "feasible";
  reason: string | null;
  amounts: FillAmounts;
} {
  const { fillAmount: F, requiredActive: R, qA, qB } = input;

  if (!(F > 0)) {
    return {
      ok: false,
      status: "infeasible",
      reason:
        "You can only fill up, not down — use Tank Planner to dilute instead.",
      amounts: null,
    };
  }

  if (nearlyEqual(qA, qB)) {
    const requiredPct = R / F;
    if (nearlyEqual(qA, requiredPct)) {
      return {
        ok: true,
        status: "feasible",
        reason: "These chemicals have the same Solid Content %. Any split of the fill amount works.",
        amounts: { xA: F / 2, xB: F / 2 },
      };
    }
    return {
      ok: false,
      status: "infeasible",
      reason:
        "These chemicals have the same Solid Content % and cannot reach the required blend.",
      amounts: null,
    };
  }

  const xA = (R - F * qB) / (qA - qB);
  const xB = F - xA;

  if (!isInClosedRange(xA, 0, F) || !isInClosedRange(xB, 0, F)) {
    return {
      ok: false,
      status: "infeasible",
      reason:
        "This pair cannot hit the target without a negative amount on one side.",
      amounts: null,
    };
  }

  return {
    ok: true,
    status: "feasible",
    reason: null,
    amounts: { xA: clampNonNegative(xA), xB: clampNonNegative(xB) },
  };
}

export type FillThreeAmounts = FillAmounts & {
  xC: number;
};

export type FillThreeSolveResult =
  | {
      ok: false;
      status: "infeasible";
      reason: string;
      amounts: null;
    }
  | {
      ok: true;
      status: Exclude<FeasibilityStatus, "infeasible">;
      reason: string | null;
      amounts: FillThreeAmounts;
      stock: { chemicalA: StockCheck; chemicalB: StockCheck; chemicalC: StockCheck };
    };

export function solveFillThree(input: {
  fillAmount: number;
  requiredActive: number;
  qA: number;
  qB: number;
  qC: number;
  xC: number;
}): Extract<FillThreeSolveResult, { ok: false }> | {
  ok: true;
  status: "feasible";
  reason: string | null;
  amounts: FillThreeAmounts;
} {
  const { fillAmount: F, requiredActive: R, qA, qB, qC, xC } = input;

  if (!(F > 0)) {
    return {
      ok: false,
      status: "infeasible",
      reason:
        "You can only fill up, not down — use Tank Planner to dilute instead.",
      amounts: null,
    };
  }

  if (xC < -1e-9) {
    return {
      ok: false,
      status: "infeasible",
      reason: "The locked third-chemical amount cannot be negative.",
      amounts: null,
    };
  }

  if (xC - F > 1e-9) {
    return {
      ok: false,
      status: "infeasible",
      reason: "The locked third-chemical amount must be less than the fill amount.",
      amounts: null,
    };
  }

  if (nearlyEqual(xC, 0)) {
    const pair = solveFill({ fillAmount: F, requiredActive: R, qA, qB });
    if (!pair.ok || !pair.amounts) return pair;
    return {
      ...pair,
      amounts: { ...pair.amounts, xC: 0 },
    };
  }

  if (nearlyEqual(xC, F)) {
    if (!nearlyEqual(qC * F, R)) {
      return {
        ok: false,
        status: "infeasible",
        reason: "The locked third chemical cannot fill the whole addition at that target.",
        amounts: null,
      };
    }
    return {
      ok: true,
      status: "feasible",
      reason: null,
      amounts: { xA: 0, xB: 0, xC: clampNonNegative(F) },
    };
  }

  const pair = solveFill({
    fillAmount: F - xC,
    requiredActive: R - xC * qC,
    qA,
    qB,
  });
  if (!pair.ok || !pair.amounts) {
    return {
      ok: false,
      status: "infeasible",
      reason:
        pair.reason ||
        "The remaining pair cannot hit the target after the locked third chemical.",
      amounts: null,
    };
  }

  return {
    ...pair,
    amounts: { ...pair.amounts, xC: clampNonNegative(xC) },
  };
}

export function solveFillThreeWithStock(
  input: {
    fillAmount: number;
    requiredActive: number;
    qA: number;
    qB: number;
    qC: number;
    xC: number;
  },
  stock: { qtyA: number | null; qtyB: number | null; qtyC: number | null },
): FillThreeSolveResult {
  const solved = solveFillThree(input);
  if (!solved.ok || !solved.amounts) {
    return solved;
  }

  const chemicalA = checkStock(solved.amounts.xA, stock.qtyA);
  const chemicalB = checkStock(solved.amounts.xB, stock.qtyB);
  const chemicalC = checkStock(solved.amounts.xC, stock.qtyC);

  return {
    ...solved,
    status: combineStockStatus([chemicalA, chemicalB, chemicalC], "feasible"),
    stock: { chemicalA, chemicalB, chemicalC },
  };
}

export function solveFillWithStock(
  input: {
    fillAmount: number;
    requiredActive: number;
    qA: number;
    qB: number;
  },
  stock: { qtyA: number | null; qtyB: number | null },
): FillSolveResult {
  const solved = solveFill(input);
  if (!solved.ok || !solved.amounts) {
    return solved;
  }

  const chemicalA = checkStock(solved.amounts.xA, stock.qtyA);
  const chemicalB = checkStock(solved.amounts.xB, stock.qtyB);

  return {
    ...solved,
    status: combineStockStatus([chemicalA, chemicalB], "feasible"),
    stock: { chemicalA, chemicalB },
  };
}
