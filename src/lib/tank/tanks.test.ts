import assert from "node:assert/strict";
import { test } from "node:test";

import {
  isDuplicateTankName,
  liveTankIds,
  migrateStoredTankState,
  resolveActiveTankId,
} from "./tanks.ts";
import type { Tank } from "./models.ts";

const tank = (patch: Partial<Tank> & Pick<Tank, "id" | "name" | "createdAt">): Tank => ({
  capacity: null,
  heel: 0,
  archivedAt: null,
  updatedAt: patch.createdAt,
  ...patch,
});

test("an empty single-tank store stays empty", () => {
  const next = migrateStoredTankState(
    { chemicals: [], settings: null, entries: [], lastCalculation: {} },
    "tank-1",
  );
  assert.equal(next.migrated, true);
  assert.deepEqual(next.tanks, []);
  assert.deepEqual(next.entries, []);
});

test("the previous tank becomes one tank named Tank", () => {
  const next = migrateStoredTankState(
    {
      settings: { capacity: 8000, heel: 200 },
      entries: [
        {
          id: "row-1",
          entryDate: "2026-09-01",
          type: "opening_balance",
          chemicalId: "chem-1",
          quantity: 500,
          solidContentPct: 20,
          note: null,
          createdAt: "2026-09-01T00:00:00.000Z",
        },
      ],
      lastCalculation: {
        blend: { chemical1Id: "a", chemical2Id: "b", targetPct: 20, targetQty: 100 },
      },
    },
    "tank-1",
  );
  assert.equal(next.tanks.length, 1);
  assert.equal(next.tanks[0]?.name, "Tank");
  assert.equal(next.tanks[0]?.capacity, 8000);
  assert.equal(next.tanks[0]?.heel, 200);
  assert.equal(next.entries[0]?.tankId, "tank-1");
  assert.equal(next.lastCalculation["tank-1"]?.blend?.targetQty, 100);
});

test("a store that already has tanks is not wrapped again", () => {
  const existing = tank({ id: "tank-9", name: "Blend", createdAt: "2026-09-01T00:00:00.000Z" });
  const next = migrateStoredTankState(
    { tanks: [existing], entries: [], lastCalculation: {} },
    "tank-new",
  );
  assert.equal(next.migrated, false);
  assert.equal(next.tanks[0]?.id, "tank-9");
});

test("the open tank is the saved id, otherwise the oldest active tank", () => {
  const older = tank({ id: "old", name: "Old", createdAt: "2026-01-01T00:00:00.000Z" });
  const newer = tank({ id: "new", name: "New", createdAt: "2026-06-01T00:00:00.000Z" });
  const archived = tank({
    id: "gone",
    name: "Gone",
    createdAt: "2025-01-01T00:00:00.000Z",
    archivedAt: "2026-08-01T00:00:00.000Z",
  });
  assert.equal(resolveActiveTankId([newer, older, archived], "new"), "new");
  assert.equal(resolveActiveTankId([newer, older, archived], "missing"), "old");
  assert.equal(resolveActiveTankId([archived], null), null);
});

test("active tank names are unique regardless of case", () => {
  const tanks = [
    tank({ id: "a", name: "Blend tank", createdAt: "2026-01-01T00:00:00.000Z" }),
    tank({
      id: "b",
      name: "Old blend",
      createdAt: "2026-01-02T00:00:00.000Z",
      archivedAt: "2026-02-01T00:00:00.000Z",
    }),
  ];
  assert.equal(isDuplicateTankName(" blend tank ", tanks), true);
  assert.equal(isDuplicateTankName("Old blend", tanks), false);
  assert.equal(isDuplicateTankName("Blend tank", tanks, "a"), false);
});

test("live tanks skip archived ids", () => {
  const ids = liveTankIds([
    tank({ id: "a", name: "A", createdAt: "2026-01-01T00:00:00.000Z" }),
    tank({
      id: "b",
      name: "B",
      createdAt: "2026-01-02T00:00:00.000Z",
      archivedAt: "2026-02-01T00:00:00.000Z",
    }),
  ]);
  assert.deepEqual(ids, ["a"]);
});
