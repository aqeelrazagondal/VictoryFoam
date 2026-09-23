import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  editChemicalAmount,
  editSolidContent,
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

  test("positive: the only chemical with kilograms may change the tank total", () => {
    const stuck: CompositionAmounts = {
      remainingByChemical: { a: 1000, b: 0 },
      unattributed: 0,
      volume: 1000,
      solidPct: 40,
    };
    const result = editChemicalAmount(stuck, { a: 40, b: 10 }, "a", 800);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.next.volume, 800);
    assert.equal(result.next.remainingByChemical.a, 800);
    assert.equal(result.next.solidPct, 40);
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

describe("editSolidContent", () => {
  const live: CompositionAmounts = {
    remainingByChemical: { a: 1982.2, b: 165.6, c: 52.2 },
    unattributed: 0,
    volume: 2200,
    solidPct: (1982.2 * 45 + 165.6 * 25 + 52.2 * 0) / 2200,
  };
  const livePcts = { a: 45, b: 25, c: 0 };
  const liveNames = {
    a: "polymer polyol 3125",
    b: "polymer polyol 2045",
    c: "Conventional Polyol",
  };

  test("positive: reachable target keeps total and hits solid %", () => {
    const result = editSolidContent(live, livePcts, liveNames, 28);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.ok(Math.abs(result.next.volume - 2200) < 1e-6);
    assert.ok(Math.abs(result.next.solidPct - 28) < 0.05);
    for (const amount of Object.values(result.next.remainingByChemical)) {
      assert.ok(amount >= -1e-9);
    }
    assert.ok(Math.abs(result.next.remainingByChemical.a! - live.remainingByChemical.a!) > 0.05);
  });

  test("negative: above the strongest chemical is refused", () => {
    const result = editSolidContent(live, livePcts, liveNames, 50);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.reason, /polymer polyol 3125/);
    assert.match(result.reason, /45%/);
  });

  test("negative: below the weakest chemical is refused", () => {
    const midFloor: CompositionAmounts = {
      remainingByChemical: { a: 1100, b: 1100 },
      unattributed: 0,
      volume: 2200,
      solidPct: 35,
    };
    const result = editSolidContent(
      midFloor,
      { a: 45, b: 25 },
      { a: "polymer polyol 3125", b: "polymer polyol 2045" },
      10,
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.reason, /polymer polyol 2045/);
    assert.match(result.reason, /25%/);
  });

  test("negative: below 0 is refused", () => {
    const result = editSolidContent(live, livePcts, liveNames, -5);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.reason, /0%|100%/);
  });

  test("negative: above 100 is refused", () => {
    const result = editSolidContent(live, livePcts, liveNames, 101);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.reason, /0%|100%/);
  });

  test("negative: one-chemical tank cannot change solid content", () => {
    const single: CompositionAmounts = {
      remainingByChemical: { c: 2200 },
      unattributed: 0,
      volume: 2200,
      solidPct: 0,
    };
    const result = editSolidContent(single, livePcts, liveNames, 28);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.reason, /only Conventional Polyol/);
    assert.match(result.reason, /0%/);
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
