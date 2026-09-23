"use client";

import { formatPct, formatQty } from "@/lib/calculations";
import { Input } from "@/components/ui/input";

export function TankSummary({
  volume,
  solidPct,
  room,
  rows,
  editable = false,
  volumeText,
  onVolumeChange,
  onVolumeBlur,
  solidText,
  onSolidChange,
  onSolidBlur,
  rowTexts,
  onRowChange,
  onRowBlur,
  editError,
}: {
  volume: number;
  solidPct: number;
  room: number | null;
  rows?: { id: string; name: string; amount: number }[];
  editable?: boolean;
  volumeText?: string;
  onVolumeChange?: (value: string) => void;
  onVolumeBlur?: () => void;
  solidText?: string;
  onSolidChange?: (value: string) => void;
  onSolidBlur?: () => void;
  rowTexts?: Record<string, string>;
  onRowChange?: (id: string, value: string) => void;
  onRowBlur?: (id: string) => void;
  editError?: string | null;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5" aria-live="polite">
      <p className="text-sm uppercase tracking-wide text-muted-foreground">In the tank</p>
      {editable ? (
        <div className="mt-1 space-y-2">
          <label htmlFor="tank-total-kg" className="sr-only">
            Total kilograms in the tank
          </label>
          <div className="flex items-center gap-2">
            <Input
              id="tank-total-kg"
              inputMode="decimal"
              className="h-auto min-h-14 max-w-[14rem] border-border bg-background px-3 py-2 font-heading text-3xl font-bold tracking-tight tabular-nums"
              value={volumeText ?? ""}
              onChange={(event) => onVolumeChange?.(event.target.value)}
              onBlur={() => onVolumeBlur?.()}
              aria-describedby={editError ? "tank-edit-error" : undefined}
            />
            <span className="text-lg font-medium text-muted-foreground">kg</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Change this and every chemical scales together.
          </p>
        </div>
      ) : (
        <p className="hero-number">{formatQty(volume)} kg</p>
      )}
      <p className="mt-4 text-sm uppercase tracking-wide text-muted-foreground">Overall solid content</p>
      {editable ? (
        <div className="mt-1 space-y-2">
          <label htmlFor="tank-solid-pct" className="sr-only">
            Overall solid content
          </label>
          <div className="flex items-center gap-2">
            <Input
              id="tank-solid-pct"
              inputMode="decimal"
              className="h-auto min-h-14 max-w-[14rem] border-border bg-background px-3 py-2 font-heading text-3xl font-bold tracking-tight tabular-nums"
              value={solidText ?? ""}
              onChange={(event) => onSolidChange?.(event.target.value)}
              onBlur={() => onSolidBlur?.()}
              aria-describedby={editError ? "tank-edit-error" : undefined}
            />
            <span className="text-lg font-medium text-muted-foreground">%</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Change this and the kilograms move. The total stays the same.
          </p>
        </div>
      ) : (
        <p className="hero-number">{formatPct(solidPct)}</p>
      )}
      {room != null ? (
        <p className="mt-4 text-sm">You can add at most {formatQty(room)} kg.</p>
      ) : null}
      {editable && rows && rows.length > 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Change one chemical and the others move so the total stays the same.
        </p>
      ) : null}
      {rows && rows.length > 0 ? (
        <ul className="mt-4 space-y-3 border-t border-border pt-4 text-sm">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3">
              <label htmlFor={`tank-chem-${row.id}`} className="min-w-0 flex-1 leading-snug">
                {row.name}
              </label>
              {editable ? (
                <div className="flex shrink-0 items-center gap-2">
                  <Input
                    id={`tank-chem-${row.id}`}
                    inputMode="decimal"
                    className="h-12 w-[7.5rem] min-h-12 text-right font-medium tabular-nums"
                    value={rowTexts?.[row.id] ?? ""}
                    onChange={(event) => onRowChange?.(row.id, event.target.value)}
                    onBlur={() => onRowBlur?.(row.id)}
                    aria-describedby={editError ? "tank-edit-error" : undefined}
                  />
                  <span className="text-muted-foreground">kg</span>
                </div>
              ) : (
                <span className="font-medium">{formatQty(row.amount)} kg</span>
              )}
            </li>
          ))}
        </ul>
      ) : null}
      {editError ? (
        <p id="tank-edit-error" className="mt-4 text-sm text-destructive" role="alert">
          {editError}
        </p>
      ) : null}
    </section>
  );
}
