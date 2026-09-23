import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { computeRequiredBlend, solveFill, solveFillWithStock, suggestFillPair } from "./fill.ts";
import type { ChemicalRef } from "./types.ts";

function chem(
  id: string,
  solidContentPct: number,
  extra: Partial<ChemicalRef> = {},
): ChemicalRef {
  return {
    id,
    name: id,
    solidContentPct,
    qtyAvailable: extra.qtyAvailable ?? null,
    unit: extra.unit ?? "kg",
    archivedAt: extra.archivedAt ?? null,
  };
}

describe("fill required blend %", () => {
  test("positive: required blend uses the added portion, not the raw target", () => {
    const required = computeRequiredBlend({
      existingQty: 4000,
      existingPct: 33,
      targetVolume: 8000,
      targetPct: 20,
    });
    assert.equal(required.ok, true);
    if (!required.ok) return;
    assert.equal(required.fillAmount, 4000);
    assert.ok(Math.abs(required.requiredBlendPct - 7) < 1e-9);
  });

  test("positive: topping up at the same % requires that same % in the added portion", () => {
    const required = computeRequiredBlend({
      existingQty: 2000,
      existingPct: 30,
      targetVolume: 5000,
      targetPct: 30,
    });
    assert.equal(required.ok, true);
    if (!required.ok) return;
    assert.equal(required.fillAmount, 3000);
    assert.ok(Math.abs(required.requiredBlendPct - 30) < 1e-9);
  });

  test("positive: filling an empty tank is just the target %", () => {
    const required = computeRequiredBlend({
      existingQty: 0,
      existingPct: 0,
      targetVolume: 1000,
      targetPct: 25,
    });
    assert.equal(required.ok, true);
    if (!required.ok) return;
    assert.equal(required.fillAmount, 1000);
    assert.ok(Math.abs(required.requiredBlendPct - 25) < 1e-9);
  });

  test("negative: target volume below existing quantity is infeasible", () => {
    const required = computeRequiredBlend({
      existingQty: 5000,
      existingPct: 33,
      targetVolume: 4000,
      targetPct: 20,
    });
    assert.equal(required.ok, false);
    if (required.ok) return;
    assert.match(required.reason, /fill up, not down/i);
  });

  test("negative: target volume equal to existing quantity is infeasible", () => {
    const required = computeRequiredBlend({
      existingQty: 4000,
      existingPct: 33,
      targetVolume: 4000,
      targetPct: 20,
    });
    assert.equal(required.ok, false);
  });
});

describe("fill pair suggestion", () => {
  const library = [
    chem("water", 0),
    chem("pop10", 10),
    chem("pop25", 25),
    chem("pop45", 45),
    chem("archived", 6, { archivedAt: "2026-01-01T00:00:00.000Z" }),
  ];

  test("positive: picks closest chemical above and below required blend %", () => {
    const pair = suggestFillPair(library, 7);
    assert.equal(pair.below?.id, "water");
    assert.equal(pair.above?.id, "pop10");
  });

  test("positive: a chemical sitting exactly on the required % is neither above nor below", () => {
    const pair = suggestFillPair(library, 10);
    assert.equal(pair.below?.id, "water");
    assert.equal(pair.above?.id, "pop25");
  });

  test("negative: archived chemicals are never suggested", () => {
    const pair = suggestFillPair(library, 7);
    assert.notEqual(pair.below?.id, "archived");
    assert.notEqual(pair.above?.id, "archived");
  });

  test("negative: no chemical on a side returns null rather than guessing", () => {
    const pair = suggestFillPair([chem("low", 5)], 7);
    assert.equal(pair.below?.id, "low");
    assert.equal(pair.above, null);
  });

  test("negative: empty library returns no pair", () => {
    const pair = suggestFillPair([], 7);
    assert.equal(pair.above, null);
    assert.equal(pair.below, null);
  });
});

describe("fill two-chemical solve", () => {
  test("positive: 1500 kg @ 25% to 8000 kg @ 33% with 45% and conventional 0%", () => {
    const required = computeRequiredBlend({
      existingQty: 1500,
      existingPct: 25,
      targetVolume: 8000,
      targetPct: 33,
    });
    assert.equal(required.ok, true);
    if (!required.ok) return;
    const result = solveFill({
      fillAmount: required.fillAmount,
      requiredActive: required.requiredActive,
      qA: 45,
      qB: 0,
    });
    assert.equal(result.ok, true);
    if (!result.ok || !result.amounts) return;
    assert.ok(Math.abs(result.amounts.xA - 5033.333333) < 0.05);
    assert.ok(Math.abs(result.amounts.xB - 1466.666667) < 0.05);
    const finalPct =
      (1500 * 25 + result.amounts.xA * 45 + result.amounts.xB * 0) / 8000;
    assert.ok(Math.abs(finalPct - 33) < 1e-9);
  });

  test("positive: 4000 kg @ 33% to 8000 kg @ 20% with 10% and 0%", () => {
    const required = computeRequiredBlend({
      existingQty: 4000,
      existingPct: 33,
      targetVolume: 8000,
      targetPct: 20,
    });
    assert.equal(required.ok, true);
    if (!required.ok) return;
    const result = solveFill({
      fillAmount: required.fillAmount,
      requiredActive: required.requiredActive,
      qA: 10,
      qB: 0,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.ok(Math.abs(result.amounts.xA - 2800) < 1e-6);
    assert.ok(Math.abs(result.amounts.xB - 1200) < 1e-6);
    const mixed =
      (4000 * 33 + result.amounts.xA * 10 + result.amounts.xB * 0) / 8000;
    assert.ok(Math.abs(mixed - 20) < 1e-6);
  });

  test("positive: equal-% pair matching required blend splits the fill 50/50", () => {
    const result = solveFill({
      fillAmount: 4000,
      requiredActive: 28_000,
      qA: 7,
      qB: 7,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.amounts, { xA: 2000, xB: 2000 });
  });

  test("negative: equal-% pair that cannot hit required blend hides amounts", () => {
    const result = solveFill({
      fillAmount: 4000,
      requiredActive: 28_000,
      qA: 10,
      qB: 10,
    });
    assert.equal(result.ok, false);
    assert.equal(result.amounts, null);
    assert.match(result.reason, /cannot reach the required blend/i);
  });

  test("negative: a pair that would go negative blanks both amounts", () => {
    const result = solveFill({
      fillAmount: 1000,
      requiredActive: 70_000,
      qA: 10,
      qB: 5,
    });
    assert.equal(result.ok, false);
    assert.equal(result.amounts, null);
    assert.match(result.reason, /negative amount/i);
  });

  test("negative: zero fill amount is infeasible", () => {
    const result = solveFill({
      fillAmount: 0,
      requiredActive: 0,
      qA: 10,
      qB: 40,
    });
    assert.equal(result.ok, false);
    assert.equal(result.amounts, null);
    assert.match(result.reason, /fill up, not down/i);
  });

  test("positive: insufficient fill stock warns but still returns amounts", () => {
    const result = solveFillWithStock(
      { fillAmount: 1000, requiredActive: 25_000, qA: 10, qB: 40 },
      { qtyA: 10, qtyB: 10_000 },
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.status, "warning");
    assert.ok(result.amounts);
    assert.equal(result.stock.chemicalA.status, "insufficient");
  });

  test("positive: untracked fill stock skips the check", () => {
    const result = solveFillWithStock(
      { fillAmount: 1000, requiredActive: 25_000, qA: 10, qB: 40 },
      { qtyA: null, qtyB: null },
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.status, "feasible");
    assert.equal(result.stock.chemicalA.status, "untracked");
    assert.equal(result.stock.chemicalB.status, "untracked");
  });
});
