"use client";

import { EmptyState } from "@/components/tank/empty-state";
import {
  compositionRows,
  formatPct,
  formatQty,
  hasReconciliationGap,
} from "@/lib/calculations";
import { useTank } from "@/lib/tank/context";

export function CompositionPage() {
  const { tankReady, snapshot, chemicals } = useTank();

  if (!tankReady) {
    return (
      <div className="space-y-4">
        <h1>Tank composition</h1>
        <EmptyState
          title="Set up your tank first"
          description="Kilograms of each chemical, taken from the tank log. Set the tank up first."
          actionLabel="Set up tank"
          actionHref="/tank/setup/"
        />
      </div>
    );
  }

  const names = Object.fromEntries(
    chemicals.map((chemical) => [chemical.id, { name: chemical.name, unit: chemical.unit }]),
  );
  const rows = compositionRows(snapshot, names);
  const gap = hasReconciliationGap(snapshot) || snapshot.unattributed !== 0;
  const shareTotal = rows.reduce((sum, row) => sum + row.pctOfTank, 0);
  const solidsById = Object.fromEntries(chemicals.map((chemical) => [chemical.id, chemical.solidContentPct]));

  return (
    <div className="space-y-5 pb-10">
      <h1>Tank composition</h1>
      <p className="text-muted-foreground">
        Kilograms of each chemical still in the tank. To change a number, use Correct tank readings
        on Tank.
      </p>
      <p className="tank-metric">{formatQty(snapshot.volume)} kg</p>
      {snapshot.volume > 0 && rows.length > 0 ? (
        <div className="flex h-3 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          {rows.map((row) => (
            <div
              key={row.id}
              className="h-full bg-primary/80 odd:bg-primary/40"
              style={{ width: `${row.pctOfTank}%` }}
            />
          ))}
        </div>
      ) : null}
      {snapshot.volume > 0 && Math.abs(shareTotal - 100) > 0.05 ? (
        <p className="text-sm text-muted-foreground">
          Displayed shares can miss 100% because each share is rounded.
        </p>
      ) : null}
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="rounded-2xl border border-border bg-card p-4">
            <p className="font-heading text-lg font-semibold">{row.name}</p>
            <p className="tank-metric mt-2">{formatQty(row.amount)} kg</p>
            <p className="text-sm text-muted-foreground">Share of tank mass {formatPct(row.pctOfTank)}</p>
            {row.id !== "unattributed" && solidsById[row.id] != null ? (
              <p className="text-sm text-muted-foreground">Solid content {formatPct(solidsById[row.id])}</p>
            ) : null}
          </li>
        ))}
      </ul>
      {gap ? (
        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          <h2 className="font-heading text-base font-semibold">Reconciliation</h2>
          <p className="mt-2">
            Tracked total {formatQty(snapshot.trackedTotal)} kg vs actual tank{" "}
            {formatQty(snapshot.volume)} kg. Unattributed volume is included in the tank total but
            is not assigned to a named chemical.
          </p>
        </section>
      ) : null}
    </div>
  );
}
