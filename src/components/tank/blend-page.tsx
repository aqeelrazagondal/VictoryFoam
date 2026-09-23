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
import {
  formatPct,
  formatQty,
  blendMissingChemical,
  solveBlendWithStock,
  suggestBlendAlternatives,
  type BlendApply,
} from "@/lib/calculations";
import { useTank } from "@/lib/tank/context";
import type { BlendLastCalculation, Chemical } from "@/lib/tank/models";
import { toChemicalRef } from "@/lib/tank/models";
import { parseNumber } from "@/lib/tank/parse";
import { getLastCalculation, saveLastCalculation } from "@/lib/tank/repository";

export function BlendPage() {
  const { activeChemicals } = useTank();
  const [step, setStep] = useState(0);
  const [chem1, setChem1] = useState<Chemical | null>(null);
  const [chem2, setChem2] = useState<Chemical | null>(null);
  const [sameError, setSameError] = useState<string | null>(null);
  const [targetPct, setTargetPct] = useState("");
  const [targetQty, setTargetQty] = useState("");
  const [last, setLast] = useState<BlendLastCalculation | null>(null);

  useEffect(() => {
    getLastCalculation("blend")
      .then((payload) => setLast(payload as BlendLastCalculation | null))
      .catch(() => undefined);
  }, []);

  const qty = parseNumber(targetQty);
  const pct = parseNumber(targetPct);
  const result = useMemo(() => {
    if (!chem1 || !chem2 || pct === null || qty === null || !(qty > 0)) return null;
    return solveBlendWithStock(
      {
        q1: chem1.solidContentPct,
        q2: chem2.solidContentPct,
        targetPct: pct,
        targetQty: qty,
      },
      { qty1: chem1.qtyAvailable, qty2: chem2.qtyAvailable },
    );
  }, [chem1, chem2, pct, qty]);

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
    setStep(4);
  }

  useEffect(() => {
    if (!result?.ok || !chem1 || !chem2 || pct === null || qty === null) return;
    void saveLastCalculation("blend", {
      chemical1Id: chem1.id,
      chemical2Id: chem2.id,
      targetPct: pct,
      targetQty: qty,
    });
  }, [chem1, chem2, pct, qty, result]);

  function continueLast() {
    if (!last) return;
    const first = activeChemicals.find((chemical) => chemical.id === last.chemical1Id) ?? null;
    const second = activeChemicals.find((chemical) => chemical.id === last.chemical2Id) ?? null;
    setChem1(first);
    setChem2(second);
    setTargetPct(String(last.targetPct));
    setTargetQty(String(last.targetQty));
    setStep(first && second ? 4 : 0);
    setLast(null);
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
        Mix a fresh batch from two chemicals. No tank involved. To raise or lower the last tank to a
        target % such as 53%, use{" "}
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
                disabled={qty === null || !(qty > 0)}
                onClick={() => setStep(4)}
              >
                See result
              </Button>
            </Field>
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
                      result.amounts.x1 > 1e-9
                        ? {
                            eyebrow: `Use ${chem1.name}`,
                            value: `${formatQty(result.amounts.x1)} ${chem1.unit}`,
                            detail:
                              result.stock.chemical1.status === "untracked"
                                ? "Stock not tracked"
                                : result.stock.chemical1.status === "insufficient"
                                  ? `Only ${formatQty(result.stock.chemical1.available ?? 0)} ${chem1.unit} in stock`
                                  : undefined,
                          }
                        : null,
                      result.amounts.x2 > 1e-9
                        ? {
                            eyebrow: `Use ${chem2.name}`,
                            value: `${formatQty(result.amounts.x2)} ${chem2.unit}`,
                            detail:
                              result.stock.chemical2.status === "untracked"
                                ? "Stock not tracked"
                                : result.stock.chemical2.status === "insufficient"
                                  ? `Only ${formatQty(result.stock.chemical2.available ?? 0)} ${chem2.unit} in stock`
                                  : undefined,
                          }
                        : null,
                    ].filter((line) => line !== null)
                  : []
              }
              footer={
                !result.ok ? (
                  <div className="space-y-4">
                    <SuggestionList alternatives={alternatives} onSelect={applyBlendAlternative} />
                    {missingChemical ? <NeedChemicalHint advice={missingChemical} /> : null}
                  </div>
                ) : null
              }
            />
          ) : null}
        </StepWizard>
      )}
    </div>
  );
}
