import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { solveBlend, solveBlendWithStock } from "./blend.ts";

describe("blend calculator", () => {
  test("positive: two-component solve matches the weighted-average identity", () => {
    const result = solveBlend({ q1: 10, q2: 40, targetPct: 25, targetQty: 1000 });
    assert.equal(result.ok, true);
    if (!result.ok || !result.amounts) return;
    const { x1, x2 } = result.amounts;
    assert.equal(x1 + x2, 1000);
    assert.ok(Math.abs((x1 * 10 + x2 * 40) / 1000 - 25) < 1e-9);
    assert.equal(x1, 500);
    assert.equal(x2, 500);
    assert.equal(result.anyRatio, false);
    assert.equal(result.status, "feasible");
  });

  test("positive: swapped chemical order still yields the same mix", () => {
    const forward = solveBlend({ q1: 10, q2: 40, targetPct: 25, targetQty: 1000 });
    const swapped = solveBlend({ q1: 40, q2: 10, targetPct: 25, targetQty: 1000 });
    assert.equal(forward.ok, true);
    assert.equal(swapped.ok, true);
    if (!forward.ok || !swapped.ok) return;
    assert.ok(Math.abs(forward.amounts.x1 - swapped.amounts.x2) < 1e-9);
    assert.ok(Math.abs(forward.amounts.x2 - swapped.amounts.x1) < 1e-9);
  });

  test("positive: target exactly at the lower chemical uses only that chemical", () => {
    const result = solveBlend({ q1: 10, q2: 40, targetPct: 10, targetQty: 800 });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.ok(Math.abs(result.amounts.x1 - 800) < 1e-9);
    assert.ok(Math.abs(result.amounts.x2) < 1e-9);
  });

  test("positive: target exactly at the higher chemical uses only that chemical", () => {
    const result = solveBlend({ q1: 10, q2: 40, targetPct: 40, targetQty: 800 });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.ok(Math.abs(result.amounts.x1) < 1e-9);
    assert.ok(Math.abs(result.amounts.x2 - 800) < 1e-9);
  });

  test("positive: equal-% chemicals matching target is any-ratio feasible", () => {
    const result = solveBlend({ q1: 25, q2: 25, targetPct: 25, targetQty: 800 });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.anyRatio, true);
    assert.deepEqual(result.amounts, { x1: 400, x2: 400 });
    assert.match(result.reason ?? "", /any ratio/i);
  });

  test("positive: 0% water with a 40% chemical can hit 20%", () => {
    const result = solveBlend({ q1: 0, q2: 40, targetPct: 20, targetQty: 2000 });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.ok(Math.abs(result.amounts.x1 - 1000) < 1e-9);
    assert.ok(Math.abs(result.amounts.x2 - 1000) < 1e-9);
  });

  test("negative: target above the chemical range is infeasible and hides amounts", () => {
    const result = solveBlend({ q1: 10, q2: 20, targetPct: 35, targetQty: 100 });
    assert.equal(result.ok, false);
    assert.equal(result.amounts, null);
    assert.equal(result.status, "infeasible");
    assert.match(result.reason, /outside the range/i);
  });

  test("negative: target below the chemical range is infeasible and hides amounts", () => {
    const result = solveBlend({ q1: 30, q2: 50, targetPct: 10, targetQty: 100 });
    assert.equal(result.ok, false);
    assert.equal(result.amounts, null);
    assert.match(result.reason, /outside the range/i);
  });

  test("negative: equal-% chemicals with a different target is infeasible", () => {
    const result = solveBlend({ q1: 25, q2: 25, targetPct: 30, targetQty: 800 });
    assert.equal(result.ok, false);
    assert.equal(result.amounts, null);
    assert.match(result.reason, /must match/i);
  });

  test("negative: target quantity of 0 is infeasible", () => {
    const result = solveBlend({ q1: 10, q2: 40, targetPct: 25, targetQty: 0 });
    assert.equal(result.ok, false);
    assert.equal(result.amounts, null);
    assert.match(result.reason, /greater than 0/i);
  });

  test("negative: negative target quantity is infeasible", () => {
    const result = solveBlend({ q1: 10, q2: 40, targetPct: 25, targetQty: -100 });
    assert.equal(result.ok, false);
    assert.equal(result.amounts, null);
  });

  test("positive: insufficient stock warns but still returns amounts", () => {
    const result = solveBlendWithStock(
      { q1: 10, q2: 40, targetPct: 25, targetQty: 1000 },
      { qty1: 10, qty2: 10_000 },
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.status, "warning");
    assert.ok(result.amounts);
    assert.equal(result.stock.chemical1.status, "insufficient");
    assert.equal(result.stock.chemical2.status, "ok");
  });

  test("positive: both chemicals short of stock still show numbers as a warning", () => {
    const result = solveBlendWithStock(
      { q1: 10, q2: 40, targetPct: 25, targetQty: 1000 },
      { qty1: 1, qty2: 1 },
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.status, "warning");
    assert.equal(result.stock.chemical1.status, "insufficient");
    assert.equal(result.stock.chemical2.status, "insufficient");
  });

  test("positive: exact stock match is feasible, not a warning", () => {
    const result = solveBlendWithStock(
      { q1: 10, q2: 40, targetPct: 25, targetQty: 1000 },
      { qty1: 500, qty2: 500 },
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.status, "feasible");
    assert.equal(result.stock.chemical1.status, "ok");
    assert.equal(result.stock.chemical2.status, "ok");
  });

  test("positive: untracked stock skips the insufficient-stock check", () => {
    const result = solveBlendWithStock(
      { q1: 10, q2: 40, targetPct: 25, targetQty: 1000 },
      { qty1: null, qty2: 1 },
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.stock.chemical1.status, "untracked");
    assert.equal(result.stock.chemical2.status, "insufficient");
    assert.equal(result.status, "warning");
  });

  test("positive: both untracked stays feasible", () => {
    const result = solveBlendWithStock(
      { q1: 10, q2: 40, targetPct: 25, targetQty: 1000 },
      { qty1: null, qty2: null },
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.status, "feasible");
    assert.equal(result.stock.chemical1.status, "untracked");
    assert.equal(result.stock.chemical2.status, "untracked");
  });

  test("negative: stock is not checked when the blend itself is infeasible", () => {
    const result = solveBlendWithStock(
      { q1: 10, q2: 20, targetPct: 50, targetQty: 100 },
      { qty1: 0, qty2: 0 },
    );
    assert.equal(result.ok, false);
    assert.equal(result.amounts, null);
    assert.equal("stock" in result, false);
  });
});
