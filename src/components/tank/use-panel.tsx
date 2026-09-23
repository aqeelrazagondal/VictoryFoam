"use client";

import { useState } from "react";

import { ConsumptionTable } from "@/components/tank/consumption-table";
import { Field } from "@/components/tank/empty-state";
import { TankSummary } from "@/components/tank/tank-summary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { consumeBreakdown, formatPct, formatQty, roomToCapacity } from "@/lib/calculations";
import { useTank } from "@/lib/tank/context";
import { parseNumber } from "@/lib/tank/parse";
import { insertLogEntry, TankError } from "@/lib/tank/repository";

export function UsePanel({ onDone, onCancel }: { onDone: (message: string) => void; onCancel: () => void }) {
  const { snapshot, settings, chemicals, refresh } = useTank();
  const [rateText, setRateText] = useState("");
  const [minutesText, setMinutesText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rate = parseNumber(rateText);
  const minutes = parseNumber(minutesText);
  const quantity = rate != null && minutes != null ? rate * minutes : null;
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
  const room = settings?.capacity != null ? roomToCapacity(settings.capacity, snapshot.volume) : null;

  async function confirm() {
    if (!breakdown?.ok || quantity == null) return;
    setSaving(true);
    setError(null);
    try {
      await insertLogEntry({
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
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 pb-10">
      <div>
        <h1>I used some</h1>
        <p className="mt-2 text-muted-foreground">
          Enter kg per minute and how many minutes. The tank is one mixture, so each polyol is used
          in the same proportion, and the solid content stays the same. This does not change Shelf
          stock. Those drums were already poured.
        </p>
      </div>

      <TankSummary volume={snapshot.volume} solidPct={snapshot.solidPct} room={room} />

      <div className="grid grid-cols-2 gap-3">
        <Field id="use-rate" label="kg per minute">
          <Input
            id="use-rate"
            inputMode="decimal"
            value={rateText}
            onChange={(event) => setRateText(event.target.value)}
            placeholder="57"
          />
        </Field>
        <Field id="use-minutes" label="Minutes">
          <Input
            id="use-minutes"
            inputMode="decimal"
            value={minutesText}
            onChange={(event) => setMinutesText(event.target.value)}
            placeholder="77"
          />
        </Field>
      </div>

      {quantity != null && quantity > 0 ? (
        <p className="text-sm">
          {formatQty(rate ?? 0)} kg/min × {formatQty(minutes ?? 0)} min = {formatQty(quantity)} kg
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {breakdown && !breakdown.ok ? (
        <p className="text-sm text-destructive" role="alert">
          {breakdown.reason}
        </p>
      ) : null}

      {breakdown?.ok ? (
        <>
          <ConsumptionTable breakdown={breakdown} names={names} />
          <Button size="touch" className="w-full" disabled={saving} onClick={() => void confirm()}>
            {saving ? "Saving…" : "Save this use"}
          </Button>
        </>
      ) : null}

      <Button type="button" variant="outline" size="touch" className="w-full" onClick={onCancel}>
        Back
      </Button>
    </div>
  );
}
