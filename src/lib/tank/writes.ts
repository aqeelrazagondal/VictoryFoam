import { parseAdjustNote } from "../calculations/composition-edit.ts";
import type { TankSnapshot } from "../calculations/tank-log.ts";
import type { TankLogDraft } from "./models.ts";

export const OCCUPANCY_MESSAGE =
  "This tank was updated on another tablet. Reload and try again.";
export const NOT_FACTORY_MESSAGE = "This login is not on the factory list.";
export const RATE_LIMIT_MESSAGE = "Too many saves. Wait a minute and try again.";

export type WriteAttempt = {
  writeKey: string;
};

export type BoundTankSnapshot = {
  volume: number;
  solidPct: number;
  remainingByChemical: Record<string, number>;
  unattributed: number;
  hasOpening: boolean;
};

const EPS = 1e-9;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function createWriteAttempt(): WriteAttempt {
  return { writeKey: crypto.randomUUID() };
}

export function writeKeyForRetry(attempt: WriteAttempt): string {
  return attempt.writeKey;
}

export function isOccupancyError(error: unknown): boolean {
  return messageOf(error).includes("updated on another tablet");
}

export function isOfflineError(error: unknown): boolean {
  const message = messageOf(error).toLowerCase();
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  return (
    error instanceof TypeError ||
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("network request failed") ||
    message.includes("fetch failed")
  );
}

export function isFactoryDenyError(error: unknown): boolean {
  const message = messageOf(error).toLowerCase();
  return (
    message.includes("not on the factory list") ||
    message.includes("row-level security") ||
    message.includes("permission denied")
  );
}

export function emptyBoundSnapshot(): BoundTankSnapshot {
  return {
    volume: 0,
    solidPct: 0,
    remainingByChemical: {},
    unattributed: 0,
    hasOpening: false,
  };
}

export function parseBoundSnapshot(value: unknown): BoundTankSnapshot | null {
  if (!isRecord(value)) return null;
  if (typeof value.volume !== "number" || !Number.isFinite(value.volume)) return null;
  if (typeof value.solidPct !== "number" || !Number.isFinite(value.solidPct)) return null;
  if (typeof value.unattributed !== "number" || !Number.isFinite(value.unattributed)) return null;
  if (typeof value.hasOpening !== "boolean") return null;
  if (!isRecord(value.remainingByChemical)) return null;
  const remainingByChemical: Record<string, number> = {};
  for (const [id, amount] of Object.entries(value.remainingByChemical)) {
    if (typeof amount !== "number" || !Number.isFinite(amount)) return null;
    remainingByChemical[id] = amount;
  }
  return {
    volume: value.volume,
    solidPct: value.solidPct,
    remainingByChemical,
    unattributed: value.unattributed,
    hasOpening: value.hasOpening,
  };
}

export function boundToTankSnapshot(bound: BoundTankSnapshot): TankSnapshot {
  const trackedChemicals = Object.values(bound.remainingByChemical).reduce(
    (sum, qty) => sum + qty,
    0,
  );
  return {
    volume: bound.volume,
    solidPct: bound.solidPct,
    remainingByChemical: bound.remainingByChemical,
    unattributed: bound.unattributed,
    trackedTotal: trackedChemicals + bound.unattributed,
    entries: [],
    errors: [],
    hasOpeningBalance: bound.hasOpening,
  };
}

export function snapshotToBound(snapshot: TankSnapshot): BoundTankSnapshot {
  return {
    volume: snapshot.volume,
    solidPct: snapshot.solidPct,
    remainingByChemical: { ...snapshot.remainingByChemical },
    unattributed: snapshot.unattributed,
    hasOpening: snapshot.hasOpeningBalance,
  };
}

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

export function applyDraftsToBound(
  current: BoundTankSnapshot,
  drafts: TankLogDraft[],
): BoundTankSnapshot {
  let volume = current.volume;
  let solidPct = current.solidPct;
  let remaining = { ...current.remainingByChemical };
  let unattributed = current.unattributed;
  let hasOpening = current.hasOpening;

  for (const draft of drafts) {
    if (draft.type === "opening_balance" || draft.type === "add_batch") {
      const pct = draft.solidContentPct ?? 0;
      const newVolume = volume + draft.quantity;
      solidPct = newVolume === 0 ? 0 : (volume * solidPct + draft.quantity * pct) / newVolume;
      volume = newVolume;
      if (draft.chemicalId) {
        remaining = {
          ...remaining,
          [draft.chemicalId]: (remaining[draft.chemicalId] ?? 0) + draft.quantity,
        };
      } else {
        unattributed += draft.quantity;
      }
      if (draft.type === "opening_balance") hasOpening = true;
    } else if (draft.type === "adjust_composition") {
      const payload = parseAdjustNote(draft.note);
      if (payload) {
        remaining = { ...payload.remainingByChemical };
        unattributed = payload.unattributed;
        volume = draft.quantity;
        solidPct = draft.solidContentPct ?? 0;
      }
    } else if (draft.quantity > volume + EPS) {
      continue;
    } else if (volume > EPS) {
      const factor = 1 - draft.quantity / volume;
      const scaled = scaleRemainings(remaining, unattributed, factor);
      remaining = scaled.remaining;
      unattributed = scaled.unattributed;
      volume -= draft.quantity;
    }
  }

  return {
    volume,
    solidPct,
    remainingByChemical: remaining,
    unattributed,
    hasOpening,
  };
}

export function tankRpcError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("updated on another tablet")) return OCCUPANCY_MESSAGE;
  if (lower.includes("not on the factory list")) return NOT_FACTORY_MESSAGE;
  if (lower.includes("too many saves")) return RATE_LIMIT_MESSAGE;
  return message;
}
