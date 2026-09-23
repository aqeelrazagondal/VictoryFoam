"use client";

import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Field } from "@/components/tank/empty-state";
import { TankSummary } from "@/components/tank/tank-summary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatQty, roomToCapacity, summarizeMix } from "@/lib/calculations";
import { useTank } from "@/lib/tank/context";
import type { Chemical } from "@/lib/tank/models";
import { parseNumber } from "@/lib/tank/parse";
import {
  createChemical,
  insertLogEntries,
  saveTankSettings,
  TankError,
} from "@/lib/tank/repository";

type OpeningLine = {
  key: string;
  name: string;
  pct: string;
  kg: string;
};

function blankLine(key: string): OpeningLine {
  return { key, name: "", pct: "", kg: "" };
}

function isBlank(line: OpeningLine) {
  return line.name.trim() === "" && line.pct.trim() === "" && line.kg.trim() === "";
}

export function OpeningPanel() {
  const { activeChemicals, settings, refresh } = useTank();
  const [lines, setLines] = useState<OpeningLine[]>([blankLine("line-1")]);
  const [nextKey, setNextKey] = useState(2);
  const [capacityText, setCapacityText] = useState(
    settings?.capacity != null ? String(settings.capacity) : "8000",
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const capacity = parseNumber(capacityText);
  const parsedLines = lines
    .filter((line) => !isBlank(line))
    .map((line) => ({
      quantity: parseNumber(line.kg),
      solidContentPct: parseNumber(line.pct),
    }))
    .filter(
      (line): line is { quantity: number; solidContentPct: number } =>
        line.quantity != null && line.quantity > 0 && line.solidContentPct != null,
    );
  const summary = summarizeMix(parsedLines);
  const room = capacity != null && capacity > 0 ? roomToCapacity(capacity, summary.volume) : null;

  function updateLine(key: string, patch: Partial<OpeningLine>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  async function save() {
    setError(null);
    if (capacity == null || !(capacity > 0)) {
      setError("Enter the tank size. The usual tank is 8,000 kg.");
      return;
    }

    const filled = lines.filter((line) => !isBlank(line));
    if (filled.length === 0) {
      setError("Add at least one polyol that is already in the tank.");
      return;
    }

    const ready: { name: string; solidContentPct: number; quantity: number }[] = [];
    const seen = new Set<string>();
    for (const line of filled) {
      const name = line.name.trim();
      const solidContentPct = parseNumber(line.pct);
      const quantity = parseNumber(line.kg);
      if (!name || solidContentPct == null || quantity == null || !(quantity > 0)) {
        setError("Each polyol needs a name, a solid content, and kg.");
        return;
      }
      if (solidContentPct < 0 || solidContentPct > 100) {
        setError("Solid content must be from 0 to 100.");
        return;
      }
      const needle = name.toLowerCase();
      if (seen.has(needle)) {
        setError(`${name} is listed more than once. Combine those kg on one line.`);
        return;
      }
      seen.add(needle);
      ready.push({ name, solidContentPct, quantity });
    }

    const total = ready.reduce((sum, line) => sum + line.quantity, 0);
    if (total > capacity) {
      setError(
        `That is ${formatQty(total)} kg. The tank holds ${formatQty(capacity)} kg.`,
      );
      return;
    }

    setSaving(true);
    try {
      let known = [...activeChemicals];
      const rows: {
        chemicalId: string;
        quantity: number;
        solidContentPct: number;
      }[] = [];
      for (const line of ready) {
        const match = known.find(
          (chemical) => chemical.name.trim().toLowerCase() === line.name.toLowerCase(),
        );
        const chemical = match ?? (await createAndRemember(line, known));
        if (Math.abs(chemical.solidContentPct - line.solidContentPct) > 0.001) {
          throw new TankError(
            `${chemical.name} is already ${chemical.solidContentPct}% solid. Use that solid content, or a different name.`,
          );
        }
        if (!match) known = [...known, chemical];
        rows.push({
          chemicalId: chemical.id,
          quantity: line.quantity,
          solidContentPct: chemical.solidContentPct,
        });
      }

      await saveTankSettings({ capacity, heel: settings?.heel ?? 0 });
      await insertLogEntries(
        rows.map((row) => ({
          type: "opening_balance" as const,
          chemicalId: row.chemicalId,
          quantity: row.quantity,
          solidContentPct: row.solidContentPct,
          note: null,
        })),
      );
      await refresh();
    } catch (caught) {
      setError(caught instanceof TankError ? caught.message : "Could not save the tank.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 pb-10">
      <div>
        <h1>What&apos;s in the tank</h1>
        <p className="mt-2 text-muted-foreground">
          Add each polyol that is already in the tank. The overall solid content is calculated for
          you.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="space-y-4">
        {lines.map((line, index) => (
          <li key={line.key} className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base">Polyol {index + 1}</h2>
              {lines.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-11 min-w-11"
                  aria-label={`Remove polyol ${index + 1}`}
                  onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </div>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_7rem_7rem]">
              <Field id={`${line.key}-name`} label="Name">
                <Input
                  id={`${line.key}-name`}
                  value={line.name}
                  onChange={(event) => updateLine(line.key, { name: event.target.value })}
                  placeholder="Conventional polyol"
                />
              </Field>
              <Field id={`${line.key}-pct`} label="Solid content %">
                <Input
                  id={`${line.key}-pct`}
                  inputMode="decimal"
                  value={line.pct}
                  onChange={(event) => updateLine(line.key, { pct: event.target.value })}
                  placeholder="0"
                />
              </Field>
              <Field id={`${line.key}-kg`} label="kg in the tank">
                <Input
                  id={`${line.key}-kg`}
                  inputMode="decimal"
                  value={line.kg}
                  onChange={(event) => updateLine(line.key, { kg: event.target.value })}
                  placeholder="700"
                />
              </Field>
            </div>
          </li>
        ))}
      </ul>

      <Button
        type="button"
        variant="outline"
        size="touch"
        className="w-full"
        onClick={() => {
          setLines((current) => [...current, blankLine(`line-${nextKey}`)]);
          setNextKey((value) => value + 1);
        }}
      >
        <Plus className="size-4" />
        Add another polyol
      </Button>

      <Field id="tank-capacity" label="Tank size (kg)" hint="You can fill up to this, or less.">
        <Input
          id="tank-capacity"
          inputMode="decimal"
          value={capacityText}
          onChange={(event) => setCapacityText(event.target.value)}
        />
      </Field>

      <TankSummary volume={summary.volume} solidPct={summary.solidPct} room={room} />
      {capacity != null && capacity > 0 && summary.volume > capacity ? (
        <p className="text-sm text-destructive" role="alert">
          That is {formatQty(summary.volume)} kg. The tank holds {formatQty(capacity)} kg.
        </p>
      ) : null}

      <Button type="button" size="touch" className="w-full" disabled={saving} onClick={() => void save()}>
        {saving ? "Saving…" : "Save what's in the tank"}
      </Button>

      <p className="text-sm text-muted-foreground">
        No holding tank?{" "}
        <Link href="/tank/blend/" className="font-medium text-primary underline-offset-4 hover:underline">
          Blend a fresh batch
        </Link>
        .
      </p>
    </div>
  );
}

async function createAndRemember(
  line: { name: string; solidContentPct: number },
  known: Chemical[],
) {
  return createChemical(
    {
      name: line.name,
      solidContentPct: line.solidContentPct,
      qtyAvailable: null,
      unit: "kg",
      ohValue: null,
      viscosity: null,
    },
    known,
  );
}
