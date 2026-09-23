import { solveBlend } from "./blend.ts";
import { computeRequiredBlend, solveFill, suggestFillPair } from "./fill.ts";
import { formatPct, formatQty, nearlyEqual } from "./format.ts";
import { reverseAdd } from "./planner.ts";
import type { ChemicalRef } from "./types.ts";

export const MAX_ALTERNATIVES = 4;

export type BlendApply = {
  chemical1Id: string;
  chemical2Id: string;
  targetPct: number;
};

export type FillApply = {
  chemicalAId: string;
  chemicalBId: string;
  targetPct?: number;
};

export type PlannerApply = {
  chemicalId?: string;
  targetPct: number;
};

export type Alternative<TApply> = {
  id: string;
  title: string;
  subtitle: string;
  apply: TApply;
};

function activeChemicals(chemicals: ChemicalRef[]) {
  return chemicals.filter((chemical) => chemical.archivedAt === null);
}

function pairKey(a: string, b: string) {
  return [a, b].sort().join("|");
}

function pairEntries(chemicals: ChemicalRef[]) {
  const pairs: [ChemicalRef, ChemicalRef][] = [];
  for (let i = 0; i < chemicals.length; i += 1) {
    for (let j = i + 1; j < chemicals.length; j += 1) {
      pairs.push([chemicals[i]!, chemicals[j]!]);
    }
  }
  return pairs;
}

function nearerBound(q1: number, q2: number, target: number) {
  const lo = Math.min(q1, q2);
  const hi = Math.max(q1, q2);
  if (target < lo) return lo;
  if (target > hi) return hi;
  return target;
}

function distanceToRange(q1: number, q2: number, target: number) {
  const lo = Math.min(q1, q2);
  const hi = Math.max(q1, q2);
  if (target >= lo - 1e-9 && target <= hi + 1e-9) return 0;
  return target < lo ? lo - target : target - hi;
}

function isZeroAmount(value: number) {
  return value <= 1e-9;
}

function blendSubtitle(
  a: ChemicalRef,
  b: ChemicalRef,
  x1: number,
  x2: number,
) {
  if (isZeroAmount(x1) && !isZeroAmount(x2)) {
    return `Use only ${b.name} · ${formatQty(x2)} ${b.unit}`;
  }
  if (isZeroAmount(x2) && !isZeroAmount(x1)) {
    return `Use only ${a.name} · ${formatQty(x1)} ${a.unit}`;
  }
  return `${a.name} + ${b.name} · ${formatQty(x1)} ${a.unit} + ${formatQty(x2)} ${b.unit}`;
}

function takeUnique<TApply>(items: Alternative<TApply>[], limit = MAX_ALTERNATIVES) {
  const seen = new Set<string>();
  const next: Alternative<TApply>[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    next.push(item);
    if (next.length === limit) break;
  }
  return next;
}

function blendClampAlternative(
  a: ChemicalRef,
  b: ChemicalRef,
  targetPct: number,
  targetQty: number,
): Alternative<BlendApply> | null {
  const bound = nearerBound(a.solidContentPct, b.solidContentPct, targetPct);
  const solved = solveBlend({
    q1: a.solidContentPct,
    q2: b.solidContentPct,
    targetPct: bound,
    targetQty,
  });
  if (!solved.ok || !solved.amounts) return null;
  if (solved.amounts.x1 < -1e-9 || solved.amounts.x2 < -1e-9) return null;
  const onlyA = isZeroAmount(solved.amounts.x2) && !isZeroAmount(solved.amounts.x1);
  const onlyB = isZeroAmount(solved.amounts.x1) && !isZeroAmount(solved.amounts.x2);
  return {
    id: `blend-clamp-${pairKey(a.id, b.id)}-${bound}`,
    title: onlyA
      ? `Use only ${a.name}`
      : onlyB
        ? `Use only ${b.name}`
        : `Use ${formatPct(bound)} instead`,
    subtitle: blendSubtitle(a, b, solved.amounts.x1, solved.amounts.x2),
    apply: { chemical1Id: a.id, chemical2Id: b.id, targetPct: bound },
  };
}

function blendPairAlternative(
  a: ChemicalRef,
  b: ChemicalRef,
  targetPct: number,
  targetQty: number,
): Alternative<BlendApply> | null {
  const solved = solveBlend({
    q1: a.solidContentPct,
    q2: b.solidContentPct,
    targetPct,
    targetQty,
  });
  if (!solved.ok || !solved.amounts) return null;
  if (solved.amounts.x1 < -1e-9 || solved.amounts.x2 < -1e-9) return null;
  return {
    id: `blend-pair-${pairKey(a.id, b.id)}-${targetPct}`,
    title: `Use ${a.name} + ${b.name}`,
    subtitle: blendSubtitle(a, b, solved.amounts.x1, solved.amounts.x2),
    apply: { chemical1Id: a.id, chemical2Id: b.id, targetPct },
  };
}

export function suggestBlendAlternatives(input: {
  chemical1: ChemicalRef;
  chemical2: ChemicalRef;
  targetPct: number;
  targetQty: number;
  chemicals: ChemicalRef[];
}): Alternative<BlendApply>[] {
  if (!(input.targetQty > 0)) return [];

  const library = activeChemicals(input.chemicals);
  const currentKey = pairKey(input.chemical1.id, input.chemical2.id);
  const queued: Alternative<BlendApply>[] = [];

  if (nearlyEqual(input.chemical1.solidContentPct, input.chemical2.solidContentPct)) {
    const match = blendPairAlternative(
      input.chemical1,
      input.chemical2,
      input.chemical1.solidContentPct,
      input.targetQty,
    );
    if (match) {
      queued.push({
        ...match,
        id: `blend-match-${currentKey}`,
        title: `Set target to ${formatPct(input.chemical1.solidContentPct)}`,
      });
    }
    return takeUnique(queued);
  }

  const currentClamp = blendClampAlternative(
    input.chemical1,
    input.chemical2,
    input.targetPct,
    input.targetQty,
  );
  if (currentClamp) queued.push(currentClamp);

  const spanning = pairEntries(library)
    .filter(([a, b]) => pairKey(a.id, b.id) !== currentKey)
    .map((pair) => ({
      pair,
      distance: distanceToRange(pair[0].solidContentPct, pair[1].solidContentPct, input.targetPct),
      span: Math.abs(pair[0].solidContentPct - pair[1].solidContentPct),
    }))
    .sort((left, right) => left.distance - right.distance || left.span - right.span);

  for (const { pair, distance } of spanning) {
    if (distance === 0) {
      const option = blendPairAlternative(pair[0], pair[1], input.targetPct, input.targetQty);
      if (option) queued.push(option);
    }
  }

  const hasExactPair = queued.some((item) => item.apply.targetPct === input.targetPct);
  if (!hasExactPair) {
    const closest = spanning[0];
    if (closest) {
      const option = blendClampAlternative(
        closest.pair[0],
        closest.pair[1],
        input.targetPct,
        input.targetQty,
      );
      if (option) queued.push(option);
    }
  }

  return takeUnique(queued);
}

function fillSubtitle(
  a: ChemicalRef,
  b: ChemicalRef,
  xA: number,
  xB: number,
) {
  if (isZeroAmount(xA) && !isZeroAmount(xB)) {
    return `Use only ${b.name} · ${formatQty(xB)} ${b.unit}`;
  }
  if (isZeroAmount(xB) && !isZeroAmount(xA)) {
    return `Use only ${a.name} · ${formatQty(xA)} ${a.unit}`;
  }
  return `${a.name} + ${b.name} · ${formatQty(xA)} ${a.unit} + ${formatQty(xB)} ${b.unit}`;
}

function fillPairOption(
  a: ChemicalRef,
  b: ChemicalRef,
  fillAmount: number,
  requiredActive: number,
  targetPct?: number,
): Alternative<FillApply> | null {
  const solved = solveFill({
    fillAmount,
    requiredActive,
    qA: a.solidContentPct,
    qB: b.solidContentPct,
  });
  if (!solved.ok || !solved.amounts) return null;
  if (solved.amounts.xA < -1e-9 || solved.amounts.xB < -1e-9) return null;
  if (solved.amounts.xA > fillAmount + 1e-9 || solved.amounts.xB > fillAmount + 1e-9) {
    return null;
  }
  return {
    id: `fill-pair-${pairKey(a.id, b.id)}${targetPct === undefined ? "" : `-${targetPct}`}`,
    title: `Use ${a.name} + ${b.name}`,
    subtitle: fillSubtitle(a, b, solved.amounts.xA, solved.amounts.xB),
    apply: {
      chemicalAId: a.id,
      chemicalBId: b.id,
      ...(targetPct === undefined ? {} : { targetPct }),
    },
  };
}

export function suggestFillAlternatives(input: {
  existingQty: number;
  existingPct: number;
  targetVolume: number;
  targetPct: number;
  chemicalA: ChemicalRef | null;
  chemicalB: ChemicalRef | null;
  chemicals: ChemicalRef[];
}): Alternative<FillApply>[] {
  const required = computeRequiredBlend({
    existingQty: input.existingQty,
    existingPct: input.existingPct,
    targetVolume: input.targetVolume,
    targetPct: input.targetPct,
  });
  if (!required.ok) return [];

  const library = activeChemicals(input.chemicals);
  const queued: Alternative<FillApply>[] = [];
  const currentKey =
    input.chemicalA && input.chemicalB
      ? pairKey(input.chemicalA.id, input.chemicalB.id)
      : null;

  const suggested = suggestFillPair(library, required.requiredBlendPct);
  if (suggested.above && suggested.below) {
    const option = fillPairOption(
      suggested.above,
      suggested.below,
      required.fillAmount,
      required.requiredActive,
    );
    if (option) queued.push(option);
  }

  const others = pairEntries(library)
    .map(([a, b]) => ({
      a,
      b,
      key: pairKey(a.id, b.id),
      distance: distanceToRange(a.solidContentPct, b.solidContentPct, required.requiredBlendPct),
      span: Math.abs(a.solidContentPct - b.solidContentPct),
    }))
    .sort((left, right) => left.distance - right.distance || left.span - right.span);

  for (const { a, b, key } of others) {
    if (key === currentKey) continue;
    const option = fillPairOption(a, b, required.fillAmount, required.requiredActive);
    if (option) queued.push(option);
  }

  if (queued.length > 0) return takeUnique(queued);

  if (library.length === 0) return [];

  const sortedByPct = [...library].sort((a, b) => a.solidContentPct - b.solidContentPct);
  const lowest = sortedByPct[0]!;
  const highest = sortedByPct[sortedByPct.length - 1]!;
  const fillAmount = required.fillAmount;
  const volume = input.targetVolume;

  const clampedTargets = [lowest, highest]
    .map((chemical) => ({
      chemical,
      targetPct: (fillAmount * chemical.solidContentPct + input.existingQty * input.existingPct) / volume,
    }))
    .sort((left, right) => Math.abs(left.targetPct - input.targetPct) - Math.abs(right.targetPct - input.targetPct));

  for (const { chemical, targetPct } of clampedTargets) {
    const clampedRequired = computeRequiredBlend({
      existingQty: input.existingQty,
      existingPct: input.existingPct,
      targetVolume: input.targetVolume,
      targetPct,
    });
    if (!clampedRequired.ok) continue;

    const partner =
      library.find((item) => item.id !== chemical.id) ??
      library.find((item) => !nearlyEqual(item.solidContentPct, chemical.solidContentPct)) ??
      library.find((item) => item.id !== chemical.id);

    if (!partner) continue;
    const option = fillPairOption(
      chemical,
      partner,
      clampedRequired.fillAmount,
      clampedRequired.requiredActive,
      targetPct,
    );
    if (!option) continue;
    queued.push({
      ...option,
      id: `fill-clamp-${chemical.id}-${targetPct}`,
      title: `Use ${formatPct(targetPct)} instead`,
    });
  }

  return takeUnique(queued);
}

function plannerClamp(
  currentQty: number,
  currentPct: number,
  chemical: ChemicalRef,
  targetPct: number,
): Alternative<PlannerApply> | null {
  const solved = reverseAdd({
    currentQty,
    currentPct,
    chemicalPct: chemical.solidContentPct,
    targetPct,
  });
  if (!solved.ok || solved.quantity === null || solved.quantity < -1e-9) return null;
  const zero = solved.quantity <= 1e-9;
  return {
    id: `planner-clamp-${chemical.id}-${targetPct}`,
    title: `Set target to ${formatPct(targetPct)}`,
    subtitle: zero
      ? `${chemical.name} · ${formatQty(0)} ${chemical.unit} (already there)`
      : `${chemical.name} · ${formatQty(solved.quantity)} ${chemical.unit}`,
    apply: { chemicalId: chemical.id, targetPct },
  };
}

function plannerChemicalOption(
  currentQty: number,
  currentPct: number,
  chemical: ChemicalRef,
  targetPct: number,
): Alternative<PlannerApply> | null {
  const solved = reverseAdd({
    currentQty,
    currentPct,
    chemicalPct: chemical.solidContentPct,
    targetPct,
  });
  if (!solved.ok || solved.quantity === null || solved.quantity < -1e-9) return null;
  return {
    id: `planner-chem-${chemical.id}-${targetPct}`,
    title: `Use ${chemical.name}`,
    subtitle: `${chemical.name} · ${formatQty(solved.quantity)} ${chemical.unit}`,
    apply: { chemicalId: chemical.id, targetPct },
  };
}

export function suggestPlannerAlternatives(input: {
  currentQty: number;
  currentPct: number;
  chemical: ChemicalRef | null;
  targetPct: number;
  chemicals: ChemicalRef[];
}): Alternative<PlannerApply>[] {
  if (!(input.currentQty > 0)) return [];

  const library = activeChemicals(input.chemicals);
  const queued: Alternative<PlannerApply>[] = [];

  if (input.chemical && !nearlyEqual(input.chemical.solidContentPct, input.currentPct)) {
    const lo = Math.min(input.currentPct, input.chemical.solidContentPct);
    const hi = Math.max(input.currentPct, input.chemical.solidContentPct);
    if (input.targetPct < lo - 1e-9 || input.targetPct > hi + 1e-9) {
      const currentBound = plannerClamp(
        input.currentQty,
        input.currentPct,
        input.chemical,
        input.currentPct,
      );
      const chemBound = plannerClamp(
        input.currentQty,
        input.currentPct,
        input.chemical,
        input.chemical.solidContentPct,
      );
      if (currentBound) queued.push(currentBound);
      if (chemBound) queued.push(chemBound);
    }
  }

  for (const chemical of library) {
    if (input.chemical && chemical.id === input.chemical.id) continue;
    const option = plannerChemicalOption(
      input.currentQty,
      input.currentPct,
      chemical,
      input.targetPct,
    );
    if (option) queued.push(option);
  }

  const hitsTarget = queued.some((item) => nearlyEqual(item.apply.targetPct, input.targetPct));
  if (
    !hitsTarget &&
    input.chemical &&
    !nearlyEqual(input.chemical.solidContentPct, input.currentPct)
  ) {
    const bound = nearerBound(input.currentPct, input.chemical.solidContentPct, input.targetPct);
    const option = plannerClamp(
      input.currentQty,
      input.currentPct,
      input.chemical,
      bound,
    );
    if (option) queued.push(option);
  }

  if (!hitsTarget) {
    const closest = library
      .map((chemical) => ({
        chemical,
        distance: Math.abs(chemical.solidContentPct - input.targetPct),
      }))
      .sort((left, right) => left.distance - right.distance)[0];
    if (closest && (!input.chemical || closest.chemical.id !== input.chemical.id)) {
      const bound = nearerBound(input.currentPct, closest.chemical.solidContentPct, input.targetPct);
      const option = plannerClamp(
        input.currentQty,
        input.currentPct,
        closest.chemical,
        bound,
      );
      if (option) queued.push(option);
    }
  }

  return takeUnique(queued);
}

export type MissingChemicalAdvice = {
  direction: "higher" | "lower";
  targetPct: number;
  edgePct: number;
  exclusive: boolean;
};

export function blendMissingChemical(
  targetPct: number,
  chemicals: ChemicalRef[],
): MissingChemicalAdvice | null {
  const library = activeChemicals(chemicals);
  if (library.length === 0) return null;
  const pcts = library.map((chemical) => chemical.solidContentPct);
  const min = Math.min(...pcts);
  const max = Math.max(...pcts);
  if (targetPct > max + 1e-9) {
    return { direction: "higher", targetPct, edgePct: max, exclusive: false };
  }
  if (targetPct < min - 1e-9) {
    return { direction: "lower", targetPct, edgePct: min, exclusive: false };
  }
  return null;
}

export function suggestPlannerHits(input: {
  currentQty: number;
  currentPct: number;
  targetPct: number;
  chemicals: ChemicalRef[];
}): Alternative<PlannerApply>[] {
  if (!(input.currentQty > 0)) return [];
  const queued = activeChemicals(input.chemicals)
    .map((chemical) =>
      plannerChemicalOption(input.currentQty, input.currentPct, chemical, input.targetPct),
    )
    .filter((item): item is Alternative<PlannerApply> => item !== null);
  return takeUnique(queued);
}

export function plannerMissingChemical(input: {
  currentQty: number;
  currentPct: number;
  targetPct: number;
  chemicals: ChemicalRef[];
}): MissingChemicalAdvice | null {
  if (!(input.currentQty > 0)) return null;
  if (nearlyEqual(input.targetPct, input.currentPct)) return null;
  if (suggestPlannerHits(input).length > 0) return null;

  const raising = input.targetPct > input.currentPct;
  const library = activeChemicals(input.chemicals);
  const edge =
    library.length === 0
      ? input.currentPct
      : raising
        ? Math.max(...library.map((chemical) => chemical.solidContentPct))
        : Math.min(...library.map((chemical) => chemical.solidContentPct));

  return {
    direction: raising ? "higher" : "lower",
    targetPct: input.targetPct,
    edgePct: edge,
    exclusive: true,
  };
}
