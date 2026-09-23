import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { pageOf, TANK_LIST_PAGE_SIZE } from "./pagination.ts";

describe("pageOf (local repository page boundary)", () => {
  const items = Array.from({ length: 15 }, (_, index) => `row-${index + 1}`);

  test("page 2 returns the right slice and the full total", () => {
    const result = pageOf(items, 2, TANK_LIST_PAGE_SIZE);
    assert.equal(result.total, 15);
    assert.deepEqual(result.rows, [
      "row-11",
      "row-12",
      "row-13",
      "row-14",
      "row-15",
    ]);
  });

  test("an empty page past the end returns no rows and the real total", () => {
    const result = pageOf(items, 4, TANK_LIST_PAGE_SIZE);
    assert.equal(result.total, 15);
    assert.deepEqual(result.rows, []);
  });

  test("page 1 keeps the first ten", () => {
    const result = pageOf(items, 1, TANK_LIST_PAGE_SIZE);
    assert.equal(result.total, 15);
    assert.equal(result.rows.length, 10);
    assert.equal(result.rows[0], "row-1");
    assert.equal(result.rows[9], "row-10");
  });
});
