"use client";

import { useState } from "react";

import { ChemicalPicker } from "@/components/tank/chemical-picker";
import { Field } from "@/components/tank/empty-state";
import { ResultCard, type ResultLine } from "@/components/tank/result-card";
import { TankSummary } from "@/components/tank/tank-summary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  computeRequiredBlend,
  formatPct,
  formatQty,
  previewAddBatch,
  reverseAdd,
  roomToCapacity,
  solveFill,
  solveFillThree,
} from "@/lib/calculations";
import { useTank } from "@/lib/tank/context";
import type { Chemical, TankLogDraft } from "@/lib/tank/models";
import { parseNumber } from "@/lib/tank/parse";
import { insertLogEntries, saveTankSettings, TankError } from "@/lib/tank/repository";
import { cn } from "@/lib/utils";

type PolyolMode = "one" | "two" | "three";

type AddPlan =
  | { state: "incomplete" }
  | { state: "blocked"; reason: string }
  | {
      state: "ready";
      rows: TankLogDraft[];
      lines: ResultLine[];
      volume: number;
      solidPct: number;
      message: string;
    };

const MODES: { id: PolyolMode; label: string }[] = [
  { id: "one", label: "One polyol" },
  { id: "two", label: "Two polyols" },
  { id: "three", label: "All three" },
];

export function AddPanel({ onDone, onCancel }: { onDone: (message: string) => void; onCancel: () => void }) {
  const { snapshot, settings, activeChemicals, refresh } = useTank();
  const [mode, setMode] = useState<PolyolMode>("two");
  const [capacityText, setCapacityText] = useState(
    settings?.capacity != null ? String(settings.capacity) : "8000",
  );
  const [targetVolume, setTargetVolume] = useState("");
  const [targetPctText, setTargetPctText] = useState("");
  const [useAbout, setUseAbout] = useState("");
  const [chemA, setChemA] = useState<Chemical | null>(null);
  const [chemB, setChemB] = useState<Chemical | null>(null);
  const [chemC, setChemC] = useState<Chemical | null>(null);
  const [lockedText, setLockedText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capacity = settings?.capacity ?? parseNumber(capacityText);
  const room = capacity != null ? roomToCapacity(capacity, snapshot.volume) : null;
  const useQty = parseNumber(useAbout);
  const plan = planAddition({
    mode,
    volume: snapshot.volume,
    solidPct: snapshot.solidPct,
    capacity,
    targetVolume: parseNumber(targetVolume),
    targetPct: parseNumber(targetPctText),
    chemA,
    chemB,
    chemC,
    lockedKg: parseNumber(lockedText),
  });

  const useHint = useAboutHint(useQty, capacity, snapshot.volume);
  const shortOfUse =
    plan.state === "ready" && useQty != null && useQty > plan.volume
      ? ` This fills the tank to ${formatQty(plan.volume)} kg. You said you will use about ${formatQty(useQty)} kg.`
      : "";

  function onUseAboutChange(value: string) {
    setUseAbout(value);
    if (mode === "one" || capacity == null) return;
    const parsed = parseNumber(value);
    if (parsed == null || !(parsed > snapshot.volume)) return;
    setTargetVolume(String(Math.min(capacity, parsed)));
  }

  async function confirm() {
    if (plan.state !== "ready") return;
    setSaving(true);
    setError(null);
    try {
      if (settings?.capacity == null && capacity != null) {
        await saveTankSettings({ capacity, heel: settings?.heel ?? 0 });
      }
      await insertLogEntries(plan.rows);
      await refresh();
      onDone(`The tank is now ${formatQty(plan.volume)} kg at ${formatPct(plan.solidPct)}.`);
    } catch (caught) {
      setError(caught instanceof TankError ? caught.message : "Could not save this fill.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 pb-10">
      <div>
        <h1>Add to the tank</h1>
        <p className="mt-2 text-muted-foreground">
          Type how full the tank should be this time (at or below the tank size), the solid content
          you need, and which polyols to use. Every fill asks for the kg again.
        </p>
      </div>

      <TankSummary volume={snapshot.volume} solidPct={snapshot.solidPct} room={room} />

      {settings?.capacity == null ? (
        <Field id="add-capacity" label="Tank size (kg)" hint="You can fill up to this, or less.">
          <Input
            id="add-capacity"
            inputMode="decimal"
            value={capacityText}
            onChange={(event) => setCapacityText(event.target.value)}
          />
        </Field>
      ) : null}

      <div className="grid gap-2" role="group" aria-label="Which polyols will you add?">
        {MODES.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={mode === option.id}
            className={cn(
              "min-h-12 rounded-xl border px-4 text-left font-medium",
              mode === option.id ? "border-primary bg-primary/10" : "border-border bg-card",
            )}
            onClick={() => setMode(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {mode !== "one" ? (
        <Field
          id="target-kg"
          label="How full should the tank be (kg)"
          hint={
            room != null
              ? `You can add at most ${formatQty(room)} kg. Type less if this job does not need a full tank.`
              : "Enter the tank size above first."
          }
        >
          <Input
            id="target-kg"
            inputMode="decimal"
            value={targetVolume}
            onChange={(event) => setTargetVolume(event.target.value)}
            placeholder="8000"
          />
        </Field>
      ) : (
        <p className="text-sm text-muted-foreground">
          One polyol sets how many kg to add. The tank size still limits that amount.
        </p>
      )}

      <Field id="use-about" label="I will use about (kg, optional)" hint={useHint}>
        <Input
          id="use-about"
          inputMode="decimal"
          value={useAbout}
          onChange={(event) => onUseAboutChange(event.target.value)}
          placeholder="4389"
        />
      </Field>

      <Field id="target-pct" label="Solid content you need (%)">
        <Input
          id="target-pct"
          inputMode="decimal"
          value={targetPctText}
          onChange={(event) => setTargetPctText(event.target.value)}
          placeholder="28.7"
        />
      </Field>

      {activeChemicals.length === 0 ? (
        <p className="text-sm text-muted-foreground">Add polyols under More, then Chemicals.</p>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">{mode === "one" ? "Polyol" : "First polyol"}</p>
            <ChemicalPicker
              chemicals={activeChemicals}
              selectedId={chemA?.id}
              excludedIds={[chemB?.id, chemC?.id].filter((id): id is string => Boolean(id))}
              onSelect={setChemA}
            />
          </div>
          {mode !== "one" ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Second polyol</p>
              <ChemicalPicker
                chemicals={activeChemicals}
                selectedId={chemB?.id}
                excludedIds={[chemA?.id, chemC?.id].filter((id): id is string => Boolean(id))}
                onSelect={setChemB}
              />
            </div>
          ) : null}
          {mode === "three" ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">Third polyol</p>
              <ChemicalPicker
                chemicals={activeChemicals}
                selectedId={chemC?.id}
                excludedIds={[chemA?.id, chemB?.id].filter((id): id is string => Boolean(id))}
                onSelect={setChemC}
              />
              <Field
                id="locked-kg"
                label={
                  chemC
                    ? `How many kg of ${chemC.name} will you pour?`
                    : "How many kg of this one will you pour?"
                }
                hint="The other two are calculated so the tank still hits the solid content."
              >
                <Input
                  id="locked-kg"
                  inputMode="decimal"
                  value={lockedText}
                  onChange={(event) => setLockedText(event.target.value)}
                />
              </Field>
            </div>
          ) : null}
        </div>
      )}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {plan.state === "blocked" ? (
        <ResultCard status="infeasible" message={plan.reason} lines={[]} />
      ) : null}
      {plan.state === "ready" ? (
        <ResultCard
          status="feasible"
          message={`${plan.message}${shortOfUse}`}
          lines={plan.lines}
          footer={
            <Button size="touch" className="w-full" disabled={saving} onClick={() => void confirm()}>
              {saving ? "Saving…" : "Add this to the tank"}
            </Button>
          }
        />
      ) : null}

      <Button type="button" variant="outline" size="touch" className="w-full" onClick={onCancel}>
        Back
      </Button>
    </div>
  );
}

function useAboutHint(useQty: number | null, capacity: number | null, volume: number) {
  if (useQty == null || !(useQty > 0)) return "Optional. Fills the tank at least this full, up to the tank size.";
  if (capacity == null) return "Enter the tank size to compare this with the room you have.";
  if (useQty > capacity) {
    return `The tank holds ${formatQty(capacity)} kg, so one fill cannot cover ${formatQty(useQty)} kg of use.`;
  }
  if (useQty > volume) {
    return `The tank must be at least ${formatQty(useQty)} kg before this job, and not over ${formatQty(capacity)} kg.`;
  }
  return `The tank already holds enough for ${formatQty(useQty)} kg of use. You can still top it up.`;
}

function batchRow(chemical: Chemical, quantity: number): TankLogDraft | null {
  if (!(quantity > 1e-6)) return null;
  return {
    type: "add_batch",
    chemicalId: chemical.id,
    quantity,
    solidContentPct: chemical.solidContentPct,
    note: null,
  };
}

function planAddition(input: {
  mode: PolyolMode;
  volume: number;
  solidPct: number;
  capacity: number | null;
  targetVolume: number | null;
  targetPct: number | null;
  chemA: Chemical | null;
  chemB: Chemical | null;
  chemC: Chemical | null;
  lockedKg: number | null;
}): AddPlan {
  if (input.capacity == null || !(input.capacity > 0)) return { state: "incomplete" };
  if (input.targetPct == null) return { state: "incomplete" };
  if (!input.chemA) return { state: "incomplete" };

  if (input.mode === "one") {
    const reverse = reverseAdd({
      currentQty: input.volume,
      currentPct: input.solidPct,
      chemicalPct: input.chemA.solidContentPct,
      targetPct: input.targetPct,
    });
    if (!reverse.ok || reverse.quantity == null) {
      return { state: "blocked", reason: reverse.reason ?? "That polyol cannot hit this solid content." };
    }
    if (reverse.quantity <= 1e-6) {
      return {
        state: "blocked",
        reason: reverse.reason ?? "The tank is already at this solid content.",
      };
    }
    const nextVolume = input.volume + reverse.quantity;
    if (nextVolume > input.capacity + 1e-6) {
      const room = roomToCapacity(input.capacity, input.volume);
      if (room <= 1e-6) {
        return {
          state: "blocked",
          reason: `The tank is already full at ${formatQty(input.capacity)} kg.`,
        };
      }
      const reached = previewAddBatch({
        currentQty: input.volume,
        currentPct: input.solidPct,
        addQty: room,
        addPct: input.chemA.solidContentPct,
      });
      return {
        state: "blocked",
        reason: `${input.chemA.name} needs ${formatQty(reverse.quantity)} kg to reach ${formatPct(input.targetPct)}. You can add at most ${formatQty(room)} kg. Filling that room reaches ${formatPct(reached.solidPct)}.`,
      };
    }
    const row = batchRow(input.chemA, reverse.quantity);
    if (!row) return { state: "incomplete" };
    return {
      state: "ready",
      rows: [row],
      volume: nextVolume,
      solidPct: input.targetPct,
      message: `Add ${formatQty(reverse.quantity)} kg of ${input.chemA.name}.`,
      lines: [
        { eyebrow: `Add ${input.chemA.name}`, value: `${formatQty(reverse.quantity)} kg` },
        {
          eyebrow: "Tank afterwards",
          value: `${formatQty(nextVolume)} kg at ${formatPct(input.targetPct)}`,
        },
      ],
    };
  }

  if (input.targetVolume == null) return { state: "incomplete" };
  if (!input.chemB) return { state: "incomplete" };
  if (input.chemA.id === input.chemB.id) {
    return { state: "blocked", reason: "Pick two different polyols." };
  }

  const required = computeRequiredBlend({
    existingQty: input.volume,
    existingPct: input.solidPct,
    targetVolume: input.targetVolume,
    targetPct: input.targetPct,
    capacity: input.capacity,
  });
  if (!required.ok) return { state: "blocked", reason: required.reason };

  if (input.mode === "three") {
    if (!input.chemC) return { state: "incomplete" };
    if (input.lockedKg == null) return { state: "incomplete" };
    if (input.chemC.id === input.chemA.id || input.chemC.id === input.chemB.id) {
      return { state: "blocked", reason: "Pick three different polyols." };
    }
    if (!(input.lockedKg > 0)) {
      return { state: "blocked", reason: "Enter how many kg of the third polyol you will pour." };
    }
    const solved = solveFillThree({
      fillAmount: required.fillAmount,
      requiredActive: required.requiredActive,
      qA: input.chemA.solidContentPct,
      qB: input.chemB.solidContentPct,
      qC: input.chemC.solidContentPct,
      xC: input.lockedKg,
    });
    if (!solved.ok || !solved.amounts) return { state: "blocked", reason: solved.reason };
    return readyPlan(
      [
        [input.chemA, solved.amounts.xA],
        [input.chemB, solved.amounts.xB],
        [input.chemC, solved.amounts.xC],
      ],
      input.targetVolume,
      input.targetPct,
      required.fillAmount,
    );
  }

  const solved = solveFill({
    fillAmount: required.fillAmount,
    requiredActive: required.requiredActive,
    qA: input.chemA.solidContentPct,
    qB: input.chemB.solidContentPct,
  });
  if (!solved.ok || !solved.amounts) return { state: "blocked", reason: solved.reason };
  return readyPlan(
    [
      [input.chemA, solved.amounts.xA],
      [input.chemB, solved.amounts.xB],
    ],
    input.targetVolume,
    input.targetPct,
    required.fillAmount,
  );
}

function readyPlan(
  pairs: [Chemical, number][],
  volume: number,
  solidPct: number,
  fillAmount: number,
): AddPlan {
  const rows = pairs.flatMap(([chemical, quantity]) => {
    const row = batchRow(chemical, quantity);
    return row ? [row] : [];
  });
  if (rows.length === 0) {
    return { state: "blocked", reason: "This mix does not add any polyol." };
  }
  return {
    state: "ready",
    rows,
    volume,
    solidPct,
    message: `This fill adds ${formatQty(fillAmount)} kg.`,
    lines: [
      ...pairs.flatMap(([chemical, quantity]) =>
        quantity > 1e-6
          ? [{ eyebrow: `Add ${chemical.name}`, value: `${formatQty(quantity)} kg` }]
          : [],
      ),
      { eyebrow: "Tank afterwards", value: `${formatQty(volume)} kg at ${formatPct(solidPct)}` },
    ],
  };
}
