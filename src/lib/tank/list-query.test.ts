import assert from "node:assert/strict";
import { test } from "node:test";

import { filterByQuery, sortBy } from "./list-query.ts";

const rows = [
  { name: "POP 10", createdAt: "2026-01-01T00:00:00.000Z", qty: 40 },
  { name: "Water", createdAt: "2026-06-01T00:00:00.000Z", qty: 8 },
  { name: "POP 40", createdAt: "2026-03-01T00:00:00.000Z", qty: 12 },
];

test("search keeps names that contain the query", () => {
  const found = filterByQuery(rows, "pop", (row) => row.name);
  assert.deepEqual(
    found.map((row) => row.name),
    ["POP 10", "POP 40"],
  );
});

test("an empty query leaves the list alone", () => {
  assert.equal(filterByQuery(rows, "  ", (row) => row.name).length, 3);
});

test("sort by name is alphabetical", () => {
  const sorted = sortBy(rows, "name", (row) => row.name);
  assert.deepEqual(
    sorted.map((row) => row.name),
    ["POP 10", "POP 40", "Water"],
  );
});

test("sort by newest uses the timestamp descending", () => {
  const sorted = sortBy(rows, "newest", (row) => row.createdAt);
  assert.equal(sorted[0]?.name, "Water");
});

test("sort by qty uses the number ascending", () => {
  const sorted = sortBy(rows, "qty", (row) => row.qty);
  assert.equal(sorted[0]?.name, "Water");
  assert.equal(sorted[2]?.name, "POP 10");
});
