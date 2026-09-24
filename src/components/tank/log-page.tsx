"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  BatchLinesEditor,
  createBatchLine,
  parseBatchLines,
  type BatchLine,
} from "@/components/tank/batch-lines-editor";
import { ChemicalPicker } from "@/components/tank/chemical-picker";
import { DeleteConfirm } from "@/components/tank/delete-confirm";
import { ConsumptionTable } from "@/components/tank/consumption-table";
import { EmptyState, Field } from "@/components/tank/empty-state";
import { ListPagination } from "@/components/tank/list-pagination";
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
  capacityOverflowMessage,
  consumeBreakdown,
  formatLogWhen,
  formatPct,
  formatQty,
  isHeelBreach,
  parseDatetimeLocal,
  replayLog,
  roomToCapacity,
  toDatetimeLocalValue,
  type LogEntryType,
} from "@/lib/calculations";
import { useTank } from "@/lib/tank/context";
import type { Chemical, TankLogDraft, TankLogEntry } from "@/lib/tank/models";
import { parseNumber } from "@/lib/tank/parse";
import {
  deleteLogEntry,
  insertLogEntries,
  insertLogEntry,
  latestFactoryProduction,
  listLogEntriesPage,
  TANK_LIST_PAGE_SIZE,
  TankError,
  updateLogEntry,
} from "@/lib/tank/repository";

/** Labels in the add/edit sheet (action names). */
const TYPE_LABEL: Record<Exclude<LogEntryType, "adjust_composition">, string> = {
  opening_balance: "Opening Balance",
  add_batch: "Add Batch",
  consume_usage: "Consume / Usage",
};

/** Short human labels in the history list. */
const LOG_ROW_LABEL: Record<LogEntryType, string> = {
  opening_balance: "Already in the tank",
  add_batch: "Pour",
  consume_usage: "Used",
  adjust_composition: "Correction",
};

function chemicalLabelForEntry(
  entry: TankLogEntry,
  names: Record<string, Chemical | undefined>,
) {
  if (entry.type === "adjust_composition") return "Tank mix";
  if (entry.chemicalId) return names[entry.chemicalId]?.name ?? "Archived chemical";
  return "Unattributed";
}

function lastProductionHeadline(
  entry: TankLogEntry,
  chemicalName: string,
): string {
  if (entry.type === "consume_usage") {
    return `Last job: used ${formatQty(entry.quantity)} kg`;
  }
  if (entry.chemicalId || chemicalName !== "Unattributed") {
    return `Last pour: ${formatQty(entry.quantity)} kg of ${chemicalName}`;
  }
  return `Last pour: ${formatQty(entry.quantity)} kg`;
}

export function LogPage() {
  const router = useRouter();
  const { tankReady, snapshot, settings, entries, activeChemicals, chemicals, activeTank, tanks, selectTank, refresh } = useTank();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TankLogEntry | null>(null);
  const [type, setType] = useState<LogEntryType>("add_batch");
  const [quantity, setQuantity] = useState("");
  const [pct, setPct] = useState("");
  const [note, setNote] = useState("");
  const [when, setWhen] = useState("");
  const [chemical, setChemical] = useState<Chemical | null>(null);
  const [batchLines, setBatchLines] = useState<BatchLine[]>([createBatchLine("line-1")]);
  const [rate, setRate] = useState("");
  const [minutes, setMinutes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [heelNote, setHeelNote] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageRows, setPageRows] = useState<TankLogEntry[]>([]);
  const [pageTotal, setPageTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [factoryJob, setFactoryJob] = useState<TankLogEntry | null>(null);
  const [repeating, setRepeating] = useState(false);

  const heel = settings?.heel ?? 0;
  const capacity = settings?.capacity ?? null;
  const room = capacity != null ? roomToCapacity(capacity, snapshot.volume) : null;
  const names = Object.fromEntries(chemicals.map((item) => [item.id, item]));
  const runningById = useMemo(
    () => new Map(snapshot.entries.map((entry) => [entry.id, entry])),
    [snapshot.entries],
  );
  const lastProduction = factoryJob;

  useEffect(() => {
    let cancelled = false;
    setListLoading(true);
    setListError(null);
    void Promise.all([
      listLogEntriesPage(null, { page, pageSize: TANK_LIST_PAGE_SIZE }),
      latestFactoryProduction(),
    ])
      .then(([result, job]) => {
        if (cancelled) return;
        setPageRows(result.rows);
        setPageTotal(result.total);
        setFactoryJob(job);
        const lastPage = Math.max(1, Math.ceil(result.total / TANK_LIST_PAGE_SIZE));
        if (page > lastPage) setPage(lastPage);
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setListError(caught instanceof Error ? caught.message : "Could not load the log.");
        }
      })
      .finally(() => {
        if (!cancelled) setListLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, entries]);

  function tankLabel(tankId: string) {
    return tanks.find((tank) => tank.id === tankId)?.name ?? "Tank";
  }

  async function repeatLastProduction() {
    if (!lastProduction || lastProduction.type !== "consume_usage" || repeating) return;
    setRepeating(true);
    try {
      await selectTank(lastProduction.tankId);
      router.push(`/tank/?repeat=${lastProduction.quantity}`);
    } finally {
      setRepeating(false);
    }
  }
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
  const multiChemical = !editing && (type === "add_batch" || type === "opening_balance");
  const needsPolyol = multiChemical && activeChemicals.length === 0;

  function startAdd() {
    setEditing(null);
    setType(tankReady ? "add_batch" : "opening_balance");
    setQuantity("");
    setPct("");
    setNote("");
    setWhen("");
    setChemical(null);
    setBatchLines([createBatchLine("line-1")]);
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
    setWhen(toDatetimeLocalValue(entry.entryDate, entry.createdAt));
    setChemical(chemicals.find((item) => item.id === entry.chemicalId) ?? null);
    setBatchLines([createBatchLine("line-1")]);
    setRate("");
    setMinutes("");
    setError(null);
    setOpen(true);
  }

  async function save() {
    setError(null);
    setHeelNote(null);

    const stamped = parseDatetimeLocal(when);
    if (when.trim() && !stamped) {
      setError("Enter a valid date and time, or leave that field blank.");
      return;
    }
    const whenFields = stamped
      ? { entryDate: stamped.entryDate, loggedAt: stamped.loggedAt }
      : {};

    if (multiChemical) {
      const parsed = parseBatchLines(batchLines);
      if (!parsed.ok) {
        setError(parsed.reason);
        return;
      }
      const addQty = parsed.rows.reduce((sum, row) => sum + row.quantity, 0);
      const overflow = capacityOverflowMessage({
        volume: snapshot.volume,
        addQty,
        capacity,
      });
      if (overflow) {
        setError(overflow);
        return;
      }
      if (tankReady && type === "opening_balance") {
        setError("Opening Balance can only be at the start of the log.");
        return;
      }
      if (!tankReady && type !== "opening_balance") {
        setError("The first entry must be an Opening Balance.");
        return;
      }
      try {
        if (!activeTank) throw new TankError("Choose a tank first.");
        await insertLogEntries(
          activeTank.id,
          parsed.rows.map((row, index) => ({
            type,
            chemicalId: row.chemicalId,
            quantity: row.quantity,
            solidContentPct: row.solidContentPct,
            note: note.trim() || null,
            ...whenFields,
            ...(stamped
              ? { loggedAt: new Date(new Date(stamped.loggedAt).getTime() + index).toISOString() }
              : {}),
          })),
        );
        setPage(1);
        await refresh();
        setOpen(false);
      } catch (caught) {
        setError(caught instanceof TankError ? caught.message : "Could not save the entry.");
      }
      return;
    }

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
      setError("Opening Balance can only be at the start of the log.");
      return;
    }
    if (type === "consume_usage" && !canConsume(snapshot.volume, qty) && !editing) {
      setError("Cannot consume more than the current tank volume.");
      return;
    }
    if (type !== "consume_usage" && !editing) {
      const overflow = capacityOverflowMessage({
        volume: snapshot.volume,
        addQty: qty,
        capacity,
      });
      if (overflow) {
        setError(overflow);
        return;
      }
    }
    if (editing && type !== "consume_usage") {
      const withoutThis = snapshot.volume - editing.quantity;
      const overflow = capacityOverflowMessage({
        volume: Math.max(0, withoutThis),
        addQty: qty,
        capacity,
      });
      if (overflow) {
        setError(overflow);
        return;
      }
    }

    const draft: TankLogDraft = {
      type,
      quantity: qty,
      solidContentPct: solidPct,
      chemicalId: type === "consume_usage" ? null : chemical?.id ?? null,
      note: note.trim() || null,
      ...whenFields,
    };

    if (type === "consume_usage" && isHeelBreach(snapshot.volume - qty, heel)) {
      setHeelNote("This consume drops the tank below the heel. It will still be saved.");
    }

    try {
      if (!activeTank) throw new TankError("Choose a tank first.");
      if (editing) await updateLogEntry(editing.id, draft);
      else {
        await insertLogEntry(activeTank.id, draft);
        setPage(1);
      }
      await refresh();
      setOpen(false);
    } catch (caught) {
      setError(caught instanceof TankError ? caught.message : "Could not save the entry.");
    }
  }

  async function remove(id: string) {
    setDeleteError(null);
    try {
      await deleteLogEntry(id);
      await refresh();
      setPendingDeleteId(null);
    } catch (caught) {
      setDeleteError(caught instanceof TankError ? caught.message : "Could not delete this entry.");
    }
  }

  if (!activeTank || (!tankReady && !listLoading && pageTotal === 0 && factoryJob == null)) {
    return (
      <div className="space-y-4">
        <h1>Tank log</h1>
        <EmptyState
          title="Set up your tank first"
          description="The log starts when you say what is already in the tank."
          actionLabel="Set up tank"
          actionHref="/tank/"
        />
      </div>
    );
  }

  const lastProductionName = lastProduction
    ? chemicalLabelForEntry(lastProduction, names)
    : null;
  const lastProductionWhen = lastProduction
    ? formatLogWhen(lastProduction.entryDate, lastProduction.createdAt)
    : null;
  const lastProductionRunning = lastProduction
    ? runningById.get(lastProduction.id)
    : null;

  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1>Activity</h1>
          <p className="text-muted-foreground">
            History of every tank. Deleting a pour puts those kilograms back on the shelf.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatQty(snapshot.volume)} kg at {formatPct(snapshot.solidPct)}
            {room != null ? ` · room for ${formatQty(room)} kg more` : ""}
          </p>
        </div>
        <Button size="touch" onClick={startAdd}>
          Add entry
        </Button>
      </div>

      {isHeelBreach(snapshot.volume, heel) ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          The tank is below the heel, the minimum you want left in it. Something may have been
          mis-logged.
        </p>
      ) : null}

      <section
        className="rounded-2xl border border-foreground/15 bg-muted/40 px-4 py-5 sm:px-5"
        aria-labelledby="last-production-heading"
      >
        <h2 id="last-production-heading" className="text-xl font-heading font-semibold">
          {lastProduction?.type === "consume_usage" ? "Latest usage" : "Latest production activity"}
        </h2>
        {lastProduction && lastProductionName ? (
          <div className="mt-3 space-y-2">
            <p className="font-heading text-2xl font-semibold leading-snug text-foreground">
              {lastProductionHeadline(lastProduction, lastProductionName)}
            </p>
            <p className="text-sm font-medium text-foreground">{tankLabel(lastProduction.tankId)}</p>
            {lastProductionWhen ? (
              <time
                dateTime={lastProduction.createdAt ?? lastProduction.entryDate}
                className="block text-base tabular-nums text-foreground"
              >
                {lastProductionWhen}
              </time>
            ) : null}
            {lastProduction.type === "consume_usage" ? (
              <Button
                type="button"
                size="touch"
                className="w-full"
                disabled={repeating}
                onClick={() => void repeatLastProduction()}
              >
                {repeating ? "Opening…" : "Use last production"}
              </Button>
            ) : null}
            {lastProduction.solidContentPct !== null ? (
              <p className="text-sm text-muted-foreground">
                Solid content {formatPct(lastProduction.solidContentPct)}
              </p>
            ) : null}
            {lastProductionRunning ? (
              <p className="text-base text-foreground">
                Tank afterwards: {formatQty(lastProductionRunning.runningVolume)} kg at{" "}
                {formatPct(lastProductionRunning.runningPct)}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            <p className="text-base text-foreground">
              This tank was only set up — no pour or use has been logged yet.
            </p>
            <p className="text-sm text-muted-foreground">
              Opening amounts: {formatQty(snapshot.volume)} kg at {formatPct(snapshot.solidPct)}.
              See the log below for what was put in at the start.
            </p>
          </div>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="tank-log-heading">
        <div>
          <h2 id="tank-log-heading" className="text-lg text-muted-foreground">
            All activity
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {lastProduction
              ? "Newest first. Every saved change, quieter than the job above."
              : "Newest first. Every saved change, with the tank afterwards."}
          </p>
        </div>

        {listLoading ? <p className="text-muted-foreground">Loading…</p> : null}
        {listError ? (
          <p className="text-sm text-destructive" role="alert">
            {listError}
          </p>
        ) : null}

        {!listLoading && pageRows.length === 0 ? (
          <p className="text-muted-foreground">Nothing in the log yet.</p>
        ) : (
          <ol className="divide-y divide-border border-y border-border">
            {pageRows.map((entry) => {
              const isHomeEdit = entry.type === "adjust_composition";
              const chemicalName = chemicalLabelForEntry(entry, names);
              const whenLabel = formatLogWhen(entry.entryDate, entry.createdAt);
              const running = runningById.get(entry.id);
              const visibleNote = isHomeEdit
                ? "Changed the kilograms on Home — not a production job."
                : entry.note;
              return (
                <li
                  key={entry.id}
                  className={
                    isHomeEdit
                      ? "bg-muted/20 px-1 py-4 sm:px-2"
                      : "px-1 py-4 sm:px-2"
                  }
                >
                  {whenLabel ? (
                    <time
                      dateTime={entry.createdAt ?? entry.entryDate}
                      className="block text-base font-medium tabular-nums text-foreground"
                    >
                      {whenLabel}
                    </time>
                  ) : null}
                  <p className="mt-1 text-sm font-medium text-foreground">{tankLabel(entry.tankId)}</p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {LOG_ROW_LABEL[entry.type]}
                    {isHomeEdit ? null : (
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        · {chemicalName}
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatQty(entry.quantity)} kg
                    {entry.solidContentPct !== null
                      ? ` · solid ${formatPct(entry.solidContentPct)}`
                      : ""}
                  </p>
                  {running ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Tank afterwards: {formatQty(running.runningVolume)} kg at{" "}
                      {formatPct(running.runningPct)}
                    </p>
                  ) : null}
                  {visibleNote ? (
                    <p className="mt-2 text-sm text-foreground">{visibleNote}</p>
                  ) : null}
                  <div className="mt-3 flex gap-2">
                    {isHomeEdit ? null : (
                      <Button variant="outline" size="touch" onClick={() => startEdit(entry)}>
                        Edit
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="touch"
                      onClick={() => {
                        setDeleteError(null);
                        setPendingDeleteId(entry.id);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                  {pendingDeleteId === entry.id ? (
                    <DeleteConfirm
                      confirmLabel="Yes, delete it"
                      onConfirm={() => void remove(entry.id)}
                      onCancel={() => {
                        setDeleteError(null);
                        setPendingDeleteId(null);
                      }}
                    >
                      {logDeleteCopy(
                        entry,
                        chemicalName,
                        snapshot.volume,
                        snapshot.solidPct,
                        entries,
                      ).map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                      {deleteError ? (
                        <p className="text-destructive" role="alert">
                          {deleteError}
                        </p>
                      ) : null}
                    </DeleteConfirm>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}

        {pageTotal > 0 ? (
          <ListPagination
            page={page}
            pageSize={TANK_LIST_PAGE_SIZE}
            total={pageTotal}
            onPageChange={setPage}
            label="Log pages"
          />
        ) : null}
      </section>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit entry" : "Add entry"}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Type</legend>
              <div className="grid gap-2 md:grid-cols-2">
                {(["opening_balance", "add_batch", "consume_usage"] as const)
                  .filter((option) => {
                    if (editing?.type === option) return true;
                    if (!tankReady) return option === "opening_balance";
                    return option !== "opening_balance";
                  })
                  .map((option) => (
                    <label
                      key={option}
                      className="flex min-h-12 items-center gap-3 rounded-xl border border-border px-3"
                    >
                      <input
                        type="radio"
                        name="log-type"
                        checked={type === option}
                        onChange={() => {
                          setType(option);
                          if (option === "add_batch" || option === "opening_balance") {
                            setBatchLines([createBatchLine("line-1")]);
                          }
                        }}
                        className="size-4"
                      />
                      {TYPE_LABEL[option]}
                    </label>
                  ))}
              </div>
            </fieldset>

            {type === "consume_usage" ? (
              <>
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
                <Field
                  id="log-qty"
                  label="Quantity (kg)"
                  hint="Or type kg per minute and minutes above. 57 × 77 = 4 389."
                >
                  <Input
                    id="log-qty"
                    inputMode="decimal"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                  />
                </Field>
                {consumePreview?.ok ? (
                  <ConsumptionTable
                    breakdown={consumePreview}
                    names={Object.fromEntries(
                      chemicals.map((item) => [item.id, { name: item.name }]),
                    )}
                  />
                ) : null}
              </>
            ) : null}

            {needsPolyol ? (
              <EmptyState
                title="Add a polyol first"
                description="Add a polyol, with a name and a solid content. Then you can log what you pour into the tank."
                actionLabel="Add a polyol"
                actionHref="/tank/chemicals/"
              />
            ) : null}

            {multiChemical && !needsPolyol ? (
              <BatchLinesEditor
                lines={batchLines}
                chemicals={activeChemicals}
                tankVolume={snapshot.volume}
                capacity={capacity}
                onChange={setBatchLines}
              />
            ) : null}

            {editing && type !== "consume_usage" ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field id="log-qty" label="Quantity (kg)">
                    <Input
                      id="log-qty"
                      inputMode="decimal"
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                    />
                  </Field>
                  <Field id="log-pct" label="Solid Content %">
                    <Input
                      id="log-pct"
                      inputMode="decimal"
                      value={pct}
                      onChange={(event) => setPct(event.target.value)}
                    />
                  </Field>
                </div>
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
                {capacity != null ? (
                  <p className="text-sm text-muted-foreground">
                    Tank holds {formatQty(capacity)} kg. Room after this edit must stay within that.
                  </p>
                ) : null}
              </>
            ) : null}

            {needsPolyol ? null : (
              <>
                <Field
                  id="log-when"
                  label="Date and time (optional)"
                  hint="Leave blank to use now. Shown on the log with every entry."
                >
                  <Input
                    id="log-when"
                    type="datetime-local"
                    value={when}
                    onChange={(event) => setWhen(event.target.value)}
                  />
                </Field>
                <Field id="log-note" label="Note (optional)">
                  <Textarea
                    id="log-note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </Field>
                {error ? (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                ) : null}
                {heelNote ? (
                  <p className="text-sm text-amber-700 dark:text-amber-300">{heelNote}</p>
                ) : null}
                <Button size="touch" className="w-full" onClick={() => void save()}>
                  Save entry
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function logDeleteCopy(
  entry: {
    id: string;
    type: LogEntryType;
    quantity: number;
    solidContentPct: number | null;
    note?: string | null;
  },
  chemicalName: string,
  currentVolume: number,
  currentPct: number,
  entries: {
    id: string;
    type: LogEntryType;
    chemicalId: string | null;
    quantity: number;
    solidContentPct: number | null;
    note?: string | null;
  }[],
) {
  const next = replayLog(
    entries
      .filter((item) => item.id !== entry.id)
      .map((item) => ({
        id: item.id,
        type: item.type,
        chemicalId: item.chemicalId,
        quantity: item.quantity,
        solidContentPct: item.solidContentPct,
        note: item.note,
      })),
  );
  const amount = `${formatQty(entry.quantity)} kg${
    entry.solidContentPct !== null ? ` at ${formatPct(entry.solidContentPct)}` : ""
  }`;
  const what =
    entry.type === "consume_usage" || entry.type === "adjust_composition"
      ? amount
      : `${chemicalName}, ${amount}`;
  const deleteNoun: Record<LogEntryType, string> = {
    opening_balance: "opening amounts",
    add_batch: "pour",
    consume_usage: "use",
    adjust_composition: "correction",
  };
  const lines = [
    `This removes the ${deleteNoun[entry.type]} of ${what} from the log.`,
  ];

  if (entry.type === "opening_balance" && !next.hasOpeningBalance) {
    lines.push(
      "This row is the start of the tank. After it is gone, Home asks what is already in the tank before you can fill again. Later rows stay in the log and are counted from an empty tank.",
    );
  } else if (entry.type === "consume_usage") {
    lines.push("Those kilograms go back into the tank. Every later row is counted again.");
  } else if (entry.type === "add_batch") {
    lines.push("This pour is taken out. Every later row is counted again without it.");
  } else if (entry.type === "adjust_composition") {
    lines.push("The kilograms go back to how they were before this Home correction.");
  } else {
    lines.push("The tank is counted again from the rows that remain.");
  }

  lines.push(
    `The tank will show ${formatQty(next.volume)} kg at ${formatPct(next.solidPct)}, instead of ${formatQty(currentVolume)} kg at ${formatPct(currentPct)}.`,
  );

  const problem = next.errors[0]?.reason;
  if (problem) lines.push(`The log will also show this problem: ${problem}`);

  lines.push("This cannot be undone. You would have to type the row again.");
  return lines;
}
