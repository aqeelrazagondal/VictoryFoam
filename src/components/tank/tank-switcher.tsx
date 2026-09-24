"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { Field } from "@/components/tank/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useTank } from "@/lib/tank/context";
import { parseNumber } from "@/lib/tank/parse";
import { saveTankSettings, TankError } from "@/lib/tank/repository";
import { cn } from "@/lib/utils";

function TankDraftForm({
  idPrefix,
  onCreated,
}: {
  idPrefix: string;
  onCreated?: () => void;
}) {
  const { createTank } = useTank();
  const [name, setName] = useState("");
  const [capacityText, setCapacityText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const nameId = `${idPrefix}-name`;
  const capacityId = `${idPrefix}-capacity`;

  async function submit() {
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Tank name is required.");
      return;
    }
    let capacity: number | null = null;
    if (capacityText.trim()) {
      capacity = parseNumber(capacityText);
      if (capacity === null || !(capacity > 0)) {
        setError("Tank size must be greater than zero.");
        return;
      }
    }
    setSaving(true);
    try {
      await createTank({ name: trimmed, capacity });
      setName("");
      setCapacityText("");
      onCreated?.();
    } catch (caught) {
      setError(caught instanceof TankError ? caught.message : "Could not create the tank.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <Field id={nameId} label="Tank name" error={error ?? undefined}>
        <Input
          id={nameId}
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${nameId}-error` : undefined}
        />
      </Field>
      <Field id={capacityId} label="Tank size, kg" hint="Optional. You can set this when you record what is already in the tank.">
        <Input
          id={capacityId}
          inputMode="decimal"
          value={capacityText}
          onChange={(event) => setCapacityText(event.target.value)}
        />
      </Field>
      <Button type="submit" size="touch" className="w-full" disabled={saving}>
        {saving ? "Creating…" : "Create tank"}
      </Button>
    </form>
  );
}

export function NameTankPanel() {
  return (
    <div className="space-y-5 pb-10">
      <div>
        <h1>Name your tank</h1>
        <p className="mt-2 text-muted-foreground">
          Give this tank a name you will recognise, such as Blend tank. You can add more later.
          Chemicals and shelf stock stay shared.
        </p>
      </div>
      <TankDraftForm idPrefix="first-tank" />
    </div>
  );
}

function editableNumber(value: number | null) {
  if (value == null) return "";
  return new Intl.NumberFormat("en-ZA", {
    maximumFractionDigits: 2,
    useGrouping: false,
  }).format(value);
}

export function TankSwitcher() {
  const { loading, tanks, activeTank, selectTank, renameTank, removeTank, refresh } = useTank();
  const [open, setOpen] = useState(false);
  const [rename, setRename] = useState(activeTank?.name ?? "");
  const [capacityText, setCapacityText] = useState("");
  const [heelText, setHeelText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  function openSheet() {
    setRename(activeTank?.name ?? "");
    setCapacityText(editableNumber(activeTank?.capacity ?? null));
    setHeelText(editableNumber(activeTank?.heel ?? 0));
    setError(null);
    setConfirmRemove(false);
    setOpen(true);
  }

  async function saveEdit() {
    if (!activeTank) return;
    const trimmed = rename.trim();
    if (!trimmed) {
      setError("Tank name is required.");
      return;
    }
    let capacity: number | null = null;
    if (capacityText.trim()) {
      capacity = parseNumber(capacityText);
      if (capacity === null || !(capacity > 0)) {
        setError("Tank size must be greater than zero.");
        return;
      }
    }
    const heel = parseNumber(heelText.trim() ? heelText : "0");
    if (heel === null || heel < 0) {
      setError("Heel cannot be negative.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await renameTank(activeTank.id, trimmed);
      await saveTankSettings(activeTank.id, { capacity, heel });
      await refresh();
      setOpen(false);
    } catch (caught) {
      setError(caught instanceof TankError ? caught.message : "Could not save the tank.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmArchive() {
    if (!activeTank) return;
    setSaving(true);
    setError(null);
    try {
      await removeTank(activeTank.id);
      setOpen(false);
    } catch (caught) {
      setError(caught instanceof TankError ? caught.message : "Could not remove the tank.");
    } finally {
      setSaving(false);
    }
  }

  const label = loading ? "Loading tanks" : activeTank?.name ?? "Add a tank";

  return (
    <>
      <button
        type="button"
        className="mt-0.5 flex max-w-full items-center gap-1 text-left text-sm font-medium text-primary disabled:text-muted-foreground"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="tank-switcher"
        disabled={loading}
        onClick={openSheet}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" id="tank-switcher" aria-describedby={undefined}>
          <SheetHeader>
            <SheetTitle>Tanks</SheetTitle>
          </SheetHeader>
          <div className="mt-4 max-h-[70dvh] space-y-5 overflow-y-auto pb-[env(safe-area-inset-bottom,0px)]">
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            {tanks.length > 0 ? (
              <ul className="space-y-1">
                {tanks.map((tank) => {
                  const current = tank.id === activeTank?.id;
                  return (
                    <li key={tank.id}>
                      <button
                        type="button"
                        className={cn(
                          "flex min-h-11 w-full items-center rounded-xl px-3 text-left text-base font-medium",
                          current ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                        )}
                        aria-current={current ? "true" : undefined}
                        onClick={() => {
                          void selectTank(tank.id)
                            .then(() => setOpen(false))
                            .catch((caught: unknown) => {
                              setError(caught instanceof Error ? caught.message : "Could not open that tank.");
                            });
                        }}
                      >
                        {tank.name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No tanks yet. Name the first one below.</p>
            )}

            {activeTank ? (
              <section className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground">Edit tank</h2>
                <Field id="rename-tank" label="Tank name">
                  <Input
                    id="rename-tank"
                    value={rename}
                    onChange={(event) => setRename(event.target.value)}
                    autoComplete="off"
                  />
                </Field>
                <Field id="edit-tank-size" label="Tank size (kg)" hint="Leave blank if this tank has no size set.">
                  <Input
                    id="edit-tank-size"
                    inputMode="decimal"
                    value={capacityText}
                    onChange={(event) => setCapacityText(event.target.value)}
                  />
                </Field>
                <Field id="edit-tank-heel" label="Heel (kg)" hint="The minimum you want left in the tank.">
                  <Input
                    id="edit-tank-heel"
                    inputMode="decimal"
                    value={heelText}
                    onChange={(event) => setHeelText(event.target.value)}
                  />
                </Field>
                <Button
                  type="button"
                  size="touch"
                  className="w-full"
                  disabled={saving || !rename.trim()}
                  onClick={() => void saveEdit()}
                >
                  {saving ? "Saving…" : "Save tank"}
                </Button>
                {confirmRemove ? (
                  <div className="space-y-2 rounded-xl border border-border p-3">
                    <p className="text-sm">
                      {activeTank.name} leaves the list. A tank with history is archived. An empty
                      tank is removed.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="touch"
                        className="flex-1"
                        disabled={saving}
                        onClick={() => setConfirmRemove(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="touch"
                        className="flex-1"
                        disabled={saving}
                        onClick={() => void confirmArchive()}
                      >
                        Remove tank
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="touch"
                    className="w-full"
                    disabled={saving}
                    onClick={() => setConfirmRemove(true)}
                  >
                    Remove {activeTank.name}
                  </Button>
                )}
              </section>
            ) : null}

            <section className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">Add a tank</h2>
              <TankDraftForm idPrefix="switcher-tank" onCreated={() => setOpen(false)} />
            </section>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
