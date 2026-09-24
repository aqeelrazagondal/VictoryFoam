import type { LogEntryType } from "@/lib/calculations";

import type { StockMovementType } from "@/lib/tank/models";

const EPS = 1e-9;

export type StockBalanceChange = {
  applied: true;
  signedQuantity: number;
  balanceAfter: number;
};

export type StockBalanceSkip = {
  applied: false;
};

/**
 * Next on-hand balance.
 * Receive, issue, waste, and pour take a positive kilograms-moved value.
 * Count takes the kilograms just counted and stores the signed difference.
 * A pour leaves untracked stock (null) unchanged.
 */
/**
 * Next on-hand balance.
 * Receive, issue, waste, and pour take a positive kilograms-moved value.
 * Count takes the kilograms just counted and stores the signed difference.
 * A pour leaves untracked stock (null) unchanged.
 */
export function nextStockBalance(
  current: number | null,
  type: StockMovementType,
  quantity: number,
): StockBalanceChange | StockBalanceSkip {
  if (!Number.isFinite(quantity)) {
    throw new Error("Quantity must be a number.");
  }
  if (type === "pour" && current === null) {
    return { applied: false };
  }
  if (type === "count") {
    if (quantity < 0) throw new Error("Counted stock cannot be negative.");
    const base = current ?? 0;
    const signedQuantity = quantity - base;
    return { applied: true, signedQuantity, balanceAfter: base + signedQuantity };
  }
  if (!(quantity > 0)) throw new Error("Quantity must be greater than zero.");
  const base = current ?? 0;
  const signedQuantity = type === "receive" ? quantity : -quantity;
  return { applied: true, signedQuantity, balanceAfter: base + signedQuantity };
}

export type StockLine = {
  chemicalId: string;
  type: StockMovementType;
  quantity: number;
};

/** Applies every line against a copy of `balances`. Throws leave the original map unchanged. */
export function applyMovementLines(
  balances: Record<string, number | null>,
  lines: StockLine[],
): Record<string, number | null> {
  const next = { ...balances };
  for (const line of lines) {
    if (!Object.prototype.hasOwnProperty.call(next, line.chemicalId)) {
      throw new Error("Chemical not found.");
    }
    const change = nextStockBalance(next[line.chemicalId], line.type, line.quantity);
    if (change.applied) next[line.chemicalId] = change.balanceAfter;
  }
  return next;
}

/** Only a confirmed pour into the tank takes kilograms off the shelf. */
export function shouldDeductStock(type: LogEntryType) {
  return type === "add_batch";
}

/** Undo a signed movement against the current on-hand balance. */
export function reversedBalance(current: number, signedQuantity: number) {
  return current - signedQuantity;
}

export function stockLabel(
  qtyAvailable: number | null,
  reorderKg: number | null,
): "Stock not tracked" | "Short" | "Low" | null {
  if (qtyAvailable === null) return "Stock not tracked";
  if (qtyAvailable < -EPS) return "Short";
  if (reorderKg !== null && qtyAvailable + EPS < reorderKg) return "Low";
  return null;
}
