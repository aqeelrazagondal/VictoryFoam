import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  canConsume,
  compositionRows,
  consumeBreakdown,
  drawableNow,
  hasReconciliationGap,
  isHeelBreach,
  replayLog,
  type LogEntryInput,
} from "./tank-log.ts";

function entry(
  partial: Partial<LogEntryInput> & Pick<LogEntryInput, "id" | "type" | "quantity">,
): LogEntryInput {
  return {
    chemicalId: partial.chemicalId ?? null,
    solidContentPct: partial.solidContentPct ?? null,
    ...partial,
  };
}

describe("tank log replay", () => {
  test("positive: validated Excel remaining-after-consume example", () => {
    const snapshot = replayLog([
      entry({ id: "1", type: "opening_balance", chemicalId: "pop25", quantity: 1500, solidContentPct: 25 }),
      entry({ id: "2", type: "add_batch", chemicalId: "pop45", quantity: 5033.3, solidContentPct: 45 }),
      entry({ id: "3", type: "add_batch", chemicalId: "pop0", quantity: 1466.7, solidContentPct: 0 }),
      entry({ id: "4", type: "consume_usage", quantity: 4000 }),
    ]);

    assert.ok(Math.abs(snapshot.entries[2]!.runningVolume - 8000) < 1e-6);
    assert.ok(Math.abs(snapshot.entries[2]!.runningPct - 33) < 0.05);
    assert.ok(Math.abs(snapshot.volume - 4000) < 1e-6);
    assert.ok(Math.abs(snapshot.solidPct - 33) < 0.05);
    assert.ok(Math.abs(snapshot.remainingByChemical.pop25! - 750) < 0.05);
    assert.ok(Math.abs(snapshot.remainingByChemical.pop45! - 2516.65) < 0.05);
    assert.ok(Math.abs(snapshot.remainingByChemical.pop0! - 733.35) < 0.05);
    assert.equal(snapshot.errors.length, 0);
    assert.equal(snapshot.hasOpeningBalance, true);

    const beforeConsume = replayLog([
      entry({ id: "1", type: "opening_balance", chemicalId: "pop25", quantity: 1500, solidContentPct: 25 }),
      entry({ id: "2", type: "add_batch", chemicalId: "pop45", quantity: 5033.3, solidContentPct: 45 }),
      entry({ id: "3", type: "add_batch", chemicalId: "pop0", quantity: 1466.7, solidContentPct: 0 }),
    ]);
    const used = consumeBreakdown({
      volume: beforeConsume.volume,
      solidPct: beforeConsume.solidPct,
      remainingByChemical: beforeConsume.remainingByChemical,
      unattributed: beforeConsume.unattributed,
      consumeQty: 4000,
    });
    assert.equal(used.ok, true);
    if (!used.ok) return;
    assert.ok(Math.abs(used.leftoverVolume - 4000) < 1e-6);
    assert.ok(Math.abs(used.leftoverPct - 33) < 0.05);
    const pop25 = used.rows.find((row) => row.id === "pop25");
    const pop45 = used.rows.find((row) => row.id === "pop45");
    const conv = used.rows.find((row) => row.id === "pop0");
    assert.ok(pop25 && pop45 && conv);
    assert.ok(Math.abs(pop25.used - 750) < 0.05);
    assert.ok(Math.abs(pop25.remaining - 750) < 0.05);
    assert.ok(Math.abs(pop45.used - 2516.65) < 0.05);
    assert.ok(Math.abs(conv.used - 733.35) < 0.05);
  });

  test("positive: unattributed opening still counts in volume and composition", () => {
    const snapshot = replayLog([
      entry({ id: "1", type: "opening_balance", quantity: 2000, solidContentPct: 30 }),
      entry({ id: "2", type: "add_batch", chemicalId: "a", quantity: 1000, solidContentPct: 10 }),
    ]);
    assert.equal(snapshot.volume, 3000);
    assert.ok(Math.abs(snapshot.solidPct - 23.333333) < 0.01);
    assert.equal(snapshot.unattributed, 2000);
    assert.equal(snapshot.remainingByChemical.a, 1000);
    assert.equal(snapshot.trackedTotal, 3000);
  });

  test("positive: consume scales every remaining chemical, including unattributed", () => {
    const snapshot = replayLog([
      entry({ id: "1", type: "opening_balance", quantity: 1000, solidContentPct: 20 }),
      entry({ id: "2", type: "add_batch", chemicalId: "a", quantity: 1000, solidContentPct: 40 }),
      entry({ id: "3", type: "consume_usage", quantity: 500 }),
    ]);
    assert.equal(snapshot.volume, 1500);
    assert.ok(Math.abs(snapshot.unattributed - 750) < 1e-9);
    assert.ok(Math.abs(snapshot.remainingByChemical.a! - 750) < 1e-9);
    assert.ok(Math.abs(snapshot.solidPct - 30) < 1e-9);
  });

  test("positive: consuming the exact tank volume empties it", () => {
    const snapshot = replayLog([
      entry({ id: "1", type: "opening_balance", chemicalId: "a", quantity: 100, solidContentPct: 20 }),
      entry({ id: "2", type: "consume_usage", quantity: 100 }),
    ]);
    assert.equal(snapshot.volume, 0);
    assert.ok(Math.abs(snapshot.remainingByChemical.a!) < 1e-9);
    assert.equal(snapshot.errors.length, 0);
  });

  test("positive: editing history is a full replay, not a row patch", () => {
    const original = replayLog([
      entry({ id: "1", type: "opening_balance", chemicalId: "a", quantity: 1000, solidContentPct: 40 }),
      entry({ id: "2", type: "add_batch", chemicalId: "b", quantity: 1000, solidContentPct: 20 }),
      entry({ id: "3", type: "consume_usage", quantity: 500 }),
    ]);
    const edited = replayLog([
      entry({ id: "1", type: "opening_balance", chemicalId: "a", quantity: 2000, solidContentPct: 40 }),
      entry({ id: "2", type: "add_batch", chemicalId: "b", quantity: 1000, solidContentPct: 20 }),
      entry({ id: "3", type: "consume_usage", quantity: 500 }),
    ]);
    assert.ok(Math.abs(original.volume - 1500) < 1e-9);
    assert.ok(Math.abs(edited.volume - 2500) < 1e-9);
    assert.ok(Math.abs((edited.remainingByChemical.a ?? 0) - 2000 * (2500 / 3000)) < 1e-6);
  });

  test("positive: deleting a later add is equivalent to replaying without that row", () => {
    const withAdd = replayLog([
      entry({ id: "1", type: "opening_balance", chemicalId: "a", quantity: 1000, solidContentPct: 40 }),
      entry({ id: "2", type: "add_batch", chemicalId: "b", quantity: 500, solidContentPct: 20 }),
    ]);
    const deleted = replayLog([
      entry({ id: "1", type: "opening_balance", chemicalId: "a", quantity: 1000, solidContentPct: 40 }),
    ]);
    assert.equal(withAdd.volume, 1500);
    assert.equal(deleted.volume, 1000);
    assert.equal(deleted.remainingByChemical.b, undefined);
  });

  test("negative: consume past current volume is recorded as an error and not applied", () => {
    const snapshot = replayLog([
      entry({ id: "1", type: "opening_balance", chemicalId: "a", quantity: 100, solidContentPct: 20 }),
      entry({ id: "2", type: "consume_usage", quantity: 150 }),
    ]);
    assert.equal(snapshot.volume, 100);
    assert.equal(snapshot.remainingByChemical.a, 100);
    assert.equal(snapshot.errors.length, 1);
    assert.match(snapshot.errors[0]!.reason, /more than the current tank volume/i);
  });

  test("negative: first entry that is not Opening Balance is an error", () => {
    const snapshot = replayLog([
      entry({ id: "1", type: "add_batch", chemicalId: "a", quantity: 100, solidContentPct: 20 }),
    ]);
    assert.equal(snapshot.hasOpeningBalance, false);
    assert.equal(snapshot.errors.length, 1);
    assert.match(snapshot.errors[0]!.reason, /first entry must be an Opening Balance/i);
    assert.equal(snapshot.volume, 100);
  });

  test("negative: a second Opening Balance is an error but later math still replays", () => {
    const snapshot = replayLog([
      entry({ id: "1", type: "opening_balance", chemicalId: "a", quantity: 100, solidContentPct: 20 }),
      entry({ id: "2", type: "opening_balance", chemicalId: "b", quantity: 50, solidContentPct: 40 }),
    ]);
    assert.equal(snapshot.errors.length, 1);
    assert.match(snapshot.errors[0]!.reason, /only be the first entry/i);
    assert.equal(snapshot.volume, 150);
  });

  test("positive: empty log is an empty tank", () => {
    const snapshot = replayLog([]);
    assert.equal(snapshot.volume, 0);
    assert.equal(snapshot.solidPct, 0);
    assert.equal(snapshot.hasOpeningBalance, false);
    assert.equal(snapshot.unattributed, 0);
  });
});

describe("consume / heel helpers", () => {
  test("positive: consume equal to volume is allowed", () => {
    assert.equal(canConsume(100, 100), true);
  });

  test("negative: consume above volume is blocked", () => {
    assert.equal(canConsume(100, 100.1), false);
  });

  test("positive: drawable now is volume minus heel", () => {
    assert.equal(drawableNow(1500, 200), 1300);
  });

  test("negative: drawable now cannot go below zero", () => {
    assert.equal(drawableNow(100, 200), 0);
  });

  test("positive: heel of 0 never warns", () => {
    assert.equal(isHeelBreach(0, 0), false);
  });

  test("negative: volume below heel is a warning, not a hard block", () => {
    assert.equal(isHeelBreach(90, 100), true);
  });
});

describe("composition and reconciliation", () => {
  test("positive: named chemicals plus Unattributed row", () => {
    const snapshot = replayLog([
      entry({ id: "1", type: "opening_balance", quantity: 2000, solidContentPct: 30 }),
      entry({ id: "2", type: "add_batch", chemicalId: "a", quantity: 1000, solidContentPct: 10 }),
    ]);
    const rows = compositionRows(snapshot, { a: { name: "POP 10", unit: "kg" } });
    assert.equal(rows[0]?.name, "Unattributed");
    assert.equal(rows[1]?.name, "POP 10");
    assert.ok(Math.abs(rows[0]!.pctOfTank - (2000 / 3000) * 100) < 1e-9);
  });

  test("positive: unknown chemical id still appears", () => {
    const snapshot = replayLog([
      entry({ id: "1", type: "opening_balance", chemicalId: "gone", quantity: 100, solidContentPct: 20 }),
    ]);
    const rows = compositionRows(snapshot, {});
    assert.equal(rows[0]?.name, "Unknown chemical");
  });

  test("positive: fully attributed tank has no reconciliation gap", () => {
    const snapshot = replayLog([
      entry({ id: "1", type: "opening_balance", chemicalId: "a", quantity: 1000, solidContentPct: 25 }),
    ]);
    assert.equal(hasReconciliationGap(snapshot), false);
    assert.equal(snapshot.unattributed, 0);
  });
});
