"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useState } from "react";

const FoamLayerViewer = dynamic(() => import("./foam-layer-viewer"), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-[360px] place-items-center rounded-xl border border-slate-700 bg-slate-950 p-8 text-center text-slate-300">
      <div>
        <div className="mx-auto space-y-2" aria-hidden="true">
          <div className="h-6 w-56 rounded-lg bg-stone-100/20" />
          <div className="ml-1 h-7 w-56 rounded-lg bg-blue-300/20" />
          <div className="ml-2 h-8 w-56 rounded-lg bg-indigo-400/20" />
          <div className="ml-3 h-7 w-56 rounded-lg bg-teal-300/20" />
          <div className="ml-4 h-9 w-56 rounded-lg bg-slate-300/20" />
        </div>
        <p className="mt-6">Preparing the interactive foam construction…</p>
      </div>
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

export function FoamLayerViewerDynamic() {
  const [mode, setMode] = useState<"checking" | "interactive" | "fallback">(
    "checking",
  );

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

  if (mode === "interactive") return <FoamLayerViewer />;

  return (
    <div className="relative min-h-[360px] overflow-hidden rounded-xl border border-slate-700 bg-slate-950 text-slate-100 md:min-h-[460px]">
      <Image
        src="/images/products/foam-layer-fallback.webp"
        alt="Exploded five-layer mattress foam construction"
        width={1200}
        height={900}
        className="absolute inset-0 h-full w-full object-cover opacity-65"
        priority
      />
      <div className="relative z-10 grid min-h-[360px] place-items-center bg-slate-950/40 p-8 text-center md:min-h-[460px]">
        <div>
          <p className="font-heading text-xl font-semibold">
            Five-layer foam construction
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-300">
            A static preview is shown while the interactive model is unavailable.
          </p>
          {mode === "fallback" && canUseWebGl() && (
            <button
              type="button"
              onClick={() => setMode("interactive")}
              className="mt-5 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-400"
            >
              Load interactive view
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
