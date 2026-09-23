import { clampNonNegative, isInClosedRange, nearlyEqual } from "./format.ts";
import { checkStock, combineStockStatus, type StockCheck } from "./stock.ts";
import type { FeasibilityStatus } from "./types.ts";

export type BlendInput = {
  q1: number;
  q2: number;
  targetPct: number;
  targetQty: number;
};

export type BlendAmounts = {
  x1: number;
  x2: number;
};

export type BlendSolveResult =
  | {
      ok: false;
      status: "infeasible";
      reason: string;
      amounts: null;
      anyRatio: false;
    }
  | {
      ok: true;
      status: Exclude<FeasibilityStatus, "infeasible">;
      reason: string | null;
      amounts: BlendAmounts;
      anyRatio: boolean;
      stock: { chemical1: StockCheck; chemical2: StockCheck };
    };

export type BlendCoreResult =
  | {
      ok: false;
      status: "infeasible";
      reason: string;
      amounts: null;
      anyRatio: false;
    }
  | {
      ok: true;
      status: "feasible";
      reason: string | null;
      amounts: BlendAmounts;
      anyRatio: boolean;
    };

export function solveBlend(input: BlendInput): BlendCoreResult {
  const { q1, q2, targetPct, targetQty } = input;

  if (!(targetQty > 0)) {
    return {
      ok: false,
      status: "infeasible",
      reason: "Enter a target quantity greater than 0.",
      amounts: null,
      anyRatio: false,
    };
  }

  if (nearlyEqual(q1, q2)) {
    if (nearlyEqual(targetPct, q1)) {
      return {
        ok: true,
        status: "feasible",
        reason: "These chemicals have the same Solid Content %. Any ratio works.",
        amounts: { x1: targetQty / 2, x2: targetQty / 2 },
        anyRatio: true,
      };
    }
    return {
      ok: false,
      status: "infeasible",
      reason:
        "These chemicals have the same Solid Content %. The target % must match that value.",
      amounts: null,
      anyRatio: false,
    };
  }

  const lo = Math.min(q1, q2);
  const hi = Math.max(q1, q2);
  if (targetPct < lo - 1e-9 || targetPct > hi + 1e-9) {
    return {
      ok: false,
      status: "infeasible",
      reason: `Target ${targetPct}% is outside the range spanned by the two chemicals (${lo}%–${hi}%).`,
      amounts: null,
      anyRatio: false,
    };
  }

  const x1 = (targetQty * (q2 - targetPct)) / (q2 - q1);
  const x2 = targetQty - x1;

  if (!isInClosedRange(x1, 0, targetQty) || !isInClosedRange(x2, 0, targetQty)) {
    return {
      ok: false,
      status: "infeasible",
      reason: "That target is not reachable with this pair of chemicals.",
      amounts: null,
      anyRatio: false,
    };
  }

  return {
    ok: true,
    status: "feasible",
    reason: null,
    amounts: { x1: clampNonNegative(x1), x2: clampNonNegative(x2) },
    anyRatio: false,
  };
}

export function solveBlendWithStock(
  input: BlendInput,
  stock: { qty1: number | null; qty2: number | null },
): BlendSolveResult {
  const solved = solveBlend(input);
  if (!solved.ok || !solved.amounts) {
    return solved;
  }

  const chemical1 = checkStock(solved.amounts.x1, stock.qty1);
  const chemical2 = checkStock(solved.amounts.x2, stock.qty2);
  const status = combineStockStatus([chemical1, chemical2], "feasible");

  return {
    ...solved,
    status,
    stock: { chemical1, chemical2 },
  };
}
