"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ChemicalPicker } from "@/components/tank/chemical-picker";
import { EmptyState, Field, TankLoading } from "@/components/tank/empty-state";
import { NeedChemicalHint } from "@/components/tank/need-chemical-hint";
import { ResultCard } from "@/components/tank/result-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SuggestionList } from "@/components/tank/suggestion-list";
import {
  drawableNow,
  formatPct,
  formatQty,
  plannerMissingChemical,
  previewAddBatch,
  reverseAdd,
  suggestPlannerAlternatives,
  suggestPlannerHits,
  type PlannerApply,
} from "@/lib/calculations";
import { useTank } from "@/lib/tank/context";
import type { Chemical } from "@/lib/tank/models";
import { toChemicalRef } from "@/lib/tank/models";
import { parseNumber } from "@/lib/tank/parse";

export function PlannerPage() {
  const { tankReady, snapshot, settings, activeChemicals, entries, loading } = useTank();
  const [mode, setMode] = useState<"preview" | "reverse">("reverse");
  const [addQty, setAddQty] = useState("");
  const [addPct, setAddPct] = useState("");
  const [targetPct, setTargetPct] = useState("");
  const [overrideQty, setOverrideQty] = useState("");
  const [overridePct, setOverridePct] = useState("");
  const [chemical, setChemical] = useState<Chemical | null>(null);
  const logCount = entries.length;

  const qty = parseNumber(addQty);
  const pct = parseNumber(addPct);
  const preview =
    qty !== null && pct !== null
      ? previewAddBatch({
          currentQty: snapshot.volume,
          currentPct: snapshot.solidPct,
          addQty: qty,
          addPct: pct,
        })
      : null;

  const tankQty = parseNumber(overrideQty) ?? snapshot.volume;
  const tankPct = parseNumber(overridePct) ?? snapshot.solidPct;
  const usingLastTank = parseNumber(overrideQty) === null && parseNumber(overridePct) === null;

  const target = parseNumber(targetPct);
  const reverse = useMemo(() => {
    if (!chemical || target === null) return null;
    return reverseAdd({
      currentQty: tankQty,
      currentPct: tankPct,
      chemicalPct: chemical.solidContentPct,
      targetPct: target,
    });
  }, [chemical, tankPct, tankQty, target]);

  const hits = useMemo(() => {
    if (target === null) return [];
    return suggestPlannerHits({
      currentQty: tankQty,
      currentPct: tankPct,
      targetPct: target,
      chemicals: activeChemicals.map(toChemicalRef),
    });
  }, [activeChemicals, tankPct, tankQty, target]);

  const missingChemical = useMemo(() => {
    if (target === null) return null;
    return plannerMissingChemical({
      currentQty: tankQty,
      currentPct: tankPct,
      targetPct: target,
      chemicals: activeChemicals.map(toChemicalRef),
    });
  }, [activeChemicals, tankPct, tankQty, target]);

  const alternatives = useMemo(() => {
    if (target === null || reverse?.ok) return [];
    return suggestPlannerAlternatives({
      currentQty: tankQty,
      currentPct: tankPct,
      chemical: chemical ? toChemicalRef(chemical) : null,
      targetPct: target,
      chemicals: activeChemicals.map(toChemicalRef),
    });
  }, [activeChemicals, chemical, reverse, tankPct, tankQty, target]);

  function applyPlannerAlternative(apply: PlannerApply) {
    if (apply.chemicalId) {
      setChemical(activeChemicals.find((item) => item.id === apply.chemicalId) ?? null);
    }
    setTargetPct(String(apply.targetPct));
  }

  function resetToLastTank() {
    setOverrideQty("");
    setOverridePct("");
  }

  if (loading) {
    return <TankLoading title="Tank planner" />;
  }

  if (!tankReady) {
    return (
      <div className="space-y-4">
        <h1>Tank planner</h1>
        <EmptyState
          title="Set up your tank first"
          description="This tries one chemical against the tank you already have. Say what is in the tank on Home first. Nothing is saved here."
          actionLabel="Open tank"
          actionHref="/tank/"
        />
      </div>
    );
  }

  if (activeChemicals.length === 0) {
    return (
      <div className="space-y-4">
        <h1>Tank planner</h1>
        <EmptyState
          title="Add a polyol first"
          description="Add a polyol, with a name and a solid content. Then Planner can tell you how much of that one drum to pour."
          actionLabel="Add a polyol"
          actionHref="/tank/chemicals/"
        />
      </div>
    );
  }

  const heel = settings?.heel ?? 0;
  const capacity = settings?.capacity ?? null;
  const projectedVolume =
    mode === "preview" && preview
      ? preview.volume
      : mode === "reverse" && reverse?.ok && reverse.quantity !== null
        ? tankQty + reverse.quantity
        : null;
  const capacityWarning =
    capacity != null && capacity > 0 && projectedVolume != null && projectedVolume > capacity + 0.05
      ? `That would be ${formatQty(projectedVolume)} kg. The tank holds ${formatQty(capacity)} kg. This size warning is separate from whether the target can be reached.`
      : null;

  return (
    <div className="space-y-5 pb-10">
      <h1>Tank planner</h1>
      <p className="text-muted-foreground">
        Try one chemical before you pour. Nothing is saved here. Planner uses{" "}
        <strong className="text-foreground">one chemical</strong>. For two or three drums use{" "}
        <Link href="/tank/fill/" className="font-medium text-primary underline-offset-4 hover:underline">
          Fill
        </Link>{" "}
        (tank already has something) or{" "}
        <Link href="/tank/blend/" className="font-medium text-primary underline-offset-4 hover:underline">
          Blend
        </Link>{" "}
        (fresh batch). You can still use {formatQty(drawableNow(snapshot.volume, heel))} kg. Log
        entries: {logCount}.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button
          size="touch"
          variant={mode === "preview" ? "default" : "outline"}
          onClick={() => setMode("preview")}
        >
          Preview addition
        </Button>
        <Button
          size="touch"
          variant={mode === "reverse" ? "default" : "outline"}
          onClick={() => setMode("reverse")}
        >
          Reach target %
        </Button>
      </div>

      {mode === "preview" ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Type a batch quantity and Solid Content % to see the tank afterwards. Nothing is saved.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <Field id="preview-qty" label="Hypothetical batch quantity (kg)">
              <Input
                id="preview-qty"
                inputMode="decimal"
                value={addQty}
                onChange={(event) => setAddQty(event.target.value)}
              />
            </Field>
            <Field id="preview-pct" label="Batch Solid Content %">
              <Input
                id="preview-pct"
                inputMode="decimal"
                value={addPct}
                onChange={(event) => setAddPct(event.target.value)}
              />
            </Field>
          </div>
          {preview ? (
            <ResultCard
              status="feasible"
              statusLabel="Preview only"
              message="This does not write to the tank log."
              lines={[
                { eyebrow: "Resulting tank mass", value: `${formatQty(preview.volume)} kg` },
                { eyebrow: "Resulting solid %", value: formatPct(preview.solidPct) },
              ]}
            />
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Type the Solid Content % you want, such as 53%. Then pick <strong className="text-foreground">one</strong>{" "}
            chemical. You cannot select several here — that would need Fill or Blend. The last
            logged tank is used unless you edit the volume or % below.
          </p>
          <p className="text-sm">
            Last recorded tank quantity: {formatQty(snapshot.volume)} kg at {formatPct(snapshot.solidPct)}
            {usingLastTank ? "" : " · using your edited values for this what-if"}
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <Field id="tank-qty" label="Tank quantity (kg)" hint="Leave blank to use the last recorded tank quantity. Overrides are only a simulation.">
              <Input
                id="tank-qty"
                inputMode="decimal"
                value={overrideQty}
                onChange={(event) => setOverrideQty(event.target.value)}
                placeholder={String(snapshot.volume)}
              />
            </Field>
            <Field
              id="tank-pct"
              label="Tank Solid Content %"
              hint="Leave blank to use the last logged solid %."
            >
              <Input
                id="tank-pct"
                inputMode="decimal"
                value={overridePct}
                onChange={(event) => setOverridePct(event.target.value)}
                placeholder={String(snapshot.solidPct)}
              />
            </Field>
          </div>
          {usingLastTank ? null : (
            <Button variant="outline" size="touch" onClick={resetToLastTank}>
              Use last logged tank
            </Button>
          )}
          <Field id="rev-pct" label="Target Solid Content %">
            <Input
              id="rev-pct"
              inputMode="decimal"
              value={targetPct}
              onChange={(event) => setTargetPct(event.target.value)}
            />
          </Field>
          {target === null ? (
            <p className="text-sm text-muted-foreground">Enter a target % to continue.</p>
          ) : hits.length > 0 ? (
            <SuggestionList
              heading="Add one of these to reach that target"
              alternatives={hits}
              onSelect={applyPlannerAlternative}
            />
          ) : missingChemical ? (
            <NeedChemicalHint advice={missingChemical} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Pick a chemical below to calculate the amount.
            </p>
          )}
          <ChemicalPicker chemicals={activeChemicals} selectedId={chemical?.id} onSelect={setChemical} />
          {target !== null && !chemical && hits.length === 0 && !missingChemical ? (
            <p className="text-sm text-muted-foreground">
              Pick a chemical above to calculate the amount.
            </p>
          ) : null}
          {reverse ? (
            <ResultCard
              status={reverse.ok ? "feasible" : "infeasible"}
              message={reverse.ok ? reverse.reason ?? undefined : reverse.reason}
              lines={
                reverse.ok && reverse.quantity !== null && chemical
                  ? [
                      {
                        eyebrow: `Add ${chemical.name}`,
                        value: `${formatQty(reverse.quantity)} ${chemical.unit}`,
                      },
                    ]
                  : []
              }
              footer={
                reverse.ok ? null : (
                  <div className="space-y-4">
                    <SuggestionList alternatives={alternatives} onSelect={applyPlannerAlternative} />
                  </div>
                )
              }
            />
          ) : null}
        </div>
      )}
      {capacityWarning ? (
        <p className="text-sm" role="status">
          {capacityWarning}
        </p>
      ) : null}
    </div>
  );
}
