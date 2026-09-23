"use client";

import { formatPct, formatQty, type ConsumeBreakdown } from "@/lib/calculations";

export function ConsumptionTable({
  breakdown,
  names,
}: {
  breakdown: Extract<ConsumeBreakdown, { ok: true }>;
  names: Record<string, { name: string }>;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="font-heading text-base font-semibold">Consumption of each polyol</h2>
      <p className="text-sm text-muted-foreground">
        Remaining {formatQty(breakdown.leftoverVolume)} kg is still {formatPct(breakdown.leftoverPct)}{" "}
        because you withdraw a uniform mixture.
      </p>
      <ul className="space-y-3">
        {breakdown.rows.map((row) => (
          <li key={row.id} className="rounded-xl border border-border px-3 py-3 text-sm">
            <p className="font-medium">
              {row.id === "unattributed" ? "Unattributed" : (names[row.id]?.name ?? "Unknown")}
            </p>
            <dl className="mt-2 grid grid-cols-3 gap-2">
              <div>
                <dt className="text-muted-foreground">Before</dt>
                <dd className="tabular-nums">{formatQty(row.before)} kg</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Used</dt>
                <dd className="tabular-nums">{formatQty(row.used)} kg</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Remaining</dt>
                <dd className="tabular-nums">{formatQty(row.remaining)} kg</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
