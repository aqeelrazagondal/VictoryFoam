"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ChemicalPicker } from "@/components/tank/chemical-picker";
import { EmptyState, Field } from "@/components/tank/empty-state";
import { ResultCard } from "@/components/tank/result-card";
import { NeedChemicalHint } from "@/components/tank/need-chemical-hint";
import { SuggestionList } from "@/components/tank/suggestion-list";
import { StepWizard } from "@/components/tank/step-wizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  blendMissingChemical,
  computeRequiredBlend,
  formatPct,
  formatQty,
  solveFillWithStock,
  suggestFillAlternatives,
  suggestFillPair,
  type FillApply,
} from "@/lib/calculations";
import { useTank } from "@/lib/tank/context";
import type { Chemical, FillLastCalculation } from "@/lib/tank/models";
import { toChemicalRef } from "@/lib/tank/models";
import { parseNumber } from "@/lib/tank/parse";
import { getLastCalculation, insertLogEntry, saveLastCalculation } from "@/lib/tank/repository";

export function FillPage() {
  const router = useRouter();
  const { tankReady, snapshot, settings, activeChemicals, refresh } = useTank();
  const [step, setStep] = useState(0);
  const [targetVolume, setTargetVolume] = useState("");
  const [targetPct, setTargetPct] = useState("");
  const [chemA, setChemA] = useState<Chemical | null>(null);
  const [chemB, setChemB] = useState<Chemical | null>(null);
  const [logging, setLogging] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [last, setLast] = useState<FillLastCalculation | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const volumeParam = params.get("volume");
    const pctParam = params.get("pct");
    if (volumeParam) setTargetVolume(volumeParam);
    if (pctParam) setTargetPct(pctParam);
    const volumeReady = Boolean(volumeParam) || settings?.capacity != null;
    if (pctParam && volumeReady) setStep(2);
  }, [settings?.capacity]);

  useEffect(() => {
    if (targetVolume !== "") return;
    if (settings?.capacity == null) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("volume")) return;
    setTargetVolume(String(settings.capacity));
  }, [settings?.capacity, targetVolume]);

  const volume = parseNumber(targetVolume);
  const pct = parseNumber(targetPct);

  const required = useMemo(() => {
    if (volume === null || pct === null) return null;
    return computeRequiredBlend({
      existingQty: snapshot.volume,
      existingPct: snapshot.solidPct,
      targetVolume: volume,
      targetPct: pct,
    });
  }, [pct, snapshot.solidPct, snapshot.volume, volume]);

  const suggestedPair = useMemo(() => {
    if (!required?.ok) return { above: null, below: null };
    const pair = suggestFillPair(activeChemicals.map(toChemicalRef), required.requiredBlendPct);
    return {
      above: activeChemicals.find((chemical) => chemical.id === pair.above?.id) ?? null,
      below: activeChemicals.find((chemical) => chemical.id === pair.below?.id) ?? null,
    };
  }, [activeChemicals, required]);

  const selectedA = chemA ?? suggestedPair.above;
  const selectedB = chemB ?? suggestedPair.below;

  const result = useMemo(() => {
    if (!required?.ok || !selectedA || !selectedB) return null;
    return solveFillWithStock(
      {
        fillAmount: required.fillAmount,
        requiredActive: required.requiredActive,
        qA: selectedA.solidContentPct,
        qB: selectedB.solidContentPct,
      },
      { qtyA: selectedA.qtyAvailable, qtyB: selectedB.qtyAvailable },
    );
  }, [required, selectedA, selectedB]);

  const alternatives = useMemo(() => {
    if (volume === null || pct === null) return [];
    return suggestFillAlternatives({
      existingQty: snapshot.volume,
      existingPct: snapshot.solidPct,
      targetVolume: volume,
      targetPct: pct,
      chemicalA: selectedA ? toChemicalRef(selectedA) : null,
      chemicalB: selectedB ? toChemicalRef(selectedB) : null,
      chemicals: activeChemicals.map(toChemicalRef),
    });
  }, [activeChemicals, pct, required, selectedA, selectedB, snapshot.solidPct, snapshot.volume, volume]);

  const otherPairs = alternatives.filter((item) => {
    if (!selectedA || !selectedB) return true;
    const ids = new Set([item.apply.chemicalAId, item.apply.chemicalBId]);
    return !(ids.has(selectedA.id) && ids.has(selectedB.id));
  });

  const missingChemical =
    required?.ok
      ? blendMissingChemical(required.requiredBlendPct, activeChemicals.map(toChemicalRef))
      : pct !== null
        ? blendMissingChemical(pct, activeChemicals.map(toChemicalRef))
        : null;

  function applyFillAlternative(apply: FillApply) {
    setChemA(activeChemicals.find((chemical) => chemical.id === apply.chemicalAId) ?? null);
    setChemB(activeChemicals.find((chemical) => chemical.id === apply.chemicalBId) ?? null);
    if (apply.targetPct !== undefined) setTargetPct(String(apply.targetPct));
    setStep(5);
  }

  useEffect(() => {
    getLastCalculation("fill")
      .then((payload) => setLast(payload as FillLastCalculation | null))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!result?.ok || !selectedA || !selectedB || volume === null || pct === null) return;
    void saveLastCalculation("fill", {
      targetVolume: volume,
      targetPct: pct,
      chemicalAId: selectedA.id,
      chemicalBId: selectedB.id,
    });
  }, [pct, result, selectedA, selectedB, volume]);

  if (!tankReady) {
    return (
      <div className="space-y-4">
        <h1>Fill calculator</h1>
        <EmptyState
          title="Set up your tank first"
          description="Fill Calculator tops up an existing tank. It stays hidden until Opening Balance is logged."
          actionLabel="Set up tank"
          actionHref="/tank/setup/"
        />
      </div>
    );
  }

  async function logFill() {
    if (!result?.ok || !result.amounts || !selectedA || !selectedB) return;
    setLogging(true);
    setLogError(null);
    try {
      await insertLogEntry({
        type: "add_batch",
        chemicalId: selectedA.id,
        quantity: result.amounts.xA,
        solidContentPct: selectedA.solidContentPct,
        note: "Fill calculator",
      });
      await insertLogEntry({
        type: "add_batch",
        chemicalId: selectedB.id,
        quantity: result.amounts.xB,
        solidContentPct: selectedB.solidContentPct,
        note: "Fill calculator",
      });
      await refresh();
      router.push("/tank/log/");
    } catch (caught) {
      setLogError(caught instanceof Error ? caught.message : "Could not write the log.");
    } finally {
      setLogging(false);
    }
  }

  const steps = [
    { id: "vol", label: "Target volume" },
    { id: "pct", label: "Target %" },
    { id: "pair", label: "Suggested pair" },
    { id: "a", label: selectedA?.name ?? "Chemical A" },
    { id: "b", label: selectedB?.name ?? "Chemical B" },
    { id: "result", label: "Result" },
  ];

  return (
    <div className="space-y-5 pb-10">
      <h1>Fill calculator</h1>
      <p className="text-sm text-muted-foreground">
        Tank now: {formatQty(snapshot.volume)} kg at {formatPct(snapshot.solidPct)}. This is read
        from the log and cannot be edited here.
      </p>

      {last && step === 0 ? (
        <Button
          variant="secondary"
          size="touch"
          onClick={() => {
            setTargetVolume(String(last.targetVolume));
            setTargetPct(String(last.targetPct));
            setChemA(activeChemicals.find((chemical) => chemical.id === last.chemicalAId) ?? null);
            setChemB(activeChemicals.find((chemical) => chemical.id === last.chemicalBId) ?? null);
            setStep(5);
            setLast(null);
          }}
        >
          Continue last fill
        </Button>
      ) : null}

      <StepWizard steps={steps} currentIndex={step} onJump={setStep}>
        {step === 0 ? (
          <Field
            id="fill-vol"
            label="Target volume (kg)"
            hint={
              pct !== null
                ? `Target ${formatPct(pct)} is already set. Enter how full the tank should be, for example 8000 kg.`
                : `Must be more than the current ${formatQty(snapshot.volume)} kg.`
            }
          >
            <Input
              id="fill-vol"
              inputMode="decimal"
              value={targetVolume}
              onChange={(event) => {
                setTargetVolume(event.target.value);
                setChemA(null);
                setChemB(null);
              }}
              placeholder="8000"
            />
            <Button
              className="mt-4 w-full"
              size="touch"
              disabled={volume === null}
              onClick={() => setStep(pct !== null ? 2 : 1)}
            >
              Next
            </Button>
          </Field>
        ) : null}
        {step === 1 ? (
          <Field id="fill-pct" label="Target Solid Content %">
            <Input
              id="fill-pct"
              inputMode="decimal"
              value={targetPct}
              onChange={(event) => {
                setTargetPct(event.target.value);
                setChemA(null);
                setChemB(null);
              }}
            />
            <Button
              className="mt-4 w-full"
              size="touch"
              disabled={pct === null}
              onClick={() => setStep(2)}
            >
              Next
            </Button>
          </Field>
        ) : null}
        {step === 2 ? (
          <div className="space-y-4">
            {volume === null || pct === null ? (
              <p className="text-sm text-muted-foreground">
                Enter the target volume and Solid Content % first. Volume must be above{" "}
                {formatQty(snapshot.volume)} kg.
              </p>
            ) : required && !required.ok ? (
              <ResultCard
                status="infeasible"
                message={required.reason}
                lines={[]}
                footer={
                  <Button asChild size="touch" className="w-full">
                    <Link href="/tank/planner/">Open Tank Planner</Link>
                  </Button>
                }
              />
            ) : required?.ok ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Required blend for the added portion: {formatPct(required.requiredBlendPct)}.
                </p>
                <p>
                  Above: {selectedA?.name ?? "None available"}
                  {selectedA ? ` (${formatPct(selectedA.solidContentPct)})` : ""}
                </p>
                <p>
                  Below: {selectedB?.name ?? "None available"}
                  {selectedB ? ` (${formatPct(selectedB.solidContentPct)})` : ""}
                </p>
                {selectedA && selectedB && otherPairs.length > 0 ? (
                  <SuggestionList
                    heading="Other pairs that also hit this target"
                    alternatives={otherPairs}
                    onSelect={applyFillAlternative}
                  />
                ) : null}
                {!selectedA || !selectedB ? (
                  <ResultCard
                    status="infeasible"
                    message="No chemical sits on both sides of the required blend. Choose a reachable combination."
                    lines={[]}
                    footer={
                      <div className="space-y-4">
                        <SuggestionList alternatives={alternatives} onSelect={applyFillAlternative} />
                        {missingChemical ? <NeedChemicalHint advice={missingChemical} /> : null}
                      </div>
                    }
                  />
                ) : null}
                <Button size="touch" className="w-full" onClick={() => setStep(3)}>
                  Confirm or change chemicals
                </Button>
              </>
            ) : null}
          </div>
        ) : null}
        {step === 3 ? (
          <ChemicalPicker
            chemicals={activeChemicals}
            selectedId={selectedA?.id}
            excludedId={selectedB?.id}
            onSelect={(chemical) => {
              setChemA(chemical);
              setStep(4);
            }}
          />
        ) : null}
        {step === 4 ? (
          <ChemicalPicker
            chemicals={activeChemicals}
            selectedId={selectedB?.id}
            excludedId={selectedA?.id}
            onSelect={(chemical) => {
              setChemB(chemical);
              setStep(5);
            }}
          />
        ) : null}
        {step === 5 ? (
          <div className="space-y-4">
            {result && selectedA && selectedB ? (
              <ResultCard
                status={result.status}
                message={result.ok ? (result.reason ?? undefined) : result.reason}
                lines={
                  result.ok && result.amounts
                    ? [
                        result.amounts.xA > 1e-9
                          ? {
                              eyebrow: `Add ${selectedA.name}`,
                              value: `${formatQty(result.amounts.xA)} ${selectedA.unit}`,
                              detail:
                                result.stock.chemicalA.status === "untracked"
                                  ? "Stock not tracked"
                                  : result.stock.chemicalA.status === "insufficient"
                                    ? `Only ${formatQty(result.stock.chemicalA.available ?? 0)} ${selectedA.unit} in stock`
                                    : undefined,
                            }
                          : null,
                        result.amounts.xB > 1e-9
                          ? {
                              eyebrow: `Add ${selectedB.name}`,
                              value: `${formatQty(result.amounts.xB)} ${selectedB.unit}`,
                              detail:
                                result.stock.chemicalB.status === "untracked"
                                  ? "Stock not tracked"
                                  : result.stock.chemicalB.status === "insufficient"
                                    ? `Only ${formatQty(result.stock.chemicalB.available ?? 0)} ${selectedB.unit} in stock`
                                    : undefined,
                            }
                          : null,
                      ].filter((line) => line !== null)
                    : []
                }
                footer={
                  result.ok ? (
                    <div className="space-y-3">
                      {logError ? <p className="text-sm text-destructive">{logError}</p> : null}
                      <Button
                        size="touch"
                        className="w-full"
                        disabled={logging}
                        onClick={() => void logFill()}
                      >
                        {logging ? "Writing log…" : "Log this (two Add Batch entries)"}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Nothing is written until you confirm. You will land on Tank Log afterwards.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <SuggestionList alternatives={alternatives} onSelect={applyFillAlternative} />
                      {missingChemical ? <NeedChemicalHint advice={missingChemical} /> : null}
                    </div>
                  )
                }
              />
            ) : (
              <ResultCard
                status="infeasible"
                message="Need a chemical on both sides of the required blend. Choose a reachable combination."
                lines={[]}
                footer={
                  <div className="space-y-4">
                    <SuggestionList alternatives={alternatives} onSelect={applyFillAlternative} />
                    {missingChemical ? <NeedChemicalHint advice={missingChemical} /> : null}
                  </div>
                }
              />
            )}
          </div>
        ) : null}
      </StepWizard>
    </div>
  );
}
