import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { previewAddBatch, reverseAdd } from "./planner.ts";

describe("planner preview (never writes)", () => {
  test("positive: adding a batch mixes the weighted %", () => {
    const preview = previewAddBatch({
      currentQty: 4000,
      currentPct: 33,
      addQty: 4000,
      addPct: 7,
    });
    assert.equal(preview.volume, 8000);
    assert.ok(Math.abs(preview.solidPct - 20) < 1e-9);
  });

  test("positive: adding to an empty tank is just the batch", () => {
    const preview = previewAddBatch({
      currentQty: 0,
      currentPct: 0,
      addQty: 500,
      addPct: 40,
    });
    assert.equal(preview.volume, 500);
    assert.ok(Math.abs(preview.solidPct - 40) < 1e-9);
  });

  test("positive: adding 0 kg leaves the tank unchanged", () => {
    const preview = previewAddBatch({
      currentQty: 1000,
      currentPct: 25,
      addQty: 0,
      addPct: 90,
    });
    assert.equal(preview.volume, 1000);
    assert.ok(Math.abs(preview.solidPct - 25) < 1e-9);
  });
});

test("planner reverse: empty tank is infeasible and hides the amount", () => {
  const result = reverseAdd({
    currentQty: 0,
    currentPct: 0,
    chemicalPct: 40,
    targetPct: 20,
  });
  assert.equal(result.ok, false);
  assert.equal(result.quantity, null);
  assert.match(result.reason, /empty/i);
});

describe("planner reverse calc", () => {
  test("positive: exact algebra for a reachable raise", () => {
    const result = reverseAdd({
      currentQty: 1000,
      currentPct: 20,
      chemicalPct: 40,
      targetPct: 30,
    });
    assert.equal(result.ok, true);
    if (!result.ok || result.quantity === null) return;
    assert.ok(Math.abs(result.quantity - 1000) < 1e-9);
  });

  test("positive: diluting with 0% water to a reachable target", () => {
    const result = reverseAdd({
      currentQty: 1000,
      currentPct: 30,
      chemicalPct: 0,
      targetPct: 15,
    });
    assert.equal(result.ok, true);
    if (!result.ok || result.quantity === null) return;
    assert.ok(Math.abs(result.quantity - 1000) < 1e-9);
  });

  test("positive: target already equal to current with a different chemical still needs 0 kg", () => {
    const result = reverseAdd({
      currentQty: 1000,
      currentPct: 30,
      chemicalPct: 40,
      targetPct: 30,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.ok(Math.abs(result.quantity) < 1e-9);
  });

  test("positive: matching percents are feasible only when the target matches", () => {
    const match = reverseAdd({
      currentQty: 1000,
      currentPct: 30,
      chemicalPct: 30,
      targetPct: 30,
    });
    assert.equal(match.ok, true);
    if (match.ok) assert.equal(match.quantity, 0);
  });

  test("negative: matching percents cannot move the tank to a different target", () => {
    const miss = reverseAdd({
      currentQty: 1000,
      currentPct: 30,
      chemicalPct: 30,
      targetPct: 40,
    });
    assert.equal(miss.ok, false);
    assert.equal(miss.quantity, null);
  });

  test("negative: target below both current and chemical hides the amount", () => {
    const result = reverseAdd({
      currentQty: 1000,
      currentPct: 30,
      chemicalPct: 40,
      targetPct: 10,
    });
    assert.equal(result.ok, false);
    assert.equal(result.quantity, null);
    assert.match(result.reason, /outside the reachable range/i);
  });

  test("negative: target above both current and chemical hides the amount", () => {
    const result = reverseAdd({
      currentQty: 1000,
      currentPct: 10,
      chemicalPct: 20,
      targetPct: 50,
    });
    assert.equal(result.ok, false);
    assert.equal(result.quantity, null);
  });
});
