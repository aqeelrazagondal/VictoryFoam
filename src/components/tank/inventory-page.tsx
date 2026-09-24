"use client";

import { useEffect, useState } from "react";

import { DeleteConfirm } from "@/components/tank/delete-confirm";
import { EmptyState, Field, TankLoading } from "@/components/tank/empty-state";
import { TankContextNav } from "@/components/tank/tank-context-nav";
import { ListPagination } from "@/components/tank/list-pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatLogWhen, formatPct, formatQty } from "@/lib/calculations";
import { useTank } from "@/lib/tank/context";
import type { Chemical, ChemicalDraft, StockMovement } from "@/lib/tank/models";
import { parseNumber } from "@/lib/tank/parse";
import {
  applyStockMovement,
  createChemical,
  listChemicalsPage,
  listStockMovements,
  setReorderKg,
  TANK_LIST_PAGE_SIZE,
  TankError,
} from "@/lib/tank/repository";
import { nextStockBalance, stockLabel } from "@/lib/tank/stock";

const ACTIONS = [
  {
    type: "receive",
    label: "Receive",
    quantityLabel: "How many kilograms arrived?",
    hint: "These kilograms stay on the shelf. This does not pour them into the tank.",
  },
  {
    type: "issue",
    label: "Issue",
    quantityLabel: "How many kilograms left the shelf?",
    hint: "A sample or another machine. The tank stays the same.",
  },
  {
    type: "waste",
    label: "Waste",
    quantityLabel: "How many kilograms were lost?",
    hint: "Spill or scrap on the shelf. The tank stays the same.",
  },
  {
    type: "count",
    label: "Set count",
    quantityLabel: "How many kilograms are on the shelf now?",
    hint: "This replaces the number with what you just counted.",
  },
] as const;

type ActionType = (typeof ACTIONS)[number]["type"];

const emptyDraft = (): ChemicalDraft => ({
  name: "",
  solidContentPct: 0,
  qtyAvailable: null,
  unit: "kg",
  ohValue: null,
  viscosity: null,
});

function onHandText(chemical: Chemical) {
  if (chemical.qtyAvailable === null) return "No kilograms on the shelf yet";
  return `${formatQty(chemical.qtyAvailable)} ${chemical.unit}`;
}

function shelfSentence(chemical: Chemical) {
  const tone = stockLabel(chemical.qtyAvailable, chemical.reorderKg);
  if (tone === "Stock not tracked" || chemical.qtyAvailable === null) {
    return "No kilograms on the shelf yet. When drums arrive, enter how many came in.";
  }
  if (tone === "Short") {
    return `Short by ${formatQty(Math.abs(chemical.qtyAvailable))} ${chemical.unit}. Record a delivery, or count what is actually there.`;
  }
  if (tone === "Low") {
    return `Below your ${formatQty(chemical.reorderKg ?? 0)} ${chemical.unit} warning.`;
  }
  return "Still in the drums. This is not what is already in the tank.";
}

function shelfPreview(chemical: Chemical, type: ActionType, raw: string) {
  const quantity = parseNumber(raw);
  if (quantity === null) return null;
  try {
    const next = nextStockBalance(chemical.qtyAvailable, type, quantity);
    if (!next.applied) return null;
    return `The shelf will show ${formatQty(next.balanceAfter)} ${chemical.unit}.`;
  } catch {
    return null;
  }
}

function movementTitle(movement: StockMovement) {
  if (movement.type === "pour" && movement.quantity > 0) return "Put back on the shelf";
  if (movement.type === "receive") return "Drums arrived";
  if (movement.type === "issue") return "Used somewhere else";
  if (movement.type === "waste") return "Spilled or thrown away";
  if (movement.type === "count") return "Shelf was counted";
  return "Poured into the tank";
}

function signedQty(movement: StockMovement, unit: string) {
  const amount = formatQty(Math.abs(movement.quantity));
  if (movement.quantity > 0) return `+${amount} ${unit}`;
  if (movement.quantity < 0) return `−${amount} ${unit}`;
  return `${amount} ${unit}`;
}

export function InventoryPage() {
  const { chemicals, refresh, loading } = useTank();
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
  const [wasteConfirm, setWasteConfirm] = useState(false);
  const [historyFor, setHistoryFor] = useState<Chemical | null>(null);
  const [history, setHistory] = useState<StockMovement[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [reorderText, setReorderText] = useState("");
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [reorderSaving, setReorderSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<ChemicalDraft>(emptyDraft());
  const [showDetails, setShowDetails] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [pctError, setPctError] = useState<string | null>(null);
  const [chemSaving, setChemSaving] = useState(false);
  const [menuFor, setMenuFor] = useState<Chemical | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  if (loading) {
    return <TankLoading title="Inventory" />;
  }

  function startAddChemical() {
    setDraft(emptyDraft());
    setShowDetails(false);
    setNameError(null);
    setPctError(null);
    setAddOpen(true);
  }

  function openAction(chemical: Chemical, type: ActionType) {
    setAction({ chemical, type });
    setQuantityText("");
    setNote("");
    setActionError(null);
    setWasteConfirm(false);
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

  async function saveChemical() {
    const name = draft.name.trim();
    if (!name) {
      setNameError("Name is required.");
      return;
    }
    if (Number.isNaN(draft.solidContentPct) || draft.solidContentPct < 0 || draft.solidContentPct > 100) {
      setPctError("Solid Content % must be between 0 and 100.");
      return;
    }
    setChemSaving(true);
    setNameError(null);
    try {
      await createChemical({ ...draft, name }, chemicals);
      await refresh();
      setAddOpen(false);
    } catch (caught) {
      setNameError(caught instanceof TankError ? caught.message : "Could not save chemical.");
    } finally {
      setChemSaving(false);
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
    if (action.type === "waste" && !wasteConfirm) {
      setWasteConfirm(true);
      setActionError(null);
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      const movement = await applyStockMovement(action.chemical.id, {
        type: action.type,
        quantity,
        note: note.trim() || null,
      });
      await refresh();
      const left = movement ? formatQty(movement.balanceAfter) : formatQty(quantity);
      setNotice(`${action.chemical.name} now has ${left} ${action.chemical.unit} on the shelf.`);
      setAction(null);
      setWasteConfirm(false);
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1>Inventory</h1>
          <div className="mt-2">
            <TankContextNav current="inventory" />
          </div>
          <p className="mt-1 text-muted-foreground">
            On the shelf. Drums you still have. The tank is what is already mixed.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            When you confirm a pour on Home, the number here goes down on its own.
          </p>
        </div>
        {!listLoading && pageTotal > 0 ? (
          <Button size="touch" onClick={startAddChemical}>
            Add a chemical
          </Button>
        ) : null}
      </div>

      {notice ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm" role="status">
          {notice}
        </p>
      ) : null}
      {listLoading ? <p className="text-muted-foreground">Loading…</p> : null}
      {listError ? (
        <p className="text-sm text-destructive" role="alert">
          {listError}
        </p>
      ) : null}

      {!listLoading && pageTotal === 0 ? (
        <EmptyState
          title="Add a chemical"
          description="A name and a solid content are enough. Then tap Drums arrived and enter the kilograms."
          actionLabel="Add a chemical"
          onAction={startAddChemical}
        />
      ) : (
        <>
          <ul className="grid gap-3">
            {pageRows.map((chemical) => (
                <li key={chemical.id} className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">{formatPct(chemical.solidContentPct)} solid content</p>
                  <p className="font-heading text-lg font-semibold">{chemical.name}</p>
                  <p className="mt-1 font-heading text-3xl font-semibold tabular-nums tracking-tight">
                    {chemical.qtyAvailable === null ? (
                      "Stock not tracked"
                    ) : (
                      <>
                        {formatQty(chemical.qtyAvailable)}
                        <span className="ml-2 text-base font-medium text-muted-foreground">
                          {" "}
                          {chemical.unit} on the shelf
                        </span>
                      </>
                    )}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{shelfSentence(chemical)}</p>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Button
                      size="touch"
                      className="w-full sm:w-auto"
                      aria-label={`Receive ${chemical.name}`}
                      onClick={() => openAction(chemical, "receive")}
                    >
                      Receive
                    </Button>
                    <Button
                      variant="outline"
                      size="touch"
                      className="w-full sm:w-auto"
                      aria-label={`Actions for ${chemical.name}`}
                      onClick={() => setMenuFor(chemical)}
                    >
                      Actions
                    </Button>
                  </div>
                </li>
              ))}
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

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Add a chemical</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              A name and a solid content are enough. Then you can receive kilograms onto the shelf.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <Field id="inv-chem-name" label="Name" error={nameError ?? undefined}>
                <Input
                  id="inv-chem-name"
                  value={draft.name}
                  onChange={(event) => {
                    setDraft({ ...draft, name: event.target.value });
                    setNameError(null);
                  }}
                  aria-invalid={Boolean(nameError)}
                  aria-describedby={nameError ? "inv-chem-name-error" : undefined}
                />
              </Field>
              <Field id="inv-chem-pct" label="Solid Content %" error={pctError ?? undefined}>
                <Input
                  id="inv-chem-pct"
                  inputMode="decimal"
                  value={Number.isFinite(draft.solidContentPct) ? String(draft.solidContentPct) : ""}
                  onChange={(event) => {
                    const parsed = parseNumber(event.target.value);
                    setDraft({ ...draft, solidContentPct: parsed ?? Number.NaN });
                    setPctError(null);
                  }}
                />
              </Field>
            </div>
            {showDetails ? (
              <Field
                id="inv-chem-qty"
                label="Opening stock (kg)"
                hint="Optional. Leave blank if you will Receive the kilograms next."
              >
                <Input
                  id="inv-chem-qty"
                  inputMode="decimal"
                  value={draft.qtyAvailable ?? ""}
                  onChange={(event) =>
                    setDraft({ ...draft, qtyAvailable: parseNumber(event.target.value) })
                  }
                />
              </Field>
            ) : (
              <Button type="button" variant="ghost" size="touch" onClick={() => setShowDetails(true)}>
                Add more details
              </Button>
            )}
            <Button size="touch" className="w-full" onClick={() => void saveChemical()} disabled={chemSaving}>
              {chemSaving ? "Saving…" : "Save"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={menuFor !== null} onOpenChange={(open) => !open && setMenuFor(null)}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>{menuFor ? `Other change for ${menuFor.name}` : "Other change"}</SheetTitle>
          </SheetHeader>
          {menuFor ? (
            <div className="mt-6 space-y-3">
              <p className="text-sm text-muted-foreground">
                Pick what happened on the shelf. None of these pour into the tank.
              </p>
              {ACTIONS.filter((item) => item.type !== "receive").map((item) => (
                <button
                  key={item.type}
                  type="button"
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-left"
                  onClick={() => {
                    const chemical = menuFor;
                    setMenuFor(null);
                    openAction(chemical, item.type);
                  }}
                >
                  <span className="block font-medium">{item.label}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{item.hint}</span>
                </button>
              ))}
              <button
                type="button"
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-left"
                onClick={() => {
                  const chemical = menuFor;
                  setMenuFor(null);
                  void openHistory(chemical);
                }}
              >
                <span className="block font-medium">History</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  Deliveries, uses, spills, counts, and pours into the tank.
                </span>
              </button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <Sheet
        open={action !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAction(null);
            setWasteConfirm(false);
          }
        }}
      >
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>
              {actionMeta?.label} {action?.chemical.name}
            </SheetTitle>
          </SheetHeader>
          {action && actionMeta ? (
            <div className="mt-6 space-y-4">
              <p className="text-sm text-muted-foreground">{actionMeta.hint}</p>
              <p className="text-sm text-muted-foreground">Now: {onHandText(action.chemical)}</p>
              {shelfPreview(action.chemical, action.type, quantityText) ? (
                <p className="text-sm font-medium">{shelfPreview(action.chemical, action.type, quantityText)}</p>
              ) : null}
              <Field id="stock-qty" label={actionMeta.quantityLabel} error={actionError ?? undefined}>
                <Input
                  id="stock-qty"
                  inputMode="decimal"
                  value={quantityText}
                  onChange={(event) => {
                    setQuantityText(event.target.value);
                    setActionError(null);
                    setWasteConfirm(false);
                  }}
                  aria-invalid={Boolean(actionError)}
                />
              </Field>
              <Field id="stock-note" label="Note" hint="Optional.">
                <Input id="stock-note" value={note} onChange={(event) => setNote(event.target.value)} />
              </Field>
              {action.type === "waste" && wasteConfirm ? (
                <DeleteConfirm
                  confirmLabel="Yes, record waste"
                  busy={saving}
                  onConfirm={() => void saveAction()}
                  onCancel={() => setWasteConfirm(false)}
                >
                  <p>
                    {quantityText.trim() || "These"} kg of {action.chemical.name} will leave the shelf as
                    waste. This does not change the tank.
                  </p>
                </DeleteConfirm>
              ) : (
                <Button size="touch" className="w-full" onClick={() => void saveAction()} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              )}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <Sheet open={historyFor !== null} onOpenChange={(open) => !open && setHistoryFor(null)}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>{historyFor ? `History for ${historyFor.name}` : "History"}</SheetTitle>
          </SheetHeader>
          {historyFor ? (
            <div className="mt-6 space-y-5">
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <Field
                  id="reorder-kg"
                  label="Warn me when the shelf is below (kg)"
                  hint="Leave blank if you do not want a warning."
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
                  {reorderSaving ? "Saving…" : "Save warning"}
                </Button>
              </div>
              {historyLoading ? <p className="text-muted-foreground">Loading…</p> : null}
              {historyError ? (
                <p className="text-sm text-destructive" role="alert">
                  {historyError}
                </p>
              ) : null}
              {!historyLoading && history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No changes yet. Drums arrived is the usual first step.</p>
              ) : (
                <ul className="grid gap-3">
                  {history.map((movement) => (
                    <li key={movement.id} className="rounded-xl border border-border px-3 py-3">
                      <p className="font-medium">{movementTitle(movement)}</p>
                      <p className="text-sm text-muted-foreground">
                        {signedQty(movement, historyFor.unit)} · {formatQty(movement.balanceAfter)}{" "}
                        {historyFor.unit} left on the shelf
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
