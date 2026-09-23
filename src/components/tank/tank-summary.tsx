"use client";

import { formatPct, formatQty } from "@/lib/calculations";
import { Input } from "@/components/ui/input";

export function TankSummary({
  volume,
  solidPct,
  room,
  capacity = null,
  rows,
  editable = false,
  volumeText,
  onVolumeChange,
  onVolumeBlur,
  rowTexts,
  onRowChange,
  onRowBlur,
  editError,
}: {
  volume: number;
  solidPct: number;
  room: number | null;
  capacity?: number | null;
  rows?: { id: string; name: string; amount: number }[];
  editable?: boolean;
  volumeText?: string;
  onVolumeChange?: (value: string) => void;
  onVolumeBlur?: () => void;
  rowTexts?: Record<string, string>;
  onRowChange?: (id: string, value: string) => void;
  onRowBlur?: (id: string) => void;
  editError?: string | null;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5" aria-live="polite">
      <p className="text-sm font-medium text-muted-foreground">Total mass</p>
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
        <p className="tank-metric">{formatQty(volume)} kg</p>
      )}
      {capacity != null && capacity > 0 ? (
        <div className="mt-3">
          <p className="text-sm">
            {formatQty(volume)} of {formatQty(capacity)} kg
          </p>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
            role="meter"
            aria-label="Tank mass"
            aria-valuemin={0}
            aria-valuemax={capacity}
            aria-valuenow={Math.min(volume, capacity)}
            aria-valuetext={`${formatQty(volume)} of ${formatQty(capacity)} kg`}
          >
            <div
              className="h-full bg-primary"
              style={{ width: `${Math.min(100, (volume / capacity) * 100)}%` }}
            />
          </div>
        </div>
      ) : null}
      <p className="mt-4 text-sm font-medium text-muted-foreground">Solid content</p>
      <p id="tank-solid-pct" className={editable ? "mt-1 font-heading text-3xl font-bold tracking-tight tabular-nums" : "hero-number"}>
        {formatPct(solidPct)}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">Calculated from the chemicals.</p>
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
