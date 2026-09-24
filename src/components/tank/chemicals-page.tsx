"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { DeleteConfirm } from "@/components/tank/delete-confirm";
import { EmptyState, Field, TankLoading } from "@/components/tank/empty-state";
import { ScreenHeading } from "@/components/tank/screen-help";
import { ListPagination } from "@/components/tank/list-pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatPct, formatQty } from "@/lib/calculations";
import { useTank } from "@/lib/tank/context";
import type { Chemical, ChemicalDraft } from "@/lib/tank/models";
import { parseNumber } from "@/lib/tank/parse";
import {
  archiveChemical,
  createChemical,
  deleteChemical,
  listChemicalsPage,
  TANK_LIST_PAGE_SIZE,
  TankError,
  updateChemical,
} from "@/lib/tank/repository";

const emptyDraft = (): ChemicalDraft => ({
  name: "",
  solidContentPct: 0,
  qtyAvailable: null,
  unit: "kg",
  ohValue: null,
  viscosity: null,
});

export function ChemicalsPage() {
  const { chemicals, loggedChemicalIds, refresh, loading } = useTank();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Chemical | null>(null);
  const [draft, setDraft] = useState<ChemicalDraft>(emptyDraft());
  const [showDetails, setShowDetails] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [pctError, setPctError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageRows, setPageRows] = useState<Chemical[]>([]);
  const [pageTotal, setPageTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"name" | "newest">("name");

  const usedIds = useMemo(() => new Set(loggedChemicalIds), [loggedChemicalIds]);

  useEffect(() => {
    let cancelled = false;
    setListLoading(true);
    setListError(null);
    void listChemicalsPage({ page, pageSize: TANK_LIST_PAGE_SIZE, q: query, sort })
      .then((result) => {
        if (cancelled) return;
        setPageRows(result.rows);
        setPageTotal(result.total);
        const lastPage = Math.max(1, Math.ceil(result.total / TANK_LIST_PAGE_SIZE));
        if (page > lastPage) setPage(lastPage);
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setListError(caught instanceof Error ? caught.message : "Could not load chemicals.");
        }
      })
      .finally(() => {
        if (!cancelled) setListLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, chemicals, query, sort]);

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("suggestPct");
    if (raw === null) return;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > 100) return;
    setEditing(null);
    setDraft({
      ...emptyDraft(),
      name: `POP ${raw}`,
      solidContentPct: value,
    });
    setShowDetails(false);
    setNameError(null);
    setPctError(null);
    setOpen(true);
  }, []);

  function startAdd() {
    setEditing(null);
    setDraft(emptyDraft());
    setShowDetails(false);
    setNameError(null);
    setPctError(null);
    setOpen(true);
  }

  function startEdit(chemical: Chemical) {
    setEditing(chemical);
    setDraft({
      name: chemical.name,
      solidContentPct: chemical.solidContentPct,
      qtyAvailable: chemical.qtyAvailable,
      unit: chemical.unit,
      ohValue: chemical.ohValue,
      viscosity: chemical.viscosity,
    });
    setShowDetails(Boolean(chemical.ohValue || chemical.viscosity));
    setNameError(null);
    setPctError(null);
    setOpen(true);
  }

  async function save() {
    const name = draft.name.trim();
    if (!name) {
      setNameError("Name is required.");
      return;
    }
    if (Number.isNaN(draft.solidContentPct) || draft.solidContentPct < 0 || draft.solidContentPct > 100) {
      setPctError("Solid Content % must be between 0 and 100.");
      return;
    }
    setSaving(true);
    setNameError(null);
    try {
      if (editing) await updateChemical(editing.id, { ...draft, name }, chemicals);
      else await createChemical({ ...draft, name }, chemicals);
      await refresh();
      setOpen(false);
    } catch (caught) {
      setNameError(caught instanceof TankError ? caught.message : "Could not save chemical.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(chemical: Chemical) {
    const used = usedIds.has(chemical.id);
    try {
      if (used) await archiveChemical(chemical.id);
      else await deleteChemical(chemical.id);
      await refresh();
      setConfirmId(null);
    } catch (caught) {
      setNameError(caught instanceof Error ? caught.message : "Could not remove chemical.");
    }
  }

  if (loading) {
    return <TankLoading title="Chemicals" />;
  }

  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <ScreenHeading title="Chemicals">
            <p>Manage chemicals and their solid content.</p>
            <p>A name and a solid content are enough. Kilograms go on Shelf stock after that.</p>
          </ScreenHeading>
        </div>
        {!listLoading && pageTotal > 0 ? (
          <Button size="touch" onClick={startAdd}>
            Add chemical
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Field id="chem-search" label="Search names">
          <Input
            id="chem-search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </Field>
        <Field id="chem-sort" label="Sort">
          <select
            id="chem-sort"
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={sort}
            onChange={(event) => {
              setSort(event.target.value === "newest" ? "newest" : "name");
              setPage(1);
            }}
          >
            <option value="name">Name</option>
            <option value="newest">Newest</option>
          </select>
        </Field>
      </div>

      {listLoading ? <p className="text-muted-foreground">Loading…</p> : null}
      {listError ? (
        <p className="text-sm text-destructive" role="alert">
          {listError}
        </p>
      ) : null}

      {!listLoading && pageTotal === 0 ? (
        <EmptyState title="Add your first chemical" actionLabel="Add chemical" onAction={startAdd} />
      ) : (
        <>
          <ul className="grid gap-3">
            {pageRows.map((chemical) => (
              <li key={chemical.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-heading text-lg font-semibold">{chemical.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatPct(chemical.solidContentPct)} solid content
                      {" · "}
                      {chemical.qtyAvailable === null
                        ? "Stock not tracked. No kilograms on the shelf yet."
                        : `${formatQty(chemical.qtyAvailable)} ${chemical.unit} on the shelf`}
                    </p>
                    <Button asChild variant="link" size="touch" className="h-auto min-h-0 px-0">
                      <Link href="/tank/inventory/">Update shelf stock</Link>
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="touch" aria-label={`Edit ${chemical.name}`} onClick={() => startEdit(chemical)}>
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="touch"
                      aria-label={`${usedIds.has(chemical.id) ? "Archive" : "Delete"} ${chemical.name}`}
                      onClick={() => setConfirmId(chemical.id)}
                    >
                      {usedIds.has(chemical.id) ? "Archive" : "Delete"}
                    </Button>
                  </div>
                </div>
                {confirmId === chemical.id ? (
                  <DeleteConfirm
                    confirmLabel={usedIds.has(chemical.id) ? "Yes, archive it" : "Yes, delete it"}
                    onConfirm={() => void remove(chemical)}
                    onCancel={() => setConfirmId(null)}
                  >
                    {usedIds.has(chemical.id) ? (
                      <>
                        <p>
                          {chemical.name} at {formatPct(chemical.solidContentPct)} will leave the list
                          you pick from when you add, fill, blend, or plan.
                        </p>
                        <p>
                          Old log rows stay, so the kilograms and solid content in the tank do not
                          change. You can add a new polyol with this name later.
                        </p>
                      </>
                    ) : (
                      <>
                        <p>
                          {chemical.name} at {formatPct(chemical.solidContentPct)} will be removed
                          from the polyol list.
                        </p>
                        <p>
                          It has never been used in the tank log, so the kilograms and solid content
                          in the tank stay the same.
                        </p>
                        <p>This cannot be undone. You would have to add the polyol again.</p>
                      </>
                    )}
                  </DeleteConfirm>
                ) : null}
              </li>
            ))}
          </ul>
          {pageTotal > 0 ? (
            <ListPagination
              page={page}
              pageSize={TANK_LIST_PAGE_SIZE}
              total={pageTotal}
              onPageChange={setPage}
              label="Chemicals pages"
            />
          ) : null}
        </>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit chemical" : "Add chemical"}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {!editing ? (
              <p className="text-sm text-muted-foreground">
                A name and a solid content are enough to start.
              </p>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2">
              <Field id="chem-name" label="Name" error={nameError ?? undefined}>
                <Input
                  id="chem-name"
                  value={draft.name}
                  onChange={(event) => {
                    setDraft({ ...draft, name: event.target.value });
                    setNameError(null);
                  }}
                  aria-invalid={Boolean(nameError)}
                  aria-describedby={nameError ? "chem-name-error" : undefined}
                />
              </Field>
              <Field id="chem-pct" label="Solid Content %" error={pctError ?? undefined}>
                <Input
                  id="chem-pct"
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
              <>
                {editing ? (
                  <p className="text-sm text-muted-foreground">
                    On hand is{" "}
                    {editing.qtyAvailable === null
                      ? "no kilograms on the shelf yet"
                      : `${formatQty(editing.qtyAvailable)} ${editing.unit}`}
                    . Change kilograms on{" "}
                    <Link
                      href="/tank/inventory/"
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Shelf stock
                    </Link>
                    .
                  </p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      id="chem-qty"
                      label="Opening stock (kg)"
                      hint="Kilograms on the shelf now. Leave blank and enter them later on Shelf stock."
                    >
                      <Input
                        id="chem-qty"
                        inputMode="decimal"
                        value={draft.qtyAvailable ?? ""}
                        onChange={(event) =>
                          setDraft({ ...draft, qtyAvailable: parseNumber(event.target.value) })
                        }
                      />
                    </Field>
                    <Field id="chem-unit" label="Unit">
                      <Input
                        id="chem-unit"
                        value={draft.unit}
                        onChange={(event) => setDraft({ ...draft, unit: event.target.value })}
                      />
                    </Field>
                  </div>
                )}
                {editing ? (
                  <Field id="chem-unit" label="Unit">
                    <Input
                      id="chem-unit"
                      value={draft.unit}
                      onChange={(event) => setDraft({ ...draft, unit: event.target.value })}
                    />
                  </Field>
                ) : null}
                <div className="grid gap-4 md:grid-cols-2">
                  <Field id="chem-oh" label="OH value" hint="Reference only — never used in calculations.">
                    <Input
                      id="chem-oh"
                      inputMode="decimal"
                      value={draft.ohValue ?? ""}
                      onChange={(event) =>
                        setDraft({ ...draft, ohValue: parseNumber(event.target.value) })
                      }
                    />
                  </Field>
                  <Field id="chem-visc" label="Viscosity" hint="Reference only — never used in calculations.">
                    <Input
                      id="chem-visc"
                      inputMode="decimal"
                      value={draft.viscosity ?? ""}
                      onChange={(event) =>
                        setDraft({ ...draft, viscosity: parseNumber(event.target.value) })
                      }
                    />
                  </Field>
                </div>
              </>
            ) : (
              <Button type="button" variant="ghost" size="touch" onClick={() => setShowDetails(true)}>
                Add more details
              </Button>
            )}
            <Button size="touch" className="w-full" onClick={() => void save()} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
