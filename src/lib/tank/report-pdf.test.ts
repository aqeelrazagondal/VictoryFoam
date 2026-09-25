import assert from "node:assert/strict";
import { test } from "node:test";

import { tankContentsPdfBytes, tankReportLines, tankReportPdfBytes } from "./report-pdf.ts";

test("tank report names the typed pour and the suggested kg when they differ", () => {
  const lines = tankReportLines({
    tankName: "Blend tank",
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
  assert.match(text, /Blend tank/);
  assert.match(text, /2026-09-23/);
  assert.match(text, /POP 45: 1\D?050 kg/);
  assert.match(text, /suggested 925 kg/);
  assert.match(text, /POP 25: 5\D?250 kg/);
  assert.match(text, /8\D?370 kg/);
  assert.match(text, /holds 8 000 kg/);
});

test("the pour sheet draws the solid content, the pours, and the capacity note", () => {
  const bytes = tankReportPdfBytes({
    tankName: "Blend tank",
    date: "2026-09-23",
    currentQty: 2220,
    currentPct: 27.93,
    lines: [
      { name: "Polymer polyol 45", quantity: 1050, solidContentPct: 44, suggestedKg: 725 },
      { name: "Polymer polyol 25", quantity: 5250, solidContentPct: 25, suggestedKg: 4055 },
    ],
    resultQty: 8520,
    resultPct: 28.1,
    capacityNote: "The tank holds 8 000 kg. You can add at most 5 780 kg.",
  });
  const pdf = new TextDecoder().decode(bytes);
  assert.match(pdf, /^%PDF-1\.4/);
  assert.match(pdf, /Helvetica-Bold/);
  assert.match(pdf, / re\nf/);
  assert.match(pdf, /Umar Bin Mushtaq/);
  assert.match(pdf, /Chemical Engineer/);
  assert.doesNotMatch(pdf, /Victory Foam|VICTORY FOAM/);
  assert.match(pdf, /Tank report/);
  assert.match(pdf, /Blend tank/);
  assert.match(pdf, /23 September 2026/);
  assert.match(pdf, /YOUR SOLID CONTENT|OVER THE TANK SIZE/);
  assert.match(pdf, /Polymer polyol 45/);
  assert.match(pdf, /1 050 kg/);
  assert.match(pdf, /Calculator suggested 725 kg/);
  assert.match(pdf, /5 250 kg/);
  assert.match(pdf, /8 520 kg/);
  assert.match(pdf, /holds 8 000 kg/);
});

test("a tank contents sheet names the engineer and the chemicals in the tank", () => {
  const bytes = tankContentsPdfBytes({
    tankName: "Blend tank",
    date: "2026-09-23",
    ready: true,
    volume: 1000,
    solidPct: 22.5,
    capacity: 8000,
    heel: 50,
    rows: [{ name: "Conventional polyol", amount: 1000, solidContentPct: 0 }],
  });
  const pdf = new TextDecoder().decode(bytes);
  assert.match(pdf, /Umar Bin Mushtaq/);
  assert.match(pdf, /Chemical Engineer/);
  assert.match(pdf, /Tank contents/);
  assert.match(pdf, /Conventional polyol/);
  assert.match(pdf, /Heel/);
});
