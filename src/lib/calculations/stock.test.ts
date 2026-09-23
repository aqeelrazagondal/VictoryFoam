import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { checkStock, combineStockStatus } from "./stock.ts";

describe("stock checks", () => {
  test("positive: null quantity available is untracked", () => {
    assert.deepEqual(checkStock(500, null), {
      status: "untracked",
      needed: 500,
      available: null,
    });
  });

  test("positive: enough stock is ok", () => {
    assert.equal(checkStock(500, 500).status, "ok");
    assert.equal(checkStock(500, 501).status, "ok");
  });

  test("negative: short stock is insufficient, not a hard failure", () => {
    const check = checkStock(500, 10);
    assert.equal(check.status, "insufficient");
    assert.equal(check.needed, 500);
    assert.equal(check.available, 10);
  });

  test("positive: combineStockStatus stays feasible when nothing is short", () => {
    assert.equal(
      combineStockStatus(
        [checkStock(1, null), checkStock(1, 10)],
        "feasible",
      ),
      "feasible",
    );
  });

  test("negative: any insufficient stock becomes a warning", () => {
    assert.equal(
      combineStockStatus([checkStock(10, 1), checkStock(10, 100)], "feasible"),
      "warning",
    );
  });
});
