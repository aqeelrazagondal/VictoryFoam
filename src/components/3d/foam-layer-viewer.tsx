"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { Component, useEffect, useState, type ReactNode } from "react";

const FoamLayerViewerScene = dynamic(() => import("./foam-layer-viewer-scene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[360px] w-full items-center justify-center rounded-xl bg-slate-950 text-slate-300 md:h-[460px]">
      Loading 3D viewer...
    </div>
  ),
});

type ConnectionNavigator = Navigator & {
  connection?: {
    effectiveType?: string;
    saveData?: boolean;
  };
};

function canUseWebGl() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")),
    );
  } catch {
    return false;
  }
}

function FoamFallback({ action }: { action?: ReactNode }) {
  return (
    <div className="relative min-h-[360px] overflow-hidden rounded-xl border border-slate-700 bg-slate-950 text-slate-100 md:min-h-[400px]">
      <Image
        src="/images/products/foam-layer-fallback.svg"
        alt="Exploded five-layer mattress foam construction"
        width={1200}
        height={900}
        className="absolute inset-0 h-full w-full object-cover opacity-65"
      />
      <div className="relative z-10 grid min-h-[360px] place-items-center bg-slate-950/40 p-8 text-center md:min-h-[400px]">
        <div>
          <p className="font-heading text-xl font-semibold">Five-layer foam construction</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-300">
            A static preview is shown while the interactive model is unavailable.
          </p>
          {action}
        </div>
      </div>
    </div>
  );
}

class ViewerErrorBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    if (this.state.failed) return <FoamFallback />;
    return this.props.children;
  }
}

export default function FoamLayerViewer() {
  const [mode, setMode] = useState<"loading" | "interactive" | "fallback">("loading");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const connection = (navigator as ConnectionNavigator).connection;
      const slowConnection =
        connection?.saveData ||
        connection?.effectiveType === "slow-2g" ||
        connection?.effectiveType === "2g";
      setMode(canUseWebGl() && !slowConnection ? "interactive" : "fallback");
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  if (mode !== "interactive") {
    return (
      <FoamFallback
        action={
          mode === "fallback" ? (
            <button
              type="button"
              onClick={() => setMode("interactive")}
              className="mt-5 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-400"
            >
              Load interactive view
            </button>
          ) : null
        }
      />
    );
  }

  return (
    <ViewerErrorBoundary onError={() => setMode("fallback")}>
      <FoamLayerViewerScene />
    </ViewerErrorBoundary>
  );
}
