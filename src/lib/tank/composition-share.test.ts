import assert from "node:assert/strict";
import { test } from "node:test";

import { compositionShareClass, compositionShareStep } from "./composition-share.ts";

test("positive: a share rounds to the nearest five percent class", () => {
  assert.equal(compositionShareStep(22.4), 20);
  assert.equal(compositionShareClass(22.4), "composition-p-20");
});

test("negative: shares outside 0–100 clamp", () => {
  assert.equal(compositionShareStep(-4), 0);
  assert.equal(compositionShareStep(140), 100);
});
