"use client";

import { useEffect, useMemo, useState } from "react";

import { AddPanel } from "@/components/tank/add-panel";
import { DeleteConfirm } from "@/components/tank/delete-confirm";
import { EmptyState } from "@/components/tank/empty-state";
import { OpeningPanel } from "@/components/tank/opening-panel";
import { TankSummary } from "@/components/tank/tank-summary";
import { UsePanel } from "@/components/tank/use-panel";
import { Button } from "@/components/ui/button";
import {
  amountsEqual,
  compositionRows,
  editChemicalAmount,
  editSolidContent,
  encodeAdjustNote,
  formatPct,
  formatQty,
  isHeelBreach,
  roomToCapacity,
  scaleTankTotal,
  snapshotToAmounts,
  UNATTRIBUTED_KEY,
  type CompositionAmounts,
} from "@/lib/calculations";
import { useTank } from "@/lib/tank/context";
import { parseNumber } from "@/lib/tank/parse";
import { insertLogEntry, TankError } from "@/lib/tank/repository";

function formatSolidInput(value: number) {
  return formatPct(value).replace(/%$/, "");
}

function textsFromAmounts(
  amounts: CompositionAmounts,
  rows: { id: string; amount: number }[],
) {
  const rowTexts: Record<string, string> = {};
  for (const row of rows) {
    rowTexts[row.id] = formatQty(row.amount);
  }
  return {
    volumeText: formatQty(amounts.volume),
    solidText: formatSolidInput(amounts.solidPct),
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

export function HubPage() {
  const {
    loading,
    error,
    chemicals,
    activeChemicals,
    tankReady,
    snapshot,
    settings,
    refresh,
  } = useTank();
  const [panel, setPanel] = useState<"home" | "add" | "use">("home");
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState<CompositionAmounts | null>(null);
  const [volumeText, setVolumeText] = useState("");
  const [solidText, setSolidText] = useState("");
  const [rowTexts, setRowTexts] = useState<Record<string, string>>({});
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
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
    () =>
      Object.fromEntries(chemicals.map((chemical) => [chemical.id, chemical.solidContentPct])),
    [chemicals],
  );

  const baseline = useMemo(() => snapshotToAmounts(snapshot), [snapshot]);
  const display = draft ?? baseline;
  const room =
    settings?.capacity != null ? roomToCapacity(settings.capacity, display.volume) : null;
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
  ).map((row) => ({
    id: row.id,
    name: row.name,
    amount: row.amount,
  }));
  const dirty = draft != null && !amountsEqual(draft, baseline);
  const heel = settings?.heel ?? 0;

  useEffect(() => {
    if (dirty) return;
    const next = textsFromAmounts(baseline, rows);
    setVolumeText(next.volumeText);
    setSolidText(next.solidText);
    setRowTexts(next.rowTexts);
    setDraft(null);
    setConfirmOpen(false);
    setEditError(null);
    // rows derived from baseline when clean; sync labels after snapshot refresh
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset when saved snapshot changes
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

  function applyDraft(next: CompositionAmounts) {
    setDraft(next);
    syncTexts(next);
    setEditError(null);
    if (!amountsEqual(next, baseline)) setConfirmOpen(true);
    else {
      setDraft(null);
      setConfirmOpen(false);
    }
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

  function commitSolid() {
    const parsed = parseNumber(solidText);
    if (parsed === null) {
      setEditError("Enter the overall solid content.");
      setSolidText(formatSolidInput(display.solidPct));
      return;
    }
    if (Math.abs(parsed - display.solidPct) <= 0.05) {
      setSolidText(formatSolidInput(display.solidPct));
      setEditError(null);
      return;
    }
    const result = editSolidContent(display, chemicalPcts, nameMapForEdit(), parsed);
    if (!result.ok) {
      setEditError(result.reason);
      setSolidText(formatSolidInput(display.solidPct));
      return;
    }
    applyDraft(result.next);
  }

  function nameMapForEdit() {
    return Object.fromEntries(chemicals.map((chemical) => [chemical.id, chemical.name]));
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

  function cancelEdit() {
    setDraft(null);
    syncTexts(baseline);
    setConfirmOpen(false);
    setEditError(null);
    setSaveError(null);
  }

  async function saveEdit() {
    if (!draft) return;
    setSaving(true);
    setSaveError(null);
    try {
      await insertLogEntry({
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
      setDraft(null);
      setConfirmOpen(false);
      setNotice("Saved the new kilograms on Home.");
    } catch (caught) {
      setSaveError(caught instanceof TankError ? caught.message : "Could not save this change.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1>Tank</h1>
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1>Tank</h1>
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (!tankReady) return <OpeningPanel />;
  if (panel === "add") {
    return (
      <AddPanel
        onCancel={() => setPanel("home")}
        onDone={(message) => {
          setNotice(message);
          setPanel("home");
        }}
      />
    );
  }
  if (panel === "use") {
    return (
      <UsePanel
        onCancel={() => setPanel("home")}
        onDone={(message) => {
          setNotice(message);
          setPanel("home");
        }}
      />
    );
  }

  const beforeRows = compositionRows(snapshot, names).map((row) => ({
    id: row.id,
    name: row.name,
    amount: row.amount,
  }));
  const nameMap = Object.fromEntries(
    chemicals.map((chemical) => [chemical.id, chemical.name]),
  );

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1>Tank</h1>
        <p className="mt-2 text-muted-foreground">
          This is what is already in the tank. Pour more with Add to the tank. After a job, use I
          used some. Drums you have not poured yet are on Shelf stock.
        </p>
      </div>

      {notice ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">
          {notice}
        </p>
      ) : null}
      {isHeelBreach(display.volume, heel) ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          The tank is below the heel, the minimum you want left in it. Check the log if that looks
          wrong.
        </p>
      ) : null}

      <TankSummary
        volume={display.volume}
        solidPct={display.solidPct}
        room={room}
        rows={rows}
        editable={rows.length > 0}
        volumeText={volumeText}
        onVolumeChange={(value) => {
          setVolumeText(value);
          setEditError(null);
        }}
        onVolumeBlur={commitVolume}
        solidText={solidText}
        onSolidChange={(value) => {
          setSolidText(value);
          setEditError(null);
        }}
        onSolidBlur={commitSolid}
        rowTexts={rowTexts}
        onRowChange={(id, value) => {
          setRowTexts((current) => ({ ...current, [id]: value }));
          setEditError(null);
        }}
        onRowBlur={commitRow}
        editError={editError}
      />

      {confirmOpen && draft && dirty ? (
        <DeleteConfirm
          confirmLabel="Yes, save it"
          confirmVariant="default"
          busy={saving}
          onConfirm={() => void saveEdit()}
          onCancel={cancelEdit}
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
      ) : null}

      <div className="grid gap-3">
        {activeChemicals.length === 0 ? (
          <EmptyState
            title="Add a polyol first"
            description="Add a polyol, with a name and a solid content. Then you can add to the tank, fill, or plan a pour."
            actionLabel="Add a polyol"
            actionHref="/tank/chemicals/"
          />
        ) : (
          <div className="rounded-2xl border border-border bg-card p-4">
            <Button
              size="touch"
              className="w-full"
              onClick={() => {
                setNotice(null);
                setPanel("add");
              }}
            >
              Add to the tank
            </Button>
            <p className="mt-2 text-sm text-muted-foreground">
              Pour drums in. When you confirm, those kilograms leave Shelf stock.
            </p>
          </div>
        )}
        <div className="rounded-2xl border border-border bg-card p-4">
          <Button
            size="touch"
            variant="secondary"
            className="w-full"
            onClick={() => {
              setNotice(null);
              setPanel("use");
            }}
          >
            I used some
          </Button>
          <p className="mt-2 text-sm text-muted-foreground">
            After a job. Each chemical drops by the same share. Shelf stock stays as it is.
          </p>
        </div>
      </div>
    </div>
  );
}

function amountFor(amounts: CompositionAmounts, id: string) {
  if (id === UNATTRIBUTED_KEY) return amounts.unattributed;
  return amounts.remainingByChemical[id] ?? 0;
}
