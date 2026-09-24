import type { TankLogEntry } from "@/lib/tank/models";

export type TankLogOverview = {
  tankId: string;
  ready: boolean;
  lastCreatedAt: string | null;
  lastEntryDate: string | null;
};

export function logSourceForTank(
  tankId: string,
  activeTankId: string | null,
  activeEntries: TankLogEntry[],
  allEntries: TankLogEntry[],
): TankLogEntry[] {
  if (tankId === activeTankId) return activeEntries;
  return allEntries.filter((entry) => entry.tankId === tankId);
}

export function parseTankLogOverviews(value: unknown): TankLogOverview[] {
  if (!Array.isArray(value)) return [];
  const rows: TankLogOverview[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const row = item as {
      tank_id?: unknown;
      tankId?: unknown;
      ready?: unknown;
      last_created_at?: unknown;
      lastCreatedAt?: unknown;
      last_entry_date?: unknown;
      lastEntryDate?: unknown;
    };
    const tankId = typeof row.tank_id === "string" ? row.tank_id : typeof row.tankId === "string" ? row.tankId : null;
    if (!tankId) continue;
    const lastCreatedAt =
      typeof row.last_created_at === "string"
        ? row.last_created_at
        : typeof row.lastCreatedAt === "string"
          ? row.lastCreatedAt
          : null;
    const lastEntryDate =
      typeof row.last_entry_date === "string"
        ? row.last_entry_date
        : typeof row.lastEntryDate === "string"
          ? row.lastEntryDate
          : null;
    rows.push({
      tankId,
      ready: row.ready === true,
      lastCreatedAt,
      lastEntryDate,
    });
  }
  return rows;
}

export function overviewsFromEntries(tankIds: string[], entries: TankLogEntry[]): TankLogOverview[] {
  return tankIds.map((tankId) => {
    const rows = entries
      .filter((entry) => entry.tankId === tankId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
    const first = rows[0];
    const last = rows[rows.length - 1];
    return {
      tankId,
      ready: first?.type === "opening_balance",
      lastCreatedAt: last?.createdAt ?? null,
      lastEntryDate: last?.entryDate ?? null,
    };
  });
}
