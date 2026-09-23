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
      <div className="overflow-x-auto">
        <table className="w-full min-w-[20rem] text-left text-sm">
          <thead>
            <tr className="text-muted-foreground">
              <th className="pb-2 font-medium">Polyol</th>
              <th className="pb-2 font-medium">Before</th>
              <th className="pb-2 font-medium">Used</th>
              <th className="pb-2 font-medium">Remaining</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.rows.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="py-2 font-medium">
                  {row.id === "unattributed" ? "Unattributed" : (names[row.id]?.name ?? "Unknown")}
                </td>
                <td className="py-2">{formatQty(row.before)} kg</td>
                <td className="py-2">{formatQty(row.used)} kg</td>
                <td className="py-2">{formatQty(row.remaining)} kg</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
