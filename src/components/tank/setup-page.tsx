"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ChemicalPicker } from "@/components/tank/chemical-picker";
import { EmptyState, Field } from "@/components/tank/empty-state";
import { StepWizard } from "@/components/tank/step-wizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTank } from "@/lib/tank/context";
import type { Chemical } from "@/lib/tank/models";
import { parseNumber } from "@/lib/tank/parse";
import { insertLogEntry, saveTankSettings, TankError } from "@/lib/tank/repository";

export function SetupPage() {
  const router = useRouter();
  const { tankReady, activeChemicals, refresh } = useTank();
  const [step, setStep] = useState(0);
  const [quantity, setQuantity] = useState("");
  const [pct, setPct] = useState("");
  const [chemical, setChemical] = useState<Chemical | null>(null);
  const [skipChemical, setSkipChemical] = useState(false);
  const [capacity, setCapacity] = useState("");
  const [heel, setHeel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const qty = parseNumber(quantity);
  const solidPct = parseNumber(pct);

  if (tankReady) {
    return (
      <div className="space-y-4">
        <h1>Set up your tank</h1>
        <EmptyState
          title="Tank already set up"
          description="The tank already has a starting amount. Use Home to pour or record what you used."
          actionLabel="Open tank log"
          actionHref="/tank/log/"
        />
      </div>
    );
  }

  async function complete() {
    if (qty === null || !(qty > 0) || solidPct === null) {
      setError("Opening quantity and Solid Content % are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveTankSettings({
        capacity: parseNumber(capacity),
        heel: parseNumber(heel) ?? 0,
      });
      await insertLogEntry({
        type: "opening_balance",
        quantity: qty,
        solidContentPct: solidPct,
        chemicalId: skipChemical ? null : chemical?.id ?? null,
        note: null,
      });
      router.push("/tank/");
      await refresh();
    } catch (caught) {
      setError(caught instanceof TankError ? caught.message : "Could not set up the tank.");
    } finally {
      setSaving(false);
    }
  }

  const steps = [
    { id: "qty", label: "Opening quantity" },
    { id: "pct", label: "Opening %" },
    { id: "chem", label: chemical?.name ?? (skipChemical ? "Unattributed" : "Chemical") },
    { id: "opts", label: "Capacity / heel" },
  ];

  return (
    <div className="space-y-5 pb-10">
      <h1>Set up your tank</h1>
      <p className="text-muted-foreground">
        Do this once, before anything is in the tank. After you save, day-to-day work is on Home.
      </p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <StepWizard steps={steps} currentIndex={step} onJump={setStep}>
        {step === 0 ? (
          <Field id="open-qty" label="Opening quantity (kg)">
            <Input
              id="open-qty"
              inputMode="decimal"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
            <Button
              className="mt-4 w-full"
              size="touch"
              disabled={qty === null || !(qty > 0)}
              onClick={() => setStep(1)}
            >
              Next
            </Button>
          </Field>
        ) : null}
        {step === 1 ? (
          <Field id="open-pct" label="Opening Solid Content %">
            <Input
              id="open-pct"
              inputMode="decimal"
              value={pct}
              onChange={(event) => setPct(event.target.value)}
            />
            <Button
              className="mt-4 w-full"
              size="touch"
              disabled={solidPct === null}
              onClick={() => setStep(2)}
            >
              Next
            </Button>
          </Field>
        ) : null}
        {step === 2 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Optional. If it is already mixed and you are not sure, leave it unattributed.
            </p>
            <ChemicalPicker
              chemicals={activeChemicals}
              selectedId={chemical?.id}
              onSelect={(picked) => {
                setChemical(picked);
                setSkipChemical(false);
                setStep(3);
              }}
            />
            <Button
              variant="secondary"
              size="touch"
              className="w-full"
              onClick={() => {
                setSkipChemical(true);
                setChemical(null);
                setStep(3);
              }}
            >
              Leave unattributed
            </Button>
          </div>
        ) : null}
        {step === 3 ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field id="capacity" label="Tank capacity (optional)">
                <Input
                  id="capacity"
                  inputMode="decimal"
                  value={capacity}
                  onChange={(event) => setCapacity(event.target.value)}
                />
              </Field>
              <Field
                id="heel"
                label="Minimum left in the tank (optional)"
                hint="A warning only, sometimes called the heel. The tank can still go below this."
              >
                <Input
                  id="heel"
                  inputMode="decimal"
                  value={heel}
                  onChange={(event) => setHeel(event.target.value)}
                />
              </Field>
            </div>
            <Button size="touch" className="w-full" disabled={saving} onClick={() => void complete()}>
              {saving ? "Saving…" : "Start tracking"}
            </Button>
          </div>
        ) : null}
      </StepWizard>
    </div>
  );
}
