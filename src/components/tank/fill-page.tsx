"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ChemicalPicker } from "@/components/tank/chemical-picker";
import { EditableReport, type EditedPour, type ReportSuggestion } from "@/components/tank/editable-report";
import { EmptyState, Field } from "@/components/tank/empty-state";
import { ResultCard } from "@/components/tank/result-card";
import { NeedChemicalHint } from "@/components/tank/need-chemical-hint";
import { SuggestionList } from "@/components/tank/suggestion-list";
import { StepWizard } from "@/components/tank/step-wizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThirdChemicalPanel } from "@/components/tank/third-chemical-panel";
import {
  blendMissingChemical,
  computeRequiredBlend,
  formatPct,
  formatQty,
  roomToCapacity,
  capacityOverflowMessage,
  solveFillThreeWithStock,
  solveFillWithStock,
  suggestFillAlternatives,
  suggestFillPair,
  checkStock,
  type FillApply,
  type StockCheck,
} from "@/lib/calculations";
import { useTank } from "@/lib/tank/context";
import type { Chemical, FillLastCalculation } from "@/lib/tank/models";
import { toChemicalRef } from "@/lib/tank/models";
import { parseNumber } from "@/lib/tank/parse";
import { getLastCalculation, insertLogEntries, saveLastCalculation } from "@/lib/tank/repository";

export function FillPage() {
  const router = useRouter();
  const { tankReady, snapshot, settings, activeChemicals, refresh } = useTank();
  const [step, setStep] = useState(0);
  const [targetVolume, setTargetVolume] = useState("");
  const [targetPct, setTargetPct] = useState("");
  const [chemA, setChemA] = useState<Chemical | null>(null);
  const [chemB, setChemB] = useState<Chemical | null>(null);
  const [showThird, setShowThird] = useState(false);
  const [chemC, setChemC] = useState<Chemical | null>(null);
  const [thirdQty, setThirdQty] = useState("");
  const [logging, setLogging] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [last, setLast] = useState<FillLastCalculation | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const volumeParam = params.get("volume");
    const pctParam = params.get("pct");
    if (volumeParam) setTargetVolume(volumeParam);
    if (pctParam) setTargetPct(pctParam);
    if (pctParam && volumeParam) setStep(2);
  }, []);

  const volume = parseNumber(targetVolume);
  const pct = parseNumber(targetPct);
  const capacity = settings?.capacity ?? null;
  const overCapacity = capacity != null && volume != null && volume > capacity;

  const required = useMemo(() => {
    if (volume === null || pct === null) return null;
    return computeRequiredBlend({
      existingQty: snapshot.volume,
      existingPct: snapshot.solidPct,
      targetVolume: volume,
      targetPct: pct,
      capacity,
    });
  }, [capacity, pct, snapshot.solidPct, snapshot.volume, volume]);

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
  const lockedThird = parseNumber(thirdQty);
  const usingThird = Boolean(chemC && lockedThird !== null && lockedThird > 0);

  const result = useMemo(() => {
    if (!required?.ok || !selectedA || !selectedB) return null;
    if (usingThird && chemC && lockedThird !== null) {
      return solveFillThreeWithStock(
        {
          fillAmount: required.fillAmount,
          requiredActive: required.requiredActive,
          qA: selectedA.solidContentPct,
          qB: selectedB.solidContentPct,
          qC: chemC.solidContentPct,
          xC: lockedThird,
        },
        { qtyA: selectedA.qtyAvailable, qtyB: selectedB.qtyAvailable, qtyC: chemC.qtyAvailable },
      );
    }
    return solveFillWithStock(
      {
        fillAmount: required.fillAmount,
        requiredActive: required.requiredActive,
        qA: selectedA.solidContentPct,
        qB: selectedB.solidContentPct,
      },
      { qtyA: selectedA.qtyAvailable, qtyB: selectedB.qtyAvailable },
    );
  }, [chemC, lockedThird, required, selectedA, selectedB, usingThird]);

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
    setShowThird(false);
    setChemC(null);
    setThirdQty("");
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
      chemicalCId: usingThird && chemC ? chemC.id : null,
      thirdQty: usingThird && lockedThird !== null ? lockedThird : null,
    });
  }, [chemC, lockedThird, pct, result, selectedA, selectedB, usingThird, volume]);

  if (!tankReady) {
    return (
      <div className="space-y-4">
        <h1>Fill calculator</h1>
        <EmptyState
          title="Set up your tank first"
          description="Fill Calculator tops up an existing tank. It stays hidden until Opening Balance is logged."
          actionLabel="Set up tank"
          actionHref="/tank/"
        />
      </div>
    );
  }

  async function logFill(lines: EditedPour[]) {
    const addQty = lines.reduce((sum, line) => sum + Math.max(0, line.quantity), 0);
    const overflow = capacityOverflowMessage({
      volume: snapshot.volume,
      addQty,
      capacity,
    });
    if (overflow) {
      setLogError(overflow);
      return;
    }
    setLogging(true);
    setLogError(null);
    try {
      await insertLogEntries(
        lines
          .filter((line) => line.quantity > 1e-9)
          .map((line) => ({
            type: "add_batch" as const,
            chemicalId: line.id,
            quantity: line.quantity,
            solidContentPct: line.solidContentPct,
            note: "Fill calculator",
          })),
      );
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
            const third = last.chemicalCId
              ? activeChemicals.find((chemical) => chemical.id === last.chemicalCId) ?? null
              : null;
            setChemC(third);
            setShowThird(Boolean(third));
            setThirdQty(last.thirdQty != null ? String(last.thirdQty) : "");
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
              capacity != null
                ? `The tank holds ${formatQty(capacity)} kg. You can add at most ${formatQty(roomToCapacity(capacity, snapshot.volume))} kg, or type a smaller fill.`
                : pct !== null
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
            {overCapacity && capacity != null ? (
              <p className="mt-3 text-sm text-destructive" role="alert">
                The tank holds {formatQty(capacity)} kg. You can add at most{" "}
                {formatQty(roomToCapacity(capacity, snapshot.volume))} kg.
              </p>
            ) : null}
            <Button
              className="mt-4 w-full"
              size="touch"
              disabled={volume === null || overCapacity}
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
                {showThird ? (
                  <ThirdChemicalPanel
                    chemicals={activeChemicals}
                    excludedIds={[selectedA?.id, selectedB?.id].filter((id): id is string => Boolean(id))}
                    chemical={chemC}
                    quantity={thirdQty}
                    quantityId="fill-x3"
                    hint="This amount is locked. The suggested pair fills the rest of the addition."
                    onChemicalChange={setChemC}
                    onQuantityChange={setThirdQty}
                    onClear={() => {
                      setShowThird(false);
                      setChemC(null);
                      setThirdQty("");
                    }}
                  />
                ) : (
                  <Button
                    variant="outline"
                    size="touch"
                    className="w-full"
                    onClick={() => setShowThird(true)}
                  >
                    Add a third chemical
                  </Button>
                )}
                <Button
                  size="touch"
                  className="w-full"
                  disabled={showThird && (!chemC || lockedThird === null || lockedThird < 0)}
                  onClick={() => setStep(3)}
                >
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
            excludedIds={[selectedB?.id, chemC?.id].filter((id): id is string => Boolean(id))}
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
            excludedIds={[selectedA?.id, chemC?.id].filter((id): id is string => Boolean(id))}
            onSelect={(chemical) => {
              setChemB(chemical);
              setStep(5);
            }}
          />
        ) : null}
        {step === 5 ? (
          <div className="space-y-4">
            {result && selectedA && selectedB && result.ok && result.amounts ? (
              <>
                {logError ? (
                  <p className="text-sm text-destructive" role="alert">
                    {logError}
                  </p>
                ) : null}
                <EditableReport
                  key={`${selectedA.id}:${result.amounts.xA}:${selectedB.id}:${result.amounts.xB}:${chemC?.id ?? ""}:${lockedThird ?? ""}`}
                  status={result.status}
                  message={result.reason ?? undefined}
                  currentQty={snapshot.volume}
                  currentPct={snapshot.solidPct}
                  capacity={capacity}
                  suggestions={fillSuggestions({
                    chemicalA: selectedA,
                    amountA: result.amounts.xA,
                    stockA: result.stock.chemicalA,
                    chemicalB: selectedB,
                    amountB: result.amounts.xB,
                    stockB: result.stock.chemicalB,
                    chemicalC: usingThird ? chemC : null,
                    amountC: usingThird ? lockedThird : null,
                  })}
                  confirmLabel={(lines) => logFillLabel(lines.map((line) => line.quantity))}
                  confirming={logging}
                  onConfirm={(lines) => void logFill(lines)}
                />
                <p className="text-xs text-muted-foreground">
                  Nothing is written until you confirm. You will land on Tank Log afterwards.
                </p>
              </>
            ) : result && selectedA && selectedB ? (
              <ResultCard
                status={result.status}
                message={result.reason ?? undefined}
                lines={[]}
                footer={
                  <div className="space-y-4">
                    <SuggestionList alternatives={alternatives} onSelect={applyFillAlternative} />
                    {missingChemical ? <NeedChemicalHint advice={missingChemical} /> : null}
                  </div>
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

function fillSuggestions(input: {
  chemicalA: Chemical;
  amountA: number;
  stockA: StockCheck;
  chemicalB: Chemical;
  amountB: number;
  stockB: StockCheck;
  chemicalC: Chemical | null;
  amountC: number | null;
}): ReportSuggestion[] {
  const lines: ReportSuggestion[] = [];
  if (input.amountA > 1e-9) {
    lines.push(reportLine(input.chemicalA, input.amountA, input.stockA));
  }
  if (input.amountB > 1e-9) {
    lines.push(reportLine(input.chemicalB, input.amountB, input.stockB));
  }
  if (input.chemicalC && input.amountC != null && input.amountC > 1e-9) {
    lines.push(
      reportLine(
        input.chemicalC,
        input.amountC,
        checkStock(input.amountC, input.chemicalC.qtyAvailable),
      ),
    );
  }
  return lines;
}

function reportLine(chemical: Chemical, amount: number, stock: StockCheck): ReportSuggestion {
  return {
    id: chemical.id,
    name: chemical.name,
    suggestedKg: amount,
    solidContentPct: chemical.solidContentPct,
    note: stockNote(stock, chemical.unit),
  };
}

function stockNote(stock: StockCheck, unit: string) {
  if (stock.status === "untracked") return "Stock not tracked";
  if (stock.status === "insufficient") {
    return `Only ${formatQty(stock.available ?? 0)} ${unit} in stock`;
  }
  return undefined;
}

function logFillLabel(amounts: number[]) {
  const count = amounts.filter((amount) => amount > 1e-9).length;
  if (count === 2) return "Log this (two Add Batch entries)";
  if (count === 1) return "Log this (one Add Batch entry)";
  return `Log this (${count} Add Batch entries)`;
}
