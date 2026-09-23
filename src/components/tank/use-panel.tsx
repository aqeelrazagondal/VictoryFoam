"use client";

import { useState } from "react";

import { ConsumptionTable } from "@/components/tank/consumption-table";
import { Field } from "@/components/tank/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  consumeBreakdown,
  drawableNow,
  formatPct,
  formatQty,
  isHeelBreach,
} from "@/lib/calculations";
import { useTank } from "@/lib/tank/context";
import { parseNumber } from "@/lib/tank/parse";
import { insertLogEntry, TankError } from "@/lib/tank/repository";
import { cn } from "@/lib/utils";

type UseMode = "total" | "rate";

export function UsePanel({ onDone, onCancel }: { onDone: (message: string) => void; onCancel: () => void }) {
  const { snapshot, settings, chemicals, activeTank, refresh } = useTank();
  const [mode, setMode] = useState<UseMode>("rate");
  const [totalText, setTotalText] = useState("");
  const [rateText, setRateText] = useState("");
  const [minutesText, setMinutesText] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const heel = settings?.heel ?? 0;
  const available = drawableNow(snapshot.volume, heel);
  const rate = parseNumber(rateText);
  const minutes = parseNumber(minutesText);
  const direct = parseNumber(totalText);
  const quantity = mode === "total" ? direct : rate != null && minutes != null ? rate * minutes : null;
  const breakdown =
    quantity != null && quantity > 0
      ? consumeBreakdown({
          volume: snapshot.volume,
          solidPct: snapshot.solidPct,
          remainingByChemical: snapshot.remainingByChemical,
          unattributed: snapshot.unattributed,
          consumeQty: quantity,
        })
      : null;
  const names = Object.fromEntries(chemicals.map((chemical) => [chemical.id, { name: chemical.name }]));
  const overAvailable = quantity != null && quantity > available + 1e-9;
  const limitMessage =
    overAvailable
      ? `Enter no more than ${formatQty(available)} kg available to use.`
      : null;

  function switchMode(next: UseMode) {
    setMode(next);
    setReviewing(false);
    setError(null);
  }

  async function confirm() {
    if (!breakdown?.ok || quantity == null || saving || overAvailable) return;
    setSaving(true);
    setError(null);
    try {
      if (!activeTank) throw new TankError("Choose a tank first.");
      await insertLogEntry(activeTank.id, {
        type: "consume_usage",
        chemicalId: null,
        quantity,
        solidContentPct: null,
        note: null,
      });
      await refresh();
      onDone(
        `Remaining tank is ${formatQty(breakdown.leftoverVolume)} kg, still ${formatPct(breakdown.leftoverPct)}.`,
      );
    } catch (caught) {
      setError(caught instanceof TankError ? caught.message : "Could not save this use.");
      setSaving(false);
    }
  }

  const ready = breakdown?.ok === true && !overAvailable;

  return (
    <div className="space-y-5 pb-10">
      <div>
        <h1>Record usage</h1>
        <p className="mt-2 text-muted-foreground">
          The tank is one mixture, so each chemical is used in the same proportion and the solid
          content stays the same. This does not change shelf stock.
        </p>
      </div>

      <p className="text-sm">
        Available to use: <span className="font-medium tabular-nums">{formatQty(available)} kg</span>
      </p>

      <div className="grid grid-cols-2 gap-2" role="group" aria-label="How to enter usage">
        {(
          [
            ["total", "Total kg"],
            ["rate", "Rate × time"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={mode === id}
            className={cn(
              "min-h-12 rounded-xl border px-3 text-sm font-medium",
              mode === id ? "border-primary bg-primary/10" : "border-border bg-card",
            )}
            onClick={() => switchMode(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "total" ? (
        <Field id="use-total" label="Quantity used (kg)">
          <Input
            id="use-total"
            inputMode="decimal"
            value={totalText}
            onChange={(event) => {
              setTotalText(event.target.value);
              setReviewing(false);
              setError(null);
            }}
          />
        </Field>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Field id="use-rate" label="kg per minute">
            <Input
              id="use-rate"
              inputMode="decimal"
              value={rateText}
              onChange={(event) => {
                setRateText(event.target.value);
                setReviewing(false);
                setError(null);
              }}
              placeholder="57"
            />
          </Field>
          <Field id="use-minutes" label="Minutes">
            <Input
              id="use-minutes"
              inputMode="decimal"
              value={minutesText}
              onChange={(event) => {
                setMinutesText(event.target.value);
                setReviewing(false);
                setError(null);
              }}
              placeholder="77"
            />
          </Field>
        </div>
      )}

      {mode === "rate" && quantity != null && quantity > 0 ? (
        <p className="text-sm">
          {formatQty(rate ?? 0)} kg/min × {formatQty(minutes ?? 0)} min = {formatQty(quantity)} kg
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {limitMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {limitMessage}
        </p>
      ) : null}
      {breakdown && !breakdown.ok ? (
        <p className="text-sm text-destructive" role="alert">
          {breakdown.reason}
        </p>
      ) : null}
      {breakdown?.ok && isHeelBreach(breakdown.leftoverVolume, heel) ? (
        <p className="text-sm">This use goes below the heel. You can still confirm it.</p>
      ) : null}

      {breakdown?.ok && !overAvailable ? <ConsumptionTable breakdown={breakdown} names={names} /> : null}

      {ready && reviewing ? (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <h2 className="font-heading text-base font-semibold">Review usage</h2>
          <p className="text-sm">
            Use {formatQty(quantity ?? 0)} kg. Remaining {formatQty(breakdown.leftoverVolume)} kg at{" "}
            {formatPct(breakdown.leftoverPct)}.
          </p>
          <Button size="touch" className="w-full" disabled={saving} onClick={() => void confirm()}>
            {saving ? "Saving…" : "Confirm usage"}
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          size="touch"
          className="w-full"
          disabled={!ready}
          onClick={() => setReviewing(true)}
        >
          Review usage
        </Button>
      )}

      <Button type="button" variant="outline" size="touch" className="w-full" onClick={onCancel} disabled={saving}>
        Back
      </Button>
    </div>
  );
}
