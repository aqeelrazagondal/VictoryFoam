"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { replayLog, type TankSnapshot } from "@/lib/calculations";
import type { Chemical, TankLogEntry, TankSettings } from "@/lib/tank/models";
import { loadTankData } from "@/lib/tank/repository";

type TankContextValue = {
  loading: boolean;
  error: string | null;
  chemicals: Chemical[];
  activeChemicals: Chemical[];
  entries: TankLogEntry[];
  settings: TankSettings | null;
  snapshot: TankSnapshot;
  tankReady: boolean;
  refresh: () => Promise<void>;
  chemicalById: (id: string | null) => Chemical | undefined;
};

const TankContext = createContext<TankContextValue | null>(null);

function applyData(
  data: Awaited<ReturnType<typeof loadTankData>>,
  setChemicals: (value: Chemical[]) => void,
  setEntries: (value: TankLogEntry[]) => void,
  setSettings: (value: TankSettings | null) => void,
  setError: (value: string | null) => void,
) {
  setChemicals(data.chemicals);
  setEntries(data.entries);
  setSettings(data.settings);
  setError(null);
}

export function TankProvider({ children }: { children: ReactNode }) {
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [entries, setEntries] = useState<TankLogEntry[]>([]);
  const [settings, setSettings] = useState<TankSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const data = await loadTankData();
    applyData(data, setChemicals, setEntries, setSettings, setError);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadTankData()
      .then((data) => {
        if (cancelled) return;
        applyData(data, setChemicals, setEntries, setSettings, setError);
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

  const snapshot = useMemo(
    () =>
      replayLog(
        entries.map((entry) => ({
          id: entry.id,
          type: entry.type,
          chemicalId: entry.chemicalId,
          quantity: entry.quantity,
          solidContentPct: entry.solidContentPct,
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
      entries,
      settings,
      snapshot,
      tankReady: snapshot.hasOpeningBalance,
      refresh,
      chemicalById: (id) => chemicals.find((chemical) => chemical.id === id),
    }),
    [chemicals, entries, error, loading, refresh, settings, snapshot],
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
