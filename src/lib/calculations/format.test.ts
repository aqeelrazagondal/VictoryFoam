import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  clampNonNegative,
  formatLogWhen,
  formatPct,
  formatQty,
  isInClosedRange,
  nearlyEqual,
  parseDatetimeLocal,
  toDatetimeLocalValue,
} from "./format.ts";

describe("numeric helpers", () => {
  test("nearlyEqual treats tiny float noise as equal", () => {
    assert.equal(nearlyEqual(0.1 + 0.2, 0.3), true);
    assert.equal(nearlyEqual(1, 1.1), false);
  });

  test("clampNonNegative snaps negative dust to 0 but keeps real negatives", () => {
    assert.equal(clampNonNegative(-1e-12), 0);
    assert.equal(clampNonNegative(-1), -1);
    assert.equal(clampNonNegative(4), 4);
  });

  test("isInClosedRange includes the endpoints", () => {
    assert.equal(isInClosedRange(0, 0, 100), true);
    assert.equal(isInClosedRange(100, 0, 100), true);
    assert.equal(isInClosedRange(-0.1, 0, 100), false);
    assert.equal(isInClosedRange(100.1, 0, 100), false);
  });
});

describe("display formatting", () => {
  test("formatQty uses grouping for thousands", () => {
    assert.match(formatQty(1500), /1.500/);
  });

  test("formatPct always includes a percent sign", () => {
    assert.equal(formatPct(25), "25%");
    assert.match(formatPct(7), /7%/);
  });

  test("formatLogWhen shows the factory date and the clock from when it was logged", () => {
    const label = formatLogWhen("2026-09-23", "2026-09-23T15:30:00.000Z");
    assert.match(label ?? "", /23 September 2026/);
    assert.match(label ?? "", /\d{2}:\d{2}/);
  });

  test("parseDatetimeLocal keeps the calendar day and a full timestamp", () => {
    const parsed = parseDatetimeLocal("2026-09-23T16:45");
    assert.ok(parsed);
    assert.equal(parsed.entryDate, "2026-09-23");
    assert.match(parsed.loggedAt, /^2026-09-23T/);
  });

  test("toDatetimeLocalValue fills the edit field from the saved row", () => {
    const value = toDatetimeLocalValue("2026-09-23", "2026-09-23T14:05:00.000Z");
    assert.match(value, /^2026-09-23T\d{2}:\d{2}$/);
  });
});
