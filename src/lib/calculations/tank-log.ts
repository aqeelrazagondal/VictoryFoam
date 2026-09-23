import { CALC_EPS } from "./format.ts";
import type { LogEntryType } from "./types.ts";

export type LogEntryInput = {
  id: string;
  type: LogEntryType;
  chemicalId: string | null;
  quantity: number;
  solidContentPct: number | null;
};

export type RunningEntry = LogEntryInput & {
  runningVolume: number;
  runningPct: number;
  remainingByChemical: Record<string, number>;
  unattributed: number;
};

export type ReplayError = {
  entryId: string;
  reason: string;
};

export type TankSnapshot = {
  volume: number;
  solidPct: number;
  remainingByChemical: Record<string, number>;
  unattributed: number;
  trackedTotal: number;
  entries: RunningEntry[];
  errors: ReplayError[];
  hasOpeningBalance: boolean;
};

function scaleRemainings(
  remaining: Record<string, number>,
  unattributed: number,
  factor: number,
) {
  const next: Record<string, number> = {};
  for (const [id, amount] of Object.entries(remaining)) {
    next[id] = amount * factor;
  }
  return { remaining: next, unattributed: unattributed * factor };
}

export function replayLog(entries: LogEntryInput[]): TankSnapshot {
  let volume = 0;
  let solidPct = 0;
  let remaining: Record<string, number> = {};
  let unattributed = 0;
  const running: RunningEntry[] = [];
  const errors: ReplayError[] = [];

  entries.forEach((entry, index) => {
    if (index === 0 && entry.type !== "opening_balance") {
      errors.push({
        entryId: entry.id,
        reason: "The first entry must be an Opening Balance.",
      });
    }
    if (index > 0 && entry.type === "opening_balance") {
      errors.push({
        entryId: entry.id,
        reason: "Opening Balance can only be the first entry.",
      });
    }

    if (entry.type === "opening_balance" || entry.type === "add_batch") {
      const pct = entry.solidContentPct ?? 0;
      const newVolume = volume + entry.quantity;
      solidPct =
        newVolume === 0 ? 0 : (volume * solidPct + entry.quantity * pct) / newVolume;
      volume = newVolume;
      if (entry.chemicalId) {
        remaining = {
          ...remaining,
          [entry.chemicalId]: (remaining[entry.chemicalId] ?? 0) + entry.quantity,
        };
      } else {
        unattributed += entry.quantity;
      }
    } else if (entry.quantity > volume + CALC_EPS) {
      errors.push({
        entryId: entry.id,
        reason: "Cannot consume more than the current tank volume.",
      });
    } else if (volume > CALC_EPS) {
      const factor = 1 - entry.quantity / volume;
      const scaled = scaleRemainings(remaining, unattributed, factor);
      remaining = scaled.remaining;
      unattributed = scaled.unattributed;
      volume -= entry.quantity;
    }

    running.push({
      ...entry,
      runningVolume: volume,
      runningPct: solidPct,
      remainingByChemical: { ...remaining },
      unattributed,
    });
  });

  const trackedChemicals = Object.values(remaining).reduce((sum, qty) => sum + qty, 0);

  return {
    volume,
    solidPct,
    remainingByChemical: remaining,
    unattributed,
    trackedTotal: trackedChemicals + unattributed,
    entries: running,
    errors,
    hasOpeningBalance: entries[0]?.type === "opening_balance",
  };
}

export function canConsume(currentVolume: number, quantity: number) {
  return quantity <= currentVolume + CALC_EPS;
}

export type ConsumptionRow = {
  id: string;
  before: number;
  used: number;
  remaining: number;
};

export type ConsumeBreakdown =
  | { ok: false; reason: string; rows: [] }
  | {
      ok: true;
      reason: null;
      consumeQty: number;
      leftoverVolume: number;
      leftoverPct: number;
      rows: ConsumptionRow[];
    };

export function consumeBreakdown(input: {
  volume: number;
  solidPct: number;
  remainingByChemical: Record<string, number>;
  unattributed: number;
  consumeQty: number;
}): ConsumeBreakdown {
  if (!(input.consumeQty > 0)) {
    return { ok: false, reason: "Enter a quantity greater than 0.", rows: [] };
  }
  if (!canConsume(input.volume, input.consumeQty)) {
    return { ok: false, reason: "Cannot consume more than the current tank volume.", rows: [] };
  }
  if (!(input.volume > CALC_EPS)) {
    return { ok: false, reason: "The tank is empty.", rows: [] };
  }

  const factor = input.consumeQty / input.volume;
  const rows: ConsumptionRow[] = Object.entries(input.remainingByChemical).map(([id, before]) => ({
    id,
    before,
    used: before * factor,
    remaining: before * (1 - factor),
  }));
  if (Math.abs(input.unattributed) > CALC_EPS) {
    rows.push({
      id: "unattributed",
      before: input.unattributed,
      used: input.unattributed * factor,
      remaining: input.unattributed * (1 - factor),
    });
  }
  rows.sort((left, right) => right.before - left.before);

  return {
    ok: true,
    reason: null,
    consumeQty: input.consumeQty,
    leftoverVolume: input.volume - input.consumeQty,
    leftoverPct: input.solidPct,
    rows,
  };
}

export function isHeelBreach(volume: number, heel: number) {
  return heel > 0 && volume + CALC_EPS < heel;
}

export function drawableNow(volume: number, heel: number) {
  return Math.max(0, volume - heel);
}

export function compositionRows(
  snapshot: TankSnapshot,
  names: Record<string, { name: string; unit: string }>,
) {
  const rows = Object.entries(snapshot.remainingByChemical).map(([id, amount]) => ({
    id,
    name: names[id]?.name ?? "Unknown chemical",
    unit: names[id]?.unit ?? "kg",
    amount,
    pctOfTank: snapshot.volume > 0 ? (amount / snapshot.volume) * 100 : 0,
  }));

  if (Math.abs(snapshot.unattributed) > 1e-9) {
    rows.push({
      id: "unattributed",
      name: "Unattributed",
      unit: "kg",
      amount: snapshot.unattributed,
      pctOfTank:
        snapshot.volume > 0 ? (snapshot.unattributed / snapshot.volume) * 100 : 0,
    });
  }

  return rows.sort((a, b) => b.amount - a.amount);
}

export function hasReconciliationGap(snapshot: TankSnapshot) {
  return Math.abs(snapshot.trackedTotal - snapshot.volume) > 0.05;
}
