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

  return (
    <div className="space-y-5 pb-10">
      <h1>Tank composition</h1>
      <p className="text-muted-foreground">
        Kilograms of each chemical still in the tank. This follows the log. To change a number, go
        back to Home.
      </p>
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="rounded-2xl border border-border bg-card p-4">
            <p className="font-heading text-lg font-semibold">{row.name}</p>
            <p className="hero-number mt-2 text-3xl">{formatQty(row.amount)}</p>
            <p className="text-sm text-muted-foreground">
              {row.unit} · {formatPct(row.pctOfTank)} of the tank
            </p>
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
