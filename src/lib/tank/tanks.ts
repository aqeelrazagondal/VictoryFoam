import type {
  BlendLastCalculation,
  FillLastCalculation,
  Tank,
  TankLogEntry,
} from "./models.ts";
import { emptyBoundSnapshot, parseBoundSnapshot } from "./writes.ts";

export const ACTIVE_TANK_STORAGE_KEY = "victory-foam-active-tank";
export const LEGACY_TANK_NAME = "Tank";

export type TankCalculationMemory = {
  blend?: BlendLastCalculation;
  fill?: FillLastCalculation;
};

export type MigratedTankState = {
  migrated: boolean;
  tanks: Tank[];
  entries: TankLogEntry[];
  lastCalculation: Record<string, TankCalculationMemory>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeStoredTank(value: unknown): Tank | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string") return null;
  return {
    id: value.id,
    name: value.name,
    capacity: typeof value.capacity === "number" ? value.capacity : null,
    heel: typeof value.heel === "number" ? value.heel : 0,
    archivedAt: typeof value.archivedAt === "string" ? value.archivedAt : null,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date(0).toISOString(),
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date(0).toISOString(),
    rowVersion: typeof value.rowVersion === "number" && Number.isFinite(value.rowVersion) ? value.rowVersion : 1,
    snapshot: parseBoundSnapshot(value.snapshot) ?? emptyBoundSnapshot(),
  };
}

export function isDuplicateTankName(name: string, tanks: Tank[], exceptId?: string) {
  const needle = name.trim().toLowerCase();
  return tanks.some(
    (tank) =>
      tank.id !== exceptId &&
      tank.archivedAt === null &&
      tank.name.trim().toLowerCase() === needle,
  );
}

export function liveTankIds(tanks: { id: string; archivedAt: string | null }[]) {
  return tanks.filter((tank) => tank.archivedAt === null).map((tank) => tank.id);
}

export function resolveActiveTankId(tanks: Tank[], preferredId: string | null) {
  const active = tanks
    .filter((tank) => tank.archivedAt === null)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  if (active.length === 0) return null;
  if (preferredId && active.some((tank) => tank.id === preferredId)) return preferredId;
  return active[0].id;
}

export function readActiveTankId() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_TANK_STORAGE_KEY);
}

export function writeActiveTankId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id === null) window.localStorage.removeItem(ACTIVE_TANK_STORAGE_KEY);
  else window.localStorage.setItem(ACTIVE_TANK_STORAGE_KEY, id);
}

/**
 * Turns the old single-tank local snapshot into named tanks.
 * A store that already has a tanks array is left in place.
 * An empty store stays empty so the first screen can ask for a name.
 */
export function migrateStoredTankState(raw: unknown, newTankId: string): MigratedTankState {
  const record = isRecord(raw) ? raw : {};
  if (Array.isArray(record.tanks)) {
    const tanks = record.tanks.map(normalizeStoredTank).filter((tank): tank is Tank => tank !== null);
    const fallback = resolveActiveTankId(tanks, null) ?? "";
    const entries = Array.isArray(record.entries)
      ? (record.entries as TankLogEntry[]).map((entry) => ({
          ...entry,
          tankId: entry.tankId || fallback,
        }))
      : [];
    const lastCalculation = isRecord(record.lastCalculation)
      ? (record.lastCalculation as Record<string, TankCalculationMemory>)
      : {};
    return { migrated: false, tanks, entries, lastCalculation };
  }

  const settings = isRecord(record.settings) ? record.settings : null;
  const entriesIn = Array.isArray(record.entries) ? (record.entries as TankLogEntry[]) : [];
  const legacyLast = isRecord(record.lastCalculation)
    ? (record.lastCalculation as TankCalculationMemory)
    : {};
  const hasLast = Boolean(legacyLast.blend || legacyLast.fill);
  if (settings === null && entriesIn.length === 0 && !hasLast) {
    return { migrated: true, tanks: [], entries: [], lastCalculation: {} };
  }

  const now = new Date().toISOString();
  const tank: Tank = {
    id: newTankId,
    name: LEGACY_TANK_NAME,
    capacity: settings && typeof settings.capacity === "number" ? settings.capacity : null,
    heel: settings && typeof settings.heel === "number" ? settings.heel : 0,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    rowVersion: 1,
    snapshot: emptyBoundSnapshot(),
  };
  return {
    migrated: true,
    tanks: [tank],
    entries: entriesIn.map((entry) => ({ ...entry, tankId: newTankId })),
    lastCalculation: hasLast ? { [newTankId]: { blend: legacyLast.blend, fill: legacyLast.fill } } : {},
  };
}
