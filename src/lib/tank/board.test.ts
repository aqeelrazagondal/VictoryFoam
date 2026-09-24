import assert from "node:assert/strict";
import { test } from "node:test";

import { logSourceForTank, parseTankLogOverviews, type TankLogOverview } from "./board.ts";
import type { TankLogEntry } from "./models.ts";

function entry(tankId: string, id: string): TankLogEntry {
  return {
    id,
    tankId,
    entryDate: "2026-09-24",
    type: "opening_balance",
    chemicalId: null,
    quantity: 100,
    solidContentPct: 20,
    note: null,
    createdAt: "2026-09-24T10:00:00.000Z",
  };
}

test("positive: the open tank uses its own log, not the factory list", () => {
  const active = [entry("tank-a", "a1")];
  const all = [entry("tank-b", "b1")];
  assert.equal(logSourceForTank("tank-a", "tank-a", active, all).length, 1);
  assert.equal(logSourceForTank("tank-a", "tank-a", active, all)[0]?.id, "a1");
});

test("negative: another tank with no loaded rows has an empty source even if an overview exists", () => {
  const overviews: TankLogOverview[] = [
    {
      tankId: "tank-b",
      ready: true,
      lastCreatedAt: "2026-09-24T10:00:00.000Z",
      lastEntryDate: "2026-09-24",
    },
  ];
  const source = logSourceForTank("tank-b", "tank-a", [entry("tank-a", "a1")], []);
  assert.equal(source.length, 0);
  assert.equal(overviews[0]?.ready, true);
});

test("positive: overview JSON from Postgres is accepted", () => {
  const parsed = parseTankLogOverviews([
    {
      tank_id: "tank-b",
      ready: true,
      last_created_at: "2026-09-24T10:00:00.000Z",
      last_entry_date: "2026-09-24",
    },
  ]);
  assert.equal(parsed[0]?.tankId, "tank-b");
  assert.equal(parsed[0]?.ready, true);
});
