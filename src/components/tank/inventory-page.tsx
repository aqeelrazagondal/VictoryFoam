"use client";

import { useEffect, useState } from "react";

import { EmptyState, Field } from "@/components/tank/empty-state";
import { ListPagination } from "@/components/tank/list-pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatLogWhen, formatQty } from "@/lib/calculations";
import { useTank } from "@/lib/tank/context";
import type { Chemical, StockMovement } from "@/lib/tank/models";
import { parseNumber } from "@/lib/tank/parse";
import {
  applyStockMovement,
  listChemicalsPage,
  listStockMovements,
  setReorderKg,
  TANK_LIST_PAGE_SIZE,
  TankError,
} from "@/lib/tank/repository";
import { stockLabel } from "@/lib/tank/stock";

const ACTIONS = [
  { type: "receive", label: "Receive", quantityLabel: "Kilograms received" },
  { type: "issue", label: "Issue", quantityLabel: "Kilograms issued" },
  { type: "waste", label: "Waste", quantityLabel: "Kilograms wasted" },
  { type: "count", label: "Set count", quantityLabel: "Kilograms counted" },
] as const;

type ActionType = (typeof ACTIONS)[number]["type"];

function onHandText(chemical: Chemical) {
  if (chemical.qtyAvailable === null) return "Not tracked";
  return `${formatQty(chemical.qtyAvailable)} ${chemical.unit}`;
}

function movementTitle(movement: StockMovement) {
  if (movement.type === "pour" && movement.quantity > 0) return "Returned to stock";
  if (movement.type === "receive") return "Received";
  if (movement.type === "issue") return "Issued";
  if (movement.type === "waste") return "Waste";
  if (movement.type === "count") return "Count";
  return "Poured into the tank";
}

function signedQty(movement: StockMovement, unit: string) {
  const amount = formatQty(Math.abs(movement.quantity));
  if (movement.quantity > 0) return `+${amount} ${unit}`;
  if (movement.quantity < 0) return `−${amount} ${unit}`;
  return `${amount} ${unit}`;
}

export function InventoryPage() {
  const { chemicals, refresh } = useTank();
  const [page, setPage] = useState(1);
  const [pageRows, setPageRows] = useState<Chemical[]>([]);
  const [pageTotal, setPageTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [action, setAction] = useState<{ chemical: Chemical; type: ActionType } | null>(null);
  const [quantityText, setQuantityText] = useState("");
  const [note, setNote] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [historyFor, setHistoryFor] = useState<Chemical | null>(null);
  const [history, setHistory] = useState<StockMovement[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [reorderText, setReorderText] = useState("");
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [reorderSaving, setReorderSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setListLoading(true);
    setListError(null);
    void listChemicalsPage({ page, pageSize: TANK_LIST_PAGE_SIZE })
      .then((result) => {
        if (cancelled) return;
        setPageRows(result.rows);
        setPageTotal(result.total);
        const lastPage = Math.max(1, Math.ceil(result.total / TANK_LIST_PAGE_SIZE));
        if (page > lastPage) setPage(lastPage);
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setListError(caught instanceof Error ? caught.message : "Could not load inventory.");
        }
      })
      .finally(() => {
        if (!cancelled) setListLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, chemicals]);

  function openAction(chemical: Chemical, type: ActionType) {
    setAction({ chemical, type });
    setQuantityText("");
    setNote("");
    setActionError(null);
  }

  async function openHistory(chemical: Chemical) {
    setHistoryFor(chemical);
    setReorderText(chemical.reorderKg === null ? "" : String(chemical.reorderKg));
    setReorderError(null);
    setHistory([]);
    setHistoryError(null);
    setHistoryLoading(true);
    try {
      setHistory(await listStockMovements(chemical.id));
    } catch (caught) {
      setHistoryError(caught instanceof Error ? caught.message : "Could not load history.");
    } finally {
      setHistoryLoading(false);
    }
  }

  async function saveAction() {
    if (!action) return;
    const quantity = parseNumber(quantityText);
    if (quantity === null) {
      setActionError("Enter the kilograms.");
      return;
    }
    if (action.type === "count" && quantity < 0) {
      setActionError("Counted stock cannot be negative.");
      return;
    }
    if (action.type !== "count" && !(quantity > 0)) {
      setActionError("Quantity must be greater than zero.");
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      await applyStockMovement(action.chemical.id, {
        type: action.type,
        quantity,
        note: note.trim() || null,
      });
      await refresh();
      setAction(null);
    } catch (caught) {
      setActionError(caught instanceof TankError ? caught.message : "Could not save this stock change.");
    } finally {
      setSaving(false);
    }
  }

  async function saveReorder() {
    if (!historyFor) return;
    const parsed = reorderText.trim() === "" ? null : parseNumber(reorderText);
    if (reorderText.trim() !== "" && (parsed === null || parsed < 0)) {
      setReorderError("Enter kilograms, or leave this blank.");
      return;
    }
    setReorderSaving(true);
    setReorderError(null);
    try {
      await setReorderKg(historyFor.id, parsed);
      await refresh();
      setHistoryFor((current) => (current ? { ...current, reorderKg: parsed } : current));
    } catch (caught) {
      setReorderError(caught instanceof TankError ? caught.message : "Could not save the low-stock line.");
    } finally {
      setReorderSaving(false);
    }
  }

  const actionMeta = ACTIONS.find((item) => item.type === action?.type);

  return (
    <div className="space-y-5 pb-10">
      <div>
        <h1>Inventory</h1>
        <p className="mt-1 text-muted-foreground">
          Kilograms on the shelf. Home shows what is already in the tank.
        </p>
      </div>

      {listLoading ? <p className="text-muted-foreground">Loading…</p> : null}
      {listError ? (
        <p className="text-sm text-destructive" role="alert">
          {listError}
        </p>
      ) : null}

      {!listLoading && pageTotal === 0 ? (
        <EmptyState
          title="No chemicals yet"
          description="Add a chemical first. Then you can receive drums onto the shelf."
          actionLabel="Add a chemical"
          actionHref="/tank/chemicals/"
        />
      ) : (
        <>
          <ul className="grid gap-3">
            {pageRows.map((chemical) => {
              const label = stockLabel(chemical.qtyAvailable, chemical.reorderKg);
              return (
                <li key={chemical.id} className="rounded-2xl border border-border bg-card p-4">
                  <p className="font-heading text-lg font-semibold">{chemical.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {onHandText(chemical)}
                    {label && label !== "Not tracked" ? ` · ${label}` : null}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ACTIONS.map((item) => (
                      <Button
                        key={item.type}
                        variant="outline"
                        size="touch"
                        aria-label={`${item.label} ${chemical.name}`}
                        onClick={() => openAction(chemical, item.type)}
                      >
                        {item.label}
                      </Button>
                    ))}
                    <Button
                      variant="secondary"
                      size="touch"
                      aria-label={`History for ${chemical.name}`}
                      onClick={() => void openHistory(chemical)}
                    >
                      History
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
          {pageTotal > 0 ? (
            <ListPagination
              page={page}
              pageSize={TANK_LIST_PAGE_SIZE}
              total={pageTotal}
              onPageChange={setPage}
              label="Inventory pages"
            />
          ) : null}
        </>
      )}

      <Sheet open={action !== null} onOpenChange={(open) => !open && setAction(null)}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>
              {actionMeta?.label} {action?.chemical.name}
            </SheetTitle>
          </SheetHeader>
          {action && actionMeta ? (
            <div className="mt-6 space-y-4">
              <p className="text-sm text-muted-foreground">On hand: {onHandText(action.chemical)}</p>
              <Field id="stock-qty" label={actionMeta.quantityLabel} error={actionError ?? undefined}>
                <Input
                  id="stock-qty"
                  inputMode="decimal"
                  value={quantityText}
                  onChange={(event) => {
                    setQuantityText(event.target.value);
                    setActionError(null);
                  }}
                  aria-invalid={Boolean(actionError)}
                />
              </Field>
              <Field id="stock-note" label="Note" hint="Optional.">
                <Input id="stock-note" value={note} onChange={(event) => setNote(event.target.value)} />
              </Field>
              <Button size="touch" className="w-full" onClick={() => void saveAction()} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <Sheet open={historyFor !== null} onOpenChange={(open) => !open && setHistoryFor(null)}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>{historyFor ? `${historyFor.name} history` : "History"}</SheetTitle>
          </SheetHeader>
          {historyFor ? (
            <div className="mt-6 space-y-5">
              <Field
                id="reorder-kg"
                label="Warn when below (kg)"
                hint="Leave blank if you do not want a low-stock line."
                error={reorderError ?? undefined}
              >
                <Input
                  id="reorder-kg"
                  inputMode="decimal"
                  value={reorderText}
                  onChange={(event) => {
                    setReorderText(event.target.value);
                    setReorderError(null);
                  }}
                />
              </Field>
              <Button size="touch" variant="outline" onClick={() => void saveReorder()} disabled={reorderSaving}>
                {reorderSaving ? "Saving…" : "Save low-stock line"}
              </Button>
              {historyLoading ? <p className="text-muted-foreground">Loading…</p> : null}
              {historyError ? (
                <p className="text-sm text-destructive" role="alert">
                  {historyError}
                </p>
              ) : null}
              {!historyLoading && history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No stock movements yet.</p>
              ) : (
                <ul className="grid gap-3">
                  {history.map((movement) => (
                    <li key={movement.id} className="rounded-xl border border-border px-3 py-3">
                      <p className="font-medium">{movementTitle(movement)}</p>
                      <p className="text-sm text-muted-foreground">
                        {signedQty(movement, historyFor.unit)} · balance{" "}
                        {formatQty(movement.balanceAfter)} {historyFor.unit}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatLogWhen(movement.createdAt.slice(0, 10), movement.createdAt)}
                      </p>
                      {movement.note ? <p className="mt-1 text-sm">{movement.note}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
              {history.length === 50 ? (
                <p className="text-sm text-muted-foreground">Showing the latest 50 movements.</p>
              ) : null}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
