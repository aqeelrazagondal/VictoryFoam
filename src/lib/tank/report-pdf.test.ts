import assert from "node:assert/strict";
import { test } from "node:test";

import { tankReportLines } from "./report-pdf.ts";

test("tank report names the typed pour and the suggested kg when they differ", () => {
  const lines = tankReportLines({
    date: "2026-09-23",
    currentQty: 2070,
    currentPct: 57250 / 2070,
    lines: [
      { name: "POP 45", quantity: 1050, solidContentPct: 45, suggestedKg: 925 },
      { name: "POP 25", quantity: 5250, solidContentPct: 25, suggestedKg: 5093 },
    ],
    resultQty: 8370,
    resultPct: (57250 + 1050 * 45 + 5250 * 25) / 8370,
    capacityNote: "The tank holds 8 000 kg. You can add at most 5 930 kg.",
  });
  const text = lines.join("\n");
  assert.match(text, /2026-09-23/);
  assert.match(text, /POP 45: 1\D?050 kg/);
  assert.match(text, /suggested 925 kg/);
  assert.match(text, /POP 25: 5\D?250 kg/);
  assert.match(text, /8\D?370 kg/);
  assert.match(text, /holds 8 000 kg/);
});
