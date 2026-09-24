import type { StockMovementInput, TankLogDraft } from "./models.ts";
import { createWriteAttempt, type WriteAttempt } from "./writes.ts";

export const WRITE_QUEUE_KEY = "victory-foam-tank-offline-queue";

export type MemoryStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

export type QueuedWrite =
  | {
      writeKey: string;
      expectedVersion: number;
      kind: "insert-log";
      tankId: string;
      drafts: TankLogDraft[];
    }
  | {
      writeKey: string;
      expectedVersion: number;
      kind: "replace-log";
      id: string;
      draft: TankLogDraft;
    }
  | {
      writeKey: string;
      expectedVersion: number;
      kind: "delete-log";
      id: string;
    }
  | {
      writeKey: string;
      expectedVersion: number;
      kind: "stock";
      moves: { chemicalId: string; input: StockMovementInput }[];
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function defaultStorage(): MemoryStorage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function parseQueuedWrite(value: unknown): QueuedWrite | null {
  if (!isRecord(value) || typeof value.writeKey !== "string" || typeof value.kind !== "string") {
    return null;
  }
  const expectedVersion =
    typeof value.expectedVersion === "number" && Number.isFinite(value.expectedVersion)
      ? value.expectedVersion
      : null;
  if (expectedVersion === null) return null;
  if (value.kind === "insert-log") {
    if (typeof value.tankId !== "string" || !Array.isArray(value.drafts)) return null;
    return {
      writeKey: value.writeKey,
      expectedVersion,
      kind: "insert-log",
      tankId: value.tankId,
      drafts: value.drafts as TankLogDraft[],
    };
  }
  if (value.kind === "replace-log") {
    if (typeof value.id !== "string" || !isRecord(value.draft)) return null;
    return {
      writeKey: value.writeKey,
      expectedVersion,
      kind: "replace-log",
      id: value.id,
      draft: value.draft as TankLogDraft,
    };
  }
  if (value.kind === "delete-log") {
    if (typeof value.id !== "string") return null;
    return {
      writeKey: value.writeKey,
      expectedVersion,
      kind: "delete-log",
      id: value.id,
    };
  }
  if (value.kind === "stock") {
    if (!Array.isArray(value.moves)) return null;
    return {
      writeKey: value.writeKey,
      expectedVersion,
      kind: "stock",
      moves: value.moves as QueuedWrite extends { kind: "stock" } ? QueuedWrite["moves"] : never,
    };
  }
  return null;
}

export function readWriteQueue(storage: MemoryStorage | null = defaultStorage()): QueuedWrite[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(WRITE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(parseQueuedWrite).filter((row): row is QueuedWrite => row !== null);
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedWrite[], storage: MemoryStorage | null) {
  if (!storage) return;
  storage.setItem(WRITE_QUEUE_KEY, JSON.stringify(items));
}

export function enqueueWrite(
  item: QueuedWrite,
  storage: MemoryStorage | null = defaultStorage(),
): QueuedWrite[] {
  const current = readWriteQueue(storage);
  if (current.some((row) => row.writeKey === item.writeKey)) return current;
  const next = [...current, item];
  writeQueue(next, storage);
  return next;
}

export function dropQueuedWrite(
  writeKey: string,
  storage: MemoryStorage | null = defaultStorage(),
): QueuedWrite[] {
  const next = readWriteQueue(storage).filter((row) => row.writeKey !== writeKey);
  writeQueue(next, storage);
  return next;
}

export function queueAttemptKey(existing: WriteAttempt | null): WriteAttempt {
  return existing ?? createWriteAttempt();
}
