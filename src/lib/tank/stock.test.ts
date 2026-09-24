import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { applyMovementLines, nextStockBalance, reversedBalance, shouldDeductStock, stockLabel } from "./stock.ts";

describe("nextStockBalance", () => {
  test("receive starts tracking an untracked chemical", () => {
    assert.deepEqual(nextStockBalance(null, "receive", 250), {
      applied: true,
      signedQuantity: 250,
      balanceAfter: 250,
    });
  });

  test("receive adds to the balance", () => {
    assert.deepEqual(nextStockBalance(100, "receive", 40), {
      applied: true,
      signedQuantity: 40,
      balanceAfter: 140,
    });
  });

  test("issue and waste can take the balance below zero", () => {
    assert.deepEqual(nextStockBalance(10, "issue", 25), {
      applied: true,
      signedQuantity: -25,
      balanceAfter: -15,
    });
    assert.deepEqual(nextStockBalance(10, "waste", 4), {
      applied: true,
      signedQuantity: -4,
      balanceAfter: 6,
    });
  });

  test("count stores the signed difference and can start tracking", () => {
    assert.deepEqual(nextStockBalance(80, "count", 50), {
      applied: true,
      signedQuantity: -30,
      balanceAfter: 50,
    });
    assert.deepEqual(nextStockBalance(null, "count", 20), {
      applied: true,
      signedQuantity: 20,
      balanceAfter: 20,
    });
  });

  test("pour deducts tracked stock and skips untracked stock", () => {
    assert.deepEqual(nextStockBalance(1500, "pour", 1000), {
      applied: true,
      signedQuantity: -1000,
      balanceAfter: 500,
    });
    assert.deepEqual(nextStockBalance(null, "pour", 1000), { applied: false });
  });

  test("pour reversal puts the deducted kilograms back", () => {
    const poured = nextStockBalance(1500, "pour", 1000);
    assert.equal(poured.applied, true);
    if (!poured.applied) return;
    assert.equal(reversedBalance(poured.balanceAfter, poured.signedQuantity), 1500);
  });

  test("zero or negative movement quantities are refused", () => {
    assert.throws(() => nextStockBalance(10, "receive", 0), /greater than zero/);
    assert.throws(() => nextStockBalance(10, "issue", -1), /greater than zero/);
    assert.throws(() => nextStockBalance(10, "count", -1), /cannot be negative/);
  });
});

describe("which log rows change warehouse stock", () => {
  test("a confirmed pour deducts", () => {
    assert.equal(shouldDeductStock("add_batch"), true);
  });

  test("opening balance, usage, and composition edits do not deduct", () => {
    assert.equal(shouldDeductStock("opening_balance"), false);
    assert.equal(shouldDeductStock("consume_usage"), false);
    assert.equal(shouldDeductStock("adjust_composition"), false);
  });
});

describe("applyMovementLines", () => {
  test("positive: several issues update every balance", () => {
    assert.deepEqual(
      applyMovementLines(
        { a: 100, b: 40 },
        [
          { chemicalId: "a", type: "issue", quantity: 25 },
          { chemicalId: "b", type: "issue", quantity: 10 },
        ],
      ),
      { a: 75, b: 30 },
    );
  });

  test("negative: a later invalid line leaves the original balances unchanged", () => {
    const stock = { a: 100, b: 40 };
    assert.throws(
      () =>
        applyMovementLines(stock, [
          { chemicalId: "a", type: "issue", quantity: 25 },
          { chemicalId: "b", type: "issue", quantity: 0 },
        ]),
      /greater than zero/,
    );
    assert.deepEqual(stock, { a: 100, b: 40 });
  });
});

describe("stockLabel", () => {
  test("short wins over a low-stock line, and the line is strictly below", () => {
    assert.equal(stockLabel(null, 10), "Stock not tracked");
    assert.equal(stockLabel(-1, 10), "Short");
    assert.equal(stockLabel(4, 10), "Low");
    assert.equal(stockLabel(10, 10), null);
    assert.equal(stockLabel(12, null), null);
  });
});
