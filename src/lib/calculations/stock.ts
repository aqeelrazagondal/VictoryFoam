export type StockCheck = {
  status: "ok" | "untracked" | "insufficient";
  needed: number;
  available: number | null;
};

export function checkStock(needed: number, qtyAvailable: number | null): StockCheck {
  if (qtyAvailable === null) {
    return { status: "untracked", needed, available: null };
  }
  if (qtyAvailable + 1e-9 < needed) {
    return { status: "insufficient", needed, available: qtyAvailable };
  }
  return { status: "ok", needed, available: qtyAvailable };
}

export function combineStockStatus(
  checks: StockCheck[],
  base: "feasible",
): "feasible" | "warning" {
  const insufficient = checks.some((check) => check.status === "insufficient");
  return insufficient ? "warning" : base;
}
