"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { replayLog, type TankSnapshot } from "@/lib/calculations";
import type { TankLogOverview } from "@/lib/tank/board";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/tank/client";
import type { Chemical, StockMovementInput, Tank, TankLogDraft, TankLogEntry, TankSettings } from "@/lib/tank/models";
import {
  applyStockMovements,
  createTank as createTankRecord,
  deleteLogEntry,
  insertLogEntries,
  loadFactory,
  removeTank as removeTankRecord,
  renameTank as renameTankRecord,
  TankError,
  updateLogEntry,
} from "@/lib/tank/repository";
import { dropQueuedWrite, enqueueWrite, readWriteQueue, type QueuedWrite } from "@/lib/tank/sync";
import { readActiveTankId } from "@/lib/tank/tanks";
import {
  applyDraftsToBound,
  boundToTankSnapshot,
  createWriteAttempt,
  emptyBoundSnapshot,
  isOccupancyError,
  isOfflineError,
  OCCUPANCY_MESSAGE,
} from "@/lib/tank/writes";

const CHANNEL = "victory-foam-tank";

type TankContextValue = {
  loading: boolean;
  error: string | null;
  syncNotice: string | null;
  chemicals: Chemical[];
  activeChemicals: Chemical[];
  tanks: Tank[];
  activeTank: Tank | null;
  entries: TankLogEntry[];
  allEntries: TankLogEntry[];
  overviews: TankLogOverview[];
  settings: TankSettings | null;
  snapshot: TankSnapshot;
  tankReady: boolean;
  loggedChemicalIds: string[];
  refresh: () => Promise<void>;
  retry: () => Promise<void>;
  selectTank: (id: string) => Promise<void>;
  createTank: (input: { name: string; capacity: number | null }) => Promise<Tank>;
  renameTank: (id: string, name: string) => Promise<void>;
  removeTank: (id: string) => Promise<void>;
  chemicalById: (id: string | null) => Chemical | undefined;
  persistLogEntries: (tankId: string, drafts: TankLogDraft[]) => Promise<void>;
  persistLogEntry: (tankId: string, draft: TankLogDraft) => Promise<void>;
  persistReplaceLog: (id: string, draft: TankLogDraft) => Promise<void>;
  persistDeleteLog: (id: string) => Promise<void>;
  persistStock: (moves: { chemicalId: string; input: StockMovementInput }[]) => Promise<void>;
};

const TankContext = createContext<TankContextValue | null>(null);

function applyData(
  data: Awaited<ReturnType<typeof loadFactory>>,
  setChemicals: (value: Chemical[]) => void,
  setTanks: (value: Tank[]) => void,
  setActiveTankId: (value: string | null) => void,
  setEntries: (value: TankLogEntry[]) => void,
  setAllEntries: (value: TankLogEntry[]) => void,
  setOverviews: (value: TankLogOverview[]) => void,
  setLoggedChemicalIds: (value: string[]) => void,
  setError: (value: string | null) => void,
) {
  setChemicals(data.chemicals);
  setTanks(data.tanks);
  setActiveTankId(data.activeTankId);
  setEntries(data.entries);
  setAllEntries(data.allEntries);
  setOverviews(data.overviews);
  setLoggedChemicalIds(data.loggedChemicalIds);
  setError(null);
}

function pourDeltas(drafts: TankLogDraft[]) {
  const deltas = new Map<string, number>();
  for (const draft of drafts) {
    if (draft.type !== "add_batch" || !draft.chemicalId || !(draft.quantity > 0)) continue;
    deltas.set(draft.chemicalId, (deltas.get(draft.chemicalId) ?? 0) + draft.quantity);
  }
  return deltas;
}

function applyPourDeltas(chemicals: Chemical[], deltas: Map<string, number>): Chemical[] {
  if (deltas.size === 0) return chemicals;
  return chemicals.map((chemical) => {
    const used = deltas.get(chemical.id);
    if (used == null || chemical.qtyAvailable == null) return chemical;
    return { ...chemical, qtyAvailable: chemical.qtyAvailable - used };
  });
}

export function TankProvider({ children }: { children: ReactNode }) {
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [activeTankId, setActiveTankId] = useState<string | null>(null);
  const [entries, setEntries] = useState<TankLogEntry[]>([]);
  const [allEntries, setAllEntries] = useState<TankLogEntry[]>([]);
  const [overviews, setOverviews] = useState<TankLogOverview[]>([]);
  const [loggedChemicalIds, setLoggedChemicalIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const request = useRef(0);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const flushing = useRef(false);

  const reload = useCallback(async (preferredTankId: string | null) => {
    const token = ++request.current;
    try {
      const data = await loadFactory(preferredTankId);
      if (token !== request.current) return;
      applyData(
        data,
        setChemicals,
        setTanks,
        setActiveTankId,
        setEntries,
        setAllEntries,
        setOverviews,
        setLoggedChemicalIds,
        setError,
      );
    } catch (caught: unknown) {
      if (token !== request.current) return;
      setError(caught instanceof Error ? caught.message : "Could not load tank data.");
    } finally {
      if (token === request.current) setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await reload(readActiveTankId());
  }, [reload]);

  const retry = useCallback(async () => {
    setLoading(true);
    setError(null);
    await reload(readActiveTankId());
  }, [reload]);

  const selectTank = useCallback(
    async (id: string) => {
      setLoading(true);
      await reload(id);
    },
    [reload],
  );

  const broadcast = useCallback(() => {
    try {
      channelRef.current?.postMessage({ type: "refresh" });
    } catch {
      return;
    }
  }, []);

  const patchTankSnapshot = useCallback((tankId: string, next: Tank["snapshot"], rowVersion: number) => {
    setTanks((current) =>
      current.map((tank) =>
        tank.id === tankId ? { ...tank, snapshot: next, rowVersion, updatedAt: new Date().toISOString() } : tank,
      ),
    );
  }, []);

  const flushQueue = useCallback(async () => {
    if (flushing.current || !isSupabaseConfigured()) return;
    const queued = readWriteQueue();
    if (queued.length === 0) {
      setSyncNotice(null);
      return;
    }
    flushing.current = true;
    try {
      for (const item of queued) {
        try {
          if (item.kind === "insert-log") {
            await insertLogEntries(item.tankId, item.drafts, {
              writeKey: item.writeKey,
              expectedVersion: item.expectedVersion,
            });
          } else if (item.kind === "replace-log") {
            await updateLogEntry(item.id, item.draft, {
              writeKey: item.writeKey,
              expectedVersion: item.expectedVersion,
            });
          } else if (item.kind === "delete-log") {
            await deleteLogEntry(item.id, {
              writeKey: item.writeKey,
              expectedVersion: item.expectedVersion,
            });
          } else {
            await applyStockMovements(item.moves, item.writeKey);
          }
          dropQueuedWrite(item.writeKey);
        } catch (caught: unknown) {
          if (isOccupancyError(caught)) {
            dropQueuedWrite(item.writeKey);
            setError(OCCUPANCY_MESSAGE);
            setSyncNotice(null);
            await retry();
            return;
          }
          if (isOfflineError(caught)) {
            setSyncNotice("Saved on this tablet, waiting to sync.");
            return;
          }
          dropQueuedWrite(item.writeKey);
          setError(caught instanceof Error ? caught.message : "Could not sync a saved change.");
          setSyncNotice(null);
          await retry();
          return;
        }
      }
      setSyncNotice(null);
      broadcast();
      await refresh();
    } finally {
      flushing.current = false;
    }
  }, [broadcast, refresh, retry]);

  const persistLogEntries = useCallback(
    async (tankId: string, drafts: TankLogDraft[]) => {
      const tank = tanks.find((item) => item.id === tankId);
      const attempt = createWriteAttempt();
      const expectedVersion = tank?.rowVersion ?? 1;
      const previousChemicals = chemicals;
      const previousTanks = tanks;
      const item: QueuedWrite = {
        writeKey: attempt.writeKey,
        expectedVersion,
        kind: "insert-log",
        tankId,
        drafts,
      };
      if (tank) {
        patchTankSnapshot(tankId, applyDraftsToBound(tank.snapshot, drafts), expectedVersion + 1);
        setChemicals(applyPourDeltas(chemicals, pourDeltas(drafts)));
      }
      try {
        await insertLogEntries(tankId, drafts, { writeKey: attempt.writeKey, expectedVersion });
        dropQueuedWrite(item.writeKey);
        broadcast();
        await refresh();
      } catch (caught: unknown) {
        if (isOccupancyError(caught)) {
          setChemicals(previousChemicals);
          setTanks(previousTanks);
          setError(OCCUPANCY_MESSAGE);
          await retry();
          throw caught instanceof TankError ? caught : new TankError(OCCUPANCY_MESSAGE);
        }
        if (isOfflineError(caught) && isSupabaseConfigured()) {
          enqueueWrite(item);
          setSyncNotice("Saved on this tablet, waiting to sync.");
          return;
        }
        setChemicals(previousChemicals);
        setTanks(previousTanks);
        await retry();
        throw caught;
      }
    },
    [broadcast, chemicals, patchTankSnapshot, refresh, retry, tanks],
  );

  const persistLogEntry = useCallback(
    async (tankId: string, draft: TankLogDraft) => {
      await persistLogEntries(tankId, [draft]);
    },
    [persistLogEntries],
  );

  const persistReplaceLog = useCallback(
    async (id: string, draft: TankLogDraft) => {
      const tank = tanks.find((item) => item.id === activeTankId);
      const attempt = createWriteAttempt();
      const expectedVersion = tank?.rowVersion ?? 1;
      const previousTanks = tanks;
      const item: QueuedWrite = {
        writeKey: attempt.writeKey,
        expectedVersion,
        kind: "replace-log",
        id,
        draft,
      };
      try {
        await updateLogEntry(id, draft, { writeKey: attempt.writeKey, expectedVersion });
        dropQueuedWrite(item.writeKey);
        broadcast();
        await refresh();
      } catch (caught: unknown) {
        if (isOccupancyError(caught)) {
          setTanks(previousTanks);
          setError(OCCUPANCY_MESSAGE);
          await retry();
          throw caught instanceof TankError ? caught : new TankError(OCCUPANCY_MESSAGE);
        }
        if (isOfflineError(caught) && isSupabaseConfigured()) {
          enqueueWrite(item);
          setSyncNotice("Saved on this tablet, waiting to sync.");
          return;
        }
        setTanks(previousTanks);
        await retry();
        throw caught;
      }
    },
    [activeTankId, broadcast, refresh, retry, tanks],
  );

  const persistDeleteLog = useCallback(
    async (id: string) => {
      const tank = tanks.find((item) => item.id === activeTankId);
      const attempt = createWriteAttempt();
      const expectedVersion = tank?.rowVersion ?? 1;
      const item: QueuedWrite = { writeKey: attempt.writeKey, expectedVersion, kind: "delete-log", id };
      try {
        await deleteLogEntry(id, { writeKey: attempt.writeKey, expectedVersion });
        dropQueuedWrite(item.writeKey);
        broadcast();
        await refresh();
      } catch (caught: unknown) {
        if (isOccupancyError(caught)) {
          setError(OCCUPANCY_MESSAGE);
          await retry();
          throw caught instanceof TankError ? caught : new TankError(OCCUPANCY_MESSAGE);
        }
        if (isOfflineError(caught) && isSupabaseConfigured()) {
          enqueueWrite(item);
          setSyncNotice("Saved on this tablet, waiting to sync.");
          return;
        }
        await retry();
        throw caught;
      }
    },
    [activeTankId, broadcast, refresh, retry, tanks],
  );

  const persistStock = useCallback(
    async (moves: { chemicalId: string; input: StockMovementInput }[]) => {
      const attempt = createWriteAttempt();
      const previous = chemicals;
      const item: QueuedWrite = { writeKey: attempt.writeKey, expectedVersion: 0, kind: "stock", moves };
      setChemicals((current) =>
        current.map((chemical) => {
          const move = moves.find((row) => row.chemicalId === chemical.id);
          if (!move || chemical.qtyAvailable == null) return chemical;
          const signed =
            move.input.type === "count"
              ? move.input.quantity - chemical.qtyAvailable
              : move.input.type === "receive"
                ? move.input.quantity
                : -move.input.quantity;
          return { ...chemical, qtyAvailable: chemical.qtyAvailable + signed };
        }),
      );
      try {
        await applyStockMovements(moves, attempt.writeKey);
        dropQueuedWrite(item.writeKey);
        broadcast();
        await refresh();
      } catch (caught: unknown) {
        if (isOfflineError(caught) && isSupabaseConfigured()) {
          enqueueWrite(item);
          setSyncNotice("Saved on this tablet, waiting to sync.");
          return;
        }
        setChemicals(previous);
        await retry();
        throw caught;
      }
    },
    [broadcast, chemicals, refresh, retry],
  );

  const createTank = useCallback(
    async (input: { name: string; capacity: number | null }) => {
      try {
        const tank = await createTankRecord(input);
        setLoading(true);
        await reload(tank.id);
        return tank;
      } catch (caught: unknown) {
        setError(caught instanceof Error ? caught.message : "Could not create the tank.");
        throw caught;
      }
    },
    [reload],
  );

  const renameTank = useCallback(
    async (id: string, name: string) => {
      try {
        await renameTankRecord(id, name);
        await reload(id);
      } catch (caught: unknown) {
        setError(caught instanceof Error ? caught.message : "Could not rename the tank.");
        throw caught;
      }
    },
    [reload],
  );

  const removeTank = useCallback(
    async (id: string) => {
      try {
        await removeTankRecord(id);
        const next = readActiveTankId() === id ? null : readActiveTankId();
        setLoading(true);
        await reload(next);
      } catch (caught: unknown) {
        setError(caught instanceof Error ? caught.message : "Could not archive the tank.");
        throw caught;
      }
    },
    [reload],
  );

  useEffect(() => {
    void reload(readActiveTankId());
  }, [reload]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(CHANNEL);
    channelRef.current = channel;
    channel.onmessage = () => {
      void refresh();
    };
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [refresh]);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    const live = supabase
      .channel("tank-factory")
      .on("postgres_changes", { event: "*", schema: "public", table: "tanks" }, () => {
        void refresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "chemicals" }, () => {
        void refresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "tank_log_entries" }, () => {
        void refresh();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(live);
    };
  }, [refresh]);

  useEffect(() => {
    function onOnline() {
      void flushQueue();
    }
    function onVisible() {
      if (document.visibilityState === "visible") void flushQueue();
    }
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    void flushQueue();
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [flushQueue]);

  const activeTank = useMemo(
    () => tanks.find((tank) => tank.id === activeTankId && tank.archivedAt === null) ?? null,
    [activeTankId, tanks],
  );

  const settings = useMemo<TankSettings | null>(
    () => (activeTank ? { capacity: activeTank.capacity, heel: activeTank.heel } : null),
    [activeTank],
  );

  const snapshot = useMemo(() => {
    if (activeTank) return boundToTankSnapshot(activeTank.snapshot);
    if (entries.length === 0) return boundToTankSnapshot(emptyBoundSnapshot());
    return replayLog(
      entries.map((entry) => ({
        id: entry.id,
        type: entry.type,
        chemicalId: entry.chemicalId,
        quantity: entry.quantity,
        solidContentPct: entry.solidContentPct,
        note: entry.note,
      })),
    );
  }, [activeTank, entries]);

  const value = useMemo<TankContextValue>(
    () => ({
      loading,
      error,
      syncNotice,
      chemicals,
      activeChemicals: chemicals.filter((chemical) => chemical.archivedAt === null),
      tanks: tanks.filter((tank) => tank.archivedAt === null),
      activeTank,
      entries,
      allEntries,
      overviews,
      settings,
      snapshot,
      tankReady: snapshot.hasOpeningBalance,
      loggedChemicalIds,
      refresh,
      retry,
      selectTank,
      createTank,
      renameTank,
      removeTank,
      chemicalById: (id) => chemicals.find((chemical) => chemical.id === id),
      persistLogEntries,
      persistLogEntry,
      persistReplaceLog,
      persistDeleteLog,
      persistStock,
    }),
    [
      activeTank,
      allEntries,
      chemicals,
      createTank,
      entries,
      error,
      loading,
      loggedChemicalIds,
      overviews,
      persistDeleteLog,
      persistLogEntries,
      persistLogEntry,
      persistReplaceLog,
      persistStock,
      refresh,
      removeTank,
      renameTank,
      retry,
      selectTank,
      settings,
      snapshot,
      syncNotice,
      tanks,
    ],
  );

  return <TankContext.Provider value={value}>{children}</TankContext.Provider>;
}

export function useTank() {
  const context = useContext(TankContext);
  if (!context) {
    throw new Error("useTank must be used within TankProvider");
  }
  return context;
}
