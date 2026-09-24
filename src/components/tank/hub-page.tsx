"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AddPanel } from "@/components/tank/add-panel";
import { useWorkflowChrome } from "@/components/tank/app-shell";
import { CorrectionPanel } from "@/components/tank/correction-panel";
import { DeleteConfirm } from "@/components/tank/delete-confirm";
import { EmptyState, TankLoading } from "@/components/tank/empty-state";
import { OpeningPanel } from "@/components/tank/opening-panel";
import { ScreenHeading } from "@/components/tank/screen-help";
import { TankContextNav } from "@/components/tank/tank-context-nav";
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
import { TankError } from "@/lib/tank/repository";

type Panel = "home" | "add" | "use" | "correct";

export function HubPage() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    loading,
    chemicals,
    activeChemicals,
    tankReady,
    snapshot,
    settings,
    overviews,
    activeTank,
    tanks,
    persistLogEntry,
    selectTank,
  } = useTank();
  const setWorkflow = useWorkflowChrome();
  const panel: Panel = pathname.includes("/tank/add")
    ? "add"
    : pathname.includes("/tank/use")
      ? "use"
      : pathname.includes("/tank/correct")
        ? "correct"
        : "home";
  const [notice, setNotice] = useState<string | null>(null);
  const [repeatKg, setRepeatKg] = useState<number | null>(null);
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
    () => buildTankBoard(tanks, [], activeTank?.id ?? null, [], names, overviews),
    [activeTank?.id, names, overviews, tanks],
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
      await persistLogEntry(activeTank.id, {
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
    if (!pathname.includes("/tank/use")) {
      setRepeatKg(null);
      return;
    }
    const raw = new URLSearchParams(window.location.search).get("repeat");
    const parsed = raw == null ? null : Number(raw);
    setRepeatKg(parsed != null && Number.isFinite(parsed) && parsed > 0 ? parsed : null);
  }, [pathname]);

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

  function goHome() {
    setNotice(null);
    router.push("/tank/");
  }

  if (loading) {
    return <TankLoading title="Tank" />;
  }

  if (!activeTank) return <NameTankPanel />;
  if (panel !== "home" && !tankReady) {
    const title = panel === "add" ? "Add to the tank" : panel === "use" ? "Record usage" : "Correct tank readings";
    return (
      <div className="space-y-4">
        <ScreenHeading title={title}>
          Add, use, and correct need an opening amount on this tank first.
        </ScreenHeading>
        <EmptyState title="Set the opening on Home" actionLabel="Open tank" actionHref="/tank/" />
      </div>
    );
  }
  if (tankReady && panel === "add") {
    return (
      <AddPanel
        onCancel={goHome}
        onDone={(message) => {
          setNotice(message);
          goHome();
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
          goHome();
        }}
        onDone={(message) => {
          setRepeatKg(null);
          setNotice(message);
          goHome();
        }}
      />
    );
  }
  if (tankReady && panel === "correct") {
    return (
      <CorrectionPanel
        onCancel={goHome}
        onDone={(message) => {
          setNotice(message);
          goHome();
        }}
      />
    );
  }

  return (
    <div className="space-y-6 pb-4">
      <div>
        <ScreenHeading title="Tanks">
          <p>Every tank is listed here. Open one to see its mix. Add, use, and correct apply only to that tank.</p>
          <p>Pour drums in. When you confirm, those kilograms leave Inventory.</p>
          <p>After a job, record usage. Each chemical drops by the same share. Shelf stock stays as it is.</p>
          <p>Add a polyol, with a name and a solid content, before you add to the tank, fill, or plan a pour.</p>
        </ScreenHeading>
        <div className="mt-3">
          <TankContextNav current="tank" />
        </div>
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
        <EmptyState title="Add a polyol first" actionLabel="Add a polyol" actionHref="/tank/chemicals/" />
      ) : (
        <div className="space-y-3">
          <Button size="touch" className="w-full" asChild>
            <Link href="/tank/add/">Add to the tank</Link>
          </Button>
          <Button size="touch" variant="secondary" className="w-full" asChild>
            <Link href="/tank/use/">Record usage</Link>
          </Button>
        </div>
      )}

      <Button type="button" variant="outline" size="touch" className="w-full" asChild>
        <Link href="/tank/correct/">Correct tank readings</Link>
      </Button>
      </>
      ) : null}
      </TankBoard>
      <AddTankButton />
    </div>
  );
}
