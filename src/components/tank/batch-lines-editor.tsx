"use client";

import { Plus, Trash2 } from "lucide-react";

import { ChemicalPicker } from "@/components/tank/chemical-picker";
import { Field } from "@/components/tank/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPct, formatQty, roomToCapacity } from "@/lib/calculations";
import type { Chemical } from "@/lib/tank/models";
import { parseNumber } from "@/lib/tank/parse";

export type BatchLine = {
  key: string;
  chemical: Chemical | null;
  kg: string;
  /** Used only when the line is unattributed. */
  pct: string;
};

export function createBatchLine(key: string): BatchLine {
  return { key, chemical: null, kg: "", pct: "" };
}

export function BatchLinesEditor({
  lines,
  chemicals,
  tankVolume,
  capacity,
  onChange,
}: {
  lines: BatchLine[];
  chemicals: Chemical[];
  tankVolume: number;
  capacity: number | null;
  onChange: (lines: BatchLine[]) => void;
}) {
  const room = capacity != null ? roomToCapacity(capacity, tankVolume) : null;
  const parsed = lines
    .map((line) => ({
      line,
      qty: parseNumber(line.kg),
      pct: line.chemical?.solidContentPct ?? parseNumber(line.pct),
    }))
    .filter(
      (row): row is { line: BatchLine; qty: number; pct: number } =>
        row.qty != null && row.qty > 0 && row.pct != null,
    );
  const totalAdd = parsed.reduce((sum, row) => sum + row.qty, 0);
  const over =
    capacity != null && totalAdd > 0 && tankVolume + totalAdd > capacity + 1e-9;

  function update(key: string, patch: Partial<BatchLine>) {
    onChange(lines.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  return (
    <div className="space-y-4">
      {room != null ? (
        <p className="text-sm text-muted-foreground">
          You can add at most {formatQty(room)} kg. Type the kg for each chemical — the tank does
          not have to be filled to the top.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Type the kg for each chemical. Set a tank size on Home if you want a maximum.
        </p>
      )}

      <ul className="space-y-4">
        {lines.map((line, index) => {
          const excluded = lines
            .filter((item) => item.key !== line.key && item.chemical)
            .map((item) => item.chemical!.id);
          return (
            <li key={line.key} className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-base font-medium">Chemical {index + 1}</h3>
                {lines.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-11 min-w-11"
                    aria-label={`Remove chemical ${index + 1}`}
                    onClick={() => onChange(lines.filter((item) => item.key !== line.key))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </div>
              <div className="space-y-3">
                <ChemicalPicker
                  chemicals={chemicals}
                  selectedId={line.chemical?.id}
                  excludedIds={excluded}
                  onSelect={(chemical) =>
                    update(line.key, {
                      chemical,
                      pct: String(chemical.solidContentPct),
                    })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="touch"
                  onClick={() => update(line.key, { chemical: null, pct: "" })}
                >
                  Leave unattributed
                </Button>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field id={`${line.key}-kg`} label="kg">
                    <Input
                      id={`${line.key}-kg`}
                      inputMode="decimal"
                      value={line.kg}
                      onChange={(event) => update(line.key, { kg: event.target.value })}
                      placeholder="4200"
                    />
                  </Field>
                  <Field
                    id={`${line.key}-pct`}
                    label="Solid content %"
                    hint={line.chemical ? "Taken from the chemical." : "Required if unattributed."}
                  >
                    <Input
                      id={`${line.key}-pct`}
                      inputMode="decimal"
                      value={
                        line.chemical ? String(line.chemical.solidContentPct) : line.pct
                      }
                      disabled={Boolean(line.chemical)}
                      onChange={(event) => update(line.key, { pct: event.target.value })}
                      placeholder="25"
                    />
                  </Field>
                </div>
                {line.chemical ? (
                  <p className="text-sm text-muted-foreground">
                    {line.chemical.name} · {formatPct(line.chemical.solidContentPct)}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <Button
        type="button"
        variant="outline"
        size="touch"
        className="w-full"
        onClick={() =>
          onChange([...lines, createBatchLine(`line-${Date.now()}-${lines.length + 1}`)])
        }
      >
        <Plus className="size-4" />
        Add another chemical
      </Button>

      {totalAdd > 0 ? (
        <p className="text-sm">
          This entry adds {formatQty(totalAdd)} kg
          {capacity != null
            ? `. Tank afterwards: ${formatQty(tankVolume + totalAdd)} kg of ${formatQty(capacity)} kg.`
            : "."}
        </p>
      ) : null}
      {over && capacity != null ? (
        <p className="text-sm text-destructive" role="alert">
          That is more than the room left. You can add at most {formatQty(room ?? 0)} kg.
        </p>
      ) : null}
    </div>
  );
}

export function parseBatchLines(lines: BatchLine[]) {
  const rows: {
    chemicalId: string | null;
    quantity: number;
    solidContentPct: number;
  }[] = [];
  for (const line of lines) {
    const blank =
      line.kg.trim() === "" && !line.chemical && line.pct.trim() === "";
    if (blank) continue;
    const quantity = parseNumber(line.kg);
    const solidContentPct = line.chemical?.solidContentPct ?? parseNumber(line.pct);
    if (quantity == null || !(quantity > 0)) {
      return { ok: false as const, reason: "Each chemical needs a kg amount.", rows: [] };
    }
    if (solidContentPct == null) {
      return {
        ok: false as const,
        reason: "Each chemical needs a solid content %, or pick a named chemical.",
        rows: [],
      };
    }
    rows.push({
      chemicalId: line.chemical?.id ?? null,
      quantity,
      solidContentPct,
    });
  }
  if (rows.length === 0) {
    return { ok: false as const, reason: "Add at least one chemical with a kg amount.", rows: [] };
  }
  return { ok: true as const, reason: null, rows };
}
