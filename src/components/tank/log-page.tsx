"use client";

import { useMemo, useState } from "react";

import { ChemicalPicker } from "@/components/tank/chemical-picker";
import { ConsumptionTable } from "@/components/tank/consumption-table";
import { EmptyState, Field } from "@/components/tank/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  canConsume,
  consumeBreakdown,
  formatPct,
  formatQty,
  isHeelBreach,
  type LogEntryType,
} from "@/lib/calculations";
import { useTank } from "@/lib/tank/context";
import type { Chemical, TankLogDraft, TankLogEntry } from "@/lib/tank/models";
import { parseNumber } from "@/lib/tank/parse";
import {
  deleteLogEntry,
  insertLogEntry,
  TankError,
  updateLogEntry,
} from "@/lib/tank/repository";

const TYPE_LABEL: Record<LogEntryType, string> = {
  opening_balance: "Opening Balance",
  add_batch: "Add Batch",
  consume_usage: "Consume / Usage",
};

export function LogPage() {
  const { tankReady, snapshot, settings, entries, activeChemicals, chemicals, refresh } = useTank();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TankLogEntry | null>(null);
  const [type, setType] = useState<LogEntryType>("add_batch");
  const [quantity, setQuantity] = useState("");
  const [pct, setPct] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");
  const [chemical, setChemical] = useState<Chemical | null>(null);
  const [rate, setRate] = useState("");
  const [minutes, setMinutes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [heelNote, setHeelNote] = useState<string | null>(null);

  const reversed = useMemo(() => [...snapshot.entries].reverse(), [snapshot.entries]);
  const heel = settings?.heel ?? 0;
  const names = Object.fromEntries(chemicals.map((item) => [item.id, item]));
  const consumeQty = parseNumber(quantity);
  const consumePreview =
    type === "consume_usage" && consumeQty !== null
      ? consumeBreakdown({
          volume: snapshot.volume,
          solidPct: snapshot.solidPct,
          remainingByChemical: snapshot.remainingByChemical,
          unattributed: snapshot.unattributed,
          consumeQty,
        })
      : null;

  function startAdd() {
    setEditing(null);
    setType(tankReady ? "add_batch" : "opening_balance");
    setQuantity("");
    setPct("");
    setNote("");
    setDate("");
    setChemical(null);
    setRate("");
    setMinutes("");
    setError(null);
    setHeelNote(null);
    setOpen(true);
  }

  function startEdit(entry: TankLogEntry) {
    setEditing(entry);
    setType(entry.type);
    setQuantity(String(entry.quantity));
    setPct(entry.solidContentPct === null ? "" : String(entry.solidContentPct));
    setNote(entry.note ?? "");
    setDate(entry.entryDate);
    setChemical(chemicals.find((item) => item.id === entry.chemicalId) ?? null);
    setRate("");
    setMinutes("");
    setError(null);
    setOpen(true);
  }

  async function save() {
    const qty = parseNumber(quantity);
    if (qty === null || !(qty > 0)) {
      setError("Quantity is required.");
      return;
    }
    const solidPct = type === "consume_usage" ? null : parseNumber(pct);
    if (type !== "consume_usage" && solidPct === null) {
      setError("Solid Content % is required for this entry type.");
      return;
    }
    if (!tankReady && type !== "opening_balance") {
      setError("The first entry must be an Opening Balance.");
      return;
    }
    if (tankReady && !editing && type === "opening_balance") {
      setError("Opening Balance can only be the first entry.");
      return;
    }
    if (type === "consume_usage" && !canConsume(snapshot.volume, qty) && !editing) {
      setError("Cannot consume more than the current tank volume.");
      return;
    }

    const draft: TankLogDraft = {
      type,
      quantity: qty,
      solidContentPct: solidPct,
      chemicalId: type === "consume_usage" ? null : chemical?.id ?? null,
      note: note.trim() || null,
      entryDate: date || undefined,
    };

    if (type === "consume_usage" && isHeelBreach(snapshot.volume - qty, heel)) {
      setHeelNote("This consume drops the tank below the heel. It will still be saved.");
    } else {
      setHeelNote(null);
    }

    try {
      if (editing) await updateLogEntry(editing.id, draft);
      else await insertLogEntry(draft);
      await refresh();
      setOpen(false);
    } catch (caught) {
      setError(caught instanceof TankError ? caught.message : "Could not save the entry.");
    }
  }

  async function remove(id: string) {
    await deleteLogEntry(id);
    await refresh();
  }

  if (!tankReady && entries.length === 0) {
    return (
      <div className="space-y-4">
        <h1>Tank log</h1>
        <EmptyState
          title="Set up your tank first"
          description="Tank Log starts with an Opening Balance."
          actionLabel="Set up tank"
          actionHref="/tank/setup/"
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1>Tank log</h1>
          <p className="text-muted-foreground">
            {formatQty(snapshot.volume)} kg at {formatPct(snapshot.solidPct)}
          </p>
        </div>
        <Button size="touch" onClick={startAdd}>
          Add entry
        </Button>
      </div>

      {isHeelBreach(snapshot.volume, heel) ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          Running volume is below the heel. Something may have been mis-logged.
        </p>
      ) : null}

      <ol className="space-y-3">
        {reversed.map((entry) => {
          const chemicalName = entry.chemicalId
            ? (names[entry.chemicalId]?.name ?? "Archived chemical")
            : "Unattributed";
          return (
            <li key={entry.id} className="rounded-2xl border border-border bg-card p-4">
              <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                {TYPE_LABEL[entry.type]}
              </p>
              <p className="mt-1 font-heading text-lg font-semibold">
                {formatQty(entry.quantity)} kg
                {entry.solidContentPct !== null ? ` · ${formatPct(entry.solidContentPct)}` : ""}
              </p>
              <p className="text-sm text-muted-foreground">
                {chemicalName} · then {formatQty(entry.runningVolume)} kg at{" "}
                {formatPct(entry.runningPct)}
              </p>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="touch" onClick={() => startEdit(entries.find((item) => item.id === entry.id)!)}>
                  Edit
                </Button>
                <Button variant="ghost" size="touch" onClick={() => void remove(entry.id)}>
                  Delete
                </Button>
              </div>
            </li>
          );
        })}
      </ol>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit entry" : "Add entry"}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Type</legend>
              {(["opening_balance", "add_batch", "consume_usage"] as const)
                .filter((option) => {
                  if (editing?.type === option) return true;
                  if (!tankReady) return option === "opening_balance";
                  return option !== "opening_balance";
                })
                .map((option) => (
                  <label key={option} className="flex min-h-12 items-center gap-3 rounded-xl border border-border px-3">
                    <input
                      type="radio"
                      name="log-type"
                      checked={type === option}
                      onChange={() => setType(option)}
                      className="size-4"
                    />
                    {TYPE_LABEL[option]}
                  </label>
                ))}
            </fieldset>
            {type === "consume_usage" ? (
              <div className="grid grid-cols-2 gap-3">
                <Field id="log-rate" label="kg per minute">
                  <Input
                    id="log-rate"
                    inputMode="decimal"
                    value={rate}
                    onChange={(event) => {
                      const nextRate = event.target.value;
                      setRate(nextRate);
                      const parsedRate = parseNumber(nextRate);
                      const parsedMinutes = parseNumber(minutes);
                      if (parsedRate !== null && parsedMinutes !== null) {
                        setQuantity(String(parsedRate * parsedMinutes));
                      }
                    }}
                  />
                </Field>
                <Field id="log-minutes" label="Minutes">
                  <Input
                    id="log-minutes"
                    inputMode="decimal"
                    value={minutes}
                    onChange={(event) => {
                      const nextMinutes = event.target.value;
                      setMinutes(nextMinutes);
                      const parsedRate = parseNumber(rate);
                      const parsedMinutes = parseNumber(nextMinutes);
                      if (parsedRate !== null && parsedMinutes !== null) {
                        setQuantity(String(parsedRate * parsedMinutes));
                      }
                    }}
                  />
                </Field>
              </div>
            ) : null}
            <Field
              id="log-qty"
              label="Quantity (kg)"
              hint={
                type === "consume_usage"
                  ? "Or type kg per minute and minutes above. 80 × 50 = 4 000."
                  : undefined
              }
            >
              <Input
                id="log-qty"
                inputMode="decimal"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </Field>
            {type === "consume_usage" && consumePreview?.ok ? (
              <ConsumptionTable
                breakdown={consumePreview}
                names={Object.fromEntries(
                  chemicals.map((item) => [item.id, { name: item.name }]),
                )}
              />
            ) : null}
            {type !== "consume_usage" ? (
              <Field id="log-pct" label="Solid Content %">
                <Input
                  id="log-pct"
                  inputMode="decimal"
                  value={pct}
                  onChange={(event) => setPct(event.target.value)}
                />
              </Field>
            ) : null}
            {type !== "consume_usage" ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Chemical (optional)</p>
                <ChemicalPicker
                  chemicals={activeChemicals}
                  selectedId={chemical?.id}
                  onSelect={setChemical}
                />
                <Button variant="ghost" size="touch" onClick={() => setChemical(null)}>
                  Leave unattributed
                </Button>
              </div>
            ) : null}
            <Field id="log-date" label="Date (optional)">
              <Input
                id="log-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </Field>
            <Field id="log-note" label="Note (optional)">
              <Textarea
                id="log-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </Field>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {heelNote ? <p className="text-sm text-amber-700 dark:text-amber-300">{heelNote}</p> : null}
            <Button size="touch" className="w-full" onClick={() => void save()}>
              Save entry
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
