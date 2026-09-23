"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AddPanel } from "@/components/tank/add-panel";
import { useWorkflowChrome } from "@/components/tank/app-shell";
import { CorrectionPanel } from "@/components/tank/correction-panel";
import { EmptyState } from "@/components/tank/empty-state";
import { OpeningPanel } from "@/components/tank/opening-panel";
import { NameTankPanel } from "@/components/tank/tank-switcher";
import { TankSummary } from "@/components/tank/tank-summary";
import { UsePanel } from "@/components/tank/use-panel";
import { Button } from "@/components/ui/button";
import {
  compositionRows,
  formatLogWhen,
  isHeelBreach,
  roomToCapacity,
  snapshotToAmounts,
} from "@/lib/calculations";
import { useTank } from "@/lib/tank/context";

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
    activeTank,
  } = useTank();
  const setWorkflow = useWorkflowChrome();
  const [panel, setPanel] = useState<Panel>("home");
  const [notice, setNotice] = useState<string | null>(null);

  const names = useMemo(
    () =>
      Object.fromEntries(
        chemicals.map((chemical) => [chemical.id, { name: chemical.name, unit: chemical.unit }]),
      ),
    [chemicals],
  );
  const amounts = useMemo(() => snapshotToAmounts(snapshot), [snapshot]);
  const room = settings?.capacity != null ? roomToCapacity(settings.capacity, amounts.volume) : null;
  const rows = compositionRows(snapshot, names).map((row) => ({
    id: row.id,
    name: row.name,
    amount: row.amount,
  }));
  const heel = settings?.heel ?? 0;
  const latest = useMemo(() => {
    const stamped = entries.filter((entry) => entry.createdAt || entry.entryDate);
    if (stamped.length === 0) return null;
    return [...stamped].sort((a, b) => {
      const aTime = a.createdAt ?? a.entryDate ?? "";
      const bTime = b.createdAt ?? b.entryDate ?? "";
      return aTime < bTime ? 1 : -1;
    })[0];
  }, [entries]);
  const updated = latest ? formatLogWhen(latest.entryDate, latest.createdAt) : null;

  useEffect(() => {
    setWorkflow(panel !== "home");
    return () => setWorkflow(false);
  }, [panel, setWorkflow]);

  useEffect(() => {
    setPanel("home");
  }, [activeTank?.id]);

  useEffect(() => {
    function onPop() {
      setPanel("home");
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

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
  if (!tankReady) return <OpeningPanel key={activeTank.id} />;
  if (panel === "add") {
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
  if (panel === "use") {
    return (
      <UsePanel
        onCancel={closePanel}
        onDone={(message) => {
          setNotice(message);
          setPanel("home");
        }}
      />
    );
  }
  if (panel === "correct") {
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
        <h1>{activeTank.name}</h1>
        <p className="mt-2 text-muted-foreground">View the tank, add chemicals or record usage.</p>
        {updated ? <p className="mt-1 text-sm text-muted-foreground">Updated {updated}</p> : null}
      </div>

      {notice ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm" role="status">
          {notice}
        </p>
      ) : null}
      {isHeelBreach(amounts.volume, heel) ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          The tank is below the heel, the minimum you want left in it. Check the log if that looks
          wrong.
        </p>
      ) : null}

      <TankSummary
        volume={amounts.volume}
        solidPct={amounts.solidPct}
        room={room}
        capacity={settings?.capacity ?? null}
        rows={rows}
      />

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
    </div>
  );
}
