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
import { isDuplicateName, STOCK_MOVEMENT_TYPES } from "@/lib/tank/models";
import { pageOf, pageRange, TANK_LIST_PAGE_SIZE, type PageResult } from "@/lib/tank/pagination";
import { nextStockBalance, reversedBalance, shouldDeductStock } from "@/lib/tank/stock";
import type { Database, Json } from "@/lib/tank/database.types";
import {
  isDuplicateTankName,
  migrateStoredTankState,
  readActiveTankId,
  resolveActiveTankId,
  writeActiveTankId,
  type TankCalculationMemory,
} from "@/lib/tank/tanks";

const LOCAL_KEY = "victory-foam-tank-v1";

export { TANK_LIST_PAGE_SIZE, pageOf };
export type { PageResult };

export class TankError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TankError";
  }
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
  /** Log rows for the selected tank, oldest first. */
  entries: TankLogEntry[];
  /** Log rows for every tank, oldest first. Home uses these to show each mix. */
  allEntries: TankLogEntry[];
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
      entries: allEntries.filter((entry) => entry.tankId === activeTankId),
      allEntries,
      loggedChemicalIds: loggedChemicalIdsFrom(local.entries),
    };
  }

  const [chemicalsRes, tanksRes, usedRes] = await Promise.all([
    supabase.from("chemicals").select("*").order("name"),
    supabase.from("tanks").select("*").order("created_at").order("id"),
    supabase.from("tank_log_entries").select("chemical_id").not("chemical_id", "is", null).limit(10000),
  ]);

  if (chemicalsRes.error) throw new TankError(chemicalsRes.error.message);
  if (tanksRes.error) throw new TankError(tanksRes.error.message);
  if (usedRes.error) throw new TankError(usedRes.error.message);

  const tanks = (tanksRes.data ?? []).map(mapTank);
  const activeTankId = rememberActiveTank(
    resolveActiveTankId(tanks, preferredTankId ?? readActiveTankId()),
  );
  const entriesRes = await supabase
    .from("tank_log_entries")
    .select("*")
    .order("created_at")
    .order("id");
  if (entriesRes.error) throw new TankError(entriesRes.error.message);
  const allEntries = (entriesRes.data ?? []).map(mapEntry);
  const entries = activeTankId ? allEntries.filter((entry) => entry.tankId === activeTankId) : [];

  return {
    chemicals: (chemicalsRes.data ?? []).map(mapChemical),
    tanks,
    activeTankId,
    entries,
    allEntries,
    loggedChemicalIds: [
      ...new Set(
        (usedRes.data ?? [])
          .map((row) => row.chemical_id)
          .filter((id): id is string => typeof id === "string"),
      ),
    ],
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
  options?: {
    page?: number;
    pageSize?: number;
  },
): Promise<PageResult<TankLogEntry>> {
  const { from, to, pageSize, page } = pageRange(
    options?.page ?? 1,
    options?.pageSize ?? TANK_LIST_PAGE_SIZE,
  );
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    const newestFirst = newestLogFirst(
      readLocal().entries.filter((entry) => tankId == null || entry.tankId === tankId),
    );
    return pageOf(newestFirst, page, pageSize);
  }

  let query = supabase
    .from("tank_log_entries")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (tankId) query = query.eq("tank_id", tankId);
  const { data, error, count } = await query.range(from, to);

  if (error) throw new TankError(error.message);
  return {
    rows: (data ?? []).map(mapEntry),
    total: count ?? 0,
  };
}

/** Newest usage across every tank, otherwise the newest pour. Openings and corrections are not jobs. */
export async function latestFactoryProduction(): Promise<TankLogEntry | null> {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    const newestFirst = newestLogFirst(readLocal().entries);
    return (
      newestFirst.find((entry) => entry.type === "consume_usage" || entry.type === "add_batch") ??
      null
    );
  }

  const job = await supabase
    .from("tank_log_entries")
    .select("*")
    .in("type", ["consume_usage", "add_batch"])
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (job.error) throw new TankError(job.error.message);
  return job.data ? mapEntry(job.data) : null;
}

/**
 * One page of active chemicals, name order. Same page contract as the log list.
 */
export async function listChemicalsPage(options?: {
  page?: number;
  pageSize?: number;
}): Promise<PageResult<Chemical>> {
  const { from, to, pageSize, page } = pageRange(
    options?.page ?? 1,
    options?.pageSize ?? TANK_LIST_PAGE_SIZE,
  );
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    const active = readLocal()
      .chemicals.filter((chemical) => chemical.archivedAt === null)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    return pageOf(active, page, pageSize);
  }

  const { data, error, count } = await supabase
    .from("chemicals")
    .select("*", { count: "exact" })
    .is("archived_at", null)
    .order("name")
    .range(from, to);

  if (error) throw new TankError(error.message);
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
  await applyStockMovement(chemical.id, {
    type: "count",
    quantity: draft.qtyAvailable,
    note: "Opening balance",
  });
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

export async function insertLogEntries(tankId: string, drafts: TankLogDraft[]) {
  if (drafts.length === 0) return [];
  const base = Date.now();
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    const local = readLocal();
    activeLocalTank(local, tankId);
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
    writeLocal(local);
    return created;
  }

  const { data, error } = await supabase
    .from("tank_log_entries")
    .insert(
      drafts.map((draft, index) => ({
        tank_id: tankId,
        entry_date: draft.entryDate ?? todayIsoDate(),
        type: draft.type,
        chemical_id: draft.chemicalId,
        quantity: draft.quantity,
        solid_content_pct: draft.solidContentPct,
        note: draft.note,
        created_at: draft.loggedAt ?? new Date(base + index).toISOString(),
      })),
    )
    .select("*");
  if (error) throw new TankError(error.message);
  const created = (data ?? []).map(mapEntry).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  await deductRemotePours(created);
  return created;
}

/**
 * Writes one log row, then deducts shelf stock for pours in a separate call.
 * There is no idempotency key and no tank version check. A disabled button
 * does not make a repeated submit safe. Do not retry automatically after a
 * timeout; reload history and match the intended row first.
 */
export async function insertLogEntry(tankId: string, draft: TankLogDraft) {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    const local = readLocal();
    activeLocalTank(local, tankId);
    const created: TankLogEntry = {
      id: crypto.randomUUID(),
      tankId,
      entryDate: draft.entryDate ?? todayIsoDate(),
      type: draft.type,
      chemicalId: draft.chemicalId,
      quantity: draft.quantity,
      solidContentPct: draft.solidContentPct,
      note: draft.note,
      createdAt: draft.loggedAt ?? nowIso(),
    };
    local.entries = [...local.entries, created];
    deductLocalPours(local, [created]);
    writeLocal(local);
    return created;
  }

  const { data, error } = await supabase
    .from("tank_log_entries")
    .insert({
      tank_id: tankId,
      entry_date: draft.entryDate ?? todayIsoDate(),
      type: draft.type,
      chemical_id: draft.chemicalId,
      quantity: draft.quantity,
      solid_content_pct: draft.solidContentPct,
      note: draft.note,
      ...(draft.loggedAt ? { created_at: draft.loggedAt } : {}),
    })
    .select("*")
    .single();
  if (error) throw new TankError(error.message);
  const created = mapEntry(data);
  await deductRemotePours([created]);
  return created;
}

export async function updateLogEntry(id: string, draft: TankLogDraft) {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    const local = readLocal();
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
    writeLocal(local);
    return;
  }

  const { error: reverseError } = await supabase.rpc("reverse_stock_for_log_entry", {
    p_entry_id: id,
  });
  if (reverseError) throw new TankError(reverseError.message);

  const { error } = await supabase
    .from("tank_log_entries")
    .update({
      entry_date: draft.entryDate,
      type: draft.type,
      chemical_id: draft.chemicalId,
      quantity: draft.quantity,
      solid_content_pct: draft.solidContentPct,
      note: draft.note,
      ...(draft.loggedAt ? { created_at: draft.loggedAt } : {}),
    })
    .eq("id", id);
  if (error) throw new TankError(error.message);
  if (shouldDeductStock(draft.type) && draft.chemicalId && draft.quantity > 0) {
    await applyStockMovement(draft.chemicalId, {
      type: "pour",
      quantity: draft.quantity,
      tankLogEntryId: id,
      note: "Poured into the tank",
    });
  }
}

export async function deleteLogEntry(id: string) {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    const local = readLocal();
    reverseLocalLogEntry(local, id);
    local.entries = local.entries.filter((entry) => entry.id !== id);
    writeLocal(local);
    return;
  }

  const { error: reverseError } = await supabase.rpc("reverse_stock_for_log_entry", {
    p_entry_id: id,
  });
  if (reverseError) throw new TankError(reverseError.message);

  const { error } = await supabase.from("tank_log_entries").delete().eq("id", id);
  if (error) throw new TankError(error.message);
}

const STOCK_HISTORY_LIMIT = 50;

export async function applyStockMovement(
  chemicalId: string,
  input: StockMovementInput,
): Promise<StockMovement | null> {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    const local = readLocal();
    const movement = applyLocalMovement(local, chemicalId, input);
    writeLocal(local);
    return movement;
  }

  const { data, error } = await supabase.rpc("apply_stock_movement", {
    p_chemical_id: chemicalId,
    p_type: input.type,
    p_quantity: input.quantity,
    p_note: input.note ?? null,
    p_tank_log_entry_id: input.tankLogEntryId ?? null,
  });
  if (error) throw new TankError(error.message);
  if (data == null) return null;
  return mapMovementJson(data);
}

async function deductRemotePours(entries: TankLogEntry[]) {
  for (const entry of entries) {
    if (!shouldDeductStock(entry.type) || !entry.chemicalId || !(entry.quantity > 0)) continue;
    await applyStockMovement(entry.chemicalId, {
      type: "pour",
      quantity: entry.quantity,
      tankLogEntryId: entry.id,
      note: "Poured into the tank",
    });
  }
}

export async function listStockMovements(chemicalId: string): Promise<StockMovement[]> {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    return readLocal()
      .movements.filter((movement) => movement.chemicalId === chemicalId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
      .slice(0, STOCK_HISTORY_LIMIT);
  }

  const { data, error } = await supabase
    .from("chemical_stock_movements")
    .select("*")
    .eq("chemical_id", chemicalId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(STOCK_HISTORY_LIMIT);
  if (error) throw new TankError(error.message);
  return (data ?? []).map(mapMovement);
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
    return readLocal().lastCalculation[tankId]?.[calculator] ?? null;
  }

  const { data, error } = await supabase
    .from("last_calculation")
    .select("payload")
    .eq("tank_id", tankId)
    .eq("calculator", calculator)
    .maybeSingle();
  if (error) throw new TankError(error.message);
  return (data?.payload as BlendLastCalculation | FillLastCalculation | null) ?? null;
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
