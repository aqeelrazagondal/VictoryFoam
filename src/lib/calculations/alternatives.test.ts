import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  blendMissingChemical,
  plannerMissingChemical,
  suggestBlendAlternatives,
  suggestFillAlternatives,
  suggestPlannerAlternatives,
  suggestPlannerHits,
} from "./alternatives.ts";
import { computeRequiredBlend, solveFill } from "./fill.ts";
import { reverseAdd } from "./planner.ts";
import { solveBlend } from "./blend.ts";
import type { ChemicalRef } from "./types.ts";

function chem(
  id: string,
  solidContentPct: number,
  extra: Partial<ChemicalRef> = {},
): ChemicalRef {
  return {
    id,
    name: extra.name ?? id,
    solidContentPct,
    qtyAvailable: extra.qtyAvailable ?? null,
    unit: extra.unit ?? "kg",
    archivedAt: extra.archivedAt ?? null,
  };
}

function assertBlendOk(apply: { chemical1Id: string; chemical2Id: string; targetPct: number }, library: ChemicalRef[], qty: number) {
  const a = library.find((item) => item.id === apply.chemical1Id);
  const b = library.find((item) => item.id === apply.chemical2Id);
  assert.ok(a && b);
  const solved = solveBlend({
    q1: a.solidContentPct,
    q2: b.solidContentPct,
    targetPct: apply.targetPct,
    targetQty: qty,
  });
  assert.equal(solved.ok, true);
  if (!solved.ok || !solved.amounts) return;
  assert.ok(solved.amounts.x1 >= -1e-9 && solved.amounts.x2 >= -1e-9);
  assert.ok(solved.amounts.x1 <= qty + 1e-9 && solved.amounts.x2 <= qty + 1e-9);
}

describe("blend alternatives", () => {
  test("target 50% on 10+40 clamps to 40% and offers a spanning pair", () => {
    const pop10 = chem("c10", 10, { name: "POP 10" });
    const pop40 = chem("c40", 40, { name: "POP 40" });
    const pop30 = chem("c30", 30, { name: "POP 30" });
    const pop60 = chem("c60", 60, { name: "POP 60" });
    const library = [pop10, pop40, pop30, pop60];
    const alts = suggestBlendAlternatives({
      chemical1: pop10,
      chemical2: pop40,
      targetPct: 50,
      targetQty: 1000,
      chemicals: library,
    });
    assert.ok(alts.length > 0);
    assert.ok(alts.some((item) => item.apply.targetPct === 40 && item.apply.chemical1Id === "c10"));
    assert.ok(
      alts.some(
        (item) =>
          item.apply.targetPct === 50 &&
          new Set([item.apply.chemical1Id, item.apply.chemical2Id]).has("c30") &&
          new Set([item.apply.chemical1Id, item.apply.chemical2Id]).has("c60"),
      ),
    );
    for (const item of alts) assertBlendOk(item.apply, library, 1000);
  });

  test("equal-% pair only suggests matching the chemical %", () => {
    const a = chem("a", 25, { name: "A" });
    const b = chem("b", 25, { name: "B" });
    const alts = suggestBlendAlternatives({
      chemical1: a,
      chemical2: b,
      targetPct: 30,
      targetQty: 800,
      chemicals: [a, b, chem("c", 40, { name: "C" })],
    });
    assert.equal(alts.length, 1);
    assert.equal(alts[0]?.apply.targetPct, 25);
    assertBlendOk(alts[0]!.apply, [a, b], 800);
  });

  test("quantity 0 returns no combinations", () => {
    const a = chem("a", 10);
    const b = chem("b", 40);
    assert.deepEqual(
      suggestBlendAlternatives({
        chemical1: a,
        chemical2: b,
        targetPct: 50,
        targetQty: 0,
        chemicals: [a, b],
      }),
      [],
    );
  });

  test("target 90% with max 45% never claims a 90% pair", () => {
    const a = chem("a", 10, { name: "Low" });
    const b = chem("b", 40, { name: "Mid" });
    const c = chem("c", 45, { name: "High" });
    const library = [a, b, c];
    const alts = suggestBlendAlternatives({
      chemical1: a,
      chemical2: b,
      targetPct: 90,
      targetQty: 1000,
      chemicals: library,
    });
    assert.ok(alts.length > 0);
    assert.ok(alts.every((item) => item.apply.targetPct <= 45 + 1e-9));
    assert.ok(alts.every((item) => item.apply.targetPct !== 90));
    for (const item of alts) assertBlendOk(item.apply, library, 1000);
  });

  test("clamp to a chemical's own % is labelled use-only, not 500+0", () => {
    const pop10 = chem("c10", 10, { name: "POP 10" });
    const pop50 = chem("c50", 50, { name: "POP 50" });
    const alts = suggestBlendAlternatives({
      chemical1: pop50,
      chemical2: pop10,
      targetPct: 52,
      targetQty: 500,
      chemicals: [pop10, pop50],
    });
    const clamp = alts.find((item) => item.apply.targetPct === 50);
    assert.ok(clamp);
    assert.match(clamp!.title, /Use only POP 50/);
    assert.match(clamp!.subtitle, /Use only POP 50/);
    assert.doesNotMatch(clamp!.subtitle, /\+ 0 kg|0 kg \+/);
    const advice = blendMissingChemical(52, [pop10, pop50]);
    assert.ok(advice);
    assert.equal(advice.direction, "higher");
    assert.equal(advice.edgePct, 50);
  });

  test("archived chemicals are never suggested", () => {
    const a = chem("a", 10);
    const b = chem("b", 40);
    const ghost = chem("g", 90, { archivedAt: "2026-01-01T00:00:00.000Z" });
    const alts = suggestBlendAlternatives({
      chemical1: a,
      chemical2: b,
      targetPct: 80,
      targetQty: 100,
      chemicals: [a, b, ghost],
    });
    assert.ok(alts.every((item) => item.apply.chemical1Id !== "g" && item.apply.chemical2Id !== "g"));
  });
});

describe("fill alternatives", () => {
  test("4000@33% to 8000@20% with only 10%+40% clamps the tank target, no negatives", () => {
    const pop10 = chem("c10", 10, { name: "POP 10" });
    const pop40 = chem("c40", 40, { name: "POP 40" });
    const alts = suggestFillAlternatives({
      existingQty: 4000,
      existingPct: 33,
      targetVolume: 8000,
      targetPct: 20,
      chemicalA: pop10,
      chemicalB: pop40,
      chemicals: [pop10, pop40],
    });
    assert.ok(alts.length > 0);
    for (const item of alts) {
      const targetPct = item.apply.targetPct ?? 20;
      const required = computeRequiredBlend({
        existingQty: 4000,
        existingPct: 33,
        targetVolume: 8000,
        targetPct,
      });
      assert.equal(required.ok, true);
      if (!required.ok) return;
      const a = item.apply.chemicalAId === "c10" ? pop10 : pop40;
      const b = item.apply.chemicalBId === "c10" ? pop10 : pop40;
      const solved = solveFill({
        fillAmount: required.fillAmount,
        requiredActive: required.requiredActive,
        qA: a.solidContentPct,
        qB: b.solidContentPct,
      });
      assert.equal(solved.ok, true);
      if (!solved.ok || !solved.amounts) return;
      assert.ok(solved.amounts.xA >= -1e-9 && solved.amounts.xB >= -1e-9);
    }
    assert.ok(alts.some((item) => item.apply.targetPct !== undefined));
  });

  test("fill-down returns an empty combo list", () => {
    const a = chem("a", 10);
    const b = chem("b", 40);
    assert.deepEqual(
      suggestFillAlternatives({
        existingQty: 5000,
        existingPct: 33,
        targetVolume: 4000,
        targetPct: 20,
        chemicalA: a,
        chemicalB: b,
        chemicals: [a, b],
      }),
      [],
    );
  });

  test("two viable pairs put the suggested pair first and all solve", () => {
    const water = chem("w", 0, { name: "Water" });
    const pop10 = chem("c10", 10, { name: "POP 10" });
    const pop40 = chem("c40", 40, { name: "POP 40" });
    const pop50 = chem("c50", 50, { name: "POP 50" });
    const library = [water, pop10, pop40, pop50];
    const alts = suggestFillAlternatives({
      existingQty: 0,
      existingPct: 0,
      targetVolume: 1000,
      targetPct: 25,
      chemicalA: pop50,
      chemicalB: pop50,
      chemicals: library,
    });
    assert.ok(alts.length >= 2);
    const first = alts[0]!;
    const firstIds = new Set([first.apply.chemicalAId, first.apply.chemicalBId]);
    assert.ok(firstIds.has("c10") && firstIds.has("c40"));
    for (const item of alts) {
      const a = library.find((row) => row.id === item.apply.chemicalAId)!;
      const b = library.find((row) => row.id === item.apply.chemicalBId)!;
      const solved = solveFill({
        fillAmount: 1000,
        requiredActive: 25_000,
        qA: a.solidContentPct,
        qB: b.solidContentPct,
      });
      assert.equal(solved.ok, true);
    }
  });
});

describe("planner alternatives", () => {
  test("empty tank has no planner alternatives", () => {
    const pop40 = chem("c40", 40, { name: "POP 40" });
    const alts = suggestPlannerAlternatives({
      currentQty: 0,
      currentPct: 0,
      chemical: pop40,
      targetPct: 20,
      chemicals: [pop40],
    });
    assert.equal(alts.length, 0);
  });

  test("target 10% with a 40% chemical offers clamps and water if present", () => {
    const pop40 = chem("c40", 40, { name: "POP 40" });
    const water = chem("w", 0, { name: "Water" });
    const alts = suggestPlannerAlternatives({
      currentQty: 1000,
      currentPct: 30,
      chemical: pop40,
      targetPct: 10,
      chemicals: [pop40, water],
    });
    assert.ok(alts.some((item) => item.apply.targetPct === 30 && item.apply.chemicalId === "c40"));
    assert.ok(!alts.some((item) => item.apply.targetPct === 40));
    const waterOpt = alts.find((item) => item.apply.chemicalId === "w" && item.apply.targetPct === 10);
    assert.ok(waterOpt);
    const solved = reverseAdd({
      currentQty: 1000,
      currentPct: 30,
      chemicalPct: 0,
      targetPct: 10,
    });
    assert.equal(solved.ok, true);
    if (solved.ok) assert.ok(Math.abs(solved.quantity - 2000) < 1e-9);
  });

  test("53% from a 25% tank with max 50% advises a stronger drum", () => {
    const pop50 = chem("c50", 50, { name: "POP 50" });
    const input = {
      currentQty: 1500,
      currentPct: 25,
      targetPct: 53,
      chemicals: [pop50],
    };
    assert.equal(suggestPlannerHits(input).length, 0);
    const advice = plannerMissingChemical(input);
    assert.ok(advice);
    assert.equal(advice.direction, "higher");
    assert.equal(advice.exclusive, true);
    assert.equal(advice.edgePct, 50);
  });

  test("30% from a 20% tank lists the 40% chemical as a hit", () => {
    const pop40 = chem("c40", 40, { name: "POP 40" });
    const hits = suggestPlannerHits({
      currentQty: 1000,
      currentPct: 20,
      targetPct: 30,
      chemicals: [pop40],
    });
    assert.equal(hits.length, 1);
    assert.equal(hits[0]?.apply.chemicalId, "c40");
    assert.match(hits[0]!.subtitle, /1[\s\u00a0\u202f]?000/);
    assert.equal(
      plannerMissingChemical({
        currentQty: 1000,
        currentPct: 20,
        targetPct: 30,
        chemicals: [pop40],
      }),
      null,
    );
  });

  test("same-% chemical only offers other chemicals", () => {
    const same = chem("same", 30, { name: "Same" });
    const pop50 = chem("c50", 50, { name: "POP 50" });
    const alts = suggestPlannerAlternatives({
      currentQty: 1000,
      currentPct: 30,
      chemical: same,
      targetPct: 40,
      chemicals: [same, pop50],
    });
    assert.ok(alts.length > 0);
    assert.ok(alts.every((item) => item.apply.chemicalId !== "same"));
    assert.ok(alts.some((item) => item.apply.chemicalId === "c50"));
    for (const item of alts) {
      const chemical = item.apply.chemicalId === "c50" ? pop50 : same;
      const solved = reverseAdd({
        currentQty: 1000,
        currentPct: 30,
        chemicalPct: chemical.solidContentPct,
        targetPct: item.apply.targetPct,
      });
      assert.equal(solved.ok, true);
      if (solved.ok) assert.ok(solved.quantity !== null && solved.quantity >= -1e-9);
    }
  });
});
