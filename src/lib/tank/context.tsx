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
import type { Chemical, Tank, TankLogEntry, TankSettings } from "@/lib/tank/models";
import {
  createTank as createTankRecord,
  loadFactory,
  removeTank as removeTankRecord,
  renameTank as renameTankRecord,
} from "@/lib/tank/repository";
import { readActiveTankId } from "@/lib/tank/tanks";

type TankContextValue = {
  loading: boolean;
  error: string | null;
  chemicals: Chemical[];
  activeChemicals: Chemical[];
  tanks: Tank[];
  activeTank: Tank | null;
  entries: TankLogEntry[];
  allEntries: TankLogEntry[];
  settings: TankSettings | null;
  snapshot: TankSnapshot;
  tankReady: boolean;
  loggedChemicalIds: string[];
  refresh: () => Promise<void>;
  selectTank: (id: string) => Promise<void>;
  createTank: (input: { name: string; capacity: number | null }) => Promise<Tank>;
  renameTank: (id: string, name: string) => Promise<void>;
  removeTank: (id: string) => Promise<void>;
  chemicalById: (id: string | null) => Chemical | undefined;
};

const TankContext = createContext<TankContextValue | null>(null);

function applyData(
  data: Awaited<ReturnType<typeof loadFactory>>,
  setChemicals: (value: Chemical[]) => void,
  setTanks: (value: Tank[]) => void,
  setActiveTankId: (value: string | null) => void,
  setEntries: (value: TankLogEntry[]) => void,
  setAllEntries: (value: TankLogEntry[]) => void,
  setLoggedChemicalIds: (value: string[]) => void,
  setError: (value: string | null) => void,
) {
  setChemicals(data.chemicals);
  setTanks(data.tanks);
  setActiveTankId(data.activeTankId);
  setEntries(data.entries);
  setAllEntries(data.allEntries);
  setLoggedChemicalIds(data.loggedChemicalIds);
  setError(null);
}

export function TankProvider({ children }: { children: ReactNode }) {
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [activeTankId, setActiveTankId] = useState<string | null>(null);
  const [entries, setEntries] = useState<TankLogEntry[]>([]);
  const [allEntries, setAllEntries] = useState<TankLogEntry[]>([]);
  const [loggedChemicalIds, setLoggedChemicalIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);

  const reload = useCallback(async (preferredTankId: string | null) => {
    const token = ++request.current;
    const data = await loadFactory(preferredTankId);
    if (token !== request.current) return;
    applyData(
      data,
      setChemicals,
      setTanks,
      setActiveTankId,
      setEntries,
      setAllEntries,
      setLoggedChemicalIds,
      setError,
    );
  }, []);

  const refresh = useCallback(async () => {
    await reload(readActiveTankId());
  }, [reload]);

  const selectTank = useCallback(
    async (id: string) => {
      await reload(id);
    },
    [reload],
  );

  const createTank = useCallback(
    async (input: { name: string; capacity: number | null }) => {
      const tank = await createTankRecord(input);
      await reload(tank.id);
      return tank;
    },
    [reload],
  );

  const renameTank = useCallback(
    async (id: string, name: string) => {
      await renameTankRecord(id, name);
      await reload(id);
    },
    [reload],
  );

  const removeTank = useCallback(
    async (id: string) => {
      await removeTankRecord(id);
      const next = readActiveTankId() === id ? null : readActiveTankId();
      await reload(next);
    },
    [reload],
  );

  useEffect(() => {
    let cancelled = false;
    void loadFactory(readActiveTankId())
      .then((data) => {
        if (cancelled) return;
        applyData(
          data,
          setChemicals,
          setTanks,
          setActiveTankId,
          setEntries,
          setAllEntries,
          setLoggedChemicalIds,
          setError,
        );
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Could not load tank data.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeTank = useMemo(
    () => tanks.find((tank) => tank.id === activeTankId && tank.archivedAt === null) ?? null,
    [activeTankId, tanks],
  );

  const settings = useMemo<TankSettings | null>(
    () => (activeTank ? { capacity: activeTank.capacity, heel: activeTank.heel } : null),
    [activeTank],
  );

  const snapshot = useMemo(
    () =>
      replayLog(
        entries.map((entry) => ({
          id: entry.id,
          type: entry.type,
          chemicalId: entry.chemicalId,
          quantity: entry.quantity,
          solidContentPct: entry.solidContentPct,
          note: entry.note,
        })),
      ),
    [entries],
  );

  const value = useMemo<TankContextValue>(
    () => ({
      loading,
      error,
      chemicals,
      activeChemicals: chemicals.filter((chemical) => chemical.archivedAt === null),
      tanks: tanks.filter((tank) => tank.archivedAt === null),
      activeTank,
      entries,
      allEntries,
      settings,
      snapshot,
      tankReady: snapshot.hasOpeningBalance,
      loggedChemicalIds,
      refresh,
      selectTank,
      createTank,
      renameTank,
      removeTank,
      chemicalById: (id) => chemicals.find((chemical) => chemical.id === id),
    }),
    [
      activeTank,
      chemicals,
      createTank,
      allEntries,
      entries,
      error,
      loading,
      loggedChemicalIds,
      refresh,
      removeTank,
      renameTank,
      selectTank,
      settings,
      snapshot,
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
