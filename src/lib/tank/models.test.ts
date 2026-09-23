import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { isDuplicateName, toChemicalRef, type Chemical } from "./models.ts";

function chemical(name: string, extra: Partial<Chemical> = {}): Chemical {
  return {
    id: extra.id ?? name,
    name,
    solidContentPct: extra.solidContentPct ?? 10,
    qtyAvailable: extra.qtyAvailable ?? null,
    unit: extra.unit ?? "kg",
    ohValue: extra.ohValue ?? null,
    viscosity: extra.viscosity ?? null,
    archivedAt: extra.archivedAt ?? null,
    createdAt: extra.createdAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: extra.updatedAt ?? "2026-01-01T00:00:00.000Z",
  };
}

describe("chemical name uniqueness", () => {
  const library = [
    chemical("POP 10"),
    chemical("POP 40", { id: "pop40" }),
    chemical("Old POP", { id: "old", archivedAt: "2026-02-01T00:00:00.000Z" }),
  ];

  test("positive: a new name is allowed", () => {
    assert.equal(isDuplicateName("Water", library), false);
  });

  test("negative: same name with different casing is a duplicate", () => {
    assert.equal(isDuplicateName("pop 10", library), true);
    assert.equal(isDuplicateName("  POP 10  ", library), true);
  });

  test("positive: editing the same row is not a duplicate of itself", () => {
    assert.equal(isDuplicateName("POP 10", library, "POP 10"), false);
  });

  test("positive: archived names can be reused", () => {
    assert.equal(isDuplicateName("Old POP", library), false);
  });
});

describe("toChemicalRef", () => {
  test("positive: copies the fields the calculators need", () => {
    const ref = toChemicalRef(chemical("POP 10", { solidContentPct: 10, qtyAvailable: 50 }));
    assert.deepEqual(ref, {
      id: "POP 10",
      name: "POP 10",
      solidContentPct: 10,
      qtyAvailable: 50,
      unit: "kg",
      archivedAt: null,
    });
  });
});
