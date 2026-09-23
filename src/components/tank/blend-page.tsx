"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ChemicalPicker } from "@/components/tank/chemical-picker";
import { EmptyState, Field } from "@/components/tank/empty-state";
import { ResultCard } from "@/components/tank/result-card";
import { NeedChemicalHint } from "@/components/tank/need-chemical-hint";
import { SuggestionList } from "@/components/tank/suggestion-list";
import { StepWizard } from "@/components/tank/step-wizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThirdChemicalPanel } from "@/components/tank/third-chemical-panel";
import {
  formatPct,
  formatQty,
  blendMissingChemical,
  solveBlendThreeWithStock,
  solveBlendWithStock,
  suggestBlendAlternatives,
  checkStock,
  type BlendApply,
  type StockCheck,
} from "@/lib/calculations";
import { useTank } from "@/lib/tank/context";
import type { BlendLastCalculation, Chemical } from "@/lib/tank/models";
import { toChemicalRef } from "@/lib/tank/models";
import { parseNumber } from "@/lib/tank/parse";
import { getLastCalculation, applyStockMovement, saveLastCalculation, TankError } from "@/lib/tank/repository";

export function BlendPage() {
  const { activeChemicals, refresh } = useTank();
  const [step, setStep] = useState(0);
  const [chem1, setChem1] = useState<Chemical | null>(null);
  const [chem2, setChem2] = useState<Chemical | null>(null);
  const [sameError, setSameError] = useState<string | null>(null);
  const [targetPct, setTargetPct] = useState("");
  const [targetQty, setTargetQty] = useState("");
  const [showThird, setShowThird] = useState(false);
  const [chem3, setChem3] = useState<Chemical | null>(null);
  const [thirdQty, setThirdQty] = useState("");
  const [last, setLast] = useState<BlendLastCalculation | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordedKey, setRecordedKey] = useState<string | null>(null);
  const [usedMessage, setUsedMessage] = useState<string | null>(null);
  const [usedError, setUsedError] = useState<string | null>(null);

  useEffect(() => {
    getLastCalculation("blend")
      .then((payload) => setLast(payload as BlendLastCalculation | null))
      .catch(() => undefined);
  }, []);

  const qty = parseNumber(targetQty);
  const pct = parseNumber(targetPct);
  const lockedThird = parseNumber(thirdQty);
  const usingThird = Boolean(chem3 && lockedThird !== null && lockedThird > 0);
  const result = useMemo(() => {
    if (!chem1 || !chem2 || pct === null || qty === null || !(qty > 0)) return null;
    if (usingThird && chem3 && lockedThird !== null) {
      return solveBlendThreeWithStock(
        {
          q1: chem1.solidContentPct,
          q2: chem2.solidContentPct,
          q3: chem3.solidContentPct,
          x3: lockedThird,
          targetPct: pct,
          targetQty: qty,
        },
        { qty1: chem1.qtyAvailable, qty2: chem2.qtyAvailable, qty3: chem3.qtyAvailable },
      );
    }
    return solveBlendWithStock(
      {
        q1: chem1.solidContentPct,
        q2: chem2.solidContentPct,
        targetPct: pct,
        targetQty: qty,
      },
      { qty1: chem1.qtyAvailable, qty2: chem2.qtyAvailable },
    );
  }, [chem1, chem2, chem3, lockedThird, pct, qty, usingThird]);

  const alternatives = useMemo(() => {
    if (!chem1 || !chem2 || pct === null || qty === null || result?.ok) return [];
    return suggestBlendAlternatives({
      chemical1: toChemicalRef(chem1),
      chemical2: toChemicalRef(chem2),
      targetPct: pct,
      targetQty: qty,
      chemicals: activeChemicals.map(toChemicalRef),
    });
  }, [activeChemicals, chem1, chem2, pct, qty, result]);

  const missingChemical =
    !result?.ok && pct !== null
      ? blendMissingChemical(pct, activeChemicals.map(toChemicalRef))
      : null;

  function applyBlendAlternative(apply: BlendApply) {
    setChem1(activeChemicals.find((chemical) => chemical.id === apply.chemical1Id) ?? null);
    setChem2(activeChemicals.find((chemical) => chemical.id === apply.chemical2Id) ?? null);
    setTargetPct(String(apply.targetPct));
    setShowThird(false);
    setChem3(null);
    setThirdQty("");
    setStep(4);
  }

  useEffect(() => {
    if (!result?.ok || !chem1 || !chem2 || pct === null || qty === null) return;
    void saveLastCalculation("blend", {
      chemical1Id: chem1.id,
      chemical2Id: chem2.id,
      chemical3Id: usingThird && chem3 ? chem3.id : null,
      thirdQty: usingThird && lockedThird !== null ? lockedThird : null,
      targetPct: pct,
      targetQty: qty,
    });
  }, [chem1, chem2, chem3, lockedThird, pct, qty, result, usingThird]);

  function continueLast() {
    if (!last) return;
    const first = activeChemicals.find((chemical) => chemical.id === last.chemical1Id) ?? null;
    const second = activeChemicals.find((chemical) => chemical.id === last.chemical2Id) ?? null;
    setChem1(first);
    setChem2(second);
    setTargetPct(String(last.targetPct));
    setTargetQty(String(last.targetQty));
    const third = last.chemical3Id
      ? activeChemicals.find((chemical) => chemical.id === last.chemical3Id) ?? null
      : null;
    setChem3(third);
    setShowThird(Boolean(third));
    setThirdQty(last.thirdQty != null ? String(last.thirdQty) : "");
    setStep(first && second ? 4 : 0);
    setLast(null);
  }

  const useKey =
    result?.ok && result.amounts && chem1 && chem2
      ? [
          chem1.id,
          result.amounts.x1,
          chem2.id,
          result.amounts.x2,
          chem3?.id ?? "",
          lockedThird ?? "",
        ].join(":")
      : null;

  async function recordUsed() {
    if (!result?.ok || !result.amounts || !chem1 || !chem2 || !useKey) return;
    const lines = [
      { chemical: chem1, quantity: result.amounts.x1 },
      { chemical: chem2, quantity: result.amounts.x2 },
      ...(usingThird && chem3 && lockedThird !== null && lockedThird > 0
        ? [{ chemical: chem3, quantity: lockedThird }]
        : []),
    ].filter((line) => line.quantity > 1e-9);
    setRecording(true);
    setUsedError(null);
    setUsedMessage(null);
    try {
      for (const line of lines) {
        await applyStockMovement(line.chemical.id, {
          type: "issue",
          quantity: line.quantity,
          note: "Blend",
        });
      }
      await refresh();
      setRecordedKey(useKey);
      setUsedMessage("Taken off the shelf. The tank was not filled.");
    } catch (caught) {
      setUsedError(caught instanceof TankError ? caught.message : "Could not record this blend.");
    } finally {
      setRecording(false);
    }
  }

  const steps = [
    { id: "c1", label: chem1?.name ?? "Chemical 1" },
    { id: "c2", label: chem2?.name ?? "Chemical 2" },
    { id: "pct", label: pct === null ? "Target %" : formatPct(pct) },
    { id: "qty", label: qty === null ? "Quantity" : `${formatQty(qty)} kg` },
    { id: "result", label: "Result" },
  ];

  return (
    <div className="space-y-5 pb-10">
      <h1>Blend calculator</h1>
      <p className="text-muted-foreground">
        Mix a fresh batch in a drum or mixer. This does not change the tank. Take this off the shelf
        when those drums are gone. To change what is already in the tank, go back to Home. To try
        one chemical first, use{" "}
        <Link href="/tank/planner/" className="font-medium text-primary underline-offset-4 hover:underline">
          Tank Planner
        </Link>
        .
      </p>

      {last && step === 0 ? (
        <Button variant="secondary" size="touch" onClick={continueLast}>
          Continue with your last blend
        </Button>
      ) : null}

      {activeChemicals.length === 0 ? (
        <EmptyState
          title="Add your first chemical"
          description="Blend Calculator needs at least two chemicals in the library."
          actionLabel="Add chemical"
          actionHref="/tank/chemicals/"
        />
      ) : (
        <StepWizard steps={steps} currentIndex={step} onJump={setStep}>
          {step === 0 ? (
            <ChemicalPicker
              chemicals={activeChemicals}
              selectedId={chem1?.id}
              onSelect={(chemical) => {
                setChem1(chemical);
                setStep(1);
              }}
            />
          ) : null}
          {step === 1 ? (
            <div className="space-y-3">
              {sameError ? <p className="text-sm text-destructive">{sameError}</p> : null}
              <ChemicalPicker
                chemicals={activeChemicals}
                selectedId={chem2?.id}
                excludedId={chem1?.id}
                onSelect={(chemical) => {
                  if (chem1 && chemical.id === chem1.id) {
                    setSameError("Choose two different chemicals.");
                    return;
                  }
                  setSameError(null);
                  setChem2(chemical);
                  setStep(2);
                }}
              />
            </div>
          ) : null}
          {step === 2 ? (
            <Field id="blend-pct" label="Target Solid Content %">
              <Input
                id="blend-pct"
                inputMode="decimal"
                value={targetPct}
                onChange={(event) => setTargetPct(event.target.value)}
              />
              <Button
                className="mt-4 w-full"
                size="touch"
                disabled={pct === null}
                onClick={() => setStep(3)}
              >
                Next
              </Button>
            </Field>
          ) : null}
          {step === 3 ? (
            <div className="space-y-4">
            <Field
              id="blend-qty"
              label="Target quantity (kg)"
              hint={qty === null || qty === 0 ? "Enter a quantity greater than 0 to calculate." : undefined}
            >
              <Input
                id="blend-qty"
                inputMode="decimal"
                value={targetQty}
                onChange={(event) => setTargetQty(event.target.value)}
              />
              <Button
                className="mt-4 w-full"
                size="touch"
                disabled={
                  qty === null ||
                  !(qty > 0) ||
                  (showThird && (!chem3 || lockedThird === null || lockedThird < 0))
                }
                onClick={() => setStep(4)}
              >
                See result
              </Button>
            </Field>
            {showThird ? (
              <ThirdChemicalPanel
                chemicals={activeChemicals}
                excludedIds={[chem1?.id, chem2?.id].filter((id): id is string => Boolean(id))}
                chemical={chem3}
                quantity={thirdQty}
                quantityId="blend-x3"
                hint="This amount is locked. The first two chemicals fill the rest of the batch."
                onChemicalChange={setChem3}
                onQuantityChange={setThirdQty}
                onClear={() => {
                  setShowThird(false);
                  setChem3(null);
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
            </div>
          ) : null}
          {step === 4 && result && chem1 && chem2 ? (
            <ResultCard
              status={result.status}
              message={
                result.ok
                  ? result.anyRatio
                    ? result.reason ?? undefined
                    : result.status === "warning"
                      ? "Numbers are still shown so you can decide — order more, or proceed anyway."
                      : undefined
                  : result.reason
              }
              lines={
                result.ok && result.amounts
                  ? [
                      amountLine(chem1, result.amounts.x1, result.stock.chemical1),
                      amountLine(chem2, result.amounts.x2, result.stock.chemical2),
                      usingThird && chem3 && lockedThird !== null
                        ? amountLine(chem3, lockedThird, checkStock(lockedThird, chem3.qtyAvailable))
                        : null,
                    ].filter((line) => line !== null)
                  : []
              }
              footer={
                result.ok ? (
                  <div className="space-y-3">
                    {usedMessage ? <p className="text-sm">{usedMessage}</p> : null}
                    {usedError ? (
                      <p className="text-sm text-destructive" role="alert">
                        {usedError}
                      </p>
                    ) : null}
                    <p className="text-sm text-muted-foreground">
                      This takes the kilograms off the shelf. It does not fill the tank.
                    </p>
                    <Button
                      size="touch"
                      className="w-full"
                      disabled={recording || recordedKey === useKey}
                      onClick={() => void recordUsed()}
                    >
                      {recording ? "Saving…" : recordedKey === useKey ? "Taken off the shelf" : "Take this off the shelf"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <SuggestionList alternatives={alternatives} onSelect={applyBlendAlternative} />
                    {missingChemical ? <NeedChemicalHint advice={missingChemical} /> : null}
                  </div>
                )
              }
            />
          ) : null}
        </StepWizard>
      )}
    </div>
  );
}

function amountLine(chemical: Chemical, amount: number, stock: StockCheck) {
  if (amount <= 1e-9) return null;
  return {
    eyebrow: `Use ${chemical.name}`,
    value: `${formatQty(amount)} ${chemical.unit}`,
    detail:
      stock.status === "untracked"
        ? "Stock not tracked"
        : stock.status === "insufficient"
          ? `Only ${formatQty(stock.available ?? 0)} ${chemical.unit} in stock`
          : undefined,
  };
}
