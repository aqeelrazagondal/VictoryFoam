import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/tank/client";
import type {
  BlendLastCalculation,
  Chemical,
  ChemicalDraft,
  FillLastCalculation,
  LastCalculator,
  TankLogDraft,
  TankLogEntry,
  TankSettings,
} from "@/lib/tank/models";
import { isDuplicateName } from "@/lib/tank/models";
import type { Database, Json } from "@/lib/tank/database.types";

const LOCAL_KEY = "victory-foam-tank-v1";

export class TankError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TankError";
  }
}

type LocalState = {
  chemicals: Chemical[];
  settings: TankSettings | null;
  entries: TankLogEntry[];
  lastCalculation: {
    blend?: BlendLastCalculation;
    fill?: FillLastCalculation;
  };
};

const emptyLocal = (): LocalState => ({
  chemicals: [],
  settings: null,
  entries: [],
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
    const parsed = JSON.parse(raw) as LocalState;
    return {
      chemicals: parsed.chemicals ?? [],
      settings: parsed.settings ?? null,
      entries: parsed.entries ?? [],
      lastCalculation: parsed.lastCalculation ?? {},
    };
  } catch {
    return emptyLocal();
  }
}

function writeLocal(state: LocalState) {
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
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
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEntry(row: Database["public"]["Tables"]["tank_log_entries"]["Row"]): TankLogEntry {
  return {
    id: row.id,
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

function assertUniqueName(name: string, chemicals: Chemical[], exceptId?: string) {
  if (isDuplicateName(name, chemicals, exceptId)) {
    throw new TankError("A chemical with this name already exists.");
  }
}

export type TankSnapshotData = {
  chemicals: Chemical[];
  settings: TankSettings | null;
  entries: TankLogEntry[];
};

export async function loadTankData(): Promise<TankSnapshotData> {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    const local = readLocal();
    return {
      chemicals: local.chemicals,
      settings: local.settings,
      entries: [...local.entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    };
  }

  const [chemicalsRes, settingsRes, entriesRes] = await Promise.all([
    supabase.from("chemicals").select("*").order("name"),
    supabase.from("tank_settings").select("*").maybeSingle(),
    supabase.from("tank_log_entries").select("*").order("created_at").order("id"),
  ]);

  if (chemicalsRes.error) throw new TankError(chemicalsRes.error.message);
  if (settingsRes.error) throw new TankError(settingsRes.error.message);
  if (entriesRes.error) throw new TankError(entriesRes.error.message);

  return {
    chemicals: (chemicalsRes.data ?? []).map(mapChemical),
    settings: settingsRes.data
      ? {
          capacity: settingsRes.data.capacity === null ? null : Number(settingsRes.data.capacity),
          heel: Number(settingsRes.data.heel),
        }
      : null,
    entries: (entriesRes.data ?? []).map(mapEntry),
  };
}

export async function createChemical(draft: ChemicalDraft, existing: Chemical[]) {
  const name = draft.name.trim();
  if (!name) throw new TankError("Name is required.");
  if (Number.isNaN(draft.solidContentPct) || draft.solidContentPct < 0 || draft.solidContentPct > 100) {
    throw new TankError("Solid Content % must be between 0 and 100.");
  }
  assertUniqueName(name, existing);

  const supabase = getSupabaseBrowser();
  if (!supabase) {
    const local = readLocal();
    const created: Chemical = {
      id: crypto.randomUUID(),
      name,
      solidContentPct: draft.solidContentPct,
      qtyAvailable: draft.qtyAvailable,
      unit: draft.unit.trim() || "kg",
      ohValue: draft.ohValue,
      viscosity: draft.viscosity,
      archivedAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    local.chemicals = [...local.chemicals, created];
    writeLocal(local);
    return created;
  }

  const { data, error } = await supabase
    .from("chemicals")
    .insert({
      name,
      solid_content_pct: draft.solidContentPct,
      qty_available: draft.qtyAvailable,
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
  return mapChemical(data);
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
            qtyAvailable: draft.qtyAvailable,
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
      qty_available: draft.qtyAvailable,
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

export async function deleteChemical(id: string, entries: TankLogEntry[]) {
  const used = entries.some((entry) => entry.chemicalId === id);
  if (used) {
    throw new TankError("This chemical appears in the tank log. Archive it instead.");
  }

  const supabase = getSupabaseBrowser();
  if (!supabase) {
    const local = readLocal();
    local.chemicals = local.chemicals.filter((chemical) => chemical.id !== id);
    writeLocal(local);
    return;
  }

  const { error } = await supabase.from("chemicals").delete().eq("id", id);
  if (error) throw new TankError(error.message);
}

export async function saveTankSettings(settings: TankSettings) {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    const local = readLocal();
    local.settings = settings;
    writeLocal(local);
    return;
  }

  const { error } = await supabase.from("tank_settings").upsert({
    id: true,
    capacity: settings.capacity,
    heel: settings.heel,
  });
  if (error) throw new TankError(error.message);
}

export async function insertLogEntries(drafts: TankLogDraft[]) {
  if (drafts.length === 0) return [];
  const base = Date.now();
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    const local = readLocal();
    const created: TankLogEntry[] = drafts.map((draft, index) => ({
      id: crypto.randomUUID(),
      entryDate: draft.entryDate ?? todayIsoDate(),
      type: draft.type,
      chemicalId: draft.chemicalId,
      quantity: draft.quantity,
      solidContentPct: draft.solidContentPct,
      note: draft.note,
      createdAt: new Date(base + index).toISOString(),
    }));
    local.entries = [...local.entries, ...created];
    writeLocal(local);
    return created;
  }

  const { data, error } = await supabase
    .from("tank_log_entries")
    .insert(
      drafts.map((draft, index) => ({
        entry_date: draft.entryDate ?? todayIsoDate(),
        type: draft.type,
        chemical_id: draft.chemicalId,
        quantity: draft.quantity,
        solid_content_pct: draft.solidContentPct,
        note: draft.note,
        created_at: new Date(base + index).toISOString(),
      })),
    )
    .select("*");
  if (error) throw new TankError(error.message);
  return (data ?? []).map(mapEntry).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function insertLogEntry(draft: TankLogDraft) {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    const local = readLocal();
    const created: TankLogEntry = {
      id: crypto.randomUUID(),
      entryDate: draft.entryDate ?? todayIsoDate(),
      type: draft.type,
      chemicalId: draft.chemicalId,
      quantity: draft.quantity,
      solidContentPct: draft.solidContentPct,
      note: draft.note,
      createdAt: nowIso(),
    };
    local.entries = [...local.entries, created];
    writeLocal(local);
    return created;
  }

  const { data, error } = await supabase
    .from("tank_log_entries")
    .insert({
      entry_date: draft.entryDate ?? todayIsoDate(),
      type: draft.type,
      chemical_id: draft.chemicalId,
      quantity: draft.quantity,
      solid_content_pct: draft.solidContentPct,
      note: draft.note,
    })
    .select("*")
    .single();
  if (error) throw new TankError(error.message);
  return mapEntry(data);
}

export async function updateLogEntry(id: string, draft: TankLogDraft) {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    const local = readLocal();
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
          }
        : entry,
    );
    writeLocal(local);
    return;
  }

  const { error } = await supabase
    .from("tank_log_entries")
    .update({
      entry_date: draft.entryDate,
      type: draft.type,
      chemical_id: draft.chemicalId,
      quantity: draft.quantity,
      solid_content_pct: draft.solidContentPct,
      note: draft.note,
    })
    .eq("id", id);
  if (error) throw new TankError(error.message);
}

export async function deleteLogEntry(id: string) {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    const local = readLocal();
    local.entries = local.entries.filter((entry) => entry.id !== id);
    writeLocal(local);
    return;
  }

  const { error } = await supabase.from("tank_log_entries").delete().eq("id", id);
  if (error) throw new TankError(error.message);
}

export async function getLastCalculation(calculator: LastCalculator) {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    return readLocal().lastCalculation[calculator] ?? null;
  }

  const { data, error } = await supabase
    .from("last_calculation")
    .select("payload")
    .eq("calculator", calculator)
    .maybeSingle();
  if (error) throw new TankError(error.message);
  return (data?.payload as BlendLastCalculation | FillLastCalculation | null) ?? null;
}

export async function saveLastCalculation(
  calculator: LastCalculator,
  payload: BlendLastCalculation | FillLastCalculation,
) {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    const local = readLocal();
    if (calculator === "blend") local.lastCalculation.blend = payload as BlendLastCalculation;
    else local.lastCalculation.fill = payload as FillLastCalculation;
    writeLocal(local);
    return;
  }

  const { error } = await supabase.from("last_calculation").upsert({
    calculator,
    payload: payload as Json,
  });
  if (error) throw new TankError(error.message);
}

export { isSupabaseConfigured };
