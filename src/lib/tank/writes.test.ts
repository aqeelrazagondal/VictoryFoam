import assert from "node:assert/strict";
import { test } from "node:test";

import { encodeAdjustNote } from "../calculations/composition-edit.ts";
import type { TankLogDraft } from "./models.ts";
import {
  applyDraftsToBound,
  boundToTankSnapshot,
  createWriteAttempt,
  emptyBoundSnapshot,
  isOccupancyError,
  isOfflineError,
  OCCUPANCY_MESSAGE,
  parseBoundSnapshot,
  writeKeyForRetry,
} from "./writes.ts";

test("a save tap mints a write key, and a timeout retry reuses it", () => {
  const attempt = createWriteAttempt();
  assert.equal(typeof attempt.writeKey, "string");
  assert.equal(attempt.writeKey.length > 0, true);
  assert.equal(writeKeyForRetry(attempt), attempt.writeKey);
  const other = createWriteAttempt();
  assert.notEqual(attempt.writeKey, other.writeKey);
});

test("occupancy errors are the tablet conflict copy", () => {
  assert.equal(isOccupancyError(new Error(OCCUPANCY_MESSAGE)), true);
  assert.equal(isOccupancyError(new Error("Could not save the entry.")), false);
});

test("offline errors include failed fetch and TypeError", () => {
  assert.equal(isOfflineError(new TypeError("Failed to fetch")), true);
  assert.equal(isOfflineError(new Error("This login is not on the factory list.")), false);
});

test("an empty bound snapshot has no opening", () => {
  const empty = emptyBoundSnapshot();
  assert.equal(empty.hasOpening, false);
  assert.equal(empty.volume, 0);
  assert.deepEqual(empty.remainingByChemical, {});
});

test("parseBoundSnapshot reads the stored tank jsonb", () => {
  const parsed = parseBoundSnapshot({
    volume: 100,
    solidPct: 22,
    remainingByChemical: { chem: 80 },
    unattributed: 20,
    hasOpening: true,
  });
  assert.equal(parsed?.volume, 100);
  assert.equal(parsed?.hasOpening, true);
  assert.equal(parsed?.remainingByChemical.chem, 80);
});

test("negative: a snapshot without volume is rejected", () => {
  assert.equal(parseBoundSnapshot({ solidPct: 10 }), null);
});

test("optimistic add then use updates volume and remaining", () => {
  const opening: TankLogDraft[] = [
    {
      type: "opening_balance",
      chemicalId: "a",
      quantity: 100,
      solidContentPct: 20,
      note: null,
    },
  ];
  const afterOpen = applyDraftsToBound(emptyBoundSnapshot(), opening);
  assert.equal(afterOpen.hasOpening, true);
  assert.equal(afterOpen.volume, 100);
  assert.equal(afterOpen.remainingByChemical.a, 100);

  const afterUse = applyDraftsToBound(afterOpen, [
    {
      type: "consume_usage",
      chemicalId: null,
      quantity: 25,
      solidContentPct: null,
      note: null,
    },
  ]);
  assert.equal(afterUse.volume, 75);
  assert.equal(afterUse.remainingByChemical.a, 75);
});

test("home correction replaces remaining from the adjust note", () => {
  const opened = applyDraftsToBound(emptyBoundSnapshot(), [
    {
      type: "opening_balance",
      chemicalId: "a",
      quantity: 100,
      solidContentPct: 20,
      note: null,
    },
  ]);
  const next = applyDraftsToBound(opened, [
    {
      type: "adjust_composition",
      chemicalId: null,
      quantity: 80,
      solidContentPct: 20,
      note: encodeAdjustNote({ remainingByChemical: { a: 50 }, unattributed: 30 }),
    },
  ]);
  assert.equal(next.volume, 80);
  assert.equal(next.remainingByChemical.a, 50);
  assert.equal(next.unattributed, 30);
});

test("boundToTankSnapshot fills tracked total and opening flag", () => {
  const snapshot = boundToTankSnapshot({
    volume: 10,
    solidPct: 15,
    remainingByChemical: { a: 7 },
    unattributed: 3,
    hasOpening: true,
  });
  assert.equal(snapshot.trackedTotal, 10);
  assert.equal(snapshot.hasOpeningBalance, true);
  assert.equal(snapshot.entries.length, 0);
});
