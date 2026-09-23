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

export function downloadTankReport(report: TankReport) {
  const bytes = buildTextPdf(tankReportLines(report));
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

function buildTextPdf(lines: string[]) {
  const content = renderContent(lines);
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
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

function renderContent(lines: string[]) {
  const commands = ["BT", "/F1 11 Tf", "48 800 Td", "16 TL"];
  for (const line of lines) {
    const parts = wrapLine(line, 85);
    const rows = parts.length > 0 ? parts : [""];
    for (const part of rows) {
      commands.push(`(${pdfSafe(part)}) Tj`, "T*");
    }
  }
  commands.push("ET");
  return commands.join("\n");
}

function wrapLine(value: string, width: number) {
  if (value.length <= width) return [value];
  const words = value.split(" ");
  const rows: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width && current) {
      rows.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) rows.push(current);
  return rows;
}

function pdfSafe(value: string) {
  return value
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}
