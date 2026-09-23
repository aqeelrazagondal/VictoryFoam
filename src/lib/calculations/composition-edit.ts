import { CALC_EPS, formatQty } from "./format.ts";
import { UNATTRIBUTED_KEY } from "./types.ts";

export type CompositionAmounts = {
  remainingByChemical: Record<string, number>;
  unattributed: number;
  volume: number;
  solidPct: number;
};

export type CompositionEditResult =
  | { ok: true; next: CompositionAmounts }
  | { ok: false; reason: string };

export type AdjustCompositionPayload = {
  remainingByChemical: Record<string, number>;
  unattributed: number;
};

type CompositionLine = { id: string; amount: number };

function scrubRemainings(remaining: Record<string, number>) {
  const next: Record<string, number> = {};
  for (const [id, amount] of Object.entries(remaining)) {
    if (Math.abs(amount) > CALC_EPS) next[id] = amount < 0 ? 0 : amount;
  }
  return next;
}

function linesOf(current: CompositionAmounts): CompositionLine[] {
  const lines: CompositionLine[] = Object.entries(current.remainingByChemical).map(
    ([id, amount]) => ({ id, amount }),
  );
  if (Math.abs(current.unattributed) > CALC_EPS) {
    lines.push({ id: UNATTRIBUTED_KEY, amount: current.unattributed });
  }
  return lines;
}

function amountOf(current: CompositionAmounts, id: string) {
  if (id === UNATTRIBUTED_KEY) return current.unattributed;
  return current.remainingByChemical[id] ?? 0;
}

function inferUnattributedPct(
  current: CompositionAmounts,
  chemicalPcts: Record<string, number>,
) {
  if (!(current.unattributed > CALC_EPS)) return 0;
  let trackedWeighted = 0;
  for (const [id, amount] of Object.entries(current.remainingByChemical)) {
    trackedWeighted += amount * (chemicalPcts[id] ?? 0);
  }
  const unaPct =
    (current.volume * current.solidPct - trackedWeighted) / current.unattributed;
  if (!Number.isFinite(unaPct)) return 0;
  return Math.min(100, Math.max(0, unaPct));
}

function weightedSolid(
  amounts: Pick<CompositionAmounts, "remainingByChemical" | "unattributed">,
  chemicalPcts: Record<string, number>,
  unattributedPct: number,
) {
  let weighted = 0;
  let total = 0;
  for (const [id, amount] of Object.entries(amounts.remainingByChemical)) {
    if (!(amount > CALC_EPS)) continue;
    weighted += amount * (chemicalPcts[id] ?? 0);
    total += amount;
  }
  if (amounts.unattributed > CALC_EPS) {
    weighted += amounts.unattributed * unattributedPct;
    total += amounts.unattributed;
  }
  return total > 0 ? weighted / total : 0;
}

/** Change one chemical's kg; keep total the same and rebalance the others proportionally. */
export function editChemicalAmount(
  current: CompositionAmounts,
  chemicalPcts: Record<string, number>,
  editedId: string,
  newAmount: number,
): CompositionEditResult {
  if (!Number.isFinite(newAmount) || newAmount < -CALC_EPS) {
    return { ok: false, reason: "Kilograms cannot be below 0." };
  }
  const amount = Math.max(0, newAmount);
  const positive = linesOf(current).filter((line) => line.amount > CALC_EPS);
  const unaPct = inferUnattributedPct(current, chemicalPcts);

  if (positive.length <= 1 && (positive.length === 0 || positive[0]?.id === editedId)) {
    const remainingByChemical =
      editedId === UNATTRIBUTED_KEY
        ? scrubRemainings(current.remainingByChemical)
        : scrubRemainings({ ...current.remainingByChemical, [editedId]: amount });
    const unattributed = editedId === UNATTRIBUTED_KEY ? amount : 0;
    const solidPct =
      editedId === UNATTRIBUTED_KEY ? unaPct : (chemicalPcts[editedId] ?? current.solidPct);
    return {
      ok: true,
      next: {
        remainingByChemical,
        unattributed,
        volume: amount,
        solidPct,
      },
    };
  }

  const total = current.volume;
  if (amount > total + CALC_EPS) {
    return {
      ok: false,
      reason: `That is more than the ${formatQty(total)} kg in the tank.`,
    };
  }

  const others = linesOf(current).filter((line) => line.id !== editedId);
  const otherSum = others.reduce((sum, line) => sum + line.amount, 0);
  const remainder = total - amount;

  if (otherSum <= CALC_EPS) {
    if (Math.abs(remainder) <= CALC_EPS) {
      const remainingByChemical =
        editedId === UNATTRIBUTED_KEY
          ? scrubRemainings({})
          : scrubRemainings({ [editedId]: amount });
      return {
        ok: true,
        next: {
          remainingByChemical,
          unattributed: editedId === UNATTRIBUTED_KEY ? amount : 0,
          volume: total,
          solidPct: weightedSolid(
            {
              remainingByChemical,
              unattributed: editedId === UNATTRIBUTED_KEY ? amount : 0,
            },
            chemicalPcts,
            unaPct,
          ),
        },
      };
    }
    return {
      ok: false,
      reason:
        "The other chemicals are already at 0 kg, so there is nowhere to move the difference.",
    };
  }

  const factor = remainder / otherSum;
  const remainingByChemical = { ...current.remainingByChemical };
  let unattributed = current.unattributed;

  if (editedId === UNATTRIBUTED_KEY) unattributed = amount;
  else remainingByChemical[editedId] = amount;

  for (const other of others) {
    const scaled = other.amount * factor;
    if (scaled < -CALC_EPS) {
      return {
        ok: false,
        reason: "That change would push another chemical below 0 kg.",
      };
    }
    const cleaned = scaled < CALC_EPS ? 0 : scaled;
    if (other.id === UNATTRIBUTED_KEY) unattributed = cleaned;
    else remainingByChemical[other.id] = cleaned;
  }

  const nextRemainings = scrubRemainings(remainingByChemical);
  const nextUna = unattributed < CALC_EPS ? 0 : unattributed;
  return {
    ok: true,
    next: {
      remainingByChemical: nextRemainings,
      unattributed: nextUna,
      volume: total,
      solidPct: weightedSolid(
        { remainingByChemical: nextRemainings, unattributed: nextUna },
        chemicalPcts,
        unaPct,
      ),
    },
  };
}

/** Scale every chemical by the same factor so overall solid content stays the same. */
export function scaleTankTotal(
  current: CompositionAmounts,
  newTotal: number,
  capacity: number | null | undefined,
): CompositionEditResult {
  if (!Number.isFinite(newTotal) || newTotal < -CALC_EPS) {
    return { ok: false, reason: "Kilograms cannot be below 0." };
  }
  const total = Math.max(0, newTotal);
  if (capacity != null && capacity > 0 && total > capacity + CALC_EPS) {
    return {
      ok: false,
      reason: `That is ${formatQty(total)} kg. The tank holds ${formatQty(capacity)} kg.`,
    };
  }
  if (current.volume <= CALC_EPS) {
    if (total <= CALC_EPS) {
      return {
        ok: true,
        next: {
          remainingByChemical: {},
          unattributed: 0,
          volume: 0,
          solidPct: current.solidPct,
        },
      };
    }
    return {
      ok: false,
      reason: "Add a chemical before you set the total kilograms.",
    };
  }

  const factor = total / current.volume;
  const remainingByChemical = scrubRemainings(
    Object.fromEntries(
      Object.entries(current.remainingByChemical).map(([id, amount]) => [id, amount * factor]),
    ),
  );
  const unattributed =
    Math.abs(current.unattributed * factor) < CALC_EPS ? 0 : current.unattributed * factor;

  return {
    ok: true,
    next: {
      remainingByChemical,
      unattributed,
      volume: total,
      solidPct: current.solidPct,
    },
  };
}

export function amountsEqual(left: CompositionAmounts, right: CompositionAmounts) {
  if (Math.abs(left.volume - right.volume) > 0.05) return false;
  if (Math.abs(left.solidPct - right.solidPct) > 0.05) return false;
  if (Math.abs(left.unattributed - right.unattributed) > 0.05) return false;
  const ids = new Set([
    ...Object.keys(left.remainingByChemical),
    ...Object.keys(right.remainingByChemical),
  ]);
  for (const id of ids) {
    if (
      Math.abs((left.remainingByChemical[id] ?? 0) - (right.remainingByChemical[id] ?? 0)) > 0.05
    ) {
      return false;
    }
  }
  return true;
}

export function encodeAdjustNote(payload: AdjustCompositionPayload): string {
  return JSON.stringify({
    v: 1,
    remainingByChemical: payload.remainingByChemical,
    unattributed: payload.unattributed,
  });
}

export function parseAdjustNote(note: string | null | undefined): AdjustCompositionPayload | null {
  if (!note) return null;
  try {
    const raw = JSON.parse(note) as {
      v?: number;
      remainingByChemical?: Record<string, number>;
      unattributed?: number;
    };
    if (raw.v !== 1 || !raw.remainingByChemical || typeof raw.unattributed !== "number") {
      return null;
    }
    const remainingByChemical: Record<string, number> = {};
    for (const [id, amount] of Object.entries(raw.remainingByChemical)) {
      if (typeof amount !== "number" || !Number.isFinite(amount)) return null;
      remainingByChemical[id] = amount;
    }
    if (!Number.isFinite(raw.unattributed)) return null;
    return { remainingByChemical, unattributed: raw.unattributed };
  } catch {
    return null;
  }
}

export function snapshotToAmounts(snapshot: {
  remainingByChemical: Record<string, number>;
  unattributed: number;
  volume: number;
  solidPct: number;
}): CompositionAmounts {
  return {
    remainingByChemical: { ...snapshot.remainingByChemical },
    unattributed: snapshot.unattributed,
    volume: snapshot.volume,
    solidPct: snapshot.solidPct,
  };
}
