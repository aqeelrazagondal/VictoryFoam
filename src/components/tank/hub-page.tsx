"use client";

import { useState } from "react";

import { AddPanel } from "@/components/tank/add-panel";
import { EmptyState } from "@/components/tank/empty-state";
import { OpeningPanel } from "@/components/tank/opening-panel";
import { TankSummary } from "@/components/tank/tank-summary";
import { UsePanel } from "@/components/tank/use-panel";
import { Button } from "@/components/ui/button";
import { compositionRows, isHeelBreach, roomToCapacity } from "@/lib/calculations";
import { useTank } from "@/lib/tank/context";

export function HubPage() {
  const { loading, error, chemicals, activeChemicals, tankReady, snapshot, settings } = useTank();
  const [panel, setPanel] = useState<"home" | "add" | "use">("home");
  const [notice, setNotice] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-4">
        <h1>Tank</h1>
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1>Tank</h1>
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (!tankReady) return <OpeningPanel />;
  if (panel === "add") {
    return (
      <AddPanel
        onCancel={() => setPanel("home")}
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
        onCancel={() => setPanel("home")}
        onDone={(message) => {
          setNotice(message);
          setPanel("home");
        }}
      />
    );
  }

  const room = settings?.capacity != null ? roomToCapacity(settings.capacity, snapshot.volume) : null;
  const names = Object.fromEntries(
    chemicals.map((chemical) => [chemical.id, { name: chemical.name, unit: chemical.unit }]),
  );
  const rows = compositionRows(snapshot, names).map((row) => ({
    id: row.id,
    name: row.name,
    amount: row.amount,
  }));
  const heel = settings?.heel ?? 0;

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1>Tank</h1>
        <p className="mt-2 text-muted-foreground">
          Add chemical up to the tank size, or record what you used.
        </p>
      </div>

      {notice ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">{notice}</p>
      ) : null}
      {isHeelBreach(snapshot.volume, heel) ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          Running volume is below the heel. Check the log.
        </p>
      ) : null}

      <TankSummary volume={snapshot.volume} solidPct={snapshot.solidPct} room={room} rows={rows} />

      <div className="grid gap-3">
        {activeChemicals.length === 0 ? (
          <EmptyState
            title="Add a polyol first"
            description="Add a polyol, with a name and a solid content. Then you can add to the tank, fill, or plan a pour."
            actionLabel="Add a polyol"
            actionHref="/tank/chemicals/"
          />
        ) : (
          <Button size="touch" className="w-full" onClick={() => { setNotice(null); setPanel("add"); }}>
            Add to the tank
          </Button>
        )}
        <Button
          size="touch"
          variant="secondary"
          className="w-full"
          onClick={() => { setNotice(null); setPanel("use"); }}
        >
          I used some
        </Button>
      </div>
    </div>
  );
}
