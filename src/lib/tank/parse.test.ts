import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { parseNumber, parseRequiredNumber } from "./parse.ts";

describe("parseNumber", () => {
  test("positive: integer and decimal strings", () => {
    assert.equal(parseNumber("1000"), 1000);
    assert.equal(parseNumber("25.5"), 25.5);
  });

  test("positive: trims whitespace", () => {
    assert.equal(parseNumber("  40  "), 40);
  });

  test("positive: comma decimal used in en-ZA typing", () => {
    assert.equal(parseNumber("25,5"), 25.5);
    assert.equal(parseNumber("27,66"), 27.66);
  });

  test("positive: UK thousands separators still count as kilograms", () => {
    assert.equal(parseNumber("8,000"), 8000);
    assert.equal(parseNumber("1,150"), 1150);
    assert.equal(parseNumber("9,000"), 9000);
    assert.equal(parseNumber("5,930.5"), 5930.5);
  });

  test("positive: grouped spaces from the on-screen quantity", () => {
    assert.equal(parseNumber("2 070"), 2070);
    assert.equal(parseNumber("2\u00a0070"), 2070);
  });

  test("negative: empty or whitespace-only is null", () => {
    assert.equal(parseNumber(""), null);
    assert.equal(parseNumber("   "), null);
  });

  test("negative: letters and NaN are null", () => {
    assert.equal(parseNumber("abc"), null);
    assert.equal(parseNumber("10kg"), null);
  });

  test("negative: multiple commas cannot be a number", () => {
    assert.equal(parseNumber("1,2,3"), null);
  });
});

describe("parseRequiredNumber", () => {
  test("positive: returns the value and no error", () => {
    assert.deepEqual(parseRequiredNumber("12", "Quantity"), { error: null, value: 12 });
  });

  test("negative: empty input names the field", () => {
    const parsed = parseRequiredNumber("", "Solid Content %");
    assert.equal(parsed.value, null);
    assert.equal(parsed.error, "Solid Content % is required.");
  });
});
