import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveGaMeasurementId } from "./analytics.ts";

test("positive: a valid GA4 measurement id is kept", () => {
  assert.equal(resolveGaMeasurementId("G-ABC12DEF"), "G-ABC12DEF");
});

test("negative: a non-empty invalid id is ignored", () => {
  assert.equal(resolveGaMeasurementId("UA-123"), undefined);
  assert.equal(resolveGaMeasurementId("not-an-id"), undefined);
});
