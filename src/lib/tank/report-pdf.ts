import { formatPct, formatQty } from "../calculations/format.ts";

export type TankReportLine = {
  name: string;
  quantity: number;
  solidContentPct: number;
  suggestedKg: number;
};

export type TankReport = {
  date: string;
  currentQty: number;
  currentPct: number;
  lines: TankReportLine[];
  resultQty: number;
  resultPct: number;
  capacityNote: string | null;
};

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 28;

const INK = rgb(0.11, 0.15, 0.18);
const PAPER = rgb(0.953, 0.965, 0.957);
const PINE = rgb(0.078, 0.196, 0.173);
const MIST = rgb(0.73, 0.84, 0.79);
const WHITE = rgb(1, 1, 1);
const FOAM = rgb(0.878, 0.941, 0.906);
const MUTED = rgb(0.36, 0.43, 0.4);
const HAIR = rgb(0.82, 0.86, 0.83);
const ALERT_BG = rgb(0.976, 0.918, 0.863);
const ALERT_INK = rgb(0.55, 0.2, 0.08);

export function tankReportLines(report: TankReport) {
  const lines = [
    "Victory Foam tank report",
    report.date,
    "",
    `Already in the tank: ${formatQty(report.currentQty)} kg at ${formatPct(report.currentPct)}`,
    "",
    "Polyols poured",
  ];
  if (report.lines.length === 0) {
    lines.push("No polyol quantities entered.");
  }
  for (const line of report.lines) {
    lines.push(
      `${line.name}: ${formatQty(line.quantity)} kg at ${formatPct(line.solidContentPct)}`,
    );
    if (Math.abs(line.quantity - line.suggestedKg) > 0.05) {
      lines.push(`Calculator suggested ${formatQty(line.suggestedKg)} kg`);
    }
  }
  lines.push(
    "",
    `Tank afterwards: ${formatQty(report.resultQty)} kg at ${formatPct(report.resultPct)}`,
  );
  if (report.capacityNote) lines.push(report.capacityNote);
  return lines;
}

export function tankReportPdfBytes(report: TankReport) {
  return buildPdf(paintReport(report));
}

export function downloadTankReport(report: TankReport) {
  const bytes = tankReportPdfBytes(report);
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "tank-report.pdf";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function paintReport(report: TankReport) {
  const ops: string[] = [];
  fill(ops, 0, 0, PAGE_W, PAGE_H, PAPER);

  const headerH = 104;
  fill(ops, 0, PAGE_H - headerH, PAGE_W, headerH, PINE);
  text(ops, MARGIN, PAGE_H - 40, 10, "F1", MIST, "VICTORY FOAM");
  text(ops, MARGIN, PAGE_H - 74, 28, "F2", WHITE, "Tank report");
  const date = prettyDate(report.date);
  text(ops, PAGE_W - MARGIN - textWidth(date, 11), PAGE_H - 42, 11, "F1", MIST, date);

  const contentW = PAGE_W - MARGIN * 2;
  const gap = 10;
  const colW = (contentW - gap) / 2;
  const factH = 78;
  let top = PAGE_H - headerH - 16;
  const factY = top - factH;
  fill(ops, MARGIN, factY, colW, factH, WHITE);
  fill(ops, MARGIN + colW + gap, factY, colW, factH, WHITE);
  text(ops, MARGIN + 16, factY + 52, 9, "F1", MUTED, "IN THE TANK");
  text(ops, MARGIN + 16, factY + 28, 16, "F2", INK, `${formatQty(report.currentQty)} kg`);
  text(ops, MARGIN + 16, factY + 12, 11, "F1", MUTED, formatPct(report.currentPct));

  const pourKg = report.lines.reduce((sum, line) => sum + line.quantity, 0);
  const pourLabel = report.lines.length === 1 ? "1 polyol" : `${report.lines.length} polyols`;
  const rightX = MARGIN + colW + gap + 16;
  text(ops, rightX, factY + 52, 9, "F1", MUTED, "THIS POUR");
  text(ops, rightX, factY + 28, 16, "F2", INK, `${formatQty(pourKg)} kg`);
  text(ops, rightX, factY + 12, 11, "F1", MUTED, pourLabel);

  top = factY - 12;
  const heroH = 138;
  const heroY = top - heroH;
  const over = Boolean(report.capacityNote);
  fill(ops, MARGIN, heroY, contentW, heroH, over ? ALERT_BG : FOAM);
  const heroLabel = over ? "OVER THE TANK SIZE" : "YOUR SOLID CONTENT";
  const heroLabelWidth = textWidth(heroLabel, 9);
  text(ops, (PAGE_W - heroLabelWidth) / 2, heroY + 108, 9, "F1", over ? ALERT_INK : PINE, heroLabel);
  const pct = formatPct(report.resultPct);
  const pctSize = 42;
  text(ops, (PAGE_W - textWidth(pct, pctSize, true)) / 2, heroY + 58, pctSize, "F2", over ? ALERT_INK : PINE, pct);
  const after = `Tank afterwards  ${formatQty(report.resultQty)} kg`;
  text(ops, (PAGE_W - textWidth(after, 12)) / 2, heroY + 24, 12, "F1", over ? ALERT_INK : INK, after);

  top = heroY - 26;
  text(ops, MARGIN, top, 9, "F1", MUTED, "POLYOLS POURED");
  top -= 14;

  const rows = report.lines.length > 0 ? report.lines : [];
  if (rows.length === 0) {
    const emptyH = 48;
    const emptyY = top - emptyH;
    fill(ops, MARGIN, emptyY, contentW, emptyH, WHITE);
    text(ops, MARGIN + 16, emptyY + 20, 12, "F1", MUTED, "No polyol quantities entered.");
    top = emptyY - 12;
  }

  rows.forEach((line, index) => {
    const changed = Math.abs(line.quantity - line.suggestedKg) > 0.05;
    const nameRows = wrap(line.name, 13, contentW - 170);
    const rowH = 28 + nameRows.length * 16 + (changed ? 16 : 0);
    const rowY = top - rowH;
    fill(ops, MARGIN, rowY, contentW, rowH, WHITE);
    fill(ops, MARGIN, rowY, 4, rowH, over ? ALERT_INK : PINE);
    const indexLabel = String(index + 1).padStart(2, "0");
    text(ops, MARGIN + 16, rowY + rowH - 22, 9, "F1", MUTED, indexLabel);
    nameRows.forEach((row, rowIndex) => {
      text(ops, MARGIN + 40, rowY + rowH - 22 - rowIndex * 16, 13, "F2", INK, row);
    });
    if (changed) {
      const suggested = `Calculator suggested ${formatQty(line.suggestedKg)} kg`;
      text(ops, MARGIN + 40, rowY + 14, 9, "F1", MUTED, suggested);
    }
    const kg = `${formatQty(line.quantity)} kg`;
    const solid = formatPct(line.solidContentPct);
    text(ops, PAGE_W - MARGIN - 16 - textWidth(kg, 14, true), rowY + rowH - 24, 14, "F2", INK, kg);
    text(ops, PAGE_W - MARGIN - 16 - textWidth(solid, 11), rowY + rowH - 42, 11, "F1", MUTED, solid);
    top = rowY - 8;
  });

  if (report.capacityNote) {
    const noteRows = wrap(report.capacityNote, 11, contentW - 32);
    const noteH = 22 + noteRows.length * 15;
    const noteY = top - noteH - 4;
    fill(ops, MARGIN, noteY, contentW, noteH, ALERT_BG);
    noteRows.forEach((row, index) => {
      text(ops, MARGIN + 16, noteY + noteH - 20 - index * 15, 11, "F1", ALERT_INK, row);
    });
  }

  stroke(ops, MARGIN, 36, PAGE_W - MARGIN, 36, HAIR);
  text(ops, MARGIN, 20, 9, "F1", MUTED, "Factory pour sheet");
  const foot = prettyDate(report.date);
  text(ops, PAGE_W - MARGIN - textWidth(foot, 9), 20, 9, "F1", MUTED, foot);

  return ops.join("\n");
}

function buildPdf(content: string) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>`,
    `<< /Length ${new TextEncoder().encode(content).length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

function fill(ops: string[], x: number, y: number, w: number, h: number, color: string) {
  ops.push(`${color} rg`, `${round(x)} ${round(y)} ${round(w)} ${round(h)} re`, "f");
}

function stroke(ops: string[], x1: number, y1: number, x2: number, y2: number, color: string) {
  ops.push(`${color} RG`, "0.6 w", `${round(x1)} ${round(y1)} m`, `${round(x2)} ${round(y2)} l`, "S");
}

function text(
  ops: string[],
  x: number,
  y: number,
  size: number,
  font: "F1" | "F2",
  color: string,
  value: string,
) {
  ops.push(
    "BT",
    `/${font} ${size} Tf`,
    `${color} rg`,
    `1 0 0 1 ${round(x)} ${round(y)} Tm`,
    `(${pdfSafe(value)}) Tj`,
    "ET",
  );
}

function wrap(value: string, size: number, maxWidth: number) {
  const words = pdfSafe(value).split(" ").filter((word) => word.length > 0);
  const rows: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (textWidth(next, size) > maxWidth && current) {
      rows.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) rows.push(current);
  return rows.length > 0 ? rows : [""];
}

function prettyDate(iso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const month = months[Number(match[2]) - 1];
  if (!month) return iso;
  return `${Number(match[3])} ${month} ${match[1]}`;
}

function pdfSafe(value: string) {
  return value
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function rgb(r: number, g: number, b: number) {
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function textWidth(value: string, size: number, bold = false) {
  let width = 0;
  for (const char of value) {
    const unit = WIDTHS[char] ?? 500;
    width += ((bold ? unit * 1.04 : unit) / 1000) * size;
  }
  return width;
}

const WIDTHS: Record<string, number> = {
  " ": 278,
  ".": 278,
  ",": 278,
  ":": 278,
  ";": 278,
  "-": 333,
  "/": 278,
  "%": 889,
  "0": 556,
  "1": 556,
  "2": 556,
  "3": 556,
  "4": 556,
  "5": 556,
  "6": 556,
  "7": 556,
  "8": 556,
  "9": 556,
  A: 667,
  B: 667,
  C: 722,
  D: 722,
  E: 667,
  F: 611,
  G: 778,
  H: 722,
  I: 278,
  J: 500,
  K: 667,
  L: 556,
  M: 833,
  N: 722,
  O: 778,
  P: 667,
  Q: 778,
  R: 722,
  S: 667,
  T: 611,
  U: 722,
  V: 667,
  W: 944,
  X: 667,
  Y: 667,
  Z: 611,
  a: 556,
  b: 556,
  c: 500,
  d: 556,
  e: 556,
  f: 278,
  g: 556,
  h: 556,
  i: 222,
  j: 222,
  k: 500,
  l: 222,
  m: 833,
  n: 556,
  o: 556,
  p: 556,
  q: 556,
  r: 333,
  s: 500,
  t: 278,
  u: 556,
  v: 500,
  w: 722,
  x: 500,
  y: 500,
  z: 500,
};
