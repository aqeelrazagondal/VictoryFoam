import assert from "node:assert/strict";
import { test } from "node:test";

import { parseBlendDraft, parseFillDraft, parseHubPanel, parseSetupDraft } from "./drafts.ts";

test("positive: a blend draft is restored", () => {
  const parsed = parseBlendDraft({
    step: 2,
    chem1Id: "a",
    chem2Id: "b",
    chem3Id: null,
    targetPct: "18",
    targetQty: "200",
    thirdQty: "",
    showThird: false,
  });
  assert.equal(parsed?.step, 2);
  assert.equal(parsed?.chem1Id, "a");
});

test("negative: a blend draft without a step is rejected", () => {
  assert.equal(parseBlendDraft({ chem1Id: "a" }), null);
});

test("positive: a fill draft is restored", () => {
  const parsed = parseFillDraft({
    step: 1,
    targetVolume: "8000",
    targetPct: "20",
    chemAId: null,
    chemBId: null,
    chemCId: null,
    thirdQty: "",
    showThird: true,
  });
  assert.equal(parsed?.showThird, true);
});

test("positive: a setup draft is restored", () => {
  const parsed = parseSetupDraft({
    step: 3,
    quantity: "500",
    pct: "22",
    chemicalId: "chem-1",
    skipChemical: false,
    capacity: "8000",
    heel: "200",
  });
  assert.equal(parsed?.quantity, "500");
});

test("positive: a hub panel name is restored", () => {
  assert.equal(parseHubPanel("add"), "add");
});

test("negative: an unknown hub panel is rejected", () => {
  assert.equal(parseHubPanel("home"), null);
});
