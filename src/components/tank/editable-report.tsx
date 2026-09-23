"use client";

import { useState } from "react";

import { Field } from "@/components/tank/empty-state";
import { StatusBadge } from "@/components/tank/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  capacityOverflowMessage,
  formatPct,
  formatQty,
  previewTankAfterAdds,
  type FeasibilityStatus,
} from "@/lib/calculations";
import { parseNumber } from "@/lib/tank/parse";

export type ReportSuggestion = {
  id: string;
  name: string;
  suggestedKg: number;
  solidContentPct: number;
  note?: string;
};

export type EditedPour = {
  id: string;
  name: string;
  quantity: number;
  solidContentPct: number;
  suggestedKg: number;
};

export function EditableReport({
  status = "feasible",
  message,
  currentQty,
  currentPct,
  capacity,
  suggestions,
  confirmLabel,
  confirming = false,
  onConfirm,
}: {
  status?: FeasibilityStatus;
  message?: string;
  currentQty: number;
  currentPct: number;
  capacity: number | null;
  suggestions: ReportSuggestion[];
  confirmLabel: string | ((lines: EditedPour[]) => string);
  confirming?: boolean;
  onConfirm: (lines: EditedPour[]) => void;
}) {
  const [drafts, setDrafts] = useState(() =>
    suggestions.map((line) => ({
      kg: plainNumber(line.suggestedKg),
      pct: plainNumber(line.solidContentPct),
    })),
  );
  const [downloading, setDownloading] = useState(false);

  const parsed = suggestions.map((line, index) => {
    const draft = drafts[index] ?? { kg: "", pct: "" };
    const quantity = parseNumber(draft.kg);
    const solidContentPct = parseNumber(draft.pct);
    const hasKg = quantity != null && quantity > 0;
    const pctInvalid =
      hasKg &&
      (solidContentPct == null || solidContentPct < 0 || solidContentPct > 100);
    return { line, quantity, solidContentPct, pctInvalid };
  });
  const pours: EditedPour[] = parsed.flatMap((row) => {
    if (row.pctInvalid || row.quantity == null || !(row.quantity > 0) || row.solidContentPct == null) {
      return [];
    }
    return [
      {
        id: row.line.id,
        name: row.line.name,
        quantity: row.quantity,
        solidContentPct: row.solidContentPct,
        suggestedKg: row.line.suggestedKg,
      },
    ];
  });
  const preview = previewTankAfterAdds({
    currentQty,
    currentPct,
    adds: pours.map((line) => ({
      quantity: line.quantity,
      solidContentPct: line.solidContentPct,
    })),
  });
  const overflow =
    pours.length > 0
      ? capacityOverflowMessage({
          volume: currentQty,
          addQty: preview.addedKg,
          capacity,
        })
      : null;
  const blocked = confirming || pours.length === 0 || parsed.some((row) => row.pctInvalid) || overflow != null;
  const label = typeof confirmLabel === "function" ? confirmLabel(pours) : confirmLabel;

  function updateDraft(index: number, patch: { kg?: string; pct?: string }) {
    setDrafts((current) =>
      current.map((draft, draftIndex) => (draftIndex === index ? { ...draft, ...patch } : draft)),
    );
  }

  async function download() {
    setDownloading(true);
    try {
      const { downloadTankReport } = await import("@/lib/tank/report-pdf");
      downloadTankReport({
        date: new Date().toISOString().slice(0, 10),
        currentQty,
        currentPct,
        lines: pours,
        resultQty: preview.volume,
        resultPct: preview.solidPct,
        capacityNote: overflow,
      });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 shadow-sm">
      <StatusBadge status={status} />
      {message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
      <p className="mt-3 text-sm text-muted-foreground">
        Type the kg you will actually pour. Change the solid content only if this drum differs a
        little from the saved chemical. The result below uses what you type.
      </p>
      <ul className="mt-4 space-y-4">
        {parsed.map((row, index) => (
          <li key={row.line.id} className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-base">{row.line.name}</h2>
            {row.line.note ? (
              <p className="mt-1 text-sm text-muted-foreground">{row.line.note}</p>
            ) : null}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field
                id={`report-${row.line.id}-kg`}
                label="kg"
                hint={`Calculator suggested ${formatQty(row.line.suggestedKg)} kg.`}
              >
                <Input
                  id={`report-${row.line.id}-kg`}
                  inputMode="decimal"
                  value={drafts[index]?.kg ?? ""}
                  onChange={(event) => updateDraft(index, { kg: event.target.value })}
                />
              </Field>
              <Field id={`report-${row.line.id}-pct`} label="Solid content %">
                <Input
                  id={`report-${row.line.id}-pct`}
                  inputMode="decimal"
                  value={drafts[index]?.pct ?? ""}
                  onChange={(event) => updateDraft(index, { pct: event.target.value })}
                />
              </Field>
            </div>
            {row.pctInvalid ? (
              <p className="mt-2 text-sm text-destructive" role="alert">
                Solid content must be from 0 to 100.
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Your solid content
        </p>
        <p className="hero-number mt-1 text-foreground">{formatPct(preview.solidPct)}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Tank afterwards: {formatQty(preview.volume)} kg
        </p>
      </div>
      {overflow ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {overflow}
        </p>
      ) : null}
      <div className="mt-6 space-y-3">
        <Button
          type="button"
          variant="outline"
          size="touch"
          className="w-full"
          disabled={downloading}
          onClick={() => void download()}
        >
          {downloading ? "Preparing PDF…" : "Download PDF"}
        </Button>
        <Button
          type="button"
          size="touch"
          className="w-full"
          disabled={blocked}
          onClick={() => onConfirm(pours)}
        >
          {confirming ? "Saving…" : label}
        </Button>
      </div>
    </section>
  );
}

function plainNumber(value: number) {
  if (!Number.isFinite(value)) return "";
  return String(Math.round(value * 1000) / 1000);
}
