import { replayLog } from "@/lib/calculations";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/tank/client";
import type {
  BlendLastCalculation,
  Chemical,
  ChemicalDraft,
  FillLastCalculation,
  LastCalculator,
  StockMovement,
  StockMovementInput,
  StockMovementType,
  Tank,
  TankLogDraft,
  TankLogEntry,
  TankSettings,
} from "@/lib/tank/models";
import { isDuplicateName, parseLastCalculation, STOCK_MOVEMENT_TYPES } from "@/lib/tank/models";
import { pageOf, pageRange, TANK_LIST_PAGE_SIZE, type PageResult } from "@/lib/tank/pagination";
import { filterByQuery, sortBy, type ListSort } from "@/lib/tank/list-query";
import { nextStockBalance, reversedBalance, shouldDeductStock } from "@/lib/tank/stock";
import type { Database, Json } from "@/lib/tank/database.types";
import { overviewsFromEntries, parseTankLogOverviews, type TankLogOverview } from "@/lib/tank/board";
import {
  isDuplicateTankName,
  migrateStoredTankState,
  readActiveTankId,
  resolveActiveTankId,
  writeActiveTankId,
  liveTankIds,
  type TankCalculationMemory,
} from "@/lib/tank/tanks";
import {
  emptyBoundSnapshot,
  NOT_FACTORY_MESSAGE,
  OCCUPANCY_MESSAGE,
  parseBoundSnapshot,
  snapshotToBound,
  tankRpcError,
  type BoundTankSnapshot,
} from "@/lib/tank/writes";

const LOCAL_KEY = "victory-foam-tank-v1";

export { TANK_LIST_PAGE_SIZE, pageOf };
export type { PageResult, ListSort };

export type TankWriteOptions = {
  writeKey: string;
  expectedVersion: number;
};

export type TankWriteResult = {
  entries: TankLogEntry[];
  rowVersion: number;
  snapshot: BoundTankSnapshot;
};

export type ListQuery = {
  page?: number;
  pageSize?: number;
  q?: string;
  sort?: ListSort;
};

export class TankError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TankError";
  }
}

function throwRpc(error: { message: string }): never {
  throw new TankError(tankRpcError(error.message));
}

function ilikeNeedle(q: string) {
  return `%${q.trim().replaceAll("%", "").replaceAll("_", "")}%`;
}

type LocalState = {
  chemicals: Chemical[];
  tanks: Tank[];
  entries: TankLogEntry[];
  movements: StockMovement[];
  lastCalculation: Record<string, TankCalculationMemory>;
};

const emptyLocal = (): LocalState => ({
  chemicals: [],
  tanks: [],
  entries: [],
  movements: [],
  lastCalculation: {},
});

function nowIso() {
  return new Date().toISOString();
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function readLocal(): LocalState {
  if (typeof window === "undefined") return emptyLocal();
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return emptyLocal();
    const parsed = JSON.parse(raw) as {
      chemicals?: Chemical[];
      movements?: StockMovement[];
      tanks?: Tank[];
    };
    const hadTanks = Array.isArray(parsed.tanks);
    const migrated = migrateStoredTankState(parsed, crypto.randomUUID());
    const state: LocalState = {
      chemicals: (parsed.chemicals ?? []).map(normalizeStoredChemical),
      tanks: migrated.tanks,
      entries: migrated.entries,
      movements: parsed.movements ?? [],
      lastCalculation: migrated.lastCalculation,
    };
    if (!hadTanks) {
      writeLocal(state);
      if (state.tanks[0] && !readActiveTankId()) writeActiveTankId(state.tanks[0].id);
    }
    return state;
  } catch {
    return emptyLocal();
  }
}

function writeLocal(state: LocalState) {
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
}

function normalizeStoredChemical(chemical: Chemical): Chemical {
  return {
    ...chemical,
    qtyAvailable: chemical.qtyAvailable ?? null,
    reorderKg: chemical.reorderKg ?? null,
  };
}

function mapChemical(row: Database["public"]["Tables"]["chemicals"]["Row"]): Chemical {
  return {
    id: row.id,
    name: row.name,
    solidContentPct: Number(row.solid_content_pct),
    qtyAvailable: row.qty_available === null ? null : Number(row.qty_available),
    unit: row.unit,
    ohValue: row.oh_value === null ? null : Number(row.oh_value),
    viscosity: row.viscosity === null ? null : Number(row.viscosity),
    reorderKg: row.reorder_kg === null ? null : Number(row.reorder_kg),
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isStockMovementType(value: string): value is StockMovementType {
  return (STOCK_MOVEMENT_TYPES as readonly string[]).includes(value);
}

function mapMovement(
  row: Database["public"]["Tables"]["chemical_stock_movements"]["Row"],
): StockMovement {
  return {
    id: row.id,
    chemicalId: row.chemical_id,
    type: row.type,
    quantity: Number(row.quantity),
    balanceAfter: Number(row.balance_after),
    note: row.note,
    tankLogEntryId: row.tank_log_entry_id,
    createdAt: row.created_at,
  };
}

function mapMovementJson(value: Json): StockMovement {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TankError("Could not read the stock movement.");
  }
  const type = value.type;
  const id = value.id;
  const chemicalId = value.chemical_id;
  const createdAt = value.created_at;
  if (
    typeof type !== "string" ||
    !isStockMovementType(type) ||
    typeof id !== "string" ||
    typeof chemicalId !== "string" ||
    typeof createdAt !== "string"
  ) {
    throw new TankError("Could not read the stock movement.");
  }
  return {
    id,
    chemicalId,
    type,
    quantity: Number(value.quantity),
    balanceAfter: Number(value.balance_after),
    note: typeof value.note === "string" ? value.note : null,
    tankLogEntryId: typeof value.tank_log_entry_id === "string" ? value.tank_log_entry_id : null,
    createdAt,
  };
}

function mapTank(row: Database["public"]["Tables"]["tanks"]["Row"]): Tank {
  return {
    id: row.id,
    name: row.name,
    capacity: row.capacity === null ? null : Number(row.capacity),
    heel: Number(row.heel),
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    rowVersion: row.row_version,
    snapshot: parseBoundSnapshot(row.snapshot) ?? emptyBoundSnapshot(),
  };
}

function refreshLocalSnapshot(local: LocalState, tankId: string) {
  const tank = local.tanks.find((item) => item.id === tankId);
  if (!tank) return;
  const rows = local.entries
    .filter((entry) => entry.tankId === tankId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  tank.snapshot = snapshotToBound(
    replayLog(
      rows.map((entry) => ({
        id: entry.id,
        type: entry.type,
        chemicalId: entry.chemicalId,
        quantity: entry.quantity,
        solidContentPct: entry.solidContentPct,
        note: entry.note,
      })),
    ),
  );
}

function occupyLocal(local: LocalState, tankId: string, expectedVersion: number) {
  const tank = activeLocalTank(local, tankId);
  if (tank.rowVersion !== expectedVersion) {
    throw new TankError(OCCUPANCY_MESSAGE);
  }
  tank.rowVersion += 1;
  tank.updatedAt = nowIso();
}

function mapLogWrite(value: Json | null): TankWriteResult {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TankError("Could not save the entry.");
  }
  const snapshot = parseBoundSnapshot(value.snapshot);
  const rowVersion = Number(value.row_version);
  if (!snapshot || !Number.isFinite(rowVersion)) {
    throw new TankError("Could not save the entry.");
  }
  const entries = Array.isArray(value.entries)
    ? value.entries.map((row) => mapEntryJson(row as Json))
    : value.entry
      ? [mapEntryJson(value.entry as Json)]
      : [];
  return { entries, rowVersion, snapshot };
}

function mapEntryJson(value: Json): TankLogEntry {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TankError("Could not read the tank log row.");
  }
  const type = value.type;
  const id = value.id;
  const tankId = value.tank_id;
  const entryDate = value.entry_date;
  const createdAt = value.created_at;
  if (
    typeof type !== "string" ||
    (type !== "opening_balance" &&
      type !== "add_batch" &&
      type !== "consume_usage" &&
      type !== "adjust_composition") ||
    typeof id !== "string" ||
    typeof tankId !== "string" ||
    typeof entryDate !== "string" ||
    typeof createdAt !== "string"
  ) {
    throw new TankError("Could not read the tank log row.");
  }
  return {
    id,
    tankId,
    entryDate,
    type,
    chemicalId: typeof value.chemical_id === "string" ? value.chemical_id : null,
    quantity: Number(value.quantity),
    solidContentPct:
      value.solid_content_pct === null || value.solid_content_pct === undefined
        ? null
        : Number(value.solid_content_pct),
    note: typeof value.note === "string" ? value.note : null,
    createdAt,
  };
}

function draftToRpcPayload(draft: TankLogDraft): Json {
  return {
    entry_date: draft.entryDate ?? todayIsoDate(),
    type: draft.type,
    chemical_id: draft.chemicalId,
    quantity: draft.quantity,
    solid_content_pct: draft.solidContentPct,
    note: draft.note,
    ...(draft.loggedAt ? { created_at: draft.loggedAt } : {}),
  };
}

function mapEntry(row: Database["public"]["Tables"]["tank_log_entries"]["Row"]): TankLogEntry {
  return {
    id: row.id,
    tankId: row.tank_id,
    entryDate: row.entry_date,
    type: row.type,
    chemicalId: row.chemical_id,
    quantity: Number(row.quantity),
    solidContentPct:
      row.solid_content_pct === null ? null : Number(row.solid_content_pct),
    note: row.note,
    createdAt: row.created_at,
  };
}

function assertTankName(name: string, tanks: Tank[], exceptId?: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new TankError("Tank name is required.");
  if (isDuplicateTankName(trimmed, tanks, exceptId)) {
    throw new TankError("A tank with this name already exists.");
  }
  return trimmed;
}

function assertCapacity(capacity: number | null) {
  if (capacity === null) return null;
  if (!Number.isFinite(capacity) || capacity <= 0) {
    throw new TankError("Tank size must be greater than zero.");
  }
  return capacity;
}

function activeLocalTank(local: LocalState, tankId: string) {
  const tank = local.tanks.find((item) => item.id === tankId && item.archivedAt === null);
  if (!tank) throw new TankError("Choose a tank first.");
  return tank;
}

function duplicateTankError(error: { code?: string; message: string }) {
  if (error.code === "23505") throw new TankError("A tank with this name already exists.");
  throw new TankError(error.message);
}

function assertUniqueName(name: string, chemicals: Chemical[], exceptId?: string) {
  if (isDuplicateName(name, chemicals, exceptId)) {
    throw new TankError("A chemical with this name already exists.");
  }
}

function assertOpeningQty(qty: number | null) {
  if (qty === null) return;
  if (!Number.isFinite(qty) || qty < 0) {
    throw new TankError("Opening stock cannot be negative.");
  }
}

function applyLocalMovement(
  local: LocalState,
  chemicalId: string,
  input: StockMovementInput,
): StockMovement | null {
  const chemical = local.chemicals.find((item) => item.id === chemicalId);
  if (!chemical) throw new TankError("Chemical not found.");
  let change;
  try {
    change = nextStockBalance(chemical.qtyAvailable, input.type, input.quantity);
  } catch (caught) {
    throw new TankError(caught instanceof Error ? caught.message : "Could not update stock.");
  }
  if (!change.applied) return null;
  chemical.qtyAvailable = change.balanceAfter;
  chemical.updatedAt = nowIso();
  const movement: StockMovement = {
    id: crypto.randomUUID(),
    chemicalId,
    type: input.type,
    quantity: change.signedQuantity,
    balanceAfter: change.balanceAfter,
    note: input.note?.trim() || null,
    tankLogEntryId: input.tankLogEntryId ?? null,
    createdAt: nowIso(),
  };
  local.movements = [...local.movements, movement];
  return movement;
}

function reverseLocalLogEntry(local: LocalState, entryId: string) {
  const linked = local.movements.filter((movement) => movement.tankLogEntryId === entryId);
  for (const movement of linked) {
    movement.tankLogEntryId = null;
    const chemical = local.chemicals.find((item) => item.id === movement.chemicalId);
    if (!chemical || chemical.qtyAvailable === null) continue;
    const balance = reversedBalance(chemical.qtyAvailable, movement.quantity);
    chemical.qtyAvailable = balance;
    chemical.updatedAt = nowIso();
    local.movements = [
      ...local.movements,
      {
        id: crypto.randomUUID(),
        chemicalId: movement.chemicalId,
        type: "pour",
        quantity: -movement.quantity,
        balanceAfter: balance,
        note: "Tank log row removed",
        tankLogEntryId: null,
        createdAt: nowIso(),
      },
    ];
  }
}

function deductLocalPours(local: LocalState, entries: TankLogEntry[]) {
  for (const entry of entries) {
    if (!shouldDeductStock(entry.type) || !entry.chemicalId || !(entry.quantity > 0)) continue;
    applyLocalMovement(local, entry.chemicalId, {
      type: "pour",
      quantity: entry.quantity,
      tankLogEntryId: entry.id,
      note: "Poured into the tank",
    });
  }
}

export type FactoryData = {
  chemicals: Chemical[];
  tanks: Tank[];
  activeTankId: string | null;
  /** Kept empty on factory loads; Activity pages the log itself. */
  entries: TankLogEntry[];
  allEntries: TankLogEntry[];
  overviews: TankLogOverview[];
  loggedChemicalIds: string[];
};

function loggedChemicalIdsFrom(entries: { chemicalId: string | null }[]) {
  return [...new Set(entries.map((entry) => entry.chemicalId).filter((id): id is string => Boolean(id)))];
}

function rememberActiveTank(id: string | null) {
  writeActiveTankId(id);
  return id;
}

export async function loadFactory(preferredTankId: string | null): Promise<FactoryData> {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    const local = readLocal();
    for (const tank of local.tanks) refreshLocalSnapshot(local, tank.id);
    const activeTankId = rememberActiveTank(
      resolveActiveTankId(local.tanks, preferredTankId ?? readActiveTankId()),
    );
    const allEntries = [...local.entries].sort(
      (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
    );
    return {
      chemicals: local.chemicals,
      tanks: local.tanks,
      activeTankId,
      entries: [],
      allEntries: [],
      overviews: overviewsFromEntries(liveTankIds(local.tanks), allEntries),
      loggedChemicalIds: loggedChemicalIdsFrom(local.entries),
    };
  }

  const member = await supabase.from("factory_users").select("user_id").maybeSingle();
  if (member.error) throwRpc(member.error);
  if (!member.data) throw new TankError(NOT_FACTORY_MESSAGE);

  const [chemicalsRes, tanksRes, usedRes] = await Promise.all([
    supabase.from("chemicals").select("*").order("name"),
    supabase.from("tanks").select("*").order("created_at").order("id"),
    supabase.rpc("logged_chemical_ids"),
  ]);

  if (chemicalsRes.error) throwRpc(chemicalsRes.error);
  if (tanksRes.error) throwRpc(tanksRes.error);
  if (usedRes.error) throwRpc(usedRes.error);

  const tanks = (tanksRes.data ?? []).map(mapTank);
  const activeTankId = rememberActiveTank(
    resolveActiveTankId(tanks, preferredTankId ?? readActiveTankId()),
  );
  const liveIds = liveTankIds(tanks);

  let overviews: TankLogOverview[] = [];
  if (liveIds.length > 0) {
    const overviewRes = await supabase.rpc("tank_log_overviews", { p_tank_ids: liveIds });
    if (overviewRes.error) throwRpc(overviewRes.error);
    overviews = parseTankLogOverviews(overviewRes.data);
  }

  return {
    chemicals: (chemicalsRes.data ?? []).map(mapChemical),
    tanks,
    activeTankId,
    entries: [],
    allEntries: [],
    overviews,
    loggedChemicalIds: usedRes.data ?? [],
  };
}

/**
 * One page of tank log rows, newest first. Local storage pages the array here;
 * Supabase uses `.range()` with an exact count — the UI must not slice a full list.
 */
function newestLogFirst(entries: TankLogEntry[]) {
  return [...entries].sort((a, b) => {
    const byTime = b.createdAt.localeCompare(a.createdAt);
    return byTime !== 0 ? byTime : b.id.localeCompare(a.id);
  });
}

export async function listLogEntriesPage(
  tankId: string | null,
  options?: ListQuery,
): Promise<PageResult<TankLogEntry>> {
  const { from, to, pageSize, page } = pageRange(
    options?.page ?? 1,
    options?.pageSize ?? TANK_LIST_PAGE_SIZE,
  );
  const q = options?.q?.trim() ?? "";
  const sort = options?.sort ?? "newest";
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    let newestFirst = newestLogFirst(
      readLocal().entries.filter((entry) => tankId == null || entry.tankId === tankId),
    );
    newestFirst = filterByQuery(
      newestFirst,
      q,
      (entry) => `${entry.note ?? ""} ${entry.type} ${entry.chemicalId ?? ""}`,
    );
    if (sort === "oldest") newestFirst = [...newestFirst].reverse();
    return pageOf(newestFirst, page, pageSize);
  }

  let query = supabase.from("tank_log_entries").select("*", { count: "exact" });
  if (tankId) query = query.eq("tank_id", tankId);
  if (q) query = query.ilike("note", ilikeNeedle(q));
  query =
    sort === "oldest"
      ? query.order("created_at", { ascending: true }).order("id", { ascending: true })
      : query.order("created_at", { ascending: false }).order("id", { ascending: false });
  const { data, error, count } = await query.range(from, to);

  if (error) throwRpc(error);
  return {
    rows: (data ?? []).map(mapEntry),
    total: count ?? 0,
  };
}

/** Newest usage, otherwise the newest pour. Openings and corrections are not jobs. */
export async function latestFactoryProduction(tankId?: string | null): Promise<TankLogEntry | null> {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    const newestFirst = newestLogFirst(
      readLocal().entries.filter((entry) => tankId == null || entry.tankId === tankId),
    );
    return (
      newestFirst.find((entry) => entry.type === "consume_usage" || entry.type === "add_batch") ??
      null
    );
  }

  let query = supabase
    .from("tank_log_entries")
    .select("*")
    .in("type", ["consume_usage", "add_batch"])
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1);
  if (tankId) query = query.eq("tank_id", tankId);
  const job = await query.maybeSingle();
  if (job.error) throw new TankError(job.error.message);
  return job.data ? mapEntry(job.data) : null;
}

/**
 * One page of active chemicals, name order. Same page contract as the log list.
 */
export async function listChemicalsPage(options?: ListQuery): Promise<PageResult<Chemical>> {
  const { from, to, pageSize, page } = pageRange(
    options?.page ?? 1,
    options?.pageSize ?? TANK_LIST_PAGE_SIZE,
  );
  const q = options?.q?.trim() ?? "";
  const sort = options?.sort ?? "name";
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    let active = readLocal().chemicals.filter((chemical) => chemical.archivedAt === null);
    active = filterByQuery(active, q, (chemical) => chemical.name);
    active =
      sort === "newest"
        ? sortBy(active, "newest", (chemical) => chemical.createdAt)
        : sort === "qty"
          ? sortBy(active, "qty", (chemical) => chemical.qtyAvailable ?? Number.POSITIVE_INFINITY)
          : sortBy(active, "name", (chemical) => chemical.name);
    return pageOf(active, page, pageSize);
  }

  let query = supabase.from("chemicals").select("*", { count: "exact" }).is("archived_at", null);
  if (q) query = query.ilike("name", ilikeNeedle(q));
  if (sort === "newest") {
    query = query.order("created_at", { ascending: false }).order("id", { ascending: false });
  } else if (sort === "qty") {
    query = query.order("qty_available", { ascending: true, nullsFirst: false }).order("name");
  } else {
    query = query.order("name");
  }
  const { data, error, count } = await query.range(from, to);

  if (error) throwRpc(error);
  return {
    rows: (data ?? []).map(mapChemical),
    total: count ?? 0,
  };
}

export async function createChemical(draft: ChemicalDraft, existing: Chemical[]) {
  const name = draft.name.trim();
  if (!name) throw new TankError("Name is required.");
  if (Number.isNaN(draft.solidContentPct) || draft.solidContentPct < 0 || draft.solidContentPct > 100) {
    throw new TankError("Solid Content % must be between 0 and 100.");
  }
  assertUniqueName(name, existing);
  assertOpeningQty(draft.qtyAvailable);

  const supabase = getSupabaseBrowser();
  if (!supabase) {
    const local = readLocal();
    const created: Chemical = {
      id: crypto.randomUUID(),
      name,
      solidContentPct: draft.solidContentPct,
      qtyAvailable: null,
      unit: draft.unit.trim() || "kg",
      ohValue: draft.ohValue,
      viscosity: draft.viscosity,
      reorderKg: null,
      archivedAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    local.chemicals = [...local.chemicals, created];
    if (draft.qtyAvailable !== null) {
      applyLocalMovement(local, created.id, {
        type: "count",
        quantity: draft.qtyAvailable,
        note: "Opening balance",
      });
    }
    writeLocal(local);
    return created;
  }

  const { data, error } = await supabase
    .from("chemicals")
    .insert({
      name,
      solid_content_pct: draft.solidContentPct,
      qty_available: null,
      unit: draft.unit.trim() || "kg",
      oh_value: draft.ohValue,
      viscosity: draft.viscosity,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") throw new TankError("A chemical with this name already exists.");
    throw new TankError(error.message);
  }
  const chemical = mapChemical(data);
  if (draft.qtyAvailable === null) return chemical;
  await applyStockMovement(
    chemical.id,
    {
      type: "count",
      quantity: draft.qtyAvailable,
      note: "Opening balance",
    },
    crypto.randomUUID(),
  );
  return { ...chemical, qtyAvailable: draft.qtyAvailable };
}

export async function updateChemical(
  id: string,
  draft: ChemicalDraft,
  existing: Chemical[],
) {
  const name = draft.name.trim();
  if (!name) throw new TankError("Name is required.");
  assertUniqueName(name, existing, id);

  const supabase = getSupabaseBrowser();
  if (!supabase) {
    const local = readLocal();
    local.chemicals = local.chemicals.map((chemical) =>
      chemical.id === id
        ? {
            ...chemical,
            name,
            solidContentPct: draft.solidContentPct,
            unit: draft.unit.trim() || "kg",
            ohValue: draft.ohValue,
            viscosity: draft.viscosity,
            updatedAt: nowIso(),
          }
        : chemical,
    );
    writeLocal(local);
    return;
  }

  const { error } = await supabase
    .from("chemicals")
    .update({
      name,
      solid_content_pct: draft.solidContentPct,
      unit: draft.unit.trim() || "kg",
      oh_value: draft.ohValue,
      viscosity: draft.viscosity,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") throw new TankError("A chemical with this name already exists.");
    throw new TankError(error.message);
  }
}

export async function archiveChemical(id: string) {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    const local = readLocal();
    local.chemicals = local.chemicals.map((chemical) =>
      chemical.id === id ? { ...chemical, archivedAt: nowIso(), updatedAt: nowIso() } : chemical,
    );
    writeLocal(local);
    return;
  }

  const { error } = await supabase
    .from("chemicals")
    .update({ archived_at: nowIso() })
    .eq("id", id);
  if (error) throw new TankError(error.message);
}

export async function deleteChemical(id: string) {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    const local = readLocal();
    if (local.entries.some((entry) => entry.chemicalId === id)) {
      throw new TankError("This chemical appears in the tank log. Archive it instead.");
    }
    if (local.movements.some((movement) => movement.chemicalId === id)) {
      throw new TankError("This chemical has stock history. Archive it instead.");
    }
    local.chemicals = local.chemicals.filter((chemical) => chemical.id !== id);
    writeLocal(local);
    return;
  }

  const { count: logCount, error: logCountError } = await supabase
    .from("tank_log_entries")
    .select("id", { count: "exact", head: true })
    .eq("chemical_id", id);
  if (logCountError) throw new TankError(logCountError.message);
  if ((logCount ?? 0) > 0) {
    throw new TankError("This chemical appears in the tank log. Archive it instead.");
  }

  const { count, error: countError } = await supabase
    .from("chemical_stock_movements")
    .select("id", { count: "exact", head: true })
    .eq("chemical_id", id);
  if (countError) throw new TankError(countError.message);
  if ((count ?? 0) > 0) {
    throw new TankError("This chemical has stock history. Archive it instead.");
  }

  const { error } = await supabase.from("chemicals").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      throw new TankError("This chemical has stock history. Archive it instead.");
    }
    throw new TankError(error.message);
  }
}

export async function createTank(input: { name: string; capacity: number | null }) {
  const capacity = assertCapacity(input.capacity);
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    const local = readLocal();
    const name = assertTankName(input.name, local.tanks);
    const now = nowIso();
    const tank: Tank = {
      id: crypto.randomUUID(),
      name,
      capacity,
      heel: 0,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
      rowVersion: 1,
      snapshot: emptyBoundSnapshot(),
    };
    local.tanks = [...local.tanks, tank];
    writeLocal(local);
    return tank;
  }

  const { data: existing, error: existingError } = await supabase
    .from("tanks")
    .select("*")
    .is("archived_at", null);
  if (existingError) throw new TankError(existingError.message);
  const name = assertTankName(input.name, (existing ?? []).map(mapTank));

  const { data, error } = await supabase
    .from("tanks")
    .insert({ name, capacity, heel: 0 })
    .select("*")
    .single();
  if (error) duplicateTankError(error);
  if (!data) throw new TankError("Could not create the tank.");
  return mapTank(data);
}

export async function renameTank(id: string, name: string) {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    const local = readLocal();
    const trimmed = assertTankName(name, local.tanks, id);
    const tank = activeLocalTank(local, id);
    tank.name = trimmed;
    tank.updatedAt = nowIso();
    writeLocal(local);
    return;
  }

  const { data: existing, error: existingError } = await supabase
    .from("tanks")
    .select("*")
    .is("archived_at", null);
  if (existingError) throw new TankError(existingError.message);
  const trimmed = assertTankName(name, (existing ?? []).map(mapTank), id);
  const { error } = await supabase.from("tanks").update({ name: trimmed }).eq("id", id);
  if (error) duplicateTankError(error);
}

export async function removeTank(id: string) {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    const local = readLocal();
    const tank = local.tanks.find((item) => item.id === id);
    if (!tank || tank.archivedAt) return;
    const hasLog = local.entries.some((entry) => entry.tankId === id);
    if (hasLog) {
      tank.archivedAt = nowIso();
      tank.updatedAt = tank.archivedAt;
    } else {
      local.tanks = local.tanks.filter((item) => item.id !== id);
      delete local.lastCalculation[id];
    }
    writeLocal(local);
    return;
  }

  const { count, error: countError } = await supabase
    .from("tank_log_entries")
    .select("id", { count: "exact", head: true })
    .eq("tank_id", id);
  if (countError) throw new TankError(countError.message);
  if ((count ?? 0) > 0) {
    const { error } = await supabase
      .from("tanks")
      .update({ archived_at: nowIso() })
      .eq("id", id)
      .is("archived_at", null);
    if (error) throw new TankError(error.message);
    return;
  }

  const { error: calcError } = await supabase.from("last_calculation").delete().eq("tank_id", id);
  if (calcError) throw new TankError(calcError.message);
  const { error } = await supabase.from("tanks").delete().eq("id", id);
  if (error) throw new TankError(error.message);
}

export async function saveTankSettings(tankId: string, settings: TankSettings) {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    const local = readLocal();
    const tank = activeLocalTank(local, tankId);
    tank.capacity = settings.capacity;
    tank.heel = settings.heel;
    tank.updatedAt = nowIso();
    writeLocal(local);
    return;
  }

  const { error } = await supabase
    .from("tanks")
    .update({
      capacity: settings.capacity,
      heel: settings.heel,
    })
    .eq("id", tankId);
  if (error) throw new TankError(error.message);
}

export async function insertLogEntries(
  tankId: string,
  drafts: TankLogDraft[],
  write: TankWriteOptions,
) {
  if (drafts.length === 0) {
    return { entries: [], rowVersion: write.expectedVersion, snapshot: emptyBoundSnapshot() };
  }
  const base = Date.now();
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    const local = readLocal();
    occupyLocal(local, tankId, write.expectedVersion);
    const created: TankLogEntry[] = drafts.map((draft, index) => ({
      id: crypto.randomUUID(),
      tankId,
      entryDate: draft.entryDate ?? todayIsoDate(),
      type: draft.type,
      chemicalId: draft.chemicalId,
      quantity: draft.quantity,
      solidContentPct: draft.solidContentPct,
      note: draft.note,
      createdAt: draft.loggedAt ?? new Date(base + index).toISOString(),
    }));
    local.entries = [...local.entries, ...created];
    deductLocalPours(local, created);
    refreshLocalSnapshot(local, tankId);
    writeLocal(local);
    const tank = local.tanks.find((item) => item.id === tankId);
    return {
      entries: created,
      rowVersion: tank?.rowVersion ?? write.expectedVersion + 1,
      snapshot: tank?.snapshot ?? emptyBoundSnapshot(),
    };
  }

  const { data, error } = await supabase.rpc("insert_tank_log_entries", {
    p_tank_id: tankId,
    p_entries: drafts.map((draft, index) =>
      draftToRpcPayload({
        ...draft,
        loggedAt: draft.loggedAt ?? new Date(base + index).toISOString(),
      }),
    ),
    p_write_key: write.writeKey,
    p_expected_version: write.expectedVersion,
  });
  if (error) throwRpc(error);
  return mapLogWrite(data);
}

/**
 * Writes log rows and matching pour stock in one database call.
 * Retry a timeout only with the same write key.
 */
export async function insertLogEntry(tankId: string, draft: TankLogDraft, write: TankWriteOptions) {
  const created = await insertLogEntries(tankId, [draft], write);
  const row = created.entries[0];
  if (!row) throw new TankError("Could not save the entry.");
  return row;
}

export async function updateLogEntry(id: string, draft: TankLogDraft, write: TankWriteOptions) {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    const local = readLocal();
    const current = local.entries.find((entry) => entry.id === id);
    if (!current) throw new TankError("Log row not found.");
    occupyLocal(local, current.tankId, write.expectedVersion);
    reverseLocalLogEntry(local, id);
    local.entries = local.entries.map((entry) =>
      entry.id === id
        ? {
            ...entry,
            entryDate: draft.entryDate ?? entry.entryDate,
            type: draft.type,
            chemicalId: draft.chemicalId,
            quantity: draft.quantity,
            solidContentPct: draft.solidContentPct,
            note: draft.note,
            createdAt: draft.loggedAt ?? entry.createdAt,
          }
        : entry,
    );
    if (shouldDeductStock(draft.type) && draft.chemicalId && draft.quantity > 0) {
      applyLocalMovement(local, draft.chemicalId, {
        type: "pour",
        quantity: draft.quantity,
        tankLogEntryId: id,
        note: "Poured into the tank",
      });
    }
    refreshLocalSnapshot(local, current.tankId);
    writeLocal(local);
    const tank = local.tanks.find((item) => item.id === current.tankId);
    return {
      entries: local.entries.filter((entry) => entry.id === id),
      rowVersion: tank?.rowVersion ?? write.expectedVersion + 1,
      snapshot: tank?.snapshot ?? emptyBoundSnapshot(),
    };
  }

  const { data, error } = await supabase.rpc("replace_tank_log_entry", {
    p_id: id,
    p_entry: draftToRpcPayload(draft),
    p_write_key: write.writeKey,
    p_expected_version: write.expectedVersion,
  });
  if (error) throwRpc(error);
  return mapLogWrite(data);
}

export async function deleteLogEntry(id: string, write: TankWriteOptions) {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    const local = readLocal();
    const current = local.entries.find((entry) => entry.id === id);
    if (!current) throw new TankError("Log row not found.");
    occupyLocal(local, current.tankId, write.expectedVersion);
    reverseLocalLogEntry(local, id);
    local.entries = local.entries.filter((entry) => entry.id !== id);
    refreshLocalSnapshot(local, current.tankId);
    writeLocal(local);
    const tank = local.tanks.find((item) => item.id === current.tankId);
    return {
      entries: [],
      rowVersion: tank?.rowVersion ?? write.expectedVersion + 1,
      snapshot: tank?.snapshot ?? emptyBoundSnapshot(),
    };
  }

  const { data, error } = await supabase.rpc("delete_tank_log_entry", {
    p_id: id,
    p_write_key: write.writeKey,
    p_expected_version: write.expectedVersion,
  });
  if (error) throwRpc(error);
  return mapLogWrite(data);
}

export async function applyStockMovements(
  lines: { chemicalId: string; input: StockMovementInput }[],
  writeKey: string,
): Promise<(StockMovement | null)[]> {
  if (lines.length === 0) return [];
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    const local = readLocal();
    const movements = lines.map((line) => applyLocalMovement(local, line.chemicalId, line.input));
    writeLocal(local);
    return movements;
  }

  const { data, error } = await supabase.rpc("apply_stock_movements", {
    p_moves: lines.map((line) => ({
      chemical_id: line.chemicalId,
      type: line.input.type,
      quantity: line.input.quantity,
      note: line.input.note ?? null,
      tank_log_entry_id: line.input.tankLogEntryId ?? null,
    })),
    p_write_key: writeKey,
  });
  if (error) throwRpc(error);
  const rows =
    typeof data === "object" && data !== null && !Array.isArray(data) && Array.isArray(data.movements)
      ? data.movements
      : data;
  if (!Array.isArray(rows)) throw new TankError("Could not record stock movements.");
  return rows.map((row) => (row == null ? null : mapMovementJson(row)));
}

export async function applyStockMovement(
  chemicalId: string,
  input: StockMovementInput,
  writeKey: string,
): Promise<StockMovement | null> {
  const [movement] = await applyStockMovements([{ chemicalId, input }], writeKey);
  return movement ?? null;
}

export async function listStockMovements(
  chemicalId: string,
  options?: ListQuery,
): Promise<PageResult<StockMovement>> {
  const { from, to, pageSize, page } = pageRange(
    options?.page ?? 1,
    options?.pageSize ?? TANK_LIST_PAGE_SIZE,
  );
  const q = options?.q?.trim() ?? "";
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    let rows = readLocal()
      .movements.filter((movement) => movement.chemicalId === chemicalId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
    rows = filterByQuery(rows, q, (movement) => `${movement.note ?? ""} ${movement.type}`);
    return pageOf(rows, page, pageSize);
  }

  let query = supabase
    .from("chemical_stock_movements")
    .select("*", { count: "exact" })
    .eq("chemical_id", chemicalId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (q) query = query.ilike("note", ilikeNeedle(q));
  const { data, error, count } = await query.range(from, to);
  if (error) throwRpc(error);
  return {
    rows: (data ?? []).map(mapMovement),
    total: count ?? 0,
  };
}

export async function setReorderKg(id: string, reorderKg: number | null) {
  if (reorderKg !== null && (!Number.isFinite(reorderKg) || reorderKg < 0)) {
    throw new TankError("Low-stock line cannot be negative.");
  }
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    const local = readLocal();
    const chemical = local.chemicals.find((item) => item.id === id);
    if (!chemical) throw new TankError("Chemical not found.");
    chemical.reorderKg = reorderKg;
    chemical.updatedAt = nowIso();
    writeLocal(local);
    return;
  }

  const { error } = await supabase.from("chemicals").update({ reorder_kg: reorderKg }).eq("id", id);
  if (error) throw new TankError(error.message);
}

export async function getLastCalculation(tankId: string, calculator: LastCalculator) {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    return parseLastCalculation(calculator, readLocal().lastCalculation[tankId]?.[calculator] ?? null);
  }

  const { data, error } = await supabase
    .from("last_calculation")
    .select("payload")
    .eq("tank_id", tankId)
    .eq("calculator", calculator)
    .maybeSingle();
  if (error) throw new TankError(error.message);
  return parseLastCalculation(calculator, data?.payload);
}

export async function saveLastCalculation(
  tankId: string,
  calculator: LastCalculator,
  payload: BlendLastCalculation | FillLastCalculation,
) {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    const local = readLocal();
    activeLocalTank(local, tankId);
    const memory = local.lastCalculation[tankId] ?? {};
    if (calculator === "blend") memory.blend = payload as BlendLastCalculation;
    else memory.fill = payload as FillLastCalculation;
    local.lastCalculation[tankId] = memory;
    writeLocal(local);
    return;
  }

  const { error } = await supabase.from("last_calculation").upsert({
    tank_id: tankId,
    calculator,
    payload: payload as Json,
  });
  if (error) throw new TankError(error.message);
}

export { isSupabaseConfigured };
