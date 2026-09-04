"use client";

import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type MutableRefObject,
  type ReactNode,
} from "react";

import type { MattressLayerId } from "@/data/mattress-scroll";
import { mattressLayers } from "@/data/mattress-scroll";

export type CinemaCameraState = {
  x: number;
  y: number;
  z: number;
  lookX: number;
  lookY: number;
  lookZ: number;
};

export type CinemaSceneState = {
  progress: number;
  explode: number;
  opacities: Record<MattressLayerId, number>;
  highlight: MattressLayerId | null;
  camera: CinemaCameraState;
  blur: number;
};

const defaultOpacities = Object.fromEntries(
  mattressLayers.map((layer) => [layer.id, 1]),
) as Record<MattressLayerId, number>;

export const defaultCinemaState: CinemaSceneState = {
  progress: 0,
  explode: 0,
  opacities: { ...defaultOpacities },
  highlight: null,
  camera: { x: 6.2, y: 3.4, z: 7.2, lookX: 0, lookY: 0, lookZ: 0 },
  blur: 0,
};

type CinemaContextValue = {
  stateRef: MutableRefObject<CinemaSceneState>;
  setProgress: (progress: number) => void;
};

const CinemaContext = createContext<CinemaContextValue | null>(null);

export function CinemaProvider({ children }: { children: ReactNode }) {
  const stateRef = useRef<CinemaSceneState>({ ...defaultCinemaState, opacities: { ...defaultOpacities } });

  const value = useMemo<CinemaContextValue>(
    () => ({
      stateRef,
      setProgress: (progress: number) => {
        stateRef.current.progress = progress;
      },
    }),
    [],
  );

  return <CinemaContext.Provider value={value}>{children}</CinemaContext.Provider>;
}

export function useCinema() {
  const context = useContext(CinemaContext);
  if (!context) {
    throw new Error("useCinema must be used within CinemaProvider");
  }
  return context;
}

export function layerY(layerId: MattressLayerId, explode: number) {
  const layer = mattressLayers.find((item) => item.id === layerId);
  if (!layer) return 0;
  return layer.assembledY + (layer.explodedY - layer.assembledY) * explode;
}
