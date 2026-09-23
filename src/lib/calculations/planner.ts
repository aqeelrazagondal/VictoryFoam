import { clampNonNegative, nearlyEqual } from "./format.ts";

export type PreviewAddResult = {
  volume: number;
  solidPct: number;
};

export function previewAddBatch(input: {
  currentQty: number;
  currentPct: number;
  addQty: number;
  addPct: number;
}): PreviewAddResult {
  const volume = input.currentQty + input.addQty;
  const solidPct =
    volume === 0
      ? 0
      : (input.currentQty * input.currentPct + input.addQty * input.addPct) / volume;
  return { volume, solidPct };
}

export type ReverseAddResult =
  | { ok: false; status: "infeasible"; reason: string; quantity: null }
  | { ok: true; status: "feasible"; reason: string | null; quantity: number };

export function reverseAdd(input: {
  currentQty: number;
  currentPct: number;
  chemicalPct: number;
  targetPct: number;
}): ReverseAddResult {
  const { currentQty, currentPct, chemicalPct, targetPct } = input;

  if (!(currentQty > 0)) {
    return {
      ok: false,
      status: "infeasible",
      reason:
        "The tank is empty. Use Blend Calculator for a fresh batch, or add an Opening Balance in Tank Log.",
      quantity: null,
    };
  }

  if (nearlyEqual(chemicalPct, currentPct)) {
    if (nearlyEqual(targetPct, currentPct)) {
      return {
        ok: true,
        status: "feasible",
        reason:
          "The tank is already at this %. Adding this chemical will not change Solid Content %.",
        quantity: 0,
      };
    }
    return {
      ok: false,
      status: "infeasible",
      reason:
        "This chemical has the same Solid Content % as the tank, so it cannot move the blend to a different target.",
      quantity: null,
    };
  }

  const lo = Math.min(currentPct, chemicalPct);
  const hi = Math.max(currentPct, chemicalPct);
  if (targetPct < lo - 1e-9 || targetPct > hi + 1e-9) {
    return {
      ok: false,
      status: "infeasible",
      reason: `Target ${targetPct}% is outside the reachable range (${lo}%–${hi}%).`,
      quantity: null,
    };
  }

  const quantity =
    (currentQty * (targetPct - currentPct)) / (chemicalPct - targetPct);

  if (!Number.isFinite(quantity) || quantity < -1e-9) {
    return {
      ok: false,
      status: "infeasible",
      reason: "That target is not reachable with this chemical.",
      quantity: null,
    };
  }

  return {
    ok: true,
    status: "feasible",
    reason: null,
    quantity: clampNonNegative(quantity),
  };
}
