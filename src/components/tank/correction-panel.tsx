"use client";

import { useEffect, useMemo, useState } from "react";

import { DeleteConfirm } from "@/components/tank/delete-confirm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  amountsEqual,
  compositionRows,
  editChemicalAmount,
  editSolidContent,
  encodeAdjustNote,
  formatPct,
  formatQty,
  scaleTankTotal,
  snapshotToAmounts,
  UNATTRIBUTED_KEY,
  type CompositionAmounts,
} from "@/lib/calculations";
import { useTank } from "@/lib/tank/context";
import { parseNumber } from "@/lib/tank/parse";
import { insertLogEntry, TankError } from "@/lib/tank/repository";

function formatEditableNumber(value: number) {
  return new Intl.NumberFormat("en-ZA", {
    maximumFractionDigits: 2,
    useGrouping: false,
  }).format(value);
}

function textsFromAmounts(amounts: CompositionAmounts, rows: { id: string; amount: number }[]) {
  const rowTexts: Record<string, string> = {};
  for (const row of rows) rowTexts[row.id] = formatQty(row.amount);
  return {
    volumeText: formatQty(amounts.volume),
    solidText: formatEditableNumber(amounts.solidPct),
    rowTexts,
  };
}

function confirmLines(
  before: CompositionAmounts,
  after: CompositionAmounts,
  names: Record<string, string>,
  beforeRows: { id: string; name: string; amount: number }[],
  afterRows: { id: string; name: string; amount: number }[],
) {
  const lines: string[] = [];
  const totalChanged = Math.abs(before.volume - after.volume) > 0.05;
  const solidChanged = Math.abs(before.solidPct - after.solidPct) > 0.05;

  if (totalChanged) {
    lines.push(
      `This changes the total from ${formatQty(before.volume)} kg to ${formatQty(after.volume)} kg. Every chemical is scaled by the same factor so the overall solid content stays ${formatPct(after.solidPct)}.`,
    );
  } else if (solidChanged) {
    lines.push(
      `Overall solid content becomes ${formatPct(after.solidPct)} (was ${formatPct(before.solidPct)}). The tank stays at ${formatQty(after.volume)} kg.`,
    );
  } else {
    lines.push(
      `This changes the kilograms of each chemical. The tank stays at ${formatQty(after.volume)} kg.`,
    );
  }

  const ids = new Set([...beforeRows.map((row) => row.id), ...afterRows.map((row) => row.id)]);
  for (const id of ids) {
    const beforeAmount = beforeRows.find((row) => row.id === id)?.amount ?? 0;
    const afterAmount = afterRows.find((row) => row.id === id)?.amount ?? 0;
    if (Math.abs(beforeAmount - afterAmount) <= 0.05) continue;
    const name =
      beforeRows.find((row) => row.id === id)?.name ??
      afterRows.find((row) => row.id === id)?.name ??
      names[id] ??
      "Chemical";
    lines.push(`${name}: ${formatQty(beforeAmount)} kg → ${formatQty(afterAmount)} kg`);
  }

  if (solidChanged && totalChanged) {
    lines.push(
      `Overall solid content becomes ${formatPct(after.solidPct)} (was ${formatPct(before.solidPct)}).`,
    );
  } else if (!solidChanged && !totalChanged) {
    lines.push(`Overall solid content stays ${formatPct(after.solidPct)}.`);
  }

  lines.push("This is saved as a log row so you can delete it later if it was wrong.");
  return lines;
}

export function CorrectionPanel({
  onDone,
  onCancel,
}: {
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const { chemicals, snapshot, settings, activeTank, refresh } = useTank();
  const [draft, setDraft] = useState<CompositionAmounts | null>(null);
  const [volumeText, setVolumeText] = useState("");
  const [solidText, setSolidText] = useState("");
  const [rowTexts, setRowTexts] = useState<Record<string, string>>({});
  const [editError, setEditError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const names = useMemo(
    () =>
      Object.fromEntries(
        chemicals.map((chemical) => [chemical.id, { name: chemical.name, unit: chemical.unit }]),
      ),
    [chemicals],
  );
  const chemicalPcts = useMemo(
    () => Object.fromEntries(chemicals.map((chemical) => [chemical.id, chemical.solidContentPct])),
    [chemicals],
  );
  const nameMap = useMemo(
    () => Object.fromEntries(chemicals.map((chemical) => [chemical.id, chemical.name])),
    [chemicals],
  );
  const baseline = useMemo(() => snapshotToAmounts(snapshot), [snapshot]);
  const display = draft ?? baseline;
  const rows = compositionRows(
    {
      ...snapshot,
      volume: display.volume,
      solidPct: display.solidPct,
      remainingByChemical: display.remainingByChemical,
      unattributed: display.unattributed,
      trackedTotal:
        Object.values(display.remainingByChemical).reduce((sum, qty) => sum + qty, 0) +
        display.unattributed,
    },
    names,
  ).map((row) => ({ id: row.id, name: row.name, amount: row.amount }));
  const beforeRows = compositionRows(snapshot, names).map((row) => ({
    id: row.id,
    name: row.name,
    amount: row.amount,
  }));
  const dirty = draft != null && !amountsEqual(draft, baseline);

  useEffect(() => {
    const next = textsFromAmounts(baseline, beforeRows);
    setVolumeText(next.volumeText);
    setSolidText(next.solidText);
    setRowTexts(next.rowTexts);
    // Seed the form once from the live tank. Later edits stay local until save.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- opening snapshot only
  }, [baseline]);

  function syncTexts(amounts: CompositionAmounts) {
    const nextRows = compositionRows(
      {
        ...snapshot,
        volume: amounts.volume,
        solidPct: amounts.solidPct,
        remainingByChemical: amounts.remainingByChemical,
        unattributed: amounts.unattributed,
        trackedTotal:
          Object.values(amounts.remainingByChemical).reduce((sum, qty) => sum + qty, 0) +
          amounts.unattributed,
      },
      names,
    );
    const texts = textsFromAmounts(
      amounts,
      nextRows.map((row) => ({ id: row.id, amount: row.amount })),
    );
    setVolumeText(texts.volumeText);
    setSolidText(texts.solidText);
    setRowTexts(texts.rowTexts);
  }

  function commitSolid() {
    const parsed = parseNumber(solidText);
    if (parsed === null) {
      setEditError("Enter the solid content.");
      setSolidText(formatEditableNumber(display.solidPct));
      return;
    }
    const result = editSolidContent(display, chemicalPcts, nameMap, parsed);
    if (!result.ok) {
      setEditError(result.reason);
      setSolidText(formatEditableNumber(display.solidPct));
      return;
    }
    applyDraft(result.next);
  }

  function applyDraft(next: CompositionAmounts) {
    setReviewing(false);
    setSaveError(null);
    if (amountsEqual(next, baseline)) {
      setDraft(null);
      syncTexts(baseline);
      return;
    }
    setDraft(next);
    syncTexts(next);
    setEditError(null);
  }

  function commitVolume() {
    const parsed = parseNumber(volumeText);
    if (parsed === null) {
      setEditError("Enter the total kilograms.");
      setVolumeText(formatQty(display.volume));
      return;
    }
    const result = scaleTankTotal(display, parsed, settings?.capacity ?? null);
    if (!result.ok) {
      setEditError(result.reason);
      setVolumeText(formatQty(display.volume));
      return;
    }
    applyDraft(result.next);
  }

  function commitRow(id: string) {
    const parsed = parseNumber(rowTexts[id] ?? "");
    if (parsed === null) {
      setEditError("Enter the kilograms for this chemical.");
      setRowTexts((current) => ({ ...current, [id]: formatQty(amountFor(display, id)) }));
      return;
    }
    const result = editChemicalAmount(display, chemicalPcts, id, parsed);
    if (!result.ok) {
      setEditError(result.reason);
      setRowTexts((current) => ({ ...current, [id]: formatQty(amountFor(display, id)) }));
      return;
    }
    applyDraft(result.next);
  }

  async function saveEdit() {
    if (!draft || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (!activeTank) throw new TankError("Choose a tank first.");
      await insertLogEntry(activeTank.id, {
        type: "adjust_composition",
        chemicalId: null,
        quantity: draft.volume,
        solidContentPct: draft.solidPct,
        note: encodeAdjustNote({
          remainingByChemical: draft.remainingByChemical,
          unattributed: draft.unattributed,
        }),
      });
      await refresh();
      onDone("Saved the new kilograms on Home.");
    } catch (caught) {
      setSaveError(caught instanceof TankError ? caught.message : "Could not save this change.");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 pb-8">
      <div>
        <h1>Correct tank readings</h1>
        <p className="mt-2 text-muted-foreground">
          Review the updated readings before saving a correction. Changing the total scales every
          chemical. Changing one chemical redistributes the others. Changing solid content keeps the
          total and moves the chemicals.
        </p>
      </div>
      <section className="space-y-4 rounded-2xl border border-border bg-card p-4">
        <div className="space-y-2">
          <label htmlFor="tank-total-kg" className="text-sm font-medium">
            Total mass (kg)
          </label>
          <Input
            id="tank-total-kg"
            inputMode="decimal"
            value={volumeText}
            onChange={(event) => {
              setVolumeText(event.target.value);
              setEditError(null);
              setReviewing(false);
            }}
            onBlur={commitVolume}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="tank-solid-pct" className="text-sm font-medium">
            Solid content (%)
          </label>
          <Input
            id="tank-solid-pct"
            inputMode="decimal"
            value={solidText}
            onChange={(event) => {
              setSolidText(event.target.value);
              setEditError(null);
              setReviewing(false);
            }}
            onBlur={commitSolid}
          />
        </div>
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3">
              <label htmlFor={`tank-chem-${row.id}`} className="min-w-0 flex-1 text-sm">
                {row.name}
              </label>
              <div className="flex items-center gap-2">
                <Input
                  id={`tank-chem-${row.id}`}
                  inputMode="decimal"
                  className="w-[7.5rem] text-right tabular-nums"
                  value={rowTexts[row.id] ?? ""}
                  onChange={(event) => {
                    setRowTexts((current) => ({ ...current, [row.id]: event.target.value }));
                    setEditError(null);
                    setReviewing(false);
                  }}
                  onBlur={() => commitRow(row.id)}
                />
                <span className="text-sm text-muted-foreground">kg</span>
              </div>
            </li>
          ))}
        </ul>
        {editError ? (
          <p id="tank-edit-error" className="text-sm text-destructive" role="alert">
            {editError}
          </p>
        ) : null}
      </section>
      {reviewing && draft && dirty ? (
        <DeleteConfirm
          confirmLabel={saving ? "Saving…" : "Save correction"}
          confirmVariant="default"
          busy={saving}
          onConfirm={() => void saveEdit()}
          onCancel={() => setReviewing(false)}
        >
          {confirmLines(baseline, draft, nameMap, beforeRows, rows).map((line) => (
            <p key={line}>{line}</p>
          ))}
          {saveError ? (
            <p className="text-destructive" role="alert">
              {saveError}
            </p>
          ) : null}
        </DeleteConfirm>
      ) : (
        <Button
          type="button"
          size="touch"
          className="w-full"
          disabled={!dirty || Boolean(editError)}
          onClick={() => setReviewing(true)}
        >
          Review correction
        </Button>
      )}
      <Button type="button" variant="outline" size="touch" className="w-full" onClick={onCancel} disabled={saving}>
        Back
      </Button>
    </div>
  );
}

function amountFor(amounts: CompositionAmounts, id: string) {
  if (id === UNATTRIBUTED_KEY) return amounts.unattributed;
  return amounts.remainingByChemical[id] ?? 0;
}
