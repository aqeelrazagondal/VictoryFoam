"use client";

import { useMemo, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import {
  compositionRows,
  formatLogWhen,
  formatPct,
  formatQty,
  isHeelBreach,
  replayLog,
  snapshotToAmounts,
} from "@/lib/calculations";
import type { Tank, TankLogEntry } from "@/lib/tank/models";

export type TankBoardItem = {
  tank: Tank;
  ready: boolean;
  volume: number;
  solidPct: number;
  rows: { id: string; name: string; amount: number }[];
  updated: string | null;
  belowHeel: boolean;
};

export function buildTankBoard(
  tanks: Tank[],
  allEntries: TankLogEntry[],
  activeTankId: string | null,
  activeEntries: TankLogEntry[],
  names: Record<string, { name: string; unit: string }>,
): TankBoardItem[] {
  return tanks.map((tank) => {
    const source = tank.id === activeTankId ? activeEntries : allEntries.filter((entry) => entry.tankId === tank.id);
    const snapshot = replayLog(
      source.map((entry) => ({
        id: entry.id,
        type: entry.type,
        chemicalId: entry.chemicalId,
        quantity: entry.quantity,
        solidContentPct: entry.solidContentPct,
        note: entry.note,
      })),
    );
    const amounts = snapshotToAmounts(snapshot);
    const latest = [...source].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
    return {
      tank,
      ready: snapshot.hasOpeningBalance,
      volume: amounts.volume,
      solidPct: amounts.solidPct,
      rows: compositionRows(snapshot, names).map((row) => ({
        id: row.id,
        name: row.name,
        amount: row.amount,
      })),
      updated: latest ? formatLogWhen(latest.entryDate, latest.createdAt) : null,
      belowHeel: isHeelBreach(amounts.volume, tank.heel),
    };
  });
}

export function TankBoard({
  items,
  openId,
  pendingId,
  onOpen,
  children,
}: {
  items: TankBoardItem[];
  openId: string;
  pendingId: string | null;
  onOpen: (id: string) => void;
  children: ReactNode;
}) {
  const countLabel = useMemo(
    () => (items.length === 1 ? "1 tank" : `${items.length} tanks`),
    [items.length],
  );

  return (
    <section className="space-y-3" aria-labelledby="tank-board-heading">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="tank-board-heading" className="text-sm font-medium text-muted-foreground">
          {countLabel}
        </h2>
      </div>
      <ul className="space-y-3">
        {items.map((item) => {
          const open = item.tank.id === openId;
          const preview = item.rows.slice(0, 3);
          const hidden = item.rows.length - preview.length;
          return (
            <li
              key={item.tank.id}
              className={cn(
                "rounded-2xl border bg-card",
                open ? "border-primary" : "border-border",
              )}
            >
              <button
                type="button"
                className="flex w-full flex-col gap-2 rounded-2xl px-4 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-expanded={open}
                aria-controls={`tank-detail-${item.tank.id}`}
                disabled={pendingId != null}
                onClick={() => onOpen(item.tank.id)}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="font-heading text-lg font-semibold leading-tight">{item.tank.name}</span>
                  <span className="shrink-0 text-sm font-medium tabular-nums">
                    {item.ready ? `${formatQty(item.volume)} kg` : "Not set up"}
                  </span>
                </span>
                {item.ready ? (
                  <span className="text-sm text-muted-foreground">
                    {formatPct(item.solidPct)} solid
                    {item.tank.capacity != null && item.tank.capacity > 0
                      ? ` · ${formatQty(item.volume)} of ${formatQty(item.tank.capacity)} kg`
                      : ""}
                    {item.updated ? ` · updated ${item.updated}` : ""}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Record what is already in this tank before adding or using it.
                  </span>
                )}
                {item.belowHeel ? (
                  <span className="text-sm text-amber-700 dark:text-amber-300">Below the heel.</span>
                ) : null}
                {!open && preview.length > 0 ? (
                  <span className="text-sm">
                    {preview.map((row) => `${row.name} ${formatQty(row.amount)} kg`).join(" · ")}
                    {hidden > 0 ? ` · ${hidden} more` : ""}
                  </span>
                ) : null}
              </button>
              {open ? (
                <div id={`tank-detail-${item.tank.id}`} className="space-y-4 border-t border-border px-4 py-4">
                  {item.tank.heel > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Heel {formatQty(item.tank.heel)} kg. That is the minimum to leave in this tank.
                    </p>
                  ) : null}
                  {children}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
