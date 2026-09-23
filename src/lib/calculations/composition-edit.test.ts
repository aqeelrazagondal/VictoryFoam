import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  editChemicalAmount,
  encodeAdjustNote,
  parseAdjustNote,
  scaleTankTotal,
  type CompositionAmounts,
} from "./composition-edit.ts";
import { formatQty } from "./format.ts";

const base: CompositionAmounts = {
  remainingByChemical: { a: 1063.4, b: 527.5, c: 166.2 },
  unattributed: 0,
  volume: 1757.1,
  solidPct: 28.64,
};

const pcts = { a: 45, b: 25, c: 0 };

describe("editChemicalAmount", () => {
  test("positive: editing one chemical keeps the total and rebalances the others", () => {
    const result = editChemicalAmount(base, pcts, "a", 1200);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.ok(Math.abs(result.next.volume - base.volume) < 1e-9);
    assert.ok(Math.abs(result.next.remainingByChemical.a! - 1200) < 1e-9);
    const otherSum =
      (result.next.remainingByChemical.b ?? 0) + (result.next.remainingByChemical.c ?? 0);
    assert.ok(Math.abs(otherSum - (base.volume - 1200)) < 1e-6);
    const ratioB = 527.5 / (527.5 + 166.2);
    assert.ok(Math.abs((result.next.remainingByChemical.b ?? 0) - (base.volume - 1200) * ratioB) < 1e-6);
    assert.ok(Math.abs(result.next.solidPct - base.solidPct) > 0.01);
  });

  test("positive: unattributed participates in the rebalance", () => {
    const withUna: CompositionAmounts = {
      remainingByChemical: { a: 800, b: 400 },
      unattributed: 200,
      volume: 1400,
      solidPct: 20,
    };
    const result = editChemicalAmount(withUna, { a: 40, b: 0 }, "a", 1000);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.ok(Math.abs(result.next.volume - 1400) < 1e-9);
    assert.ok(Math.abs(result.next.remainingByChemical.a! - 1000) < 1e-9);
    assert.ok(Math.abs((result.next.remainingByChemical.b ?? 0) + result.next.unattributed - 400) < 1e-6);
    assert.ok(result.next.unattributed > 0);
  });

  test("positive: a single chemical changes the total", () => {
    const single: CompositionAmounts = {
      remainingByChemical: { a: 1000 },
      unattributed: 0,
      volume: 1000,
      solidPct: 45,
    };
    const result = editChemicalAmount(single, { a: 45 }, "a", 800);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.next.volume, 800);
    assert.equal(result.next.remainingByChemical.a, 800);
    assert.equal(result.next.solidPct, 45);
  });

  test("negative: more than the tank total is refused", () => {
    const result = editChemicalAmount(base, pcts, "a", 2000);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.reason, /more than the/);
    assert.match(result.reason, new RegExp(formatQty(base.volume)));
  });

  test("negative: nowhere to put the difference when others are zero", () => {
    const stuck: CompositionAmounts = {
      remainingByChemical: { a: 1000, b: 0 },
      unattributed: 0,
      volume: 1000,
      solidPct: 40,
    };
    const result = editChemicalAmount(stuck, { a: 40, b: 10 }, "a", 800);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.reason, /already at 0 kg/);
  });
});

describe("scaleTankTotal", () => {
  test("positive: scaling keeps solid content and ratios", () => {
    const result = scaleTankTotal(base, 2000, 8000);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.ok(Math.abs(result.next.volume - 2000) < 1e-9);
    assert.equal(result.next.solidPct, base.solidPct);
    const factor = 2000 / base.volume;
    assert.ok(Math.abs(result.next.remainingByChemical.a! - 1063.4 * factor) < 1e-6);
    assert.ok(Math.abs(result.next.remainingByChemical.b! - 527.5 * factor) < 1e-6);
  });

  test("negative: above capacity uses the tank-holds copy", () => {
    const result = scaleTankTotal(base, 9000, 8000);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.reason, /The tank holds/);
    assert.match(result.reason, /8.?000/);
  });

  test("negative: below zero is refused", () => {
    const result = scaleTankTotal(base, -1, 8000);
    assert.equal(result.ok, false);
  });
});

describe("adjust note codec", () => {
  test("round-trips remainings for replay", () => {
    const note = encodeAdjustNote({
      remainingByChemical: { a: 10, b: 20 },
      unattributed: 5,
    });
    assert.deepEqual(parseAdjustNote(note), {
      remainingByChemical: { a: 10, b: 20 },
      unattributed: 5,
    });
  });
});
