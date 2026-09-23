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
