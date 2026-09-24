import { CALC_EPS, formatPct, formatQty } from "./format.ts";
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

type SolidLine = { id: string; amount: number; pct: number; name: string };

function chemicalLabel(id: string, chemicalNames: Record<string, string>) {
  if (id === UNATTRIBUTED_KEY) return "Unattributed";
  return chemicalNames[id] ?? "Chemical";
}

function buildSolidLines(
  current: CompositionAmounts,
  chemicalPcts: Record<string, number>,
  chemicalNames: Record<string, string>,
  unaPct: number,
  includeUnattributed: boolean,
): SolidLine[] {
  const lines: SolidLine[] = [];
  for (const [id, amount] of Object.entries(current.remainingByChemical)) {
    if (!(amount > CALC_EPS)) continue;
    const pct = chemicalPcts[id];
    if (pct == null || !Number.isFinite(pct)) continue;
    lines.push({
      id,
      amount,
      pct,
      name: chemicalLabel(id, chemicalNames),
    });
  }
  if (includeUnattributed && current.unattributed > CALC_EPS) {
    lines.push({
      id: UNATTRIBUTED_KEY,
      amount: current.unattributed,
      pct: unaPct,
      name: chemicalLabel(UNATTRIBUTED_KEY, chemicalNames),
    });
  }
  return lines;
}

function applySolidLines(
  lines: SolidLine[],
  fixedNamed: Record<string, number>,
  fixedUna: number,
  volume: number,
  chemicalPcts: Record<string, number>,
  unaPct: number,
): CompositionAmounts {
  const remainingByChemical: Record<string, number> = { ...fixedNamed };
  let unattributed = fixedUna;
  for (const line of lines) {
    const cleaned = line.amount < CALC_EPS ? 0 : line.amount;
    if (line.id === UNATTRIBUTED_KEY) unattributed = cleaned;
    else remainingByChemical[line.id] = cleaned;
  }
  const nextRemainings = scrubRemainings(remainingByChemical);
  const nextUna = unattributed < CALC_EPS ? 0 : unattributed;
  return {
    remainingByChemical: nextRemainings,
    unattributed: nextUna,
    volume,
    solidPct: weightedSolid(
      { remainingByChemical: nextRemainings, unattributed: nextUna },
      chemicalPcts,
      unaPct,
    ),
  };
}

function rangeRefusal(lines: SolidLine[]): string {
  let lowest = lines[0]!;
  let highest = lines[0]!;
  for (const line of lines) {
    if (line.pct < lowest.pct - CALC_EPS) lowest = line;
    if (line.pct > highest.pct + CALC_EPS) highest = line;
  }
  return `Overall solid content must stay between ${lowest.name} at ${formatPct(lowest.pct)} and ${highest.name} at ${formatPct(highest.pct)}.`;
}

function oneChemicalRefusal(line: SolidLine): CompositionEditResult {
  return {
    ok: false,
    reason: `This tank is only ${line.name} at ${formatPct(line.pct)}.`,
  };
}

/**
 * Change overall solid content; keep total kilograms the same and move chemicals
 * with the smallest squared change that hits the target (Lagrange on positive kg).
 *
 * Unattributed is included when its residual solid % can be inferred from the snapshot.
 * If it cannot, its kilograms stay fixed and only named chemicals move.
 */
export function editSolidContent(
  current: CompositionAmounts,
  chemicalPcts: Record<string, number>,
  chemicalNames: Record<string, string>,
  targetPct: number,
): CompositionEditResult {
  if (!Number.isFinite(targetPct) || targetPct < -CALC_EPS || targetPct > 100 + CALC_EPS) {
    return { ok: false, reason: "Overall solid content must be between 0% and 100%." };
  }
  const target = Math.min(100, Math.max(0, targetPct));
  const total = current.volume;
  if (!(total > CALC_EPS)) {
    return { ok: false, reason: "Add chemicals to the tank before you change the solid content." };
  }

  const unaPct = inferUnattributedPct(current, chemicalPcts);
  const unaDefined =
    current.unattributed > CALC_EPS &&
    Number.isFinite(unaPct) &&
    Math.abs(current.volume * current.solidPct - (
      Object.entries(current.remainingByChemical).reduce(
        (sum, [id, amount]) => sum + amount * (chemicalPcts[id] ?? 0),
        0,
      ) + current.unattributed * unaPct
    )) <= 0.05 * Math.max(1, current.volume);

  // Prefer moving unattributed with its inferred %; otherwise keep that kg fixed.
  const includeUna = current.unattributed > CALC_EPS && unaDefined;
  const fixedUna = !includeUna && current.unattributed > CALC_EPS ? current.unattributed : 0;
  const fixedUnaSolid = fixedUna * unaPct;
  const movable = buildSolidLines(current, chemicalPcts, chemicalNames, unaPct, includeUna);

  if (movable.length === 0) {
    return { ok: false, reason: "Add a chemical before you change the solid content." };
  }

  if (movable.length === 1 && fixedUna <= CALC_EPS) {
    const only = movable[0]!;
    if (Math.abs(only.pct - target) > 0.05) return oneChemicalRefusal(only);
    return {
      ok: true,
      next: applySolidLines([{ ...only, amount: total }], {}, 0, total, chemicalPcts, unaPct),
    };
  }

  return solveSolidOnLines(movable, total, target, fixedUna, fixedUnaSolid, chemicalPcts, unaPct);
}

function solveSolidOnLines(
  active: SolidLine[],
  tankTotal: number,
  targetPct: number,
  fixedUna: number,
  fixedUnaSolid: number,
  chemicalPcts: Record<string, number>,
  unaPct: number,
): CompositionEditResult {
  if (active.length === 0) {
    return {
      ok: false,
      reason: "With the unattributed kilograms left as they are, this solid content cannot be reached.",
    };
  }

  const movableMass = tankTotal - fixedUna;
  if (!(movableMass > CALC_EPS)) {
    return {
      ok: false,
      reason: "With the unattributed kilograms left as they are, this solid content cannot be reached.",
    };
  }

  let lowest = active[0]!;
  let highest = active[0]!;
  for (const line of active) {
    if (line.pct < lowest.pct - CALC_EPS) lowest = line;
    if (line.pct > highest.pct + CALC_EPS) highest = line;
  }

  if (active.length === 1) {
    const only = active[0]!;
    const neededPctKg = tankTotal * targetPct - fixedUnaSolid;
    const implied = neededPctKg / movableMass;
    if (Math.abs(implied - only.pct) > 0.05) {
      if (fixedUna > CALC_EPS) {
        return {
          ok: false,
          reason:
            "With the unattributed kilograms left as they are, this solid content cannot be reached.",
        };
      }
      return oneChemicalRefusal(only);
    }
    return {
      ok: true,
      next: applySolidLines([{ ...only, amount: movableMass }], {}, fixedUna, tankTotal, chemicalPcts, unaPct),
    };
  }

  if (targetPct < lowest.pct - 0.05 || targetPct > highest.pct + 0.05) {
    return { ok: false, reason: rangeRefusal(active) };
  }

  const neededPctKg = tankTotal * targetPct - fixedUnaSolid;
  const neededAvg = neededPctKg / movableMass;
  if (neededAvg < lowest.pct - 0.05 || neededAvg > highest.pct + 0.05) {
    if (fixedUna > CALC_EPS) {
      return {
        ok: false,
        reason:
          "With the unattributed kilograms left as they are, this solid content cannot be reached.",
      };
    }
    return { ok: false, reason: rangeRefusal(active) };
  }

  const n = active.length;
  const sumP = active.reduce((sum, line) => sum + line.pct, 0);
  const sumP2 = active.reduce((sum, line) => sum + line.pct * line.pct, 0);
  const sumQ = active.reduce((sum, line) => sum + line.amount, 0);
  const sumPQ = active.reduce((sum, line) => sum + line.amount * line.pct, 0);

  if (Math.abs(sumP2 - (sumP * sumP) / n) <= CALC_EPS) {
    if (Math.abs(neededAvg - lowest.pct) > 0.05) return oneChemicalRefusal(lowest);
    const factor = movableMass / sumQ;
    const scaled = active.map((line) => ({ ...line, amount: line.amount * factor }));
    return {
      ok: true,
      next: applySolidLines(scaled, {}, fixedUna, tankTotal, chemicalPcts, unaPct),
    };
  }

  // q'_i = q_i - λ - μ p_i
  // n λ + (Σp) μ = Σq - movableMass
  // (Σp) λ + (Σp²) μ = Σpq - neededPctKg
  const rhs1 = sumQ - movableMass;
  const rhs2 = sumPQ - neededPctKg;
  const det = n * sumP2 - sumP * sumP;
  if (Math.abs(det) <= CALC_EPS) {
    return { ok: false, reason: rangeRefusal(active) };
  }
  const lambda = (rhs1 * sumP2 - rhs2 * sumP) / det;
  const mu = (n * rhs2 - sumP * rhs1) / det;

  const nextLines = active.map((line) => ({
    ...line,
    amount: line.amount - lambda - mu * line.pct,
  }));

  const negatives = nextLines.filter((line) => line.amount < -CALC_EPS);
  if (negatives.length > 0) {
    const zeroIds = new Set(negatives.map((line) => line.id));
    const survivors = active.filter((line) => !zeroIds.has(line.id));
    return solveSolidOnLines(
      survivors,
      tankTotal,
      targetPct,
      fixedUna,
      fixedUnaSolid,
      chemicalPcts,
      unaPct,
    );
  }

  const cleaned = nextLines.map((line) => ({
    ...line,
    amount: line.amount < CALC_EPS ? 0 : line.amount,
  }));
  const next = applySolidLines(cleaned, {}, fixedUna, tankTotal, chemicalPcts, unaPct);
  if (Math.abs(next.volume - tankTotal) > 0.05) {
    return {
      ok: false,
      reason: "That solid content could not be applied without changing the total kilograms.",
    };
  }
  if (Math.abs(next.solidPct - targetPct) > 0.05) {
    return {
      ok: false,
      reason: "With the unattributed kilograms left as they are, this solid content cannot be reached.",
    };
  }
  return { ok: true, next };
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
