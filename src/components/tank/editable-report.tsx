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
  tankName,
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
  tankName: string;
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
        tankName,
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

  const pourLabel = pours.length === 1 ? "1 polyol" : `${pours.length} polyols`;

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-[#d5e0da] bg-[#f3f6f4] text-[#1c2938] shadow-[0_24px_50px_-28px_rgba(18,42,36,0.55)]">
      <div className="bg-[#14322c] px-5 py-5 text-[#f4f7f4]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.7rem] font-semibold tracking-[0.22em] text-[#b7d0c6]">UMAR</p>
            <p className="mt-1 font-heading text-2xl font-semibold tracking-tight">Tank report</p>
            <p className="text-sm text-[#d5e4de]">{tankName}</p>
          </div>
          <StatusBadge status={status} />
        </div>
        {message ? <p className="mt-3 text-sm text-[#d5e4de]">{message}</p> : null}
      </div>

      <div className="grid grid-cols-2 gap-px bg-[#d5e0da]">
        <div className="bg-[#f3f6f4] px-5 py-4">
          <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[#5d6d67]">IN THE TANK</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{formatQty(currentQty)} kg</p>
          <p className="text-sm text-[#5d6d67]">{formatPct(currentPct)}</p>
        </div>
        <div className="bg-[#f3f6f4] px-5 py-4">
          <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[#5d6d67]">THIS POUR</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{formatQty(preview.addedKg)} kg</p>
          <p className="text-sm text-[#5d6d67]">{pourLabel}</p>
        </div>
      </div>

      <div className={overflow ? "mx-4 mt-4 rounded-2xl bg-[#f8ebe3] px-5 py-5" : "mx-4 mt-4 rounded-2xl bg-[#e3f3ea] px-5 py-5"}>
        <p className={overflow ? "text-[0.7rem] font-semibold tracking-[0.16em] text-[#9a3412]" : "text-[0.7rem] font-semibold tracking-[0.16em] text-[#1f5c4a]"}>
          Your solid content
        </p>
        <p className="hero-number mt-1 text-[#12312b]">{formatPct(preview.solidPct)}</p>
        <p className="mt-2 text-sm text-[#3d524b]">Tank afterwards: {formatQty(preview.volume)} kg</p>
      </div>

      <div className="px-4 pb-5 pt-4">
        <p className="text-sm text-[#5d6d67]">
          Type the kg you will actually pour. Change the solid content only if this drum differs a
          little from the saved chemical.
        </p>
        <ul className="mt-4 space-y-3">
          {parsed.map((row, index) => (
            <li
              key={row.line.id}
              className={
                overflow
                  ? "rounded-2xl border-l-4 border-[#9a3412] bg-white px-4 py-4"
                  : "rounded-2xl border-l-4 border-[#14322c] bg-white px-4 py-4"
              }
            >
              <div className="flex items-baseline gap-3">
                <span className="text-xs font-semibold tabular-nums text-[#5d6d67]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h2 className="font-heading text-lg font-semibold">{row.line.name}</h2>
              </div>
              {row.line.note ? <p className="mt-1 text-sm text-[#5d6d67]">{row.line.note}</p> : null}
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Field id={`report-${row.line.id}-kg`} label="kg">
                  <Input
                    id={`report-${row.line.id}-kg`}
                    inputMode="decimal"
                    className="h-14 border-[#c9d5ce] bg-[#f7faf8] text-lg font-semibold tabular-nums text-[#1c2938]"
                    value={drafts[index]?.kg ?? ""}
                    onChange={(event) => updateDraft(index, { kg: event.target.value })}
                  />
                </Field>
                <Field id={`report-${row.line.id}-pct`} label="Solid content %">
                  <Input
                    id={`report-${row.line.id}-pct`}
                    inputMode="decimal"
                    className="h-14 border-[#c9d5ce] bg-[#f7faf8] text-lg font-semibold tabular-nums text-[#1c2938]"
                    value={drafts[index]?.pct ?? ""}
                    onChange={(event) => updateDraft(index, { pct: event.target.value })}
                  />
                </Field>
              </div>
              <p className="mt-2 text-sm text-[#5d6d67]">
                Calculator suggested {formatQty(row.line.suggestedKg)} kg.
              </p>
              {row.pctInvalid ? (
                <p className="mt-2 text-sm text-[#9a3412]" role="alert">
                  Solid content must be from 0 to 100.
                </p>
              ) : null}
            </li>
          ))}
        </ul>
        {overflow ? (
          <p className="mt-4 rounded-xl bg-[#f8ebe3] px-4 py-3 text-sm text-[#9a3412]" role="alert">
            {overflow}
          </p>
        ) : null}
        <div className="mt-5 space-y-3">
          <Button
            type="button"
            variant="outline"
            size="touch"
            className="w-full border-[#c9d5ce] bg-white text-[#1c2938] shadow-none hover:bg-[#eef4f0]"
            disabled={downloading}
            onClick={() => void download()}
          >
            {downloading ? "Preparing PDF…" : "Download PDF"}
          </Button>
          <Button
            type="button"
            size="touch"
            className="w-full bg-[#14322c] text-white shadow-none hover:bg-[#1c453c]"
            disabled={blocked}
            onClick={() => onConfirm(pours)}
          >
            {confirming ? "Saving…" : label}
          </Button>
        </div>
      </div>
    </section>
  );
}

function plainNumber(value: number) {
  if (!Number.isFinite(value)) return "";
  return String(Math.round(value * 1000) / 1000);
}
