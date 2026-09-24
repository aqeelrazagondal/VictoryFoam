"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { AddPanel } from "@/components/tank/add-panel";
import { useWorkflowChrome } from "@/components/tank/app-shell";
import { CorrectionPanel } from "@/components/tank/correction-panel";
import { DeleteConfirm } from "@/components/tank/delete-confirm";
import { EmptyState } from "@/components/tank/empty-state";
import { OpeningPanel } from "@/components/tank/opening-panel";
import { AddTankButton, NameTankPanel } from "@/components/tank/tank-switcher";
import { buildTankBoard, TankBoard } from "@/components/tank/tank-board";
import { TankSummary } from "@/components/tank/tank-summary";
import { UsePanel } from "@/components/tank/use-panel";
import { Button } from "@/components/ui/button";
import {
  amountsEqual,
  compositionRows,
  encodeAdjustNote,
  formatPct,
  formatQty,
  isHeelBreach,
  roomToCapacity,
  scaleTankTotal,
  snapshotToAmounts,
  type CompositionAmounts,
} from "@/lib/calculations";
import { useTank } from "@/lib/tank/context";
import { parseNumber } from "@/lib/tank/parse";
import { insertLogEntry, TankError } from "@/lib/tank/repository";

type Panel = "home" | "add" | "use" | "correct";

export function HubPage() {
  const {
    loading,
    error,
    chemicals,
    activeChemicals,
    tankReady,
    snapshot,
    settings,
    entries,
    allEntries,
    activeTank,
    tanks,
    refresh,
    selectTank,
  } = useTank();
  const setWorkflow = useWorkflowChrome();
  const [panel, setPanel] = useState<Panel>("home");
  const [notice, setNotice] = useState<string | null>(null);
  const [repeatKg, setRepeatKg] = useState<number | null>(null);
  const repeatApplied = useRef(false);
  const [volumeText, setVolumeText] = useState("");
  const [massDraft, setMassDraft] = useState<CompositionAmounts | null>(null);
  const [massError, setMassError] = useState<string | null>(null);
  const [reviewingMass, setReviewingMass] = useState(false);
  const [savingMass, setSavingMass] = useState(false);
  const [openingTankId, setOpeningTankId] = useState<string | null>(null);

  const names = useMemo(
    () =>
      Object.fromEntries(
        chemicals.map((chemical) => [chemical.id, { name: chemical.name, unit: chemical.unit }]),
      ),
    [chemicals],
  );
  const amounts = useMemo(() => snapshotToAmounts(snapshot), [snapshot]);
  const shown = massDraft ?? amounts;
  const room = settings?.capacity != null ? roomToCapacity(settings.capacity, shown.volume) : null;
  const rows = compositionRows(
    massDraft
      ? {
          ...snapshot,
          volume: massDraft.volume,
          solidPct: massDraft.solidPct,
          remainingByChemical: massDraft.remainingByChemical,
          unattributed: massDraft.unattributed,
          trackedTotal:
            Object.values(massDraft.remainingByChemical).reduce((sum, qty) => sum + qty, 0) +
            massDraft.unattributed,
        }
      : snapshot,
    names,
  ).map((row) => ({
    id: row.id,
    name: row.name,
    amount: row.amount,
  }));
  const massDirty = massDraft != null && !amountsEqual(massDraft, amounts);
  const heel = settings?.heel ?? 0;
  const board = useMemo(
    () => buildTankBoard(tanks, allEntries, activeTank?.id ?? null, entries, names),
    [activeTank?.id, allEntries, entries, names, tanks],
  );
  useEffect(() => {
    if (massDraft) return;
    setVolumeText(formatQty(amounts.volume));
  }, [amounts.volume, massDraft, activeTank?.id]);

  function commitVolume(nextText: string) {
    const parsed = parseNumber(nextText);
    if (parsed === null) {
      setMassError("Enter the total kilograms.");
      setVolumeText(formatQty(shown.volume));
      return;
    }
    const result = scaleTankTotal(amounts, parsed, settings?.capacity ?? null);
    if (!result.ok) {
      setMassError(result.reason);
      setVolumeText(formatQty(shown.volume));
      return;
    }
    setMassError(null);
    setReviewingMass(false);
    if (amountsEqual(result.next, amounts)) {
      setMassDraft(null);
      setVolumeText(formatQty(amounts.volume));
      return;
    }
    setMassDraft(result.next);
    setVolumeText(formatQty(result.next.volume));
  }

  async function saveMass() {
    if (!massDraft || !activeTank || savingMass) return;
    setSavingMass(true);
    setMassError(null);
    try {
      await insertLogEntry(activeTank.id, {
        type: "adjust_composition",
        chemicalId: null,
        quantity: massDraft.volume,
        solidContentPct: massDraft.solidPct,
        note: encodeAdjustNote({
          remainingByChemical: massDraft.remainingByChemical,
          unattributed: massDraft.unattributed,
        }),
      });
      setMassDraft(null);
      setReviewingMass(false);
      await refresh();
      setNotice("Saved the new kilograms on Home.");
    } catch (caught) {
      setMassError(caught instanceof TankError ? caught.message : "Could not save this change.");
    } finally {
      setSavingMass(false);
    }
  }

  useEffect(() => {
    setWorkflow(panel !== "home");
    return () => setWorkflow(false);
  }, [panel, setWorkflow]);

  useEffect(() => {
    const repeat = new URLSearchParams(window.location.search).get("repeat");
    const parsed = repeat == null ? null : Number(repeat);
    if (parsed != null && Number.isFinite(parsed) && parsed > 0) {
      repeatApplied.current = true;
      setRepeatKg(parsed);
      setPanel("use");
      window.history.replaceState(window.history.state, "", "/tank/");
      return;
    }
    if (repeatApplied.current) {
      repeatApplied.current = false;
      return;
    }
    setRepeatKg(null);
    setPanel("home");
  }, [activeTank?.id]);

  useEffect(() => {
    function onPop() {
      setPanel("home");
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  async function openTank(id: string) {
    if (!activeTank || id === activeTank.id || openingTankId) return;
    setOpeningTankId(id);
    setMassDraft(null);
    setMassError(null);
    setReviewingMass(false);
    try {
      await selectTank(id);
    } finally {
      setOpeningTankId(null);
    }
  }

  function openPanel(next: Exclude<Panel, "home">) {
    window.history.pushState({ tankFlow: next }, "");
    setNotice(null);
    setPanel(next);
  }

  function closePanel() {
    const state = window.history.state as { tankFlow?: string } | null;
    if (state?.tankFlow) {
      window.history.back();
      return;
    }
    setPanel("home");
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1>Tank</h1>
        <p className="text-muted-foreground">Loading…</p>
        <div className="h-28 animate-pulse rounded-2xl border border-border bg-muted/40" aria-hidden="true" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1>Tank</h1>
        <p className="text-destructive" role="alert">
          {error}
        </p>
      </div>
    );
  }

  if (!activeTank) return <NameTankPanel />;
  if (tankReady && panel === "add") {
    return (
      <AddPanel
        onCancel={closePanel}
        onDone={(message) => {
          setNotice(message);
          setPanel("home");
        }}
      />
    );
  }
  if (tankReady && panel === "use") {
    return (
      <UsePanel
        initialTotal={repeatKg}
        onCancel={() => {
          setRepeatKg(null);
          closePanel();
        }}
        onDone={(message) => {
          setRepeatKg(null);
          setNotice(message);
          setPanel("home");
        }}
      />
    );
  }
  if (tankReady && panel === "correct") {
    return (
      <CorrectionPanel
        onCancel={closePanel}
        onDone={(message) => {
          setNotice(message);
          setPanel("home");
        }}
      />
    );
  }

  return (
    <div className="space-y-6 pb-4">
      <div>
        <h1>Tanks</h1>
        <p className="mt-2 text-muted-foreground">
          Every tank is listed here. Open one to see its mix. Add, use, and correct apply only to that tank.
        </p>
      </div>

      {notice ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm" role="status">
          {notice}
        </p>
      ) : null}

      <TankBoard items={board} openId={activeTank.id} pendingId={openingTankId} onOpen={(id) => void openTank(id)}>
      {tankReady ? null : <OpeningPanel key={activeTank.id} />}
      {tankReady && isHeelBreach(amounts.volume, heel) ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          The tank is below the heel, the minimum you want left in it. Check the log if that looks
          wrong.
        </p>
      ) : null}

      {tankReady ? (
      <>
      <TankSummary
        volume={shown.volume}
        solidPct={shown.solidPct}
        room={room}
        capacity={settings?.capacity ?? null}
        rows={rows}
        volumeEditable
        volumeText={volumeText}
        onVolumeChange={(value) => {
          setVolumeText(value);
          setMassError(null);
          setReviewingMass(false);
          const parsed = parseNumber(value);
          if (parsed === null) return;
          const result = scaleTankTotal(amounts, parsed, settings?.capacity ?? null);
          if (!result.ok) {
            setMassError(result.reason);
            return;
          }
          setMassDraft(amountsEqual(result.next, amounts) ? null : result.next);
        }}
        onVolumeBlur={() => commitVolume(volumeText)}
        editError={massError}
      />
      {massDirty && reviewingMass ? (
        <DeleteConfirm
          confirmLabel={savingMass ? "Saving…" : "Save correction"}
          confirmVariant="default"
          busy={savingMass}
          onConfirm={() => void saveMass()}
          onCancel={() => setReviewingMass(false)}
        >
          <p>
            This changes the total from {formatQty(amounts.volume)} kg to {formatQty(shown.volume)} kg.
            Every chemical is scaled by the same factor. Solid content stays {formatPct(shown.solidPct)}.
          </p>
        </DeleteConfirm>
      ) : massDirty ? (
        <Button type="button" size="touch" className="w-full" onClick={() => setReviewingMass(true)}>
          Review correction
        </Button>
      ) : null}

      <div className="flex justify-end">
        <Button asChild variant="outline" size="touch">
          <Link href="/tank/composition/">View composition</Link>
        </Button>
      </div>

      {activeChemicals.length === 0 ? (
        <EmptyState
          title="Add a polyol first"
          description="Add a polyol, with a name and a solid content. Then you can add to the tank, fill, or plan a pour."
          actionLabel="Add a polyol"
          actionHref="/tank/chemicals/"
        />
      ) : (
        <div className="space-y-3">
          <Button size="touch" className="w-full" onClick={() => openPanel("add")}>
            Add to the tank
          </Button>
          <p className="text-sm text-muted-foreground">
            Pour drums in. When you confirm, those kilograms leave Inventory.
          </p>
          <Button size="touch" variant="secondary" className="w-full" onClick={() => openPanel("use")}>
            Record usage
          </Button>
          <p className="text-sm text-muted-foreground">
            After a job. Each chemical drops by the same share. Shelf stock stays as it is.
          </p>
        </div>
      )}

      <Button type="button" variant="outline" size="touch" className="w-full" onClick={() => openPanel("correct")}>
        Correct tank readings
      </Button>
      </>
      ) : null}
      </TankBoard>
      <AddTankButton />
    </div>
  );
}
