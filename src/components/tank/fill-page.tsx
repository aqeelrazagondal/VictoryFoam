"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ChemicalPicker } from "@/components/tank/chemical-picker";
import { EditableReport, type EditedPour, type ReportSuggestion } from "@/components/tank/editable-report";
import { EmptyState, Field, TankLoading } from "@/components/tank/empty-state";
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
import { trackEvent } from "@/lib/analytics";
import { useTank } from "@/lib/tank/context";
import {
  clearJsonDraft,
  draftStorageKey,
  parseFillDraft,
  readJsonDraft,
  writeJsonDraft,
} from "@/lib/tank/drafts";
import type { Chemical, FillLastCalculation } from "@/lib/tank/models";
import { toChemicalRef } from "@/lib/tank/models";
import { parseNumber } from "@/lib/tank/parse";
import { getLastCalculation, insertLogEntries, saveLastCalculation } from "@/lib/tank/repository";

export function FillPage() {
  const router = useRouter();
  const { tankReady, snapshot, settings, activeChemicals, activeTank, refresh, loading } = useTank();
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
  const [lastError, setLastError] = useState<string | null>(null);
  const tankId = activeTank?.id ?? null;
  const tankAtCalc = useRef(tankId);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const volumeParam = params.get("volume");
    const pctParam = params.get("pct");
    if (volumeParam) setTargetVolume(volumeParam);
    if (pctParam) setTargetPct(pctParam);
    if (pctParam && volumeParam) setStep(1);
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
  }, [activeChemicals, pct, selectedA, selectedB, snapshot.solidPct, snapshot.volume, volume]);

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
    setStep(2);
  }

  useEffect(() => {
    if (!tankId) {
      setLast(null);
      return;
    }
    let cancelled = false;
    getLastCalculation(tankId, "fill")
      .then((payload) => {
        if (!cancelled) {
          setLast(payload && "targetVolume" in payload ? payload : null);
          setLastError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setLastError("Could not load the last fill.");
      });
    return () => {
      cancelled = true;
    };
  }, [tankId]);

  useEffect(() => {
    if (tankAtCalc.current !== tankId) {
      const previous = tankAtCalc.current;
      tankAtCalc.current = tankId;
      if (previous !== null) {
        const draft = tankId ? readJsonDraft(draftStorageKey("fill", tankId), parseFillDraft) : null;
        setStep(draft?.step ?? 0);
        setTargetVolume(draft?.targetVolume ?? "");
        setTargetPct(draft?.targetPct ?? "");
        setChemA(draft ? activeChemicals.find((chemical) => chemical.id === draft.chemAId) ?? null : null);
        setChemB(draft ? activeChemicals.find((chemical) => chemical.id === draft.chemBId) ?? null : null);
        setShowThird(draft?.showThird ?? false);
        setChemC(draft ? activeChemicals.find((chemical) => chemical.id === draft.chemCId) ?? null : null);
        setThirdQty(draft?.thirdQty ?? "");
        setLogError(null);
        return;
      }
      if (tankId) {
        const draft = readJsonDraft(draftStorageKey("fill", tankId), parseFillDraft);
        if (draft) {
          setStep(draft.step);
          setTargetVolume(draft.targetVolume);
          setTargetPct(draft.targetPct);
          setChemA(activeChemicals.find((chemical) => chemical.id === draft.chemAId) ?? null);
          setChemB(activeChemicals.find((chemical) => chemical.id === draft.chemBId) ?? null);
          setShowThird(draft.showThird);
          setChemC(activeChemicals.find((chemical) => chemical.id === draft.chemCId) ?? null);
          setThirdQty(draft.thirdQty);
        }
      }
    }
    if (!tankId || !result?.ok || !selectedA || !selectedB || volume === null || pct === null) return;
    void saveLastCalculation(tankId, "fill", {
      targetVolume: volume,
      targetPct: pct,
      chemicalAId: selectedA.id,
      chemicalBId: selectedB.id,
      chemicalCId: usingThird && chemC ? chemC.id : null,
      thirdQty: usingThird && lockedThird !== null ? lockedThird : null,
    }).catch(() => {
      setLastError("Could not remember this fill.");
    });
  }, [activeChemicals, tankId, chemC, lockedThird, pct, result, selectedA, selectedB, usingThird, volume]);

  useEffect(() => {
    if (!tankId) return;
    writeJsonDraft(draftStorageKey("fill", tankId), {
      step,
      targetVolume,
      targetPct,
      chemAId: chemA?.id ?? null,
      chemBId: chemB?.id ?? null,
      chemCId: chemC?.id ?? null,
      thirdQty,
      showThird,
    });
  }, [chemA?.id, chemB?.id, chemC?.id, showThird, step, tankId, targetPct, targetVolume, thirdQty]);

  if (loading) {
    return <TankLoading title="Fill calculator" />;
  }

  if (!tankReady) {
    return (
      <div className="space-y-4">
        <h1>Fill calculator</h1>
        <EmptyState
          title="Set up your tank first"
          description="This tops up a tank that already has something in it. Say what is in the tank on Home first."
          actionLabel="Open tank"
          actionHref="/tank/"
        />
      </div>
    );
  }

  if (activeChemicals.length === 0) {
    return (
      <div className="space-y-4">
        <h1>Fill calculator</h1>
        <EmptyState
          title="Add a polyol first"
          description="Add a polyol, with a name and a solid content. Then Fill can suggest what to pour."
          actionLabel="Add a polyol"
          actionHref="/tank/chemicals/"
        />
      </div>
    );
  }

  async function logFill(lines: EditedPour[]) {
    if (logging) return;
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
    if (!activeTank) {
      setLogError("Choose a tank first.");
      return;
    }
    setLogging(true);
    setLogError(null);
    try {
      await insertLogEntries(
        activeTank.id,
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
      trackEvent("tank_pour_confirm", { surface: "fill" });
      if (tankId) clearJsonDraft(draftStorageKey("fill", tankId));
      router.push("/tank/log/");
    } catch (caught) {
      setLogError(caught instanceof Error ? caught.message : "Could not write the log.");
      trackEvent("tank_save_fail", { surface: "fill" });
    } finally {
      setLogging(false);
    }
  }

  const steps = [
    { id: "target", label: "Target" },
    { id: "chemicals", label: "Chemicals" },
    { id: "review", label: "Review" },
  ];
  const amountToAdd = volume != null ? volume - snapshot.volume : null;

  return (
    <div className="space-y-5 pb-10">
      <h1>Fill calculator</h1>
      <p className="text-sm text-muted-foreground">
        Home, then Add to the tank, is the shorter way to top up. This screen does the same sums.
        Tank now: {formatQty(snapshot.volume)} kg at {formatPct(snapshot.solidPct)}. This is read
        from the log and cannot be edited here.
      </p>

      {lastError ? (
        <p className="text-sm text-destructive" role="alert">
          {lastError}
        </p>
      ) : null}

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
            setStep(2);
            setLast(null);
          }}
        >
          Continue last fill
        </Button>
      ) : null}

      <StepWizard steps={steps} currentIndex={step} onJump={setStep}>
        {step === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter the total quantity you want in the tank after adding chemicals. Current quantity{" "}
              {formatQty(snapshot.volume)} kg.
            </p>
            <Field
              id="fill-vol"
              label="Final tank quantity (kg)"
              hint={
                capacity != null
                  ? `The tank holds ${formatQty(capacity)} kg. You can add at most ${formatQty(roomToCapacity(capacity, snapshot.volume))} kg.`
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
            </Field>
            {amountToAdd != null ? (
              <p className="text-sm">Amount to add: {formatQty(amountToAdd)} kg</p>
            ) : null}
            {overCapacity && capacity != null ? (
              <p className="text-sm text-destructive" role="alert">
                The tank holds {formatQty(capacity)} kg. You can add at most{" "}
                {formatQty(roomToCapacity(capacity, snapshot.volume))} kg.
              </p>
            ) : null}
            <Field id="fill-pct" label="Target solid content (%)">
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
            </Field>
            <Button
              className="w-full"
              size="touch"
              disabled={volume === null || pct === null || overCapacity}
              onClick={() => setStep(1)}
            >
              Next
            </Button>
          </div>
        ) : null}
        {step === 1 ? (
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
                <div className="space-y-3">
                  <p className="text-sm font-medium">First chemical</p>
                  <ChemicalPicker
                    chemicals={activeChemicals}
                    selectedId={selectedA?.id}
                    excludedIds={[selectedB?.id, chemC?.id].filter((id): id is string => Boolean(id))}
                    onSelect={setChemA}
                  />
                  <p className="text-sm font-medium">Second chemical</p>
                  <ChemicalPicker
                    chemicals={activeChemicals}
                    selectedId={selectedB?.id}
                    excludedIds={[selectedA?.id, chemC?.id].filter((id): id is string => Boolean(id))}
                    onSelect={setChemB}
                  />
                </div>
                <Button
                  size="touch"
                  className="w-full"
                  disabled={!selectedA || !selectedB || (showThird && (!chemC || lockedThird === null || lockedThird < 0))}
                  onClick={() => setStep(2)}
                >
                  Review addition
                </Button>
              </>
            ) : null}
          </div>
        ) : null}
        {step === 2 ? (
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
                  tankName={activeTank?.name ?? "Tank"}
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
                  confirmLabel="Confirm addition"
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

