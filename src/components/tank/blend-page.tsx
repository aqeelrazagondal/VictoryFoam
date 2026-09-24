"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { ChemicalPicker } from "@/components/tank/chemical-picker";
import { EmptyState, Field, TankLoading } from "@/components/tank/empty-state";
import { ScreenHeading } from "@/components/tank/screen-help";
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
import { trackEvent } from "@/lib/analytics";
import { useTank } from "@/lib/tank/context";
import {
  clearJsonDraft,
  draftStorageKey,
  parseBlendDraft,
  readJsonDraft,
  writeJsonDraft,
} from "@/lib/tank/drafts";
import type { BlendLastCalculation, Chemical } from "@/lib/tank/models";
import { toChemicalRef } from "@/lib/tank/models";
import { parseNumber } from "@/lib/tank/parse";
import { getLastCalculation, saveLastCalculation, TankError } from "@/lib/tank/repository";

export function BlendPage() {
  const { activeChemicals, activeTank, persistStock, loading } = useTank();
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
  const [lastError, setLastError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordedKey, setRecordedKey] = useState<string | null>(null);
  const [usedMessage, setUsedMessage] = useState<string | null>(null);
  const [usedError, setUsedError] = useState<string | null>(null);
  const tankId = activeTank?.id ?? null;
  const tankAtCalc = useRef(tankId);

  useEffect(() => {
    if (!tankId) {
      setLast(null);
      return;
    }
    let cancelled = false;
    getLastCalculation(tankId, "blend")
      .then((payload) => {
        if (!cancelled) {
          setLast(payload && "chemical1Id" in payload ? payload : null);
          setLastError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setLastError("Could not load the last blend.");
      });
    return () => {
      cancelled = true;
    };
  }, [tankId]);

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
    if (tankAtCalc.current !== tankId) {
      const previous = tankAtCalc.current;
      tankAtCalc.current = tankId;
      if (previous !== null) {
        const draft = tankId ? readJsonDraft(draftStorageKey("blend", tankId), parseBlendDraft) : null;
        setChem1(draft ? activeChemicals.find((chemical) => chemical.id === draft.chem1Id) ?? null : null);
        setChem2(draft ? activeChemicals.find((chemical) => chemical.id === draft.chem2Id) ?? null : null);
        setChem3(draft ? activeChemicals.find((chemical) => chemical.id === draft.chem3Id) ?? null : null);
        setShowThird(draft?.showThird ?? false);
        setThirdQty(draft?.thirdQty ?? "");
        setTargetPct(draft?.targetPct ?? "");
        setTargetQty(draft?.targetQty ?? "");
        setStep(draft?.step ?? 0);
        return;
      }
      if (tankId) {
        const draft = readJsonDraft(draftStorageKey("blend", tankId), parseBlendDraft);
        if (draft) {
          setChem1(activeChemicals.find((chemical) => chemical.id === draft.chem1Id) ?? null);
          setChem2(activeChemicals.find((chemical) => chemical.id === draft.chem2Id) ?? null);
          setChem3(activeChemicals.find((chemical) => chemical.id === draft.chem3Id) ?? null);
          setShowThird(draft.showThird);
          setThirdQty(draft.thirdQty);
          setTargetPct(draft.targetPct);
          setTargetQty(draft.targetQty);
          setStep(draft.step);
        }
      }
    }
    if (!tankId || !result?.ok || !chem1 || !chem2 || pct === null || qty === null) return;
    void saveLastCalculation(tankId, "blend", {
      chemical1Id: chem1.id,
      chemical2Id: chem2.id,
      chemical3Id: usingThird && chem3 ? chem3.id : null,
      thirdQty: usingThird && lockedThird !== null ? lockedThird : null,
      targetPct: pct,
      targetQty: qty,
    }).catch(() => {
      setLastError("Could not remember this blend.");
    });
  }, [activeChemicals, tankId, chem1, chem2, chem3, lockedThird, pct, qty, result, usingThird]);

  useEffect(() => {
    if (!tankId) return;
    writeJsonDraft(draftStorageKey("blend", tankId), {
      step,
      chem1Id: chem1?.id ?? null,
      chem2Id: chem2?.id ?? null,
      chem3Id: chem3?.id ?? null,
      targetPct,
      targetQty,
      thirdQty,
      showThird,
    });
  }, [chem1?.id, chem2?.id, chem3?.id, showThird, step, tankId, targetPct, targetQty, thirdQty]);

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
    if (!result?.ok || !result.amounts || !chem1 || !chem2 || !useKey || recording) return;
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
      await persistStock(
        lines.map((line) => ({
          chemicalId: line.chemical.id,
          input: {
            type: "issue" as const,
            quantity: line.quantity,
            note: "Blend",
          },
        })),
      );
      trackEvent("tank_pour_confirm", { surface: "blend" });
      setRecordedKey(useKey);
      setUsedMessage("Taken off the shelf. The tank was not filled.");
      if (tankId) clearJsonDraft(draftStorageKey("blend", tankId));
    } catch (caught) {
      setUsedError(caught instanceof TankError ? caught.message : "Could not record this blend.");
      trackEvent("tank_save_fail", { surface: "blend" });
    } finally {
      setRecording(false);
    }
  }

  if (loading) {
    return <TankLoading title="Blend calculator" />;
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
      <ScreenHeading title="Blend calculator">
        <p>
          Mix a fresh batch in a drum or mixer. This does not change the tank. Take this off the shelf
          when those drums are gone. To change what is already in the tank, go back to Home. To try
          one chemical first, use{" "}
          <Link href="/tank/planner/" className="font-medium text-primary underline-offset-4 hover:underline">
            Tank Planner
          </Link>
          .
        </p>
        <p>Blend Calculator needs at least two chemicals in the library.</p>
      </ScreenHeading>

      {lastError ? (
        <p className="text-sm text-destructive" role="alert">
          {lastError}
        </p>
      ) : null}

      {last && step === 0 ? (
        <Button variant="secondary" size="touch" onClick={continueLast}>
          Continue with your last blend
        </Button>
      ) : null}

      {activeChemicals.length === 0 ? (
        <EmptyState title="Add your first chemical" actionLabel="Add chemical" actionHref="/tank/chemicals/" />
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
                      Reduces shelf stock. Does not change the tank.
                    </p>
                    <Button
                      size="touch"
                      className="w-full"
                      disabled={recording || recordedKey === useKey}
                      onClick={() => void recordUsed()}
                    >
                      {recording ? "Saving…" : recordedKey === useKey ? "Recorded" : "Record inventory use"}
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
