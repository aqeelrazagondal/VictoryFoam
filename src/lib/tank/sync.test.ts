import assert from "node:assert/strict";
import { test } from "node:test";

import { createWriteAttempt } from "./writes.ts";
import {
  dropQueuedWrite,
  enqueueWrite,
  parseQueuedWrite,
  readWriteQueue,
  type MemoryStorage,
} from "./sync.ts";

function memory(): MemoryStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

test("a failed save is queued once under its write key", () => {
  const storage = memory();
  const attempt = createWriteAttempt();
  const item = {
    writeKey: attempt.writeKey,
    expectedVersion: 1,
    kind: "insert-log" as const,
    tankId: "tank-1",
    drafts: [],
  };
  enqueueWrite(item, storage);
  enqueueWrite({ ...item, expectedVersion: 2 }, storage);
  const queued = readWriteQueue(storage);
  assert.equal(queued.length, 1);
  assert.equal(queued[0]?.writeKey, attempt.writeKey);
  assert.equal(queued[0]?.expectedVersion, 1);
});

test("dropping a queued write leaves later items", () => {
  const storage = memory();
  enqueueWrite(
    { writeKey: "a", expectedVersion: 1, kind: "stock", moves: [] },
    storage,
  );
  enqueueWrite(
    { writeKey: "b", expectedVersion: 1, kind: "stock", moves: [] },
    storage,
  );
  dropQueuedWrite("a", storage);
  assert.deepEqual(
    readWriteQueue(storage).map((row) => row.writeKey),
    ["b"],
  );
});

test("negative: an unknown queue payload is ignored", () => {
  assert.equal(parseQueuedWrite({ kind: "insert-log" }), null);
});
