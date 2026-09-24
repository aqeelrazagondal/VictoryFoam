"use client";

import { useState } from "react";

import { ChemicalPicker } from "@/components/tank/chemical-picker";
import { EditableReport, type EditedPour, type ReportSuggestion } from "@/components/tank/editable-report";
import { EmptyState, Field } from "@/components/tank/empty-state";
import { ResultCard } from "@/components/tank/result-card";
import { TankSummary } from "@/components/tank/tank-summary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  computeRequiredBlend,
  formatPct,
  formatQty,
  capacityOverflowMessage,
  previewAddBatch,
  previewTankAfterAdds,
  reverseAdd,
  roomToCapacity,
  solveFill,
  solveFillThree,
} from "@/lib/calculations";
import { useTank } from "@/lib/tank/context";
import type { Chemical } from "@/lib/tank/models";
import { parseNumber } from "@/lib/tank/parse";
import { insertLogEntries, saveTankSettings, TankError } from "@/lib/tank/repository";
import { cn } from "@/lib/utils";

type PolyolMode = "one" | "two" | "three";

type AddPlan =
  | { state: "incomplete" }
  | { state: "blocked"; reason: string }
  | {
      state: "ready";
      suggestions: ReportSuggestion[];
      volume: number;
      message: string;
    };

const MODES: { id: PolyolMode; label: string }[] = [
  { id: "one", label: "One polyol" },
  { id: "two", label: "Two polyols" },
  { id: "three", label: "All three" },
];

export function AddPanel({ onDone, onCancel }: { onDone: (message: string) => void; onCancel: () => void }) {
  const { snapshot, settings, activeChemicals, activeTank, refresh } = useTank();
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
  const [step, setStep] = useState(0);

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

  async function confirm(lines: EditedPour[]) {
    const preview = previewTankAfterAdds({
      currentQty: snapshot.volume,
      currentPct: snapshot.solidPct,
      adds: lines.map((line) => ({
        quantity: line.quantity,
        solidContentPct: line.solidContentPct,
      })),
    });
    const overflow = capacityOverflowMessage({
      volume: snapshot.volume,
      addQty: preview.addedKg,
      capacity,
    });
    if (overflow) {
      setError(overflow);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (!activeTank) throw new TankError("Choose a tank first.");
      if (settings?.capacity == null && capacity != null) {
        await saveTankSettings(activeTank.id, { capacity, heel: settings?.heel ?? 0 });
      }
      await insertLogEntries(
        activeTank.id,
        lines
          .filter((line) => line.quantity > 1e-6)
          .map((line) => ({
            type: "add_batch" as const,
            chemicalId: line.id,
            quantity: line.quantity,
            solidContentPct: line.solidContentPct,
            note: null,
          })),
      );
      await refresh();
      onDone(`The tank is now ${formatQty(preview.volume)} kg at ${formatPct(preview.solidPct)}.`);
    } catch (caught) {
      setError(caught instanceof TankError ? caught.message : "Could not save this fill.");
    } finally {
      setSaving(false);
    }
  }

  if (activeChemicals.length === 0) {
    return (
      <div className="space-y-5 pb-10">
        <div>
          <h1>Add to the tank</h1>
          <p className="mt-2 text-muted-foreground">
            Add a polyol first. Then you can choose how full the tank should be and the solid
            content you need.
          </p>
        </div>
        <TankSummary volume={snapshot.volume} solidPct={snapshot.solidPct} room={room} />
        <EmptyState
          title="Add a polyol first"
          description="The calculator needs a polyol, with a name and a solid content, before it can tell you what to pour."
          actionLabel="Add a polyol"
          actionHref="/tank/chemicals/"
        />
        <Button type="button" variant="outline" size="touch" className="w-full" onClick={onCancel}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10">
      <div>
        <h1>Add to the tank</h1>
        <p className="mt-2 text-muted-foreground">
          Enter the total quantity you want in the tank after adding chemicals. Confirming the pour
          takes those kilograms off the shelf.
        </p>
      </div>

      <ol className="flex gap-2 text-sm" aria-label="Addition steps">
        {["Target", "Chemicals", "Review"].map((label, index) => (
          <li key={label}>
            <button
              type="button"
              className={cn(
                "min-h-11 rounded-full px-3 font-medium",
                index === step ? "bg-primary text-primary-foreground" : "bg-muted",
              )}
              aria-current={index === step ? "step" : undefined}
              disabled={index > step}
              onClick={() => setStep(index)}
            >
              {label}
            </button>
          </li>
        ))}
      </ol>

      <TankSummary volume={snapshot.volume} solidPct={snapshot.solidPct} room={room} capacity={capacity} />

      {step === 0 && settings?.capacity == null ? (
        <Field id="add-capacity" label="Tank size (kg)" hint="You can fill up to this, or less.">
          <Input
            id="add-capacity"
            inputMode="decimal"
            value={capacityText}
            onChange={(event) => setCapacityText(event.target.value)}
          />
        </Field>
      ) : null}

      {step === 0 ? (
      <div className="grid gap-2 md:grid-cols-3" role="group" aria-label="Which polyols will you add?">
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
      ) : null}

      {step === 0 && mode !== "one" ? (
        <Field
          id="target-kg"
          label="Final tank quantity (kg)"
          hint={
            room != null
              ? `You can add at most ${formatQty(room)} kg. Current quantity is ${formatQty(snapshot.volume)} kg.`
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
          {parseNumber(targetVolume) != null ? (
            <p className="mt-2 text-sm">
              Amount to add: {formatQty((parseNumber(targetVolume) ?? 0) - snapshot.volume)} kg
            </p>
          ) : null}
        </Field>
      ) : step === 0 ? (
        <p className="text-sm text-muted-foreground">
          One chemical sets how many kg to add. The tank size still limits that amount.
        </p>
      ) : null}

      {step === 0 ? (
      <div className="grid gap-4 md:grid-cols-2">
        <Field id="use-about" label="I will use about (kg, optional)" hint={useHint}>
          <Input
            id="use-about"
            inputMode="decimal"
            value={useAbout}
            onChange={(event) => onUseAboutChange(event.target.value)}
            placeholder="4389"
          />
        </Field>

        <Field id="target-pct" label="Target solid content (%)">
          <Input
            id="target-pct"
            inputMode="decimal"
            value={targetPctText}
            onChange={(event) => setTargetPctText(event.target.value)}
            placeholder="28,65"
          />
        </Field>
      </div>
      ) : null}

      {step < 2 ? (
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
      ) : null}
      {step === 0 ? (
        <Button
          type="button"
          size="touch"
          className="w-full"
          onClick={() => setStep(1)}
          disabled={parseNumber(targetPctText) == null || (mode !== "one" && parseNumber(targetVolume) == null)}
        >
          Next
        </Button>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {step >= 1 && plan.state === "blocked" ? (
        <ResultCard status="infeasible" message={plan.reason} lines={[]} />
      ) : null}
      {step === 1 && plan.state === "ready" ? (
        <Button type="button" size="touch" className="w-full" onClick={() => setStep(2)}>
          Review addition
        </Button>
      ) : null}
      {step === 2 && plan.state === "ready" ? (
        <EditableReport
          key={plan.suggestions.map((line) => `${line.id}:${line.suggestedKg}`).join("|")}
          message={`${plan.message}${shortOfUse}`}
          currentQty={snapshot.volume}
          currentPct={snapshot.solidPct}
          capacity={capacity}
          tankName={activeTank?.name ?? "Tank"}
          suggestions={plan.suggestions}
          confirmLabel="Confirm addition"
          confirming={saving}
          onConfirm={(lines) => void confirm(lines)}
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
    return {
      state: "ready",
      suggestions: [
        suggestion(input.chemA, reverse.quantity),
      ],
      volume: nextVolume,
      message: `Add ${formatQty(reverse.quantity)} kg of ${input.chemA.name}.`,
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

function suggestion(chemical: Chemical, quantity: number): ReportSuggestion {
  return {
    id: chemical.id,
    name: chemical.name,
    suggestedKg: quantity,
    solidContentPct: chemical.solidContentPct,
  };
}

function readyPlan(
  pairs: [Chemical, number][],
  volume: number,
  solidPct: number,
  fillAmount: number,
): AddPlan {
  const suggestions = pairs
    .filter(([, quantity]) => quantity > 1e-6)
    .map(([chemical, quantity]) => suggestion(chemical, quantity));
  if (suggestions.length === 0) {
    return { state: "blocked", reason: "This mix does not add any polyol." };
  }
  return {
    state: "ready",
    suggestions,
    volume,
    message: `This fill adds ${formatQty(fillAmount)} kg. The suggestion is ${formatPct(solidPct)} before you edit the kg.`,
  };
}
